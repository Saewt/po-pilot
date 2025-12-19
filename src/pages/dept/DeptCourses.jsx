import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesAPI } from '../../api/courses';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import DataTable from '../../components/DataTable';
import '../../styles/pages.css';

/**
 * Department Courses List Page
 * Displays Course Code, Course Name, Semester, Year, Instructor, Students, and Actions.
 */
const DeptCourses = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);

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

  if (loading) {
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
      ),
    },
  ];

  return (
    <div className="page-container">
      <h1 className="page-title">Department Courses</h1>
      <DataTable columns={columns} data={courses} />
    </div>
  );
};

export default DeptCourses;
