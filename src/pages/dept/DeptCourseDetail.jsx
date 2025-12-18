import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { usersAPI } from '../../api/users'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * DeptHead Course Detail Page
 * Shows course details and allows assigning instructor/students
 */
const DeptCourseDetail = () => {
  const { courseId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [course, setCourse] = useState(null)
  const [instructorId, setInstructorId] = useState('')
  const [studentIdsInput, setStudentIdsInput] = useState('')
  const [enrolledStudents, setEnrolledStudents] = useState([])

  useEffect(() => {
    loadCourse()
  }, [courseId])

  const loadCourse = async () => {
    try {
      setLoading(true)
      setError(null)
      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)
      setInstructorId(courseData.instructor || '')

      const studentsRaw = courseData.students || []
      // Map to IDs for input field
      const sIds = studentsRaw.map(s => typeof s === 'object' ? s.id : s)
      setStudentIdsInput(sIds.join(', '))
      // Note: The useEffect on studentIdsInput will handle fetching details
    } catch (err) {
      console.error('Failed to load course:', err)
      setError(err.response?.data?.detail || 'Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  // Fetch details when input changes
  useEffect(() => {
    const fetchStudents = async () => {
      const ids = studentIdsInput.split(',').map(s => s.trim()).filter(s => s && !isNaN(s)).map(s => parseInt(s))
      if (ids.length === 0) {
        setEnrolledStudents([])
        return
      }

      // Simple optimization: fetch only new IDs or just fetch all (simpler for now)
      try {
        const details = await Promise.all(ids.map(id => usersAPI.get(id)))
        setEnrolledStudents(details)
      } catch (e) {
        console.error('Failed to fetch some students', e)
        // Keep partial results? For now just log
      }
    }

    const timer = setTimeout(fetchStudents, 500)
    return () => clearTimeout(timer)
  }, [studentIdsInput])

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if assignment endpoints exist in API
      // For now, we'll try to update the course instance
      const idList = studentIdsInput.split(',').map(id => id.trim()).filter(id => id).map(id => parseInt(id))
      const updateData = {
        instructor_id: instructorId ? parseInt(instructorId) : null,
        students: idList,
        student_ids: idList,
      }

      await coursesAPI.patch(courseId, updateData)
      await loadCourse()
      alert('Course assignments updated successfully!')
    } catch (err) {
      console.error('Failed to save assignments:', err)
      if (err.response?.status === 404 || err.response?.status === 405) {
        setError('Assignment endpoint not available in API schema.')
      } else {
        setError(err.response?.data?.detail || 'Failed to save assignments')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading && !course) {
    return <LoadingState />
  }

  if (error && !course) {
    return <ErrorState error={error} onRetry={loadCourse} />
  }

  if (!course) {
    return <div>Course not found</div>
  }

  const courseName = typeof course.course_template === 'object'
    ? course.course_template.name
    : 'N/A'

  const currentInstructor = typeof course.instructor === 'object'
    ? course.instructor
    : null

  const currentStudents = course.students || []

  return (
    <div>
      <h1>Course: {course.get_full_code} - {courseName}</h1>

      <div style={{ marginBottom: '2rem' }}>
        <p><strong>Semester:</strong> {course.semester}</p>
        <p><strong>Year:</strong> {course.year}</p>
      </div>

      {/* Assignment Section */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2>Assignments</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            <strong>Instructor:</strong>
            <input
              type="number"
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              placeholder="Instructor ID"
              style={{ marginLeft: '0.5rem', padding: '0.5rem' }}
            />
          </label>
          {currentInstructor && (
            <p style={{ marginTop: '0.5rem', color: '#666' }}>
              Current: {currentInstructor.first_name} {currentInstructor.last_name}
            </p>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            <strong>Student IDs (comma-separated):</strong>
            <input
              type="text"
              value={studentIdsInput}
              onChange={(e) => setStudentIdsInput(e.target.value)}
              placeholder="e.g., 1, 2, 3"
              style={{ marginLeft: '0.5rem', padding: '0.5rem', width: '300px' }}
            />
          </label>
          <p style={{ marginTop: '0.5rem', color: '#666' }}>
            Current: {course.students_count || enrolledStudents.length} students
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Save Assignments
        </button>

        {error && error.includes('not available') && (
          <p style={{ marginTop: '1rem', color: '#d32f2f' }}>
            {error}
          </p>
        )}
      </div>

      {/* Chosen Students List */}
      <div>
        <h2>Chosen Students</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Displaying details for Student IDs in the input above.
        </p>
        {enrolledStudents.length === 0 ? (
          <p>No students selected</p>
        ) : (
          <DataTable
            columns={[
              { header: 'Student ID', accessor: 'student_id' },
              { header: 'First Name', accessor: 'first_name' },
              { header: 'Last Name', accessor: 'last_name' },
              { header: 'Email', accessor: 'email' },
            ]}
            data={enrolledStudents}
          />
        )}
      </div>
    </div>
  )
}

export default DeptCourseDetail

