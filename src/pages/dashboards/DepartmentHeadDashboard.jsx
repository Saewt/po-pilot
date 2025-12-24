import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { coursesAPI } from '../../api/courses'
import { coreAPI } from '../../api/core'
import { useMultipleAsync } from '../../hooks/useAsync'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import ApprovalTable from '../../components/ApprovalTable'
import Toast from '../../components/Toast'
import '../../styles/pages.css'

const DepartmentHeadDashboard = ({ user }) => {
  const { logout } = useAuth()
  const [approvingIds, setApprovingIds] = useState([])
  const [toast, setToast] = useState(null)

  const normalizeList = (value) => {
    const v = value?.data ?? value
    if (Array.isArray(v)) return v
    if (Array.isArray(v?.results)) return v.results
    return []
  }

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

  const programOutcomes = allProgramOutcomes.filter((po) => {
    const poDept = po?.department?.id ?? po?.department
    return deptId ? poDept === deptId : true
  })

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

  const activeCourses = courses.filter((c) => c?.is_active !== false)
  const activePOs = programOutcomes.filter((po) => po?.is_active !== false)
  const pendingContributions = contributions.filter((c) => getApprovalStatus(c) === 'PENDING')

  const totalStudents = activeCourses.reduce((sum, course) => sum + (course?.students_count || 0), 0)
  
  if (loading && courses.length === 0 && programOutcomes.length === 0 && contributions.length === 0) {
    return <LoadingState />
  }

  if (error && courses.length === 0 && programOutcomes.length === 0 && contributions.length === 0) {
    return <ErrorState error={error} onRetry={refetch} />
  }

  return (
    <div className="page-container">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      
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
            {totalStudents}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Total Students</p>
        </div>

        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#ec4899', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
             {activePOs.length}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Program Outcomes</p>
        </div>

        <div className="info-card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '2.5rem', color: '#f59e0b', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
             {pendingContributions.length}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>Pending Approvals</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ 
                padding: '1.5rem', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: pendingContributions.length > 0 ? '#fffbeb' : 'transparent'
              }}>
                <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>Pending Approvals</h2>
                {pendingContributions.length > 0 && (
                   <span className="badge badge-warning">{pendingContributions.length} New</span>
                )}
              </div>

              <div style={{ padding: '1.5rem' }}>
                 {pendingContributions.length > 0 ? (
                    <ApprovalTable
                      contributions={contributions}
                      onApprove={handleApproveContribution}
                      approvingIds={approvingIds}
                    />
                 ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                        No pending contributions to approve.
                    </div>
                 )}
              </div>
            </div>

            <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                    <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>Active Courses</h2>
                </div>
                <div style={{ padding: '0' }}>
                    {activeCourses.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                            No active courses.
                        </div>
                    ) : (
                        <div>
                            {activeCourses.slice(0, 5).map((course, idx) => (
                                <div key={course.id} style={{ 
                                    padding: '1rem 1.5rem', 
                                    borderBottom: idx < activeCourses.length - 1 || idx < 4 ? '1px solid #f1f5f9' : 'none',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#334155' }}>
                                            {course.get_full_code || course.course_template?.get_full_code}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            {course.course_template?.name}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                                            {course.students_count || 0} Students
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {activeCourses.length > 5 && (
                                <div style={{ 
                                    padding: '1rem', 
                                    textAlign: 'center', 
                                    background: '#f8fafc', 
                                    borderTop: '1px solid #e2e8f0',
                                    color: '#64748b',
                                    fontSize: '0.9rem'
                                }}>
                                    +{activeCourses.length - 5} more courses
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div className="info-card">
              <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Department Summary</h2>
              <div className="info-row">
                  <span className="info-label">Department</span>
                  <span className="info-value">{user?.department_name || 'N/A'}</span>
              </div>
              <div className="info-row">
                  <span className="info-label">Head</span>
                  <span className="info-value">{user?.first_name} {user?.last_name}</span>
              </div>
              {department && (
                  <>
                    <div className="info-row">
                        <span className="info-label">Programs</span>
                        <span className="info-value">{department?.programs_count || 0}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Templates</span>
                        <span className="info-value">{department?.course_templates_count || 0}</span>
                    </div>
                  </>
              )}
            </div>

            <div className="info-card">
              <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Program Outcomes</h2>
              {activePOs.length === 0 ? (
                  <p className="text-secondary">No Program Outcomes defined.</p>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {activePOs.slice(0, 5).map(po => (
                          <div key={po.id} style={{ 
                              padding: '0.75rem', 
                              background: '#f8fafc', 
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0'
                          }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                  {po.code || `PO-${po.id}`}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                                  {po.description?.substring(0, 60)}...
                              </div>
                          </div>
                      ))}
                  </div>
              )}
            </div>

        </div>

      </div>
    </div>
  )
}

export default DepartmentHeadDashboard