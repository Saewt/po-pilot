import { useParams, Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import "../Dashboard.css"

/**
 * CourseAssessments (Instructor)
 * Placeholder page so routing works.
 * Later: this will show assessments for a course, and allow creating/updating them.
 */
export default function CourseAssessments() {
  const { id } = useParams()
  const { user } = useAuth()

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Course Assessments</h1>

        <div className="user-info">
          <div className="user-details">
            <div className="user-name">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="user-role">Instructor</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-card">
          <h2>Course</h2>
          <p>
            Course Instance ID: <strong>{id}</strong>
          </p>

          <p style={{ marginTop: 12 }}>
            This page is a placeholder. Next step: fetch assessments for this course
            and show them here (create/edit later).
          </p>

          <div style={{ marginTop: 16 }}>
            <Link to="/instructor" className="manage-assessments-btn">
              ← Back to Instructor Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
