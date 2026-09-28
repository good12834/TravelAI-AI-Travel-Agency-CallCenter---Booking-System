import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingApi } from '../services/bookingApi';
import { Hotel, Search, Star, MapPin, Plus, ArrowUpRight } from 'lucide-react';

export const Hotels = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotels();
  }, [city]);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getHotels(city ? { city } : {});
      setHotels(data);
    } catch (err) {
      console.error("Fetch hotels error:", err);
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
            <Hotel className="w-6 h-6 text-cyan-400" />
            Hotels & Luxury Resorts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hand-picked 4-star and 5-star hotel accommodations with real-time room availability.
          </p>
        </div>

        <button
          onClick={() => navigate('/bookings/create')}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Reserve Room</span>
        </button>
      </div>

      {/* City Search */}
      <div className="glass-panel p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search by city (e.g. Dubai, Paris, Tokyo, London, Rome)..."
            className="w-full bg-slate-900 text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Hotel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels.map((h) => (
          <div
            key={h.id}
            className="glass-panel glass-panel-hover rounded-3xl overflow-hidden flex flex-col justify-between"
          >
            <div className="h-48 relative overflow-hidden bg-slate-800">
              <img
                src={h.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"}
                alt={h.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-amber-400 text-xs font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{h.rating}</span>
              </div>
            </div>

            <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-heading">{h.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{h.location}, {h.city}</span>
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {h.amenities?.slice(0, 3).map((amenity, i) => (
                    <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400">Nightly rate</span>
                  <p className="text-lg font-bold text-emerald-400 font-mono">${h.price_per_night} <span className="text-xs font-normal text-slate-400">USD</span></p>
                </div>
                <button
                  onClick={() => navigate('/bookings/create')}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20"
                >
                  Reserve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
