from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.tour import TourPackage

tours_bp = Blueprint('tours', __name__, url_prefix='/api/tours')

@tours_bp.route('', methods=['GET'])
def get_tours():
    destination = request.args.get('destination')
    query = TourPackage.query
    if destination:
        query = query.filter(TourPackage.destination.ilike(f"%{destination}%"))
    tours = query.order_by(TourPackage.price.asc()).all()
    return jsonify([t.to_dict() for t in tours])

@tours_bp.route('/<int:tour_id>', methods=['GET'])
def get_tour(tour_id):
    tour = TourPackage.query.get_or_404(tour_id)
    return jsonify(tour.to_dict())

@tours_bp.route('', methods=['POST'])
def create_tour():
    data = request.get_json() or {}
    tour = TourPackage(
        name=data['name'],
        destination=data['destination'],
        description=data.get('description'),
        duration=data['duration'],
        price=float(data['price']),
        includes=data.get('includes'),
        available_slots=int(data.get('available_slots', 15)),
        image_url=data.get('image_url')
    )
    db.session.add(tour)
    db.session.commit()
    return jsonify(tour.to_dict()), 201
