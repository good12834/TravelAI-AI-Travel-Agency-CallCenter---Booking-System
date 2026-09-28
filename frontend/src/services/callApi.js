import api from './api';

export const callApi = {
  getCalls: async (params) => {
    const res = await api.get('/calls', { params });
    return res.data;
  },
  getLiveCalls: async () => {
    const res = await api.get('/calls/live');
    return res.data;
  },
  getCall: async (id) => {
    const res = await api.get(`/calls/${id}`);
    return res.data;
  },
  startCall: async (payload) => {
    const res = await api.post('/calls/start', payload);
    return res.data;
  },
  transferCall: async (id, payload) => {
    const res = await api.post(`/calls/${id}/transfer`, payload);
    return res.data;
  },
  endCall: async (id, payload = {}) => {
    const res = await api.post(`/calls/${id}/end`, payload);
    return res.data;
  },
  getTranscript: async (id) => {
    const res = await api.get(`/calls/${id}/transcript`);
    return res.data;
  },
  addTranscript: async (id, payload) => {
    const res = await api.post(`/calls/${id}/transcript`, payload);
    return res.data;
  },
  sendTurn: async (callId, speech) => {
    const res = await api.post('/ai/call-turn', { call_id: callId, speech }, { timeout: 90000 });
    return res.data;
  },
  // Backward compatibility alias
  simulateTurn: async (callId, speech) => {
    const res = await api.post('/ai/call-turn', { call_id: callId, speech }, { timeout: 90000 });
    return res.data;
  },
  // ---- Real telephony / browser microphone pipeline ----
  startBrowserCall: async (payload = {}) => {
    const res = await api.post('/telephony/browser-call', payload);
    return res.data;
  },
  sendAudioChunk: async ({ callId, audio, seq, mimeType }) => {
    const res = await api.post('/telephony/audio-chunk', {
      call_id: callId,
      audio,
      seq,
      mime_type: mimeType,
    }, { timeout: 10000 });
    return res.data;
  },
  getAudioStream: async (callId) => {
    const res = await api.get(`/telephony/audio-stream/${callId}`);
    return res.data;
  },
  startAudioStream: async (callId, payload = {}) => {
    const res = await api.post(`/telephony/audio-stream/${callId}/start`, payload);
    return res.data;
  },
  stopAudioStream: async (callId, payload = {}) => {
    const res = await api.post(`/telephony/audio-stream/${callId}/stop`, payload);
    return res.data;
  },
  uploadRecording: async (callId, blob, duration = 0) => {
    const formData = new FormData();
    formData.append('call_id', String(callId));
    formData.append('duration', String(duration));
    formData.append('audio', blob, `call_${callId}.webm`);
    const res = await api.post('/telephony/recording', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getVoiceStreamInfo: async () => {
    const res = await api.get('/telephony/voice-stream');
    return res.data;
  },
  changeCallLanguage: async (callId, languageCode) => {
    const res = await api.post(`/calls/${callId}/language`, { language_code: languageCode });
    return res.data;
  },
  getSupportedLanguages: async () => {
    const res = await api.get('/ai/languages');
    return res.data;
  }
};
