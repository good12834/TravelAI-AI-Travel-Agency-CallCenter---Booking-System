import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  MessageSquare, 
  Send, 
  User, 
  Bot, 
  CheckCheck, 
  Smartphone, 
  Mail, 
  Search, 
  Radio
} from 'lucide-react';

export const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [channel, setChannel] = useState('SMS');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerMessages(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const fetchInitial = async () => {
    try {
      const [cRes, mRes] = await Promise.all([
        api.get('/customers'),
        api.get('/messages')
      ]);
      setCustomers(cRes.data);
      if (cRes.data.length > 0) {
        setSelectedCustomerId(cRes.data[0].id);
      }
      setMessages(mRes.data);
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  };

  const fetchCustomerMessages = async (cid) => {
    try {
      const res = await api.get(`/messages?customer_id=${cid}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Fetch customer msgs error:", err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedCustomerId) return;

    setLoading(true);
    try {
      const res = await api.post('/messages', {
        customer_id: selectedCustomerId,
        channel: channel,
        direction: 'INBOUND', // Customer sending, so AI replies!
        message: messageText
      });
      setMessageText('');
      fetchCustomerMessages(selectedCustomerId);
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
          <MessageSquare className="w-6 h-6 text-cyan-400" />
          Omnichannel Messaging Hub
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Automated customer messaging across SMS, WhatsApp, Email, and Live Webchat with instant AI resolution.
        </p>
      </div>

      {/* 2-Column Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
        {/* Customer Sidebar (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-3xl p-5 flex flex-col space-y-4">
          <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-4 h-4 text-blue-400" />
            Traveler Conversations ({customers.length})
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {customers.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 shadow-md'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{c.full_name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{c.preferred_language || 'EN'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{c.phone}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Stream (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-3xl p-6 flex flex-col justify-between h-full">
          {/* Chat Header */}
          {selectedCustomer ? (
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow">
                  {selectedCustomer.first_name[0]}{selectedCustomer.last_name[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-heading">{selectedCustomer.full_name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedCustomer.phone} • {selectedCustomer.email || 'Email not on file'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Channel:</span>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="bg-slate-800 text-cyan-400 text-xs px-3 py-1.5 rounded-xl border border-slate-700 font-semibold focus:outline-none"
                >
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="CHAT">Live Web Chat</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500 text-xs">Select a conversation</div>
          )}

          {/* Message History */}
          <div className="flex-1 overflow-y-auto space-y-3.5 my-4 pr-2">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs space-y-2">
                <Bot className="w-8 h-8 mx-auto text-slate-600" />
                <p>Send a simulated message to trigger AI travel assistant response!</p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isOutbound = m.direction === 'OUTBOUND';
                return (
                  <div
                    key={idx}
                    className={`flex gap-3 ${isOutbound ? 'justify-start' : 'justify-end'}`}
                  >
                    {isOutbound && (
                      <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs shrink-0 border border-blue-500/30 mt-1">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs ${
                        isOutbound
                          ? 'bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700'
                          : 'bg-blue-600 text-white rounded-br-xs shadow-md shadow-blue-600/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-1 font-mono">
                        <span className="uppercase font-bold">{isOutbound ? 'AI Travel Assistant' : 'Customer'} ({m.channel})</span>
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="leading-relaxed">{m.message}</p>
                    </div>

                    {!isOutbound && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs shrink-0 border border-indigo-500/30 mt-1">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Input Dispatch Form */}
          <form onSubmit={handleSend} className="pt-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Simulate customer message via ${channel} (e.g. "I want to check hotel rates in Paris")...`}
              className="flex-1 bg-slate-900 text-slate-100 text-xs px-4 py-3 rounded-2xl border border-slate-700 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !messageText.trim()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-40"
            >
              <span>{loading ? 'Processing...' : 'Send'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
