import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts';
import { useState } from "react";
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradeHistoryChartProps {
  data: {
    trades: Array<{
      id: string;
      tradeDate: string;
      symbol: string;
      symbolName: string;
      side: 'buy' | 'sell';
      quantity: number;
      price: number;
      tradeValue: number;
      commission: number;
      profit?: number;
      profitPercent?: number;
    }>;
    monthlyStats: Array<{
      month: string;
      totalTrades: number;
      totalValue: number;
      profit: number;
      profitPercent: number;
      winRate: number;
    }>;
    performanceData: Array<{
      date: string;
      portfolioValue: number;
      cumulativeReturn: number;
      benchmarkReturn: number;
    }>;
  };
  timeRange: '1M' | '3M' | '6M' | '1Y';
  onTimeRangeChange: (range: '1M' | '3M' | '6M' | '1Y') => void;
  chartType: 'performance' | 'trades' | 'monthly';
  onChartTypeChange: (type: 'performance' | 'trades' | 'monthly') => void;
  isLoading?: boolean;
}

export function TradeHistoryChart({
  data,
  timeRange,
  onTimeRangeChange,
  chartType,
  onChartTypeChange,
  isLoading
}: TradeHistoryChartProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted rounded w-40 animate-pulse"></div>
            <div className="flex space-x-2">
              <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
              <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

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

  const symbols = ['all', ...Array.from(new Set(data.trades.map(t => t.symbol)))];
  const filteredTrades = selectedSymbol === 'all' 
    ? data.trades 
    : data.trades.filter(t => t.symbol === selectedSymbol);

  // 최근 거래 현황 통계
  const totalTrades = filteredTrades.length;
  const buyTrades = filteredTrades.filter(t => t.side === 'buy').length;
  const sellTrades = filteredTrades.filter(t => t.side === 'sell').length;
  const totalValue = filteredTrades.reduce((sum, t) => sum + t.tradeValue, 0);
  const avgTradeValue = totalTrades > 0 ? totalValue / totalTrades : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.name.includes('수익률') || entry.name.includes('Return') 
                  ? formatPercent(entry.value) 
                  : formatCurrency(entry.value)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full" data-testid="trade-history-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">매매이력 분석</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-32" data-testid="symbol-filter">
                <SelectValue placeholder="종목 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {symbols.slice(1).map(symbol => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="w-20" data-testid="time-range-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">1개월</SelectItem>
                <SelectItem value="3M">3개월</SelectItem>
                <SelectItem value="6M">6개월</SelectItem>
                <SelectItem value="1Y">1년</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg">
              <Button
                variant={chartType === 'performance' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onChartTypeChange('performance')}
                data-testid="chart-performance"
              >
                수익률
              </Button>
              <Button
                variant={chartType === 'trades' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onChartTypeChange('trades')}
                data-testid="chart-trades"
              >
                거래량
              </Button>
              <Button
                variant={chartType === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onChartTypeChange('monthly')}
                data-testid="chart-monthly"
              >
                월별
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 거래 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg" data-testid="total-trades-stat">
            <div className="text-2xl font-bold text-primary">{totalTrades}</div>
            <div className="text-sm text-muted-foreground">총 거래</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg" data-testid="buy-sell-ratio">
            <div className="text-2xl font-bold text-blue-600">{buyTrades}:{sellTrades}</div>
            <div className="text-sm text-muted-foreground">매수:매도</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg" data-testid="total-value-stat">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
            <div className="text-sm text-muted-foreground">총 거래대금</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg" data-testid="avg-trade-value">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(avgTradeValue)}</div>
            <div className="text-sm text-muted-foreground">평균 거래금액</div>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="h-80">
          {chartType === 'performance' && (
            <ResponsiveContainer width="100%" height="100%" data-testid="performance-chart">
              <LineChart data={data.performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cumulativeReturn" 
                  name="누적 수익률" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="benchmarkReturn" 
                  name="벤치마크 수익률" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {chartType === 'trades' && (
            <ResponsiveContainer width="100%" height="100%" data-testid="trades-chart">
              <AreaChart data={data.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="totalValue" 
                  name="월별 거래대금" 
                  stackId="1"
                  stroke="#8884d8" 
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartType === 'monthly' && (
            <ResponsiveContainer width="100%" height="100%" data-testid="monthly-chart">
              <BarChart data={data.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="profit" name="월별 수익" fill="#82ca9d" />
                <Bar yAxisId="right" dataKey="winRate" name="승률 (%)" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 최근 거래 이력 */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">최근 거래 이력</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredTrades.slice(0, 10).map((trade) => (
              <div 
                key={trade.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
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
                    <div className="font-medium text-sm">{trade.symbolName}</div>
                    <div className="text-xs text-muted-foreground">{trade.symbol}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-right text-sm">
                  <div>
                    <div className="text-muted-foreground">수량</div>
                    <div className="font-medium">{trade.quantity.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">단가</div>
                    <div className="font-medium">{formatCurrency(trade.price)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">거래금액</div>
                    <div className="font-medium">{formatCurrency(trade.tradeValue)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">일자</div>
                    <div className="font-medium">{new Date(trade.tradeDate).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}