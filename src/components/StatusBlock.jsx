/**
 * Status Block Component
 * Reusable component for loading, error, and empty states
 */
const StatusBlock = ({ type, message, onRetry, children }) => {
  if (type === 'loading') {
    return (
      <div className="status-block loading">
        <div className="status-icon">⏳</div>
        <div className="status-message">{message || 'Loading...'}</div>
      </div>
    )
  }

  if (type === 'error') {
    return (
      <div className="status-block error">
        <div className="status-icon">⚠️</div>
        <div className="status-message">{message || 'Something went wrong'}</div>
        {onRetry && (
          <button className="status-retry-btn" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    )
  }

  if (type === 'empty') {
    return (
      <div className="status-block empty">
        <div className="status-icon">📭</div>
        <div className="status-message">{message || 'No data available'}</div>
        {children}
      </div>
    )
  }

  return null
}

export default StatusBlock

