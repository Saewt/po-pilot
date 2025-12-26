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

const FilterIcon = () => (
  <svg className="filter-select-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const ResetIcon = () => (
  <svg className="filter-reset-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const InstructorCoursesToolbar = ({
  searchTerm,
  onSearchChange,
  semesterFilter,
  onSemesterChange,
  yearFilter,
  onYearChange,
  years = [],
  onReset
}) => {
  const hasActiveFilters = searchTerm || semesterFilter || yearFilter;

  return (
    <div className="filter-toolbar">
      <div className="filter-toolbar-header">
        <div className="search-wrapper">
          <SearchIcon />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search my courses..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <div className="filter-select-wrapper">
            <FilterIcon />
            <select
              className="filter-select"
              value={semesterFilter}
              onChange={(e) => onSemesterChange(e.target.value)}
            >
              <option value="">All Semesters</option>
              <option value="FALL">Fall</option>
              <option value="SPRING">Spring</option>
              <option value="SUMMER">Summer</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <CalendarIcon />
            <select
              className="filter-select"
              value={yearFilter}
              onChange={(e) => onYearChange(e.target.value)}
            >
              <option value="">All Years</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
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

export default InstructorCoursesToolbar;
