import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingApi } from '../services/bookingApi';
import { 
  ArrowLeft, 
  CalendarCheck, 
  User, 
  MapPin, 
  CreditCard, 
  Plane, 
  Hotel, 
  Compass, 
  CheckCircle2, 
  XCircle, 
  Radio
} from 'lucide-react';

export const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const data = await bookingApi.getBooking(id);
      setBooking(data);
    } catch (err) {
      console.error("Fetch booking failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const updated = await bookingApi.cancelBooking(id);
      setBooking(updated);
    } catch (err) {
      alert("Cancellation failed");
    }
  };

  const handleConfirm = async () => {
    try {
      const updated = await bookingApi.confirmBooking(id);
      setBooking(updated);
    } catch (err) {
      alert("Confirmation failed");
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500 text-sm">Loading booking dossier...</div>;
  if (!booking) return <div className="text-center py-20 text-slate-500 text-sm">Booking #{id} not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bookings</span>
        </button>

        <div className="flex items-center gap-2">
          {booking.status === 'PENDING' && (
            <button
              onClick={handleConfirm}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm Booking</span>
            </button>
          )}

          {booking.status !== 'CANCELLED' && (
            <button
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-500/30 text-rose-400 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Booking</span>
            </button>
          )}

          <button
            onClick={() => navigate('/calls/live')}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Voice Call Traveler</span>
          </button>
        </div>
      </div>

      {/* Main Booking Dossier */}
      <div className="glass-panel p-8 rounded-3xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono">{booking.booking_reference}</h1>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                booking.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' :
                booking.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {booking.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Created on {new Date(booking.created_at).toLocaleDateString()} • {booking.booking_type} Reservation
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400">Total Price</span>
            <p className="text-2xl font-bold text-emerald-400 font-mono">${booking.total_price.toLocaleString()} {booking.currency}</p>
          </div>
        </div>

        {/* Customer & Itinerary Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Primary Traveler</span>
            <p className="text-sm font-bold text-white">{booking.customer_name}</p>
            <p className="text-slate-400">{booking.customer_phone}</p>
            <p className="text-slate-400">{booking.customer_email}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Travel Schedule</span>
            <p className="text-sm font-bold text-white">{booking.destination}</p>
            <p className="text-slate-300">Dep: <strong className="font-mono">{booking.departure_date || 'Flexible'}</strong></p>
            <p className="text-slate-300">Ret: <strong className="font-mono">{booking.return_date || 'Flexible'}</strong></p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Payment Status</span>
            <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {booking.payment_status || 'PAID'}
            </p>
            <p className="text-slate-400 font-mono text-[11px]">Trans Ref: PAY-2026-SUCCESS</p>
          </div>
        </div>

        {/* Passenger Roster */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white font-heading">
            Passenger Roster ({booking.passengers_details?.length || booking.passengers} Guests)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {booking.passengers_details && booking.passengers_details.length > 0 ? (
              booking.passengers_details.map((p, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">{p.first_name} {p.last_name}</p>
                    <p className="text-[11px] text-slate-400">Passport: <span className="font-mono">{p.passport_number || 'N/A'}</span></p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">{p.nationality}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">Standard passenger seating reserved.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
