import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

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
      const courseList = response.results || response || []

      // Fetch details for each course to get accurate student counts
      const detailsPromises = courseList.map(c => coursesAPI.get(c.id))
      const detailedCourses = await Promise.all(detailsPromises)

      setCourses(detailedCourses)
    } catch (err) {
      console.error('Failed to load courses:', err)
      setError(err.response?.data?.detail || 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={loadCourses} />

  const columns = [
    {
      header: 'Course',
      accessor: 'full_code',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '600', color: '#1976d2' }}>
            {row.full_code || row.course_template?.code || 'N/A'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            {row.course_name || row.course_template?.name || 'N/A'}
          </div>
        </div>
      )
    },
    { header: 'Semester', accessor: 'semester' },
    { header: 'Year', accessor: 'year' },
    {
      header: 'Students',
      accessor: 'students_count',
      render: (row) => (
        <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
          {row.students_count || (row.students?.length || 0)} Enrolled
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/app/instructor/courses/${row.id}/lo-po`)
            }}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.875rem',
              backgroundColor: '#e3f2fd',
              color: '#1565c0',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Outcomes
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/app/instructor/courses/${row.id}/students`)
            }}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.875rem',
              backgroundColor: '#f3e5f5',
              color: '#7b1fa2',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Students
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">Instructor Dashboard</h1>
      <div className="info-card" style={{ marginBottom: '2rem' }}>
        <p>Welcome back! Here are your active courses for this semester.</p>
      </div>

      <div>
        <h2 className="section-title">My Courses</h2>
        <DataTable columns={columns} data={courses} />
      </div>
    </div>
  )
}

export default InstructorHome
