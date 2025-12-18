import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import { loPoContributionsAPI } from '../../api/loPoContributions'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import '../../styles/pages.css'

/**
 * Instructor Course LO-PO Page
 * Shows LO-PO mapping for a course (read-only)
 */
const InstructorCourseLoPo = () => {
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

      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)

      const courseTemplateId = typeof courseData.course_template === 'object'
        ? courseData.course_template.id
        : courseData.course_template

      const loResponse = await learningOutcomesAPI.list({
        course_template: courseTemplateId,
      })
      const learningOutcomes = loResponse.results || []

      const contributionsResponse = await loPoContributionsAPI.list()
      const allContributions = contributionsResponse.results || []

      const mapping = learningOutcomes.map(lo => {
        const contributions = allContributions.filter(
          c => c.learning_outcome === lo.id ||
               (typeof c.learning_outcome === 'object' && c.learning_outcome.id === lo.id)
        )
        return { lo, contributions }
      })

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
      <h1 className="page-title">LO-PO Mapping: {course.get_full_code} - {courseName}</h1>

      {loPoMapping.length === 0 ? (
        <p className="text-secondary">No LO-PO mapping available for this course.</p>
      ) : (
        <div>
          {loPoMapping.map((item, idx) => {
            const lo = item.lo
            const contributions = item.contributions

            return (
              <div key={idx} className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 className="section-subtitle">{lo.code}: {lo.description}</h3>
                {contributions.length === 0 ? (
                  <p className="text-secondary">No PO contributions</p>
                ) : (
                  <div className="data-table-wrapper" style={{ marginTop: 'var(--spacing-md)' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>PO Code</th>
                          <th>PO Description</th>
                          <th>Weight</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributions.map((contrib, cIdx) => {
                          const po = typeof contrib.program_outcome === 'object'
                            ? contrib.program_outcome
                            : null

                          return (
                            <tr key={cIdx}>
                              <td>{po?.get_full_code || po?.code || 'N/A'}</td>
                              <td>{po?.description || 'N/A'}</td>
                              <td>{contrib.weight || '0'}</td>
                              <td>
                                {contrib.is_approved ? (
                                  <span className="badge badge-approved">Approved</span>
                                ) : (
                                  <span className="badge badge-pending">Pending</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default InstructorCourseLoPo

