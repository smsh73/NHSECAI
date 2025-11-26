import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { 
  UserRole, 
  ROLE_DESCRIPTIONS, 
  ROLE_COLORS,
  MOCK_USERS 
} from "@/types/auth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Shield, 
  ChevronDown, 
  Settings,
  User,
  TrendingUp,
  Server,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<UserRole, any> = {
  user: User,
  analyst: TrendingUp,
  ops: Server,
  admin: Crown
};

interface RoleSelectorProps {
  compact?: boolean;
  className?: string;
}

export function RoleSelector({ compact = false, className }: RoleSelectorProps) {
  const { user, setUserRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const currentRole = user.role;
  const CurrentRoleIcon = ROLE_ICONS[currentRole];

  const handleRoleChange = (newRole: UserRole) => {
    setUserRole(newRole);
    setIsOpen(false);
  };

  // 개발 환경에서만 표시
  const isDevelopment = import.meta.env.MODE === 'development';
  if (!isDevelopment) return null;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 rounded-full relative",
                  "hover:bg-sidebar-primary/10 transition-all duration-200",
                  "border border-sidebar-border/30 shadow-sm",
                  className
                )}
                data-testid="role-selector-compact"
              >
                <div className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center",
                  currentRole === 'admin' ? 'bg-red-500' :
                  currentRole === 'ops' ? 'bg-orange-500' :
                  currentRole === 'analyst' ? 'bg-green-500' : 'bg-blue-500'
                )}>
                  <Shield className="w-2.5 h-2.5 text-white" />
                </div>
                <ChevronDown className="w-2 h-2 absolute -bottom-0.5 -right-0.5 bg-background rounded-full" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
              align="start" 
              className="w-64"
              data-testid="role-selector-menu"
            >
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                개발 모드 - 권한 선택
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuRadioGroup 
                value={currentRole} 
                onValueChange={(role) => handleRoleChange(role as UserRole)}
              >
                {(Object.keys(MOCK_USERS) as UserRole[]).map((role) => {
                  const RoleIcon = ROLE_ICONS[role];
                  const mockUser = MOCK_USERS[role];
                  
                  return (
                    <DropdownMenuRadioItem
                      key={role}
                      value={role}
                      className="cursor-pointer"
                      data-testid={`role-option-${role}`}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          role === 'admin' ? 'bg-red-100 text-red-600 dark:bg-red-950/20' :
                          role === 'ops' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/20' :
                          role === 'analyst' ? 'bg-green-100 text-green-600 dark:bg-green-950/20' : 
                          'bg-blue-100 text-blue-600 dark:bg-blue-950/20'
                        )}>
                          <RoleIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{mockUser.name}</span>
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                ROLE_COLORS[role]
                              )}
                            >
                              {role.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {ROLE_DESCRIPTIONS[role]}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
              
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-xs text-muted-foreground">
                현재: {ROLE_DESCRIPTIONS[currentRole]}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          <div className="space-y-1">
            <div className="font-semibold">권한: {currentRole.toUpperCase()}</div>
            <div className="text-xs opacity-80">{ROLE_DESCRIPTIONS[currentRole]}</div>
            <div className="text-xs opacity-60">클릭하여 변경</div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "justify-between h-auto p-3 space-x-2 w-full",
            "hover:bg-muted/50 transition-colors duration-200",
            "border border-border/50",
            className
          )}
          data-testid="role-selector-full"
        >
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-6 h-6 rounded-lg flex items-center justify-center",
              currentRole === 'admin' ? 'bg-red-100 text-red-600 dark:bg-red-950/20' :
              currentRole === 'ops' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/20' :
              currentRole === 'analyst' ? 'bg-green-100 text-green-600 dark:bg-green-950/20' : 
              'bg-blue-100 text-blue-600 dark:bg-blue-950/20'
            )}>
              <CurrentRoleIcon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">권한: {currentRole.toUpperCase()}</span>
                <Badge variant="secondary" className="text-xs">DEV</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {ROLE_DESCRIPTIONS[currentRole]}
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-80"
        data-testid="role-selector-menu-full"
      >
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground flex items-center">
          <Settings className="w-3 h-3 mr-2" />
          개발 모드 - 권한 선택
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuRadioGroup 
          value={currentRole} 
          onValueChange={(role) => handleRoleChange(role as UserRole)}
        >
          {(Object.keys(MOCK_USERS) as UserRole[]).map((role) => {
            const RoleIcon = ROLE_ICONS[role];
            const mockUser = MOCK_USERS[role];
            
            return (
              <DropdownMenuRadioItem
                key={role}
                value={role}
                className="cursor-pointer py-3"
                data-testid={`role-option-${role}`}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    role === 'admin' ? 'bg-red-100 text-red-600 dark:bg-red-950/20' :
                    role === 'ops' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/20' :
                    role === 'analyst' ? 'bg-green-100 text-green-600 dark:bg-green-950/20' : 
                    'bg-blue-100 text-blue-600 dark:bg-blue-950/20'
                  )}>
                    <RoleIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-sm">{mockUser.name}</span>
                      <Badge 
                        variant={role === currentRole ? "default" : "secondary"} 
                        className={cn(
                          "text-xs",
                          role === currentRole ? ROLE_COLORS[role] : "text-muted-foreground"
                        )}
                      >
                        {role.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      {mockUser.email}
                    </p>
                  </div>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>현재 선택된 권한으로 메뉴와 페이지 접근이 제한됩니다.</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}