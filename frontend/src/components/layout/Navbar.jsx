import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Bell, 
  Globe, 
  UserCircle, 
  LogOut, 
  Phone,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, languages } = useLanguage();
  const [agentStatus, setAgentStatus] = useState('AVAILABLE');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customers?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Must match the demo credentials seeded by backend/seed.py
  const DEMO_PASSWORDS = {
    'admin@travelai.com': 'admin123',
    'manager@travelai.com': 'manager123',
    'agent@travelai.com': 'agent123',
  };

  const switchDemoRole = async (email) => {
    try {
      await login(email, DEMO_PASSWORDS[email] || 'admin123');
      setShowProfileMenu(false);
    } catch (err) {
      console.error("Failed to switch role:", err);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Global Quick Search */}
      <form onSubmit={handleSearch} className="relative w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bookings, flights, customers..."
          className="w-full bg-slate-800/70 text-slate-200 text-sm pl-9 pr-4 py-2 rounded-xl border border-slate-700/60 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </form>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Agent Live Status Pill */}
        <div className="hidden md:flex items-center bg-slate-800/90 rounded-xl px-3 py-1.5 border border-slate-700/50 text-xs">
          <span className="text-slate-400 mr-2 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-blue-400" />
            Ext: <span className="text-slate-200 font-mono font-bold">1001</span>
          </span>
          <select
            value={agentStatus}
            onChange={(e) => setAgentStatus(e.target.value)}
            className="bg-transparent text-xs font-semibold text-emerald-400 focus:outline-none cursor-pointer"
          >
            <option value="AVAILABLE" className="bg-slate-900 text-emerald-400">● AVAILABLE</option>
            <option value="BUSY" className="bg-slate-900 text-amber-400">● BUSY</option>
            <option value="OFFLINE" className="bg-slate-900 text-slate-400">● OFFLINE</option>
          </select>
        </div>

        {/* Multilingual Selector — switches the whole console (see LanguageContext) */}
        <div
          className="relative flex items-center bg-slate-800/70 rounded-xl px-2.5 py-1.5 border border-slate-700/50 text-xs text-slate-300"
          title="Interface & voice language"
        >
          <Globe className="w-3.5 h-3.5 mx-1.5 text-cyan-400" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Interface language"
            className="bg-transparent text-xs focus:outline-none cursor-pointer"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="bg-slate-900">
                {l.flag} {l.label} ({l.native})
              </option>
            ))}
          </select>
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-slate-900" />
        </button>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-slate-200 leading-none">{user?.name || 'Travel Staff'}</p>
              <p className="text-[10px] text-blue-400 uppercase font-semibold tracking-wider">{user?.role || 'Agent'}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="text-xs font-medium text-slate-300">{user?.name}</p>
                <p className="text-[11px] text-slate-500">{user?.email}</p>
              </div>

              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Quick Role Switch
              </div>
              <button
                onClick={() => switchDemoRole('admin@travelai.com')}
                className="w-full text-left px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
              >
                <span>Admin View</span>
                <span className="text-[10px] text-blue-400 font-mono">Full Access</span>
              </button>
              <button
                onClick={() => switchDemoRole('manager@travelai.com')}
                className="w-full text-left px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
              >
                <span>Manager View</span>
                <span className="text-[10px] text-cyan-400 font-mono">Supervisory</span>
              </button>
              <button
                onClick={() => switchDemoRole('agent@travelai.com')}
                className="w-full text-left px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
              >
                <span>Agent View</span>
                <span className="text-[10px] text-emerald-400 font-mono">Front Desk</span>
              </button>

              <div className="border-t border-slate-800 my-1.5" />
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
