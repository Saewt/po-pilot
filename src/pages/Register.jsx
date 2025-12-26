import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { departmentsAPI } from '../api/departments'
import './Auth.css'

/**
 * Register Page
 * Student registration form
 */

/**
 * Register Page
 * Student registration form
 */
const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    student_id: '',
    department: '',
  })
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingDepts, setLoadingDepts] = useState(true)

  const { register, user } = useAuth()
  const navigate = useNavigate()

  // Redirect after successful registration based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'STUDENT') {
        navigate('/app/student', { replace: true })
      } else if (user.role === 'INSTRUCTOR') {
        navigate('/app/instructor', { replace: true })
      } else if (user.role === 'DEPARTMENT_HEAD') {
        navigate('/app/dept', { replace: true })
      } else {
        navigate('/app', { replace: true })
      }
    }
  }, [user, navigate])

  // Fetch departments on mount
  // NOTE: If departments endpoint requires auth, we'll handle it gracefully
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await departmentsAPI.list()
        // Handle paginated response (if using DRF pagination)
        const depts = response.results || response
        setDepartments(Array.isArray(depts) ? depts.filter(dept => dept.is_active !== false) : [])
        setError('') // Clear any previous errors
      } catch (err) {
        console.error('Failed to fetch departments:', err)
        if (err.response?.status === 401) {
          // Departments require auth - show user-friendly message
          setError('Unable to load departments list. Please contact an administrator or try logging in first.')
          // Don't block registration - allow manual department ID entry
          setDepartments([])
        } else {
          setError('Failed to load departments. You can still register by entering a department ID manually.')
          setDepartments([])
        }
      } finally {
        setLoadingDepts(false)
      }
    }
    fetchDepartments()
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match')
      return
    }

    if (formData.student_id.length !== 9 || !/^\d+$/.test(formData.student_id)) {
      setError('Student ID must be exactly 9 digits')
      return
    }

    if (!formData.email.endsWith('.edu.tr')) {
      setError('Email must end with .edu.tr')
      return
    }

    if (!formData.department) {
      setError('Please select or enter a department')
      return
    }

    setLoading(true)

    try {
      // Convert department to integer
      const departmentId = parseInt(formData.department)
      if (isNaN(departmentId)) {
        setError('Department must be a valid number')
        setLoading(false)
        return
      }

      // Prepare register data according to API schema
      const registerData = {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name,
        last_name: formData.last_name,
        student_id: formData.student_id,
        department: departmentId,
      }

      console.log('Attempting registration with data:', { ...registerData, password: '***', password_confirm: '***' })

      const result = await register(registerData)
      
      if (!result.success) {
        setError(result.error || 'Registration failed')
        setLoading(false)
      }
      // If successful, the redirect will happen via useEffect when user is loaded
    } catch (err) {
      console.error('Registration error:', err)
      console.error('Error status:', err.response?.status)
      console.error('Error data:', err.response?.data)
      
      if (err.response?.status === 401) {
        setError('Authentication error. The registration endpoint may require authentication. Please contact an administrator.')
      } else {
        const errorMsg = err.response?.data?.detail || 
                        (err.response?.data && typeof err.response.data === 'object'
                          ? Object.entries(err.response.data)
                              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                              .join('; ')
                          : null) ||
                        err.message ||
                        'Registration failed'
        setError(errorMsg)
      }
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>PO Pilot</h1>
        <h2>Student Registration</h2>
        
        {error && <div className="error-message">{error}</div>}

        {loadingDepts ? (
          <div>Loading departments...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email (.edu.tr required)</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your.email@university.edu.tr"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="student_id">Student ID (9 digits)</label>
              <input
                type="text"
                id="student_id"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                required
                maxLength={9}
                pattern="[0-9]{9}"
                placeholder="123456789"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">Department</label>
              {departments.length > 0 ? (
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Select a department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {dept.code && `(${dept.code})`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Enter department ID"
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password_confirm">Confirm Password</label>
              <input
                type="password"
                id="password_confirm"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}

        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register

