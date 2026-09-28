from datetime import datetime
import os
from app.extensions import db, socketio
from app.models.call import Call
from app.models.call_transcript import CallTranscript
from app.models.call_recording import CallRecording
from app.models.customer import Customer
from app.models.agent import Agent
from app.services.audio_stream_service import AudioStreamService
from app.services.routing_service import RoutingService
from app.ai.summarizer import ConversationSummarizer
from app.services.ai_session_service import AISessionService

# backend/static/recordings  (backend/app/services -> backend/app -> backend)
RECORDINGS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'recordings'))

class CallService:
    @classmethod
    def initiate_call(cls, phone_number: str, customer_id: int = None, direction: str = "INBOUND", language_code: str = None) -> Call:
        if not customer_id:
            customer = Customer.query.filter_by(phone=phone_number).first()
            if customer:
                customer_id = customer.id
                if not language_code:
                    language_code = customer.preferred_language
        elif not language_code:
            customer = Customer.query.get(customer_id)
            if customer and customer.preferred_language:
                language_code = customer.preferred_language

        call = Call(
            customer_id=customer_id,
            phone_number=phone_number,
            direction=direction,
            status="IN_PROGRESS",
            language_code=language_code or "en",
            intent="GENERAL",
            sentiment="NEUTRAL",
            priority="MEDIUM",
            confidence=0.92,
            started_at=datetime.utcnow()
        )
        db.session.add(call)
        db.session.commit()

        # Emit real-time socket event
        try:
            socketio.emit('call:new', call.to_dict())
        except Exception:
            pass

        return call

    @classmethod
    def add_transcript(cls, call_id: int, speaker: str, message: str) -> CallTranscript:
        transcript = CallTranscript(
            call_id=call_id,
            speaker=speaker.upper(),
            message=message,
            timestamp=datetime.utcnow()
        )
        db.session.add(transcript)
        db.session.commit()

        # Emit live transcript chunk to socket listeners
        try:
            socketio.emit('call:transcript', {
                'call_id': call_id,
                'transcript': transcript.to_dict(),
                'speaker': speaker.upper(),
                'message': message,
                'timestamp': transcript.timestamp.isoformat()
            })
        except Exception:
            pass

        return transcript

    @classmethod
    def save_recording(cls, call_id: int, audio_bytes: bytes, mime_type: str = 'audio/webm',
                       duration: int = 0, storage_provider: str = 'local') -> CallRecording:
        """
        Persists real captured call audio (browser MediaRecorder or Twilio Media Stream)
        to local storage and links it to the call record.
        """
        call = Call.query.get_or_404(call_id)

        extension = AudioStreamService.extension_for(mime_type)
        os.makedirs(RECORDINGS_DIR, exist_ok=True)
        filename = f"call_{call.id}.{extension}"
        file_path = os.path.join(RECORDINGS_DIR, filename)

        with open(file_path, 'wb') as audio_file:
            audio_file.write(audio_bytes)

        recording_url = f"/static/recordings/{filename}"

        # Replace any previous placeholder/partial recording for this call
        for existing in CallRecording.query.filter_by(call_id=call.id).all():
            db.session.delete(existing)
        db.session.flush()

        recording = CallRecording(
            call_id=call.id,
            recording_url=recording_url,
            duration=duration or call.duration or 0,
            storage_provider=storage_provider
        )
        db.session.add(recording)
        call.recording_url = recording_url
        db.session.commit()

        try:
            socketio.emit('call:status', {
                'call_id': call.id,
                'status': call.status,
                'recording_url': recording_url,
                'recording': recording.to_dict()
            })
        except Exception:
            pass

        return recording

    @classmethod
    def transfer_call(cls, call_id: int, target_agent_id: int = None, department_name: str = None, language_code: str = None) -> Call:
        call = Call.query.get_or_404(call_id)
        effective_lang = language_code or call.language_code or "en"
        if not target_agent_id:
            agent = RoutingService.find_available_agent(department_name, language_code=effective_lang)
            if agent:
                target_agent_id = agent.id

        call.status = "TRANSFERRED"
        call.agent_id = target_agent_id
        if department_name:
            call.department_assigned = department_name

        if target_agent_id:
            agent = Agent.query.get(target_agent_id)
            if agent:
                agent.status = "BUSY"
                agent.active_calls_count += 1

        db.session.commit()

        try:
            socketio.emit('call:transferred', call.to_dict())
        except Exception:
            pass

        return call

    @classmethod
    def change_call_language(cls, call_id: int, language_code: str) -> Call:
        """Dynamically switches call language and updates conversation state."""
        call = Call.query.get_or_404(call_id)
        normalized = (language_code or "en").strip().lower()
        if "-" in normalized:
            normalized = normalized.split("-")[0]

        call.language_code = normalized
        db.session.commit()

        try:
            socketio.emit('call:language_changed', {
                'call_id': call.id,
                'language_code': normalized,
                'call': call.to_dict()
            })
            socketio.emit('call:status', call.to_dict())
        except Exception:
            pass

        return call

    @classmethod
    def end_call(cls, call_id: int, duration_seconds: int = None) -> Call:
        call = Call.query.get_or_404(call_id)
        call.status = "COMPLETED"
        call.ended_at = datetime.utcnow()

        if duration_seconds is not None:
            call.duration = duration_seconds
        elif call.started_at:
            delta = (call.ended_at - call.started_at).total_seconds()
            call.duration = max(10, int(delta))

        # Generate AI call summary automatically
        transcripts = [t.to_dict() for t in call.transcripts.order_by(CallTranscript.timestamp.asc()).all()]
        summary_res = ConversationSummarizer.summarize(
            transcripts,
            intent=call.intent,
            customer_name=call.customer.full_name if call.customer else "Caller"
        )
        call.ai_summary = summary_res["summary"]

        # If agent was assigned, free agent
        if call.agent_id:
            agent = Agent.query.get(call.agent_id)
            if agent:
                agent.status = "AVAILABLE"
                agent.active_calls_count = max(0, agent.active_calls_count - 1)
                agent.completed_calls_count += 1

        # Persist a recording row: keep real captured audio if it exists,
        # otherwise fall back to the simulated placeholder used by legacy flows.
        existing_recording = CallRecording.query.filter_by(call_id=call.id).first()
        if existing_recording:
            existing_recording.duration = call.duration
            call.recording_url = existing_recording.recording_url
        else:
            recording = CallRecording(
                call_id=call.id,
                recording_url=f"/static/recordings/call_{call.id}.mp3",
                duration=call.duration,
                storage_provider="local"
            )
            db.session.add(recording)
            call.recording_url = recording.recording_url

        db.session.commit()

        # The call is over: close its AI conversation memory
        try:
            AISessionService.close_session(call_id=call.id)
        except Exception:
            pass

        try:
            socketio.emit('call:ended', call.to_dict())
        except Exception:
            pass

        return call
