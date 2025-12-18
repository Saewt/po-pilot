import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * Instructor Home Page
 * Shows list of courses the instructor teaches
 */
const InstructorHome = () => {
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
      <h1 className="page-title">Instructor Home</h1>
      <p className="text-secondary" style={{ marginBottom: 'var(--spacing-md)' }}>Courses you are teaching:</p>
      <DataTable columns={columns} data={courses} />
    </div>
  )
}

export default InstructorHome

