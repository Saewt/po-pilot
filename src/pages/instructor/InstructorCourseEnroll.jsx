import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { usersAPI } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * Enrollment page for instructors.
 * Shows unenrolled department students and allows enrolling them.
 */
const InstructorCourseEnroll = () => {
    const { user } = useAuth()
    const { addToast } = useToast()
    const { courseId } = useParams()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [course, setCourse] = useState(null)
    const [deptStudents, setDeptStudents] = useState([])

    const [selectedIds, setSelectedIds] = useState(new Set())
    const [classYearFilter, setClassYearFilter] = useState('')
    const [enrolling, setEnrolling] = useState(false)

    // Single ref to track if initial load has happened - prevents StrictMode double-fetch
    const loadStartedRef = useRef(false)

    // Load data ONCE on mount
    useEffect(() => {
        // Guard against StrictMode double-mount and re-renders
        if (loadStartedRef.current) return
        loadStartedRef.current = true

        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)

                // 1. Fetch course
                const courseData = await coursesAPI.get(courseId)
                setCourse(courseData)

                // 2. Fetch department students (single request, no pagination for simplicity)
                if (user?.department) {
                    const response = await usersAPI.list({
                        role: 'STUDENT',
                        department: user.department,
                        limit: 500 // Get all in one request
                    })

                    const students = response.results || response || []
                    setDeptStudents(students)
                }
            } catch (err) {
                console.error('Failed to load data:', err)
                setError(err.response?.data?.detail || 'Failed to load data')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Empty deps - only run once on mount

    // Compute available (unenrolled) students using useMemo - no API calls, just filtering
    const availableStudents = useMemo(() => {
        if (!course || !deptStudents.length) return []

        // Get IDs of already enrolled students
        const enrolledIds = new Set((course.students || []).map(s => s.id))

        return deptStudents
            .filter(student => {
                // Exclude already enrolled students
                if (enrolledIds.has(student.id)) return false

                // Apply class year filter if set
                if (classYearFilter && student.class_year?.toString() !== classYearFilter) {
                    return false
                }

                return true
            })
            .map(s => ({
                ...s,
                full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim()
            }))
    }, [course, deptStudents, classYearFilter])

    const handleEnroll = async () => {
        if (selectedIds.size === 0) return

        try {
            setEnrolling(true)

            // Get student_ids from selected database IDs
            const studentIds = Array.from(selectedIds)
                .map(dbId => {
                    const student = availableStudents.find(s => s.id === dbId)
                    return student?.student_id
                })
                .filter(Boolean)

            if (studentIds.length === 0) return

            await coursesAPI.enroll_students(courseId, { student_ids: studentIds })

            addToast(`Successfully enrolled ${studentIds.length} students`, 'success')

            // Navigate back to student list
            navigate(`/app/instructor/courses/${courseId}/students`)

        } catch (err) {
            console.error('Enrollment failed:', err)
            addToast(err.response?.data?.detail || 'Failed to enroll students', 'error')
        } finally {
            setEnrolling(false)
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
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    if (loading) return <LoadingState />
    if (error) return <ErrorState error={error} />
    if (!course) return <div>Course not found</div>

    const courseName = typeof course.course_template === 'object'
        ? course.course_template.name
        : 'N/A'

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">{course.full_code || course.code} - Enroll Students</h1>
                    <p className="page-subtitle">Add students to {courseName}</p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate(`/app/instructor/courses/${courseId}/students`)}
                >
                    Back to Student List
                </button>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>
                        Unenrolled Students ({availableStudents.length})
                    </h2>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select
                            className="form-select"
                            value={classYearFilter}
                            onChange={(e) => setClassYearFilter(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', minWidth: '120px' }}
                        >
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>

                        <button
                            className="btn btn-primary"
                            disabled={selectedIds.size === 0 || enrolling}
                            onClick={handleEnroll}
                        >
                            {enrolling ? 'Enrolling...' : `Enroll Selected (${selectedIds.size})`}
                        </button>
                    </div>
                </div>

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
                        { header: 'Class Year', accessor: 'class_year', render: r => r.class_year || '-', sortable: true },
                    ]}
                    data={availableStudents}
                    pagination={true}
                    itemsPerPage={15}
                    compact={true}
                    emptyMessage="No unenrolled students found in your department."
                />
            </div>
        </div>
    )
}

export default InstructorCourseEnroll
