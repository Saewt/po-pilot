import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usersAPI } from '../../api/users'
import { useToast } from '../../context/ToastContext'
import DataTable from '../../components/DataTable'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import '../../styles/pages.css'

/**
 * Page: Department Instructor List
 * Displays a list of instructors in the department
 */
const DeptInstructorList = () => {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [instructors, setInstructors] = useState([])

    // Registration State
    const [showRegister, setShowRegister] = useState(false)
    const [regData, setRegData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        role: 'INSTRUCTOR'
    })

    useEffect(() => {
        loadInstructors()
    }, [])

    const loadInstructors = async () => {
        try {
            setLoading(true)
            const response = await usersAPI.list({
                role: 'INSTRUCTOR',
                department: user.department
            })
            // Handle pagination or direct array
            const data = response.results || response
            setInstructors(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load instructors:', err)
            setError('Failed to load instructors list')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        if (!regData.first_name || !regData.last_name || !regData.email) {
            addToast('All fields are required', 'error')
            return
        }

        try {
            setLoading(true)
            // Payload as requested: { email, first_name, last_name, role }
            await usersAPI.create({
                email: regData.email,
                first_name: regData.first_name,
                last_name: regData.last_name,
                role: 'INSTRUCTOR'
            })
            addToast('Instructor registered successfully', 'success')
            setShowRegister(false)
            setRegData({ first_name: '', last_name: '', email: '', role: 'INSTRUCTOR' })
            await loadInstructors()
        } catch (err) {
            console.error('Registration failed:', err)
            const errorData = err.response?.data || {}
            const errorMessage = errorData.detail ||
                Object.entries(errorData)
                    .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
                    .join('\n') ||
                'Failed to register instructor'
            addToast(errorMessage, 'error')
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        {
            header: 'Name',
            accessor: 'first_name',
            render: (row) => `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        },
        { header: 'Email', accessor: 'email' },
    ]

    if (loading && instructors.length === 0 && !showRegister) return <LoadingState />
    if (error) return <ErrorState error={error} />

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="page-title">Instructors</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowRegister(true)}
                    >
                        Register Instructor
                    </button>
                    <button className="btn btn-secondary" onClick={loadInstructors}>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="info-card">
                <p>List of all instructors in your department.</p>
                <strong>Created instructor password are generated automatically. by default name and surname are used as password.</strong>
            </div>

            <DataTable
                columns={columns}
                data={instructors}
                emptyMessage="No instructors found in this department."
            />

            {/* Registration Modal */}
            {showRegister && (
                <div className="modal-overlay" onClick={() => setShowRegister(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Register New Instructor</h3>
                        <form onSubmit={handleRegister}>
                            <div className="form-group">
                                <label>First Name:</label>
                                <input
                                    type="text"
                                    value={regData.first_name}
                                    onChange={e => setRegData({ ...regData, first_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name:</label>
                                <input
                                    type="text"
                                    value={regData.last_name}
                                    onChange={e => setRegData({ ...regData, last_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email:</label>
                                <input
                                    type="email"
                                    value={regData.email}
                                    onChange={e => setRegData({ ...regData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRegister(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    Register
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DeptInstructorList
