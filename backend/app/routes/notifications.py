from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.notification import Notification

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications_bp.route('', methods=['GET'])
def get_notifications():
    notifs = Notification.query.order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify([n.to_dict() for n in notifs])

@notifications_bp.route('/<int:notif_id>/read', methods=['PUT'])
def mark_read(notif_id):
    notif = Notification.query.get_or_404(notif_id)
    notif.is_read = True
    db.session.commit()
    return jsonify(notif.to_dict())

@notifications_bp.route('/read-all', methods=['POST'])
def mark_all_read():
    Notification.query.filter_by(is_read=False).update({Notification.is_read: True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"})
