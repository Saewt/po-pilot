import React from 'react';

const SearchIcon = () => (
  <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="filter-select-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IdIcon = () => (
  <svg className="filter-select-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0h4m-4 4h4" />
  </svg>
);

const EmailIcon = () => (
  <svg className="filter-select-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ResetIcon = () => (
  <svg className="filter-reset-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DeptStudentsToolbar = ({
  filters,
  onFilterChange,
  onReset
}) => {
  const hasActiveFilters = 
    filters.name || 
    filters.student_id || 
    filters.email || 
    filters.enrollment_year;

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
          <div className="filter-select-wrapper">
            <IdIcon />
            <input
              type="text"
              className="filter-search-input"
              style={{ width: 'auto', minWidth: '180px' }}
              placeholder="Student ID"
              value={filters.student_id}
              onChange={(e) => onFilterChange('student_id', e.target.value)}
            />
          </div>

          <div className="filter-select-wrapper">
            <EmailIcon />
            <input
              type="text"
              className="filter-search-input"
              style={{ width: 'auto', minWidth: '220px' }}
              placeholder="Email address"
              value={filters.email}
              onChange={(e) => onFilterChange('email', e.target.value)}
            />
          </div>

          <div className="filter-select-wrapper">
            <CalendarIcon />
            <input
              type="text"
              className="filter-search-input"
              style={{ width: 'auto', minWidth: '140px' }}
              placeholder="Year"
              value={filters.enrollment_year}
              onChange={(e) => onFilterChange('enrollment_year', e.target.value)}
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

export default DeptStudentsToolbar;
