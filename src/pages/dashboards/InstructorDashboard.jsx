import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { coursesAPI } from '../../api/courses'
import { coreAPI } from '../../api/core'
import { useMultipleAsync } from '../../hooks/useAsync'
import StatusBlock from '../../components/StatusBlock'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import '../Dashboard.css'

/**
 * Instructor Dashboard (PO/LO aligned)
 * Focus: course instances + LO→PO contribution workflow status
 * Data:
 * - /api/course-instances/ (taught courses, filtered by backend)
 * - /api/lo-po-contributions/ (mappings + approval status, filtered by backend)
 * - /api/assessments/ (optional; kept for course mgmt, not grades)
 */
const InstructorDashboard = ({ user }) => {
  const { logout } = useAuth()

  const { data, loading, error, refetch } = useMultipleAsync(
    {
      courses: () => coursesAPI.listInstances(),
      assessments: () => coursesAPI.listAssessments(), // optional but useful
      contributions: () => coreAPI.listLOToPOContributions(),
    },
    [],
    true
  )

  // Normalize list for DRF pagination / axios shapes
  const normalizeList = (value) => {
    const v = value?.data ?? value
    if (Array.isArray(v)) return v
    if (Array.isArray(v?.results)) return v.results
    return []
  }

  const courses = normalizeList(data?.courses)
  const assessments = normalizeList(data?.assessments)
  const contributions = normalizeList(data?.contributions)

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  const activeCourses = courses.filter((c) => c?.is_active !== false)

  // Helper: infer contribution status. Backend might use different field names.
  // We attempt common patterns safely.
  const getContributionStatus = (c) => {
    // common fields:
    // c.status: 'PENDING' | 'APPROVED' | 'REJECTED'
    // c.is_approved: boolean
    // c.approved: boolean
    if (typeof c?.status === 'string') return c.status.toUpperCase()
    if (c?.is_approved === true || c?.approved === true) return 'APPROVED'
    if (c?.is_approved === false || c?.approved === false) return 'PENDING'
    return 'PENDING'
  }

  // Group contributions by course_instance if possible
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

  // Dashboard-level stats
  const totalAssessments = assessments.length
  const totalContrib = contributions.length
  const pendingContrib = contributions.filter((c) => getContributionStatus(c) === 'PENDING').length
  const approvedContrib = contributions.filter((c) => getContributionStatus(c) === 'APPROVED').length

  // Full-page loading
  if (loading && courses.length === 0 && contributions.length === 0 && assessments.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Instructor Dashboard</h1>
        </div>
        <div className="dashboard-content">
          <StatusBlock type="loading" message="Loading your dashboard..." />
        </div>
      </div>
    )
  }

  // Full-page error (only if we have nothing to show)
  if (error && courses.length === 0 && contributions.length === 0 && assessments.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Instructor Dashboard</h1>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
        <div className="dashboard-content">
          <StatusBlock type="error" message={error} onRetry={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Instructor Dashboard</h1>
        <div className="user-info">
          <div className="user-details">
            <div className="user-name">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="user-role">Instructor</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Profile Summary */}
        <div className="dashboard-card profile-summary">
          <h2>Profile Summary</h2>
          <div className="profile-info">
            <div className="profile-item">
              <span className="profile-label">Name:</span>
              <span className="profile-value">{user?.first_name} {user?.last_name}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Email:</span>
              <span className="profile-value">{user?.email}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Department:</span>
              <span className="profile-value">{user?.department_name || 'N/A'}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Active Courses:</span>
              <span className="profile-value">{user?.active_courses || activeCourses.length}</span>
            </div>
          </div>
        </div>

        {/* Stats (PO/LO aligned) */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>{activeCourses.length}</h3>
            <p>Active Courses</p>
          </div>
          <div className="stat-card">
            <h3>{totalContrib}</h3>
            <p>LO→PO Contributions</p>
          </div>
          <div className="stat-card">
            <h3>{pendingContrib}</h3>
            <p>Pending Approval</p>
          </div>
          <div className="stat-card">
            <h3>{approvedContrib}</h3>
            <p>Approved</p>
          </div>
        </div>

        {/* My Courses */}
        <div className="dashboard-card">
          <h2>My Active Courses</h2>

          {loading ? (
            <LoadingSkeleton lines={3} />
          ) : error ? (
            <StatusBlock type="error" message="Failed to load dashboard data" onRetry={refetch} />
          ) : activeCourses.length === 0 ? (
            <StatusBlock type="empty" message="You are not teaching any active courses." />
          ) : (
            <div className="courses-list">
              {activeCourses.map((course) => {
                const courseId = course.id
                const courseContrib = contributionsByCourseId[courseId] || []

                const pending = courseContrib.filter((c) => getContributionStatus(c) === 'PENDING').length
                const approved = courseContrib.filter((c) => getContributionStatus(c) === 'APPROVED').length

                const termInfo =
                  course.semester && course.year
                    ? `${course.semester} ${course.year}`
                    : course.semester || course.year || 'Term TBA'

                return (
                  <div key={course.id} className="course-item">
                    <div className="course-header">
                      <h3>{course.get_full_code || course.course_template?.get_full_code || 'Course'}</h3>
                      <span className="course-semester">{termInfo}</span>
                    </div>

                    <div className="course-details">
                      <p><strong>{course.course_template?.name || 'Course'}</strong></p>
                      <p>Students: {course.students_count || 0}</p>
                      <p>Assessments: {course.assessments_count || 0}</p>
                      <p>
                        LO→PO Contributions: {courseContrib.length}{' '}
                        {courseContrib.length > 0 && (
                          <span className="course-average">
                            (Pending: {pending} • Approved: {approved})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="course-actions">
                      {/* Keep assessments if your system uses them for LO measurement */}
                      <Link
                        to={`/instructor/courses/${course.id}/assessments`}
                        className="manage-assessments-btn"
                      >
                        Manage Assessments
                      </Link>

                      {/* Stub routes for PO/LO mapping views (we can implement next) */}
                      <Link
                        to={`/instructor/courses/${course.id}/contributions`}
                        className="manage-assessments-btn"
                        style={{ marginLeft: 8 }}
                      >
                        LO→PO Mappings
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Contribution Queue (Instructor view) */}
        <div className="dashboard-card">
          <h2>Contribution Status</h2>

          {loading ? (
            <LoadingSkeleton lines={5} />
          ) : error ? (
            <StatusBlock type="error" message="Failed to load contributions" onRetry={refetch} />
          ) : contributions.length === 0 ? (
            <StatusBlock
              type="empty"
              message="No LO→PO contributions yet. Create mappings for your course learning outcomes."
            />
          ) : (
            <div className="grades-list">
              {contributions.slice(0, 10).map((c) => {
                const status = getContributionStatus(c)
                const loLabel = c?.learning_outcome?.code || c?.learning_outcome?.name || 'LO'
                const poLabel = c?.program_outcome?.code || c?.program_outcome?.name || 'PO'
                const weight = c?.weight ?? c?.contribution ?? '—'

                return (
                  <div key={c.id} className="grade-item">
                    <div className="grade-header">
                      <span className="grade-assessment">
                        {loLabel} → {poLabel}
                      </span>
                      <span className="grade-score">
                        Status: {status}
                      </span>
                    </div>
                    <div className="grade-details">
                      <span className="grade-course">
                        {c?.course_instance?.get_full_code ||
                          c?.course_instance?.course_template?.get_full_code ||
                          'Course'}
                      </span>
                      <span className="grade-percentage">
                        Weight: {weight}
                      </span>
                    </div>
                  </div>
                )
              })}
              {contributions.length > 10 && (
                <p className="more-indicator">+{contributions.length - 10} more</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InstructorDashboard
