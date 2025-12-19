import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

/**
 * Sidebar Component
 * Role-based navigation menu
 */
const Sidebar = () => {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return null

  const role = user.role

  const getNavItems = () => {
    if (role === 'STUDENT') {
      return [
        { path: '/app/student', label: 'Courses' },
      ]
    } else if (role === 'INSTRUCTOR') {
      return [
        { path: '/app/instructor', label: 'Home' },
        { path: '/app/instructor/courses', label: 'Courses' },
        { path: '/app/instructor/grades', label: 'Grades' },
      ]
    } else if (role === 'DEPARTMENT_HEAD') {
      return [
        { path: '/app/dept', label: 'Courses' },
        { path: '/app/dept/instructors', label: 'Instructors' },
        { path: '/app/dept/students', label: 'Students' },
        { path: '/app/dept/approvals', label: 'Approvals' },
        { path: '/app/dept/po-builder', label: 'PO Builder' },
      ]
    }
    return []
  }

  const navItems = getNavItems()

  const isActive = (path) => {
    // Exact match
    if (location.pathname === path) {
      return true
    }
    // For "Home" paths, only match exactly - don't match sub-pages
    if (path.endsWith('/student') || path.endsWith('/instructor') || path.endsWith('/dept')) {
      return location.pathname === path
    }
    // For other paths, match if it starts with the path
    return location.pathname.startsWith(path + '/')
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">PO Pilot</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default Sidebar
