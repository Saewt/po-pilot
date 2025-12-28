import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI } from '../api/courses'
import { useToast } from '../context/ToastContext'
import ConfirmationModal from './ConfirmationModal'

/**
 * Button to finalize a course with confirmation modal
 * Handles API call and error display
 */
const FinalizeCourseButton = ({ courseId, disabled, onSuccess }) => {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleFinalize = async () => {
        setLoading(true)
        setError(null)

        try {
            await coursesAPI.finalize(courseId)
            addToast('Course finalized successfully!', 'success')
            setIsModalOpen(false)

            if (onSuccess) {
                onSuccess()
            } else {
                navigate(`/app/instructor/courses/${courseId}/summary`)
            }
        } catch (err) {
            console.error('Finalization failed:', err)
            const errorData = err.response?.data

            if (errorData) {
                setError(errorData)
            } else {
                setError({ detail: 'Failed to finalize course. Please try again.' })
            }
        } finally {
            setLoading(false)
        }
    }

    const renderErrorContent = () => {
        if (!error) return null

        return (
            <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginTop: '1rem'
            }}>
                <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '0.5rem' }}>
                    Cannot finalize course:
                </div>

                {error.detail && (
                    <p style={{ color: '#b91c1c', margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                        {error.detail}
                    </p>
                )}

                {error.weight_error && (
                    <p style={{ color: '#b91c1c', margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                        • {error.weight_error}
                    </p>
                )}

                {error.missing_grades && error.missing_grades.length > 0 && (
                    <div style={{ fontSize: '0.875rem', color: '#b91c1c' }}>
                        <p style={{ margin: '0 0 0.25rem 0' }}>
                            • {error.missing_grades.length} students missing grades:
                        </p>
                        <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                            {error.missing_grades.slice(0, 5).map((item, idx) => (
                                <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                    {item.student_name} - Missing: {item.assessments?.join(', ') || 'Unknown'}
                                </li>
                            ))}
                            {error.missing_grades.length > 5 && (
                                <li style={{ fontStyle: 'italic' }}>
                                    ... and {error.missing_grades.length - 5} more
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                disabled={disabled || loading}
                style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: disabled ? '#9ca3af' : '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: disabled ? 0.6 : 1
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                </svg>
                Finalize Course
            </button>

            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(4px)'
                        }}
                        onClick={() => !loading && setIsModalOpen(false)}
                    />
                    <div style={{
                        position: 'relative',
                        backgroundColor: 'white',
                        borderRadius: '0.75rem',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        width: '100%',
                        maxWidth: '32rem',
                        padding: '1.5rem'
                    }}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: '#111827',
                            marginTop: 0,
                            marginBottom: '1rem'
                        }}>
                            Finalize Course
                        </h3>

                        <div style={{
                            backgroundColor: '#fef3c7',
                            border: '1px solid #fcd34d',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            marginBottom: '1rem'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
                                <strong>Warning:</strong> This action will:
                            </p>
                            <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, fontSize: '0.875rem', color: '#92400e' }}>
                                <li>Lock all grades permanently</li>
                                <li>Mark the course as completed</li>
                                <li>Students will receive their final grades</li>
                            </ul>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                            Are you sure you want to finalize this course? This action cannot be undone.
                        </p>

                        {renderErrorContent()}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={loading}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: 'white',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalize}
                                disabled={loading}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#16a34a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? 'Finalizing...' : 'Confirm Finalize'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default FinalizeCourseButton
