import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Lightbulb } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PrimaryAction {
  title: string;
  description: string;
  path: string;
  settingsPath?: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  isNew?: boolean;
  isPopular?: boolean;
}

interface PrimaryActionsProps {
  className?: string;
}

const primaryActions: PrimaryAction[] = [
  {
    title: "AI 시황 생성",
    description: "GPT-5 기반 실시간 시장 분석 및 시황 보고서 자동 생성",
    path: "/macro-analysis",
    settingsPath: "/azure-config",
    priority: "high",
    category: "AI 분석",
    isPopular: true
  },
  {
    title: "워크플로우 편집기",
    description: "드래그앤드롭으로 시황 생성 파이프라인 구축 및 관리",
    path: "/workflow-editor",
    settingsPath: "/scheduler",
    priority: "high",
    category: "자동화",
    isNew: true
  },
  {
    title: "RAG 검색 엔진",
    description: "하이브리드 벡터 검색으로 정확한 금융 정보 검색",
    path: "/schema-browser",
    settingsPath: "/azure-config",
    priority: "high",
    category: "검색"
  },
  {
    title: "레이아웃 편집기",
    description: "시황 보고서 레이아웃 자동 생성 및 브랜드 템플릿 관리",
    path: "/layout-editor",
    priority: "medium",
    category: "디자인"
  },
  {
    title: "실시간 모니터링",
    description: "시황 생성 파이프라인 및 시스템 상태 실시간 추적",
    path: "/workflow-monitor",
    priority: "medium",
    category: "모니터링"
  },
  {
    title: "모닝브리핑",
    description: "AI 기반 자동 시장 브리핑 생성 및 개인화 서비스",
    path: "/morning-briefing",
    priority: "medium",
    category: "브리핑"
  }
];

const ActionCard = memo(function ActionCard({ action }: { action: PrimaryAction }) {
  const { title, description, path, settingsPath, priority, category, isNew, isPopular } = action;

  return (
    <div className="relative group">
      <Link href={path}>
        <Card 
          className={cn(
            "relative cursor-pointer h-full",
            "bg-card border",
            "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
          )}
          role="article"
          aria-label={`${title} 기능 카드`}
          tabIndex={0}
        >
          <CardContent className="p-6 h-full">
            <div className="flex flex-col h-full">
              
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    {/* Category Badge */}
                    <Badge variant="outline" className="text-xs font-medium border-black/20 dark:border-white/20">
                      {category}
                    </Badge>
                    {/* Smart Suggestion Icon */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center">
                            <Sparkles 
                              className={cn(
                                "h-4 w-4",
                                isPopular ? "text-primary fill-primary" : "text-muted-foreground opacity-50"
                              )} 
                              aria-label={isPopular ? "스마트 제안 활성화됨" : "스마트 제안 비활성화됨"}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isPopular ? "스마트 제안이 활성화되어 있습니다" : "스마트 제안이 비활성화되어 있습니다"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  {/* Status Badges */}
                  {(isNew || isPopular) && (
                    <div className="flex gap-1 mb-3">
                      {isNew && (
                        <Badge className="text-xs bg-emerald-500 hover:bg-emerald-600 border-0 text-white">
                          NEW
                        </Badge>
                      )}
                      {isPopular && (
                        <Badge className="text-xs bg-orange-500 hover:bg-orange-600 border-0 text-white">
                          인기
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 mb-4">
                <h3 className="font-bold text-lg mb-3 text-foreground group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 px-2 text-primary"
                  data-testid={`button-${title.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  시작하기
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                
                {priority === 'high' && (
                  <div className="flex items-center text-xs text-primary font-semibold">
                    핵심
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
});

ActionCard.displayName = 'ActionCard';

export const PrimaryActions = memo(function PrimaryActions({ className }: PrimaryActionsProps) {
  const { highPriorityActions, mediumPriorityActions } = useMemo(() => ({
    highPriorityActions: primaryActions.filter(action => action.priority === 'high'),
    mediumPriorityActions: primaryActions.filter(action => action.priority === 'medium')
  }), []);

  return (
    <section 
      className={cn("w-full py-12", className)} 
      data-testid="primary-actions"
      aria-labelledby="primary-actions-heading"
      role="region"
    >
      <div className="container mx-auto px-6">
        
        {/* Section Header */}
        <header className="text-center mb-10">
          <h2 
            className="text-3xl md:text-4xl font-bold text-foreground mb-4"
            id="primary-actions-heading"
          >
            핵심 기능
          </h2>
          <p 
            className="text-base text-muted-foreground max-w-2xl mx-auto"
            aria-describedby="primary-actions-heading"
          >
            AI 기반 시황 생성부터 실시간 모니터링까지, 금융 분석에 필요한 모든 도구를 한 곳에서
          </p>
        </header>

        {/* High Priority Actions */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <h3 className="text-xl font-bold text-foreground">
              주요 기능
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {highPriorityActions.map((action) => (
              <div 
                key={action.title}
                data-testid={`action-card-${action.title.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <ActionCard action={action} />
              </div>
            ))}
          </div>
        </div>

        {/* Medium Priority Actions */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-6">
            추가 기능
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediumPriorityActions.map((action) => (
              <div 
                key={action.title}
                data-testid={`action-card-${action.title.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <ActionCard action={action} />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-4">
            더 많은 기능이 필요하신가요?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                대시보드 보기
              </Button>
            </Link>
            <Link href="/api-management">
              <Button variant="outline" size="sm">
                API 관리
              </Button>
            </Link>
            <Link href="/azure-config">
              <Button variant="outline" size="sm">
                Azure 설정
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});

PrimaryActions.displayName = 'PrimaryActions';
