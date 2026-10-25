"""Thin client for the Anthropic Messages API (plain HTTP, no SDK needed)."""
import httpx

from config import settings

API_URL = "https://api.anthropic.com/v1/messages"
API_VERSION = "2023-06-01"
TIMEOUT_SECONDS = 30


def is_enabled() -> bool:
    return bool(settings.anthropic_api_key)


async def ask(system: str, prompt: str, max_tokens: int = 800) -> str:
    """Send one prompt and return the text of the answer. Raises httpx.HTTPError on failure."""
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        response = await client.post(
            API_URL,
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": API_VERSION,
                "content-type": "application/json",
            },
            json={
                "model": settings.anthropic_model,
                "max_tokens": max_tokens,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
    response.raise_for_status()
    blocks = response.json().get("content", [])
    return "".join(block.get("text", "") for block in blocks if block.get("type") == "text").strip()
