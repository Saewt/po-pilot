import React from 'react'

const DeptPOCard = ({ po, onEdit, onDelete, onToggleStatus }) => {
    return (
        <div style={{ 
            display: 'grid',
            gridTemplateColumns: '120px 1fr 100px 140px',
            alignItems: 'start',
            gap: '1rem',
            padding: '1.25rem 0',
            borderBottom: '1px solid #e2e8f0',
            opacity: po.is_active ? 1 : 0.6,
            transition: 'opacity 0.2s'
        }}>
            <div style={{ paddingTop: '4px' }}>
                <span style={{ 
                    fontSize: '1rem', 
                    fontWeight: '800', 
                    color: '#0f172a',
                    letterSpacing: '-0.01em'
                }}>
                    {po.full_code || po.code}
                </span>
                {!po.is_active && (
                    <div style={{
                        marginTop: '0.25rem',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Inactive
                    </div>
                )}
            </div>

            <div style={{ 
                fontSize: '1rem', 
                color: '#334155', 
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                fontWeight: '400'
            }}>
                {po.description}
            </div>

            <div style={{ paddingTop: '2px' }}>
                <label className="switch" style={{ transform: 'scale(0.8)', margin: 0 }}>
                    <input
                        type="checkbox"
                        checked={po.is_active}
                        onChange={(e) => onToggleStatus(po, e.target.checked)}
                    />
                    <span className="slider round"></span>
                </label>
            </div>

            <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end',
                gap: '0.5rem',
                paddingTop: '2px'
            }}>
                <button 
                    onClick={() => onEdit(po)}
                    title="Edit Outcome"
                    style={{ 
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b', 
                        padding: '6px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                </button>
                <button 
                    onClick={() => onDelete(po)}
                    title="Delete Outcome"
                    style={{ 
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b', 
                        padding: '6px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    )
}

export default DeptPOCard
