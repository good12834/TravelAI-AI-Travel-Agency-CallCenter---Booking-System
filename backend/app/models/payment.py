from datetime import datetime
from app.extensions import db

class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    payment_method = db.Column(db.String(50), default='CREDIT_CARD') # CREDIT_CARD, PAYPAL, BANK_TRANSFER, STRIPE
    transaction_reference = db.Column(db.String(100), unique=True, nullable=False)
    status = db.Column(db.String(30), default='PAID') # PENDING, PAID, FAILED, REFUNDED
    paid_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'booking_id': self.booking_id,
            'amount': self.amount,
            'currency': self.currency,
            'payment_method': self.payment_method,
            'transaction_reference': self.transaction_reference,
            'status': self.status,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
