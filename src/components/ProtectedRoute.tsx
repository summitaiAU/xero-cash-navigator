import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - loading:', loading, 'user:', user?.email);

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

  console.log('ProtectedRoute - user authenticated, showing children');
  return <>{children}</>;
};

export default ProtectedRoute;