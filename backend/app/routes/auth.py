from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.agent import Agent
from app.models.audit_log import AuditLog

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    role = data.get('role', 'agent').lower()

    if not email or not password or not name:
        return jsonify({"error": "Email, password, and name are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "A user with this email already exists"}), 409

    user = User(email=email, name=name, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    if role in ['agent', 'manager']:
        agent_profile = Agent(
            user_id=user.id,
            extension=str(1000 + user.id),
            status='AVAILABLE'
        )
        db.session.add(agent_profile)

    # Log audit
    log = AuditLog(user_id=user.id, action="REGISTER", entity="User", entity_id=str(user.id))
    db.session.add(log)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "message": "User registered successfully",
        "token": token,
        "user": user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200
