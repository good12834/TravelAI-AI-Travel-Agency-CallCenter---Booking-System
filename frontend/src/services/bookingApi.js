import api from './api';

export const bookingApi = {
  getBookings: async (params) => {
    const res = await api.get('/bookings', { params });
    return res.data;
  },
  getBooking: async (id) => {
    const res = await api.get(`/bookings/${id}`);
    return res.data;
  },
  createBooking: async (data) => {
    const res = await api.post('/bookings', data);
    return res.data;
  },
  confirmBooking: async (id) => {
    const res = await api.post(`/bookings/${id}/confirm`);
    return res.data;
  },
  cancelBooking: async (id) => {
    const res = await api.post(`/bookings/${id}/cancel`);
    return res.data;
  },
  getFlights: async (params) => {
    const res = await api.get('/flights', { params });
    return res.data;
  },
  getHotels: async (params) => {
    const res = await api.get('/hotels', { params });
    return res.data;
  },
  getTours: async (params) => {
    const res = await api.get('/tours', { params });
    return res.data;
  },
  processPayment: async (data) => {
    const res = await api.post('/payments', data);
    return res.data;
  }
};
