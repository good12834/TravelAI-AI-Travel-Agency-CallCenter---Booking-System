from datetime import datetime
from app.extensions import db

class CallRecording(db.Model):
    __tablename__ = 'call_recordings'

    id = db.Column(db.Integer, primary_key=True)
    call_id = db.Column(db.Integer, db.ForeignKey('calls.id', ondelete='CASCADE'), nullable=False)
    recording_url = db.Column(db.String(255), nullable=False)
    duration = db.Column(db.Integer, default=0) # duration in seconds
    storage_provider = db.Column(db.String(50), default='local') # local, s3, azure
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'call_id': self.call_id,
            'recording_url': self.recording_url,
            'duration': self.duration,
            'storage_provider': self.storage_provider,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
