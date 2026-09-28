import re

class SentimentAnalyzer:
    """
    Analyzes customer sentiment, urgency, and escalation requirements.
    """

    # A model reading must be this negative (and labelled FRUSTRATED) before it can
    # hand a caller to a supervisor on its own. Borderline guesses — "and I need it
    # from tomorrow" scored -0.6 — used to interrupt calm booking calls with an
    # apology and a supervisor transfer.
    LLM_FRUSTRATION_SCORE = -0.7

    POSITIVE_WORDS = {
        "great", "thank", "thanks", "awesome", "excellent", "good", "perfect", 
        "wonderful", "happy", "love", "helpful", "appreciate", "מעולה", "תודה", "ممتاز", "شكرا", "አመሰግናለሁ"
    }

    NEGATIVE_WORDS = {
        "bad", "terrible", "horrible", "delay", "cancel", "disappointed", "problem", 
        "issue", "wrong", "mistake", "annoying", "poor", "רע", "בעיה", "سيء", "مشكلة"
    }

    FRUSTRATED_WORDS = {
        "angry", "furious", "unacceptable", "scam", "sue", "lawyer", "robbery", 
        "ridiculous", "incompetent", "garbage", "urgent", "emergency", "כועס", "בושה", "غاضب"
    }

    @classmethod
    def _lexicon_hits(cls, tokens: list, lexicon: set) -> int:
        """
        Count lexicon hits on whole words (allowing inflections such as
        "cancelled" -> "cancel"). Matching inside words made calm turns look
        frustrated: "my booking has an issue" contains "sue" and was escalated.
        """
        return sum(
            1 for token in tokens
            if any(token == word or token.startswith(word) for word in lexicon)
        )

    @classmethod
    def analyze(cls, text: str, use_gemini: bool = True) -> dict:
        raw_text = text or ""
        text_lower = raw_text.lower()
        # \w keeps Hebrew/Arabic/Ethiopic words intact while dropping punctuation
        tokens = re.findall(r"[\w']+", text_lower)

        pos_count = cls._lexicon_hits(tokens, cls.POSITIVE_WORDS)
        neg_count = cls._lexicon_hits(tokens, cls.NEGATIVE_WORDS)
        frust_count = cls._lexicon_hits(tokens, cls.FRUSTRATED_WORDS)

        if frust_count > 0:
            sentiment = "FRUSTRATED"
            priority = "URGENT"
            escalate = True
            score = -0.85
        elif neg_count > pos_count:
            sentiment = "NEGATIVE"
            priority = "HIGH"
            escalate = True if neg_count >= 2 else False
            score = -0.5
        elif pos_count > neg_count:
            sentiment = "POSITIVE"
            priority = "LOW"
            escalate = False
            score = 0.8
        else:
            sentiment = "NEUTRAL"
            priority = "MEDIUM"
            escalate = False
            score = 0.0

        # Try Gemini sentiment refinement if enabled
        if use_gemini and len(raw_text.strip()) > 3:
            try:
                from app.ai.gemini_client import GeminiClient

                prompt = f"""You are a customer sentiment and escalation analyzer for a travel call center.
Customer utterance: "{raw_text}"

Allowed sentiment values: "POSITIVE", "NEUTRAL", "NEGATIVE", "FRUSTRATED"
Allowed priority values: "LOW", "MEDIUM", "HIGH", "URGENT"
sentiment_score: float between -1.0 (most frustrated/negative) and 1.0 (happiest/positive).
escalate_recommended: boolean (true if customer is angry, demanding supervisor/lawyer, or has severe issue).

Respond ONLY with valid JSON in this format:
{{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "FRUSTRATED",
  "sentiment_score": float,
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "escalate_recommended": boolean
}}"""
                gemini_res = GeminiClient.generate_json(prompt)
                if gemini_res and isinstance(gemini_res, dict) and "sentiment" in gemini_res:
                    g_sentiment = gemini_res.get("sentiment")
                    g_score = float(gemini_res.get("sentiment_score", score))
                    g_priority = gemini_res.get("priority", priority)
                    g_escalate = bool(gemini_res.get("escalate_recommended", escalate))

                    # Safety check: if rule engine found explicit FRUSTRATED triggers, prioritize escalation
                    if sentiment == "FRUSTRATED":
                        final_sentiment = "FRUSTRATED"
                        final_priority = "URGENT"
                        final_escalate = True
                        final_score = min(score, g_score)
                    else:
                        # Handing a caller to a supervisor is high impact, so a model-only
                        # reading must be emphatic to escalate on its own; otherwise the
                        # explicit lexicon hit is what authorizes the handoff.
                        emphatic_frustration = (
                            g_sentiment == "FRUSTRATED" and g_score <= cls.LLM_FRUSTRATION_SCORE
                        )
                        final_sentiment = g_sentiment
                        final_priority = g_priority
                        final_escalate = escalate or (g_escalate and emphatic_frustration)
                        final_score = g_score

                    return {
                        "sentiment": final_sentiment,
                        "sentiment_score": round(final_score, 2),
                        "priority": final_priority,
                        "escalate_recommended": final_escalate
                    }
            except Exception:
                pass

        return {
            "sentiment": sentiment,
            "sentiment_score": score,
            "priority": priority,
            "escalate_recommended": escalate
        }
