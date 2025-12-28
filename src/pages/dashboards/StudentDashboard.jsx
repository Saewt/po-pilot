import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usersAPI } from '../../api/users'
import { useAsync } from '../../hooks/useAsync'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import '../../styles/pages.css'

const StudentDashboard = ({ user }) => {
  const { logout, user: authUser } = useAuth()
  const navigate = useNavigate()

  // Use user from props or from auth context
  const currentUser = user || authUser

  // Fetch dashboard data using the new API endpoint
  const { data: dashboardData, loading, error, execute: refetch } = useAsync(
    async () => {
      try {
        const result = await usersAPI.getMyDashboard()
        console.log('Dashboard data received:', result)
        return result
      } catch (err) {
        console.error('Dashboard API error:', err)
        throw err
      }
    },
    [],
    true
  )

  const data = dashboardData || {}

  // Format date for recent grades
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  // Convert GPA to letter grade for display hint
  const getLetterGrade = (gpa) => {
    const g = parseFloat(gpa)
    if (isNaN(g)) return ''
    if (g >= 3.75) return 'AA'
    if (g >= 3.25) return 'BA'
    if (g >= 2.75) return 'BB'
    if (g >= 2.25) return 'CB'
    if (g >= 1.75) return 'CC'
    if (g >= 1.25) return 'DC'
    if (g >= 0.75) return 'DD'
    return 'FF'
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />
  }

  const activeCourses = data.active_course_list || []
  const recentGrades = data.recent_grades || []
  console.log('Recent grades data:', recentGrades)

  // Assessment progress
  const totalAssessments = data.total_assessments || 0
  const gradedAssessments = data.graded_assessments || 0
  const pendingAssessments = data.pending_assessments || 0
  const assessmentProgress = totalAssessments > 0 ? (gradedAssessments / totalAssessments) * 100 : 0

  // GPA values from API
  const currentGpa = parseFloat(data.current_gpa)
  const officialGpa = parseFloat(data.official_gpa)
  const earnedCredits = data.earned_credits || 0
  const activeCredits = data.active_credits || 0

  return (
    <div className="page-container">

      {/* Welcome Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: '#1e293b' }}>
          Welcome, {data.student_name?.split(' ')[0] || currentUser?.first_name || 'Student'}
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
          {data.department_name || 'Department'} • Class of {data.class_year || '—'}
        </p>
      </div>

      {/* Top Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Current GPA Card */}
        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#10b981', margin: '0 0 0.25rem 0', fontWeight: 700 }}>
            {!isNaN(currentGpa) ? currentGpa.toFixed(2) : '—'}
          </h3>
          {!isNaN(currentGpa) && (
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
              ({getLetterGrade(currentGpa)} avg)
            </span>
          )}
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Current GPA</p>
        </div>

        {/* Credits Card */}
        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#8b5cf6', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
            {earnedCredits} <span style={{ fontSize: '1.25rem', color: '#cbd5e1' }}>/ {earnedCredits + activeCredits}</span>
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Earned / Total Credits</p>
        </div>

        {/* PO Achievement Card */}
        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#6366f1', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
            {data.average_po_achievement != null ? parseFloat(data.average_po_achievement).toFixed(1) : '— '}%
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>PO Achievement</p>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>across {data.po_count || 0} outcomes</span>
        </div>

        {/* Courses Card */}
        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#f59e0b', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
            {data.active_courses || 0}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Active Courses</p>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{data.completed_courses || 0} completed</span>
        </div>
      </div>

      {/* Assessment Progress Bar */}
      <div className="info-card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#334155', fontWeight: 600 }}>Assessment Progress</h3>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
            {gradedAssessments} / {totalAssessments} graded • {pendingAssessments} pending
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '10px',
          background: '#f1f5f9',
          borderRadius: '99px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${assessmentProgress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            borderRadius: '99px',
            transition: 'width 0.5s ease-in-out'
          }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>

        {/* Left Column: Active Courses & Recent Grades */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Active Courses */}
          <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="section-title" style={{ margin: 0, fontSize: '1.15rem' }}>Active Courses</h2>
              <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>{activeCourses.length}</span>
            </div>
            <div>
              {activeCourses.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  No active courses found.
                </div>
              ) : (
                activeCourses.map((course, idx) => (
                  <div key={course.id} style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: idx < activeCourses.length - 1 ? '1px solid #f1f5f9' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
                        {course.code}
                      </div>
                      <div style={{ color: '#64748b', marginTop: '2px', fontSize: '0.9rem' }}>
                        {course.name}
                      </div>
                      <div style={{ color: '#94a3b8', marginTop: '4px', fontSize: '0.8rem' }}>
                        {course.semester} {course.year} • {course.instructor || 'TBA'}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/app/student/${course.id}`)}
                      style={{
                        background: '#eff6ff',
                        color: '#3b82f6',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Grades */}
          <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h2 className="section-title" style={{ margin: 0, fontSize: '1.15rem' }}>Recent Grades</h2>
            </div>
            {recentGrades.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                No grades recorded yet.
              </div>
            ) : (
              <div>
                {recentGrades.slice(0, 5).map((grade, idx) => {
                  const percentage = grade.max_score > 0
                    ? ((grade.score / grade.max_score) * 100)
                    : 0
                  const percentNum = parseFloat(percentage)
                  let badgeClass = 'badge-error'
                  if (percentNum >= 80) badgeClass = 'badge-success'
                  else if (percentNum >= 60) badgeClass = 'badge-warning'

                  return (
                    <div key={idx} style={{
                      padding: '1rem 1.5rem',
                      borderBottom: idx < Math.min(recentGrades.length, 5) - 1 ? '1px solid #f1f5f9' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>
                          {grade.assessment_name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                          {grade.course_name || grade.course_code || grade.course_instance?.name || grade.course_instance?.code || 'Course'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${badgeClass}`}>
                          {grade.score} / {grade.max_score}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                          {formatDate(grade.entered_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Completed/Finalized Courses */}
          {(data.completed_courses > 0 || data.completed_course_list?.length > 0) && (
            <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="section-title" style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Completed Courses
                </h2>
                <span className="badge" style={{ background: '#dcfce7', color: '#16a34a' }}>{data.completed_courses || data.completed_course_list?.length || 0}</span>
              </div>
              <div>
                {(!data.completed_course_list || data.completed_course_list.length === 0) ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    No completed courses yet.
                  </div>
                ) : (
                  data.completed_course_list.map((course, idx, arr) => (
                    <div key={course.id} style={{
                      padding: '1.25rem 1.5rem',
                      borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#fafffe'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {course.code || course.full_code}
                          {course.letter_grade && (
                            <span style={{
                              padding: '0.125rem 0.5rem',
                              backgroundColor: '#dcfce7',
                              color: '#16a34a',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'flex',
                              gap: '4px',
                              alignItems: 'center'
                            }}>
                              {course.letter_grade}
                              {course.final_score && (
                                <span style={{ fontWeight: 400, opacity: 0.8 }}>
                                  ({course.final_score})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#64748b', marginTop: '2px', fontSize: '0.9rem' }}>
                          {course.name || course.course_name}
                        </div>
                        <div style={{ color: '#94a3b8', marginTop: '4px', fontSize: '0.8rem' }}>
                          {course.semester} {course.year} • {course.credit || 3} credits
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/app/student/${course.id}`)}
                        style={{
                          background: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        View Summary
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Student Info & Academic Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <div className="info-card">
            <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Student Profile</h2>
            <div className="info-row">
              <span className="info-label">Name</span>
              <span className="info-value">{data.student_name || `${currentUser?.first_name} ${currentUser?.last_name}`}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Student ID</span>
              <span className="info-value">{data.student_number || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value" style={{ fontSize: '0.85rem' }}>{data.student_email || currentUser?.email || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Department</span>
              <span className="info-value">{data.department_code || data.department_name || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Class Year</span>
              <span className="info-value">{data.class_year || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Enrollment</span>
              <span className="info-value">{data.enrollment_year || '—'}</span>
            </div>
          </div>

          <div className="info-card">
            <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Academic Summary</h2>
            <div className="info-row">
              <span className="info-label">Official GPA</span>
              <span className="info-value">{!isNaN(officialGpa) ? officialGpa.toFixed(2) : '0.00'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Earned Credits</span>
              <span className="info-value">{earnedCredits}</span>
            </div>
            <div className="info-row">
              <span className="info-label">In-Progress Credits</span>
              <span className="info-value">{activeCredits}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Completed Courses</span>
              <span className="info-value">{data.completed_courses || 0}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Courses</span>
              <span className="info-value">{data.total_courses || 0}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

export default StudentDashboard
