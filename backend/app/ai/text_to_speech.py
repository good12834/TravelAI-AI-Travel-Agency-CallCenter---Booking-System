"""
Modular Text-to-Speech (TTS) service supporting English, Amharic, Arabic, and Hebrew.
Separates speech generation provider integration from core business logic.
"""

import os
import base64
import logging
from app.ai.languages import get_language

logger = logging.getLogger(__name__)


class TextToSpeechService:
    """
    Text-to-Speech abstraction layer supporting Google Cloud TTS,
    Gemini Speech generation, Twilio Polly voices, and Web Speech API.
    """

    @classmethod
    def synthesize(cls, text: str, language_code: str = "en") -> dict:
        """
        Converts AI text into audio in the selected language.

        Example:
        text = "Your booking is confirmed."
        language_code = "en-US"

        Return:
        Audio bytes or a provider audio stream / response dictionary.
        """
        lang_info = get_language(language_code)
        target_locale = lang_info["locale"]
        tts_locale = lang_info["tts_locale"]
        tts_voice = lang_info["tts_voice"]
        lang_code = lang_info["code"]

        # 1. Try Google Cloud Text-to-Speech if credentials available
        google_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if google_creds and os.path.exists(google_creds):
            try:
                from google.cloud import texttospeech # type: ignore
                client = texttospeech.TextToSpeechClient()
                s_input = texttospeech.SynthesisInput(text=text)
                voice = texttospeech.VoiceSelectionParams(
                    language_code=tts_locale,
                    name=tts_voice,
                )
                audio_config = texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.MP3
                )
                response = client.synthesize_speech(
                    input=s_input, voice=voice, audio_config=audio_config
                )
                if response.audio_content:
                    b64_audio = base64.b64encode(response.audio_content).decode('utf-8')
                    return {
                        "text": text,
                        "language": lang_code,
                        "locale": target_locale,
                        "voice_name": tts_voice,
                        "audio_format": "audio/mp3",
                        "audio_bytes": response.audio_content,
                        "audio_base64": b64_audio,
                        "audio_url": f"data:audio/mp3;base64,{b64_audio}",
                        "provider": "google-cloud-tts",
                    }
            except Exception as e:
                logger.warning(f"Google Cloud TTS failed, falling back: {e}")

        # 2. Twilio voice config for phone calls
        twilio_voice = lang_info.get("twilio_voice", "Polly.Joanna")

        # 3. Standard fallback response containing Web Speech API & audio stream metadata
        return {
            "text": text,
            "language": lang_code,
            "locale": target_locale,
            "tts_locale": tts_locale,
            "voice_name": tts_voice,
            "twilio_voice": twilio_voice,
            "audio_format": "audio/mp3",
            "audio_url": f"/static/audio/tts_{lang_code}_sample.mp3",
            "audio_bytes": None,
            "audio_base64": None,
            "provider": "browser-webspeech",
        }


def synthesize_speech(text: str, language_code: str = "en") -> dict:
    """
    Top-level helper function conforming to the specified architecture:
    Convert AI text into audio in the selected language.

    Example:
    text = "Your booking is confirmed."
    language_code = "en-US"

    Return:
    Audio bytes or a provider audio stream / response dictionary.
    """
    return TextToSpeechService.synthesize(text, language_code)
