from datetime import datetime
from app.extensions import db

class Department(db.Model):
    __tablename__ = 'departments'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255))
    code = db.Column(db.String(50), unique=True, nullable=True) # e.g. FLIGHT, HOTEL, FINANCE, VISA
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    agents = db.relationship('Agent', backref='department', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'code': self.code,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'agent_count': self.agents.count()
        }
