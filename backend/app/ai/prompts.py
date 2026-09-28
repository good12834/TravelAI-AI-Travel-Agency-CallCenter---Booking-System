"""
Prompts, dialogue templates, and multilingual conversational logic for TravelAI.
Supports English, Amharic, Arabic, and Hebrew.
"""

from app.ai.languages import get_language, SUPPORTED_LANGUAGES

SYSTEM_TRAVEL_ASSISTANT_PROMPT = """You are TravelAI, an expert, polite, and efficient AI travel agency call center assistant.
Your job is to assist travelers with flights, hotel bookings, luxury tours, cancellations, visa policies, and general travel inquiries.
You support multilingual conversations in English, Amharic (አማርኛ), Arabic (العربية), and Hebrew (עברית).

Rules:
1. Always maintain a professional, warm, and concise tone suitable for voice phone calls and live chat.
2. If customer confidence is low, or if the customer expresses frustration, refund disputes, or asks for an agent, recommend transferring to a human specialist.
3. Extract dates, destinations, passenger counts, and travel classes accurately.
4. Reference company policies and flight/hotel availability from the knowledge base when answering.
"""

INTENT_CLASSES = [
    "BOOKING",
    "FLIGHT",
    "HOTEL",
    "TOUR",
    "PRICE",
    "VISA",
    "CANCELLATION",
    "REFUND",
    "COMPLAINT",
    "HUMAN_AGENT",
    "BOOKING_STATUS",
    "GENERAL"
]

LANGUAGE_GREETINGS = {
    "en": "Hello! Thank you for calling TravelAI. How can I help you with your travel plans today?",
    "am": "ሰላም! ወደ ትራቭል ኤአይ (TravelAI) እንኳን ደህና መጡ። የጉዞ ዕቅድዎን ዛሬ እንዴት ልርዳዎት?",
    "ar": "مرحباً بكم في ترافل إيه آي! كيف يمكنني مساعدتكم في خطط سفركم اليوم؟",
    "he": "שלום וברוכים הבאים ל-TravelAI! כיצድ אוכל לסייע לך בתכנון הנסיעה היום?"
}

CONTINUATION_LINES = {
    "en": "I'm still here with you. {hint}Just tell me the destination, travel dates, or booking reference you would like me to work on.",
    "am": "አሁንም ከእርስዎ ጋር ነኝ። {hint}እባክዎ የሚፈልጉትን መድረሻ፣ የጉዞ ቀን ወይም የቦታ ማስያዣ ቁጥር ይንገሩኝ።",
    "ar": "ما زلت معك. {hint}أخبرني فقط بالوجهة أو تواريخ السفر أو رقم الحجز الذي تريد أن أعمل عليه.",
    "he": "אני עדיין איתך. {hint}פשוט תגיד לי את היעד, תאריכי הנסיעה או מספר ההזמנה שתרצה שאטפל בהם."
}

KNOWN_DESTINATION_HINTS = {
    "en": "You mentioned {destination} earlier. ",
    "am": "ቀደም ብለው {destination} ጠቅሰዋል። ",
    "ar": "ذكرت {destination} سابقاً. ",
    "he": "ציינת קודם {destination}. "
}

ACKNOWLEDGEMENT_LINES = {
    "en": {
        "text": "My pleasure! I still have {topic} on file — just tell me whenever you would like me to continue.",
        "topic": "your {destination} booking",
        "generic": "your trip details",
    },
    "am": {
        "text": "ደስ ይለኛል! {topic} አሁንም ይዤያለሁ — መቀጠል ሲፈልጉ ብቻ ይንገሩኝ።",
        "topic": "የ{destination} ቦታ ማስያዣዎን",
        "generic": "የጉዞዎን ዝርዝሮች",
    },
    "ar": {
        "text": "بكل سرور! ما زلت أحتفظ بـ{topic} — أخبرني فقط عندما تريد المتابعة.",
        "topic": "حجز {destination}",
        "generic": "تفاصيل رحلتك",
    },
    "he": {
        "text": "בשמחה! {topic} עדיין שמורים אצלי — רק תגיד לי מתי להמשיך.",
        "topic": "הזמנת {destination}",
        "generic": "פרטי הנסיעה",
    },
}

