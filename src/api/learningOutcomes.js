import http from './http'

/**
 * Learning Outcomes API
 * Based on /api/learning-outcomes/ endpoints
 */
export const learningOutcomesAPI = {
  list: async (params = {}) => {
    const response = await http.get('/learning-outcomes/', { params })
    return response.data
  },

  get: async (id) => {
    const response = await http.get(`/learning-outcomes/${id}/`)
    return response.data
  },

  create: async (data) => {
    const response = await http.post('/learning-outcomes/', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await http.put(`/learning-outcomes/${id}/`, data)
    return response.data
  },

  patch: async (id, data) => {
    const response = await http.patch(`/learning-outcomes/${id}/`, data)
    return response.data
  },

  delete: async (id) => {
    await http.delete(`/learning-outcomes/${id}/`)
  },
}


