import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { OrganisationProvider } from './context/OrganisationContext';
import { ROLE_HOME } from './lib/roles';
import Login from './pages/Login';
import AppShell from './components/AppShell';
import StaffOverview from './pages/staff/Overview';
import MyRequests from './pages/staff/MyRequests';
import Approvals from './pages/hod/Approvals';
import AllRequests from './pages/hr/AllRequests';
import Balances from './pages/hr/Balances';
import Settings from './pages/hr/Settings';
import Insights from './pages/principal/Insights';

function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return children;
}

function FullScreenLoader() {
  return <div className="grid h-screen place-items-center bg-appbg text-muted">Loading…</div>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={ROLE_HOME[user.role]} replace /> : <Login />} />
      <Route
        element={
          <ProtectedRoute>
            <OrganisationProvider>
              <AppShell />
            </OrganisationProvider>
          </ProtectedRoute>
        }
      >
        <Route
          path="/overview"
          element={
            <ProtectedRoute roles={['staff']}>
              <StaffOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-requests"
          element={
            <ProtectedRoute roles={['staff']}>
              <MyRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute roles={['hod']}>
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/department-log"
          element={
            <ProtectedRoute roles={['hod']}>
              <AllRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/all-requests"
          element={
            <ProtectedRoute roles={['hr', 'principal']}>
              <AllRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/balances"
          element={
            <ProtectedRoute roles={['hr']}>
              <Balances />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={['hr']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute roles={['principal']}>
              <Insights />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="/" element={<Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />} />
    </Routes>
  );
}
