import { useState, useEffect } from 'react'
import { notificationsAPI } from '../api/notifications'
import { announcementsAPI } from '../api/announcements'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import LoadingState from './LoadingState'
import { useToast } from '../context/ToastContext'
import './NotificationsModal.css'

const NotificationsModal = ({ isOpen, onClose }) => {
    const { user } = useAuth()
    const { addToast } = useToast()
    const { markAsRead: markAsReadContext, markAllAsRead: markAllAsReadContext } = useNotification()
    const [loading, setLoading] = useState(true)
    const [notifications, setNotifications] = useState([])

    useEffect(() => {
        if (isOpen) {
            loadNotifications()
        }
    }, [isOpen])

    const loadNotifications = async () => {
        try {
            setLoading(true)
            if (user.role === 'INSTRUCTOR') {
                const response = await announcementsAPI.list()
                const data = (response.results || []).map(item => ({
                    id: item.id,
                    title: item.title,
                    message: item.message,
                    created_at: item.created_at,
                    is_read: true 
                }))
                setNotifications(data)
            } else {
                const response = await notificationsAPI.list()
                setNotifications(response.results || [])
            }
        } catch (err) {
            console.error('Failed to load notifications:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAllRead = async () => {
        if (user.role === 'INSTRUCTOR') return

        if (notifications.every(n => n.is_read)) return

        try {
            await markAllAsReadContext()
            setNotifications(notifications.map(n => ({ ...n, is_read: true })))
            addToast('All notifications marked as read', 'success')
        } catch (err) {
            console.error('Failed to mark all read:', err)
        }
    }

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation()
        try {
            await markAsReadContext(id)
            setNotifications(notifications.map(n => 
                n.id === id ? { ...n, is_read: true } : n
            ))
        } catch (err) {
            console.error('Failed to mark notification as read:', err)
        }
    }

    if (!isOpen) return null

    const hasUnread = notifications.some(n => !n.is_read)

    return (
        <div className="notifications-overlay" onClick={onClose}>
            <div
                className="notifications-popover"
                onClick={e => e.stopPropagation()}
            >
                <div className="notifications-header">
                    <h3 className="notifications-title">
                        {user.role === 'INSTRUCTOR' ? 'Announcements' : 'Notifications'}
                    </h3>
                    {user.role !== 'INSTRUCTOR' && notifications.length > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="notifications-action"
                            disabled={!hasUnread}
                            style={{ opacity: hasUnread ? 1 : 0.5, cursor: hasUnread ? 'pointer' : 'default' }}
                        >
                            Mark all read
                        </button>
                    )}
                </div>

                <div className="notifications-list">
                    {loading ? (
                        <div style={{ padding: '20px' }}>
                            <LoadingState />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="empty-state">
                            <svg className="empty-state-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            <div>No notifications</div>
                        </div>
                    ) : (
                        <div>
                            {notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                                >
                                    {!notif.is_read && user.role !== 'INSTRUCTOR' && (
                                        <button 
                                            className="mark-read-btn"
                                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                                            title="Mark as read"
                                        >
                                            <span className="dot" />
                                        </button>
                                    )}
                                    <div className="notification-content">
                                        <div className="notification-header-row">
                                            <span className="notification-title">
                                                {notif.title}
                                            </span>
                                            <span className="notification-time">
                                                {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="notification-message">
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NotificationsModal
