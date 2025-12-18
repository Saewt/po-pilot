import http from './http'

/**
 * Current user API
 * GET /api/me/ - Get current authenticated user information
 */
export const meAPI = {
  get: async () => {
    const response = await http.get('/me/')
    return response.data
  },
}


