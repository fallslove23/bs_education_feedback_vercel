import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from './LoadingScreen';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

const RoleBasedRoute = ({ children, allowedRoles, redirectTo = '/dashboard' }: RoleBasedRouteProps) => {
  const { userRoles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && userRoles.length > 0) {
      const hasAccess = allowedRoles.some(role => userRoles.includes(role));
      
      if (!hasAccess) {
        // 역할별 기본 페이지로 리디렉션
        if (userRoles.includes('admin') || userRoles.includes('operator')) {
          navigate('/dashboard');
        } else if (userRoles.includes('instructor') || userRoles.includes('director')) {
          navigate('/dashboard/results');
        } else {
          navigate('/auth');
        }
      }
    }
  }, [userRoles, loading, allowedRoles, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  const hasAccess = allowedRoles.some(role => userRoles.includes(role));
  
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;