import base64
import binascii

from flask import Blueprint, request, jsonify, Response

from app.extensions import socketio, db
from app.models.call import Call
from app.services.call_service import CallService
from app.services.audio_stream_service import AudioStreamService
from app.integrations.telephony import TelephonyIntegration
from app.ai.languages import get_language, set_call_language, SUPPORTED_LANGUAGES, get_supported_languages_list

telephony_bp = Blueprint('telephony', __name__, url_prefix='/api/telephony')

WELCOME_MESSAGE = "Hello! Thank you for calling TravelAI. How may I assist your travel plans today?"

@telephony_bp.route('/languages', methods=['GET'])
def get_telephony_languages():
    """Returns supported languages for IVR and call center voice."""
    return jsonify({
        "languages": get_supported_languages_list(),
        "default": "en"
    }), 200

@telephony_bp.route('/incoming', methods=['GET', 'POST'])
def incoming_call_webhook():
    """
    Twilio voice webhook endpoint.
    Handles incoming calls from Twilio numbers with interactive multilingual IVR language selection.
    Returns TwiML XML when requested by Twilio, or JSON for API calls.
    """
    data = {
        **request.args.to_dict(),
        **request.form.to_dict(),
        **(request.get_json(silent=True) or {})
    }
    caller_phone = data.get('From') or data.get('caller_phone', '+14155552671')
    call_sid = data.get('CallSid')
    requested_lang = data.get('language') or data.get('language_code')

    # Register call in database with language
    call = CallService.initiate_call(caller_phone, direction='INBOUND', language_code=requested_lang)
    telephony_response = TelephonyIntegration.handle_incoming_call(
        caller_phone,
        call_sid,
        host=request.host,
        language_code=call.language_code
    )

    # If requested by Twilio voice webhook (Accept header includes text/xml or form data)
    accept_header = request.headers.get('Accept', '')
    if 'xml' in accept_header or request.form:
        return Response(telephony_response["twiml"], mimetype='application/xml')

    return jsonify({
        "status": "ACCEPTED",
        "call_id": call.id,
        "language_code": call.language_code,
        "telephony": telephony_response
    }), 200

@telephony_bp.route('/language-select', methods=['GET', 'POST'])
def language_select_webhook():
    """
    Twilio IVR Gather callback endpoint.
    Customer pressed 1 (en), 2 (am), 3 (ar), or 4 (he).
    Updates call language and connects voice stream with localized greeting.
    """
    data = {
        **request.args.to_dict(),
        **request.form.to_dict(),
        **(request.get_json(silent=True) or {})
    }
    digits = data.get('Digits') or data.get('selection') or '1'
    call_sid = data.get('CallSid')
    caller_phone = data.get('From') or data.get('caller') or ''

    selection_res = set_call_language(digits)
    selected_lang = selection_res["language_code"]

    # Match existing call by phone or SID
    call = None
    if caller_phone:
        call = Call.query.filter_by(phone_number=caller_phone).order_by(Call.created_at.desc()).first()

    if call:
        CallService.change_call_language(call.id, selected_lang)

    twiml = TelephonyIntegration.generate_language_twiml(
        selected_lang,
        host=request.host,
        caller_phone=caller_phone,
        call_sid=call_sid or ""
    )

    accept_header = request.headers.get('Accept', '')
    if 'xml' in accept_header or request.form:
        return Response(twiml, mimetype='application/xml')

    return jsonify({
        "status": "LANGUAGE_SET",
        "language_code": selected_lang,
        "language": selection_res["language"],
        "call_id": call.id if call else None,
        "twiml": twiml
    }), 200

@telephony_bp.route('/<int:call_id>/language', methods=['POST'])
def update_call_language(call_id):
    """Dynamically updates the language for an active call."""
    data = request.get_json(silent=True) or {}
    lang = data.get('language') or data.get('language_code')
    if not lang:
        return jsonify({"error": "Language code is required"}), 400

    call = CallService.change_call_language(call_id, lang)
    return jsonify({
        "status": "UPDATED",
        "call_id": call.id,
        "language_code": call.language_code,
        "call": call.to_dict()
    }), 200

