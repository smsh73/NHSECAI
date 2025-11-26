import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, 
  Search, 
  Download,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Calendar,
  Database,
  Settings,
  Activity,
  BarChart3,
  Bug,
  Code,
  Power,
  PowerOff,
  CheckCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogEntry {
  id: string;
  timestamp: string;
  logLevel?: 'info' | 'warn' | 'error' | 'debug';
  logCategory?: string;
  logType?: string;
  level?: 'info' | 'warn' | 'error'; // Compatibility with old format
  category?: string; // Compatibility with old format
  caller?: string;
  callee?: string;
  endpoint?: string;
  method?: string;
  status?: string;
  httpStatusCode?: number;
  executionTimeMs?: number;
  errorMessage?: string;
  errorCode?: string;
  errorStack?: string;
  successMessage?: string;
  successCode?: string;
  message?: string; // Compatibility
  metadata?: any;
  userId?: string;
  username?: string;
  userIp?: string;
  ip?: string; // Compatibility
  stack?: string; // Compatibility
  error?: any; // Compatibility
  requestData?: any;
  responseData?: any;
}

interface ErrorPattern {
  pattern: string;
  count: number;
  samples: LogEntry[];
  category: string;
  level: string;
}

export default function LogViewer() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'ops';
  
  // Filter state
  const [searchKeyword, setSearchKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("today");
  const [selectedTab, setSelectedTab] = useState<string>("logs");
  
  // Logging settings
  const { data: loggingSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/logging-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/logging-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch logging settings');
      }
      const data = await response.json();
      return data.settings || [];
    },
  });
  
  const enableLoggingSetting = loggingSettings?.find((s: any) => s.settingKey === 'enable_logging');
  const isLoggingEnabled = enableLoggingSetting?.settingValue === true || enableLoggingSetting?.settingValue === 'true' || enableLoggingSetting?.settingValue === true;
  
  // Toggle logging setting mutation
  const toggleLoggingMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest('PUT', `/api/logging-settings/enable_logging`, {
        value: enabled,
        description: '전체 로깅 활성화/비활성화'
      });
      if (!response.ok) {
        throw new Error('Failed to update logging setting');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logging-settings'] });
      toast({
        title: isLoggingEnabled ? "로깅 비활성화" : "로깅 활성화",
        description: isLoggingEnabled ? "로깅이 비활성화되었습니다." : "로깅이 활성화되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "설정 업데이트 실패",
        description: error.message || "로깅 설정 업데이트에 실패했습니다.",
      });
    },
  });

  // Fetch application logs from PostgreSQL
  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/application-logs', levelFilter, categoryFilter, dateRange, searchKeyword],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (levelFilter && levelFilter !== "all") params.append('logLevel', levelFilter);
      if (categoryFilter && categoryFilter !== "all") params.append('logCategory', categoryFilter);
      if (dateRange && dateRange !== "all") {
        const cutoff = new Date();
        switch (dateRange) {
          case "today":
            cutoff.setHours(0, 0, 0, 0);
            break;
          case "week":
            cutoff.setDate(cutoff.getDate() - 7);
            break;
          case "month":
            cutoff.setDate(cutoff.getDate() - 30);
            break;
        }
        params.append('startDate', cutoff.toISOString());
      }
      if (searchKeyword) {
        // Use endpoint search for keyword
        params.append('endpoint', searchKeyword);
      }
      params.append('limit', '1000');
      
      const response = await apiRequest('GET', `/api/application-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch application logs');
      }
      const data = await response.json();
      return data.logs || [];
    },
  });

  const handleDownload = (format: 'json' | 'csv' | 'txt') => {
    const logs = logsData || [];
    let content = '';
    let filename = `logs_${new Date().toISOString().split('T')[0]}`;
    let mimeType = 'text/plain';

    switch (format) {
      case 'json':
        content = JSON.stringify(logs, null, 2);
        filename += '.json';
        mimeType = 'application/json';
        break;
      
      case 'csv':
        const headers = ['Timestamp', 'Level', 'Category', 'Message'];
        const rows = logs.map((log: LogEntry) => [
          log.timestamp || '',
          log.level || '',
          log.category || '',
          `"${(log.message || '').replace(/"/g, '""')}"`
        ]);
        content = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
        filename += '.csv';
        mimeType = 'text/csv';
        break;
      
      case 'txt':
        content = logs.map((log: LogEntry) => 
          `[${log.timestamp || ''}] [${(log.level || '').toUpperCase()}] [${log.category || ''}] ${log.message || ''}`
        ).join('\n');
        filename += '.txt';
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "다운로드 완료",
      description: `${filename} 파일이 다운로드되었습니다.`,
    });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'default';
      case 'info': return 'secondary';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return <Settings className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'api': return <Activity className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Parse stack trace
  const parseStackTrace = (stack: string | undefined): Array<{ file?: string; line?: string; function?: string; full: string }> => {
    if (!stack) return [];
    const lines = stack.split('\n').filter(line => line.trim());
    return lines.map(line => {
      // Match common stack trace patterns
      // e.g., "at Object.handler (file:///path/to/file.ts:123:45)"
      const match = line.match(/at\s+(?:(.+)\s+\()?([^\s]+):(\d+):(\d+)\)?/);
      if (match) {
        return {
          function: match[1]?.trim() || undefined,
          file: match[2]?.replace(/file:\/\//, '') || undefined,
          line: `${match[3]}:${match[4]}`,
          full: line.trim()
        };
      }
      return { full: line.trim() };
    });
  };

  // Transform logs for display
  const transformedLogs = useMemo(() => {
    const logs = logsData || [];
    return logs.map((log: LogEntry) => ({
      ...log,
      level: log.logLevel || log.level || 'info',
      category: log.logCategory || log.category || 'unknown',
      message: log.errorMessage || log.successMessage || log.message || `${log.logType || 'log'} - ${log.endpoint || log.caller || 'unknown'}`,
      timestamp: log.timestamp,
      stack: log.errorStack || log.stack,
      error: log.errorMessage ? { message: log.errorMessage, code: log.errorCode, stack: log.errorStack } : log.error,
      errorCode: log.errorCode || null,
      successCode: log.successCode || null,
    }));
  }, [logsData]);

  // Extract error patterns
  const errorPatterns = useMemo(() => {
    const logs = transformedLogs || [];
    const errorLogs = logs.filter((log: LogEntry) => (log.logLevel || log.level) === 'error');
    const patternMap = new Map<string, { pattern: string; count: number; samples: LogEntry[]; category: string; level: string }>();

    errorLogs.forEach((log: LogEntry) => {
      const message = typeof log.message === 'string' ? log.message : JSON.stringify(log.message);
      // Extract error type and key message parts
      let pattern = message;
      
      // Try to extract error type (e.g., "TypeError: ...", "ReferenceError: ...")
      const errorTypeMatch = message.match(/^(\w+Error|Error):/);
      if (errorTypeMatch) {
        const errorType = errorTypeMatch[1];
        // Extract the core message after error type
        const afterError = message.substring(message.indexOf(':') + 1).trim();
        // Take first 50 chars as pattern
        const coreMessage = afterError.substring(0, 50).replace(/\d+/g, 'N').replace(/['"]/g, '');
        pattern = `${errorType}: ${coreMessage}`;
      } else {
        // Normalize common variable parts
        pattern = message.replace(/\d+/g, 'N').replace(/['"][^'"]*['"]/g, '"..."').substring(0, 100);
      }

      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, {
          pattern,
          count: 0,
          samples: [],
          category: log.category,
          level: log.level
        });
      }
      const entry = patternMap.get(pattern)!;
      entry.count++;
      if (entry.samples.length < 3) {
        entry.samples.push(log);
      }
    });

    return Array.from(patternMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 patterns
  }, [logsData]);

  // Syntax highlighting for JSON
  const highlightJSON = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2)
        .replace(/("([^"\\]|\\.)*")\s*:/g, '<span class="text-blue-400">$1</span>:')
        .replace(/:\s*("([^"\\]|\\.)*")/g, ': <span class="text-green-400">$1</span>')
        .replace(/:\s*(\d+)/g, ': <span class="text-yellow-400">$1</span>')
        .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-400">$1</span>');
    } catch {
      return jsonString;
    }
  };

  // Syntax highlighting for stack trace
  const highlightStackTrace = (stack: string): string => {
    return stack
      .replace(/at\s+/g, '<span class="text-blue-400">at</span> ')
      .replace(/(\w+Error):/g, '<span class="text-red-400 font-semibold">$1</span>:')
      .replace(/([\/\\][^\s]+):(\d+):(\d+)/g, '<span class="text-yellow-400">$1</span>:<span class="text-green-400">$2:$3</span>')
      .replace(/(\([^)]+\))/g, '<span class="text-purple-400">$1</span>');
  };

  // Apply search filter to transformed logs
  const filteredLogs = useMemo(() => {
    let logs = transformedLogs || [];
    
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase();
          logs = logs.filter((log: LogEntry) => {
            const searchableText = [
              log.message,
              log.errorMessage,
              log.errorCode,
              log.successMessage,
              log.successCode,
              log.caller,
              log.callee,
              log.endpoint,
              log.userId,
              log.username,
            ].filter(Boolean).join(' ').toLowerCase();
            return searchableText.includes(keyword);
          });
        }
    
    return logs;
  }, [transformedLogs, searchKeyword]);

  return (
    <div className="w-full px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            시스템 로그 분석
          </h1>
          <p className="text-muted-foreground mt-2">
            시스템 로그를 조회하고 분석합니다
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 border rounded-lg">
              {isLoggingEnabled ? (
                <Power className="w-4 h-4 text-green-500" />
              ) : (
                <PowerOff className="w-4 h-4 text-gray-400" />
              )}
              <Label htmlFor="logging-toggle" className="text-sm font-medium">
                로깅 활성화
              </Label>
              <Switch
                id="logging-toggle"
                checked={isLoggingEnabled}
                onCheckedChange={(checked) => toggleLoggingMutation.mutate(checked)}
                disabled={toggleLoggingMutation.isPending || settingsLoading}
                data-testid="switch-logging-enabled"
              />
            </div>
          )}
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="search-keyword">키워드 검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-keyword"
                  data-testid="input-search"
                  placeholder="로그 메시지 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Level Filter */}
            <div>
              <Label htmlFor="level-filter">로그 레벨</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger id="level-filter" data-testid="select-level">
                  <SelectValue placeholder="레벨 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div>
              <Label htmlFor="category-filter">카테고리</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category-filter" data-testid="select-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="system">시스템</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">데이터베이스</SelectItem>
                  <SelectItem value="workflow">워크플로우</SelectItem>
                  <SelectItem value="auth">인증</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="mt-4">
            <Label htmlFor="date-range">날짜 범위</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range" data-testid="select-daterange">
                <SelectValue placeholder="기간 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="week">최근 7일</SelectItem>
                <SelectItem value="month">최근 30일</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            로그 다운로드
          </CardTitle>
          <CardDescription>
            필터링된 로그를 다양한 형식으로 다운로드할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleDownload('json')}
              data-testid="button-download-json"
            >
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleDownload('csv')}
              data-testid="button-download-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleDownload('txt')}
              data-testid="button-download-txt"
            >
              <Download className="w-4 h-4 mr-2" />
              텍스트
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              로그 목록
            </CardTitle>
            <Badge variant="outline">
              {filteredLogs.length}건
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="logs">로그 목록</TabsTrigger>
              <TabsTrigger value="patterns">에러 패턴 분석</TabsTrigger>
            </TabsList>

            <TabsContent value="logs" className="mt-4">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-muted-foreground mb-4 mx-auto animate-spin" />
              <p className="text-muted-foreground">로그를 불러오는 중...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
              <h3 className="text-lg font-medium mb-2">로그 없음</h3>
              <p className="text-sm text-muted-foreground">
                선택한 필터 조건에 해당하는 로그가 없습니다
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {filteredLogs.map((log: LogEntry, index: number) => (
                <AccordionItem 
                  key={log.id || index} 
                  value={`log-${index}`}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start gap-3 flex-1 text-left">
                      <div className="flex items-center gap-2 shrink-0 mt-1">
                        {getLevelIcon(log.level)}
                        {getCategoryIcon(log.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getLevelBadgeVariant(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {log.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-sm font-medium line-clamp-2">
                          {typeof log.message === 'object' ? JSON.stringify(log.message) : log.message}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 space-y-3 border-t">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">타임스탬프:</span>
                          <p className="text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              fractionalSecondDigits: 3
                            })}
                          </p>
                        </div>
                        {log.userId && (
                          <div>
                            <span className="font-semibold">사용자:</span>
                            <p className="text-muted-foreground">{log.userId}</p>
                          </div>
                        )}
                        {log.ip && (
                          <div>
                            <span className="font-semibold">IP 주소:</span>
                            <p className="text-muted-foreground">{log.ip}</p>
                          </div>
                        )}
                        {log.errorCode && (
                          <div>
                            <span className="font-semibold">에러 코드:</span>
                            <Badge variant="destructive" className="ml-2">{log.errorCode}</Badge>
                          </div>
                        )}
                        {log.successCode && (
                          <div>
                            <span className="font-semibold">성공 코드:</span>
                            <Badge variant="default" className="ml-2 bg-green-500">{log.successCode}</Badge>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <Code className="w-4 h-4" />
                          메시지:
                        </span>
                        <div className="mt-1 space-y-2">
                          {log.caller && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold">Caller:</span> {log.caller}
                            </div>
                          )}
                          {log.callee && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold">Callee:</span> {log.callee}
                            </div>
                          )}
                          {typeof log.message === 'object' ? (
                            <ScrollArea className="max-h-[300px]">
                              <pre 
                                className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto"
                                dangerouslySetInnerHTML={{ 
                                  __html: highlightJSON(JSON.stringify(log.message, null, 2))
                                    .replace(/\n/g, '<br/>')
                                    .replace(/ /g, '&nbsp;')
                                }}
                              />
                            </ScrollArea>
                          ) : (
                            <pre className="p-3 bg-muted rounded-lg text-sm overflow-x-auto whitespace-pre-wrap break-words">
                              {log.message}
                            </pre>
                          )}
                        </div>
                      </div>
                      
                      {/* Request/Response Data */}
                      {(log.requestData || log.responseData) && (
                        <div>
                          <span className="font-semibold text-sm flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            Request/Response:
                          </span>
                          <Tabs defaultValue="request" className="mt-2">
                            <TabsList>
                              {log.requestData && <TabsTrigger value="request">Request</TabsTrigger>}
                              {log.responseData && <TabsTrigger value="response">Response</TabsTrigger>}
                            </TabsList>
                            {log.requestData && (
                              <TabsContent value="request">
                                <ScrollArea className="max-h-[300px]">
                                  <pre 
                                    className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto"
                                    dangerouslySetInnerHTML={{ 
                                      __html: highlightJSON(JSON.stringify(log.requestData, null, 2))
                                        .replace(/\n/g, '<br/>')
                                        .replace(/ /g, '&nbsp;')
                                    }}
                                  />
                                </ScrollArea>
                              </TabsContent>
                            )}
                            {log.responseData && (
                              <TabsContent value="response">
                                <ScrollArea className="max-h-[300px]">
                                  <pre 
                                    className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto"
                                    dangerouslySetInnerHTML={{ 
                                      __html: highlightJSON(JSON.stringify(log.responseData, null, 2))
                                        .replace(/\n/g, '<br/>')
                                        .replace(/ /g, '&nbsp;')
                                    }}
                                  />
                                </ScrollArea>
                              </TabsContent>
                            )}
                          </Tabs>
                        </div>
                      )}
                      
                      {/* Execution Info */}
                      {(log.executionTimeMs !== undefined || log.httpStatusCode !== undefined) && (
                        <div>
                          <span className="font-semibold text-sm">실행 정보:</span>
                          <div className="grid grid-cols-2 gap-4 text-sm mt-1">
                            {log.executionTimeMs !== undefined && (
                              <div>
                                <span className="text-muted-foreground">실행 시간:</span>
                                <p className="font-semibold">{log.executionTimeMs}ms</p>
                              </div>
                            )}
                            {log.httpStatusCode !== undefined && (
                              <div>
                                <span className="text-muted-foreground">HTTP 상태:</span>
                                <Badge variant={log.httpStatusCode >= 200 && log.httpStatusCode < 300 ? "default" : "destructive"}>
                                  {log.httpStatusCode}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Stack Trace */}
                      {(log.stack || (log.metadata && (log.metadata.stack || log.metadata.error?.stack))) && (
                        <div>
                          <span className="font-semibold text-sm flex items-center gap-2">
                            <Code className="w-4 h-4 text-red-500" />
                            Stack Trace:
                          </span>
                          <ScrollArea className="mt-1 max-h-[400px]">
                            <div className="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono">
                              {parseStackTrace(log.stack || log.metadata?.stack || log.metadata?.error?.stack).map((frame, frameIdx) => (
                                <div key={frameIdx} className="mb-1 border-l-2 border-red-500 pl-2">
                                  {frame.function && (
                                    <div className="text-blue-400 mb-0.5">
                                      {frame.function}
                                    </div>
                                  )}
                                  {frame.file && (
                                    <div className="text-yellow-400 text-xs mb-0.5">
                                      {frame.file}
                                      {frame.line && <span className="text-green-400">:{frame.line}</span>}
                                    </div>
                                  )}
                                  {!frame.function && !frame.file && (
                                    <div className="text-gray-400">{frame.full}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Error Details */}
                      {(log.error || log.errorMessage || log.errorCode || (log.metadata && log.metadata.error)) && (
                        <div>
                          <span className="font-semibold text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            에러 상세:
                          </span>
                          <ScrollArea className="mt-1 max-h-[300px]">
                            <div className="space-y-2">
                              {log.errorCode && (
                                <div className="p-2 bg-red-950 text-red-100 rounded-lg text-xs">
                                  <span className="font-semibold">에러 코드:</span> <Badge variant="destructive" className="ml-2">{log.errorCode}</Badge>
                                </div>
                              )}
                              {log.errorMessage && (
                                <div className="p-2 bg-red-950 text-red-100 rounded-lg text-xs">
                                  <span className="font-semibold">에러 메시지:</span>
                                  <p className="mt-1">{log.errorMessage}</p>
                                </div>
                              )}
                              {(log.error || log.metadata?.error) && (
                                <pre className="p-3 bg-red-950 text-red-100 rounded-lg text-xs overflow-x-auto">
                                  {JSON.stringify(log.error || log.metadata?.error, null, 2)}
                                </pre>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                      
                      {/* Success Details */}
                      {(log.successMessage || log.successCode) && (
                        <div>
                          <span className="font-semibold text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            성공 상세:
                          </span>
                          <ScrollArea className="mt-1 max-h-[300px]">
                            <div className="space-y-2">
                              {log.successCode && (
                                <div className="p-2 bg-green-950 text-green-100 rounded-lg text-xs">
                                  <span className="font-semibold">성공 코드:</span> <Badge variant="default" className="ml-2 bg-green-500">{log.successCode}</Badge>
                                </div>
                              )}
                              {log.successMessage && (
                                <div className="p-2 bg-green-950 text-green-100 rounded-lg text-xs">
                                  <span className="font-semibold">성공 메시지:</span>
                                  <p className="mt-1">{log.successMessage}</p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {log.metadata && (
                        <div>
                          <span className="font-semibold text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            메타데이터:
                          </span>
                          <ScrollArea className="mt-1 max-h-[300px]">
                            <pre 
                              className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto"
                              dangerouslySetInnerHTML={{ 
                                __html: highlightJSON(JSON.stringify(log.metadata, null, 2))
                                  .replace(/\n/g, '<br/>')
                                  .replace(/ /g, '&nbsp;')
                              }}
                            />
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
            </TabsContent>

            <TabsContent value="patterns" className="mt-4">
              {errorPatterns.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                  <h3 className="text-lg font-medium mb-2">에러 패턴 없음</h3>
                  <p className="text-sm text-muted-foreground">
                    분석할 에러 로그가 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {errorPatterns.map((pattern, idx) => (
                      <Card key={idx} className="relative">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Bug className="w-4 h-4 text-red-500" />
                                패턴 #{idx + 1}
                              </CardTitle>
                              <Badge variant="destructive" className="mt-2">
                                {pattern.count}회 발생
                              </Badge>
                            </div>
                            <Badge variant="outline">{pattern.category}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">에러 패턴</Label>
                              <p className="text-sm font-mono bg-muted p-2 rounded mt-1 break-words">
                                {pattern.pattern}
                              </p>
                            </div>
                            {pattern.samples.length > 0 && (
                              <div>
                                <Label className="text-xs text-muted-foreground">샘플 로그</Label>
                                <Accordion type="single" collapsible>
                                  {pattern.samples.map((sample, sampleIdx) => (
                                    <AccordionItem key={sampleIdx} value={`sample-${idx}-${sampleIdx}`}>
                                      <AccordionTrigger className="text-xs py-2">
                                        {new Date(sample.timestamp).toLocaleString('ko-KR')}
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 text-xs">
                                          <p className="font-mono bg-muted p-2 rounded break-words">
                                            {typeof sample.message === 'object' 
                                              ? JSON.stringify(sample.message, null, 2)
                                              : sample.message}
                                          </p>
                                          {sample.metadata && (
                                            <pre className="bg-slate-900 text-slate-100 p-2 rounded text-xs overflow-x-auto">
                                              {JSON.stringify(sample.metadata, null, 2)}
                                            </pre>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
