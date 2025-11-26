import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { canAccessPath, getDefaultPathForRole } from "@/config/menu-config";
import { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  path: string;
  requiredRoles?: UserRole[];
  fallbackPath?: string;
}

// 403 접근 거부 컴포넌트
function AccessDenied({ userRole, requiredPath, onGoHome }: {
  userRole: UserRole;
  requiredPath: string;
  onGoHome: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-6 text-center px-4" role="main" aria-label="접근 권한 없음">
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-950/20 rounded-full flex items-center justify-center">
          <svg 
            className="w-10 h-10 text-red-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" 
            />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground max-w-md">
            이 페이지에 접근하기 위해서는 충분한 권한이 필요합니다.
          </p>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-start space-x-3">
            <svg 
              className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
            <div className="text-left">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                권한 정보
              </h3>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                <p><strong>현재 권한:</strong> {userRole.toUpperCase()}</p>
                <p><strong>요청 페이지:</strong> {requiredPath}</p>
                <p><strong>해결 방법:</strong> 시스템 관리자에게 권한 요청을 하거나 허용된 페이지를 이용해주세요.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <button
        onClick={onGoHome}
        className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
        data-testid="btn-go-home"
      >
        허용된 페이지로 이동
      </button>
    </div>
  );
}

export function ProtectedRoute({ 
  children, 
  path, 
  requiredRoles,
  fallbackPath 
}: ProtectedRouteProps) {
  const { user, hasAnyRole, canAccess } = useAuth();
  const [, setLocation] = useLocation();

  // 사용자가 로그인되어 있지 않으면 로그인 페이지로 리다이렉트는 이미 App.tsx에서 처리됨
  if (!user) {
    return null;
  }

  // 권한 검사 - 두 가지 방식 지원
  const hasPermission = requiredRoles 
    ? hasAnyRole(requiredRoles) 
    : canAccess(requiredRoles || ['user', 'analyst', 'ops', 'admin']);

  const handleGoHome = () => {
    const defaultPath = fallbackPath || getDefaultPathForRole(user.role);
    setLocation(defaultPath);
  };

  useEffect(() => {
    // 자동 리다이렉트가 필요한 경우 (선택사항)
    if (!hasPermission && fallbackPath) {
      const timer = setTimeout(() => {
        handleGoHome();
      }, 3000); // 3초 후 자동 리다이렉트

      return () => clearTimeout(timer);
    }
  }, [hasPermission, fallbackPath, user.role]);

  if (!hasPermission) {
    return (
      <AccessDenied 
        userRole={user.role} 
        requiredPath={path}
        onGoHome={handleGoHome}
      />
    );
  }

  return <>{children}</>;
}

// 특정 경로에 대한 권한 검사를 위한 유틸리티 훅
export function useRouteAccess(path: string) {
  const { user } = useAuth();
  
  if (!user) return false;
  
  return canAccessPath(path, user.role);
}

// 현재 사용자가 접근할 수 있는 모든 경로를 반환하는 훅
export function useAccessibleRoutes() {
  const { user } = useAuth();
  
  if (!user) return [];
  
  // menu-config에서 사용자가 접근할 수 있는 모든 경로 반환
  // 현재는 빈 배열을 반환하지만, 필요 시 getAllAccessiblePaths 함수를 구현할 수 있음
  return [];
}