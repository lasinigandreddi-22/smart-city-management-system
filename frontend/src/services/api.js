const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('smartcity_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Token ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.error || data.detail || (typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Request failed');
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to Smart City API server. Please ensure the Django backend is running at http://127.0.0.1:8000.');
    }
    throw err;
  }
}

export const api = {
  // Auth & Profile
  auth: {
    login: (credentials) => request('/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
    logout: () => request('/auth/logout/', { method: 'POST' }),
    getMe: () => request('/auth/me/'),
    updateProfile: (data) => request('/auth/me/', { method: 'PATCH', body: JSON.stringify(data) }),
    getCitizens: () => request('/auth/citizens/'),
  },

  // Notifications
  notifications: {
    get: () => request('/auth/notifications/'),
    markRead: (id) => request(id ? `/auth/notifications/${id}/read/` : '/auth/notifications/read/', { method: 'POST' }),
  },

  // Complaints
  complaints: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/complaints/${query ? `?${query}` : ''}`);
    },
    get: (id) => request(`/complaints/${id}/`),
    create: (data) => request('/complaints/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/complaints/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/complaints/${id}/`, { method: 'DELETE' }),
  },

  // Utilities: Water & Electricity
  utilities: {
    getWaterNotices: (status) => request(`/utilities/water/notices/${status ? `?status=${status}` : ''}`),
    createWaterNotice: (data) => request('/utilities/water/notices/', { method: 'POST', body: JSON.stringify(data) }),
    updateWaterNotice: (id, data) => request(`/utilities/water/notices/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteWaterNotice: (id) => request(`/utilities/water/notices/${id}/`, { method: 'DELETE' }),

    getWaterRequests: () => request('/utilities/water/requests/'),
    createWaterRequest: (data) => request('/utilities/water/requests/', { method: 'POST', body: JSON.stringify(data) }),
    updateWaterRequest: (id, data) => request(`/utilities/water/requests/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

    getElectricityNotices: (status) => request(`/utilities/electricity/notices/${status ? `?status=${status}` : ''}`),
    createElectricityNotice: (data) => request('/utilities/electricity/notices/', { method: 'POST', body: JSON.stringify(data) }),
    updateElectricityNotice: (id, data) => request(`/utilities/electricity/notices/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteElectricityNotice: (id) => request(`/utilities/electricity/notices/${id}/`, { method: 'DELETE' }),

    getElectricityRequests: () => request('/utilities/electricity/requests/'),
    createElectricityRequest: (data) => request('/utilities/electricity/requests/', { method: 'POST', body: JSON.stringify(data) }),
    updateElectricityRequest: (id, data) => request(`/utilities/electricity/requests/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Traffic
  traffic: {
    getIncidents: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/traffic/incidents/${query ? `?${query}` : ''}`);
    },
    getIncident: (id) => request(`/traffic/incidents/${id}/`),
    createIncident: (data) => request('/traffic/incidents/', { method: 'POST', body: JSON.stringify(data) }),
    updateIncident: (id, data) => request(`/traffic/incidents/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteIncident: (id) => request(`/traffic/incidents/${id}/`, { method: 'DELETE' }),

    getReports: () => request('/traffic/reports/'),
    createReport: (data) => request('/traffic/reports/', { method: 'POST', body: JSON.stringify(data) }),
    updateReport: (id, data) => request(`/traffic/reports/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Property Tax
  tax: {
    getProperties: () => request('/tax/properties/'),
    getProperty: (id) => request(`/tax/properties/${id}/`),
    createProperty: (data) => request('/tax/properties/', { method: 'POST', body: JSON.stringify(data) }),

    getTaxRecords: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/tax/tax-records/${query ? `?${query}` : ''}`);
    },
    getTaxRecordDetail: (id) => request(`/tax/tax-records/${id}/`),
    createTaxRecord: (data) => request('/tax/tax-records/', { method: 'POST', body: JSON.stringify(data) }),

    processPayment: (data) => request('/tax/pay/', { method: 'POST', body: JSON.stringify(data) }),
    getPayments: () => request('/tax/payments/'),
  },

  // Dashboards
  dashboard: {
    getCitizenStats: () => request('/dashboard/citizen/'),
    getAdminStats: () => request('/dashboard/admin/'),
    getDepartmentStats: () => request('/dashboard/department/'),
    getTrafficStats: () => request('/dashboard/traffic/'),
  },
};

export default api;