@telephony_bp.route('/voice-stream', methods=['GET', 'POST'])
def voice_stream_info():
    """
    Returns media stream endpoint metadata for WebSocket audio ingestion.
    """
    host = request.host
    ws_protocol = "wss" if "https" in host or "443" in host else "ws"
    clean_host = host.replace("http://", "").replace("https://", "").rstrip("/")
    return jsonify({
        "status": "ONLINE",
        "stream_url": f"{ws_protocol}://{clean_host}/api/telephony/voice-stream",
        "protocol": "twilio-media-stream",
        "audio_codec": "audio/x-mulaw",
        "sample_rate": 8000
    }), 200

@telephony_bp.route('/status', methods=['POST'])
def call_status_webhook():
    data = request.get_json() or request.form.to_dict() or {}
    call_id = data.get('call_id')
    status = data.get('CallStatus') or data.get('status', 'COMPLETED')
    duration = data.get('CallDuration')

    if call_id and status.upper() in ['COMPLETED', 'BUSY', 'FAILED', 'NO-ANSWER']:
        CallService.end_call(call_id, int(duration) if duration else 60)

    return jsonify({"status": "UPDATED"}), 200

@telephony_bp.route('/recording', methods=['POST'])
def call_recording_webhook():
    """
    Stores real call audio.
    - multipart/form-data with field `audio` (browser MediaRecorder blob)
    - Twilio recording callback payload with `RecordingUrl`
    """
    upload = request.files.get('audio') or request.files.get('file')
    if upload:
        call_id = request.form.get('call_id', type=int)
        mime_type = upload.mimetype or request.form.get('mime_type', 'audio/webm')
        duration = request.form.get('duration', type=int) or 0

        if not call_id:
            return jsonify({"error": "call_id is required"}), 400

        try:
            recording = CallService.save_recording(
                call_id,
                upload.read(),
                mime_type=mime_type,
                duration=duration
            )
        except Exception as exc:
            return jsonify({"error": f"Could not persist recording: {exc}"}), 500

        return jsonify({
            "status": "SAVED",
            "call_id": call_id,
            "recording_url": recording.recording_url,
            "recording": recording.to_dict()
        }), 201

    data = request.get_json(silent=True) or request.form.to_dict() or {}
    call_id = data.get('call_id')
    recording_url = data.get('RecordingUrl', '/static/recordings/sample.mp3')

    return jsonify({
        "status": "SAVED",
        "call_id": call_id,
        "recording_url": recording_url
    }), 200

@telephony_bp.route('/browser-call', methods=['POST'])
def start_browser_call():
    """
    Starts a real call session driven by the dashboard browser microphone with multilingual support.
    """
    data = request.get_json(silent=True) or {}
    phone_number = data.get('phone_number') or 'Browser Microphone'
    customer_id = data.get('customer_id')
    language_code = data.get('language') or data.get('language_code') or 'en'
    mime_type = data.get('mime_type', 'audio/webm;codecs=opus')
    sample_rate = int(data.get('sample_rate') or 48000)

    call = CallService.initiate_call(phone_number, customer_id, direction='INBOUND', language_code=language_code)
    stream_state = AudioStreamService.start_session(
        call.id,
        mime_type=mime_type,
        sample_rate=sample_rate,
        source='BROWSER'
    )

    lang_info = get_language(call.language_code)
    welcome_text = lang_info.get("greeting", WELCOME_MESSAGE)

    # Register the AI greeting in the selected language as the first real transcript turn
    CallService.add_transcript(call.id, 'AI', welcome_text)

    return jsonify({
        "status": "IN_PROGRESS",
        "call": call.to_dict(),
        "stream": AudioStreamService.session_state(call.id),
        "welcome_message": welcome_text,
        "language_code": call.language_code,
        "language_name": lang_info["name"],
        "audio_chunk_url": "/api/telephony/audio-chunk",
        "turn_url": "/api/ai/call-turn",
        "recording_url": "/api/telephony/recording",
        "socket_events": ["call:new", "call:transcript", "call:audio", "call:transferred", "call:ended", "call:language_changed"],
        "stream_source": stream_state['source']
    }), 201


