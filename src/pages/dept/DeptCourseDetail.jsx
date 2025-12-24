import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { usersAPI } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

const DeptCourseDetail = () => {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { courseId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [course, setCourse] = useState(null)
  const [deptInstructors, setDeptInstructors] = useState([])

  const [instructorId, setInstructorId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [courseId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)

      const inst = courseData.instructor
      setInstructorId(inst && typeof inst === 'object' ? inst.id : inst || '')

      const response = await usersAPI.list({ role: 'INSTRUCTOR', department: user.department })
      const instructorsList = response.results || response || []
      setDeptInstructors(instructorsList)

    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err.response?.data?.detail || 'Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updateData = {
        instructor_id: instructorId ? parseInt(instructorId) : null,
      }

      await coursesAPI.patch(courseId, updateData)

      const updatedCourse = await coursesAPI.get(courseId)
      setCourse(updatedCourse)

      addToast('Course assignments updated successfully!', 'success')
    } catch (err) {
      console.error('Failed to save assignments:', err)
      addToast(err.response?.data?.detail || 'Failed to save assignments', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !course) {
    return <LoadingState />
  }

  if (error && !course) {
    return <ErrorState error={error} onRetry={loadData} />
  }

  if (!course) {
    return <div>Course not found</div>
  }

  const courseName = typeof course.course_template === 'object'
    ? course.course_template.name
    : 'N/A'

  const displayedStudents = course.students || []

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>{course.full_code || course.code} - {courseName}</h1>
        <div style={{ display: 'flex', gap: '1rem', color: '#64748b' }}>
            <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>
                {course.semester} {course.year}
            </span>
            {course.is_active ? (
                <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>Active</span>
            ) : (
                <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Inactive</span>
            )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          <div className="info-card" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <h2 className="section-title" style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                Instructor Assignment
            </h2>

            <div className="form-group">
              <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Assigned Instructor</label>
              <select
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: '6px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '1rem', 
                    backgroundColor: '#fff' 
                }}
              >
                <option value="">-- No Instructor Assigned --</option>
                {deptInstructors.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.first_name} {inst.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ width: '100%' }}
                >
                {saving ? 'Saving...' : 'Update Assignment'}
                </button>
            </div>
          </div>

          <div className="info-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 1.5rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="section-title" style={{ margin: 0, fontSize: '1.1rem' }}>Enrolled Students</h2>
                <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                    {displayedStudents.length} Students
                </span>
            </div>
            
            {displayedStudents.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  No students currently enrolled in this session.
              </div>
            ) : (
              <DataTable
                columns={[
                  { 
                      header: 'Student ID', 
                      accessor: 'student_id', 
                      render: r => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.student_id || 'N/A'}</span>
                  },
                  { 
                      header: 'Name', 
                      accessor: 'id', 
                      render: r => <span style={{ fontWeight: 500 }}>{`${r.first_name || ''} ${r.last_name || ''}`.trim() || 'N/A'}</span> 
                  },
                  { header: 'Email', accessor: 'email' },
                ]}
                data={displayedStudents}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </div>
      </div>
    </div>
  )
}

export default DeptCourseDetail
