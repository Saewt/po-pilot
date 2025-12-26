import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { coursesAPI } from '../../api/courses'
import { useMultipleAsync } from '../../hooks/useAsync'
import StatusBlock from '../../components/StatusBlock'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import OutcomeProgressBar from '../../components/OutcomeProgressBar' // New Simple Component
import '../Dashboard.css'

const StudentDashboard = ({ user }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const { data, loading, error, refetch } = useMultipleAsync(
    {
      courses: () => coursesAPI.listInstances(),
    },
    [],
    true
  )

  // --- MOCK DATA (Until backend connects) ---
  const outcomesData = [
    { code: 'PO-1: Engineering Knowledge', score: 88 },
    { code: 'PO-2: Problem Analysis', score: 74 },
    { code: 'PO-3: Design/Development', score: 95 },
    { code: 'PO-4: Modern Tool Usage', score: 62 },
    { code: 'PO-5: Communication', score: 45 },
    { code: 'PO-6: Project Management', score: 81 },
  ];

  const stats = [
    { label: 'GPA (Est.)', value: '3.42', trend: '▲ 0.12', color: '#10b981', bg: '#ecfdf5' },
    { label: 'Credits', value: '18', trend: 'Current', color: '#6366f1', bg: '#eef2ff' },
    { label: 'At Risk', value: '0', trend: 'None', color: '#f59e0b', bg: '#fffbeb' }
  ];

  const normalizeList = (value) => {
    const v = value?.data ?? value
    if (Array.isArray(v)) return v
    if (Array.isArray(v?.results)) return v.results
    return []
  }

  const courses = normalizeList(data?.courses)
  const activeCourses = courses.filter((c) => c?.is_active !== false)

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  if (loading) return <div style={{ padding: '2rem' }}><LoadingSkeleton lines={4} /></div>

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <div className="user-info">
          <div className="user-details">
            <div className="user-name">{user?.first_name} {user?.last_name}</div>
            <div className="user-role">Student ID: {user?.student_id || '-'}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-content">

        {/* STATS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: `5px solid ${stat.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>{stat.label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '8px', gap: '8px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>{stat.value}</span>
                <span style={{ fontSize: '0.85rem', color: stat.color, fontWeight: '500', padding: '2px 8px', borderRadius: '12px', background: stat.bg }}>{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* OUTCOME PROGRESS BARS */}
        <div className="dashboard-card">
          <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#1e293b' }}>Program Outcome Status</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
            {/* Left Column */}
            <div>
              {outcomesData.slice(0, 3).map((item, idx) => (
                <OutcomeProgressBar key={idx} label={item.code} score={item.score} />
              ))}
            </div>
            {/* Right Column */}
            <div>
              {outcomesData.slice(3).map((item, idx) => (
                <OutcomeProgressBar key={idx} label={item.code} score={item.score} />
              ))}
            </div>
          </div>
        </div>

        {/* COURSE LIST */}
        <div className="dashboard-card">
          <h2>My Courses</h2>
          {error ? (
            <StatusBlock type="error" message="Failed to load courses." onRetry={refetch} />
          ) : activeCourses.length === 0 ? (
            <StatusBlock type="empty" message="No active courses found." />
          ) : (
            <div className="courses-list">
              {activeCourses.map((course) => (
                <div
                  key={course.id}
                  className="course-item"
                  onClick={() => navigate(`/app/student/${course.id}`)}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid #e2e8f0' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div className="course-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ color: '#334155' }}>
                      {course.get_full_code || course.course_template?.get_full_code || 'CODE'}
                    </h3>
                    <span className="course-semester">{course.semester} {course.year}</span>
                  </div>
                  <div className="course-details">
                    <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>
                      {course.course_template?.name || 'Course Name'}
                    </p>
                    <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                      Instructor: {course.instructor_name || 'TBA'}
                    </p>
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600' }}>
                      View Details →
                    </div>
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

export default StudentDashboard
