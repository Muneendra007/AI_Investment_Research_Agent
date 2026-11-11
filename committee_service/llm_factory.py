"""Microsoft Agent Framework chat client factory supporting Groq, Gemini, OpenAI, and test clients."""

from __future__ import annotations

import os
from typing import Protocol

from agent_framework import BaseChatClient
from agent_framework.openai import OpenAIChatCompletionClient
from openai import AsyncOpenAI


class ChatClientFactory(Protocol):
    """Protocol for building a Microsoft Agent Framework chat client."""

    def create_client(self, *, temperature: float = 0.1) -> BaseChatClient: ...


class DefaultChatClientFactory:
    """Resolves configured LLM provider credentials into OpenAIChatCompletionClient."""

    def create_client(self, *, temperature: float = 0.1) -> BaseChatClient:
        # 1. Groq (primary — matching existing Next.js project configuration)
        groq_key = os.environ.get("GROQ_API_KEY", "").strip()
        if groq_key:
            groq_model = os.environ.get("GROQ_MODEL", "").strip() or "openai/gpt-oss-20b"
            async_client = AsyncOpenAI(
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1",
                max_retries=5,
            )
            return OpenAIChatCompletionClient(
                model=groq_model,
                async_client=async_client,
            )

        # 2. Google Gemini via OpenAI-compatible endpoint
        gemini_key = (
            os.environ.get("GEMINI_API_KEY", "").strip()
            or os.environ.get("GOOGLE_API_KEY", "").strip()
        )
        if gemini_key:
            gemini_model = os.environ.get("GEMINI_MODEL", "").strip() or "gemini-2.0-flash"
            return OpenAIChatCompletionClient(
                model=gemini_model,
                api_key=gemini_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )

        # 3. Standard OpenAI
        openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if openai_key:
            openai_model = os.environ.get("OPENAI_MODEL", "").strip() or "gpt-4o-mini"
            base_url = os.environ.get("OPENAI_BASE_URL", "").strip() or None
            return OpenAIChatCompletionClient(
                model=openai_model,
                api_key=openai_key,
                base_url=base_url,
            )

        raise RuntimeError(
            "No LLM API key configured for Investment Committee. "
            "Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in .env.local."
        )
