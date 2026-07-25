import { Navigate, Outlet } from 'react-router-dom';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useAuthContext } from '../../hooks/useAuth';

// Route-level guard: not a security boundary by itself (RLS is), but keeps the UI
// from flashing pages the user has no business seeing.

export function ProtectedRoute() {
  const { session, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <ProgressSpinner />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <Outlet />;
}
