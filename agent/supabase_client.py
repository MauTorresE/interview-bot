"""Supabase client for multi-tenant interview persistence.

All tables live in the 'entrevista' schema. Uses service_role key
for server-side access (bypasses RLS).
"""

import os
import logging
from dataclasses import dataclass, field

from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

logger = logging.getLogger("entrevista-agent")

_client: Client | None = None


@dataclass
class InterviewConfig:
    """Configuration loaded from Supabase for a specific interview session."""

    interview_id: str
    campaign_id: str
    org_id: str
    respondent_name: str
    voice_persona: str
    interviewer_style: str
    duration_target_seconds: int
    duration_target_minutes: int
    research_brief: dict = field(default_factory=dict)


def get_supabase_client() -> Client | None:
    """Get or create a Supabase client configured for the entrevista schema."""
    global _client
    if _client is not None:
        return _client

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        logger.warning("Supabase credentials not set, data will not be persisted")
        return None

    _client = create_client(
        url,
        key,
        options=ClientOptions(schema="entrevista"),
    )
    return _client


def _fix_encoding(text: str) -> str:
    """Fix double-encoded UTF-8 (common with STT outputs)."""
    try:
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return text


async def load_interview_config(interview_id: str) -> InterviewConfig:
    """Load campaign config for an interview session from Supabase (D-05).

    Queries interviews JOIN campaigns JOIN research_briefs to get all
    configuration needed for the agent session.
    """
    client = get_supabase_client()
    if not client:
        logger.warning("No Supabase client, returning default config")
        return InterviewConfig(
            interview_id=interview_id,
            campaign_id="unknown",
            org_id="unknown",
            respondent_name="Participante",
            voice_persona="voxtral-natalia",
            interviewer_style="professional",
            duration_target_seconds=900,
            duration_target_minutes=15,
            research_brief={
                "goals": "Entrevista general de investigacion.",
                "data_points": "Recopilar opiniones y experiencias.",
                "context": "Sin contexto adicional.",
                "tone": "Profesional y respetuoso.",
            },
        )

    try:
        # Query interview with campaign and respondent data
        interview_result = (
            client.table("interviews")
            .select(
                "id, campaign_id, respondent_id, org_id, "
                "campaigns(id, name, duration_target, voice_persona, interviewer_style), "
                "respondents(name)"
            )
            .eq("id", interview_id)
            .single()
            .execute()
        )

        interview = interview_result.data
        campaign = interview.get("campaigns", {}) or {}
        respondent = interview.get("respondents", {}) or {}

        campaign_id = interview.get("campaign_id", "unknown")

        # Query research brief for the campaign
        brief_data = {
            "goals": "Entrevista general de investigacion.",
            "data_points": "Recopilar opiniones y experiencias.",
            "context": "Sin contexto adicional.",
            "tone": "Profesional y respetuoso.",
        }

        try:
            brief_result = (
                client.table("research_briefs")
                .select("goals, data_points, context, tone")
                .eq("campaign_id", campaign_id)
                .single()
                .execute()
            )
            if brief_result.data:
                brief_data = {
                    "goals": brief_result.data.get("goals", brief_data["goals"]),
                    "data_points": brief_result.data.get("data_points", brief_data["data_points"]),
                    "context": brief_result.data.get("context", brief_data["context"]),
                    "tone": brief_result.data.get("tone", brief_data["tone"]),
                }
        except Exception as e:
            logger.warning(f"Failed to load research brief for campaign {campaign_id}: {e}")

        duration_target = campaign.get("duration_target", 15)
        duration_seconds = duration_target * 60

        return InterviewConfig(
            interview_id=interview_id,
            campaign_id=campaign_id,
            org_id=interview.get("org_id", "unknown"),
            respondent_name=respondent.get("name", "Participante"),
            voice_persona=campaign.get("voice_persona", "voxtral-natalia"),
            interviewer_style=campaign.get("interviewer_style", "professional"),
            duration_target_seconds=duration_seconds,
            duration_target_minutes=duration_target,
            research_brief=brief_data,
        )

    except Exception as e:
        logger.error(f"Failed to load interview config for {interview_id}: {e}")
        return InterviewConfig(
            interview_id=interview_id,
            campaign_id="unknown",
            org_id="unknown",
            respondent_name="Participante",
            voice_persona="voxtral-natalia",
            interviewer_style="professional",
            duration_target_seconds=900,
            duration_target_minutes=15,
            research_brief={
                "goals": "Entrevista general de investigacion.",
                "data_points": "Recopilar opiniones y experiencias.",
                "context": "Sin contexto adicional.",
                "tone": "Profesional y respetuoso.",
            },
        )


async def save_transcript_entry(
    interview_id: str,
    speaker: str,
    content: str,
    elapsed_ms: int,
) -> None:
    """Save a transcript entry to entrevista.transcript_entries."""
    try:
        client = get_supabase_client()
        if not client:
            return
        client.table("transcript_entries").insert(
            {
                "interview_id": interview_id,
                "speaker": speaker,
                "content": _fix_encoding(content),
                "elapsed_ms": elapsed_ms,
            }
        ).execute()
    except Exception as e:
        logger.error(f"Failed to save transcript entry: {e}")


async def save_insight(
    interview_id: str,
    insight_type: str,
    data: dict,
) -> None:
    """Save a structured insight from a function tool call.

    Stub for Phase 4 -- insights table doesn't exist yet.
    Logs to console for now.
    """
    logger.info(
        f"Insight [{insight_type}] for interview {interview_id}: {data}"
    )


async def update_interview_status(
    interview_id: str,
    status: str,
    **kwargs,
) -> None:
    """Update the interview row with status and optional fields."""
    try:
        client = get_supabase_client()
        if not client:
            return
        update_data = {"status": status, **kwargs}
        client.table("interviews").update(update_data).eq(
            "id", interview_id
        ).execute()
    except Exception as e:
        logger.error(f"Failed to update interview status: {e}")
