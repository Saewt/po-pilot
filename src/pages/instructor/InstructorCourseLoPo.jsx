import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import { loPoContributionsAPI } from '../../api/loPoContributions'
import { programOutcomesAPI } from '../../api/programOutcomes'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import ConfirmationModal from '../../components/ConfirmationModal'
import { useToast } from '../../context/ToastContext'
import '../../styles/pages.css'

const InstructorCourseLoPo = () => {
  const { courseId } = useParams()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [course, setCourse] = useState(null)
  const [loPoMapping, setLoPoMapping] = useState([])
  const [programOutcomes, setProgramOutcomes] = useState([])

  const [isLoModalOpen, setIsLoModalOpen] = useState(false)
  const [currentLo, setCurrentLo] = useState(null)
  const [loForm, setLoForm] = useState({ code: '', description: '' })

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false)
  const [currentMappingLo, setCurrentMappingLo] = useState(null)
  const [editingMappingId, setEditingMappingId] = useState(null)
  const [mappingForm, setMappingForm] = useState({ program_outcome: '', weight: '' })

  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCourseData()
  }, [courseId])

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

      if (!courseTemplateId) {
        throw new Error('Course Template ID could not be determined.')
      }

      const [loResponse, contributionsResponse, poResponse] = await Promise.all([
        learningOutcomesAPI.list({ course_template: courseTemplateId }),
        loPoContributionsAPI.list({ course_template_id: courseTemplateId }),
        programOutcomesAPI.list()
      ])

      const learningOutcomes = loResponse.results || []
      const allContributions = contributionsResponse.results || []
      const allPOs = poResponse.results || []

      setProgramOutcomes(allPOs)

      const mapping = learningOutcomes.map(lo => {
        const contributions = allContributions.filter(
          c => c.learning_outcome === lo.id ||
            (typeof c.learning_outcome === 'object' && c.learning_outcome.id === lo.id)
        )
        return { lo, contributions }
      })

      mapping.sort((a, b) => {
        const codeA = a.lo.full_code || a.lo.code || ''
        const codeB = b.lo.full_code || b.lo.code || ''
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' })
      })

      setLoPoMapping(mapping)

    } catch (err) {
      console.error('Failed to load course data:', err)
      // Improved error handling: prefer err.message for client-side errors
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load course data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setCurrentLo(null)
    setLoForm({ code: '', description: '' })
    setIsLoModalOpen(true)
  }

  const handleOpenEdit = (lo) => {
    setCurrentLo(lo)
    setLoForm({
      code: lo.code || '',
      description: lo.description || ''
    })
    setIsLoModalOpen(true)
  }

  const handleSaveLo = async (e) => {
    e.preventDefault()
    if (!loForm.code.trim() || !loForm.description.trim()) {
      addToast('Code and Description are required', 'error')
      return
    }

    setSubmitting(true)
    try {
      const courseTemplateId = typeof course.course_template === 'object'
        ? course.course_template.id
        : course.course_template

      if (currentLo) {
        await learningOutcomesAPI.update(currentLo.id, {
          ...loForm,
          course_template: courseTemplateId
        })
        addToast('Learning Outcome updated', 'success')
      } else {
        await learningOutcomesAPI.create({
          ...loForm,
          course_template: courseTemplateId
        })
        addToast('Learning Outcome created', 'success')
      }
      setIsLoModalOpen(false)
      loadCourseData()
    } catch (err) {
      console.error(err)
      addToast('Failed to save Learning Outcome', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenMappingModal = (lo, mapping = null) => {
    setCurrentMappingLo(lo)
    if (mapping) {
      setEditingMappingId(mapping.id)
      const poId = typeof mapping.program_outcome === 'object' ? mapping.program_outcome.id : mapping.program_outcome
      setMappingForm({
        program_outcome: poId,
        weight: mapping.weight
      })
    } else {
      setEditingMappingId(null)
      setMappingForm({ program_outcome: '', weight: '' })
    }
    setIsMappingModalOpen(true)
  }

  const handleSaveMapping = async (e) => {
    e.preventDefault()
    if (!mappingForm.program_outcome || !mappingForm.weight) {
      addToast('Please select a PO and enter a weight', 'error')
      return
    }

    const weight = parseFloat(mappingForm.weight)
    if (isNaN(weight) || weight < 1 || weight > 5) {
      addToast('Weight must be between 1 and 5', 'error')
      return
    }

    setSubmitting(true)
    try {
      const data = {
        learning_outcome: currentMappingLo.id,
        program_outcome: mappingForm.program_outcome,
        weight: mappingForm.weight
      }

      if (editingMappingId) {
        await loPoContributionsAPI.update(editingMappingId, data)
        addToast('Mapping updated', 'success')
      } else {
        await loPoContributionsAPI.create(data)
        addToast('Mapping created', 'success')
      }
      setIsMappingModalOpen(false)
      loadCourseData()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.detail || 'Failed to save mapping'
      addToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (id) => {
    setDeleteConfirmation({ isOpen: true, id })
  }

  const handleConfirmDelete = async () => {
    try {
      await loPoContributionsAPI.delete(deleteConfirmation.id)
      addToast('Mapping deleted', 'success')
      loadCourseData()
    } catch (err) {
      console.error(err)
      addToast('Failed to delete mapping', 'error')
    } finally {
      setDeleteConfirmation({ isOpen: false, id: null })
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={loadCourseData} />
  if (!course) return <div>Course not found</div>

  const courseName = typeof course.course_template === 'object'
    ? course.course_template.name
    : 'N/A'

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">{course.full_code || course.code} - {courseName}</h1>
          <p className="page-subtitle">Manage Learning Outcomes and view PO Mappings</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleOpenCreate}
        >
          + New Learning Outcome
        </button>
      </div>

      {loPoMapping.length === 0 ? (
        <div className="empty-state p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-secondary mb-4">No Learning Outcomes defined for this course yet.</p>
          <button className="btn btn-primary" onClick={handleOpenCreate}>Create Your First LO</button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {loPoMapping.map((item, idx) => {
            const lo = item.lo
            const contributions = item.contributions

            return (
              <div key={idx} className="info-card p-0 overflow-hidden border border-gray-200 shadow-sm">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700 bg-gray-200 px-2 py-1 rounded text-sm">
                      {lo.full_code || lo.code}
                    </span>
                    <h3 className="m-0 text-lg font-medium text-gray-800">
                      {lo.description}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded hover:bg-indigo-50 transition-colors"
                      onClick={() => handleOpenMappingModal(lo)}
                    >
                      Map to PO
                    </button>
                    <button
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      onClick={() => handleOpenEdit(lo)}
                    >
                      Edit LO
                    </button>
                  </div>
                </div>

                {contributions.length === 0 ? (
                  <div className="p-6 text-gray-400 italic text-center text-sm">
                    No Program Outcome contributions mapped yet.
                  </div>
                ) : (
                  <DataTable
                    columns={[
                      {
                        header: 'PO Code',
                        accessor: 'program_outcome',
                        render: r => {
                          const po = r.program_outcome
                          return <span className="font-semibold">{po?.full_code || po?.code || 'N/A'}</span>
                        }
                      },
                      {
                        header: 'Description',
                        accessor: 'program_outcome',
                        render: r => r.program_outcome?.description || 'N/A'
                      },
                      { header: 'Weight (1-5)', accessor: 'weight' },
                      {
                        header: 'Status',
                        accessor: 'approval_status',
                        render: r => {
                          if (r.approval_status === 'APPROVED') return <span className="badge badge-approved">Approved</span>
                          if (r.approval_status === 'DECLINED') return <span className="badge badge-error">Declined</span>
                          return <span className="badge badge-pending">Pending</span>
                        }
                      },
                      {
                        header: 'Actions',
                        render: (r) => (
                          <div className="flex gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 text-sm"
                              onClick={() => handleOpenMappingModal(lo, r)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 text-sm"
                              onClick={() => handleDeleteClick(r.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )
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

      {isLoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLoModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">
              {currentLo ? 'Edit Learning Outcome' : 'New Learning Outcome'}
            </h3>
            <form onSubmit={handleSaveLo}>
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
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Learning Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMappingModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMappingModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">
              {editingMappingId ? 'Edit Mapping' : 'Map to Program Outcome'}
            </h3>
            <form onSubmit={handleSaveMapping}>
              <div className="form-group">
                <label className="form-label">Program Outcome</label>
                <select
                  className="form-input"
                  value={mappingForm.program_outcome}
                  onChange={e => setMappingForm({ ...mappingForm, program_outcome: e.target.value })}
                  disabled={!!editingMappingId}
                >
                  <option value="">Select a Program Outcome</option>
                  {programOutcomes.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.full_code || po.code} - {po.description}
                    </option>
                  ))}
                </select>
                {editingMappingId && <p className="text-xs text-gray-500 mt-1">PO cannot be changed while editing.</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Weight (1-5)</label>
                <input
                  type="number"
                  className="form-input"
                  value={mappingForm.weight}
                  onChange={e => setMappingForm({ ...mappingForm, weight: e.target.value })}
                  placeholder="1-5"
                  min="1"
                  max="5"
                  step="0.1"
                />
              </div>

              <div className="modal-actions mt-6">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsMappingModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Mapping"
        message="Are you sure you want to delete this mapping? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
        confirmVariant="danger"
        confirmText="Delete"
      />
    </div>
  )
}

export default InstructorCourseLoPo
