const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

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
    if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error(`Unable to connect to Smart City API server at ${API_BASE_URL}. If your cloud server was idle, please allow 30-50 seconds for it to wake up and try again.`);
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
    getProfile: () => request('/auth/profile/'),
    updateProfile: (data) => request('/auth/profile/', { method: 'PATCH', body: JSON.stringify(data) }),
    getCitizens: () => request('/auth/citizens/'),
    getStaff: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/auth/staff/${query ? `?${query}` : ''}`);
    },
    getUsers: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/auth/users/${query ? `?${query}` : ''}`);
    },
    updateUser: (id, data) => request(`/auth/users/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
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
    support: (id) => request(`/complaints/${id}/support/`, { method: 'POST' }),
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
    getDepartmentStats: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/dashboard/department/${query ? `?${query}` : ''}`);
    },
    getAreaHeadStats: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/dashboard/area-head/${query ? `?${query}` : ''}`);
    },
    getTrafficStats: () => request('/dashboard/traffic/'),
  },
};

export default api;
