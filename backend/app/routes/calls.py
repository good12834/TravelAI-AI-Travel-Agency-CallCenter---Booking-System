from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.call import Call
from app.models.call_transcript import CallTranscript
from app.services.call_service import CallService
from app.services.audio_stream_service import AudioStreamService

calls_bp = Blueprint('calls', __name__, url_prefix='/api/calls')

@calls_bp.route('', methods=['GET'])
def get_calls():
    status = request.args.get('status')
    intent = request.args.get('intent')
    sentiment = request.args.get('sentiment')
    priority = request.args.get('priority')
    language = request.args.get('language') or request.args.get('language_code')

    query = Call.query
    if status:
        query = query.filter_by(status=status.upper())
    if intent:
        query = query.filter_by(intent=intent.upper())
    if sentiment:
        query = query.filter_by(sentiment=sentiment.upper())
    if priority:
        query = query.filter_by(priority=priority.upper())
    if language and language.lower() != 'all':
        query = query.filter_by(language_code=language.lower())

    calls = query.order_by(Call.created_at.desc()).limit(100).all()
    return jsonify([c.to_dict() for c in calls])

@calls_bp.route('/live', methods=['GET'])
def get_live_calls():
    language = request.args.get('language') or request.args.get('language_code')
    live_statuses = ['RINGING', 'IN_PROGRESS', 'ON_HOLD', 'TRANSFERRED']
    query = Call.query.filter(Call.status.in_(live_statuses))

    if language and language.lower() != 'all':
        query = query.filter_by(language_code=language.lower())

    calls = query.order_by(Call.created_at.desc()).all()

    payload = []
    for call in calls:
        data = call.to_dict()
        data['has_audio_stream'] = bool(AudioStreamService.get_session(call.id))
        payload.append(data)

    return jsonify(payload)

@calls_bp.route('/<int:call_id>', methods=['GET'])
def get_call(call_id):
    call = Call.query.get_or_404(call_id)
    data = call.to_dict()
    data['transcripts'] = [t.to_dict() for t in call.transcripts.order_by(CallTranscript.timestamp.asc()).all()]
    return jsonify(data)

@calls_bp.route('/start', methods=['POST'])
def start_call():
    data = request.get_json() or {}
    phone_number = data.get('phone_number', '+1-800-555-0199')
    customer_id = data.get('customer_id')
    direction = data.get('direction', 'INBOUND')
    language_code = data.get('language_code') or data.get('language')

    call = CallService.initiate_call(phone_number, customer_id, direction, language_code=language_code)
    return jsonify(call.to_dict()), 201

@calls_bp.route('/<int:call_id>/language', methods=['POST'])
def change_language(call_id):
    data = request.get_json() or {}
    language_code = data.get('language_code') or data.get('language')
    if not language_code:
        return jsonify({"error": "language_code is required"}), 400

    call = CallService.change_call_language(call_id, language_code)
    return jsonify(call.to_dict())

@calls_bp.route('/<int:call_id>/transfer', methods=['POST'])
def transfer_call(call_id):
    data = request.get_json() or {}
    target_agent_id = data.get('agent_id')
    department_name = data.get('department')
    language_code = data.get('language_code') or data.get('language')

    call = CallService.transfer_call(call_id, target_agent_id, department_name, language_code=language_code)
    return jsonify(call.to_dict())

@calls_bp.route('/<int:call_id>/end', methods=['POST'])
def end_call(call_id):
    data = request.get_json() or {}
    duration = data.get('duration')
    call = CallService.end_call(call_id, duration)
    return jsonify(call.to_dict())

@calls_bp.route('/<int:call_id>/transcript', methods=['GET'])
def get_transcript(call_id):
    call = Call.query.get_or_404(call_id)
    transcripts = call.transcripts.order_by(CallTranscript.timestamp.asc()).all()
    return jsonify([t.to_dict() for t in transcripts])

@calls_bp.route('/<int:call_id>/transcript', methods=['POST'])
def add_transcript(call_id):
    data = request.get_json() or {}
    speaker = data.get('speaker', 'CUSTOMER')
    message = data.get('message', '').strip()

    if not message:
        return jsonify({"error": "Message is required"}), 400

    transcript = CallService.add_transcript(call_id, speaker, message)
    return jsonify(transcript.to_dict()), 201
