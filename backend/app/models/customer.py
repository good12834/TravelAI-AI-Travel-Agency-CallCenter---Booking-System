from datetime import datetime
from app.extensions import db

class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    country = db.Column(db.String(100), default='United States')
    preferred_language = db.Column(db.String(20), default='en') # en, am, ar, he
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    calls = db.relationship('Call', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    bookings = db.relationship('Booking', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    messages = db.relationship('Message', backref='customer', lazy='dynamic', cascade='all, delete-orphan')
    ai_sessions = db.relationship('AISession', backref='customer', lazy='dynamic')

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'phone': self.phone,
            'email': self.email,
            'country': self.country,
            'preferred_language': self.preferred_language,
            'notes': self.notes,
            'booking_count': self.bookings.count(),
            'call_count': self.calls.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
