"""Tests for the system-prompt builder and helpers.

Focused on Tier 2.1: the required_topics flow through the prompt template.
Covers the helper (_format_required_topics) and build_system_prompt end-to-end.
"""

from interview_prompts import _format_required_topics, build_system_prompt


class TestFormatRequiredTopics:
    def test_empty_list_emits_placeholder(self):
        out = _format_required_topics([])
        assert "Ninguno definido" in out
        # Placeholder must NOT list any topics — no numbered entries expected
        assert "1." not in out

    def test_single_topic_numbered(self):
        out = _format_required_topics(["temporalidad"])
        assert "1. temporalidad" in out
        assert "note_theme" in out
        assert "required_topic_index" in out

    def test_multiple_topics_numbered_1_based(self):
        out = _format_required_topics(["a", "b", "c"])
        assert "1. a" in out
        assert "2. b" in out
        assert "3. c" in out
        # 1-based convention must be called out so the LLM doesn't zero-index
        assert "1-based" in out

    def test_instructions_block_appended_only_when_topics_present(self):
        empty_out = _format_required_topics([])
        assert "note_theme" not in empty_out
        filled_out = _format_required_topics(["x"])
        assert "note_theme" in filled_out


class TestBuildSystemPrompt:
    def _brief(self, **overrides):
        base = {
            "goals": "Understand operation",
            "data_points": "Processes, tools",
            "context": "Tech consultancy",
            "tone": "Warm and direct",
        }
        base.update(overrides)
        return base

    def test_empty_required_topics_renders_placeholder_section(self):
        prompt = build_system_prompt(
            brief=self._brief(required_topics=[]),
            style="professional",
            duration=15,
            state_context="",
        )
        assert "Temas obligatorios" in prompt
        assert "Ninguno definido" in prompt

    def test_populated_required_topics_render_numbered_list(self):
        prompt = build_system_prompt(
            brief=self._brief(required_topics=["cadencia", "volumen"]),
            style="professional",
            duration=15,
            state_context="",
        )
        assert "1. cadencia" in prompt
        assert "2. volumen" in prompt
        assert "required_topic_index" in prompt

    def test_missing_required_topics_key_is_safe(self):
        # Legacy briefs (pre-Tier-2.1) simply don't have the key — must not KeyError
        prompt = build_system_prompt(
            brief=self._brief(),
            style="professional",
            duration=15,
            state_context="",
        )
        assert "Temas obligatorios" in prompt
        assert "Ninguno definido" in prompt

    def test_persona_name_threads_through(self):
        prompt = build_system_prompt(
            brief=self._brief(required_topics=[]),
            style="professional",
            duration=15,
            state_context="",
            persona_name="Mauricio",
        )
        assert "Eres Mauricio" in prompt

    def test_state_context_threads_through(self):
        prompt = build_system_prompt(
            brief=self._brief(required_topics=[]),
            style="professional",
            duration=15,
            state_context="Llevas 3 de 15 minutos.",
        )
        assert "Llevas 3 de 15 minutos." in prompt
