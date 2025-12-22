import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { coursesAPI } from '../../api/courses'
import { learningOutcomesAPI } from '../../api/learningOutcomes'
import { assessmentsAPI } from '../../api/assessments'
import { gradesAPI } from '../../api/grades'
import { useAuth } from '../../context/AuthContext'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import '../../styles/pages.css'

/**
 * Student Course Detail Page
 * Shows Grades, Assessments, and LO-PO mapping
 */
const StudentCourseDetail = () => {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [course, setCourse] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [grades, setGrades] = useState([])
  const [loPoMapping, setLoPoMapping] = useState([])
  const [activeTab, setActiveTab] = useState('grades') // 'grades' or 'outcomes'

  useEffect(() => {
    loadCourseData()
  }, [courseId])

  const loadCourseData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch Course Details
      const courseData = await coursesAPI.get(courseId)
      setCourse(courseData)

      // 2. Prepare Template ID
      const courseTemplateId = typeof courseData.course_template === 'object'
        ? courseData.course_template.id
        : courseData.course_template

      // 3. Parallel Fetching (Assessments, Grades, LOs)
      const [assessmentsRes, gradesRes, loResponse] = await Promise.all([
        assessmentsAPI.list({ course_instance: courseId }),
        gradesAPI.list({ course_instance: courseId, student: user?.id }), // Only current student's grades
        learningOutcomesAPI.list({ course_template: courseTemplateId })
      ])

      // 4. Set State
      setAssessments(assessmentsRes.results || [])
      setGrades(gradesRes.results || [])

      // Prepare LO-PO Mapping
      const learningOutcomesList = Array.isArray(loResponse) ? loResponse : (loResponse.results || [])
      const mapping = learningOutcomesList.map(lo => ({
        lo,
        contributions: lo.po_contributions || []
      }))
      setLoPoMapping(mapping)

    } catch (err) {
      console.error('Failed to load course details:', err)
      setError('Failed to load course details.')
    } finally {
      setLoading(false)
    }
  }

  // Helper: Find grade for a specific assessment
  const getGradeForAssessment = (assessmentId) => {
    const grade = grades.find(g => {
      const gAssessmentId = typeof g.assessment === 'object' ? g.assessment.id : g.assessment;
      return gAssessmentId === assessmentId;
    });
    return grade ? grade.score : '-';
  }

  // Helper: Render PO contributions safely
  const renderContributions = (contributions) => {
    if (!contributions || contributions.length === 0) return <span className="text-muted">No contribution</span>

    if (typeof contributions === 'string') return contributions;

    if (Array.isArray(contributions)) {
      return (
        <div className="po-tags">
          {contributions.map((c, idx) => {
            const poCode = typeof c.program_outcome === 'object' ? c.program_outcome.code : `PO-${c.program_outcome}`;
            return (
              <span key={idx} className="po-tag">
                {poCode}
              </span>
            )
          })}
        </div>
      )
    }
    return JSON.stringify(contributions)
  }

  if (loading) return <div className="p-8"><LoadingState /></div>
  if (error) return <div className="p-8"><ErrorState error={error} onRetry={loadCourseData} /></div>
  if (!course) return <div className="p-8">Course not found.</div>

  const courseName = typeof course.course_template === 'object' ? course.course_template.name : 'Course Detail'
  const courseCode = course.get_full_code || (course.course_template?.code ? `${course.course_template.code} ${course.course_template.number}` : 'CODE')

  return (
    <div className="page-container">
      {/* Header & Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="btn-back"
          style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{courseCode}</h1>
          <p className="text-slate-500">{courseName}</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="info-card bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <span className="block text-xs font-bold text-slate-400 uppercase">Semester</span>
          <span className="font-semibold text-slate-700">{course.semester} {course.year}</span>
        </div>
        <div>
          <span className="block text-xs font-bold text-slate-400 uppercase">Instructor</span>
          <span className="font-semibold text-slate-700">{course.instructor_name || 'TBA'}</span>
        </div>
        <div>
          <span className="block text-xs font-bold text-slate-400 uppercase">Assessments</span>
          <span className="font-semibold text-slate-700">{assessments.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6 flex border-b border-slate-200">
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'grades' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('grades')}
        >
          Grades & Exams
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'outcomes' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('outcomes')}
        >
          Learning Outcomes (LO/PO)
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="tab-content">

        {/* --- GRADES TAB --- */}
        {activeTab === 'grades' && (
          <div className="grades-section">
            {assessments.length === 0 ? (
              <div className="empty-state p-8 text-center bg-slate-50 rounded-lg text-slate-500">
                No assessments defined for this course yet.
              </div>
            ) : (
              <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Assessment</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Weight (%)</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Your Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {assessments.map((assessment) => {
                      const score = getGradeForAssessment(assessment.id)
                      const isGraded = score !== '-'
                      return (
                        <tr key={assessment.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-medium text-slate-700">{assessment.name}</td>
                          <td className="p-4 text-slate-500">%{assessment.weight || '-'}</td>
                          <td className="p-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${isGraded ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                              {score}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- OUTCOMES TAB --- */}
        {activeTab === 'outcomes' && (
          <div className="outcomes-section space-y-4">
            {loPoMapping.length === 0 ? (
              <div className="empty-state p-8 text-center bg-slate-50 rounded-lg text-slate-500">
                No Learning Outcomes defined yet.
              </div>
            ) : (
              loPoMapping.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-lg border border-indigo-100">
                        {item.lo.code}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-slate-800 font-medium mb-2">{item.lo.description}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mapped Program Outcomes:</span>
                        {renderContributions(item.contributions)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Inline Styles for Tags and Buttons */}
      <style>{`
        .po-tag {
          background-color: #f1f5f9;
          color: #475569;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid #e2e8f0;
        }
        .btn-back:hover {
          color: #1e293b !important;
          transform: translateX(-2px);
        }
      `}</style>
    </div>
  )
}

export default StudentCourseDetail
