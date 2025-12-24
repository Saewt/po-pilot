import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { announcementsAPI } from '../api/announcements'
import { coursesAPI } from '../api/courses'
import { useToast } from '../context/ToastContext'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'
import ConfirmationModal from './ConfirmationModal'
import './AnnouncementsModal.css'

const AnnouncementsModal = ({ isOpen, onClose }) => {
    const { user } = useAuth()
    const { addToast } = useToast()
    
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [announcements, setAnnouncements] = useState([])
    const [instructorCourses, setInstructorCourses] = useState([])
    
    const [selectedId, setSelectedId] = useState(null)
    const [mode, setMode] = useState('list')
    const [deleteId, setDeleteId] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)

    const [formData, setFormData] = useState({ 
        title: '', 
        message: '',
        audience: 'ALL',
        course_instance: ''
    })

    useEffect(() => {
        if (isOpen) {
            loadAnnouncements()
            if (user.role === 'INSTRUCTOR') {
                loadInstructorCourses()
            }
            setMode('list')
            setSelectedId(null)
        }
    }, [isOpen, user.role])

    const loadInstructorCourses = async () => {
        try {
            const response = await coursesAPI.list()
            setInstructorCourses(response.results || [])
        } catch (err) {
            console.error('Failed to load courses for instructor dropdown', err)
        }
    }

    const loadAnnouncements = async () => {
        try {
            setLoading(true)
            let response
            if (user.role === 'DEPARTMENT_HEAD') {
                response = await announcementsAPI.list()
            } else {
                response = await announcementsAPI.listCourseAnnouncements()
            }
            
            const data = response.results || response
            const sorted = (Array.isArray(data) ? data : []).sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            )
            setAnnouncements(sorted)
        } catch (err) {
            console.error('Failed to load announcements:', err)
            setError('Failed to load announcements')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.title || !formData.message) {
            addToast('Title and Message are required', 'error')
            return
        }

        if (user.role === 'INSTRUCTOR' && !formData.course_instance) {
            addToast('Please select a course for this announcement', 'error')
            return
        }

        try {
            setActionLoading(true)
            const isDeptHead = user.role === 'DEPARTMENT_HEAD'
            
            if (mode === 'create') {
                if (isDeptHead) {
                    await announcementsAPI.create({
                        title: formData.title,
                        message: formData.message,
                        audience: formData.audience,
                        department: user.department
                    })
                } else {
                    await announcementsAPI.createCourseAnnouncement({
                        title: formData.title,
                        message: formData.message,
                        course_instance: parseInt(formData.course_instance)
                    })
                }
                addToast('Announcement published', 'success')
            } else if (mode === 'edit' && selectedId) {
                const updatePayload = {
                    title: formData.title,
                    message: formData.message
                }
                if (isDeptHead) {
                    updatePayload.audience = formData.audience
                    await announcementsAPI.patch(selectedId, updatePayload)
                } else {
                    updatePayload.course_instance = parseInt(formData.course_instance)
                    await announcementsAPI.patchCourseAnnouncement(selectedId, updatePayload)
                }
                addToast('Announcement updated', 'success')
            }
            
            await loadAnnouncements()
            setMode('list')
            setFormData({ title: '', message: '', audience: 'ALL', course_instance: '' })
            setSelectedId(null)
        } catch (err) {
            console.error('Save failed:', err)
            addToast('Failed to save announcement', 'error')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteId) return

        try {
            setActionLoading(true)
            if (user.role === 'DEPARTMENT_HEAD') {
                await announcementsAPI.delete(deleteId)
            } else {
                await announcementsAPI.deleteCourseAnnouncement(deleteId)
            }
            
            addToast('Announcement deleted', 'success')
            setDeleteId(null)
            if (selectedId === deleteId) {
                setSelectedId(null)
                setMode('list')
            }
            await loadAnnouncements()
        } catch (err) {
            console.error('Delete failed:', err)
            addToast('Failed to delete announcement', 'error')
        } finally {
            setActionLoading(false)
        }
    }

    const handleEditClick = (announcement) => {
        setSelectedId(announcement.id)
        setFormData({ 
            title: announcement.title, 
            message: announcement.message,
            audience: announcement.audience || 'ALL',
            course_instance: announcement.course_instance || ''
        })
        setMode('edit')
    }

    const handleCreateClick = () => {
        setSelectedId(null)
        setFormData({ title: '', message: '', audience: 'ALL', course_instance: '' })
        setMode('create')
    }

    if (!isOpen) return null

    const selectedAnnouncement = announcements.find(a => a.id === selectedId)

    return (
        <div className="announcements-overlay" onClick={onClose}>
            <div 
                className="announcements-modal" 
                onClick={e => e.stopPropagation()} 
            >
                <div className="announcements-header">
                    <div className="announcements-header-content">
                        <h2>{user.role === 'DEPARTMENT_HEAD' ? 'Department Announcements' : 'Course Announcements'}</h2>
                        <p>Manage and broadcast communications</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
                </div>

                <div className="announcements-body">
                    
                    <div className="announcements-sidebar">
                        <div className="sidebar-actions">
                            <button 
                                className="btn btn-primary" 
                                style={{ width: '100%', justifyContent: 'center' }}
                                onClick={handleCreateClick}
                            >
                                <span style={{ marginRight: '8px', fontSize: '1.1em' }}>+</span> New Announcement
                            </button>
                        </div>
                        
                        <div className="sidebar-list">
                            {loading ? (
                                <div style={{ padding: '2rem', textAlign: 'center' }}><LoadingState /></div>
                            ) : error ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>{error}</div>
                            ) : announcements.length === 0 ? (
                                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                    No announcements yet.
                                </div>
                            ) : (
                                announcements.map(item => (
                                    <div 
                                        key={item.id}
                                        className={`announcement-item ${selectedId === item.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedId(item.id)
                                            setMode('view')
                                        }}
                                    >
                                        <div className="announcement-item-header">
                                            <div className="announcement-item-title">{item.title}</div>
                                            <div className="announcement-date">
                                                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                        <div className="announcement-preview">
                                            {item.message}
                                        </div>
                                        <div className="meta-badges">
                                            {item.audience && (
                                                <span className="badge-audience">
                                                    {item.audience.charAt(0).toUpperCase() + item.audience.slice(1).toLowerCase()}
                                                </span>
                                            )}
                                            {item.course_instance && (
                                                <span className="badge-course">
                                                    Course #{item.course_instance}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="announcements-main">
                        {mode === 'list' && !selectedId && (
                            <div className="empty-selection">
                                <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <h3>Select an announcement</h3>
                                <p>Choose an item from the list to view details or create a new one.</p>
                            </div>
                        )}

                        {mode === 'view' && selectedAnnouncement && (
                            <div>
                                <div className="view-header">
                                    <div className="view-meta">
                                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)' }}>
                                            Posted on {new Date(selectedAnnouncement.created_at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                                        </span>
                                        {selectedAnnouncement.audience && (
                                            <span className="badge-audience">
                                                Target: {selectedAnnouncement.audience}
                                            </span>
                                        )}
                                        {selectedAnnouncement.course_instance && (
                                            <span className="badge-course">
                                                Course ID: {selectedAnnouncement.course_instance}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="view-actions">
                                        <button 
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleEditClick(selectedAnnouncement)}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            className="btn btn-sm"
                                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                            onClick={() => setDeleteId(selectedId)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <h1 className="view-title">
                                    {selectedAnnouncement.title}
                                </h1>
                                <div className="view-message">
                                    {selectedAnnouncement.message}
                                </div>
                            </div>
                        )}

                        {(mode === 'create' || mode === 'edit') && (
                            <div className="form-container">
                                <div className="form-header">
                                    <h2>{mode === 'create' ? 'Compose Announcement' : 'Edit Announcement'}</h2>
                                </div>
                                <form onSubmit={handleSubmit} className="announcement-form">
                                    <div className="form-group">
                                        <label>Title</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            maxLength={150}
                                            required
                                            placeholder="e.g., Midterm Exam Schedule Change"
                                            autoFocus
                                        />
                                    </div>

                                    {user.role === 'DEPARTMENT_HEAD' && (
                                        <div className="form-group">
                                            <label>Target Audience</label>
                                            <select
                                                value={formData.audience}
                                                onChange={e => setFormData({ ...formData, audience: e.target.value })}
                                            >
                                                <option value="ALL">Everyone (Students & Instructors)</option>
                                                <option value="STUDENTS">Students Only</option>
                                                <option value="INSTRUCTORS">Instructors Only</option>
                                            </select>
                                        </div>
                                    )}

                                    {user.role === 'INSTRUCTOR' && (
                                        <div className="form-group">
                                            <label>Select Course</label>
                                            <select
                                                value={formData.course_instance}
                                                onChange={e => setFormData({ ...formData, course_instance: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Choose a Course --</option>
                                                {instructorCourses.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.full_code || c.code} - {c.course_name || c.course_template?.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Message Content</label>
                                        <textarea
                                            value={formData.message}
                                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                                            required
                                            placeholder="Type your announcement details here..."
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary" 
                                            onClick={() => {
                                                if (mode === 'edit') setMode('view')
                                                else setMode('list')
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                            {actionLoading ? 'Publishing...' : (mode === 'create' ? 'Publish Announcement' : 'Save Changes')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>

            </div>
            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Delete Announcement"
                message="Are you sure you want to delete this announcement? This action cannot be undone."
                confirmVariant="danger"
            />
        </div>
    )
}

export default AnnouncementsModal
