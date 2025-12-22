import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/auth'
import './Auth.css'

/**
 * Change Password Page
 * Forces user to change password if must_change_password is true,
 * or allows voluntary password change.
 */
const ChangePassword = () => {
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const { user, fetchUser, logout } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match')
            return
        }

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters long')
            return
        }

        setLoading(true)

        try {
            await authAPI.changePassword({
                old_password: oldPassword,
                new_password: newPassword,
            })

            setSuccess('Password changed successfully!')

            // Refresh user data (to update must_change_password flag)
            await fetchUser()

            // Redirect after a short delay
            setTimeout(() => {
                // Redirect based on role
                if (user.role === 'STUDENT') {
                    navigate('/app/student', { replace: true })
                } else if (user.role === 'INSTRUCTOR') {
                    navigate('/app/instructor', { replace: true })
                } else if (user.role === 'DEPARTMENT_HEAD') {
                    navigate('/app/dept', { replace: true })
                } else {
                    navigate('/app', { replace: true })
                }
            }, 1500)
        } catch (err) {
            console.error('Change password error:', err)
            setError(
                err.response?.data?.detail ||
                err.response?.data?.message ||
                'Failed to change password. Please check your current password.'
            )
            setLoading(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>PO Pilot</h1>
                <h2>Change Password</h2>

                {user?.must_change_password && (
                    <div className="info-message" style={{
                        backgroundColor: '#e3f2fd',
                        color: '#0d47a1',
                        padding: '1rem',
                        borderRadius: 'var(--border-radius)',
                        marginBottom: '1rem',
                        border: '1px solid #bbdefb',
                        fontSize: '0.875rem'
                    }}>
                        <strong>Security Update Required:</strong> You must change your password before accessing the application.
                    </div>
                )}

                {error && <div className="error-message">{error}</div>}
                {success && (
                    <div className="success-message" style={{
                        backgroundColor: '#e8f5e9',
                        color: '#1b5e20',
                        padding: '1rem',
                        borderRadius: 'var(--border-radius)',
                        marginBottom: '1rem',
                        border: '1px solid #c8e6c9',
                        fontSize: '0.875rem'
                    }}>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="oldPassword">Current Password</label>
                        <input
                            type="password"
                            id="oldPassword"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                            disabled={loading || success}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading || success}
                            minLength={8}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading || success}
                            minLength={8}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading || success}>
                        {loading ? 'Changing Password...' : 'Change Password'}
                    </button>
                </form>

                {!user?.must_change_password && (
                    <p className="auth-link">
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-secondary)',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            Cancel
                        </button>
                    </p>
                )}

                {user?.must_change_password && (
                    <p className="auth-link">
                        <button
                            onClick={logout}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-error)',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            Logout
                        </button>
                    </p>
                )}

            </div>
        </div>
    )
}

export default ChangePassword
