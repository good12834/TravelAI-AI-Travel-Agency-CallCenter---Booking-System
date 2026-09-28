from datetime import datetime
from app.extensions import db

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    channel = db.Column(db.String(20), default='SMS') # SMS, WHATSAPP, EMAIL, CHAT
    direction = db.Column(db.String(20), default='INBOUND') # INBOUND, OUTBOUND
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='DELIVERED') # SENT, DELIVERED, READ, FAILED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.full_name if self.customer else 'Customer',
            'channel': self.channel,
            'direction': self.direction,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
