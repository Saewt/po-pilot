import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { coursesAPI } from '../../api/courses'
import { coreAPI } from '../../api/core'
import { useMultipleAsync } from '../../hooks/useAsync'
import StatusBlock from '../../components/StatusBlock'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ApprovalTable from '../../components/ApprovalTable'
import Toast from '../../components/Toast'
import '../Dashboard.css'

const DepartmentHeadDashboard = ({ user }) => {
  const { logout } = useAuth()
  const [approvingIds, setApprovingIds] = useState([])
  const [toast, setToast] = useState(null)

  // Normalize list for DRF pagination / axios shapes
  const normalizeList = (value) => {
    const v = value?.data ?? value
    if (Array.isArray(v)) return v
    if (Array.isArray(v?.results)) return v.results
    return []
  }

  // Approval status helper (backend may differ)
  const getApprovalStatus = (c) => {
    if (!c) return 'PENDING'
    if (typeof c.status === 'string') return c.status.toUpperCase()
    if (c.is_approved === true || c.approved === true) return 'APPROVED'
    if (c.is_approved === false || c.approved === false) return 'PENDING'
    return 'PENDING'
  }

  const deptId = user?.department ?? null

  const { data, loading, error, refetch } = useMultipleAsync(
    {
      department: () => (deptId ? coreAPI.getDepartment(deptId) : Promise.resolve(null)),
      courses: () => coursesAPI.listInstances(),
      programOutcomes: () => coreAPI.listProgramOutcomes(),
      contributions: () => coreAPI.listLOToPOContributions(),
    },
    [deptId],
    !!deptId
  )

  const department = data?.department ?? null
  const courses = normalizeList(data?.courses)
  const allProgramOutcomes = normalizeList(data?.programOutcomes)
  const contributions = normalizeList(data?.contributions)

  // Filter POs by department (po.department might be id OR object)
  const programOutcomes = allProgramOutcomes.filter((po) => {
    const poDept = po?.department?.id ?? po?.department
    return deptId ? poDept === deptId : true
  })

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  const handleApproveContribution = async (contributionId) => {
    if (user?.role !== 'DEPARTMENT_HEAD') {
      setToast({ message: 'Only department heads can approve contributions.', type: 'error' })
      return
    }

    try {
      setApprovingIds((prev) => [...prev, contributionId])
      await coreAPI.approveContribution(contributionId)
      await refetch()
      setToast({ message: 'Contribution approved successfully!', type: 'success' })
    } catch (err) {
      console.error('Failed to approve contribution:', err)
      await refetch()
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Failed to approve contribution. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setApprovingIds((prev) => prev.filter((id) => id !== contributionId))
    }
  }

  // Stats (safe)
  const activeCourses = courses.filter((c) => c?.is_active !== false)
  const activePOs = programOutcomes.filter((po) => po?.is_active !== false)
  const pendingContributions = contributions.filter((c) => getApprovalStatus(c) === 'PENDING')

  const totalStudents = activeCourses.reduce((sum, course) => sum + (course?.students_count || 0), 0)
  const totalInstructors = new Set(
    courses
      .map((c) => c?.instructor?.id ?? c?.instructor)
      .filter(Boolean)
  ).size

  // Full-page loading
  if (loading && courses.length === 0 && programOutcomes.length === 0 && contributions.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Department Head Dashboard</h1>
        </div>
        <div className="dashboard-content">
          <StatusBlock type="loading" message="Loading your dashboard..." />
        </div>
      </div>
    )
  }

  // Full-page error (only if nothing to show)
  if (error && courses.length === 0 && programOutcomes.length === 0 && contributions.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Department Head Dashboard</h1>
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
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="dashboard-header">
        <h1>Department Head Dashboard</h1>
        <div className="user-info">
          <div className="user-details">
            <div className="user-name">{user?.first_name} {user?.last_name}</div>
            <div className="user-role">Department Head</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Department Summary */}
        <div className="dashboard-card profile-summary">
          <h2>Department Summary</h2>
          <div className="profile-info">
            <div className="profile-item">
              <span className="profile-label">Email:</span>
              <span className="profile-value">{user?.email}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Department:</span>
              <span className="profile-value">{user?.department_name || 'N/A'}</span>
            </div>
            {department && (
              <>
                <div className="profile-item">
                  <span className="profile-label">Total Courses:</span>
                  <span className="profile-value">{department?.course_templates_count || 0}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Total Programs:</span>
                  <span className="profile-value">{department?.programs_count || 0}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>{user?.department_name || 'N/A'}</h3>
            <p>Department</p>
          </div>
          <div className="stat-card">
            <h3>{activeCourses.length}</h3>
            <p>Active Courses</p>
          </div>
          <div className="stat-card">
            <h3>{totalStudents}</h3>
            <p>Total Students</p>
          </div>
          <div className="stat-card">
            <h3>{totalInstructors}</h3>
            <p>Instructors</p>
          </div>
          <div className="stat-card">
            <h3>{activePOs.length}</h3>
            <p>Program Outcomes</p>
          </div>
          <div className="stat-card">
            <h3>{pendingContributions.length}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>

        {/* Approvals */}
        <div
          className="dashboard-card"
          style={{ borderLeft: pendingContributions.length > 0 ? '4px solid #ffc107' : 'none' }}
        >
          <h2>LO-PO Contribution Approvals</h2>

          {loading ? (
            <LoadingSkeleton lines={5} />
          ) : error ? (
            <StatusBlock type="error" message="Failed to load contributions" onRetry={refetch} />
          ) : (
            <>
              {pendingContributions.length > 0 ? (
                <div style={{ marginBottom: 15 }}>
                  <p>
                    You have <strong>{pendingContributions.length}</strong> contribution
                    {pendingContributions.length !== 1 ? 's' : ''} pending approval.
                  </p>
                </div>
              ) : (
                <StatusBlock type="empty" message="No pending contributions to approve." />
              )}

              {contributions.length > 0 && (
                <ApprovalTable
                  contributions={contributions}
                  onApprove={handleApproveContribution}
                  approvingIds={approvingIds}
                />
              )}
            </>
          )}
        </div>

        {/* Program Outcomes */}
        <div className="dashboard-card">
          <h2>Program Outcomes</h2>

          {loading ? (
            <LoadingSkeleton lines={3} />
          ) : error ? (
            <StatusBlock type="error" message="Failed to load program outcomes" onRetry={refetch} />
          ) : activePOs.length === 0 ? (
            <StatusBlock type="empty" message="No program outcomes defined for this department." />
          ) : (
            <div className="courses-list">
              {activePOs.map((po) => {
                const poContributions = contributions.filter((c) => (c?.program_outcome?.id ?? c?.program_outcome) === po.id)
                const approvedCount = poContributions.filter((c) => getApprovalStatus(c) === 'APPROVED').length

                return (
                  <div key={po.id} className="course-item">
                    <div className="course-header">
                      <h3>{po.code || `PO-${po.id}`}</h3>
                      <span className="course-semester">{po?.is_active !== false ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="course-details">
                      <p><strong>{po.description || 'No description'}</strong></p>
                      <p>Contributions: {approvedCount} / {poContributions.length} approved</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Courses */}
        <div className="dashboard-card">
          <h2>Department Courses</h2>

          {loading ? (
            <LoadingSkeleton lines={3} />
          ) : error ? (
            <StatusBlock type="error" message="Failed to load courses" onRetry={refetch} />
          ) : activeCourses.length === 0 ? (
            <StatusBlock type="empty" message="No active courses in this department." />
          ) : (
            <div className="courses-list">
              {activeCourses.slice(0, 10).map((course) => (
                <div key={course.id} className="course-item">
                  <div className="course-header">
                    <h3>{course.get_full_code || course.course_template?.get_full_code || 'Course'}</h3>
                    <span className="course-semester">{course.semester} {course.year}</span>
                  </div>
                  <div className="course-details">
                    <p><strong>{course.course_template?.name || 'Course'}</strong></p>
                    <p>Instructor: {course.instructor_name || 'TBA'}</p>
                    <p>Students: {course.students_count || 0}</p>
                    <p>Assessments: {course.assessments_count || 0}</p>
                  </div>
                </div>
              ))}
              {activeCourses.length > 10 && (
                <p className="more-indicator">+{activeCourses.length - 10} more courses</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DepartmentHeadDashboard
