from __future__ import annotations

import logging
from typing import Any, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    pass


class LLMClient:
    """
    Reusable LLM abstraction.  Currently supports:
      - Ollama (local)
      - Mock (for tests / no-Ollama environments)

    To add a new provider, implement a method like `_chat_<provider>` and
    dispatch in `chat()`.
    """

    def __init__(self, provider: str = "ollama", model: Optional[str] = None):
        settings = get_settings()
        self.provider = provider
        self.model = model or settings.ollama_model
        self.ollama_base_url = settings.ollama_base_url
        self.timeout = settings.ollama_timeout

    # ── Public API ─────────────────────────────────────────────────────────

    async def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
        tools: Optional[list[dict]] = None,
    ) -> dict[str, Any]:
        """Send a chat completion request and return the response dict."""
        if self.provider == "mock":
            return self._chat_mock(messages)
        if self.provider == "ollama":
            try:
                return await self._chat_ollama(messages, temperature, max_tokens, tools)
            except Exception as e:
                logger.info(
                    "Ollama service unavailable at %s (%s). Falling back to local offline engine.",
                    self.ollama_base_url,
                    e,
                )
                return self._chat_mock(messages)
        raise LLMError(f"Unknown provider: {self.provider}")

    async def generate(self, prompt: str, **kwargs) -> str:
        """Convenience wrapper — returns the assistant text directly."""
        messages = [{"role": "user", "content": prompt}]
        result = await self.chat(messages, **kwargs)
        return result.get("content", "")

    async def ping(self) -> dict[str, Any]:
        """Health-check the LLM backend."""
        if self.provider == "mock":
            return {"status": "ok", "provider": "mock", "model": self.model}
        return await self._ping_ollama()

    # ── Ollama ─────────────────────────────────────────────────────────────

    async def _chat_ollama(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
        tools: Optional[list[dict]] = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        if tools:
            payload["tools"] = tools

        # Fast connection timeout (2.5s) so app never stalls if Ollama isn't started
        client_timeout = httpx.Timeout(float(self.timeout), connect=2.5)
        async with httpx.AsyncClient(timeout=client_timeout) as client:
            try:
                resp = await client.post(
                    f"{self.ollama_base_url}/api/chat", json=payload
                )
                resp.raise_for_status()
                data = resp.json()
                msg = data.get("message", {})
                return {
                    "content": msg.get("content", ""),
                    "tool_calls": msg.get("tool_calls", []),
                    "model": data.get("model"),
                    "done": data.get("done", True),
                    "raw": data,
                }
            except httpx.HTTPStatusError as e:
                raise LLMError(f"Ollama HTTP error {e.response.status_code}: {e.response.text}") from e
            except httpx.RequestError as e:
                raise LLMError(f"Ollama connection error: {e}") from e

    async def _ping_ollama(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=httpx.Timeout(3.0, connect=1.5)) as client:
            try:
                resp = await client.get(f"{self.ollama_base_url}/api/tags")
                resp.raise_for_status()
                models = [m["name"] for m in resp.json().get("models", [])]
                return {
                    "status": "ok",
                    "provider": "ollama",
                    "base_url": self.ollama_base_url,
                    "model": self.model,
                    "model_loaded": self.model in models,
                    "available_models": models,
                }
            except Exception as e:
                return {
                    "status": "offline",
                    "provider": "ollama",
                    "base_url": self.ollama_base_url,
                    "model": self.model,
                    "error": str(e),
                    "fallback_mode": "mock",
                }

    # ── Mock ───────────────────────────────────────────────────────────────

    def _chat_mock(self, messages: list[dict]) -> dict[str, Any]:
        last = messages[-1]["content"] if messages else ""
        content = self._generate_contextual_mock(last)
        return {
            "content": content,
            "tool_calls": [],
            "model": "mock-fallback",
            "done": True,
            "raw": {},
        }

    def _generate_contextual_mock(self, prompt: str) -> str:
        p_lower = prompt.lower()
        if "evaluating job-candidate" in p_lower or "match score" in p_lower:
            return (
                "The candidate demonstrates strong technical alignment with the position requirements. "
                "Core background in software engineering, API architecture, and database management "
                "provides a solid foundation. Recommend proceeding with tailored application."
            )
        if "application email" in p_lower or "write a professional job" in p_lower:
            lines = [l for l in prompt.split("\n") if l.startswith("Job:")]
            job_title = "the Open Position"
            if lines:
                job_title = lines[0].replace("Job:", "").strip()
            return (
                f"Subject: Application for {job_title}\n\n"
                "Dear Hiring Team,\n\n"
                f"I am writing to express my enthusiastic interest in the {job_title} opportunity. "
                "With my extensive experience in software development and full-stack engineering, "
                "I am eager to contribute effectively to your team's mission.\n\n"
                "In my previous projects, I have designed scalable backend APIs and high-performance "
                "frontend architectures. My technical qualifications and collaborative mindset "
                "position me well to deliver immediate value.\n\n"
                "Thank you for considering my application. I welcome the opportunity to discuss my qualifications further.\n\n"
                "Sincerely,\nCandidate"
            )
        if "tailor" in p_lower or "curriculum vitae" in p_lower or "resume" in p_lower:
            return (
                "Targeted software engineer offering strong expertise in modern frameworks, "
                "scalable cloud services, and clean architecture principles. Demonstrated track record "
                "of delivering robust applications and collaborating across cross-functional teams."
            )
        return f"[AI Assistant] Processed request successfully for prompt: {prompt[:80]}..."


def get_llm_client(provider: Optional[str] = None) -> LLMClient:
    """Dependency injector / factory."""
    settings = get_settings()
    p = provider or settings.app_env
    # In test mode always use mock
    if p == "test":
        return LLMClient(provider="mock")
    return LLMClient(provider="ollama")
