import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Headphones, Phone, CheckCircle2, Clock, ShieldCheck, Building2, User } from 'lucide-react';

export const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const [aRes, dRes] = await Promise.all([
        api.get('/agents'),
        api.get('/agents/departments')
      ]);
      setAgents(aRes.data);
      setDepartments(dRes.data);
    } catch (err) {
      console.error("Fetch agents error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (agentId, newStatus) => {
    try {
      await api.put(`/agents/${agentId}/status`, { status: newStatus });
      fetchAgents();
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
          <Headphones className="w-6 h-6 text-emerald-400" />
          Call Center Agents & Departments
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Specialized departments, live agent availability, telephony extensions, and active call routing status.
        </p>
      </div>

      {/* Department Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {departments.map((d) => (
          <div key={d.id} className="glass-panel p-4 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-blue-400 font-mono">{d.code || 'DEPT'}</span>
            <p className="text-sm font-bold text-white font-heading mt-1 truncate">{d.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{d.agent_count} Assigned Agent(s)</p>
          </div>
        ))}
      </div>

      {/* Agents Roster Table */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Agent</th>
                <th className="py-3.5 px-5">Extension</th>
                <th className="py-3.5 px-5">Department</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Active Calls</th>
                <th className="py-3.5 px-5">Completed</th>
                <th className="py-3.5 px-5">Avg Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {agents.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-xs shadow">
                        {a.user_name ? a.user_name[0] : 'A'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">{a.user_name}</p>
                        <p className="text-[11px] text-slate-500">{a.user_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-cyan-400 font-bold">
                    Ext: {a.extension || '1000'}
                  </td>
                  <td className="py-3.5 px-5 font-medium text-slate-200">
                    {a.department_name}
                  </td>
                  <td className="py-3.5 px-5">
                    <select
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-xl border focus:outline-none cursor-pointer ${
                        a.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        a.status === 'BUSY' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <option value="AVAILABLE" className="bg-slate-900 text-emerald-400">AVAILABLE</option>
                      <option value="BUSY" className="bg-slate-900 text-amber-400">BUSY</option>
                      <option value="OFFLINE" className="bg-slate-900 text-slate-400">OFFLINE</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="flex items-center gap-1.5 font-mono">
                      {a.active_calls_count > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                      {a.active_calls_count}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-slate-300">{a.completed_calls_count} calls</td>
                  <td className="py-3.5 px-5 font-mono text-slate-400">{a.avg_call_duration_seconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
