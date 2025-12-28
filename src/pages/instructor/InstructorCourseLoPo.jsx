import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import { loPoContributionsAPI } from '../../api/loPoContributions'
import { programOutcomesAPI } from '../../api/programOutcomes'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import { useToast } from '../../context/ToastContext'
import '../../styles/pages.css'

const InstructorCourseLoPo = () => {
  const { courseId } = useParams()
  const { addToast } = useToast()

  // Data State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [course, setCourse] = useState(null)
  const [learningOutcomes, setLearningOutcomes] = useState([])
  const [programOutcomes, setProgramOutcomes] = useState([])
  const [contributions, setContributions] = useState([])

  // Selection State
  const [selectedLoId, setSelectedLoId] = useState(null)
  const [selectedPoId, setSelectedPoId] = useState(null)
  const [weight, setWeight] = useState('')
  const [existingMappingId, setExistingMappingId] = useState(null)

  // UI State
  const [submitting, setSubmitting] = useState(false)

  // Create LO Modal State
  const [isLoModalOpen, setIsLoModalOpen] = useState(false)
  const [loForm, setLoForm] = useState({ code: '', description: '' })
  const [creatingLo, setCreatingLo] = useState(false)

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  // Effect to CHECK for existing mapping when selection changes
  useEffect(() => {
    if (selectedLoId && selectedPoId) {
      const mapping = contributions.find(c => {
        const cLoId = typeof c.learning_outcome === 'object' ? c.learning_outcome.id : c.learning_outcome
        const cPoId = typeof c.program_outcome === 'object' ? c.program_outcome.id : c.program_outcome
        return String(cLoId) === String(selectedLoId) && String(cPoId) === String(selectedPoId)
      })

      if (mapping) {
        setWeight(mapping.weight)
        setExistingMappingId(mapping.id)
      } else {
        setWeight('')
        setExistingMappingId(null)
      }
    } else {
      setWeight('')
      setExistingMappingId(null)
    }
  }, [selectedLoId, selectedPoId, contributions])


  const loadCourseData = async () => {
    try {
      setLoading(true)
      setError(null)

      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)

      let courseTemplateId = null
      if (courseData.course_template && typeof courseData.course_template === 'object') {
        courseTemplateId = courseData.course_template.id
      } else if (courseData.course_template) {
        courseTemplateId = courseData.course_template
      }

      if (!courseTemplateId) throw new Error('Course Template ID not found.')

      const [loRes, contribRes, poRes] = await Promise.all([
        learningOutcomesAPI.list({ course_template_id: courseTemplateId }),
        loPoContributionsAPI.list({ course_template_id: courseTemplateId }),
        programOutcomesAPI.list()
      ])

      // Sort LOs
      const los = loRes.results || loRes || []
      los.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }))
      setLearningOutcomes(los)

      setContributions(contribRes.results || contribRes || [])
      setProgramOutcomes(poRes.results || poRes || [])

    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMapping = async () => {
    if (!selectedLoId || !selectedPoId) {
      addToast('Please select both a Learning Outcome and a Program Outcome', 'error')
      return
    }
    if (!weight || isNaN(weight) || weight < 1 || weight > 5) {
      addToast('Please enter a valid weight (1-5)', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        learning_outcome_id: selectedLoId,
        program_outcome_id: selectedPoId,
        weight: weight.toString()
      }

      if (existingMappingId) {
        await loPoContributionsAPI.update(existingMappingId, payload)
        addToast('Mapping updated successfully', 'success')
      } else {
        await loPoContributionsAPI.create(payload)
        addToast('Mapping created successfully', 'success')
      }

      // Refresh contributions
      const courseTemplateId = typeof course.course_template === 'object' ? course.course_template.id : course.course_template
      const contribRes = await loPoContributionsAPI.list({ course_template_id: courseTemplateId })
      setContributions(contribRes.results || contribRes || [])

    } catch (err) {
      console.error(err)
      addToast('Failed to save mapping', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateLo = async (e) => {
    e.preventDefault()
    if (!loForm.code.trim() || !loForm.description.trim()) {
      addToast('Code and Description are required', 'error')
      return
    }

    setCreatingLo(true)
    try {
      const courseTemplateId = typeof course.course_template === 'object' ? course.course_template.id : course.course_template
      await learningOutcomesAPI.create({ ...loForm, course_template_id: courseTemplateId })
      addToast('Learning Outcome created', 'success')
      setIsLoModalOpen(false)
      setLoForm({ code: '', description: '' })

      // Refresh LOs
      const loRes = await learningOutcomesAPI.list({ course_template_id: courseTemplateId })
      const los = loRes.results || loRes || []
      los.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }))
      setLearningOutcomes(los)
    } catch (err) {
      console.error(err)
      addToast('Failed to create LO', 'error')
    } finally {
      setCreatingLo(false)
    }
  }

  const handleDeleteMapping = async (mappingId) => {
    if (!window.confirm('Are you sure you want to delete this mapping?')) return

    try {
      await loPoContributionsAPI.delete(mappingId)
      addToast('Mapping deleted', 'success')

      // Clear selection if this was the selected mapping
      if (existingMappingId === mappingId) {
        setExistingMappingId(null)
        setWeight('')
      }

      // Refresh contributions
      const courseTemplateId = typeof course.course_template === 'object' ? course.course_template.id : course.course_template
      const contribRes = await loPoContributionsAPI.list({ course_template_id: courseTemplateId })
      setContributions(contribRes.results || contribRes || [])
    } catch (err) {
      console.error(err)
      addToast('Failed to delete mapping', 'error')
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={loadCourseData} />
  if (!course) return <div>Course not found</div>

  const getLoById = (id) => learningOutcomes.find(lo => String(lo.id) === String(id))
  const getPoById = (id) => programOutcomes.find(po => String(po.id) === String(id))

  // Get PO IDs that are already mapped to the currently selected LO
  const mappedPoIdsForSelectedLo = selectedLoId
    ? contributions
      .filter(c => {
        const cLoId = typeof c.learning_outcome === 'object' ? c.learning_outcome.id : c.learning_outcome
        return String(cLoId) === String(selectedLoId)
      })
      .map(c => {
        const cPoId = typeof c.program_outcome === 'object' ? c.program_outcome.id : c.program_outcome
        return String(cPoId)
      })
    : []

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '0' }}>{course.full_code || course.code} - Redesigned Mapping</h1>
        </div>

      </div>

      <div className="lopo-grid" style={{ flex: '0 0 55%', minHeight: '300px' }}>
        {/* Left Column - LOs */}
        <div className="lopo-column">
          <div className="lopo-column-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Learning Outcomes</span>
            <button onClick={() => setIsLoModalOpen(true)} className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: 'auto', height: 'auto' }}>+ New</button>
          </div>
          <div className="lopo-list">
            {learningOutcomes.length === 0 && (
              <p className="lopo-empty">No Learning Outcomes yet.</p>
            )}
            {learningOutcomes.map(lo => (
              <div
                key={lo.id}
                onClick={() => setSelectedLoId(lo.id)}
                className={`lopo-item ${selectedLoId === lo.id ? 'active' : ''}`}
              >
                <div className="lopo-item-header">
                  <span className={`lopo-badge ${selectedLoId === lo.id ? 'active' : ''}`}>
                    {lo.full_code || lo.code}
                  </span>
                </div>
                <p className="lopo-item-description">
                  {lo.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column - Mapping Controls */}
        <div className="lopo-mapping-station">
          <div className="mapping-card">
            <h3 className="mapping-title">Mapping Station</h3>

            <div className="mapping-content">
              <div className="mapping-selection">
                <label>Selected LO</label>
                <div className={`selection-box ${selectedLoId ? 'filled' : ''}`}>
                  {selectedLoId
                    ? <span className="selection-text">{getLoById(selectedLoId)?.full_code || getLoById(selectedLoId)?.code}</span>
                    : <span className="selection-placeholder">Select an LO from the left</span>}
                </div>
              </div>

              <div className="mapping-arrow">
                →
              </div>

              <div className="mapping-selection">
                <label>Selected PO</label>
                <div className={`selection-box ${selectedPoId ? 'filled' : ''}`}>
                  {selectedPoId
                    ? <span className="selection-text">{getPoById(selectedPoId)?.full_code || getPoById(selectedPoId)?.code}</span>
                    : <span className="selection-placeholder">Select a PO from the right</span>}
                </div>
              </div>

              <div className="mapping-weight-section">
                <label>Contribution Weight</label>
                <div style={{
                  display: 'flex',
                  gap: '0.25rem',
                  backgroundColor: '#f3f4f6',
                  padding: '0.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWeight(val.toString())}
                      disabled={!selectedLoId || !selectedPoId}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: parseInt(weight) === val ? 700 : 500,
                        border: 'none',
                        cursor: (!selectedLoId || !selectedPoId) ? 'not-allowed' : 'pointer',
                        backgroundColor: parseInt(weight) === val ? 'white' : 'transparent',
                        color: parseInt(weight) === val ? '#2563eb' : '#6b7280',
                        boxShadow: parseInt(weight) === val ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                        opacity: (!selectedLoId || !selectedPoId) ? 0.5 : 1,
                        transition: 'all 0.15s'
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.65rem',
                  color: '#9ca3af',
                  marginTop: '0.25rem',
                  padding: '0 0.25rem'
                }}>
                  <span>Minimal</span>
                  <span>Significant</span>
                </div>
              </div>

              <button
                className={`btn btn-block ${existingMappingId ? 'btn-success' : 'btn-primary'}`}
                onClick={handleSaveMapping}
                disabled={!selectedLoId || !selectedPoId || submitting}
              >
                {submitting ? 'Saving...' : existingMappingId ? 'Update Mapping' : 'Save New Mapping'}
              </button>

              {existingMappingId && (
                <div className="mapping-exists-badge">
                  ✓ Mapping Exists
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - POs */}
        <div className="lopo-column">
          <div className="lopo-column-header">
            Program Outcomes {selectedLoId && mappedPoIdsForSelectedLo.length > 0 && (
              <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#888', marginLeft: '0.5rem' }}>
                ({mappedPoIdsForSelectedLo.length} already mapped)
              </span>
            )}
          </div>
          <div className="lopo-list">
            {programOutcomes.map(po => {
              const isAlreadyMapped = mappedPoIdsForSelectedLo.includes(String(po.id))
              const isSelected = selectedPoId === po.id

              return (
                <div
                  key={po.id}
                  onClick={() => !isAlreadyMapped && setSelectedPoId(po.id)}
                  className={`lopo-item ${isSelected ? 'active' : ''} ${isAlreadyMapped ? 'disabled' : ''}`}
                  style={{
                    opacity: isAlreadyMapped ? 0.5 : 1,
                    cursor: isAlreadyMapped ? 'not-allowed' : 'pointer',
                    backgroundColor: isAlreadyMapped ? '#f5f5f5' : undefined,
                    position: 'relative'
                  }}
                  title={isAlreadyMapped ? 'Already mapped to selected LO' : undefined}
                >
                  <div className="lopo-item-header">
                    <span className={`lopo-badge ${isSelected ? 'active' : ''}`}>
                      {po.full_code || po.code}
                    </span>
                    {isAlreadyMapped && (
                      <span style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        backgroundColor: '#e8f5e9',
                        color: '#2e7d32',
                        borderRadius: '3px',
                        fontWeight: '600'
                      }}>
                        ✓ Mapped
                      </span>
                    )}
                  </div>
                  <p className="lopo-item-description">
                    {po.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="lopo-summary">
        <h3>Current Mappings</h3>
        {programOutcomes.map(po => {
          const mappedLos = contributions.filter(c => {
            // Safe comparison
            const cPoId = typeof c.program_outcome === 'object' ? c.program_outcome.id : c.program_outcome
            return String(cPoId) === String(po.id)
          })

          if (mappedLos.length === 0) return null

          return (
            <div key={po.id} className="summary-po-item">
              <div className="summary-po-header">
                {po.full_code || po.code}: {po.description}
              </div>
              <div className="summary-lo-list" style={{ display: 'flex', flexDirection: 'column', gap: '0', marginLeft: '0', marginTop: '0.5rem' }}>
                {mappedLos.map(c => {
                  const lo = typeof c.learning_outcome === 'object' ? c.learning_outcome : getLoById(c.learning_outcome)
                  if (!lo) return null
                  return (
                    <div key={c.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      borderBottom: '1px solid #eee',
                      gap: '1rem'
                    }}>
                      <div style={{ flex: '0 0 auto', width: '80px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          backgroundColor: '#e3f2fd',
                          color: '#1565c0',
                          borderRadius: '4px',
                          fontWeight: '700',
                          fontSize: '0.85rem'
                        }}>
                          {lo.full_code || lo.code}
                        </span>
                      </div>
                      <div style={{ flex: 1, fontSize: '0.9rem', color: '#424242', lineHeight: '1.4' }}>
                        {lo.description}
                      </div>
                      <div style={{
                        flex: '0 0 auto',
                        fontWeight: '600',
                        color: '#0d47a1',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>Weight:</span>
                        <span style={{ fontSize: '1rem' }}>{c.weight}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'end',
                        gap: '4px'
                      }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: c.approval_status === 'APPROVED' ? '#dcfce7' :
                            c.approval_status === 'DECLINED' ? '#fee2e2' : '#fef9c3',
                          color: c.approval_status === 'APPROVED' ? '#166534' :
                            c.approval_status === 'DECLINED' ? '#991b1b' : '#854d0e',
                          border: `1px solid ${c.approval_status === 'APPROVED' ? '#bbf7d0' :
                            c.approval_status === 'DECLINED' ? '#fecaca' : '#fde047'}`
                        }}>
                          {c.approval_status || 'PENDING'}
                        </span>
                        {c.approval_status === 'DECLINED' && c.decline_reason && (
                          <span style={{ fontSize: '0.7rem', color: '#dc2626', maxWidth: '150px', textAlign: 'right' }}>
                            {c.decline_reason}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteMapping(c.id)}
                        style={{
                          flex: '0 0 auto',
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: '1px solid #e57373',
                          color: '#c62828',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.target.style.backgroundColor = '#ffebee'
                        }}
                        onMouseLeave={e => {
                          e.target.style.backgroundColor = 'transparent'
                        }}
                        title="Delete this mapping"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {contributions.length === 0 && <p className="text-secondary italic">No mappings yet.</p>}
      </div>

      {/* Create LO Modal */}
      {isLoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLoModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create New Learning Outcome</h3>
            <form onSubmit={handleCreateLo}>
              <div className="form-group">
                <label className="form-label">Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={loForm.code}
                  onChange={e => setLoForm({ ...loForm, code: e.target.value })}
                  placeholder="e.g., LO-1"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={loForm.description}
                  onChange={e => setLoForm({ ...loForm, description: e.target.value })}
                  placeholder="Describe what the student will be able to do..."
                  rows={4}
                />
              </div>

              <div className="modal-actions mt-6">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsLoModalOpen(false)}
                  disabled={creatingLo}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingLo}
                >
                  {creatingLo ? 'Creating...' : 'Create LO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstructorCourseLoPo
