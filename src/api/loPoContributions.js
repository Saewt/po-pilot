import http from './http'

/**
 * LO-PO Contributions API
 * Based on /api/lo-po-contributions/ endpoints
 */
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

  approve: async (id) => {
    const response = await http.post(`/lo-po-contributions/${id}/approve/`, {})
    return response.data
  },

  reject: async (id) => {
    const response = await http.post(`/lo-po-contributions/${id}/reject/`, {})
    return response.data
  },
}


