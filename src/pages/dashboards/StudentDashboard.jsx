import { useAuth } from '../../context/AuthContext'
import { coursesAPI } from '../../api/courses'
import { useMultipleAsync } from '../../hooks/useAsync'
import StatusBlock from '../../components/StatusBlock'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import '../Dashboard.css'

/**
 * Student Dashboard (PO/LO project aligned)
 * Shows enrolled course instances. No grades/GPA nonsense.
 */
const StudentDashboard = ({ user }) => {
  const { logout } = useAuth()

  const { data, loading, error, refetch } = useMultipleAsync(
    {
      courses: () => coursesAPI.listInstances(),
    },
    [],
    true
  )

  // normalize list for DRF pagination / axios shapes
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

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <div className="user-info">
          <div className="user-details">
            <div className="user-name">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="user-role">Student</div>
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
              <span className="profile-label">Email:</span>
              <span className="profile-value">{user?.email}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Student ID:</span>
              <span className="profile-value">{user?.student_id || 'N/A'}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Department:</span>
              <span className="profile-value">{user?.department_name || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Courses */}
        <div className="dashboard-card">
          <h2>My Courses</h2>

          {loading ? (
            <LoadingSkeleton lines={3} />
          ) : error ? (
            <StatusBlock
              type="error"
              message="Failed to load your courses."
              onRetry={refetch}
            />
          ) : activeCourses.length === 0 ? (
            <StatusBlock
              type="empty"
              message="You are not enrolled in any active courses."
            />
          ) : (
            <div className="courses-list">
              {activeCourses.map((course) => (
                <div key={course.id} className="course-item">
                  <div className="course-header">
                    <h3>
                      {course.get_full_code ||
                        course.course_template?.get_full_code ||
                        'Course'}
                    </h3>
                    <span className="course-semester">
                      {course.semester} {course.year}
                    </span>
                  </div>
                  <div className="course-details">
                    <p>
                      <strong>{course.course_template?.name || 'Course'}</strong>
                    </p>
                    <p>
                      Instructor:{' '}
                      {course.instructor_name || course.instructor || 'TBA'}
                    </p>
                    <p>Assessments: {course.assessments_count || 0}</p>
                    {/* Later: show PO/LO mapping info per course if backend exposes it */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Placeholder for PO/LO info */}
        <div className="dashboard-card">
          <h2>Outcomes</h2>
          <StatusBlock
            type="info"
            message="Next: we’ll show which learning outcomes (LOs) and program outcomes (POs) your courses target."
          />
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
