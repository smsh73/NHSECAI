import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Database, 
  Brain, 
  TrendingUp, 
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  History,
  BarChart2,
  Calendar,
  ArrowUpDown,
  Eye,
  X
} from 'lucide-react';

interface WorkflowData {
  newsData: any[];
  marketEvents: any[];
  themeMarkets: any[];
  macroMarket: any;
}

interface ResultsPanelProps {
  data: WorkflowData | null;
  isLoading?: boolean;
  executionHistory?: Array<{
    id: string;
    timestamp: string;
    status: string;
    data: WorkflowData;
    executionTime?: number;
  }>;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ data, isLoading = false, executionHistory = [] }) => {
  const [selectedTab, setSelectedTab] = useState<'current' | 'history' | 'analytics'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'executionTime'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'news' | 'events' | 'themes' | 'macro'>('all');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<string | null>(null);
  const getDataIcon = (type: string) => {
    switch (type) {
      case 'news':
        return <Database className="h-4 w-4 text-blue-600" />;
      case 'events':
        return <Brain className="h-4 w-4 text-purple-600" />;
      case 'themes':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'macro':
        return <BarChart3 className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDataColor = (type: string) => {
    switch (type) {
      case 'news':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'events':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'themes':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'macro':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            결과 데이터
          </CardTitle>
          <CardDescription>
            워크플로우 실행 결과를 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 animate-spin" />
              <span>데이터를 처리 중입니다...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            결과 데이터
          </CardTitle>
          <CardDescription>
            워크플로우 실행 결과를 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>워크플로우를 실행하여 결과를 확인하세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtered and sorted execution history
  const filteredHistory = useMemo(() => {
    let history = [...executionHistory];
    
    // Filter by type
    if (filterType !== 'all') {
      history = history.filter(item => {
        const itemData = item.data;
        switch (filterType) {
          case 'news':
            return (itemData.newsData?.length || 0) > 0;
          case 'events':
            return (itemData.marketEvents?.length || 0) > 0;
          case 'themes':
            return (itemData.themeMarkets?.length || 0) > 0;
          case 'macro':
            return itemData.macroMarket != null;
          default:
            return true;
        }
      });
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      history = history.filter(item => {
        const itemData = item.data;
        const searchableText = [
          JSON.stringify(itemData.newsData || []),
          JSON.stringify(itemData.marketEvents || []),
          JSON.stringify(itemData.themeMarkets || []),
          JSON.stringify(itemData.macroMarket || {}),
          item.timestamp,
          item.status,
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }
    
    // Sort
    history.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortBy === 'executionTime') {
        comparison = (a.executionTime || 0) - (b.executionTime || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return history;
  }, [executionHistory, filterType, searchQuery, sortBy, sortOrder]);

  // Analytics data
  const analyticsData = useMemo(() => {
    if (!executionHistory.length) return null;
    
    const stats = {
      totalExecutions: executionHistory.length,
      successfulExecutions: executionHistory.filter(e => e.status === 'completed' || e.status === 'success').length,
      failedExecutions: executionHistory.filter(e => e.status === 'failed' || e.status === 'error').length,
      avgExecutionTime: executionHistory.reduce((sum, e) => sum + (e.executionTime || 0), 0) / executionHistory.length,
      totalNewsCollected: executionHistory.reduce((sum, e) => sum + (e.data.newsData?.length || 0), 0),
      totalEventsExtracted: executionHistory.reduce((sum, e) => sum + (e.data.marketEvents?.length || 0), 0),
      totalThemesGenerated: executionHistory.reduce((sum, e) => sum + (e.data.themeMarkets?.length || 0), 0),
      totalMacroGenerated: executionHistory.filter(e => e.data.macroMarket != null).length,
    };
    
    return stats;
  }, [executionHistory]);

  const dataItems = [
    {
      type: 'news',
      title: '뉴스 데이터',
      count: data.newsData?.length || 0,
      description: '수집된 뉴스 기사 수',
      icon: getDataIcon('news'),
      color: getDataColor('news')
    },
    {
      type: 'events',
      title: '주요이벤트',
      count: data.marketEvents?.length || 0,
      description: '추출된 시장 이벤트 수',
      icon: getDataIcon('events'),
      color: getDataColor('events')
    },
    {
      type: 'themes',
      title: '테마 시황',
      count: data.themeMarkets?.length || 0,
      description: '생성된 테마 시황 수',
      icon: getDataIcon('themes'),
      color: getDataColor('themes')
    },
    {
      type: 'macro',
      title: '매크로 시황',
      count: data.macroMarket ? 1 : 0,
      description: '생성된 매크로 시황',
      icon: getDataIcon('macro'),
      color: getDataColor('macro')
    }
  ];
  
  const handleExport = (format: 'json' | 'csv') => {
    if (!data) return;
    
    let content = '';
    let filename = `ai-market-analysis-${new Date().toISOString().split('T')[0]}`;
    let mimeType = 'text/plain';
    
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const rows: string[][] = [];
      rows.push(['Type', 'Title', 'Count', 'Timestamp']);
      
      if (data.newsData) {
        data.newsData.forEach((item: any) => {
          rows.push(['News', item.title || item.nid || 'Unknown', '1', item.publishedAt || '']);
        });
      }
      if (data.marketEvents) {
        data.marketEvents.forEach((item: any) => {
          rows.push(['Event', item.eventTitle || 'Unknown', '1', '']);
        });
      }
      if (data.themeMarkets) {
        data.themeMarkets.forEach((item: any) => {
          rows.push(['Theme', item.themeTitle || 'Unknown', '1', '']);
        });
      }
      if (data.macroMarket) {
        rows.push(['Macro', data.macroMarket.title || 'Macro Market', '1', data.macroMarket.ingestTs || '']);
      }
      
      content = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      filename += '.csv';
      mimeType = 'text/csv';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              결과 데이터
            </CardTitle>
            <CardDescription>
              워크플로우 실행 결과를 확인할 수 있습니다.
            </CardDescription>
          </div>
          {data && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <TabsList>
            <TabsTrigger value="current">현재 결과</TabsTrigger>
            <TabsTrigger value="history">실행 히스토리</TabsTrigger>
            <TabsTrigger value="analytics">분석</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="mt-4">
        <div className="space-y-4">
          {/* 데이터 요약 */}
          <div className="grid grid-cols-2 gap-4">
            {dataItems.map((item) => (
              <div key={item.type} className={`p-4 rounded-lg border ${item.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  {item.icon}
                  <span className="font-medium">{item.title}</span>
                </div>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs opacity-75">{item.description}</p>
              </div>
            ))}
          </div>
          
          <Separator />
          
          {/* 상세 결과 */}
          {data.macroMarket && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">매크로 시황</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-sm">{data.macroMarket.title}</span>
                </div>
                <p className="text-sm text-gray-700">{data.macroMarket.content}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  생성 시간: {new Date(data.macroMarket.ingestTs).toLocaleString()}
                </div>
              </div>
            </div>
          )}
          
          {data.marketEvents && data.marketEvents.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">주요이벤트</h4>
              <div className="space-y-2">
                {data.marketEvents.slice(0, 3).map((event, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">{event.eventTitle}</span>
                    </div>
                    {event.eventDetail && (
                      <p className="text-xs text-gray-600">{event.eventDetail}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {data.themeMarkets && data.themeMarkets.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">테마 시황</h4>
              <div className="space-y-2">
                {data.themeMarkets.slice(0, 3).map((theme, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">{theme.themeTitle}</span>
                      <Badge variant="outline" className="text-xs">
                        {theme.direction === 'UP' ? '상승' : theme.direction === 'DOWN' ? '하락' : '보합'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{theme.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        등락률: {theme.fluctuationRate?.toFixed(2)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        버블스케일: {theme.bubbleScale}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            {executionHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>실행 히스토리가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="타입 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="news">뉴스</SelectItem>
                      <SelectItem value="events">이벤트</SelectItem>
                      <SelectItem value="themes">테마</SelectItem>
                      <SelectItem value="macro">매크로</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
                    const [by, order] = v.split('-');
                    setSortBy(by as any);
                    setSortOrder(order as any);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="정렬" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="timestamp-desc">시간 (최신순)</SelectItem>
                      <SelectItem value="timestamp-asc">시간 (오래된순)</SelectItem>
                      <SelectItem value="executionTime-desc">실행시간 (긴순)</SelectItem>
                      <SelectItem value="executionTime-asc">실행시간 (짧은순)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* History List */}
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {filteredHistory.map((item) => (
                      <Card 
                        key={item.id} 
                        className={`cursor-pointer hover:bg-muted transition-colors ${selectedHistoryItem === item.id ? 'border-primary' : ''}`}
                        onClick={() => setSelectedHistoryItem(item.id)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {new Date(item.timestamp).toLocaleString('ko-KR')}
                                </span>
                                <Badge variant={item.status === 'completed' || item.status === 'success' ? 'default' : 'destructive'}>
                                  {item.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                                <div>뉴스: {item.data.newsData?.length || 0}</div>
                                <div>이벤트: {item.data.marketEvents?.length || 0}</div>
                                <div>테마: {item.data.themeMarkets?.length || 0}</div>
                                <div>매크로: {item.data.macroMarket ? 1 : 0}</div>
                              </div>
                            </div>
                            {item.executionTime && (
                              <div className="text-xs text-muted-foreground">
                                {item.executionTime}ms
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Selected History Detail */}
                {selectedHistoryItem && (
                  <Dialog open={!!selectedHistoryItem} onOpenChange={() => setSelectedHistoryItem(null)}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>실행 결과 상세</DialogTitle>
                        <DialogDescription>
                          {new Date(filteredHistory.find(h => h.id === selectedHistoryItem)?.timestamp || '').toLocaleString('ko-KR')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {(() => {
                          const selectedData = filteredHistory.find(h => h.id === selectedHistoryItem)?.data;
                          if (!selectedData) return null;
                          
                          return (
                            <>
                              {selectedData.macroMarket && (
                                <div className="p-4 bg-muted rounded-lg">
                                  <h4 className="font-semibold mb-2">매크로 시황</h4>
                                  <p className="text-sm">{selectedData.macroMarket.content}</p>
                                </div>
                              )}
                              {selectedData.marketEvents && selectedData.marketEvents.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">주요이벤트 ({selectedData.marketEvents.length})</h4>
                                  <ScrollArea className="h-[200px]">
                                    <div className="space-y-2">
                                      {selectedData.marketEvents.map((event: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                                          <p className="font-medium text-sm">{event.eventTitle}</p>
                                          {event.eventDetail && (
                                            <p className="text-xs text-muted-foreground">{event.eventDetail}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}
                              {selectedData.themeMarkets && selectedData.themeMarkets.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">테마 시황 ({selectedData.themeMarkets.length})</h4>
                                  <ScrollArea className="h-[200px]">
                                    <div className="space-y-2">
                                      {selectedData.themeMarkets.map((theme: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-green-50 rounded-lg">
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className="font-medium text-sm">{theme.themeTitle}</p>
                                            <Badge variant="outline">{theme.direction}</Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground">{theme.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-4">
            {!analyticsData ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>분석할 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">총 실행 횟수</div>
                      <div className="text-2xl font-bold">{analyticsData.totalExecutions}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">성공률</div>
                      <div className="text-2xl font-bold">
                        {analyticsData.totalExecutions > 0 
                          ? ((analyticsData.successfulExecutions / analyticsData.totalExecutions) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">평균 실행시간</div>
                      <div className="text-2xl font-bold">{Math.round(analyticsData.avgExecutionTime)}ms</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">총 뉴스 수집</div>
                      <div className="text-2xl font-bold">{analyticsData.totalNewsCollected}</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">총 이벤트 추출</div>
                      <div className="text-2xl font-bold">{analyticsData.totalEventsExtracted}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">총 테마 생성</div>
                      <div className="text-2xl font-bold">{analyticsData.totalThemesGenerated}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">매크로 생성</div>
                      <div className="text-2xl font-bold">{analyticsData.totalMacroGenerated}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ResultsPanel;
