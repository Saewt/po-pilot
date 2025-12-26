import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { programOutcomesAPI } from '../../api/programOutcomes'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import ConfirmationModal from '../../components/ConfirmationModal'
import DeptPOToolbar from '../../components/DeptPOToolbar'
import DeptPOCard from '../../components/DeptPOCard'
import DeptPOModal from '../../components/DeptPOModal'
import '../../styles/pages.css'

const DeptPOBuilder = () => {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pos, setPos] = useState([])

  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedPO, setSelectedPO] = useState(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [poToDelete, setPoToDelete] = useState(null)

  useEffect(() => {
    loadPOs()
  }, [])

  const loadPOs = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await programOutcomesAPI.list()
      const data = response.results || response
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
        const codeA = a.full_code || a.code || ''
        const codeB = b.full_code || b.code || ''
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' })
      })
      setPos(sorted)
    } catch (err) {
      console.error('Failed to load POs:', err)
      setError(err.response?.data?.detail || 'Failed to load program outcomes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClick = () => {
    setModalMode('create')
    setSelectedPO(null)
    setModalOpen(true)
  }

  const handleEditClick = (po) => {
    setModalMode('edit')
    setSelectedPO(po)
    setModalOpen(true)
  }

  const handleDeleteClick = (po) => {
    setPoToDelete(po)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!poToDelete) return

    try {
      await programOutcomesAPI.delete(poToDelete.id)
      addToast('Program Outcome deleted successfully', 'success')
      loadPOs()
    } catch (err) {
      console.error('Failed to delete PO:', err)
      addToast(err.response?.data?.detail || 'Failed to delete program outcome', 'error')
    } finally {
      setDeleteModalOpen(false)
      setPoToDelete(null)
    }
  }

  const handleModalSubmit = async (formData) => {
    try {
      if (modalMode === 'create') {
        await programOutcomesAPI.create({
          ...formData,
          department_id: user.department,
        })
        addToast('Program Outcome created successfully', 'success')
      } else {
        await programOutcomesAPI.patch(selectedPO.id, formData)
        addToast('Program Outcome updated successfully', 'success')
      }
      setModalOpen(false)
      loadPOs()
    } catch (err) {
      console.error('Failed to save PO:', err)
      throw err
    }
  }

  const handleToggleStatus = async (po) => {
    try {
      const newStatus = !po.is_active
      await programOutcomesAPI.patch(po.id, { is_active: newStatus })

      setPos(currentPos =>
        currentPos.map(p =>
          p.id === po.id ? { ...p, is_active: newStatus } : p
        )
      )

      addToast(`Program Outcome ${newStatus ? 'activated' : 'deactivated'}`, 'success')
    } catch (err) {
      console.error('Failed to toggle status:', err)
      addToast('Failed to update status', 'error')
      loadPOs()
    }
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setShowInactive(false)
  }

  const filteredPOs = pos.filter(po => {
    const matchesSearch =
      (po.full_code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (po.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (po.code?.toLowerCase() || '').includes(searchQuery.toLowerCase())

    const matchesActive = showInactive ? true : po.is_active

    return matchesSearch && matchesActive
  })

  if (loading && pos.length === 0) {
    return <LoadingState />
  }

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.5rem', fontSize: '2rem', letterSpacing: '-0.03em' }}>Program Outcomes</h1>
          <p className="page-subtitle" style={{ color: '#64748b', fontSize: '1.1rem', margin: 0, maxWidth: '600px' }}>
            Define the knowledge, skills, and behaviors students should acquire by the time of graduation.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleCreateClick}
          style={{
            height: 'auto',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px',
            boxShadow: 'none'
          }}
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>+</span>
          Add Outcome
        </button>
      </div>

      {error && <ErrorState error={error} />}

      <DeptPOToolbar
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        showInactive={showInactive}
        onShowInactiveChange={setShowInactive}
        onReset={handleResetFilters}
      />

      <div style={{ marginTop: '2rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 100px 140px',
          gap: '1rem',
          padding: '0.75rem 0',
          borderBottom: '2px solid #e2e8f0',
          color: '#64748b',
          fontSize: '0.75rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          alignItems: 'center'
        }}>
          <div>Code</div>
          <div>Outcome Description</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        <div style={{ borderTop: 'none' }}>
          {filteredPOs.length > 0 ? (
            filteredPOs.map(po => (
              <DeptPOCard
                key={po.id}
                po={po}
                onEdit={() => handleEditClick(po)}
                onDelete={() => handleDeleteClick(po)}
                onToggleStatus={handleToggleStatus}
              />
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '6rem 2rem',
              color: '#64748b'
            }}>
              <h3 style={{ marginTop: 0, color: '#475569', fontSize: '1.25rem' }}>No outcomes found</h3>
              <p style={{ fontSize: '1rem' }}>
                {pos.length === 0
                  ? "Your program has no outcomes yet."
                  : "Try adjusting your search or filters."}
              </p>
              {pos.length === 0 && (
                <button
                  onClick={handleCreateClick}
                  style={{
                    marginTop: '1rem',
                    background: 'none',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#475569',
                    fontWeight: '500'
                  }}
                >
                  Create your first outcome
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <DeptPOModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={selectedPO}
        mode={modalMode}
      />

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Program Outcome"
        message={`Are you sure you want to delete ${poToDelete?.full_code || 'this outcome'}? This action cannot be undone and may affect mapped courses.`}
        confirmVariant="danger"
      />
    </div>
  )
}

export default DeptPOBuilder
