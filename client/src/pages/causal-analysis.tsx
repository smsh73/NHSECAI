import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Sparkles, 
  Search, 
  AlertTriangle,
  Clock,
  Target,
  BarChart3,
  Lightbulb,
  ChevronRight,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CausalAnalysis {
  id: string;
  analysisDate: string;
  timePeriod: string;
  marketEvent: string;
  priceMovement: {
    symbol: string;
    before: number;
    after: number;
    change_pct: number;
    timeframe: number;
  };
  volumeSpike?: {
    symbol: string;
    normal_volume: number;
    spike_volume: number;
    spike_ratio: number;
  };
  identifiedCauses: Array<{
    type: string;
    description: string;
    importance: number;
    evidence: any;
  }>;
  correlationStrength: number;
  newsFactors?: Array<{
    news_id: string;
    headline: string;
    sentiment: string;
    relevance_score: number;
  }>;
  technicalFactors?: Array<{
    indicator: string;
    signal: string;
    strength: number;
    timeframe: number;
  }>;
  marketSentiment: string;
  aiReasoning: string;
  confidenceScore: number;
  alternativeExplanations?: string[];
  isValidated: boolean;
  createdAt: string;
}

interface MonitoringData {
  recentAnalyses: CausalAnalysis[];
  totalAnalysesToday: number;
  avgConfidenceScore: number;
  marketEvents: string[];
  lastUpdate: string;
}

