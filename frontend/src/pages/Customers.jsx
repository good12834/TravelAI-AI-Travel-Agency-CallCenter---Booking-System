import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../services/customerApi';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Globe, 
  ArrowUpRight, 
  CalendarCheck, 
  PhoneCall,
  X
} from 'lucide-react';

export const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCust, setNewCust] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    country: 'United States',
    preferred_language: 'en'
  });

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await customerApi.getCustomers(search);
      setCustomers(data);
    } catch (err) {
      console.error("Fetch customers error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await customerApi.createCustomer(newCust);
      setShowModal(false);
      setNewCust({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        country: 'United States',
        preferred_language: 'en'
      });
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.error || "Error adding customer");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            Customer 360 CRM
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Unified traveler profiles, interaction logs, flight/hotel booking archives, and language preferences.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone number, or email..."
            className="w-full bg-slate-900 text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Customer Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/customers/${c.id}`)}
            className="glass-panel glass-panel-hover p-6 rounded-3xl cursor-pointer space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-base font-bold text-white shadow-md">
                  {c.first_name[0]}{c.last_name[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">{c.full_name}</h3>
                  <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    {c.preferred_language || 'EN'} Traveler
                  </span>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500" />
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-mono">{c.phone}</span>
              </p>
              {c.email && (
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{c.email}</span>
                </p>
              )}
              <p className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>{c.country || 'International'}</span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{c.booking_count} Bookings</span>
              </div>
              <div className="flex items-center gap-1">
                <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                <span>{c.call_count} Calls</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white font-heading mb-4">Add Traveler Profile</h2>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newCust.first_name}
                    onChange={(e) => setNewCust({ ...newCust, first_name: e.target.value })}
                    className="w-full bg-slate-800 rounded-xl p-2.5 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newCust.last_name}
                    onChange={(e) => setNewCust({ ...newCust, last_name: e.target.value })}
                    className="w-full bg-slate-800 rounded-xl p-2.5 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Phone Number (with country code)</label>
                <input
                  type="text"
                  required
                  placeholder="+1-202-555-0143"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  className="w-full bg-slate-800 rounded-xl p-2.5 border border-slate-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                  className="w-full bg-slate-800 rounded-xl p-2.5 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Country</label>
                  <input
                    type="text"
                    value={newCust.country}
                    onChange={(e) => setNewCust({ ...newCust, country: e.target.value })}
                    className="w-full bg-slate-800 rounded-xl p-2.5 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Language</label>
                  <select
                    value={newCust.preferred_language}
                    onChange={(e) => setNewCust({ ...newCust, preferred_language: e.target.value })}
                    className="w-full bg-slate-800 rounded-xl p-2.5 border border-slate-700 text-white"
                  >
                    <option value="en">English</option>
                    <option value="am">Amharic</option>
                    <option value="ar">Arabic</option>
                    <option value="he">Hebrew</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl mt-4"
              >
                Create Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
