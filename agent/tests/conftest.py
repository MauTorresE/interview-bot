import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_supabase():
    """Mock Supabase client for agent tests."""
    client = MagicMock()
    client.table = MagicMock(return_value=client)
    client.from_ = MagicMock(return_value=client)
    client.select = MagicMock(return_value=client)
    client.insert = MagicMock(return_value=client)
    client.update = MagicMock(return_value=client)
    client.eq = MagicMock(return_value=client)
    client.single = MagicMock(return_value=client)
    client.execute = AsyncMock(return_value=MagicMock(data=[]))
    return client


@pytest.fixture
def mock_interview_config():
    """Mock InterviewConfig for agent tests."""
    config = MagicMock()
    config.research_brief = MagicMock(
        goals="Test goals",
        data_points="Test data points",
        context="Test context",
        tone="Test tone",
    )
    config.voice_persona = "voxtral-natalia"
    config.interviewer_style = "professional"
    config.duration_target_seconds = 900
    config.duration_target_minutes = 15
    config.respondent_name = "Test Respondent"
    return config
