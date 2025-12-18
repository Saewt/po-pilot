import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { coursesAPI } from '../../api/courses'
import { gradesAPI } from '../../api/grades'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import { loPoContributionsAPI } from '../../api/loPoContributions'
import { assessmentsAPI } from '../../api/assessments'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * Student Home Page
 * Shows average success (computed from LO/PO attainment) and courses list
 */
const StudentHome = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [averageSuccess, setAverageSuccess] = useState(null)
  const [courses, setCourses] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch student's courses
      const coursesResponse = await coursesAPI.list()
      const studentCourses = coursesResponse.results || []

      setCourses(studentCourses)

      // Compute average success from LO/PO attainment
      await computeAverageSuccess(studentCourses)

    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const computeAverageSuccess = async (studentCourses) => {
    try {
      // Get all grades for the student
      const gradesResponse = await gradesAPI.list()
      const studentGrades = (gradesResponse.results || []).filter(
        grade => grade.student === user.id
      )

      if (studentGrades.length === 0) {
        setAverageSuccess(null)
        return
      }

      // Get all assessments to map grades to assessments
      const assessmentsResponse = await assessmentsAPI.list()
      const assessments = assessmentsResponse.results || []

      // Get all learning outcomes for courses
      const allLOs = []
      for (const course of studentCourses) {
        try {
          const courseTemplateId = course.course_template
          const loResponse = await learningOutcomesAPI.list({
            course_template: courseTemplateId,
          })
          if (loResponse.results) {
            allLOs.push(...loResponse.results)
          }
        } catch (err) {
          console.warn('Failed to fetch LOs for course:', err)
        }
      }

      // Get all LO-PO contributions
      const contributionsResponse = await loPoContributionsAPI.list()
      const contributions = contributionsResponse.results || []

      // Compute LO attainment from grades
      const loAttainments = {}
      for (const grade of studentGrades) {
        const assessment = assessments.find(a => a.id === grade.assessment)
        if (!assessment) continue

        const courseInstanceId = assessment.course_instance
        const course = studentCourses.find(c => c.id === courseInstanceId)
        if (!course) continue

        // Find LOs for this course
        const courseLOs = allLOs.filter(lo => lo.course_template === course.course_template)

        // For each LO, compute contribution from this assessment
        // Note: This is simplified - in reality, you'd need assessment-LO mapping
        // For now, we'll compute a basic average
        const assessmentWeight = parseFloat(assessment.weight || 0)
        const gradePercentage = parseFloat(grade.percentage || 0)

        courseLOs.forEach(lo => {
          if (!loAttainments[lo.id]) {
            loAttainments[lo.id] = { total: 0, weight: 0 }
          }
          loAttainments[lo.id].total += gradePercentage * assessmentWeight
          loAttainments[lo.id].weight += assessmentWeight
        })
      }

      // Compute PO attainment from LO-PO contributions
      const poAttainments = {}
      for (const [loId, loData] of Object.entries(loAttainments)) {
        const loAttainment = loData.weight > 0 ? loData.total / loData.weight : 0

        const loContributions = contributions.filter(c => c.learning_outcome === loId)
        loContributions.forEach(contrib => {
          const poId = contrib.program_outcome
          const weight = parseFloat(contrib.weight || 0)

          if (!poAttainments[poId]) {
            poAttainments[poId] = { total: 0, weight: 0 }
          }
          poAttainments[poId].total += loAttainment * weight
          poAttainments[poId].weight += weight
        })
      }

      // Compute overall average
      let totalPO = 0
      let countPO = 0
      for (const [poId, poData] of Object.entries(poAttainments)) {
        if (poData.weight > 0) {
          totalPO += poData.total / poData.weight
          countPO++
        }
      }

      const average = countPO > 0 ? totalPO / countPO : null
      setAverageSuccess(average)

    } catch (err) {
      console.error('Failed to compute average success:', err)
      // Show note if calculation fails
      setAverageSuccess('calculation_error')
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadData} />
  }

  const courseColumns = [
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
    {
      header: 'Instructor',
      accessor: 'instructor',
      render: (row) => {
        if (row.instructor_name) return row.instructor_name
        return row.instructor?.name || 'N/A'
      }
    },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">Student Home</h1>

      {/* Average Success */}
      <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 className="section-title">Average Success (Ortalama Başarı)</h2>
        {averageSuccess === null ? (
          <p className="text-secondary">No grade data available to compute average success.</p>
        ) : averageSuccess === 'calculation_error' ? (
          <p className="text-error">
            LO/PO attainment calculation not supported by current API fields.
            Please check console for details.
          </p>
        ) : (
          <div className="success-display">
            <span className="success-value">{averageSuccess.toFixed(2)}%</span>
          </div>
        )}
      </div>

      {/* Courses List */}
      <div>
        <h2 className="section-title">My Courses</h2>
        <DataTable
          columns={courseColumns}
          data={courses}
          onRowClick={(row) => navigate(`/app/student/courses/${row.id}`)}
        />
      </div>
    </div>
  )
}

export default StudentHome

