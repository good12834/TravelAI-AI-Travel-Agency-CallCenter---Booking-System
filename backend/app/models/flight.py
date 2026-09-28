from datetime import datetime
from app.extensions import db

class Flight(db.Model):
    __tablename__ = 'flights'

    id = db.Column(db.Integer, primary_key=True)
    airline = db.Column(db.String(100), nullable=False)
    flight_number = db.Column(db.String(20), unique=True, nullable=False)
    origin = db.Column(db.String(100), nullable=False)
    destination = db.Column(db.String(100), nullable=False)
    departure_time = db.Column(db.DateTime, nullable=False)
    arrival_time = db.Column(db.DateTime, nullable=False)
    price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    available_seats = db.Column(db.Integer, default=50)
    cabin_class = db.Column(db.String(50), default='Economy') # Economy, Premium Economy, Business, First
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'airline': self.airline,
            'flight_number': self.flight_number,
            'origin': self.origin,
            'destination': self.destination,
            'departure_time': self.departure_time.isoformat() if self.departure_time else None,
            'arrival_time': self.arrival_time.isoformat() if self.arrival_time else None,
            'price': self.price,
            'currency': self.currency,
            'available_seats': self.available_seats,
            'cabin_class': self.cabin_class,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
