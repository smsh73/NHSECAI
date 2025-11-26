import { memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KPITileProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'info' | 'default';
  };
  metrics?: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  isLoading?: boolean;
  className?: string;
  'data-testid'?: string;
}

export const KPITile = memo(function KPITile({
  title,
  icon,
  value,
  subtitle,
  trend,
  status,
  metrics,
  isLoading,
  className,
  'data-testid': testId
}: KPITileProps) {
  if (isLoading) {
    return (
      <Card className={cn("group relative overflow-hidden", className)} data-testid={`${testId}-loading`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          {status && <Skeleton className="h-5 w-12 rounded-full" />}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-16" />
            {subtitle && <Skeleton className="h-3 w-20" />}
            {trend && (
              <div className="flex items-center space-x-1">
                <Skeleton className="h-3 w-3 rounded" />
                <Skeleton className="h-3 w-12" />
              </div>
            )}
            {metrics && (
              <div className="space-y-2">
                {metrics.map((_, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground';
    switch (trend.direction) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusVariantClass = (variant: string) => {
    const variants = {
      success: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
      warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20', 
      error: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
      info: 'bg-info/10 text-info border-info/20 hover:bg-info/20',
      default: 'bg-muted text-muted-foreground'
    };
    return variants[variant as keyof typeof variants] || variants.default;
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        "border-border/50 bg-gradient-to-br from-card via-card to-card/95",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/[0.02] before:via-transparent before:to-accent/[0.02]",
        "before:opacity-0 before:transition-opacity before:duration-300",
        "hover:before:opacity-100",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        className
      )}
      data-testid={testId}
      role="region"
      aria-label={`${title} KPI 카드`}
      tabIndex={0}
    >
      {/* Subtle animated border gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <div 
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
            aria-hidden="true"
          >
            {icon}
          </div>
          <h3 
            className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors"
            id={`${testId}-title`}
          >
            {title}
          </h3>
        </div>
        {status && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-medium transition-all duration-200 border",
              getStatusVariantClass(status.variant)
            )}
            data-testid={`${testId}-status`}
          >
            {status.label}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="relative">
        <div className="space-y-3">
          {/* Main Value */}
          <div className="space-y-1">
            <p 
              className="text-2xl font-bold text-foreground tracking-tight transition-colors group-hover:text-primary"
              data-testid={`${testId}-value`}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground" data-testid={`${testId}-subtitle`}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Trend Indicator */}
          {trend && (
            <div 
              className={cn("flex items-center space-x-1 text-xs", getTrendColor())}
              data-testid={`${testId}-trend`}
              role="status"
              aria-label={`트렌드: ${trend.direction === 'up' ? '상승' : trend.direction === 'down' ? '하락' : '변동없음'} ${trend.value}${trend.direction !== 'neutral' ? '퍼센트' : ''}`}
            >
              {getTrendIcon()}
              <span className="font-medium">
                {trend.value > 0 && trend.direction === 'up' && '+'}
                {trend.value}
                {trend.direction !== 'neutral' && '%'}
              </span>
              {trend.label && (
                <span className="text-muted-foreground">
                  {trend.label}
                </span>
              )}
            </div>
          )}

          {/* Metrics */}
          {metrics && metrics.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              {metrics.map((metric, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center text-xs"
                  data-testid={`${testId}-metric-${index}`}
                >
                  <span className="text-muted-foreground font-medium">
                    {metric.label}
                  </span>
                  <span 
                    className={cn(
                      "font-medium",
                      metric.color ? `text-${metric.color}` : "text-foreground"
                    )}
                  >
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Animated pulse dot for real-time indicators */}
        <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full animate-pulse opacity-60" />
      </CardContent>
    </Card>
  );
});

// 성능 최적화를 위한 displayName 설정
KPITile.displayName = 'KPITile';