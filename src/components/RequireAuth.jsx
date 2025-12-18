import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * RequireAuth Component
 * Protects routes that require authentication
 * Redirects to /login if user is not authenticated
 */
const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    // Show loading state while checking auth
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

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />
  }

  return children
}

export default RequireAuth



