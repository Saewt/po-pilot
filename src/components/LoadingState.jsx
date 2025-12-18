import './LoadingState.css'

/**
 * LoadingState Component
 * Simple loading indicator
 */
const LoadingState = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  )
}

export default LoadingState
