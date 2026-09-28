import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { callApi } from '../services/callApi';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Radio, 
  Phone, 
  PhoneOff, 
  PhoneForwarded, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  User, 
  Bot, 
  ShieldAlert, 
  Sparkles,
  Send,
  Plus,
  Clock,
  Wifi,
  WifiOff,
  Activity,
  Languages
} from 'lucide-react';

// Convert a MediaRecorder audio blob into base64 for chunked streaming to the backend
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = String(reader.result || '');
    resolve(result.includes(',') ? result.split(',')[1] : result);
  };
  reader.onerror = () => reject(reader.error || new Error('Could not read audio chunk'));
  reader.readAsDataURL(blob);
});

const formatDuration = (seconds) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mins = String(Math.floor(total / 60)).padStart(2, '0');
  const secs = String(total % 60).padStart(2, '0');
  return `${mins}:${secs}`;
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// SpeechSynthesis voice tags for the language codes the AI engine returns.
// Mirrors the LANGUAGES table in src/i18n/translations.js.
const speechLocaleMap = {
  en: 'en-US',
  am: 'am-ET',
  ar: 'ar-SA',
  he: 'he-IL',
};

export const LANGUAGE_CONFIG = {
  en: { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', dir: 'ltr', speechLocale: 'en-US', ttsLocale: 'en-US' },
  am: { code: 'am', name: 'Amharic', native: 'አማርኛ', flag: '🇪🇹', dir: 'ltr', speechLocale: 'am-ET', ttsLocale: 'am-ET' },
  ar: { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', dir: 'rtl', speechLocale: 'ar-SA', ttsLocale: 'ar-SA' },
  he: { code: 'he', name: 'Hebrew', native: 'עברית', flag: '🇮🇱', dir: 'rtl', speechLocale: 'he-IL', ttsLocale: 'he-IL' },
};

export const getLangConfig = (code) => {
  if (!code) return LANGUAGE_CONFIG.en;
  const c = String(code).toLowerCase().split('-')[0];
  return LANGUAGE_CONFIG[c] || LANGUAGE_CONFIG.en;
};

export const isRTLText = (txt) => /[\u0590-\u05FF\u0600-\u06FF]/.test(txt || '');

// Turn a microphone / stream failure into a message the operator can act on
const describeMicError = (err, t) => {
  const message = typeof err === 'string' ? err : err?.message;
  if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
    return t('errors.micDenied');
  }
  if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
    return t('errors.noMic');
  }
  if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
    return t('errors.micInUse');
  }
  return t('errors.genericMonitor', { reason: message || err?.name || 'unknown error' });
};


