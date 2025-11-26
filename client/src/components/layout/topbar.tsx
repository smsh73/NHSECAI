import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleSelector } from "@/components/common/role-selector";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuShortcut
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROLE_COLORS } from "@/types/auth";
import { 
  Search, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Shield,
  ChevronRight,
  Home,
  Workflow,
  Database,
  MessageCircle,
  Plug,
  Sun,
  Newspaper,
  Zap,
  Edit3,
  Play,
  Monitor,
  Calendar,
  BarChart3,
  Command as CommandIcon,
  Smartphone,
  Menu,
  Moon,
  X
} from "lucide-react";
import { getFilteredMenuConfig, MENU_CATEGORY_ICONS } from "@/config/menu-config";
import { useToast } from "@/hooks/use-toast";

interface NavigationItem {
  path: string;
  label: string;
  icon: any;
}

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const Topbar = memo(function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount] = useState(3); // Mock notification count
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Get filtered menu items for mobile menu
  const menuItems = useMemo(() => {
    if (!user) return [];
    return getFilteredMenuConfig(user.role);
  }, [user?.role]);

  // 성능 최적화를 위한 네비게이션 아이템 메모이제이션
  const navigationItems: NavigationItem[] = useMemo(() => [
    { path: "/", label: "홈", icon: Home },
    { path: "/dashboard", label: "대시보드", icon: BarChart3 },
    { path: "/workflow-editor", label: "워크플로우 편집기", icon: Workflow },
    { path: "/scheduler", label: "실행 스케줄러", icon: Play },
    { path: "/workflow-monitor", label: "워크플로우 모니터", icon: Monitor },
    { path: "/schema-browser", label: "스키마 브라우저", icon: Database },
    { path: "/prompt-management", label: "프롬프트 관리", icon: MessageCircle },
    { path: "/api-management", label: "API 호출 관리", icon: Plug },
    { path: "/data-source-management", label: "데이터소스 관리", icon: Database },
    { path: "/morning-briefing", label: "모닝브리핑", icon: Sun },
    { path: "/macro-analysis", label: "매크로시황", icon: Newspaper },
    { path: "/causal-analysis", label: "인과시황", icon: Zap },
    { path: "/layout-editor", label: "레이아웃 편집기", icon: Edit3 },
    { path: "/mts", label: "MTS 시뮬레이션", icon: Smartphone },
  ], []);

  // 성능 최적화를 위한 브레드크럼 계산 메모이제이션
  const getBreadcrumbs = useCallback((path: string): BreadcrumbItem[] => {
    const currentItem = navigationItems.find(item => item.path === path);
    
    if (!currentItem) {
      return [{ label: "홈", path: "/" }];
    }

    if (path === "/") {
      return [{ label: "홈" }];
    }

    return [
      { label: "홈", path: "/" },
      { label: currentItem.label }
    ];
  }, [navigationItems]);

  const breadcrumbs = getBreadcrumbs(location);
  const currentPage = breadcrumbs[breadcrumbs.length - 1];

  // Keyboard shortcut handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Open search with Cmd+K or Ctrl+K
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      setIsSearchOpen(true);
    }
    
    // Close search with Escape
    if (event.key === 'Escape' && isSearchOpen) {
      event.preventDefault();
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  }, [isSearchOpen]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return navigationItems;
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return navigationItems;
    
    // 검색어를 단어로 분리 (공백, 특수문자 제거하되 한글은 유지)
    const queryWords = query.split(/\s+/).filter(Boolean).map(w => w.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ]/g, '')).filter(Boolean);
    
    return navigationItems.filter(item => {
      const labelLower = item.label.toLowerCase();
      const pathLower = item.path.toLowerCase().replace(/\//g, ' ').replace(/-/g, ' ');
      
      // 전체 문자열 매칭 (부분 문자열 포함) - 가장 먼저 확인
      if (labelLower.includes(query) || pathLower.includes(query)) {
        return true;
      }
      
      // 한글 검색 개선: 검색어의 각 글자가 연속으로 포함되어 있는지 확인
      // 예: "호출" -> "API 호출 관리"에서 "호출"이 포함되어 있는지 확인
      const queryChars = query.replace(/\s/g, '').split('');
      let consecutiveMatch = true;
      let lastIndex = -1;
      for (const char of queryChars) {
        const currentIndex = labelLower.indexOf(char, lastIndex + 1);
        if (currentIndex === -1) {
          consecutiveMatch = false;
          break;
        }
        lastIndex = currentIndex;
      }
      if (consecutiveMatch) {
        return true;
      }
      
      // 단어 단위 매칭 - 각 단어가 라벨이나 경로에 포함되어 있는지 확인
      const labelWords = labelLower.split(/\s+/).filter(Boolean);
      const pathWords = pathLower.split(/\s+/).filter(w => w.length > 0);
      
      // 모든 검색 단어가 라벨이나 경로의 어느 단어에든 포함되어 있는지 확인
      const matchesAllWords = queryWords.every(searchWord => {
        if (searchWord.length === 0) return true;
        
        // 검색 단어가 라벨의 단어들 중 하나에 포함되어 있는지
        const matchesLabel = labelWords.some(labelWord => 
          labelWord.includes(searchWord) || searchWord.includes(labelWord)
        );
        
        // 검색 단어가 경로의 단어들 중 하나에 포함되어 있는지
        const matchesPath = pathWords.some(pathWord => 
          pathWord.includes(searchWord) || searchWord.includes(pathWord)
        );
        
        // 전체 라벨/경로에 검색 단어가 포함되어 있는지 (부분 문자열 매칭)
        const matchesFullLabel = labelLower.includes(searchWord);
        const matchesFullPath = pathLower.includes(searchWord);
        
        return matchesLabel || matchesPath || matchesFullLabel || matchesFullPath;
      });
      
      return matchesAllWords;
    });
  }, [navigationItems, searchQuery]);

  // 성능 최적화를 위한 검색 선택 핸들러 메모이제이션
  const handleSearchSelect = useCallback((path: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setLocation(path);
  }, [setLocation]);

  // Handle Enter key in search input
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems.length > 0) {
        const firstItem = filteredItems[0];
        if (firstItem) {
          handleSearchSelect(firstItem.path);
        }
      } else if (searchQuery.trim()) {
        // 검색 결과가 없어도 첫 번째 항목으로 이동하거나 검색어 초기화
        toast({
          title: "검색 결과 없음",
          description: `"${searchQuery}"에 대한 검색 결과가 없습니다.`,
          variant: "default",
        });
      }
    }
    // Escape key to close search
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  }, [filteredItems, handleSearchSelect, searchQuery]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // 검색 창 닫을 때 검색어 초기화
  useEffect(() => {
    if (!isSearchOpen) {
      setSearchQuery("");
    }
  }, [isSearchOpen]);

  // Get environment mode
  const environment = import.meta.env.MODE || 'development';
  const isProduction = environment === 'production';

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Main Topbar */}
      <header 
        className={cn(
          "sticky top-0 z-50 w-full",
          "bg-background/95 backdrop-blur-xl border-b border-border/50",
          "shadow-sm transition-all duration-200",
          "h-16 px-6 flex items-center gap-6",
          "bg-gradient-to-r from-background/95 via-background/95 to-primary/5"
        )}
        data-testid="enterprise-topbar"
        role="banner"
      >
        {/* Left Section - Mobile Menu & NHQV Logo & Breadcrumbs */}
        <div className="flex items-center space-x-4 min-w-0 flex-shrink-0">
          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-2 h-9 w-9"
                data-testid="mobile-menu-button"
                aria-label="메뉴 열기"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="flex flex-col h-full bg-sidebar">
                <SheetHeader className="px-6 py-4 border-b border-sidebar-border">
                  <SheetTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-sidebar-primary/10 rounded-xl border border-sidebar-border/30">
                      <div className="text-sidebar-primary font-bold text-lg">N</div>
                    </div>
                    <span className="text-sidebar-foreground">NHQV Platform</span>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {menuItems.map((category, idx) => {
                    const categoryInfo = MENU_CATEGORY_ICONS[category.category as keyof typeof MENU_CATEGORY_ICONS];
                    const CategoryIcon = categoryInfo?.icon;
                    
                    return (
                    <div key={idx}>
                      <div className="flex items-center space-x-2 px-3 mb-2">
                        {CategoryIcon && <CategoryIcon className="w-4 h-4 text-sidebar-foreground/60" />}
                        <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                          {category.category}
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {category.items.map((item, itemIdx) => (
                          <Button
                            key={itemIdx}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start h-10 px-3",
                              location === item.path 
                                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                            )}
                            onClick={() => {
                              setLocation(item.path);
                              setIsMobileMenuOpen(false);
                            }}
                            data-testid={`mobile-menu-${item.path.slice(1)}`}
                          >
                            <item.icon className="w-4 h-4 mr-3" />
                            {item.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-sidebar-border space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      toggleTheme();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4 mr-3" /> : <Moon className="w-4 h-4 mr-3" />}
                    {theme === 'dark' ? '라이트 모드' : '다크 모드'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    로그아웃
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* NHQV Logo Area */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">NH</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-semibold text-foreground leading-tight">NH Investment</span>
              <span className="text-xs text-muted-foreground leading-tight">Securities</span>
            </div>
          </div>
          
          {/* Breadcrumb Navigation */}
          <nav 
            className="flex items-center space-x-2 text-sm"
            aria-label="페이지 경로"
            data-testid="breadcrumb-navigation"
          >
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                {item.path ? (
                  <button
                    onClick={() => setLocation(item.path!)}
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      "transition-colors duration-150 truncate whitespace-nowrap",
                      "hover:underline cursor-pointer bg-transparent border-none p-0"
                    )}
                    data-testid={`breadcrumb-link-${index}`}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span 
                    className="text-foreground font-medium truncate whitespace-nowrap"
                    data-testid={`breadcrumb-current-${index}`}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Center Section - Search */}
        <div className="flex items-center justify-center flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-sm text-muted-foreground",
                "bg-background/50 hover:bg-background/80",
                "border-border/50 hover:border-border",
                "h-9 px-4 font-normal transition-all duration-200"
              )}
              onClick={() => setIsSearchOpen(true)}
              data-testid="search-trigger-button"
              aria-label="검색 열기 (Cmd+K)"
            >
              <Search className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">검색...</span>
              <kbd 
                className={cn(
                  "pointer-events-none inline-flex h-5 select-none items-center gap-1",
                  "rounded border bg-muted px-1.5 font-mono text-[10px] font-medium",
                  "text-muted-foreground opacity-100 ml-2 flex-shrink-0"
                )}
              >
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
        </div>

        {/* Right Section - Controls */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Role Selector - Development only */}
          {!isProduction && (
            <div className="hidden md:block">
              <RoleSelector compact />
            </div>
          )}
          
          {/* Environment Badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={isProduction ? "default" : "secondary"}
                className={cn(
                  "capitalize text-xs font-medium",
                  "border transition-colors duration-200",
                  isProduction 
                    ? "bg-accent/10 text-accent-foreground border-accent/20 hover:bg-accent/15" 
                    : "bg-primary/10 text-primary-foreground border-primary/20 hover:bg-primary/15",
                  "dark:bg-accent/20 dark:text-accent dark:border-accent/30",
                  !isProduction && "dark:bg-primary/20 dark:text-primary dark:border-primary/30"
                )}
                data-testid="environment-badge"
              >
                <Shield className="w-3 h-3 mr-1" />
                {environment}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>현재 환경: {isProduction ? '운영' : '개발'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "relative p-2 h-9 w-9",
                  "hover:bg-background/80 transition-colors duration-150",
                  "focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
                data-testid="notification-button"
                aria-label={`${notificationCount}개의 알림`}
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span 
                    className={cn(
                      "absolute -top-1 -right-1 h-5 w-5",
                      "bg-red-500 text-white text-xs font-bold",
                      "rounded-full flex items-center justify-center",
                      "animate-pulse shadow-sm"
                    )}
                    data-testid="notification-badge"
                    aria-label={`${notificationCount}개의 새 알림`}
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{notificationCount}개의 새 알림</p>
            </TooltipContent>
          </Tooltip>

          {/* User Menu */}
          <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "relative h-9 w-9 rounded-full p-0",
                  "hover:bg-background/80 transition-all duration-150",
                  "focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isUserMenuOpen && "bg-background/80"
                )}
                data-testid="user-menu-trigger"
                aria-label="사용자 메뉴 열기"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-medium text-sm border border-primary/10">
                    {user?.name ? getUserInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-56" 
              align="end" 
              forceMount
              data-testid="user-menu-content"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || '사용자'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                data-testid="user-menu-profile"
                aria-label="프로필"
              >
                <User className="mr-2 h-4 w-4" />
                <span>프로필</span>
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                data-testid="user-menu-settings"
                aria-label="설정"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>설정</span>
                <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                data-testid="user-menu-logout"
                aria-label="로그아웃"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Search Dialog */}
      <Dialog 
        open={isSearchOpen} 
        onOpenChange={(open) => {
          setIsSearchOpen(open);
          // 검색 창이 닫힐 때 검색어 초기화
          if (!open) {
            setSearchQuery("");
          }
        }}
      >
        <DialogContent 
          className="p-0 max-w-2xl"
          data-testid="search-dialog"
          aria-labelledby="search-dialog-title"
        >
          <DialogHeader className="sr-only">
            <DialogTitle id="search-dialog-title">글로벌 검색</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border-0">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                ref={searchInputRef}
                placeholder="페이지 또는 기능 검색... (Enter로 첫 번째 결과 선택)"
                value={searchQuery}
                onValueChange={setSearchQuery}
                onKeyDown={handleSearchKeyDown}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="search-input"
              />
              <kbd 
                className={cn(
                  "pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1",
                  "rounded border bg-muted px-1.5 font-mono text-[10px] font-medium",
                  "text-muted-foreground"
                )}
              >
                ESC
              </kbd>
            </div>
            <CommandList className="max-h-80 overflow-y-auto">
              {filteredItems.length === 0 && searchQuery !== "" ? (
                <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
              ) : (
                <>
                  <CommandGroup heading="페이지">
                    {filteredItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <CommandItem
                          key={item.path}
                          value={item.path}
                          onSelect={() => handleSearchSelect(item.path)}
                          className="cursor-pointer"
                          data-testid={`search-item-${item.path.replace('/', '') || 'home'}`}
                        >
                          <IconComponent className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                          <CommandShortcut className="ml-auto">
                            {item.path === location && "현재"}
                          </CommandShortcut>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  {searchQuery === "" && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="빠른 작업">
                        <CommandItem data-testid="search-quick-theme">
                          <CommandIcon className="mr-2 h-4 w-4" />
                          <span>테마 변경</span>
                          <CommandShortcut>⌘T</CommandShortcut>
                        </CommandItem>
                        <CommandItem data-testid="search-quick-settings">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>설정 열기</span>
                          <CommandShortcut>⌘,</CommandShortcut>
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
});

// 성능 최적화를 위한 displayName 설정
Topbar.displayName = 'Topbar';

export { Topbar };
