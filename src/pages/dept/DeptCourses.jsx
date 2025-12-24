import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesAPI } from '../../api/courses';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import DataTable from '../../components/DataTable';
import CourseManagerModal from '../../components/CourseManagerModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import DeptCoursesToolbar from '../../components/DeptCoursesToolbar';
import { useToast } from '../../context/ToastContext';
import '../../styles/pages.css';

const DeptCourses = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [courseToEdit, setCourseToEdit] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('');
  const [targetYearFilter, setTargetYearFilter] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await coursesAPI.list();
      const rawCourses = response.results || [];
      
      const enriched = await Promise.all(
        rawCourses.map(async (c) => {
          try {
            const detail = await coursesAPI.get(c.id);
            return { ...c, ...detail };
          } catch (e) {
            console.error('Failed to fetch details for course', c.id, e);
            return c;
          }
        })
      );
      setCourses(enriched);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError(err.response?.data?.detail || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseCreated = () => {
    loadCourses(); 
    setCourseToEdit(null);
  };

  const handleDeleteInstance = async () => {
    if (!courseToDelete) return;

    try {
      await coursesAPI.delete(courseToDelete.id);
      addToast('Course session deleted successfully', 'success');
      setCourseToDelete(null);
      loadCourses();
    } catch (err) {
      console.error('Delete course error:', err);
      addToast(err.response?.data?.detail || 'Failed to delete course session', 'error');
    }
  };

  const filterOptions = useMemo(() => {
    const years = [...new Set(courses.map(c => c.year))].sort((a, b) => b - a);
    
    const targetYears = [...new Set(courses.map(c => c.course_template?.target_class_year).filter(Boolean))].sort((a, b) => a - b);

    const instructorsMap = new Map();
    courses.forEach(c => {
      if (c.instructor && c.instructor.id) {
        instructorsMap.set(c.instructor.id, c.instructor);
      }
    });
    const instructors = Array.from(instructorsMap.values());
    
    return { years, instructors, targetYears };
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const searchLower = searchTerm.toLowerCase();
      const code = (course.full_code || course.code || '').toLowerCase();
      const name = (course.course_template?.name || '').toLowerCase();
      const instructorName = course.instructor 
        ? `${course.instructor.first_name} ${course.instructor.last_name}`.toLowerCase() 
        : '';
        
      const matchesSearch = !searchTerm || 
        code.includes(searchLower) || 
        name.includes(searchLower) || 
        instructorName.includes(searchLower);

      const matchesSemester = !semesterFilter || course.semester === semesterFilter;
      const matchesYear = !yearFilter || String(course.year) === String(yearFilter);
      const matchesInstructor = !instructorFilter || (course.instructor && String(course.instructor.id) === String(instructorFilter));
      
      const matchesTargetYear = !targetYearFilter || String(course.course_template?.target_class_year) === String(targetYearFilter);

      return matchesSearch && matchesSemester && matchesYear && matchesInstructor && matchesTargetYear;
    });
  }, [courses, searchTerm, semesterFilter, yearFilter, instructorFilter, targetYearFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setSemesterFilter('');
    setYearFilter('');
    setInstructorFilter('');
    setTargetYearFilter('');
  };

  const getSemesterBadgeClass = (semester) => {
    switch (semester) {
      case 'FALL': return 'badge badge-warning';
      case 'SPRING': return 'badge badge-success';
      case 'SUMMER': return 'badge badge-info';
      default: return 'badge';
    }
  };

  const columns = [
    { 
      header: 'Course',
      accessor: 'full_code',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '600', color: '#1976d2' }}>
            {row.full_code || row.course_template?.code || 'N/A'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            {row.course_template?.name || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Target Year',
      accessor: 'course_template.target_class_year',
      render: (row) => (
        row.course_template?.target_class_year 
          ? <span className="badge" style={{ backgroundColor: '#f5f5f5', color: '#666' }}>Year {row.course_template.target_class_year}</span> 
          : '-'
      )
    },
    {
      header: 'Session',
      accessor: 'semester',
      render: (row) => (
        <span className={getSemesterBadgeClass(row.semester)}>
          {row.semester} {row.year}
        </span>
      )
    },
    {
      header: 'Instructor',
      accessor: 'instructor',
      render: (row) => {
        if (row.instructor) {
          const initials = `${row.instructor.first_name?.[0] || ''}${row.instructor.last_name?.[0] || ''}`;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {initials}
              </div>
              <span>{row.instructor.first_name} {row.instructor.last_name}</span>
            </div>
          );
        }
        return <span className="text-secondary" style={{ fontStyle: 'italic' }}>Unassigned</span>;
      }
    },
    {
      header: 'Students',
      accessor: 'students_count',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: '500' }}>
                {Array.isArray(row.students) ? row.students.length : (row.students_count || 0)}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>enrolled</span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/app/dept/${row.id}`);
            }}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.875rem',
              backgroundColor: '#e3f2fd',
              color: '#1565c0',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            View
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCourseToEdit(row);
              setShowModal(true);
            }}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.875rem',
              backgroundColor: '#f3e5f5',
              color: '#7b1fa2',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Edit
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setCourseToDelete(row);
            }}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.875rem',
              backgroundColor: '#ffebee',
              color: '#c62828',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (loading && !courses.length) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadCourses} />;
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Department Courses</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setCourseToEdit(null);
            setShowModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>+</span> 
          New Course Session
        </button>
      </div>

      <DeptCoursesToolbar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        semesterFilter={semesterFilter}
        onSemesterChange={setSemesterFilter}
        yearFilter={yearFilter}
        onYearChange={setYearFilter}
        instructorFilter={instructorFilter}
        onInstructorChange={setInstructorFilter}
        targetYearFilter={targetYearFilter}
        onTargetYearChange={setTargetYearFilter}
        instructors={filterOptions.instructors}
        years={filterOptions.years}
        targetYears={filterOptions.targetYears}
        onReset={resetFilters}
      />

      <DataTable 
        columns={columns} 
        data={filteredCourses}
        emptyMessage={
          courses.length === 0 
            ? "No courses found. Create your first course session!" 
            : "No courses match your search filters."
        }
      />

      {showModal && (
        <CourseManagerModal
          onClose={() => {
            setShowModal(false);
            setCourseToEdit(null);
          }}
          onCourseCreated={handleCourseCreated}
          editInstance={courseToEdit}
        />
      )}

      {courseToDelete && (
        <ConfirmationModal
          isOpen={!!courseToDelete}
          title="Delete Course Session"
          message={`Are you sure you want to delete the session ${courseToDelete.full_code || courseToDelete.course_template.name} (${courseToDelete.semester} ${courseToDelete.year})? This action cannot be undone.`}
          onConfirm={handleDeleteInstance}
          onCancel={() => setCourseToDelete(null)}
          confirmVariant="danger"
        />
      )}
    </div>
  );
};

export default DeptCourses;
