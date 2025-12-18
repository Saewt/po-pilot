import axios from 'axios'
import http from './http'
import { storage } from '../utils/storage'

/**
 * Authentication API functions
 * All endpoints use relative paths (/api/...) for deploy-ready setup
 */

export const authAPI = {
  /**
   * Login with email and password
   * Returns { access, refresh } tokens
   * Uses plain axios to avoid interceptor issues
   */
  login: async (email, password) => {
    try {
      // Use plain axios for login to avoid interceptor adding auth headers
      const response = await axios.post('/api/auth/login/', {
        email,
        password,
      })
      console.log('Login response:', response.data)
      // The response should contain access and refresh tokens
      const { access, refresh } = response.data
      if (access && refresh) {
        storage.setTokens(access, refresh)
        return response.data
      } else {
        console.error('Login response missing tokens:', response.data)
        throw new Error('Invalid login response: missing tokens')
      }
    } catch (err) {
      console.error('Login API error:', err)
      console.error('Login error response:', err.response?.data)
      throw err
    }
  },

  /**
   * Register a new student
   * Requires: email, password, password_confirm, first_name, last_name, student_id, department
   * Uses plain axios to avoid interceptor issues
   */
  register: async (userData) => {
    try {
      // Use plain axios for register to avoid interceptor adding auth headers
      const response = await axios.post('/api/auth/register/', userData)
      console.log('Register response:', response.data)
      return response.data
    } catch (err) {
      console.error('Register API error:', err)
      console.error('Register error response:', err.response?.data)
      throw err
    }
  },

  /**
   * Logout - blacklists the refresh token
   */
  logout: async () => {
    const refreshToken = storage.getRefreshToken()
    if (refreshToken) {
      try {
        await http.post('/auth/logout/', {
          refresh: refreshToken,
        })
      } catch (error) {
        // Even if logout fails, clear local tokens
        console.error('Logout error:', error)
      }
    }
    storage.clearTokens()
  },

  /**
   * Get current authenticated user
   * Returns user object with role, department, etc.
   */
  getCurrentUser: async () => {
    const response = await http.get('/me/')
    return response.data
  },
}

