from app.routes.auth import auth_bp
from app.routes.customers import customers_bp
from app.routes.calls import calls_bp
from app.routes.bookings import bookings_bp
from app.routes.flights import flights_bp
from app.routes.hotels import hotels_bp
from app.routes.tours import tours_bp
from app.routes.payments import payments_bp
from app.routes.messages import messages_bp
from app.routes.agents import agents_bp
from app.routes.analytics import analytics_bp
from app.routes.knowledge import knowledge_bp
from app.routes.ai import ai_bp
from app.routes.telephony import telephony_bp
from app.routes.notifications import notifications_bp

__all__ = [
    'auth_bp',
    'customers_bp',
    'calls_bp',
    'bookings_bp',
    'flights_bp',
    'hotels_bp',
    'tours_bp',
    'payments_bp',
    'messages_bp',
    'agents_bp',
    'analytics_bp',
    'knowledge_bp',
    'ai_bp',
    'telephony_bp',
    'notifications_bp'
]
