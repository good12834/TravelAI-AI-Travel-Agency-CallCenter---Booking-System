from app.extensions import db

class BookingPassenger(db.Model):
    __tablename__ = 'booking_passengers'

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=True)
    passport_number = db.Column(db.String(50), nullable=True)
    nationality = db.Column(db.String(50), default='United States')

    def to_dict(self):
        return {
            'id': self.id,
            'booking_id': self.booking_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'passport_number': self.passport_number,
            'nationality': self.nationality
        }
