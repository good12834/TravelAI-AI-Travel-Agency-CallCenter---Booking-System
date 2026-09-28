from flask import Blueprint, request, jsonify
from app.extensions import db, socketio
from app.models.message import Message
from app.models.customer import Customer
from app.ai.voice_agent import VoiceAgent
from app.services.ai_session_service import AISessionService

messages_bp = Blueprint('messages', __name__, url_prefix='/api/messages')

@messages_bp.route('', methods=['GET'])
def get_messages():
    customer_id = request.args.get('customer_id')
    channel = request.args.get('channel')

    query = Message.query
    if customer_id:
        query = query.filter_by(customer_id=customer_id)
    if channel:
        query = query.filter_by(channel=channel.upper())

    messages = query.order_by(Message.created_at.desc()).limit(100).all()
    return jsonify([m.to_dict() for m in messages])

@messages_bp.route('', methods=['POST'])
def send_message():
    data = request.get_json() or {}
    customer_id = data.get('customer_id')
    channel = data.get('channel', 'SMS').upper()
    direction = data.get('direction', 'OUTBOUND').upper()
    text = data.get('message', '').strip()

    if not customer_id or not text:
        return jsonify({"error": "customer_id and message are required"}), 400

    msg = Message(
        customer_id=customer_id,
        channel=channel,
        direction=direction,
        message=text,
        status="DELIVERED"
    )
    db.session.add(msg)
    db.session.commit()

    # Emit socket event
    try:
        socketio.emit('message:new', msg.to_dict())
    except Exception:
        pass

    # If inbound message from customer, simulate AI automated assistant response
    ai_reply_dict = None
    if direction == "INBOUND":
        customer = Customer.query.get(customer_id)
        # Keep the customer's chat memory so follow-up texts build on earlier ones
        session = AISessionService.get_or_create_session(
            customer_id=customer_id,
            language=customer.preferred_language if customer else None
        )
        ai_res = VoiceAgent.process_utterance(
            text,
            session_context=AISessionService.build_context(session),
            customer=customer,
            history=AISessionService.load_history(session)
        )
        AISessionService.save_turn(session, text, ai_res)
        reply = Message(
            customer_id=customer_id,
            channel=channel,
            direction="OUTBOUND",
            message=ai_res["response"],
            status="DELIVERED"
        )
        db.session.add(reply)
        db.session.commit()
        ai_reply_dict = reply.to_dict()
        try:
            socketio.emit('message:new', ai_reply_dict)
        except Exception:
            pass

    return jsonify({
        "message": msg.to_dict(),
        "ai_response": ai_reply_dict
    }), 201
