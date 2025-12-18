import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * DeptHead Courses Page
 * List of department courses
 */
const DeptCourses = () => {
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
    { header: 'Course Code', accessor: 'full_code' },
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
      header: 'Active',
      accessor: 'is_active',
      render: (row) => row.is_active ? 'Yes' : 'No'
    },
    {
      header: 'Instructor',
      accessor: 'instructor',
      render: (row) => {
        if (typeof row.instructor === 'string') return row.instructor
        if (row.instructor_name) return row.instructor_name
        if (typeof row.instructor === 'object' && row.instructor) {
          return `${row.instructor.first_name} ${row.instructor.last_name}`
        }
        return 'N/A'
      }
    },
    {
      header: 'Students',
      accessor: 'students_count',
      render: (row) => row.students_count || (row.students?.length || 0)
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/app/dept/${row.id}`)
          }}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.875rem',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          View Details
        </button>
      )
    },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">Department Courses</h1>
      <DataTable columns={columns} data={courses} />
    </div>
  )
}

export default DeptCourses

