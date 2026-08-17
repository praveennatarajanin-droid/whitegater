from app.adapters.base import BaseProviderAdapter
from app.adapters.openai_adapter import OpenAIProviderAdapter
from app.adapters.anthropic_adapter import AnthropicProviderAdapter
from app.adapters.gemini_adapter import GeminiProviderAdapter
from app.adapters.generic_adapter import GenericOpenAIAdapter

class ProviderAdapterFactory:
    _adapters = {
        "openai": OpenAIProviderAdapter(),
        "anthropic": AnthropicProviderAdapter(),
        "gemini": GeminiProviderAdapter(),
        "groq": GenericOpenAIAdapter(),
        "openrouter": GenericOpenAIAdapter(),
        "azure": GenericOpenAIAdapter(),
        "ollama": GenericOpenAIAdapter(),
        "custom": GenericOpenAIAdapter(),
    }

    @classmethod
    def get_adapter(cls, provider_code: str) -> BaseProviderAdapter:
        return cls._adapters.get(provider_code.lower(), GenericOpenAIAdapter())

    @classmethod
    def register_adapter(cls, provider_code: str, adapter: BaseProviderAdapter):
        cls._adapters[provider_code.lower()] = adapter
