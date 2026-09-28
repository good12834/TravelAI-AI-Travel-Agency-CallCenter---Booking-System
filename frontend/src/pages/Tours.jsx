import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingApi } from '../services/bookingApi';
import { Compass, Search, Clock, Check, Plus } from 'lucide-react';

export const Tours = () => {
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTours();
  }, [destination]);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getTours(destination ? { destination } : {});
      setTours(data);
    } catch (err) {
      console.error("Fetch tours error:", err);
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
            <Compass className="w-6 h-6 text-emerald-400" />
            Curated Tour Packages
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            All-inclusive luxury itineraries with private guides, VIP access, and curated experiences.
          </p>
        </div>

        <button
          onClick={() => navigate('/bookings/create')}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Book Tour Package</span>
        </button>
      </div>

      {/* Destination Search */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Search tours by destination (e.g. Dubai, Paris, Tokyo, Rome)..."
            className="w-full bg-slate-900 text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Tour Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tours.map((t) => (
          <div
            key={t.id}
            className="glass-panel glass-panel-hover rounded-3xl overflow-hidden flex flex-col justify-between"
          >
            <div className="h-56 relative overflow-hidden bg-slate-800">
              <img
                src={t.image_url || "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"}
                alt={t.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold font-mono">
                {t.destination}
              </div>
              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.duration}</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white font-heading">{t.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{t.description}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Package Inclusions:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {t.includes?.map((inc, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{inc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400">All-Inclusive per person</span>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">${t.price} <span className="text-xs font-normal text-slate-400">USD</span></p>
                </div>
                <button
                  onClick={() => navigate('/bookings/create')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20"
                >
                  Book Package
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
