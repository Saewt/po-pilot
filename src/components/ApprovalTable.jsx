import '../pages/Dashboard.css'

/**
 * Approval Table Component
 * Displays LO-PO contributions in a table format for easy approval
 */
const ApprovalTable = ({ contributions, onApprove, approvingIds = [] }) => {
  if (contributions.length === 0) {
    return (
      <div className="empty-state">
        <p>No pending contributions to approve.</p>
      </div>
    )
  }

  return (
    <div className="approval-table-container">
      <table className="approval-table">
        <thead>
          <tr>
            <th>Learning Outcome</th>
            <th>Program Outcome</th>
            <th>Course</th>
            <th>Weight</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((contrib) => {
            const isApproving = approvingIds.includes(contrib.id)
            const isApproved = contrib.is_approved

            return (
              <tr key={contrib.id} className={isApproved ? 'approved' : 'pending'}>
                <td>
                  <div className="approval-cell">
                    <strong>{contrib.learning_outcome?.code || 'N/A'}</strong>
                    <span className="approval-description">
                      {contrib.learning_outcome?.description || 'No description'}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="approval-cell">
                    <strong>{contrib.program_outcome?.code || 'N/A'}</strong>
                    <span className="approval-description">
                      {contrib.program_outcome?.description || 'No description'}
                    </span>
                  </div>
                </td>
                <td>
                  {contrib.learning_outcome?.course_template?.get_full_code || 
                   contrib.learning_outcome?.course_template?.code || 
                   'N/A'}
                </td>
                <td>
                  <span className="approval-weight">{contrib.weight}</span>
                </td>
                <td>
                  {isApproved ? (
                    <span className="status-badge approved-badge">
                      ✓ Approved
                      {contrib.approved_by_name && (
                        <span className="approved-by">by {contrib.approved_by_name}</span>
                      )}
                    </span>
                  ) : (
                    <span className="status-badge pending-badge">Pending</span>
                  )}
                </td>
                <td>
                  {!isApproved && (
                    <button
                      className="approve-btn"
                      onClick={() => onApprove(contrib.id)}
                      disabled={isApproving}
                    >
                      {isApproving ? 'Approving...' : 'Approve'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ApprovalTable

