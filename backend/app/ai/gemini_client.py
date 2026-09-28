import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

class GeminiClient:
    """
    Google Gemini client supporting structured JSON output, conversational text generation,
    and automatic fallback across models.
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    @classmethod
    def get_api_key(cls) -> str:
        return os.getenv("GEMINI_API_KEY", "").strip()

    @classmethod
    def get_models(cls) -> list:
        primary = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
        fallback_str = os.getenv("GEMINI_FALLBACK_MODELS", "gemini-flash-latest,gemini-3.5-flash-lite")
        fallbacks = [m.strip() for m in fallback_str.split(",") if m.strip()]
        models = [primary] + [m for m in fallbacks if m != primary]
        return models

    @classmethod
    def get_timeout_seconds(cls) -> float:
        try:
            return float(os.getenv("GEMINI_TIMEOUT_MS", "30000")) / 1000.0
        except Exception:
            return 30.0

    @classmethod
    def generate_json(cls, prompt: str, system_instruction: str = None) -> dict | None:
        """
        Calls Gemini API requesting application/json output, returns parsed dict or None on failure.
        """
        api_key = cls.get_api_key()
        if not api_key:
            return None

        timeout = cls.get_timeout_seconds()
        models = cls.get_models()

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        for model in models:
            url = f"{cls.BASE_URL}/{model}:generateContent?key={api_key}"
            try:
                response = requests.post(url, json=payload, timeout=timeout)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            text_content = parts[0]["text"].strip()
                            return json.loads(text_content)
                else:
                    logger.warning(f"Gemini model {model} returned status {response.status_code}: {response.text[:200]}")
            except Exception as e:
                logger.warning(f"Gemini API request failed for model {model}: {e}")

        return None

    @classmethod
    def generate_text(cls, prompt: str, system_instruction: str = None, temperature: float = 0.4) -> str | None:
        """
        Calls Gemini API requesting text output, returns generated string or None.
        """
        api_key = cls.get_api_key()
        if not api_key:
            return None

        timeout = cls.get_timeout_seconds()
        models = cls.get_models()

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 1024
            }
        }
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        for model in models:
            url = f"{cls.BASE_URL}/{model}:generateContent?key={api_key}"
            try:
                response = requests.post(url, json=payload, timeout=timeout)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"].strip()
                else:
                    logger.warning(f"Gemini model {model} returned status {response.status_code}: {response.text[:200]}")
            except Exception as e:
                logger.warning(f"Gemini text request failed for model {model}: {e}")

        return None
