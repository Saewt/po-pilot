import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * Instructor Course Students Page
 * Shows enrolled students for a course
 */
const InstructorCourseStudents = () => {
  const { courseId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [course, setCourse] = useState(null)
  const [students, setStudents] = useState([])

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  const loadCourseData = async () => {
    try {
      setLoading(true)
      setError(null)

      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)

      // Extract students from course detail
      const courseStudents = courseData.students || []
      setStudents(courseStudents)

    } catch (err) {
      console.error('Failed to load course data:', err)
      setError(err.response?.data?.detail || 'Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadCourseData} />
  }

  if (!course) {
    return <div>Course not found</div>
  }

  const courseName = typeof course.course_template === 'object'
    ? course.course_template.name
    : 'N/A'

  const columns = [
    { header: 'Student ID', accessor: 'student_id' },
    { header: 'First Name', accessor: 'first_name' },
    { header: 'Last Name', accessor: 'last_name' },
    { header: 'Email', accessor: 'email' },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">Students: {course.get_full_code} - {courseName}</h1>
      <p className="text-secondary" style={{ marginBottom: 'var(--spacing-md)' }}>
        <strong>Total Students:</strong> {course.students_count || students.length}
      </p>
      <DataTable columns={columns} data={students} />
    </div>
  )
}

export default InstructorCourseStudents

