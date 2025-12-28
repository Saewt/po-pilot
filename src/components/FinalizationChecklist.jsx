import { useMemo } from 'react'

/**
 * Pre-flight checklist for course finalization
 * Shows whether all requirements are met before finalizing
 */
const FinalizationChecklist = ({ assessments, grades, students }) => {
    const checks = useMemo(() => {
        // Check 1: Assessment weights sum to 100%
        const totalWeight = assessments.reduce((sum, a) => sum + parseFloat(a.weight || 0), 0)
        const weightsValid = Math.abs(totalWeight - 100) < 0.01

        // Check 2: All students have grades for all assessments
        const studentIds = students.map(s => s.id)
        const assessmentIds = assessments.map(a => a.id)

        let gradedCount = 0
        let totalRequired = studentIds.length * assessmentIds.length

        studentIds.forEach(studentId => {
            assessmentIds.forEach(assessmentId => {
                const hasGrade = grades.some(g => {
                    const gStudentId = typeof g.student === 'object' ? g.student.id : g.student
                    const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
                    return gStudentId === studentId && gAssessmentId === assessmentId
                })
                if (hasGrade) gradedCount++
            })
        })

        const allGraded = gradedCount === totalRequired

        // Find students with missing grades
        const missingGrades = []
        studentIds.forEach(studentId => {
            const student = students.find(s => s.id === studentId)
            const missingAssessments = []

            assessmentIds.forEach(assessmentId => {
                const hasGrade = grades.some(g => {
                    const gStudentId = typeof g.student === 'object' ? g.student.id : g.student
                    const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment
                    return gStudentId === studentId && gAssessmentId === assessmentId
                })
                if (!hasGrade) {
                    const assessment = assessments.find(a => a.id === assessmentId)
                    missingAssessments.push(assessment?.name || 'Unknown')
                }
            })

            if (missingAssessments.length > 0) {
                missingGrades.push({
                    student: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
                    missing: missingAssessments
                })
            }
        })

        return {
            weightsValid,
            totalWeight,
            allGraded,
            gradedCount,
            totalRequired,
            missingGrades
        }
    }, [assessments, grades, students])

    const allPassed = checks.weightsValid && checks.allGraded

    return (
        <div style={{
            backgroundColor: allPassed ? '#f0fdf4' : '#fefce8',
            border: `1px solid ${allPassed ? '#bbf7d0' : '#fef08a'}`,
            borderRadius: '0.75rem',
            padding: '1.25rem'
        }}>
            <h3 style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '1rem',
                marginTop: 0
            }}>
                Pre-Finalization Checklist
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Weight Check */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        fontSize: '1.25rem',
                        color: checks.weightsValid ? '#16a34a' : '#dc2626'
                    }}>
                        {checks.weightsValid ? '✓' : '✗'}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                        Assessment weights sum to 100%
                        {!checks.weightsValid && (
                            <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>
                                (Currently {checks.totalWeight.toFixed(1)}%)
                            </span>
                        )}
                    </span>
                </div>

                {/* Grades Check */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        fontSize: '1.25rem',
                        color: checks.allGraded ? '#16a34a' : '#dc2626'
                    }}>
                        {checks.allGraded ? '✓' : '✗'}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                        All students graded ({checks.gradedCount}/{checks.totalRequired} complete)
                    </span>
                </div>

                {/* Missing Grades Details */}
                {checks.missingGrades.length > 0 && checks.missingGrades.length <= 5 && (
                    <div style={{
                        marginLeft: '1.75rem',
                        fontSize: '0.8125rem',
                        color: '#6b7280',
                        backgroundColor: '#fef2f2',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #fecaca'
                    }}>
                        <div style={{ fontWeight: 500, color: '#dc2626', marginBottom: '0.5rem' }}>
                            Students missing grades:
                        </div>
                        {checks.missingGrades.slice(0, 5).map((item, idx) => (
                            <div key={idx} style={{ marginBottom: '0.25rem' }}>
                                • {item.student} - Missing: {item.missing.join(', ')}
                            </div>
                        ))}
                        {checks.missingGrades.length > 5 && (
                            <div style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>
                                ... and {checks.missingGrades.length - 5} more
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default FinalizationChecklist
