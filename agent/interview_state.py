"""Interview state machine: tracks progress, timing, and phase transitions.

Wave 1 (Tier 0) refactor notes:
- Replaced 80/90/100/110/120% tier system with 80% nudge / 90% force-closing / 130% watchdog
- Removed extension flow (deferred; can be re-added inside the modal later)
- Added fields for modal closing coordination: _closing_forced, _end_tool_called,
  _user_requested_end, last_user_turn_at, idle_threshold_seconds, llm_in_flight,
  pending_finalize
- Added is_idle() for the idle-detector path
"""

import time
from typing import Optional

VALID_PHASES = ["warmup", "conversation", "closing"]


class InterviewState:
    """Tracks interview timing, phase, and topic counts for multi-tenant sessions."""

    def __init__(
        self,
        duration_target_seconds: int = 900,
        idle_threshold_seconds: int = 180,
    ):
        self.phase: str = "warmup"
        self.started_at: float = time.time()
        self.duration_target_seconds: int = duration_target_seconds
        self.topics_count: int = 0
        self.ended: bool = False

        # Tier progression idempotency flags
        self._nudged: bool = False          # 80% soft nudge fired
        self._closing_forced: bool = False  # 90% enforcement fired (or user_requested)

        # End-of-interview signals
        self._end_tool_called: bool = False     # LLM called end_interview tool
        self._user_requested_end: bool = False  # User clicked Finalizar entrevista early

        # Idle detection
        self.last_user_turn_at: Optional[float] = None
        self.idle_threshold_seconds: int = idle_threshold_seconds

        # Observability / coordination
        self.llm_in_flight: bool = False
        self.pending_finalize: Optional[dict] = None

    # ── Timing properties ───────────────────────────────────────────

    @property
    def elapsed_seconds(self) -> int:
        """Seconds elapsed since interview started."""
        return int(time.time() - self.started_at)

    @property
    def elapsed_fraction(self) -> float:
        """Fraction of target duration elapsed (0.0 to 1.0+)."""
        if self.duration_target_seconds <= 0:
            return 1.0
        return self.elapsed_seconds / self.duration_target_seconds

    @property
    def time_context(self) -> str:
        """Dynamic context string injected into the system prompt every turn.

        NOTE: Due to Anthropic ephemeral prompt caching, mid-session updates
        to this string via update_instructions() are unreliable. The authoritative
        mechanism to force closing is _force_llm_closing() in entrevista_agent.py
        which uses session.generate_reply(instructions=...) to bypass the cache.
        """
        elapsed_min = self.elapsed_seconds // 60
        target_min = self.duration_target_seconds // 60
        remaining_min = max(0, target_min - elapsed_min)

        lines = [
            f"Llevas {elapsed_min} de {target_min} minutos.",
            f"Fase: {self.phase.capitalize()}.",
            f"Tiempo restante: {remaining_min} minutos.",
            f"Temas documentados: {self.topics_count}.",
        ]

        # Topic pacing guidance
        ideal_topics = max(2, target_min // 5)  # ~1 topic per 5 min
        if self.topics_count < 1 and elapsed_min >= 5:
            lines.append(
                f"ATENCION: Llevas {elapsed_min} min sin documentar ningun tema. "
                "Registra hallazgos y considera transicionar."
            )
        elif self.topics_count < ideal_topics and self.elapsed_fraction >= 0.50:
            lines.append(
                f"NOTA: Para una entrevista balanceada, cubre {ideal_topics} temas. "
                f"Llevas {self.topics_count}. Considera transicionar al siguiente tema."
            )

        # Time urgency (simplified — no extension flow in Tier 0)
        if self.elapsed_fraction >= 0.90:
            lines.append(
                "URGENTE: El tiempo esta casi agotado. En tu proxima respuesta, da un "
                "resumen breve y personalizado (2-3 oraciones) mencionando temas concretos "
                "que el participante discutio, agradecele por su tiempo, y llama "
                "INMEDIATAMENTE la funcion end_interview con ese resumen. NO hagas mas "
                "preguntas. NO continues explorando temas."
            )
        elif self.elapsed_fraction >= 0.80:
            lines.append(
                "NOTA: Queda poco tiempo. Termina el tema actual y preparate para cerrar "
                "pronto con un resumen."
            )

        return " ".join(lines)

    # ── Tier properties (new Tier 0 system) ────────────────────────

    @property
    def should_nudge(self) -> bool:
        """True when 80% of duration elapsed and not already nudged (soft wrap-up hint)."""
        return self.elapsed_fraction >= 0.80 and not self._nudged

    @property
    def should_force_closing(self) -> bool:
        """True when 90% of duration elapsed and enforcement has not yet fired.

        This is the main closing trigger. When true, _force_llm_closing() is called
        which uses session.generate_reply(instructions=...) to bypass the prompt cache
        and reliably get the LLM to produce a summary + call end_interview.
        """
        return self.elapsed_fraction >= 0.90 and not self._closing_forced

    @property
    def should_watchdog_close(self) -> bool:
        """True when 130% of duration elapsed — absolute last-resort safety net.

        Fires when the frontend is presumed dead (closed tab, crashed, etc.) so the
        backend can clean up the session and mark the interview completed in the DB.
        Should rarely trigger in practice — the frontend modal flow handles normal
        closing via user_confirmed_end well before this.
        """
        return self.elapsed_fraction >= 1.30

    def is_idle(self, now: Optional[float] = None) -> bool:
        """True when no user turn has been received within idle_threshold_seconds.

        Used by the background timing loop to trigger _force_llm_closing("idle_timeout")
        when the participant has gone silent mid-interview.
        """
        if self.last_user_turn_at is None:
            return False
        current = now if now is not None else time.time()
        return (current - self.last_user_turn_at) > self.idle_threshold_seconds

    # ── State mutators ──────────────────────────────────────────────

    def transition_to(self, phase: str) -> bool:
        """Transition to a new phase if valid."""
        if phase in VALID_PHASES:
            self.phase = phase
            return True
        return False

    def mark_nudged(self) -> None:
        """Mark that the 80% soft nudge has fired so it only triggers once."""
        self._nudged = True

    def mark_closing_forced(self) -> None:
        """Mark that the 90% enforcement has fired so it only triggers once per interview."""
        self._closing_forced = True

    def mark_end_tool_called(self) -> None:
        """Mark that the LLM called the end_interview tool."""
        self._end_tool_called = True

    def mark_user_requested_end(self) -> None:
        """Mark that the user clicked 'Finalizar entrevista' early."""
        self._user_requested_end = True

    def touch_user_turn(self, now: Optional[float] = None) -> None:
        """Update last_user_turn_at to record a user turn for idle detection."""
        self.last_user_turn_at = now if now is not None else time.time()
