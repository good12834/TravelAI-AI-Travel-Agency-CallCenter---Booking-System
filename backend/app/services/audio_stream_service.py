import os
import shutil
import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# backend/static/recordings/streams  (backend/app/services -> backend/app -> backend)
STATIC_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'static'))
STREAM_ROOT = os.path.join(STATIC_ROOT, 'recordings', 'streams')

# Common browser/Telephony audio containers mapped to a file extension
MIME_EXTENSIONS = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-mulaw': 'ulaw',
    'audio/basic': 'ulaw',
}


class AudioStreamService:
    """
    In-memory registry for real-time audio streams ingested from the dashboard
    browser microphone (MediaRecorder chunks) or Twilio Media Streams.

    Chunks are appended to a single binary spool file per call so the recording
    can be persisted as a real call recording when the call ends.
    """

    _sessions = {}

    @classmethod
    def _session_dir(cls, call_id: int) -> str:
        return os.path.join(STREAM_ROOT, f'call_{call_id}')

    @classmethod
    def start_session(cls, call_id: int, mime_type: str = 'audio/webm;codecs=opus',
                      sample_rate: int = 48000, source: str = 'BROWSER') -> dict:
        directory = cls._session_dir(call_id)
        os.makedirs(directory, exist_ok=True)

        spool_path = os.path.join(directory, 'stream.bin')
        # Start a fresh spool file for each new session
        with open(spool_path, 'wb'):
            pass

        session = {
            'call_id': call_id,
            'source': source,
            'mime_type': mime_type,
            'sample_rate': sample_rate,
            'directory': directory,
            'spool_path': spool_path,
            'chunks_received': 0,
            'bytes_received': 0,
            'last_seq': -1,
            'started_at': time.time(),
            'last_chunk_at': None,
            'active': True,
        }
        cls._sessions[call_id] = session
        logger.info(f"Audio stream session started for call {call_id} [{source}] -> {spool_path}")
        return session

    @classmethod
    def append_chunk(cls, call_id: int, audio_bytes: bytes, seq: int = None) -> dict:
        session = cls._sessions.get(call_id)
        if not session:
            session = cls.start_session(call_id)

        with open(session['spool_path'], 'ab') as spool:
            spool.write(audio_bytes)

        session['chunks_received'] += 1
        session['bytes_received'] += len(audio_bytes)
        session['last_chunk_at'] = time.time()
        if seq is not None:
            session['last_seq'] = int(seq)
        return session

    @classmethod
    def get_session(cls, call_id: int) -> dict:
        return cls._sessions.get(call_id)

    @classmethod
    def _utc_iso(cls, timestamp: float = None) -> str:
        """ISO-8601 string for a timestamp, stored as naive UTC to match the call records."""
        moment = datetime.fromtimestamp(timestamp, timezone.utc).replace(tzinfo=None) if timestamp else datetime.utcnow()
        return moment.isoformat()

    @classmethod
    def session_state(cls, call_id: int) -> dict:
        session = cls._sessions.get(call_id)
        if not session:
            return None

        elapsed = session.get('duration_seconds')
        if elapsed is None:
            reference = session['last_chunk_at'] or time.time()
            elapsed = int(reference - session['started_at'])

        return {
            'call_id': session['call_id'],
            'source': session['source'],
            'active': session['active'],
            'mime_type': session['mime_type'],
            'sample_rate': session['sample_rate'],
            'chunks_received': session['chunks_received'],
            'bytes_received': session['bytes_received'],
            'duration_seconds': elapsed,
            'started_at': cls._utc_iso(session['started_at']),
            'last_chunk_at': cls._utc_iso(session['last_chunk_at']) if session['last_chunk_at'] else None,
        }

    @classmethod
    def read_audio(cls, call_id: int) -> bytes:
        session = cls._sessions.get(call_id)
        if not session or not os.path.exists(session['spool_path']):
            return b''
        with open(session['spool_path'], 'rb') as spool:
            return spool.read()

    @classmethod
    def close_session(cls, call_id: int) -> dict:
        session = cls._sessions.get(call_id)
        if not session:
            return None

        ended_at = time.time()
        session['active'] = False
        session['duration_seconds'] = max(1, int(ended_at - session['started_at']))
        logger.info(
            f"Audio stream session closed for call {call_id}: "
            f"{session['chunks_received']} chunks / {session['bytes_received']} bytes"
        )
        return session

    @classmethod
    def extension_for(cls, mime_type: str) -> str:
        base_type = (mime_type or '').split(';')[0].strip().lower()
        return MIME_EXTENSIONS.get(base_type, 'webm')

    @classmethod
    def discard_session(cls, call_id: int) -> bool:
        """
        Drops the in-memory session and deletes the raw spool file.

        Used once the captured audio has been persisted as a call recording, so real
        call audio is not stored twice on disk.
        """
        session = cls._sessions.pop(call_id, None)
        if not session:
            return False

        try:
            shutil.rmtree(session['directory'])
        except OSError as exc:
            # On Windows the directory shell can stay locked by the file indexer / sync
            # client even after its contents are gone, so at least drop the spool file.
            logger.info(f"Audio spool directory for call {call_id} partially removed ({exc})")
            try:
                os.remove(session['spool_path'])
            except OSError:
                pass
        return True

