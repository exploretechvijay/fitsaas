import api from './axios.js';

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Super Admin
export const superAdminApi = {
  listGyms: (params) => api.get('/super-admin/gyms', { params }),
  createGym: (data) => api.post('/super-admin/gyms', data),
  getGym: (id) => api.get(`/super-admin/gyms/${id}`),
  updateGym: (id, data) => api.put(`/super-admin/gyms/${id}`, data),
  toggleStatus: (id, status) => api.patch(`/super-admin/gyms/${id}/status`, { status }),
  getGymStats: (id) => api.get(`/super-admin/gyms/${id}/stats`),
  getPlatformStats: () => api.get('/super-admin/platform-stats'),
};

// Gym
export const gymApi = {
  getProfile: () => api.get('/gym/profile'),
  updateProfile: (data) => api.put('/gym/profile', data),
  getStats: () => api.get('/gym/stats'),
};

// Members
export const membersApi = {
  list: (params) => api.get('/members', { params }),
  create: (data) => api.post('/members', data),
  get: (id) => api.get(`/members/${id}`),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
  getMetrics: (id) => api.get(`/members/${id}/metrics`),
  addMetric: (id, data) => api.post(`/members/${id}/metrics`, data),
};

// Subscriptions
export const subscriptionsApi = {
  listPlans: (params) => api.get('/subscriptions/plans', { params }),
  createPlan: (data) => api.post('/subscriptions/plans', data),
  getPlan: (id) => api.get(`/subscriptions/plans/${id}`),
  updatePlan: (id, data) => api.put(`/subscriptions/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/subscriptions/plans/${id}`),
  assign: (data) => api.post('/subscriptions/assign', data),
  renew: (id, data) => api.post(`/subscriptions/${id}/renew`, data),
  pause: (id, data) => api.post(`/subscriptions/${id}/pause`, data),
  resume: (id) => api.post(`/subscriptions/${id}/resume`),
  cancel: (id, data) => api.post(`/subscriptions/${id}/cancel`, data),
  getExpiring: (days) => api.get('/subscriptions/expiring', { params: { days } }),
  recordPayment: (data) => api.post('/subscriptions/payments', data),
  getPayments: (params) => api.get('/subscriptions/payments', { params }),
  updatePayment: (id, data) => api.put(`/subscriptions/payments/${id}`, data),
};

// Workouts
export const workoutsApi = {
  listPlans: (params) => api.get('/workout-plans', { params }),
  createPlan: (data) => api.post('/workout-plans', data),
  getPlan: (id) => api.get(`/workout-plans/${id}`),
  updatePlan: (id, data) => api.put(`/workout-plans/${id}`, data),
  deletePlan: (id) => api.delete(`/workout-plans/${id}`),
  assign: (data) => api.post('/workout-plans/assign', data),
  getMemberAssignments: (memberId) => api.get(`/workout-plans/member/${memberId}/assignments`),
};

// Diet
export const dietApi = {
  generate: (data) => api.post('/diet-plans/generate', data),
  save: (data) => api.post('/diet-plans/save', data),
  getMemberPlans: (memberId) => api.get(`/diet-plans/member/${memberId}`),
  get: (id) => api.get(`/diet-plans/${id}`),
  update: (id, data) => api.put(`/diet-plans/${id}`, data),
  delete: (id) => api.delete(`/diet-plans/${id}`),
};

// Staff
export const staffApi = {
  list: (params) => api.get('/staff', { params }),
  create: (data) => api.post('/staff', data),
  get: (id) => api.get(`/staff/${id}`),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
  assignMembers: (id, memberIds) => api.post(`/staff/${id}/assign-members`, { member_ids: memberIds }),
  getTrainerMembers: (id) => api.get(`/staff/${id}/members`),
};

// Announcements
export const announcementsApi = {
  list: (params) => api.get('/announcements', { params }),
  create: (data) => api.post('/announcements', data),
  get: (id) => api.get(`/announcements/${id}`),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// Leads
export const leadsApi = {
  list: (params) => api.get('/leads', { params }),
  create: (data) => api.post('/leads', data),
  bulkCreate: (leads) => api.post('/leads/bulk', { leads }),
  get: (id) => api.get(`/leads/${id}`),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  getStats: () => api.get('/leads/stats'),
  addActivity: (id, data) => api.post(`/leads/${id}/activities`, data),
  getActivities: (id) => api.get(`/leads/${id}/activities`),
  convert: (id) => api.post(`/leads/${id}/convert`),
};

// Reports
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  members: (params) => api.get('/reports/members', { params }),
  revenue: (params) => api.get('/reports/revenue', { params }),
  subscriptions: () => api.get('/reports/subscriptions'),
};
