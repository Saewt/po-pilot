import http from './http'

/**
 * Course Instances API
 * Based on /api/course-instances/ endpoints
 */
export const coursesAPI = {
  list: async (params = {}) => {
    const response = await http.get('/course-instances/', { params })
    return response.data
  },

  get: async (id) => {
    const response = await http.get(`/course-instances/${id}/`)
    return response.data
  },

  create: async (data) => {
    const response = await http.post('/course-instances/', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await http.put(`/course-instances/${id}/`, data)
    return response.data
  },

  patch: async (id, data) => {
    const response = await http.patch(`/course-instances/${id}/`, data)
    return response.data
  },

  delete: async (id) => {
    await http.delete(`/course-instances/${id}/`)
  },

  enroll_students: async (id, data) => {
    const response = await http.post(`/course-instances/${id}/enroll_students/`, data)
    return response.data
  },

  templates: {
    list: async (params = {}) => {
      const response = await http.get('/course-templates/', { params })
      return response.data
    },

    create: async (data) => {
      const response = await http.post('/course-templates/', data)
      return response.data
    },

    get: async (id) => {
      const response = await http.get(`/course-templates/${id}/`)
      return response.data
    },

    update: async (id, data) => {
      const response = await http.put(`/course-templates/${id}/`, data)
      return response.data
    },

    patch: async (id, data) => {
      const response = await http.patch(`/course-templates/${id}/`, data)
      return response.data
    },

    delete: async (id) => {
      await http.delete(`/course-templates/${id}/`)
    },
  },
}
