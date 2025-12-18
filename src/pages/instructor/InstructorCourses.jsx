import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * Instructor Courses Page
 * List of courses with actions
 */
const InstructorCourses = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [courses, setCourses] = useState([])

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await coursesAPI.list()
      setCourses(response.results || [])
    } catch (err) {
      console.error('Failed to load courses:', err)
      setError(err.response?.data?.detail || 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadCourses} />
  }

  const columns = [
    { header: 'Course Code', accessor: 'get_full_code' },
    {
      header: 'Course Name',
      accessor: 'course_template',
      render: (row) => {
        const template = typeof row.course_template === 'object'
          ? row.course_template
          : null
        return template?.name || 'N/A'
      }
    },
    { header: 'Semester', accessor: 'semester' },
    { header: 'Year', accessor: 'year' },
    {
      header: 'Students',
      accessor: 'students_count',
      render: (row) => row.students_count || (row.students?.length || 0)
    },
    {
      header: 'Approval Status',
      accessor: 'id',
      render: (row) => {
        // Check if course has approved LO-PO contributions
        // This would need to be fetched separately or included in course detail
        return <span style={{ color: 'orange' }}>Pending</span>
      }
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="action-buttons">
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/app/instructor/courses/${row.id}/lo-po`)
            }}
            className="btn btn-primary"
            style={{ fontSize: '0.875rem', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
          >
            LO-PO
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/app/instructor/courses/${row.id}/students`)
            }}
            className="btn btn-primary"
            style={{ fontSize: '0.875rem', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
          >
            Students
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">My Courses</h1>
      <DataTable columns={columns} data={courses} />
    </div>
  )
}

export default InstructorCourses

