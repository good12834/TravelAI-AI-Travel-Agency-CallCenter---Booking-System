import os
from flask import Flask, jsonify
from app.config.settings import config_by_name
from app.extensions import db, jwt, cors, socketio
import app.models # Ensure all models are registered with SQLAlchemy

def create_app(config_name=None):
    if not config_name:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__, static_folder='../static')
    app.config.from_object(config_by_name.get(config_name, config_by_name['default']))

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}, r"/*": {"origins": "*"}})
    socketio.init_app(app, cors_allowed_origins="*")

    # Register blueprints
    from app.routes import (
        auth_bp, customers_bp, calls_bp, bookings_bp, flights_bp,
        hotels_bp, tours_bp, payments_bp, messages_bp, agents_bp,
        analytics_bp, knowledge_bp, ai_bp, telephony_bp, notifications_bp
    )

    app.register_blueprint(auth_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(calls_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(flights_bp)
    app.register_blueprint(hotels_bp)
    app.register_blueprint(tours_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(agents_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(knowledge_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(telephony_bp)
    app.register_blueprint(notifications_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "TravelAI Call Center & Booking API",
            "version": "1.0.0"
        })

    # SocketIO events
    @socketio.on('connect')
    def handle_connect():
        pass

    @socketio.on('disconnect')
    def handle_disconnect():
        pass

    # Ensure tables and columns exist
    with app.app_context():
        try:
            db.create_all()
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            if 'calls' in tables:
                call_cols = [c['name'] for c in inspector.get_columns('calls')]
                if 'language_code' not in call_cols:
                    db.session.execute(text("ALTER TABLE calls ADD COLUMN language_code VARCHAR(10) DEFAULT 'en'"))
                    db.session.commit()
            if 'agents' in tables:
                agent_cols = [c['name'] for c in inspector.get_columns('agents')]
                if 'languages' not in agent_cols:
                    db.session.execute(text("ALTER TABLE agents ADD COLUMN languages VARCHAR(100) DEFAULT 'en'"))
                    db.session.commit()
            if 'customers' in tables:
                cust_cols = [c['name'] for c in inspector.get_columns('customers')]
                if 'preferred_language' not in cust_cols:
                    db.session.execute(text("ALTER TABLE customers ADD COLUMN preferred_language VARCHAR(20) DEFAULT 'en'"))
                    db.session.commit()
        except Exception as e:
            print(f"Database initialization note: {e}")

    return app
