import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { assessmentsAPI } from '../../api/assessments'
import { gradesAPI } from '../../api/grades'
import { coursesAPI } from '../../api/courses'
import { useToast } from '../../context/ToastContext'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import ConfirmationModal from '../../components/ConfirmationModal'
import CsvUpload from '../../components/CsvUpload'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

const InstructorGrades = () => {
  const { courseId } = useParams()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [score, setScore] = useState('')
  const [grades, setGrades] = useState([])
  const [course, setCourse] = useState(null)

  const [students, setStudents] = useState([])
  const [filterAssessmentId, setFilterAssessmentId] = useState('')

  // Editing State
  const [editingId, setEditingId] = useState(null)
  const [editScore, setEditScore] = useState('')

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [gradeToDelete, setGradeToDelete] = useState(null)

  useEffect(() => {
    loadData()
  }, [courseId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch course, assessments for this course, and grades
      const [courseRes, assessmentsRes, gradesRes] = await Promise.all([
        coursesAPI.get(courseId),
        assessmentsAPI.list({ course_instance: courseId }),
        gradesAPI.list(), // If API supports filtering by course, add it here. e.g. { course_id: courseId }
      ])

      setCourse(courseRes)
      const courseAssessments = assessmentsRes.results || assessmentsRes || []
      setAssessments(courseAssessments)

      // Filter grades that belong to assessments of this course
      const assessmentIds = new Set(courseAssessments.map(a => a.id))
      const allGrades = gradesRes.results || gradesRes || []
      const courseGrades = allGrades.filter(g => {
        const gInfo = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
        return assessmentIds.has(gInfo)
      })

      setGrades(courseGrades)
      setStudents(courseRes.students || [])

    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCsvUpload = async (rows) => {
    try {
      setLoading(true)
      setError(null)

      for (const row of rows) {
        const assessmentId = parseInt(row.assessment_id || row.assessment)
        const studentId = parseInt(row.student_id || row.student)
        const scoreValue = parseFloat(row.score)

        if (!assessmentId || !studentId || isNaN(scoreValue)) {
          console.warn('Skipping invalid row:', row)
          continue
        }

        const existingGrade = grades.find(
          g => g.assessment === assessmentId && g.student === studentId
        )

        const gradeData = {
          assessment_id: assessmentId,
          student_id: studentId,
          score: scoreValue.toString(),
        }

        if (existingGrade) {
          await gradesAPI.patch(existingGrade.id, gradeData)
        } else {
          await gradesAPI.create(gradeData)
        }
      }

      await loadData()
      addToast('Grades uploaded successfully!', 'success')
    } catch (err) {
      console.error('Failed to upload grades:', err)
      setError(err.response?.data?.detail || 'Failed to upload grades')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSave = async () => {
    if (!selectedAssessment || !selectedStudent || !score) {
      setError('Please fill all fields')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const assessmentId = parseInt(selectedAssessment)
      const studentId = parseInt(selectedStudent)
      const scoreValue = parseFloat(score)

      const existingGrade = grades.find(
        g => g.assessment === assessmentId && g.student === studentId
      )

      const gradeData = {
        assessment_id: assessmentId,
        student_id: studentId,
        score: scoreValue.toString(),
      }

      if (existingGrade) {
        await gradesAPI.patch(existingGrade.id, gradeData)
      } else {
        await gradesAPI.create(gradeData)
      }

      setSelectedAssessment('')
      setSelectedStudent('')
      setScore('')

      await loadData()
      addToast('Grade saved successfully!', 'success')
    } catch (err) {
      console.error('Failed to save grade:', err)
      setError(err.response?.data?.detail || 'Failed to save grade')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (grade) => {
    setEditingId(grade.id)
    setEditScore(grade.score)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditScore('')
  }

  const handleSaveEdit = async (id) => {
    try {
      setLoading(true)
      await gradesAPI.patch(id, { score: editScore.toString() })
      await loadData()
      addToast('Grade updated successfully', 'success')
      setEditingId(null)
      setEditScore('')
    } catch (err) {
      console.error(err)
      addToast('Failed to update grade', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (grade) => {
    setGradeToDelete(grade)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!gradeToDelete) return
    try {
      await gradesAPI.delete(gradeToDelete.id)
      addToast('Grade deleted successfully', 'success')
      setIsDeleteModalOpen(false)
      setGradeToDelete(null)
      await loadData()
    } catch (err) {
      console.error(err)
      addToast('Failed to delete grade', 'error')
    }
  }

  if (loading && grades.length === 0) {
    return <LoadingState />
  }

  const gradeColumns = [
    {
      header: 'Assessment',
      accessor: 'assessment',
      render: (row) => {
        const assessment = typeof row.assessment === 'object'
          ? row.assessment
          : assessments.find(a => a.id === row.assessment)
        return assessment?.name || 'N/A'
      }
    },
    {
      header: 'Student',
      accessor: 'student',
      render: (row) => {
        const student = typeof row.student === 'object'
          ? row.student
          : students.find(s => s.id === row.student)
        return student
          ? `${student.first_name} ${student.last_name} (${student.student_id || 'N/A'})`
          : 'N/A'
      }
    },
    {
      header: 'Score',
      accessor: 'score',
      render: (row) => {
        if (editingId === row.id) {
          return (
            <input
              type="number"
              value={editScore}
              onChange={(e) => setEditScore(e.target.value)}
              className="form-input py-1 px-2 text-sm w-24"
              autoFocus
            />
          )
        }
        return row.score
      }
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => {
        if (editingId === row.id) {
          return (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleSaveEdit(row.id)} className="btn btn-sm btn-success">Save</button>
              <button onClick={handleCancelEdit} className="btn btn-sm btn-secondary">Cancel</button>
            </div>
          )
        }
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleEditClick(row)} className="btn btn-sm btn-primary">Edit</button>
            <button onClick={() => handleDeleteClick(row)} className="btn btn-sm btn-danger">Delete</button>
          </div>
        )
      }
    }
  ]

  const filteredGrades = filterAssessmentId
    ? grades.filter(g => {
      const aId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
      return String(aId) === String(filterAssessmentId)
    })
    : grades

  return (
    <div className="page-container">
      <h1 className="page-title">{course ? `${course.full_code || course.code} - Grades` : 'Grades Management'}</h1>

      {error && <ErrorState error={error} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        <div className="info-card">
          <h2 className="section-title">CSV Upload</h2>
          <p className="text-secondary" style={{ marginBottom: '1rem' }}>
            Upload CSV file with columns: <code>assessment_id</code>, <code>student_id</code>, <code>score</code>
          </p>
          <CsvUpload onUpload={handleCsvUpload} />
        </div>

        <div className="info-card">
          <h2 className="section-title">Manual Entry</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Assessment</label>
              <select
                value={selectedAssessment}
                onChange={(e) => setSelectedAssessment(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="">Select assessment</option>
                {assessments.map(assessment => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.name} {assessment.assessment_type ? `(${assessment.assessment_type})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="">Select student</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} ({student.student_id || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Score</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <button
              onClick={handleManualSave}
              disabled={loading}
              className="btn btn-primary"
              style={{ alignSelf: 'flex-end' }}
            >
              Save Grade
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>All Grades</h2>
          <div style={{ width: '250px' }}>
            <select
              className="form-select" // Assuming generic class exists or style it manually
              value={filterAssessmentId}
              onChange={(e) => setFilterAssessmentId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">All Assessments</option>
              {assessments.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
        <DataTable columns={gradeColumns} data={filteredGrades} compact={true} />
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Grade"
        message="Are you sure you want to delete this grade? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div >
  )
}

export default InstructorGrades
