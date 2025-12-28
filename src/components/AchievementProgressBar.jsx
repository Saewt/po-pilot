/**
 * Visual progress bar for LO/PO achievements
 * Color-coded: green (>70%), yellow (50-70%), red (<50%)
 */
const AchievementProgressBar = ({ label, value, showLabel = true, code }) => {
    const percentage = Math.min(Math.max(value || 0, 0), 100)

    const getColor = (pct) => {
        if (pct >= 70) return { bg: '#dcfce7', fill: '#22c55e', text: '#16a34a' }
        if (pct >= 50) return { bg: '#fef9c3', fill: '#eab308', text: '#ca8a04' }
        return { bg: '#fee2e2', fill: '#ef4444', text: '#dc2626' }
    }

    const colors = getColor(percentage)

    return (
        <div style={{ marginBottom: '0.75rem' }}>
            {showLabel && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.375rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {code && (
                            <span style={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '0.125rem 0.375rem',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '0.25rem',
                                color: '#4b5563'
                            }}>
                                {code}
                            </span>
                        )}
                        {label && (
                            <span style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
                                {label}
                            </span>
                        )}
                    </div>
                    <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: colors.text
                    }}>
                        {percentage.toFixed(1)}%
                    </span>
                </div>
            )}

            <div style={{
                width: '100%',
                height: '0.5rem',
                backgroundColor: colors.bg,
                borderRadius: '9999px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: colors.fill,
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    )
}

export default AchievementProgressBar
