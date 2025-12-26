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

/**
 * Instructor Course Students Page
 * Shows enrolled students for a course and allows enrolling new ones
 */
const InstructorCourseStudents = () => {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { courseId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [course, setCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [deptStudents, setDeptStudents] = useState([])

  const [studentIdsInput, setStudentIdsInput] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    loadData()
  }, [courseId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)
      setStudents(courseData.students || [])

      if (user?.department) {
        try {
          const studentsRes = await usersAPI.list({ role: 'STUDENT', department: user.department })
          setDeptStudents(studentsRes.results || studentsRes || [])
        } catch (uErr) {
          console.warn('Failed to load department students for mapping:', uErr)
        }
      }

    } catch (err) {
      console.error('Failed to load course data:', err)
      setError(err.response?.data?.detail || 'Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!studentIdsInput.trim()) return

    try {
      setEnrolling(true)

      const inputIds = studentIdsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s)

      if (inputIds.length === 0) {
        setEnrolling(false)
        return
      }

      // Map Student IDs (e.g., "900123") to Internal IDs
      const internalIds = []
      const notFoundIds = []

      if (deptStudents.length === 0) {
        addToast('Unable to verify Student IDs (cannot list department students).', 'error')
        setEnrolling(false)
        return
      }

      inputIds.forEach(sid => {
        const student = deptStudents.find(s => s.student_id === sid)
        if (student) {
          internalIds.push(student.student_id)
        } else {
          notFoundIds.push(sid)
        }
      })

      if (notFoundIds.length > 0) {
        addToast(`Student IDs not found: ${notFoundIds.join(', ')}`, 'error')
        setEnrolling(false)
        return
      }

      await coursesAPI.enroll_students(courseId, { student_ids: internalIds })

      addToast('Students enrolled successfully!', 'success')
      setStudentIdsInput('')

      // Reload data
      const updatedCourse = await coursesAPI.get(courseId)
      setCourse(updatedCourse)
      setStudents(updatedCourse.students || [])

    } catch (err) {
      console.error('Enrollment failed:', err)
      addToast(err.response?.data?.detail || 'Failed to enroll students', 'error')
    } finally {
      setEnrolling(false)
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

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>{course.full_code || course.code} - {courseName}</h1>
        <div style={{ display: 'flex', gap: '1rem', color: '#64748b' }}>
          <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>
            {course.semester} {course.year}
          </span>
          <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
            {course.students_count || students.length} Students
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Enrollment */}
        <div className="info-card" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 className="section-title" style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            Enroll New Students
          </h2>

          <div className="form-group">
            <label style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Student IDs</label>
            <input
              type="text"
              value={studentIdsInput}
              onChange={(e) => setStudentIdsInput(e.target.value)}
              placeholder="e.g. 20205011, 20205012"
              disabled={enrolling}
              style={{ width: '100%', padding: '0.75rem', marginBottom: '8px' }}
            />
            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Enter comma-separated IDs.
            </span>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={handleEnroll}
              disabled={enrolling || !studentIdsInput.trim()}
              style={{ width: '100%' }}
            >
              {enrolling ? 'Enrolling...' : 'Enroll Students'}
            </button>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="info-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 1.5rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.1rem' }}>Enrolled Student List</h2>
          </div>

          {students.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              No students enrolled yet.
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
              data={students}
              pagination={true}
              itemsPerPage={10}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default InstructorCourseStudents
