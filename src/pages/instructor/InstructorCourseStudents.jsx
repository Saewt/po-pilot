import { useState, useEffect } from 'react'

import { useParams, useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'

import { useToast } from '../../context/ToastContext'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import ConfirmationModal from '../../components/ConfirmationModal'
import '../../styles/pages.css'

/**
 * Instructor Course Students Page
 * Shows enrolled students for a course and allows enrolling new ones
 */
const InstructorCourseStudents = () => {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { courseId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [course, setCourse] = useState(null)
  const [students, setStudents] = useState([])

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState(null)

  useEffect(() => {
    loadData()
  }, [courseId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)
      const processedStudents = (courseData.students || []).map(s => ({
        ...s,
        full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim()
      }))
      setStudents(processedStudents)

    } catch (err) {
      console.error('Failed to load course data:', err)
      setError(err.response?.data?.detail || 'Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveClick = (student) => {
    setStudentToDelete(student)
    setIsDeleteModalOpen(true)
  }

  const confirmRemove = async () => {
    if (!studentToDelete) return
    try {
      await coursesAPI.unenroll_student(courseId, { student_id: studentToDelete.student_id })
      addToast('Student removed successfully', 'success')
      setIsDeleteModalOpen(false)
      setStudentToDelete(null)
      loadData()
    } catch (err) {
      console.error(err)
      addToast('Failed to remove student', 'error')
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

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">{course.full_code || course.code} - {courseName}</h1>
          <div style={{ display: 'flex', gap: '1rem', color: '#64748b' }}>
            <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>
              {course.semester} {course.year}
            </span>
            <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
              {course.students_count || students.length} Students
            </span>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/app/instructor/courses/${courseId}/enroll`)}
        >
          Enroll Students
        </button>
      </div>

      <div className="info-card p-0 overflow-hidden">
        {students.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No students enrolled yet.
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: 'Student ID',
                accessor: 'student_id',
                render: r => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.student_id || 'N/A'}</span>,
                sortable: true
              },
              {
                header: 'Name',
                accessor: 'full_name',
                render: r => <span style={{ fontWeight: 500 }}>{r.full_name || 'N/A'}</span>,
                sortable: true
              },
              { header: 'Email', accessor: 'email', sortable: true },
              { header: 'Enrollment Year', accessor: 'enrollment_year', render: r => r.enrollment_year || '-', sortable: true },
              { header: 'Class Year', accessor: 'class_year', render: r => r.class_year || '-', sortable: true },
              {
                header: 'Actions',
                accessor: 'id',
                render: (row) => (
                  <button
                    onClick={() => handleRemoveClick(row)}
                    className="btn btn-sm btn-danger"
                  >
                    Remove
                  </button>
                )
              }
            ]}
            data={students}
            pagination={true}
            itemsPerPage={10}
          />
        )}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmRemove}
        title="Remove Student"
        message={`Are you sure you want to remove ${studentToDelete?.full_name} from this course?`}
        confirmText="Remove"
        confirmVariant="danger"
      />
    </div>
  )
}

export default InstructorCourseStudents
