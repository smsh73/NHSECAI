import { memo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

export const HeroSection = memo(function HeroSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Get recent news for market analysis generation
  const { data: recentNews } = useQuery<any[]>({
    queryKey: ['/api/news-data'],
    refetchInterval: 30000
  });

  // Generate market analysis mutation
  const generateMarketAnalysisMutation = useMutation({
    mutationFn: async (newsIds: string[]) => {
      // Call the AI market analysis workflow endpoint
      const response = await apiRequest('POST', '/api/ai-market-analysis/execute', {
        newsIds,
        workflowType: 'full'
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI 시황 생성 시작",
        description: "AI 시황 생성이 시작되었습니다. 결과는 곧 표시됩니다.",
      });
      // Navigate to AI market analysis page to see progress
      window.location.href = '/ai-market-analysis';
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "시황 생성 실패",
        description: error?.message || "AI 시황 생성 중 오류가 발생했습니다.",
      });
    }
  });

  const handleGenerateMarketAnalysis = async () => {
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
      
      if (newsIds.length === 0) {
        toast({
          variant: "destructive",
          title: "뉴스 ID 없음",
          description: `분석할 뉴스 데이터를 찾을 수 없습니다. (전체 뉴스: ${recentNews?.length || 0}건)`,
        });
        return;
      }

      await generateMarketAnalysisMutation.mutateAsync(newsIds);
    } catch (error) {
      console.error('Failed to generate market analysis:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section 
      className="bg-background border-b py-12"
      aria-label="홈 히어로 섹션"
    >
      {/* Content */}
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
            NHQV AI 시황생성 플랫폼
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
            AI 기반 금융 시장 분석 및 시황 생성 플랫폼입니다
          </p>
          <div className="flex items-center gap-3 pt-4">
            <Button 
              onClick={handleGenerateMarketAnalysis}
              disabled={isGenerating || generateMarketAnalysisMutation.isPending}
              size="default"
              className="h-10 px-6"
            >
              {isGenerating || generateMarketAnalysisMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2" />
                  시황 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI시황생성시작
                </>
              )}
            </Button>
            <Link href="/ai-market-analysis">
              <Button variant="outline" size="default" className="h-10 px-6">
                시황 생성 테스트
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';
