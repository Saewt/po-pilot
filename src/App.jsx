import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
import AppLayout from './components/AppLayout'

import Login from './pages/Login'
import Register from './pages/Register'
import ChangePassword from './pages/ChangePassword'

// Student pages
import StudentDashboard from './pages/dashboards/StudentDashboard'
import StudentCourses from './pages/student/StudentCourses'
import StudentCourseDetail from './pages/student/StudentCourseDetail'

// Instructor pages
import InstructorHome from './pages/instructor/InstructorHome'
import InstructorCourses from './pages/instructor/InstructorCourses'
import CourseAssessments from './pages/instructor/CourseAssessments'
import InstructorCourseLoPo from './pages/instructor/InstructorCourseLoPo'
import InstructorCourseStudents from './pages/instructor/InstructorCourseStudents'
import InstructorCourseEnroll from './pages/instructor/InstructorCourseEnroll'
import InstructorGrades from './pages/instructor/InstructorGrades'

// DeptHead pages
import DeptApprovals from './pages/dept/DeptApprovals'
import DeptPOBuilder from './pages/dept/DeptPOBuilder'
import DeptCourses from './pages/dept/DeptCourses'
import DeptCourseDetail from './pages/dept/DeptCourseDetail'
import DeptInstructorList from './pages/dept/DeptInstructorList'
import DeptStudentList from './pages/dept/DeptStudentList'

/**
 * Redirect authenticated users away from login/register
 */
const AuthRedirect = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    )
  }

  if (isAuthenticated) {
    // Redirect to role-specific home
    if (user?.role === 'STUDENT') {
      return <Navigate to="/app/student" replace />
    } else if (user?.role === 'INSTRUCTOR') {
      return <Navigate to="/app/instructor" replace />
    } else if (user?.role === 'DEPARTMENT_HEAD') {
      return <Navigate to="/app/dept" replace />
    }
    return <Navigate to="/app" replace />
  }

  return children
}

/**
 * Role-based redirect component
 */
const RoleRedirect = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'STUDENT') {
    return <Navigate to="/app/student" replace />
  } else if (user.role === 'INSTRUCTOR') {
    return <Navigate to="/app/instructor" replace />
  } else if (user.role === 'DEPARTMENT_HEAD') {
    return <Navigate to="/app/dept" replace />
  }

  return <Navigate to="/app" replace />
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <AuthRedirect>
            <Login />
          </AuthRedirect>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRedirect>
            <Register />
          </AuthRedirect>
        }
      />

      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePassword />
          </RequireAuth>
        }
      />

      {/* Protected app routes with layout */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout>
              <RoleRedirect />
            </AppLayout>
          </RequireAuth>
        }
      />

      {/* Student routes */}
      <Route
        path="/app/student"
        element={
          <RequireAuth>
            <RequireRole roles="STUDENT">
              <AppLayout>
                <StudentDashboard />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/student/:courseId"
        element={
          <RequireAuth>
            <RequireRole roles="STUDENT">
              <AppLayout>
                <StudentCourseDetail />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Instructor routes */}
      <Route
        path="/app/instructor"
        element={
          <RequireAuth>
            <RequireRole roles="INSTRUCTOR">
              <AppLayout>
                <InstructorCourses />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/instructor/courses/:courseId/lo-po"
        element={
          <RequireAuth>
            <RequireRole roles="INSTRUCTOR">
              <AppLayout>
                <InstructorCourseLoPo />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/instructor/courses/:courseId/students"
        element={
          <RequireAuth>
            <RequireRole roles="INSTRUCTOR">
              <AppLayout>
                <InstructorCourseStudents />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/instructor/courses/:courseId/enroll"
        element={
          <RequireAuth>
            <RequireRole roles="INSTRUCTOR">
              <AppLayout>
                <InstructorCourseEnroll />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/instructor/courses/:courseId/assessments"
        element={
          <RequireAuth>
            <RequireRole roles="INSTRUCTOR">
              <AppLayout>
                <CourseAssessments />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/instructor/courses/:courseId/grades"
        element={
          <RequireAuth>
            <RequireRole roles="INSTRUCTOR">
              <AppLayout>
                <InstructorGrades />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Department Head routes */}
      <Route
        path="/app/dept"
        element={
          <RequireAuth>
            <RequireRole roles="DEPARTMENT_HEAD">
              <AppLayout>
                <DeptCourses />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/dept/approvals"
        element={
          <RequireAuth>
            <RequireRole roles="DEPARTMENT_HEAD">
              <AppLayout>
                <DeptApprovals />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/dept/po-builder"
        element={
          <RequireAuth>
            <RequireRole roles="DEPARTMENT_HEAD">
              <AppLayout>
                <DeptPOBuilder />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/dept/instructors"
        element={
          <RequireAuth>
            <RequireRole roles="DEPARTMENT_HEAD">
              <AppLayout>
                <DeptInstructorList />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/app/dept/students"
        element={
          <RequireAuth>
            <RequireRole roles="DEPARTMENT_HEAD">
              <AppLayout>
                <DeptStudentList />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/app/dept/:courseId"
        element={
          <RequireAuth>
            <RequireRole roles="DEPARTMENT_HEAD">
              <AppLayout>
                <DeptCourseDetail />
              </AppLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/app" replace />} />

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

import { ToastProvider } from './context/ToastContext'
import { NotificationProvider } from './context/NotificationContext'
import ToastContainer from './components/ToastContainer'

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <AppRoutes />
          <ToastContainer />
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
