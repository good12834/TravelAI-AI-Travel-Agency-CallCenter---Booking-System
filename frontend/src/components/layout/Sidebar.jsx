import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { 
  LayoutDashboard, 
  PhoneCall, 
  Radio, 
  Users, 
  CalendarCheck, 
  Plane, 
  Hotel, 
  Compass, 
  MessageSquare, 
  Headphones, 
  BarChart3, 
  BookOpen, 
  Settings,
  Bell
} from 'lucide-react';

export const Sidebar = () => {
  const { t } = useLanguage();
  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/calls/live', label: t('nav.liveCallCenter'), icon: Radio, badge: 'LIVE', badgeColor: 'bg-rose-500' },
    { to: '/calls', label: t('nav.callHistory'), icon: PhoneCall },
    { to: '/customers', label: t('nav.customers'), icon: Users },
    { to: '/bookings', label: t('nav.bookings'), icon: CalendarCheck },
    { to: '/flights', label: t('nav.flights'), icon: Plane },
    { to: '/hotels', label: t('nav.hotels'), icon: Hotel },
    { to: '/tours', label: t('nav.tours'), icon: Compass },
    { to: '/messages', label: t('nav.messages'), icon: MessageSquare },
    { to: '/agents', label: t('nav.agents'), icon: Headphones },
    { to: '/analytics', label: t('nav.analytics'), icon: BarChart3 },
    { to: '/knowledge-base', label: t('nav.knowledge'), icon: BookOpen },
    { to: '/notifications', label: t('nav.notifications'), icon: Bell },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col h-screen sticky top-0 backdrop-blur-md z-30">
      {/* Brand header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
            ✈️
          </div>
          <div>
            <h1 className="font-bold text-lg text-white font-heading tracking-tight flex items-center gap-1.5">
              Travel<span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">{t('nav.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard' || item.to === '/calls'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${item.badgeColor} animate-pulse`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-medium">{t('nav.engineOnline')}</span>
          </div>
          <span className="text-slate-500">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
