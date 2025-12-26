import http from './http'

export const loPoContributionsAPI = {
  list: async (params = {}) => {
    const response = await http.get('/lo-po-contributions/', { params })
    return response.data
  },

  get: async (id) => {
    const response = await http.get(`/lo-po-contributions/${id}/`)
    return response.data
  },

  create: async (data) => {
    const response = await http.post('/lo-po-contributions/', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await http.put(`/lo-po-contributions/${id}/`, data)
    return response.data
  },

  patch: async (id, data) => {
    const response = await http.patch(`/lo-po-contributions/${id}/`, data)
    return response.data
  },

  delete: async (id) => {
    await http.delete(`/lo-po-contributions/${id}/`)
  },

  approve: async (id, reason = '') => {
    const response = await http.post(`/lo-po-contributions/${id}/approval_action/`, { 
      action: 'approve',
      reason: reason 
    })
    return response.data
  },

  decline: async (id, reason) => {
    const response = await http.post(`/lo-po-contributions/${id}/approval_action/`, { 
      action: 'decline',
      reason: reason
    })
    return response.data
  },

  getDeclined: async (params = {}) => {
    const response = await http.get('/lo-po-contributions/declined/', { params })
    return response.data
  },

  resetToPending: async (id) => {
    const response = await http.post(`/lo-po-contributions/${id}/approval_action/`, { action: 'reset_to_pending' })
    return response.data
  },
}
