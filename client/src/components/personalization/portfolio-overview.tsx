import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioOverviewProps {
  portfolioData: {
    totalValue: number;
    totalReturn: number;
    totalReturnPercent: number;
    dayChange: number;
    dayChangePercent: number;
    topHoldings: Array<{
      symbol: string;
      symbolName: string;
      value: number;
      percentage: number;
      change: number;
      changePercent: number;
    }>;
    sectorDistribution: Array<{
      sector: string;
      percentage: number;
      value: number;
    }>;
  };
  isLoading?: boolean;
}

export function PortfolioOverview({ portfolioData, isLoading }: PortfolioOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
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

  return (
    <div className="space-y-6" data-testid="portfolio-overview">
      {/* 포트폴리오 요약 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 총 자산 */}
        <Card data-testid="total-value-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 자산
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-value">
              {formatCurrency(portfolioData.totalValue)}
            </div>
            <div className={cn(
              "flex items-center text-sm mt-1",
              portfolioData.dayChange >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {portfolioData.dayChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span data-testid="day-change">
                {formatCurrency(portfolioData.dayChange)} ({formatPercent(portfolioData.dayChangePercent)})
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 총 수익률 */}
        <Card data-testid="total-return-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 수익률
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              portfolioData.totalReturn >= 0 ? "text-green-600" : "text-red-600"
            )} data-testid="total-return">
              {formatCurrency(portfolioData.totalReturn)}
            </div>
            <div className={cn(
              "text-sm mt-1",
              portfolioData.totalReturnPercent >= 0 ? "text-green-600" : "text-red-600"
            )}>
              <span data-testid="total-return-percent">
                {formatPercent(portfolioData.totalReturnPercent)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 보유 종목 수 */}
        <Card data-testid="holdings-count-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              보유 종목
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="holdings-count">
              {portfolioData.topHoldings.length}개
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              활성 보유 종목
            </div>
          </CardContent>
        </Card>

        {/* 섹터 분산도 */}
        <Card data-testid="sector-diversity-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              섹터 분산
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="sector-count">
              {portfolioData.sectorDistribution.length}개
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              투자 섹터
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상위 보유종목 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="top-holdings-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">상위 보유종목</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioData.topHoldings.slice(0, 5).map((holding, index) => (
                <div key={holding.symbol} className="flex items-center justify-between" data-testid={`holding-${holding.symbol}`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{holding.symbolName}</div>
                      <div className="text-xs text-muted-foreground">{holding.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">{formatCurrency(holding.value)}</div>
                    <div className={cn(
                      "text-xs",
                      holding.change >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatPercent(holding.changePercent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 섹터 분포 */}
        <Card data-testid="sector-distribution-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">섹터 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolioData.sectorDistribution.map((sector, index) => (
                <div key={sector.sector} className="space-y-2" data-testid={`sector-${sector.sector.replace(' ', '-').toLowerCase()}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{sector.sector}</span>
                    <Badge variant="secondary" className="text-xs">
                      {sector.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={sector.percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {formatCurrency(sector.value)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}