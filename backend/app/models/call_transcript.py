from datetime import datetime
from app.extensions import db

class CallTranscript(db.Model):
    __tablename__ = 'call_transcripts'

    id = db.Column(db.Integer, primary_key=True)
    call_id = db.Column(db.Integer, db.ForeignKey('calls.id', ondelete='CASCADE'), nullable=False)
    speaker = db.Column(db.String(20), nullable=False) # CUSTOMER, AI, AGENT, SYSTEM
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'call_id': self.call_id,
            'speaker': self.speaker,
            'message': self.message,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
