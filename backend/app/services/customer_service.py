import uuid
from datetime import datetime
from app.extensions import db, socketio
from app.models.customer import Customer
from app.models.payment import Payment
from app.models.booking import Booking
from app.models.notification import Notification

class CustomerService:
    @classmethod
    def get_or_create(cls, phone: str, first_name: str = "Valued", last_name: str = "Traveler", email: str = None) -> Customer:
        customer = Customer.query.filter_by(phone=phone).first()
        if not customer:
            customer = Customer(
                phone=phone,
                first_name=first_name,
                last_name=last_name,
                email=email,
                country="United States",
                preferred_language="en"
            )
            db.session.add(customer)
            db.session.commit()
        return customer

class PaymentService:
    @classmethod
    def process_payment(cls, booking_id: int, amount: float, method: str = "CREDIT_CARD", currency: str = "USD", token: str = "pm_card_visa") -> Payment:
        from app.integrations.payment import PaymentGatewayIntegration

        booking = Booking.query.get_or_404(booking_id)

        # Call live payment gateway (Stripe or mock)
        gateway_res = PaymentGatewayIntegration.charge(
            amount=amount,
            currency=currency,
            token=token,
            metadata={"booking_id": booking.id, "booking_reference": booking.booking_reference}
        )

        ref = gateway_res.get("charge_id") or f"PAY-{uuid.uuid4().hex[:8].upper()}"
        pay_status = "PAID" if gateway_res.get("status") == "SUCCESS" else "PENDING"

        payment = Payment(
            booking_id=booking.id,
            amount=amount,
            currency=currency.upper(),
            payment_method=method,
            transaction_reference=ref,
            status=pay_status,
            paid_at=datetime.utcnow()
        )
        db.session.add(payment)
        if pay_status == "PAID":
            booking.status = "CONFIRMED"
        db.session.commit()

        # Emit socket event
        try:
            socketio.emit('payment:received', payment.to_dict())
        except Exception:
            pass

        return payment

    @classmethod
    def refund_payment(cls, payment_id: int) -> Payment:
        from app.integrations.payment import PaymentGatewayIntegration

        payment = Payment.query.get_or_404(payment_id)

        # Execute refund through Payment Gateway
        PaymentGatewayIntegration.refund(
            charge_id=payment.transaction_reference,
            amount=payment.amount
        )

        payment.status = "REFUNDED"
        db.session.commit()
        return payment

class NotificationService:
    @classmethod
    def send_notification(cls, title: str, message: str, n_type: str = "SYSTEM", user_id: int = None) -> Notification:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=n_type
        )
        db.session.add(notif)
        db.session.commit()

        try:
            socketio.emit('notification:new', notif.to_dict())
        except Exception:
            pass

        return notif
