import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PermissionGateFallback from './PermissionGateFallback';

const HELP_ARTICLE_URL = 'https://support.example.com/articles/role-access';
const SUPPORT_MAIL_TO = 'mailto:support@example.com';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRoles, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const didRedirect = useRef(false);

  const needRoleCheck = useMemo(() => !!(allowedRoles && allowedRoles.length > 0), [allowedRoles]);
  const hasAccess = useMemo(
    () => {
      // 관리자는 모든 페이지 접근 가능
      if (userRoles.includes('admin')) return true;
      return needRoleCheck ? allowedRoles!.some((r) => userRoles.includes(r)) : true;
    },
    [needRoleCheck, allowedRoles, userRoles]
  );

  useEffect(() => {
    if (loading || didRedirect.current) return;

    // 미인증 → /auth
    if (!user) {
      didRedirect.current = true;
      navigate('/auth', { replace: true });
      return;
    }

    // 역할 필요하지만 아직 로드되지 않았다면: 잠시 대기 (화면에서는 로딩 표시)
    if (needRoleCheck && userRoles.length === 0) return;

    // 접근권한 없음 → 역할별 기본 랜딩으로 보냄
    if (needRoleCheck && !hasAccess) {
      didRedirect.current = true;
      const params = new URLSearchParams();
      params.set('from', `${location.pathname}${location.search}`);
      if (allowedRoles && allowedRoles.length > 0) {
        params.set('required', allowedRoles.join(','));
      }
      navigate(`/access-denied?${params.toString()}`, { replace: true });
    }
  }, [
    loading,
    user,
    userRoles,
    needRoleCheck,
    hasAccess,
    allowedRoles,
    location.pathname,
    location.search,
    navigate,
  ]);

  const shouldShowVerification = useMemo(
    () => loading || (needRoleCheck && Boolean(user) && userRoles.length === 0),
    [loading, needRoleCheck, user, userRoles]
  );

  const handleRelogin = () => {
    didRedirect.current = true;
    navigate('/auth', { replace: true });
  };

  // 로딩 중이거나, 역할 체크가 필요한데 아직 roles가 비어있으면 중간 화면 제공
  if (shouldShowVerification) {
    return (
      <PermissionGateFallback
        helpHref={HELP_ARTICLE_URL}
        supportHref={SUPPORT_MAIL_TO}
        onRetry={handleRelogin}
      />
    );
  }

  // 미인증: useEffect에서 리다이렉트, 여기선 렌더 중단
  if (!user) return null;

  // 권한 없음: useEffect에서 리다이렉트, 여기선 렌더 중단
  if (needRoleCheck && !hasAccess) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
