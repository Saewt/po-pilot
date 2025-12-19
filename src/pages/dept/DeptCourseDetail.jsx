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
 * DeptHead Course Detail Page
 * Shows course details and allows assigning instructor/students
 */
const DeptCourseDetail = () => {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { courseId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [course, setCourse] = useState(null)
  const [deptInstructors, setDeptInstructors] = useState([])

  const [instructorId, setInstructorId] = useState('')

  useEffect(() => {
    loadData()
  }, [courseId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load Course
      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)

      // Initialize Instructor
      const inst = courseData.instructor
      setInstructorId(inst && typeof inst === 'object' ? inst.id : inst || '')



      // Load Department Users for Dropdown/Mapping
      // We assume user.department is available since this is a protected route
      const [instructorsRes] = await Promise.all([
        usersAPI.list({ role: 'INSTRUCTOR', department: user.department }),
      ])

      setDeptInstructors(instructorsRes.results || instructorsRes || [])

    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err.response?.data?.detail || 'Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      // 2. Prepare Update Payload
      const updateData = {
        instructor_id: instructorId ? parseInt(instructorId) : null,
      }

      await coursesAPI.patch(courseId, updateData)

      // Reload to reflect changes
      // We re-fetch course specifically, no need to re-fetch users list
      const updatedCourse = await coursesAPI.get(courseId)
      setCourse(updatedCourse)



      addToast('Course assignments updated successfully!', 'success')
    } catch (err) {
      console.error('Failed to save assignments:', err)
      addToast(err.response?.data?.detail || 'Failed to save assignments', 'error')
    } finally {
      setLoading(false)
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
      <h1 className="page-title">{course.get_full_code} {courseName}</h1>

      <div className="info-card" style={{ marginBottom: '2rem' }}>
        <p><strong>Semester:</strong> {course.semester}</p>
        <p><strong>Year:</strong> {course.year}</p>
      </div>

      {/* Assignment Section */}
      <div className="form-section">
        <h2>Assignments</h2>

        <div className="form-group">
          <label>Instructor:</label>
          <select
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
            style={{ padding: '0.5rem', minWidth: '300px' }}
          >
            <option value="">-- Select Instructor --</option>
            {deptInstructors.map(inst => (
              <option key={inst.id} value={inst.id}>
                {inst.first_name} {inst.last_name} ({inst.email})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="btn btn-primary"
        >
          Save Assignments
        </button>
      </div>

      {/* Chosen Students List */}
      <div>
        <h2 className="section-title">Enrolled Students</h2>
        {displayedStudents.length === 0 ? (
          <p className="text-secondary">No students enrolled</p>
        ) : (
          <DataTable
            columns={[
              { header: 'Student ID', accessor: 'student_id', render: r => r.student_id || 'N/A' },
              { header: 'Name', accessor: 'id', render: r => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'N/A' },
              { header: 'Email', accessor: 'email' },
            ]}
            data={displayedStudents}
          />
        )}
      </div>
    </div>
  )
}

export default DeptCourseDetail

