import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioOverview } from "@/components/personalization/portfolio-overview";
import { PersonalizedNews } from "@/components/personalization/personalized-news";
import { RecommendationPanel } from "@/components/personalization/recommendation-panel";
import { WatchlistManager } from "@/components/personalization/watchlist-manager";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  type UserWatchlist, 
  type NewsData,
  type BalanceInsights
} from "@shared/schema";
import { 
  TrendingUp, 
  Star, 
  BarChart3, 
  Newspaper, 
  Settings,
  ArrowRight,
  Sparkles
} from "lucide-react";

// Types based on backend API responses
interface PortfolioData {
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  topHoldings: Array<{
    symbol: string;
    symbolName: string;
    value: number;
    percentage: number;
    change: number;
    changePercent: number;
  }>;
  sectorDistribution: Array<{
    sector: string;
    percentage: number;
    value: number;
  }>;
}

interface Recommendations {
  stocks: Array<{
    symbol: string;
    symbolName: string;
    currentPrice: number;
    targetPrice: number;
    upside: number;
    confidence: number;
    reason: string;
    riskLevel: 'low' | 'medium' | 'high';
    timeHorizon: '단기' | '중기' | '장기';
    tags: string[];
  }>;
  themes: Array<{
    id: string;
    name: string;
    description: string;
    growthPotential: number;
    riskLevel: 'low' | 'medium' | 'high';
    topStocks: string[];
    expectedReturn: number;
    timeframe: string;
    reasoning: string;
  }>;
  insights: Array<{
    id: string;
    type: 'portfolio' | 'trading' | 'market';
    title: string;
    description: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
    impact: number;
  }>;
}

