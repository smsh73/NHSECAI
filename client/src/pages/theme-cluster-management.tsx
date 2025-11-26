import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  ThemeInfo,
  ThemeStats,
  ThemeSummaryInfo,
  NewsItem,
  insertThemeSchema,
  Theme
} from "@shared/schema";
import { 
  Layers, 
  RefreshCw, 
  Activity, 
  TrendingUp, 
  Clock, 
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Bell,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Download,
  RotateCcw,
  Zap,
  Target,
  Palette,
  Tag,
  Type
} from "lucide-react";

// Theme form schema
const themeFormSchema = insertThemeSchema.extend({
  keywords: z.string().optional().transform((val) => {
    if (!val) return [];
    
    const keywordArray = val.split(',');
    const trimmedKeywords = keywordArray.map((keyword) => keyword.trim());
    const filteredKeywords = trimmedKeywords.filter((keyword) => keyword.length > 0);
    
    return filteredKeywords;
  })
});

type ThemeFormData = z.infer<typeof themeFormSchema>;

export default function ThemeClusterManagement() {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: 'news' | 'summary';
    themeId: string;
    timestamp: Date;
    title?: string;
  }>>([]);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [clusteringResult, setClusteringResult] = useState<any>(null);
  const [isClusteringDialogOpen, setIsClusteringDialogOpen] = useState(false);
  const [clusteringOptions, setClusteringOptions] = useState({
    useLLM: false,
    similarityThreshold: 0.7,
    minClusterSize: 2,
    maxClusters: 20,
  });
  const { subscribe, isConnected } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch theme statistics
  const { data: themeStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ThemeStats[]>({
    queryKey: ['/api/themes/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/themes/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch theme statistics');
      }
      return await response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch all theme summaries
  const { data: themeSummaries, isLoading: summariesLoading } = useQuery<ThemeSummaryInfo[]>({
    queryKey: ['/api/themes/summaries/all'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/themes/summaries/all');
      if (!response.ok) {
        throw new Error('Failed to fetch theme summaries');
      }
      return await response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch selected theme news
  const { data: selectedThemeNews, isLoading: newsLoading } = useQuery<NewsItem[]>({
    queryKey: ['/api/themes', selectedTheme, 'news'],
    enabled: !!selectedTheme,
    queryFn: async () => {
      if (!selectedTheme) return [];
      const response = await apiRequest('GET', `/api/themes/${selectedTheme}/news`);
      if (!response.ok) {
        throw new Error('Failed to fetch theme news');
      }
      return await response.json();
    },
  });

  // Mutations for theme management
  const createThemeMutation = useMutation({
    mutationFn: async (themeData: ThemeFormData) => {
      const response = await apiRequest('POST', '/api/themes', themeData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.details || `테마 생성 실패: ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "테마 생성 완료",
        description: `"${data.name || data.id}" 테마가 성공적으로 생성되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/summaries/all'] });
      setIsCreateDialogOpen(false);
      setEditingTheme(null);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Theme creation error:', error);
      toast({
        title: "테마 생성 실패", 
        description: error?.message || error?.details || "테마 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const regenerateSummaryMutation = useMutation({
    mutationFn: async (themeId: string) => {
      return apiRequest(`/api/themes/${themeId}/summary`, 'POST');
    },
    onSuccess: (data, themeId) => {
      toast({
        title: "요약 재생성 완료",
        description: `${themeId} 테마의 AI 요약이 재생성되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/summaries/all'] });
    },
    onError: (error) => {
      toast({
        title: "요약 재생성 실패",
        description: "AI 요약 재생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const clusterThemesMutation = useMutation({
    mutationFn: async (options: any) => {
      const response = await apiRequest('POST', '/api/themes/cluster', options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || '테마 클러스터링 실패');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setClusteringResult(data);
      setIsClusteringDialogOpen(true);
      toast({
        title: "클러스터링 완료",
        description: `${data.clusters?.length || 0}개의 클러스터가 생성되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "클러스터링 실패",
        description: error.message || "테마 클러스터링 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Update theme mutation
  const updateThemeMutation = useMutation({
    mutationFn: async ({ themeId, themeData }: { themeId: string; themeData: ThemeFormData }) => {
      const response = await apiRequest('PUT', `/api/themes/${themeId}`, themeData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.details || `테마 수정 실패: ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "테마 수정 완료",
        description: `"${data.name || data.id}" 테마가 성공적으로 수정되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/summaries/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes', selectedTheme] });
      setIsCreateDialogOpen(false);
      setEditingTheme(null);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Theme update error:', error);
      toast({
        title: "테마 수정 실패",
        description: error?.message || error?.details || "테마 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Delete theme mutation
  const deleteThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const response = await apiRequest('DELETE', `/api/themes/${themeId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.details || `테마 삭제 실패: ${response.status}`);
      }
      // 204 No Content 또는 200 OK 응답 처리
      if (response.status === 204) {
        return { success: true };
      }
      const data = await response.json().catch(() => ({ success: true }));
      return data;
    },
    onSuccess: (data: any) => {
      const description = data?.newsCount 
        ? `테마가 삭제되었습니다. ${data.newsCount}개의 관련 뉴스 데이터에서 테마 연결이 해제되었습니다.`
        : "테마가 성공적으로 삭제되었습니다.";
      toast({
        title: "테마 삭제 완료",
        description,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/summaries/all'] });
      if (selectedTheme) {
        setSelectedTheme(null);
      }
    },
    onError: (error: any) => {
      console.error('Theme deletion error:', error);
      toast({
        title: "테마 삭제 실패",
        description: error?.message || error?.details || "테마 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    // Prevent refreshing when dialog is open
    if (isCreateDialogOpen) {
      return;
    }

    const unsubscribeThemeNews = subscribe('theme_news', (data: any) => {
      console.log('Theme news update:', data);
      setRealTimeUpdates(prev => prev + 1);
      
      // Add to recent activity
      setRecentActivity(prev => [{
        id: data.newsId || Math.random().toString(),
        type: 'news',
        themeId: data.themeId,
        timestamp: new Date(),
        title: data.title
      }, ...prev.slice(0, 19)]); // Keep only 20 recent items
      
      if (autoRefresh) {
        refetchStats();
      }

      // Show toast notification
      const themeName = themeStats?.find(t => t.themeId === data.themeId)?.name || data.themeId;
      toast({
        title: "새로운 뉴스 분류",
        description: `${themeName} 테마에 새 뉴스가 분류되었습니다.`,
      });
    });

    const unsubscribeThemeSummary = subscribe('theme_summary', (data: any) => {
      console.log('Theme summary update:', data);
      
      // Add to recent activity
      setRecentActivity(prev => [{
        id: Math.random().toString(),
        type: 'summary',
        themeId: data.themeId,
        timestamp: new Date()
      }, ...prev.slice(0, 19)]);
      
      if (autoRefresh) {
        refetchStats();
        queryClient.invalidateQueries({ queryKey: ['/api/themes/summaries/all'] });
      }

      // Show toast notification
      const themeName = themeStats?.find(t => t.themeId === data.themeId)?.name || data.themeId;
      toast({
        title: "AI 요약 업데이트",
        description: `${themeName} 테마의 AI 요약이 업데이트되었습니다.`,
      });
    });

    return () => {
      unsubscribeThemeNews();
      unsubscribeThemeSummary();
    };
  }, [subscribe, refetchStats, autoRefresh, themeStats, toast, isCreateDialogOpen, queryClient]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="h-4 w-4" />;
      case 'negative': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return '업데이트 없음';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-background min-h-screen" data-testid="theme-cluster-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/20">
            <Layers className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              테마 클러스터 관리
            </h1>
            <p className="text-muted-foreground">
              뉴스 테마별 실시간 분류 및 클러스터링 관리
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? '실시간 연결됨' : '연결 끊어짐'}
          </div>
          <Button
            onClick={() => setIsClusteringDialogOpen(true)}
            variant="default"
            size="sm"
            data-testid="button-cluster-themes"
          >
            <Target className="h-4 w-4 mr-2" />
            테마 클러스터링
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingTheme(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                data-testid="button-create-theme"
                onClick={() => {
                  setEditingTheme(null);
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                테마 추가
              </Button>
            </DialogTrigger>
            <ThemeCreateDialog />
          </Dialog>
          <Button
            onClick={() => refetchStats()}
            variant="outline"
            size="sm"
            data-testid="refresh-stats"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Real-time Activity Indicator */}
      {realTimeUpdates > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                실시간 업데이트: {realTimeUpdates}건의 새로운 활동이 감지되었습니다.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">
            테마 개요
          </TabsTrigger>
          <TabsTrigger value="details" data-testid="tab-details">
            상세 관리
          </TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">
            실시간 모니터링
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Filter and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 text-sm border border-border rounded-md bg-background"
                  data-testid="overview-sentiment-filter"
                >
                  <option value="all">전체 테마</option>
                  <option value="positive">긍정적 테마</option>
                  <option value="negative">부정적 테마</option>
                  <option value="neutral">중립적 테마</option>
                </select>
              </div>
              <div className="text-sm text-muted-foreground">
                {statsLoading ? '로딩 중...' : `총 ${themeStats?.filter(theme => filter === 'all' || theme.sentiment === filter).length || 0}개 테마`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => refetchStats()}
                variant="outline"
                size="sm"
                disabled={statsLoading}
                data-testid="refresh-overview"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statsLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              themeStats
                ?.filter(theme => filter === 'all' || theme.sentiment === filter)
                ?.map((theme) => (
                <Card 
                  key={theme.themeId} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedTheme === theme.themeId ? 'ring-2 ring-orange-500 shadow-md' : ''
                  }`}
                  onClick={() => setSelectedTheme(theme.themeId)}
                  data-testid={`theme-card-${theme.themeId}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {theme.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={getSentimentColor(theme.sentiment)}
                          data-testid={`sentiment-${theme.themeId}`}
                        >
                          {getSentimentIcon(theme.sentiment)}
                          <span className="ml-1 capitalize">{theme.sentiment}</span>
                        </Badge>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-6 h-6 p-0"
                            onClick={async () => {
                              // Fetch theme details for editing
                              try {
                                const response = await apiRequest('GET', `/api/themes/${theme.themeId}`);
                                if (response.ok) {
                                  const themeData = await response.json();
                                  setEditingTheme(themeData);
                                  setIsCreateDialogOpen(true);
                                }
                              } catch (error) {
                                toast({
                                  title: "테마 정보 로드 실패",
                                  description: "테마 정보를 불러오는데 실패했습니다.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            data-testid={`button-edit-theme-${theme.themeId}`}
                            title="테마 수정"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-6 h-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`"${theme.name}" 테마를 정말 삭제하시겠습니까?`)) {
                                deleteThemeMutation.mutate(theme.themeId);
                              }
                            }}
                            disabled={deleteThemeMutation.isPending}
                            data-testid={`button-delete-theme-${theme.themeId}`}
                            title="테마 삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-foreground">
                        {theme.newsCount}
                      </span>
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimeAgo(theme.lastUpdated)}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          {/* Empty State */}
          {!statsLoading && themeStats?.filter(theme => filter === 'all' || theme.sentiment === filter).length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">해당 필터에 맞는 테마가 없습니다</h3>
                  <p className="text-muted-foreground">
                    다른 필터 조건을 선택하거나 전체 테마를 확인해보세요.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setFilter('all')}
                    data-testid="reset-filter"
                  >
                    전체 테마 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {selectedTheme ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Theme Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    AI 생성 요약
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summariesLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : (
                    (() => {
                      const summary = themeSummaries?.find(s => s.themeId === selectedTheme);
                      return summary ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">요약</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {summary.summary}
                            </p>
                          </div>
                          <Separator />
                          <div>
                            <h4 className="font-medium mb-2">주요 키워드</h4>
                            <div className="flex flex-wrap gap-2">
                              {summary.topEntities.map((entity, index) => (
                                <Badge key={index} variant="secondary">
                                  {entity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{summary.newsCount}건 뉴스 분석</span>
                            <span>{formatTimeAgo(summary.lastUpdated)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">요약을 불러올 수 없습니다.</p>
                      );
                    })()
                  )}
                </CardContent>
              </Card>

              {/* Theme News List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    최신 뉴스
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {newsLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-3/4" />
                            <Separator className="my-2" />
                          </div>
                        ))}
                      </div>
                    ) : selectedThemeNews?.length ? (
                      <div className="space-y-3">
                        {selectedThemeNews.slice(0, 10).map((news) => (
                          <div key={news.id} className="pb-3 border-b border-border/50 last:border-b-0">
                            <h5 className="font-medium text-sm leading-relaxed mb-1">
                              {news.title}
                            </h5>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{news.source}</span>
                              <span>{news.category}</span>
                              <span>{formatTimeAgo(news.publishedAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">뉴스가 없습니다.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">테마를 선택하세요</h3>
                  <p className="text-muted-foreground">
                    테마 개요에서 테마를 클릭하여 상세 정보를 확인하세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  제어 패널
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="auto-refresh" className="text-sm">
                      자동 새로고침
                    </Label>
                    <Switch
                      id="auto-refresh"
                      checked={autoRefresh}
                      onCheckedChange={setAutoRefresh}
                      data-testid="auto-refresh-toggle"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">필터:</Label>
                    <select 
                      value={filter} 
                      onChange={(e) => setFilter(e.target.value as any)}
                      className="px-2 py-1 text-xs border rounded-md"
                      data-testid="sentiment-filter"
                    >
                      <option value="all">전체</option>
                      <option value="positive">긍정적</option>
                      <option value="negative">부정적</option>
                      <option value="neutral">중립적</option>
                    </select>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {isConnected ? '온라인' : '오프라인'}
                  </div>
                  <div className="text-sm text-muted-foreground">연결 상태</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {realTimeUpdates}
                  </div>
                  <div className="text-sm text-muted-foreground">실시간 업데이트</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {themeStats?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">활성 테마</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {themeStats?.reduce((sum, theme) => sum + theme.newsCount, 0) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">총 뉴스</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    실시간 활동 피드
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRecentActivity([])}
                    data-testid="clear-activity"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    지우기
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div 
                          key={activity.id} 
                          className="flex items-start gap-3 pb-3 border-b border-border/30 last:border-b-0"
                        >
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            activity.type === 'news' ? 'bg-blue-500' : 'bg-green-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {activity.type === 'news' ? (
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Zap className="h-4 w-4 text-green-500" />
                              )}
                              <span className="text-sm font-medium">
                                {activity.type === 'news' ? '새 뉴스 분류' : 'AI 요약 업데이트'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {activity.themeId}
                              </Badge>
                            </div>
                            {activity.title && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                {activity.title}
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {formatTimeAgo(activity.timestamp.toISOString())}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">실시간 활동이 표시됩니다</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Theme Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  테마별 성과 지표
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {themeStats?.map((theme) => (
                      <div key={theme.themeId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: theme.color }}
                            />
                            <span className="text-sm font-medium">{theme.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getSentimentColor(theme.sentiment)}>
                              {getSentimentIcon(theme.sentiment)}
                              <span className="ml-1 capitalize">{theme.sentiment}</span>
                            </Badge>
                            <span className="text-sm font-bold">{theme.newsCount}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Progress 
                            value={(theme.newsCount / Math.max(...(themeStats?.map(t => t.newsCount) || [1]))) * 100} 
                            className="flex-1 h-2"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>마지막 업데이트: {formatTimeAgo(theme.lastUpdated)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => regenerateSummaryMutation.mutate(theme.themeId)}
                            disabled={regenerateSummaryMutation.isPending}
                            data-testid={`regenerate-${theme.themeId}`}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {regenerateSummaryMutation.isPending ? '생성중...' : '요약 재생성'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // 테마 클러스터링 다이얼로그
  const ThemeClusteringDialog = () => {
    return (
      <Dialog open={isClusteringDialogOpen} onOpenChange={setIsClusteringDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>테마 클러스터링</DialogTitle>
            <DialogDescription>
              유사한 인포스탁 테마들을 클러스터링하여 대표 테마를 선별합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>유사도 임계값</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={clusteringOptions.similarityThreshold}
                  onChange={(e) =>
                    setClusteringOptions({
                      ...clusteringOptions,
                      similarityThreshold: parseFloat(e.target.value) || 0.7,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">0.0 ~ 1.0 (기본값: 0.7)</p>
              </div>
              <div>
                <Label>최소 클러스터 크기</Label>
                <Input
                  type="number"
                  min="2"
                  value={clusteringOptions.minClusterSize}
                  onChange={(e) =>
                    setClusteringOptions({
                      ...clusteringOptions,
                      minClusterSize: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </div>
              <div>
                <Label>최대 클러스터 수</Label>
                <Input
                  type="number"
                  min="1"
                  value={clusteringOptions.maxClusters}
                  onChange={(e) =>
                    setClusteringOptions({
                      ...clusteringOptions,
                      maxClusters: parseInt(e.target.value) || 20,
                    })
                  }
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="use-llm"
                  checked={clusteringOptions.useLLM}
                  onCheckedChange={(checked) =>
                    setClusteringOptions({ ...clusteringOptions, useLLM: checked })
                  }
                />
                <Label htmlFor="use-llm">LLM 사용 (더 정확한 클러스터링)</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsClusteringDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                onClick={() => clusterThemesMutation.mutate(clusteringOptions)}
                disabled={clusterThemesMutation.isPending}
              >
                {clusterThemesMutation.isPending ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    클러스터링 중...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    클러스터링 실행
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // 클러스터링 결과 다이얼로그
  const ClusteringResultDialog = () => {
    if (!clusteringResult) return null;

    return (
      <Dialog open={!!clusteringResult} onOpenChange={() => setClusteringResult(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>클러스터링 결과</DialogTitle>
            <DialogDescription>
              {clusteringResult.clusters?.length || 0}개의 클러스터가 생성되었습니다.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{clusteringResult.totalThemes || 0}</div>
                    <p className="text-sm text-muted-foreground">전체 테마</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">
                      {clusteringResult.clusteredThemes || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">클러스터링된 테마</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {clusteringResult.unclusteredThemes || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">미클러스터링 테마</p>
                  </CardContent>
                </Card>
              </div>
              {clusteringResult.clusters?.map((cluster: any, idx: number) => (
                <Card key={cluster.id || idx}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>
                        클러스터 {idx + 1} - {cluster.representativeTheme?.themeName}
                      </span>
                      <Badge variant="default">
                        {cluster.clusterSize}개 테마
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      대표 테마: {cluster.representativeTheme?.themeCode} (점수:{" "}
                      {cluster.representativeTheme?.totalScore?.toFixed(2)})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cluster.similarThemes && cluster.similarThemes.length > 0 && (
                      <div className="space-y-2">
                        <Label>유사 테마:</Label>
                        <div className="flex flex-wrap gap-2">
                          {cluster.similarThemes.map((theme: any, tIdx: number) => (
                            <Badge key={tIdx} variant="secondary">
                              {theme.themeName} (유사도:{" "}
                              {(theme.similarity * 100).toFixed(1)}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClusteringResult(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Theme Create/Edit Dialog Component
  function ThemeCreateDialog() {
    const form = useForm({
      resolver: zodResolver(themeFormSchema),
      defaultValues: {
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "Layers",
        themeType: "news",
        keywords: "",
        order: 0,
        isActive: true
      }
    });

    // Reset form when editingTheme changes
    useEffect(() => {
      if (editingTheme) {
        form.reset({
          name: editingTheme.name,
          description: editingTheme.description || "",
          color: editingTheme.color,
          icon: editingTheme.icon || "Layers",
          themeType: editingTheme.themeType,
          keywords: (editingTheme.keywords || []).join(', '),
          order: editingTheme.order || 0,
          isActive: editingTheme.isActive !== false
        });
      } else {
        form.reset({
          name: "",
          description: "",
          color: "#3B82F6",
          icon: "Layers",
          themeType: "news",
          keywords: "",
          order: 0,
          isActive: true
        });
      }
    }, [editingTheme, form]);

    const onSubmit = (data: any) => {
      // Form validation을 통한 필수 필드 검증
      if (!data.name || !data.name.trim()) {
        toast({
          title: "필수 항목 누락",
          description: "테마 이름을 입력해주세요.",
          variant: "destructive",
        });
        form.setError("name", { type: "required", message: "테마 이름은 필수입니다." });
        return;
      }
      
      if (!data.themeType) {
        toast({
          title: "필수 항목 누락",
          description: "테마 유형을 선택해주세요.",
          variant: "destructive",
        });
        form.setError("themeType", { type: "required", message: "테마 유형은 필수입니다." });
        return;
      }

      // Prepare data for API
      const themeData = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        themeType: data.themeType,
        color: data.color || '#3B82F6',
        icon: data.icon || 'Layers',
        keywords: data.keywords ? (typeof data.keywords === 'string' ? data.keywords.split(',').map(k => k.trim()).filter(k => k) : data.keywords) : [],
        order: data.order || 0,
        isActive: data.isActive !== false
      };
      
      if (editingTheme) {
        // Update existing theme
        updateThemeMutation.mutate({ themeId: editingTheme.id, themeData });
      } else {
        // Create new theme
        createThemeMutation.mutate(themeData);
      }
    };

    const handleDelete = () => {
      if (!editingTheme) return;
      
      if (confirm(`"${editingTheme.name}" 테마를 정말 삭제하시겠습니까?`)) {
        deleteThemeMutation.mutate(editingTheme.id);
        setIsCreateDialogOpen(false);
        setEditingTheme(null);
      }
    };

    return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingTheme ? (
              <>
                <Edit className="h-5 w-5" />
                테마 수정
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                새 테마 생성
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Theme Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    테마 이름 <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: 인공지능, 바이오헬스케어..."
                      {...field}
                      data-testid="input-theme-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Theme Type */}
            <FormField
              control={form.control}
              name="themeType"
              render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      테마 유형 <span className="text-red-500">*</span>
                    </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-theme-type">
                        <SelectValue placeholder="테마 유형 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="news">뉴스 테마</SelectItem>
                      <SelectItem value="stock">종목 테마</SelectItem>
                      <SelectItem value="sector">섹터 테마</SelectItem>
                      <SelectItem value="industry">산업 테마</SelectItem>
                      <SelectItem value="custom">사용자 정의</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="테마에 대한 간단한 설명을 입력하세요..."
                      className="resize-none"
                      {...field}
                      data-testid="textarea-theme-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    테마 색상
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        className="w-16 h-10 p-1 border rounded"
                        {...field}
                        data-testid="input-theme-color"
                      />
                      <Input
                        type="text"
                        placeholder="#3B82F6"
                        className="flex-1"
                        {...field}
                        data-testid="input-theme-color-text"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Keywords */}
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>키워드 (쉼표로 구분)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: AI, 인공지능, 머신러닝, 딥러닝"
                      {...field}
                      data-testid="input-theme-keywords"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Order */}
            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>표시 순서</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      data-testid="input-theme-order"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              {editingTheme && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteThemeMutation.isPending}
                  data-testid="button-delete-theme"
                >
                  {deleteThemeMutation.isPending ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      삭제 중...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </>
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingTheme(null);
                }}
                data-testid="button-cancel-theme"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={editingTheme ? updateThemeMutation.isPending : createThemeMutation.isPending}
                data-testid="button-submit-theme"
              >
                {editingTheme ? (
                  updateThemeMutation.isPending ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      수정 중...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      테마 수정
                    </>
                  )
                ) : (
                  createThemeMutation.isPending ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      테마 생성
                    </>
                  )
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    );
  }


  return (
    <>
      <ThemeClusteringDialog />
      <ClusteringResultDialog />
      {/* 기존 컴포넌트 내용 */}
    </>
  );
}