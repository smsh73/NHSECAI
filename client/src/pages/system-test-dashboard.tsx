import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  RefreshCw,
  Database,
  Workflow,
  FileText,
  Settings,
  Loader2
} from "lucide-react";

interface TestResult {
  category: string;
  name: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message?: string;
  details?: any;
}

export default function SystemTestDashboard() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Azure 서비스 상태 조회 (실시간 모니터링)
  const { data: azureStatus, refetch: refetchAzure } = useQuery({
    queryKey: ['/api/azure/services/status'],
    refetchInterval: 30000, // 30초마다 자동 새로고침
  });

  // OpenAI 프로바이더 상태 조회 (실시간 모니터링)
  const { data: openaiStatus, refetch: refetchOpenAI } = useQuery({
    queryKey: ['/api/openai/providers/status'],
    refetchInterval: 30000,
  });

  // 워크플로우 목록 조회 (실시간 모니터링)
  const { data: workflows, refetch: refetchWorkflows } = useQuery<any[]>({
    queryKey: ['/api/workflows'],
    refetchInterval: 60000, // 1분마다 자동 새로고침
  });

  // 프롬프트 목록 조회
  const { data: prompts, refetch: refetchPrompts } = useQuery<any[]>({
    queryKey: ['/api/prompts'],
    refetchInterval: 60000,
  });

  // API 등록 조회
  const { data: apiCalls, refetch: refetchAPIs } = useQuery<any[]>({
    queryKey: ['/api/api-calls'],
    refetchInterval: 60000,
  });

  // 워크플로우 통계 조회 (실시간 모니터링)
  const { data: workflowStats, refetch: refetchStats } = useQuery({
    queryKey: ['/api/workflows/stats'],
    refetchInterval: 30000,
  });

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setProgress(0);
    const results: TestResult[] = [];

    try {
      // Test 1: Azure Services
      setProgress(10);
      try {
        const { data: azureData } = await refetchAzure();
        const services = Object.entries((azureData as any)?.services || {});
        const configuredServices = services.filter(([, service]: [string, any]) => service.isConfigured);
        const connectedServices = configuredServices.filter(([, service]: [string, any]) => service.isConnected);
        
        let status: 'success' | 'warning' | 'error' = 'error';
        let message = 'Azure 서비스 미설정';
        
        if (configuredServices.length > 0) {
          if (connectedServices.length === configuredServices.length) {
            status = 'success';
            message = `${connectedServices.length}개 서비스 정상 연결`;
          } else if (connectedServices.length > 0) {
            status = 'warning';
            message = `${connectedServices.length}/${configuredServices.length}개 서비스 연결`;
          } else {
            status = 'warning';
            message = `${configuredServices.length}개 서비스 설정됨 (연결 안됨)`;
          }
        }
        
        results.push({
          category: 'Azure Services',
          name: 'Azure 서비스 연결',
          status,
          message,
          details: azureData,
        });
      } catch (e) {
        results.push({
          category: 'Azure Services',
          name: 'Azure 서비스 연결',
          status: 'error',
          message: '연결 실패',
        });
      }

      // Test 2: OpenAI Providers
      setProgress(20);
      try {
        const { data: openaiData } = await refetchOpenAI();
        const activeProviders = (openaiData as any)?.providers?.filter((p: any) => p.isActive) || [];
        results.push({
          category: 'AI Services',
          name: 'OpenAI 프로바이더',
          status: activeProviders.length > 0 ? 'success' : 'error',
          message: `${activeProviders.length}개 프로바이더 활성화`,
          details: openaiData,
        });
      } catch (e) {
        results.push({
          category: 'AI Services',
          name: 'OpenAI 프로바이더',
          status: 'error',
          message: '상태 확인 실패',
        });
      }

      // Test 3: 워크플로우
      setProgress(40);
      try {
        const { data: wfData } = await refetchWorkflows();
        results.push({
          category: 'Workflows',
          name: '워크플로우 로드',
          status: wfData && wfData.length > 0 ? 'success' : 'warning',
          message: `${wfData?.length || 0}개 워크플로우`,
          details: wfData,
        });

        // Test workflow stats
        const { data: statsData } = await refetchStats();
        results.push({
          category: 'Workflows',
          name: '워크플로우 스케줄러',
          status: statsData ? 'success' : 'error',
          message: `${(statsData as any)?.totalJobs || 0}개 작업 스케줄됨`,
          details: statsData,
        });
      } catch (e) {
        results.push({
          category: 'Workflows',
          name: '워크플로우 시스템',
          status: 'error',
          message: '테스트 실패',
        });
      }

      // Test 4: 프롬프트
      setProgress(60);
      try {
        const { data: promptData } = await refetchPrompts();
        results.push({
          category: 'Prompts',
          name: '프롬프트 관리',
          status: promptData && promptData.length > 0 ? 'success' : 'warning',
          message: `${promptData?.length || 0}개 프롬프트`,
          details: promptData,
        });
      } catch (e) {
        results.push({
          category: 'Prompts',
          name: '프롬프트 관리',
          status: 'error',
          message: '로드 실패',
        });
      }

      // Test 5: API 등록
      setProgress(80);
      try {
        const { data: apiData } = await refetchAPIs();
        results.push({
          category: 'API Management',
          name: 'API 등록 관리',
          status: apiData && apiData.length > 0 ? 'success' : 'warning',
          message: `${apiData?.length || 0}개 API 등록`,
          details: apiData,
        });
      } catch (e) {
        results.push({
          category: 'API Management',
          name: 'API 등록 관리',
          status: 'error',
          message: '로드 실패',
        });
      }

      setProgress(100);
      setTestResults(results);

      const failedTests = results.filter(r => r.status === 'error').length;
      const successTests = results.filter(r => r.status === 'success').length;

      toast({
        title: "시스템 테스트 완료",
        description: `성공: ${successTests}개, 실패: ${failedTests}개`,
        variant: failedTests > 0 ? "destructive" : "default",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
      pending: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status === 'success' ? '정상' : status === 'error' ? '실패' : status === 'warning' ? '경고' : '대기'}
      </Badge>
    );
  };

  const groupedResults = testResults.reduce((acc, result) => {
    if (!acc[result.category]) acc[result.category] = [];
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <div className="w-full px-6 py-6">
      <h1 className="text-3xl font-bold">시스템 통합 테스트 대시보드</h1>
      <div className="mb-6">
        <p className="text-muted-foreground mt-2">
          전체 시스템 기능 점검 및 상태 모니터링
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>통합 테스트 실행</CardTitle>
            <CardDescription>
              Azure 서비스, OpenAI, 워크플로우, 프롬프트, API 등록 등 모든 시스템을 테스트합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={runComprehensiveTest}
                disabled={isRunning}
                size="lg"
                data-testid="button-run-comprehensive-test"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    테스트 실행 중...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    통합 테스트 실행
                  </>
                )}
              </Button>
              {testResults.length > 0 && (
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600 font-medium">
                    성공: {testResults.filter(r => r.status === 'success').length}
                  </span>
                  <span className="text-yellow-600 font-medium">
                    경고: {testResults.filter(r => r.status === 'warning').length}
                  </span>
                  <span className="text-red-600 font-medium">
                    실패: {testResults.filter(r => r.status === 'error').length}
                  </span>
                </div>
              )}
            </div>
            {isRunning && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">테스트 진행 중: {progress}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>테스트 결과</CardTitle>
              <CardDescription>카테고리별 테스트 결과 상세</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(groupedResults)[0]}>
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(groupedResults).length}, 1fr)` }}>
                  {Object.keys(groupedResults).map((category) => (
                    <TabsTrigger key={category} value={category}>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(groupedResults).map(([category, results]) => (
                  <TabsContent key={category} value={category} className="space-y-4 mt-4">
                    {results.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(result.status)}
                            <div>
                              <h4 className="font-medium">{result.name}</h4>
                              {result.message && (
                                <p className="text-sm text-muted-foreground">{result.message}</p>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(result.status)}
                        </div>
                        {result.details && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                              상세 정보 보기
                            </summary>
                            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-48">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>빠른 액세스</CardTitle>
            <CardDescription>주요 기능 페이지로 바로 이동</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20" asChild>
              <a href="/workflow-editor">
                <div className="text-center">
                  <Workflow className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm">워크플로우 에디터</div>
                </div>
              </a>
            </Button>
            <Button variant="outline" className="h-20" asChild>
              <a href="/prompt-builder">
                <div className="text-center">
                  <FileText className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm">프롬프트 빌더</div>
                </div>
              </a>
            </Button>
            <Button variant="outline" className="h-20" asChild>
              <a href="/api-management">
                <div className="text-center">
                  <Settings className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm">API 관리</div>
                </div>
              </a>
            </Button>
            <Button variant="outline" className="h-20" asChild>
              <a href="/schema-browser">
                <div className="text-center">
                  <Database className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm">스키마 브라우저</div>
                </div>
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
