import { useParams, Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import '../../styles/pages.css'

export default function CourseAssessments() {
  const { id } = useParams()
  const { user } = useAuth()

  return (
    <div className="page-container">
      <h1 className="page-title">Course Assessments</h1>

      <div className="info-card">
        <h2 className="section-title">Course Instance: {id}</h2>
        
        <p style={{ marginTop: '1rem', color: '#666' }}>
          This page is currently under development. You will be able to manage assessments here soon.
        </p>

        <div style={{ marginTop: '2rem' }}>
          <Link to="/app/instructor" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
