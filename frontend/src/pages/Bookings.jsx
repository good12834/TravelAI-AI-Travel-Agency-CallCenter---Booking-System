import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingApi } from '../services/bookingApi';
import { 
  CalendarCheck, 
  Search, 
  Plus, 
  Plane, 
  Hotel, 
  Compass, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight,
  Filter
} from 'lucide-react';

export const Bookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, typeFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const data = await bookingApi.getBookings(params);
      setBookings(data);
    } catch (err) {
      console.error("Fetch bookings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.booking_reference.toLowerCase().includes(q) ||
      b.destination.toLowerCase().includes(q) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-emerald-400" />
            Bookings & Reservations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Flight tickets, hotel reservations, luxury tour packages, passenger itineraries, and payments.
          </p>
        </div>

        <button
          onClick={() => navigate('/bookings/create')}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Booking Wizard</span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference (e.g. TRV-2026-0001), destination, or customer..."
            className="w-full bg-slate-900 text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 text-xs text-slate-300 px-3 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 text-xs text-slate-300 px-3 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="FLIGHT">Flight</option>
            <option value="HOTEL">Hotel</option>
            <option value="TOUR">Tour Package</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Booking Ref</th>
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Type</th>
                <th className="py-3.5 px-5">Destination</th>
                <th className="py-3.5 px-5">Dates</th>
                <th className="py-3.5 px-5">Passengers</th>
                <th className="py-3.5 px-5">Total Price</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-500">
                    No bookings found matching filters
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-blue-400">
                      {b.booking_reference}
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-200">{b.customer_name}</p>
                      <p className="text-[11px] text-slate-500">{b.customer_phone}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="flex items-center gap-1.5 font-medium text-slate-200">
                        {b.booking_type === 'FLIGHT' && <Plane className="w-3.5 h-3.5 text-blue-400" />}
                        {b.booking_type === 'HOTEL' && <Hotel className="w-3.5 h-3.5 text-cyan-400" />}
                        {b.booking_type === 'TOUR' && <Compass className="w-3.5 h-3.5 text-emerald-400" />}
                        {b.booking_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-200">{b.destination}</td>
                    <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px]">
                      {b.departure_date ? b.departure_date : 'Flexible'}
                    </td>
                    <td className="py-3.5 px-5 text-slate-300">{b.passengers} Guest(s)</td>
                    <td className="py-3.5 px-5 font-bold text-emerald-400 font-mono">
                      ${b.total_price.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' :
                        b.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bookings/${b.id}`);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
