from app.extensions import db
from app.models.department import Department
from app.models.agent import Agent

class RoutingService:
    ROUTING_RULES = {
        "FLIGHT": "Flight Department",
        "HOTEL": "Hotel Department",
        "TOUR": "Booking Department",
        "BOOKING": "Booking Department",
        "VISA": "Visa Department",
        "REFUND": "Finance Department",
        "COMPLAINT": "Customer Support",
        "HUMAN_AGENT": "Customer Support",
        "BOOKING_STATUS": "Booking Department",
        "PRICE": "Customer Support",
        "GENERAL": "Customer Support"
    }

    @classmethod
    def get_department_for_intent(cls, intent: str) -> str:
        return cls.ROUTING_RULES.get(intent, "Customer Support")

    @classmethod
    def find_available_agent(cls, department_name: str = None, language_code: str = None) -> Agent:
        """
        Locates an available agent in the specified department who speaks the caller's language.
        Prioritizes lowest active workload. Falls back gracefully if no language-specific agent is free.
        """
        query = Agent.query.filter_by(status='AVAILABLE')

        dept = None
        if department_name:
            dept = Department.query.filter(Department.name.ilike(f"%{department_name}%")).first()

        # 1. Department + Language match
        if dept and language_code:
            dept_agents = query.filter_by(department_id=dept.id).order_by(Agent.active_calls_count.asc()).all()
            for agent in dept_agents:
                if agent.speaks_language(language_code):
                    return agent

        # 2. Any agent in system who speaks the language
        if language_code:
            all_available = query.order_by(Agent.active_calls_count.asc()).all()
            for agent in all_available:
                if agent.speaks_language(language_code):
                    return agent

        # 3. Department match (any language)
        if dept:
            agent = query.filter_by(department_id=dept.id).order_by(Agent.active_calls_count.asc()).first()
            if agent:
                return agent

        # 4. Fallback to any available agent
        return query.order_by(Agent.active_calls_count.asc()).first()

    @classmethod
    def check_escalation_rules(cls, confidence: float, intent: str, sentiment: str, user_requested_agent: bool = False) -> tuple[bool, str]:
        """
        Returns (should_escalate, reason)
        Rules:
        - confidence < 0.70
        - user requested agent
        - intent in [REFUND, COMPLAINT, CANCELLATION]
        - sentiment in [FRUSTRATED, NEGATIVE]
        """
        if user_requested_agent or intent == "HUMAN_AGENT":
            return True, "Customer explicitly requested human agent"
        if confidence < 0.70:
            return True, f"AI confidence ({confidence:.2f}) below threshold (0.70)"
        if intent == "REFUND":
            return True, "Financial refund transaction requires human authorization"
        if intent == "COMPLAINT" or sentiment == "FRUSTRATED":
            return True, "Escalated due to customer frustration / complaint"
        return False, "Handled autonomously by AI"
