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
    "En tu proxima respuesta, da un resumen breve y personalizado de 2-3 "
    "oraciones sobre lo que aprendiste de su operacion (menciona temas "
    "concretos que discutieron), agradece al participante por su tiempo, "
    "y llama INMEDIATAMENTE la funcion end_interview con ese mismo resumen "
    "como argumento. NO hagas mas preguntas. NO continues explorando temas. "
    "Esta es una instruccion del sistema, no del usuario."
)

# Variant for when the user clicks "Finalizar entrevista" early.
# Used in Wave 2.1 — defined here so both instructions live together.
_FORCED_CLOSING_INSTRUCTION_USER_REQUESTED = (
    "[SISTEMA] El participante ha solicitado cerrar la entrevista ahora mismo. "
    "Esto es perfectamente normal. En tu proxima respuesta: "
    "(1) Agradecele calidamente usando su nombre, "
    "(2) Menciona una o dos cosas concretas que aprendiste sobre su operacion "
    "    (procesos, herramientas, o fricciones especificas que mencionaron), "
    "(3) Explica brevemente que con esto el equipo ya puede empezar a preparar una propuesta, "
    "(4) Despidete con calidez. "
    "(5) Llama INMEDIATAMENTE la funcion end_interview con ese resumen. "
    "NO digas 'veo que tienes que irte' ni 'entiendo que no tengas tiempo' — "
    "simplemente cierra con gracia. NO hagas mas preguntas."
)

