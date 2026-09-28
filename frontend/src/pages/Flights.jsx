import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingApi } from '../services/bookingApi';
import { Plane, Search, Clock, Users, ArrowRight, Plus } from 'lucide-react';

export const Flights = () => {
  const navigate = useNavigate();
  const [flights, setFlights] = useState([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlights();
  }, [origin, destination]);

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const params = {};
      if (origin) params.origin = origin;
      if (destination) params.destination = destination;
      const data = await bookingApi.getFlights(params);
      setFlights(data);
    } catch (err) {
      console.error("Fetch flights error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Plane className="w-6 h-6 text-blue-400" />
            Flight Schedules & Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global airline inventory, seat allocation, scheduled departures, and pricing.
          </p>
        </div>

        <button
          onClick={() => navigate('/bookings/create')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Book Flight</span>
        </button>
      </div>

      {/* Flight Search */}
      <div className="glass-panel p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Origin (e.g. Tel Aviv, New York, London)..."
            className="w-full bg-slate-900 text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination (e.g. Dubai, Paris, Tokyo)..."
            className="w-full bg-slate-900 text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Flight Cards */}
      <div className="space-y-4">
        {flights.map((f) => (
          <div
            key={f.id}
            className="glass-panel glass-panel-hover p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-bold">
                ✈️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-400">{f.flight_number}</span>
                  <span className="text-xs font-semibold text-white">{f.airline}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{f.cabin_class}</span>
                </div>
                <p className="text-base font-bold text-white font-heading mt-1 flex items-center gap-2">
                  <span>{f.origin}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-cyan-400">{f.destination}</span>
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 font-mono">
                  <span>Dep: {new Date(f.departure_time).toLocaleString()}</span>
                  <span>Seats Left: {f.available_seats}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 self-end md:self-center">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Starting from</span>
                <p className="text-2xl font-bold text-emerald-400 font-mono">${f.price} <span className="text-xs font-normal text-slate-400">{f.currency}</span></p>
              </div>
              <button
                onClick={() => navigate('/bookings/create')}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
