import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const Workouts = lazy(() => import('./pages/Workouts'));
const DietPlans = lazy(() => import('./pages/DietPlans'));
const Staff = lazy(() => import('./pages/Staff'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const Leads = lazy(() => import('./pages/Leads'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const fallback = user.role === 'super_admin' ? '/super-admin' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) {
    return <Navigate to={user.role === 'super_admin' ? '/super-admin' : '/dashboard'} replace />;
  }
  return children;
}

function SuspenseWrapper({ children }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>}>
      {children}
    </Suspense>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <SuspenseWrapper><Login /></SuspenseWrapper>
          </PublicRoute>
        }
      />

      {/* Gym Admin & Staff Routes */}
      <Route
        element={
          <ProtectedRoute roles={['gym_admin', 'staff']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<SuspenseWrapper><Dashboard /></SuspenseWrapper>} />
        <Route path="/leads" element={<SuspenseWrapper><Leads /></SuspenseWrapper>} />
        <Route path="/members" element={<SuspenseWrapper><Members /></SuspenseWrapper>} />
        <Route path="/members/:memberId" element={<SuspenseWrapper><MemberProfile /></SuspenseWrapper>} />
        <Route path="/subscriptions" element={<SuspenseWrapper><Subscriptions /></SuspenseWrapper>} />
        <Route path="/workouts" element={<SuspenseWrapper><Workouts /></SuspenseWrapper>} />
        <Route path="/diet-plans" element={<SuspenseWrapper><DietPlans /></SuspenseWrapper>} />
        <Route path="/staff" element={<SuspenseWrapper><Staff /></SuspenseWrapper>} />
        <Route path="/announcements" element={<SuspenseWrapper><Announcements /></SuspenseWrapper>} />
        <Route path="/reports" element={<SuspenseWrapper><Reports /></SuspenseWrapper>} />
        <Route path="/settings" element={<SuspenseWrapper><Settings /></SuspenseWrapper>} />
      </Route>

      {/* Super Admin Routes */}
      <Route
        element={
          <ProtectedRoute roles={['super_admin']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/super-admin" element={<SuspenseWrapper><SuperAdmin /></SuspenseWrapper>} />
        <Route path="/super-admin/gyms" element={<SuspenseWrapper><SuperAdmin /></SuspenseWrapper>} />
        <Route path="/super-admin/plans" element={<SuspenseWrapper><SuperAdmin /></SuspenseWrapper>} />
        <Route path="/super-admin/stats" element={<SuspenseWrapper><SuperAdmin /></SuspenseWrapper>} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<SuspenseWrapper><NotFound /></SuspenseWrapper>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1f2937',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
