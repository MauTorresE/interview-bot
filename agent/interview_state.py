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
        self._extension_offered: bool = False
        self._extended: bool = False
        self._close_forced: bool = False

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

        # Topic pacing guidance
        ideal_topics = max(2, target_min // 5)  # ~1 topic per 5 min
        if self.topics_count < 1 and elapsed_min >= 5:
            lines.append(f"ATENCION: Llevas {elapsed_min} min sin documentar ningun tema. Registra hallazgos y considera transicionar.")
        elif self.topics_count < ideal_topics and self.elapsed_fraction >= 0.50:
            lines.append(f"NOTA: Para una entrevista balanceada, cubre {ideal_topics} temas. Llevas {self.topics_count}. Considera transicionar al siguiente tema.")

        if self.elapsed_fraction >= 1.0:
            lines.append("URGENTE: EL TIEMPO HA TERMINADO. Cierra la llamada AHORA. Da un resumen breve de lo que hablaron, agradece al participante, menciona que el equipo preparara una propuesta, y despidete calidamente. Usa la funcion end_interview cuando termines.")
        elif self.elapsed_fraction >= 0.90 and not self._extended:
            lines.append("IMPORTANTE: Queda menos de 1 minuto. En tu proxima respuesta, pregunta naturalmente si quieren extender la llamada unos minutos mas o si cerramos aqui.")
        elif self.elapsed_fraction >= 0.90 and self._extended:
            lines.append("IMPORTANTE: La llamada ya fue extendida y queda menos de 1 minuto. Empieza a cerrar — resume, agradece, y despidete.")
        elif self.elapsed_fraction >= 0.80:
            lines.append("NOTA: Comienza a cerrar el tema actual y prepara el cierre.")

        return " ".join(lines)

    @property
    def should_offer_extension(self) -> bool:
        """True when 90% of duration elapsed and extension not yet offered."""
        return self.elapsed_fraction >= 0.90 and not self._extension_offered and not self._extended

    @property
    def should_nudge(self) -> bool:
        """True when 80% of duration elapsed and not already nudged (D-16)."""
        return self.elapsed_fraction >= 0.80 and not self._nudged

    @property
    def should_force_close(self) -> bool:
        """True when 100% of duration elapsed — must close now."""
        return self.elapsed_fraction >= 1.0 and not self._close_forced

    @property
    def should_hard_stop(self) -> bool:
        """True when 110% of duration elapsed — polite canned goodbye."""
        return self.elapsed_fraction >= 1.10

    @property
    def should_absolute_kill(self) -> bool:
        """True when 120% of duration elapsed — silent session kill, last resort."""
        return self.elapsed_fraction >= 1.20

    def extend(self, extra_seconds: int = 300) -> None:
        """Extend the interview duration (max once, default 5 min)."""
        if not self._extended:
            max_extra = int(self.duration_target_seconds * 0.5)  # Max 50% extension
            self.duration_target_seconds += min(extra_seconds, max_extra)
            self._extended = True
            self._close_forced = False  # Reset so the new deadline triggers fresh

    def mark_extension_offered(self) -> None:
        """Mark that the extension was offered (only offer once)."""
        self._extension_offered = True

    def mark_close_forced(self) -> None:
        """Mark that force close was triggered (only trigger once)."""
        self._close_forced = True

    def transition_to(self, phase: str) -> bool:
        """Transition to a new phase if valid."""
        if phase in VALID_PHASES:
            self.phase = phase
            return True
        return False

    def mark_nudged(self) -> None:
        """Mark that the 80% nudge has been fired so it only triggers once."""
        self._nudged = True
