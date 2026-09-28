from flask import Blueprint, request, jsonify
from app.models.payment import Payment
from app.services.customer_service import PaymentService

payments_bp = Blueprint('payments', __name__, url_prefix='/api/payments')

@payments_bp.route('', methods=['GET'])
def get_payments():
    payments = Payment.query.order_by(Payment.created_at.desc()).all()
    return jsonify([p.to_dict() for p in payments])

@payments_bp.route('/<int:payment_id>', methods=['GET'])
def get_payment(payment_id):
    payment = Payment.query.get_or_404(payment_id)
    return jsonify(payment.to_dict())

@payments_bp.route('', methods=['POST'])
def create_payment():
    data = request.get_json() or {}
    booking_id = data.get('booking_id')
    amount = float(data.get('amount', 0))
    method = data.get('payment_method', 'CREDIT_CARD')
    currency = data.get('currency', 'USD')
    token = data.get('payment_token') or data.get('token') or 'pm_card_visa'

    if not booking_id or amount <= 0:
        return jsonify({"error": "Valid booking_id and amount are required"}), 400

    try:
        payment = PaymentService.process_payment(booking_id, amount, method, currency, token=token)
        return jsonify(payment.to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@payments_bp.route('/<int:payment_id>/refund', methods=['POST'])
def refund_payment(payment_id):
    try:
        payment = PaymentService.refund_payment(payment_id)
        return jsonify(payment.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

