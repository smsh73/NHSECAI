import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MarketAnalysis, MacroAnalysis, MacroWorkflowTemplate, AnalysisStream } from "@shared/schema";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Newspaper, 
  Building2, 
  Calculator,
  RefreshCw,
  Star,
  AlertTriangle,
  CheckCircle,
  Activity,
  Globe,
  Target,
  Zap,
  Edit3,
  Play,
  Circle
} from "lucide-react";

export default function MacroAnalysisPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();
  const [, navigate] = useLocation();
  
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<{
    news: string[];
    theme: string[];
    quantitative: string[];
  }>({
    news: [],
    theme: [],
    quantitative: []
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MacroWorkflowTemplate | null>(null);
  const [templateConfig, setTemplateConfig] = useState({
    name: '',
    description: '',
    icon: '',
    color: ''
  });

  // Initialize macro workflow templates on first load
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/macro-workflow-templates/initialize', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/macro-workflow-templates'] });
      setIsInitialized(true);
    }
  });

  // Fetch macro workflow templates
  const { data: macroTemplates } = useQuery<MacroWorkflowTemplate[]>({
    queryKey: ['/api/macro-workflow-templates'],
  });

  // Initialize templates if none exist
  useEffect(() => {
    if (macroTemplates !== undefined && macroTemplates.length === 0 && !isInitialized) {
      initializeMutation.mutate();
    }
  }, [macroTemplates, isInitialized]);

  // Fetch macro analysis list
  const { data: macroAnalysisList, isLoading: macroLoading } = useQuery<MacroAnalysis[]>({
    queryKey: ['/api/macro-analysis'],
    refetchInterval: 30000,
  });

  // Fetch individual analysis streams
  const { data: newsAnalysis, isLoading: newsLoading } = useQuery<MarketAnalysis[]>({
    queryKey: ['/api/market-analysis', 'news'],
    queryFn: () => apiRequest('GET', '/api/market-analysis?type=news&limit=20').then(res => res.json()),
    refetchInterval: 15000,
  });

  const { data: themeAnalysis, isLoading: themeLoading } = useQuery<MarketAnalysis[]>({
    queryKey: ['/api/market-analysis', 'theme'],
    queryFn: () => apiRequest('GET', '/api/market-analysis?type=theme&limit=20').then(res => res.json()),
    refetchInterval: 15000,
  });

  const { data: quantAnalysis, isLoading: quantLoading } = useQuery<MarketAnalysis[]>({
    queryKey: ['/api/market-analysis', 'quantitative'],
    queryFn: () => apiRequest('GET', '/api/market-analysis?type=quantitative&limit=20').then(res => res.json()),
    refetchInterval: 15000,
  });

  // Generate integrated macro analysis mutation
  const generateMacroAnalysis = useMutation({
    mutationFn: async (analysisIds: { newsAnalysisIds: string[], themeAnalysisIds: string[], quantAnalysisIds: string[] }) => {
      const response = await apiRequest('POST', '/api/macro-analysis/generate', analysisIds);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "통합 분석 생성 완료",
        description: "매크로시황 분석이 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/macro-analysis'] });
      setIsGenerating(false);
    },
    onError: (error) => {
      toast({
        title: "분석 생성 실패",
        description: "통합 분석 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  });

  // Execute macro workflow mutation
  const executeMacroWorkflow = useMutation({
    mutationFn: async (analysisType: string) => {
      const response = await apiRequest('POST', `/api/macro-workflow-templates/${analysisType}/execute`, {});
      return response.json();
    },
    onSuccess: (data, analysisType) => {
      toast({
        title: "워크플로우 실행 시작",
        description: `${analysisType} 분석 워크플로우가 백그라운드에서 실행되고 있습니다.`,
      });
    },
    onError: (error, analysisType) => {
      toast({
        title: "실행 실패",
        description: `${analysisType} 워크플로우 실행 중 오류가 발생했습니다.`,
        variant: "destructive",
      });
    }
  });

  // Update template configuration
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { id: string; config: any }) => {
      const response = await apiRequest('PUT', `/api/macro-workflow-templates/${data.id}`, data.config);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "설정 저장 완료",
        description: "워크플로우 템플릿 설정이 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/macro-workflow-templates'] });
      setConfigDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "설정 저장 실패",
        description: "워크플로우 템플릿 설정 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Handle card click to open config dialog
  const handleCardClick = (analysisType: string) => {
    const template = macroTemplates?.find(t => t.analysisType === analysisType);
    if (template) {
      setSelectedTemplate(template);
      setTemplateConfig({
        name: template.name,
        description: template.description || '',
        icon: template.icon || '',
        color: template.color || ''
      });
      setConfigDialogOpen(true);
    }
  };

  // Handle config save
  const handleSaveConfig = () => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({
        id: selectedTemplate.id,
        config: templateConfig
      });
    }
  };

  const handleGenerateIntegratedAnalysis = () => {
    const { news, theme, quantitative } = selectedAnalysisIds;
    
    if (news.length === 0 || theme.length === 0 || quantitative.length === 0) {
      toast({
        title: "분석 데이터 부족",
        description: "각 분석 스트림에서 최소 1개 이상의 항목을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    generateMacroAnalysis.mutate({
      newsAnalysisIds: news,
      themeAnalysisIds: theme,
      quantAnalysisIds: quantitative
    });
  };

  const handleAnalysisSelection = (streamType: 'news' | 'theme' | 'quantitative', id: string, selected: boolean) => {
    setSelectedAnalysisIds(prev => ({
      ...prev,
      [streamType]: selected 
        ? [...prev[streamType], id]
        : prev[streamType].filter(existingId => existingId !== id)
    }));
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 0.8) return "text-red-500";
    if (importance >= 0.6) return "text-amber-500";
    return "text-emerald-500";
  };

  const getImportanceIcon = (importance: number) => {
    if (importance >= 0.8) return <AlertTriangle className="h-4 w-4" />;
    if (importance >= 0.6) return <Star className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  return (
    <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Globe className="h-8 w-8 text-blue-500" />
          매크로시황 통합 분석
        </h1>
        
        {/* Lightning Design System Header */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">뉴스, 테마, 정량 데이터를 종합한 시장 인사이트</p>
              </div>
              {isConnected && (
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 ml-4">
                  <Circle className="w-2 h-2 mr-2 fill-emerald-500 animate-pulse" />
                  실시간 연결
                </Badge>
              )}
            </div>
            
            <Button 
              onClick={handleGenerateIntegratedAnalysis}
              disabled={isGenerating || generateMacroAnalysis.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-11 px-6"
              data-testid="button-generate-analysis"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  통합 분석 생성
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Analysis Streams Grid - Lightning Design */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* News Analysis Stream */}
          <Card 
            data-testid="card-news-analysis" 
            className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900"
          >
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <Newspaper className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">뉴스기반시황</CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">최신 시장 뉴스 분석</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-0">
                  {selectedAnalysisIds.news.length}개 선택
                </Badge>
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeMacroWorkflow.mutate('news');
                    }}
                    disabled={executeMacroWorkflow.isPending}
                    data-testid="button-execute-news-workflow"
                    title="워크플로우 실행"
                    className="h-8 w-8 p-0"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      const template = macroTemplates?.find(t => t.analysisType === 'news');
                      if (template?.workflowId) {
                        navigate(`/workflow-editor/${template.workflowId}`);
                      }
                    }}
                    data-testid="button-edit-news-workflow"
                    title="워크플로우 편집"
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[420px]">
                {newsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {newsAnalysis?.map((analysis) => (
                      <div
                        key={analysis.id}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          selectedAnalysisIds.news.includes(analysis.id)
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'
                        }`}
                        onClick={() => handleAnalysisSelection('news', analysis.id, !selectedAnalysisIds.news.includes(analysis.id))}
                        data-testid={`item-news-analysis-${analysis.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 flex-1 pr-2">{analysis.title}</h4>
                          <div className={`flex items-center gap-1 ${getImportanceColor(parseFloat(analysis.confidence?.toString() || '0'))}`}>
                            {getImportanceIcon(parseFloat(analysis.confidence?.toString() || '0'))}
                            <span className="text-xs font-semibold">{Math.round((parseFloat(analysis.confidence?.toString() || '0')) * 100)}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{analysis.summary}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-500">{formatTimeAgo(analysis.generatedAt instanceof Date ? analysis.generatedAt.toISOString() : analysis.generatedAt || '')}</span>
                          {selectedAnalysisIds.news.includes(analysis.id) && (
                            <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Theme Analysis Stream */}
          <Card 
            data-testid="card-theme-analysis"
            className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900"
          >
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">테마/산업시황</CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">섹터별 시장 동향</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-0">
                  {selectedAnalysisIds.theme.length}개 선택
                </Badge>
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeMacroWorkflow.mutate('theme');
                    }}
                    disabled={executeMacroWorkflow.isPending}
                    data-testid="button-execute-theme-workflow"
                    title="워크플로우 실행"
                    className="h-8 w-8 p-0"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      const template = macroTemplates?.find(t => t.analysisType === 'theme');
                      if (template?.workflowId) {
                        navigate(`/workflow-editor/${template.workflowId}`);
                      }
                    }}
                    data-testid="button-edit-theme-workflow"
                    title="워크플로우 편집"
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[420px]">
                {themeLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {themeAnalysis?.map((analysis) => (
                      <div
                        key={analysis.id}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          selectedAnalysisIds.theme.includes(analysis.id)
                            ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800'
                        }`}
                        onClick={() => handleAnalysisSelection('theme', analysis.id, !selectedAnalysisIds.theme.includes(analysis.id))}
                        data-testid={`item-theme-analysis-${analysis.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 flex-1 pr-2">{analysis.title}</h4>
                          <div className={`flex items-center gap-1 ${getImportanceColor(parseFloat(analysis.confidence?.toString() || '0'))}`}>
                            {getImportanceIcon(parseFloat(analysis.confidence?.toString() || '0'))}
                            <span className="text-xs font-semibold">{Math.round((parseFloat(analysis.confidence?.toString() || '0')) * 100)}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{analysis.summary}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-500">{formatTimeAgo(analysis.generatedAt instanceof Date ? analysis.generatedAt.toISOString() : analysis.generatedAt || '')}</span>
                          {selectedAnalysisIds.theme.includes(analysis.id) && (
                            <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quantitative Analysis Stream */}
          <Card 
            data-testid="card-quantitative-analysis"
            className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900"
          >
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">정량적 시장/시세</CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">데이터 기반 분석</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-0">
                  {selectedAnalysisIds.quantitative.length}개 선택
                </Badge>
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeMacroWorkflow.mutate('quantitative');
                    }}
                    disabled={executeMacroWorkflow.isPending}
                    data-testid="button-execute-quantitative-workflow"
                    title="워크플로우 실행"
                    className="h-8 w-8 p-0"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      const template = macroTemplates?.find(t => t.analysisType === 'quantitative');
                      if (template?.workflowId) {
                        navigate(`/workflow-editor/${template.workflowId}`);
                      }
                    }}
                    data-testid="button-edit-quantitative-workflow"
                    title="워크플로우 편집"
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[420px]">
                {quantLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {quantAnalysis?.map((analysis) => (
                      <div
                        key={analysis.id}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          selectedAnalysisIds.quantitative.includes(analysis.id)
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'
                        }`}
                        onClick={() => handleAnalysisSelection('quantitative', analysis.id, !selectedAnalysisIds.quantitative.includes(analysis.id))}
                        data-testid={`item-quantitative-analysis-${analysis.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 flex-1 pr-2">{analysis.title}</h4>
                          <div className={`flex items-center gap-1 ${getImportanceColor(parseFloat(analysis.confidence?.toString() || '0'))}`}>
                            {getImportanceIcon(parseFloat(analysis.confidence?.toString() || '0'))}
                            <span className="text-xs font-semibold">{Math.round((parseFloat(analysis.confidence?.toString() || '0')) * 100)}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{analysis.summary}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-500">{formatTimeAgo(analysis.generatedAt instanceof Date ? analysis.generatedAt.toISOString() : analysis.generatedAt || '')}</span>
                          {selectedAnalysisIds.quantitative.includes(analysis.id) && (
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Generated Macro Analysis Results */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">생성된 통합 분석</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">AI 기반 종합 시장 분석 리포트</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {macroLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : macroAnalysisList && macroAnalysisList.length > 0 ? (
              <div className="space-y-4">
                {macroAnalysisList.map((macroAnalysis) => (
                  <div 
                    key={macroAnalysis.id} 
                    className="p-6 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
                    data-testid={`item-macro-analysis-${macroAnalysis.id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{macroAnalysis.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{macroAnalysis.integratedSummary}</p>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                          통합분석
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatTimeAgo(macroAnalysis.generatedAt instanceof Date ? macroAnalysis.generatedAt.toISOString() : macroAnalysis.generatedAt || '')}
                        </span>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">주요 인사이트</h4>
                      <div className="bg-white dark:bg-slate-900 rounded-md p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {macroAnalysis.integratedContent}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Newspaper className="h-3 w-3" />
                        <span>뉴스분석 {macroAnalysis.newsAnalysis ? '완료' : '미완료'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>테마분석 {macroAnalysis.themeAnalysis ? '완료' : '미완료'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        <span>정량분석 {macroAnalysis.quantitativeAnalysis ? '완료' : '미완료'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  통합 분석을 생성하려면 각 스트림에서 데이터를 선택하고<br />
                  상단의 "통합 분석 생성" 버튼을 클릭하세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>워크플로우 템플릿 설정</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.analysisType} 분석 워크플로우의 설정을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">템플릿 이름</Label>
              <Input
                id="template-name"
                value={templateConfig.name}
                onChange={(e) => setTemplateConfig({ ...templateConfig, name: e.target.value })}
                placeholder="템플릿 이름 입력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">설명</Label>
              <Textarea
                id="template-description"
                value={templateConfig.description}
                onChange={(e) => setTemplateConfig({ ...templateConfig, description: e.target.value })}
                placeholder="템플릿 설명 입력"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              취소
            </Button>
            <Button 
              onClick={handleSaveConfig}
              disabled={updateTemplateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateTemplateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
