"""
Central language configuration for TravelAI multilingual call center & voice AI.
Supports English, Amharic (አማርኛ), Arabic (العربية), and Hebrew (עברית).
"""

SUPPORTED_LANGUAGES = {
    "en": {
        "code": "en",
        "name": "English",
        "native": "English",
        "locale": "en-US",
        "speech_locale": "en-US",
        "tts_locale": "en-US",
        "tts_voice": "en-US-Journey-F",
        "twilio_voice": "Polly.Joanna",
        "flag": "🇬🇧",
        "dir": "ltr",
        "greeting": "Hello! Welcome to TravelAI. How may I assist your travel plans today?",
        "continuation": "I'm still here with you. What destination, flight, or hotel would you like to explore?",
        "transfer_message": "I am transferring you immediately to an available specialist who speaks English. Please hold for just a moment.",
        "switch_confirm": "Certainly, I have switched our conversation to English. How can I help you?",
        "ivr_digit": "1",
        "ivr_prompt": "For English, press 1.",
    },
    "am": {
        "code": "am",
        "name": "Amharic",
        "native": "አማርኛ",
        "locale": "am-ET",
        "speech_locale": "am-ET",
        "tts_locale": "am-ET",
        "tts_voice": "am-ET-Standard-A",
        "twilio_voice": "Polly.Joanna",
        "flag": "🇪🇹",
        "dir": "ltr",
        "greeting": "ሰላም! ወደ TravelAI እንኳን በደህና መጡ። የጉዞ ዕቅድዎን ዛሬ እንዴት ልርዳዎት?",
        "continuation": "አሁንም ከእርስዎ ጋር ነኝ። የትኛውን መድረሻ፣ በረራ ወይም ሆቴል መፈለግ ይፈልጋሉ?",
        "transfer_message": "አማርኛ ወደሚናገሩ ባለሙያ ወዲያውኑ አስተላልፍዎታለሁ። እባክዎ ጥቂት ይጠብቁ።",
        "switch_confirm": "በደስታ! ውይይታችንን ወደ አማርኛ ቀይሬያለሁ። እንዴት ልርዳዎት እችላለሁ?",
        "ivr_digit": "2",
        "ivr_prompt": "ለአማርኛ 2 ይጫኑ።",
    },
    "ar": {
        "code": "ar",
        "name": "Arabic",
        "native": "العربية",
        "locale": "ar",
        "speech_locale": "ar-SA",
        "tts_locale": "ar-SA",
        "tts_voice": "ar-XA-Standard-A",
        "twilio_voice": "Polly.Zeina",
        "flag": "🇸🇦",
        "dir": "rtl",
        "greeting": "مرحبًا! أهلاً بك في TravelAI. كيف يمكنني مساعدتك في خطط سفرك اليوم؟",
        "continuation": "أنا ما زلت معك. ما هي الوجهة أو الرحلة أو الفندق الذي ترغب في استكشافه؟",
        "transfer_message": "أقوم بتحويلك على الفور إلى أخصائي يتحدث العربية. يرجى الانتظار للحظة واحدة.",
        "switch_confirm": "بالتأكيد، قمت بتحويل محادثتنا إلى اللغة العربية. كيف يمكنني مساعدتك؟",
        "ivr_digit": "3",
        "ivr_prompt": "للعربية اضغط 3.",
    },
    "he": {
        "code": "he",
        "name": "Hebrew",
        "native": "עברית",
        "locale": "he-IL",
        "speech_locale": "he-IL",
        "tts_locale": "he-IL",
        "tts_voice": "he-IL-Standard-A",
        "twilio_voice": "Polly.Joanna",
        "flag": "🇮🇱",
        "dir": "rtl",
        "greeting": "שלום! ברוכים הבאים ל-TravelAI. כיצד אוכל לסייע לך בתכנון הנסיעה היום?",
        "continuation": "אני עדיין איתך. איזה יעד, טיסה או מלון תרצה לבדוק?",
        "transfer_message": "אני מעביר אותך מיד לנציג שירות הדובר עברית. אנא המתן רגע קט.",
        "switch_confirm": "בהחלט, העברתי את השיחה שלנו לעברית. כיצד אוכל לעזור לך?",
        "ivr_digit": "4",
        "ivr_prompt": "לעברית הקש 4.",
    },
}

DIGIT_TO_LANGUAGE = {
    "1": "en",
    "2": "am",
    "3": "ar",
    "4": "he",
}


def get_language(language_code: str) -> dict:
    """Returns language metadata dictionary, falling back to English."""
    if not language_code:
        return SUPPORTED_LANGUAGES["en"]
    normalized = str(language_code).strip().lower()
    # Handle locale strings like 'en-US', 'am-ET', 'ar-SA', 'he-IL'
    if "-" in normalized:
        normalized = normalized.split("-")[0]
    return SUPPORTED_LANGUAGES.get(normalized, SUPPORTED_LANGUAGES["en"])


def set_call_language(selection: str) -> dict:
    """
    Sets language from DTMF IVR selection ('1', '2', '3', '4') or language code.
    Returns language_code and metadata dictionary.
    """
    selection_str = str(selection).strip()
    language_code = DIGIT_TO_LANGUAGE.get(selection_str, selection_str.lower())
    if language_code not in SUPPORTED_LANGUAGES:
        language_code = "en"

    return {
        "language_code": language_code,
        "language": get_language(language_code),
    }


def get_multilingual_ivr_message() -> str:
    """Generates the combined multilingual IVR prompt for incoming calls."""
    prompts = [
        SUPPORTED_LANGUAGES["en"]["ivr_prompt"],
        SUPPORTED_LANGUAGES["am"]["ivr_prompt"],
        SUPPORTED_LANGUAGES["ar"]["ivr_prompt"],
        SUPPORTED_LANGUAGES["he"]["ivr_prompt"],
    ]
    return " ".join(prompts)


def get_supported_languages_list() -> list:
    """Returns a list of supported language objects for APIs and UI menus."""
    return list(SUPPORTED_LANGUAGES.values())
