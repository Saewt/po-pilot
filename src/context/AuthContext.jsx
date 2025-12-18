import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/auth'
import { meAPI } from '../api/me'
import { storage } from '../utils/storage'

const AuthContext = createContext(null)

/**
 * AuthContext Provider
 * Manages global authentication state and provides auth methods
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Check if user is authenticated (has access token)
   */
  const isAuthenticated = () => {
    return !!storage.getAccessToken()
  }

  /**
   * Fetch current user from /api/me/
   * Called on mount and after login
   */
  const fetchUser = async () => {
    if (!isAuthenticated()) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      setError(null)
      const userData = await meAPI.get()
      console.log('Fetched user data:', userData)
      setUser(userData)
    } catch (err) {
      console.error('Failed to fetch user:', err)
      console.error('Error response:', err.response?.data)
      console.error('Error status:', err.response?.status)
      // If 401, tokens are invalid - clear them
      if (err.response?.status === 401) {
        storage.clearTokens()
        setUser(null)
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch user')
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Login function
   */
  const login = async (email, password) => {
    try {
      setError(null)
      setLoading(true)
      await authAPI.login(email, password)
      // Fetch user data after login - this will set the user state
      await fetchUser()
      return { success: true }
    } catch (err) {
      console.error('Login error:', err)
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.non_field_errors?.[0] ||
                          err.response?.data?.message ||
                          err.message ||
                          'Login failed'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Register function
   */
  const register = async (userData) => {
    try {
      setError(null)
      setLoading(true)
      console.log('Registering with data:', { ...userData, password: '***', password_confirm: '***' })
      
      const registerResponse = await authAPI.register(userData)
      console.log('Registration API response:', registerResponse)
      
      // Check if registration returned tokens (some APIs do this)
      if (registerResponse?.access && registerResponse?.refresh) {
        storage.setTokens(registerResponse.access, registerResponse.refresh)
        await fetchUser()
        return { success: true }
      }
      
      // If no tokens, try to login
      console.log('Registration successful, attempting login...')
      const loginResult = await login(userData.email, userData.password)
      if (loginResult.success) {
        return { success: true }
      } else {
        return { success: false, error: loginResult.error || 'Registration successful but login failed' }
      }
    } catch (err) {
      console.error('Registration error:', err)
      console.error('Registration error status:', err.response?.status)
      console.error('Registration error response:', err.response?.data)
      
      // Handle validation errors from Django
      let errorMessage = 'Registration failed'
      
      if (err.response?.status === 401) {
        errorMessage = 'Authentication error. Registration may require authentication or the endpoint may be misconfigured.'
      } else if (err.response?.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail
        } else if (typeof err.response.data === 'object') {
          const errors = Object.entries(err.response.data)
            .map(([key, value]) => {
              const val = Array.isArray(value) ? value.join(', ') : value
              return `${key}: ${val}`
            })
            .join('; ')
          errorMessage = errors || errorMessage
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Logout function
   */
  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      storage.clearTokens()
    }
  }

  // Fetch user on mount if token exists
  useEffect(() => {
    fetchUser()
  }, [])

  const value = {
    user,
    loading,
    error,
    isAuthenticated: isAuthenticated(),
    login,
    register,
    logout,
    fetchUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use AuthContext
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}



