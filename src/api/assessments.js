import http from './http'

/**
 * Assessments API
 * Based on /api/assessments/ endpoints
 */
export const assessmentsAPI = {
  list: async (params = {}) => {
    const response = await http.get('/assessments/', { params })
    return response.data
  },

  get: async (id) => {
    const response = await http.get(`/assessments/${id}/`)
    return response.data
  },

  create: async (data) => {
    const response = await http.post('/assessments/', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await http.put(`/assessments/${id}/`, data)
    return response.data
  },

  patch: async (id, data) => {
    const response = await http.patch(`/assessments/${id}/`, data)
    return response.data
  },

  delete: async (id) => {
    await http.delete(`/assessments/${id}/`)
  },
}


