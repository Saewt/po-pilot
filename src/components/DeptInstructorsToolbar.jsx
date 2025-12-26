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

const DeptInstructorsToolbar = ({ filters, onFilterChange, onReset }) => {
  const hasActiveFilters = filters.name || filters.email;

  return (
    <div className="filter-toolbar">
      <div className="filter-toolbar-header">
        <div className="search-wrapper">
          <SearchIcon />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search by name..."
            value={filters.name}
            onChange={(e) => onFilterChange('name', e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <div className="search-wrapper" style={{ flex: '0 0 250px' }}>
             <input
                type="text"
                className="filter-search-input"
                placeholder="Search by email..."
                value={filters.email}
                onChange={(e) => onFilterChange('email', e.target.value)}
                style={{ paddingLeft: '1rem' }}
              />
          </div>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="filter-reset-btn"
              title="Reset Filters"
            >
              <ResetIcon />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeptInstructorsToolbar;
