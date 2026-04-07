"""EntrevistaAI - Multi-tenant LiveKit Voice Agent for research interviews.

Evolved from the consultoria_ale prototype for SaaS multi-tenant usage.
Reads campaign config from Supabase, conducts interviews with adaptive
follow-ups, manages timing, records transcripts (to both Supabase and
data channel), and handles text fallback input.
"""

import asyncio
import json
import logging
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

# Voice persona mapping (matches src/lib/constants/campaign.ts)
VOXTRAL_VOICES = {
    "voxtral-natalia": "jessica",  # Female Spanish voice
    "voxtral-diego": "alex",  # Male Spanish voice
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
        super().__init__(instructions=instructions)
        self._interview_id = interview_id
        self._config = config
        self._state = state
        self._start_time = time.time()

    # ── Lifecycle hooks ─────────────────────────────────────────────

    async def on_enter(self):
        """Called when the agent joins the session."""
        # Set up event handlers for transcript persistence + data channel
        self.session.on("user_turn_completed", self._on_user_turn_completed)
        self.session.on("conversation_item_added", self._on_conversation_item_added)

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

    async def _on_user_turn_completed(self, turn_ctx, new_message=None):
        """Save user transcript entry to Supabase AND send via data channel."""
        text = ""
        if new_message and hasattr(new_message, "text_content"):
            text = new_message.text_content or ""
        elif new_message and hasattr(new_message, "content"):
            text = str(new_message.content) if new_message.content else ""

        if text.strip():
            elapsed_ms = int((time.time() - self._start_time) * 1000)

            # Persist to Supabase (non-blocking)
            try:
                asyncio.create_task(
                    save_transcript_entry(
                        self._interview_id, "client", text.strip(), elapsed_ms
                    )
                )
            except Exception as e:
                logger.error(f"Failed to create transcript save task: {e}")

            # Send via data channel for live frontend display (BLOCKER 1 fix)
            self._send_data(
                {
                    "type": "transcript",
                    "speaker": "client",
                    "content": text.strip(),
                    "elapsed_ms": elapsed_ms,
                }
            )

        # Check timing guardrails after every user turn (D-15, D-16)
        self._check_timing_guardrails()

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
        """Termina la entrevista. Llama esta funcion despues de dar el resumen final y despedirte."""
        self._state.ended = True
        duration = int(time.time() - self._start_time)

        try:
            asyncio.create_task(
                update_interview_status(
                    self._interview_id,
                    "completed",
                    ended_at=datetime.now(timezone.utc).isoformat(),
                    duration_seconds=duration,
                    topics_count=self._state.topics_count,
                )
            )
        except Exception as e:
            logger.error(f"Failed to update interview status on end: {e}")

        self._send_data(
            {
                "type": "interview_ended",
                "duration": duration,
                "topics_count": self._state.topics_count,
            }
        )
        logger.info(
            f"Interview {self._interview_id} ended. Duration: {duration}s, Topics: {self._state.topics_count}"
        )
        return f"Entrevista finalizada. Resumen: {summary}"

    # ── Timing guardrails (D-15, D-16) ─────────────────────────────

    def _check_timing_guardrails(self):
        """Check elapsed time and inject nudge or force-close as needed."""
        if self._state.should_force_close and self._state.phase != "closing":
            # 95% elapsed — force transition to closing (D-16)
            self._state.transition_to("closing")
            self._update_instructions()
            self._send_data({"type": "phase_change", "phase": "closing"})
            logger.info(
                f"Interview {self._interview_id}: force-close triggered at "
                f"{self._state.elapsed_seconds}s / {self._state.duration_target_seconds}s"
            )
        elif self._state.should_nudge:
            # 80% elapsed — nudge to start closing (D-16)
            self._state.mark_nudged()
            self._update_instructions()
            logger.info(
                f"Interview {self._interview_id}: nudge triggered at "
                f"{self._state.elapsed_seconds}s / {self._state.duration_target_seconds}s"
            )

    # ── Helpers ──────────────────────────────────────────────────────

    def _update_instructions(self):
        """Rebuild system prompt with current time_context and update agent instructions."""
        updated = build_system_prompt(
            brief=self._config.research_brief,
            style=self._config.interviewer_style,
            duration=self._config.duration_target_minutes,
            state_context=self._state.time_context,
        )
        self.instructions = updated

    def _send_data(self, data: dict):
        """Send JSON data via data channel to all participants."""
        try:
            if self.session and self.session.room:
                payload = json.dumps(data).encode()
                asyncio.create_task(
                    self.session.room.local_participant.publish_data(
                        payload, reliable=True
                    )
                )
        except Exception as e:
            logger.error(f"Failed to send data: {e}")


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
    )

    # Select TTS provider based on voice persona (D-07)
    if config.voice_persona.startswith("elevenlabs"):
        tts = elevenlabs.TTS(
            model="eleven_turbo_v2_5",
            voice=ELEVENLABS_VOICES.get(
                config.voice_persona, ELEVENLABS_VOICES["elevenlabs-sofia"]
            ),
        )
    else:
        tts = VoxtralTTS(
            model="voxtral-mini-tts-2603",
            voice=VOXTRAL_VOICES.get(
                config.voice_persona, VOXTRAL_VOICES["voxtral-natalia"]
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
        llm=anthropic.LLM(model="claude-sonnet-4-20250514"),
        tts=tts,
        vad=silero.VAD.load(
            min_speech_duration=0.3,
            min_silence_duration=1.0,  # D-34: longer endpointing for interviews
            prefix_padding_duration=0.3,  # D-34
        ),
        allow_interruptions=True,  # D-35
        false_interruption_timeout=2.0,  # D-35: prevents coughs/background noise
        resume_false_interruption=True,  # D-35: agent resumes after false interruption
        user_away_timeout=12.0,  # D-37: silence re-engagement after 12s
    )

    # Handle graceful close -- mark interview completed
    @session.on("close")
    def on_close(event):
        if agent._state and not agent._state.ended:
            duration = int(time.time() - agent._start_time)
            try:
                asyncio.create_task(
                    update_interview_status(
                        interview_id,
                        "completed",
                        ended_at=datetime.now(timezone.utc).isoformat(),
                        duration_seconds=duration,
                    )
                )
            except Exception as e:
                logger.error(f"Failed to update status on close: {e}")
            logger.info(f"Interview {interview_id} closed. Duration: {duration}s")

    await session.start(agent=agent, room=ctx.room)

    # Listen for text messages from the data channel (T-03-08: parse in try/catch)
    @ctx.room.on("data_received")
    def on_data(data_packet):
        try:
            payload = json.loads(data_packet.data.decode())
            if payload.get("type") == "text_input":
                text = payload.get("text", "").strip()
                if text:
                    logger.info(f"Text input received: {text[:100]}")
                    asyncio.create_task(
                        session.generate_reply(user_input=text)
                    )
            elif payload.get("type") == "end_interview":
                logger.info("End interview requested by user")
                asyncio.create_task(session.aclose())
        except Exception as e:
            logger.debug(f"Data channel parse error: {e}")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
