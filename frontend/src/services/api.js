// Target Render backend or Localhost
const RENDER_BACKEND_URL = 'https://sih2026-17zc.onrender.com';

export function getActiveBackend() {
  return localStorage.getItem('aicte_backend_mode') || (import.meta.env.DEV ? 'local' : 'render'); // default to live render or 'local'
}

export function setActiveBackend(mode) {
  localStorage.setItem('aicte_backend_mode', mode);
}

export function getApiBaseUrl() {
  const mode = getActiveBackend();
  if (mode === 'local') {
    return '/api'; // routed via Vite dev proxy to http://localhost:4000
  }
  // If explicitly configured in VITE_API_URL, use that, else use the deployed Render URL
  const customUrl = import.meta.env.VITE_API_URL;
  const baseUrl = customUrl || RENDER_BACKEND_URL;
  return `${baseUrl.replace(/\/+$/, '')}/api`;
}

export function getAuthToken() {
  return localStorage.getItem('aicte_token');
}

export function getCurrentUser() {
  const user = localStorage.getItem('aicte_user');
  try { return user ? JSON.parse(user) : null; } catch { clearAuth(); return null; }
}

export function setAuth(token, user) {
  localStorage.setItem('aicte_token', token);
  localStorage.setItem('aicte_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('aicte_token');
  localStorage.removeItem('aicte_user');
}

export function buildQueryString(params = {}) {
  const filtered = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      filtered[key] = value;
    }
  }
  const q = new URLSearchParams(filtered).toString();
  return q ? '?' + q : '';
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const base = getApiBaseUrl();
  const response = await fetch(`${base}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || `HTTP ${response.status}: Failed to perform request`;
    throw new Error(errorMsg);
  }

  return data;
}

export function getFullApiUrl(endpoint) {
  return `${getApiBaseUrl()}${endpoint}`;
}

// API Methods
export const api = {
  // Auth
  login: (username, password) => 
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  getMe: () => apiRequest('/auth/me'),

  // Dashboard & Metrics
  getDashboardSummary: (params = {}) => {
    return apiRequest(`/dashboard/summary${buildQueryString(params)}`);
  },
  getWorkload: () => apiRequest('/dashboard/workload'),
  getAgeing: () => apiRequest('/dashboard/ageing'),
  getTopOverdue: (limit = 10) => apiRequest(`/dashboard/top-overdue?limit=${limit}`),
  getMonthlyDisposal: (year = 2026) => apiRequest(`/dashboard/monthly-disposal?year=${year}`),
  getRegionSummary: () => apiRequest('/dashboard/region-summary'),

  // Cases
  getCases: (params = {}) => {
    return apiRequest(`/cases${buildQueryString(params)}`);
  },
  getCase: (id) => apiRequest(`/cases/${encodeURIComponent(id)}`),
  createCase: (caseData) => apiRequest('/cases', {
    method: 'POST',
    body: JSON.stringify(caseData)
  }),
  updateStatus: (id, payload) => apiRequest(`/cases/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  addRemark: (id, payload) => apiRequest(`/cases/${encodeURIComponent(id)}/remarks`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  transferCase: (id, payload) => apiRequest(`/cases/${encodeURIComponent(id)}/transfer`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  assignOfficer: (id, payload) => apiRequest(`/cases/${encodeURIComponent(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  escalateCase: (id, payload) => apiRequest(`/cases/${encodeURIComponent(id)}/escalate`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  disposeCase: (id, payload) => apiRequest(`/cases/${encodeURIComponent(id)}/dispose`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  reopenCase: (id, payload) => apiRequest(`/cases/${encodeURIComponent(id)}/reopen`, {method:'POST',body:JSON.stringify(payload)}),
  // AI & Matching
  suggest: (payload) => apiRequest('/suggest', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  
  // Institutions
  getInstitutions: (params = {}) => {
    return apiRequest(`/institutions${buildQueryString(params)}`);
  },
  getInstitution: (id) => apiRequest(`/institutions/${id}`),
  getInstitutionCases: (id, params = {}) => {
    return apiRequest(`/institutions/${id}/cases${buildQueryString(params)}`);
  },
  getInstitutionOverlaps: (id) => apiRequest(`/institutions/${id}/overlaps`),

  // Overlaps
  getOverlaps: (params = {}) => {
    return apiRequest(`/overlaps${buildQueryString(params)}`);
  },
  getOverlap: (id) => apiRequest(`/overlaps/${id}`),
  linkOverlap: (id, payload) => apiRequest(`/overlaps/${id}/link`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  notRelatedOverlap: (id, payload) => apiRequest(`/overlaps/${id}/not-related`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Reference lists
  getBureaus: () => apiRequest('/bureaus'),
  getCategories: () => apiRequest('/categories'),
  getSlaConfig: () => apiRequest('/sla-config'),
  getUsers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/users${q ? '?' + q : ''}`);
  },

  // Reports
  getReport: (type, format = 'json', params = {}) => {
    const q = new URLSearchParams({ format, ...params }).toString();
    return apiRequest(`/reports/${type}?${q}`);
  }
};
