import http from './http'

/**
 * Users API
 * Based on /api/users/ endpoints
 */
export const usersAPI = {
    list: async (params = {}) => {
        const response = await http.get('/users/', { params })
        return response.data
    },

    get: async (id) => {
        const response = await http.get(`/users/${id}/`)
        return response.data
    },

    create: async (data) => {
        const response = await http.post('/users/', data)
        return response.data
    },
}
