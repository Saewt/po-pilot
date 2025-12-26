import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import InstructorCoursesToolbar from '../../components/InstructorCoursesToolbar'
import '../../styles/pages.css'

const InstructorCourses = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [courses, setCourses] = useState([])

  const [searchTerm, setSearchTerm] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

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

  const filterOptions = useMemo(() => {
    const years = [...new Set(courses.map(c => c.year))].sort((a, b) => b - a)
    return { years }
  }, [courses])

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const searchLower = searchTerm.toLowerCase()
      const code = (course.full_code || course.code || '').toLowerCase()
      const name = (course.course_name || course.course_template?.name || '').toLowerCase()
      
      const matchesSearch = !searchTerm || 
        code.includes(searchLower) || 
        name.includes(searchLower)

      const matchesSemester = !semesterFilter || course.semester === semesterFilter
      const matchesYear = !yearFilter || String(course.year) === String(yearFilter)

      return matchesSearch && matchesSemester && matchesYear
    })
  }, [courses, searchTerm, semesterFilter, yearFilter])

  const resetFilters = () => {
    setSearchTerm('')
    setSemesterFilter('')
    setYearFilter('')
  }

  const getSemesterBadgeClass = (semester) => {
    switch (semester) {
      case 'FALL': return 'badge badge-warning';
      case 'SPRING': return 'badge badge-success';
      case 'SUMMER': return 'badge badge-info';
      default: return 'badge';
    }
  };

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
    {
      header: 'Session',
      accessor: 'semester',
      render: (row) => (
        <span className={getSemesterBadgeClass(row.semester)}>
          {row.semester} {row.year}
        </span>
      )
    },
    {
      header: 'Students',
      accessor: 'students_count',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: '500' }}>
                {Array.isArray(row.students) ? row.students.length : (row.students_count || 0)}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>enrolled</span>
        </div>
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/app/instructor/courses/${row.id}/assessments`)
            }}
            style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.875rem',
                backgroundColor: '#e0f2f1',
                color: '#00695c',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
            }}
          >
            Assessments
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">My Courses</h1>
      
      <InstructorCoursesToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        semesterFilter={semesterFilter}
        onSemesterChange={setSemesterFilter}
        yearFilter={yearFilter}
        onYearChange={setYearFilter}
        years={filterOptions.years}
        onReset={resetFilters}
      />

      <DataTable 
        columns={columns} 
        data={filteredCourses}
        emptyMessage="No courses found."
      />
    </div>
  )
}

export default InstructorCourses
