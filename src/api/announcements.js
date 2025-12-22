import http from './http'

export const announcementsAPI = {
    list: async (params = {}) => {
        const response = await http.get('/department-announcements/', { params })
        return response.data
    },

    create: async (data) => {
        const response = await http.post('/department-announcements/', data)
        return response.data
    },

    get: async (id) => {
        const response = await http.get(`/department-announcements/${id}/`)
        return response.data
    },

    update: async (id, data) => {
        const response = await http.patch(`/department-announcements/${id}/`, data)
        return response.data
    },

    delete: async (id) => {
        const response = await http.delete(`/department-announcements/${id}/`)
        return response.data
    }
}
