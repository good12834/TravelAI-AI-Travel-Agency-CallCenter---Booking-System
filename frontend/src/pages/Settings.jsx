import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Bot, Phone, Globe, Shield, Bell } from 'lucide-react';

export const Settings = () => {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    agencyName: 'TravelAI Global Concierge',
    supportPhone: '+1-800-555-0199',
    supportEmail: 'concierge@travelai.com',
    currency: 'USD',
    aiConfidenceThreshold: 70,
    ttsVoiceSpeed: 1.0,
    ttsPitch: 1.0,
    autoHandoffComplaints: true,
    enableCallRecording: true,
    defaultLanguage: 'en'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-slate-400" />
            Platform & Voice Engine Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure agency parameters, AI escalation thresholds, voice synthesis, and routing logic.
          </p>
        </div>

        {saved && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-fade-in">
            ✓ Settings Saved Successfully!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Agency Profile */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h2 className="text-sm font-bold text-white font-heading flex items-center gap-2 border-b border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-blue-400" />
            Agency Profile & Contact
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Agency Name</label>
              <input
                type="text"
                value={settings.agencyName}
                onChange={(e) => setSettings({ ...settings, agencyName: e.target.value })}
                className="w-full bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Support Inbound Hotline</label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-700"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Default Base Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-700"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="ILS">ILS (₪)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: AI Voice Engine & Routing */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h2 className="text-sm font-bold text-white font-heading flex items-center gap-2 border-b border-slate-800 pb-3">
            <Bot className="w-4 h-4 text-cyan-400" />
            AI Voice Engine & Escalation Rules
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1 text-slate-300">
                <span>AI Confidence Escalation Threshold:</span>
                <span className="font-bold text-cyan-400 font-mono">{settings.aiConfidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={settings.aiConfidenceThreshold}
                onChange={(e) => setSettings({ ...settings, aiConfidenceThreshold: parseInt(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                If AI intent confidence drops below this value, the caller is immediately transferred to a human specialist.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoHandoffComplaints}
                  onChange={(e) => setSettings({ ...settings, autoHandoffComplaints: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                />
                <div>
                  <span className="font-bold text-white block">Auto-Escalate Frustrated Callers</span>
                  <span className="text-[10px] text-slate-400">Trigger handoff if negative sentiment is detected</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableCallRecording}
                  onChange={(e) => setSettings({ ...settings, enableCallRecording: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                />
                <div>
                  <span className="font-bold text-white block">Call Recording Consent & Archiving</span>
                  <span className="text-[10px] text-slate-400">Record calls for quality and audit compliance</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
