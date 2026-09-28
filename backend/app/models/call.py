from datetime import datetime
from app.extensions import db
from app.ai.languages import get_language

class Call(db.Model):
    __tablename__ = 'calls'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='SET NULL'), nullable=True)
    agent_id = db.Column(db.Integer, db.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True)
    phone_number = db.Column(db.String(50), nullable=False)
    direction = db.Column(db.String(20), default='INBOUND') # INBOUND, OUTBOUND
    status = db.Column(db.String(30), default='RINGING') # RINGING, IN_PROGRESS, ON_HOLD, TRANSFERRED, COMPLETED, MISSED, FAILED
    language_code = db.Column(db.String(10), default='en') # en, am, ar, he
    intent = db.Column(db.String(50), default='GENERAL') # BOOKING, FLIGHT, HOTEL, TOUR, PRICE, VISA, CANCELLATION, REFUND, COMPLAINT, HUMAN_AGENT, BOOKING_STATUS, GENERAL
    sentiment = db.Column(db.String(20), default='NEUTRAL') # POSITIVE, NEUTRAL, NEGATIVE, FRUSTRATED
    priority = db.Column(db.String(20), default='MEDIUM') # LOW, MEDIUM, HIGH, URGENT
    confidence = db.Column(db.Float, default=0.90)
    duration = db.Column(db.Integer, default=0) # duration in seconds
    recording_url = db.Column(db.String(255), nullable=True)
    ai_summary = db.Column(db.Text, nullable=True)
    department_assigned = db.Column(db.String(100), nullable=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    transcripts = db.relationship('CallTranscript', backref='call', lazy='dynamic', cascade='all, delete-orphan')
    recordings = db.relationship('CallRecording', backref='call', lazy='dynamic', cascade='all, delete-orphan')
    ai_sessions = db.relationship('AISession', backref='call', lazy='dynamic')

    def to_dict(self):
        lang_code = self.language_code or (self.customer.preferred_language if self.customer else 'en')
        lang_meta = get_language(lang_code)

        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.full_name if self.customer else 'Unknown Caller',
            'customer_phone': self.customer.phone if self.customer else self.phone_number,
            'customer_language': lang_code,
            'language_code': lang_code,
            'language_name': lang_meta.get('name', 'English'),
            'language_native': lang_meta.get('native', 'English'),
            'language_flag': lang_meta.get('flag', '🌐'),
            'agent_id': self.agent_id,
            'agent_name': self.assigned_agent.user.name if self.assigned_agent and self.assigned_agent.user else 'AI Assistant',
            'phone_number': self.phone_number,
            'direction': self.direction,
            'status': self.status,
            'intent': self.intent,
            'sentiment': self.sentiment,
            'priority': self.priority,
            'confidence': self.confidence,
            'duration': self.duration,
            'recording_url': self.recording_url,
            'ai_summary': self.ai_summary,
            'department_assigned': self.department_assigned,
            'live_duration_seconds': self.live_duration_seconds(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'transcript_count': self.transcripts.count()
        }

    def live_duration_seconds(self):
        """Real elapsed seconds for an active call, or the final duration once ended."""
        if not self.started_at or self.ended_at:
            return self.duration or 0
        return max(0, int((datetime.utcnow() - self.started_at).total_seconds()))
