import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradeHistoryChart } from "@/components/personalization/trade-history-chart";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { 
  type UserTrade, 
  type TradeInsights 
} from "@shared/schema";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Award,
  Target,
  Clock,
  DollarSign,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types based on backend API responses
interface TradingMetrics {
  totalTrades: number;
  winRate: number;
  avgHoldingDays: number;
  totalProfit: number;
  totalProfitPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeSize: number;
}

// Extended type for TradeInsights with parsed tradingMetrics
type TradeInsightsExtended = TradeInsights & {
  totalTrades?: number;
  winRate?: number;
  avgHoldingDays?: number;
  totalPnl?: number;
  totalPnlPercent?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  bestTrade?: number;
  worstTrade?: number;
  avgTradeSize?: number;
};

// Extended type for UserTrade with additional fields
type UserTradeExtended = UserTrade & {
  tradeType?: string;
  tradeAmount?: number;
  pnl?: number;
  pnlPercent?: number;
};

export default function MyTrades() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [chartType, setChartType] = useState<'performance' | 'trades' | 'monthly'>('performance');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2024');
  
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
              매매이력 분석을 이용하시려면 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Trade data from backend API  
  const { data: tradesData, isLoading: tradesLoading } = useQuery<UserTradeExtended[]>({
    queryKey: ['/api/personalization', userId, 'trades'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/personalization/${userId}/trades`);
      if (!response.ok) {
        throw new Error('Failed to fetch trade data');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : data.trades || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });

  // Trading performance metrics from backend API
  const { data: tradingMetrics, isLoading: metricsLoading } = useQuery<TradeInsightsExtended>({
    queryKey: ['/api/personalization', userId, 'performance'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/personalization/${userId}/performance`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics');
      }
      return await response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
  
  // Transform performance data for UI display
  const performanceMetrics: TradingMetrics = {
    totalTrades: tradingMetrics?.totalTrades || 0,
    winRate: Number(tradingMetrics?.winRate) || 0,
    avgHoldingDays: tradingMetrics?.avgHoldingDays || 0,
    totalProfit: Number(tradingMetrics?.totalPnl) || 0,
    totalProfitPercent: Number(tradingMetrics?.totalPnlPercent) || 0,
    maxDrawdown: Number(tradingMetrics?.maxDrawdown) || 0,
    sharpeRatio: Number(tradingMetrics?.sharpeRatio) || 0,
    bestTrade: Number(tradingMetrics?.bestTrade) || 0,
    worstTrade: Number(tradingMetrics?.worstTrade) || 0,
    avgTradeSize: Number(tradingMetrics?.avgTradeSize) || 0
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // 성과 등급 계산
  const getPerformanceGrade = (returnPercent: number) => {
    if (returnPercent >= 20) return { grade: 'S', color: 'text-purple-600 bg-purple-50' };
    if (returnPercent >= 15) return { grade: 'A+', color: 'text-blue-600 bg-blue-50' };
    if (returnPercent >= 10) return { grade: 'A', color: 'text-green-600 bg-green-50' };
    if (returnPercent >= 5) return { grade: 'B+', color: 'text-yellow-600 bg-yellow-50' };
    if (returnPercent >= 0) return { grade: 'B', color: 'text-orange-600 bg-orange-50' };
    return { grade: 'C', color: 'text-red-600 bg-red-50' };
  };

  const performanceGrade = getPerformanceGrade(performanceMetrics.totalProfitPercent);

  // Export trades data to CSV
  const exportTrades = () => {
    // Check if there's data to export
    if (!tradesData || tradesData.length === 0) {
      toast({
        title: "내보낼 데이터가 없습니다",
        description: "매매 이력이 없습니다.",
        variant: "default",
      });
      return;
    }
    
    const csvData = tradesData.map(trade => ({
      거래일: trade.tradeDate,
      종목코드: trade.symbol,
      종목명: trade.symbolName || trade.symbol,
      매매구분: trade.tradeType,
      수량: Number(trade.quantity),
      단가: Number(trade.price),
      거래금액: Number(trade.tradeAmount),
      수수료: Number(trade.commission) || 0,
      손익: Number(trade.pnl) || 0,
      손익률: Number(trade.pnlPercent) || 0
    }));
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `매매이력_${selectedPeriod}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "데이터가 내보내졌습니다",
      description: "CSV 파일이 다운로드되었습니다.",
    });
  };

  return (
    <div className="w-full px-6 py-6 space-y-6" data-testid="my-trades">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            매매이력 분석
          </h1>
          <p className="text-muted-foreground mt-1">
            거래 패턴과 성과를 분석하여 투자 전략을 개선하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32" data-testid="period-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024년</SelectItem>
              <SelectItem value="2023">2023년</SelectItem>
              <SelectItem value="all">전체</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportTrades} data-testid="export-trades">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 매매 성과 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="total-trades-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 거래 횟수</p>
                <p className="text-2xl font-bold">{performanceMetrics.totalTrades}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              평균 {performanceMetrics.avgTradeSize ? formatCurrency(performanceMetrics.avgTradeSize) : '계산 중'}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="win-rate-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">승률</p>
                <p className="text-2xl font-bold text-green-600">
                  {performanceMetrics.winRate.toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={performanceMetrics.winRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="total-profit-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">총 수익</p>
                <p className={cn(
                  "text-2xl font-bold",
                  performanceMetrics.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(performanceMetrics.totalProfit)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="text-xs text-green-600 mt-2">
              {formatPercent(performanceMetrics.totalProfitPercent)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="performance-grade-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">성과 등급</p>
                <div className={cn(
                  "text-2xl font-bold px-3 py-1 rounded-lg inline-block",
                  performanceGrade.color
                )}>
                  {performanceGrade.grade}
                </div>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              샤프비율: {performanceMetrics.sharpeRatio.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 추가 성과 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="holding-period-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">평균 보유기간</p>
                <p className="text-lg font-semibold">
                  {performanceMetrics.avgHoldingDays}일
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="best-trade-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">최고 수익</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(performanceMetrics.bestTrade)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="worst-trade-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">최고 손실</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(performanceMetrics.worstTrade)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 매매이력 차트 */}
      <TradeHistoryChart
        data={{ trades: tradesData as any || [], monthlyStats: [], performanceData: [] }}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        chartType={chartType}
        onChartTypeChange={setChartType}
        isLoading={tradesLoading}
      />

      {/* 상세 매매이력 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 매매이력</CardTitle>
        </CardHeader>
        <CardContent>
          {tradesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {tradesData?.slice(0, 10).map((trade: UserTradeExtended) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`trade-${trade.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <Badge 
                      variant={trade.side === 'buy' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {trade.side === 'buy' ? '매수' : '매도'}
                    </Badge>
                    <div>
                      <div className="font-medium">{trade.symbolName}</div>
                      <div className="text-sm text-muted-foreground">{trade.symbol}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-right text-sm">
                    <div>
                      <div className="text-muted-foreground">수량</div>
                      <div className="font-medium">{trade.quantity.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">단가</div>
                      <div className="font-medium">{formatCurrency(Number(trade.price))}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">거래금액</div>
                      <div className="font-medium">{formatCurrency(Number(trade.tradeValue))}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">손익</div>
                      <div className={cn(
                        "font-medium",
                        (trade.pnl || 0) >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(trade.tradeDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}