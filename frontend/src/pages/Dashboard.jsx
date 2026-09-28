import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  PhoneCall, 
  Radio, 
  CalendarCheck, 
  DollarSign, 
  Users, 
  Bot, 
  TrendingUp, 
  ArrowUpRight, 
  Sparkles,
  PhoneForwarded,
  Clock
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    total_calls: 2840,
    active_calls: 3,
    ai_calls: 1930,
    human_calls: 910,
    missed_calls: 34,
    total_bookings: 326,
    total_revenue: 248500,
    total_customers: 1450,
    automation_rate: 68.0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [metricsRes, bookingsRes, callsRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/bookings'),
          api.get('/calls')
        ]);
        if (metricsRes.data) setMetrics(metricsRes.data);
        if (bookingsRes.data) setRecentBookings(bookingsRes.data.slice(0, 5));
        if (callsRes.data) setRecentCalls(callsRes.data.slice(0, 5));
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const chartData = [
    { name: 'Mon', calls: 420, ai: 290, human: 130 },
    { name: 'Tue', calls: 465, ai: 320, human: 145 },
    { name: 'Wed', calls: 510, ai: 360, human: 150 },
    { name: 'Thu', calls: 480, ai: 335, human: 145 },
    { name: 'Fri', calls: 550, ai: 390, human: 160 },
    { name: 'Sat', calls: 230, ai: 165, human: 65 },
    { name: 'Sun', calls: 185, ai: 130, human: 55 },
  ];

  const destinationData = [
    { name: 'Dubai', value: 84500, color: '#3b82f6' },
    { name: 'Paris', value: 62400, color: '#06b6d4' },
    { name: 'Tokyo', value: 45100, color: '#10b981' },
    { name: 'London', value: 38200, color: '#f59e0b' },
    { name: 'Rome', value: 26800, color: '#ec4899' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Live Call Center Status */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900/80 border border-blue-500/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <span className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 text-2xl border border-blue-400/30">
              <Radio className="w-7 h-7 text-cyan-400 animate-pulse" />
            </span>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-900 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white font-heading">AI Voice Call Center is Active</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                ● Ready for Calls
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-1 max-w-xl">
              Real-time conversational voice engine handling multilingual inbound calls with speech recognition, intent routing, and instantaneous human agent transfer.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => navigate('/calls/live')}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Radio className="w-4 h-4" />
            <span>Open Live Call Center</span>
          </button>
          <button
            onClick={() => navigate('/bookings/create')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <span>+ Create Booking</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Calls</span>
            <PhoneCall className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white font-heading">{metrics.total_calls.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> +14.2% this week
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Active Calls</span>
            <Radio className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-white font-heading flex items-center gap-2">
            {metrics.active_calls}
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Live in queues</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>AI Automation</span>
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-heading">{metrics.automation_rate}%</p>
          <p className="text-[11px] text-cyan-400 mt-1 font-medium">{metrics.ai_calls} AI resolved</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Bookings</span>
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-heading">{metrics.total_bookings}</p>
          <p className="text-[11px] text-emerald-400 mt-1 font-medium">+8.5% conversion</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-heading">${metrics.total_revenue.toLocaleString()}</p>
          <p className="text-[11px] text-amber-400 mt-1 font-medium">USD Gross Bookings</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Customers</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white font-heading">{metrics.total_customers.toLocaleString()}</p>
          <p className="text-[11px] text-indigo-400 mt-1 font-medium">In CRM Database</p>
        </div>
      </div>

      {/* Analytics Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Volume Trend */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-white font-heading">Call Volume & Resolution Analytics</h3>
              <p className="text-xs text-slate-400">AI Voice Handled vs Transferred to Human Staff</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-300">AI Voice Resolved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-400" />
                <span className="text-slate-300">Human Handoff</span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="humanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="ai" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#aiGrad)" />
                <Area type="monotone" dataKey="human" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#humanGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Destination Revenue */}
        <div className="glass-panel p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white font-heading">Top Destinations</h3>
            <span className="text-xs text-blue-400 font-medium">Revenue</span>
          </div>
          <div className="space-y-4 mt-4">
            {destinationData.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">{item.name}</span>
                  <span className="text-slate-300 font-mono font-bold">${item.value.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(item.value / 84500) * 100}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity: Calls and Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Calls */}
        <div className="glass-panel p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white font-heading flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-blue-400" />
              Recent Calls
            </h3>
            <button
              onClick={() => navigate('/calls')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              View All Calls <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentCalls.map((call) => (
              <div
                key={call.id}
                onClick={() => navigate(`/calls/${call.id}`)}
                className="p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                    call.status === 'IN_PROGRESS' ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {call.status === 'IN_PROGRESS' ? 'LIVE' : 'AI'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{call.customer_name}</p>
                    <p className="text-[11px] text-slate-400">{call.phone_number} • Intent: <span className="text-cyan-400 uppercase font-semibold">{call.intent}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    call.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                    call.status === 'TRANSFERRED' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-rose-500/20 text-rose-400'
                  }`}>
                    {call.status}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-end gap-1">
                    <Clock className="w-2.5 h-2.5" /> {call.duration}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="glass-panel p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white font-heading flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
              Recent Bookings
            </h3>
            <button
              onClick={() => navigate('/bookings')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              View All Bookings <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentBookings.map((b) => (
              <div
                key={b.id}
                onClick={() => navigate(`/bookings/${b.id}`)}
                className="p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400">{b.booking_reference}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {b.booking_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{b.destination} • {b.passengers} Passenger(s)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400 font-mono">${b.total_price.toLocaleString()}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    b.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
