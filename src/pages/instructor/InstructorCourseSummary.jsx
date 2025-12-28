import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { assessmentsAPI } from '../../api/assessments'
import { gradesAPI } from '../../api/grades'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import FinalizationChecklist from '../../components/FinalizationChecklist'
import FinalizeCourseButton from '../../components/FinalizeCourseButton'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * Instructor Course Summary Page
 * Shows course summary and finalization controls
 */
const InstructorCourseSummary = () => {
    const { courseId } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [course, setCourse] = useState(null)
    const [assessments, setAssessments] = useState([])
    const [grades, setGrades] = useState([])
    const [students, setStudents] = useState([])

    useEffect(() => {
        loadData()
    }, [courseId])

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            const courseData = await coursesAPI.get(courseId)
            setCourse(courseData)
            setStudents(courseData.students || [])

            const [assessmentsRes, gradesRes] = await Promise.all([
                assessmentsAPI.list({ course_instance: courseId }),
                gradesAPI.list()
            ])

            const courseAssessments = assessmentsRes.results || assessmentsRes || []
            setAssessments(courseAssessments)

            // Filter grades for this course's assessments
            const assessmentIds = new Set(courseAssessments.map(a => a.id))
            const allGrades = gradesRes.results || gradesRes || []
            const courseGrades = allGrades.filter(g => {
                const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
                return assessmentIds.has(gAssessmentId)
            })
            setGrades(courseGrades)

        } catch (err) {
            console.error('Failed to load data:', err)
            setError(err.response?.data?.detail || 'Failed to load course data')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <LoadingState />
    if (error) return <ErrorState error={error} onRetry={loadData} />
    if (!course) return <ErrorState error="Course not found" />

    const courseName = typeof course.course_template === 'object'
        ? course.course_template.name
        : course.course_name || 'N/A'

    const isFinalized = course.is_finalized === true
    const totalWeight = assessments.reduce((sum, a) => sum + parseFloat(a.weight || 0), 0)
    const checklistPassed = Math.abs(totalWeight - 100) < 0.01 &&
        students.length > 0 &&
        grades.length >= students.length * assessments.length

    // Calculate grade distribution
    const gradeDistribution = students.map(student => {
        let totalScore = 0
        let totalWeight = 0

        assessments.forEach(assessment => {
            const grade = grades.find(g => {
                const gStudentId = typeof g.student === 'object' ? g.student.id : g.student
                const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
                return gStudentId === student.id && gAssessmentId === assessment.id
            })

            if (grade) {
                const percentage = (parseFloat(grade.score) / parseFloat(assessment.max_score)) * 100
                totalScore += percentage * parseFloat(assessment.weight || 0) / 100
                totalWeight += parseFloat(assessment.weight || 0)
            }
        })

        const finalPercentage = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0

        return {
            ...student,
            finalPercentage,
            fullName: `${student.first_name} ${student.last_name}`
        }
    })

    const gradeColumns = [
        { header: 'Student ID', accessor: 'student_id' },
        { header: 'Name', accessor: 'fullName' },
        {
            header: 'Final Grade',
            accessor: 'finalPercentage',
            render: (row) => (
                <span style={{
                    fontWeight: 600,
                    color: row.finalPercentage >= 50 ? '#16a34a' : '#dc2626'
                }}>
                    {row.finalPercentage.toFixed(1)}%
                </span>
            )
        }
    ]

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '2rem'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h1 className="page-title" style={{ margin: 0 }}>
                            {course.full_code || course.code}
                        </h1>
                        {isFinalized && (
                            <span style={{
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                                Finalized
                            </span>
                        )}
                    </div>
                    <p style={{ color: '#6b7280', margin: 0 }}>
                        {courseName} • {course.semester} {course.year}
                    </p>
                </div>

                <button
                    onClick={() => navigate(`/app/instructor/courses/${courseId}/grades`)}
                    className="btn btn-secondary"
                >
                    View Grades
                </button>
            </div>

            {/* Stats Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="info-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1d4ed8' }}>
                        {students.length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Students</div>
                </div>
                <div className="info-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed' }}>
                        {assessments.length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Assessments</div>
                </div>
                <div className="info-card" style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: Math.abs(totalWeight - 100) < 0.01 ? '#16a34a' : '#dc2626'
                    }}>
                        {totalWeight.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Weight</div>
                </div>
                <div className="info-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0ea5e9' }}>
                        {grades.length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Grades Entered</div>
                </div>
            </div>

            {/* Finalization Section */}
            {!isFinalized && (
                <div className="info-card" style={{ marginBottom: '2rem' }}>
                    <h2 className="section-title">Course Finalization</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'start' }}>
                        <FinalizationChecklist
                            assessments={assessments}
                            grades={grades}
                            students={students}
                        />
                        <FinalizeCourseButton
                            courseId={courseId}
                            disabled={!checklistPassed}
                            onSuccess={loadData}
                        />
                    </div>
                </div>
            )}

            {/* Grade Distribution */}
            <div className="info-card">
                <h2 className="section-title">Grade Distribution</h2>
                <DataTable
                    columns={gradeColumns}
                    data={gradeDistribution}
                    compact={true}
                />
            </div>
        </div>
    )
}

export default InstructorCourseSummary
