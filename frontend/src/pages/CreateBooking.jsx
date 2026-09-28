import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingApi } from '../services/bookingApi';
import { customerApi } from '../services/customerApi';
import { 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  User, 
  MapPin, 
  Calendar, 
  Users, 
  Plane, 
  Hotel, 
  Compass, 
  CreditCard, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

export const CreateBooking = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customerId: '',
    destination: 'Dubai',
    bookingType: 'FLIGHT',
    departureDate: '2026-10-10',
    returnDate: '2026-10-17',
    passengerCount: 2,
    selectedFlightId: null,
    selectedHotelId: null,
    selectedTourId: null,
    passengers: [
      { first_name: 'John', last_name: 'Smith', passport_number: 'US1234567' },
      { first_name: 'Emily', last_name: 'Smith', passport_number: 'US1234568' }
    ],
    totalPrice: 840,
    paymentMethod: 'CREDIT_CARD',
    cardNumber: '4242 •••• •••• 4242',
    notes: 'Customer booked via TravelAI portal.'
  });

  const [createdBooking, setCreatedBooking] = useState(null);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const [cList, fList, hList, tList] = await Promise.all([
          customerApi.getCustomers(),
          bookingApi.getFlights(),
          bookingApi.getHotels(),
          bookingApi.getTours()
        ]);
        setCustomers(cList);
        setFlights(fList);
        setHotels(hList);
        setTours(tList);
        if (cList.length > 0) {
          setFormData((prev) => ({ ...prev, customerId: cList[0].id }));
        }
      } catch (err) {
        console.error("Failed to load inventory:", err);
      }
    };
    loadInventory();
  }, []);

  // Update total price dynamically based on selection
  useEffect(() => {
    let base = 0;
    if (formData.bookingType === 'FLIGHT' && formData.selectedFlightId) {
      const f = flights.find(x => x.id === parseInt(formData.selectedFlightId));
      if (f) base = f.price * formData.passengerCount;
    } else if (formData.bookingType === 'HOTEL' && formData.selectedHotelId) {
      const h = hotels.find(x => x.id === parseInt(formData.selectedHotelId));
      if (h) base = h.price_per_night * 4; // 4 nights default
    } else if (formData.bookingType === 'TOUR' && formData.selectedTourId) {
      const t = tours.find(x => x.id === parseInt(formData.selectedTourId));
      if (t) base = t.price * formData.passengerCount;
    } else {
      base = 420 * formData.passengerCount;
    }
    setFormData((prev) => ({ ...prev, totalPrice: base }));
  }, [formData.bookingType, formData.selectedFlightId, formData.selectedHotelId, formData.selectedTourId, formData.passengerCount]);

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 8));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        customer_id: formData.customerId,
        destination: formData.destination,
        booking_type: formData.bookingType,
        total_price: formData.totalPrice,
        departure_date: formData.departureDate,
        return_date: formData.returnDate,
        passengers: formData.passengers,
        flight_id: formData.selectedFlightId,
        hotel_id: formData.selectedHotelId,
        tour_id: formData.selectedTourId,
        notes: formData.notes
      };

      const res = await bookingApi.createBooking(payload);
      // Process payment immediately
      await bookingApi.processPayment({
        booking_id: res.id,
        amount: formData.totalPrice,
        payment_method: formData.paymentMethod,
        currency: 'USD'
      });
      setCreatedBooking(res);
      setStep(8); // Confirmation step
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    'Customer',
    'Destination',
    'Dates',
    'Passengers',
    'Package Selection',
    'Price Review',
    'Payment',
    'Confirmation'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Create New Travel Booking</h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete the 8-step wizard to reserve flights, hotels, tour itineraries, and capture payment.
        </p>
      </div>

      {/* Wizard Progress Stepper */}
      <div className="glass-panel p-4 rounded-3xl overflow-x-auto">
        <div className="flex items-center justify-between min-w-[600px]">
          {stepsList.map((label, idx) => {
            const stepNum = idx + 1;
            const isDone = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-4 ring-blue-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  <span className={`text-[10px] mt-1.5 font-medium ${isCurrent ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full ${
                      step > stepNum ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Contents */}
      <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-slate-800 relative">
        {/* Step 1: Customer */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Step 1: Select Traveler Profile
            </h2>
            <p className="text-xs text-slate-400">Choose an existing traveler or link to registered CRM client:</p>
            <div className="space-y-3 pt-2">
              <label className="block text-xs text-slate-400">Client Profile</label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full bg-slate-900 text-slate-100 p-3 rounded-2xl border border-slate-700 text-xs focus:outline-none focus:border-blue-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.phone}) — {c.country}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Destination */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              Step 2: Choose Destination & Booking Category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Destination City</label>
                <select
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full bg-slate-900 text-slate-100 p-3 rounded-2xl border border-slate-700 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="Dubai">Dubai, United Arab Emirates</option>
                  <option value="Paris">Paris, France</option>
                  <option value="Tokyo">Tokyo, Japan</option>
                  <option value="London">London, United Kingdom</option>
                  <option value="Rome">Rome, Italy</option>
                  <option value="New York">New York, USA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Service Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['FLIGHT', 'HOTEL', 'TOUR'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, bookingType: type })}
                      className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                        formData.bookingType === type
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {type === 'FLIGHT' && <Plane className="w-4 h-4" />}
                      {type === 'HOTEL' && <Hotel className="w-4 h-4" />}
                      {type === 'TOUR' && <Compass className="w-4 h-4" />}
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Dates */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Step 3: Travel Schedule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Departure / Check-in Date</label>
                <input
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  className="w-full bg-slate-900 text-slate-100 p-3 rounded-2xl border border-slate-700 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Return / Check-out Date</label>
                <input
                  type="date"
                  value={formData.returnDate}
                  onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                  className="w-full bg-slate-900 text-slate-100 p-3 rounded-2xl border border-slate-700 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Passengers */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Step 4: Passenger Information
            </h2>
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Number of Passengers / Guests</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.passengerCount}
                  onChange={(e) => setFormData({ ...formData, passengerCount: parseInt(e.target.value) || 1 })}
                  className="w-32 bg-slate-900 text-slate-100 p-2.5 rounded-xl border border-slate-700 text-xs font-mono font-bold"
                />
              </div>

              {formData.passengers.map((p, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">First Name (Passenger {idx + 1})</label>
                    <input
                      type="text"
                      value={p.first_name}
                      onChange={(e) => {
                        const copy = [...formData.passengers];
                        copy[idx].first_name = e.target.value;
                        setFormData({ ...formData, passengers: copy });
                      }}
                      className="w-full bg-slate-800 rounded-xl p-2 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Last Name</label>
                    <input
                      type="text"
                      value={p.last_name}
                      onChange={(e) => {
                        const copy = [...formData.passengers];
                        copy[idx].last_name = e.target.value;
                        setFormData({ ...formData, passengers: copy });
                      }}
                      className="w-full bg-slate-800 rounded-xl p-2 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Passport No.</label>
                    <input
                      type="text"
                      value={p.passport_number}
                      onChange={(e) => {
                        const copy = [...formData.passengers];
                        copy[idx].passport_number = e.target.value;
                        setFormData({ ...formData, passengers: copy });
                      }}
                      className="w-full bg-slate-800 rounded-xl p-2 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Inventory Selection */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              Step 5: Select {formData.bookingType} Package
            </h2>

            {formData.bookingType === 'FLIGHT' && (
              <div className="space-y-2.5">
                {flights.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setFormData({ ...formData, selectedFlightId: f.id })}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      formData.selectedFlightId === f.id
                        ? 'bg-blue-600/20 border-blue-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-mono font-bold text-blue-400">{f.flight_number}</span>
                      <p className="text-sm font-semibold text-white">{f.airline} • {f.origin} → {f.destination}</p>
                      <p className="text-[11px] text-slate-400">Class: {f.cabin_class} • {f.available_seats} seats remaining</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-emerald-400 font-mono">${f.price}</p>
                      <span className="text-[10px] text-slate-400">per person</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {formData.bookingType === 'HOTEL' && (
              <div className="space-y-2.5">
                {hotels.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => setFormData({ ...formData, selectedHotelId: h.id })}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      formData.selectedHotelId === h.id
                        ? 'bg-cyan-600/20 border-cyan-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{h.name}</p>
                      <p className="text-[11px] text-slate-400">{h.location}, {h.city} • Rating: ⭐ {h.rating}/5</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-emerald-400 font-mono">${h.price_per_night}</p>
                      <span className="text-[10px] text-slate-400">/ night</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {formData.bookingType === 'TOUR' && (
              <div className="space-y-2.5">
                {tours.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setFormData({ ...formData, selectedTourId: t.id })}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      formData.selectedTourId === t.id
                        ? 'bg-emerald-600/20 border-emerald-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-[11px] text-slate-400">{t.duration} in {t.destination}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-emerald-400 font-mono">${t.price}</p>
                      <span className="text-[10px] text-slate-400">all-inclusive</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 6: Price Review */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Step 6: Review Summary & Pricing
            </h2>
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Destination:</span>
                <span className="font-bold text-white">{formData.destination}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Package Type:</span>
                <span className="font-bold text-blue-400">{formData.bookingType}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Travel Period:</span>
                <span className="font-mono text-slate-200">{formData.departureDate} to {formData.returnDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Passenger Count:</span>
                <span className="font-bold text-slate-200">{formData.passengerCount} Guest(s)</span>
              </div>
              <div className="flex justify-between pt-2 text-base">
                <span className="font-bold text-white">Grand Total:</span>
                <span className="font-bold text-emerald-400 font-mono">${formData.totalPrice.toLocaleString()} USD</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Payment */}
        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              Step 7: Capture Payment & Authorize
            </h2>
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span>Amount to Charge:</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">${formData.totalPrice.toLocaleString()} USD</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 text-white"
                >
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                  <option value="STRIPE">Stripe Payment Intent</option>
                  <option value="BANK_TRANSFER">Direct Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Card Number (Simulated)</label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                  className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Confirmation */}
        {step === 8 && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl border border-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white font-heading">Booking Confirmed Successfully!</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your reservation reference <strong className="text-blue-400 font-mono">{createdBooking?.booking_reference || 'TRV-2026-CONFIRMED'}</strong> has been issued.
              A payment receipt for ${formData.totalPrice.toLocaleString()} USD was generated and sent to the customer.
            </p>

            <div className="flex justify-center gap-3 pt-4">
              <button
                onClick={() => navigate(`/bookings`)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                View All Bookings
              </button>
              <button
                onClick={() => navigate(`/calls/live`)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Open Live Call Center
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 8 && (
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-800">
            <button
              type="button"
              disabled={step === 1}
              onClick={handleBack}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-30 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {step < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/30"
              >
                {loading ? 'Authorizing...' : 'Authorize Payment & Confirm'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
