import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  Brain, 
  TrendingUp,
  BarChart3,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import WorkflowStep from '@/components/ai-market-analysis/WorkflowStep';
import WorkflowVisualization from '@/components/ai-market-analysis/WorkflowVisualization';
import ResultsPanel from '@/components/ai-market-analysis/ResultsPanel';
import { NewsCollectionProgress } from '@/components/ai-market-analysis/NewsCollectionProgress';
import { useWorkflowStatus } from '@/hooks/useWorkflowStatus';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  data?: any;
}

interface WorkflowData {
  newsData: any[];
  marketEvents: any[];
  themeMarkets: any[];
  macroMarket: any;
}

const AIMarketAnalysis: React.FC = () => {
  const { workflowStatus, newsCollectionStatus, isConnected } = useWorkflowStatus();
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      id: 'collect-news',
      name: '뉴스 데이터 수집',
      description: '최근 30분간의 뉴스 데이터를 수집하고 전처리합니다.',
      status: 'pending',
      progress: 0
    },
    {
      id: 'extract-events',
      name: '주요이벤트 추출',
      description: 'AI를 활용하여 시장에 영향을 미치는 주요 이벤트를 추출합니다.',
      status: 'pending',
      progress: 0
    },
    {
      id: 'generate-themes',
      name: '테마 시황 생성',
      description: '테마별 뉴스 분석 및 시황을 생성합니다.',
      status: 'pending',
      progress: 0
    },
    {
      id: 'generate-macro',
      name: '매크로 시황 생성',
      description: '전체 시장의 종합적인 매크로 시황을 생성합니다.',
      status: 'pending',
      progress: 0
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [enableEmbedding, setEnableEmbedding] = useState(true);
  
  // Fetch execution history
  const { data: executionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/ai-market-analysis/execution-history'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/ai-market-analysis/execution-history');
        if (!response.ok) {
          return [];
        }
        const data = await response.json();
        return data.executions || data.history || [];
      } catch (error) {
        console.error('Failed to fetch execution history:', error);
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const updateStepStatus = (stepId: string, status: WorkflowStep['status'], progress: number = 0, error?: string, data?: any) => {
    setWorkflowSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        const now = new Date();
        return {
          ...step,
          status,
          progress,
          error,
          data,
          startTime: status === 'running' ? now : step.startTime,
          endTime: status === 'completed' || status === 'error' ? now : step.endTime
        };
      }
      return step;
    }));
  };

  const executeWorkflow = async () => {
    if (isRunning) {
      toast.error('워크플로우가 이미 실행 중입니다.');
      return;
    }
    
    setIsRunning(true);
    setCurrentStep(null);
    const startTime = Date.now();
    
    try {
      // 단계별 실행 (순차적으로 진행)
      // 1. 뉴스 데이터 수집
      updateStepStatus('collect-news', 'running', 0);
      setCurrentStep('collect-news');
      
      const newsResponse = await apiRequest('POST', '/api/ai-market-analysis/collect-news', {
        enableEmbedding: enableEmbedding
      });
      
      if (!newsResponse.ok) {
        const errorData = await newsResponse.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || '뉴스 데이터 수집에 실패했습니다.');
      }
      
      const newsResult = await newsResponse.json();
      
      if (!newsResult.success) {
        throw new Error(newsResult.message || '뉴스 데이터 수집에 실패했습니다.');
      }
      
      updateStepStatus('collect-news', 'completed', 100, undefined, newsResult.data);
      setWorkflowData(prev => ({ 
        newsData: newsResult.data || [], 
        marketEvents: prev?.marketEvents || [], 
        themeMarkets: prev?.themeMarkets || [], 
        macroMarket: prev?.macroMarket || null 
      }));
      
      // 2. 주요이벤트 추출
      updateStepStatus('extract-events', 'running', 0);
      setCurrentStep('extract-events');
      const eventsResponse = await apiRequest('POST', '/api/ai-market-analysis/extract-events', {
        newsData: newsResult.data || []
      });
      
      const eventsContentType = eventsResponse.headers.get('content-type') || '';
      let eventsResult;
      
      if (eventsContentType.includes('application/json')) {
        eventsResult = await eventsResponse.json();
      } else {
        const htmlText = await eventsResponse.text();
        console.error('HTML Response in extract-events:', htmlText.substring(0, 500));
        throw new Error('서버가 JSON 대신 HTML을 반환했습니다. 서버 오류일 수 있습니다.');
      }
      
      if (!eventsResult.success) {
        throw new Error(eventsResult.message || '주요이벤트 추출에 실패했습니다.');
      }
      
      updateStepStatus('extract-events', 'completed', 100, undefined, eventsResult.data);
      setWorkflowData(prev => ({ 
        newsData: prev?.newsData || [], 
        marketEvents: eventsResult.data || [], 
        themeMarkets: prev?.themeMarkets || [], 
        macroMarket: prev?.macroMarket || null 
      }));
      
      // 3. 테마 시황 생성
      updateStepStatus('generate-themes', 'running', 0);
      setCurrentStep('generate-themes');
      const themesResponse = await apiRequest('POST', '/api/ai-market-analysis/generate-themes', {});
      
      const themesContentType = themesResponse.headers.get('content-type') || '';
      let themesResult;
      
      if (themesContentType.includes('application/json')) {
        themesResult = await themesResponse.json();
      } else {
        const htmlText = await themesResponse.text();
        console.error('HTML Response in generate-themes:', htmlText.substring(0, 500));
        throw new Error('서버가 JSON 대신 HTML을 반환했습니다. 서버 오류일 수 있습니다.');
      }
      
      if (!themesResult.success) {
        throw new Error(themesResult.message || '테마 시황 생성에 실패했습니다.');
      }
      
      updateStepStatus('generate-themes', 'completed', 100, undefined, themesResult.data);
      setWorkflowData(prev => ({ 
        newsData: prev?.newsData || [], 
        marketEvents: prev?.marketEvents || [], 
        themeMarkets: themesResult.data || [], 
        macroMarket: prev?.macroMarket || null 
      }));
      
      // 4. 매크로 시황 생성
      updateStepStatus('generate-macro', 'running', 0);
      setCurrentStep('generate-macro');
      const macroResponse = await apiRequest('POST', '/api/ai-market-analysis/generate-macro', {});
      
      const macroContentType = macroResponse.headers.get('content-type') || '';
      let macroResult;
      
      if (macroContentType.includes('application/json')) {
        macroResult = await macroResponse.json();
      } else {
        const htmlText = await macroResponse.text();
        console.error('HTML Response in generate-macro:', htmlText.substring(0, 500));
        throw new Error('서버가 JSON 대신 HTML을 반환했습니다. 서버 오류일 수 있습니다.');
      }
      
      if (!macroResult.success) {
        throw new Error(macroResult.message || '매크로 시황 생성에 실패했습니다.');
      }
      
      updateStepStatus('generate-macro', 'completed', 100, undefined, macroResult.data);
      setWorkflowData(prev => ({ 
        newsData: prev?.newsData || [], 
        marketEvents: prev?.marketEvents || [], 
        themeMarkets: prev?.themeMarkets || [], 
        macroMarket: macroResult.data || null 
      }));
      
      const executionTime = Date.now() - startTime;
      const executionId = `exec-${Date.now()}`;
      
      // Save to execution history
      const historyEntry = {
        id: executionId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        data: {
          newsData: newsResult.data,
          marketEvents: eventsResult.data,
          themeMarkets: themesResult.data,
          macroMarket: macroResult.data
        },
        executionTime,
      };
      
      try {
        await apiRequest('POST', '/api/ai-market-analysis/execution-history', historyEntry);
      } catch (error) {
        console.warn('Failed to save execution history:', error);
      }
      
      toast.success('AI 시황 생성 워크플로우가 성공적으로 완료되었습니다.');
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error('워크플로우 실행 오류:', error);
      
      // 현재 실행 중인 단계를 에러로 표시
      const failedStep = currentStep || 'collect-news';
      updateStepStatus(failedStep, 'error', 0, error?.message || 'Unknown error');
      
      // Save failed execution to history
      const historyEntry = {
        id: `exec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'failed',
        data: null,
        executionTime,
        error: error?.message || 'Unknown error',
        failedStep,
      };
      
      try {
        await apiRequest('POST', '/api/ai-market-analysis/execution-history', historyEntry);
      } catch (historyError) {
        console.warn('Failed to save execution history:', historyError);
      }
      
      toast.error(`워크플로우 실행 중 오류가 발생했습니다: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  };

  const executeStep = async (stepId: string) => {
    try {
      updateStepStatus(stepId, 'running', 0);
      setCurrentStep(stepId);
      
      let endpoint = '';
      let body = {};
      
      switch (stepId) {
        case 'collect-news':
          endpoint = '/api/ai-market-analysis/collect-news';
          body = { enableEmbedding: enableEmbedding };
          break;
        case 'extract-events':
          endpoint = '/api/ai-market-analysis/extract-events';
          if (!workflowData?.newsData || workflowData.newsData.length === 0) {
            throw new Error('뉴스 데이터가 필요합니다. 먼저 뉴스 데이터 수집을 실행해주세요.');
          }
          body = { newsData: workflowData.newsData };
          break;
        case 'generate-themes':
          endpoint = '/api/ai-market-analysis/generate-themes';
          break;
        case 'generate-macro':
          endpoint = '/api/ai-market-analysis/generate-macro';
          break;
        default:
          throw new Error('알 수 없는 단계입니다.');
      }

      const response = await apiRequest('POST', endpoint, body);

      if (!response.ok) {
        // 응답이 HTML인지 확인
        const contentType = response.headers.get('content-type') || '';
        let errorData;
        
        if (contentType.includes('application/json')) {
          errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        } else {
          // HTML 응답인 경우
          const htmlText = await response.text().catch(() => 'Unknown error');
          console.error('HTML Error Response:', htmlText.substring(0, 500));
          errorData = { 
            message: `서버 오류가 발생했습니다. (Status: ${response.status})`,
            html: htmlText.substring(0, 500)
          };
        }
        throw new Error(errorData.message || errorData.error || `${stepId} 실행에 실패했습니다.`);
      }

      // 응답이 JSON인지 확인
      const contentType = response.headers.get('content-type') || '';
      let result;
      
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // HTML 응답인 경우
        const htmlText = await response.text();
        console.error('HTML Response received:', htmlText.substring(0, 500));
        throw new Error('서버가 JSON 대신 HTML을 반환했습니다. 서버 오류일 수 있습니다.');
      }
      
      if (!result.success) {
        throw new Error(result.message || result.error || `${stepId} 실행에 실패했습니다.`);
      }
      
      // 뉴스 수집 진행률 업데이트 (collect-news 단계)
      if (stepId === 'collect-news') {
        const newsCount = Array.isArray(result.data) ? result.data.length : (result.count || result.totalCount || 0);
        updateStepStatus(stepId, 'completed', 100, undefined, result.data);
        
        // 뉴스 수집 상태도 업데이트 (useWorkflowStatus hook에서 사용)
        // 실제로는 WebSocket이나 폴링으로 업데이트되지만, 여기서도 즉시 반영
      } else {
        updateStepStatus(stepId, 'completed', 100, undefined, result.data);
      }
      
      // 워크플로우 데이터 업데이트
      if (stepId === 'collect-news') {
        setWorkflowData(prev => ({ 
          newsData: result.data || [], 
          marketEvents: prev?.marketEvents || [], 
          themeMarkets: prev?.themeMarkets || [], 
          macroMarket: prev?.macroMarket || null 
        }));
      } else if (stepId === 'extract-events') {
        setWorkflowData(prev => ({ 
          newsData: prev?.newsData || [], 
          marketEvents: result.data || [], 
          themeMarkets: prev?.themeMarkets || [], 
          macroMarket: prev?.macroMarket || null 
        }));
      } else if (stepId === 'generate-themes') {
        setWorkflowData(prev => ({ 
          newsData: prev?.newsData || [], 
          marketEvents: prev?.marketEvents || [], 
          themeMarkets: result.data || [], 
          macroMarket: prev?.macroMarket || null 
        }));
      } else if (stepId === 'generate-macro') {
        setWorkflowData(prev => ({ 
          newsData: prev?.newsData || [], 
          marketEvents: prev?.marketEvents || [], 
          themeMarkets: prev?.themeMarkets || [], 
          macroMarket: result.data || null 
        }));
      }
      
      toast.success(`${workflowSteps.find(s => s.id === stepId)?.name}이 성공적으로 완료되었습니다.`);
    } catch (error: any) {
      console.error(`${stepId} 실행 오류:`, error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      updateStepStatus(stepId, 'error', 0, errorMessage);
      toast.error(`${workflowSteps.find(s => s.id === stepId)?.name} 실행 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setCurrentStep(null);
    }
  };

  const resetWorkflow = () => {
    setWorkflowSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending',
      progress: 0,
      startTime: undefined,
      endTime: undefined,
      error: undefined,
      data: undefined
    })));
    setWorkflowData(null);
    setCurrentStep(null);
    setIsRunning(false);
  };

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepBadge = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">완료</Badge>;
      case 'error':
        return <Badge variant="destructive">오류</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500">실행중</Badge>;
      default:
        return <Badge variant="secondary">대기</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI 시황 생성 테스트</h1>
          <p className="text-muted-foreground mt-2">
            Databricks 기반 AI 시황 생성 워크플로우를 시각화하고 테스트합니다.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="enable-embedding"
              checked={enableEmbedding}
              onCheckedChange={setEnableEmbedding}
              disabled={isRunning}
            />
            <Label htmlFor="enable-embedding" className="text-sm font-normal cursor-pointer">
              임베딩 생성
            </Label>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={executeWorkflow}
              disabled={isRunning}
              className="flex items-center gap-2"
              data-testid="button-execute-workflow"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  실행 중...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  전체 워크플로우 실행
                </>
              )}
            </Button>
            <Button
              onClick={resetWorkflow}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 뉴스 수집 진행 상황 */}
      <NewsCollectionProgress
        isCollecting={newsCollectionStatus.isCollecting}
        progress={newsCollectionStatus.progress}
        collectedCount={newsCollectionStatus.collectedCount}
        totalCount={newsCollectionStatus.totalCount}
        newsItems={(newsCollectionStatus as any)?.data || []}
        error={newsCollectionStatus.error}
        onRefresh={() => executeStep('collect-news')}
      />

      {/* 워크플로우 시각화 */}
      <WorkflowVisualization 
        steps={workflowSteps}
        onStepExecute={executeStep}
        disabled={isRunning}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 개별 워크플로우 단계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              개별 단계 실행
            </CardTitle>
            <CardDescription>
              각 단계를 개별적으로 실행하고 모니터링할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflowSteps.map((step) => (
              <WorkflowStep
                key={step.id}
                {...step}
                onExecute={executeStep}
                disabled={isRunning}
              />
            ))}
          </CardContent>
        </Card>

        {/* 결과 데이터 */}
        <ResultsPanel 
          data={workflowData}
          isLoading={isRunning}
          executionHistory={executionHistory || []}
        />
      </div>
    </div>
  );
};

export default AIMarketAnalysis;
