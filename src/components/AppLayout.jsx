import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import AnnouncementsModal from './AnnouncementsModal'
import NotificationsModal from './NotificationsModal'
import './AppLayout.css'

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotification()
  const location = useLocation()
  
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const getPageTitle = () => {
    const path = location.pathname
    
    if (path.includes('/app/dept/instructors')) return 'Instructors'
    if (path.includes('/app/dept/students')) return 'Students'
    if (path.includes('/app/dept/approvals')) return 'Approvals'
    if (path.includes('/app/dept/po-builder')) return 'PO Builder'
    if (path === '/app/dept' || path.startsWith('/app/dept/')) return 'Department Courses'
    
    if (path.includes('/app/instructor/courses')) return 'My Courses'
    if (path.includes('/app/instructor/grades')) return 'Grades'
    if (path === '/app/instructor') return 'Instructor Dashboard'
    
    if (path === '/app/student') return 'My Courses'
    
    return 'PO Pilot'
  }

  const getInitials = () => {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
  }

  const getRoleLabel = () => {
    if (user.role === 'DEPARTMENT_HEAD') return 'Dept. Head'
    return user.role.charAt(0) + user.role.slice(1).toLowerCase()
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <header className="app-header">
          <div className="header-container">
            <h1 className="header-title">{getPageTitle()}</h1>
            
            <div className="header-actions">
              {user.role === 'DEPARTMENT_HEAD' && (
                <button 
                  className="icon-btn" 
                  onClick={() => setShowAnnouncements(true)}
                  title="Manage Announcements"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>
              )}

              <button 
                className="icon-btn" 
                onClick={() => setShowNotifications(true)}
                title="Notifications"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && <span className="icon-badge-dot" />}
              </button>

              <div className="user-profile-container" ref={profileRef}>
                <div 
                  className="user-profile-pill" 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <div className="profile-info">
                    <span className="profile-name">{user.first_name} {user.last_name}</span>
                    <span className="profile-role">{getRoleLabel()}</span>
                  </div>
                  <div className="profile-avatar">
                    {getInitials()}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#888' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>

                {isProfileOpen && (
                  <div className="profile-dropdown">
                    {user.department_name && (
                      <div className="dropdown-header">
                        <div className="dropdown-dept-label">Department</div>
                        <div className="dropdown-dept-value">{user.department_name}</div>
                      </div>
                    )}
                    
                    {user.student_id && (
                      <div className="dropdown-header">
                        <div className="dropdown-dept-label">Student ID</div>
                        <div className="dropdown-dept-value">{user.student_id}</div>
                      </div>
                    )}

                    <div style={{ padding: '0.5rem' }}>
                      <button 
                        className="dropdown-item danger"
                        onClick={logout}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="app-main">
          {children}
        </main>
      </div>

      <AnnouncementsModal
        isOpen={showAnnouncements}
        onClose={() => setShowAnnouncements(false)}
      />

      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  )
}

export default AppLayout
