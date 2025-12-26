import React from 'react';

const SearchIcon = () => (
  <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ResetIcon = () => (
  <svg className="filter-reset-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DeptPOToolbar = ({ 
    searchTerm, 
    onSearchChange, 
    showInactive, 
    onShowInactiveChange, 
    onReset 
}) => {
    const hasFilters = searchTerm || showInactive;

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '1rem',
            paddingBottom: '1rem'
        }}>
            <div className="search-wrapper" style={{ flex: '1 1 300px', maxWidth: '400px' }}>
                <SearchIcon />
                <input
                    type="text"
                    className="filter-search-input"
                    placeholder="Search outcomes..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{ 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0',
                        boxShadow: 'none',
                        paddingLeft: '2.5rem'
                    }}
                />
            </div>

            <div className="filter-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <label 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <input 
                        type="checkbox" 
                        checked={showInactive}
                        onChange={(e) => onShowInactiveChange(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                    />
                    <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#475569' }}>Show Inactive</span>
                </label>

                {hasFilters && (
                    <button
                        onClick={onReset}
                        className="filter-reset-btn"
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#64748b',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <ResetIcon />
                        Reset
                    </button>
                )}
            </div>
        </div>
    )
}

export default DeptPOToolbar
