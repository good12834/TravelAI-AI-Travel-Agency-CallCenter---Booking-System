import base64
import io
import json
import os
import sys
import unittest

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import socketio
from app.models.ai_session import AISession
from app.models.call import Call
from app.services.audio_stream_service import AudioStreamService

STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'static'))
FAKE_AUDIO = base64.b64encode(b'\x1aE\xdf\xa3' + b'travelai-real-audio-chunk' * 64).decode('ascii')


class RealtimeCallPipelineTestCase(unittest.TestCase):
    """End-to-end coverage for the real call pipeline (Twilio webhooks + browser microphone streaming)."""

    def setUp(self):
        self.app = create_app('development')
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        self.socket_client = socketio.test_client(self.app)
        self.created_files = []
        # Anything created after this id belongs to the running test and is removed in tearDown
        with self.app.app_context():
            latest = Call.query.order_by(Call.id.desc()).first()
            self.baseline_call_id = latest.id if latest else 0

    def tearDown(self):
        from app.extensions import db
        with self.app.app_context():
            for call in Call.query.filter(Call.id > self.baseline_call_id).all():
                # Drop any live audio stream session/spool left open by the test
                AudioStreamService.discard_session(call.id)
                for recording in call.recordings.all():
                    self.created_files.append(
                        os.path.join(STATIC_DIR, recording.recording_url.replace('/static/', '').replace('/', os.sep))
                    )
                # Delete the AI conversation memory created for this call (and its messages)
                for ai_session in call.ai_sessions.all():
                    db.session.delete(ai_session)
                db.session.delete(call)
            db.session.commit()
        for path in self.created_files:
            if os.path.exists(path):
                os.remove(path)
        try:
            self.socket_client.disconnect()
        except Exception:
            pass

    def _start_browser_call(self, phone_number='Browser Microphone'):
        res = self.client.post('/api/telephony/browser-call', json={'phone_number': phone_number})
        self.assertEqual(res.status_code, 201)
        return res.get_json()

    def _newest_call(self):
        with self.app.app_context():
            return Call.query.order_by(Call.id.desc()).first()

    def _names(self):
        return [event['name'] for event in self.socket_client.get_received()]

    def test_01_twilio_voice_webhook_returns_twiml(self):
        res = self.client.post(
            '/api/telephony/incoming',
            data={'From': '+14155550000', 'CallSid': 'CA_TEST_1'},
            headers={'Accept': 'text/xml'}
        )
        twiml = res.get_data(as_text=True)
        self.assertEqual(res.status_code, 200)
        self.assertIn('<Response>', twiml)
        self.assertIn('<Say', twiml)
        self.assertIn('<Connect>', twiml)
        self.assertIn('/api/telephony/voice-stream', twiml)

        # GET (webhook verification / manual test) must answer with TwiML too and keep the real caller
        res = self.client.get('/api/telephony/incoming?From=%2B14155551111', headers={'Accept': 'text/xml'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('<Connect>', res.get_data(as_text=True))
        self.assertEqual(self._newest_call().phone_number, '+14155551111')


    def test_02_browser_call_streams_real_audio_and_turns(self):
        session = self._start_browser_call()
        call_id = session['call']['id']

        self.assertEqual(session['call']['status'], 'IN_PROGRESS')
        self.assertEqual(session['stream']['source'], 'BROWSER')
        self.assertTrue(session['stream']['active'])
        self.assertTrue(session['welcome_message'])
        self.assertIsInstance(session['call']['live_duration_seconds'], int)

        greeting = self.client.get(f'/api/calls/{call_id}/transcript').get_json()
        self.assertEqual([t['speaker'] for t in greeting], ['AI'])

        # Real audio chunks streamed from the browser MediaRecorder
        for seq in range(3):
            res = self.client.post(
                '/api/telephony/audio-chunk',
                json={'call_id': call_id, 'seq': seq, 'audio': FAKE_AUDIO, 'mime_type': 'audio/webm;codecs=opus'}
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.get_json()['status'], 'RECEIVED')

        state = self.client.get(f'/api/telephony/audio-stream/{call_id}').get_json()
        self.assertEqual(state['chunks_received'], 3)
        self.assertGreater(state['bytes_received'], 0)
        self.assertEqual(state['sample_rate'], 48000)

        # A real dialogue turn processed through the live call service
        res = self.client.post('/api/ai/call-turn', json={'call_id': call_id, 'speech': 'I need a hotel in Paris'})
        turn = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertTrue(turn['response'])
        self.assertIn(turn['intent'], ['HOTEL', 'BOOKING'])

        transcripts = self.client.get(f'/api/calls/{call_id}/transcript').get_json()
        self.assertEqual([t['speaker'] for t in transcripts], ['AI', 'CUSTOMER', 'AI'])

        # Closing the stream persists the real captured audio as a call recording
        res = self.client.post(f'/api/telephony/audio-stream/{call_id}/stop', json={'duration': 17})
        stopped = res.get_json()
        self.assertEqual(stopped['status'], 'STOPPED')
        self.assertGreater(stopped['bytes'], 0)
        self.assertTrue(stopped['recording']['recording_url'].endswith('.webm'))
        recording_path = os.path.join(
            STATIC_DIR, stopped['recording']['recording_url'].replace('/static/', '').replace('/', os.sep)
        )
        self.assertTrue(os.path.exists(recording_path))
        # The raw spool copy is dropped once the recording is persisted (no duplicate audio on disk)
        self.assertIsNone(AudioStreamService.get_session(call_id))
        self.assertFalse(
            os.path.exists(os.path.join(STATIC_DIR, 'recordings', 'streams', f'call_{call_id}', 'stream.bin'))
        )

        # Ending the call keeps the real recording (no simulated placeholder is created)
        res = self.client.post(f'/api/calls/{call_id}/end', json={'duration': 17})
        ended = res.get_json()
        self.assertEqual(ended['status'], 'COMPLETED')
        self.assertEqual(ended['duration'], 17)
        self.assertEqual(ended['recording_url'], stopped['recording']['recording_url'])

        # Live Socket.IO events delivered to the dashboard
        received = set(self._names())
        for event in ('call:new', 'call:transcript', 'call:audio', 'call:status', 'call:ended'):
            self.assertIn(event, received)

    def test_03_audio_chunk_validation(self):
        self.assertEqual(self.client.post('/api/telephony/audio-chunk', json={'audio': 'abc'}).status_code, 400)
        self.assertEqual(self.client.post('/api/telephony/audio-chunk', json={'call_id': 999}).status_code, 400)

        session = self._start_browser_call()
        res = self.client.post(
            '/api/telephony/audio-chunk',
            json={'call_id': session['call']['id'], 'audio': '!!!not-base64!!!'}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('base64', res.get_json()['error'])

    def test_04_unknown_audio_stream_is_not_found(self):
        self.assertEqual(self.client.get('/api/telephony/audio-stream/999999').status_code, 404)
        self.assertEqual(self.client.post('/api/telephony/audio-stream/999999/stop').status_code, 404)

    def test_05_multipart_recording_upload(self):
        session = self._start_browser_call('Multipart Uploader')
        call_id = session['call']['id']

        res = self.client.post(
            '/api/telephony/recording',
            data={'call_id': str(call_id), 'duration': '9', 'audio': (io.BytesIO(b'RIFF-real-browser-audio'), 'utterance.wav')},
            content_type='multipart/form-data'
        )
        body = res.get_json()
        self.assertEqual(res.status_code, 201)
        self.assertEqual(body['status'], 'SAVED')
        self.assertEqual(body['recording']['duration'], 9)
        recording_path = os.path.join(STATIC_DIR, body['recording']['recording_url'].replace('/static/', '').replace('/', os.sep))
        self.assertTrue(os.path.exists(recording_path))

    def test_06_transcribe_accepts_uploaded_audio(self):
        res = self.client.post(
            '/api/ai/transcribe',
            data={'audio': (io.BytesIO(b'ogg-real-bytes'), 'clip.webm'), 'text': 'book a hotel in Rome'},
            content_type='multipart/form-data'
        )
        body = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(body['transcript'], 'book a hotel in Rome')
        self.assertTrue(body['audio_url'])
        upload_path = os.path.join(STATIC_DIR, body['audio_url'].replace('/static/', '').replace('/', os.sep))
        self.assertTrue(os.path.exists(upload_path))
        self.created_files.append(upload_path)

    def test_07_live_queue_exposes_real_elapsed_seconds(self):
        session = self._start_browser_call('Queue Timer Caller')
        live = self.client.get('/api/calls/live').get_json()
        matched = [c for c in live if c['id'] == session['call']['id']]
        self.assertEqual(len(matched), 1)
        self.assertIn('live_duration_seconds', matched[0])

    def test_08_voice_stream_metadata(self):
        res = self.client.get('/api/telephony/voice-stream')
        body = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(body['protocol'], 'twilio-media-stream')
        self.assertEqual(body['sample_rate'], 8000)
        self.assertIn('/api/telephony/voice-stream', body['stream_url'])


    def test_09_call_turns_share_one_ai_conversation_memory(self):
        """The AI must not forget earlier turns of the same call (or reintroduce itself)."""
        session = self._start_browser_call('Follow-up Caller')
        call_id = session['call']['id']

        # The browser call already opened with the AI welcome line
        first = self.client.post(
            '/api/ai/call-turn', json={'call_id': call_id, 'speech': 'I want a hotel in Dubai'}
        ).get_json()
        self.assertEqual(first['turn_count'], 1)
        self.assertTrue(first['session_context']['greeted'])
        self.assertNotIn('Thank you for calling TravelAI', first['response'])

        second = self.client.post(
            '/api/ai/call-turn', json={'call_id': call_id, 'speech': 'for 4 people'}
        ).get_json()
        self.assertEqual(second['session_id'], first['session_id'])
        self.assertEqual(second['turn_count'], 2)
        self.assertEqual(second['entities']['destination'], 'Dubai')
        self.assertEqual(second['entities']['passengers'], 4)
        self.assertIn('Dubai', second['response'])
        self.assertNotIn('Thank you for calling TravelAI', second['response'])

        # The memory is persisted for the next turn / handoff
        with self.app.app_context():
            stored = AISession.query.filter_by(call_id=call_id).order_by(AISession.id.desc()).first()
            self.assertIsNotNone(stored)
            self.assertEqual(stored.id, first['session_id'])
            context = json.loads(stored.context_data)
            self.assertEqual(context['entities']['destination'], 'Dubai')
            self.assertEqual(context['entities']['passengers'], 4)
            self.assertTrue(context['greeted'])
            self.assertEqual(stored.messages.count(), 4)

    def test_10_unknown_call_id_is_rejected(self):
        res = self.client.post('/api/ai/call-turn', json={'call_id': 999999, 'speech': 'hello'})
        self.assertEqual(res.status_code, 404)


    def test_11_live_queue_reports_whether_a_call_has_an_audio_stream(self):
        """
        Audio ingestion sessions are in-memory only, so a live call may legitimately have
        none. The queue payload must say so, because the dashboard only probes
        /api/telephony/audio-stream/<id> when a session exists — otherwise the endpoint
        answers 404, which the browser also logs as a console error on every selection.
        """
        session = self._start_browser_call('Stream Flag Caller')
        call_id = session['call']['id']

        streaming = [c for c in self.client.get('/api/calls/live').get_json() if c['id'] == call_id]
        self.assertEqual(len(streaming), 1)
        self.assertIs(streaming[0]['has_audio_stream'], True)

        # Closing the session (audio persisted, spool dropped) clears the flag, and the
        # status probe keeps answering 404 for that call
        self.assertEqual(self.client.post(f'/api/telephony/audio-stream/{call_id}/stop').status_code, 200)
        stopped = [c for c in self.client.get('/api/calls/live').get_json() if c['id'] == call_id]
        self.assertIs(stopped[0]['has_audio_stream'], False)
        self.assertEqual(self.client.get(f'/api/telephony/audio-stream/{call_id}').status_code, 404)


if __name__ == '__main__':
    unittest.main()
