import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { assessmentsAPI } from '../../api/assessments'
import { coursesAPI } from '../../api/courses'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import ConfirmationModal from '../../components/ConfirmationModal'
import { useToast } from '../../context/ToastContext'
import '../../styles/pages.css'

export default function CourseAssessments() {
  const { courseId } = useParams()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [course, setCourse] = useState(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    weight: '',
    max_score: '',
    assessment_type: ''
  })

  useEffect(() => {
    fetchData()
  }, [courseId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [courseRes, assessmentsRes] = await Promise.all([
        coursesAPI.get(courseId),
        assessmentsAPI.list({ course_instance: courseId })
      ])
      setCourse(courseRes)
      setAssessments(assessmentsRes.results || assessmentsRes)
    } catch (err) {
      console.error(err)
      setError('Failed to load course assessments')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      addToast('Assessment name is required', 'error')
      return false
    }
    if (!formData.assessment_type) {
      addToast('Assessment type is required', 'error')
      return false
    }
    const weight = parseFloat(formData.weight)
    if (isNaN(weight) || weight < 0 || weight > 100) {
      addToast('Weight must be between 0 and 100', 'error')
      return false
    }
    const score = parseFloat(formData.max_score)
    if (isNaN(score) || score <= 0) {
      addToast('Max score must be greater than 0', 'error')
      return false
    }
    return true
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      await assessmentsAPI.create({
        ...formData,
        course_instance_id: courseId,
        weight: parseFloat(formData.weight),
        max_score: parseFloat(formData.max_score)
      })
      addToast('Assessment created successfully', 'success')
      setIsCreateModalOpen(false)
      setFormData({ name: '', description: '', weight: '', max_score: '', assessment_type: '' })
      fetchData()
    } catch (err) {
      console.error(err)
      addToast(err.response?.data?.detail || 'Failed to create assessment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAssessment) return

    try {
      await assessmentsAPI.delete(selectedAssessment.id)
      addToast('Assessment deleted successfully', 'success')
      setIsDeleteModalOpen(false)
      fetchData()
    } catch (err) {
      console.error(err)
      addToast('Failed to delete assessment', 'error')
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={fetchData} />
  if (!course) return <ErrorState error="Course not found" />

  const totalWeight = assessments.reduce((sum, a) => sum + parseFloat(a.weight || 0), 0)

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">{course.full_code || course.code} - Assessments</h1>
          <p className="page-subtitle">Manage course assessments and weights</p>
        </div>

      </div>



      <div className="info-card mb-6">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-secondary font-medium">Total Weight Allocation:</span>
            <span className={`ml-2 font-bold ${totalWeight > 100 ? 'text-error' : totalWeight === 100 ? 'text-success' : 'text-warning'}`}>
              {totalWeight}%
            </span>
          </div>
          <div className="text-sm text-secondary">
            {assessments.length} assessment{assessments.length !== 1 && 's'}
          </div>
        </div>

        {totalWeight !== 100 && (
          <p className="text-sm mt-2 text-secondary">
            {totalWeight < 100
              ? `You have ${100 - totalWeight}% remaining to allocate.`
              : `Total weight exceeds 100% by ${totalWeight - 100}%. Please adjust.`}
          </p>
        )}
      </div>

      <div className="mb-6 flex justify-end">
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Create Assessment
        </button>
      </div>

      <div className="info-card p-0 overflow-hidden">
        <DataTable
          columns={[
            {
              header: 'Name', accessor: 'name', render: (row) => (
                <div>
                  <div className="font-medium text-primary">{row.name}</div>
                  {row.description && <div className="text-sm text-secondary">{row.description}</div>}
                </div>
              )
            },
            {
              header: 'Type', accessor: 'assessment_type', render: (row) => (
                <span className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">{row.assessment_type}</span>
              )
            },
            {
              header: 'Weight (%)', accessor: 'weight', render: (row) => (
                <span className="badge badge-blue">{row.weight}%</span>
              )
            },
            { header: 'Max Score', accessor: 'max_score' },
            {
              header: 'Actions', accessor: 'id', render: (row) => (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    setSelectedAssessment(row)
                    setIsDeleteModalOpen(true)
                  }}
                >
                  Delete
                </button>
              )
            }
          ]}
          data={assessments}
          emptyMessage="No assessments created yet."
        />
      </div>

      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create New Assessment</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Midterm Exam"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={formData.assessment_type}
                  onChange={e => setFormData({ ...formData, assessment_type: e.target.value })}
                >
                  <option value="">Select Type...</option>
                  <option value="MIDTERM">Midterm</option>
                  <option value="FINAL">Final</option>
                  <option value="PROJECT">Project</option>
                  <option value="HOMEWORK">Homework</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="LAB">Lab</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-input"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the assessment..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Weight (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={formData.weight}
                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="0-100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Score</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.max_score}
                    onChange={e => setFormData({ ...formData, max_score: e.target.value })}
                    placeholder="e.g., 100"
                  />
                </div>
              </div>

              <div className="modal-actions mt-6">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Assessment'}
                </button>
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
        message={`Are you sure you want to delete "${selectedAssessment?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
