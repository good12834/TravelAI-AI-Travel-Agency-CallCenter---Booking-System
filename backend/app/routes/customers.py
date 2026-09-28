from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.customer import Customer
from app.models.call import Call
from app.models.booking import Booking
from app.models.message import Message

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

@customers_bp.route('', methods=['GET'])
def get_customers():
    query = request.args.get('search', '').strip()
    customers_query = Customer.query
    if query:
        customers_query = customers_query.filter(
            (Customer.first_name.ilike(f"%{query}%")) |
            (Customer.last_name.ilike(f"%{query}%")) |
            (Customer.phone.ilike(f"%{query}%")) |
            (Customer.email.ilike(f"%{query}%"))
        )
    customers = customers_query.order_by(Customer.created_at.desc()).all()
    return jsonify([c.to_dict() for c in customers])

@customers_bp.route('/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    return jsonify(customer.to_dict())

@customers_bp.route('', methods=['POST'])
def create_customer():
    data = request.get_json() or {}
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email')
    country = data.get('country', 'United States')
    preferred_language = data.get('preferred_language', 'en')

    if not first_name or not last_name or not phone:
        return jsonify({"error": "first_name, last_name, and phone are required"}), 400

    existing = Customer.query.filter_by(phone=phone).first()
    if existing:
        return jsonify({"error": "Customer with this phone already exists", "customer": existing.to_dict()}), 409

    customer = Customer(
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        email=email,
        country=country,
        preferred_language=preferred_language
    )
    db.session.add(customer)
    db.session.commit()
    return jsonify(customer.to_dict()), 201

@customers_bp.route('/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json() or {}

    for field in ['first_name', 'last_name', 'phone', 'email', 'country', 'preferred_language', 'notes']:
        if field in data:
            setattr(customer, field, data[field])

    db.session.commit()
    return jsonify(customer.to_dict())

@customers_bp.route('/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    db.session.delete(customer)
    db.session.commit()
    return jsonify({"message": f"Customer {customer_id} deleted successfully"})

@customers_bp.route('/<int:customer_id>/calls', methods=['GET'])
def get_customer_calls(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    calls = customer.calls.order_by(Call.created_at.desc()).all()
    return jsonify([c.to_dict() for c in calls])

@customers_bp.route('/<int:customer_id>/bookings', methods=['GET'])
def get_customer_bookings(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    bookings = customer.bookings.order_by(Booking.created_at.desc()).all()
    return jsonify([b.to_dict() for b in bookings])
