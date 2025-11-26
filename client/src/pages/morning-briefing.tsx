import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { MorningBriefing } from "@shared/schema";
import { 
  Sun,
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Newspaper, 
  Building2, 
  Calculator,
  RefreshCw,
  Star,
  AlertTriangle,
  CheckCircle,
  Activity,
  Globe,
  Target,
  Zap,
  Clock,
  Calendar,
  Eye,
  Plus,
  Download,
  Filter
} from "lucide-react";

interface MarketMovementData {
  kospi?: {
    price: number | string;
    volume: number;
  };
  kosdaq?: {
    price: number | string;
    volume: number;
  };
  sectors: Array<{
    sector: string;
    avgPrice: number;
    volume: number;
    topStocks: Array<{
      symbol: string;
      price: string;
      volume: number;
    }>;
  }>;
}

interface KeyEvent {
  event: string;
  time: string;
  impact: string;
  description: string;
}

interface SectorHighlight {
  sector: string;
  performance: string;
  reasons?: string[];
}

interface TradingVolumeAnalysis {
  totalVolume?: number;
  compared_to_avg?: string;
  unusual_volumes?: any[];
}

export default function MorningBriefingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();
  
  const [selectedBriefing, setSelectedBriefing] = useState<MorningBriefing | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generationParams, setGenerationParams] = useState({
    briefingDate: new Date().toISOString().split('T')[0],
    marketOpenTime: '09:00'
  });

  // Fetch morning briefings
  const { data: morningBriefings, isLoading: briefingsLoading, refetch: refetchBriefings } = useQuery<MorningBriefing[]>({
    queryKey: ['/api/morning-briefing'],
    refetchInterval: 30000,
  });

  // Generate morning briefing mutation
  const generateBriefingMutation = useMutation({
    mutationFn: async (params: { briefingDate: string; marketOpenTime: string }) => {
      const briefingDateTime = new Date(`${params.briefingDate}T${params.marketOpenTime}:00`);
      const marketOpenDateTime = new Date(`${params.briefingDate}T${params.marketOpenTime}:00`);
      
      const response = await apiRequest('POST', '/api/morning-briefing/generate', {
        briefingDate: briefingDateTime.toISOString(),
        marketOpenTime: marketOpenDateTime.toISOString()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || 'Failed to generate morning briefing');
      }
      
      const data = await response.json();
      // Handle both success: true and direct briefing object responses
      return data.success ? data : data;
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: (data) => {
      toast({
        title: "모닝브리핑 생성 완료",
        description: "새로운 모닝브리핑이 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/morning-briefing'] });
      setSelectedBriefing(data);
      setShowGenerateModal(false);
      setIsGenerating(false);
    },
    onError: (error: any) => {
      console.error('Morning briefing generation error:', error);
      const errorMessage = error?.message || error?.error || '알 수 없는 오류가 발생했습니다.';
      toast({
        title: "생성 실패",
        description: errorMessage.includes('뉴스') || errorMessage.includes('news') 
          ? `뉴스 데이터 수집 중 오류가 발생했습니다: ${errorMessage}`
          : `모닝브리핑 생성 중 오류가 발생했습니다: ${errorMessage}`,
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  });

  // WebSocket real-time updates
  useEffect(() => {
    if (!isConnected) return;
    
    // Subscribe to morning briefing updates
    // This would be implemented in the useWebSocket hook
  }, [isConnected]);

  const handleGenerateBriefing = () => {
    generateBriefingMutation.mutate(generationParams);
  };

  const formatDateTime = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getImportanceBadge = (score: string | number | null) => {
    const numScore = typeof score === 'string' ? parseFloat(score) : score || 0;
    if (numScore >= 0.8) return <Badge variant="destructive">높음</Badge>;
    if (numScore >= 0.6) return <Badge variant="secondary">보통</Badge>;
    return <Badge variant="outline">낮음</Badge>;
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderKeyEvents = (keyEvents: any): React.ReactNode => {
    if (!keyEvents || !Array.isArray(keyEvents)) return null;
    
    return keyEvents.map((event: KeyEvent, index: number) => (
      <div key={index} className="p-3 bg-muted rounded-lg mb-2">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-foreground mb-1">{event.event}</h4>
          <Badge variant={event.impact === 'positive' ? 'default' : 'secondary'}>
            {event.impact === 'positive' ? '긍정' : event.impact === 'negative' ? '부정' : '중립'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          {formatDateTime(event.time)}
        </div>
      </div>
    ));
  };

  const renderMarketMovements = (movements: any): React.ReactNode => {
    if (!movements) return null;
    
    const marketMovements = movements as MarketMovementData;
    
    return (
      <div className="space-y-4">
        {/* KOSPI/KOSDAQ Overview */}
        <div className="grid grid-cols-2 gap-4">
          {marketMovements.kospi && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">KOSPI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{marketMovements.kospi.price || 'N/A'}</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground">거래량: {(marketMovements.kospi.volume || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          )}
          
          {marketMovements.kosdaq && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">KOSDAQ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{marketMovements.kosdaq.price || 'N/A'}</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground">거래량: {(marketMovements.kosdaq.volume || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sector Performance */}
        {marketMovements.sectors && marketMovements.sectors.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">섹터별 동향</h4>
            <div className="space-y-2">
              {marketMovements.sectors.slice(0, 5).map((sector, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="font-medium">{sector.sector}</span>
                  <div className="text-right">
                    <div className="font-mono text-sm">{sector.avgPrice.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">거래량: {sector.volume.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden">
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Briefing List */}
        <div className="w-1/3 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">모닝브리핑 목록</h2>
              <Button 
                onClick={() => setShowGenerateModal(true)}
                disabled={isGenerating}
                size="sm"
                data-testid="button-generate-briefing"
              >
                <Plus className="h-4 w-4 mr-1" />
                생성
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => refetchBriefings()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                새로고침
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                필터
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {briefingsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : morningBriefings && morningBriefings.length > 0 ? (
                morningBriefings.map((briefing) => (
                  <Card 
                    key={briefing.id} 
                    className={`cursor-pointer transition-colors hover:bg-muted ${
                      selectedBriefing?.id === briefing.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedBriefing(briefing)}
                    data-testid={`briefing-card-${briefing.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Sun className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            {formatDateTime(briefing.briefingDate)}
                          </span>
                        </div>
                        {getImportanceBadge(briefing.importanceScore)}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getSentimentIcon(briefing.marketSentiment)}
                          <span className="text-xs text-muted-foreground">
                            {briefing.marketSentiment === 'positive' ? '긍정적' : 
                             briefing.marketSentiment === 'negative' ? '부정적' : '중립'}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {briefing.summaryPeriod}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Sun className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>생성된 모닝브리핑이 없습니다.</p>
                  <p className="text-sm mt-1">새로운 브리핑을 생성해보세요.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Briefing Details */}
        <div className="flex-1 flex flex-col">
          {selectedBriefing ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Sun className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold text-foreground">
                      {formatDateTime(selectedBriefing.briefingDate)} 모닝브리핑
                    </h1>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getImportanceBadge(selectedBriefing.importanceScore)}
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      다운로드
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>분석기간: {selectedBriefing.summaryPeriod}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>장 개시: {formatDateTime(selectedBriefing.marketOpenTime)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getSentimentIcon(selectedBriefing.marketSentiment)}
                    <span>시장심리: {
                      selectedBriefing.marketSentiment === 'positive' ? '긍정적' : 
                      selectedBriefing.marketSentiment === 'negative' ? '부정적' : '중립'
                    }</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  
                  {/* AI Insights */}
                  <Card data-testid="ai-insights-section">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <span>AI 종합 분석</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground leading-relaxed">
                        {selectedBriefing.aiInsights || "AI 인사이트 생성 중입니다..."}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Key Events */}
                  {(() => {
                    if (!selectedBriefing.keyEvents) return null;
                    return (
                      <Card data-testid="key-events-section">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-primary" />
                            <span>주요 이벤트</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {renderKeyEvents(selectedBriefing.keyEvents)}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Market Movements */}
                  {(() => {
                    if (!selectedBriefing.marketMovements) return null;
                    return (
                      <Card data-testid="market-movements-section">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <span>시장 동향</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {renderMarketMovements(selectedBriefing.marketMovements)}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Sector Highlights */}
                  {(() => {
                    if (!selectedBriefing.sectorHighlights || !Array.isArray(selectedBriefing.sectorHighlights)) return null;
                    return (
                      <Card data-testid="sector-highlights-section">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <span>섹터 하이라이트</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {(selectedBriefing.sectorHighlights as SectorHighlight[]).map((highlight: SectorHighlight, index: number) => (
                              <div key={index} className="p-3 bg-muted rounded-lg">
                                <h4 className="font-medium mb-2">{highlight.sector}</h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                  성과: {highlight.performance || 'N/A'}
                                </p>
                                {highlight.reasons && Array.isArray(highlight.reasons) && (
                                  <div className="space-y-1">
                                    {highlight.reasons.map((reason: string, i: number) => (
                                      <p key={i} className="text-xs text-muted-foreground">• {reason}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Trading Volume Analysis */}
                  {(() => {
                    if (!selectedBriefing.tradingVolumeAnalysis || typeof selectedBriefing.tradingVolumeAnalysis !== 'object') return null;
                    const volumeAnalysis = selectedBriefing.tradingVolumeAnalysis as TradingVolumeAnalysis;
                    return (
                      <Card data-testid="volume-analysis-section">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Activity className="h-5 w-5 text-primary" />
                            <span>거래량 분석</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">총 거래량</span>
                              <span className="font-mono">
                                {volumeAnalysis.totalVolume?.toLocaleString() || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">평균 대비</span>
                              <Badge variant="outline">
                                {volumeAnalysis.compared_to_avg === 'above_average' ? '평균 이상' : '평균 이하'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div>
                <Sun className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">모닝브리핑을 선택하세요</h3>
                <p className="text-sm">왼쪽 목록에서 브리핑을 선택하거나 새로운 브리핑을 생성하세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Briefing Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>새 모닝브리핑 생성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="briefing-date">브리핑 날짜</Label>
                <Input
                  id="briefing-date"
                  type="date"
                  value={generationParams.briefingDate}
                  onChange={(e) => setGenerationParams(prev => ({ ...prev, briefingDate: e.target.value }))}
                  data-testid="input-briefing-date"
                />
              </div>
              <div>
                <Label htmlFor="market-open-time">장 개시 시간</Label>
                <Input
                  id="market-open-time"
                  type="time"
                  value={generationParams.marketOpenTime}
                  onChange={(e) => setGenerationParams(prev => ({ ...prev, marketOpenTime: e.target.value }))}
                  data-testid="input-market-open-time"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowGenerateModal(false)}
                  disabled={isGenerating}
                  data-testid="button-cancel-generate"
                >
                  취소
                </Button>
                <Button 
                  onClick={handleGenerateBriefing}
                  disabled={isGenerating}
                  data-testid="button-confirm-generate"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      생성
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}