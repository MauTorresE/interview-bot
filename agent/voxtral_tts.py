"""Custom Voxtral TTS adapter for LiveKit Agents.

Uses Mistral's Voxtral TTS API directly via httpx since the Python SDK
doesn't expose the speech endpoint yet.
"""

import base64
import os
import struct
import logging

import httpx
from livekit.agents import tts, DEFAULT_API_CONNECT_OPTIONS

logger = logging.getLogger("voxtral-tts")

VOXTRAL_SAMPLE_RATE = 24000
VOXTRAL_CHANNELS = 1
API_URL = "https://api.mistral.ai/v1/audio/speech"


def _f32le_to_s16le(data: bytes) -> bytes:
    """Convert float32 little-endian PCM to int16 little-endian PCM."""
    n = len(data) // 4
    if n == 0:
        return b""
    floats = struct.unpack(f"<{n}f", data)
    return struct.pack(
        f"<{n}h",
        *(max(-32768, min(32767, int(s * 32767))) for s in floats),
    )


class VoxtralTTS(tts.TTS):
    """Voxtral TTS using Mistral's streaming HTTP API."""

    def __init__(
        self,
        *,
        model: str = "voxtral-mini-tts-2603",
        voice: str = "fr_marie_neutral",
        api_key: str | None = None,
    ):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False, aligned_transcript=False),
            sample_rate=VOXTRAL_SAMPLE_RATE,
            num_channels=VOXTRAL_CHANNELS,
        )
        self._model = model
        self._voice = voice
        self._api_key = api_key or os.environ.get("MISTRAL_API_KEY", "")

    def synthesize(self, text: str, *, conn_options=None, **kwargs) -> "VoxtralChunkedStream":
        return VoxtralChunkedStream(
            tts=self,
            text=text,
            conn_options=conn_options or DEFAULT_API_CONNECT_OPTIONS,
            api_key=self._api_key,
            model=self._model,
            voice=self._voice,
        )


class VoxtralChunkedStream(tts.ChunkedStream):
    """Streams audio chunks from Voxtral TTS via SSE."""

    def __init__(
        self,
        *,
        tts: VoxtralTTS,
        text: str,
        conn_options,
        api_key: str,
        model: str,
        voice: str,
    ):
        super().__init__(tts=tts, input_text=text, conn_options=conn_options)
        self._api_key = api_key
        self._model = model
        self._voice = voice

    async def _run(self, output: tts.AudioEmitter) -> None:
        """Stream TTS audio from Voxtral API and push PCM frames."""
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        payload = {
            "model": self._model,
            "input": self._input_text,
            "voice_id": self._voice,
            "response_format": "pcm",
            "stream": True,
        }

        try:
            import uuid
            output.initialize(
                request_id=str(uuid.uuid4()),
                sample_rate=VOXTRAL_SAMPLE_RATE,
                num_channels=VOXTRAL_CHANNELS,
                mime_type="audio/pcm",
            )

            total_bytes = 0
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", API_URL, json=payload, headers=headers) as response:
                    response.raise_for_status()
                    logger.info(f"Voxtral TTS streaming started, status={response.status_code}")

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line or line.startswith("event:"):
                            continue

                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                break

                            try:
                                import json as _json
                                event = _json.loads(data_str)

                                audio_b64 = event.get("audio_data") or (
                                    event.get("data", {}).get("audio_data")
                                    if isinstance(event.get("data"), dict)
                                    else None
                                )

                                if audio_b64:
                                    raw_audio = base64.b64decode(audio_b64)
                                    pcm_s16 = _f32le_to_s16le(raw_audio)
                                    if pcm_s16:
                                        output.push(pcm_s16)
                                        total_bytes += len(pcm_s16)

                            except Exception as e:
                                logger.warning(f"SSE parse error: {e}")
                                continue

            logger.info(f"Voxtral TTS done: {total_bytes} bytes pushed ({total_bytes/2/24000:.2f}s)")
            output.flush()

        except httpx.HTTPStatusError as e:
            try:
                body = await e.response.aread()
                logger.error(f"Voxtral TTS HTTP error: {e.response.status_code} {body.decode()}")
            except Exception:
                logger.error(f"Voxtral TTS HTTP error: {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"Voxtral TTS error: {e}", exc_info=True)
            raise
