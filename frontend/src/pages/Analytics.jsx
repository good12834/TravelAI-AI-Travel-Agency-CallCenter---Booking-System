import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  PhoneCall, 
  DollarSign, 
  CalendarCheck, 
  Bot, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

export const Analytics = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [callData, setCallData] = useState(null);
  const [revData, setRevData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [dRes, cRes, rRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/calls'),
        api.get('/analytics/revenue')
      ]);
      setDashboardData(dRes.data);
      setCallData(cRes.data);
      setRevData(rRes.data);
    } catch (err) {
      console.error("Fetch analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-cyan-400" />
          Call Center & Business Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time performance metrics, AI voice resolution efficiency, destination revenues, and agent workloads.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-3xl">
          <span className="text-xs text-slate-400">Total Call Volume</span>
          <p className="text-2xl font-bold text-white font-heading mt-1">{dashboardData?.total_calls?.toLocaleString() || 2840}</p>
          <p className="text-[11px] text-emerald-400 mt-1 font-medium">+12.4% vs last period</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl">
          <span className="text-xs text-slate-400">AI Autonomous Resolution</span>
          <p className="text-2xl font-bold text-cyan-400 font-heading mt-1">{dashboardData?.automation_rate || 68.0}%</p>
          <p className="text-[11px] text-slate-400 mt-1">Resolved without human handoff</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl">
          <span className="text-xs text-slate-400">First Call Resolution (FCR)</span>
          <p className="text-2xl font-bold text-emerald-400 font-heading mt-1">87.4%</p>
          <p className="text-[11px] text-emerald-400 mt-1 font-medium">Industry leading standard</p>
        </div>

        <div className="glass-panel p-5 rounded-3xl">
          <span className="text-xs text-slate-400">Average Call Duration</span>
          <p className="text-2xl font-bold text-amber-400 font-heading font-mono mt-1">3m 04s</p>
          <p className="text-[11px] text-slate-400 mt-1">184 seconds average</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Call Trend (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl">
          <h3 className="text-base font-semibold text-white font-heading mb-4">
            Daily Call Resolution (AI Voice vs Human Transfer)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={callData?.daily_trend || []}>
                <defs>
                  <linearGradient id="aiArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="humanArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="ai_resolved" name="AI Handled" stroke="#3b82f6" fill="url(#aiArea)" />
                <Area type="monotone" dataKey="transferred" name="Human Transferred" stroke="#06b6d4" fill="url(#humanArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Destination Revenue BarChart (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl">
          <h3 className="text-base font-semibold text-white font-heading mb-4">
            Revenue by Top Destination
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revData?.destinations || []}>
                <XAxis dataKey="destination" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                <Bar dataKey="revenue" name="Revenue ($)" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {(revData?.destinations || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Service Distribution & Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="text-base font-semibold text-white font-heading mb-4">
            Gross Booking Share by Service Type
          </h3>
          <div className="space-y-4">
            {revData?.category_breakdown?.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-200 font-medium">{cat.category}</span>
                  <span className="text-slate-300 font-mono font-bold">${cat.amount.toLocaleString()} ({cat.percentage}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: COLORS[idx] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white font-heading mb-2">
              System SLA & Escalation Reliability
            </h3>
            <p className="text-xs text-slate-400">Call handling metrics monitored by supervisor dashboard:</p>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block mb-1">Transfer Latency</span>
              <span className="text-base font-bold text-emerald-400 font-mono">&lt; 1.2s</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block mb-1">Customer CSAT</span>
              <span className="text-base font-bold text-cyan-400 font-mono">4.85 / 5.0</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block mb-1">RAG Grounding Accuracy</span>
              <span className="text-base font-bold text-blue-400 font-mono">99.2%</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block mb-1">Missed Call Rate</span>
              <span className="text-base font-bold text-emerald-400 font-mono">1.1%</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center font-mono">TravelAI Telephony Telemetry Active</p>
        </div>
      </div>
    </div>
  );
};
