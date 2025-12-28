import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { coursesAPI } from '../../api/courses'
import { assessmentsAPI } from '../../api/assessments'
import { gradesAPI } from '../../api/grades'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import AchievementProgressBar from '../../components/AchievementProgressBar'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * Student Course Summary Page
 * Shows detailed course results for a completed course
 */
const StudentCourseSummary = () => {
    const { courseId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [course, setCourse] = useState(null)
    const [assessments, setAssessments] = useState([])
    const [grades, setGrades] = useState([])
    const [learningOutcomes, setLearningOutcomes] = useState([])
    const [summary, setSummary] = useState(null)

    useEffect(() => {
        loadData()
    }, [courseId])

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            const courseData = await coursesAPI.get(courseId)
            setCourse(courseData)

            const courseTemplateId = typeof courseData.course_template === 'object'
                ? courseData.course_template.id
                : courseData.course_template

            // Try to get summary from API, fall back to computing locally
            try {
                const summaryData = await coursesAPI.getSummary(courseId, user.id)
                setSummary(summaryData)
            } catch {
                // API might not support summary yet, compute locally
                console.log('Summary API not available, computing locally')
            }

            const [assessmentsRes, gradesRes, losRes] = await Promise.all([
                assessmentsAPI.list({ course_instance: courseId }),
                gradesAPI.list(),
                learningOutcomesAPI.list({ course_template: courseTemplateId })
            ])

            const courseAssessments = assessmentsRes.results || assessmentsRes || []
            setAssessments(courseAssessments)

            // Filter grades for this student and course
            const assessmentIds = new Set(courseAssessments.map(a => a.id))
            const allGrades = gradesRes.results || gradesRes || []
            const studentGrades = allGrades.filter(g => {
                const gStudentId = typeof g.student === 'object' ? g.student.id : g.student
                const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
                return gStudentId === user.id && assessmentIds.has(gAssessmentId)
            })
            setGrades(studentGrades)

            setLearningOutcomes(losRes.results || losRes || [])

        } catch (err) {
            console.error('Failed to load data:', err)
            setError(err.response?.data?.detail || 'Failed to load course data')
        } finally {
            setLoading(false)
        }
    }

    const getLetterGrade = (percentage) => {
        if (percentage >= 90) return 'A'
        if (percentage >= 85) return 'A-'
        if (percentage >= 80) return 'B+'
        if (percentage >= 75) return 'B'
        if (percentage >= 70) return 'B-'
        if (percentage >= 65) return 'C+'
        if (percentage >= 60) return 'C'
        if (percentage >= 55) return 'C-'
        if (percentage >= 50) return 'D'
        return 'F'
    }

    const getGradeColor = (percentage) => {
        if (percentage >= 70) return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' }
        if (percentage >= 50) return { bg: '#fef9c3', text: '#ca8a04', border: '#fde047' }
        return { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' }
    }

    if (loading) return <LoadingState />
    if (error) return <ErrorState error={error} onRetry={loadData} />
    if (!course) return <ErrorState error="Course not found" />

    const courseName = typeof course.course_template === 'object'
        ? course.course_template.name
        : course.course_name || 'N/A'

    const instructor = course.instructor
        ? `${course.instructor.first_name} ${course.instructor.last_name}`
        : 'N/A'

    const credits = typeof course.course_template === 'object'
        ? course.course_template.credit
        : course.credits || 0

    // Calculate final grade
    let finalPercentage = summary?.final_percentage || 0
    if (!summary) {
        let totalScore = 0
        let totalWeight = 0

        assessments.forEach(assessment => {
            const grade = grades.find(g => {
                const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
                return gAssessmentId === assessment.id
            })

            if (grade) {
                const percentage = (parseFloat(grade.score) / parseFloat(assessment.max_score)) * 100
                totalScore += percentage * parseFloat(assessment.weight || 0) / 100
                totalWeight += parseFloat(assessment.weight || 0)
            }
        })

        finalPercentage = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0
    }

    const letterGrade = summary?.letter_grade || getLetterGrade(finalPercentage)
    const gradeColors = getGradeColor(finalPercentage)

    // Build assessment grades table data
    const assessmentGrades = assessments.map(assessment => {
        const grade = grades.find(g => {
            const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
            return gAssessmentId === assessment.id
        })

        const score = grade ? parseFloat(grade.score) : 0
        const maxScore = parseFloat(assessment.max_score)
        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
        const weight = parseFloat(assessment.weight || 0)
        const weightedScore = (percentage * weight) / 100

        return {
            name: assessment.name,
            type: assessment.assessment_type,
            score,
            maxScore,
            percentage,
            weight,
            weightedScore
        }
    })

    const assessmentColumns = [
        { header: 'Assessment', accessor: 'name' },
        { header: 'Type', accessor: 'type' },
        {
            header: 'Score',
            accessor: 'score',
            render: (row) => `${row.score} / ${row.maxScore}`
        },
        {
            header: 'Weight',
            accessor: 'weight',
            render: (row) => `${row.weight}%`
        },
        {
            header: 'Weighted',
            accessor: 'weightedScore',
            render: (row) => (
                <span style={{ fontWeight: 600, color: row.percentage >= 50 ? '#16a34a' : '#dc2626' }}>
                    {row.weightedScore.toFixed(2)}%
                </span>
            )
        }
    ]

    // Mock LO/PO achievements (would come from summary API in production)
    const loAchievements = summary?.learning_outcomes || learningOutcomes.map(lo => ({
        code: lo.full_code || lo.code,
        description: lo.description,
        achievement: Math.random() * 40 + 50 // Mock data
    }))

    const poAchievements = summary?.program_outcomes || []

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate('/app/student')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        marginBottom: '1rem',
                        padding: 0
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="page-title" style={{ margin: 0, marginBottom: '0.25rem' }}>
                            {course.full_code || course.code} - {courseName}
                        </h1>
                        <p style={{ color: '#6b7280', margin: 0 }}>
                            {course.semester} {course.year} • Instructor: {instructor}
                        </p>
                    </div>

                    {/* Final Grade Card */}
                    <div style={{
                        backgroundColor: gradeColors.bg,
                        border: `2px solid ${gradeColors.border}`,
                        borderRadius: '0.75rem',
                        padding: '1.25rem 2rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: gradeColors.text, fontWeight: 500, marginBottom: '0.25rem' }}>
                            Final Grade
                        </div>
                        <div style={{ fontSize: '3rem', fontWeight: 700, color: gradeColors.text, lineHeight: 1 }}>
                            {letterGrade}
                        </div>
                        <div style={{ fontSize: '1rem', color: gradeColors.text, marginTop: '0.25rem' }}>
                            {finalPercentage.toFixed(1)}%
                        </div>
                        {credits > 0 && (
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginTop: '0.5rem',
                                backgroundColor: 'white',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem'
                            }}>
                                {credits} Credits Earned
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Assessment Grades */}
            <div className="info-card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="section-title">Assessment Grades</h2>
                <DataTable columns={assessmentColumns} data={assessmentGrades} compact={true} />
            </div>

            {/* LO & PO Achievements */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Learning Outcomes */}
                <div className="info-card">
                    <h2 className="section-title">Learning Outcomes</h2>
                    {loAchievements.length > 0 ? (
                        loAchievements.map((lo, idx) => (
                            <AchievementProgressBar
                                key={idx}
                                code={lo.code}
                                label={lo.description?.substring(0, 50) + (lo.description?.length > 50 ? '...' : '')}
                                value={lo.achievement}
                            />
                        ))
                    ) : (
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            No learning outcome data available.
                        </p>
                    )}
                </div>

                {/* Program Outcomes */}
                <div className="info-card">
                    <h2 className="section-title">Program Outcomes</h2>
                    {poAchievements.length > 0 ? (
                        poAchievements.map((po, idx) => (
                            <AchievementProgressBar
                                key={idx}
                                code={po.code}
                                label={po.description?.substring(0, 50) + (po.description?.length > 50 ? '...' : '')}
                                value={po.achievement}
                            />
                        ))
                    ) : (
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            No program outcome data available for this course.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default StudentCourseSummary
