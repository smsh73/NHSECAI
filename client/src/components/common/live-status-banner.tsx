import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Sparkles,
  Search,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

interface AzureServiceStatus {
  status: 'connected' | 'disconnected' | 'error';
  message: string;
  isConfigured: boolean;
}

interface AzureServicesStatus {
  openai?: AzureServiceStatus;
  openaiPTU?: AzureServiceStatus;
  embedding?: AzureServiceStatus;
  aiSearch?: AzureServiceStatus;
  databricks?: AzureServiceStatus;
  postgresql?: AzureServiceStatus;
  cosmosdb?: AzureServiceStatus;
}

interface LiveStatusBannerProps {
  onRefresh?: () => void;
  className?: string;
}

interface ServiceItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: 'connected' | 'disconnected' | 'error';
  message: string;
  isConfigured: boolean;
  isAnimated?: boolean;
  gradient: string;
}

function ServiceItem({ icon: Icon, label, status, message, isConfigured, isAnimated, gradient }: ServiceItemProps) {
  const getStatusInfo = () => {
    if (!isConfigured) {
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800/50',
        statusIcon: AlertTriangle,
        statusText: '미설정',
        statusBg: 'bg-amber-100 dark:bg-amber-900/50',
        ringColor: 'ring-amber-200/50 dark:ring-amber-800/30'
      };
    }
    
    switch (status) {
      case 'connected':
        return {
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
          borderColor: 'border-emerald-200 dark:border-emerald-800/50',
          statusIcon: CheckCircle,
          statusText: '연결됨',
          statusBg: 'bg-emerald-100 dark:bg-emerald-900/50',
          ringColor: 'ring-emerald-200/50 dark:ring-emerald-800/30'
        };
      case 'error':
        return {
          color: 'text-rose-600 dark:text-rose-400',
          bgColor: 'bg-rose-50 dark:bg-rose-950/30',
          borderColor: 'border-rose-200 dark:border-rose-800/50',
          statusIcon: XCircle,
          statusText: '오류',
          statusBg: 'bg-rose-100 dark:bg-rose-900/50',
          ringColor: 'ring-rose-200/50 dark:ring-rose-800/30'
        };
      default:
        return {
          color: 'text-slate-600 dark:text-slate-400',
          bgColor: 'bg-slate-50 dark:bg-slate-950/30',
          borderColor: 'border-slate-200 dark:border-slate-800/50',
          statusIcon: XCircle,
          statusText: '연결 안됨',
          statusBg: 'bg-slate-100 dark:bg-slate-900/50',
          ringColor: 'ring-slate-200/50 dark:ring-slate-800/30'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.statusIcon;

  return (
    <div 
      className={cn(
        "group relative flex flex-col h-full rounded-xl border-2 transition-all duration-300 overflow-hidden",
        "hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1",
        statusInfo.borderColor,
        statusInfo.bgColor,
        isAnimated && status === 'connected' && "animate-pulse"
      )}
      data-testid={`service-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        gradient
      )} />
      
      {/* Status Ring */}
      <div className={cn(
        "absolute -top-1 -right-1 w-20 h-20 rounded-full blur-2xl transition-opacity duration-300",
        statusInfo.ringColor,
        status === 'connected' ? 'opacity-60' : 'opacity-30'
      )} />
      
      <div className="relative p-5 flex flex-col h-full">
        {/* Icon Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl transition-all duration-300",
            statusInfo.statusBg,
            "group-hover:scale-110"
          )}>
            <Icon className={cn(
              "w-6 h-6", 
              statusInfo.color,
              isAnimated && status === 'connected' && "animate-bounce"
            )} />
          </div>
          
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
            statusInfo.statusBg,
            statusInfo.color
          )}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusInfo.statusText}</span>
          </div>
        </div>

        {/* Label */}
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground mb-1.5 line-clamp-1">
            {label}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {message || statusInfo.statusText}
          </p>
        </div>

        {/* Status Indicator Bar */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex-1 h-1.5 rounded-full bg-muted overflow-hidden"
            )}>
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  status === 'connected' ? 'w-full bg-emerald-500' : 
                  status === 'error' ? 'w-1/3 bg-rose-500' :
                  'w-0 bg-slate-400'
                )}
              />
            </div>
            {status === 'connected' && (
              <Zap className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveStatusBanner({
  onRefresh,
  className
}: LiveStatusBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch Azure services status
  const { 
    data: statusData, 
    isLoading, 
    refetch,
    error 
  } = useQuery<{ services: AzureServicesStatus }>({
    queryKey: ['/api/azure/services/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    refetch();
    if (onRefresh) {
      onRefresh();
    }
  };

  const services = statusData?.services;

  // Calculate overall status
  const getOverallStatus = () => {
    if (!services) return { status: 'loading', count: 0 };
    
    const statuses = Object.values(services);
    const connectedCount = statuses.filter(s => s.status === 'connected').length;
    const errorCount = statuses.filter(s => s.status === 'error').length;
    const configuredCount = statuses.filter(s => s.isConfigured).length;
    
    if (connectedCount === statuses.length) {
      return { status: 'success', count: connectedCount };
    } else if (errorCount > 0) {
      return { status: 'error', count: errorCount };
    } else if (configuredCount === 0) {
      return { status: 'warning', count: 0 };
    } else {
      return { status: 'warning', count: connectedCount };
    }
  };

  const overallStatus = getOverallStatus();

  const getOverallBadgeVariant = () => {
    switch (overallStatus.status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getOverallStatusText = () => {
    if (isLoading) return '상태 확인 중...';
    if (error) return '상태 조회 실패';
    
    switch (overallStatus.status) {
      case 'success':
        return `모든 서비스 정상 (${overallStatus.count}/4)`;
      case 'error':
        return `${overallStatus.count}개 서비스 오류`;
      case 'warning':
        return overallStatus.count > 0 
          ? `${overallStatus.count}/4 서비스 연결됨` 
          : '서비스 설정 필요';
      default:
        return '상태 확인 중';
    }
  };

  return (
    <div className={cn("w-full", className)} data-testid="live-status-banner">
      <div className="container mx-auto px-4">
        <Card className="relative overflow-hidden border-2 shadow-2xl bg-gradient-to-br from-background via-background to-muted/30">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
          
          <div className="relative p-6 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
                  <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary/90 to-primary shadow-lg">
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Azure 서비스 연결 상태
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                    실시간 서비스 모니터링
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge 
                  variant={getOverallBadgeVariant()}
                  className="text-sm font-semibold px-4 py-1.5 shadow-lg"
                >
                  {getOverallStatusText()}
                </Badge>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="gap-2"
                  data-testid="button-toggle-details"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      간단히
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      상세히
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Services Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                  <span className="text-sm text-muted-foreground">서비스 상태 확인 중...</span>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <div className="inline-flex p-4 rounded-full bg-destructive/10 mb-4">
                  <AlertTriangle className="w-10 h-10 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">상태 조회에 실패했습니다</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  다시 시도
                </Button>
              </div>
            ) : services ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                  <ServiceItem
                    icon={Sparkles}
                    label="Azure OpenAI"
                    status={services.openai?.status || services.openaiPTU?.status || 'disconnected'}
                    message={services.openai?.message || services.openaiPTU?.message || '미설정'}
                    isConfigured={services.openai?.isConfigured || services.openaiPTU?.isConfigured || false}
                    isAnimated={(services.openai?.status || services.openaiPTU?.status) === 'connected'}
                    gradient="bg-gradient-to-br from-purple-500/10 to-blue-500/10"
                  />

                  <ServiceItem
                    icon={Search}
                    label="Azure AI Search"
                    status={services.aiSearch?.status || 'disconnected'}
                    message={services.aiSearch?.message || '미설정'}
                    isConfigured={services.aiSearch?.isConfigured || false}
                    isAnimated={services.aiSearch?.status === 'connected'}
                    gradient="bg-gradient-to-br from-orange-500/10 to-amber-500/10"
                  />

                  <ServiceItem
                    icon={Database}
                    label="Azure Databricks"
                    status={services.databricks?.status || 'disconnected'}
                    message={services.databricks?.message || '미설정'}
                    isConfigured={services.databricks?.isConfigured || false}
                    isAnimated={services.databricks?.status === 'connected'}
                    gradient="bg-gradient-to-br from-green-500/10 to-emerald-500/10"
                  />

                  <ServiceItem
                    icon={Database}
                    label="PostgreSQL"
                    status={services.postgresql?.status || 'disconnected'}
                    message={services.postgresql?.message || '미설정'}
                    isConfigured={services.postgresql?.isConfigured || false}
                    isAnimated={services.postgresql?.status === 'connected'}
                    gradient="bg-gradient-to-br from-blue-500/10 to-indigo-500/10"
                  />
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pt-6 mt-6 border-t-2 border-border/50 space-y-4 animate-in slide-in-from-top duration-300">
                    <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      서비스 상세 정보
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'openaiPTU', label: 'Azure OpenAI PTU', env: 'AZURE_OPENAI_PTU_*' },
                        { key: 'embedding', label: 'Embedding Model', env: 'AZURE_OPENAI_EMBEDDING_*' },
                        { key: 'aiSearch', label: 'Azure AI Search', env: 'AZURE_SEARCH_*' },
                        { key: 'databricks', label: 'Azure Databricks', env: 'AZURE_DATABRICKS_*' }
                      ].map(({ key, label, env }) => {
                        const service = services[key as keyof AzureServicesStatus];
                        if (!service) return null;
                        return (
                          <div key={key} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                            <div className="font-semibold text-sm mb-2 text-foreground">{label}</div>
                            <div className="text-xs text-muted-foreground leading-relaxed">
                              {service.isConfigured 
                                ? `상태: ${service.message}`
                                : `환경 변수 ${env} 설정 필요`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {/* Quick Actions */}
            <div className="pt-6 border-t-2 border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <span>30초마다 자동 새로고침</span>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                    data-testid="button-refresh-status"
                  >
                    <RefreshCw className={cn(
                      "w-4 h-4",
                      isLoading && "animate-spin"
                    )} />
                    새로고침
                  </Button>

                  <Link href="/azure-config">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2 shadow-sm hover:shadow-lg transition-all"
                      data-testid="button-azure-settings"
                    >
                      <Settings className="w-4 h-4" />
                      Azure 설정
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
