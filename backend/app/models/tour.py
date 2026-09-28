from datetime import datetime
from app.extensions import db

class TourPackage(db.Model):
    __tablename__ = 'tour_packages'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    destination = db.Column(db.String(100), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    duration = db.Column(db.String(50), nullable=False) # e.g. "7 Days / 6 Nights"
    price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    includes = db.Column(db.Text, nullable=True) # e.g. "Hotel, Airport Transfer, City Tour, Desert Safari, Breakfast"
    available_slots = db.Column(db.Integer, default=15)
    image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'destination': self.destination,
            'description': self.description,
            'duration': self.duration,
            'price': self.price,
            'currency': self.currency,
            'includes': [i.strip() for i in self.includes.split(',')] if self.includes else [],
            'available_slots': self.available_slots,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
