import { useAuth } from '@/lib/AuthContext';
import { Loading } from '@/components/Shared';
import { getRole } from '@/lib/role';
import { Navigate } from 'react-router-dom';

export default function Home() {
  const { user, isLoadingAuth } = useAuth();
  const role = getRole(user);

  if (isLoadingAuth) return <Loading />;

  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'supervisor') return <Navigate to="/supervisor/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}