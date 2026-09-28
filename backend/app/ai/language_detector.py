"""
Intelligent language detection and dynamic in-call language switching engine.
Supports English (en), Amharic (am), Arabic (ar), and Hebrew (he).
"""

import re
from app.ai.languages import SUPPORTED_LANGUAGES, get_language

# Script character ranges
RE_HEBREW = re.compile(r'[\u0590-\u05FF]')
RE_ARABIC = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]')
RE_AMHARIC = re.compile(r'[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]')

# Language switch request trigger phrases mapped to target language code
LANGUAGE_SWITCH_PATTERNS = {
    "am": [
        r'\b(speak|talk in|switch to|change to|translate to)\s+(amharic|amharigna|amharik)\b',
        r'\bcan you speak (amharic|amharigna)\b',
        r'በአማርኛ',
        r'አማርኛ\s*(ተናገር|ልቀይር|እንነጋገር|ይቻላል)?',
        r'ለአማርኛ',
        r'ወደ አማርኛ\s*(ቀይር|ቀይሩ)?',
    ],
    "ar": [
        r'\b(speak|talk in|switch to|change to|translate to)\s+(arabic|arabiya)\b',
        r'\bcan you speak arabic\b',
        r'بالعربية',
        r'تكلم\s*(عربي|بالعربية)',
        r'حول\s*(إلى|الى)?\s*العربية',
        r'للعربية',
        r'أريد التحدث بالعربية',
    ],
    "he": [
        r'\b(speak|talk in|switch to|change to|translate to)\s+(hebrew|ivrit)\b',
        r'\bcan you speak hebrew\b',
        r'בעברית',
        r'תדבר\s*(עברית|בעברית)?',
        r'לעבור\s*לעברית',
        r'לעברית',
        r'אפשר לדבר בעברית',
    ],
    "en": [
        r'\b(speak|talk in|switch to|change to|translate to)\s+(english|eng)\b',
        r'\bcan you speak english\b',
        r'in english',
        r'بالانجليزية|بالإنجليزي',
        r'באנגלית|לדבר באנגלית',
        r'በእንግሊዝኛ|እንግሊዝኛ ተናገር',
    ],
}


class LanguageDetector:
    """
    Detects language of incoming text and determines whether caller
    requested an in-call language switch.
    """

    @classmethod
    def detect_language(cls, text: str) -> str:
        """
        Detects primary language based on unicode script analysis.
        Returns one of: 'am', 'ar', 'he', 'en'.
        """
        if not text:
            return "en"

        text_str = str(text)

        # Ethiopic script (Amharic)
        if RE_AMHARIC.search(text_str):
            return "am"

        # Hebrew script
        if RE_HEBREW.search(text_str):
            return "he"

        # Arabic script
        if RE_ARABIC.search(text_str):
            return "ar"

        return "en"

    @classmethod
    def detect_language_switch_request(cls, text: str) -> str | None:
        """
        Checks whether customer explicitly requested to change the conversation language.
        Returns the new target language code ('am', 'ar', 'he', 'en') or None.
        """
        if not text:
            return None

        clean_text = str(text).strip().lower()

        for lang_code, patterns in LANGUAGE_SWITCH_PATTERNS.items():
            for pat in patterns:
                if re.search(pat, clean_text, re.IGNORECASE):
                    return lang_code

        return None