MULTILINGUAL_ESCALATIONS = {
    "HUMAN_AGENT": {
        "en": "I am transferring you immediately to an available travel specialist. Please hold for just a moment.",
        "am": "አሁኑኑ ወደሚገኝ የጉዞ ባለሙያ እያስተላለፍኩዎት ነው። እባክዎ ጥቂት ጊዜ ይጠብቁ።",
        "ar": "أقوم بتحويلك على الفور إلى أخصائي سفر متاح. يرجى الانتظار للحظة واحدة.",
        "he": "אני מעביר אותך מיד לנציג נסיעות פנוי. אנא המתן רגע קט.",
    },
    "REFUND": {
        "en": "I understand you are requesting a refund. I am pulling up your file and routing you to our Finance & Refunds department now.",
        "am": "የገንዘብ ተመላሽ እንደጠየቁ ተረድቻለሁ። መረጃዎን አውጥቼ ወደ ፋይናንስ እና ተመላሽ ክፍላችን እያስተላለፍኩዎት ነው።",
        "ar": "أفهم أنك تطلب استرداد الأموال. أقوم بسحب ملفك وتحويلك إلى قسم المالية والاسترداد الآن.",
        "he": "אני מבין שאתה מבקש החזר כספי. אני שולף את פרטי ההזמנה שלך ומעביר אותך למחלקת כספים והחזרים כעת.",
    },
    "COMPLAINT": {
        "en": "I sincerely apologize for the frustration. Let me connect you directly with a senior supervisor to resolve this immediately.",
        "am": "ለተፈጠረው ችግር ከልብ ይቅርታ እጠይቃለሁ። ጉዳዩን ወዲያውኑ ለመፍታት በቀጥታ ከከፍተኛ ተቆጣጣሪ ጋር ላገናኝዎት።",
        "ar": "أعتذر بصدق عن هذا الإزعاج. اسمح لي بربطك مباشرة بمشرف لحل هذه المشكلة فوراً.",
        "he": "אני מתנצל מעומק הלב על עגמת הנפש. אקשר אותך ישירות למנהל בכיר לפתרון מיידי של הנושא.",
    },
    "CANCELLATION": {
        "en": "Under our policy, booking cancellations can be processed free of charge up to 48 hours prior to departure. I am transferring you to our booking desk to verify your voucher and authorize cancellation.",
        "am": "በፖሊሲያችን መሠረት፣ የቦታ ማስያዝ ስረዛ ከጉዞው 48 ሰዓታት በፊት በነጻ ሊስተናገድ ይችላል። ቫውቸርዎን ለማረጋገጥ እና ስረዛውን ለማጽደቅ ወደ ማስያዣ ክፍላችን እያስተላለፍኩዎት ነው።",
        "ar": "وفقًا لسياستنا، يمكن إلغاء الحجز مجانًا حتى 48 ساعة قبل المغادرة. أقوم بتحويلك إلى مكتب الحجوزات للتحقق وتأكيد الإلغاء.",
        "he": "על פי המדיניות שלנו, ניתן לבטל הזמנות ללא עלות עד 48 שעות לפני היציאה. אני מעביר אותך לדלפק ההזמנות לאימות השובר ואישור הביטול.",
    },
}

CONVERSATION_PROMPT_TEMPLATE = """You are TravelAI, the travel agency call center agent handling this live conversation.

Customer preferred language: {language_name} ({language_locale})
Details already collected from the customer this session:
{known_entities}

Conversation so far:
{history}

Customer's latest message: "{message}"

Reply as TravelAI in one or two short, natural spoken sentences.
- Respond STRICTLY in the customer's preferred language ({language_name}).
- Never greet the customer again or reintroduce yourself: the call is already in progress.
- Use the details already collected above; never ask again for information the customer already gave.
- Only ask a question when a detail is genuinely still missing.
- Help with flights, hotels, tours, and bookings without inventing unavailable inventory.
"""


def build_system_prompt(language_code: str) -> str:
    """
    Builds a language-specific system prompt for LLM conversation.
    Conforms to Step 5 of the multilingual voice specification.
    """
    language = get_language(language_code)
    lang_name = language.get("name", "English")
    lang_native = language.get("native", lang_name)
    locale = language.get("locale", "en-US")

    return f"""You are TravelAI, an expert multilingual travel agency assistant.

The customer's preferred language is:
{lang_name} ({lang_native}) - Locale: {locale}

Rules:
- Respond in the customer's preferred language ({lang_name}).
- Use clear, natural, conversational spoken language suitable for phone voice calls.
- Help with flights, hotels, tours, and bookings.
- Ask questions when required information is missing.
- Never invent prices or booking availability.
- Escalate complex requests, refunds, or complaints to a human agent.
"""


def prepare_ai_request(message: str, language_code: str) -> dict:
    """
    Prepares system prompt and user message bundle for the LLM request.
    Conforms to Step 5 of the multilingual voice specification.
    """
    return {
        "system_prompt": build_system_prompt(language_code),
        "user_message": message,
        "language": language_code,
    }


def continuation_line(language: str, destination: str = None) -> str:
    """Continuation reply used instead of the greeting once a conversation is underway."""
    lang_code = get_language(language)["code"]
    template = CONTINUATION_LINES.get(lang_code, CONTINUATION_LINES["en"])
    hint = ""
    if destination:
        hint_template = KNOWN_DESTINATION_HINTS.get(lang_code, KNOWN_DESTINATION_HINTS["en"])
        hint = hint_template.format(destination=destination)
    return template.format(hint=hint)


def acknowledgement_line(language: str, destination: str = None) -> str:
    """Courteous reply for a turn that carried no new travel detail."""
    lang_code = get_language(language)["code"]
    phrases = ACKNOWLEDGEMENT_LINES.get(lang_code, ACKNOWLEDGEMENT_LINES["en"])
    topic = phrases["topic"].format(destination=destination) if destination else phrases["generic"]
    return phrases["text"].format(topic=topic)


def escalation_line(intent: str, language: str = "en") -> str:
    """Returns localized escalation line for human transfer."""
    lang_code = get_language(language)["code"]
    intent_escalations = MULTILINGUAL_ESCALATIONS.get(intent, MULTILINGUAL_ESCALATIONS["HUMAN_AGENT"])
    return intent_escalations.get(lang_code, intent_escalations["en"])


def format_known_entities(entities: dict) -> str:
    """Render the session entities for the LLM prompt, or a placeholder when empty."""
    if not entities:
        return "- nothing collected yet"
    return "\n".join(f"- {key.replace('_', ' ')}: {value}" for key, value in sorted(entities.items()))


def format_history(history: list, limit: int = 8) -> str:
    """Render the recent conversation turns for the LLM prompt."""
    if not history:
        return "- no previous turns"
    labels = {"USER": "Customer", "CUSTOMER": "Customer", "ASSISTANT": "TravelAI", "AI": "TravelAI"}
    lines = []
    for turn in history[-limit:]:
        role = labels.get(str(turn.get("role", "")).upper(), "Customer")
        message = str(turn.get("message", "")).strip()
        if message:
            lines.append(f"{role}: {message}")
    return "\n".join(lines) if lines else "- no previous turns"
