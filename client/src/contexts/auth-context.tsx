import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  UserRole, 
  AuthContextType, 
  ROLE_LEVELS, 
  MOCK_USERS 
} from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 확인
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // 기존 사용자 데이터가 role이 문자열인 경우 UserRole로 변환
        if (parsed.role && !Object.keys(ROLE_LEVELS).includes(parsed.role)) {
          parsed.role = 'admin'; // 기본값
        }
        setUser(parsed);
      } catch (error) {
        console.error('Failed to parse saved user data');
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role?: UserRole): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // 실제 로그인 API 호출
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('POST', '/api/auth/login', {
        email,
        password,
      });

      if (!response.ok) {
        const error = await response.json();
        setIsLoading(false);
        return false;
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        // API에서 반환된 사용자 정보 사용
        const user: User = {
          id: data.user.id,
          name: data.user.username || email.split('@')[0], // 이메일에서 이름 추출
          email: data.user.username, // username이 이메일로 저장됨
          role: (data.user.role as UserRole) || 'user',
        };
        
        setUser(user);
        localStorage.setItem('auth_user', JSON.stringify(user));
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  // 역할 변경 (개발/테스트용)
  const setUserRole = (role: UserRole) => {
    if (user) {
      const updatedUser = { ...user, ...MOCK_USERS[role], email: user.email };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
  };

  // 권한 검사 메서드들
  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const hasMinLevel = (level: number): boolean => {
    if (!user) return false;
    const userLevel = ROLE_LEVELS[user.role];
    return userLevel >= level;
  };

  const canAccess = (requiredRoles: UserRole[], requiredLevel?: number): boolean => {
    if (!user) return false;
    
    // 역할 기반 검사
    const hasRequiredRole = requiredRoles.includes(user.role);
    
    // 레벨 기반 검사
    const hasRequiredLevel = requiredLevel ? hasMinLevel(requiredLevel) : true;
    
    return hasRequiredRole && hasRequiredLevel;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    setUserRole,
    hasRole,
    hasAnyRole,
    hasMinLevel,
    canAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}