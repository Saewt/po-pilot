import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * RequireRole Component
 * Protects routes that require specific role(s)
 * Redirects to /app if user doesn't have required role
 */
const RequireRole = ({ children, roles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const userRole = user.role
  const allowedRoles = Array.isArray(roles) ? roles : [roles]

  if (!allowedRoles.includes(userRole)) {
    // Redirect to role-specific home
    if (userRole === 'STUDENT') {
      return <Navigate to="/app/student" replace />
    } else if (userRole === 'INSTRUCTOR') {
      return <Navigate to="/app/instructor" replace />
    } else if (userRole === 'DEPARTMENT_HEAD') {
      return <Navigate to="/app/dept" replace />
    }
    return <Navigate to="/app" replace />
  }

  return children
}

export default RequireRole


