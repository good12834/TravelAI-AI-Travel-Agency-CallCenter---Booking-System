import api from './api';

export const customerApi = {
  getCustomers: async (search = '') => {
    const res = await api.get('/customers', { params: { search } });
    return res.data;
  },
  getCustomer: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },
  createCustomer: async (data) => {
    const res = await api.post('/customers', data);
    return res.data;
  },
  updateCustomer: async (id, data) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  deleteCustomer: async (id) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },
  getCustomerCalls: async (id) => {
    const res = await api.get(`/customers/${id}/calls`);
    return res.data;
  },
  getCustomerBookings: async (id) => {
    const res = await api.get(`/customers/${id}/bookings`);
    return res.data;
  }
};

export const aiApi = {
  sendMessage: async (message, context = {}, customerId = null) => {
    const res = await api.post('/ai/message', { message, context, customer_id: customerId });
    return res.data;
  },
  analyzeIntent: async (message) => {
    const res = await api.post('/ai/analyze', { message });
    return res.data;
  },
  searchKnowledge: async (query) => {
    const res = await api.post('/knowledge/search', { query });
    return res.data;
  },
  getKnowledgeDocs: async () => {
    const res = await api.get('/knowledge');
    return res.data;
  },
  createKnowledgeDoc: async (data) => {
    const res = await api.post('/knowledge', data);
    return res.data;
  },
  deleteKnowledgeDoc: async (id) => {
    const res = await api.delete(`/knowledge/${id}`);
    return res.data;
  }
};
