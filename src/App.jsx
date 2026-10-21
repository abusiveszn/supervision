import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Landing from '@/pages/Landing';
import Profile from '@/pages/Profile';
import Topics from '@/pages/Topics';
import Documents from '@/pages/Documents';
import Review from '@/pages/Review';
import Feedback from '@/pages/Feedback';
import Messages from '@/pages/Messages';
import Meetings from '@/pages/Meetings';
import Students from '@/pages/Students';
import Supervisors from '@/pages/Supervisors';
import Departments from '@/pages/Departments';
import Allocation from '@/pages/Allocation';
import Reports from '@/pages/Reports';
import Progress from '@/pages/Progress';
import SubmissionHistory from '@/pages/SubmissionHistory';
import SupervisorPerformance from '@/pages/SupervisorPerformance';
import { Navigate } from 'react-router-dom';
import StudentAuth from '@/pages/StudentAuth';
import SupervisorAuth from '@/pages/SupervisorAuth';
import AdminAuth from '@/pages/AdminAuth';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import StudentDashboard from '@/pages/dashboards/StudentDashboard';
import SupervisorDashboard from '@/pages/dashboards/SupervisorDashboard';
import AdminDashboard from '@/pages/dashboards/AdminDashboard';
import { getRole } from '@/lib/role';

const AdminOnlyRoute = () => {
  const { user } = useAuth();
  const role = getRole(user);
  if (role !== 'admin') {
    if (role === 'supervisor') return <Navigate to="/supervisor/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }
  return <AdminDashboard />;
};

const SupervisorOnlyRoute = () => {
  const { user } = useAuth();
  const role = getRole(user);
  if (role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }
  return <SupervisorDashboard />;
};

const StudentOnlyRoute = () => {
  const { user } = useAuth();
  const role = getRole(user);
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (role === 'supervisor') {
    return <Navigate to="/supervisor/dashboard" replace />;
  }
  return <StudentDashboard />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<StudentAuth initialMode="login" />} />
      <Route path="/register" element={<StudentAuth initialMode="signup" />} />
      <Route path="/supervisor-auth" element={<SupervisorAuth initialMode="login" />} />
      <Route path="/supervisor-register" element={<SupervisorAuth initialMode="signup" />} />
      <Route path="/admin" element={<AdminAuth initialMode="login" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Landing />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/admin/dashboard" element={<AdminOnlyRoute />} />
          <Route path="/admin-dashboard" element={<AdminOnlyRoute />} />
          <Route path="/supervisor/dashboard" element={<SupervisorOnlyRoute />} />
          <Route path="/supervisor-dashboard" element={<SupervisorOnlyRoute />} />
          <Route path="/student/dashboard" element={<StudentOnlyRoute />} />
          <Route path="/student-dashboard" element={<StudentOnlyRoute />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/submission-history" element={<SubmissionHistory />} />
          <Route path="/supervisor-performance" element={<SupervisorPerformance />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/students" element={<Students />} />
          <Route path="/supervisors" element={<Supervisors />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/allocation" element={<Allocation />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App