import http from './http'

/**
 * Program Outcomes API
 * Based on /api/program-outcomes/ endpoints
 */
export const programOutcomesAPI = {
  list: async (params = {}) => {
    const response = await http.get('/program-outcomes/', { params })
    return response.data
  },

  get: async (id) => {
    const response = await http.get(`/program-outcomes/${id}/`)
    return response.data
  },

  create: async (data) => {
    const response = await http.post('/program-outcomes/', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await http.put(`/program-outcomes/${id}/`, data)
    return response.data
  },

  patch: async (id, data) => {
    const response = await http.patch(`/program-outcomes/${id}/`, data)
    return response.data
  },

  delete: async (id) => {
    await http.delete(`/program-outcomes/${id}/`)
  },
}


