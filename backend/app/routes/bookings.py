from flask import Blueprint, request, jsonify
from datetime import datetime
from app.extensions import db
from app.models.booking import Booking
from app.models.customer import Customer
from app.services.booking_service import BookingService

bookings_bp = Blueprint('bookings', __name__, url_prefix='/api/bookings')

@bookings_bp.route('', methods=['GET'])
def get_bookings():
    status = request.args.get('status')
    b_type = request.args.get('type')
    destination = request.args.get('destination')

    query = Booking.query
    if status:
        query = query.filter_by(status=status.upper())
    if b_type:
        query = query.filter_by(booking_type=b_type.upper())
    if destination:
        query = query.filter(Booking.destination.ilike(f"%{destination}%"))

    bookings = query.order_by(Booking.created_at.desc()).all()
    return jsonify([b.to_dict() for b in bookings])

@bookings_bp.route('/<int:booking_id>', methods=['GET'])
def get_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    return jsonify(booking.to_dict())

@bookings_bp.route('', methods=['POST'])
def create_booking():
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    destination = data.get('destination')
    booking_type = data.get('booking_type', 'FLIGHT')
    total_price = data.get('total_price', 0.0)
    passengers = data.get('passengers', [])
    notes = data.get('notes')

    if not customer_id or not destination:
        return jsonify({"error": "customer_id and destination are required"}), 400

    dep_date_str = data.get('departure_date')
    ret_date_str = data.get('return_date')
    dep_date = datetime.strptime(dep_date_str, "%Y-%m-%d").date() if dep_date_str else None
    ret_date = datetime.strptime(ret_date_str, "%Y-%m-%d").date() if ret_date_str else None

    booking = BookingService.create_booking(
        customer_id=customer_id,
        booking_type=booking_type,
        destination=destination,
        total_price=float(total_price),
        passengers=passengers,
        flight_id=data.get('flight_id'),
        hotel_id=data.get('hotel_id'),
        tour_id=data.get('tour_id'),
        departure_date=dep_date,
        return_date=ret_date,
        notes=notes
    )
    return jsonify(booking.to_dict()), 201

@bookings_bp.route('/<int:booking_id>', methods=['PUT'])
def update_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    data = request.get_json() or {}

    for field in ['status', 'notes', 'destination', 'total_price']:
        if field in data:
            setattr(booking, field, data[field])

    db.session.commit()
    return jsonify(booking.to_dict())

@bookings_bp.route('/<int:booking_id>/confirm', methods=['POST'])
def confirm_booking(booking_id):
    booking = BookingService.confirm_booking(booking_id)
    return jsonify(booking.to_dict())

@bookings_bp.route('/<int:booking_id>/cancel', methods=['POST'])
def cancel_booking(booking_id):
    booking = BookingService.cancel_booking(booking_id)
    return jsonify(booking.to_dict())
