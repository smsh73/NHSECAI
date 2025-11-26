import { memo, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIData {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'success' | 'warning' | 'error' | 'normal';
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

interface KPIStripProps {
  workflowStats?: {
    totalJobs?: number;
    runningJobs?: number;
    completedToday?: number;
    failedToday?: number;
  };
  marketAnalysis?: any[];
  systemStatus?: 'normal' | 'warning' | 'error';
  alertStats?: {
    total?: number;
    critical?: number;
    warning?: number;
  };
  ragLatency?: number;
  isLoading?: boolean;
}

const KPICard = memo(function KPICard({ title, value, subValue, trend, status, icon: Icon, loading }: KPIData) {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-success border-success/20 bg-success-subtle/30';
      case 'warning':
        return 'text-warning border-warning/20 bg-warning-subtle/30';
      case 'error':
        return 'text-destructive border-destructive/20 bg-destructive-subtle/30';
      default:
        return 'text-primary border-primary/20 bg-primary-subtle/30';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-success" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-destructive" />;
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-success" />;
      case 'warning':
      case 'error':
        return <AlertTriangle className="w-3 h-3 text-warning" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <Skeleton className="h-6 w-6 rounded-lg" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg group cursor-default",
        "bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40",
        "border-0 shadow-sm backdrop-blur-sm focus-ring"
      )}
      role="article"
      aria-labelledby={`kpi-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
      tabIndex={0}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110",
            getStatusColor()
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex items-center space-x-1">
            {getStatusIcon()}
            {trend && getTrendIcon()}
          </div>
        </div>

        {/* Value */}
        <div className="mb-2">
          <div 
            className="text-2xl font-bold text-foreground mb-1"
            aria-label={`현재 값: ${typeof value === 'number' ? value.toLocaleString() : value}`}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div 
            className="text-sm font-medium text-muted-foreground"
            id={`kpi-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {title}
          </div>
        </div>

        {/* Sub Value */}
        {subValue && (
          <div className="text-xs text-muted-foreground">
            {subValue}
          </div>
        )}
      </CardContent>

      {/* Hover Effect */}
      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </Card>
  );
});

// 성능 최적화를 위한 displayName 설정
KPICard.displayName = 'KPICard';

export const KPIStrip = memo(function KPIStrip({ 
  workflowStats, 
  marketAnalysis, 
  systemStatus, 
  alertStats, 
  ragLatency, 
  isLoading 
}: KPIStripProps) {
  const kpiData: KPIData[] = [
    {
      title: '활성 워크플로우',
      value: workflowStats?.runningJobs ?? 0,
      subValue: `총 ${workflowStats?.totalJobs ?? 0}개 작업`,
      trend: (workflowStats?.runningJobs ?? 0) > 0 ? 'up' : 'neutral',
      status: (workflowStats?.runningJobs ?? 0) > 0 ? 'success' : 'normal',
      icon: Activity,
      loading: isLoading
    },
    {
      title: '오늘 생성된 분석',
      value: marketAnalysis?.length ?? 0,
      subValue: '시장 분석 보고서',
      trend: (marketAnalysis?.length ?? 0) > 5 ? 'up' : 'neutral',
      status: 'normal',
      icon: BarChart3,
      loading: isLoading
    },
    {
      title: 'RAG 응답시간',
      value: ragLatency ? `${ragLatency}ms` : '< 100ms',
      subValue: '평균 검색 속도',
      trend: 'neutral',
      status: (ragLatency ?? 100) < 200 ? 'success' : 'warning',
      icon: Clock,
      loading: isLoading
    },
    {
      title: '시스템 상태',
      value: systemStatus === 'normal' ? '정상' : systemStatus === 'warning' ? '주의' : '오류',
      subValue: '전체 서비스',
      trend: 'neutral',
      status: systemStatus === 'normal' ? 'success' : systemStatus === 'warning' ? 'warning' : 'error',
      icon: systemStatus === 'normal' ? Server : AlertTriangle,
      loading: isLoading
    }
  ];

  return (
    <section 
      className="w-full py-8" 
      data-testid="kpi-strip"
      aria-labelledby="kpi-dashboard-heading"
      role="region"
    >
      <div className="container mx-auto px-6">
        {/* Section Header - 접근성 개선 */}
        <header className="mb-6 text-center lg:text-left">
          <h2 
            className="text-xl font-semibold text-foreground mb-2"
            id="kpi-dashboard-heading"
            aria-label="실시간 시스템 현황 대시보드"
          >
            실시간 시스템 현황
          </h2>
          <p 
            className="text-sm text-muted-foreground"
            aria-describedby="kpi-dashboard-heading"
          >
            핵심 지표로 한눈에 보는 플랫폼 상태
          </p>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiData.map((kpi, index) => (
            <div 
              key={kpi.title}
              data-testid={`kpi-card-${kpi.title.replace(/\s+/g, '-').toLowerCase()}`}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <KPICard {...kpi} />
            </div>
          ))}
        </div>

        {/* Quick Summary */}
        <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3">
          <Badge variant="outline" className="text-xs">
            <Activity className="w-3 h-3 mr-1" />
            실시간 업데이트
          </Badge>
          {alertStats && alertStats.critical && alertStats.critical > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              긴급 알림 {alertStats.critical}건
            </Badge>
          )}
          {systemStatus === 'normal' && (
            <Badge variant="default" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              모든 서비스 정상
            </Badge>
          )}
        </div>
      </div>
    </section>
  );
});

// 성능 최적화를 위한 displayName 설정
KPIStrip.displayName = 'KPIStrip';