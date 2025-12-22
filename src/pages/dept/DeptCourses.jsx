import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesAPI } from '../../api/courses';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import DataTable from '../../components/DataTable';
import CourseManagerModal from '../../components/CourseManagerModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useToast } from '../../context/ToastContext';
import '../../styles/pages.css';

/**
 * Department Courses List Page
 * Displays Course Code, Course Name, Semester, Year, Instructor, Students, and Actions.
 */
const DeptCourses = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch list of courses (basic list)
      const response = await coursesAPI.list();
      const rawCourses = response.results || [];
      // For each course, fetch detailed data to ensure instructor and template objects are present
      const enriched = await Promise.all(
        rawCourses.map(async (c) => {
          try {
            const detail = await coursesAPI.get(c.id);
            // Merge detail fields (instructor, course_template, etc.) onto the list item
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
    loadCourses(); // Refresh list
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

  if (loading && !courses.length) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadCourses} />;
  }

  const columns = [
    { header: 'Course Code', accessor: 'full_code' },
    {
      header: 'Course Name',
      accessor: 'course_template',
      render: (row) => {
        if (row.course_template && typeof row.course_template === 'object') {
          return row.course_template.name || 'N/A';
        }
        return 'N/A';
      },
    },
    {
      header: 'Target Year',
      accessor: 'course_template.target_class_year',
      render: (row) => {
        if (row.course_template && typeof row.course_template === 'object') {
          return row.course_template.target_class_year || 'N/A';
        }
        return 'N/A';
      },
    },
    { header: 'Semester', accessor: 'semester' },
    { header: 'Year', accessor: 'year' },
    {
      header: 'Instructor',
      accessor: 'instructor',
      render: (row) => {
        if (row.instructor && typeof row.instructor === 'object') {
          const first = row.instructor.first_name || '';
          const last = row.instructor.last_name || '';
          const full = `${first} ${last}`.trim();
          return full || <span className="text-secondary">Not Assigned</span>;
        }
        return <span className="text-secondary">Not Assigned</span>;
      },
    },
    {
      header: 'Students',
      accessor: 'students',
      render: (row) => {
        if (Array.isArray(row.students)) return row.students.length;
        if (row.students_count !== undefined) return row.students_count;
        return 0;
      },
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
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            View Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCourseToDelete(row);
            }}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Department Courses</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Course Session
        </button>
      </div>

      <DataTable columns={columns} data={courses} />

      {showModal && (
        <CourseManagerModal
          onClose={() => setShowModal(false)}
          onCourseCreated={handleCourseCreated}
        />
      )}

      {courseToDelete && (
        <ConfirmationModal
          isOpen={!!courseToDelete}
          title="Delete Course Session"
          message={`Are you sure you want to delete the session ${courseToDelete.full_code || courseToDelete.course_template.name} (${courseToDelete.semester} ${courseToDelete.year})? This action cannot be undone.`}
          onConfirm={handleDeleteInstance}
          onCancel={() => setCourseToDelete(null)}
        />
      )}
    </div>
  );
};

export default DeptCourses;
