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
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadNotifications()
            handleMarkAllRead()
        } else {
            setExpanded(false)
        }
    }, [isOpen])

    const loadNotifications = async () => {
        try {
            setLoading(true)
            const response = await notificationsAPI.list()
            const data = response.results || (Array.isArray(response) ? response : [])
            setNotifications(data)
        } catch (err) {
            console.error('Failed to load notifications:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        
        try {
            await markAllAsReadContext()
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
            console.error('Failed to mark item as read:', err)
        }
    }

    if (!isOpen) return null

    const displayedNotifications = expanded ? notifications : notifications.slice(0, 5)

    return (
        <div className="notifications-overlay" onClick={onClose}>
            <div
                className="notifications-popover"
                onClick={e => e.stopPropagation()}
            >
                <div className="notifications-header">
                    <h3 className="notifications-title">
                        {user.role === 'INSTRUCTOR' ? 'Notifications & Announcements' : 'Notifications'}
                    </h3>
                </div>

                <div className="notifications-list" style={{ overflowY: expanded ? 'auto' : 'hidden', maxHeight: expanded ? '60vh' : 'auto' }}>
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
                        <>
                            <div>
                                {displayedNotifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                                    >
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
                            
                            {!expanded && notifications.length > 5 && (
                                <button 
                                    className="btn-text"
                                    style={{ width: '100%', padding: '10px', textAlign: 'center', color: 'var(--color-primary)', borderTop: '1px solid var(--color-border)' }}
                                    onClick={() => setExpanded(true)}
                                >
                                    See all notifications
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NotificationsModal
