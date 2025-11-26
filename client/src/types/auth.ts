// 사용자 역할 정의
export type UserRole = 'user' | 'analyst' | 'ops' | 'admin';

// 권한 레벨 (숫자가 높을수록 상위 권한)
export const ROLE_LEVELS: Record<UserRole, number> = {
  user: 1,
  analyst: 2,
  ops: 3,
  admin: 4
};

// 확장된 User 인터페이스
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: string[];
}

// 메뉴 항목 인터페이스
export interface MenuItem {
  path: string;
  label: string;
  icon: any;
  color?: string;
  badge?: string | number;
  requiredRoles: UserRole[];
  requiredLevel?: number; // 최소 권한 레벨
  category?: string;
  isEnabled?: boolean;
}

// 메뉴 카테고리 인터페이스
export interface MenuCategory {
  category: string;
  requiredRoles?: UserRole[];
  items: MenuItem[];
}

// 권한 검사 관련 유틸리티 타입
export interface PermissionCheck {
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasMinLevel: (level: number) => boolean;
  canAccess: (item: MenuItem) => boolean;
  canAccessCategory: (category: MenuCategory) => boolean;
}

// 로그인 폼 타입
export interface LoginForm {
  email: string;
  password: string;
  role?: UserRole; // 개발/테스트용
}

// 권한 컨텍스트 타입
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
  
  // 권한 검사 메서드들
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasMinLevel: (level: number) => boolean;
  canAccess: (requiredRoles: UserRole[], requiredLevel?: number) => boolean;
}

// 개발/테스트용 권한 변경 이벤트
export interface RoleChangeEvent {
  previousRole: UserRole;
  newRole: UserRole;
  timestamp: number;
}

// 권한별 설명
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  user: '일반 사용자 - 기본적인 조회 및 분석 기능',
  analyst: '분석가 - 고급 분석 및 리포트 기능',
  ops: '운영자 - 시스템 모니터링 및 관리 기능', 
  admin: '관리자 - 모든 기능 및 시스템 설정'
};

// 권한별 색상
export const ROLE_COLORS: Record<UserRole, string> = {
  user: 'text-blue-500',
  analyst: 'text-green-500',
  ops: 'text-orange-500',
  admin: 'text-red-500'
};

// 개발 환경에서만 사용할 목업 사용자들
export const MOCK_USERS: Record<UserRole, User> = {
  user: {
    id: 'user-1',
    name: '일반사용자',
    email: 'user@nhqv.com',
    role: 'user'
  },
  analyst: {
    id: 'analyst-1',
    name: '데이터분석가',
    email: 'analyst@nhqv.com',
    role: 'analyst'
  },
  ops: {
    id: 'ops-1',
    name: '시스템운영자',
    email: 'ops@nhqv.com',
    role: 'ops'
  },
  admin: {
    id: 'admin-1',
    name: '시스템관리자',
    email: 'admin@nhqv.com',
    role: 'admin'
  }
};