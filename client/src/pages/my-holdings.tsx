import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoldingsChart } from "@/components/personalization/holdings-chart";
import { PortfolioOverview } from "@/components/personalization/portfolio-overview";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  type UserBalance, 
  type BalanceInsights 
} from "@shared/schema";
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Download,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types based on backend API responses and schema
interface PortfolioData {
  totalValue?: number;
  totalPnl?: number;
  totalPnlPercent?: number;
  dayChange?: number;
  dayChangePercent?: number;
  topHoldings?: Array<{
    symbol: string;
    symbolName: string;
    marketValue: number;
    portfolioWeight: number;
    pnl: number;
    pnlPercent: number;
  }>;
  sectorDistribution?: Array<{
    sector: string;
    percentage: number;
    value: number;
  }>;
}

export default function MyHoldings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'return' | 'symbol'>('value');
  const [viewType, setViewType] = useState<'pie' | 'bar' | 'table'>('table');
  const [filterSector, setFilterSector] = useState<string>('all');
  
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
              보유종목 관리를 이용하시려면 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Portfolio data from backend API
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ['/api/personalization', userId, 'portfolio'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/personalization/${userId}/portfolio`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data');
      }
      return await response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });

  // Holdings details from backend API
  const { data: holdingsDetails, isLoading: holdingsLoading } = useQuery<UserBalance[]>({
    queryKey: ['/api/balances', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/balances?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch holdings details');
      }
      const data = await response.json();
      // Handle both array and object responses
      return Array.isArray(data) ? data : data.balances || data.holdings || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });

  // Transform holdings data for chart component
  const chartHoldings = holdingsDetails?.map(holding => ({
    symbol: holding.symbol,
    symbolName: holding.symbolName || holding.symbol,
    quantity: Number(holding.quantity) || 0,
    value: Number(holding.marketValue) || Number(holding.currentPrice) * Number(holding.quantity) || 0,
    percentage: 0, // Will be calculated based on total
    avgPrice: Number(holding.avgPrice) || Number(holding.currentPrice) || 0,
    currentPrice: Number(holding.currentPrice) || 0,
    change: Number(holding.pnl) || 0,
    changePercent: Number(holding.pnlPercent) || 0,
    sector: holding.sectorName || holding.sector || '기타'
  })) || [];

  // Calculate total value for percentage calculation
  const totalValue = chartHoldings.reduce((sum, h) => sum + h.value, 0);
  const chartHoldingsWithPercentage = chartHoldings.map(h => ({
    ...h,
    percentage: totalValue > 0 ? (h.value / totalValue) * 100 : 0
  }));

  // Chart data based on real holdings data
  const chartData = {
    holdings: chartHoldingsWithPercentage,
    chartData: {
      pieData: chartHoldingsWithPercentage.map((holding, index) => ({
        name: holding.symbolName,
        value: holding.value,
        color: `hsl(${index * 72}, 70%, 50%)`
      })),
      barData: chartHoldingsWithPercentage.map(holding => ({
        symbol: holding.symbol,
        value: holding.value,
        return: holding.change,
        returnPercent: holding.changePercent
      }))
    }
  };

  // Filtered holdings based on search and sector filters
  const filteredHoldings = holdingsDetails?.filter(holding => {
    const matchesSearch = searchTerm === '' || 
      holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (holding.symbolName && holding.symbolName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSector = filterSector === 'all' || holding.sectorName === filterSector;
    return matchesSearch && matchesSector;
  }) || [];

  const sectors = ['all', ...Array.from(new Set(holdingsDetails?.map(h => h.sectorName).filter(Boolean) || []))]; 

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

  // Data refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      // Force refresh by invalidating queries
      queryClient.invalidateQueries({ queryKey: ['/api/balances', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'portfolio'] });
      return true;
    },
    onSuccess: () => {
      toast({
        title: "데이터가 새로고침되었습니다.",
        description: "최신 보유종목 정보를 가져왔습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "새로고침에 실패했습니다.",
        description: "데이터를 새로고침하는데 문제가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Export holdings data to CSV
  const exportData = () => {
    if (!holdingsDetails || holdingsDetails.length === 0) {
      toast({
        title: "내보낼 데이터가 없습니다.",
        description: "보유종목이 없어서 내보낼 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    const csvData = holdingsDetails.map(holding => ({
      종목코드: holding.symbol,
      종목명: holding.symbolName || '',
      보유수량: Number(holding.quantity),
      평균단가: Number(holding.avgCost),
      현재가: Number(holding.currentPrice) || 0,
      평가금액: Number(holding.marketValue) || 0,
      손익금액: Number(holding.pnl) || 0,
      손익률: Number(holding.pnlPercent) || 0,
      섹터: holding.sectorName || '',
      날짜: holding.date || ''
    }));
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `보유종목_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "데이터가 내보내졌습니다.",
      description: "CSV 파일이 다운로드되었습니다.",
    });
  };

  return (
    <div className="w-full px-6 py-6 space-y-6" data-testid="my-holdings">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            보유종목 관리
          </h1>
          <p className="text-muted-foreground mt-1">
            현재 보유 중인 종목의 상세 정보와 성과를 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="refresh-button"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshMutation.isPending && "animate-spin")} />
            새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={exportData} data-testid="export-button">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 포트폴리오 개요 */}
      <PortfolioOverview
        portfolioData={portfolioData as any}
        isLoading={portfolioLoading}
      />

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <CardTitle>보유종목 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="종목명 또는 코드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-32" data-testid="sector-filter">
                <SelectValue placeholder="섹터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {sectors.slice(1).map(sector => (
                  <SelectItem key={sector} value={sector || ''}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: 'value' | 'return' | 'symbol') => setSortBy(value)}>
              <SelectTrigger className="w-32" data-testid="sort-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">금액순</SelectItem>
                <SelectItem value="return">수익순</SelectItem>
                <SelectItem value="symbol">종목순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 보유종목 차트 */}
      <HoldingsChart
        data={chartData as any}
        viewType={viewType}
        onViewTypeChange={setViewType}
        sortBy={sortBy}
        onSortChange={setSortBy}
        isLoading={holdingsLoading}
      />

      {/* 상세 보유종목 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>보유종목 상세 정보</CardTitle>
        </CardHeader>
        <CardContent>
          {holdingsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHoldings.map((holding) => (
                <div
                  key={holding.symbol}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`holding-detail-${holding.symbol}`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                    {/* 종목 정보 */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium text-lg">{holding.symbolName || holding.symbol}</div>
                          <div className="text-sm text-muted-foreground">{holding.symbol}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            {holding.sectorName && (
                              <Badge variant="outline" className="text-xs">{holding.sectorName}</Badge>
                            )}
                            {holding.market && (
                              <Badge variant="secondary" className="text-xs">{holding.market}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 수량 및 가격 정보 */}
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">보유수량</div>
                      <div className="font-medium">{Number(holding.quantity)?.toLocaleString() || 0}주</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        평균 {formatCurrency(Number(holding.avgCost) || 0)}
                      </div>
                    </div>

                    {/* 현재가 */}
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">현재가</div>
                      <div className="font-medium">{formatCurrency(Number(holding.currentPrice) || 0)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {holding.date && `업데이트: ${new Date(holding.date).toLocaleDateString()}`}
                      </div>
                    </div>

                    {/* 평가금액 */}
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">평가금액</div>
                      <div className="font-medium">{formatCurrency(Number(holding.marketValue) || 0)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        비중 {Number(holding.portfolioWeight)?.toFixed(1) || 0}%
                      </div>
                    </div>

                    {/* 손익 */}
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">손익</div>
                      <div className={cn(
                        "font-medium flex items-center justify-center",
                        Number(holding.pnl) >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {Number(holding.pnl) >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        <div>
                          <div>{formatCurrency(Number(holding.pnl) || 0)}</div>
                          <div className="text-xs">{formatPercent(Number(holding.pnlPercent) || 0)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 추가 정보 */}
                  <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                    <div>날짜: {holding.date ? new Date(holding.date).toLocaleDateString() : 'N/A'}</div>
                    <div>사용자: {holding.userId}</div>
                    <div>업데이트: {holding.updatedAt ? new Date(holding.updatedAt).toLocaleDateString() : 'N/A'}</div>
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