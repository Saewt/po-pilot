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

      // Load all dept students to map Student ID -> User ID
      // We assume instructors can list students in their department
      if (user?.department) {
        try {
          const studentsRes = await usersAPI.list({ role: 'STUDENT', department: user.department })
          setDeptStudents(studentsRes.results || studentsRes || [])
        } catch (uErr) {
          console.warn('Failed to load department students for mapping:', uErr)
          // Not a critical error for viewing, but will block enrollment by ID lookup
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

      // If we failed to load deptStudents, we can't map. 
      // But maybe the user entered internal IDs? Unlikely given the UX.
      if (deptStudents.length === 0) {
        addToast('Unable to verify Student IDs (cannot list department students).', 'error')
        setEnrolling(false)
        return
      }

      inputIds.forEach(sid => {
        const student = deptStudents.find(s => s.student_id === sid)
        if (student) {
          internalIds.push(student.id)
        } else {
          notFoundIds.push(sid)
        }
      })

      if (notFoundIds.length > 0) {
        addToast(`Student IDs not found: ${notFoundIds.join(', ')}`, 'error')
        setEnrolling(false)
        return
      }

      // Call bulk enroll endpoint
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

  const columns = [
    { header: 'Student ID', accessor: 'student_id', render: r => r.student_id || 'N/A' },
    { header: 'Name', accessor: 'id', render: r => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'N/A' },
    { header: 'Email', accessor: 'email' },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">Students: {course.get_full_code} - {courseName}</h1>
      <p className="text-secondary" style={{ marginBottom: 'var(--spacing-md)' }}>
        <strong>Total Students:</strong> {course.students_count || students.length}
      </p>

      {/* Enrollment Form */}
      <div className="form-section" style={{ marginBottom: '2rem' }}>
        <h3>Enroll Students</h3>
        <div className="form-group">
          <label>Student IDs (comma-separated):</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={studentIdsInput}
                onChange={(e) => setStudentIdsInput(e.target.value)}
                placeholder="e.g. 900123, 900456"
                disabled={enrolling}
              />
              <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                Enter school Student IDs.
              </span>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleEnroll}
              disabled={enrolling || !studentIdsInput.trim()}
            >
              {enrolling ? 'Enrolling...' : 'Enroll'}
            </button>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={students} />
    </div>
  )
}

export default InstructorCourseStudents

