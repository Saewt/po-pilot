import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import './AppLayout.css'

/**
 * AppLayout Component
 * Shared layout with sidebar and header
 */
const AppLayout = ({ children }) => {
  const { user, logout } = useAuth()

  if (!user) return null

  const getHeaderInfo = () => {
    if (user.role === 'STUDENT') {
      return (
        <div className="header-info">
          <span className="header-name">{user.first_name} {user.last_name}</span>
          {user.student_id && (
            <span className="header-badge">ID: {user.student_id}</span>
          )}
          {user.department_name && (
            <span className="header-department">{user.department_name}</span>
          )}
          <button
            onClick={logout}
            className="btn btn-danger header-logout"
          >
            Logout
          </button>
        </div>
      )
    } else {
      return (
        <div className="header-info">
          <span className="header-name">{user.first_name} {user.last_name}</span>
          {user.department_name && (
            <span className="header-department">{user.department_name}</span>
          )}
          <button
            onClick={logout}
            className="btn btn-danger header-logout"
          >
            Logout
          </button>
        </div>
      )
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <header className="app-header">
          <div className="header-container">
            <h1 className="header-title">PO Pilot</h1>
            {getHeaderInfo()}
          </div>
        </header>
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
