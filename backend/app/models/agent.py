from datetime import datetime
from app.extensions import db

class Agent(db.Model):
    __tablename__ = 'agents'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.String(50), default='AVAILABLE') # AVAILABLE, BUSY, OFFLINE
    extension = db.Column(db.String(20), nullable=True)
    languages = db.Column(db.String(100), default='en') # e.g. 'en,am', 'en,ar', 'en,he', 'en,am,ar,he'
    active_calls_count = db.Column(db.Integer, default=0)
    completed_calls_count = db.Column(db.Integer, default=0)
    avg_call_duration_seconds = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    calls = db.relationship('Call', backref='assigned_agent', lazy='dynamic')

    def speaks_language(self, lang_code: str) -> bool:
        if not lang_code:
            return True
        code = lang_code.split("-")[0].lower()
        spoken = [l.strip().lower() for l in (self.languages or 'en').split(',') if l.strip()]
        return code in spoken or 'all' in spoken

    def to_dict(self):
        langs = [l.strip().lower() for l in (self.languages or 'en').split(',') if l.strip()]
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'user_email': self.user.email if self.user else None,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else 'General',
            'status': self.status,
            'extension': self.extension,
            'languages': langs,
            'languages_str': self.languages or 'en',
            'active_calls_count': self.active_calls_count,
            'completed_calls_count': self.completed_calls_count,
            'avg_call_duration_seconds': self.avg_call_duration_seconds,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
