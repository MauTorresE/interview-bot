"""EntrevistaAI - Multi-tenant LiveKit Voice Agent for research interviews.

Evolved from the consultoria_ale prototype for SaaS multi-tenant usage.
Reads campaign config from Supabase, conducts interviews with adaptive
follow-ups, manages timing, records transcripts (to both Supabase and
data channel), and handles text fallback input.
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    RunContext,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.plugins import anthropic, deepgram, silero
import livekit.plugins.elevenlabs as elevenlabs

from voxtral_tts import VoxtralTTS
from interview_state import InterviewState
from interview_prompts import build_system_prompt, STYLE_INSTRUCTIONS
from supabase_client import (
    InterviewConfig,
    load_interview_config,
    save_transcript_entry,
    save_insight,
    update_interview_status,
)

logger = logging.getLogger("entrevista-agent")
logger.setLevel(logging.INFO)

# Canonical forced-closing instruction for time-limit enforcement.
# Injected via session.generate_reply(instructions=...) which bypasses the
# Anthropic prompt cache — the mechanism that made update_instructions() unreliable.
_FORCED_CLOSING_INSTRUCTION = (
    "[SISTEMA DE TIEMPO] El tiempo de la entrevista esta agotado. "
    "En tu proxima respuesta, cierra en EXACTAMENTE 2-3 oraciones: "
    "(1) UN solo hallazgo clave de lo que escuchaste (no una lista), "
    "(2) agradecimiento breve, "
    "(3) mencion de que el equipo va a preparar la propuesta. "
    "Despues llama INMEDIATAMENTE la funcion end_interview con ese mismo resumen. "
    "NO reciteles verbatim los datos que te dieron. NO listes multiples temas. "
    "NO hagas mas preguntas. Esta es una instruccion del sistema, no del usuario."
)

# Phase-1 closing: before summarizing, give the participant a final chance
# to share anything they haven't covered. The LLM must ONLY ask the question
# — no summary, no tool call yet. Phase-2 fires after their response.
_CLOSING_FINAL_CHANCE_INSTRUCTION = (
    "[SISTEMA DE TIEMPO] El tiempo de la entrevista esta por terminar. "
    "En tu proxima respuesta, haz UNA sola cosa: pregunta al participante si hay "
    "algo mas que quiera compartir antes de cerrar — un tema que no hayan cubierto, "
    "un detalle que considere importante, o algo que le haya quedado pendiente. "
    "Formato sugerido: una frase calida y breve de transicion ('Antes de cerrar, quiero preguntarte...') "
    "seguida de la pregunta. NO des resumen aun. NO llames end_interview. "
    "Espera su respuesta. Esta es una instruccion del sistema, no del usuario."
)

# Variant for when the user clicks "Finalizar entrevista" early.
# Used in Wave 2.1 — defined here so both instructions live together.
_FORCED_CLOSING_INSTRUCTION_USER_REQUESTED = (
    "[SISTEMA] El participante ha solicitado cerrar la entrevista ahora mismo. "
    "Esto es perfectamente normal. En tu proxima respuesta, cierra en EXACTAMENTE "
    "2-3 oraciones: "
    "(1) agradecele por su nombre con calidez, "
    "(2) menciona UN solo hallazgo clave de lo que aprendiste (no listes varios), "
    "(3) explica brevemente que el equipo va a preparar la propuesta. "
    "Despues llama INMEDIATAMENTE la funcion end_interview con ese mismo resumen. "
    "NO digas 'veo que tienes que irte' ni 'entiendo que no tengas tiempo'. "
    "NO reciteles verbatim los datos que te dieron. NO hagas mas preguntas."
)

# Voice persona mapping (matches src/lib/constants/campaign.ts).
# Display name for voxtral-natalia is "Mauricio" — the ID is kept stable to
# avoid a campaigns.voice_id migration; the cloned voice is Mauricio's own.
VOXTRAL_VOICES = {
    "voxtral-natalia": "0c1cb9a3-5b28-4918-8e5f-99a268c334e3",  # Mauricio (cloned Mexican Spanish)
}
ELEVENLABS_VOICES = {
    "elevenlabs-sofia": "pMsXgVXv3BLzUgSXRplE",  # Female Mexican accent
    "elevenlabs-marco": "CYw3kZ02Hs0563khs1Fj",  # Male Mexican accent
}


class EntrevistaAgent(Agent):
    """Multi-tenant interview agent powered by Claude + Voxtral/ElevenLabs."""

    def __init__(
        self,
        *,
        instructions: str,
        interview_id: str,
        config: InterviewConfig,
        state: InterviewState,
    ):
        super().__init__(
            instructions=instructions,
            use_tts_aligned_transcript=False,  # Stream text immediately, matches prototype
        )
        self._interview_id = interview_id
        self._config = config
        self._state = state
        self._start_time = time.time()
        # Wave 1.3: track agent state transitions to deliver pending_finalize
        # in the silence AFTER the TTS playout completes (speaking → listening/idle)
        self._last_agent_state: str = "initializing"

    # ── Lifecycle hooks ─────────────────────────────────────────────

    async def on_enter(self):
        """Called when the agent joins the session."""
        # Greet the participant
        name = self._config.respondent_name
        greeting = (
            f"Hola{', ' + name if name != 'Participante' else ''}! "
            f"Soy tu entrevistador para esta sesion. "
            f"La conversacion durara aproximadamente {self._config.duration_target_minutes} minutos. "
            f"Vamos a empezar, te parece?"
        )
        self.session.say(greeting)

        # Update interview status to active
        try:
            asyncio.create_task(
                update_interview_status(
                    self._interview_id,
                    "active",
                    started_at=datetime.now(timezone.utc).isoformat(),
                )
            )
        except Exception as e:
            logger.error(f"Failed to update interview status to active: {e}")

        logger.info(
            f"Interview started: {self._interview_id} with {self._config.respondent_name}"
        )

        # Start background timing loop — checks guardrails every 5s even when
        # agent is mid-speech. Keep task reference + done_callback so silent
        # deaths are observable (fixes the "loop dies silently" bug that caused
        # the canned goodbye to fire at 144% instead of 110% in prior testing).
        task = asyncio.create_task(self._timing_loop())

        def _on_done(t: asyncio.Task) -> None:
            if t.cancelled():
                return
            exc = t.exception()
            if exc is not None:
                logger.error(
                    f"Timing loop task exited unexpectedly: {exc}",
                    exc_info=exc,
                )

        task.add_done_callback(_on_done)
        self._timing_task = task  # keep strong reference so GC doesn't collect it

        # Wave 3.2: heartbeat loop — publish a heartbeat data message every 5s
        # so the frontend can detect agent crashes (no heartbeat for 25s → show
        # RecoveryCard with "agent_unresponsive" variant).
        hb_task = asyncio.create_task(self._heartbeat_loop())
        hb_task.add_done_callback(
            lambda t: logger.error(f"Heartbeat task exited: {t.exception()}")
            if not t.cancelled() and t.exception() else None
        )
        self._heartbeat_task = hb_task

    async def _timing_loop(self):
        """Background task: check timing guardrails every 5 seconds.

        Each iteration is wrapped in try/except so a single failed check never
        kills the loop. The outer done_callback logs any escape that does occur.
        """
        while not self._state.ended:
            try:
                await asyncio.sleep(5)
                if self._state.ended:
                    return
                await self._check_timing_guardrails()
            except asyncio.CancelledError:
                return
            except Exception as e:
                logger.error(
                    f"Timing loop check failed (keeping loop alive): {e}",
                    exc_info=True,
                )

    async def _heartbeat_loop(self):
        """Wave 3.2: publish heartbeat every 5s so frontend can detect crashes.

        The frontend tracks lastHeartbeatAt — if no heartbeat arrives for 25s
        while the room is connected and finalization hasn't started, it shows
        a RecoveryCard with variant="agent_unresponsive".
        """
        seq = 0
        while not self._state.ended:
            try:
                self._send_data({
                    "type": "heartbeat",
                    "seq": seq,
                    "ts_ms": int(time.time() * 1000),
                    "elapsed_s": self._state.elapsed_seconds,
                    "phase": self._state.phase,
                })
                seq += 1
                await asyncio.sleep(5)
            except asyncio.CancelledError:
                return
            except Exception as e:
                logger.debug(f"Heartbeat send failed: {e}")
                await asyncio.sleep(5)

    async def on_user_turn_completed(self, turn_ctx, new_message=None):
        """Override Agent method — save user transcript to Supabase (matches prototype pattern)."""
        text = ""
        if new_message and hasattr(new_message, "text_content"):
            text = new_message.text_content or ""
        elif new_message and hasattr(new_message, "content"):
            text = str(new_message.content) if new_message.content else ""

        if text.strip():
            elapsed_ms = int((time.time() - self._start_time) * 1000)
            logger.info(f"Client transcript saving: {text.strip()[:50]}...")
            # Use await (not create_task) — matches prototype pattern
            await save_transcript_entry(
                self._interview_id, "client", text.strip(), elapsed_ms
            )

        # Track for idle detection and fire guardrail check
        self._state.touch_user_turn()
        await self._check_timing_guardrails()

        # Phase-2 trigger: if phase-1 has already asked "anything else?" and the
        # user just completed a substantive turn, escalate to phase-2 (summary + end).
        # Guards:
        #   - Must be in phase-1 mode (final_chance_given=True)
        #   - Must not already be in phase-2 or ended
        #   - At least 5s since phase-1 started (give phase-1 TTS time to finish)
        #   - Response must be substantive (>=2 words OR >=8 chars) to avoid
        #     triggering on fillers like "uh", "sí", a cough, etc.
        if (
            self._state._closing_final_chance_given
            and not self._state._closing_forced
            and not self._state._end_tool_called
            and not self._state.ended
        ):
            stripped = text.strip()
            words = len(stripped.split())
            phase1_age = time.time() - self._state._phase1_started_at
            if phase1_age < 5:
                logger.info(f"Phase-2 skip: phase-1 too young ({phase1_age:.1f}s)")
            elif words < 2 and len(stripped) < 8:
                logger.info(f"Phase-2 skip: filler response ('{stripped}')")
            else:
                await self._do_force_summary_and_end("final_chance_user_responded")

    # ── Function tools (D-08: generic for any domain) ──────────────

    @function_tool()
    async def note_theme(
        self,
        ctx: RunContext,
        theme: str,
        description: str,
        supporting_quote: str,
    ) -> str:
        """Registra un tema o hallazgo importante que el participante menciono. Llama esta funcion cuando identifiques un tema relevante para la investigacion."""
        data = {
            "theme": theme,
            "description": description,
            "supporting_quote": supporting_quote,
        }
        self._state.topics_count += 1
        try:
            asyncio.create_task(
                save_insight(self._interview_id, "theme", data)
            )
        except Exception as e:
            logger.error(f"Failed to save theme insight: {e}")
        self._update_instructions()
        return f"Tema '{theme}' registrado. Total temas: {self._state.topics_count}."

    @function_tool()
    async def note_quote(
        self,
        ctx: RunContext,
        quote: str,
        context: str,
        sentiment: str,
    ) -> str:
        """Registra una cita textual relevante del participante con su contexto y sentimiento."""
        data = {"quote": quote, "context": context, "sentiment": sentiment}
        try:
            asyncio.create_task(
                save_insight(self._interview_id, "quote", data)
            )
        except Exception as e:
            logger.error(f"Failed to save quote insight: {e}")
        return f"Cita registrada: '{quote[:50]}...'"

    @function_tool()
    async def note_sentiment(
        self,
        ctx: RunContext,
        topic: str,
        sentiment: str,
        intensity: str,
    ) -> str:
        """Registra el sentimiento del participante sobre un tema especifico (positivo, negativo, neutro, mixto) con intensidad (baja, media, alta)."""
        data = {"topic": topic, "sentiment": sentiment, "intensity": intensity}
        try:
            asyncio.create_task(
                save_insight(self._interview_id, "sentiment", data)
            )
        except Exception as e:
            logger.error(f"Failed to save sentiment insight: {e}")
        return f"Sentimiento registrado para '{topic}': {sentiment} ({intensity})"

    @function_tool()
    async def transition_phase(
        self,
        ctx: RunContext,
        next_phase: str,
    ) -> str:
        """Cambia a la siguiente fase de la entrevista: warmup, conversation, o closing."""
        success = self._state.transition_to(next_phase)
        if not success:
            return f"Fase invalida: {next_phase}. Fases validas: warmup, conversation, closing."

        self._update_instructions()
        self._send_data({"type": "phase_change", "phase": next_phase})
        return f"Transicion a fase: {next_phase}"

    @function_tool()
    async def end_interview(
        self,
        ctx: RunContext,
        summary: str,
    ) -> str:
        """Termina la entrevista con un resumen personalizado.

        El resumen debe ser breve: EXACTAMENTE 2-3 oraciones que incluyan
        (1) UN solo hallazgo clave de lo que aprendiste — no una lista de
        temas, (2) agradecimiento breve, (3) mencion de que el equipo va a
        preparar la propuesta.

        NO recites verbatim los datos que el participante te dio (duraciones,
        volumenes, nombres de procesos). NO listes multiples observaciones.
        El objetivo es un cierre humano y calido, no un dump de informacion.

        IMPORTANTE: Esta funcion NO termina la llamada inmediatamente. En lugar
        de eso, presenta al usuario un modal para que el confirme el cierre.
        Tu debes decir el resumen en voz alta en la misma respuesta donde llamas
        esta funcion — el modal aparece mientras el usuario termina de escuchar
        tu voz.
        """
        duration = int(time.time() - self._start_time)
        frac = self._state.elapsed_fraction

        # Wave 2.2: minimum elapsed guard.
        #
        # Prevents the LLM from calling end_interview prematurely due to
        # mis-interpreting a user's "let's wrap up" or "I'm done" as an
        # actual finalization request. If the interview is less than 60%
        # elapsed AND fewer than 2 topics are documented, reject the tool
        # call and instruct the LLM to keep going.
        #
        # Bypass conditions:
        #   1. User explicitly clicked "Finalizar entrevista" early — the
        #      user's explicit request trumps the guard (their time, their
        #      call)
        #   2. _closing_forced is True — enforcement was already fired at
        #      90% or idle-timeout, so the time constraint was legitimately
        #      met via a different path
        if (
            frac < 0.60
            and self._state.topics_count < 2
            and not self._state._user_requested_end
            and not self._state._closing_forced
        ):
            logger.info(
                f"Interview {self._interview_id}: end_interview REJECTED as premature "
                f"(frac={frac:.2f}, topics={self._state.topics_count}, summary_len={len(summary)})"
            )
            return (
                f"ERROR: No puedes cerrar la entrevista aun. "
                f"Solo llevas {int(frac*100)}% del tiempo y {self._state.topics_count} "
                f"temas documentados. Necesitas al menos 60% del tiempo Y 2 temas "
                f"documentados (via note_theme) antes de cerrar. Continua la entrevista: "
                f"profundiza en el tema actual con cuantificacion y ejemplos concretos, "
                f"o transiciona a una nueva area de descubrimiento. NO intentes cerrar "
                f"de nuevo hasta que hayas cubierto mas material."
            )

        logger.info(
            f"Interview {self._interview_id}: end_interview tool called "
            f"(elapsed={duration}s, topics={self._state.topics_count}, summary_len={len(summary)})"
        )

        # Flag the tool call so the timing loop knows not to also force-close
        self._state.mark_end_tool_called()

        # Wave 1.7: if closing_reason wasn't already set by _force_llm_closing
        # (e.g., the LLM called end_interview naturally, before enforcement),
        # record it as 'natural'. Enforcement paths have already set their
        # own reason value.
        if self._state.closing_reason is None:
            self._state.closing_reason = "natural"

        # Stage the finalization payload. Delivery is deferred to the
        # agent_state_changed handler (Wave 1.3) which fires when the agent
        # transitions from 'speaking' to 'listening'/'idle' — i.e., when the
        # TTS playout of THIS response finishes. That way the modal appears
        # in the silence AFTER the user hears the goodbye, not during it.
        payload = {
            "type": "ready_to_finalize",
            "summary": summary,
            "duration": duration,
            "topics_count": self._state.topics_count,
            "source": "agent",
        }
        self._state.pending_finalize = payload
        self._state.pending_finalize_delivered = False
        self._send_data({"type": "finalization_hint"})  # frontend wrap-up banner

        # Fallback: if agent_state_changed doesn't fire within 20s, deliver
        # pending_finalize anyway. Covers TTS provider failures, unexpected
        # state transitions, or any other timing weirdness. 20s is generous —
        # longest summaries clock in around 12-15s of TTS.
        async def _deliver_finalize_fallback():
            await asyncio.sleep(20)
            if (
                self._state.pending_finalize
                and not self._state.pending_finalize_delivered
                and not self._state.ended
            ):
                logger.warning(
                    f"Interview {self._interview_id}: agent_state_changed timeout — "
                    "delivering pending_finalize via fallback"
                )
                self._state.pending_finalize_delivered = True
                self._send_data(self._state.pending_finalize)

        asyncio.create_task(_deliver_finalize_fallback())

        # Do NOT mark state.ended = True here — wait for user_confirmed_end.
        # Do NOT call session.aclose() here — wait for user_confirmed_end.
        # The agent stays alive so the TTS playout of the summary completes
        # naturally. The actual teardown happens when the user clicks the
        # Finalizar button in the modal (handled in on_data via user_confirmed_end).
        return (
            "Modal de finalizacion mostrado al usuario. "
            "La llamada continuara hasta que el participante confirme el cierre."
        )

    # ── Timing guardrails (Tier 0 rewrite) ─────────────────────────

    async def _force_llm_closing(self, reason: str) -> None:
        """Router: routes to phase-1 (final chance) or phase-2 (summary + end).

        Reasons:
          - 'time_limit_90pct' / 'idle_timeout': route through phase-1 first
          - 'user_requested': skip phase-1 (user chose to end now)
          - 'final_chance_timeout' / 'final_chance_user_responded': explicit phase-2
          - 'watchdog': legacy direct phase-2

        Idempotent: guarded by _closing_forced (phase-2 fired) and _end_tool_called.
        """
        if self._state._end_tool_called or self._state.ended:
            logger.debug(f"Interview {self._interview_id}: already ending, skip ({reason})")
            return

        # User-requested early close skips phase-1 (they explicitly want to end)
        if reason == "user_requested":
            await self._do_force_summary_and_end(reason)
            return

        # Explicit phase-2 triggers
        if reason in ("final_chance_timeout", "final_chance_user_responded", "watchdog"):
            await self._do_force_summary_and_end(reason)
            return

        # Phase-1: first time fire for time_limit_90pct or idle_timeout
        if not self._state._closing_final_chance_given:
            await self._do_fire_final_chance(reason)
            return

        # Phase-1 already fired but we got re-triggered (shouldn't normally happen)
        # — fall through to phase-2 as safety
        await self._do_force_summary_and_end(reason)

    async def _do_fire_final_chance(self, reason: str) -> None:
        """Phase-1: ask participant if there's anything else they want to share."""
        if self._state._closing_final_chance_given:
            return  # already fired
        self._state._closing_final_chance_given = True
        self._state._phase1_started_at = time.time()
        self._state.transition_to("closing")

        # Map reason to closing_reason now so DB reflects trigger even if
        # phase-2 happens via user_responded path
        if reason in ("time_limit_90pct", "idle_timeout"):
            self._state.closing_reason = "time_up"
        else:
            self._state.closing_reason = "time_up"

        logger.info(
            f"Interview {self._interview_id}: PHASE-1 (final chance) at "
            f"{self._state.elapsed_seconds}s ({reason})"
        )

        # Tell frontend the closing has started (wrap-up banner)
        self._send_data({"type": "finalization_hint"})
        self._send_data({"type": "phase_change", "phase": "closing"})
        self._update_instructions()

        # Interrupt any in-flight generation so the final-chance question
        # replaces whatever normal response was being generated.
        try:
            self.session.interrupt()
        except Exception as e:
            logger.debug(f"session.interrupt() in phase-1: {e}")

        try:
            self.session.generate_reply(instructions=_CLOSING_FINAL_CHANCE_INSTRUCTION)
        except Exception as e:
            logger.error(f"phase-1 generate_reply failed: {e}", exc_info=True)

        # Safety-net timer: if user never responds, force phase-2 after 60s.
        # Extends up to 3 times (60s each) if the user is actively speaking
        # (silence <3s) at the tick — giving them up to 4 minutes total to
        # share their last thoughts before we fall back to the summary.
        async def _final_chance_timeout(extension: int = 0):
            try:
                wait = 60
                await asyncio.sleep(wait)
                if (
                    self._state._end_tool_called
                    or self._state.ended
                    or self._state._closing_forced
                ):
                    return  # already closed via another path

                now = time.time()
                last_turn = self._state.last_user_turn_at or 0
                silence_s = now - last_turn if last_turn else 999

                # Don't cut user off mid-speech
                if silence_s < 3:
                    if extension < 3:
                        logger.info(
                            f"Interview {self._interview_id}: phase-1 timeout deferred "
                            f"(user speaking, silence={silence_s:.1f}s, ext={extension+1}/3)"
                        )
                        asyncio.create_task(_final_chance_timeout(extension + 1))
                        return
                    logger.warning(
                        f"Interview {self._interview_id}: phase-1 max extensions reached, forcing close"
                    )

                logger.info(
                    f"Interview {self._interview_id}: phase-1 timeout, firing phase-2 "
                    f"(silence={silence_s:.1f}s, ext={extension})"
                )
                await self._do_force_summary_and_end("final_chance_timeout")
            except Exception:
                # Fire-and-forget task — surface exceptions explicitly so they
                # don't get silently swallowed when the task is GC'd.
                logger.exception(
                    f"Interview {self._interview_id}: phase-1 timeout task crashed "
                    f"(ext={extension})"
                )

        asyncio.create_task(_final_chance_timeout())

    async def _do_force_summary_and_end(self, reason: str) -> None:
        """Phase-2: force summary + end_interview tool call.

        Shared by: user_requested (skips phase-1), final_chance_timeout,
        final_chance_user_responded, and watchdog fallback.
        """
        if self._state._closing_forced or self._state._end_tool_called or self._state.ended:
            return
        self._state.mark_closing_forced()

        # If phase-1 didn't run (user_requested or watchdog), still transition
        # + send hints now.
        if not self._state._closing_final_chance_given:
            self._state.transition_to("closing")
            self._send_data({"type": "finalization_hint"})
            self._send_data({"type": "phase_change", "phase": "closing"})

        if reason == "user_requested":
            self._state.closing_reason = "user_requested"
        elif reason == "watchdog":
            self._state.closing_reason = "watchdog"
        else:
            # Default to "time_up" for natural phase-1 → phase-2 transitions
            # (already set in _do_fire_final_chance but safe to reaffirm)
            if self._state.closing_reason is None:
                self._state.closing_reason = "time_up"

        logger.info(
            f"Interview {self._interview_id}: PHASE-2 (summary+end) at "
            f"{self._state.elapsed_seconds}s ({reason})"
        )

        instruction = (
            _FORCED_CLOSING_INSTRUCTION_USER_REQUESTED
            if reason == "user_requested"
            else _FORCED_CLOSING_INSTRUCTION
        )
        self._update_instructions()

        # Interrupt any in-flight generation. All phase-2 entry paths are safe:
        #   - final_chance_timeout: user stayed silent 60s+, phase-1 TTS long done
        #   - final_chance_user_responded: user completed a turn, TTS done
        #   - user_requested: explicit user action
        #   - watchdog: last-resort safety net, interrupting is required
        try:
            self.session.interrupt()
        except Exception as e:
            logger.debug(f"session.interrupt() in phase-2: {e}")

        try:
            self.session.generate_reply(instructions=instruction)
        except Exception as e:
            logger.error(f"phase-2 generate_reply failed: {e}", exc_info=True)

        # Retry at 20s if the LLM generates a response but forgets the tool call.
        # Haiku 4.5 occasionally does this.
        async def _enforcement_retry():
            await asyncio.sleep(20)
            if not self._state._end_tool_called and not self._state.ended:
                logger.warning(
                    f"Interview {self._interview_id}: phase-2 retry — LLM skipped tool call"
                )
                try:
                    self.session.interrupt()
                except Exception:
                    pass
                try:
                    self.session.generate_reply(instructions=(
                        "[SISTEMA - URGENTE] NO llamaste la funcion end_interview como se te pidio. "
                        "DEBES llamar end_interview AHORA con un resumen breve. "
                        "No digas nada mas. Solo llama la funcion end_interview."
                    ))
                except Exception as e:
                    logger.error(f"phase-2 retry failed: {e}")
        asyncio.create_task(_enforcement_retry())

    async def _check_timing_guardrails(self) -> None:
        """Tier 0 guardrail ladder: 80% nudge → 90% enforce → idle → 130% watchdog.

        Replaces the old 80/90/100/110/120% system which fought races between
        LLM generation, TTS playout, data channel delivery, and session teardown.

        The happy path is: 90% enforcement fires _force_llm_closing, LLM produces
        a summary and calls end_interview, the tool stages pending_finalize, and
        the modal appears via the agent_state_changed handler (Wave 1.3).
        """
        if self._state.ended:
            return

        # Layer 5 — 130% backend watchdog (covers "frontend is dead" case).
        # Grace period: if phase-1 ("anything else?") is actively waiting for a
        # user response, give it ONE extra tick (~5s) before force-closing.
        # This prevents the watchdog from truncating a user who's sharing last
        # thoughts at the edge of the time budget.
        if self._state.should_watchdog_close:
            if (
                self._state._closing_final_chance_given
                and not self._state._closing_forced
                and not self._state._watchdog_grace_used
            ):
                self._state._watchdog_grace_used = True
                logger.info(
                    f"Interview {self._interview_id}: WATCHDOG grace granted "
                    f"(phase-1 active at {self._state.elapsed_seconds}s)"
                )
                return  # Skip watchdog this tick; re-evaluate next 5s cycle
            logger.warning(
                f"Interview {self._interview_id}: WATCHDOG FORCE CLOSE at "
                f"{self._state.elapsed_seconds}s"
            )
            self._state.ended = True
            self._state.closing_reason = "watchdog"
            duration = int(time.time() - self._start_time)
            fallback_summary = "Gracias por tu tiempo. El equipo preparara tu propuesta."

            # Update DB to completed with fallback summary + watchdog reason
            asyncio.create_task(
                update_interview_status(
                    self._interview_id,
                    "completed",
                    ended_at=datetime.now(timezone.utc).isoformat(),
                    duration_seconds=duration,
                    topics_count=self._state.topics_count,
                    closing_summary=fallback_summary,
                    closing_reason="watchdog",
                )
            )

            # Fire a last-ditch ready_to_finalize in case frontend is still listening
            self._send_data(
                {
                    "type": "ready_to_finalize",
                    "summary": "Gracias por tu tiempo. El equipo preparara tu propuesta.",
                    "duration": duration,
                    "topics_count": self._state.topics_count,
                    "source": "watchdog",
                }
            )

            # Give data channel a moment to flush, then close
            async def _delayed_watchdog_close():
                await asyncio.sleep(2)
                try:
                    await self.session.aclose()
                except Exception as e:
                    logger.debug(f"Watchdog aclose raised: {e}")

            asyncio.create_task(_delayed_watchdog_close())
            return

        # Layer 2 — Idle detector: no user turn for idle_threshold_seconds
        if (
            self._state.is_idle()
            and not self._state._closing_forced
        ):
            idle_for = int(time.time() - (self._state.last_user_turn_at or self._state.started_at))
            logger.info(
                f"Interview {self._interview_id}: idle for {idle_for}s — forcing closing"
            )
            await self._force_llm_closing("idle_timeout")
            return

        # Layer 1 — 90% LLM enforcement (main closing trigger)
        if self._state.should_force_closing:
            await self._force_llm_closing("time_limit_90pct")
            return

        # Soft nudge — 80% wrap-up hint (still uses _update_instructions as a
        # gentle pre-cache-bust signal; hard enforcement happens at 90%)
        if self._state.should_nudge:
            self._state.mark_nudged()
            self._update_instructions()
            logger.info(
                f"Interview {self._interview_id}: nudge at {self._state.elapsed_seconds}s"
            )
            return

    # ── Helpers ──────────────────────────────────────────────────────

    def _update_instructions(self):
        """Rebuild system prompt with current time_context and update agent instructions."""
        updated = build_system_prompt(
            brief=self._config.research_brief,
            style=self._config.interviewer_style,
            duration=self._config.duration_target_minutes,
            state_context=self._state.time_context,
            phase=self._state.phase,
        )
        self.update_instructions(updated)

    def _send_data(self, data: dict):
        """Send JSON data via data channel to all participants. Retries once on failure."""
        async def _publish():
            if not (self.session and hasattr(self.session, 'room') and self.session.room):
                logger.debug("_send_data: no session/room available, skipping")
                return
            payload = json.dumps(data).encode()
            try:
                await self.session.room.local_participant.publish_data(payload, reliable=True)
            except Exception as e:
                logger.warning(f"Data send failed, retrying: {e}")
                await asyncio.sleep(0.5)
                try:
                    await self.session.room.local_participant.publish_data(payload, reliable=True)
                except Exception as e2:
                    logger.error(f"Data send retry failed: {e2}")

        try:
            asyncio.create_task(_publish())
        except Exception as e:
            logger.error(f"Failed to create send task: {e}")


