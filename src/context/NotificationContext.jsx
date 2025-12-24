import React, { createContext, useContext, useState, useEffect } from 'react'
import { notificationsAPI } from '../api/notifications'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = async () => {
    if (!user) return

    try {
      const data = await notificationsAPI.list({ is_read: false })
      if (Array.isArray(data)) {
        setUnreadCount(data.length)
      } else if (data && typeof data.count === 'number') {
        setUnreadCount(data.count)
      } else if (data && Array.isArray(data.results)) {
        setUnreadCount(data.results.length)
      }
    } catch (error) {
      console.error('Failed to fetch unread notifications count:', error)
    }
  }

  const markAsRead = async (id) => {
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      await notificationsAPI.markAsRead(id)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      fetchUnreadCount()
    }
  }

  const markAllAsRead = async () => {
    setUnreadCount(0)
    try {
      await notificationsAPI.markAllRead()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      fetchUnreadCount()
    }
  }

  useEffect(() => {
    if (user) {
      fetchUnreadCount()
    } else {
      setUnreadCount(0)
    }
  }, [user])

  const value = {
    unreadCount,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
