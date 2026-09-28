import os
from datetime import datetime

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from app.ai.voice_agent import VoiceAgent
from app.ai.intent import IntentClassifier
from app.ai.sentiment import SentimentAnalyzer
from app.ai.languages import get_language, SUPPORTED_LANGUAGES, get_supported_languages_list
from app.ai.speech_to_text import SpeechToTextService
from app.ai.text_to_speech import TextToSpeechService
from app.models.call import Call
from app.models.customer import Customer
from app.services.ai_session_service import AISessionService
from app.services.call_service import CallService

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# backend/static/uploads
UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'uploads'))

@ai_bp.route('/languages', methods=['GET'])
def get_languages():
    """Returns all supported languages for AI conversation and speech."""
    return jsonify({
        "languages": get_supported_languages_list(),
        "default": "en"
    }), 200

@ai_bp.route('/message', methods=['POST'])
def process_message():
    data = request.get_json() or {}
    text = data.get('message', '').strip()
    customer_id = data.get('customer_id')
    language_code = data.get('language') or data.get('language_code')

    if not text:
        return jsonify({"error": "Message is required"}), 400

    customer = Customer.query.get(customer_id) if customer_id else None

    # Continue this customer's live AI conversation
    session = AISessionService.get_or_create_session(
        customer_id=customer.id if customer else None,
        language=language_code or (customer.preferred_language if customer else None)
    )
    session_context = AISessionService.build_context(session)
    if isinstance(data.get('context'), dict):
        session_context.update(data['context'])
    history = AISessionService.load_history(session)

    result = VoiceAgent.process_utterance(
        text,
        session_context=session_context,
        customer=customer,
        history=history,
        language_code=language_code
    )
    AISessionService.save_turn(session, text, result)
    result['session_id'] = session.id
    return jsonify(result)

@ai_bp.route('/analyze', methods=['POST'])
def analyze_intent():
    data = request.get_json() or {}
    text = data.get('message', '').strip()

    if not text:
        return jsonify({"error": "Message is required"}), 400

    result = IntentClassifier.classify(text)
    return jsonify(result)

@ai_bp.route('/sentiment', methods=['POST'])
def analyze_sentiment():
    data = request.get_json() or {}
    text = data.get('message', '').strip()

    result = SentimentAnalyzer.analyze(text)
    return jsonify(result)

@ai_bp.route('/transcribe', methods=['POST'])
def speech_to_text():
    """
    Speech-to-text endpoint supporting real audio uploads, base64 data, and Web Speech API pass-through.
    Supports English, Amharic, Arabic, and Hebrew.
    """
    upload = request.files.get('audio') or request.files.get('file')
    data = request.get_json(silent=True) or request.form.to_dict() or {}

    audio_text = (data.get('text') or '').strip() or None
    language_code = data.get('language') or data.get('language_code') or 'en'
    audio_url = None

    if upload:
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        safe_name = secure_filename(upload.filename or '') or 'utterance.webm'
        stored_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{safe_name}"
        stored_path = os.path.join(UPLOADS_DIR, stored_name)
        upload.save(stored_path)
        audio_url = f"/static/uploads/{stored_name}"

        # Run STT service on uploaded file
        with open(stored_path, 'rb') as f:
            stt_result = SpeechToTextService.transcribe(f.read(), language_code=language_code)
            return jsonify({
                "transcript": stt_result["text"],
                "confidence": stt_result["confidence"],
                "language": stt_result["language"],
                "language_code": stt_result["language_code"],
                "audio_url": audio_url,
                "provider": stt_result["provider"]
            })

    if not audio_text:
        stt_result = SpeechToTextService.transcribe(None, language_code=language_code)
        audio_text = stt_result["text"]

    detected_lang = IntentClassifier.detect_language(audio_text)

    return jsonify({
        "transcript": audio_text,
        "confidence": 0.96,
        "language": detected_lang,
        "language_code": detected_lang,
        "audio_url": audio_url,
        "engine": "browser-webspeech"
    })

@ai_bp.route('/speak', methods=['POST'])
def text_to_speech():
    """
    Text-to-Speech endpoint converting AI response text into spoken audio in the selected language.
    Supports English, Amharic, Arabic, and Hebrew.
    """
    data = request.get_json() or {}
    text = data.get('text', 'Hello, welcome to TravelAI.')
    language = data.get('language') or data.get('language_code') or 'en'

    tts_result = TextToSpeechService.synthesize(text, language_code=language)
    return jsonify(tts_result)

@ai_bp.route('/call-turn', methods=['POST'])
@ai_bp.route('/call-simulate', methods=['POST'])
def process_call_turn():
    """
    Processes a live voice call interaction turn.
    Updates call transcripts, detects language / language switching,
    and triggers agent transfer in the caller's language if necessary.
    """
    data = request.get_json() or {}
    call_id = data.get('call_id')
    user_speech = data.get('speech', '').strip()
    language_override = data.get('language') or data.get('language_code')

    if not user_speech:
        return jsonify({"error": "Speech input is required"}), 400

    call = Call.query.get(call_id) if call_id else None
    if call_id and not call:
        return jsonify({"error": "Call not found"}), 404

    customer = call.customer if call else None
    current_call_lang = language_override or (call.language_code if call else None)

    # Load session memory
    session = AISessionService.get_or_create_session(
        call_id=call.id if call else None,
        customer_id=customer.id if customer else None,
        language=current_call_lang
    )
    session_context = AISessionService.build_context(session)
    if current_call_lang and not session_context.get("language"):
        session_context["language"] = current_call_lang

    history = AISessionService.load_history(session)

    if call_id:
        CallService.add_transcript(call_id, "CUSTOMER", user_speech)

    ai_res = VoiceAgent.process_utterance(
        user_speech,
        session_context=session_context,
        customer=customer,
        history=history,
        language_code=current_call_lang
    )
    AISessionService.save_turn(session, user_speech, ai_res)

    if call_id:
        # If language switched or detected in turn, update the call record
        new_lang = ai_res.get("language")
        if new_lang and call.language_code != new_lang:
            CallService.change_call_language(call.id, new_lang)

        # Append AI transcript
        CallService.add_transcript(call_id, "AI", ai_res["response"])

        if ai_res["should_escalate"]:
            CallService.transfer_call(
                call_id,
                department_name=ai_res["escalate_department"],
                language_code=call.language_code
            )

    ai_res['session_id'] = session.id
    return jsonify(ai_res)
