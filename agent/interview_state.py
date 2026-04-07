"""Interview state machine: tracks progress, timing, and phase transitions."""

import time

VALID_PHASES = ["warmup", "conversation", "closing"]


class InterviewState:
    """Tracks interview timing, phase, and topic counts for multi-tenant sessions."""

    def __init__(self, duration_target_seconds: int = 900):
        self.phase: str = "warmup"
        self.started_at: float = time.time()
        self.duration_target_seconds: int = duration_target_seconds
        self.topics_count: int = 0
        self.ended: bool = False
        self._nudged: bool = False

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
        """Dynamic context string injected into the system prompt every turn (D-15)."""
        elapsed_min = self.elapsed_seconds // 60
        target_min = self.duration_target_seconds // 60
        remaining_min = max(0, target_min - elapsed_min)

        lines = [
            f"Llevas {elapsed_min} de {target_min} minutos.",
            f"Fase: {self.phase.capitalize()}.",
            f"Tiempo restante: {remaining_min} minutos.",
            f"Temas documentados: {self.topics_count}.",
        ]

        if self.elapsed_fraction >= 0.95:
            lines.append("URGENTE: Debes cerrar la entrevista AHORA.")
        elif self.elapsed_fraction >= 0.80:
            lines.append("NOTA: Comienza a cerrar el tema actual y prepara el cierre.")

        return " ".join(lines)

    @property
    def should_nudge(self) -> bool:
        """True when 80% of duration elapsed and not already nudged (D-16)."""
        return self.elapsed_fraction >= 0.80 and not self._nudged

    @property
    def should_force_close(self) -> bool:
        """True when 95% of duration elapsed (D-16)."""
        return self.elapsed_fraction >= 0.95

    def transition_to(self, phase: str) -> bool:
        """Transition to a new phase if valid."""
        if phase in VALID_PHASES:
            self.phase = phase
            return True
        return False

    def mark_nudged(self) -> None:
        """Mark that the 80% nudge has been fired so it only triggers once."""
        self._nudged = True
