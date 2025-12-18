import http from './http'

/**
 * Grades API
 * Based on /api/grades/ endpoints
 */
export const gradesAPI = {
  list: async (params = {}) => {
    const response = await http.get('/grades/', { params })
    return response.data
  },

  get: async (id) => {
    const response = await http.get(`/grades/${id}/`)
    return response.data
  },

  create: async (data) => {
    const response = await http.post('/grades/', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await http.put(`/grades/${id}/`, data)
    return response.data
  },

  patch: async (id, data) => {
    const response = await http.patch(`/grades/${id}/`, data)
    return response.data
  },

  delete: async (id) => {
    await http.delete(`/grades/${id}/`)
  },
}
