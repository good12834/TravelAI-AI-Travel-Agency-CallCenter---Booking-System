from datetime import datetime
from app.extensions import db

class AISession(db.Model):
    __tablename__ = 'ai_sessions'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='SET NULL'), nullable=True)
    call_id = db.Column(db.Integer, db.ForeignKey('calls.id', ondelete='SET NULL'), nullable=True)
    language = db.Column(db.String(20), default='en')
    intent = db.Column(db.String(50), default='GENERAL')
    status = db.Column(db.String(30), default='ACTIVE') # ACTIVE, TRANSFERRED, RESOLVED, CLOSED
    context_data = db.Column(db.Text, nullable=True) # JSON store for conversation state & extracted entities
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    messages = db.relationship('AIMessage', backref='session', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'call_id': self.call_id,
            'language': self.language,
            'intent': self.intent,
            'status': self.status,
            'context_data': self.context_data,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'messages': [m.to_dict() for m in self.messages]
        }

class AIMessage(db.Model):
    __tablename__ = 'ai_messages'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('ai_sessions.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(20), nullable=False) # USER, ASSISTANT, SYSTEM
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'role': self.role,
            'message': self.message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
