/**
 * Loading Skeleton Component
 * Provides a clean loading state for dashboard sections
 */
const LoadingSkeleton = ({ lines = 3 }) => {
  return (
    <div className="loading-skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton-line" />
      ))}
    </div>
  )
}

export default LoadingSkeleton

