import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export const transactionAPI = {
  getTransactions: async (params?: any) => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },
  getTransaction: async (id: string) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },
  createTransaction: async (data: any) => {
    const response = await api.post('/transactions', data);
    return response.data;
  },
  updateTransactionStatus: async (id: string, data: any) => {
    const response = await api.patch(`/transactions/${id}/status`, data);
    return response.data;
  }
};

export const auditAPI = {
  getAuditLogs: async (params?: any) => {
    const response = await api.get('/audit', { params });
    return response.data;
  },
  getAuditStats: async (params?: any) => {
    const response = await api.get('/audit/stats', { params });
    return response.data;
  }
};

export const cybridAPI = {
  getExchangeRates: async (from?: string, to?: string) => {
    const response = await api.get('/cybrid/rates', { params: { from, to } });
    return response.data;
  },
  getSupportedCurrencies: async () => {
    const response = await api.get('/cybrid/currencies');
    return response.data;
  },
  calculateConversion: async (amount: number, from: string, to: string) => {
    const response = await api.post('/cybrid/convert', { amount, from, to });
    return response.data;
  }
};

export default api;