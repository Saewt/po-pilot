import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * Student Course Detail Page
 * Shows LO-PO mapping for a specific course
 */
const StudentCourseDetail = () => {
  const { courseId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [course, setCourse] = useState(null)
  const [loPoMapping, setLoPoMapping] = useState([])

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  const loadCourseData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch course details
      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)

      // Get course template ID
      const courseTemplateId = typeof courseData.course_template === 'object'
        ? courseData.course_template.id
        : courseData.course_template

      // Fetch learning outcomes for this course
      const loResponse = await learningOutcomesAPI.list({
        course_template: courseTemplateId,
      })
      const learningOutcomesList = loResponse.results || []

      // Fetch details for each LO to get po_contributions
      const loDetailsPromises = learningOutcomesList.map(lo =>
        learningOutcomesAPI.get(lo.id)
      )

      const loDetails = await Promise.all(loDetailsPromises)

      // Map details to the State
      const mapping = loDetails.map(lo => ({
        lo,
        contributionsString: lo.po_contributions
      }))

      setLoPoMapping(mapping)

    } catch (err) {
      console.error('Failed to load course data:', err)
      setError(err.response?.data?.detail || 'Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadCourseData} />
  }

  if (!course) {
    return <div>Course not found</div>
  }

  const courseName = typeof course.course_template === 'object'
    ? course.course_template.name
    : 'N/A'

  return (
    <div className="page-container">
      <h1 className="page-title">Course: {course.get_full_code} - {courseName}</h1>

      <div className="info-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="info-row">
          <span className="info-label">Semester:</span>
          <span className="info-value">{course.semester}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Year:</span>
          <span className="info-value">{course.year}</span>
        </div>
      </div>

      <div>
        <h2 className="section-title">Learning Outcomes - Program Outcomes Mapping</h2>
        {loPoMapping.length === 0 ? (
          <p className="text-secondary">No LO-PO mapping available for this course.</p>
        ) : (
          <div>
            {loPoMapping.map((item, idx) => {
              const lo = item.lo
              const contributionsString = item.contributionsString

              return (
                <div key={idx} className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h3 className="section-subtitle">{lo.code}: {lo.description}</h3>
                  {(!contributionsString || contributionsString === 'None') ? (
                    <p className="text-secondary">No PO contributions</p>
                  ) : (
                    <div className="data-table-wrapper" style={{ marginTop: 'var(--spacing-md)' }}>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{contributionsString}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentCourseDetail

