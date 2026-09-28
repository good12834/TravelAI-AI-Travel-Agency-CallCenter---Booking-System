import json
from datetime import datetime, timedelta

from app.extensions import db
from app.models.ai_session import AISession, AIMessage
from app.models.call import Call
from app.models.call_transcript import CallTranscript

class AISessionService:
    """
    Persists the AI conversation memory for a live call or an omnichannel chat.

    `VoiceAgent.process_utterance()` has always been able to merge entities across
    turns, but nothing stored that state: every turn was processed from scratch, so
    a caller saying "Dubai" and then "for 4 people" got two unrelated replies and
    the assistant re-introduced itself mid-call. This service keeps the state in
    `AISession.context_data` (entities, turn count, greeting flag) plus the turn log
    in `AIMessage`, and hands it back to the agent on the next turn.
    """

    # Chats without a call (SMS/WhatsApp/Email) keep their memory only for a while,
    # otherwise last week's destination would leak into today's conversation.
    SESSION_TTL_HOURS = 6

    HISTORY_LIMIT = 12

    CONTEXT_DEFAULTS = {
        "entities": {},
        "turn_count": 0,
        "greeted": False,
        "last_intent": None,
        "last_ai_response": None,
    }

    @classmethod
    def _load_context_data(cls, session: AISession) -> dict:
        """Parse `context_data` tolerantly so a corrupt blob can never break a call."""
        context = dict(cls.CONTEXT_DEFAULTS)
        context["entities"] = {}
        if not session or not session.context_data:
            return context
        try:
            stored = json.loads(session.context_data)
        except (TypeError, ValueError):
            return context
        if not isinstance(stored, dict):
            return context
        for key in cls.CONTEXT_DEFAULTS:
            value = stored.get(key)
            if key == "entities":
                context["entities"] = value if isinstance(value, dict) else {}
            elif value is not None:
                context[key] = value
        return context

    @classmethod
    def _seed_from_call(cls, call: Call) -> dict:
        """
        A call that already opened with a welcome line has been greeted, and any
        customer turns already on the record count towards the turn number — so the
        agent never says "Thank you for calling TravelAI" a second time.
        """
        context = dict(cls.CONTEXT_DEFAULTS)
        context["entities"] = {}
        if not call:
            return context

        context["turn_count"] = call.transcripts.filter_by(speaker="CUSTOMER").count()
        context["greeted"] = call.transcripts.filter_by(speaker="AI").count() > 0
        context["last_intent"] = call.intent if call.intent and call.intent != "GENERAL" else None

        # Rebuild collected entities from the turns that happened before this
        # session was created (e.g. the caller restates details after a reconnect).
        from app.ai.intent import IntentClassifier

        for transcript in call.transcripts.order_by(CallTranscript.timestamp.asc()).all():
            if transcript.speaker == "CUSTOMER":
                context["entities"].update(IntentClassifier.extract_entities(transcript.message or ""))
        return context

    @classmethod
    def get_or_create_session(cls, call_id: int = None, customer_id: int = None,
                              language: str = None) -> AISession:
        """Return the active AI memory for this call (preferred) or this customer."""
        session = None
        call = Call.query.get(call_id) if call_id else None

        if call_id:
            session = (
                AISession.query
                .filter_by(call_id=call_id)
                .order_by(AISession.id.desc())
                .first()
            )
        elif customer_id:
            cutoff = datetime.utcnow() - timedelta(hours=cls.SESSION_TTL_HOURS)
            session = (
                AISession.query
                .filter_by(customer_id=customer_id, status="ACTIVE")
                .filter(AISession.started_at >= cutoff)
                .order_by(AISession.id.desc())
                .first()
            )

        if session:
            return session

        seed = cls._seed_from_call(call) if call else dict(cls.CONTEXT_DEFAULTS)
        context = {**cls.CONTEXT_DEFAULTS, **seed, "entities": dict(seed.get("entities") or {})}

        session = AISession(
            customer_id=customer_id or (call.customer_id if call else None),
            call_id=call_id,
            language=language or "en",
            intent="GENERAL",
            status="ACTIVE",
            context_data=json.dumps(context),
            started_at=datetime.utcnow(),
        )
        db.session.add(session)
        db.session.commit()
        return session

    @classmethod
    def build_context(cls, session: AISession) -> dict:
        """Session context handed to `VoiceAgent.process_utterance()` on the next turn."""
        context = cls._load_context_data(session)
        context["session_id"] = session.id if session else None
        return context

    @classmethod
    def load_history(cls, session: AISession, limit: int = HISTORY_LIMIT) -> list:
        """Most recent conversation turns, oldest first, for the LLM fallback prompt."""
        if not session:
            return []
        messages = (
            session.messages
            .order_by(AIMessage.created_at.desc(), AIMessage.id.desc())
            .limit(limit)
            .all()
        )
        return [{"role": m.role, "message": m.message} for m in reversed(messages)]

    @classmethod
    def save_turn(cls, session: AISession, customer_message: str, ai_result: dict) -> AISession:
        """
        Persist one completed turn: merged entities + turn counter in `context_data`
        and the customer/assistant messages in `AIMessage`.
        """
        if not session:
            return session

        context = cls._load_context_data(session)
        result_context = ai_result.get("session_context") or {}

        merged_entities = dict(context["entities"])
        merged_entities.update(result_context.get("entities") or {})
        merged_entities.update(ai_result.get("entities") or {})

        context["entities"] = merged_entities
        context["turn_count"] = int(
            result_context.get("turn_count")
            or ai_result.get("turn_count")
            or (int(context.get("turn_count") or 0) + 1)
        )
        context["greeted"] = bool(result_context.get("greeted", context.get("greeted")))
        context["last_intent"] = ai_result.get("intent") or context.get("last_intent")
        context["last_ai_response"] = ai_result.get("response")

        session.context_data = json.dumps(context)
        session.intent = ai_result.get("intent") or session.intent
        session.language = ai_result.get("language") or session.language
        if ai_result.get("should_escalate"):
            session.status = "TRANSFERRED"

        if customer_message:
            db.session.add(AIMessage(session_id=session.id, role="USER", message=customer_message))
        if ai_result.get("response"):
            db.session.add(AIMessage(session_id=session.id, role="ASSISTANT", message=ai_result["response"]))

        db.session.commit()
        return session

    @classmethod
    def close_session(cls, call_id: int = None, customer_id: int = None) -> int:
        """Mark the memory of a finished call/conversation as closed."""
        query = AISession.query.filter_by(status="ACTIVE")
        if call_id:
            query = query.filter_by(call_id=call_id)
        elif customer_id:
            query = query.filter_by(customer_id=customer_id)
        else:
            return 0

        sessions = query.all()
        for session in sessions:
            session.status = "CLOSED"
            session.ended_at = datetime.utcnow()
        if sessions:
            db.session.commit()
        return len(sessions)