@telephony_bp.route('/audio-chunk', methods=['POST'])
def ingest_audio_chunk():
    """Ingests one base64 encoded audio chunk from a live browser MediaRecorder stream."""
    data = request.get_json(silent=True) or {}
    call_id = data.get('call_id')
    encoded_audio = data.get('audio') or ''
    seq = data.get('seq')

    if not call_id:
        return jsonify({"error": "call_id is required"}), 400
    if not encoded_audio:
        return jsonify({"error": "audio chunk is required"}), 400

    try:
        audio_bytes = base64.b64decode(encoded_audio, validate=False)
    except (binascii.Error, ValueError):
        return jsonify({"error": "audio chunk is not valid base64"}), 400

    if not audio_bytes:
        return jsonify({"error": "audio chunk is empty"}), 400

    if not AudioStreamService.get_session(call_id):
        AudioStreamService.start_session(
            call_id,
            mime_type=data.get('mime_type', 'audio/webm;codecs=opus'),
            sample_rate=int(data.get('sample_rate') or 48000),
            source=data.get('source', 'BROWSER')
        )

    AudioStreamService.append_chunk(call_id, audio_bytes, seq=seq)
    state = AudioStreamService.session_state(call_id)

    try:
        socketio.emit('call:audio', {
            'call_id': call_id,
            'bytes': len(audio_bytes),
            'chunks_received': state['chunks_received'],
            'bytes_received': state['bytes_received'],
            'duration_seconds': state['duration_seconds']
        })
    except Exception:
        pass

    return jsonify({
        "status": "RECEIVED",
        "call_id": call_id,
        "chunk_bytes": len(audio_bytes),
        "stream": state
    }), 200


@telephony_bp.route('/audio-stream/<int:call_id>', methods=['GET'])
def audio_stream_status(call_id):
    """Returns live ingestion statistics for an active call audio stream."""
    state = AudioStreamService.session_state(call_id)
    if not state:
        return jsonify({"error": "No active audio stream for this call"}), 404
    return jsonify(state), 200


@telephony_bp.route('/audio-stream/<int:call_id>/start', methods=['POST'])
def start_audio_stream(call_id):
    call = Call.query.get(call_id)
    if not call:
        return jsonify({"error": f"Call {call_id} not found"}), 404
    if call.status in ('COMPLETED', 'MISSED', 'FAILED'):
        return jsonify({
            "error": f"Call {call_id} is {call.status} and can no longer be monitored"
        }), 409

    data = request.get_json(silent=True) or {}
    state = AudioStreamService.session_state(call_id)
    if not state:
        AudioStreamService.start_session(
            call_id,
            mime_type=data.get('mime_type', 'audio/webm;codecs=opus'),
            sample_rate=int(data.get('sample_rate') or 48000),
            source=data.get('source', 'DASHBOARD')
        )
        state = AudioStreamService.session_state(call_id)

    return jsonify({
        "status": "STREAMING",
        "call_id": call_id,
        "stream": state,
        "call": call.to_dict()
    }), 201


@telephony_bp.route('/audio-stream/<int:call_id>/stop', methods=['POST'])
def stop_audio_stream(call_id):
    """Closes the live audio stream and persists the captured audio as a real call recording."""
    payload = request.get_json(silent=True) or {}
    session = AudioStreamService.close_session(call_id)
    if not session:
        return jsonify({"error": "No active audio stream for this call"}), 404

    audio_bytes = AudioStreamService.read_audio(call_id)
    state = AudioStreamService.session_state(call_id)
    recording = None
    if audio_bytes:
        duration = int(payload.get('duration') or 0) or session.get('duration_seconds', 0)
        recording = CallService.save_recording(
            call_id,
            audio_bytes,
            mime_type=session['mime_type'],
            duration=duration
        )

    AudioStreamService.discard_session(call_id)

    return jsonify({
        "status": "STOPPED",
        "call_id": call_id,
        "bytes": len(audio_bytes),
        "stream": state,
        "recording": recording.to_dict() if recording else None
    }), 200
