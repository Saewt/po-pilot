import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { coursesAPI } from '../../api/courses'
import { coreAPI } from '../../api/core'
import { useMultipleAsync } from '../../hooks/useAsync'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import '../../styles/pages.css'

const InstructorDashboard = ({ user }) => {
  const { logout } = useAuth()

  const { data, loading, error, refetch } = useMultipleAsync(
    {
      courses: () => coursesAPI.listInstances(),
      assessments: () => coursesAPI.listAssessments(),
      contributions: () => coreAPI.listLOToPOContributions(),
    },
    [],
    true
  )

  const normalizeList = (value) => {
    const v = value?.data ?? value
    if (Array.isArray(v)) return v
    if (Array.isArray(v?.results)) return v.results
    return []
  }

  const courses = normalizeList(data?.courses)
  const assessments = normalizeList(data?.assessments)
  const contributions = normalizeList(data?.contributions)

  const activeCourses = courses.filter((c) => c?.is_active !== false)

  const getContributionStatus = (c) => {
    if (typeof c?.status === 'string') return c.status.toUpperCase()
    if (c?.is_approved === true || c?.approved === true) return 'APPROVED'
    if (c?.is_approved === false || c?.approved === false) return 'PENDING'
    return 'PENDING'
  }

  const contributionsByCourseId = contributions.reduce((acc, c) => {
    const courseId =
      c?.course_instance?.id ??
      c?.course_instance ??
      c?.assessment?.course_instance?.id ??
      null

    if (!courseId) return acc

    if (!acc[courseId]) acc[courseId] = []
    acc[courseId].push(c)
    return acc
  }, {})

  const totalAssessments = assessments.length
  const totalContrib = contributions.length
  const pendingContrib = contributions.filter((c) => getContributionStatus(c) === 'PENDING').length
  const approvedContrib = contributions.filter((c) => getContributionStatus(c) === 'APPROVED').length

  if (loading && courses.length === 0 && contributions.length === 0 && assessments.length === 0) {
    return <LoadingState />
  }

  if (error && courses.length === 0 && contributions.length === 0 && assessments.length === 0) {
    return <ErrorState error={error} onRetry={refetch} />
  }

  return (
    <div className="page-container">
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#6366f1', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
             {activeCourses.length}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Active Courses</p>
        </div>
        
        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#8b5cf6', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
            {totalContrib}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Total Contributions</p>
        </div>

        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#f59e0b', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
             {pendingContrib}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Pending Approval</p>
        </div>

        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#10b981', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
             {approvedContrib}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Approved</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                    <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>My Active Courses</h2>
                </div>
                <div style={{ padding: '0' }}>
                    {activeCourses.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                            You are not teaching any active courses.
                        </div>
                    ) : (
                        <div>
                            {activeCourses.map((course, idx) => {
                                const courseId = course.id
                                const courseContrib = contributionsByCourseId[courseId] || []
                                const pending = courseContrib.filter((c) => getContributionStatus(c) === 'PENDING').length
                                const approved = courseContrib.filter((c) => getContributionStatus(c) === 'APPROVED').length

                                const termInfo = course.semester && course.year
                                    ? `${course.semester} ${course.year}`
                                    : course.semester || course.year || 'Term TBA'

                                return (
                                    <div key={course.id} style={{ 
                                        padding: '1.5rem', 
                                        borderBottom: idx < activeCourses.length - 1 ? '1px solid #f1f5f9' : 'none'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
                                                        {course.get_full_code || course.course_template?.get_full_code || 'Course'}
                                                    </h3>
                                                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                                                        {termInfo}
                                                    </span>
                                                </div>
                                                <div style={{ color: '#64748b', marginTop: '4px', fontSize: '0.9rem' }}>
                                                    {course.course_template?.name || 'Course'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                 <Link
                                                    to={`/app/instructor/courses/${course.id}/assessments`}
                                                    className="btn"
                                                    style={{ 
                                                        background: '#eff6ff', 
                                                        color: '#3b82f6', 
                                                        border: 'none',
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 500,
                                                        textDecoration: 'none'
                                                    }}
                                                  >
                                                    Manage Assessments
                                                  </Link>
                                                  <Link
                                                    to={`/app/instructor/courses/${course.id}/lo-po`}
                                                    className="btn"
                                                    style={{ 
                                                        background: '#f3e8ff', 
                                                        color: '#9333ea', 
                                                        border: 'none',
                                                        padding: '0.5rem 1rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 500,
                                                        textDecoration: 'none'
                                                    }}
                                                  >
                                                    LO-PO Mappings
                                                  </Link>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#64748b' }}>
                                            <div>
                                                <strong style={{ color: '#334155' }}>{course.students_count || 0}</strong> Students
                                            </div>
                                            <div>
                                                <strong style={{ color: '#334155' }}>{course.assessments_count || 0}</strong> Assessments
                                            </div>
                                            <div>
                                                <strong style={{ color: '#334155' }}>{courseContrib.length}</strong> LO-PO Links
                                                {courseContrib.length > 0 && (
                                                    <span style={{ marginLeft: '6px', fontSize: '0.8rem' }}>
                                                        (Pending: {pending} • Approved: {approved})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                    <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>Recent Contributions</h2>
                </div>
                {contributions.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                         No LO-PO contributions yet.
                    </div>
                ) : (
                    <div>
                         {contributions.slice(0, 5).map((c, idx) => {
                            const status = getContributionStatus(c)
                            const loLabel = c?.learning_outcome?.code || c?.learning_outcome?.name || 'LO'
                            const poLabel = c?.program_outcome?.code || c?.program_outcome?.name || 'PO'
                            const weight = c?.weight ?? c?.contribution ?? '—'
                            
                            let badgeStyle = { backgroundColor: '#fff3e0', color: '#e65100' }
                            
                            if (status === 'APPROVED') {
                                badgeStyle = { backgroundColor: '#dcfce7', color: '#166534' }
                            } else if (status === 'REJECTED' || status === 'DECLINED') {
                                badgeStyle = { backgroundColor: '#fee2e2', color: '#991b1b' }
                            }

                            return (
                                <div key={c.id} style={{ 
                                    padding: '1rem 1.5rem', 
                                    borderBottom: idx < 4 ? '1px solid #f1f5f9' : 'none',
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>
                                            {loLabel} → {poLabel}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                                            {c?.course_instance?.get_full_code || c?.course_instance?.course_template?.get_full_code}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="badge" style={{ 
                                            padding: '4px 8px', 
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            ...badgeStyle
                                        }}>
                                            {status}
                                        </span>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                            Weight: {weight}
                                        </div>
                                    </div>
                                </div>
                            )
                         })}
                    </div>
                )}
            </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div className="info-card">
              <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Profile Summary</h2>
              <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">{user?.first_name} {user?.last_name}</span>
              </div>
              <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-row">
                  <span className="info-label">Department</span>
                  <span className="info-value">{user?.department_name || 'N/A'}</span>
              </div>
              <div className="info-row">
                  <span className="info-label">Active Courses</span>
                  <span className="info-value">{user?.active_courses || activeCourses.length}</span>
              </div>
            </div>

        </div>

      </div>
    </div>
  )
}

export default InstructorDashboard