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
import FinalizationChecklist from '../../components/FinalizationChecklist'
import FinalizeCourseButton from '../../components/FinalizeCourseButton'
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
  const [bulkAssessment, setBulkAssessment] = useState('')
  const [bulkPreview, setBulkPreview] = useState(null) // { valid: [], invalid: [], rows: [] }

  // Editing State
  const [editingId, setEditingId] = useState(null)
  const [editScore, setEditScore] = useState('')

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [gradeToDelete, setGradeToDelete] = useState(null)

  // Bulk Delete State
  const [selectedGradeIds, setSelectedGradeIds] = useState(new Set())
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

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
        gradesAPI.list({ limit: 100 }), // If API supports filtering by course, add it here. e.g. { course_id: courseId }
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

  // Parse CSV and show preview (not saving yet)
  const handleCsvParse = (rows) => {
    if (!bulkAssessment) {
      setError('Please select an assessment first')
      return
    }

    const assessmentId = parseInt(bulkAssessment)
    const assessment = assessments.find(a => a.id === assessmentId)
    const maxScore = parseFloat(assessment?.max_score || 100)

    const valid = []
    const invalid = []

    for (const row of rows) {
      const studentIdInput = row.student_id || row.studentId || row.StudentID || row.student
      const scoreValue = parseFloat(row.score || row.Score || row.SCORE)

      if (!studentIdInput) {
        invalid.push({ ...row, reason: 'Missing student_id' })
        continue
      }

      if (isNaN(scoreValue)) {
        invalid.push({ ...row, reason: 'Invalid score' })
        continue
      }

      // Find student by student_id
      const student = students.find(s =>
        s.student_id === studentIdInput ||
        s.student_id === String(studentIdInput) ||
        s.id === parseInt(studentIdInput)
      )

      if (!student) {
        invalid.push({ ...row, studentIdInput, reason: 'Student not found' })
        continue
      }

      // Check if score is within valid range
      if (scoreValue < 0 || scoreValue > maxScore) {
        invalid.push({ ...row, studentIdInput, reason: `Score must be 0-${maxScore}` })
        continue
      }

      // Check if grade already exists
      const existingGrade = grades.find(g => {
        const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
        const gStudentId = typeof g.student === 'object' ? g.student.id : g.student
        return gAssessmentId === assessmentId && gStudentId === student.id
      })

      valid.push({
        student,
        studentIdInput,
        score: scoreValue,
        isUpdate: !!existingGrade,
        existingGradeId: existingGrade?.id,
        existingScore: existingGrade?.score
      })
    }

    setBulkPreview({ valid, invalid, assessmentId, assessmentName: assessment?.name })
  }

  // Confirm and save previewed grades
  const handleConfirmBulkUpload = async () => {
    if (!bulkPreview || bulkPreview.valid.length === 0) return

    try {
      setLoading(true)
      setError(null)

      let successCount = 0
      let errorCount = 0

      for (const item of bulkPreview.valid) {
        const gradeData = {
          assessment_id: bulkPreview.assessmentId,
          student_id: item.student.id,
          score: item.score.toString(),
        }

        try {
          if (item.isUpdate && item.existingGradeId) {
            await gradesAPI.patch(item.existingGradeId, gradeData)
          } else {
            await gradesAPI.create(gradeData)
          }
          successCount++
        } catch (err) {
          console.error('Failed to save grade:', err)
          errorCount++
        }
      }

      await loadData()

      if (errorCount === 0) {
        addToast(`${successCount} grades saved successfully!`, 'success')
      } else {
        addToast(`${successCount} saved, ${errorCount} failed`, 'warning')
      }

      setBulkPreview(null)
      setBulkAssessment('')
    } catch (err) {
      console.error('Failed to upload grades:', err)
      setError(err.response?.data?.detail || 'Failed to upload grades')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBulkUpload = () => {
    setBulkPreview(null)
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

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedGradeIds.size === filteredGrades.length) {
      setSelectedGradeIds(new Set())
    } else {
      setSelectedGradeIds(new Set(filteredGrades.map(g => g.id)))
    }
  }

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedGradeIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedGradeIds(newSelected)
  }

  // Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (selectedGradeIds.size === 0) return

    try {
      setBulkDeleteLoading(true)
      let successCount = 0
      let errorCount = 0

      for (const gradeId of selectedGradeIds) {
        try {
          await gradesAPI.delete(gradeId)
          successCount++
        } catch (err) {
          console.error('Failed to delete grade:', err)
          errorCount++
        }
      }

      setIsBulkDeleteModalOpen(false)
      setSelectedGradeIds(new Set())
      await loadData()

      if (errorCount === 0) {
        addToast(`Successfully deleted ${successCount} grade(s)`, 'success')
      } else {
        addToast(`Deleted ${successCount}, failed ${errorCount}`, 'warning')
      }
    } catch (err) {
      console.error('Bulk delete failed:', err)
      addToast('Failed to delete grades', 'error')
    } finally {
      setBulkDeleteLoading(false)
    }
  }

  if (loading && grades.length === 0) {
    return <LoadingState />
  }

  const gradeColumns = [
    {
      header: () => (
        <input
          type="checkbox"
          checked={filteredGrades.length > 0 && selectedGradeIds.size === filteredGrades.length}
          onChange={handleSelectAll}
          title="Select all"
        />
      ),
      accessor: 'select',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedGradeIds.has(row.id)}
          onChange={() => handleSelectOne(row.id)}
        />
      ),
      sortable: false
    },
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
          <h2 className="section-title">Bulk Upload</h2>

          {!bulkPreview ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '0.375rem',
                  display: 'block'
                }}>Select Assessment</label>
                <select
                  value={bulkAssessment}
                  onChange={(e) => setBulkAssessment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                    fontSize: '0.9375rem',
                    color: '#1f2937',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                >
                  <option value="">Select assessment for bulk upload</option>
                  {assessments.map(assessment => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.name} {assessment.assessment_type ? `(${assessment.assessment_type})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>
                Upload CSV file with columns: <code>student_id</code>, <code>score</code>
              </p>
              <CsvUpload onUpload={handleCsvParse} disabled={!bulkAssessment} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
                  Preview: {bulkPreview.assessmentName}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    borderRadius: '9999px',
                    fontSize: '0.8125rem',
                    fontWeight: 600
                  }}>
                    {bulkPreview.valid.length} valid
                  </span>
                  {bulkPreview.invalid.length > 0 && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      borderRadius: '9999px',
                      fontSize: '0.8125rem',
                      fontWeight: 600
                    }}>
                      {bulkPreview.invalid.length} invalid
                    </span>
                  )}
                </div>
              </div>

              {/* Valid grades table */}
              {bulkPreview.valid.length > 0 && (
                <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                  <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Student ID</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Score</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.valid.map((item, idx) => (
                        <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{item.student.student_id}</td>
                          <td style={{ padding: '0.5rem' }}>{item.student.first_name} {item.student.last_name}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{item.score}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            {item.isUpdate ? (
                              <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>Update ({item.existingScore}→{item.score})</span>
                            ) : (
                              <span style={{ color: '#16a34a', fontSize: '0.75rem' }}>New</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Invalid rows */}
              {bulkPreview.invalid.length > 0 && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    Skipped rows:
                  </div>
                  <div style={{ maxHeight: '100px', overflow: 'auto', fontSize: '0.8125rem', color: '#b91c1c' }}>
                    {bulkPreview.invalid.slice(0, 10).map((item, idx) => (
                      <div key={idx}>• {item.studentIdInput || item.student_id || 'Unknown'}: {item.reason}</div>
                    ))}
                    {bulkPreview.invalid.length > 10 && (
                      <div style={{ fontStyle: 'italic' }}>...and {bulkPreview.invalid.length - 10} more</div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCancelBulkUpload}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBulkUpload}
                  className="btn btn-primary"
                  disabled={loading || bulkPreview.valid.length === 0}
                >
                  {loading ? 'Saving...' : `Save ${bulkPreview.valid.length} Grades`}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="info-card">
          <h2 className="section-title">Manual Entry</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '0.25rem' }}>
              <label style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.375rem',
                display: 'block'
              }}>Assessment</label>
              <select
                value={selectedAssessment}
                onChange={(e) => setSelectedAssessment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontSize: '0.9375rem',
                  color: '#1f2937',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select assessment</option>
                {assessments.map(assessment => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.name} {assessment.assessment_type ? `(${assessment.assessment_type})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '0.25rem' }}>
              <label style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.375rem',
                display: 'block'
              }}>Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontSize: '0.9375rem',
                  color: '#1f2937',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select student</option>
                {students.filter(student => {
                  // If no assessment selected, show all students
                  if (!selectedAssessment) return true
                  // Filter out students who already have a grade for this assessment
                  const assessmentId = parseInt(selectedAssessment)
                  const hasGrade = grades.some(g => {
                    const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
                    const gStudentId = typeof g.student === 'object' ? g.student.id : g.student
                    return gAssessmentId === assessmentId && gStudentId === student.id
                  })
                  return !hasGrade
                }).map(student => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} ({student.student_id || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '0.25rem' }}>
              <label style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.375rem',
                display: 'block'
              }}>Score</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Enter score"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.9375rem',
                  color: '#1f2937'
                }}
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
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={handleSelectAll}
              style={{ fontSize: '0.875rem' }}
            >
              {selectedGradeIds.size === filteredGrades.length && filteredGrades.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            {selectedGradeIds.size > 0 && (
              <button
                className="btn btn-danger"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                style={{ fontSize: '0.875rem' }}
              >
                Delete Selected ({selectedGradeIds.size})
              </button>
            )}
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
        </div>
        <DataTable columns={gradeColumns} data={filteredGrades} compact={true} />
      </div>

      {/* Finalization Section */}
      {course && !course.is_finalized && (
        <div className="info-card" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Course Finalization</h2>
            <button
              onClick={() => window.location.href = `/app/instructor/courses/${courseId}/summary`}
              className="btn btn-secondary"
              style={{ fontSize: '0.875rem' }}
            >
              View Summary
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'start' }}>
            <FinalizationChecklist
              assessments={assessments}
              grades={grades}
              students={students}
            />
            <FinalizeCourseButton
              courseId={courseId}
              disabled={false}
            />
          </div>
        </div>
      )}

      {course && course.is_finalized && (
        <div className="info-card" style={{ marginTop: '2rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#16a34a' }}>Course Finalized</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#15803d' }}>
                  {course.finalized_at ? `Finalized on ${new Date(course.finalized_at).toLocaleDateString()}` : 'Grades are locked.'}
                  {course.finalized_by_name && ` by ${course.finalized_by_name}`}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to unfinalize this course? This will unlock grades for editing.')) {
                  try {
                    await coursesAPI.unfinalize(courseId)
                    addToast('Course unfinalized successfully', 'success')
                    loadData()
                  } catch (err) {
                    console.error('Unfinalize failed:', err)
                    addToast(err.response?.data?.detail || 'Failed to unfinalize course', 'error')
                  }
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fcd34d',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 018-4" />
              </svg>
              Unfinalize
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Grade"
        message="Are you sure you want to delete this grade? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />

      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Grades"
        message={`Are you sure you want to delete ${selectedGradeIds.size} grade(s)? This action cannot be undone.`}
        confirmText={bulkDeleteLoading ? 'Deleting...' : 'Delete All'}
        confirmVariant="danger"
      />
    </div >
  )
}

export default InstructorGrades
