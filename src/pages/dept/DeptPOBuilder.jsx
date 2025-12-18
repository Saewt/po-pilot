import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { programOutcomesAPI } from '../../api/programOutcomes'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * DeptHead PO Builder Page
 * CRUD for Program Outcomes
 */
const DeptPOBuilder = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pos, setPos] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    is_active: true,
  })

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
      alert('Program Outcome created successfully!')
    } catch (err) {
      console.error('Failed to create PO:', err)
      setError(err.response?.data?.detail || 'Failed to create program outcome')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id) => {
    try {
      setLoading(true)
      setError(null)
      await programOutcomesAPI.patch(id, formData)
      setEditingId(null)
      setFormData({ code: '', description: '', is_active: true })
      await loadPOs()
      alert('Program Outcome updated successfully!')
    } catch (err) {
      console.error('Failed to update PO:', err)
      setError(err.response?.data?.detail || 'Failed to update program outcome')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Program Outcome?')) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      await programOutcomesAPI.delete(id)
      await loadPOs()
      alert('Program Outcome deleted successfully!')
    } catch (err) {
      console.error('Failed to delete PO:', err)
      setError(err.response?.data?.detail || 'Failed to delete program outcome')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (po) => {
    setEditingId(po.id)
    setFormData({
      code: po.code,
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
      render: (row) => row.is_active ? 'Yes' : 'No'
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
                onClick={() => handleDelete(row.id)}
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
        <h2>{editingId ? 'Edit' : 'Create'} Program Outcome</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxWidth: '500px' }}>
          <div className="form-group">
            <label>Code (e.g., PO-1):</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              disabled={!!editingId}
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ minHeight: '100px' }}
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ marginRight: 'var(--spacing-xs)' }}
              />
              Active
            </label>
          </div>
          <div className="action-buttons">
            <button
              onClick={editingId ? () => handleUpdate(editingId) : handleCreate}
              disabled={loading}
              className="btn btn-primary"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PO List */}
      <div>
        <h2 className="section-title">Program Outcomes</h2>
        <DataTable columns={columns} data={pos} />
      </div>
    </div>
  )
}

export default DeptPOBuilder

