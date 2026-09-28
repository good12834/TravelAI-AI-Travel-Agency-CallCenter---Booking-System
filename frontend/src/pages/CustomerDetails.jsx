import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi } from '../services/customerApi';
import api from '../services/api';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Globe, 
  CalendarCheck, 
  PhoneCall, 
  MessageSquare, 
  Send,
  ArrowUpRight,
  Radio
} from 'lucide-react';

export const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [calls, setCalls] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [channel, setChannel] = useState('SMS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerFull();
  }, [id]);

  const fetchCustomerFull = async () => {
    try {
      const [custRes, callsRes, bookingsRes, msgsRes] = await Promise.all([
        customerApi.getCustomer(id),
        customerApi.getCustomerCalls(id),
        customerApi.getCustomerBookings(id),
        api.get(`/messages?customer_id=${id}`)
      ]);
      setCustomer(custRes);
      setCalls(callsRes);
      setBookings(bookingsRes);
      setMessages(msgsRes.data || []);
    } catch (err) {
      console.error("Fetch customer full error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await api.post('/messages', {
        customer_id: id,
        channel: channel,
        direction: 'OUTBOUND',
        message: newMessage
      });
      setMessages((prev) => [res.data.message, ...prev]);
      setNewMessage('');
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500 text-sm">Loading traveler profile...</div>;
  if (!customer) return <div className="text-center py-20 text-slate-500 text-sm">Traveler not found</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>
        <button
          onClick={() => navigate('/calls/live')}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Call Customer on Live Voice</span>
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
            {customer.first_name[0]}{customer.last_name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-heading">{customer.full_name}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <span className="font-mono text-cyan-400">{customer.phone}</span> • 
              <span>{customer.email || 'No email registered'}</span> • 
              <span>{customer.country}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-center">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Total Bookings</p>
            <p className="text-lg font-bold text-emerald-400">{bookings.length}</p>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-center">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Total Calls</p>
            <p className="text-lg font-bold text-blue-400">{calls.length}</p>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-center">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Language</p>
            <p className="text-lg font-bold text-cyan-400 uppercase">{customer.preferred_language || 'EN'}</p>
          </div>
        </div>
      </div>

      {/* 3-Way Tabs / Sections: Bookings, Calls, Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings History */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2 border-b border-slate-800 pb-3">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            Booking History ({bookings.length})
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {bookings.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-xs">No bookings for this traveler</p>
            ) : (
              bookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => navigate(`/bookings/${b.id}`)}
                  className="p-3 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer space-y-1 transition-colors"
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-mono font-bold text-blue-400">{b.booking_reference}</span>
                    <span className="text-emerald-400 font-bold font-mono">${b.total_price.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-200">{b.destination} ({b.booking_type})</p>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                    <span>{b.departure_date || 'Flexible date'}</span>
                    <span className="uppercase font-semibold text-cyan-400">{b.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Calls History */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2 border-b border-slate-800 pb-3">
            <PhoneCall className="w-4 h-4 text-blue-400" />
            Call History ({calls.length})
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {calls.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-xs">No calls recorded</p>
            ) : (
              calls.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/calls/${c.id}`)}
                  className="p-3 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer space-y-1 transition-colors"
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-200">#{c.id} • {c.intent}</span>
                    <span className="text-slate-400 font-mono">{c.duration}s</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{c.ai_summary || "Call answered by AI voice assistant."}</p>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    <span className="text-emerald-400 font-semibold">{c.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Omnichannel Dispatch */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 flex flex-col h-[580px]">
          <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2 border-b border-slate-800 pb-3">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Dispatch Message
          </h3>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {messages.length === 0 ? (
              <p className="text-center py-12 text-slate-500 text-xs">No previous message history</p>
            ) : (
              messages.map((m, idx) => {
                const isOutbound = m.direction === 'OUTBOUND';
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-2xl text-xs max-w-[85%] ${
                      isOutbound
                        ? 'ml-auto bg-blue-600 text-white'
                        : 'mr-auto bg-slate-800 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between text-[9px] opacity-75 mb-0.5">
                      <span>{m.channel}</span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p>{m.message}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Send Box */}
          <form onSubmit={handleSendMessage} className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="bg-slate-800 text-slate-300 text-[11px] p-2 rounded-xl border border-slate-700 focus:outline-none"
              >
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="CHAT">Live Chat</option>
              </select>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message via ${channel}...`}
                className="flex-1 bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
