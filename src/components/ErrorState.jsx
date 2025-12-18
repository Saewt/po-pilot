import './ErrorState.css'

/**
 * ErrorState Component
 * Displays error message with optional retry
 */
const ErrorState = ({ error, onRetry, message }) => {
  const displayMessage = message || error?.message || error || 'An error occurred'

  return (
    <div className="error-state">
      <div className="error-icon">⚠️</div>
      <div className="error-message">{displayMessage}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-primary error-retry"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export default ErrorState
