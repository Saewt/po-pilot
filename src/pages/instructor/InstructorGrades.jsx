import { useState, useEffect } from 'react'
import { assessmentsAPI } from '../../api/assessments'
import { gradesAPI } from '../../api/grades'
import { coursesAPI } from '../../api/courses'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import CsvUpload from '../../components/CsvUpload'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

const InstructorGrades = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [score, setScore] = useState('')
  const [grades, setGrades] = useState([])
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [assessmentsRes, gradesRes, coursesRes] = await Promise.all([
        assessmentsAPI.list(),
        gradesAPI.list(),
        coursesAPI.list(),
      ])

      setAssessments(assessmentsRes.results || [])
      setGrades(gradesRes.results || [])
      setCourses(coursesRes.results || [])

      const allStudents = []
      coursesRes.results?.forEach(course => {
        if (course.students && Array.isArray(course.students)) {
          course.students.forEach(student => {
            if (!allStudents.find(s => s.id === student.id)) {
              allStudents.push(student)
            }
          })
        }
      })
      setStudents(allStudents)

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
      alert('Grades uploaded successfully!')
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
      alert('Grade saved successfully!')
    } catch (err) {
      console.error('Failed to save grade:', err)
      setError(err.response?.data?.detail || 'Failed to save grade')
    } finally {
      setLoading(false)
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
    { header: 'Score', accessor: 'score' },
    {
      header: 'Percentage',
      accessor: 'percentage',
      render: (row) => row.percentage ? `${row.percentage}%` : 'N/A'
    },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">Grades Management</h1>

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
                      {assessment.name} ({assessment.course_instance})
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
        <h2 className="section-title">All Grades</h2>
        <DataTable columns={gradeColumns} data={grades} />
      </div>
    </div>
  )
}

export default InstructorGrades
