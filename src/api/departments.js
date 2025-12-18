import axios from 'axios'

/**
 * Departments API functions
 */
export const departmentsAPI = {
  /**
   * Get list of all departments
   * Used for registration form dropdown
   * Uses plain axios for public access (no auth required)
   */
  list: async () => {
    try {
      const response = await axios.get('/api/departments/')
      return response.data
    } catch (err) {
      console.error('Departments API error:', err)
      throw err
    }
  },

  /**
   * Get single department by ID
   */
  get: async (id) => {
    try {
      const response = await axios.get(`/api/departments/${id}/`)
      return response.data
    } catch (err) {
      console.error('Department API error:', err)
      throw err
    }
  },
}



