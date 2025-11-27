import { 
  Sun, 
  Moon, 
  LogOut, 
  User,
  Workflow,
  Play,
  Monitor,
  Database,
  Search,
  MessageCircle,
  Plug,
  Newspaper,
  Zap,
  Edit3,
  BarChart3,
  Smartphone,
  Layers,
  Home,
  Activity,
  Calendar,
  TrendingUp,
  AlertTriangle,
  PieChart,
  Wallet,
  TrendingDown,
  Star,
  Settings,
  MessageSquare,
  Sparkles,
  Shield,
  BarChart,
  Code2,
  BookOpen,
  Wand2,
  Cloud,
  FlaskConical,
  TestTube2,
  FileText,
  ShieldAlert,
  Server
} from "lucide-react";
import { MenuCategory, UserRole } from "@/types/auth";

// 메뉴 카테고리별 대표 아이콘 매핑
export const MENU_CATEGORY_ICONS = {
  "홈 & 대시보드": { icon: Home, color: "text-blue-500" },
  "워크플로우 관리": { icon: Workflow, color: "text-purple-500" },
  "데이터 관리": { icon: Database, color: "text-green-500" },
  "AI 시스템 관리": { icon: Sparkles, color: "text-orange-500" },
  "개인화 서비스": { icon: User, color: "text-pink-500" },
  "품질 관리": { icon: Shield, color: "text-red-500" }
} as const;

