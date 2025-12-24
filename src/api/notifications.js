import http from './http'

/**
 * Notifications API
 */
export const notificationsAPI = {
  list: async (params = {}) => {
    const response = await http.get('/notifications/', { params })
    return response.data
  },

  get: async (id) => {
    const response = await http.get(`/notifications/${id}/`)
    return response.data
  },

  markAllRead: async () => {
    const response = await http.patch('/notifications/mark-all-read/', {})
    return response.data
  },

  markAsRead: async (id) => {
    const response = await http.patch(`/notifications/${id}/mark-as-read/`)
    return response.data
  }
}
