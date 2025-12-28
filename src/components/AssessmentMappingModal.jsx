import { useState, useEffect } from 'react'
import { learningOutcomesAPI } from '../api/learningOutcomes'
import { assessmentLoContributionsAPI } from '../api/assessmentLoContributions'
import { useToast } from '../context/ToastContext'
import LoadingState from './LoadingState'

const AssessmentMappingModal = ({ isOpen, onClose, assessment, course }) => {
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [learningOutcomes, setLearningOutcomes] = useState([])
  const [existingContributions, setExistingContributions] = useState([])
  const [weights, setWeights] = useState({})

  useEffect(() => {
    if (isOpen && assessment && course) {
      fetchData()
    }
  }, [isOpen, assessment, course])

  const fetchData = async () => {
    setLoading(true)
    try {
      let courseTemplateId = null
      if (course.course_template && typeof course.course_template === 'object') {
        courseTemplateId = course.course_template.id
      } else {
        courseTemplateId = course.course_template
      }

      if (!courseTemplateId) {
        throw new Error('Course Template ID not found')
      }

      const [losRes, contribsRes] = await Promise.all([
        learningOutcomesAPI.list({ course_template: courseTemplateId }),
        assessmentLoContributionsAPI.list({ assessment_id: assessment.id })
      ])

      const los = losRes.results || losRes || []
      los.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }))
      setLearningOutcomes(los)

      const contribs = contribsRes.results || contribsRes || []
      const relevantContribs = contribs.filter(c =>
        (typeof c.assessment === 'object' ? c.assessment.id : c.assessment) === assessment.id
      )

      setExistingContributions(relevantContribs)

      const initialWeights = {}
      relevantContribs.forEach(c => {
        const loId = typeof c.learning_outcome === 'object' ? c.learning_outcome.id : c.learning_outcome
        initialWeights[loId] = Math.round(parseFloat(c.weight))
      })
      setWeights(initialWeights)

    } catch (err) {
      console.error(err)
      addToast('Failed to load mapping data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleWeightChange = (loId, value) => {
    setWeights(prev => {
      const next = { ...prev }
      if (prev[loId] === value) {
        delete next[loId]
      } else {
        next[loId] = value
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const promises = []

      Object.keys(weights).forEach(loIdStr => {
        const loId = parseInt(loIdStr)
        const weight = weights[loId]

        const existing = existingContributions.find(c => {
          const cLoId = typeof c.learning_outcome === 'object' ? c.learning_outcome.id : c.learning_outcome
          return cLoId === loId
        })

        if (existing) {
          if (Math.round(parseFloat(existing.weight)) !== weight) {
            promises.push(assessmentLoContributionsAPI.patch(existing.id, { weight: weight.toString() }))
          }
        } else {
          promises.push(assessmentLoContributionsAPI.create({
            assessment_id: assessment.id,
            learning_outcome_id: loId,
            weight: weight.toString()
          }))
        }
      })

      existingContributions.forEach(c => {
        const cLoId = typeof c.learning_outcome === 'object' ? c.learning_outcome.id : c.learning_outcome
        if (!weights[cLoId]) {
          promises.push(assessmentLoContributionsAPI.delete(c.id))
        }
      })

      await Promise.all(promises)
      addToast('Mappings saved successfully', 'success')
      onClose()
    } catch (err) {
      console.error(err)
      addToast('Failed to save mappings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const scaleLabels = {
    1: 'Minimal contribution',
    2: 'Slight contribution',
    3: 'Moderate contribution',
    4: 'Substantial contribution',
    5: 'Significant contribution'
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-content bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >

        <div className="modal-header bg-slate-50 border-b border-slate-200 px-6 py-5 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>Map Outcomes</span>
                <span className="text-slate-300 font-light">/</span>
                <span className="text-blue-700 font-semibold">{assessment?.name}</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
                Map specific Learning Outcomes to this assessment to track program coverage.
                Assign weights (1-5) to indicate the level of contribution.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 bg-white/50 px-4 py-2.5 rounded-lg border border-slate-200/60 shadow-sm">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Scale</span>
            <div className="flex items-center gap-1.5" title="Minimal Contribution">
              <span className="w-6 h-6 rounded flex items-center justify-center bg-white border border-slate-200 text-slate-400 font-medium">1</span>
              <span>Minimal</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5" title="Moderate Contribution">
              <span className="w-6 h-6 rounded flex items-center justify-center bg-white border border-slate-200 text-slate-400 font-medium">3</span>
              <span>Moderate</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5" title="Significant Contribution">
              <span className="w-6 h-6 rounded flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-600 font-bold">5</span>
              <span className="font-medium text-slate-700">Significant</span>
            </div>
          </div>
        </div>

        <div className="modal-body flex-1 overflow-y-auto bg-slate-50/50 p-6 scroll-smooth">
          {loading ? (
            <LoadingState />
          ) : (
            <div className="space-y-3">
              {learningOutcomes.length === 0 && (
                <div className="text-center py-12 px-6 rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  <p className="text-slate-500 font-medium">No Learning Outcomes found for this course.</p>
                  <p className="text-slate-400 text-sm mt-1">Please ensure course outcomes are defined.</p>
                </div>
              )}

              {learningOutcomes.map(lo => {
                const currentWeight = weights[lo.id]
                const isMapped = currentWeight !== undefined

                return (
                  <div
                    key={lo.id}
                    className={`
                      group flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 rounded-xl border transition-all duration-200
                      ${isMapped
                        ? 'bg-white border-blue-200 shadow-md shadow-blue-900/5 ring-1 ring-blue-50'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className={`
                          font-mono text-xs font-bold px-2.5 py-1 rounded-md border tracking-tight
                          ${isMapped
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                          }
                        `}>
                          {lo.full_code || lo.code}
                        </span>
                        {isMapped && (
                          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded-full">
                            Mapped
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                        {lo.description}
                      </p>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      <div className="flex items-center bg-slate-100/80 p-1 rounded-lg border border-slate-200">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleWeightChange(lo.id, val)}
                            className={`
                              relative w-9 h-9 rounded-md text-sm font-medium transition-all duration-200
                              flex items-center justify-center
                              focus:outline-none focus:ring-2 focus:ring-blue-500/20 z-0
                              ${currentWeight === val
                                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5 font-bold scale-110 z-10'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-white/50'
                              }
                            `}
                            title={scaleLabels[val]}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <div className="text-[10px] text-center mt-1.5 text-slate-400 font-medium h-4 transition-all opacity-0 group-hover:opacity-100">
                        {currentWeight ? scaleLabels[currentWeight] : 'Select weight'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="modal-footer border-t border-slate-200 bg-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="text-sm text-slate-500">
            <span className="font-medium text-slate-900">{Object.keys(weights).length}</span> Outcomes Mapped
          </div>
          <div className="flex gap-3">
            <button
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 focus:ring-4 focus:ring-slate-100 transition-all"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-sm hover:shadow-md focus:ring-4 focus:ring-slate-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AssessmentMappingModal
