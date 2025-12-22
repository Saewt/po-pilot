import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { announcementsAPI } from '../api/announcements'
import { useToast } from '../context/ToastContext'
import DataTable from './DataTable'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'
import ConfirmationModal from './ConfirmationModal'
import '../styles/pages.css'

/**
 * Component: Announcements Modal
 * Compact management of announcements for Department Heads.
 */
const AnnouncementsModal = ({ isOpen, onClose }) => {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [announcements, setAnnouncements] = useState([])

    // Create Form State
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [createData, setCreateData] = useState({ title: '', message: '' })
    const [createLoading, setCreateLoading] = useState(false)

    // Delete Modal State
    const [deleteId, setDeleteId] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadAnnouncements()
        }
    }, [isOpen])

    const loadAnnouncements = async () => {
        try {
            setLoading(true)
            const response = await announcementsAPI.list()
            const data = response.results || response
            setAnnouncements(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load announcements:', err)
            setError('Failed to load announcements')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!createData.title || !createData.message) {
            addToast('Title and Message are required', 'error')
            return
        }

        try {
            setCreateLoading(true)
            await announcementsAPI.create({
                ...createData,
                department: user.department
            })
            addToast('Announcement created successfully', 'success')
            setShowCreateForm(false)
            setCreateData({ title: '', message: '' })
            await loadAnnouncements()
        } catch (err) {
            console.error('Create failed:', err)
            addToast('Failed to create announcement', 'error')
        } finally {
            setCreateLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteId) return

        try {
            setDeleteLoading(true)
            await announcementsAPI.delete(deleteId)
            addToast('Announcement deleted successfully', 'success')
            setDeleteId(null)
            await loadAnnouncements()
        } catch (err) {
            console.error('Delete failed:', err)
            addToast('Failed to delete announcement', 'error')
        } finally {
            setDeleteLoading(false)
        }
    }

    const columns = [
        {
            header: 'Date',
            accessor: 'created_at',
            render: (row) => new Date(row.created_at).toLocaleDateString()
        },
        { header: 'Title', accessor: 'title' },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (row) => (
                <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteId(row.id)}
                >
                    Delete
                </button>
            )
        }
    ]

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className="modal-title" style={{ margin: 0 }}>Announcements</h3>
                    <div>
                        {!showCreateForm ? (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(true)}>
                                New Announcement
                            </button>
                        ) : (
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateForm(false)}>
                                Cancel
                            </button>
                        )}
                        <button className="btn btn-secondary btn-sm" style={{ marginLeft: '8px' }} onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>

                {showCreateForm && (
                    <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Create New Announcement</h4>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={createData.title}
                                    onChange={e => setCreateData({ ...createData, title: e.target.value })}
                                    maxLength={150}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Message</label>
                                <textarea
                                    value={createData.message}
                                    onChange={e => setCreateData({ ...createData, message: e.target.value })}
                                    rows={3}
                                    required
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                                    {createLoading ? 'Publishing...' : 'Publish'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {loading ? (
                    <LoadingState />
                ) : error ? (
                    <ErrorState error={error} />
                ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <DataTable
                            columns={columns}
                            data={announcements}
                            emptyMessage="No announcements found."
                        />
                    </div>
                )}

                {/* Delete Confirmation */}
                <ConfirmationModal
                    isOpen={!!deleteId}
                    onClose={() => setDeleteId(null)}
                    onConfirm={handleDelete}
                    title="Delete Announcement"
                    message="Are you sure you want to delete this announcement?"
                    confirmText={deleteLoading ? 'Deleting...' : 'Delete'}
                    confirmVariant="danger"
                />
            </div>
        </div>
    )
}

export default AnnouncementsModal
