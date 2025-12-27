import { useState, useEffect } from 'react'
import { coursesAPI } from '../api/courses'
import { usersAPI } from '../api/users'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const CourseManagerModal = ({ onClose, onCourseCreated, editInstance = null }) => {
    const { user } = useAuth()
    const { addToast } = useToast()

    // Modes: 'select_template', 'create_template', 'create_instance', 'edit_instance'
    const [mode, setMode] = useState(editInstance ? 'edit_instance' : 'select_template')
    const [loading, setLoading] = useState(false)
    const [templates, setTemplates] = useState([])
    const [instructors, setInstructors] = useState([])

    // Selected Data
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [templateToDelete, setTemplateToDelete] = useState(null)

    // Forms
    const [templateForm, setTemplateForm] = useState({
        code: '',
        name: '',
        credit: '',
        target_class_year: ''
    })

    const [instanceForm, setInstanceForm] = useState({
        semester: 'FALL',
        year: new Date().getFullYear(),
        instructor_id: ''
    })

    // Load initial data
    useEffect(() => {
        loadData()
        if (editInstance) {
            setInstanceForm({
                semester: editInstance.semester,
                year: editInstance.year,
                instructor_id: editInstance.instructor?.id || ''
            })
        }
    }, [editInstance])

    const loadData = async () => {
        setLoading(true)
        try {
            const [tmps, insts] = await Promise.all([
                coursesAPI.templates.list(),
                usersAPI.list({ role: 'INSTRUCTOR', department: user.department })
            ])
            setTemplates(tmps.results || tmps || [])
            setInstructors(insts.results || insts || [])
        } catch (err) {
            console.error('Failed to load data:', err)
            addToast('Failed to load templates or instructors', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateTemplate = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const newTemplate = await coursesAPI.templates.create({
                ...templateForm,
                department_id: user.department // Explicitly sending department_id as requested by API error
            })
            addToast('Template created successfully', 'success')
            // Add to list and select it
            setTemplates([...templates, newTemplate])
            setSelectedTemplate(newTemplate)
            setMode('create_instance')
        } catch (err) {
            console.error('Create template error:', err)
            addToast(err.response?.data?.detail || 'Failed to create template', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteTemplate = async () => {
        if (!templateToDelete) return

        setLoading(true)
        try {
            await coursesAPI.templates.delete(templateToDelete.id)
            addToast('Template deleted successfully', 'success')

            // Remove from list
            setTemplates(templates.filter(t => t.id !== templateToDelete.id))
            setTemplateToDelete(null)
            setMode('select_template')
        } catch (err) {
            console.error('Delete template error:', err)
            addToast(err.response?.data?.detail || 'Failed to delete template', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateInstance = async (e) => {
        e.preventDefault()
        if (!selectedTemplate) return

        setLoading(true)
        try {
            await coursesAPI.create({
                course_template_id: selectedTemplate.id,
                semester: instanceForm.semester,
                year: parseInt(instanceForm.year),
                instructor: instanceForm.instructor_id || null,
                students: []
            })
            addToast('Course instance opened successfully', 'success')
            onCourseCreated()
            onClose()
        } catch (err) {
            console.error('Create instance error:', err)
            addToast(err.response?.data?.detail || 'Failed to open course session', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateInstance = async (e) => {
        e.preventDefault()
        if (!editInstance) return

        setLoading(true)
        try {
            // Check if update method exists on API, if not fallback to put/patch
            const updateFn = coursesAPI.update || coursesAPI.patch
            await updateFn(editInstance.id, {
                semester: instanceForm.semester,
                year: parseInt(instanceForm.year),
                instructor: instanceForm.instructor_id || null,
                course_template_id: editInstance.course_template.id
            })
            addToast('Course session updated successfully', 'success')
            onCourseCreated()
            onClose()
        } catch (err) {
            console.error('Update instance error:', err)
            addToast(err.response?.data?.detail || 'Failed to update course session', 'error')
        } finally {
            setLoading(false)
        }
    }

    // Render Steps
    const renderSelectTemplate = () => (
        <div className="step-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3>Select Course Template</h3>
                <button className="btn btn-secondary" onClick={() => setMode('create_template')}>
                    + New Template
                </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8f9fa' }}>
                        <tr>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Code</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Credit</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Target Year</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.map(t => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '8px' }}>{t.full_code || t.code}</td>
                                <td style={{ padding: '8px' }}>{t.name}</td>
                                <td style={{ padding: '8px' }}>{t.credit}</td>
                                <td style={{ padding: '8px' }}>{t.target_class_year || '-'}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => {
                                                setSelectedTemplate(t)
                                                setMode('create_instance')
                                            }}
                                        >
                                            Open Session
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            style={{ backgroundColor: '#d32f2f', color: 'white', border: 'none' }}
                                            onClick={() => {
                                                setTemplateToDelete(t)
                                                setMode('delete_confirmation')
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {templates.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                                    No templates found. Create one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )

    const renderCreateTemplate = () => (
        <div className="step-container">
            <h3>Create New Course Template</h3>
            <form onSubmit={handleCreateTemplate}>
                <div className="form-group">
                    <label>Course Code (e.g. 101)</label>
                    <input
                        type="text"
                        required
                        value={templateForm.code}
                        onChange={e => setTemplateForm({ ...templateForm, code: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Course Name</label>
                    <input
                        type="text"
                        required
                        value={templateForm.name}
                        onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Credit</label>
                    <input
                        type="number"
                        required
                        value={templateForm.credit}
                        onChange={e => setTemplateForm({ ...templateForm, credit: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Target Year</label>
                    <input
                        type="number"
                        value={templateForm.target_class_year}
                        onChange={e => setTemplateForm({ ...templateForm, target_class_year: e.target.value })}
                        placeholder="e.g. 1"
                    />
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setMode('select_template')}>
                        Back to List
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        Create & Continue
                    </button>
                </div>
            </form>
        </div>
    )

    const renderDeleteConfirmation = () => (
        <div className="step-container">
            <h3 style={{ color: '#d32f2f' }}>Delete Course Template</h3>
            <p style={{ margin: '1rem 0' }}>
                Are you sure you want to delete <strong>{templateToDelete?.full_code || templateToDelete?.code} - {templateToDelete?.name}</strong>?
            </p>
            <p style={{ margin: '1rem 0', color: '#666', fontSize: '0.9rem' }}>
                This action cannot be undone. It may affect historical data if this template was used in previous years.
            </p>
            <div className="modal-actions">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                        setTemplateToDelete(null)
                        setMode('select_template')
                    }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn"
                    style={{ backgroundColor: '#d32f2f', color: 'white' }}
                    onClick={handleDeleteTemplate}
                    disabled={loading}
                >
                    {loading ? 'Deleting...' : 'Confirm Delete'}
                </button>
            </div>
        </div>
    )

    const renderCreateInstance = () => (
        <div className="step-container">
            <h3>Open Session for {selectedTemplate?.code} - {selectedTemplate?.name}</h3>
            <form onSubmit={handleCreateInstance}>
                <div className="form-group">
                    <label>Semester</label>
                    <select
                        value={instanceForm.semester}
                        onChange={e => setInstanceForm({ ...instanceForm, semester: e.target.value })}
                    >
                        <option value="FALL">Fall</option>
                        <option value="SPRING">Spring</option>
                        <option value="SUMMER">Summer</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Year</label>
                    <input
                        type="number"
                        required
                        value={instanceForm.year}
                        onChange={e => setInstanceForm({ ...instanceForm, year: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Instructor (Optional)</label>
                    <select
                        value={instanceForm.instructor_id}
                        onChange={e => setInstanceForm({ ...instanceForm, instructor_id: e.target.value })}
                    >
                        <option value="">-- Select Instructor --</option>
                        {instructors.map(inst => (
                            <option key={inst.id} value={inst.id}>
                                {inst.first_name} {inst.last_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => {
                        setSelectedTemplate(null)
                        setMode('select_template')
                    }}>
                        Back
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        Open Session
                    </button>
                </div>
            </form>
        </div>
    )

    const renderEditInstance = () => (
        <div className="step-container">
            <h3>Edit Session: {editInstance?.full_code || editInstance?.course_template?.name}</h3>
            <form onSubmit={handleUpdateInstance}>
                <div className="form-group">
                    <label>Semester</label>
                    <select
                        value={instanceForm.semester}
                        onChange={e => setInstanceForm({ ...instanceForm, semester: e.target.value })}
                    >
                        <option value="FALL">Fall</option>
                        <option value="SPRING">Spring</option>
                        <option value="SUMMER">Summer</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Year</label>
                    <input
                        type="number"
                        required
                        value={instanceForm.year}
                        onChange={e => setInstanceForm({ ...instanceForm, year: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Instructor</label>
                    <select
                        value={instanceForm.instructor_id}
                        onChange={e => setInstanceForm({ ...instanceForm, instructor_id: e.target.value })}
                    >
                        <option value="">-- Not Assigned --</option>
                        {instructors.map(inst => (
                            <option key={inst.id} value={inst.id}>
                                {inst.first_name} {inst.last_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    )

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
                {mode === 'select_template' && renderSelectTemplate()}
                {mode === 'create_template' && renderCreateTemplate()}
                {mode === 'create_instance' && renderCreateInstance()}
                {mode === 'edit_instance' && renderEditInstance()}
                {mode === 'delete_confirmation' && renderDeleteConfirmation()}
            </div>
        </div>
    )
}

export default CourseManagerModal