export default function PersonalDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');

  // Get authenticated user ID
  const userId = user?.id || "user-1";
  
  // Show loading or login message if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="w-full px-6 py-6" data-testid="login-required">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">로그인이 필요합니다</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              개인화 대시보드를 이용하시려면 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // User profile from backend API
  const { data: userProfile, isLoading: userProfileLoading } = useQuery({
    queryKey: ['/api/personalization', userId, 'profile'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/personalization/${userId}/profile`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // User tags from backend API
  const { data: userTags } = useQuery({
    queryKey: ['/api/personalization', userId, 'tags'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Default user profile if API returns null/undefined
  const defaultUserProfile = {
    id: userId,
    name: "투자자",
    email: "",
    tags: (userTags && Array.isArray(userTags)) ? userTags.map((tag: any) => tag.tag) : [],
    preferredSectors: [] as string[],
    riskTolerance: 'moderate' as 'conservative' | 'moderate' | 'aggressive',
  };

  const currentUserProfile = userProfile || defaultUserProfile;

  // Portfolio data from backend API
  const { data: portfolioData, isLoading: portfolioLoading, error: portfolioError } = useQuery<PortfolioData>({
    queryKey: ['/api/personalization', userId, 'portfolio'],
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Personalized news from backend API
  const { data: personalizedNews, isLoading: newsLoading } = useQuery<NewsData[]>({
    queryKey: ['/api/personalization', userId, 'news'],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Watchlist data from backend API
  const { data: watchlist, isLoading: watchlistLoading } = useQuery<UserWatchlist[]>({
    queryKey: ['/api/personalization', userId, 'watchlist'],
    staleTime: 30 * 1000, // 30 seconds
  });

  // AI recommendations from backend API
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<Recommendations>({
    queryKey: ['/api/personalization', userId, 'recommendations'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // News bookmark toggle mutation
  const bookmarkMutation = useMutation({
    mutationFn: async ({ newsId, isBookmarked }: { newsId: string; isBookmarked: boolean }): Promise<void> => {
      const url = `/api/personalization/${userId}/news/${newsId}/bookmark`;
      if (isBookmarked) {
        await apiRequest('POST', url);
      } else {
        await apiRequest('DELETE', url);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'news'] });
      toast({
        title: "북마크가 업데이트되었습니다.",
        description: "뉴스 북마크 상태가 변경되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "오류가 발생했습니다.",
        description: "북마크 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: async (data: { symbol: string; symbolName?: string; targetPrice?: number; alertEnabled?: boolean; reason?: string }): Promise<void> => {
      await apiRequest('POST', `/api/personalization/${userId}/watchlist`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist'] });
      toast({
        title: "관심종목이 추가되었습니다.",
        description: "새로운 종목이 관심종목에 추가되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "오류가 발생했습니다.",
        description: "관심종목 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (itemId: string): Promise<void> => {
      await apiRequest('DELETE', `/api/personalization/${userId}/watchlist/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist'] });
      toast({
        title: "관심종목이 삭제되었습니다.",
        description: "관심종목에서 제거되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "오류가 발생했습니다.",
        description: "관심종목 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // Update alert settings mutation
  const updateAlertMutation = useMutation({
    mutationFn: async ({ itemId, alertEnabled, targetPrice }: { itemId: string; alertEnabled: boolean; targetPrice?: number }): Promise<void> => {
      await apiRequest('PATCH', `/api/personalization/${userId}/watchlist/${itemId}/alerts`, { alertEnabled, targetPrice });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'watchlist'] });
      toast({
        title: "알림 설정이 업데이트되었습니다.",
        description: "관심종목 알림 설정이 변경되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "오류가 발생했습니다.",
        description: "알림 설정 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // Apply insight mutation (placeholder - would need backend implementation)
  const applyInsightMutation = useMutation({
    mutationFn: async (insightId: string): Promise<void> => {
      // This would need backend implementation
      console.log('Applying insight:', insightId);
    },
    onSuccess: () => {
      toast({
        title: "인사이트가 적용되었습니다.",
        description: "AI 추천 인사이트가 적용되었습니다.",
      });
    }
  });

  // Load more news handler
  const loadMoreNews = async () => {
    // This would implement pagination for news
    toast({
      title: "더 많은 뉴스 로드",
      description: "추가 뉴스 로드 기능은 구현 예정입니다.",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="w-full px-6 py-6 space-y-6" data-testid="personal-dashboard">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            개인화 대시보드
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentUserProfile.name}님의 맞춤형 투자 현황
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {currentUserProfile.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-sm">
              #{tag}
            </Badge>
          ))}
          <Button variant="outline" size="sm" data-testid="settings-link">
            <Settings className="h-4 w-4 mr-2" />
            설정
          </Button>
        </div>
      </div>

      {/* 포트폴리오 개요 */}
      <PortfolioOverview
        portfolioData={portfolioData || {
          totalValue: 0,
          totalReturn: 0,
          totalReturnPercent: 0,
          dayChange: 0,
          dayChangePercent: 0,
          topHoldings: [],
          sectorDistribution: []
        }}
        isLoading={portfolioLoading}
      />

      {/* 메인 콘텐츠 탭 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="overview-tab">
            <BarChart3 className="h-4 w-4 mr-2" />
            종합 현황
          </TabsTrigger>
          <TabsTrigger value="news" data-testid="news-tab">
            <Newspaper className="h-4 w-4 mr-2" />
            맞춤 뉴스
          </TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="recommendations-tab">
            <Sparkles className="h-4 w-4 mr-2" />
            AI 추천
          </TabsTrigger>
          <TabsTrigger value="watchlist" data-testid="watchlist-tab">
            <Star className="h-4 w-4 mr-2" />
            관심종목
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6" data-testid="overview-content">
          {/* 빠른 액션 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer" data-testid="quick-action-holdings">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">보유종목 관리</h3>
                    <p className="text-sm text-muted-foreground">포트폴리오 상세 분석</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {portfolioData?.topHoldings?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">보유종목</div>
                  </div>
                </div>
                <Button className="w-full mt-4 h-10" variant="outline">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  자세히 보기
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" data-testid="quick-action-trades">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">매매이력 분석</h3>
                    <p className="text-sm text-muted-foreground">거래 패턴 및 성과</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      +{portfolioData?.totalReturnPercent?.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">총 수익률</div>
                  </div>
                </div>
                <Button className="w-full mt-4 h-10" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  분석 보기
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" data-testid="quick-action-watchlist">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">관심종목</h3>
                    <p className="text-sm text-muted-foreground">실시간 모니터링</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {watchlist?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">등록종목</div>
                  </div>
                </div>
                <Button className="w-full mt-4 h-10" variant="outline">
                  <Star className="h-4 w-4 mr-2" />
                  관리하기
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="news" data-testid="news-content">
          <PersonalizedNews
            news={(personalizedNews || []).map(news => ({ 
              id: news.id,
              title: news.title,
              summary: news.summary || '',
              source: news.source || '',
              publishedAt: news.publishedAt?.toString() || new Date().toISOString(),
              sentiment: (news.sentiment as 'positive' | 'negative' | 'neutral') || 'neutral',
              relevantSymbols: news.relevantSymbols || [],
              marketScore: Number(news.marketScore) || 0,
              economicScore: Number(news.economicScore) || 0,
              themeClusterId: news.themeClusterId || undefined,
              themeName: undefined,
              isBookmarked: false,
              url: undefined
            }))}
            onBookmarkToggle={(newsId, isBookmarked) => bookmarkMutation.mutateAsync({ newsId, isBookmarked })}
            onLoadMore={loadMoreNews}
            userInterests={{
              symbols: portfolioData?.topHoldings?.map((h: any) => h.symbol) || [],
              themes: currentUserProfile.tags,
              tags: currentUserProfile.preferredSectors
            }}
            isLoading={newsLoading}
          />
        </TabsContent>

        <TabsContent value="recommendations" data-testid="recommendations-content">
          <RecommendationPanel
            recommendations={{
              stocks: (recommendations?.stocks || []).map(stock => ({
                ...stock,
                timeHorizon: '중기' as '단기' | '중기' | '장기'
              })),
              themes: recommendations?.themes || [],
              insights: recommendations?.insights || []
            }}
            userProfile={{
              riskTolerance: currentUserProfile.riskTolerance,
              investmentHorizon: 'medium',
              preferredSectors: currentUserProfile.preferredSectors,
              currentHoldings: portfolioData?.topHoldings?.map((h: any) => h.symbol) || []
            }}
            onAddToWatchlist={(symbol) => addToWatchlistMutation.mutateAsync({ symbol, alertEnabled: true })}
            onApplyInsight={(insightId) => applyInsightMutation.mutateAsync(insightId)}
            isLoading={recommendationsLoading}
          />
        </TabsContent>

        <TabsContent value="watchlist" data-testid="watchlist-content">
          <WatchlistManager
            watchlist={(watchlist || []).map(item => {
              // addedAt이 String인 경우 Date 객체로 변환
              let addedAtDate: Date;
              if (typeof item.addedAt === 'string') {
                addedAtDate = new Date(item.addedAt);
              } else if (item.addedAt instanceof Date) {
                addedAtDate = item.addedAt;
              } else {
                addedAtDate = new Date();
              }
              
              return {
                id: item.id,
                symbol: item.symbol,
                symbolName: item.symbolName || item.symbol,
                currentPrice: 0,
                change: 0,
                changePercent: 0,
                priceAlert: Boolean(item.alertEnabled || false),
                priceThreshold: item.targetPrice ? Number(item.targetPrice) : undefined,
                newsAlert: true,
                addedAt: addedAtDate.toISOString(),
                theme: undefined
              };
            })}
            onAddToWatchlist={(data) => addToWatchlistMutation.mutateAsync(data)}
            onRemoveFromWatchlist={(id) => removeFromWatchlistMutation.mutateAsync(id)}
            onUpdateAlert={(id: string, type: 'price' | 'news', enabled: boolean, threshold?: number) => updateAlertMutation.mutateAsync({ itemId: id, alertEnabled: enabled, targetPrice: threshold })}
            isLoading={watchlistLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}