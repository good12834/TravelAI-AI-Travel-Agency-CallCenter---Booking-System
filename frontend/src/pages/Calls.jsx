import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { callApi } from '../services/callApi';
import { 
  PhoneCall, 
  Search, 
  Filter, 
  Clock, 
  ArrowUpRight, 
  Radio, 
  Volume2, 
  ShieldAlert,
  Bot
} from 'lucide-react';

export const Calls = () => {
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [intentFilter, setIntentFilter] = useState('');

  useEffect(() => {
    fetchCalls();
  }, [statusFilter, intentFilter]);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (intentFilter) params.intent = intentFilter;
      const data = await callApi.getCalls(params);
      setCalls(data);
    } catch (err) {
      console.error("Fetch calls error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = calls.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
      (c.phone_number && c.phone_number.includes(q)) ||
      (c.intent && c.intent.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <PhoneCall className="w-6 h-6 text-blue-400" />
            Call History & Recordings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete archive of AI voice customer calls, transcripts, recordings, and sentiment logs.
          </p>
        </div>

        <button
          onClick={() => navigate('/calls/live')}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Go to Live Console</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or intent..."
            className="w-full bg-slate-900 text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 text-xs text-slate-300 px-3 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="MISSED">Missed</option>
          </select>

          <select
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value)}
            className="bg-slate-900 text-xs text-slate-300 px-3 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none cursor-pointer"
          >
            <option value="">All Intents</option>
            <option value="BOOKING">Booking</option>
            <option value="FLIGHT">Flight</option>
            <option value="HOTEL">Hotel</option>
            <option value="TOUR">Tour</option>
            <option value="REFUND">Refund</option>
            <option value="CANCELLATION">Cancellation</option>
            <option value="HUMAN_AGENT">Human Agent</option>
          </select>
        </div>
      </div>

      {/* Calls Table */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Call ID</th>
                <th className="py-3.5 px-5">Caller</th>
                <th className="py-3.5 px-5">Intent</th>
                <th className="py-3.5 px-5">Sentiment</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Duration</th>
                <th className="py-3.5 px-5">Handler</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-500">
                    No calls found matching criteria
                  </td>
                </tr>
              ) : (
                filteredCalls.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/calls/${c.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-cyan-400">#{c.id}</td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-200">{c.customer_name}</p>
                      <p className="text-[11px] text-slate-500">{c.phone_number}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-blue-400 font-semibold uppercase text-[10px]">
                        {c.intent}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.sentiment === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                        c.sentiment === 'FRUSTRATED' ? 'bg-rose-500/20 text-rose-400' :
                        c.sentiment === 'NEGATIVE' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-700/60 text-slate-300'
                      }`}>
                        {c.sentiment}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                        c.status === 'TRANSFERRED' ? 'bg-amber-500/20 text-amber-400' :
                        c.status === 'IN_PROGRESS' ? 'bg-rose-500/20 text-rose-400 animate-pulse' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-400">
                      {c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : '0s'}
                    </td>
                    <td className="py-3.5 px-5 text-slate-300">
                      {c.agent_name || 'AI Assistant'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/calls/${c.id}`);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300"
                        title="View Details"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
