import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import StudentDashboard from './dashboards/StudentDashboard'
import InstructorDashboard from './dashboards/InstructorDashboard'
import DepartmentHeadDashboard from './dashboards/DepartmentHeadDashboard'
import './Dashboard.css'

const Dashboard = () => {
  const { user, loading, logout } = useAuth()
  const nav = useNavigate()

  const goLogin = () => nav('/login', { replace: true })

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="dashboard-error">
        <div>Unable to load user data</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={() => { logout?.(); goLogin() }}>Logout</button>
          <button onClick={goLogin}>Go to login</button>
        </div>
      </div>
    )
  }

  switch (user.role) {
    case 'STUDENT':
      return <StudentDashboard user={user} />
    case 'INSTRUCTOR':
      return <InstructorDashboard user={user} />
    case 'DEPARTMENT_HEAD':
      return <DepartmentHeadDashboard user={user} />
    default:
      return (
        <div className="dashboard-error">
          <div>Unknown user role: {String(user.role)}</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => { logout?.(); goLogin() }}>Logout</button>
            <button onClick={goLogin}>Go to login</button>
          </div>
        </div>
      )
  }
}

export default Dashboard
