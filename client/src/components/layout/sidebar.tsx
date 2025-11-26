import logoUrl from "@assets/logo.png";

import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { StatusIndicator } from "@/components/common/status-indicator";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef, KeyboardEvent, useMemo } from "react";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getFilteredMenuConfig } from "@/config/menu-config";
import { ROLE_COLORS, ROLE_DESCRIPTIONS } from "@/types/auth";
import {
  Sun,
  Moon,
  LogOut,
  User,
  ChevronRight,
  Pin,
  PinOff,
  Shield,
  Settings,
} from "lucide-react";

interface SystemStatusData {
  system: string;
  ragEngine: string;
  lastDataUpdate: string;
  activeConnections?: number;
}

export function Sidebar() {
  const [location] = useLocation();
  const { isConnected, subscribe } = useWebSocket();
  const { theme, toggleTheme } = useTheme();
  const { user, logout, setUserRole } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [systemStatus, setSystemStatus] = useState({
    system: "normal" as "normal" | "warning" | "error",
    ragEngine: "active" as "active" | "inactive",
    lastDataUpdate: "1분 전",
  });

  // Fetch system status
  const { data: statusData } = useQuery<SystemStatusData>({
    queryKey: ["/api/system/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe("system_status", (data) => {
      setSystemStatus(data);
    });
    return unsubscribe;
  }, [subscribe]);

  useEffect(() => {
    if (statusData) {
      setSystemStatus({
        system:
          statusData.system === "normal" ||
          statusData.system === "warning" ||
          statusData.system === "error"
            ? statusData.system
            : ("normal" as const),
        ragEngine:
          statusData.ragEngine === "active" ||
          statusData.ragEngine === "inactive"
            ? statusData.ragEngine
            : ("active" as const),
        lastDataUpdate: statusData.lastDataUpdate
          ? new Date(statusData.lastDataUpdate).toLocaleString()
          : "알 수 없음",
      });
    }
  }, [statusData]);

  // 사용자 역할에 따라 동적으로 메뉴 필터링
  const menuItems = useMemo(() => {
    if (!user) return [];
    return getFilteredMenuConfig(user.role);
  }, [user?.role]);

  // Flatten items for keyboard navigation
  const allItems = menuItems.flatMap((category) => category.items);

  // Keyboard navigation handler
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isExpanded) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % allItems.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((prev) => (prev <= 0 ? allItems.length - 1 : prev - 1));
        break;
      case "Enter":
      case " ":
        if (focusedIndex >= 0) {
          event.preventDefault();
          window.location.href = allItems[focusedIndex].path;
        }
        break;
      case "Escape":
        setIsExpanded(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Handle mouse events for expansion
  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsExpanded(false);
      setFocusedIndex(-1);
    }
  };

  // Handle pin toggle
  const handlePinToggle = () => {
    setIsPinned(!isPinned);
    if (!isPinned) {
      // When pinning, expand the sidebar
      setIsExpanded(true);
    }
  };

  // Focus management
  const handleFocus = () => {
    setIsExpanded(true);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div
          ref={sidebarRef}
          className={cn(
            "flex flex-col transition-all duration-300 ease-premium bg-sidebar backdrop-blur-xl border-r border-sidebar-border shadow-lg relative",
            isExpanded ? "w-80" : "w-16"
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          data-testid="enterprise-sidebar"
          role="navigation"
          aria-label="주메뉴뉴"
          tabIndex={0}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-sidebar/95 to-sidebar pointer-events-none" />

          <div className="flex flex-col h-screen relative z-10">
            {/* Logo and Header */}
            <div
              className={cn(
                "flex items-center flex-shrink-0 border-b border-sidebar-border/50 bg-sidebar/80 backdrop-blur-sm transition-all duration-300",
                isExpanded ? "h-20 px-6" : "h-20 px-3 justify-center"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center justify-center">
                  {isExpanded ? (
                    // 전체 로고 (확장된 상태)
                    <div className="w-32 h-16 flex items-center justify-center flex-shrink-0 transition-all duration-300">
                      <img
                        src={logoUrl}
                        alt="NHQV Logo"
                        className="h-16 w-auto object-contain drop-shadow-sm"
                      />
                    </div>
                  ) : (
                    // 심보 로고만 (축소된 상태)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-sidebar-primary/10 rounded-xl border border-sidebar-border/30 shadow-sm transition-all duration-200 hover:bg-sidebar-primary/20 hover:shadow-md hover:scale-105">
                          <div className="text-sidebar-primary font-bold text-xl font-display">
                            N
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        NHQV Platform
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Pin Button */}
                {isExpanded && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePinToggle}
                        aria-pressed={isPinned}
                        className={cn(
                          "h-8 w-8 p-0 transition-all duration-200 hover:shadow-sm flex-shrink-0",
                          isPinned
                            ? "text-sidebar-primary hover:text-sidebar-primary bg-sidebar-primary/10 hover:bg-sidebar-primary/20"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-primary/10"
                        )}
                        data-testid="sidebar-pin-toggle"
                      >
                        {isPinned ? (
                          <Pin className="h-4 w-4" />
                        ) : (
                          <PinOff className="h-4 w-4" />
                        )}
                        <span className="sr-only">사이드바 고정</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="font-medium">
                      {isPinned ? "사이드바 고정 해제" : "사이드바 고정"}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Navigation Menu */}
            <nav
              className={cn(
                "flex-1 py-6 space-y-3 overflow-y-auto transition-all duration-300 scrollbar-thin",
                isExpanded ? "px-4" : "px-2"
              )}
              data-testid="sidebar-navigation"
              role="menu"
            >
              {menuItems.map((category, categoryIndex) => {
                const categoryStartIndex = menuItems
                  .slice(0, categoryIndex)
                  .reduce((sum, cat) => sum + cat.items.length, 0);

                return (
                  <div key={category.category} className="space-y-1">
                    {/* Category Header */}
                    <h2
                      className={cn(
                        "px-3 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider transition-all duration-300 overflow-hidden font-display",
                        isExpanded
                          ? "opacity-100 h-auto mb-2"
                          : "opacity-0 h-0 mb-0"
                      )}
                    >
                      {category.category}
                    </h2>

                    {/* Menu Items */}
                    {category.items.map((item, itemIndex) => {
                      const globalIndex = categoryStartIndex + itemIndex;
                      const isActive = location === item.path;
                      const isFocused = focusedIndex === globalIndex;
                      const IconComponent = item.icon;

                      const menuItem = (
                        <Link key={item.path} href={item.path}>
                          <div
                            className={cn(
                              "group relative flex items-center transition-all duration-200 rounded-xl cursor-pointer select-none",
                              "hover:bg-sidebar-primary/10 active:bg-sidebar-primary/20",
                              isExpanded
                                ? "py-3 px-3"
                                : "py-3 px-2 justify-center",
                              isActive && [
                                "bg-sidebar-primary/15 text-sidebar-primary shadow-sm",
                                "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:bg-sidebar-primary before:rounded-full",
                              ],
                              isFocused &&
                                "ring-2 ring-sidebar-primary/30 ring-offset-2 ring-offset-sidebar",
                              !isActive &&
                                "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                            )}
                            data-testid={`nav-link-${item.label
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                            role="menuitem"
                            aria-label={item.label}
                            tabIndex={isExpanded ? 0 : -1}
                          >
                            {/* Active Indicator */}
                            {isActive && (
                              <div className="absolute inset-0 bg-gradient-to-r from-sidebar-primary/20 to-transparent rounded-xl" />
                            )}

                            {/* Icon */}
                            <div
                              className={cn(
                                "relative flex items-center justify-center flex-shrink-0 transition-all duration-200",
                                isExpanded ? "mr-3" : "mr-0",
                                isActive ? "scale-105" : "group-hover:scale-105"
                              )}
                            >
                              <IconComponent
                                className={cn(
                                  "w-5 h-5 transition-colors duration-200",
                                  item.color ||
                                    (isActive
                                      ? "text-sidebar-primary"
                                      : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground")
                                )}
                              />
                            </div>

                            {/* Label */}
                            <span
                              className={cn(
                                "font-medium transition-all duration-300 overflow-hidden whitespace-nowrap relative z-10",
                                "text-sm leading-tight",
                                isExpanded
                                  ? "opacity-100 w-auto translate-x-0"
                                  : "opacity-0 w-0 -translate-x-2",
                                isActive
                                  ? "text-sidebar-primary font-semibold"
                                  : "text-sidebar-foreground/80"
                              )}
                            >
                              {item.label}
                            </span>

                            {/* Chevron for active item */}
                            {isActive && isExpanded && (
                              <ChevronRight className="w-4 h-4 ml-auto text-sidebar-primary/60 transition-transform duration-200 group-hover:translate-x-0.5" />
                            )}

                            {/* Badge */}
                            {item.badge && isExpanded && (
                              <div className="ml-auto px-2 py-1 bg-sidebar-primary/20 text-sidebar-primary text-xs font-medium rounded-full">
                                {item.badge}
                              </div>
                            )}
                          </div>
                        </Link>
                      );

                      // Wrap with tooltip if collapsed
                      if (!isExpanded) {
                        return (
                          <Tooltip key={item.path}>
                            <TooltipTrigger asChild>{menuItem}</TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="font-medium shadow-lg"
                            >
                              <div className="flex items-center space-x-2">
                                <IconComponent className="w-4 h-4" />
                                <span>{item.label}</span>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return menuItem;
                    })}
                  </div>
                );
              })}
            </nav>

            {/* Status & User Section */}
            <div className="flex-shrink-0 bg-sidebar/80 backdrop-blur-sm border-t border-sidebar-border/50 transition-all duration-300">
              {/* Status Panel */}
              <div
                className={cn(
                  "transition-all duration-300",
                  isExpanded ? "p-4 space-y-3" : "p-2 space-y-2"
                )}
                data-testid="status-panel"
              >
                {isExpanded ? (
                  <div className="space-y-3">
                    {/* <StatusIndicator
                      status={isConnected ? systemStatus.system : "error"}
                      label="시스템 상태"
                      animated={isConnected}
                    /> */}
                    <StatusIndicator
                      status={systemStatus.system}
                      label="시스템 상태"
                      animated={systemStatus.system === "normal"}
                    />
                    <StatusIndicator
                      status={systemStatus.ragEngine}
                      label="RAG 엔진"
                      animated={systemStatus.ragEngine === "active"}
                    />
                    <StatusIndicator
                      status="normal"
                      label="데이터 수신"
                      value={systemStatus.lastDataUpdate}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full transition-colors duration-200",
                            isConnected
                              ? systemStatus.system === "normal"
                                ? "bg-green-500 shadow-green-500/20"
                                : systemStatus.system === "warning"
                                ? "bg-yellow-500 shadow-yellow-500/20"
                                : "bg-red-500 shadow-red-500/20"
                              : "bg-red-500 shadow-red-500/20",
                            isConnected && "animate-pulse shadow-lg"
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            시스템 상태:{" "}
                            {isConnected ? systemStatus.system : "연결 끊어짐"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isConnected
                              ? systemStatus.system === "normal"
                                ? "모든 시스템이 정상 작동 중입니다."
                                : systemStatus.system === "warning"
                                ? "일부 시스템에 경고가 있습니다. 새로고침 시 상태가 업데이트됩니다."
                                : "시스템 오류가 감지되었습니다. 새로고침 시 상태가 업데이트됩니다."
                              : "서버와의 연결이 끊어졌습니다."}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full transition-colors duration-200",
                            systemStatus.ragEngine === "active"
                              ? "bg-green-500 shadow-green-500/20 animate-pulse shadow-lg"
                              : "bg-gray-400 shadow-gray-400/20"
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            RAG 엔진:{" "}
                            {systemStatus.ragEngine === "active"
                              ? "활성"
                              : "비활성"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {systemStatus.ragEngine === "active"
                              ? "RAG 엔진이 활성 상태입니다. 검색 및 정보 조회 기능을 사용할 수 있습니다."
                              : "RAG 엔진이 비활성 상태입니다."}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-green-500/20 shadow-sm" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        데이터 수신: {systemStatus.lastDataUpdate}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>

              {/* User Info & Actions */}
              <div
                className={cn(
                  "border-t border-sidebar-border/30 transition-all duration-300",
                  isExpanded ? "p-4 space-y-3" : "p-2 space-y-2"
                )}
              >
                {/* User Info */}
                {isExpanded ? (
                  <div className="flex items-center space-x-3 p-2 rounded-lg bg-sidebar-primary/5 border border-sidebar-border/30">
                    <div className="w-8 h-8 bg-sidebar-primary/15 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <User className="w-4 h-4 text-sidebar-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">
                        {user?.name || "User"}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-sidebar-foreground/60 truncate">
                          {user?.email || "user@example.com"}
                        </p>
                        {user?.role && (
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                              ROLE_COLORS[user.role],
                              "bg-sidebar-primary/10 border-sidebar-primary/20"
                            )}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {user.role.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-10 h-10 bg-sidebar-primary/10 rounded-xl flex items-center justify-center mx-auto shadow-sm border border-sidebar-border/30 transition-all duration-200 hover:bg-sidebar-primary/20 hover:shadow-md cursor-pointer relative">
                        <User className="w-5 h-5 text-sidebar-primary" />
                        {user?.role && (
                          <div
                            className={cn(
                              "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white",
                              user.role === "admin"
                                ? "bg-red-500"
                                : user.role === "ops"
                                ? "bg-orange-500"
                                : user.role === "analyst"
                                ? "bg-green-500"
                                : "bg-blue-500"
                            )}
                          >
                            <Shield className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      <div className="text-center space-y-1">
                        <div className="font-semibold">
                          {user?.name || "User"}
                        </div>
                        <div className="text-xs opacity-70">
                          {user?.email || "user@example.com"}
                        </div>
                        {user?.role && (
                          <div
                            className={cn(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                              ROLE_COLORS[user.role]
                            )}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {user.role.toUpperCase()}
                          </div>
                        )}
                        {user?.role && ROLE_DESCRIPTIONS[user.role] && (
                          <div className="text-xs text-muted-foreground mt-1 max-w-48">
                            {ROLE_DESCRIPTIONS[user.role]}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Action Buttons */}
                <div
                  className={cn(
                    "flex transition-all duration-300",
                    isExpanded
                      ? "justify-between items-center"
                      : "flex-col space-y-2 items-center"
                  )}
                >
                  {/* Theme Toggle */}
                  <div
                    className={cn(
                      "flex items-center transition-all duration-300",
                      isExpanded ? "space-x-3" : "w-full justify-center"
                    )}
                  >
                    {isExpanded && (
                      <span className="text-xs font-medium text-sidebar-foreground/70 min-w-0">
                        테마
                      </span>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleTheme}
                          className={cn(
                            "transition-all duration-200 hover:shadow-sm flex-shrink-0",
                            isExpanded
                              ? "h-8 w-8 p-0 hover:bg-sidebar-primary/10 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                              : "h-10 w-10 p-0 hover:bg-sidebar-primary/15 text-sidebar-primary/80 hover:text-sidebar-primary rounded-xl border border-sidebar-border/30 shadow-sm hover:shadow-md hover:scale-105"
                          )}
                          data-testid="theme-toggle-button"
                        >
                          {theme === "light" ? (
                            <Sun
                              className={cn(isExpanded ? "h-4 w-4" : "h-5 w-5")}
                            />
                          ) : (
                            <Moon
                              className={cn(isExpanded ? "h-4 w-4" : "h-5 w-5")}
                            />
                          )}
                          <span className="sr-only">테마 전환</span>
                        </Button>
                      </TooltipTrigger>
                      {!isExpanded && (
                        <TooltipContent side="right" className="font-medium">
                          {theme === "light" ? "다크 모드" : "라이트 모드"}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>

                  {/* Logout Button */}
                  <div
                    className={cn(
                      "flex items-center transition-all duration-300",
                      isExpanded ? "space-x-3" : "w-full justify-center"
                    )}
                  >
                    {isExpanded && (
                      <span className="text-xs font-medium text-sidebar-foreground/70 min-w-0">
                        로그아웃
                      </span>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={logout}
                          className={cn(
                            "transition-all duration-200 hover:shadow-sm flex-shrink-0",
                            isExpanded
                              ? "h-8 w-8 p-0 text-red-500/70 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              : "h-10 w-10 p-0 text-red-500/80 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-sidebar-border/30 shadow-sm hover:shadow-md hover:scale-105"
                          )}
                          data-testid="logout-button"
                        >
                          <LogOut
                            className={cn(isExpanded ? "h-4 w-4" : "h-5 w-5")}
                          />
                          <span className="sr-only">로그아웃</span>
                        </Button>
                      </TooltipTrigger>
                      {!isExpanded && (
                        <TooltipContent side="right" className="font-medium">
                          로그아웃
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