# Voice persona mapping (matches src/lib/constants/campaign.ts)
VOXTRAL_VOICES = {
    "voxtral-natalia": "0c1cb9a3-5b28-4918-8e5f-99a268c334e3",  # Cloned Mexican Spanish female (from prototype)
    "voxtral-diego": "fr_marie_neutral",  # Default Voxtral voice (placeholder until male clone is created)
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

    def _on_conversation_item_added(self, event):
        """Save bot transcript entries to Supabase AND send via data channel."""
        try:
            item = event.data if hasattr(event, "data") else event
            if hasattr(item, "role") and hasattr(item, "text_content"):
                role = str(item.role)
                text = item.text_content or ""
                if text.strip() and "assistant" in role.lower():
                    elapsed_ms = int((time.time() - self._start_time) * 1000)

                    # Persist to Supabase (non-blocking)
                    try:
                        asyncio.create_task(
                            save_transcript_entry(
                                self._interview_id, "bot", text.strip(), elapsed_ms
                            )
                        )
                    except Exception as e:
                        logger.error(f"Failed to create bot transcript save task: {e}")

                    # Send via data channel for live frontend display (BLOCKER 1 fix)
                    self._send_data(
                        {
                            "type": "transcript",
                            "speaker": "bot",
                            "content": text.strip(),
                            "elapsed_ms": elapsed_ms,
                        }
                    )
        except Exception as e:
            logger.debug(f"conversation_item_added handler error: {e}")

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

        El resumen DEBE incluir: (1) nombre del participante si esta disponible,
        (2) dos observaciones especificas sobre su operacion con herramientas,
        procesos o numeros concretos que mencionaron, (3) mencion breve del
        proximo paso (el equipo preparara una propuesta), (4) cierre calido.
        Minimo 3 oraciones, maximo 4. NO uses frases genericas vacias.

        IMPORTANTE: Esta funcion NO termina la llamada inmediatamente. En lugar
        de eso, presenta al usuario un modal para que el confirme el cierre.
        Tu debes decir el resumen en voz alta en la misma respuesta donde llamas
        esta funcion — el modal aparece mientras el usuario termina de escuchar
        tu voz.
        """
        duration = int(time.time() - self._start_time)
        logger.info(
            f"Interview {self._interview_id}: end_interview tool called "
            f"(elapsed={duration}s, topics={self._state.topics_count}, summary_len={len(summary)})"
        )

        # Flag the tool call so the timing loop knows not to also force-close
        self._state.mark_end_tool_called()

        # Stage the finalization payload. Wave 1.3 will wire agent_state_changed
        # to deliver ready_to_finalize AFTER the TTS of this turn finishes playing.
        # For now (Wave 1.2) we send it immediately — the modal may appear slightly
        # before the TTS audio completes. Wave 1.3 fixes the timing.
        payload = {
            "type": "ready_to_finalize",
            "summary": summary,
            "duration": duration,
            "topics_count": self._state.topics_count,
            "source": "agent",
        }
        self._state.pending_finalize = payload
        self._send_data(payload)

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
        """Force the LLM to produce a summary + call end_interview.

        Uses session.generate_reply(instructions=...) which bypasses the
        Anthropic ephemeral prompt cache — the mechanism that made
        update_instructions() unreliable for mid-session behavior changes.

        Idempotent: only fires once per interview (guarded by _closing_forced).
        Reasons: 'time_limit_90pct', 'idle_timeout', 'user_requested', 'watchdog'.
        """
        if self._state._closing_forced:
            logger.debug(f"Interview {self._interview_id}: closing already forced, skipping ({reason})")
            return
        self._state.mark_closing_forced()
        self._state.transition_to("closing")

        logger.info(
            f"Interview {self._interview_id}: forcing LLM closing "
            f"(reason={reason}, elapsed={self._state.elapsed_seconds}s)"
        )

        # Tell the frontend a finalization is in progress (for the wrap-up banner)
        self._send_data({"type": "finalization_hint"})
        self._send_data({"type": "phase_change", "phase": "closing"})

        # Pick the right instruction variant (time limit vs user-requested early end)
        instruction = (
            _FORCED_CLOSING_INSTRUCTION_USER_REQUESTED
            if reason == "user_requested"
            else _FORCED_CLOSING_INSTRUCTION
        )

        try:
            # session.generate_reply(instructions=...) injects a per-turn directive
            # that is NOT recorded in chat history but steers the next generation.
            # This is the canonical way to reliably steer a cached-prompt LLM.
            self.session.generate_reply(instructions=instruction)
        except Exception as e:
            logger.error(
                f"Interview {self._interview_id}: generate_reply failed during enforcement: {e}",
                exc_info=True,
            )

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

        # Layer 5 — 130% backend watchdog (covers "frontend is dead" case)
        if self._state.should_watchdog_close:
            logger.warning(
                f"Interview {self._interview_id}: WATCHDOG FORCE CLOSE at "
                f"{self._state.elapsed_seconds}s"
            )
            self._state.ended = True
            duration = int(time.time() - self._start_time)

            # Update DB to completed with fallback summary
            asyncio.create_task(
                update_interview_status(
                    self._interview_id,
                    "completed",
                    ended_at=datetime.now(timezone.utc).isoformat(),
                    duration_seconds=duration,
                    topics_count=self._state.topics_count,
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
            min_speech_duration=0.3,
            min_silence_duration=1.5,  # D-34: longer endpointing for deep thinking pauses in Spanish
            prefix_padding_duration=0.3,  # D-34
        ),
        allow_interruptions=True,  # D-35
        false_interruption_timeout=2.0,  # D-35: prevents coughs/background noise
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

                if text.strip() and "assistant" in role.lower() and item_id not in _saved_bot_ids:
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

                if text.strip() and "assistant" in role.lower() and item_id not in _saved_bot_ids:
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
        logger.info(
            f"Interview {interview_id} completing normally "
            f"(reason={reason}, source={source}, duration={duration_s}s)"
        )

        # Update DB first so researchers see the completed state even if aclose races
        try:
            await update_interview_status(
                interview_id,
                "completed",
                ended_at=datetime.now(timezone.utc).isoformat(),
                duration_seconds=duration_s,
                topics_count=agent._state.topics_count,
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
            if agent._state.pending_finalize:
                logger.info(f"Interview {interview_id}: re-sending pending_finalize on sync_request")
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