async def entrypoint(ctx: JobContext):
    """Agent entrypoint -- called by LiveKit when a room needs an agent."""
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()

    # Extract interview_id from room name (format: "interview-{uuid}")
    room_name = ctx.room.name or ""
    interview_id = (
        room_name.replace("interview-", "")
        if room_name.startswith("interview-")
        else "unknown"
    )

    # Load campaign config from Supabase (D-05)
    config = await load_interview_config(interview_id)

    # Build system prompt (D-06)
    state = InterviewState(config.duration_target_seconds)
    system_prompt = build_system_prompt(
        brief=config.research_brief,
        style=config.interviewer_style,
        duration=config.duration_target_minutes,
        state_context=state.time_context,
        phase=state.phase,
    )

    # Select TTS provider based on voice persona (D-07)
    voice_persona = config.voice_persona or "voxtral-natalia"
    if voice_persona.startswith("elevenlabs"):
        tts = elevenlabs.TTS(
            model="eleven_turbo_v2_5",
            voice=ELEVENLABS_VOICES.get(
                voice_persona, ELEVENLABS_VOICES["elevenlabs-sofia"]
            ),
        )
    else:
        tts = VoxtralTTS(
            model="voxtral-mini-tts-2603",
            voice=VOXTRAL_VOICES.get(
                voice_persona, VOXTRAL_VOICES["voxtral-natalia"]
            ),
        )

    # Create the multi-tenant agent
    agent = EntrevistaAgent(
        instructions=system_prompt,
        interview_id=interview_id,
        config=config,
        state=state,
    )

    # Configure the session with STT, LLM, TTS, and VAD
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="es-419"),
        llm=anthropic.LLM(
            model=os.environ.get("LLM_MODEL", "claude-haiku-4-5-20251001"),
            caching="ephemeral",  # Cache system prompt — saves ~90% on repeated turns
            _strict_tool_schema=False,  # Required — strict tools not supported by all models
        ),
        tts=tts,
        vad=silero.VAD.load(
            min_speech_duration=0.5,   # Require 500ms of speech before tracking a turn (was 300ms)
            min_silence_duration=2.0,  # Wait 2s of silence before ending turn (was 1.5s)
            prefix_padding_duration=0.5,  # Capture more pre-speech audio for context
        ),
        allow_interruptions=True,
        false_interruption_timeout=3.0,  # Wait 3s before treating brief user speech as real interruption
        resume_false_interruption=True,  # D-35: agent resumes after false interruption
        user_away_timeout=12.0,  # D-37: silence re-engagement after 12s
    )

    # Register ALL event handlers BEFORE session.start() — handlers registered
    # after start() miss events in livekit-agents 1.5.2

    # Save bot speech via conversation_item_added session event
    # User speech is saved via Agent.on_user_turn_completed() class method override
    _saved_bot_ids = set()  # Track saved messages to avoid duplicates

    @session.on("conversation_item_added")
    def on_conversation_item(event):
        try:
            item = event.data if hasattr(event, "data") else event
            # Debug: log event structure to understand what we receive
            logger.debug(f"conversation_item_added: type={type(item).__name__}, attrs={[a for a in dir(item) if not a.startswith('_')][:10]}")

            if hasattr(item, "role") and hasattr(item, "text_content"):
                role = str(item.role)
                text = item.text_content or ""
                item_id = getattr(item, "id", None) or id(item)

                # Any role that isn't "user" is a bot/agent turn. The substring
                # check on "assistant" was brittle: LiveKit 1.5.2 may emit role
                # values that don't contain that substring (e.g. "model", enum),
                # silently dropping all bot transcripts.
                if text.strip() and role.lower() != "user" and item_id not in _saved_bot_ids:
                    _saved_bot_ids.add(item_id)
                    elapsed_ms = int((time.time() - agent._start_time) * 1000)
                    asyncio.create_task(
                        save_transcript_entry(interview_id, "bot", text.strip(), elapsed_ms)
                    )
                    logger.info(f"Bot transcript saved: {text.strip()[:50]}...")
            elif hasattr(item, "content") and hasattr(item, "role"):
                # Alternative event structure — some LiveKit versions use different attrs
                role = str(item.role)
                text = str(item.content) if item.content else ""
                item_id = getattr(item, "id", None) or id(item)

                if text.strip() and role.lower() != "user" and item_id not in _saved_bot_ids:
                    _saved_bot_ids.add(item_id)
                    elapsed_ms = int((time.time() - agent._start_time) * 1000)
                    asyncio.create_task(
                        save_transcript_entry(interview_id, "bot", text.strip(), elapsed_ms)
                    )
                    logger.info(f"Bot transcript saved (alt): {text.strip()[:50]}...")
            else:
                logger.debug(f"conversation_item_added: unrecognized structure for {type(item).__name__}")
        except Exception as e:
            logger.error(f"conversation_item_added handler error: {e}")

    # Wave 1.3 — agent_state_changed handler for TTS-coordinated modal delivery.
    #
    # When end_interview tool fires, it stages pending_finalize in agent._state
    # but does NOT send the ready_to_finalize data message. This handler watches
    # for the agent's state to transition from 'speaking' to 'listening'/'idle'
    # — which happens when the TTS playout of the current turn completes — and
    # THEN delivers the modal. Result: the modal appears in the silence after
    # the user hears the goodbye, not during it.
    #
    # If this handler never fires (TTS stuck, unexpected state, etc.), the 20s
    # fallback task scheduled in end_interview still delivers the payload.
    @session.on("agent_state_changed")
    def on_agent_state_changed(ev):
        try:
            # Be defensive about attribute names across LiveKit Agents versions
            new_state = getattr(ev, "new_state", None) or getattr(ev, "state", None)
            if not new_state:
                return
            new_state_str = str(new_state)
            old_state_str = agent._last_agent_state
            agent._last_agent_state = new_state_str

            logger.debug(
                f"Interview {interview_id}: agent_state_changed {old_state_str} → {new_state_str}"
            )

            # Deliver pending_finalize when TTS playout of the end_interview
            # turn completes (speaking → listening/idle transition)
            if (
                agent._state.pending_finalize
                and not agent._state.pending_finalize_delivered
                and old_state_str == "speaking"
                and new_state_str in ("listening", "idle")
            ):
                logger.info(
                    f"Interview {interview_id}: agent_state_changed "
                    f"{old_state_str}→{new_state_str} — delivering pending_finalize"
                )
                agent._state.pending_finalize_delivered = True
                agent._send_data(agent._state.pending_finalize)
        except Exception as e:
            logger.error(f"agent_state_changed handler error: {e}", exc_info=True)

    # Handle session close
    @session.on("close")
    def on_close(event):
        duration = int(time.time() - agent._start_time)
        if agent._state.ended:
            # Agent explicitly ended interview (via user_confirmed_end or watchdog) — mark completed
            logger.info(f"Interview {interview_id} completed normally. Duration: {duration}s")
            # Status already set to 'completed' by the path that set state.ended
        else:
            # Unexpected disconnect (browser refresh, network drop) — keep as 'active'
            # so the rejoin flow can reconnect within the room's emptyTimeout (300s)
            logger.info(f"Interview {interview_id} participant disconnected. Duration: {duration}s. Keeping active for rejoin.")

    await session.start(agent=agent, room=ctx.room)

    # ── Data channel listener ──────────────────────────────────────
    #
    # Message types handled (Tier 0 + Tier 1):
    #   text_input           — user typed text fallback (forwarded to LLM)
    #   user_confirmed_end   — user clicked "Finalizar" in the modal (main happy path)
    #   user_requested_end   — user clicked "Finalizar entrevista" button early (Wave 2.1)
    #   sync_request         — frontend re-attaching after reconnect wants pending payload
    #   end_interview        — legacy "Terminar" button (kept for backward compat during rollout)

    async def _complete_interview(reason: str, source: str = "user") -> None:
        """Mark interview complete, flush DB, send final data msg, then aclose.

        Single shared path used by user_confirmed_end, user_requested_end (fallback),
        and the legacy end_interview data message. Idempotent via state.ended guard.
        """
        if agent._state.ended:
            return
        agent._state.ended = True
        duration_s = int(time.time() - agent._start_time)

        # Wave 1.7: pull the summary + reason from agent state so they're
        # persisted on the interviews row (columns added by migration 006).
        # Graceful fallback if either is missing.
        pending = agent._state.pending_finalize or {}
        closing_summary = pending.get("summary") if isinstance(pending, dict) else None
        closing_reason = agent._state.closing_reason or "natural"

        logger.info(
            f"Interview {interview_id} completing normally "
            f"(reason={reason}, source={source}, duration={duration_s}s, "
            f"closing_reason={closing_reason}, has_summary={bool(closing_summary)})"
        )

        # Update DB first so researchers see the completed state even if aclose races
        try:
            await update_interview_status(
                interview_id,
                "completed",
                ended_at=datetime.now(timezone.utc).isoformat(),
                duration_seconds=duration_s,
                topics_count=agent._state.topics_count,
                closing_summary=closing_summary,
                closing_reason=closing_reason,
            )
        except Exception as e:
            logger.error(f"Failed to update interview status on complete: {e}")

        # Send a final interview_ended message (kept for frontend backward compat)
        agent._send_data(
            {
                "type": "interview_ended",
                "duration": duration_s,
                "topics_count": agent._state.topics_count,
                "reason": reason,
            }
        )

        # Give the data channel a brief moment to flush before tearing down the room
        await asyncio.sleep(0.5)
        try:
            await session.aclose()
        except Exception as e:
            logger.debug(f"session.aclose during complete raised: {e}")

    @ctx.room.on("data_received")
    def on_data(data_packet):
        try:
            payload = json.loads(data_packet.data.decode())
        except Exception as e:
            logger.debug(f"Data channel parse error: {e}")
            return

        ptype = payload.get("type")

        if ptype == "text_input":
            text = payload.get("text", "").strip()
            if text:
                logger.info(f"Text input received: {text[:100]}")
                asyncio.create_task(session.generate_reply(user_input=text))

        elif ptype == "user_confirmed_end":
            # Main happy path: user clicked Finalizar in the modal
            logger.info(f"Interview {interview_id}: user_confirmed_end received")
            asyncio.create_task(_complete_interview("user_confirmed_end", source="modal"))

        elif ptype == "user_requested_end":
            # Wave 2.1: user clicked "Finalizar entrevista" early — triggers the
            # same closing flow as the 90% enforcement but with a warmer instruction
            # variant. If _force_llm_closing fails to actually produce a summary,
            # the frontend will still get a fallback modal via its own client-side
            # timer and can then send user_confirmed_end.
            logger.info(f"Interview {interview_id}: user_requested_end received")
            agent._state.mark_user_requested_end()
            asyncio.create_task(agent._force_llm_closing("user_requested"))

        elif ptype == "sync_request":
            # Frontend is reconnecting — re-send any pending finalize payload
            # so the modal can re-appear without waiting for another tool call.
            # Explicit re-request bypasses the pending_finalize_delivered guard.
            if agent._state.pending_finalize:
                logger.info(f"Interview {interview_id}: re-sending pending_finalize on sync_request")
                agent._state.pending_finalize_delivered = True
                agent._send_data(agent._state.pending_finalize)

        elif ptype == "end_interview":
            # Legacy "Terminar entrevista" hard-kill path. During Tier 0/1 rollout
            # we keep this functional as a safety valve — any frontend not yet
            # updated to the new modal flow still gets a clean teardown instead
            # of a stuck session. Wave 2.1 will repoint the UI button at
            # user_requested_end instead.
            logger.info(f"Interview {interview_id}: legacy end_interview received")
            asyncio.create_task(_complete_interview("legacy_end_interview", source="legacy"))

        else:
            logger.debug(f"Unknown data channel message type: {ptype}")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