export default function CausalAnalysis() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1hour");
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [searchSymbol, setSearchSymbol] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch monitoring data
  const { data: monitoringData, isLoading: isLoadingMonitoring } = useQuery<any>({
    queryKey: ['/api/causal-analysis/monitor', selectedTimeframe],
    refetchInterval: isMonitoring ? 30000 : false, // Refresh every 30 seconds when monitoring
  });

  // Fetch causal analyses
  const { data: analyses, isLoading: isLoadingAnalyses } = useQuery<any>({
    queryKey: ['/api/causal-analysis', {
      marketEvent: selectedEvent === 'all' ? undefined : selectedEvent,
      timePeriod: selectedTimeframe,
      limit: 20
    }],
  });

  // Generate new analysis mutation
  const generateAnalysisMutation = useMutation({
    mutationFn: async (params: {
      marketEvent: string;
      priceMovement: any;
      analysisDate: string;
      timePeriod: string;
    }) => {
      return await apiRequest('POST', '/api/causal-analysis/generate', params);
    },
    onSuccess: () => {
      toast({
        title: "분석 생성 완료",
        description: "새로운 인과 분석이 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/causal-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/causal-analysis/monitor'] });
    },
    onError: (error) => {
      toast({
        title: "분석 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validate analysis mutation
  const validateAnalysisMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      // Ensure id is a string to prevent [object Object] in URL
      const analysisId = typeof id === 'string' ? id : String(id);
      const response = await apiRequest('PUT', `/api/causal-analysis/${analysisId}/validate`, { 
        validatedBy: 'current_user', 
        notes 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "분석 검증 완료",
        description: "분석이 성공적으로 검증되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/causal-analysis'] });
    },
  });

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    toast({
      title: isMonitoring ? "모니터링 중지" : "모니터링 시작",
      description: isMonitoring ? "실시간 모니터링이 중지되었습니다." : "실시간 시장 모니터링을 시작합니다.",
    });
  };

  const generateSampleAnalysis = () => {
    const sampleData = {
      marketEvent: "price_spike",
      priceMovement: {
        symbol: "005930", // Samsung Electronics
        before: 75000,
        after: 78500,
        change_pct: 4.67,
        timeframe: Date.now()
      },
      analysisDate: new Date().toISOString(),
      timePeriod: selectedTimeframe
    };

    generateAnalysisMutation.mutate(sampleData);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "price_spike":
        return <TrendingUp className="h-4 w-4" />;
      case "price_drop":
        return <TrendingDown className="h-4 w-4" />;
      case "volume_surge":
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6" data-testid="causal-analysis-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            인과시황 (Causal Analysis)
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            AI 기반 시장 움직임 원인 분석 시스템
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            className="gap-2"
            data-testid="button-toggle-monitoring"
          >
            {isMonitoring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isMonitoring ? "모니터링 중지" : "실시간 모니터링"}
          </Button>
          <Button
            onClick={generateSampleAnalysis}
            disabled={generateAnalysisMutation.isPending}
            className="gap-2"
            data-testid="button-generate-sample"
          >
            <Sparkles className="h-4 w-4" />
            샘플 분석 생성
          </Button>
        </div>
      </div>

      {/* Real-time Status */}
      {isMonitoring && (
        <Alert data-testid="monitoring-status">
          <Activity className="h-4 w-4" />
          <AlertDescription>
            실시간 모니터링 중... 마지막 업데이트: {monitoringData?.lastUpdate ? new Date(monitoringData.lastUpdate).toLocaleTimeString() : "N/A"}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card data-testid="filters-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">시간대</label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe} data-testid="select-timeframe">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5min">5분</SelectItem>
                  <SelectItem value="15min">15분</SelectItem>
                  <SelectItem value="1hour">1시간</SelectItem>
                  <SelectItem value="4hour">4시간</SelectItem>
                  <SelectItem value="1day">1일</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">이벤트 유형</label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent} data-testid="select-event">
                <SelectTrigger>
                  <SelectValue placeholder="전체 이벤트" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 이벤트</SelectItem>
                  <SelectItem value="price_spike">급등</SelectItem>
                  <SelectItem value="price_drop">급락</SelectItem>
                  <SelectItem value="volume_surge">거래량 급증</SelectItem>
                  <SelectItem value="sector_rotation">섹터 로테이션</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">종목 검색</label>
              <Input
                placeholder="종목명 또는 코드"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                data-testid="input-search-symbol"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">조회</label>
              <Button 
                className="w-full gap-2" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/causal-analysis'] })}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4" />
                새로고침
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-analyses">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">오늘 분석 건수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringData?.totalAnalysesToday || 0}</div>
            <p className="text-xs text-muted-foreground">누적 분석</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-confidence">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">평균 신뢰도</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitoringData?.avgConfidenceScore ? `${(monitoringData.avgConfidenceScore * 100).toFixed(1)}%` : "N/A"}
            </div>
            <Progress value={(monitoringData?.avgConfidenceScore || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="card-active-events">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">활성 이벤트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringData?.marketEvents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">현재 감지 중</p>
          </CardContent>
        </Card>

        <Card data-testid="card-monitoring-status">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">모니터링 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={isMonitoring ? "default" : "secondary"} className="text-xs">
              {isMonitoring ? "활성" : "비활성"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {isMonitoring ? "실시간 감지" : "수동 모드"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="analyses" className="space-y-4" data-testid="main-tabs">
        <TabsList>
          <TabsTrigger value="analyses" data-testid="tab-analyses">분석 결과</TabsTrigger>
          <TabsTrigger value="live" data-testid="tab-live">실시간 모니터링</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">AI 인사이트</TabsTrigger>
        </TabsList>

        {/* Analysis Results Tab */}
        <TabsContent value="analyses" className="space-y-4">
          {isLoadingAnalyses ? (
            <div className="flex items-center justify-center p-8" data-testid="loading-analyses">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : analyses && analyses.length > 0 ? (
            <div className="space-y-4" data-testid="analyses-list">
              {analyses.map((analysis: CausalAnalysis) => (
                <Card key={analysis.id} className="border-l-4 border-l-primary" data-testid={`analysis-card-${analysis.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getEventIcon(analysis.marketEvent)}
                        <div>
                          <CardTitle className="text-lg">
                            {analysis.priceMovement.symbol} - {analysis.marketEvent}
                          </CardTitle>
                          <CardDescription>
                            {new Date(analysis.analysisDate).toLocaleString()} ({analysis.timePeriod})
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={analysis.isValidated ? "default" : "secondary"}
                          data-testid={`badge-validation-${analysis.id}`}
                        >
                          {analysis.isValidated ? "검증됨" : "미검증"}
                        </Badge>
                        <div className={`text-sm font-medium ${getConfidenceColor(analysis.confidenceScore)}`}>
                          신뢰도: {(analysis.confidenceScore * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Price Movement */}
                    <div className="bg-muted p-3 rounded-lg" data-testid={`price-movement-${analysis.id}`}>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        가격 변동
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">이전: </span>
                          <span className="font-medium">{analysis.priceMovement.before?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">이후: </span>
                          <span className="font-medium">{analysis.priceMovement.after?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">변동률: </span>
                          <span className={`font-medium ${analysis.priceMovement.change_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {analysis.priceMovement.change_pct >= 0 ? '+' : ''}{analysis.priceMovement.change_pct?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Identified Causes */}
                    <div data-testid={`causes-${analysis.id}`}>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        식별된 원인들
                      </h4>
                      <div className="space-y-2">
                        {analysis.identifiedCauses?.map((cause, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{cause.type}</div>
                              <div className="text-xs text-muted-foreground">{cause.description}</div>
                            </div>
                            <div className="ml-3">
                              <Progress value={cause.importance * 100} className="w-20" />
                              <div className="text-xs text-center mt-1">{(cause.importance * 100).toFixed(0)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Correlation Strength */}
                    <div className="flex items-center justify-between" data-testid={`correlation-${analysis.id}`}>
                      <span className="text-sm font-medium">상관관계 강도:</span>
                      <div className="flex items-center gap-2">
                        <Progress value={analysis.correlationStrength * 100} className="w-24" />
                        <span className="text-sm">{(analysis.correlationStrength * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    <div data-testid={`reasoning-${analysis.id}`}>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI 추론 과정
                      </h4>
                      <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        {analysis.aiReasoning}
                      </div>
                    </div>

                    {/* News Factors */}
                    {analysis.newsFactors && analysis.newsFactors.length > 0 && (
                      <div data-testid={`news-factors-${analysis.id}`}>
                        <h4 className="font-medium mb-2">관련 뉴스 요인</h4>
                        <ScrollArea className="h-24">
                          <div className="space-y-2">
                            {analysis.newsFactors.map((news, index) => (
                              <div key={index} className="text-sm p-2 border rounded">
                                <div className="font-medium">{news.headline}</div>
                                <div className="flex items-center justify-between mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {news.sentiment}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    연관도: {(news.relevance_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(analysis.createdAt).toLocaleString()}
                      </div>
                      {!analysis.isValidated && (
                        <Button
                          size="sm"
                          onClick={() => validateAnalysisMutation.mutate({ id: analysis.id })}
                          disabled={validateAnalysisMutation.isPending}
                          data-testid={`button-validate-${analysis.id}`}
                        >
                          검증하기
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card data-testid="no-analyses">
              <CardContent className="text-center p-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">분석 결과가 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  새로운 분석을 생성하거나 필터 조건을 변경해 보세요.
                </p>
                <Button onClick={generateSampleAnalysis} disabled={generateAnalysisMutation.isPending}>
                  샘플 분석 생성
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Live Monitoring Tab */}
        <TabsContent value="live" className="space-y-4">
          <Card data-testid="live-monitoring-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                실시간 시장 모니터링
              </CardTitle>
              <CardDescription>
                시장 이상 움직임을 실시간으로 감지하고 분석합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isMonitoring ? (
                <div className="space-y-4">
                  <div className="text-center p-8">
                    <div className="animate-pulse">
                      <Activity className="h-16 w-16 text-primary mx-auto mb-4" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">시장 모니터링 중...</h3>
                    <p className="text-muted-foreground">
                      AI가 시장 데이터를 실시간으로 분석하고 있습니다.
                    </p>
                  </div>
                  
                  {monitoringData?.recentAnalyses && monitoringData.recentAnalyses.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">최근 감지된 이벤트</h4>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {monitoringData.recentAnalyses.slice(0, 5).map((analysis: any) => (
                            <div key={analysis.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                {getEventIcon(analysis.marketEvent)}
                                <div>
                                  <div className="font-medium text-sm">{analysis.priceMovement.symbol}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {analysis.priceMovement.change_pct >= 0 ? '+' : ''}{analysis.priceMovement.change_pct?.toFixed(2)}%
                                  </div>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                신뢰도: {(analysis.confidenceScore * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Pause className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">모니터링이 중지되었습니다</h3>
                  <p className="text-muted-foreground mb-4">
                    실시간 모니터링을 시작하려면 버튼을 클릭하세요.
                  </p>
                  <Button onClick={toggleMonitoring} className="gap-2">
                    <Play className="h-4 w-4" />
                    모니터링 시작
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card data-testid="insights-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI 종합 인사이트
              </CardTitle>
              <CardDescription>
                오늘의 시장 분석을 바탕으로 한 AI의 종합적인 인사이트입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Market Summary */}
                <div>
                  <h4 className="font-medium mb-3">시장 요약</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm">
                      오늘 총 {monitoringData?.totalAnalysesToday || 0}건의 시장 이벤트가 감지되었습니다. 
                      평균 신뢰도는 {monitoringData?.avgConfidenceScore ? `${(monitoringData.avgConfidenceScore * 100).toFixed(1)}%` : "N/A"}로, 
                      AI 분석의 정확도가 {(monitoringData?.avgConfidenceScore || 0) > 0.7 ? "높은" : "보통"} 수준을 보이고 있습니다.
                    </p>
                  </div>
                </div>

                {/* Active Events Summary */}
                <div>
                  <h4 className="font-medium mb-3">주요 이벤트 유형</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {monitoringData?.marketEvents?.map((event: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {getEventIcon(event)}
                          <span className="font-medium text-sm">{event}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          시장에서 감지된 이벤트 유형
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="font-medium mb-3">AI 권고사항</h4>
                  <div className="space-y-3">
                    <Alert>
                      <Lightbulb className="h-4 w-4" />
                      <AlertDescription>
                        현재 시장에서 {monitoringData?.marketEvents?.length || 0}개의 서로 다른 이벤트 유형이 
                        감지되고 있습니다. 포트폴리오 다변화에 주의하시기 바랍니다.
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <Target className="h-4 w-4" />
                      <AlertDescription>
                        평균 신뢰도가 {monitoringData?.avgConfidenceScore ? `${(monitoringData.avgConfidenceScore * 100).toFixed(1)}%` : "N/A"}로, 
                        {(monitoringData?.avgConfidenceScore || 0) > 0.8 ? "매우 신뢰할 만한" : "추가 검증이 필요한"} 수준입니다.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}