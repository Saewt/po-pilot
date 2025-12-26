import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const DeptPOModal = ({ isOpen, onClose, onSubmit, initialData = null, mode = 'create' }) => {
    const { addToast } = useToast()
    
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        is_active: true
    })

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormData({
                    code: initialData.code || initialData.full_code || '',
                    description: initialData.description || '',
                    is_active: initialData.is_active
                })
            } else {
                setFormData({
                    code: '',
                    description: '',
                    is_active: true
                })
            }
        }
    }, [isOpen, initialData, mode])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.code || !formData.description) {
            addToast('Code and Description are required', 'error')
            return
        }

        setLoading(true)
        try {
            await onSubmit(formData)
            onClose()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const verbs = ['Analyze', 'Design', 'Evaluate', 'Create', 'Apply', 'Understand']

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div 
                className="modal-content" 
                onClick={e => e.stopPropagation()} 
                style={{ 
                    maxWidth: '650px', 
                    width: '95%', 
                    background: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    padding: '2.5rem',
                    position: 'relative',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ 
                        margin: 0, 
                        fontSize: '1.5rem', 
                        fontWeight: 700,
                        color: '#111827',
                        letterSpacing: '-0.025em'
                    }}>
                        {mode === 'edit' ? 'Edit Program Outcome' : 'Create Program Outcome'}
                    </h2>
                    <p style={{ 
                        margin: '0.5rem 0 0', 
                        color: '#6b7280', 
                        fontSize: '1rem' 
                    }}>
                        Define what students should be able to do by the time they graduate.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start', 
                        marginBottom: '2rem',
                        gap: '2rem'
                    }}>
                        <div style={{ flex: '0 0 auto' }}>
                            <label style={{ 
                                display: 'block', 
                                fontSize: '0.875rem', 
                                fontWeight: 600, 
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Outcome Code
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                disabled={mode === 'edit'}
                                placeholder="PO-1"
                                required
                                style={{ 
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    padding: '0.75rem 1rem',
                                    width: '120px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    backgroundColor: mode === 'edit' ? '#f3f4f6' : '#fff',
                                    color: '#111827',
                                    outline: 'none',
                                    transition: 'border-color 0.15s ease-in-out'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <label style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.75rem', 
                                cursor: 'pointer',
                                userSelect: 'none'
                            }}>
                                <span style={{ 
                                    fontSize: '0.875rem', 
                                    fontWeight: 600, 
                                    color: formData.is_active ? '#059669' : '#6b7280' 
                                }}>
                                    {formData.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <div style={{
                                    position: 'relative',
                                    width: '44px',
                                    height: '24px',
                                    backgroundColor: formData.is_active ? '#10b981' : '#e5e7eb',
                                    borderRadius: '9999px',
                                    transition: 'background-color 0.2s'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: '2px',
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: 'white',
                                        borderRadius: '50%',
                                        transform: formData.is_active ? 'translateX(20px)' : 'translateX(0)',
                                        transition: 'transform 0.2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }} />
                                    <input 
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                    />
                                </div>
                            </label>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2.5rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ 
                                display: 'block', 
                                fontSize: '0.875rem', 
                                fontWeight: 600, 
                                color: '#374151',
                                marginBottom: '0.75rem'
                            }}>
                                Description
                            </label>
                            
                            <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '0.5rem', 
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px dashed #cbd5e1'
                            }}>
                                <span style={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600, 
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginRight: '0.5rem'
                                }}>
                                    SUGGESTED VERBS:
                                </span>
                                {verbs.map(verb => (
                                    <span key={verb} style={{ 
                                        background: '#fff', 
                                        color: '#0ea5e9', 
                                        padding: '4px 10px', 
                                        borderRadius: '9999px', 
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        border: '1px solid #e0f2fe',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}>
                                        {verb}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={6}
                            placeholder="Example: Graduates will demonstrate an ability to apply knowledge of mathematics..."
                            required
                            style={{ 
                                width: '100%',
                                fontSize: '1.125rem',
                                lineHeight: '1.75',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                color: '#111827',
                                resize: 'vertical',
                                minHeight: '150px',
                                fontFamily: 'inherit',
                                outline: 'none',
                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: '1rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid #f3f4f6'
                    }}>
                        <button 
                            type="button" 
                            onClick={onClose}
                            style={{
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                fontWeight: 500,
                                color: '#4b5563',
                                background: 'transparent',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseOver={e => e.target.style.backgroundColor = '#f9fafb'}
                            onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{
                                padding: '0.75rem 2rem',
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: '#fff',
                                backgroundColor: '#2563eb',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                                transition: 'all 0.15s ease',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseOver={e => !loading && (e.target.style.backgroundColor = '#1d4ed8')}
                            onMouseOut={e => !loading && (e.target.style.backgroundColor = '#2563eb')}
                        >
                            {loading ? 'Saving...' : 'Save Outcome'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default DeptPOModal
