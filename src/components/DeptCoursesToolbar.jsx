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

const UserIcon = () => (
  <svg className="filter-select-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="filter-select-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const GradCapIcon = () => (
  <svg className="filter-select-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
  </svg>
);

const ResetIcon = () => (
  <svg className="filter-reset-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DeptCoursesToolbar = ({
  searchTerm,
  onSearchChange,
  semesterFilter,
  onSemesterChange,
  yearFilter,
  onYearChange,
  instructorFilter,
  onInstructorChange,
  targetYearFilter,
  onTargetYearChange,
  instructors = [],
  years = [],
  targetYears = [],
  onReset
}) => {
  const hasActiveFilters = searchTerm || semesterFilter || yearFilter || instructorFilter || targetYearFilter;

  return (
    <div className="filter-toolbar">
      <div className="filter-toolbar-header">
        <div className="search-wrapper">
          <SearchIcon />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search by code or name..."
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

          <div className="filter-select-wrapper">
            <GradCapIcon />
            <select
              className="filter-select"
              value={targetYearFilter}
              onChange={(e) => onTargetYearChange(e.target.value)}
            >
              <option value="">All Target Years</option>
              {targetYears.map(y => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <UserIcon />
            <select
              className="filter-select"
              value={instructorFilter}
              onChange={(e) => onInstructorChange(e.target.value)}
            >
              <option value="">All Instructors</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.first_name} {inst.last_name}
                </option>
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

export default DeptCoursesToolbar;
