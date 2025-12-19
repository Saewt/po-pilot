import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { programOutcomesAPI } from '../../api/programOutcomes'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import ConfirmationModal from '../../components/ConfirmationModal'
import '../../styles/pages.css'

/**
 * DeptHead PO Builder Page
 * CRUD for Program Outcomes
 */
const DeptPOBuilder = () => {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pos, setPos] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    is_active: true,
  })

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [poToDelete, setPoToDelete] = useState(null)

  useEffect(() => {
    loadPOs()
  }, [])

  const loadPOs = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await programOutcomesAPI.list()
      setPos(response.results || [])
    } catch (err) {
      console.error('Failed to load POs:', err)
      setError(err.response?.data?.detail || 'Failed to load program outcomes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.code || !formData.description) {
      setError('Code and description are required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await programOutcomesAPI.create({
        ...formData,
        department_id: user.department,
      })
      setFormData({ code: '', description: '', is_active: true })
      await loadPOs()
      addToast('Program Outcome created successfully!', 'success')
    } catch (err) {
      console.error('Failed to create PO:', err)
      setError(err.response?.data?.detail || 'Failed to create program outcome')
      addToast('Failed to create program outcome', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id) => {
    try {
      setLoading(true)
      setError(null)
      // Exclude 'code' from update payload since it's read-only in edit mode
      // and formData.code might contain the full_code which is invalid for the code field
      const { code, ...updateData } = formData
      await programOutcomesAPI.patch(id, updateData)
      setEditingId(null)
      setFormData({ code: '', description: '', is_active: true })
      await loadPOs()
      addToast('Program Outcome updated successfully!', 'success')
    } catch (err) {
      console.error('Failed to update PO:', err)
      setError(err.response?.data?.detail || 'Failed to update program outcome')
      addToast('Failed to update program outcome', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openDeleteModal = (po) => {
    setPoToDelete(po)
    setIsModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!poToDelete) return

    try {
      setLoading(true)
      setError(null)
      await programOutcomesAPI.delete(poToDelete.id)
      await loadPOs()
      addToast('Program Outcome deleted successfully!', 'success')
      setIsModalOpen(false)
      setPoToDelete(null)
    } catch (err) {
      console.error('Failed to delete PO:', err)
      setError(err.response?.data?.detail || 'Failed to delete program outcome')
      addToast('Failed to delete program outcome', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (po, newValue) => {
    try {
      await programOutcomesAPI.patch(po.id, { is_active: newValue })
      loadPOs()
      addToast('Status updated', 'success')
    } catch (err) {
      console.error('Failed to toggle PO status:', err)
      addToast('Failed to update status', 'error')
    }
  }

  const startEdit = (po) => {
    setEditingId(po.id)
    setFormData({
      code: po.code || po.full_code, // Fallback to full_code if code is missing
      description: po.description,
      is_active: po.is_active,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ code: '', description: '', is_active: true })
  }

  if (loading && pos.length === 0) {
    return <LoadingState />
  }

  const columns = [
    { header: 'Code', accessor: 'full_code' },
    { header: 'Description', accessor: 'description' },
    {
      header: 'Active',
      accessor: 'is_active',
      render: (row) => (
        <label className="switch" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={row.is_active}
            onChange={(e) => handleToggle(row, e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {editingId === row.id ? (
            <>
              <button
                onClick={() => handleUpdate(row.id)}
                disabled={loading}
                className="btn btn-success"
                style={{ fontSize: '0.875rem', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
              >
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="btn btn-secondary"
                style={{ fontSize: '0.875rem', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => startEdit(row)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
              <button
                onClick={() => openDeleteModal(row)}
                disabled={loading}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      )
    },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">Program Outcomes Builder</h1>

      {error && <ErrorState error={error} />}

      {/* Create Form */}
      <div className="form-section">
        <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit' : 'Create'} Program Outcome</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xl)', maxWidth: '1000px' }}>
          {/* Left Column: Code */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label>Code (e.g., PO-1):</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={!!editingId}
              />
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ minHeight: '100px', resize: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', gap: 'var(--spacing-xl)', maxWidth: '1000px', marginTop: 'var(--spacing-md)' }}>
          <div style={{ flex: 1 }}></div> {/* Spacer to separate columns */}
          <div style={{ flex: 1 }}>
            <div className="action-buttons" style={{ marginTop: 0 }}>
              <button
                onClick={editingId ? () => handleUpdate(editingId) : handleCreate}
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PO List */}
      <div>
        <h2 className="section-title">Program Outcomes</h2>
        <DataTable columns={columns} data={pos} />
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Program Outcome"
        message="Are you sure you want to delete this Program Outcome? This action cannot be undone."
      />
    </div>
  )
}

export default DeptPOBuilder

