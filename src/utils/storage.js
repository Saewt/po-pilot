/**
 * localStorage utilities for token management
 * Uses localStorage for persistence across page refreshes
 */

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

export const storage = {
  getAccessToken: () => {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  setAccessToken: (token) => {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  },

  getRefreshToken: () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  setRefreshToken: (token) => {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  },

  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },

  setTokens: (accessToken, refreshToken) => {
    storage.setAccessToken(accessToken)
    storage.setRefreshToken(refreshToken)
  }
}