export const LiveCalls = () => {
  const { t, tEnum, language, setLanguage, languages, isRtl, speechLocale, ttsLocale } = useLanguage();
  const [liveCalls, setLiveCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [languageFilter, setLanguageFilter] = useState('all');
  const [transcripts, setTranscripts] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [loadingTurn, setLoadingTurn] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [customerData, setCustomerData] = useState(null);
  const [recorderActive, setRecorderActive] = useState(false);
  // 'idle' -> no live capture, 'starting' -> opening mic/stream, 'active' -> monitoring the selected call
  const [monitoring, setMonitoring] = useState('idle');
  const [streamStats, setStreamStats] = useState(null);
  const [lastTurnMs, setLastTurnMs] = useState(null);

  const transcriptEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const startListeningRef = useRef(null);
  const isMountedRef = useRef(true);
  const listeningRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunkSeqRef = useRef(0);
  const selectedCallIdRef = useRef(null);
  const elapsedBaselineRef = useRef({ seconds: 0, recordedAt: Date.now() });
  const socketConnectedRef = useRef(false);
  const sendSpeechRef = useRef(null);
  const turnInFlightRef = useRef(false);
  const lastAiReplyRef = useRef('');
  const aiSpeakingRef = useRef(false);
  const aiSpeakTimerRef = useRef(null);
  // Chrome fires "no-speech" after a few seconds of silence and then ends the
  // session, so a long call can cycle through this dozens of times. Debounce the
  // restart and track repeated silence before warning the operator.
  const recogRestartTimerRef = useRef(null);
  const silenceStreakRef = useRef(0);
  // Mirror of `monitoring` + the call it is attached to, so async capture code can
  // read the live state without stale closures and never double-open the microphone
  const monitoringRef = useRef('idle');
  const monitoredCallIdRef = useRef(null);

  const { subscribe, isConnected: socketConnected } = useSocket();
  socketConnectedRef.current = socketConnected;


  // Merge a transcript line coming from the server without duplicating optimistic entries
  const mergeTranscript = useCallback((line) => {
    if (!line || !line.message) return;
    setTranscripts((prev) => {
      const key = `${line.speaker}|${line.message}`;
      if (prev.some((x) => `${x.speaker}|${x.message}` === key)) return prev;
      return [...prev, line];
    });
  }, []);

  // Initialize Speech Recognition for continuous real-time transcription of the live call
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    // Transcribe the caller in the language of the active call (or console language)
    const callLang = selectedCall?.language_code || language;
    const activeLocale = speechLocaleMap[callLang] || speechLocale;
    recog.lang = activeLocale;

    recog.onresult = (event) => {
      silenceStreakRef.current = 0;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          const spoken = result[0].transcript.trim();
          // Ignore the AI's own voice picked up by the microphone while it is speaking
          if (spoken && !aiSpeakingRef.current) sendSpeechRef.current?.(spoken);
        } else {
          interim += result[0].transcript;
        }
      }
      setInputText(interim);
    };

    // 'no-speech' and 'aborted' are normal on an idle call line: the browser ends
    // the session on silence and we restart it in onend. Only real failures
    // (permissions, missing mic, network) should stop capture or surface a banner.
    const benignErrors = ['no-speech', 'aborted'];

    recog.onerror = (err) => {
      const code = err?.error;
      if (benignErrors.includes(code)) {
        if (code === 'no-speech') {
          silenceStreakRef.current += 1;
          // Repeated silence usually means the mic is muted/unplugged rather than
          // a genuine problem, so only surface it after the restart loop persists.
          if (silenceStreakRef.current === 5) {
            setMicError(t('errors.stillSilent'));
          }
        }
        return;
      }

      console.error('Speech recognition error:', code, err);
      const messages = {
        'not-allowed': window.isSecureContext
          ? t('errors.micDeniedReload')
          : t('errors.micBlockedHttp'),
        'service-not-allowed': t('errors.serviceNotAllowed'),
        'audio-capture': t('errors.audioCapture'),
        'network': t('errors.network'),
        'language-not-supported': t('errors.languageNotSupported'),
        'phrases-not-supported': t('errors.phrasesNotSupported'),
      };
      listeningRef.current = false;
      setIsListening(false);
      setMicError(messages[code] || `Speech recognition error: ${code}`);
    };

    // Keep a long-running call transcribing: the browser ends the session on silence
    recog.onend = () => {
      if (!listeningRef.current) {
        setIsListening(false);
        return;
      }
      // Small delay avoids a hot start/start loop when Chrome ends instantly
      clearTimeout(recogRestartTimerRef.current);
      recogRestartTimerRef.current = setTimeout(() => {
        if (!listeningRef.current) return;
        try {
          recog.start();
        } catch (e) {
          // InvalidStateError just means a session is already running
          console.warn('Speech recognition restart skipped:', e?.message);
        }
      }, 250);
    };

    recognitionRef.current = recog;

    return () => {
      // Remember whether capture is live: switching language tears this recognizer
      // down, and the next effect run must restore an active monitoring session
      // instead of silently leaving the operator muted.
      const wasListening = listeningRef.current;
      listeningRef.current = false;
      clearTimeout(recogRestartTimerRef.current);
      try {
        recog.abort();
      } catch (e) {
        console.warn('Speech recognition cleanup skipped:', e?.message);
      }
      if (wasListening) {
        // Resume capture on the freshly created recognizer. The mounted guard
        // stops this from reopening the microphone after the operator leaves
        // the page (the unmount cleanup below flips it before the timer fires).
        setTimeout(() => {
          if (!isMountedRef.current) return;
          if (recognitionRef.current && !listeningRef.current) startListeningRef.current?.();
        }, 0);
      }
    };
  }, [speechLocale, selectedCall?.language_code, language, t, startListeningRef]);

  // Release microphone/recorder resources when leaving the live console
  useEffect(() => {
    // Re-arm on every mount: React StrictMode mounts, unmounts and remounts in
    // development, and the resume guard above must not stay latched off.
    isMountedRef.current = true;
    return () => {
      // Flag first: the speech-recognition effect cleanup may schedule a resume
      // timer, and it must see that the console is gone.
      isMountedRef.current = false;
      clearTimeout(aiSpeakTimerRef.current);
      listeningRef.current = false;
      clearTimeout(recogRestartTimerRef.current);
      monitoringRef.current = 'idle';
      monitoredCallIdRef.current = null;
      try {
        recognitionRef.current?.abort();
      } catch (e) {
        console.warn('Speech recognition abort skipped:', e?.message);
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch (e) {
          console.warn('Recorder cleanup skipped:', e?.message);
        }
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Live Socket.IO events drive the queue, transcript and stream telemetry
  useEffect(() => {
    const unsubscribeNew = subscribe('call:new', (callData) => {
      if (!callData?.id) return;
      setLiveCalls((prev) => (prev.some((c) => c.id === callData.id) ? prev : [callData, ...prev]));
    });

    const unsubscribeTranscript = subscribe('call:transcript', (payload) => {
      const callId = payload?.call_id ?? payload?.transcript?.call_id;
      if (!callId || callId !== selectedCallIdRef.current) return;
      mergeTranscript(
        payload.transcript || {
          id: `${callId}-${payload.timestamp}`,
          call_id: callId,
          speaker: payload.speaker,
          message: payload.message,
          timestamp: payload.timestamp,
        }
      );
    });

    const unsubscribeAudio = subscribe('call:audio', (payload) => {
      if (!payload || payload.call_id !== selectedCallIdRef.current) return;
      setStreamStats((prev) => ({
        ...(prev || {}),
        chunks_received: payload.chunks_received,
        bytes_received: payload.bytes_received,
        duration_seconds: payload.duration_seconds,
      }));
    });

    const unsubscribeTransferred = subscribe('call:transferred', (callData) => {
      if (!callData?.id) return;
      setLiveCalls((prev) => prev.map((c) => (c.id === callData.id ? { ...c, ...callData } : c)));
      if (callData.id === selectedCallIdRef.current) {
        setSelectedCall((prev) => (prev ? { ...prev, ...callData } : prev));
        mergeTranscript({
          id: `transfer-${callData.id}-${Date.now()}`,
          speaker: 'SYSTEM',
          message: t('live.transferNotice', {
            dept: tEnum('department', callData.department_assigned, t('live.humanAgent')),
          }),
          timestamp: new Date().toISOString(),
        });
      }
    });

    const unsubscribeStatus = subscribe('call:status', (payload) => {
      if (!payload?.call_id) return;
      if (payload.call_id === selectedCallIdRef.current && payload.recording_url) {
        setSelectedCall((prev) =>
          prev ? { ...prev, recording_url: payload.recording_url, status: payload.status || prev.status } : prev
        );
      }
    });

    const unsubscribeLanguage = subscribe('call:language_changed', (payload) => {
      if (!payload?.call_id) return;
      const newLang = payload.language_code || payload.call?.language_code;
      setLiveCalls((prev) => prev.map((c) => (c.id === payload.call_id ? { ...c, language_code: newLang, ...(payload.call || {}) } : c)));
      if (payload.call_id === selectedCallIdRef.current) {
        setSelectedCall((prev) => (prev ? { ...prev, language_code: newLang, ...(payload.call || {}) } : prev));
      }
    });

    const unsubscribeEnded = subscribe('call:ended', (callData) => {
      if (!callData?.id) return;
      setLiveCalls((prev) => prev.filter((c) => c.id !== callData.id));
      if (callData.id === selectedCallIdRef.current) {
        setSelectedCall(null);
        setTranscripts([]);
        setStreamStats(null);
        // The call is over on the server, so release the local capture session too
        if (monitoredCallIdRef.current === callData.id) {
          monitoredCallIdRef.current = null;
          monitoringRef.current = 'idle';
          setMonitoring('idle');
        }
      }
    });

    return () => {
      unsubscribeNew();
      unsubscribeTranscript();
      unsubscribeAudio();
      unsubscribeTransferred();
      unsubscribeStatus();
      unsubscribeLanguage();
      unsubscribeEnded();
    };
  }, [subscribe, mergeTranscript, t, tEnum]);

  // Initial queue load + periodic refresh so live durations stay in sync with the server
  useEffect(() => {
    fetchCalls();
    const refresh = setInterval(() => {
      fetchCalls({ silent: true });
    }, 15000);
    return () => clearInterval(refresh);
  }, []);

  // Real elapsed call timer: baseline comes from the backend clock, then ticks locally
  useEffect(() => {
    selectedCallIdRef.current = selectedCall?.id ?? null;
    if (!selectedCall) {
      setElapsedSeconds(0);
      return;
    }
    elapsedBaselineRef.current = {
      seconds: selectedCall.live_duration_seconds ?? selectedCall.duration ?? 0,
      recordedAt: Date.now(),
    };
    setElapsedSeconds(elapsedBaselineRef.current.seconds);
  }, [selectedCall?.id, selectedCall?.live_duration_seconds]);

  useEffect(() => {
    if (!selectedCall) return undefined;
    const ticker = setInterval(() => {
      const { seconds, recordedAt } = elapsedBaselineRef.current;
      setElapsedSeconds(seconds + Math.floor((Date.now() - recordedAt) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, [selectedCall?.id]);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const fetchCalls = async ({ silent = false } = {}) => {
    try {
      const res = await callApi.getLiveCalls();
      setLiveCalls(res);
      if (silent) {
        // Keep server-side timing in sync without disturbing the operator's current selection
        setSelectedCall((prev) => (prev ? (res.find((c) => c.id === prev.id) || prev) : prev));
        return;
      }
      // Auto-focus the first queued call, but never replace a call the operator picked
      if (res.length > 0 && !selectedCallIdRef.current) {
        selectCall(res[0], { auto: true });
      }
    } catch (err) {
      console.error("Fetch live calls error:", err);
    }
  };

  /**
   * Focus a queued call in the monitoring console.
   * Auto-focus (page load) only loads the detail; a real click also attaches live
   * monitoring (audio stream session + microphone + speech recognition).
   */
  const selectCall = async (call, { auto = false } = {}) => {
    if (!call) return;
    const previousId = selectedCallIdRef.current;
    const switching = previousId !== call.id;

    setSelectedCall(call);
    selectedCallIdRef.current = call.id;
    if (switching) {
      // Never show one call's transcript/telemetry under another call's header
      setTranscripts([]);
      setStreamStats(null);
      setCustomerData(null);
      // Release the previous call's microphone/recorder before attaching to the new one
      stopMonitoringRef.current?.();
    }

    // Audio-stream sessions are in-memory on the backend, so a live call may legitimately
    // have none (seeded calls, Twilio webhook calls, `/api/calls/start` calls, or every call
    // after a backend restart). Probing `/audio-stream/<id>` then answers 404 — the rejection
    // is handled, but Chrome still logs a "404 (NOT FOUND)" line for the failed request, so
    // only ask when the queue payload (which carries `has_audio_stream`) confirms a session.
    const streamProbe = call.has_audio_stream === true
      ? callApi.getAudioStream(call.id).catch(() => null)
      : null;

    try {
      const [tRes, streamState] = await Promise.all([
        callApi.getTranscript(call.id),
        streamProbe,
      ]);
      setTranscripts(tRes);
      if (streamState) setStreamStats(streamState);
      if (call.customer_id) {
        const cRes = await api.get(`/customers/${call.customer_id}`);
        setCustomerData(cRes.data);
      }
    } catch (err) {
      console.error("Failed to load call detail:", err);
      setMicError(
        t('errors.callDetailFailed', {
          id: call.id,
          reason: err?.response?.data?.error || err?.message || err,
        })
      );
    }

    // Selecting a call from the queue starts live monitoring of that call
    if (!auto) {
      await startMonitoringRef.current?.(call);
    }
  };

  // Text-to-Speech speaking function (real browser speech synthesis)
  // The AI reply carries the language it detected in the caller's speech, so we
  // speak with that voice; operator notices fall back to the console language.
  const speakText = useCallback((text, language) => {
    if (!ttsEnabled || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    aiSpeakingRef.current = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocaleMap[language] || ttsLocale;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => { aiSpeakingRef.current = false; };
    utterance.onerror = () => { aiSpeakingRef.current = false; };
    // Watchdog in case the browser never fires onend
    clearTimeout(aiSpeakTimerRef.current);
    aiSpeakTimerRef.current = setTimeout(() => { aiSpeakingRef.current = false; }, Math.min(60000, 2000 + text.length * 90));
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled, ttsLocale]);

  // Process a real dialogue turn captured from the live microphone or typed by the operator
  const handleSendSpeech = useCallback(async (textToSend) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || !selectedCallIdRef.current) return;

    // Guard against overlapping turns and against the microphone re-capturing the AI voice
    if (turnInFlightRef.current) return;
    if (lastAiReplyRef.current && text.toLowerCase() === lastAiReplyRef.current.toLowerCase()) return;

    turnInFlightRef.current = true;
    setInputText('');
    setLoadingTurn(true);
    const startedAt = performance.now();

    // Optimistic line only when the socket cannot deliver the server transcript
    if (!socketConnectedRef.current) {
      mergeTranscript({
        id: `local-customer-${Date.now()}`,
        speaker: 'CUSTOMER',
        message: text,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const res = await callApi.sendTurn(selectedCallIdRef.current, text);
      setLastTurnMs(Math.round(performance.now() - startedAt));
      lastAiReplyRef.current = res.response || '';

      if (!socketConnectedRef.current) {
        mergeTranscript({
          id: `local-ai-${Date.now()}`,
          speaker: 'AI',
          message: res.response,
          timestamp: new Date().toISOString(),
        });
      }

      // Update live call intelligence from the real turn analysis
      setSelectedCall((prev) => (prev ? {
        ...prev,
        intent: res.intent,
        confidence: res.confidence,
        sentiment: res.sentiment,
        priority: res.priority,
        status: res.should_escalate ? 'TRANSFERRED' : prev.status,
        department_assigned: res.escalate_department || prev.department_assigned
      } : prev));

      if (res.should_escalate) {
        setLiveCalls((prev) => prev.map((c) => (
          c.id === selectedCallIdRef.current
            ? { ...c, status: 'TRANSFERRED', department_assigned: res.escalate_department || c.department_assigned }
            : c
        )));
      }

      // Speak the AI reply through the operator's device (real TTS playback)
      speakText(res.response, res.language);
    } catch (err) {
      console.error("Live call turn error:", err);
    } finally {
      turnInFlightRef.current = false;
      setLoadingTurn(false);
    }
  }, [inputText, mergeTranscript, speakText]);

  // Speech recognition callbacks use this ref so they always reach the latest turn handler
  sendSpeechRef.current = handleSendSpeech;

  // Start real microphone transcription for the selected call
  const startListening = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !recognitionRef.current) {
      setMicError(t('errors.micUnsupported'));
      return false;
    }
    if (window.isSecureContext === false) {
      setMicError(t('errors.insecureContext'));
      return false;
    }
    if (listeningRef.current) return true;

    try {
      // Explicit real device access check so browser permission errors surface clearly
      if (!mediaStreamRef.current) {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
        probe.getTracks().forEach((track) => track.stop());
      }
      setMicError(null);
      silenceStreakRef.current = 0;
      listeningRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Speech recognition start skipped:', e?.message);
      }
      return true;
    } catch (err) {
      listeningRef.current = false;
      setIsListening(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setMicError(t('errors.micDeniedReload'));
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setMicError(t('errors.noMic'));
      } else if (err?.name === 'InvalidStateError') {
        listeningRef.current = true;
        setIsListening(true);
      } else {
        setMicError(t('errors.genericMic', { reason: err?.message || err?.name || 'unknown error' }));
      }
      return false;
    }
  }, [t]);

  // Keep the recognition-resume path in the language effect pointed at the latest implementation
  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    silenceStreakRef.current = 0;
    clearTimeout(recogRestartTimerRef.current);
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.warn('Speech recognition stop skipped:', e?.message);
    }
  }, []);

  const toggleMic = () => (isListening ? stopListening() : startListening());

  // Stream real microphone audio to the backend in 1s timeslices while the call is live
  const startAudioStreaming = useCallback((callId, stream) => {
    const MediaRecorderImpl = window.MediaRecorder;
    if (!MediaRecorderImpl || !stream) {
      setRecorderActive(false);
      return null;
    }
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    const mimeType = preferred.find((type) => MediaRecorderImpl.isTypeSupported?.(type));
    const recorder = new MediaRecorderImpl(stream, mimeType ? { mimeType } : undefined);
    chunkSeqRef.current = 0;

    recorder.ondataavailable = async (event) => {
      if (!event.data || !event.data.size) return;
      try {
        const audio = await blobToBase64(event.data);
        const res = await callApi.sendAudioChunk({
          callId,
          audio,
          seq: chunkSeqRef.current,
          mimeType: event.data.type || mimeType || 'audio/webm',
        });
        chunkSeqRef.current += 1;
        if (res?.stream) setStreamStats(res.stream);
      } catch (err) {
        console.error('Audio chunk streaming failed:', err);
      }
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setRecorderActive(true);
    return recorder;
  }, []);

  const stopAudioStreaming = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (e) {
        console.warn('Recorder stop skipped:', e?.message);
      }
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setRecorderActive(false);
  }, []);

  // Keep the monitoring state machine in sync between React state and the ref mirror
  const setMonitoringState = useCallback((next) => {
    monitoringRef.current = next;
    setMonitoring(next);
  }, []);

  /**
   * Attach live monitoring to a queued call the dashboard did not create itself
   * (e.g. an inbound Twilio call): microphone capture + MediaRecorder chunk
   * streaming into the backend ingestion session + browser speech recognition.
   */
  const startMonitoring = useCallback(async (call) => {
    const callId = call?.id ?? selectedCallIdRef.current;
    if (!callId) return false;
    // Already monitoring this very call - nothing to reopen
    if (monitoringRef.current === 'active' && monitoredCallIdRef.current === callId) return true;
    // A start is already in flight for this call
    if (monitoringRef.current === 'starting' && monitoredCallIdRef.current === callId) return false;

    setMonitoringState('starting');
    setMicError(null);
    monitoredCallIdRef.current = callId;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(t('errors.micCaptureUnsupported'));
      }
      if (window.isSecureContext === false) {
        throw new Error(t('errors.insecureContext'));
      }

      // 1. Real microphone capture (browser permission prompt + live audio track)
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;

      // 2. Attach (or reuse) the backend ingestion session for this call
      const session = await callApi
        .startAudioStream(callId, { mime_type: 'audio/webm;codecs=opus', source: 'DASHBOARD' })
        .catch((err) => {
          // Telemetry is best-effort: keep monitoring even if the session cannot attach
          console.warn('Live audio stream session not attached:', err?.message || err);
          return null;
        });
      if (session?.stream) setStreamStats(session.stream);

      // 3. Stream microphone chunks to the backend for the real recording
      startAudioStreaming(callId, stream);

      // 4. Start browser speech recognition for the live transcript
      await startListening();

      setMonitoringState('active');
      return true;
    } catch (err) {
      stopAudioStreaming();
      stopListening();
      monitoredCallIdRef.current = null;
      setMonitoringState('idle');
      setMicError(describeMicError(err, t));
      console.error('Could not start live monitoring:', err);
      return false;
    }
  }, [setMonitoringState, startAudioStreaming, startListening, stopAudioStreaming, stopListening, t]);

  /**
   * Release the microphone, recorder and recognition session without ending the call.
   * Used when the operator switches focus to a different queued call.
   */
  const stopMonitoring = useCallback(() => {
    const previousCallId = monitoredCallIdRef.current;
    stopAudioStreaming();
    stopListening();
    monitoredCallIdRef.current = null;
    setMonitoringState('idle');
    // Close the backend ingestion session too, so its spooled audio is persisted
    // as a recording instead of leaking for a call the operator is no longer watching
    if (previousCallId) {
      callApi.stopAudioStream(previousCallId).catch((err) => {
        // A 404 only means there was no session left to close (already stopped, or the
        // backend restarted and dropped its in-memory sessions) — nothing to report.
        if (err?.response?.status !== 404) {
          console.warn('Live audio stream session not closed:', err?.message || err);
        }
      });
    }
  }, [setMonitoringState, stopAudioStreaming, stopListening]);

  // `selectCall` is declared above these callbacks, so it reaches them through refs
  // and always invokes the latest implementation
  const startMonitoringRef = useRef(null);
  startMonitoringRef.current = startMonitoring;
  const stopMonitoringRef = useRef(null);
  stopMonitoringRef.current = stopMonitoring;

  const handleTransfer = async (deptName) => {
    const callId = selectedCallIdRef.current;
    if (!callId) return;
    const localizedDept = tEnum('department', deptName, deptName || t('live.humanAgent'));
    try {
      const updated = await callApi.transferCall(callId, { department: deptName });
      setSelectedCall((prev) => (prev ? { ...prev, ...updated } : prev));
      setLiveCalls((prev) => prev.map((c) => (c.id === callId ? { ...c, ...updated } : c)));
      // The server broadcasts call:transferred, so only render the notice when offline
      if (!socketConnectedRef.current) {
        mergeTranscript({
          id: `transfer-local-${Date.now()}`,
          speaker: 'SYSTEM',
          message: t('live.transferNotice', { dept: localizedDept }),
          timestamp: new Date().toISOString(),
        });
      }
      speakText(t('live.spokenTransfer', { dept: localizedDept }));
    } catch (err) {
      console.error("Transfer error:", err);
    }
  };

  const handleEndCall = useCallback(async () => {
    const callId = selectedCallIdRef.current;
    if (!callId) return;

    stopListening();
    const finalDuration = elapsedBaselineRef.current.seconds
      + Math.floor((Date.now() - elapsedBaselineRef.current.recordedAt) / 1000);
    stopAudioStreaming();
    window.speechSynthesis?.cancel();

    try {
      // Flush the captured audio stream first so the real recording is persisted
      const streamResult = await callApi.stopAudioStream(callId, { duration: finalDuration }).catch(() => null);
      await callApi.endCall(callId, { duration: finalDuration });
      if (streamResult?.recording?.recording_url) {
        console.info(`Real call recording saved: ${streamResult.recording.recording_url}`);
      }
    } catch (err) {
      console.error("End call error:", err);
    } finally {
      setSelectedCall(null);
      selectedCallIdRef.current = null;
      setTranscripts([]);
      setStreamStats(null);
      setElapsedSeconds(0);
      monitoredCallIdRef.current = null;
      setMonitoringState('idle');
      fetchCalls();
    }
  }, [stopListening, stopAudioStreaming, setMonitoringState]);

  // Start a real call over the dashboard microphone: live audio streaming + live transcription
  const handleStartBrowserCall = useCallback(async () => {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError(t('errors.browserCannotAccessMic'));
      return;
    }
    if (window.isSecureContext === false) {
      setMicError(t('errors.insecureContext'));
      return;
    }

    try {
      // 1. Real microphone capture (browser permission prompt + live audio track)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;

      // 2. Register the call through the telephony layer
      const session = await callApi.startBrowserCall({
        phone_number: 'Browser Microphone',
        mime_type: 'audio/webm;codecs=opus',
      });

      setLiveCalls((prev) => (prev.some((c) => c.id === session.call.id) ? prev : [session.call, ...prev]));
      setSelectedCall(session.call);
      selectedCallIdRef.current = session.call.id;
      monitoredCallIdRef.current = session.call.id;
      setMonitoringState('starting');
      const baseline = session.call.live_duration_seconds ?? 0;
      elapsedBaselineRef.current = { seconds: baseline, recordedAt: Date.now() };
      setElapsedSeconds(baseline);
      setStreamStats(session.stream || null);
      setCustomerData(null);

      const serverTranscripts = await callApi.getTranscript(session.call.id).catch(() => []);
      setTranscripts(serverTranscripts);

      // 3. Stream real mic audio to the backend for recording + telemetry
      startAudioStreaming(session.call.id, stream);

      // 4. Play the AI greeting and start live speech recognition
      speakText(session.welcome_message);
      await startListening();
      setMonitoringState('active');
    } catch (err) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      stopAudioStreaming();
      monitoredCallIdRef.current = null;
      setMonitoringState('idle');
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setMicError(t('errors.micDeniedCall'));
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setMicError(t('errors.noMic'));
      } else {
        setMicError(t('errors.genericStart', { reason: err?.message || err?.name || 'unknown error' }));
      }
    }
  }, [speakText, startAudioStreaming, startListening, stopAudioStreaming, setMonitoringState, t]);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header with live socket status & real microphone call launcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2">
              <Radio className="w-6 h-6 text-rose-500 animate-pulse" />
              {t('live.title')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30">
              ● {t('live.realTimeVoice')}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                socketConnected
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
              title={socketConnected ? t('live.connectedTip') : t('live.reconnectingTip')}
            >
              {socketConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {socketConnected ? t('live.liveChannel') : t('live.reconnecting')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{t('live.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* In-console language switcher: changes UI text, speech recognition and TTS together */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-700 bg-slate-800/70"
            title={t('live.title')}
          >
            <Languages className="w-4 h-4 text-cyan-400" />
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                aria-pressed={language === l.code}
                title={`${l.label} (${l.native})`}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  language === l.code
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white border border-transparent hover:border-slate-600'
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>

          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              ttsEnabled ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={t('live.ttsToggleTitle')}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{t('live.voiceSpeech')}: {ttsEnabled ? t('live.ttsOn') : t('live.ttsOff')}</span>
          </button>

          <button
            onClick={handleStartBrowserCall}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
            title={t('live.startMicCallTitle')}
          >
            <Plus className="w-4 h-4" />
            <span>{t('live.startLiveMicCall')}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Live Call Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Call Queue (3 cols) */}
        <div className="lg:col-span-3 glass-panel rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-400" />
              {t('live.activeQueue')} ({liveCalls.length})
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto px-1">
            {liveCalls.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <p>{t('live.noActiveCalls')}</p>
                <button
                  onClick={handleStartBrowserCall}
                  className="mt-3 text-blue-400 hover:underline text-xs"
                >
                  {t('live.startLiveMicLink')}
                </button>
              </div>
            ) : (
              liveCalls.map((c) => {
                const isSelected = selectedCall?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => selectCall(c)}
                    className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/60 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-cyan-400">#{c.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'IN_PROGRESS' ? 'bg-rose-500/20 text-rose-400 animate-pulse' :
                        c.status === 'TRANSFERRED' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {tEnum('status', c.status, c.status)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 truncate">{c.customer_name || t('live.caller')}</p>
                    <p className="text-[11px] text-slate-400">{c.phone_number}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/40 text-[10px] text-slate-400">
                      <span className="text-blue-400 font-medium uppercase">{tEnum('intent', c.intent, c.intent)}</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" /> {formatDuration(c.live_duration_seconds ?? c.duration)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Active Call Console & Live Transcript (6 cols) */}
        <div className="lg:col-span-6 glass-panel rounded-3xl p-6 space-y-5 flex flex-col h-[700px]">
          {selectedCall ? (
            <>
              {/* Call Bar: Telephony Info & Actions */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white text-lg shadow-md shadow-rose-500/20">
                    <Phone className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white font-heading">{selectedCall.customer_name}</h2>
                      <span className="text-xs font-mono text-slate-400">{selectedCall.phone_number}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-cyan-400 font-semibold uppercase">{tEnum('intent', selectedCall.intent, selectedCall.intent)}</span>
                      <span>•</span>
                      <span>{t('live.dept')}: <strong className="text-slate-300">
                        {tEnum('department', selectedCall.department_assigned, t('live.general'))}
                      </strong></span>
                      <span>•</span>
                      <span className="font-mono text-emerald-400">{formatDuration(elapsedSeconds)} {t('live.elapsed')}</span>
                      {recorderActive && (
                        <span className="flex items-center gap-1 font-mono text-rose-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> REC
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEndCall}
                    className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                    title={t('live.endCall')}
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Real audio pipeline telemetry */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 py-2 bg-slate-900/60 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  {recorderActive
                    ? <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    : <span className="w-2 h-2 rounded-full bg-slate-600" />}
                  {recorderActive ? t('live.streamingMic') : t('live.noAudioStream')}
                </span>
                <span className={`flex items-center gap-1.5 font-medium ${
                  monitoring === 'active' ? 'text-emerald-400'
                    : monitoring === 'starting' ? 'text-amber-400'
                    : 'text-slate-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    monitoring === 'active' ? 'bg-emerald-400 animate-ping'
                      : monitoring === 'starting' ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-600'
                  }`} />
                  {monitoring === 'active' ? t('live.monitoringActive')
                    : monitoring === 'starting' ? t('live.monitoringStarting')
                    : t('live.monitoringIdle')}
                </span>
                <span>{t('live.chunks')}: <strong className="text-cyan-400 font-mono">{streamStats?.chunks_received ?? 0}</strong></span>
                <span>{t('live.audio')}: <strong className="text-cyan-400 font-mono">{formatBytes(streamStats?.bytes_received)}</strong></span>
                <span>{t('live.mic')}: <strong className="text-cyan-400 font-mono">{isListening ? t('live.micOpen') : t('live.micMuted')}</strong></span>
                <span>{t('live.turn')}: <strong className="text-cyan-400 font-mono">{lastTurnMs ? `${lastTurnMs} ms` : '—'}</strong></span>
                {[...Array(8)].map((_, i) => (
                  <span
                    key={i}
                    className="wave-bar"
                    style={{ animationDelay: `${i * 0.08}s`, animationPlayState: recorderActive ? 'running' : 'paused' }}
                  />
                ))}
              </div>

              {/* Live Transcript Stream */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 py-2">
                {transcripts.map((line, idx) => {
                  // NOTE: the parameter is deliberately named `line`, not `t`:
                  // `t` is the translation function from useLanguage() and a
                  // same-named parameter would shadow it inside this callback.
                  const isCustomer = line.speaker === 'CUSTOMER';
                  const isAi = line.speaker === 'AI';
                  const isAgent = line.speaker === 'AGENT';
                  const isSystem = line.speaker === 'SYSTEM';

                  if (isSystem) {
                    return (
                      <div key={idx} className="text-center my-2">
                        <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-400 text-[10px] font-mono border border-slate-700/60">
                          ⚙️ {line.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className={`flex gap-3 ${isCustomer ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isCustomer && (
                        <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs shrink-0 border border-blue-500/30 mt-1">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                          isCustomer
                            ? 'bg-blue-600 text-white rounded-br-xs shadow-md shadow-blue-600/20'
                            : 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700/60'
                        }`}
                      >
                        <p className="text-[10px] font-bold opacity-75 mb-0.5">
                          {isCustomer ? t('live.customer') : isAi ? t('live.aiAssistant') : t('live.humanAgent')}
                        </p>
                        <p className="leading-relaxed">{line.message}</p>
                      </div>

                      {isCustomer && (
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs shrink-0 border border-indigo-500/30 mt-1">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>

              {/* Live microphone capture controls */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    {t('live.liveAudioChannel')}:
                    <span className={recorderActive ? 'text-rose-400' : 'text-slate-500'}>
                      {recorderActive ? t('live.streamingToBackend') : t('live.idle')}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {streamStats?.source ? `${streamStats.source} • ${streamStats.sample_rate || 48000} Hz` : t('live.browserRecorder')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-lg border ${isListening ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    🎙 {isListening ? t('live.speechActive') : t('live.speechIdle')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg border ${socketConnected ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                    ⚡ {socketConnected ? t('live.transcriptChannel') : t('live.transcriptOffline')}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                    {streamStats?.chunks_received ?? 0} chunks • {formatBytes(streamStats?.bytes_received)}
                  </span>
                </div>

                {/* Speech & Text Input Bar */}
                {micError && (
                  <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="flex-1">{micError}</span>
                    <button
                      type="button"
                      onClick={() => setMicError(null)}
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-amber-200 hover:bg-amber-500/20 transition-colors"
                      title={t('live.dismissTitle')}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendSpeech();
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isListening
                        ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={isListening ? t('live.muteMic') : t('live.openMic')}
                  >
                    {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isListening ? t('live.placeholderListening') : t('live.placeholderType')}
                    className="flex-1 bg-slate-900 text-slate-100 text-xs px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    disabled={loadingTurn || !inputText.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{loadingTurn ? t('live.processing') : t('live.send')}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
              <Radio className="w-12 h-12 text-slate-700 animate-pulse" />
              <p>{t('live.selectCallHint')}</p>
              <button
                onClick={handleStartBrowserCall}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('live.startLiveMicCall')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Column 3: AI Intelligence, Context & Transfer Controls (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* AI Intelligence Card */}
          <div className="glass-panel rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              {t('live.aiIntelligence')}
            </h3>

            {selectedCall ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>{t('live.aiConfidence')}</span>
                    <span className="font-bold text-cyan-400 font-mono">
                      {Math.round((selectedCall.confidence || 0.92) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${(selectedCall.confidence || 0.92) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                  <span className="text-slate-400">{t('live.detectedSentiment')}</span>
                  <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                    selectedCall.sentiment === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                    selectedCall.sentiment === 'FRUSTRATED' ? 'bg-rose-500/20 text-rose-400' :
                    selectedCall.sentiment === 'NEGATIVE' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {tEnum('sentiment', selectedCall.sentiment, t('sentiment.NEUTRAL'))}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-800">
                  <span className="text-slate-400">{t('live.priorityLevel')}</span>
                  <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                    selectedCall.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-400' :
                    selectedCall.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {tEnum('priority', selectedCall.priority, t('priority.MEDIUM'))}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">{t('live.noActiveCall')}</p>
            )}
          </div>

          {/* Smart Handoff / Transfer Buttons */}
          <div className="glass-panel rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2 border-b border-slate-800 pb-3">
              <PhoneForwarded className="w-4 h-4 text-emerald-400" />
              {t('live.smartTransfer')}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('live.smartTransferHint')}
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleTransfer('Flight Department')}
                className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs text-start font-medium border border-slate-700/60 flex items-center justify-between transition-colors"
              >
                <span>✈️ {t('transfer.flight')}</span>
                <span className="text-[10px] text-emerald-400">Ext 1001</span>
              </button>
              <button
                onClick={() => handleTransfer('Hotel Department')}
                className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs text-start font-medium border border-slate-700/60 flex items-center justify-between transition-colors"
              >
                <span>🏨 {t('transfer.hotel')}</span>
                <span className="text-[10px] text-emerald-400">Ext 1002</span>
              </button>
              <button
                onClick={() => handleTransfer('Finance Department')}
                className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs text-start font-medium border border-slate-700/60 flex items-center justify-between transition-colors"
              >
                <span>💳 {t('transfer.finance')}</span>
                <span className="text-[10px] text-emerald-400">Ext 1003</span>
              </button>
              <button
                onClick={() => handleTransfer('Visa Department')}
                className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs text-start font-medium border border-slate-700/60 flex items-center justify-between transition-colors"
              >
                <span>🌍 {t('transfer.visa')}</span>
                <span className="text-[10px] text-emerald-400">Ext 1004</span>
              </button>
            </div>
          </div>

          {/* Customer CRM Summary Card */}
          {customerData && (
            <div className="glass-panel rounded-3xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2 border-b border-slate-800 pb-3">
                <User className="w-4 h-4 text-indigo-400" />
                {t('live.callerProfile')}
              </h3>
              <div className="space-y-1.5 text-xs">
                <p className="text-slate-200 font-semibold">{customerData.full_name}</p>
                <p className="text-slate-400">{customerData.email}</p>
                <p className="text-slate-400">{customerData.country} • {t('live.langLabel')} <span className="uppercase text-blue-400 font-semibold">{customerData.preferred_language}</span></p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
                  <span>{t('live.totalBookings')} <strong className="text-slate-200">{customerData.booking_count}</strong></span>
                  <span>{t('live.callsCount')} <strong className="text-slate-200">{customerData.call_count}</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
