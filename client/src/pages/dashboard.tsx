import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { MarketAnalysis } from "@shared/schema";
import { Search, Loader2, Activity, Database, TrendingUp, BarChart3, Lightbulb, Zap, Sparkles, Target, ArrowRight, Clock } from "lucide-react";

// Status components
import { LiveStatusBanner } from "@/components/common/live-status-banner";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, subscribe } = useWebSocket();
  const [realtimeData, setRealtimeData] = useState<any>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [promptSuggestions, setPromptSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionAbortRef = useRef<AbortController | null>(null);
  const suggestionListRef = useRef<HTMLDivElement | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const [searchFilters, setSearchFilters] = useState({
    searchType: 'hybrid',
    symbol: '',
    market: '',
    category: '',
    topK: 10,
    threshold: 0.7
  });

  // Safe input validation helpers
  const validateThreshold = (value: string): number => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.7;
  };

  const validateTopK = (value: string): number => {
    const parsed = parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : 10;
  };

  // Fetch recent market analysis
  const { data: recentAnalysis, isLoading: analysisLoading } = useQuery<MarketAnalysis[]>({
    queryKey: ['/api/market-analysis'],
    refetchInterval: 30000,
  });

  // Fetch system status with proper typing
  const { data: systemStatus, isLoading: systemLoading } = useQuery<{
    system: 'normal' | 'warning' | 'error';
    ragEngine: 'active' | 'inactive';
    lastDataUpdate: string;
  }>({
    queryKey: ['/api/system/status'],
    refetchInterval: 15000,
  });

  // Additional queries for status components
  const { data: workflowStats, isLoading: workflowStatsLoading } = useQuery<{
    totalJobs: number;
    runningJobs: number;
    errorCount: number;
    completedToday?: number;
    failedToday?: number;
  }>({
    queryKey: ['/api/workflows/stats'],
    refetchInterval: 5000,
  });

  const { data: alertStats, isLoading: alertStatsLoading } = useQuery<{
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    infoAlerts?: number;
    acknowledgedAlerts?: number;
  }>({
    queryKey: ['/api/alerts/stats'],
    refetchInterval: 10000,
  });

  // Debounced prompt suggestions function with abort controller
  const fetchPromptSuggestions = useCallback(async (input: string, requestId: number) => {
    // Cancel previous request FIRST, always
    if (suggestionAbortRef.current) {
      suggestionAbortRef.current.abort();
    }
    
    // Clear loading state immediately on abort
    setSuggestionLoading(false);

    if (!input.trim() || input.length < 2) {
      setPromptSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Update latest request ID
    latestRequestIdRef.current = requestId;

    // Create new abort controller for this request
    const abortController = new AbortController();
    suggestionAbortRef.current = abortController;

    try {
      setSuggestionLoading(true);
      const response = await fetch('/api/prompt-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentInput: input,
          conversationHistory: [],
          userPreferences: { maxSuggestions: 8 },
          availableData: ['financial', 'news', 'analysis'],
          currentPage: 'dashboard'
        }),
        signal: abortController.signal
      });
      
      if (abortController.signal.aborted) return;
      
      const data = await response.json();
      
      // Prevent stale responses from overwriting newer suggestions
      if (abortController.signal.aborted) return;
      
      if (data.success && data.suggestions) {
        setPromptSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Request was aborted, this is expected - ensure loading is cleared
        setSuggestionLoading(false);
        return;
      }
      console.error('Failed to fetch prompt suggestions:', error);
      setPromptSuggestions([]);
      setSuggestionLoading(false);
    } finally {
      // Always clear loading state on completion or error
      if (!abortController.signal.aborted && requestId === latestRequestIdRef.current) {
        setSuggestionLoading(false);
      }
    }
  }, []);

  // Handle search query change with debounced suggestions
  const handleSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
    setSelectedSuggestionIndex(-1);

    // Clear existing timeout
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    // Generate request ID for race condition prevention
    const requestId = Date.now();

    // Debounced suggestion fetch
    suggestionTimeoutRef.current = setTimeout(() => {
      fetchPromptSuggestions(value, requestId);
    }, 300);
  }, [fetchPromptSuggestions]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    setPromptSuggestions([]);
    // Auto-focus back to textarea after selection
    setTimeout(() => {
      const textarea = document.getElementById('search-query') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(suggestion.text.length, suggestion.text.length);
      }
    }, 100);
  }, []);

  // Handle keyboard navigation for suggestions
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || promptSuggestions.length === 0) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < promptSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : promptSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < promptSuggestions.length) {
          e.preventDefault();
          handleSuggestionSelect(promptSuggestions[selectedSuggestionIndex]);
        } else if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
      case 'Tab':
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < promptSuggestions.length) {
          e.preventDefault();
          handleSuggestionSelect(promptSuggestions[selectedSuggestionIndex]);
        }
        break;
    }
  }, [showSuggestions, promptSuggestions, selectedSuggestionIndex, handleSuggestionSelect]);

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-suggestion-container]')) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout and abort controller on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
      }
    };
  }, []);

  // Auto-scroll selected suggestion into view
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionListRef.current) {
      const suggestionItems = suggestionListRef.current.querySelectorAll('[data-testid^="suggestion-"]');
      const selectedElement = suggestionItems[selectedSuggestionIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedSuggestionIndex]);

  // Get category icon for suggestions
  const getSuggestionIcon = (category: string) => {
    switch (category) {
      case 'completion': return <Lightbulb className="w-4 h-4" />;
      case 'template': return <Target className="w-4 h-4" />;
      case 'context': return <Sparkles className="w-4 h-4" />;
      case 'smart': return <Sparkles className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  // RAG search mutation
  const searchMutation = useMutation({
    mutationFn: async (searchData: any) => {
      const response = await apiRequest('POST', '/api/search', searchData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "검색 완료",
        description: `${data.combined?.length || 0}개의 결과를 찾았습니다.`,
      });
    },
    onError: (error) => {
      toast({
        title: "검색 실패",
        description: "검색 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "검색어 입력",
        description: "검색어를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Validate inputs before sending to backend
    const validatedThreshold = validateThreshold(searchFilters.threshold.toString());
    const validatedTopK = validateTopK(searchFilters.topK.toString());
    
    searchMutation.mutate({
      query: searchQuery,
      filters: {
        symbol: searchFilters.symbol || undefined,
        market: searchFilters.market || undefined,
        category: searchFilters.category || undefined,
      },
      searchType: searchFilters.searchType,
      topK: validatedTopK,
      threshold: validatedThreshold,
    });
  };

  // WebSocket handlers for real-time updates
  const memoizedToastHandler = useCallback((data: any) => {
    toast({
      title: "새로운 알림",
      description: data.message || "새로운 시스템 알림이 도착했습니다.",
    });
  }, [toast]);

  // WebSocket 실시간 업데이트 구독
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribers = [
      subscribe('data_update', (data) => {
        setRealtimeData((prev: any) => ({
          ...prev,
          [`${data.dataType}_update`]: data.data,
          [`${data.dataType}_timestamp`]: new Date()
        }));
        setLastUpdate(new Date());
      }),
      subscribe('system_status', (data) => {
        setRealtimeData((prev: any) => ({
          ...prev,
          system_update: data,
          system_timestamp: new Date()
        }));
      }),
      subscribe('new_alert', (data) => {
        setRealtimeData((prev: any) => ({
          ...prev,
          alert_update: data,
          alert_timestamp: new Date()
        }));
        memoizedToastHandler(data);
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }, [subscribe, isConnected, memoizedToastHandler]);

  // Status refresh handler
  const handleRefreshStatus = useCallback(() => {
    setLastUpdate(new Date());
    toast({
      title: "상태 새로고침",
      description: "시스템 상태가 업데이트되었습니다.",
    });
  }, [toast]);

  // RAG latency calculation
  const ragLatency = useMemo(() => {
    const recentTimestamp = realtimeData.analysis_timestamp;
    if (!recentTimestamp) return realtimeData.rag_response_time || 95;
    
    return Math.round((new Date().getTime() - new Date(recentTimestamp).getTime()) / 1000);
  }, [realtimeData.analysis_timestamp, realtimeData.rag_response_time]);

  return (
    <div className="flex-1 overflow-hidden">
      <div className="container-xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 overflow-y-auto max-h-screen">
        
        {/* Azure Services Status Banner */}
        <LiveStatusBanner />

        {/* Search and Results Section */}
        <div className="space-y-6">
          {/* Search Input Section - Enhanced AI Assistant */}
          <Card data-testid="search-panel" className="border-2 shadow-lg">
            <CardHeader className="pb-4 border-b bg-muted/30">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">AI 지능형 검색</h3>
                    <p className="text-xs text-muted-foreground font-normal">RAG 하이브리드 검색 엔진</p>
                  </div>
                </div>
                {isConnected && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border border-green-200 dark:border-green-800" data-testid="status-connection">
                      <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      실시간 연결
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Search Query */}
                <div className="lg:col-span-5 relative" data-suggestion-container>
                  <Label htmlFor="search-query" className="text-sm font-medium flex items-center gap-2 mb-2">
                    <span>검색어</span>
                    {suggestionLoading && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>AI 제안 생성중...</span>
                      </div>
                    )}
                  </Label>
                  <Textarea
                    id="search-query"
                    value={searchQuery}
                    onChange={(e) => handleSearchQueryChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      if (promptSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="예: 삼성전자 주가 전망, AI 테마주 동향..."
                    rows={2}
                    className="resize-none"
                    data-testid="textarea-search-query"
                    aria-controls={showSuggestions ? "prompt-suggestions-listbox" : undefined}
                    aria-activedescendant={selectedSuggestionIndex >= 0 ? `suggestion-${selectedSuggestionIndex}` : undefined}
                    aria-expanded={showSuggestions}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Ctrl+Enter로 빠른 검색</p>

                  {/* AI Suggestions Dropdown - Clean & Modern */}
                  {showSuggestions && promptSuggestions.length > 0 && (
                    <div 
                      ref={suggestionListRef}
                      id="prompt-suggestions-listbox"
                      className="absolute z-50 mt-2 w-full bg-background border-2 border-primary/20 rounded-xl shadow-2xl max-h-96 overflow-hidden"
                      data-suggestion-container
                      role="listbox"
                      aria-label="AI 프롬프트 제안 목록"
                    >
                      {/* Header */}
                      <div className="p-4 border-b bg-primary/5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Sparkles className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-bold text-foreground">AI 추천 프롬프트</span>
                          <span className="ml-auto text-xs px-2 py-1 bg-background rounded-full font-semibold border">
                            {promptSuggestions.length}개
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑↓</kbd> 선택 · 
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">Enter</kbd> 적용 · 
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">Esc</kbd> 닫기
                        </p>
                      </div>
                      
                      {/* Suggestions List */}
                      <div className="overflow-y-auto max-h-80 p-2">
                        {promptSuggestions.map((suggestion, index) => (
                          <div
                            key={suggestion.id || index}
                            id={`suggestion-${index}`}
                            className={`group relative rounded-lg p-3 mb-1.5 cursor-pointer transition-all duration-200 border ${
                              index === selectedSuggestionIndex
                                ? 'bg-primary/10 border-primary shadow-md scale-[1.02]'
                                : 'hover:bg-muted border-transparent hover:border-border'
                            }`}
                            onClick={() => handleSuggestionSelect(suggestion)}
                            role="option"
                            aria-selected={index === selectedSuggestionIndex}
                            data-testid={`suggestion-${index}`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                                index === selectedSuggestionIndex 
                                  ? 'bg-primary text-primary-foreground shadow-sm' 
                                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10'
                              }`}>
                                {getSuggestionIcon(suggestion.category)}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-1.5">
                                  <span className="text-sm font-semibold line-clamp-2 text-foreground flex-1">
                                    {suggestion.text}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                                      suggestion.category === 'smart' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' :
                                      suggestion.category === 'template' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' :
                                      suggestion.category === 'context' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800' :
                                      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                    }`}>
                                      {suggestion.category === 'smart' ? '스마트' :
                                       suggestion.category === 'template' ? '템플릿' :
                                       suggestion.category === 'context' ? '맥락' : '완성'}
                                    </span>
                                  </div>
                                </div>
                                
                                {suggestion.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                    {suggestion.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center justify-between text-xs">
                                  {suggestion.context && (
                                    <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                                      {suggestion.context} 관련
                                    </span>
                                  )}
                                  <div className="ml-auto flex items-center gap-2 text-muted-foreground">
                                    <span className="font-semibold">
                                      {Math.round((suggestion.confidence || 0) * 100)}%
                                    </span>
                                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${
                                      index === selectedSuggestionIndex ? 'translate-x-1' : 'group-hover:translate-x-0.5'
                                    }`} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Footer */}
                      <div className="p-3 border-t bg-muted/30">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium">AI 기반 지능형 제안</span>
                          <span className="flex items-center gap-1.5 text-primary font-semibold">
                            <Sparkles className="w-3 h-3" />
                            실시간 업데이트
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Filters and Search Button */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="symbol-filter" className="text-xs text-muted-foreground">종목 코드</Label>
                      <Input
                        id="symbol-filter"
                        value={searchFilters.symbol}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, symbol: e.target.value }))}
                        placeholder="예: 005930"
                        className="h-9"
                        data-testid="input-symbol-filter"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="market-filter" className="text-xs text-muted-foreground">시장 구분</Label>
                      <Input
                        id="market-filter"
                        value={searchFilters.market}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, market: e.target.value }))}
                        placeholder="예: 국내증권"
                        className="h-9"
                        data-testid="input-market-filter"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="category-filter" className="text-xs text-muted-foreground">카테고리</Label>
                      <Input
                        id="category-filter"
                        value={searchFilters.category}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="예: 기업뉴스"
                        className="h-9"
                        data-testid="input-category-filter"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="topk-filter" className="text-xs text-muted-foreground">최대 결과 수</Label>
                      <Input
                        id="topk-filter"
                        type="number"
                        min="1"
                        max="100"
                        value={searchFilters.topK}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setSearchFilters(prev => ({ ...prev, topK: value as any }));
                          } else {
                            const validated = validateTopK(value);
                            setSearchFilters(prev => ({ ...prev, topK: validated }));
                          }
                        }}
                        onBlur={(e) => {
                          const validated = validateTopK(e.target.value);
                          setSearchFilters(prev => ({ ...prev, topK: validated }));
                        }}
                        className="h-9"
                        data-testid="input-topk-filter"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="threshold-filter" className="text-xs text-muted-foreground">유사도 임계값</Label>
                      <Input
                        id="threshold-filter"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={searchFilters.threshold}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || value === '.') {
                            setSearchFilters(prev => ({ ...prev, threshold: value as any }));
                          } else {
                            const validated = validateThreshold(value);
                            setSearchFilters(prev => ({ ...prev, threshold: validated }));
                          }
                        }}
                        onBlur={(e) => {
                          const validated = validateThreshold(e.target.value);
                          setSearchFilters(prev => ({ ...prev, threshold: validated }));
                        }}
                        className="h-9"
                        data-testid="input-threshold-filter"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground opacity-0">검색</Label>
                      <Button 
                        onClick={handleSearch}
                        disabled={searchMutation.isPending || !searchQuery.trim()}
                        className="w-full h-9"
                        data-testid="button-search"
                      >
                        {searchMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            검색 중
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            검색
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results Section */}
          <Card data-testid="search-results-panel">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span>검색 결과</span>
                </div>
                {searchMutation.data?.combined && (
                  <span className="text-sm text-muted-foreground" data-testid="text-results-count">
                    {searchMutation.data.combined.length}개 결과
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Loading State */}
              {searchMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-12" data-testid="loading-search">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">지식 검색 중...</p>
                  <p className="text-xs text-muted-foreground mt-1">벡터 유사도 분석 진행 중</p>
                </div>
              )}

              {/* Empty State - No Search Yet */}
              {!searchMutation.data && !searchMutation.isPending && (
                <div className="text-center py-12" data-testid="empty-state-initial">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">검색어를 입력해주세요</h3>
                  <p className="text-sm text-muted-foreground mb-4">다양한 금융 데이터와 뉴스 정보를 검색할 수 있습니다</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• 삼성전자 주가 전망</p>
                    <p>• AI 테마주 동향 분석</p>
                    <p>• 반도체 시장 동향</p>
                  </div>
                </div>
              )}

              {/* Empty State - No Results */}
              {searchMutation.data && searchMutation.data.combined?.length === 0 && (
                <div className="text-center py-12" data-testid="empty-state-no-results">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">검색 결과가 없습니다</h3>
                  <p className="text-sm text-muted-foreground mb-4">검색어나 필터 조건을 조정해보세요</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• 다른 키워드로 시도해보세요</p>
                    <p>• 필터 조건을 단순화해보세요</p>
                    <p>• 유사도 임계값을 낮춰보세요</p>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchMutation.data?.combined && searchMutation.data.combined.length > 0 && (
                <div className="space-y-4" data-testid="search-results-list">
                  {searchMutation.data.combined.map((result: any, index: number) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg border hover:bg-muted/70 transition-colors" data-testid={`search-result-${index}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-foreground text-sm leading-tight">
                          {result.metadata.title || result.metadata.symbol || `데이터 ${index + 1}`}
                        </h4>
                        <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded flex-shrink-0 ml-2" data-testid={`similarity-${index}`}>
                          유사도 {(result.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {result.content.substring(0, 200)}{result.content.length > 200 ? '...' : ''}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(result.metadata).filter(([key, value]) => value && key !== 'title').map(([key, value]) => (
                          <span key={key} className="inline-flex items-center px-2 py-1 rounded text-xs bg-background text-foreground border" data-testid={`metadata-${key}-${index}`}>
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="ml-1 font-medium">{String(value)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
