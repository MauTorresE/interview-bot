import time
import pytest
from interview_state import InterviewState


class TestInterviewState:
    def test_initial_state(self):
        state = InterviewState(900)  # 15 min
        assert state.phase == 'warmup'
        assert state.ended == False
        assert state.topics_count == 0

    def test_elapsed_seconds(self):
        state = InterviewState(900)
        # Should be close to 0 at creation
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

    def test_should_force_close_false_before_95_percent(self):
        state = InterviewState(900)
        state.started_at = time.time() - 800  # ~89% elapsed
        assert state.should_force_close == False

    def test_should_force_close_true_at_95_percent(self):
        state = InterviewState(900)
        state.started_at = time.time() - 855  # 95% elapsed
        assert state.should_force_close == True

    def test_transition_to_valid_phase(self):
        state = InterviewState(900)
        state.transition_to('conversation')
        assert state.phase == 'conversation'
        state.transition_to('closing')
        assert state.phase == 'closing'

    def test_transition_to_invalid_phase_raises(self):
        state = InterviewState(900)
        with pytest.raises((ValueError, KeyError)):
            state.transition_to('invalid_phase')

    def test_topics_count_increment(self):
        state = InterviewState(900)
        assert state.topics_count == 0
        state.topics_count += 1
        assert state.topics_count == 1
