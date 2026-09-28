from flask import Blueprint, request, jsonify
from datetime import datetime
from app.extensions import db
from app.models.flight import Flight

flights_bp = Blueprint('flights', __name__, url_prefix='/api/flights')

@flights_bp.route('', methods=['GET'])
def get_flights():
    origin = request.args.get('origin')
    destination = request.args.get('destination')
    query = Flight.query

    if origin:
        query = query.filter(Flight.origin.ilike(f"%{origin}%"))
    if destination:
        query = query.filter(Flight.destination.ilike(f"%{destination}%"))

    flights = query.order_by(Flight.departure_time.asc()).all()
    return jsonify([f.to_dict() for f in flights])

@flights_bp.route('/search', methods=['GET'])
def search_flights():
    origin = request.args.get('origin', '').strip()
    destination = request.args.get('destination', '').strip()
    passengers = int(request.args.get('passengers', 1))

    query = Flight.query.filter(Flight.available_seats >= passengers)
    if origin:
        query = query.filter(Flight.origin.ilike(f"%{origin}%"))
    if destination:
        query = query.filter(Flight.destination.ilike(f"%{destination}%"))

    flights = query.order_by(Flight.price.asc()).all()
    return jsonify([f.to_dict() for f in flights])

@flights_bp.route('/<int:flight_id>', methods=['GET'])
def get_flight(flight_id):
    flight = Flight.query.get_or_404(flight_id)
    return jsonify(flight.to_dict())

@flights_bp.route('', methods=['POST'])
def create_flight():
    data = request.get_json() or {}
    dep_time = datetime.fromisoformat(data['departure_time'])
    arr_time = datetime.fromisoformat(data['arrival_time'])

    flight = Flight(
        airline=data['airline'],
        flight_number=data['flight_number'],
        origin=data['origin'],
        destination=data['destination'],
        departure_time=dep_time,
        arrival_time=arr_time,
        price=float(data['price']),
        available_seats=int(data.get('available_seats', 50)),
        cabin_class=data.get('cabin_class', 'Economy')
    )
    db.session.add(flight)
    db.session.commit()
    return jsonify(flight.to_dict()), 201
