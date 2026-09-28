from datetime import datetime
from app.extensions import db

class Hotel(db.Model):
    __tablename__ = 'hotels'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    location = db.Column(db.String(150), nullable=False)
    city = db.Column(db.String(100), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    rating = db.Column(db.Float, default=4.5)
    price_per_night = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    available_rooms = db.Column(db.Integer, default=20)
    amenities = db.Column(db.String(255), default='WiFi, Swimming Pool, Spa, Airport Shuttle, Breakfast Included')
    image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'city': self.city,
            'description': self.description,
            'rating': self.rating,
            'price_per_night': self.price_per_night,
            'currency': self.currency,
            'available_rooms': self.available_rooms,
            'amenities': [a.strip() for a in self.amenities.split(',')] if self.amenities else [],
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
