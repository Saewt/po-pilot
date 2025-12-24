import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usersAPI } from '../../api/users'
import { useToast } from '../../context/ToastContext'
import DataTable from '../../components/DataTable'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DeptInstructorsToolbar from '../../components/DeptInstructorsToolbar'
import '../../styles/pages.css'

const DeptInstructorList = () => {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [instructors, setInstructors] = useState([])

    const [filters, setFilters] = useState({
        name: '',
        email: ''
    })

    const [showRegister, setShowRegister] = useState(false)
    const [regData, setRegData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        role: 'INSTRUCTOR'
    })
    const [regLoading, setRegLoading] = useState(false)

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
            setRegLoading(true)
            await usersAPI.create({
                email: regData.email,
                first_name: regData.first_name,
                last_name: regData.last_name,
                role: 'INSTRUCTOR',
                department: user.department
            })
            addToast('Instructor registered successfully', 'success')
            setShowRegister(false)
            setRegData({ first_name: '', last_name: '', email: '', role: 'INSTRUCTOR' })
            await loadInstructors()
        } catch (err) {
            console.error('Registration failed:', err)
            const errorData = err.response?.data || {}
            const errorMessage = errorData.detail || 'Failed to register instructor'
            addToast(errorMessage, 'error')
        } finally {
            setRegLoading(false)
        }
    }

    const filteredInstructors = instructors.filter(inst => {
        const fullName = `${inst.first_name || ''} ${inst.last_name || ''}`.toLowerCase()
        const matchName = fullName.includes(filters.name.toLowerCase())
        const matchEmail = inst.email?.toLowerCase().includes(filters.email.toLowerCase())
        return matchName && matchEmail
    })

    const columns = [
        {
            header: 'Name',
            accessor: 'first_name',
            render: (row) => (
                <div style={{ fontWeight: 500, color: '#1e293b' }}>
                    {`${row.first_name || ''} ${row.last_name || ''}`.trim()}
                </div>
            ),
        },
        { 
            header: 'Email', 
            accessor: 'email',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#64748b' }}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    {row.email}
                </div>
            )
        },
    ]

    if (loading && instructors.length === 0 && !showRegister) return <LoadingState />
    if (error) return <ErrorState error={error} />

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="page-title">Instructors</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowRegister(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>+</span>
                        Register Instructor
                    </button>
                </div>
            </div>

            <DeptInstructorsToolbar
                filters={filters}
                onFilterChange={(field, value) => setFilters(prev => ({ ...prev, [field]: value }))}
                onReset={() => setFilters({ name: '', email: '' })}
            />

            <div className="info-card" style={{ marginTop: '1rem', background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <div>
                        <strong>Note:</strong> Created instructor passwords are generated automatically. By default, "FirstName+LastName" is used as the password.
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredInstructors}
                emptyMessage="No instructors found."
            />

            {showRegister && (
                <div className="modal-overlay" onClick={() => setShowRegister(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #eee', marginBottom: '1.5rem' }}>
                            <h3 className="modal-title" style={{ margin: 0 }}>Register New Instructor</h3>
                        </div>
                        
                        <form onSubmit={handleRegister}>
                            <div className="form-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={regData.first_name}
                                    onChange={e => setRegData({ ...regData, first_name: e.target.value })}
                                    required
                                    style={{ fontSize: '1rem', padding: '0.6rem' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={regData.last_name}
                                    onChange={e => setRegData({ ...regData, last_name: e.target.value })}
                                    required
                                    style={{ fontSize: '1rem', padding: '0.6rem' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={regData.email}
                                    onChange={e => setRegData({ ...regData, email: e.target.value })}
                                    required
                                    style={{ fontSize: '1rem', padding: '0.6rem' }}
                                />
                            </div>
                            
                            <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRegister(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={regLoading}>
                                    {regLoading ? 'Registering...' : 'Register Instructor'}
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
