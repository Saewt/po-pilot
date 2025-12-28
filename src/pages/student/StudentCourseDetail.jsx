import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import { assessmentsAPI } from '../../api/assessments'
import { gradesAPI } from '../../api/grades'
import { useAuth } from '../../context/AuthContext'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import AchievementProgressBar from '../../components/AchievementProgressBar'
import '../../styles/pages.css'

/**
 * Student Course Detail Page
 * Academic, formal UI with course info, grades, and outcomes
 */
const StudentCourseDetail = () => {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [course, setCourse] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [grades, setGrades] = useState([])
  const [loPoMapping, setLoPoMapping] = useState([])
  const [activeTab, setActiveTab] = useState('grades')

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

      const [assessmentsRes, gradesRes, loResponse] = await Promise.all([
        assessmentsAPI.list({ course_instance: courseId }),
        gradesAPI.list({ student: user?.id, assessment__course_instance: courseId }),
        learningOutcomesAPI.list({ course_template_id: courseTemplateId, course_instance_id: courseId })
      ])

      setAssessments(assessmentsRes.results || [])
      setGrades(gradesRes.results || [])

      const learningOutcomesList = Array.isArray(loResponse) ? loResponse : (loResponse.results || [])
      const mapping = learningOutcomesList.map(lo => ({
        lo,
        po_contributions: lo.po_contributions || [],
        assessment_contributions: lo.assessment_contributions || []
      }))
      setLoPoMapping(mapping)

    } catch (err) {
      console.error('Failed to load course details:', err)
      setError('Failed to load course details.')
    } finally {
      setLoading(false)
    }
  }

  // Helper functions
  const getGradeForAssessment = (assessmentId) => {
    const grade = grades.find(g => {
      const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
      return gAssessmentId === assessmentId
    })
    return grade
  }

  const calculateProgress = () => {
    let earnedWeight = 0
    let earnedScore = 0
    let totalWeight = 0
    let gradedCount = 0

    assessments.forEach(a => {
      const weight = parseFloat(a.weight) || 0
      totalWeight += weight
      const grade = getGradeForAssessment(a.id)
      if (grade) {
        gradedCount++
        const maxScore = parseFloat(a.max_score) || 100
        const score = parseFloat(grade.score) || 0
        const percentage = (score / maxScore) * 100
        earnedWeight += weight
        earnedScore += (percentage * weight) / 100
      }
    })

    return {
      earnedWeight,
      earnedScore: earnedWeight > 0 ? (earnedScore / earnedWeight) * 100 : 0,
      totalWeight,
      gradedCount,
      totalCount: assessments.length
    }
  }

  const getLetterGrade = (percentage) => {
    if (percentage >= 90) return 'AA'
    if (percentage >= 85) return 'BA'
    if (percentage >= 80) return 'BB'
    if (percentage >= 70) return 'CB'
    if (percentage >= 60) return 'CC'
    if (percentage >= 55) return 'DC'
    if (percentage >= 50) return 'DD'
    return 'FF'
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={loadCourseData} />
  if (!course) return <div className="page-container">Course not found.</div>

  const courseName = typeof course.course_template === 'object'
    ? course.course_template.name
    : 'Course'
  const courseCode = course.full_code || course.code || 'N/A'
  const credit = course.course_template?.credit || 3
  const instructorName = course.instructor_name ||
    (typeof course.instructor === 'object' ? `${course.instructor.first_name} ${course.instructor.last_name}` : 'TBA')

  const progress = calculateProgress()
  const currentScore = progress.earnedScore
  const letterGrade = getLetterGrade(currentScore)

  const tabStyle = (isActive) => ({
    padding: '0.875rem 1.5rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: isActive ? '#4f46e5' : '#64748b',
    background: 'none',
    border: 'none',
    borderBottom: isActive ? '2px solid #4f46e5' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s'
  })

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0',
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontSize: '0.9375rem',
          cursor: 'pointer',
          marginBottom: '1rem'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Courses
      </button>

      {/* Course Header */}
      <div className="info-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <div style={{
                display: 'inline-block',
                padding: '0.375rem 0.875rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.75rem',
                letterSpacing: '0.025em'
              }}>
                {courseCode}
              </div>
              <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
                {courseName}
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9375rem' }}>
                {course.semester} {course.year} • {instructorName}
              </p>
            </div>
            {course.is_finalized && (
              <div style={{
                padding: '0.5rem 0.875rem',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                textAlign: 'right'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'flex-end', fontWeight: 600, marginBottom: '0.25rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Finalized
                </div>
                {course.finalized_at && (
                  <div style={{ opacity: 0.9 }}>
                    {new Date(course.finalized_at).toLocaleDateString()}
                  </div>
                )}
                {course.finalized_by_name && (
                  <div style={{ opacity: 0.9 }}>
                    by {course.finalized_by_name}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#334155' }}>{credit}</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Credits</div>
            </div>
            <div style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6' }}>{progress.gradedCount}/{progress.totalCount}</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Graded</div>
            </div>
            <div style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#334155' }}>{currentScore.toFixed(1)}%</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Current Score</div>
            </div>
            <div style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: ['AA', 'BA', 'BB'].includes(letterGrade) ? '#16a34a' : ['CB', 'CC'].includes(letterGrade) ? '#3b82f6' : '#ef4444'
              }}>
                {letterGrade}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Letter Grade</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '1.5rem'
      }}>
        <button style={tabStyle(activeTab === 'grades')} onClick={() => setActiveTab('grades')}>
          Grades & Assessments
        </button>
        <button style={tabStyle(activeTab === 'info')} onClick={() => setActiveTab('info')}>
          Course Info
        </button>
        <button style={tabStyle(activeTab === 'outcomes')} onClick={() => setActiveTab('outcomes')}>
          Outcomes
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {/* Grades Tab */}
        {activeTab === 'grades' && (
          <div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="info-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: progress.totalWeight === 100 ? '#16a34a' : '#f59e0b' }}>
                  {progress.totalWeight.toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Total Weight</div>
              </div>
              <div className="info-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4f46e5' }}>
                  {progress.gradedCount}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Graded Assessments</div>
              </div>
              <div className="info-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#94a3b8' }}>
                  {progress.totalCount - progress.gradedCount}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Pending</div>
              </div>
            </div>

            {/* Assessments Table */}
            {assessments.length === 0 ? (
              <div className="info-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                No assessments defined for this course yet.
              </div>
            ) : (
              <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assessment</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weight</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((assessment, idx) => {
                      const grade = getGradeForAssessment(assessment.id)
                      const isGraded = !!grade
                      const maxScore = parseFloat(assessment.max_score) || 100
                      const score = grade ? parseFloat(grade.score) : null
                      const percentage = score !== null ? ((score / maxScore) * 100).toFixed(1) : null

                      return (
                        <tr key={assessment.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{assessment.name}</div>
                            {assessment.description && (
                              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                {assessment.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.625rem',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#475569'
                            }}>
                              {assessment.assessment_type || 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                            {assessment.weight}%
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {isGraded ? (
                              <div>
                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{score}/{maxScore}</div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: percentage >= 70 ? '#16a34a' : percentage >= 50 ? '#f59e0b' : '#dc2626',
                                  fontWeight: 600
                                }}>
                                  {percentage}%
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {isGraded ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.25rem 0.625rem',
                                backgroundColor: '#dcfce7',
                                color: '#16a34a',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Graded
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.25rem 0.625rem',
                                backgroundColor: '#f1f5f9',
                                color: '#94a3b8',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                </svg>
                                Pending
                              </span>
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
        )}

        {/* Course Info Tab */}
        {activeTab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="info-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#374151' }}>Course Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Course Code</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{courseCode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Credits</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{credit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Semester</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{course.semester} {course.year}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Target Year</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>Year {course.target_class_year || course.course_template?.target_class_year || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Status</span>
                  <span style={{
                    fontWeight: 600,
                    color: course.is_finalized ? '#16a34a' : course.is_active ? '#3b82f6' : '#94a3b8'
                  }}>
                    {course.is_finalized ? 'Finalized' : course.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#374151' }}>Instructor</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4f46e5',
                  fontWeight: 700,
                  fontSize: '1.125rem'
                }}>
                  {instructorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{instructorName}</div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Course Instructor</div>
                </div>
              </div>
            </div>

            {course.course_template?.description && (
              <div className="info-card" style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600, color: '#374151' }}>Description</h3>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
                  {course.course_template.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Outcomes Tab */}
        {activeTab === 'outcomes' && (
          <div>
            {loPoMapping.length === 0 ? (
              <div className="info-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                No learning outcomes defined for this course.
              </div>
            ) : (
              <div className="info-card">
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
                  Learning Outcomes
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {loPoMapping.map((item, idx) => (
                    <div key={idx} style={{
                      padding: '1.25rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0'
                    }}>
                      {/* LO Header */}
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '3rem',
                          padding: '0.5rem',
                          backgroundColor: '#e0e7ff',
                          color: '#4f46e5',
                          borderRadius: '0.5rem',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          flexShrink: 0
                        }}>
                          {item.lo.code || item.lo.full_code?.split('-').pop()}
                        </span>
                        <p style={{ margin: 0, color: '#374151', fontSize: '0.9375rem', lineHeight: 1.5, fontWeight: 500 }}>
                          {item.lo.description}
                        </p>
                      </div>

                      {/* Assessment Contributions */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                          Assessed By:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {item.assessment_contributions && item.assessment_contributions.length > 0 ? (
                            item.assessment_contributions.map((ac, acIdx) => (
                              <span key={acIdx} style={{
                                padding: '0.25rem 0.625rem',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                {ac.assessment_name}
                                <span style={{ opacity: 0.7 }}>(w:{ac.weight})</span>
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic' }}>No assessments linked</span>
                          )}
                        </div>
                      </div>

                      {/* PO Contributions */}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                          </svg>
                          Contributes to Program Outcomes:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {item.po_contributions && item.po_contributions.length > 0 ? (
                            item.po_contributions.map((pc, pcIdx) => {
                              const poCode = pc.program_outcome_code ||
                                (typeof pc.program_outcome === 'object' ? pc.program_outcome.code : `PO-${pc.program_outcome_id || pc.program_outcome}`)
                              const poDesc = pc.program_outcome_description ||
                                (typeof pc.program_outcome === 'object' ? pc.program_outcome.description : '')
                              const isApproved = pc.approval_status === 'APPROVED'

                              return (
                                <div key={pcIdx} style={{
                                  padding: '0.5rem 0.75rem',
                                  backgroundColor: isApproved ? '#dcfce7' : '#fef9c3',
                                  borderRadius: '0.5rem',
                                  border: `1px solid ${isApproved ? '#bbf7d0' : '#fde68a'}`
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: poDesc ? '0.25rem' : 0 }}>
                                    <span style={{
                                      fontWeight: 700,
                                      fontSize: '0.8125rem',
                                      color: isApproved ? '#16a34a' : '#a16207'
                                    }}>
                                      {poCode}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.7, color: isApproved ? '#16a34a' : '#a16207' }}>
                                      (weight: {pc.weight})
                                    </span>
                                    {isApproved && (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                    {!isApproved && pc.approval_status && (
                                      <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '0.25rem' }}>
                                        {pc.approval_status}
                                      </span>
                                    )}
                                  </div>
                                  {poDesc && (
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
                                      {poDesc}
                                    </p>
                                  )}
                                </div>
                              )
                            })
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic' }}>No PO mappings</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentCourseDetail
