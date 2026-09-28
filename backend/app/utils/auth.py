from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.user import User

def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                user = User.query.get(user_id)
                if not user or (allowed_roles and user.role not in allowed_roles and 'admin' not in allowed_roles):
                    return jsonify({"error": "Unauthorized access", "status": "forbidden"}), 403
                return fn(*args, **kwargs)
            except Exception as e:
                return jsonify({"error": "Invalid or missing token", "details": str(e)}), 401
        return wrapper
    return decorator
