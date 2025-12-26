import React from 'react'

const OutcomeProgressBar = ({ label, score }) => {
    // Determine color based on score (High=Green, Mid=Yellow, Low=Red)
    let color = '#ef4444' // Red (Default/Low)
    let bgColor = '#fee2e2' // Light Red bg

    if (score >= 80) {
        color = '#10b981' // Emerald Green
        bgColor = '#d1fae5'
    } else if (score >= 60) {
        color = '#f59e0b' // Amber/Yellow
        bgColor = '#fef3c7'
    }

    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>
                <span>{label}</span>
                <span style={{ color: color }}>%{score}</span>
            </div>
            {/* Background Bar */}
            <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                {/* Filled Bar */}
                <div
                    style={{
                        width: `${score}%`,
                        height: '100%',
                        background: color,
                        borderRadius: '99px',
                        transition: 'width 0.8s ease-in-out'
                    }}
                />
            </div>
        </div>
    )
}

export default OutcomeProgressBar
