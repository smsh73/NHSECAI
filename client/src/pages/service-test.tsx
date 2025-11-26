import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DatabricksAIGenerator } from "@/components/ai-analysis/databricks-ai-generator";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Database, 
  Cloud, 
  Cpu,
  Sparkles,
  FileText,
  Activity,
  Workflow as WorkflowIcon,
  Newspaper,
  AlertTriangle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
  executionTime?: number;
}

interface ServiceTestSuite {
  service: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tests: TestResult[];
}

export default function ServiceTest() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<ServiceTestSuite[]>([]);
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Fetch Azure configuration summary
  const { data: azureConfigData, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/azure/config/summary'],
    queryFn: async () => {
      const response = await fetch('/api/azure/config/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch Azure configuration summary');
      }
      return response.json();
    }
  });

  // Fetch Azure configuration validation status
  const { data: azureValidationData, isLoading: isLoadingValidation } = useQuery({
    queryKey: ['/api/azure/config/validate'],
    queryFn: async () => {
      const response = await fetch('/api/azure/config/validate');
      if (!response.ok) {
        throw new Error('Failed to fetch Azure configuration validation');
      }
      return response.json();
    }
  });

  const databricksStatus = azureConfigData?.configuration?.databricks;
  const databricksValidation = azureValidationData?.services?.databricks;
  const isDatabricksConfigured = databricksValidation?.isValid === true;
  const databricksErrors = databricksValidation?.errors || [];

  // Test Databricks connection
  const testDatabricksMutation = useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      const results: TestResult[] = [];

      // Test 1: Schema fetch
      try {
        const schemaResponse = await fetch('/api/azure/databricks/schema');
        if (!schemaResponse.ok) throw new Error('Schema fetch failed');
        const schemaData = await schemaResponse.json();
        results.push({
          name: 'Unity Catalog 조회',
          status: 'success',
          message: `${schemaData.catalogs?.length || 0}개 카탈로그 발견`,
          details: schemaData,
          executionTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          name: 'Unity Catalog 조회',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 2: Query execution
      try {
        const queryStart = Date.now();
        const queryResponse = await apiRequest('POST', '/api/azure/databricks/query', {
          sql: 'SELECT 1 as test_value',
          maxRows: 10
        });
        results.push({
          name: '데이터 쿼리 실행',
          status: 'success',
          message: '쿼리 실행 성공',
          details: queryResponse,
          executionTime: Date.now() - queryStart
        });
      } catch (error) {
        results.push({
          name: '데이터 쿼리 실행',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return results;
    },
    onSuccess: (results) => {
      const serviceLabel = 'Databricks (서비스용 데이터)';
      setTestResults(prev => [
        ...prev.filter(suite => suite.service !== serviceLabel),
        {
          service: serviceLabel,
          icon: Database,
          color: 'text-blue-600',
          tests: results
        }
      ]);
    }
  });

  // Test PostgreSQL connection
  const testPostgreSQLMutation = useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      const results: TestResult[] = [];

      // Test 1: Schema fetch
      try {
        const schemaResponse = await fetch('/api/azure/postgresql/schema');
        if (!schemaResponse.ok) throw new Error('Schema fetch failed');
        const schemaData = await schemaResponse.json();
        results.push({
          name: '스키마 조회',
          status: 'success',
          message: `${schemaData.schemas?.length || 0}개 스키마 발견`,
          details: schemaData,
          executionTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          name: '스키마 조회',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 2: Query execution
      try {
        const queryStart = Date.now();
        const queryResponse = await apiRequest('POST', '/api/azure/postgresql/query', {
          sql: 'SELECT 1 as test_value',
          maxRows: 10
        });
        results.push({
          name: '관리 데이터 쿼리',
          status: 'success',
          message: '쿼리 실행 성공',
          details: queryResponse,
          executionTime: Date.now() - queryStart
        });
      } catch (error) {
        results.push({
          name: '관리 데이터 쿼리',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return results;
    },
    onSuccess: (results) => {
      const serviceLabel = 'PostgreSQL (관리용 데이터)';
      setTestResults(prev => [
        ...prev.filter(suite => suite.service !== serviceLabel),
        {
          service: serviceLabel,
          icon: Cpu,
          color: 'text-green-600',
          tests: results
        }
      ]);
    }
  });

  // Test CosmosDB connection
  const testCosmosDBMutation = useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      const results: TestResult[] = [];

      // Test 1: Schema fetch
      try {
        const schemaResponse = await fetch('/api/azure/cosmosdb/schema');
        if (!schemaResponse.ok) throw new Error('Schema fetch failed');
        const schemaData = await schemaResponse.json();
        results.push({
          name: '데이터베이스 조회',
          status: 'success',
          message: `${schemaData.databases?.length || 0}개 데이터베이스 발견`,
          details: schemaData,
          executionTime: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          name: '데이터베이스 조회',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return results;
    },
    onSuccess: (results) => {
      const serviceLabel = 'CosmosDB (RAG 데이터)';
      setTestResults(prev => [
        ...prev.filter(suite => suite.service !== serviceLabel),
        {
          service: serviceLabel,
          icon: Cloud,
          color: 'text-purple-600',
          tests: results
        }
      ]);
    }
  });

  // Test OpenAI connection
  const testOpenAIMutation = useMutation({
    mutationFn: async () => {
      const startTime = Date.now();
      const results: TestResult[] = [];

      // Test OpenAI provider status
      try {
        const providerResponse = await fetch('/api/openai-providers');
        if (!providerResponse.ok) throw new Error('Provider status fetch failed');
        const providerData = await providerResponse.json();
        
        const azurePTU = providerData.find((p: any) => p.id === 'azure_ptu');
        const azureEmbedding = providerData.find((p: any) => p.id === 'azure_embedding');
        const standard = providerData.find((p: any) => p.id === 'standard');

        results.push({
          name: 'Azure OpenAI PTU',
          status: azurePTU?.configured ? 'success' : 'error',
          message: azurePTU?.configured ? 'API Key 방식 설정됨' : '설정 필요',
          details: azurePTU
        });

        results.push({
          name: 'Azure OpenAI Embedding',
          status: azureEmbedding?.configured ? 'success' : 'error',
          message: azureEmbedding?.configured ? 'API Key 방식 설정됨' : '설정 필요',
          details: azureEmbedding
        });

        results.push({
          name: 'Standard OpenAI (Fallback)',
          status: standard?.configured ? 'success' : 'error',
          message: standard?.configured ? '백업 설정됨' : '설정 필요',
          details: standard
        });

      } catch (error) {
        results.push({
          name: 'OpenAI 제공자 확인',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return results;
    },
    onSuccess: (results) => {
      const serviceLabel = 'OpenAI (AI 분석)';
      setTestResults(prev => [
        ...prev.filter(suite => suite.service !== serviceLabel),
        {
          service: serviceLabel,
          icon: Sparkles,
          color: 'text-orange-600',
          tests: results
        }
      ]);
    }
  });

  const testAllServices = async () => {
    setIsTestingAll(true);
    setTestResults([]);
    
    try {
      await Promise.all([
        testDatabricksMutation.mutateAsync(),
        testPostgreSQLMutation.mutateAsync(),
        testCosmosDBMutation.mutateAsync(),
        testOpenAIMutation.mutateAsync()
      ]);
      
      toast({
        title: "테스트 완료",
        description: "모든 서비스 테스트가 완료되었습니다.",
      });
    } catch (error) {
      toast({
        title: "테스트 실패",
        description: error instanceof Error ? error.message : "테스트 중 오류 발생",
        variant: "destructive",
      });
    } finally {
      setIsTestingAll(false);
    }
  };

  const getCardServiceMapping = () => [
    {
      card: "AI 시황 생성",
      path: "/macro-analysis",
      icon: Sparkles,
      services: [
        { name: "OpenAI PTU", type: "AI 분석", color: "text-orange-600" },
        { name: "Databricks", type: "서비스 데이터", color: "text-blue-600" },
      ]
    },
    {
      card: "워크플로우 편집기",
      path: "/workflow-editor",
      icon: WorkflowIcon,
      services: [
        { name: "PostgreSQL", type: "관리 데이터", color: "text-green-600" },
        { name: "Databricks", type: "서비스 데이터", color: "text-blue-600" },
      ]
    },
    {
      card: "RAG 검색 엔진",
      path: "/schema-browser",
      icon: Database,
      services: [
        { name: "CosmosDB", type: "RAG 데이터", color: "text-purple-600" },
        { name: "Databricks", type: "스키마 조회", color: "text-blue-600" },
      ]
    },
    {
      card: "레이아웃 편집기",
      path: "/layout-editor",
      icon: FileText,
      services: [
        { name: "PostgreSQL", type: "관리 데이터", color: "text-green-600" },
      ]
    },
    {
      card: "실시간 모니터링",
      path: "/workflow-monitor",
      icon: Activity,
      services: [
        { name: "PostgreSQL", type: "관리 데이터", color: "text-green-600" },
        { name: "Databricks", type: "서비스 데이터", color: "text-blue-600" },
      ]
    },
    {
      card: "모닝브리핑",
      path: "/morning-briefing",
      icon: Newspaper,
      services: [
        { name: "OpenAI PTU", type: "AI 분석", color: "text-orange-600" },
        { name: "Databricks", type: "서비스 데이터", color: "text-blue-600" },
        { name: "CosmosDB", type: "RAG 데이터", color: "text-purple-600" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">서비스 연동 테스트</h1>
            <p className="text-muted-foreground mt-2">
              6개 기능 카드의 서비스 연결 상태를 확인합니다
            </p>
          </div>
          <Button 
            onClick={testAllServices}
            disabled={isTestingAll}
            size="lg"
            data-testid="button-test-all"
          >
            {isTestingAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                테스트 중...
              </>
            ) : (
              '모든 서비스 테스트'
            )}
          </Button>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="services">서비스별 테스트</TabsTrigger>
            <TabsTrigger value="ai-generator">AI 시황 생성</TabsTrigger>
            <TabsTrigger value="cards">카드별 매핑</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            {/* Individual Service Tests */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Databricks Test Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Database className="w-5 h-5 mr-2 text-blue-600" />
                      Databricks
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testDatabricksMutation.mutate()}
                      disabled={testDatabricksMutation.isPending}
                      data-testid="button-test-databricks"
                    >
                      {testDatabricksMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        '테스트'
                      )}
                    </Button>
                  </CardTitle>
                  <CardDescription>서비스용 데이터베이스</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="outline">Unity Catalog</Badge>
                    <Badge variant="outline">Delta Schema</Badge>
                    <Badge variant="outline">SQL Query</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* PostgreSQL Test Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Cpu className="w-5 h-5 mr-2 text-green-600" />
                      PostgreSQL
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testPostgreSQLMutation.mutate()}
                      disabled={testPostgreSQLMutation.isPending}
                      data-testid="button-test-postgresql"
                    >
                      {testPostgreSQLMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        '테스트'
                      )}
                    </Button>
                  </CardTitle>
                  <CardDescription>관리용 데이터베이스</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="outline">워크플로우 관리</Badge>
                    <Badge variant="outline">레이아웃 관리</Badge>
                    <Badge variant="outline">스케줄 관리</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* CosmosDB Test Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Cloud className="w-5 h-5 mr-2 text-purple-600" />
                      CosmosDB
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testCosmosDBMutation.mutate()}
                      disabled={testCosmosDBMutation.isPending}
                      data-testid="button-test-cosmosdb"
                    >
                      {testCosmosDBMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        '테스트'
                      )}
                    </Button>
                  </CardTitle>
                  <CardDescription>RAG 데이터베이스</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="outline">문서 저장</Badge>
                    <Badge variant="outline">벡터 검색</Badge>
                    <Badge variant="outline">의미론적 검색</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* OpenAI Test Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-orange-600" />
                      OpenAI
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testOpenAIMutation.mutate()}
                      disabled={testOpenAIMutation.isPending}
                      data-testid="button-test-openai"
                    >
                      {testOpenAIMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        '테스트'
                      )}
                    </Button>
                  </CardTitle>
                  <CardDescription>AI 분석 서비스</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="outline">Azure PTU (API Key)</Badge>
                    <Badge variant="outline">Embedding (API Key)</Badge>
                    <Badge variant="outline">Standard (Fallback)</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>테스트 결과</CardTitle>
                  <CardDescription>각 서비스의 연결 상태 및 기능 테스트 결과</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {testResults.map((suite, idx) => (
                      <AccordionItem key={idx} value={`item-${idx}`}>
                        <AccordionTrigger>
                          <div className="flex items-center w-full">
                            <suite.icon className={`w-5 h-5 mr-2 ${suite.color}`} />
                            <span className="flex-1 text-left">{suite.service}</span>
                            <Badge variant={suite.tests.every(t => t.status === 'success') ? 'default' : 'destructive'}>
                              {suite.tests.filter(t => t.status === 'success').length}/{suite.tests.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 p-2">
                            {suite.tests.map((test, testIdx) => (
                              <div
                                key={testIdx}
                                className="flex items-start justify-between p-3 border rounded-lg"
                                data-testid={`test-result-${suite.service}-${test.name}`}
                              >
                                <div className="flex items-start space-x-3 flex-1">
                                  {test.status === 'success' ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                                  ) : test.status === 'error' ? (
                                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                  ) : (
                                    <Loader2 className="w-5 h-5 text-blue-600 mt-0.5 animate-spin" />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-medium">{test.name}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{test.message}</p>
                                    {test.executionTime && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        실행 시간: {test.executionTime}ms
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ai-generator" className="space-y-4">
            {/* Databricks Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Databricks 연결 상태
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 flex-1">
                    {isLoadingConfig || isLoadingValidation ? (
                      <>
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <div>
                          <p className="font-medium">연결 상태 확인 중...</p>
                          <p className="text-sm text-muted-foreground">
                            Databricks 설정을 검증하고 있습니다
                          </p>
                        </div>
                      </>
                    ) : isDatabricksConfigured ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">Databricks 연결됨</p>
                          <p className="text-sm text-muted-foreground">
                            {databricksStatus?.serverHostname} - 연결이 정상적으로 작동합니다
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium">Databricks 미연결</p>
                          <p className="text-sm text-muted-foreground">
                            {databricksErrors.length > 0 ? (
                              <span>{databricksErrors.join(', ')}</span>
                            ) : (
                              <span>환경 변수를 설정해주세요: DATABRICKS_SERVER_HOSTNAME, DATABRICKS_HTTP_PATH, DATABRICKS_TOKEN</span>
                            )}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/azure-config'} data-testid="button-azure-config">
                    설정 페이지
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Databricks 데이터 기반 AI 시황 생성 (핵심 기능)</CardTitle>
                <CardDescription>
                  Databricks에서 데이터를 조회하고 OpenAI PTU로 전문적인 시황 분석을 생성합니다.
                  이 기능은 워크플로우 에디터, API 관리, 프롬프트 관리, 프롬프트 빌더 모두에서 사용 가능합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingConfig || isLoadingValidation ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">연결 상태를 확인하고 있습니다...</p>
                  </div>
                ) : isDatabricksConfigured ? (
                  <DatabricksAIGenerator 
                    defaultSql="SELECT * FROM market_data ORDER BY timestamp DESC LIMIT 50"
                    defaultPrompt="최근 시장 데이터를 분석하여 주요 트렌드, 리스크 요인, 투자 기회를 포함한 종합적인 시황 분석을 제공해주세요."
                  />
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Databricks 연결 필요</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        AI 시황 생성을 테스트하려면 먼저 Databricks 연결을 설정해주세요.
                      </p>
                      {databricksErrors.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">설정 오류:</p>
                          <ul className="text-xs text-red-700 dark:text-red-300 list-disc list-inside">
                            {databricksErrors.map((error: string, idx: number) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <Button onClick={() => window.location.href = '/azure-config'} data-testid="button-goto-azure-config">
                        Azure 설정 페이지로 이동
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4개 핵심 기능에서 활용 방법</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <WorkflowIcon className="w-4 h-4" />
                      1. 워크플로우 에디터
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      dataSource 노드에서 Databricks 쿼리를 설정하고, 결과를 prompt 노드로 전달하여 AI 시황을 생성합니다.
                      워크플로우 실행 시 자동으로 데이터 조회 → AI 분석 파이프라인이 동작합니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4" />
                      2. API 관리
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      API 호출 테스트 시 Databricks 데이터를 컨텍스트로 주입하여 실제 데이터 기반 AI 응답을 테스트합니다.
                      API 설정 화면에서 "Databricks 데이터 사용" 옵션을 활성화하면 자동으로 연동됩니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      3. 프롬프트 관리
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      프롬프트 템플릿에 Databricks 쿼리를 변수로 포함하여 동적 시황 생성이 가능합니다.
                      예: {`{{databricks.latest_market_data}}`} 변수를 사용하여 최신 데이터를 자동으로 가져옵니다.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4" />
                      4. 프롬프트 빌더
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      "AI 시황 생성" 탭에서 Databricks 스키마를 선택하고 SQL을 자동 생성한 후,
                      OpenAI 프롬프트와 함께 실시간으로 시황 분석을 테스트할 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>6대 기능 카드 - 서비스 매핑</CardTitle>
                <CardDescription>각 기능 카드가 사용하는 서비스 구성</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getCardServiceMapping().map((card, idx) => (
                    <Card key={idx} className="border-2">
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <card.icon className="w-5 h-5 mr-2" />
                          {card.card}
                        </CardTitle>
                        <CardDescription className="text-xs">{card.path}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {card.services.map((service, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className={`text-sm font-medium ${service.color}`}>
                                {service.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {service.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
