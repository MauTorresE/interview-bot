import time
import pytest
from interview_state import InterviewState


class TestInterviewState:
    def test_initial_state(self):
        state = InterviewState(900)  # 15 min
        assert state.phase == 'warmup'
        assert state.ended == False
        assert state.topics_count == 0
        # Tier 0 new fields
        assert state._closing_forced == False
        assert state._end_tool_called == False
        assert state._user_requested_end == False
        assert state.last_user_turn_at is None
        assert state.llm_in_flight == False
        assert state.pending_finalize is None

    def test_elapsed_seconds(self):
        state = InterviewState(900)
        assert state.elapsed_seconds < 2

    def test_elapsed_fraction(self):
        state = InterviewState(900)
        state.started_at = time.time() - 450  # 7.5 min elapsed
        assert 0.49 < state.elapsed_fraction < 0.51

    def test_time_context_format(self):
        state = InterviewState(900)
        ctx = state.time_context
        assert "minutos" in ctx.lower() or "min" in ctx.lower()
        assert "Fase" in ctx or "fase" in ctx

    # ── 80% nudge tier ─────────────────────────────────────────

    def test_should_nudge_false_before_80_percent(self):
        state = InterviewState(900)
        state.started_at = time.time() - 600  # 66% elapsed
        assert state.should_nudge == False

    def test_should_nudge_true_at_80_percent(self):
        state = InterviewState(900)
        state.started_at = time.time() - 720  # 80% elapsed
        assert state.should_nudge == True

    def test_should_nudge_fires_only_once(self):
        state = InterviewState(900)
        state.started_at = time.time() - 750  # > 80%
        assert state.should_nudge == True
        state.mark_nudged()
        assert state.should_nudge == False

    # ── 90% enforcement tier ───────────────────────────────────

    def test_should_force_closing_false_before_90_percent(self):
        state = InterviewState(900)
        state.started_at = time.time() - 720  # 80% elapsed
        assert state.should_force_closing == False

    def test_should_force_closing_true_at_90_percent(self):
        state = InterviewState(900)
        state.started_at = time.time() - 810  # 90% elapsed
        assert state.should_force_closing == True

    def test_should_force_closing_fires_only_once(self):
        state = InterviewState(900)
        state.started_at = time.time() - 810  # 90% elapsed
        assert state.should_force_closing == True
        state.mark_closing_forced()
        assert state.should_force_closing == False

    # ── 130% watchdog tier ─────────────────────────────────────

    def test_should_watchdog_close_false_at_100_percent(self):
        state = InterviewState(900)
        state.started_at = time.time() - 900  # 100% elapsed
        assert state.should_watchdog_close == False

    def test_should_watchdog_close_false_at_120_percent(self):
        state = InterviewState(900)
        state.started_at = time.time() - 1080  # 120% elapsed
        assert state.should_watchdog_close == False

    def test_should_watchdog_close_true_at_130_percent(self):
        state = InterviewState(900)
        state.started_at = time.time() - 1170  # 130% elapsed
        assert state.should_watchdog_close == True

    # ── Idle detector ─────────────────────────────────────────

    def test_is_idle_false_without_user_turn(self):
        state = InterviewState(900, idle_threshold_seconds=180)
        # No user turn recorded yet — not considered idle
        assert state.is_idle() == False

    def test_is_idle_false_within_threshold(self):
        state = InterviewState(900, idle_threshold_seconds=180)
        state.last_user_turn_at = time.time() - 60  # 1 min ago
        assert state.is_idle() == False

    def test_is_idle_true_after_threshold(self):
        state = InterviewState(900, idle_threshold_seconds=180)
        state.last_user_turn_at = time.time() - 200  # 3:20 ago
        assert state.is_idle() == True

    def test_touch_user_turn_resets_idle(self):
        state = InterviewState(900, idle_threshold_seconds=180)
        state.last_user_turn_at = time.time() - 200  # idle
        assert state.is_idle() == True
        state.touch_user_turn()
        assert state.is_idle() == False

    # ── Phase transitions ─────────────────────────────────────

    def test_transition_to_valid_phase(self):
        state = InterviewState(900)
        assert state.transition_to('conversation') == True
        assert state.phase == 'conversation'
        assert state.transition_to('closing') == True
        assert state.phase == 'closing'

    def test_transition_to_invalid_phase_returns_false(self):
        state = InterviewState(900)
        original_phase = state.phase
        assert state.transition_to('invalid_phase') == False
        assert state.phase == original_phase

    # ── Topic tracking ────────────────────────────────────────

    def test_topics_count_increment(self):
        state = InterviewState(900)
        assert state.topics_count == 0
        state.topics_count += 1
        assert state.topics_count == 1

    # ── Flag mutators ─────────────────────────────────────────

    def test_mark_end_tool_called(self):
        state = InterviewState(900)
        assert state._end_tool_called == False
        state.mark_end_tool_called()
        assert state._end_tool_called == True

    def test_mark_user_requested_end(self):
        state = InterviewState(900)
        assert state._user_requested_end == False
        state.mark_user_requested_end()
        assert state._user_requested_end == True

    # ── Tier 2.1: required-topic coverage ──────────────────────

    def test_required_topics_default_empty(self):
        state = InterviewState(900)
        assert state.required_topics == []
        assert state.covered_topic_indices == set()
        assert state.uncovered_required_topics == []

    def test_required_topics_init(self):
        topics = ["temporalidad", "volumen mensual", "herramientas"]
        state = InterviewState(900, required_topics=topics)
        assert state.required_topics == topics
        # All three show as uncovered initially, preserving order and index
        uncovered = state.uncovered_required_topics
        assert uncovered == [(0, "temporalidad"), (1, "volumen mensual"), (2, "herramientas")]

    def test_required_topics_input_is_copied(self):
        # Guards against campaigns mutating each other if an InterviewState instance
        # is ever constructed with the same list reference.
        topics = ["a", "b"]
        state = InterviewState(900, required_topics=topics)
        topics.append("c")
        assert state.required_topics == ["a", "b"]

    def test_mark_required_topic_covered_happy_path(self):
        state = InterviewState(900, required_topics=["a", "b", "c"])
        assert state.mark_required_topic_covered(1) is True
        assert state.covered_topic_indices == {1}
        assert state.uncovered_required_topics == [(0, "a"), (2, "c")]

    def test_mark_required_topic_covered_out_of_range(self):
        state = InterviewState(900, required_topics=["a", "b"])
        assert state.mark_required_topic_covered(5) is False
        assert state.mark_required_topic_covered(-1) is False
        assert state.covered_topic_indices == set()

    def test_mark_required_topic_covered_idempotent(self):
        state = InterviewState(900, required_topics=["a"])
        assert state.mark_required_topic_covered(0) is True
        assert state.mark_required_topic_covered(0) is True
        assert state.covered_topic_indices == {0}

    def test_uncovered_empty_when_all_covered(self):
        state = InterviewState(900, required_topics=["a", "b"])
        state.mark_required_topic_covered(0)
        state.mark_required_topic_covered(1)
        assert state.uncovered_required_topics == []

    def test_time_context_shows_pending_in_conversation(self):
        state = InterviewState(900, required_topics=["temporalidad", "volumen"])
        state.phase = "conversation"
        ctx = state.time_context
        assert "TEMAS OBLIGATORIOS PENDIENTES" in ctx
        assert "#1 temporalidad" in ctx
        assert "#2 volumen" in ctx

    def test_time_context_shows_all_covered_when_done(self):
        state = InterviewState(900, required_topics=["a"])
        state.phase = "conversation"
        state.mark_required_topic_covered(0)
        ctx = state.time_context
        assert "todos cubiertos" in ctx

    def test_time_context_no_section_when_no_required_topics(self):
        state = InterviewState(900)
        state.phase = "conversation"
        ctx = state.time_context
        assert "OBLIGATORIOS" not in ctx
        assert "todos cubiertos" not in ctx

    def test_time_context_suppresses_pending_in_closing_phase(self):
        # Closing phase should not surface pending topics — the 2-3 sentence
        # closing instructions would otherwise conflict with a "cover these first"
        # reminder and the LLM would try to satisfy both.
        state = InterviewState(900, required_topics=["a", "b"])
        state.phase = "closing"
        ctx = state.time_context
        assert "OBLIGATORIOS" not in ctx
        assert "todos cubiertos" not in ctx
