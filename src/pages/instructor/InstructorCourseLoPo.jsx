import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import { loPoContributionsAPI } from '../../api/loPoContributions'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

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
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>{course.full_code || course.code} - {courseName}</h1>
        <p className="page-subtitle">Learning Outcome - Program Outcome Mapping</p>
      </div>

      {loPoMapping.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', background: '#f9f9f9' }}>
            <p className="text-secondary">No LO-PO mapping available for this course.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {loPoMapping.map((item, idx) => {
            const lo = item.lo
            const contributions = item.contributions

            return (
              <div key={idx} className="info-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ 
                    padding: '1rem 1.5rem', 
                    borderBottom: '1px solid #e2e8f0', 
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ 
                        fontWeight: 700, 
                        color: '#334155', 
                        background: '#e2e8f0', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                    }}>
                        {lo.full_code || lo.code}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: 500 }}>
                        {lo.description}
                    </h3>
                </div>

                {contributions.length === 0 ? (
                  <div style={{ padding: '1.5rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No Program Outcome contributions defined.
                  </div>
                ) : (
                  <DataTable
                    columns={[
                        { 
                            header: 'PO Code', 
                            accessor: 'program_outcome', 
                            render: r => {
                                const po = r.program_outcome
                                return <span style={{ fontWeight: 600 }}>{po?.full_code || po?.code || 'N/A'}</span>
                            }
                        },
                        { 
                            header: 'Description', 
                            accessor: 'program_outcome', 
                            render: r => r.program_outcome?.description || 'N/A'
                        },
                        { header: 'Weight', accessor: 'weight' },
                        { 
                            header: 'Status', 
                            accessor: 'approval_status', 
                            render: r => {
                                if (r.approval_status === 'APPROVED') return <span className="badge badge-approved">Approved</span>
                                if (r.approval_status === 'DECLINED') return <span className="badge badge-error">Declined</span>
                                return <span className="badge badge-pending">Pending</span>
                            }
                        }
                    ]}
                    data={contributions}
                    pagination={false}
                  />
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
