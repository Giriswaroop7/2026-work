"""LLM provider abstraction — Anthropic, OpenAI, Ollama."""

from __future__ import annotations
import json
import os
from abc import ABC, abstractmethod
from typing import Any


# ---------------------------------------------------------------------------
# Shared tool format (Anthropic-style input_schema)
# ---------------------------------------------------------------------------
# TOOLS are defined in agent.py using Anthropic's format.
# Each provider converts them to its own wire format internally.


def _to_openai_tools(tools: list[dict]) -> list[dict]:
    """Convert Anthropic-style tool defs to OpenAI function-calling format."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        }
        for t in tools
    ]


# ---------------------------------------------------------------------------
# Base class
# ---------------------------------------------------------------------------

class BaseLLMProvider(ABC):
    """Stateful provider — maintains its own message history."""

    name: str  # set by subclasses

    def __init__(self, model: str):
        self.model = model
        self._messages: list[dict] = []

    def add_user_message(self, text: str) -> None:
        self._messages.append({"role": "user", "content": text})

    @abstractmethod
    def chat(self, system: str, tools: list[dict]) -> tuple[str, list[dict]]:
        """
        Send the current message history to the LLM.

        Returns:
            (text_response, tool_calls)
            tool_calls is a list of {"id": ..., "name": ..., "input": {...}}
        """

    @abstractmethod
    def add_tool_results(self, tool_calls: list[dict], results: list[str]) -> None:
        """Append tool results to the message history."""

    def reset(self) -> None:
        self._messages.clear()


# ---------------------------------------------------------------------------
# Anthropic
# ---------------------------------------------------------------------------

class AnthropicProvider(BaseLLMProvider):
    name = "anthropic"

    MODELS = {
        "claude-opus-4-6": "claude-opus-4-6",
        "claude-sonnet-4-6": "claude-sonnet-4-6",
        "claude-haiku-4-5": "claude-haiku-4-5",
    }
    DEFAULT_MODEL = "claude-opus-4-6"

    def __init__(self, model: str):
        super().__init__(model)
        import anthropic as _anthropic
        self._client = _anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    def chat(self, system: str, tools: list[dict]) -> tuple[str, list[dict]]:
        response = self._client.messages.create(
            model=self.model,
            max_tokens=4096,
            thinking={"type": "adaptive"},
            system=system,
            tools=tools,
            messages=self._messages,
        )

        text_parts: list[str] = []
        tool_calls: list[dict] = []

        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        # Append raw content blocks so tool_use ids are preserved
        self._messages.append({"role": "assistant", "content": response.content})
        return "\n".join(text_parts), tool_calls

    def add_tool_results(self, tool_calls: list[dict], results: list[str]) -> None:
        self._messages.append({
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": result,
                }
                for tc, result in zip(tool_calls, results)
            ],
        })


# ---------------------------------------------------------------------------
# OpenAI  (also works for Azure OpenAI with base_url override)
# ---------------------------------------------------------------------------

class OpenAIProvider(BaseLLMProvider):
    name = "openai"

    MODELS = {
        "gpt-4o": "gpt-4o",
        "gpt-4o-mini": "gpt-4o-mini",
        "gpt-4-turbo": "gpt-4-turbo",
        "gpt-4": "gpt-4",
        "o1": "o1",
        "o3-mini": "o3-mini",
    }
    DEFAULT_MODEL = "gpt-4o"

    def __init__(self, model: str, base_url: str | None = None):
        super().__init__(model)
        from openai import OpenAI as _OpenAI
        kwargs: dict[str, Any] = {"api_key": os.environ["OPENAI_API_KEY"]}
        if base_url:
            kwargs["base_url"] = base_url
        self._client = _OpenAI(**kwargs)

    def chat(self, system: str, tools: list[dict]) -> tuple[str, list[dict]]:
        messages = [{"role": "system", "content": system}] + self._messages
        response = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=_to_openai_tools(tools),
            tool_choice="auto",
        )

        msg = response.choices[0].message
        text = msg.content or ""
        tool_calls: list[dict] = []

        if msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls.append({
                    "id": tc.id,
                    "name": tc.function.name,
                    "input": json.loads(tc.function.arguments),
                })

        # Append assistant message (OpenAI format)
        self._messages.append({
            "role": "assistant",
            "content": msg.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in (msg.tool_calls or [])
            ] or None,
        })
        return text, tool_calls

    def add_tool_results(self, tool_calls: list[dict], results: list[str]) -> None:
        for tc, result in zip(tool_calls, results):
            self._messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result,
            })


# ---------------------------------------------------------------------------
# Ollama  (local models via OpenAI-compatible endpoint)
# ---------------------------------------------------------------------------

class OllamaProvider(OpenAIProvider):
    name = "ollama"

    MODELS = {
        "llama3.3": "llama3.3",
        "llama3.1": "llama3.1",
        "mistral": "mistral",
        "qwen2.5": "qwen2.5",
        "gemma3": "gemma3",
        "deepseek-r1": "deepseek-r1",
    }
    DEFAULT_MODEL = "llama3.3"

    def __init__(self, model: str):
        # Bypass OpenAI key requirement — Ollama uses a dummy key
        os.environ.setdefault("OPENAI_API_KEY", "ollama")
        base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
        super().__init__(model, base_url=base_url)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

PROVIDERS: dict[str, type[BaseLLMProvider]] = {
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "ollama": OllamaProvider,
}


def get_provider(provider_name: str, model: str | None = None) -> BaseLLMProvider:
    cls = PROVIDERS.get(provider_name.lower())
    if cls is None:
        raise ValueError(f"Unknown provider '{provider_name}'. Choose from: {list(PROVIDERS)}")
    resolved_model = model or cls.DEFAULT_MODEL
    return cls(resolved_model)


def list_providers() -> dict[str, dict]:
    """Return {provider_name: {models: [...], default: ...}} for display."""
    return {
        name: {
            "models": list(cls.MODELS.keys()),
            "default": cls.DEFAULT_MODEL,
        }
        for name, cls in PROVIDERS.items()
    }
