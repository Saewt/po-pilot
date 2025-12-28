import { useNavigate } from 'react-router-dom'

/**
 * Card displaying completed course overview
 * Shows course info, final grade, and credits earned
 */
const CourseSummaryCard = ({ course, grade, credits, studentId }) => {
    const navigate = useNavigate()

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

    const percentage = grade?.percentage || grade?.score || 0
    const letterGrade = grade?.letter_grade || getLetterGrade(percentage)
    const colors = getGradeColor(percentage)

    const courseName = typeof course.course_template === 'object'
        ? course.course_template.name
        : course.course_name || 'N/A'

    const courseCode = course.full_code || course.code || 'N/A'
    const semester = `${course.semester} ${course.year}`

    const handleClick = () => {
        navigate(`/app/student/courses/${course.id}/summary`)
    }

    return (
        <div
            onClick={handleClick}
            style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                e.currentTarget.style.borderColor = '#d1d5db'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
                e.currentTarget.style.borderColor = '#e5e7eb'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                    }}>
                        {courseCode}
                    </div>
                    <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: '#111827',
                        margin: '0 0 0.5rem 0'
                    }}>
                        {courseName}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                        <span>{semester}</span>
                        {credits !== undefined && (
                            <span style={{
                                backgroundColor: '#dbeafe',
                                color: '#1d4ed8',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontWeight: 500
                            }}>
                                {credits} Credits
                            </span>
                        )}
                    </div>
                </div>

                {/* Grade Badge */}
                <div style={{
                    backgroundColor: colors.bg,
                    border: `2px solid ${colors.border}`,
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    textAlign: 'center',
                    minWidth: '4rem'
                }}>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: colors.text,
                        lineHeight: 1
                    }}>
                        {letterGrade}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: colors.text,
                        marginTop: '0.25rem'
                    }}>
                        {percentage.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CourseSummaryCard
