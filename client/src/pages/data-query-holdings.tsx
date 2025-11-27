import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Play, 
  Loader2, 
  Download, 
  Copy, 
  CheckCircle2, 
  XCircle,
  Wallet,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface QueryCondition {
  userId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  days: number;
  minProfitRate: number | null;
  maxProfitRate: number | null;
  minRiskScore: number | null;
  maxRiskScore: number | null;
  minHoldingsCount: number | null;
  maxHoldingsCount: number | null;
  limit: number;
}

const DEFAULT_QUERY = `SELECT 
    analysis_id,
    user_id,
    analysis_date,
    analysis_time,
    total_value,
    total_profit_loss,
    total_profit_loss_rate,
    holdings_count,
    top_holdings,
    sector_distribution,
    risk_score,
    recommendations,
    ingest_ts
FROM nh_ai.gold.holdings_analysis
WHERE analysis_date >= current_date() - INTERVAL 30 DAYS
ORDER BY analysis_date DESC, analysis_time DESC
LIMIT 100;`;

export default function DataQueryHoldings() {
  const { toast } = useToast();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [conditions, setConditions] = useState<QueryCondition>({
    userId: '',
    dateRange: { startDate: '', endDate: '' },
    days: 30,
    minProfitRate: null,
    maxProfitRate: null,
    minRiskScore: null,
    maxRiskScore: null,
    minHoldingsCount: null,
    maxHoldingsCount: null,
    limit: 100
  });
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [selectedQueryTemplate, setSelectedQueryTemplate] = useState<string>('basic');
  const queryTextareaRef = useRef<HTMLTextAreaElement>(null);

  const queryTemplates = {
    basic: {
      name: '기본 조회',
      query: DEFAULT_QUERY
    },
    userSpecific: {
      name: '사용자별 조회',
      query: `SELECT 
    analysis_id,
    user_id,
    analysis_date,
    analysis_time,
    total_value,
    total_profit_loss,
    total_profit_loss_rate,
    holdings_count,
    risk_score
FROM nh_ai.gold.holdings_analysis
WHERE user_id = '{userId}'
  AND analysis_date >= current_date() - INTERVAL {days} DAYS
ORDER BY analysis_date DESC, analysis_time DESC
LIMIT {limit};`
    },
    profitFilter: {
      name: '수익률 필터',
      query: `SELECT 
    analysis_id,
    user_id,
    analysis_date,
    analysis_time,
    total_value,
    total_profit_loss,
    total_profit_loss_rate,
    holdings_count,
    risk_score
FROM nh_ai.gold.holdings_analysis
WHERE total_profit_loss_rate >= {minProfitRate}
  AND analysis_date >= current_date() - INTERVAL {days} DAYS
ORDER BY total_profit_loss_rate DESC
LIMIT {limit};`
    },
    lossFilter: {
      name: '손실 포지션',
      query: `SELECT 
    analysis_id,
    user_id,
    analysis_date,
    analysis_time,
    total_value,
    total_profit_loss,
    total_profit_loss_rate,
    holdings_count,
    risk_score
FROM nh_ai.gold.holdings_analysis
WHERE total_profit_loss < 0
  AND analysis_date >= current_date() - INTERVAL {days} DAYS
ORDER BY total_profit_loss ASC
LIMIT {limit};`
    },
    riskFilter: {
      name: '리스크 점수 필터',
      query: `SELECT 
    analysis_id,
    user_id,
    analysis_date,
    analysis_time,
    total_value,
    total_profit_loss,
    total_profit_loss_rate,
    holdings_count,
    risk_score
FROM nh_ai.gold.holdings_analysis
WHERE risk_score >= {minRiskScore}
  AND analysis_date >= current_date() - INTERVAL {days} DAYS
ORDER BY risk_score DESC
LIMIT {limit};`
    },
    sectorDistribution: {
      name: '섹터별 분포',
      query: `SELECT 
    analysis_id,
    user_id,
    analysis_date,
    sector_distribution,
    JSON_EXTRACT_PATH_TEXT(sector_distribution, 'technology') as tech_percentage,
    JSON_EXTRACT_PATH_TEXT(sector_distribution, 'finance') as finance_percentage,
    JSON_EXTRACT_PATH_TEXT(sector_distribution, 'healthcare') as healthcare_percentage
FROM nh_ai.gold.holdings_analysis
WHERE analysis_date >= current_date() - INTERVAL {days} DAYS
ORDER BY analysis_date DESC
LIMIT {limit};`
    },
    topHoldings: {
      name: '상위 보유 종목',
      query: `SELECT 
    analysis_id,
    user_id,
    analysis_date,
    top_holdings,
    JSON_ARRAY_LENGTH(top_holdings) as holdings_count
FROM nh_ai.gold.holdings_analysis
WHERE analysis_date >= current_date() - INTERVAL {days} DAYS
  AND JSON_ARRAY_LENGTH(top_holdings) > 0
ORDER BY analysis_date DESC
LIMIT {limit};`
    },
    statistics: {
      name: '통계 집계',
      query: `SELECT 
    analysis_date,
    COUNT(*) as analysis_count,
    AVG(total_value) as avg_total_value,
    AVG(total_profit_loss_rate) as avg_profit_loss_rate,
    AVG(risk_score) as avg_risk_score,
    AVG(holdings_count) as avg_holdings_count
FROM nh_ai.gold.holdings_analysis
WHERE analysis_date >= current_date() - INTERVAL {days} DAYS
GROUP BY analysis_date
ORDER BY analysis_date DESC;`
    }
  };

  const applyConditionsToQuery = (templateQuery: string): string => {
    let result = templateQuery;
    
    // 사용자 ID (SQL Injection 방지를 위해 특수문자 이스케이프)
    if (conditions.userId) {
      // SQL 문자열에서 작은따옴표 이스케이프
      const escapedUserId = conditions.userId.replace(/'/g, "''");
      result = result.replace('{userId}', escapedUserId);
    }
    
    // 날짜 범위
    if (conditions.dateRange.startDate && conditions.dateRange.endDate) {
      result = result.replace('{startDate}', conditions.dateRange.startDate);
      result = result.replace('{endDate}', conditions.dateRange.endDate);
    }
    
    // 일수
    result = result.replace(/{days}/g, conditions.days.toString());
    
    // 수익률
    if (conditions.minProfitRate !== null) {
      result = result.replace('{minProfitRate}', conditions.minProfitRate.toString());
    }
    if (conditions.maxProfitRate !== null) {
      result = result.replace('{maxProfitRate}', conditions.maxProfitRate.toString());
    }
    
    // 리스크 점수
    if (conditions.minRiskScore !== null) {
      result = result.replace('{minRiskScore}', conditions.minRiskScore.toString());
    }
    if (conditions.maxRiskScore !== null) {
      result = result.replace('{maxRiskScore}', conditions.maxRiskScore.toString());
    }
    
    // 제한
    result = result.replace(/{limit}/g, conditions.limit.toString());
    
    return result;
  };

  const executeQueryMutation = useMutation({
    mutationFn: async (sql: string) => {
      const response = await apiRequest('POST', '/api/azure/databricks/query', {
        sql,
        maxRows: conditions.limit || 1000
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Query execution failed' }));
        throw new Error(error.error || error.message || 'Query execution failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "쿼리 실행 성공",
        description: `${data.data?.length || 0}건의 결과를 조회했습니다.`,
      });
      setQueryHistory(prev => [query, ...prev.slice(0, 9)]);
    },
    onError: (error: any) => {
      toast({
        title: "쿼리 실행 실패",
        description: error.message || "쿼리 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleTemplateChange = (templateKey: string) => {
    setSelectedQueryTemplate(templateKey);
    const template = queryTemplates[templateKey as keyof typeof queryTemplates];
    if (template) {
      const appliedQuery = applyConditionsToQuery(template.query);
      setQuery(appliedQuery);
    }
  };

  const handleConditionChange = (key: keyof QueryCondition, value: any) => {
    setConditions(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyConditions = () => {
    const template = queryTemplates[selectedQueryTemplate as keyof typeof queryTemplates];
    if (template) {
      const appliedQuery = applyConditionsToQuery(template.query);
      setQuery(appliedQuery);
      toast({
        title: "조건 적용 완료",
        description: "쿼리에 조건이 적용되었습니다.",
      });
    }
  };

  const handleExecute = () => {
    if (!query.trim()) {
      toast({
        title: "오류",
        description: "쿼리를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    executeQueryMutation.mutate(query);
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(query);
    toast({
      title: "복사 완료",
      description: "쿼리가 클립보드에 복사되었습니다.",
    });
  };

  const handleExportCSV = () => {
    if (!executeQueryMutation.data?.data) {
      toast({
        title: "오류",
        description: "내보낼 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const data = executeQueryMutation.data.data;
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
      }).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `holdings_analysis_query_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "내보내기 완료",
      description: "CSV 파일이 다운로드되었습니다.",
    });
  };

  const results = executeQueryMutation.data?.data || [];
  const isLoading = executeQueryMutation.isPending;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="w-8 h-8" />
            잔고 분석 결과 데이터 쿼리
          </h1>
          <p className="text-muted-foreground mt-2">
            Databricks Gold 스키마에서 잔고 분석 결과를 조회하고 분석합니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 조건 설정 패널 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              조회 조건 설정
            </CardTitle>
            <CardDescription>
              쿼리 조건을 설정하여 원하는 데이터를 조회하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>쿼리 템플릿</Label>
              <Select value={selectedQueryTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(queryTemplates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>사용자 ID</Label>
              <Input
                placeholder="user123"
                value={conditions.userId}
                onChange={(e) => handleConditionChange('userId', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>조회 기간 (일)</Label>
              <Input
                type="number"
                value={conditions.days}
                onChange={(e) => handleConditionChange('days', parseInt(e.target.value) || 30)}
                min={1}
                max={365}
              />
            </div>

            <div className="space-y-2">
              <Label>시작 날짜</Label>
              <Input
                type="date"
                value={conditions.dateRange.startDate}
                onChange={(e) => handleConditionChange('dateRange', { ...conditions.dateRange, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>종료 날짜</Label>
              <Input
                type="date"
                value={conditions.dateRange.endDate}
                onChange={(e) => handleConditionChange('dateRange', { ...conditions.dateRange, endDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>최소 수익률 (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={conditions.minProfitRate || ''}
                  onChange={(e) => handleConditionChange('minProfitRate', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>최대 수익률 (%)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={conditions.maxProfitRate || ''}
                  onChange={(e) => handleConditionChange('maxProfitRate', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>최소 리스크 점수</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={conditions.minRiskScore || ''}
                  onChange={(e) => handleConditionChange('minRiskScore', e.target.value ? parseInt(e.target.value) : null)}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>최대 리스크 점수</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={conditions.maxRiskScore || ''}
                  onChange={(e) => handleConditionChange('maxRiskScore', e.target.value ? parseInt(e.target.value) : null)}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>결과 제한 (행)</Label>
              <Input
                type="number"
                value={conditions.limit}
                onChange={(e) => handleConditionChange('limit', parseInt(e.target.value) || 100)}
                min={1}
                max={10000}
              />
            </div>

            <Button onClick={handleApplyConditions} className="w-full" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              조건 적용
            </Button>
          </CardContent>
        </Card>

        {/* 쿼리 편집 및 결과 패널 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  SQL 쿼리 편집기
                </CardTitle>
                <CardDescription>
                  SQL 쿼리를 작성하고 실행하여 결과를 확인하세요.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyQuery}
                  disabled={!query.trim()}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  복사
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExecute}
                  disabled={isLoading || !query.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      실행 중...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      실행
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="query" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="query">쿼리 편집</TabsTrigger>
                <TabsTrigger value="results">
                  결과
                  {results.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {results.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="query" className="space-y-4">
                <div className="space-y-2">
                  <Label>SQL 쿼리</Label>
                  <Textarea
                    ref={queryTextareaRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="font-mono text-sm min-h-[400px]"
                    placeholder="SELECT 쿼리를 입력하세요..."
                  />
                </div>

                {queryHistory.length > 0 && (
                  <div className="space-y-2">
                    <Label>최근 쿼리 히스토리</Label>
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-1">
                        {queryHistory.map((historyQuery, index) => (
                          <div
                            key={index}
                            className="text-xs font-mono p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => setQuery(historyQuery)}
                          >
                            {historyQuery.substring(0, 100)}...
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="results" className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-2">쿼리 실행 중...</span>
                  </div>
                ) : executeQueryMutation.isError ? (
                  <Alert variant="destructive">
                    <XCircle className="w-4 h-4" />
                    <AlertDescription>
                      {executeQueryMutation.error?.message || '쿼리 실행 중 오류가 발생했습니다.'}
                    </AlertDescription>
                  </Alert>
                ) : results.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>실행된 쿼리 결과가 없습니다.</p>
                    <p className="text-sm mt-2">쿼리를 작성하고 실행 버튼을 클릭하세요.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="font-medium">
                          {results.length}건의 결과를 조회했습니다.
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleExportCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        CSV 내보내기
                      </Button>
                    </div>

                    <ScrollArea className="h-[600px] border rounded-md">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            {Object.keys(results[0] || {}).map((key) => (
                              <TableHead key={key} className="font-semibold">
                                {key}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map((row: any, rowIndex: number) => {
                            const profitLossRate = row.total_profit_loss_rate;
                            const isProfit = profitLossRate && profitLossRate > 0;
                            const isLoss = profitLossRate && profitLossRate < 0;
                            
                            return (
                              <TableRow key={rowIndex}>
                                {Object.keys(results[0] || {}).map((key) => {
                                  const value = row[key];
                                  const displayValue = value === null || value === undefined 
                                    ? '-' 
                                    : typeof value === 'object' 
                                      ? JSON.stringify(value, null, 2)
                                      : String(value);
                                  
                                  // 수익률 컬럼에 색상 적용
                                  const isProfitLossColumn = key === 'total_profit_loss_rate' || key === 'total_profit_loss';
                                  
                                  return (
                                    <TableCell 
                                      key={key} 
                                      className={`max-w-[300px] ${
                                        isProfitLossColumn && isProfit ? 'text-green-600 font-semibold' :
                                        isProfitLossColumn && isLoss ? 'text-red-600 font-semibold' :
                                        ''
                                      }`}
                                    >
                                      <div className="truncate" title={displayValue}>
                                        {displayValue}
                                      </div>
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

