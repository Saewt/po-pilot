import axios from 'axios'
import { storage } from '../utils/storage'

/**
 * Axios instance configured for the Django backend
 * - Uses relative paths (/api/...) for deploy-ready setup
 * - Automatically adds Bearer token to requests
 * - Handles token refresh on 401 errors
 */
const apiClient = axios.create({
  baseURL: '/api', // Relative path - works in dev (via proxy) and prod (same domain)
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: Add access token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = storage.getAccessToken()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor: Handle token refresh on 401
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = storage.getRefreshToken()

      if (!refreshToken) {
        // No refresh token, clear everything and redirect to login
        storage.clearTokens()
        processQueue(error, null)
        isRefreshing = false
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        // Try to refresh the token
        const response = await axios.post('/api/auth/refresh/', {
          refresh: refreshToken,
        })

        const { access } = response.data
        storage.setAccessToken(access)

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`

        // Process queued requests
        processQueue(null, access)
        isRefreshing = false

        // Retry the original request
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        storage.clearTokens()
        processQueue(refreshError, null)
        isRefreshing = false
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient



