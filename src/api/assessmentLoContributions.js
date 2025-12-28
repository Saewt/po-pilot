import http from './http'

export const assessmentLoContributionsAPI = {
  list: async (params = {}) => {
    const response = await http.get('/assessment-lo-contributions/', { params })
    return response.data
  },

  get: async (id) => {
    const response = await http.get(`/assessment-lo-contributions/${id}/`)
    return response.data
  },

  create: async (data) => {
    const response = await http.post('/assessment-lo-contributions/', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await http.put(`/assessment-lo-contributions/${id}/`, data)
    return response.data
  },

  patch: async (id, data) => {
    const response = await http.patch(`/assessment-lo-contributions/${id}/`, data)
    return response.data
  },

  delete: async (id) => {
    await http.delete(`/assessment-lo-contributions/${id}/`)
  },
}
