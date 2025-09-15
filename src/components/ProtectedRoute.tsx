import { useAuth } from '@/hooks/useAuth';
import { useAccessControl } from '@/hooks/useAccessControl';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import AccessDenied from './AccessDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAllowed, loading: accessLoading } = useAccessControl();
  const location = useLocation();

  console.log('ProtectedRoute - authLoading:', authLoading, 'accessLoading:', accessLoading, 'user:', user?.email, 'isAllowed:', isAllowed);

  const loading = authLoading || accessLoading;

  if (loading) {
    console.log('ProtectedRoute - showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - no user, redirecting to auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isAllowed) {
    console.log('ProtectedRoute - user not allowed, showing access denied');
    return <AccessDenied />;
  }

  console.log('ProtectedRoute - user authenticated and allowed, showing children');
  return <>{children}</>;
};

export default ProtectedRoute;