import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * Student Courses Page
 * List of student's courses
 */
const StudentCourses = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [courses, setCourses] = useState([])

  useEffect(() => {
    loadCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCourses = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await coursesAPI.list()

      // handle both paginated ({ results }) and non-paginated ([])
      const rows = Array.isArray(response) ? response : (response?.results ?? [])
      setCourses(rows)
    } catch (err) {
      console.error('Failed to load courses:', err)
      setError(err.response?.data?.detail || 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo(
    () => [
      // LIST schema uses full_code (string)
      { header: 'Course Code', accessor: 'full_code' },

      // LIST schema uses instructor as string
      {
        header: 'Instructor',
        accessor: 'instructor',
        render: (row) => row.instructor?.name || '-'
      },

      { header: 'Semester', accessor: 'semester' },
      { header: 'Year', accessor: 'year' },
    ],
    []
  )

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={loadCourses} />

  return (
    <div className="page-container">
      <h1 className="page-title">My Courses</h1>
      <DataTable
        columns={columns}
        data={courses}
        onRowClick={(row) => navigate(`/app/student/${row.id}`)}
      />
    </div>
  )
}

export default StudentCourses
