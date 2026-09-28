from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.hotel import Hotel

hotels_bp = Blueprint('hotels', __name__, url_prefix='/api/hotels')

@hotels_bp.route('', methods=['GET'])
def get_hotels():
    city = request.args.get('city')
    query = Hotel.query
    if city:
        query = query.filter((Hotel.city.ilike(f"%{city}%")) | (Hotel.location.ilike(f"%{city}%")))
    hotels = query.order_by(Hotel.rating.desc()).all()
    return jsonify([h.to_dict() for h in hotels])

@hotels_bp.route('/search', methods=['GET'])
def search_hotels():
    destination = request.args.get('destination', '').strip()
    min_rating = float(request.args.get('min_rating', 0))

    query = Hotel.query.filter(Hotel.available_rooms > 0)
    if destination:
        query = query.filter((Hotel.city.ilike(f"%{destination}%")) | (Hotel.location.ilike(f"%{destination}%")))
    if min_rating:
        query = query.filter(Hotel.rating >= min_rating)

    hotels = query.order_by(Hotel.price_per_night.asc()).all()
    return jsonify([h.to_dict() for h in hotels])

@hotels_bp.route('/<int:hotel_id>', methods=['GET'])
def get_hotel(hotel_id):
    hotel = Hotel.query.get_or_404(hotel_id)
    return jsonify(hotel.to_dict())

@hotels_bp.route('', methods=['POST'])
def create_hotel():
    data = request.get_json() or {}
    hotel = Hotel(
        name=data['name'],
        location=data['location'],
        city=data['city'],
        description=data.get('description'),
        rating=float(data.get('rating', 4.5)),
        price_per_night=float(data['price_per_night']),
        available_rooms=int(data.get('available_rooms', 10)),
        amenities=data.get('amenities', 'WiFi, Pool, Breakfast'),
        image_url=data.get('image_url')
    )
    db.session.add(hotel)
    db.session.commit()
    return jsonify(hotel.to_dict()), 201
