from datetime import datetime
from app.extensions import db

class Booking(db.Model):
    __tablename__ = 'bookings'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    booking_reference = db.Column(db.String(50), unique=True, nullable=False, index=True)
    booking_type = db.Column(db.String(30), nullable=False) # FLIGHT, HOTEL, TOUR, PACKAGE
    destination = db.Column(db.String(100), nullable=False)
    departure_date = db.Column(db.Date, nullable=True)
    return_date = db.Column(db.Date, nullable=True)
    passengers = db.Column(db.Integer, default=1)
    total_price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    status = db.Column(db.String(30), default='PENDING') # PENDING, PAYMENT_PENDING, CONFIRMED, COMPLETED, CANCELLED
    notes = db.Column(db.Text, nullable=True)
    
    # Optional linked inventory items
    flight_id = db.Column(db.Integer, db.ForeignKey('flights.id', ondelete='SET NULL'), nullable=True)
    hotel_id = db.Column(db.Integer, db.ForeignKey('hotels.id', ondelete='SET NULL'), nullable=True)
    tour_id = db.Column(db.Integer, db.ForeignKey('tour_packages.id', ondelete='SET NULL'), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    flight = db.relationship('Flight', backref='bookings')
    hotel = db.relationship('Hotel', backref='bookings')
    tour = db.relationship('TourPackage', backref='bookings')
    passenger_list = db.relationship('BookingPassenger', backref='booking', lazy='dynamic', cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='booking', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.full_name if self.customer else 'Unknown',
            'customer_email': self.customer.email if self.customer else None,
            'customer_phone': self.customer.phone if self.customer else None,
            'booking_reference': self.booking_reference,
            'booking_type': self.booking_type,
            'destination': self.destination,
            'departure_date': self.departure_date.isoformat() if self.departure_date else None,
            'return_date': self.return_date.isoformat() if self.return_date else None,
            'passengers': self.passengers,
            'total_price': self.total_price,
            'currency': self.currency,
            'status': self.status,
            'notes': self.notes,
            'flight': self.flight.to_dict() if self.flight else None,
            'hotel': self.hotel.to_dict() if self.hotel else None,
            'tour': self.tour.to_dict() if self.tour else None,
            'passengers_details': [p.to_dict() for p in self.passenger_list],
            'payment_status': self.payments.first().status if self.payments.first() else 'UNPAID',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
