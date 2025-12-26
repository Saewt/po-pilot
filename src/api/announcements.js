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
        const response = await http.put(`/department-announcements/${id}/`, data)
        return response.data
    },

    patch: async (id, data) => {
        const response = await http.patch(`/department-announcements/${id}/`, data)
        return response.data
    },

    delete: async (id) => {
        await http.delete(`/department-announcements/${id}/`)
        return true
    },

    markAsRead: async (id) => {
        const response = await http.patch(`/department-announcements/${id}/mark-as-read/`)
        return response.data
    },

    markAllRead: async () => {
        const response = await http.patch(`/department-announcements/mark-all-read/`)
        return response.data
    },

    getUnreadCount: async () => {
        const response = await http.get(`/department-announcements/unread-count/`)
        return response.data
    },

    listCourseAnnouncements: async (params = {}) => {
        const response = await http.get('/announcements/', { params })
        return response.data
    },

    createCourseAnnouncement: async (data) => {
        const response = await http.post('/announcements/', data)
        return response.data
    },

    updateCourseAnnouncement: async (id, data) => {
        const response = await http.put(`/announcements/${id}/`, data)
        return response.data
    },

    patchCourseAnnouncement: async (id, data) => {
        const response = await http.patch(`/announcements/${id}/`, data)
        return response.data
    },

    deleteCourseAnnouncement: async (id) => {
        await http.delete(`/announcements/${id}/`)
        return true
    },

    markCourseAnnouncementAsRead: async (id) => {
        const response = await http.patch(`/announcements/${id}/mark-as-read/`)
        return response.data
    },

    markAllCourseAnnouncementsRead: async () => {
        const response = await http.patch(`/announcements/mark-all-read/`)
        return response.data
    },

    getCourseAnnouncementUnreadCount: async () => {
        const response = await http.get(`/announcements/unread-count/`)
        return response.data
    }
}
