import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, CheckCircle2, Phone, CalendarCheck, CreditCard, ShieldAlert, Check } from 'lucide-react';

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Fetch notifs error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error("Mark all error:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-rose-400" />
            System & Call Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time call center alerts, high-priority customer escalations, new bookings, and payments.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="glass-panel rounded-3xl p-6 space-y-3">
        {notifications.length === 0 ? (
          <p className="text-center py-16 text-slate-500 text-xs">No pending notifications</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                n.is_read
                  ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                  : 'bg-slate-800/60 border-blue-500/30 text-slate-200 shadow-md'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {n.type === 'CALL' && <Phone className="w-4 h-4 text-rose-400" />}
                  {n.type === 'BOOKING' && <CalendarCheck className="w-4 h-4 text-emerald-400" />}
                  {n.type === 'PAYMENT' && <CreditCard className="w-4 h-4 text-amber-400" />}
                  {n.type === 'TRANSFER' && <ShieldAlert className="w-4 h-4 text-cyan-400" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">{n.title}</h3>
                  <p className="text-xs text-slate-300 mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
