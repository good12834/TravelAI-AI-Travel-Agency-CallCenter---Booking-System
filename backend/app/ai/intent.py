import re
from datetime import datetime

class IntentClassifier:
    """
    Intelligent intent classification and entity extraction engine for TravelAI.
    Matches travel intents with confidence scoring and extracts key travel entities.
    """

    DESTINATIONS = [
        "Dubai", "Paris", "London", "Tokyo", "New York", "Rome", 
        "Tel Aviv", "Istanbul", "Barcelona", "Amsterdam", "Bangkok", 
        "Cairo", "Addis Ababa", "Madrid", "Santorini", "Bali"
    ]

    INTENT_KEYWORDS = {
        "HUMAN_AGENT": [
            "agent", "human", "representative", "operator", "person", "speak to someone", 
            "transfer me", "talk to an agent", "customer care person", "נציג", "מוקדן", "አስተናጋጅ", "عميل"
        ],
        "REFUND": [
            "refund", "money back", "reimburse", "chargeback", "payout", "החזר כספי", "استرداد"
        ],
        "CANCELLATION": [
            "cancel", "cancellation", "drop booking", "cancel flight", "cancel hotel", "ביטול", "إلغاء", "መሰረዝ"
        ],
        "COMPLAINT": [
            "complaint", "terrible", "bad service", "unacceptable", "angry", "lawyer", 
            "ruined", "scam", "disaster", "תלונה", "شكوى"
        ],
        "BOOKING_STATUS": [
            "status", "check booking", "reservation details", "my booking", "itinerary", 
            "lookup", "where is my", "סטטוס הזמנה", "حالة الحجز"
        ],
        "VISA": [
            "visa", "passport requirement", "entry permit", "embassy", "border", "ויזה", "דרכון", "تأشيرة"
        ],
        "FLIGHT": [
            "flight", "fly", "airplane", "airline", "plane ticket", "departure", "airport", "טיסה", "כרטיס טיסה", "طيران", "በረራ"
        ],
        "HOTEL": [
            "hotel", "room", "resort", "suite", "check-in", "check-out", "stay", "מלון", "חדר", "فندق", "ሆቴል"
        ],
        "TOUR": [
            "tour", "package", "safari", "excursion", "sightseeing", "vacation package", "סיור", "חבילת נופש", "جولة سياحية", "ጉብኝት"
        ],
        "PRICE": [
            "how much", "cost", "price", "rate", "cheap", "expensive", "quote", "מחיר", "עלות", "كم السعر", "ዋጋ"
        ],
        "BOOKING": [
            "book", "reserve", "reservation", "buy ticket", "purchase", "order", "הזמנה", "להזמין", "حجز"
        ]
    }

    @classmethod
    def detect_language(cls, text: str) -> str:
        text = text or ""
        # Check Hebrew script range
        if re.search(r'[\u0590-\u05FF]', text):
            return "he"
        # Check Arabic script range
        if re.search(r'[\u0600-\u06FF]', text):
            return "ar"
        # Check Ethiopic / Amharic script range
        if re.search(r'[\u1200-\u137F]', text):
            return "am"
        return "en"

    @classmethod
    def extract_entities(cls, text: str) -> dict:
        entities = {}
        text_lower = text.lower()

        # Destination extraction
        for dest in cls.DESTINATIONS:
            if dest.lower() in text_lower:
                entities["destination"] = dest
                break

        # Passenger count extraction
        passenger_match = re.search(r'(\d+)\s*(people|person|passengers?|guests?|adults?)', text_lower)
        if passenger_match:
            entities["passengers"] = int(passenger_match.group(1))
        elif "one passenger" in text_lower or "alone" in text_lower or "solo" in text_lower:
            entities["passengers"] = 1
        elif "two people" in text_lower or "couple" in text_lower or "2 people" in text_lower:
            entities["passengers"] = 2
        elif "family" in text_lower:
            entities["passengers"] = 4

        # Booking Reference extraction (e.g., TRV-2026-0001, BK-1234, etc.)
        ref_match = re.search(r'\b(TRV-[A-Z0-9-]+|[A-Z]{2,3}-\d{4,6})\b', text, re.IGNORECASE)
        if ref_match:
            entities["booking_reference"] = ref_match.group(1).upper()

        # Date extraction (basic pattern e.g., 2026-10-10 or "next month" or "tomorrow")
        date_match = re.search(r'\b\d{4}-\d{2}-\d{2}\b', text)
        if date_match:
            entities["departure_date"] = date_match.group(0)

        # Budget extraction (e.g. $1500, 1500 USD, 1500 dollars)
        budget_match = re.search(r'(\$|USD\s*)(\d+)', text, re.IGNORECASE)
        if budget_match:
            entities["budget"] = float(budget_match.group(2))

        return entities

    @classmethod
    def classify(cls, text: str, use_gemini: bool = True) -> dict:
        text = text or ""
        text_lower = text.lower().strip()
        detected_language = cls.detect_language(text)
        rule_entities = cls.extract_entities(text)

        # Baseline rule-based classification
        scores = {intent: 0.0 for intent in cls.INTENT_KEYWORDS}
        for intent, keywords in cls.INTENT_KEYWORDS.items():
            for kw in keywords:
                if kw in text_lower:
                    scores[intent] += 1.0

        best_intent = "GENERAL"
        max_score = 0.0

        # Prioritize high-importance intents like HUMAN_AGENT, REFUND, COMPLAINT if detected
        for high_prio in ["HUMAN_AGENT", "REFUND", "CANCELLATION", "COMPLAINT"]:
            if scores[high_prio] > 0:
                best_intent = high_prio
                max_score = scores[high_prio]
                break

        if max_score == 0:
            for intent, score in scores.items():
                if score > max_score:
                    max_score = score
                    best_intent = intent

        confidence = 0.95 if max_score >= 2 else (0.85 if max_score == 1 else 0.65)
        
        # If destination is found and text mentions fly/hotel/book
        if best_intent == "GENERAL" and "destination" in rule_entities:
            best_intent = "BOOKING"
            confidence = 0.80

        # Try Gemini enhancement if enabled and text is meaningful
        if use_gemini and len(text.strip()) > 3:
            try:
                from app.ai.gemini_client import GeminiClient
                from app.ai.prompts import INTENT_CLASSES

                prompt = f"""You are an intent classification and entity extraction model for a travel agency call center.
Given customer utterance: "{text}"

Allowed intents strictly one of: {INTENT_CLASSES}
- Prioritize HUMAN_AGENT if user asks for a real human, agent, representative or operator.
- Prioritize REFUND if user asks for money back or refund.
- Prioritize CANCELLATION if user requests to cancel or drop booking/flight/hotel.
- Prioritize COMPLAINT if user expresses anger, threats, or claims of terrible service.

Extract entities if mentioned:
- destination (string, e.g. "Dubai", "Tokyo")
- passengers (integer)
- departure_date (YYYY-MM-DD string or text)
- booking_reference (e.g. "TRV-2026-0001")
- budget (number)

Respond ONLY with valid JSON in this structure:
{{
  "intent": "ONE_OF_ALLOWED_INTENTS",
  "confidence": float between 0.0 and 1.0,
  "language": "en" | "he" | "ar" | "am",
  "entities": {{
    "destination": null or string,
    "passengers": null or integer,
    "departure_date": null or string,
    "booking_reference": null or string,
    "budget": null or float
  }}
}}"""
                gemini_res = GeminiClient.generate_json(prompt)
                if gemini_res and isinstance(gemini_res, dict) and gemini_res.get("intent") in INTENT_CLASSES:
                    g_intent = gemini_res.get("intent")
                    g_conf = float(gemini_res.get("confidence", 0.9))
                    g_lang = gemini_res.get("language") or detected_language
                    g_entities = gemini_res.get("entities") or {}

                    # Merge entities: rule entities + non-null gemini entities
                    merged_entities = dict(rule_entities)
                    for k, v in g_entities.items():
                        if v is not None and v != "":
                            merged_entities[k] = v

                    # If rule classifier detected a high priority safety intent (HUMAN_AGENT/REFUND/CANCELLATION),
                    # honor it to prevent model hallucination misses
                    if best_intent in ["HUMAN_AGENT", "REFUND", "CANCELLATION", "COMPLAINT"]:
                        final_intent = best_intent
                        final_conf = max(confidence, g_conf)
                    elif g_intent == "GENERAL":
                        # Ambiguous or generic intent retains lower confidence threshold
                        final_intent = "GENERAL"
                        final_conf = min(g_conf, 0.70)
                    else:
                        final_intent = g_intent
                        final_conf = g_conf

                    return {
                        "intent": final_intent,
                        "confidence": round(final_conf, 2),
                        "language": g_lang,
                        "entities": merged_entities
                    }
            except Exception:
                pass

        return {
            "intent": best_intent,
            "confidence": round(confidence, 2),
            "language": detected_language,
            "entities": rule_entities
        }
