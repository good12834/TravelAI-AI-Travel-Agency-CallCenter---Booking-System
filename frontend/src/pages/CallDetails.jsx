import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callApi } from '../services/callApi';
import { 
  ArrowLeft, 
  Phone, 
  User, 
  Bot, 
  Clock, 
  Sparkles, 
  Play, 
  Pause, 
  Volume2, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const CallDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(25);

  useEffect(() => {
    const fetchCall = async () => {
      try {
        const data = await callApi.getCall(id);
        setCall(data);
      } catch (err) {
        console.error("Fetch call detail failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCall();
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 text-sm">Loading call inspection...</div>;
  }

  if (!call) {
    return (
      <div className="text-center py-20 text-slate-500 text-sm space-y-4">
        <p>Call #{id} not found</p>
        <button
          onClick={() => navigate('/calls')}
          className="text-blue-400 hover:underline text-xs"
        >
          ← Return to call logs
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/calls')}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Calls</span>
        </button>
        <span className="text-xs font-mono text-slate-500">Call Reference: #{call.id}</span>
      </div>

      {/* Main Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Call Summary & Info */}
        <div className="md:col-span-1 space-y-6">
          {/* Metadata Card */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400">Caller Identity</span>
              {call.customer_id && (
                <button
                  onClick={() => navigate(`/customers/${call.customer_id}`)}
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  CRM Profile <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <div>
              <p className="text-base font-bold text-white font-heading">{call.customer_name}</p>
              <p className="text-xs font-mono text-slate-400">{call.phone_number}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400">{call.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Intent:</span>
                <span className="font-bold text-blue-400 uppercase">{call.intent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sentiment:</span>
                <span className="font-bold text-cyan-400">{call.sentiment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-bold text-slate-200">{call.department_assigned || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="font-mono text-slate-200">{call.duration} seconds</span>
              </div>
            </div>
          </div>

          {/* AI Call Summary Card */}
          <div className="glass-panel p-6 rounded-3xl space-y-3 border-cyan-500/20">
            <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2 text-cyan-400">
              <Sparkles className="w-4 h-4" />
              AI Generated Call Summary
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
              {call.ai_summary || "Call conducted successfully with automated AI response. Booking details and customer preferences updated in CRM database."}
            </p>
          </div>

          {/* Simulated Audio Player */}
          <div className="glass-panel p-6 rounded-3xl space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              Call Audio Recording
            </h3>
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0:42</span>
                    <span>{call.duration ? `${Math.floor(call.duration/60)}:${call.duration%60 < 10 ? '0' : ''}${call.duration%60}` : '3:35'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${audioProgress}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 text-center font-mono">High-Definition Stereo • Encrypted Storage</p>
            </div>
          </div>
        </div>

        {/* Right Column: Full Transcript */}
        <div className="md:col-span-2 glass-panel p-6 rounded-3xl space-y-4 flex flex-col h-[750px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              Complete Call Transcript ({call.transcripts?.length || 0} turns)
            </h3>
            <span className="text-xs text-slate-500">Recorded {new Date(call.created_at).toLocaleDateString()}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 py-2">
            {!call.transcripts || call.transcripts.length === 0 ? (
              <p className="text-center py-20 text-slate-500 text-xs">No transcript available for this call</p>
            ) : (
              call.transcripts.map((t, idx) => {
                const isCustomer = t.speaker === 'CUSTOMER';
                const isAi = t.speaker === 'AI';

                return (
                  <div
                    key={idx}
                    className={`flex gap-3 ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isCustomer && (
                      <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs shrink-0 border border-blue-500/30 mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs ${
                        isCustomer
                          ? 'bg-blue-600 text-white rounded-br-xs shadow-md shadow-blue-600/20'
                          : 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1 opacity-75 text-[10px]">
                        <span className="font-bold">{isCustomer ? 'Customer' : isAi ? 'AI Assistant' : 'Human Agent'}</span>
                        <span className="font-mono">{t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                      <p className="leading-relaxed">{t.message}</p>
                    </div>

                    {isCustomer && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs shrink-0 border border-indigo-500/30 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