// 권한별 메뉴 구성 설정
export const ROLE_BASED_MENU_CONFIG: MenuCategory[] = [
  {
    category: "홈 & 대시보드",
    requiredRoles: ['user', 'analyst', 'ops', 'admin'],
    items: [
      { 
        path: "/dashboard", 
        label: "통합 대시보드", 
        icon: Home, 
        color: "text-blue-500",
        requiredRoles: ['user', 'analyst', 'ops', 'admin'],
        requiredLevel: 1
      },
      { 
        path: "/", 
        label: "시장 현황", 
        icon: Activity, 
        color: "text-green-500",
        requiredRoles: ['user', 'analyst', 'ops', 'admin'],
        requiredLevel: 1
      }
    ]
  },
  {
    category: "워크플로우 관리",
    requiredRoles: ['analyst', 'ops', 'admin'],
    items: [
      { 
        path: "/workflow-editor", 
        label: "워크플로우 편집기", 
        icon: Workflow, 
        color: "text-accent",
        requiredRoles: ['analyst', 'ops', 'admin'],
        requiredLevel: 2
      },
      { 
        path: "/scheduler", 
        label: "실행 스케줄러", 
        icon: Calendar,
        requiredRoles: ['ops', 'admin'],
        requiredLevel: 3
      },
      { 
        path: "/workflow-monitor", 
        label: "워크플로우 모니터", 
        icon: Monitor, 
        color: "text-blue-500",
        requiredRoles: ['ops', 'admin'],
        requiredLevel: 3
      },
    ]
  },
  {
    category: "데이터 관리",
    requiredRoles: ['analyst', 'ops', 'admin'],
    items: [
      { 
        path: "/schema-browser", 
        label: "스키마 브라우저", 
        icon: Database,
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      { 
        path: "/nl2sql-engine", 
        label: "NL to SQL 엔진", 
        icon: Code2, 
        color: "text-purple-500",
        requiredRoles: ['analyst', 'ops', 'admin'],
        requiredLevel: 2
      },
      { 
        path: "/schema-mapper", 
        label: "스키마 의미 매핑", 
        icon: Layers, 
        color: "text-purple-500",
        requiredRoles: ['analyst', 'ops', 'admin'],
        requiredLevel: 2
      },
      { 
        path: "/dictionary-manager", 
        label: "Dictionary 관리", 
        icon: BookOpen, 
        color: "text-indigo-500",
        requiredRoles: ['analyst', 'ops', 'admin'],
        requiredLevel: 2
      },
      { 
        path: "/theme-cluster-management", 
        label: "테마 클러스터 관리", 
        icon: Layers, 
        color: "text-orange-500",
        requiredRoles: ['analyst', 'ops', 'admin'],
        requiredLevel: 2
      },
      { 
        path: "/data-query-ai-market", 
        label: "AI 시황 결과 데이터 쿼리", 
        icon: BarChart3, 
        color: "text-blue-500",
        requiredRoles: ['analyst', 'ops', 'admin'],
        requiredLevel: 2
      },
      { 
        path: "/data-query-holdings", 
        label: "잔고 분석 결과 데이터 쿼리", 
        icon: Wallet, 
        color: "text-green-500",
        requiredRoles: ['analyst', 'ops', 'admin'],
        requiredLevel: 2
      },
    ]
  },
  {
    category: "AI 시스템 관리",
    requiredRoles: ['ops', 'admin'],
    items: [
      { 
        path: "/prompt-management", 
        label: "프롬프트 관리", 
        icon: MessageCircle,
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      { 
        path: "/api-management", 
        label: "API 호출 관리", 
        icon: Plug,
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      { 
        path: "/python-management", 
        label: "Python 스크립트 관리", 
        icon: Code2,
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      { 
        path: "/data-source-management", 
        label: "데이터소스 관리", 
        icon: Server,
        color: "text-emerald-600",
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      { 
        path: "/prompt-builder", 
        label: "프롬프트 빌더", 
        icon: Wand2, 
        color: "text-violet-500",
        requiredRoles: ['analyst', 'ops', 'admin'],
        requiredLevel: 2
      },
      { 
        path: "/financial-chatbot", 
        label: "금융 AI 어시스턴트", 
        icon: MessageSquare, 
        color: "text-blue-500",
        requiredRoles: ['user', 'analyst', 'ops', 'admin'],
        requiredLevel: 1
      },
      {
        path: "/logs",
        label: "로그 분석",
        icon: FileText,
        color: "text-slate-600",
        requiredRoles: ['ops', 'admin'],
        requiredLevel: 3
      },
      {
        path: "/audit-log-management",
        label: "감사 로그 관리",
        icon: ShieldAlert,
        color: "text-red-600",
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      {
        path: "/azure-config",
        label: "Azure 서비스 설정",
        icon: Cloud,
        color: "text-blue-600",
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      {
        path: "/openai-provider",
        label: "OpenAI 프로바이더",
        icon: Sparkles,
        color: "text-purple-600",
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      {
        path: "/ai-market-analysis",
        label: "AI시황생성테스트",
        icon: BarChart3,
        color: "text-cyan-600",
        requiredRoles: ['analyst', 'ops', 'admin'],
        requiredLevel: 2
      },
      {
        path: "/ai-search-management",
        label: "AI Search 관리",
        icon: Search,
        color: "text-blue-600",
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      {
        path: "/rag-management",
        label: "RAG 관리",
        icon: Sparkles,
        color: "text-purple-600",
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
      {
        path: "/rag-security-management",
        label: "RAG 보안 관리",
        icon: Shield,
        color: "text-red-600",
        requiredRoles: ['admin'],
        requiredLevel: 4
      },
    ]
  },
  {
    category: "개인화 서비스",
    requiredRoles: ['user', 'analyst', 'ops', 'admin'],
    items: [
      { 
        path: "/personal-dashboard", 
        label: "개인화 대시보드", 
        icon: PieChart, 
        color: "text-purple-500",
        requiredRoles: ['user', 'analyst', 'ops', 'admin'],
        requiredLevel: 1
      },
      { 
        path: "/my-holdings", 
        label: "보유종목 관리", 
        icon: Wallet, 
        color: "text-indigo-500",
        requiredRoles: ['user', 'analyst', 'ops', 'admin'],
        requiredLevel: 1
      },
      { 
        path: "/my-trades", 
        label: "매매이력 분석", 
        icon: TrendingDown, 
        color: "text-blue-500",
        requiredRoles: ['user', 'analyst', 'ops', 'admin'],
        requiredLevel: 1
      },
      { 
        path: "/my-watchlist", 
        label: "관심종목 관리", 
        icon: Star, 
        color: "text-yellow-500",
        requiredRoles: ['user', 'analyst', 'ops', 'admin'],
        requiredLevel: 1
      },
      { 
        path: "/personalization-settings", 
        label: "개인화 설정", 
        icon: Settings, 
        color: "text-gray-500",
        requiredRoles: ['user', 'analyst', 'ops', 'admin'],
        requiredLevel: 1
      },
    ]
  },
  {
    category: "품질 관리",
    requiredRoles: ['ops', 'admin'],
    items: [
      { 
        path: "/etf-guide", 
        label: "ETF 투자가이드", 
        icon: MessageSquare, 
        color: "text-blue-500",
        requiredRoles: ['user', 'analyst', 'ops', 'admin'],
        requiredLevel: 1
      },
    ]
  }
];

// 권한별 접근 가능한 모든 경로를 플랫하게 정리
export const getAllAccessiblePaths = (userRole: UserRole): string[] => {
  const paths: string[] = [];
  
  ROLE_BASED_MENU_CONFIG.forEach(category => {
    if (category.requiredRoles && !category.requiredRoles.includes(userRole)) {
      return; // 카테고리 접근 권한 없음
    }
    
    category.items.forEach(item => {
      if (item.requiredRoles.includes(userRole)) {
        paths.push(item.path);
      }
    });
  });
  
  return paths;
};

// 특정 경로에 접근 권한이 있는지 확인
export const canAccessPath = (path: string, userRole: UserRole): boolean => {
  for (const category of ROLE_BASED_MENU_CONFIG) {
    for (const item of category.items) {
      if (item.path === path) {
        return item.requiredRoles.includes(userRole);
      }
    }
  }
  return false;
};

// 사용자 역할에 따라 필터링된 메뉴 반환
export const getFilteredMenuConfig = (userRole: UserRole): MenuCategory[] => {
  return ROLE_BASED_MENU_CONFIG
    .map(category => ({
      ...category,
      items: category.items.filter(item => item.requiredRoles.includes(userRole))
    }))
    .filter(category => {
      // 카테고리 레벨 권한 체크
      const categoryHasAccess = !category.requiredRoles || category.requiredRoles.includes(userRole);
      // 카테고리에 접근 가능한 메뉴 아이템이 하나라도 있는지 체크
      const hasAccessibleItems = category.items.length > 0;
      
      return categoryHasAccess && hasAccessibleItems;
    });
};

// 권한별 홈 페이지 정의 (권한 없는 페이지 접근 시 리다이렉트)
export const getDefaultPathForRole = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/dashboard';
    case 'ops':
      return '/workflow-monitor';
    case 'analyst':
      return '/macro-analysis';
    case 'user':
      return '/morning-briefing';
    default:
      return '/';
  }
};