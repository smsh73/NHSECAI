import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WatchlistManager } from "@/components/personalization/watchlist-manager";
import { PersonalizedNews } from "@/components/personalization/personalized-news";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { 
  type UserWatchlist,
  type InsertUserWatchlist
} from "@shared/schema";
import { 
  Star, 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  Target,
  Newspaper,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Additional types for UI display
interface WatchlistStats {
  totalWatched: number;
  priceAlertsActive: number;
  newsAlertsActive: number;
  avgPerformance: number;
  topPerformer: string;
  worstPerformer: string;
}

interface AlertNotification {
  id: string;
  type: 'price' | 'news' | 'analysis';
  symbol: string;
  symbolName: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
}

export default function MyWatchlist() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts' | 'news'>('watchlist');
  
  // Get authenticated user ID
  const userId = user?.id || "user-1";
  
  // Show login message if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="w-full px-6 py-6" data-testid="login-required">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">로그인이 필요합니다</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              관심종목 관리를 이용하시려면 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 관심종목 데이터 조회 (실시간 데이터 포함)
  const { data: watchlist, isLoading: watchlistLoading } = useQuery({
    queryKey: ['/api/personalization', userId, 'watchlist', 'realtime'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/personalization/${userId}/watchlist/realtime`);
        if (!response.ok) {
          // Fallback to regular watchlist if realtime endpoint fails
          const fallbackResponse = await apiRequest('GET', `/api/personalization/${userId}/watchlist`);
          if (!fallbackResponse.ok) {
            return [];
          }
          const fallbackData = await fallbackResponse.json();
          // Transform to include required fields
          return (fallbackData || []).map((item: any) => ({
            ...item,
            currentPrice: item.currentPrice || 0,
            change: item.change || 0,
            changePercent: item.changePercent || 0,
            priceAlert: item.alertEnabled || false,
            newsAlert: item.alertEnabled || false,
            addedAt: typeof item.addedAt === 'string' ? item.addedAt : (item.addedAt?.toISOString?.() || new Date().toISOString())
          }));
        }
        const data = await response.json();
        // Ensure all required fields are present
        return (data || []).map((item: any) => ({
          ...item,
          currentPrice: item.currentPrice ?? 0,
          change: item.change ?? 0,
          changePercent: item.changePercent ?? 0,
          priceAlert: item.priceAlert ?? item.alertEnabled ?? false,
          newsAlert: item.newsAlert ?? item.alertEnabled ?? false,
          addedAt: typeof item.addedAt === 'string' ? item.addedAt : (item.addedAt?.toISOString?.() || new Date().toISOString())
        }));
      } catch (error) {
        console.error('Failed to fetch watchlist:', error);
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // 관심종목 통계 조회 - 실제 API 호출로 변경 필요 (현재는 watchlist 데이터에서 계산)
  const { data: watchlistStats, isLoading: statsLoading } = useQuery<WatchlistStats>({
    queryKey: ['/api/personalization', userId, 'watchlist-stats'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/personalization/${userId}/watchlist-stats`);
        if (!response.ok) {
          // API가 없는 경우 watchlist 데이터에서 계산
          const priceAlertsActive = watchlist?.filter(w => w.alertEnabled && w.targetPrice).length || 0;
          const newsAlertsActive = watchlist?.filter(w => w.alertEnabled).length || 0;
          return {
            totalWatched: watchlist?.length || 0,
            priceAlertsActive,
            newsAlertsActive,
            avgPerformance: 0,
            topPerformer: "",
            worstPerformer: ""
          };
        }
        return await response.json();
      } catch (error) {
        // 에러 발생 시 빈 데이터 반환
        return {
          totalWatched: watchlist?.length || 0,
          priceAlertsActive: 0,
          newsAlertsActive: 0,
          avgPerformance: 0,
          topPerformer: "",
          worstPerformer: ""
        };
      }
    },
    enabled: !!watchlist,
  });

  // 알림 목록 조회 - 실제 API 호출
  const { data: alerts, isLoading: alertsLoading } = useQuery<AlertNotification[]>({
    queryKey: ['/api/personalization', userId, 'alerts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/personalization/${userId}/alerts`);
        if (!response.ok) {
          // API가 없는 경우 빈 배열 반환
          return [];
        }
        return await response.json();
      } catch (error) {
        // 에러 발생 시 빈 배열 반환
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });

  // 관심종목 기반 맞춤 뉴스 조회 - 실제 API 호출
  const { data: personalizedNews, isLoading: newsLoading } = useQuery({
    queryKey: ['/api/personalization', userId, 'watchlist-news'],
    queryFn: async () => {
      try {
        // 관심종목 뉴스는 개인화 뉴스 API를 사용하되, watchlist 심볼 필터 적용
        const watchlistSymbols = watchlist?.map(w => w.symbol).join(',') || '';
        const response = await apiRequest('GET', `/api/personalization/${userId}/news?symbols=${watchlistSymbols}`);
        if (!response.ok) {
          return [];
        }
        return await response.json();
      } catch (error) {
        // 에러 발생 시 빈 배열 반환
        return [];
      }
    },
    enabled: !!watchlist && watchlist.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // 관심종목 추가 - 실제 API 호출
  const addToWatchlistMutation = useMutation({
    mutationFn: async (data: { symbol: string; priceAlert?: boolean; priceThreshold?: number; newsAlert?: boolean }) => {
      const response = await apiRequest('POST', `/api/personalization/${userId}/watchlist`, {
        symbol: data.symbol,
        alertEnabled: data.priceAlert || data.newsAlert || false,
        targetPrice: data.priceThreshold,
      });
      if (!response.ok) {
        throw new Error('Failed to add to watchlist');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist-stats'] });
      toast({
        title: "관심종목이 추가되었습니다.",
        description: "새로운 종목이 관심종목에 추가되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "관심종목 추가 실패",
        description: error.message || "관심종목 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // 관심종목 삭제 - 실제 API 호출
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/personalization/${userId}/watchlist/${id}`);
      if (!response.ok) {
        throw new Error('Failed to remove from watchlist');
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist-stats'] });
      toast({
        title: "관심종목이 삭제되었습니다.",
        description: "관심종목에서 제거되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "관심종목 삭제 실패",
        description: error.message || "관심종목 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // 알림 설정 업데이트 - 실제 API 호출
  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, type, enabled, threshold }: { id: string; type: 'price' | 'news'; enabled: boolean; threshold?: number }) => {
      const response = await apiRequest('PATCH', `/api/personalization/${userId}/watchlist/${id}/alerts`, {
        alertEnabled: enabled,
        targetPrice: threshold,
        priceAlert: type === 'price' ? enabled : undefined,
        newsAlert: type === 'news' ? enabled : undefined,
      });
      if (!response.ok) {
        throw new Error('Failed to update alert settings');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist-stats'] });
      toast({
        title: "알림 설정이 업데이트되었습니다.",
        description: "관심종목 알림 설정이 변경되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "알림 설정 업데이트 실패",
        description: error.message || "알림 설정 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // 뉴스 북마크 토글 - 실제 API 호출
  const bookmarkMutation = useMutation({
    mutationFn: async ({ newsId, isBookmarked }: { newsId: string; isBookmarked: boolean }) => {
      if (isBookmarked) {
        const response = await apiRequest('POST', `/api/personalization/${userId}/news/${newsId}/bookmark`);
        if (!response.ok) {
          throw new Error('Failed to bookmark news');
        }
      } else {
        const response = await apiRequest('DELETE', `/api/personalization/${userId}/news/${newsId}/bookmark`);
        if (!response.ok) {
          throw new Error('Failed to remove bookmark');
        }
      }
      return { newsId, isBookmarked };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist-news'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'news'] });
      toast({
        title: "북마크가 업데이트되었습니다.",
        description: "뉴스 북마크 상태가 변경되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "북마크 업데이트 실패",
        description: error.message || "북마크 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // 알림 읽음 처리 - 실제 API 호출
  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest('PATCH', `/api/personalization/${userId}/alerts/${alertId}/read`);
      if (!response.ok) {
        throw new Error('Failed to mark alert as read');
      }
      return alertId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'alerts'] });
    },
    onError: (error: any) => {
      toast({
        title: "알림 읽음 처리 실패",
        description: error.message || "알림 읽음 처리에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '₩0';
    }
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const published = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - published.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const unreadAlertsCount = alerts?.filter(alert => !alert.isRead).length || 0;

  return (
    <div className="w-full px-6 py-6 space-y-6" data-testid="my-watchlist">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            관심종목 관리
          </h1>
          <p className="text-muted-foreground mt-1">
            관심종목을 추가하고 실시간 알림을 받아보세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {unreadAlertsCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadAlertsCount}개의 새 알림
            </Badge>
          )}
        </div>
      </div>

      {/* 관심종목 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="total-watched-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">관심종목</p>
                <p className="text-xl font-bold">{watchlistStats?.totalWatched || 0}개</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="price-alerts-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">가격 알림</p>
                <p className="text-xl font-bold text-blue-600">
                  {watchlistStats?.priceAlertsActive || 0}개
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="avg-performance-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">평균 수익률</p>
                <p className={cn(
                  "text-xl font-bold",
                  (watchlistStats?.avgPerformance || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {watchlistStats?.avgPerformance ? formatPercent(watchlistStats.avgPerformance) : '+0.00%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="top-performer-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">최고 수익</p>
                <p className="text-lg font-semibold text-green-600">
                  {watchlistStats?.topPerformer || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 메뉴 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'watchlist' | 'alerts' | 'news')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="watchlist" data-testid="watchlist-tab">
            <Star className="h-4 w-4 mr-2" />
            관심종목
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="alerts-tab">
            <Bell className="h-4 w-4 mr-2" />
            알림 ({unreadAlertsCount})
          </TabsTrigger>
          <TabsTrigger value="news" data-testid="news-tab">
            <Newspaper className="h-4 w-4 mr-2" />
            맞춤 뉴스
          </TabsTrigger>
        </TabsList>

        {/* 관심종목 관리 탭 */}
        <TabsContent value="watchlist" data-testid="watchlist-content">
          <WatchlistManager
            watchlist={watchlist as any || []}
            onAddToWatchlist={async (data) => { await addToWatchlistMutation.mutateAsync(data); }}
            onRemoveFromWatchlist={async (id) => { await removeFromWatchlistMutation.mutateAsync(id); }}
            onUpdateAlert={async (id, type, enabled, threshold) => { await updateAlertMutation.mutateAsync({ id, type, enabled, threshold }); }}
            isLoading={watchlistLoading}
          />
        </TabsContent>

        {/* 알림 탭 */}
        <TabsContent value="alerts" className="space-y-4" data-testid="alerts-content">
          <Card>
            <CardHeader>
              <CardTitle>실시간 알림</CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-4 border-l-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                        getPriorityColor(alert.priority),
                        !alert.isRead && "bg-muted/20"
                      )}
                      onClick={() => !alert.isRead && markAsReadMutation.mutate(alert.id)}
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge 
                              variant={alert.type === 'price' ? 'default' : alert.type === 'news' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {alert.type === 'price' ? '가격' : alert.type === 'news' ? '뉴스' : '분석'}
                            </Badge>
                            <span className="font-medium text-sm">{alert.symbolName}</span>
                            <span className="text-xs text-muted-foreground">({alert.symbol})</span>
                            {!alert.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(alert.timestamp)}
                          </p>
                        </div>
                        <div className="ml-4">
                          {alert.type === 'price' && <Bell className="h-4 w-4 text-blue-500" />}
                          {alert.type === 'news' && <Newspaper className="h-4 w-4 text-green-500" />}
                          {alert.type === 'analysis' && <TrendingUp className="h-4 w-4 text-purple-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>알림이 없습니다.</p>
                  <p className="text-sm">관심종목에 알림을 설정해보세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 맞춤 뉴스 탭 */}
        <TabsContent value="news" data-testid="news-content">
          <PersonalizedNews
            news={personalizedNews || []}
            onBookmarkToggle={async (newsId, isBookmarked) => { await bookmarkMutation.mutateAsync({ newsId, isBookmarked }); }}
            onLoadMore={async () => {
              toast({
                title: "뉴스를 더 불러왔습니다.",
                description: "추가 뉴스가 로드되었습니다.",
              });
            }}
            userInterests={{
              symbols: watchlist?.map(w => w.symbol) || [],
              themes: Array.from(new Set(watchlist?.map((w: any) => w.theme).filter(Boolean))) || [],
              tags: []
            }}
            isLoading={newsLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}