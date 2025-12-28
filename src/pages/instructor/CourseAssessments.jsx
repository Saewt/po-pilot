import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { assessmentsAPI } from '../../api/assessments'
import { coursesAPI } from '../../api/courses'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import { assessmentLoContributionsAPI } from '../../api/assessmentLoContributions'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import ConfirmationModal from '../../components/ConfirmationModal'
import { useToast } from '../../context/ToastContext'

export default function CourseAssessments() {
  const { courseId } = useParams()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [course, setCourse] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [learningOutcomes, setLearningOutcomes] = useState([])
  const [allContributions, setAllContributions] = useState([])

  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assessment_type: '',
    weight: '',
    max_score: ''
  })

  const totalWeight = assessments.reduce((sum, a) => sum + parseFloat(a.weight || 0), 0)
  const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId)

  // Get IDs of assessments in this course for filtering contributions
  const assessmentIds = assessments.map(a => parseInt(a.id))

  // Helper to extract assessment ID from contribution (handles nested object or ID)
  const getAssessmentId = (c) => {
    const raw = typeof c.assessment === 'object' ? c.assessment?.id : c.assessment
    return parseInt(raw)
  }

  // Helper to extract LO ID from contribution
  const getLOId = (c) => {
    const raw = typeof c.learning_outcome === 'object' ? c.learning_outcome?.id : c.learning_outcome
    return parseInt(raw)
  }

  // Filter contributions to only those belonging to this course's assessments
  const courseContributions = allContributions.filter(c => {
    return assessmentIds.includes(getAssessmentId(c))
  })

  // Get contributions for the currently selected assessment
  const selectedContributions = selectedAssessmentId
    ? courseContributions.filter(c => getAssessmentId(c) === parseInt(selectedAssessmentId))
    : []

  // Build weights map for UI
  const currentWeights = {}
  selectedContributions.forEach(c => {
    const loId = getLOId(c)
    if (loId) {
      currentWeights[loId] = Math.round(parseFloat(c.weight))
    }
  })

  useEffect(() => {
    if (courseId) fetchInitialData()
  }, [courseId])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)

      let courseTemplateId = typeof courseData.course_template === 'object'
        ? courseData.course_template.id
        : courseData.course_template

      const [assessmentsData, losData, contribsData] = await Promise.all([
        assessmentsAPI.list({ course_instance: courseId }),
        learningOutcomesAPI.list({ course_template: courseTemplateId }),
        assessmentLoContributionsAPI.list()
      ])

      const fetchedAssessments = assessmentsData.results || assessmentsData || []
      setAssessments(fetchedAssessments)

      const fetchedLos = losData.results || losData || []
      fetchedLos.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }))
      setLearningOutcomes(fetchedLos)

      setAllContributions(contribsData.results || contribsData || [])

      if (fetchedAssessments.length > 0 && !selectedAssessmentId) {
        setSelectedAssessmentId(fetchedAssessments[0].id)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load assessment data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      const payload = {
        ...formData,
        course_instance_id: courseId,
        weight: parseFloat(formData.weight),
        max_score: parseInt(formData.max_score)
      }

      const newAssessment = await assessmentsAPI.create(payload)
      setAssessments(prev => [...prev, newAssessment])
      setSelectedAssessmentId(newAssessment.id)
      setIsCreateModalOpen(false)
      addToast('Assessment created successfully', 'success')
      setFormData({ name: '', description: '', assessment_type: '', weight: '', max_score: '' })
    } catch (err) {
      console.error(err)
      addToast('Failed to create assessment', 'error')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAssessmentId) return
    try {
      await assessmentsAPI.delete(selectedAssessmentId)
      setAssessments(prev => prev.filter(a => a.id !== selectedAssessmentId))

      const remaining = assessments.filter(a => a.id !== selectedAssessmentId)
      setSelectedAssessmentId(remaining.length > 0 ? remaining[0].id : null)

      setIsDeleteModalOpen(false)
      addToast('Assessment deleted', 'success')
    } catch (err) {
      console.error(err)
      addToast('Failed to delete assessment', 'error')
    }
  }

  const handleWeightToggle = async (loId, value) => {
    if (!selectedAssessmentId) return

    // DEBUG: Log to understand matching
    console.log('--- handleWeightToggle ---')
    console.log('Assessment ID:', selectedAssessmentId, 'type:', typeof selectedAssessmentId)
    console.log('LO ID clicked:', loId, 'type:', typeof loId)
    console.log('assessmentIds in this course:', assessmentIds)
    console.log('allContributions RAW:', allContributions)
    console.log('courseContributions after filter:', courseContributions)
    console.log('selectedContributions:', selectedContributions)
    console.log('allContributions count:', allContributions.length)

    try {
      // Find existing contribution for this assessment + LO combination
      const targetLoId = parseInt(loId)
      const existingContrib = selectedContributions.find(c => {
        const cLoId = getLOId(c)
        console.log('Checking contrib:', c.id, 'cLoId:', cLoId, 'targetLoId:', targetLoId, 'matches:', cLoId === targetLoId)
        return cLoId === targetLoId
      })

      console.log('existingContrib found:', existingContrib)

      if (existingContrib) {
        const existingWeight = Math.round(parseFloat(existingContrib.weight))
        if (existingWeight === value) {
          // Toggle off: same value clicked, delete the contribution
          await assessmentLoContributionsAPI.delete(existingContrib.id)
          setAllContributions(prev => prev.filter(c => c.id !== existingContrib.id))
          addToast('Mapping removed', 'info')
        } else {
          // Update weight: different value clicked
          const updated = await assessmentLoContributionsAPI.patch(existingContrib.id, { weight: value.toString() })
          // Merge the response with existing data to preserve assessment/learning_outcome fields
          setAllContributions(prev => prev.map(c =>
            c.id === existingContrib.id ? { ...c, ...updated } : c
          ))
        }
      } else {
        // Create new contribution
        const newContrib = await assessmentLoContributionsAPI.create({
          assessment_id: selectedAssessmentId,
          learning_outcome_id: loId,
          weight: value.toString()
        })
        console.log('Created new contrib RAW:', newContrib)

        // Normalize the response to ensure it has assessment field for filtering
        const normalizedContrib = {
          ...newContrib,
          assessment: newContrib.assessment || selectedAssessmentId,
          learning_outcome: newContrib.learning_outcome || loId
        }
        console.log('Created new contrib NORMALIZED:', normalizedContrib)
        setAllContributions(prev => [...prev, normalizedContrib])
      }
    } catch (err) {
      console.error('Mapping error:', err.response?.data || err)
      addToast('Failed to update mapping', 'error')
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><LoadingState text="Loading assessments..." /></div>
  if (error) return <ErrorState message={error} />
  if (!course) return <ErrorState message="Course not found" />

  // Use inline styles to ensure the layout works regardless of parent CSS
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 64px - 2 * 1.5rem)', // Account for header and app-main padding
    margin: '-1.5rem', // Negate app-main padding
    backgroundColor: '#f9fafb'
  }

  return (
    <div style={containerStyle}>
      {/* Top Bar */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 1.5rem',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#6b7280', fontWeight: 500 }}>{course.full_code || course.code}</span>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: '1.125rem' }}>Assessments</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Weight Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#f3f4f6', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
            <div style={{ width: '80px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(totalWeight, 100)}%`,
                backgroundColor: totalWeight > 100 ? '#ef4444' : totalWeight === 100 ? '#22c55e' : '#f59e0b',
                transition: 'all 0.3s'
              }} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: totalWeight > 100 ? '#dc2626' : totalWeight === 100 ? '#16a34a' : '#d97706' }}>
              {totalWeight}%
            </span>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <svg style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Assessment
          </button>
        </div>
      </div>

      {/* Main Split View */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT: Assessment List */}
        <div style={{ width: '320px', minWidth: '280px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          {assessments.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: '3rem', height: '3rem', color: '#d1d5db', marginBottom: '0.75rem' }}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h3 style={{ color: '#111827', fontWeight: 500 }}>No Assessments</h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>Create your first assessment.</p>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {assessments.map(assessment => {
                const isSelected = assessment.id === selectedAssessmentId
                const mappedCount = allContributions.filter(c => (typeof c.assessment === 'object' ? c.assessment.id : c.assessment) === assessment.id).length

                return (
                  <button
                    key={assessment.id}
                    onClick={() => setSelectedAssessmentId(assessment.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid #f3f4f6',
                      background: isSelected ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      border: 'none',
                      borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem',
                        backgroundColor: isSelected ? '#dbeafe' : '#f3f4f6',
                        color: isSelected ? '#1d4ed8' : '#6b7280'
                      }}>
                        {assessment.assessment_type}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isSelected ? '#1d4ed8' : '#111827' }}>
                        {assessment.weight}%
                      </span>
                    </div>
                    <h3 style={{
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      color: isSelected ? '#1e3a8a' : '#1f2937',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '0.5rem'
                    }}>
                      {assessment.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
                      <span style={{
                        width: '0.375rem',
                        height: '0.375rem',
                        borderRadius: '50%',
                        backgroundColor: mappedCount > 0 ? '#22c55e' : '#d1d5db'
                      }} />
                      <span style={{ color: mappedCount > 0 ? '#16a34a' : '#9ca3af', fontWeight: 500 }}>
                        {mappedCount > 0 ? `${mappedCount} LOs Mapped` : 'Unmapped'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Inspector */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#f9fafb' }}>
          {selectedAssessment ? (
            <>
              {/* Header */}
              <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{selectedAssessment.name}</h2>
                    <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.875rem' }}>{selectedAssessment.description || "No description."}</p>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <span><strong style={{ color: '#111827' }}>{selectedAssessment.max_score}</strong> Max Score</span>
                      <span><strong style={{ color: '#111827' }}>{selectedAssessment.weight}%</strong> Weight</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    style={{ padding: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', borderRadius: '0.5rem' }}
                    title="Delete"
                  >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Mapping Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0 }}>Learning Outcome Mapping</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#6b7280', backgroundColor: 'white', padding: '0.5rem 0.75rem', borderRadius: '9999px', border: '1px solid #e5e7eb' }}>
                      <span>1 = Minimal</span>
                      <span>5 = Significant</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {learningOutcomes.map(lo => {
                      const weight = currentWeights[lo.id]
                      const isMapped = weight !== undefined

                      return (
                        <div key={lo.id} style={{
                          backgroundColor: 'white',
                          border: `1px solid ${isMapped ? '#bfdbfe' : '#e5e7eb'}`,
                          borderRadius: '0.75rem',
                          padding: '1.25rem',
                          display: 'flex',
                          gap: '1.5rem',
                          alignItems: 'center',
                          boxShadow: isMapped ? '0 4px 6px -1px rgba(59, 130, 246, 0.1)' : 'none',
                          borderLeft: isMapped ? '3px solid #3b82f6' : '3px solid transparent'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: isMapped ? '#dbeafe' : '#f3f4f6',
                                color: isMapped ? '#1d4ed8' : '#4b5563',
                                border: `1px solid ${isMapped ? '#bfdbfe' : '#e5e7eb'}`
                              }}>
                                {lo.full_code || lo.code}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: 0, lineHeight: 1.5 }}>{lo.description}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => handleWeightToggle(lo.id, val)}
                                style={{
                                  width: '2.25rem',
                                  height: '2.25rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem',
                                  fontWeight: weight === val ? 700 : 500,
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: weight === val ? 'white' : 'transparent',
                                  color: weight === val ? '#2563eb' : '#9ca3af',
                                  boxShadow: weight === val ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                  transform: weight === val ? 'scale(1.05)' : 'scale(1)',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {learningOutcomes.length === 0 && (
                      <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: '0.75rem', backgroundColor: '#f9fafb' }}>
                        <p style={{ color: '#6b7280' }}>No Learning Outcomes defined for this course.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <div style={{ width: '4rem', height: '4rem', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg style={{ width: '2rem', height: '2rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: 500, color: '#6b7280' }}>Select an assessment</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setIsCreateModalOpen(false)} />
          <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '28rem', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>Create Assessment</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} placeholder="e.g. Midterm 1" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Type</label>
                  <select required value={formData.assessment_type} onChange={e => setFormData({ ...formData, assessment_type: e.target.value })} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                    <option value="">Select...</option>
                    <option value="MIDTERM">Midterm</option>
                    <option value="FINAL">Final</option>
                    <option value="PROJECT">Project</option>
                    <option value="HOMEWORK">Homework</option>
                    <option value="QUIZ">Quiz</option>
                    <option value="LAB">Lab</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Max Score</label>
                  <input type="number" min="1" required value={formData.max_score} onChange={e => setFormData({ ...formData, max_score: e.target.value })} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Weight (%)</label>
                <input type="number" step="0.1" min="0" max="100" required value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} placeholder="0-100" />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Description</label>
                <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={formSubmitting} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'white', backgroundColor: '#2563eb', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', opacity: formSubmitting ? 0.7 : 1 }}>{formSubmitting ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Assessment"
        message={`Delete "${selectedAssessment?.name}"? This removes all associated mappings.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
