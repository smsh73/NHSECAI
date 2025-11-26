import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  category: 'market' | 'economic' | 'corporate' | 'global';
  priority: 'high' | 'medium' | 'low';
  url?: string;
  isBreaking?: boolean;
}

interface AlertItem {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  timestamp: Date;
  isRead?: boolean;
  actionUrl?: string;
}

interface NewsAlertsProps {
  recentNews?: any[];
  alertStats?: {
    total?: number;
    critical?: number;
    warning?: number;
  };
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

function NewsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-start space-x-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const getCategoryInfo = () => {
    switch (item.category) {
      case 'market':
        return { label: '시장', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' };
      case 'economic':
        return { label: '경제', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' };
      case 'corporate':
        return { label: '기업', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' };
      case 'global':
        return { label: '해외', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' };
      default:
        return { label: '뉴스', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' };
    }
  };

  const formatTime = () => {
    const now = new Date();
    const diff = now.getTime() - item.publishedAt.getTime();
    
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return item.publishedAt.toLocaleDateString();
  };

  const categoryInfo = getCategoryInfo();

  return (
    <Card className={cn(
      "group relative overflow-hidden cursor-pointer transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-0.5",
      "bg-card border border-black/10 dark:border-white/10",
      "shadow-sm"
    )}>
      
      {/* Breaking News Badge */}
      {item.isBreaking && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="text-xs bg-red-500 hover:bg-red-600 text-white animate-pulse">
            속보
          </Badge>
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              {item.priority === 'high' && (
                <div className="text-orange-500 text-sm font-medium ml-2 flex-shrink-0">
                  중요
                </div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {item.summary}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className={cn("text-xs", categoryInfo.color)}>
                  {categoryInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{item.source}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTime()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({ item }: { item: AlertItem }) {
  const getTypeInfo = () => {
    switch (item.type) {
      case 'error':
        return { text: '오류', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10' };
      case 'warning':
        return { text: '경고', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500/10' };
      case 'success':
        return { text: '성공', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500/10' };
      default:
        return { text: '정보', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10' };
    }
  };

  const getPriorityBadge = () => {
    switch (item.priority) {
      case 'critical':
        return <Badge className="text-xs bg-red-500 hover:bg-red-600">긴급</Badge>;
      case 'high':
        return <Badge className="text-xs bg-orange-500 hover:bg-orange-600">높음</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-xs">보통</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">낮음</Badge>;
    }
  };

  const formatTime = () => {
    const now = new Date();
    const diff = now.getTime() - item.timestamp.getTime();
    
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    return item.timestamp.toLocaleTimeString();
  };

  const typeInfo = getTypeInfo();

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300",
      "hover:shadow-lg",
      "bg-card border border-black/10 dark:border-white/10",
      "shadow-sm",
      !item.isRead && "ring-1 ring-primary/20"
    )}>
      
      {/* Priority Indicator */}
      {item.priority === 'critical' && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
      )}

      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          
          {/* Type Badge */}
          <div className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            typeInfo.bgColor,
            typeInfo.color
          )}>
            {typeInfo.text}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-foreground font-medium line-clamp-2">
                {item.message}
              </p>
              {getPriorityBadge()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.source}</span>
              <div className="text-xs text-muted-foreground">
                {formatTime()}
              </div>
            </div>

            {/* Action Button */}
            {item.actionUrl && (
              <div className="mt-3">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  조치하기
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NewsAlerts({ 
  recentNews = [], 
  alertStats = {},
  isLoading = false, 
  maxItems = 5,
  className 
}: NewsAlertsProps) {
  
  // Transform API data
  const transformedNews: NewsItem[] = recentNews.slice(0, maxItems).map((item, index) => ({
    id: item.id || `news-${index}`,
    title: item.title || `뉴스 #${index + 1}`,
    summary: item.summary || item.description || "시장 관련 뉴스입니다.",
    source: item.source || "AI 뉴스",
    publishedAt: new Date(item.publishedAt || Date.now() - Math.random() * 86400000),
    category: item.category || 'market',
    priority: item.priority || 'medium',
    url: item.url,
    isBreaking: index === 0 && item.isBreaking
  }));

  // Transform news data to alerts (urgent notices from high-quality news)
  const newsAlerts: AlertItem[] = recentNews
    .filter((news: any) => {
      // Filter for urgent/important news
      const isImportant = news.importanceScore && Number(news.importanceScore) >= 80;
      const isHighQuality = news.isHighQuality === true;
      const isRecent = news.publishedAt && (Date.now() - new Date(news.publishedAt).getTime() < 24 * 3600000); // Last 24 hours
      return (isImportant || isHighQuality) && isRecent;
    })
    .slice(0, 6)
    .map((news: any, index: number) => {
      const publishedAt = news.publishedAt instanceof Date 
        ? news.publishedAt 
        : new Date(news.publishedAt);
      
      // Determine alert type based on sentiment and importance
      let alertType: 'info' | 'warning' | 'error' | 'success' = 'info';
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      
      if (news.importanceScore && Number(news.importanceScore) >= 90) {
        priority = 'critical';
      } else if (news.importanceScore && Number(news.importanceScore) >= 80) {
        priority = 'high';
      }
      
      if (news.sentiment === 'negative' && priority === 'critical') {
        alertType = 'error';
      } else if (news.sentiment === 'positive' && priority === 'high') {
        alertType = 'success';
      } else if (news.sentiment === 'negative') {
        alertType = 'warning';
      }
      
      return {
        id: `news-alert-${news.id}`,
        message: news.title || news.summary || '긴급 공시 정보',
        type: alertType,
        priority,
        source: news.source || '뉴스',
        timestamp: publishedAt,
        isRead: false,
        actionUrl: news.id ? `/news#${news.id}` : undefined
      };
    });
  
  // Mock system alerts (for workflow/system notifications)
  const systemAlerts: AlertItem[] = [
    {
      id: 'alert-system-1',
      message: '워크플로우 "국내지수 수집"이 성공적으로 완료되었습니다.',
      type: 'success',
      priority: 'medium',
      source: '워크플로우 시스템',
      timestamp: new Date(Date.now() - 5 * 60000),
      isRead: false
    },
    {
      id: 'alert-system-2',
      message: 'RAG 엔진 응답 시간이 평균보다 높습니다. (150ms)',
      type: 'warning',
      priority: 'high',
      source: 'RAG 시스템',
      timestamp: new Date(Date.now() - 15 * 60000),
      isRead: true,
      actionUrl: '/system-monitor'
    }
  ];
  
  // Combine news alerts and system alerts
  const mockAlerts: AlertItem[] = [...newsAlerts, ...systemAlerts].sort((a, b) => {
    // Sort by priority (critical > high > medium > low)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by timestamp (newest first)
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return (
    <section className={cn("w-full py-12", className)} data-testid="news-alerts">
      <div className="container mx-auto px-6">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              뉴스 & 알림
            </h2>
            <p className="text-muted-foreground">
              실시간 시장 뉴스와 시스템 알림을 확인하세요
            </p>
          </div>
          
          {!isLoading && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                필터
              </Button>
              <Link href="/news">
                <Button variant="outline">
                  모든 뉴스 보기
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="news" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="news">
              뉴스 ({transformedNews.length})
            </TabsTrigger>
            <TabsTrigger value="alerts">
              알림 ({mockAlerts.filter(a => !a.isRead).length})
            </TabsTrigger>
          </TabsList>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-6" data-testid="news-tab">
            {isLoading ? (
              <NewsSkeleton />
            ) : transformedNews.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {transformedNews.map((item, index) => (
                  <div 
                    key={item.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                    data-testid={`news-card-${item.id}`}
                  >
                    <NewsCard item={item} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center p-12 bg-card border border-black/10 dark:border-white/10">
                <div className="text-4xl mb-4">📰</div>
                <h3 className="text-lg font-semibold mb-2">뉴스가 없습니다</h3>
                <p className="text-muted-foreground">
                  최신 시장 뉴스가 업데이트되면 여기에 표시됩니다
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6" data-testid="alerts-tab">
            {mockAlerts.length > 0 ? (
              <div className="space-y-4">
                {mockAlerts.map((item, index) => (
                  <div 
                    key={item.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                    data-testid={`alert-card-${item.id}`}
                  >
                    <AlertCard item={item} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center p-12 bg-card border border-black/10 dark:border-white/10">
                <div className="text-4xl mb-4">🔔</div>
                <h3 className="text-lg font-semibold mb-2">알림이 없습니다</h3>
                <p className="text-muted-foreground">
                  새로운 시스템 알림이 있으면 여기에 표시됩니다
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        {!isLoading && (transformedNews.length > 0 || mockAlerts.length > 0) && (
          <div className="mt-8 pt-6 border-t border-border/50">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{transformedNews.length}</div>
                <div className="text-sm text-muted-foreground">오늘의 뉴스</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {mockAlerts.filter(a => !a.isRead).length}
                </div>
                <div className="text-sm text-muted-foreground">읽지 않은 알림</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {mockAlerts.filter(a => a.priority === 'critical').length}
                </div>
                <div className="text-sm text-muted-foreground">긴급 알림</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}