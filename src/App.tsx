import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicAuthRoute } from './components/auth/PublicAuthRoute';

// In-App Exception & Error Pages
import { NotFoundPage } from './pages/NotFoundPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

// Auth Pages
import { LoginPage } from './pages/LoginPage';

// Student & General Authenticated Pages
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { RoutinePage } from './pages/RoutinePage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { ExamsPage } from './pages/ExamsPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { NotesPage } from './pages/NotesPage';
import { LabResourcesPage } from './pages/LabResourcesPage';
import { FacultyPage } from './pages/FacultyPage';
import { NoticesPage } from './pages/NoticesPage';
import { ProfilePage } from './pages/ProfilePage';

// CR Management Pages
import { CRDashboardPage } from './pages/cr/CRDashboardPage';
import { CRAnnouncementsPage } from './pages/cr/CRAnnouncementsPage';
import { CRExamsPage } from './pages/cr/CRExamsPage';
import { CRRoutineRequestsPage } from './pages/cr/CRRoutineRequestsPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminCRManagementPage } from './pages/admin/AdminCRManagementPage';
import { AdminBatchesPage } from './pages/admin/AdminBatchesPage';
import { AdminFacultyPage } from './pages/admin/AdminFacultyPage';
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage';
import { AdminRoutinePage } from './pages/admin/AdminRoutinePage';
import { AdminNoticesPage } from './pages/admin/AdminNoticesPage';
import { AdminResourceVerificationPage } from './pages/admin/AdminResourceVerificationPage';
import { AdminActivityLogPage } from './pages/admin/AdminActivityLogPage';

/**
 * Root Route Navigator:
 * - If user is logged in -> routes to user's dedicated dashboard based on public.users.role
 * - If not logged in -> routes cleanly to /login
 */
const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Protected/Public guards handle loading state seamlessly
  }

  if (isAuthenticated && user) {
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'CR') return <Navigate to="/cr/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
            <Routes>
              {/* ========================================================= */}
              {/* 1. PUBLIC & AUTH ROUTES                                   */}
              {/* ========================================================= */}
              <Route path="/" element={<RootRedirect />} />
              <Route
                path="/login"
                element={
                  <PublicAuthRoute>
                    <LoginPage initialMode="LOGIN" />
                  </PublicAuthRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicAuthRoute>
                    <LoginPage initialMode="REGISTER" />
                  </PublicAuthRoute>
                }
              />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* ========================================================= */}
              {/* 2. AUTHENTICATED / STUDENT ROUTES                         */}
              {/* ========================================================= */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <StudentDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/routine"
                element={
                  <ProtectedRoute>
                    <RoutinePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses"
                element={
                  <ProtectedRoute>
                    <CoursesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:id"
                element={
                  <ProtectedRoute>
                    <CourseDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exams"
                element={
                  <ProtectedRoute>
                    <ExamsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/announcements"
                element={
                  <ProtectedRoute>
                    <AnnouncementsPage />
                  </ProtectedRoute>
                }
              />

              {/* Resources category aliases & subroutes */}
              <Route
                path="/resources"
                element={<Navigate to="/resources/questions" replace />}
              />
              <Route
                path="/resources/questions"
                element={
                  <ProtectedRoute>
                    <QuestionBankPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resources/notes"
                element={
                  <ProtectedRoute>
                    <NotesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resources/labs"
                element={
                  <ProtectedRoute>
                    <LabResourcesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/faculty"
                element={
                  <ProtectedRoute>
                    <FacultyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notices"
                element={
                  <ProtectedRoute>
                    <NoticesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* ========================================================= */}
              {/* 3. CR ROUTES (Authorized: CR, ADMIN)                      */}
              {/* ========================================================= */}
              <Route
                path="/cr"
                element={<Navigate to="/cr/dashboard" replace />}
              />
              <Route
                path="/cr/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['CR', 'ADMIN']}>
                    <CRDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cr/announcements"
                element={
                  <ProtectedRoute allowedRoles={['CR', 'ADMIN']}>
                    <CRAnnouncementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cr/exams"
                element={
                  <ProtectedRoute allowedRoles={['CR', 'ADMIN']}>
                    <CRExamsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cr/routine-requests"
                element={
                  <ProtectedRoute allowedRoles={['CR', 'ADMIN']}>
                    <CRRoutineRequestsPage />
                  </ProtectedRoute>
                }
              />

              {/* ========================================================= */}
              {/* 4. ADMIN ROUTES (Authorized: ADMIN)                       */}
              {/* ========================================================= */}
              <Route
                path="/admin"
                element={<Navigate to="/admin/dashboard" replace />}
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminStudentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cr-management"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminCRManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/batches"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminBatchesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/routine"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminRoutinePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/verification"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminResourceVerificationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/notices"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminNoticesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/faculty"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminFacultyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminCoursesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/activity"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminActivityLogPage />
                  </ProtectedRoute>
                }
              />

              {/* ========================================================= */}
              {/* 5. CATCH-ALL IN-APP 404 ROUTE                            */}
              {/* ========================================================= */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Analytics />
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
};

export default App;

