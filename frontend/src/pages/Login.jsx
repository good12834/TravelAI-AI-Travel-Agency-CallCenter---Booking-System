

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Plane,
  Sparkles,
  Headphones,
  CalendarCheck,
  Globe2,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Bot,
  Loader2,
  MessageSquare,
} from 'lucide-react';
 
const unsplash = (id, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
 
// Photos via Unsplash (free under the Unsplash License)
const HERO_BG = unsplash('photo-1682613374824-28c3cc6066a3', 2000); // Jake Nackos: airplane wing at sunset
 
const destinations = [
  {
    city: 'Paris',
    country: 'France',
    tag: 'From $129/night',
    img: unsplash('photo-1684095911812-e119e3e25562'), // Josh Withers
  },
  {
    city: 'Santorini',
    country: 'Greece',
    tag: 'From $189/night',
    img: unsplash('photo-1563789031959-4c02bcb41319'), // Dan
  },
  {
    city: 'Tokyo',
    country: 'Japan',
    tag: 'From $99/night',
    img: unsplash('photo-1634376256153-badad3ab36ec'), // Ryunosuke Tomizawa
  },
];
 
const features = [
  {
    icon: Headphones,
    title: 'AI Call Center',
    desc: 'Voice and chat agents resolve traveler requests around the clock.',
  },
  {
    icon: CalendarCheck,
    title: 'Instant Booking',
    desc: 'Flights, hotels and transfers confirmed in a single conversation.',
  },
  {
    icon: MessageSquare,
    title: 'Omnichannel Inbox',
    desc: 'SMS, WhatsApp, Email and Web Chat unified in one hub.',
  },
];
 
const stats = [
  { value: '24/7', label: 'Availability' },
  { value: '< 3s', label: 'Avg. response' },
  { value: '40+', label: 'Languages' },
];
 
export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      const token = res.data?.token || res.data?.access_token;
      if (token) {
        const store = remember ? localStorage : sessionStorage;
        store.setItem('token', token);
      }
      navigate('/');
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <style>{`
        @keyframes travelai-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes travelai-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .travelai-float { animation: travelai-float 6s ease-in-out infinite; }
        .travelai-fade-up { animation: travelai-fade-up .7s ease-out both; }
      `}</style>
 
      {/* Background: gradient orbs + grid */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src={HERO_BG}
          alt=""
          aria-hidden="true"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950" />
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-blue-600/25 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[460px] w-[460px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />
      </div>
 
      {/* Top nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-blue-600/30">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-white">
            Travel<span className="text-cyan-400">AI</span>
          </span>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          All systems operational
        </div>
      </header>
 
      <main className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-4 lg:grid-cols-12 lg:gap-8 lg:px-10 lg:pt-10">
        {/* Hero (left) */}
        <section className="travelai-fade-up lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI Travel Agency Platform
          </div>
 
          <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl xl:text-6xl">
            Your AI-powered
            <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              travel call center
            </span>
            and booking system.
          </h1>
 
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Handle every traveler conversation automatically, from first inquiry to confirmed
            booking, across every channel, in every language.
          </p>
 
          {/* Stats */}
          <div className="mt-8 flex flex-wrap gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-heading text-2xl font-bold text-white">{s.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
 
          {/* Features */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur transition-all hover:-translate-y-1 hover:border-blue-500/50 hover:bg-slate-900/80"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/20 text-blue-400 transition-colors group-hover:bg-blue-600/30">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
 
          {/* Popular destinations */}
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Trending destinations
              </h3>
              <span className="text-[11px] text-slate-600">Booked by our AI agents this week</span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {destinations.map((d) => (
                <div
                  key={d.city}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg transition-all hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-cyan-500/10"
                >
                  <img
                    src={d.img}
                    alt={`${d.city}, ${d.country}`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <span className="inline-block rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[10px] font-medium text-cyan-300 backdrop-blur">
                      {d.tag}
                    </span>
                    <h4 className="mt-1.5 font-heading text-sm font-bold text-white">{d.city}</h4>
                    <p className="text-[11px] text-slate-400">{d.country}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          {/* Floating chat preview */}
          <div className="travelai-float mt-10 hidden max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-blue-900/20 backdrop-blur md:block">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-600/30 text-[10px] font-bold text-indigo-300">
                U
              </div>
              <div className="rounded-2xl rounded-tl-md border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-slate-200">
                I want to check hotel rates in Paris for next weekend.
              </div>
            </div>
            <div className="mt-3 flex flex-row-reverse items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/30 text-blue-400">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl rounded-tr-md bg-blue-600 px-3.5 py-2 text-xs text-white shadow-md shadow-blue-600/20">
                Found 12 options from $129/night. Want me to book the top-rated one?
              </div>
            </div>
          </div>
        </section>
 
        {/* Login card (right) */}
        <section className="travelai-fade-up lg:col-span-5" style={{ animationDelay: '.15s' }}>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-px rounded-[28px] bg-gradient-to-tr from-cyan-500/40 via-blue-500/20 to-indigo-500/40 blur-sm" />
            <div className="relative rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-blue-600/30">
                  <Globe2 className="h-5 w-5 text-white" />
                </div>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-white">Welcome back</h2>
                <p className="mt-1 text-xs text-slate-400">Sign in to manage bookings and conversations.</p>
              </div>
 
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
                  >
                    {error}
                  </div>
                )}
 
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="agent@travelai.com"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
 
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <a href="#forgot" className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300">
                      Forgot?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 py-3 pl-10 pr-11 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
 
                <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-blue-600"
                  />
                  Keep me signed in
                </label>
 
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
 
              <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-800 pt-5 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Encrypted, secure session
              </div>
            </div>
          </div>
        </section>
      </main>
 
      <footer className="relative z-10 pb-6 text-center text-[11px] text-slate-600">
        © {new Date().getFullYear()} TravelAI. All rights reserved. · Photos by{' '}
        <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="hover:text-slate-400">
          Unsplash
        </a>{' '}
        contributors
      </footer>
    </div>
  );
};
 
export default Login;