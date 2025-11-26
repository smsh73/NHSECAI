import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useState } from "react";
import { TrendingUp, TrendingDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface HoldingsChartProps {
  data: {
    holdings: Array<{
      symbol: string;
      symbolName: string;
      quantity: number;
      value: number;
      percentage: number;
      avgPrice: number;
      currentPrice: number;
      change: number;
      changePercent: number;
      sector: string;
    }>;
    chartData: {
      pieData: Array<{
        name: string;
        value: number;
        color: string;
      }>;
      barData: Array<{
        symbol: string;
        value: number;
        return: number;
        returnPercent: number;
      }>;
    };
  };
  viewType: 'pie' | 'bar' | 'table';
  onViewTypeChange: (type: 'pie' | 'bar' | 'table') => void;
  sortBy: 'value' | 'return' | 'symbol';
  onSortChange: (sort: 'value' | 'return' | 'symbol') => void;
  isLoading?: boolean;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00c49f', '#8dd1e1', '#d084d0', '#ffb366'];

export function HoldingsChart({
  data,
  viewType,
  onViewTypeChange,
  sortBy,
  onSortChange,
  isLoading
}: HoldingsChartProps) {
  const [selectedSector, setSelectedSector] = useState<string>('all');

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
            <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
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

  const sectors = ['all', ...Array.from(new Set(data.holdings.map(h => h.sector)))];
  const filteredHoldings = selectedSector === 'all' 
    ? data.holdings 
    : data.holdings.filter(h => h.sector === selectedSector);

  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return b.value - a.value;
      case 'return':
        return b.change - a.change;
      case 'symbol':
        return a.symbol.localeCompare(b.symbol);
      default:
        return 0;
    }
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === '수익률' ? formatPercent(entry.value) : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full" data-testid="holdings-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">보유종목 현황</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-32" data-testid="sector-filter">
                <SelectValue placeholder="섹터 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {sectors.slice(1).map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-24" data-testid="sort-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">금액순</SelectItem>
                <SelectItem value="return">수익순</SelectItem>
                <SelectItem value="symbol">종목순</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg">
              <Button
                variant={viewType === 'pie' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewTypeChange('pie')}
                data-testid="view-pie"
              >
                파이
              </Button>
              <Button
                variant={viewType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewTypeChange('bar')}
                data-testid="view-bar"
              >
                막대
              </Button>
              <Button
                variant={viewType === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewTypeChange('table')}
                data-testid="view-table"
              >
                표
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewType === 'pie' && (
          <div className="h-64" data-testid="pie-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.chartData.pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.chartData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewType === 'bar' && (
          <div className="h-64" data-testid="bar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData.barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="symbol" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="value" name="보유금액" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="returnPercent" name="수익률" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewType === 'table' && (
          <div className="space-y-4" data-testid="holdings-table">
            {sortedHoldings.map((holding) => (
              <div 
                key={holding.symbol} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                data-testid={`holding-row-${holding.symbol}`}
              >
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-medium">{holding.symbolName}</div>
                    <div className="text-sm text-muted-foreground">{holding.symbol}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {holding.sector}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-6 text-right">
                  <div>
                    <div className="text-sm text-muted-foreground">보유수량</div>
                    <div className="font-medium">{holding.quantity.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">평가금액</div>
                    <div className="font-medium">{formatCurrency(holding.value)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">현재가</div>
                    <div className="font-medium">{formatCurrency(holding.currentPrice)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">수익률</div>
                    <div className={cn(
                      "font-medium flex items-center",
                      holding.change >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {holding.change >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {formatPercent(holding.changePercent)}
                    </div>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" data-testid={`holding-menu-${holding.symbol}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}