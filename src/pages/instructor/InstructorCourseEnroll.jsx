import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { usersAPI } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

const InstructorCourseEnroll = () => {
    const { user } = useAuth()
    const { addToast } = useToast()
    const { courseId } = useParams()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [course, setCourse] = useState(null)
    const [deptStudents, setDeptStudents] = useState([])

    const [availableStudents, setAvailableStudents] = useState([])
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [classYearFilter, setClassYearFilter] = useState('')

    // Manual Enroll State
    const [studentIdsInput, setStudentIdsInput] = useState('')
    const [enrolling, setEnrolling] = useState(false)
    const [bulkEnrolling, setBulkEnrolling] = useState(false)

    useEffect(() => {
        if (courseId) {
            loadData()
        }
    }, [courseId])

    useEffect(() => {
        if (course) {
            processAvailableStudents()
        }
    }, [course, deptStudents, classYearFilter])

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            const courseData = await coursesAPI.get(courseId)
            setCourse(courseData)

            if (user?.department) {
                try {
                    let allStudents = []
                    let nextUrl = null
                    let params = { role: 'STUDENT', department: user.department }

                    const response = await usersAPI.list(params)

                    if (response.results && Array.isArray(response.results)) {
                        allStudents = [...response.results]
                        nextUrl = response.next
                    } else if (Array.isArray(response)) {
                        allStudents = response
                    }

                    // Recursive fetching
                    while (nextUrl) {
                        const urlObj = new URL(nextUrl)
                        const page = urlObj.searchParams.get('page')
                        const nextRes = await usersAPI.list({ ...params, page })
                        if (nextRes.results) {
                            allStudents = [...allStudents, ...nextRes.results]
                            nextUrl = nextRes.next
                        } else {
                            nextUrl = null
                        }
                    }

                    setDeptStudents(allStudents)
                } catch (uErr) {
                    console.warn('Failed to load department students:', uErr)
                }
            }

        } catch (err) {
            console.error('Failed to load course data:', err)
            setError(err.response?.data?.detail || 'Failed to load course data')
        } finally {
            setLoading(false)
        }
    }

    const processAvailableStudents = () => {
        if (!course) return

        // Enrolled Student IDs
        const enrolledIds = new Set((course.students || []).map(s => s.id))

        const filtered = deptStudents.filter(s => {
            // Exclude enrolled
            if (enrolledIds.has(s.id)) return false

            // Filter by Class Year if set
            if (classYearFilter) {
                return s.class_year?.toString().includes(classYearFilter)
            }
            return true
        })

        setAvailableStudents(filtered.map(s => ({
            ...s,
            full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim()
        })))
        // Update selection to remove any IDs that are no longer available (optional, but good UX)
        // For simplicity, we can clear selection or keep it. Let's keep valid selection.
        setSelectedIds(prev => {
            const next = new Set()
            filtered.forEach(s => {
                if (prev.has(s.id)) next.add(s.id)
            })
            return next
        })
    }

    const handleEnroll = async () => {
        if (!studentIdsInput.trim()) return

        try {
            setEnrolling(true)

            const inputIds = studentIdsInput
                .split(',')
                .map(s => s.trim())
                .filter(s => s)

            if (inputIds.length === 0) {
                setEnrolling(false)
                return
            }

            // Map Student IDs (e.g., "900123") to Internal IDs
            const internalIds = []
            const notFoundIds = []

            if (deptStudents.length === 0) {
                addToast('Unable to verify Student IDs (cannot list department students).', 'error')
                setEnrolling(false)
                return
            }

            inputIds.forEach(sid => {
                const student = deptStudents.find(s => s.student_id === sid)
                if (student) {
                    internalIds.push(student.student_id)
                } else {
                    notFoundIds.push(sid)
                }
            })

            if (notFoundIds.length > 0) {
                addToast(`Student IDs not found: ${notFoundIds.join(', ')}`, 'error')
                setEnrolling(false)
                return
            }

            await coursesAPI.enroll_students(courseId, { student_ids: internalIds })

            addToast('Students enrolled successfully!', 'success')
            setStudentIdsInput('')

            // Navigate back to student list
            navigate(`/app/instructor/courses/${courseId}/students`)

        } catch (err) {
            console.error('Enrollment failed:', err)
            addToast(err.response?.data?.detail || 'Failed to enroll students', 'error')
        } finally {
            setEnrolling(false)
        }
    }

    const handleBulkEnroll = async () => {
        if (selectedIds.size === 0) return

        try {
            setBulkEnrolling(true)
            const idstoEnroll = Array.from(selectedIds).map(dbId => {
                const s = availableStudents.find(st => st.id === dbId)
                return s ? s.student_id : null
            }).filter(Boolean)

            if (idstoEnroll.length === 0) return

            await coursesAPI.enroll_students(courseId, { student_ids: idstoEnroll })

            addToast(`Successfully enrolled ${idstoEnroll.length} students`, 'success')

            // Reload course to update enrolled list
            loadData()
            // processAvailableStudents will trigger via useEffect when course updates
            setSelectedIds(new Set())

        } catch (err) {
            console.error('Bulk enrollment failed:', err)
            addToast('Failed to enroll selected students', 'error')
        } finally {
            setBulkEnrolling(false)
        }
    }

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(availableStudents.map(s => s.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelectOne = (id) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    if (loading && !course) return <LoadingState />
    if (error && !course) return <ErrorState error={error} onRetry={loadData} />
    if (!course) return <div>Course not found</div>

    const courseName = typeof course.course_template === 'object'
        ? course.course_template.name
        : 'N/A'

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">{course.full_code || course.code} - Enroll Students</h1>
                    <p className="page-subtitle">Add new students to {courseName}</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/app/instructor/courses/${courseId}/students`)}
                >
                    Back to Student List
                </button>
            </div>

            <div className="info-card" style={{ maxWidth: '32rem', margin: '0 auto', padding: '1.5rem' }}>
                <h2 className="section-title" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    Manual Enroll
                </h2>

                <div className="form-group">
                    <label className="form-label">Student IDs</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <input
                            type="text"
                            className="form-input"
                            style={{ flex: 1 }}
                            value={studentIdsInput}
                            onChange={(e) => setStudentIdsInput(e.target.value)}
                            placeholder="e.g. 20205011, 20205012"
                            disabled={enrolling}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleEnroll}
                            disabled={enrolling || !studentIdsInput.trim()}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {enrolling ? 'Enrolling...' : 'Enroll'}
                        </button>
                    </div>
                    <span className="text-secondary text-sm mt-1 block">
                        Enter comma-separated Student IDs.
                    </span>
                </div>
            </div>

            {/* Bulk Enroll Section */}
            <div className="card" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Batch Enroll from Department</h2>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select
                            className="form-select"
                            value={classYearFilter}
                            onChange={(e) => setClassYearFilter(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', borderColor: '#cbd5e1' }}
                        >
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>

                        <button
                            className="btn btn-primary"
                            disabled={selectedIds.size === 0 || bulkEnrolling}
                            onClick={handleBulkEnroll}
                        >
                            {bulkEnrolling ? 'Enrolling...' : `Enroll Selected (${selectedIds.size})`}
                        </button>
                    </div>
                </div>

                <div className="info-card p-0 overflow-hidden">
                    <DataTable
                        columns={[
                            {
                                header: (
                                    <input
                                        type="checkbox"
                                        checked={availableStudents.length > 0 && selectedIds.size === availableStudents.length}
                                        onChange={handleSelectAll}
                                    />
                                ),
                                accessor: 'select',
                                render: r => (
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(r.id)}
                                        onChange={() => handleSelectOne(r.id)}
                                    />
                                ),
                                sortable: false,
                                width: '40px'
                            },
                            { header: 'Student ID', accessor: 'student_id', sortable: true },
                            { header: 'Name', accessor: 'full_name', sortable: true },
                            { header: 'Class Year', accessor: 'class_year', sortable: true },
                        ]}
                        data={availableStudents}
                        pagination={true}
                        itemsPerPage={10}
                        compact={true}
                        emptyMessage="No available students found."
                    />
                </div>
            </div>
        </div>
    )
}

export default InstructorCourseEnroll
