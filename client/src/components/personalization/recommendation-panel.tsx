import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Star, Target, Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecommendationPanelProps {
  recommendations: {
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
      impact: number; // 1-100
    }>;
  };
  userProfile: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    investmentHorizon: 'short' | 'medium' | 'long';
    preferredSectors: string[];
    currentHoldings: string[];
  };
  onAddToWatchlist: (symbol: string) => Promise<void>;
  onApplyInsight: (insightId: string) => Promise<void>;
  isLoading?: boolean;
}

export function RecommendationPanel({
  recommendations,
  userProfile,
  onAddToWatchlist,
  onApplyInsight,
  isLoading
}: RecommendationPanelProps) {
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'low': return '낮음';
      case 'medium': return '보통';
      case 'high': return '높음';
      default: return '알 수 없음';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="recommendation-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
            AI 맞춤 추천
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {userProfile.riskTolerance === 'conservative' ? '보수적' : 
             userProfile.riskTolerance === 'moderate' ? '적극적' : '공격적'} 투자성향
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stocks" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stocks" data-testid="stocks-tab">종목 추천</TabsTrigger>
            <TabsTrigger value="themes" data-testid="themes-tab">테마 추천</TabsTrigger>
            <TabsTrigger value="insights" data-testid="insights-tab">인사이트</TabsTrigger>
          </TabsList>

          {/* 종목 추천 */}
          <TabsContent value="stocks" className="space-y-4" data-testid="stocks-content">
            {recommendations.stocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>추천 종목이 없습니다.</p>
                <p className="text-sm">투자 성향을 설정해보세요.</p>
              </div>
            ) : (
              recommendations.stocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`stock-recommendation-${stock.symbol}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{stock.symbolName}</h4>
                        <Badge variant="outline" className="text-xs">{stock.symbol}</Badge>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getRiskColor(stock.riskLevel))}
                        >
                          {getRiskLabel(stock.riskLevel)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {stock.timeHorizon}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {stock.reason}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {stock.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAddToWatchlist(stock.symbol)}
                      data-testid={`add-to-watchlist-${stock.symbol}`}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      관심종목
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">현재가</div>
                      <div className="font-medium">{formatCurrency(stock.currentPrice)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">목표가</div>
                      <div className="font-medium">{formatCurrency(stock.targetPrice)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">상승여력</div>
                      <div className={cn(
                        "font-medium flex items-center",
                        stock.upside >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {stock.upside >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {formatPercent(stock.upside)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">신뢰도</div>
                      <div className="flex items-center space-x-2">
                        <Progress value={stock.confidence} className="h-2 flex-1" />
                        <span className="text-xs font-medium">{stock.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* 테마 추천 */}
          <TabsContent value="themes" className="space-y-4" data-testid="themes-content">
            {recommendations.themes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>추천 테마가 없습니다.</p>
                <p className="text-sm">관심 분야를 설정해보세요.</p>
              </div>
            ) : (
              recommendations.themes.map((theme) => (
                <div
                  key={theme.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`theme-recommendation-${theme.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-lg">{theme.name}</h4>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getRiskColor(theme.riskLevel))}
                        >
                          {getRiskLabel(theme.riskLevel)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {theme.timeframe}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {theme.description}
                      </p>
                      <p className="text-sm mb-3">
                        {theme.reasoning}
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">주요 종목: </span>
                          {theme.topStocks.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">성장 잠재력</div>
                      <div className="flex items-center space-x-2">
                        <Progress value={theme.growthPotential} className="h-2 flex-1" />
                        <span className="text-xs font-medium">{theme.growthPotential}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">기대수익률</div>
                      <div className={cn(
                        "font-medium",
                        theme.expectedReturn >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {formatPercent(theme.expectedReturn)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* 인사이트 */}
          <TabsContent value="insights" className="space-y-4" data-testid="insights-content">
            {recommendations.insights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>AI 인사이트가 없습니다.</p>
                <p className="text-sm">더 많은 데이터가 수집되면 제공됩니다.</p>
              </div>
            ) : (
              recommendations.insights.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    "p-4 border-l-4 rounded-lg",
                    getPriorityColor(insight.priority)
                  )}
                  data-testid={`insight-${insight.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge 
                          variant={insight.priority === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {insight.priority === 'high' ? '높음' : 
                           insight.priority === 'medium' ? '보통' : '낮음'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {insight.type === 'portfolio' ? '포트폴리오' :
                           insight.type === 'trading' ? '매매' : '시장'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {insight.description}
                      </p>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-muted-foreground">예상 영향:</span>
                        <Progress value={insight.impact} className="h-2 w-20" />
                        <span className="text-xs font-medium">{insight.impact}%</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onApplyInsight(insight.id)}
                      data-testid={`apply-insight-${insight.id}`}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      {insight.action}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}