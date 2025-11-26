import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  TestTube2, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  FileText,
  Workflow as WorkflowIcon,
  Code,
  RefreshCw
} from "lucide-react";
import { ApiCall, Workflow, Prompt } from "@shared/schema";

interface TestResult {
  id: string;
  type: 'api' | 'prompt' | 'workflow';
  name: string;
  status: 'success' | 'failed' | 'testing';
  responseTime?: number;
  errorMessage?: string;
  testedAt: Date;
  details?: any;
}

export default function UnitTesting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [activeTab, setActiveTab] = useState('api');

  const { data: apiCalls, isLoading: apiCallsLoading } = useQuery<ApiCall[]>({
    queryKey: ['/api/api-calls/enhanced'],
  });

  const { data: workflows, isLoading: workflowsLoading } = useQuery<Workflow[]>({
    queryKey: ['/api/workflows'],
  });

  const { data: prompts, isLoading: promptsLoading } = useQuery<Prompt[]>({
    queryKey: ['/api/prompts'],
  });

  const testApiMutation = useMutation({
    mutationFn: async ({ apiId, testPayload }: { apiId: string; testPayload?: any }) => {
      const response = await apiRequest('POST', `/api/api-calls/${apiId}/test`, { testPayload });
      return response.json();
    },
    onSuccess: (data, variables) => {
      const apiCall = apiCalls?.find(api => api.id === variables.apiId);
      setTestResults(prev => ({
        ...prev,
        [`api-${variables.apiId}`]: {
          id: variables.apiId,
          type: 'api',
          name: apiCall?.displayName || apiCall?.name || 'Unknown API',
          status: data.status === 'success' ? 'success' : 'failed',
          responseTime: data.responseTime,
          errorMessage: data.errorMessage,
          testedAt: new Date(),
          details: data.actualResponse
        }
      }));
      toast({
        title: data.status === 'success' ? "API 테스트 성공" : "API 테스트 실패",
        description: data.status === 'success' 
          ? `응답 시간: ${data.responseTime}ms` 
          : data.errorMessage,
        variant: data.status === 'success' ? "default" : "destructive",
      });
    },
    onError: (error: any, variables) => {
      const apiCall = apiCalls?.find(api => api.id === variables.apiId);
      setTestResults(prev => ({
        ...prev,
        [`api-${variables.apiId}`]: {
          id: variables.apiId,
          type: 'api',
          name: apiCall?.displayName || apiCall?.name || 'Unknown API',
          status: 'failed',
          errorMessage: error.message,
          testedAt: new Date(),
        }
      }));
    }
  });

  const testWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await apiRequest('POST', `/api/workflows/${workflowId}/execute`, {});
      return response.json();
    },
    onSuccess: (data, workflowId) => {
      const workflow = workflows?.find(w => w.id === workflowId);
      setTestResults(prev => ({
        ...prev,
        [`workflow-${workflowId}`]: {
          id: workflowId,
          type: 'workflow',
          name: workflow?.name || 'Unknown Workflow',
          status: 'success',
          testedAt: new Date(),
          details: data
        }
      }));
      toast({
        title: "워크플로우 테스트 시작",
        description: "워크플로우가 백그라운드에서 실행되고 있습니다.",
      });
    },
    onError: (error: any, workflowId) => {
      const workflow = workflows?.find(w => w.id === workflowId);
      setTestResults(prev => ({
        ...prev,
        [`workflow-${workflowId}`]: {
          id: workflowId,
          type: 'workflow',
          name: workflow?.name || 'Unknown Workflow',
          status: 'failed',
          errorMessage: error.message,
          testedAt: new Date(),
        }
      }));
    }
  });

  const testPromptMutation = useMutation({
    mutationFn: async ({ promptId }: { promptId: string }) => {
      const response = await apiRequest('POST', '/api/prompts/test', { 
        promptId
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables) => {
      const prompt = prompts?.find(p => p.id === variables.promptId);
      const status = data.success ? 'success' : 'failed';
      setTestResults(prev => ({
        ...prev,
        [`prompt-${variables.promptId}`]: {
          id: variables.promptId,
          type: 'prompt',
          name: prompt?.name || 'Unknown Prompt',
          status,
          responseTime: data.executionTime,
          testedAt: new Date(),
          details: data,
          errorMessage: data.success ? undefined : data.error
        }
      }));
      toast({
        title: data.success ? "프롬프트 테스트 성공" : "프롬프트 테스트 실패",
        description: data.success 
          ? `응답 시간: ${data.executionTime}ms, 모델: ${data.model}` 
          : data.error || '테스트 실패',
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any, variables) => {
      const prompt = prompts?.find(p => p.id === variables.promptId);
      setTestResults(prev => ({
        ...prev,
        [`prompt-${variables.promptId}`]: {
          id: variables.promptId,
          type: 'prompt',
          name: prompt?.name || 'Unknown Prompt',
          status: 'failed',
          errorMessage: error.message,
          testedAt: new Date(),
        }
      }));
      toast({
        title: "프롬프트 테스트 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleTestApi = (apiId: string) => {
    setTestResults(prev => ({
      ...prev,
      [`api-${apiId}`]: {
        id: apiId,
        type: 'api',
        name: apiCalls?.find(api => api.id === apiId)?.displayName || 'Testing...',
        status: 'testing',
        testedAt: new Date(),
      }
    }));
    testApiMutation.mutate({ apiId });
  };

  const handleTestWorkflow = (workflowId: string) => {
    setTestResults(prev => ({
      ...prev,
      [`workflow-${workflowId}`]: {
        id: workflowId,
        type: 'workflow',
        name: workflows?.find(w => w.id === workflowId)?.name || 'Testing...',
        status: 'testing',
        testedAt: new Date(),
      }
    }));
    testWorkflowMutation.mutate(workflowId);
  };

  const handleTestPrompt = (promptId: string) => {
    setTestResults(prev => ({
      ...prev,
      [`prompt-${promptId}`]: {
        id: promptId,
        type: 'prompt',
        name: prompts?.find(p => p.id === promptId)?.name || 'Testing...',
        status: 'testing',
        testedAt: new Date(),
      }
    }));
    testPromptMutation.mutate({ promptId });
  };

  const handleTestAll = (type: 'api' | 'workflow' | 'prompt') => {
    if (type === 'api' && apiCalls) {
      apiCalls.forEach(api => handleTestApi(api.id));
    } else if (type === 'workflow' && workflows) {
      workflows.forEach(workflow => handleTestWorkflow(workflow.id));
    } else if (type === 'prompt' && prompts) {
      prompts.forEach(prompt => handleTestPrompt(prompt.id));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'testing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600">성공</Badge>;
      case 'failed':
        return <Badge variant="destructive">실패</Badge>;
      case 'testing':
        return <Badge variant="secondary">테스트 중</Badge>;
      default:
        return <Badge variant="outline">대기</Badge>;
    }
  };

  const apiTestResults = Object.values(testResults).filter(r => r.type === 'api');
  const workflowTestResults = Object.values(testResults).filter(r => r.type === 'workflow');
  const promptTestResults = Object.values(testResults).filter(r => r.type === 'prompt');

  return (
    <div className="w-full px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <TestTube2 className="w-8 h-8 text-primary" />
            단위 테스트
          </h1>
          <p className="text-muted-foreground">
            등록된 API, 프롬프트, 워크플로우를 개별적으로 테스트합니다
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/api-calls/enhanced'] });
            queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
          }}
          data-testid="button-refresh-tests"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            API 테스트
          </TabsTrigger>
          <TabsTrigger value="prompt" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            프롬프트 테스트
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <WorkflowIcon className="w-4 h-4" />
            워크플로우 테스트
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API 테스트</CardTitle>
                  <CardDescription>
                    등록된 API를 개별적으로 테스트하여 동작을 확인합니다
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleTestAll('api')}
                  disabled={!apiCalls || apiCalls.length === 0 || testApiMutation.isPending}
                  data-testid="button-test-all-apis"
                >
                  <Play className="w-4 h-4 mr-2" />
                  전체 테스트
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {apiCallsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>API 목록 로딩 중...</span>
                </div>
              ) : !apiCalls || apiCalls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 API가 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {apiCalls.map(api => {
                    const testResult = testResults[`api-${api.id}`];
                    return (
                      <div
                        key={api.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                        data-testid={`test-result-api-${api.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {getStatusIcon(testResult?.status || '')}
                          <div className="flex-1">
                            <div className="font-medium">{api.displayName || api.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {api.method} {api.url}
                            </div>
                            {testResult?.errorMessage && (
                              <div className="text-sm text-red-600 mt-1">
                                {testResult.errorMessage}
                              </div>
                            )}
                            {testResult?.responseTime && (
                              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {testResult.responseTime}ms
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {testResult && getStatusBadge(testResult.status)}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestApi(api.id)}
                              disabled={testApiMutation.isPending}
                              data-testid={`button-test-api-${api.id}`}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              테스트
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {apiTestResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>테스트 결과 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {apiTestResults.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-sm text-muted-foreground">성공</div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {apiTestResults.filter(r => r.status === 'failed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">실패</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {apiTestResults.filter(r => r.status === 'testing').length}
                    </div>
                    <div className="text-sm text-muted-foreground">진행 중</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prompt" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>프롬프트 테스트</CardTitle>
                  <CardDescription>
                    등록된 프롬프트를 샘플 데이터로 실제 실행하여 OpenAI API 응답을 확인합니다
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/prompt-builder'}
                    data-testid="button-goto-prompt-builder"
                  >
                    프롬프트 빌더로 이동
                  </Button>
                  <Button
                    onClick={() => handleTestAll('prompt')}
                    disabled={!prompts || prompts.length === 0 || testPromptMutation.isPending}
                    data-testid="button-test-all-prompts"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    전체 테스트
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {promptsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>프롬프트 목록 로딩 중...</span>
                </div>
              ) : !prompts || prompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 프롬프트가 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {prompts.map(prompt => {
                    const testResult = testResults[`prompt-${prompt.id}`];
                    return (
                      <div
                        key={prompt.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                        data-testid={`test-result-prompt-${prompt.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {getStatusIcon(testResult?.status || '')}
                          <div className="flex-1">
                            <div className="font-medium">{prompt.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {prompt.description || prompt.systemPrompt?.substring(0, 100)}
                            </div>
                            {testResult?.errorMessage && (
                              <div className="text-sm text-red-600 mt-1">
                                {testResult.errorMessage}
                              </div>
                            )}
                            {testResult?.responseTime && (
                              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {testResult.responseTime}ms
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {testResult && getStatusBadge(testResult.status)}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestPrompt(prompt.id)}
                              disabled={testPromptMutation.isPending}
                              data-testid={`button-test-prompt-${prompt.id}`}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              테스트
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {promptTestResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>테스트 결과 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {promptTestResults.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-sm text-muted-foreground">성공</div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {promptTestResults.filter(r => r.status === 'failed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">실패</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {promptTestResults.filter(r => r.status === 'testing').length}
                    </div>
                    <div className="text-sm text-muted-foreground">진행 중</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>워크플로우 테스트</CardTitle>
                  <CardDescription>
                    등록된 워크플로우를 개별적으로 실행하여 테스트합니다
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleTestAll('workflow')}
                  disabled={!workflows || workflows.length === 0 || testWorkflowMutation.isPending}
                  data-testid="button-test-all-workflows"
                >
                  <Play className="w-4 h-4 mr-2" />
                  전체 테스트
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {workflowsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>워크플로우 목록 로딩 중...</span>
                </div>
              ) : !workflows || workflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 워크플로우가 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {workflows.map(workflow => {
                    const testResult = testResults[`workflow-${workflow.id}`];
                    return (
                      <div
                        key={workflow.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                        data-testid={`test-result-workflow-${workflow.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {getStatusIcon(testResult?.status || '')}
                          <div className="flex-1">
                            <div className="font-medium">{workflow.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {workflow.description || '설명 없음'}
                            </div>
                            {testResult?.errorMessage && (
                              <div className="text-sm text-red-600 mt-1">
                                {testResult.errorMessage}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {testResult && getStatusBadge(testResult.status)}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestWorkflow(workflow.id)}
                              disabled={testWorkflowMutation.isPending}
                              data-testid={`button-test-workflow-${workflow.id}`}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              테스트
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {workflowTestResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>테스트 결과 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {workflowTestResults.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-sm text-muted-foreground">성공</div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {workflowTestResults.filter(r => r.status === 'failed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">실패</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {workflowTestResults.filter(r => r.status === 'testing').length}
                    </div>
                    <div className="text-sm text-muted-foreground">진행 중</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
