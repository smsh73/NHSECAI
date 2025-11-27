import React, { useState, useRef, useEffect } from 'react';
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
import { useQuery, useMutation } from '@tanstack/react-query';
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
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  BarChart3,
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface QueryCondition {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  timeRange: {
    startTime: string;
    endTime: string;
  };
  days: number;
  keyword: string;
  qualityScore: number | null;
  limit: number;
}

const DEFAULT_QUERY = `SELECT 
    trend_id,
    base_date,
    base_time,
    title,
    content,
    ingest_ts
FROM nh_ai.gold.macro_market_analysis
WHERE base_date >= current_date() - INTERVAL 7 DAYS
ORDER BY base_date DESC, base_time DESC
LIMIT 100;`;

export default function DataQueryAIMarket() {
  const { toast } = useToast();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [conditions, setConditions] = useState<QueryCondition>({
    dateRange: { startDate: '', endDate: '' },
    timeRange: { startTime: '', endTime: '' },
    days: 7,
    keyword: '',
    qualityScore: null,
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
    dateRange: {
      name: '날짜 범위 조회',
      query: `SELECT 
    trend_id,
    base_date,
    base_time,
    title,
    content,
    ingest_ts
FROM nh_ai.gold.macro_market_analysis
WHERE base_date BETWEEN '{startDate}' AND '{endDate}'
ORDER BY base_date DESC, base_time DESC
LIMIT {limit};`
    },
    keyword: {
      name: '키워드 검색',
      query: `SELECT 
    trend_id,
    base_date,
    base_time,
    title,
    content,
    ingest_ts
FROM nh_ai.gold.macro_market_analysis
WHERE (content LIKE '%{keyword}%' OR title LIKE '%{keyword}%')
  AND base_date >= current_date() - INTERVAL {days} DAYS
ORDER BY base_date DESC, base_time DESC
LIMIT {limit};`
    },
    events: {
      name: '이벤트 조회',
      query: `SELECT 
    e.event_id,
    e.base_date,
    e.base_time,
    e.event_title,
    e.event_detail,
    e.news_ids,
    e.news_titles,
    e.display_cnt
FROM nh_ai.gold.market_events e
WHERE e.base_date >= current_date() - INTERVAL {days} DAYS
ORDER BY e.base_date DESC, e.base_time DESC
LIMIT {limit};`
    },
    themes: {
      name: '테마 시황 조회',
      query: `SELECT 
    t.trend_id,
    t.base_date,
    t.base_time,
    t.theme_title,
    t.code,
    t.content,
    t.bubble_scale,
    t.direction,
    t.fluctuation_rate,
    t.transaction_amt
FROM nh_ai.gold.theme_market_analysis t
WHERE t.base_date >= current_date() - INTERVAL {days} DAYS
ORDER BY t.base_date DESC, t.base_time DESC
LIMIT {limit};`
    },
    integrated: {
      name: '통합 조회',
      query: `WITH macro_data AS (
    SELECT 
        'macro' as type,
        trend_id as id,
        base_date,
        base_time,
        title as display_title,
        content,
        ingest_ts
    FROM nh_ai.gold.macro_market_analysis
    WHERE base_date >= current_date() - INTERVAL {days} DAYS
),
event_data AS (
    SELECT 
        'event' as type,
        event_id as id,
        base_date,
        base_time,
        event_title as display_title,
        event_detail as content,
        ingest_ts
    FROM nh_ai.gold.market_events
    WHERE base_date >= current_date() - INTERVAL {days} DAYS
),
theme_data AS (
    SELECT 
        'theme' as type,
        trend_id as id,
        base_date,
        base_time,
        theme_title as display_title,
        content,
        ingest_ts
    FROM nh_ai.gold.theme_market_analysis
    WHERE base_date >= current_date() - INTERVAL {days} DAYS
)
SELECT * FROM macro_data
UNION ALL
SELECT * FROM event_data
UNION ALL
SELECT * FROM theme_data
ORDER BY base_date DESC, base_time DESC
LIMIT {limit};`
    }
  };

  const applyConditionsToQuery = (templateQuery: string): string => {
    let result = templateQuery;
    
    // 날짜 범위
    if (conditions.dateRange.startDate && conditions.dateRange.endDate) {
      result = result.replace('{startDate}', conditions.dateRange.startDate);
      result = result.replace('{endDate}', conditions.dateRange.endDate);
    }
    
    // 일수
    result = result.replace(/{days}/g, conditions.days.toString());
    
    // 키워드 (SQL Injection 방지를 위해 특수문자 이스케이프)
    if (conditions.keyword) {
      // SQL LIKE 패턴에서 특수문자 이스케이프
      const escapedKeyword = conditions.keyword.replace(/'/g, "''").replace(/%/g, "\\%").replace(/_/g, "\\_");
      result = result.replace(/{keyword}/g, escapedKeyword);
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
      // 쿼리 히스토리에 추가
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
    link.setAttribute('download', `ai_market_query_${new Date().toISOString().split('T')[0]}.csv`);
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
            <BarChart3 className="w-8 h-8" />
            AI 시황 결과 데이터 쿼리
          </h1>
          <p className="text-muted-foreground mt-2">
            Databricks Gold 스키마에서 AI 시황 생성 결과를 조회하고 분석합니다.
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
              <Label>조회 기간 (일)</Label>
              <Input
                type="number"
                value={conditions.days}
                onChange={(e) => handleConditionChange('days', parseInt(e.target.value) || 7)}
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

            <div className="space-y-2">
              <Label>키워드 검색</Label>
              <Input
                placeholder="검색할 키워드 입력"
                value={conditions.keyword}
                onChange={(e) => handleConditionChange('keyword', e.target.value)}
              />
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
                          {results.map((row: any, rowIndex: number) => (
                            <TableRow key={rowIndex}>
                              {Object.keys(results[0] || {}).map((key) => {
                                const value = row[key];
                                const displayValue = value === null || value === undefined 
                                  ? '-' 
                                  : typeof value === 'object' 
                                    ? JSON.stringify(value, null, 2)
                                    : String(value);
                                
                                return (
                                  <TableCell key={key} className="max-w-[300px]">
                                    <div className="truncate" title={displayValue}>
                                      {displayValue}
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
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

