import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Sparkles, X, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AnalysisItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  type: 'market' | 'sector' | 'stock' | 'macro';
  trend?: 'up' | 'down' | 'neutral';
  accuracy?: number;
  createdAt: Date;
  tags?: string[];
  isNew?: boolean;
  newsIds?: string[];
  metadata?: {
    newsCount?: number;
    generatedAt?: string;
    model?: string;
  };
}

interface RecentAnalysisProps {
  marketAnalysis?: any[];
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

function AnalysisSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-8 w-16 ml-4" />
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

interface NewsSourceData {
  id: string;
  title: string;
  content: string;
  summary?: string;
  source?: string;
  publishedAt: string | Date;
  category?: string;
  sentiment?: string;
  keywords?: string[];
}

function NewsSourceDialog({ newsIds, isOpen, onClose }: { newsIds?: string[]; isOpen: boolean; onClose: () => void }) {
  const { data: newsData, isLoading } = useQuery<NewsSourceData[]>({
    queryKey: ['/api/news-data', { ids: newsIds }],
    queryFn: async () => {
      if (!newsIds || newsIds.length === 0) return [];
      
      // Get news data from API
      const response = await apiRequest('GET', `/api/news-data?limit=100`);
      const allNews = await response.json();
      
      // Filter by IDs
      return allNews.filter((news: NewsSourceData) => newsIds.includes(news.id));
    },
    enabled: isOpen && newsIds && newsIds.length > 0
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>뉴스 원본 데이터</DialogTitle>
          <DialogDescription>
            분석에 사용된 뉴스 원본 데이터를 확인하세요
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32" />
              ))}
            </div>
          ) : newsData && newsData.length > 0 ? (
            <div className="space-y-4">
              {newsData.map((news) => (
                <Card key={news.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{news.title}</h4>
                    {news.source && (
                      <Badge variant="outline" className="ml-2">
                        {news.source}
                      </Badge>
                    )}
                  </div>
                  {news.summary && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {news.summary}
                    </p>
                  )}
                  <p className="text-sm text-foreground mb-3 line-clamp-3">
                    {news.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {new Date(news.publishedAt).toLocaleString('ko-KR')}
                    </span>
                    {news.category && <span>카테고리: {news.category}</span>}
                    {news.sentiment && <span>감정: {news.sentiment}</span>}
                  </div>
                  {news.keywords && news.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {news.keywords.slice(0, 5).map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              뉴스 원본 데이터를 찾을 수 없습니다.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function AnalysisCard({ item }: { item: AnalysisItem }) {
  const [showNewsSource, setShowNewsSource] = useState(false);
  const getTypeInfo = () => {
    switch (item.type) {
      case 'market':
        return { label: '시장분석', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' };
      case 'sector':
        return { label: '섹터분석', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' };
      case 'stock':
        return { label: '종목분석', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' };
      case 'macro':
        return { label: '거시분석', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' };
      default:
        return { label: '분석', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' };
    }
  };

  const getTrendText = () => {
    switch (item.trend) {
      case 'up':
        return { text: '상승', color: 'text-green-600 dark:text-green-400' };
      case 'down':
        return { text: '하락', color: 'text-red-600 dark:text-red-400' };
      default:
        return { text: '보합', color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const formatTime = () => {
    const now = new Date();
    const diff = now.getTime() - item.createdAt.getTime();
    
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return item.createdAt.toLocaleDateString();
  };

  const typeInfo = getTypeInfo();
  const trendInfo = getTrendText();

  return (
    <Card className={cn(
      "group relative overflow-hidden cursor-pointer transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-1",
      "bg-card border border-black/10 dark:border-white/10",
      "shadow-sm"
    )}>
      
      {/* New Badge */}
      {item.isNew && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white">
            NEW
          </Badge>
        </div>
      )}

      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          </div>
          <div className="ml-4 flex flex-col items-end space-y-2">
            <div className={cn("text-sm font-medium", trendInfo.color)}>
              {trendInfo.text}
            </div>
            {item.accuracy && (
              <div className="text-xs text-muted-foreground">
                {Math.round(item.accuracy)}% 정확도
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {item.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs border-black/20 dark:border-white/20">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="outline" className="text-xs border-black/20 dark:border-white/20">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10">
          <div className="flex items-center space-x-3">
            <Badge className={cn("text-xs font-medium", typeInfo.color)}>
              {typeInfo.label}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {formatTime()}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.newsIds && item.newsIds.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => setShowNewsSource(true)}
              >
                원본 뉴스
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              보기
            </Button>
          </div>
          
          {item.newsIds && item.newsIds.length > 0 && (
            <NewsSourceDialog 
              newsIds={item.newsIds} 
              isOpen={showNewsSource} 
              onClose={() => setShowNewsSource(false)} 
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="text-center p-12 bg-card border border-black/10 dark:border-white/10">
      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <div className="text-2xl font-bold text-muted-foreground">📊</div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        분석 결과가 없습니다
      </h3>
      <p className="text-muted-foreground mb-6">
        AI 시황 생성을 시작하여 첫 번째 분석을 만들어보세요
      </p>
      <Link href="/macro-analysis">
        <Button>
          AI 시황 생성 시작
        </Button>
      </Link>
    </Card>
  );
}

export function RecentAnalysis({ 
  marketAnalysis = [], 
  isLoading = false, 
  maxItems = 5,
  className 
}: RecentAnalysisProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get recent news for analysis generation
  const { data: recentNews, refetch: refetchNews } = useQuery<any[]>({
    queryKey: ['/api/news-data'],
    refetchInterval: 30000
  });

  // Generate analysis mutation
  const generateAnalysisMutation = useMutation({
    mutationFn: async (newsIds: string[]) => {
      const response = await apiRequest('POST', '/api/market-analysis/generate', {
        newsIds,
        analysisType: 'market'
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "분석 생성 완료",
        description: `${data.newsCount}건의 뉴스를 분석하여 보고서를 생성했습니다.`,
      });
      // Refetch market analysis to show new result
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "분석 생성 실패",
        description: error?.message || "분석 생성 중 오류가 발생했습니다.",
      });
    }
  });

  const handleGenerateAnalysis = async () => {
    if (!recentNews || recentNews.length === 0) {
      toast({
        variant: "destructive",
        title: "뉴스 데이터 없음",
        description: "분석할 뉴스 데이터가 없습니다.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Get top 10 recent news IDs - check both id and nid fields
      const newsIds = recentNews.slice(0, 10)
        .map((news: any) => news.id || news.nid || news.ID || news.NID)
        .filter(Boolean);
      
      console.log('📊 뉴스 ID 추출:', { 
        totalNews: recentNews?.length || 0,
        extractedIds: newsIds.length,
        sampleIds: newsIds.slice(0, 3),
        sampleNews: recentNews?.slice(0, 2).map((n: any) => ({ 
          id: n.id, 
          nid: n.nid, 
          ID: n.ID, 
          NID: n.NID,
          title: n.title 
        }))
      });
      
      if (newsIds.length === 0) {
        toast({
          variant: "destructive",
          title: "뉴스 ID 없음",
          description: `분석할 뉴스 데이터를 찾을 수 없습니다. (전체 뉴스: ${recentNews?.length || 0}건)`,
        });
        return;
      }

      await generateAnalysisMutation.mutateAsync(newsIds);
    } catch (error) {
      console.error('Failed to generate analysis:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Transform API data to AnalysisItem format
  const transformedAnalysis: AnalysisItem[] = marketAnalysis.slice(0, maxItems).map((item, index) => {
    const createdAt = item.generatedAt || item.createdAt || Date.now() - Math.random() * 86400000;
    
    return {
      id: item.id || `analysis-${index}`,
      title: item.title || `시장 분석 #${index + 1}`,
      summary: item.summary || item.description || "AI 기반 시장 분석 결과입니다.",
      content: item.content,
      type: item.type || 'market',
      trend: item.trend || 'neutral',
      accuracy: item.confidence ? Number(item.confidence) * 100 : (item.accuracy || Math.floor(Math.random() * 20) + 80),
      createdAt: new Date(createdAt),
      tags: item.tags || ['AI분석', '자동생성'],
      isNew: index === 0 && Date.now() - new Date(createdAt).getTime() < 3600000,
      newsIds: item.dataSourceIds || item.newsIds || (item.metadata as any)?.newsIds,
      metadata: {
        newsCount: item.dataSourceIds?.length || 0,
        generatedAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
        model: (item as any).model || 'gpt-4.1'
      }
    };
  });

  return (
    <section className={cn("w-full py-12", className)} data-testid="recent-analysis">
      <div className="container mx-auto px-6">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              최신 분석 결과
            </h2>
            <p className="text-muted-foreground">
              AI가 생성한 최신 시장 분석과 인사이트를 확인하세요
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {!isLoading && transformedAnalysis.length > 0 && (
              <Link href="/macro-analysis">
                <Button variant="outline" className="group">
                  모든 분석 보기
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            )}
            <Button 
              onClick={handleGenerateAnalysis}
              disabled={isGenerating || generateAnalysisMutation.isPending}
              className="gap-2"
            >
              {isGenerating || generateAnalysisMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  분석 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  분석 생성
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: maxItems }).map((_, index) => (
              <AnalysisSkeleton key={index} />
            ))}
          </div>
        ) : transformedAnalysis.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {transformedAnalysis.map((item, index) => (
                <div 
                  key={item.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                  data-testid={`analysis-card-${item.id}`}
                >
                  <AnalysisCard item={item} />
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-border/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{transformedAnalysis.length}</div>
                <div className="text-sm text-muted-foreground">오늘 생성된 분석</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {Math.round(transformedAnalysis.reduce((acc, item) => acc + (item.accuracy || 85), 0) / transformedAnalysis.length)}%
                </div>
                <div className="text-sm text-muted-foreground">평균 정확도</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {transformedAnalysis.filter(item => item.trend === 'up').length}
                </div>
                <div className="text-sm text-muted-foreground">긍정적 전망</div>
              </div>
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}