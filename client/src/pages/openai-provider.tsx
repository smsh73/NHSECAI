import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Cloud,
  ArrowRight,
  Copy,
  ExternalLink,
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface ProviderStatus {
  name: string;
  type: 'azure' | 'openai';
  isConfigured: boolean;
  isActive: boolean;
  chat: {
    available: boolean;
    model?: string;
    endpoint?: string;
  };
  embedding: {
    available: boolean;
    model?: string;
    endpoint?: string;
  };
  lastChecked?: string;
}

interface ProviderHealth {
  provider: string;
  healthy: boolean;
  chatModel?: string;
  embeddingModel?: string;
  error?: string;
}

export default function OpenAIProviderPage() {
  const { toast } = useToast();
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Fetch provider status
  const { data: statusData, isLoading, refetch } = useQuery<{ providers: ProviderStatus[] }>({
    queryKey: ['/api/openai/providers/status'],
  });

  // Fetch active provider health
  const { data: healthData, refetch: refetchHealth } = useQuery<ProviderHealth>({
    queryKey: ['/api/openai/health'],
  });

  const handleRefresh = () => {
    refetch();
    refetchHealth();
    toast({
      title: "새로고침 완료",
      description: "프로바이더 상태가 업데이트되었습니다.",
    });
  };

  const handleTestProvider = async (providerType: string) => {
    setTestingProvider(providerType);
    try {
      const res = await apiRequest('POST', '/api/openai/test-connection', { provider: providerType });
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: "연결 성공",
          description: data.message || `${providerType} 연결이 성공했습니다.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "연결 실패",
          description: data.error || "연결 테스트에 실패했습니다.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "연결 테스트 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setTestingProvider(null);
      refetchHealth();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "복사 완료",
      description: "클립보드에 복사되었습니다.",
    });
  };

  const activeProvider = statusData?.providers.find(p => p.isActive);
  const azureProvider = statusData?.providers.find(p => p.type === 'azure');
  const openaiProvider = statusData?.providers.find(p => p.type === 'openai');

  return (
    <div className="w-full px-6 py-6 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Sparkles className="h-8 w-8" />
        OpenAI 프로바이더 관리
      </h1>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground mt-2">
            Azure OpenAI 또는 표준 OpenAI API 중 선택하여 사용하세요
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-providers">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Active Provider Alert */}
      {healthData && (
        <Alert variant={healthData.healthy ? "default" : "destructive"} data-testid="alert-active-provider">
          {healthData.healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>
            현재 활성 프로바이더: {healthData.provider === 'azure' ? 'Azure OpenAI' : 'Standard OpenAI'}
          </AlertTitle>
          <AlertDescription>
            {healthData.healthy ? (
              <div className="space-y-1 mt-2">
                <p>✅ Chat Model: {healthData.chatModel}</p>
                <p>✅ Embedding Model: {healthData.embeddingModel}</p>
              </div>
            ) : (
              <p className="text-red-600">⚠️ {healthData.error}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Azure OpenAI Card */}
        <Card data-testid="card-azure-provider" className={azureProvider?.isActive ? "border-blue-500 border-2" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-6 h-6 text-blue-500" />
                <CardTitle>Azure OpenAI</CardTitle>
              </div>
              <div className="flex gap-2">
                {azureProvider?.isActive && <Badge>활성</Badge>}
                <Badge variant={azureProvider?.isConfigured ? "default" : "secondary"}>
                  {azureProvider?.isConfigured ? "설정됨" : "미설정"}
                </Badge>
              </div>
            </div>
            <CardDescription>
              엔터프라이즈급 Azure 기반 OpenAI 서비스 (PTU 지원)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat/Analysis Configuration */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Chat & Analysis
              </h4>
              {azureProvider?.chat.available ? (
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Model: {azureProvider.chat.model}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Endpoint: {azureProvider.chat.endpoint}
                  </div>
                </div>
              ) : (
                <div className="bg-muted p-3 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>설정되지 않음</span>
                </div>
              )}
            </div>

            {/* Embedding Configuration */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Embedding
              </h4>
              {azureProvider?.embedding.available ? (
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Model: {azureProvider.embedding.model}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Endpoint: {azureProvider.embedding.endpoint}
                  </div>
                </div>
              ) : (
                <div className="bg-muted p-3 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>설정되지 않음</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={() => handleTestProvider('azure')}
                disabled={!azureProvider?.isConfigured || testingProvider === 'azure'}
                variant="outline"
                className="flex-1"
                data-testid="button-test-azure"
              >
                {testingProvider === 'azure' ? "테스트 중..." : "연결 테스트"}
              </Button>
              <Button
                onClick={() => window.location.href = '/azure-config'}
                variant="default"
                className="flex-1"
                data-testid="button-configure-azure"
              >
                <Settings className="w-4 h-4 mr-2" />
                설정
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Standard OpenAI Card */}
        <Card data-testid="card-openai-provider" className={openaiProvider?.isActive ? "border-green-500 border-2" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-green-500" />
                <CardTitle>Standard OpenAI</CardTitle>
              </div>
              <div className="flex gap-2">
                {openaiProvider?.isActive && <Badge>활성</Badge>}
                <Badge variant={openaiProvider?.isConfigured ? "default" : "secondary"}>
                  {openaiProvider?.isConfigured ? "설정됨" : "미설정"}
                </Badge>
              </div>
            </div>
            <CardDescription>
              표준 OpenAI API (openai.com)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat Configuration */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Chat & Embedding
              </h4>
              {openaiProvider?.isConfigured ? (
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>API Key 설정됨</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Chat & Embedding 통합 엔드포인트
                  </div>
                </div>
              ) : (
                <div className="bg-muted p-3 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>OPENAI_API_KEY 환경변수 필요</span>
                </div>
              )}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>설정 방법</AlertTitle>
              <AlertDescription className="text-sm space-y-2">
                <p>1. OpenAI 계정에서 API Key 발급</p>
                <p>2. Replit Secrets에 추가:</p>
                <div className="bg-black/10 p-2 rounded font-mono text-xs flex items-center justify-between">
                  <code>OPENAI_API_KEY=sk-...</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('OPENAI_API_KEY')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                >
                  OpenAI API Keys 페이지 열기
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </AlertDescription>
            </Alert>

            <Separator />

            <Button
              onClick={() => handleTestProvider('openai')}
              disabled={!openaiProvider?.isConfigured || testingProvider === 'openai'}
              variant="outline"
              className="w-full"
              data-testid="button-test-openai"
            >
              {testingProvider === 'openai' ? "테스트 중..." : "연결 테스트"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Setup Guide Tabs */}
      <Tabs defaultValue="azure" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="azure" data-testid="tab-azure-guide">Azure OpenAI 설정 가이드</TabsTrigger>
          <TabsTrigger value="openai" data-testid="tab-openai-guide">Standard OpenAI 설정 가이드</TabsTrigger>
        </TabsList>

        {/* Azure Setup Guide */}
        <TabsContent value="azure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Azure OpenAI 설정 단계</CardTitle>
              <CardDescription>엔터프라이즈급 AI 서비스를 위한 Azure 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Azure Portal에서 OpenAI 리소스 생성</h4>
                    <p className="text-sm text-muted-foreground">
                      Azure Portal에서 Azure OpenAI 서비스를 생성하고 PTU 및 Embedding 배포를 준비합니다.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('https://portal.azure.com/#create/Microsoft.CognitiveServicesOpenAI', '_blank')}
                    >
                      Azure Portal 열기
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">PTU 배포 생성 (Chat & Analysis)</h4>
                    <p className="text-sm text-muted-foreground">
                      GPT-4.1 또는 GPT-5 모델로 배포를 생성합니다.
                    </p>
                    <div className="bg-muted p-3 rounded space-y-1 text-sm">
                      <p><strong>권장 모델:</strong> gpt-4.1, gpt-5</p>
                      <p><strong>배포 이름 예시:</strong> gpt-4-deployment</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Embedding 배포 생성</h4>
                    <p className="text-sm text-muted-foreground">
                      별도의 Embedding 모델 배포를 생성합니다.
                    </p>
                    <div className="bg-muted p-3 rounded space-y-1 text-sm">
                      <p><strong>권장 모델:</strong> text-embedding-3-large</p>
                      <p><strong>배포 이름 예시:</strong> embedding-deployment</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    4
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">환경변수 설정</h4>
                    <p className="text-sm text-muted-foreground">
                      Azure Config 페이지로 이동하여 각 서비스의 환경변수를 설정합니다.
                    </p>
                    <Button
                      onClick={() => window.location.href = '/azure-config'}
                      data-testid="button-goto-azure-config"
                    >
                      Azure Config로 이동
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OpenAI Setup Guide */}
        <TabsContent value="openai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard OpenAI 설정 단계</CardTitle>
              <CardDescription>간단하고 빠른 OpenAI API 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">OpenAI API Key 발급</h4>
                    <p className="text-sm text-muted-foreground">
                      OpenAI Platform에서 새로운 API Key를 생성합니다.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                    >
                      OpenAI Platform 열기
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Replit Secrets에 추가</h4>
                    <p className="text-sm text-muted-foreground">
                      Replit의 Secrets 탭에서 다음 환경변수를 추가합니다:
                    </p>
                    <div className="bg-muted p-3 rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <code className="text-sm">OPENAI_API_KEY</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('OPENAI_API_KEY')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        값: 발급받은 API Key (sk-로 시작)
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">서버 재시작</h4>
                    <p className="text-sm text-muted-foreground">
                      환경변수 적용을 위해 애플리케이션을 재시작합니다.
                    </p>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        환경변수 변경 후 자동으로 재시작되지 않으면 수동으로 재시작해주세요.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    4
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">연결 테스트</h4>
                    <p className="text-sm text-muted-foreground">
                      위의 "연결 테스트" 버튼을 클릭하여 설정을 확인합니다.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Provider Priority Info */}
      <Card>
        <CardHeader>
          <CardTitle>프로바이더 우선순위</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>시스템은 다음 우선순위로 프로바이더를 선택합니다:</p>
            <ol className="list-decimal ml-5 space-y-2">
              <li>
                <strong>Azure OpenAI PTU</strong> - Chat 및 Analysis 작업
                <br />
                <span className="text-muted-foreground text-xs">
                  AZURE_OPENAI_PTU_ENDPOINT와 AZURE_OPENAI_PTU_API_KEY가 설정된 경우
                </span>
              </li>
              <li>
                <strong>Azure OpenAI Embedding</strong> - Embedding 생성
                <br />
                <span className="text-muted-foreground text-xs">
                  AZURE_OPENAI_EMBEDDING_ENDPOINT와 AZURE_OPENAI_EMBEDDING_API_KEY가 설정된 경우
                </span>
              </li>
              <li>
                <strong>Standard OpenAI</strong> - 모든 작업 (Fallback)
                <br />
                <span className="text-muted-foreground text-xs">
                  Azure가 설정되지 않았거나 OPENAI_API_KEY만 있는 경우
                </span>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
