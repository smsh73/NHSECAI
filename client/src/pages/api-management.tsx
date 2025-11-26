import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Settings2, Wand2, TestTube2, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ApiCall as BaseApiCall, 
  AiServiceProvider as BaseAiServiceProvider, 
  ApiCategory, 
  ApiTemplate,
  ApiFormData,
  ApiTestResult as BaseApiTestResult,
  SecretInfo,
  PromptTemplateInfo
} from "@shared/schema";

// Extended types with additional UI fields
type ApiCall = BaseApiCall & {
  modelName?: string;
  maxTokens?: number;
  inputCost?: number;
  outputCost?: number;
  systemPrompt?: string;
  supportsStreaming?: boolean;
  inputTypes?: string[];
  outputTypes?: string[];
};

type AiServiceProvider = BaseAiServiceProvider & {
  baseUrl?: string;
  website?: string;
};

type ApiTestResult = BaseApiTestResult & {
  message?: string;
  response?: any;
};
import { 
  Plus, Edit, Trash2, Plug, Search, Filter, 
  Settings, Key, TestTube, Eye, Copy, CheckCircle, XCircle, 
  AlertCircle, Zap, Sparkles, Mic, Volume2, Image, FileText,
  MessageSquare, Globe, Star, TrendingUp, Clock, DollarSign,
  ShieldCheck, Code2, Database, Layers, Bot
} from "lucide-react";

export default function ApiManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('browse');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiCall | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testInputData, setTestInputData] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  // History filters
  const [historyApiCallId, setHistoryApiCallId] = useState<string>('all');
  const [historyDateRange, setHistoryDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  
  // Secret management state
  const [secretTestResults, setSecretTestResults] = useState<Record<string, any>>({});
  
  // Prompt editor state
  const [promptTemplate, setPromptTemplate] = useState('');
  const [promptVariables, setPromptVariables] = useState<Record<string, any>>({});
  const [processedPrompt, setProcessedPrompt] = useState('');
  const [promptCategory, setPromptCategory] = useState('financial');
  const [promptUseCase, setPromptUseCase] = useState('');
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<PromptTemplateInfo | null>(null);
  const [formData, setFormData] = useState<ApiFormData>({
    name: '',
    displayName: '',
    description: '',
    url: '',
    method: 'POST',
    providerId: '',
    categoryId: '',
    modelName: '',
    authType: 'bearer',
    secretKey: '',
    headers: {},
    executionType: 'json',
    requestSchema: null,
    responseSchema: null,
    parameterTemplate: '',
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000,
    maxTokens: 1000,
    inputCost: 0,
    outputCost: 0,
    preprocessPrompt: '',
    postprocessPrompt: '',
    systemPrompt: '',
    supportsStreaming: false,
    inputTypes: [],
    outputTypes: []
  });

  // Fetch API calls with filters
  const { data: apiCalls, isLoading: apiCallsLoading } = useQuery<ApiCall[]>({
    queryKey: ['/api/api-calls/enhanced', selectedProvider, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProvider && selectedProvider !== 'all') params.append('providerId', selectedProvider);
      if (selectedCategory && selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      const queryString = params.toString();
      const url = queryString ? `/api/api-calls/enhanced?${queryString}` : '/api/api-calls/enhanced';
      const response = await apiRequest('GET', url);
      if (!response.ok) {
        throw new Error('Failed to fetch API calls');
      }
      return await response.json();
    },
    retry: 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch API test results (history)
  const { data: apiTestResults, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/api-test-results', historyApiCallId, historyDateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (historyApiCallId && historyApiCallId !== 'all') params.append('apiCallId', historyApiCallId);
      
      const now = new Date();
      const dateTo = new Date(now);
      let dateFrom: Date;
      switch (historyDateRange) {
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(0); // All time
      }
      if (historyDateRange !== 'all') {
        params.append('dateFrom', dateFrom.toISOString());
        params.append('dateTo', dateTo.toISOString());
      }
      
      params.append('limit', '100');
      
      const response = await apiRequest('GET', `/api/api-test-results?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch API test results');
      }
      return await response.json();
    },
    enabled: activeTab === 'history',
    retry: 2,
    staleTime: 10 * 1000, // 10 seconds
  });

  // Fetch API usage analytics
  const { data: apiAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/api-analytics', historyApiCallId, historyDateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (historyApiCallId && historyApiCallId !== 'all') params.append('apiCallId', historyApiCallId);
      
      const now = new Date();
      const dateTo = new Date(now);
      let dateFrom: Date;
      switch (historyDateRange) {
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(0); // All time
      }
      if (historyDateRange !== 'all') {
        params.append('dateFrom', dateFrom.toISOString());
        params.append('dateTo', dateTo.toISOString());
      }
      
      const response = await apiRequest('GET', `/api/api-analytics?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch API analytics');
      }
      return await response.json();
    },
    enabled: activeTab === 'history',
    retry: 2,
    staleTime: 10 * 1000, // 10 seconds
  });

  // Calculate statistics from test results
  const historyStats = useMemo(() => {
    if (!apiTestResults || apiTestResults.length === 0) {
      return {
        totalCalls: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgResponseTime: 0,
        totalCost: 0,
        avgCost: 0,
      };
    }
    
    const successCount = apiTestResults.filter((r: any) => r.status === 'success' || r.status === 'passed').length;
    const failureCount = apiTestResults.length - successCount;
    const successRate = apiTestResults.length > 0 ? (successCount / apiTestResults.length) * 100 : 0;
    
    const responseTimes = apiTestResults
      .map((r: any) => r.responseTime || r.executionTime || 0)
      .filter((t: number) => t > 0);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum: number, t: number) => sum + t, 0) / responseTimes.length
      : 0;
    
    const costs = apiTestResults
      .map((r: any) => r.cost || 0)
      .filter((c: number) => c > 0);
    const totalCost = costs.reduce((sum: number, c: number) => sum + c, 0);
    const avgCost = costs.length > 0 ? totalCost / costs.length : 0;
    
    return {
      totalCalls: apiTestResults.length,
      successCount,
      failureCount,
      successRate,
      avgResponseTime: Math.round(avgResponseTime),
      totalCost,
      avgCost,
    };
  }, [apiTestResults]);

  // Fetch AI Service Providers
  const { data: providers, isLoading: providersLoading } = useQuery<AiServiceProvider[]>({
    queryKey: ['/api/ai-providers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ai-providers');
      return response.json();
    }
  });

  // Fetch API Categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<ApiCategory[]>({
    queryKey: ['/api/api-categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/api-categories');
      return response.json();
    }
  });

  // Fetch API Templates
  const { data: templates, isLoading: templatesLoading } = useQuery<ApiTemplate[]>({
    queryKey: ['/api/api-templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/api-templates');
      return response.json();
    }
  });

  // Fetch Secret Status
  const { data: secretStatus, isLoading: secretStatusLoading, refetch: refetchSecrets } = useQuery<SecretInfo[]>({
    queryKey: ['/api/secrets/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/secrets/status');
      return response.json();
    }
  });

  // Fetch Prompt Suggestions
  const { data: promptSuggestions, isLoading: promptSuggestionsLoading } = useQuery<PromptTemplateInfo[]>({
    queryKey: ['/api/prompts/suggestions', promptCategory, promptUseCase],
    queryFn: async () => {
      if (!promptCategory || !promptUseCase) return [];
      const response = await apiRequest('GET', `/api/prompts/suggestions?category=${promptCategory}&useCase=${promptUseCase}`);
      return response.json();
    },
    enabled: !!promptCategory && !!promptUseCase
  });

  // Create/Update API call mutation
  const saveApiMutation = useMutation({
    mutationFn: async (apiData: ApiFormData) => {
      const method = editingApi ? 'PUT' : 'POST';
      const url = editingApi ? `/api/api-calls/${editingApi.id}` : '/api/api-calls';
      const response = await apiRequest(method, url, apiData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const errorMessage = errorData.message || errorData.error || `API 설정 저장 실패: ${response.status}`;
        // Zod validation errors 처리
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const validationErrors = errorData.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
          throw new Error(`유효성 검사 오류: ${validationErrors}`);
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-calls/enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['/api/api-calls'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "API 설정 저장 완료",
        description: "API 호출 설정이 성공적으로 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "API 설정 저장 중 오류가 발생했습니다.";
      toast({
        title: "저장 실패",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Test API mutation
  const testApiMutation = useMutation({
    mutationFn: async ({ apiCallId, inputData }: { apiCallId: string; inputData: any }) => {
      // Validate API ID before making request
      if (!apiCallId || typeof apiCallId !== 'string' || !apiCallId.trim()) {
        throw new Error('API ID가 제공되지 않았습니다.');
      }
      
      const apiId = apiCallId.trim();
      const url = `/api/api-calls/${apiId}/test`;
      
      console.log('Testing API:', { url, apiId, inputData });
      
      const response = await apiRequest('POST', url, { 
        testPayload: inputData || {},
        inputData: inputData || {} // Support both parameter names
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const errorMessage = errorData.message || errorData.error || `API 테스트 실패: ${response.status}`;
        console.error('API test failed:', { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }
      
      return await response.json();
    },
    onSuccess: (data, variables) => {
      setTestResults(prev => ({ 
        ...prev, 
        [variables.apiCallId]: { ...data, status: 'completed' } as any 
      }));
      setTestResult(data);
      toast({
        title: "API 테스트 완료",
        description: data.success ? "테스트가 성공적으로 실행되었습니다." : (data.error || "테스트 실행 중 오류가 발생했습니다."),
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any, variables) => {
      const errorResult = { success: false, error: error?.message || 'Unknown error', status: 'failed' };
      setTestResults(prev => ({ 
        ...prev, 
        [variables.apiCallId]: errorResult as any 
      }));
      setTestResult(errorResult);
      toast({
        title: "테스트 실패",
        description: error?.message || "API 테스트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTestRunning(false);
    }
  });

  // Delete API call mutation
  const deleteApiMutation = useMutation({
    mutationFn: async (apiId: string) => {
      await apiRequest('DELETE', `/api/api-calls/${apiId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-calls/enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['/api/api-calls'] });
      toast({
        title: "API 설정 삭제 완료",
        description: "API 호출 설정이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "API 설정 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Initialize LuxiaCloud APIs mutation
  const initializeLuxiaCloudMutation = useMutation({
    mutationFn: async (providerId: string) => {
      if (!providerId || typeof providerId !== 'string' || !providerId.trim()) {
        throw new Error('Provider ID가 제공되지 않았습니다.');
      }
      
      const trimmedId = providerId.trim();
      console.log('Calling LuxiaCloud initialization endpoint:', `/api/ai-setup/luxiacloud/${trimmedId}`);
      
      const response = await apiRequest('POST', `/api/ai-setup/luxiacloud/${trimmedId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || `Failed to initialize LuxiaCloud APIs: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-calls/enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-service-providers'] });
      toast({
        title: "LuxiaCloud API 초기화 완료",
        description: `${data.apis?.length || data.count || 0}개의 LuxiaCloud API가 성공적으로 등록되었습니다.`,
      });
    },
    onError: (error: any) => {
      console.error('LuxiaCloud initialization error:', error);
      toast({
        variant: "destructive",
        title: "LuxiaCloud API 초기화 실패",
        description: error?.message || "LuxiaCloud API 초기화 중 오류가 발생했습니다.",
      });
    }
  });

  // Secret test mutation
  const testSecretMutation = useMutation({
    mutationFn: async ({ secretKey, testPrompt }: { secretKey: string; testPrompt?: string }) => {
      const response = await apiRequest('POST', `/api/secrets/${secretKey}/test`, { testPrompt });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setSecretTestResults(prev => ({
        ...prev,
        [variables.secretKey]: data
      }));
      if (data.success) {
        toast({
          title: "Secret 테스트 성공",
          description: `${variables.secretKey} API가 정상적으로 작동합니다.`,
        });
      } else {
        toast({
          title: "Secret 테스트 실패",
          description: data.message || "API 테스트 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any, variables) => {
      setSecretTestResults(prev => ({
        ...prev,
        [variables.secretKey]: { success: false, message: error.message }
      }));
      toast({
        title: "Secret 테스트 오류",
        description: `${variables.secretKey} 테스트 중 오류가 발생했습니다.`,
        variant: "destructive",
      });
    }
  });

  // Prompt processing mutation
  const processPromptMutation = useMutation({
    mutationFn: async ({ template, variables, context }: { template: string; variables: Record<string, any>; context?: any }) => {
      const response = await apiRequest('POST', '/api/prompts/process', { template, variables, context });
      return response.json();
    },
    onSuccess: (data) => {
      setProcessedPrompt(data.prompt);
      toast({
        title: "프롬프트 처리 완료",
        description: `프롬프트가 성공적으로 처리되었습니다. 예상 토큰: ${data.metadata.estimatedTokens}개`,
      });
    },
    onError: () => {
      toast({
        title: "프롬프트 처리 실패",
        description: "프롬프트 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Prompt validation mutation
  const validatePromptMutation = useMutation({
    mutationFn: async ({ template, variables }: { template: string; variables: any[] }) => {
      const response = await apiRequest('POST', '/api/prompts/validate', { template, variables });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.isValid) {
        toast({
          title: "프롬프트 검증 완료",
          description: `유효한 프롬프트입니다. 예상 토큰: ${data.estimatedTokens}개`,
        });
      } else {
        toast({
          title: "프롬프트 검증 실패",
          description: `오류: ${data.errors.join(', ')}`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "프롬프트 검증 오류",
        description: "프롬프트 검증 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const generateSampleData = (schema: any): any => {
    if (!schema || !schema.properties) {
      return {};
    }

    const sampleData: any = {};
    
    Object.keys(schema.properties).forEach(key => {
      const property = schema.properties[key];
      
      switch (property.type) {
        case 'string':
          if (property.description) {
            sampleData[key] = property.description;
          } else if (key.includes('query')) {
            sampleData[key] = "삼성전자 주가 분석";
          } else if (key.includes('symbol')) {
            sampleData[key] = "005930";
          } else {
            sampleData[key] = `샘플 ${key}`;
          }
          break;
        case 'number':
          sampleData[key] = Math.floor(Math.random() * 100);
          break;
        case 'boolean':
          sampleData[key] = true;
          break;
        case 'array':
          sampleData[key] = ["항목1", "항목2"];
          break;
        case 'object':
          sampleData[key] = generateSampleData(property);
          break;
        default:
          sampleData[key] = null;
      }
    });
    
    return sampleData;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      url: '',
      method: 'POST',
      providerId: '',
      categoryId: '',
      modelName: '',
      authType: 'bearer',
      secretKey: '',
      maxTokens: 1000,
      inputCost: 0,
      outputCost: 0,
      preprocessPrompt: '',
      postprocessPrompt: '',
      systemPrompt: '',
      timeout: 300,
      retryCount: 3,
      supportsStreaming: false,
      inputTypes: ['text'],
      outputTypes: ['text']
    });
    setEditingApi(null);
  };

  const handleEdit = (api: ApiCall) => {
    setEditingApi(api);
    setFormData({
      name: api.name,
      displayName: api.displayName || '',
      description: api.description || '',
      url: api.url,
      method: api.method,
      providerId: api.providerId || '',
      categoryId: api.categoryId || '',
      modelName: api.modelName || '',
      authType: api.authType || 'bearer',
      secretKey: api.secretKey || '',
      maxTokens: api.maxTokens || 1000,
      inputCost: Number(api.inputCost) || 0,
      outputCost: Number(api.outputCost) || 0,
      preprocessPrompt: api.preprocessPrompt || '',
      postprocessPrompt: api.postprocessPrompt || '',
      systemPrompt: api.systemPrompt || '',
      timeout: api.timeout || 300,
      retryCount: api.retryCount || 3,
      supportsStreaming: api.supportsStreaming || false,
      inputTypes: api.inputTypes || ['text'],
      outputTypes: api.outputTypes || ['text']
    });
    setIsDialogOpen(true);
  };

  const handleTestApi = async (apiId: string) => {
    // Validate API ID
    if (!apiId || typeof apiId !== 'string' || !apiId.trim()) {
      console.error('Invalid API ID:', apiId);
      toast({
        title: "API 테스트 실패",
        description: "API ID가 제공되지 않았습니다.",
        variant: "destructive",
      });
      return;
    }
    
    // Get API call details to extract default test parameters
    const apiCall = apiCalls?.find(api => api.id === apiId);
    if (!apiCall) {
      console.error('API call not found:', apiId);
      toast({
        title: "API 테스트 실패",
        description: `API를 찾을 수 없습니다: ${apiId}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsTestRunning(true);
    setTestResults(prev => ({ ...prev, [apiId]: { status: 'testing' } as any }));
    
    const testInputData = apiCall?.testPayload || apiCall?.defaultInput || {};
    
    // Ensure apiCallId is properly set
    const mutationData = { 
      apiCallId: apiId.trim(), 
      inputData: testInputData 
    };
    
    console.log('Testing API with data:', mutationData);
    
    testApiMutation.mutate(mutationData);
  };

  const handleInitializeLuxiaCloud = async () => {
    const luxiaProvider = providers?.find(p => p.name.toLowerCase().includes('luxia'));
    if (!luxiaProvider) {
      toast({
        title: "LuxiaCloud 프로바이더를 찾을 수 없습니다",
        description: "LuxiaCloud 프로바이더가 등록되어 있지 않습니다.",
        variant: "destructive",
      });
      return;
    }
    
    if (!luxiaProvider.id) {
      toast({
        title: "프로바이더 ID가 없습니다",
        description: "LuxiaCloud 프로바이더 ID를 확인할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Initializing LuxiaCloud APIs for provider:', luxiaProvider.id);
    initializeLuxiaCloudMutation.mutate(luxiaProvider.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (!formData.name || !formData.name.trim()) {
      toast({
        title: "필수 항목 누락",
        description: "API 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.url || !formData.url.trim()) {
      toast({
        title: "필수 항목 누락",
        description: "API URL을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.providerId) {
      toast({
        title: "필수 항목 누락",
        description: "AI 서비스 제공자를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.categoryId) {
      toast({
        title: "필수 항목 누락",
        description: "API 카테고리를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // JSON 스키마 검증 (request/response 스키마가 있는 경우)
    if (formData.requestSchema) {
      try {
        JSON.parse(JSON.stringify(formData.requestSchema)); // 유효성 검사
      } catch (error) {
        toast({
          title: "요청 스키마 오류",
          description: "요청 JSON 스키마가 올바르지 않습니다.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (formData.responseSchema) {
      try {
        JSON.parse(JSON.stringify(formData.responseSchema)); // 유효성 검사
      } catch (error) {
        toast({
          title: "응답 스키마 오류",
          description: "응답 JSON 스키마가 올바르지 않습니다.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // API 데이터 정리 (DB 스키마에 없는 필드는 제외)
    const apiDataToSave: ApiFormData = {
      name: formData.name.trim(),
      displayName: formData.displayName?.trim() || formData.name.trim(),
      description: formData.description?.trim() || null,
      url: formData.url.trim(),
      method: formData.method || 'POST',
      providerId: formData.providerId,
      categoryId: formData.categoryId,
      authType: formData.authType || 'bearer',
      headers: formData.headers || {},
      secretKey: formData.secretKey?.trim() || null,
      executionType: formData.executionType || 'json',
      requestSchema: formData.requestSchema || null,
      responseSchema: formData.responseSchema || null,
      parameterTemplate: formData.parameterTemplate?.trim() || null,
      timeout: formData.timeout || 30000,
      retryCount: formData.retryCount || 3,
      retryDelay: formData.retryDelay || 1000,
      preprocessPrompt: formData.preprocessPrompt?.trim() || null,
      postprocessPrompt: formData.postprocessPrompt?.trim() || null,
      isActive: true,
      // DB에 없는 필드는 전송하지 않음
      modelName: undefined,
      maxTokens: undefined,
      inputCost: undefined,
      outputCost: undefined,
      supportsStreaming: undefined,
      inputTypes: undefined,
      outputTypes: undefined
    };
    
    // undefined 값 제거
    Object.keys(apiDataToSave).forEach(key => {
      if (apiDataToSave[key as keyof ApiFormData] === undefined) {
        delete apiDataToSave[key as keyof ApiFormData];
      }
    });
    
    saveApiMutation.mutate(apiDataToSave);
  };

  const handleDelete = (apiId: string) => {
    if (confirm('정말로 이 API 설정을 삭제하시겠습니까?')) {
      deleteApiMutation.mutate(apiId);
    }
  };

  // Get category icon
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('llm') || name.includes('chat')) return <MessageSquare className="w-4 h-4" />;
    if (name.includes('vision') || name.includes('image')) return <Image className="w-4 h-4" />;
    if (name.includes('tts') || name.includes('speech')) return <Volume2 className="w-4 h-4" />;
    if (name.includes('stt') || name.includes('transcription')) return <Mic className="w-4 h-4" />;
    if (name.includes('rag') || name.includes('search')) return <Database className="w-4 h-4" />;
    if (name.includes('document')) return <FileText className="w-4 h-4" />;
    if (name.includes('embedding')) return <Layers className="w-4 h-4" />;
    return <Bot className="w-4 h-4" />;
  };

  // Filter APIs based on search and selections
  const filteredApiCalls = apiCalls?.filter(api => {
    const matchesSearch = !searchQuery || 
      api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.modelName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  // Get provider name
  const getProviderName = (providerId: string) => {
    return providers?.find(p => p.id === providerId)?.displayName || 'Unknown';
  };

  // Get category name
  const getCategoryName = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId)?.displayName || 'Unknown';
  };

  // API URL 매핑 데이터 - 제공자와 카테고리 조합에 따른 기본 URL
  const apiUrlMappings: Record<string, Record<string, string>> = {
    'openai': {
      'chat': 'https://api.openai.com/v1/chat/completions',
      'llm': 'https://api.openai.com/v1/chat/completions',
      'completions': 'https://api.openai.com/v1/chat/completions',
      'embeddings': 'https://api.openai.com/v1/embeddings',
      'embedding': 'https://api.openai.com/v1/embeddings',
      'images': 'https://api.openai.com/v1/images/generations',
      'image': 'https://api.openai.com/v1/images/generations',
      'vision': 'https://api.openai.com/v1/chat/completions',
      'tts': 'https://api.openai.com/v1/audio/speech',
      'stt': 'https://api.openai.com/v1/audio/transcriptions',
      'speech': 'https://api.openai.com/v1/audio/speech',
      'transcription': 'https://api.openai.com/v1/audio/transcriptions',
      'default': 'https://api.openai.com/v1/chat/completions'
    },
    'anthropic': {
      'chat': 'https://api.anthropic.com/v1/messages',
      'llm': 'https://api.anthropic.com/v1/messages',
      'completions': 'https://api.anthropic.com/v1/messages',
      'default': 'https://api.anthropic.com/v1/messages'
    },
    'google': {
      'chat': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
      'llm': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
      'completions': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
      'embeddings': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent',
      'embedding': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent',
      'default': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    },
    'gemini': {
      'chat': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
      'llm': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
      'completions': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
      'embeddings': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent',
      'embedding': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent',
      'default': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    },
    'claude': {
      'chat': 'https://api.anthropic.com/v1/messages',
      'llm': 'https://api.anthropic.com/v1/messages',
      'completions': 'https://api.anthropic.com/v1/messages',
      'default': 'https://api.anthropic.com/v1/messages'
    },
    'cohere': {
      'chat': 'https://api.cohere.ai/v1/chat',
      'llm': 'https://api.cohere.ai/v1/generate',
      'completions': 'https://api.cohere.ai/v1/generate',
      'embeddings': 'https://api.cohere.ai/v1/embed',
      'embedding': 'https://api.cohere.ai/v1/embed',
      'default': 'https://api.cohere.ai/v1/chat'
    }
  };

  // 자동 URL 설정 함수
  const getApiUrlFromMapping = (providerId: string, categoryId: string): string => {
    if (!providerId || !categoryId || !providers || !categories) return '';

    // 제공자 정보 가져오기
    const provider = providers.find(p => p.id === providerId);
    const category = categories.find(c => c.id === categoryId);
    
    if (!provider || !category) return '';

    // 제공자 이름을 소문자로 변환하여 매핑 키 찾기
    const providerKey = provider.name.toLowerCase();
    const categoryKey = category.name.toLowerCase();

    // 매핑에서 URL 찾기
    const providerMappings = apiUrlMappings[providerKey];
    if (!providerMappings) {
      // 제공자 매핑이 없으면 일반적인 패턴 시도
      const fallbackMappings = Object.keys(apiUrlMappings).find(key => 
        providerKey.includes(key) || key.includes(providerKey.split(' ')[0])
      );
      if (fallbackMappings) {
        return apiUrlMappings[fallbackMappings][categoryKey] || apiUrlMappings[fallbackMappings]['default'] || '';
      }
      return '';
    }

    // 카테고리별 URL 반환 (정확한 매치 -> 부분 매치 -> 기본값 순)
    if (providerMappings[categoryKey]) {
      return providerMappings[categoryKey];
    }

    // 부분 매치 시도
    const partialMatch = Object.keys(providerMappings).find(key => 
      categoryKey.includes(key) || key.includes(categoryKey)
    );
    if (partialMatch) {
      return providerMappings[partialMatch];
    }

    // 기본값 반환
    return providerMappings['default'] || '';
  };

  // 제공자 또는 카테고리 변경 시 URL 자동 설정
  const updateApiUrl = (newProviderId?: string, newCategoryId?: string) => {
    const targetProviderId = newProviderId || formData.providerId;
    const targetCategoryId = newCategoryId || formData.categoryId;

    if (targetProviderId && targetCategoryId) {
      const autoUrl = getApiUrlFromMapping(targetProviderId, targetCategoryId);
      if (autoUrl && autoUrl !== formData.url) {
        setFormData(prev => ({ ...prev, url: autoUrl }));
        toast({
          title: "API URL 자동 설정",
          description: `선택한 제공자와 카테고리에 맞는 URL이 자동으로 설정되었습니다.`,
        });
      }
    }
  };

  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const authTypes = ['bearer', 'api_key', 'oauth', 'none'];
  const inputOutputTypes = ['text', 'image', 'audio', 'video', 'json'];
  
  const isLoading = apiCallsLoading || providersLoading || categoriesLoading || templatesLoading;

  return (
    <div className="flex-1 overflow-hidden bg-background">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <h1 className="text-3xl font-bold text-foreground">AI API 관리센터</h1>
        
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mt-1">
                AI 서비스 API를 등록하고 관리하여 워크플로우에서 활용하세요
              </p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleInitializeLuxiaCloud} disabled={initializeLuxiaCloudMutation.isPending}>
                <Sparkles className="w-4 h-4 mr-2" />
                {initializeLuxiaCloudMutation.isPending ? '초기화 중...' : 'LuxiaCloud APIs 로드'}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} data-testid="button-add-api">
                    <Plus className="w-4 h-4 mr-2" />
                    새 API 등록
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <Settings className="w-5 h-5" />
                      <span>{editingApi ? 'API 설정 편집' : 'AI API 등록'}</span>
                    </DialogTitle>
                    <DialogDescription>
                      {editingApi ? '기존 API 설정을 수정합니다.' : '새로운 AI API를 등록하여 워크플로우에서 활용하세요. 모든 정보는 안전하게 암호화되어 저장됩니다.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">기본 정보</TabsTrigger>
                      <TabsTrigger value="auth">인증 & 보안</TabsTrigger>
                      <TabsTrigger value="prompts">프롬프트</TabsTrigger>
                      <TabsTrigger value="advanced">고급 설정</TabsTrigger>
                    </TabsList>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <TabsContent value="basic" className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>워크플로우 연동:</strong> 여기서 등록한 API는 워크플로우 에디터의 "API 호출" 노드에서 선택하여 사용할 수 있습니다. API 호출 노드 설정에서 이 API ID를 선택하면, 워크플로우 실행 시 이 API가 자동으로 호출됩니다.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="api-name">API 이름 *</Label>
                            <Input
                              id="api-name"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="예: OpenAI GPT-4"
                              required
                              data-testid="input-api-name"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              워크플로우 노드에서 표시될 API 이름입니다.
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="display-name">표시 이름</Label>
                            <Input
                              id="display-name"
                              value={formData.displayName}
                              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                              placeholder="사용자에게 표시될 이름"
                              data-testid="input-display-name"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              UI에서 표시될 친화적인 이름입니다. 생략 시 API 이름이 사용됩니다.
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="provider">AI 서비스 제공자 *</Label>
                            <Select 
                              value={formData.providerId} 
                              onValueChange={(value) => {
                                setFormData(prev => ({ ...prev, providerId: value }));
                                updateApiUrl(value, formData.categoryId);
                              }}
                            >
                              <SelectTrigger data-testid="select-provider">
                                <SelectValue placeholder="제공자 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {providers?.map(provider => (
                                  <SelectItem key={provider.id} value={provider.id}>
                                    {provider.displayName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              OpenAI, Anthropic, Google 등 AI 서비스 제공자를 선택하세요.
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="category">API 카테고리 *</Label>
                            <Select 
                              value={formData.categoryId} 
                              onValueChange={(value) => {
                                setFormData(prev => ({ ...prev, categoryId: value }));
                                updateApiUrl(formData.providerId, value);
                              }}
                            >
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="카테고리 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories?.map(category => (
                                  <SelectItem key={category.id} value={category.id}>
                                    <div className="flex items-center space-x-2">
                                      {getCategoryIcon(category.name)}
                                      <span>{category.displayName}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              Chat, Embedding, TTS 등 API 카테고리를 선택하세요.
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="api-url">API URL *</Label>
                          <Input
                            id="api-url"
                            value={formData.url}
                            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                            placeholder="https://api.openai.com/v1/chat/completions"
                            required
                            data-testid="input-api-url"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            실제 API 엔드포인트 URL을 입력하세요. 제공자와 카테고리를 선택하면 자동으로 채워질 수 있습니다.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="method">HTTP 메소드</Label>
                            <Select 
                              value={formData.method} 
                              onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
                            >
                              <SelectTrigger data-testid="select-api-method">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {httpMethods.map(method => (
                                  <SelectItem key={method} value={method}>
                                    {method}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              대부분의 AI API는 POST를 사용합니다.
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="model-name">모델명 (참고용)</Label>
                            <Input
                              id="model-name"
                              value={formData.modelName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, modelName: e.target.value }))}
                              placeholder="예: gpt-4, claude-3.5-sonnet"
                              data-testid="input-model-name"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              참고용 정보입니다. 실제 API 호출 시 파라미터로 전달됩니다.
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="description">설명</Label>
                          <Textarea
                            id="description"
                            value={formData.description || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="이 API의 기능과 용도를 설명하세요. 예: OpenAI GPT-4 모델을 사용하여 텍스트를 생성합니다."
                            rows={3}
                            data-testid="textarea-description"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            이 API가 어떤 목적으로 사용되는지 설명해주세요.
                          </p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="auth" className="space-y-4">
                        <Alert>
                          <ShieldCheck className="w-4 h-4" />
                          <AlertTitle>보안 정보</AlertTitle>
                          <AlertDescription>
                            API 키는 Azure Environment variables에 안전하게 저장되며, 암호화되어 관리됩니다.
                          </AlertDescription>
                        </Alert>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="auth-type">인증 방식</Label>
                            <Select 
                              value={formData.authType} 
                              onValueChange={(value) => setFormData(prev => ({ ...prev, authType: value }))}
                            >
                              <SelectTrigger data-testid="select-auth-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {authTypes.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type === 'bearer' ? 'Bearer Token' : 
                                     type === 'api_key' ? 'API Key' :
                                     type === 'oauth' ? 'OAuth' : 'None'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="secret-key">Secret Key 이름</Label>
                            <Input
                              id="secret-key"
                              value={formData.secretKey}
                              onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                              placeholder="예: OPENAI_API_KEY"
                              data-testid="input-secret-key"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Azure Environment variables에서 관리되는 키 이름
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="prompts" className="space-y-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>프롬프트 및 파라미터 템플릿:</strong> API 호출 전후에 데이터를 처리하거나 변환할 때 사용할 프롬프트와 파라미터 템플릿을 정의합니다. 워크플로우에서 이 API를 호출할 때, 이전 노드의 출력 데이터가 자동으로 변수로 치환됩니다.
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="system-prompt">시스템 프롬프트</Label>
                          <Textarea
                            id="system-prompt"
                            value={formData.systemPrompt || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                            placeholder="AI 모델의 기본 동작을 정의하는 시스템 프롬프트 (선택사항)"
                            rows={4}
                            data-testid="textarea-system-prompt"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            LLM API 호출 시 시스템 메시지로 전달될 프롬프트입니다. 대부분의 LLM API는 이 필드를 지원합니다.
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="preprocess-prompt">전처리 프롬프트</Label>
                          <Textarea
                            id="preprocess-prompt"
                            value={formData.preprocessPrompt || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, preprocessPrompt: e.target.value }))}
                            placeholder="API 호출 전 입력 데이터를 변환하는 프롬프트 (선택사항). 예: 워크플로우에서 전달받은 데이터를 API 요청 형식으로 변환합니다."
                            rows={4}
                            data-testid="textarea-preprocess-prompt"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            워크플로우에서 전달받은 입력 데이터를 API 요청 형식에 맞게 변환하기 위한 프롬프트입니다. 변수는 {`{{변수명}}`} 형태로 사용할 수 있습니다.
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="postprocess-prompt">후처리 프롬프트</Label>
                          <Textarea
                            id="postprocess-prompt"
                            value={formData.postprocessPrompt || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, postprocessPrompt: e.target.value }))}
                            placeholder="API 호출 후 응답 데이터를 변환하는 프롬프트 (선택사항). 예: API 응답에서 필요한 필드만 추출합니다."
                            rows={4}
                            data-testid="textarea-postprocess-prompt"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            API 응답 데이터를 워크플로우의 다음 노드에서 사용하기 쉬운 형식으로 변환하기 위한 프롬프트입니다.
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="parameter-template">파라미터 템플릿</Label>
                          <Textarea
                            id="parameter-template"
                            value={formData.parameterTemplate || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, parameterTemplate: e.target.value }))}
                            placeholder='{"model": "{{model}}", "messages": [{"role": "user", "content": "{{content}}"}]}'
                            rows={6}
                            className="font-mono text-sm"
                            data-testid="textarea-parameter-template"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            API 호출 시 사용할 파라미터 템플릿을 JSON 형식으로 정의하세요. {`{{변수명}}`} 형태로 변수를 사용하면, 워크플로우에서 이전 노드의 출력 데이터가 자동으로 치환됩니다. 예: {`{{news.title}}`}, {`{{previousNode.output}}`}
                          </p>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="advanced" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="max-tokens">최대 토큰 수</Label>
                            <Input
                              id="max-tokens"
                              type="number"
                              value={formData.maxTokens}
                              onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1000 }))}
                              min="1"
                              data-testid="input-max-tokens"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="input-cost">입력 비용 (토큰당)</Label>
                            <Input
                              id="input-cost"
                              type="number"
                              step="0.000001"
                              value={formData.inputCost}
                              onChange={(e) => setFormData(prev => ({ ...prev, inputCost: parseFloat(e.target.value) || 0 }))}
                              data-testid="input-input-cost"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="output-cost">출력 비용 (토큰당)</Label>
                            <Input
                              id="output-cost"
                              type="number"
                              step="0.000001"
                              value={formData.outputCost}
                              onChange={(e) => setFormData(prev => ({ ...prev, outputCost: parseFloat(e.target.value) || 0 }))}
                              data-testid="input-output-cost"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="timeout">타임아웃 (초)</Label>
                            <Input
                              id="timeout"
                              type="number"
                              value={formData.timeout}
                              onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 300 }))}
                              min="1"
                              data-testid="input-api-timeout"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="retry-count">재시도 횟수</Label>
                            <Input
                              id="retry-count"
                              type="number"
                              value={formData.retryCount}
                              onChange={(e) => setFormData(prev => ({ ...prev, retryCount: parseInt(e.target.value) || 3 }))}
                              min="0"
                              data-testid="input-api-retry-count"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.supportsStreaming}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, supportsStreaming: checked }))}
                            data-testid="switch-streaming"
                          />
                          <Label>스트리밍 지원</Label>
                        </div>
                      </TabsContent>
                      
                      <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          data-testid="button-cancel-api"
                        >
                          취소
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={saveApiMutation.isPending}
                          data-testid="button-save-api"
                        >
                          {saveApiMutation.isPending ? '저장 중...' : '저장'}
                        </Button>
                      </div>
                    </form>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">총 API 수</p>
                    <p className="text-2xl font-bold">{apiCalls?.length || 0}</p>
                  </div>
                  <Bot className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">활성 API</p>
                    <p className="text-2xl font-bold">{apiCalls?.filter(api => api.isActive).length || 0}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">AI 제공자</p>
                    <p className="text-2xl font-bold">{providers?.length || 0}</p>
                  </div>
                  <Globe className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">카테고리</p>
                    <p className="text-2xl font-bold">{categories?.length || 0}</p>
                  </div>
                  <Layers className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="browse" className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>API 브라우저</span>
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>제공자</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>호출 히스토리</span>
            </TabsTrigger>
            <TabsTrigger value="secrets" className="flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>Secret 관리</span>
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center space-x-2">
              <Wand2 className="w-4 h-4" />
              <span>프롬프트</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>템플릿</span>
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center space-x-2">
              <TestTube className="w-4 h-4" />
              <span>테스트</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="browse" className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="API 이름, 설명, 모델명으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-48" data-testid="select-filter-provider">
                    <SelectValue placeholder="제공자 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 제공자</SelectItem>
                    {providers?.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48" data-testid="select-filter-category">
                    <SelectValue placeholder="카테고리 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 카테고리</SelectItem>
                    {categories?.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(category.name)}
                          <span>{category.displayName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* API Cards Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                        <div className="h-3 bg-muted rounded animate-pulse w-3/4"></div>
                        <div className="h-20 bg-muted rounded animate-pulse"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredApiCalls && filteredApiCalls.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredApiCalls.map((api: ApiCall) => {
                  const testResult = testResults[api.id];
                  return (
                    <Card key={api.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm" data-testid={`api-card-${api.id}`}>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <CardTitle className="text-lg font-semibold">{api.displayName || api.name}</CardTitle>
                              {api.isVerified && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {getProviderName(api.providerId || '')}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                <div className="flex items-center space-x-1">
                                  {getCategoryIcon(getCategoryName(api.categoryId || ''))}
                                  <span>{getCategoryName(api.categoryId || '')}</span>
                                </div>
                              </Badge>
                            </div>
                            
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              api.method === 'GET' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                              api.method === 'POST' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                              api.method === 'PUT' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                              api.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                              'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
                            }`}>
                              {api.method}
                            </span>
                          </div>
                          
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestApi(api.id)}
                              disabled={testApiMutation.isPending}
                              className="w-8 h-8 p-0"
                              data-testid={`button-test-api-${api.id}`}
                              title="API 테스트"
                            >
                              {testResult?.status === 'testing' ? (
                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <TestTube className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(api)}
                              className="w-8 h-8 p-0"
                              data-testid={`button-edit-api-${api.id}`}
                              title="편집"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(api.id)}
                              className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                              data-testid={`button-delete-api-${api.id}`}
                              title="삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {api.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{api.description}</p>
                        )}
                        
                        {api.modelName && (
                          <div className="flex items-center space-x-2 mb-3">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">{api.modelName}</span>
                          </div>
                        )}
                        
                        <div className="bg-muted/50 rounded-lg p-3 mb-4">
                          <p className="text-xs text-muted-foreground mb-1">API 엔드포인트:</p>
                          <p className="text-xs font-mono break-all text-foreground">
                            {api.url}
                          </p>
                        </div>
                        
                        {/* Test Result */}
                        {testResult && (
                          <div className={`p-3 rounded-lg mb-4 ${
                            testResult.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                            testResult.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                            'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                          }`}>
                            <div className="flex items-center space-x-2">
                              {testResult.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                               testResult.status === 'failed' ? <XCircle className="w-4 h-4 text-red-600" /> :
                               <Clock className="w-4 h-4 text-yellow-600" />}
                              <span className="text-sm font-medium">
                                {testResult.status === 'success' ? '테스트 성공' :
                                 testResult.status === 'failed' ? '테스트 실패' : '테스트 중...'}
                              </span>
                              {testResult.responseTime && (
                                <span className="text-xs text-muted-foreground">({testResult.responseTime}ms)</span>
                              )}
                            </div>
                            {testResult.message && (
                              <p className="text-xs text-muted-foreground mt-1">{testResult.message}</p>
                            )}
                          </div>
                        )}
                        
                        {/* API Details */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>{api.timeout || 300}초</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="w-3 h-3 text-muted-foreground" />
                            <span>{api.retryCount || 3}회</span>
                          </div>
                          
                          {(api.inputCost || api.outputCost) && (
                            <div className="col-span-2 flex items-center space-x-2">
                              <DollarSign className="w-3 h-3 text-muted-foreground" />
                              <span>
                                입력: ${Number(api.inputCost || 0).toFixed(6)} / 출력: ${Number(api.outputCost || 0).toFixed(6)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Status and Features */}
                        <div className="flex justify-between items-center mt-4 pt-3 border-t">
                          <div className="flex items-center space-x-2">
                            {api.supportsStreaming && (
                              <Badge variant="outline" className="text-xs">
                                <Zap className="w-3 h-3 mr-1" />
                                스트리밍
                              </Badge>
                            )}
                          </div>
                          
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            api.isActive 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          }`}>
                            {api.isActive ? '활성' : '비활성'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Plug className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-foreground mb-2">검색 결과가 없습니다</h3>
                  <p className="text-muted-foreground mb-6">다른 검색어나 필터를 시도해보세요.</p>
                  <Button onClick={() => { setSearchQuery(''); setSelectedProvider('all'); setSelectedCategory('all'); }}>
                    필터 초기화
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="history-api-call">API 선택</Label>
                    <Select value={historyApiCallId} onValueChange={setHistoryApiCallId}>
                      <SelectTrigger id="history-api-call">
                        <SelectValue placeholder="모든 API" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">모든 API</SelectItem>
                        {apiCalls?.map(api => (
                          <SelectItem key={api.id} value={api.id}>
                            {api.displayName || api.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="history-date-range">기간 선택</Label>
                    <Select value={historyDateRange} onValueChange={(value: '7d' | '30d' | '90d' | 'all') => setHistoryDateRange(value)}>
                      <SelectTrigger id="history-date-range">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">최근 7일</SelectItem>
                        <SelectItem value="30d">최근 30일</SelectItem>
                        <SelectItem value="90d">최근 90일</SelectItem>
                        <SelectItem value="all">전체</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">총 호출</p>
                      <p className="text-2xl font-bold">{historyStats.totalCalls}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">성공률</p>
                      <p className="text-2xl font-bold">{historyStats.successRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        성공: {historyStats.successCount} / 실패: {historyStats.failureCount}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">평균 응답시간</p>
                      <p className="text-2xl font-bold">{historyStats.avgResponseTime}ms</p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">총 비용</p>
                      <p className="text-2xl font-bold">${historyStats.totalCost.toFixed(4)}</p>
                      {historyStats.totalCalls > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          평균: ${historyStats.avgCost.toFixed(4)}/호출
                        </p>
                      )}
                    </div>
                    <DollarSign className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* History Table */}
            <Card>
              <CardHeader>
                <CardTitle>호출 히스토리</CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : apiTestResults && apiTestResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">API 이름</th>
                          <th className="text-left p-2">날짜</th>
                          <th className="text-left p-2">상태</th>
                          <th className="text-right p-2">응답시간</th>
                          <th className="text-right p-2">비용</th>
                          <th className="text-left p-2">HTTP 코드</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiTestResults.map((result: any, idx: number) => (
                          <tr key={result.id || idx} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              {apiCalls?.find(api => api.id === result.apiCallId)?.displayName || 
                               apiCalls?.find(api => api.id === result.apiCallId)?.name || 
                               result.apiCallId}
                            </td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {result.createdAt 
                                ? new Date(result.createdAt).toLocaleString('ko-KR')
                                : '알 수 없음'}
                            </td>
                            <td className="p-2">
                              <Badge 
                                variant={result.status === 'success' || result.status === 'passed' ? 'default' : 'destructive'}
                              >
                                {result.status === 'success' || result.status === 'passed' ? '성공' : '실패'}
                              </Badge>
                            </td>
                            <td className="p-2 text-right text-sm">
                              {result.responseTime || result.executionTime || 0}ms
                            </td>
                            <td className="p-2 text-right text-sm">
                              ${(result.cost || 0).toFixed(6)}
                            </td>
                            <td className="p-2">
                              <Badge variant="outline">{result.httpStatusCode || result.statusCode || 'N/A'}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>호출 히스토리가 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Providers Tab */}
          <TabsContent value="providers" className="space-y-4">
            {providers && providers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map((provider: AiServiceProvider) => {
                  const providerApiCount = apiCalls?.filter(api => api.providerId === provider.id).length || 0;
                  return (
                    <Card key={provider.id} className="hover:shadow-lg transition-all duration-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center space-x-2">
                              <span>{provider.displayName}</span>
                              {provider.status === 'active' && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{provider.name}</p>
                          </div>
                          <Badge variant={provider.tier === 'free' ? 'secondary' : 
                                        provider.tier === 'premium' ? 'default' : 'outline'}>
                            {provider.tier}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        {provider.baseUrl && (
                          <div className="bg-muted/50 rounded-lg p-3 mb-4">
                            <p className="text-xs text-muted-foreground mb-1">Base URL:</p>
                            <p className="text-xs font-mono break-all">{provider.baseUrl}</p>
                          </div>
                        )}
                        
                        {provider.supportedFeatures && provider.supportedFeatures.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium mb-2">지원 기능:</p>
                            <div className="flex flex-wrap gap-1">
                              {provider.supportedFeatures.map(feature => (
                                <Badge key={feature} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">등록된 API</p>
                            <p className="font-semibold">{providerApiCount}개</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">가격 모델</p>
                            <p className="font-semibold">{provider.pricingModel || 'N/A'}</p>
                          </div>
                        </div>
                        
                        {provider.website && (
                          <div className="mt-4 pt-4 border-t">
                            <Button variant="outline" size="sm" className="w-full" asChild>
                              <a href={provider.website} target="_blank" rel="noopener noreferrer">
                                <Globe className="w-4 h-4 mr-2" />
                                공식 사이트
                              </a>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Globe className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-foreground mb-2">제공자 정보 없음</h3>
                  <p className="text-muted-foreground">AI 서비스 제공자 정보를 불러올 수 없습니다.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            {templates && templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template: ApiTemplate) => (
                  <Card key={template.id} className="hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                          )}
                        </div>
                        {template.isFeatured && (
                          <Star className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {template.tags && template.tags.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {template.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">사용 횟수</p>
                          <p className="font-semibold">{template.usageCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">난이도</p>
                          <p className="font-semibold">{template.difficulty || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">평점</p>
                          <p className="font-semibold">
                            {template.rating ? `${Number(template.rating).toFixed(1)}★` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {template.useCase && (
                        <div className="bg-muted/50 rounded-lg p-3 mb-4">
                          <p className="text-xs text-muted-foreground mb-1">사용 사례:</p>
                          <p className="text-sm">{template.useCase}</p>
                        </div>
                      )}
                      
                      <Button className="w-full" size="sm">
                        <Copy className="w-4 h-4 mr-2" />
                        템플릿 사용하기
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-foreground mb-2">템플릿 없음</h3>
                  <p className="text-muted-foreground">API 템플릿을 불러올 수 없습니다.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-4">
            <Alert>
              <TestTube className="w-4 h-4" />
              <AlertTitle>API 테스트 센터</AlertTitle>
              <AlertDescription>
                등록된 API의 연결 상태를 확인하고 실시간으로 테스트할 수 있습니다.
              </AlertDescription>
            </Alert>
            
            {filteredApiCalls && filteredApiCalls.length > 0 ? (
              <div className="space-y-4">
                {filteredApiCalls.map((api: ApiCall) => {
                  const testResult = testResults[api.id];
                  return (
                    <Card key={api.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{api.displayName || api.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{api.description}</p>
                          </div>
                          <Button
                            onClick={() => handleTestApi(api.id)}
                            disabled={testApiMutation.isPending}
                            size="sm"
                          >
                            {testResult?.status === 'testing' ? (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                              <TestTube className="w-4 h-4 mr-2" />
                            )}
                            {testResult?.status === 'testing' ? '테스트 중...' : '테스트 실행'}
                          </Button>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-3">API 정보</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">URL:</span>
                                <span className="font-mono text-xs break-all">{api.url}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">메소드:</span>
                                <Badge variant="outline" className="text-xs">{api.method}</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">타임아웃:</span>
                                <span>{api.timeout}초</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">재시도:</span>
                                <span>{api.retryCount}회</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-3">테스트 결과</h4>
                            {testResult ? (
                              <div className={`p-4 rounded-lg ${
                                testResult.status === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                                testResult.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20' :
                                'bg-yellow-50 dark:bg-yellow-900/20'
                              }`}>
                                <div className="flex items-center space-x-2 mb-2">
                                  {testResult.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                                   testResult.status === 'failed' ? <XCircle className="w-4 h-4 text-red-600" /> :
                                   <Clock className="w-4 h-4 text-yellow-600" />}
                                  <span className="font-medium">
                                    {testResult.status === 'success' ? '테스트 성공' :
                                     testResult.status === 'failed' ? '테스트 실패' : '테스트 중...'}
                                  </span>
                                </div>
                                
                                {testResult.responseTime && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    응답 시간: {testResult.responseTime}ms
                                  </p>
                                )}
                                
                                {testResult.message && (
                                  <p className="text-sm mb-2">{testResult.message}</p>
                                )}
                                
                                {testResult.response && (
                                  <details className="mt-3">
                                    <summary className="text-sm font-medium cursor-pointer mb-2">응답 데이터 보기</summary>
                                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                                      {JSON.stringify(testResult.response, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            ) : (
                              <div className="p-4 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
                                <TestTube className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">테스트 버튼을 클릭하여 API 연결을 확인하세요</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <TestTube className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-foreground mb-2">테스트할 API가 없습니다</h3>
                  <p className="text-muted-foreground">먼저 API를 등록해주세요.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Secret Management Tab */}
          <TabsContent value="secrets" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Secret 관리</h3>
                <p className="text-muted-foreground text-sm">API 키와 인증 정보를 안전하게 관리합니다</p>
              </div>
              <Button onClick={() => refetchSecrets()} variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                새로고침
              </Button>
            </div>

            {secretStatusLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-pulse mb-2">🔑</div>
                  <p className="text-muted-foreground">Secret 상태를 확인 중...</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {secretStatus?.map((secret) => {
                  const testResult = secretTestResults[secret.key];
                  return (
                    <Card key={secret.key}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              secret.exists ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <h4 className="font-medium">{secret.key}</h4>
                              <p className="text-sm text-muted-foreground">
                                {secret.exists ? 'Secret이 설정되어 있습니다' : 'Secret이 설정되지 않았습니다'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {secret.exists && (
                              <Button
                                onClick={() => testSecretMutation.mutate({ 
                                  secretKey: secret.key,
                                  testPrompt: '안녕하세요, 이것은 API 연결 테스트입니다.'
                                })}
                                disabled={testSecretMutation.isPending}
                                variant="outline"
                                size="sm"
                                data-testid={`button-test-${secret.key}`}
                              >
                                <TestTube2 className="w-4 h-4 mr-2" />
                                {testSecretMutation.isPending ? '테스트 중...' : 'API 테스트'}
                              </Button>
                            )}
                            
                            <Badge variant={secret.exists ? 'default' : 'destructive'}>
                              {secret.exists ? '활성' : '비활성'}
                            </Badge>
                          </div>
                        </div>
                        
                        {testResult && (
                          <div className={`mt-4 p-3 rounded-lg ${
                            testResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                          }`}>
                            <div className="flex items-center space-x-2 mb-2">
                              {testResult.success ? 
                                <CheckCircle className="w-4 h-4 text-green-600" /> :
                                <XCircle className="w-4 h-4 text-red-600" />
                              }
                              <span className="font-medium text-sm">
                                {testResult.success ? 'API 테스트 성공' : 'API 테스트 실패'}
                              </span>
                            </div>
                            {testResult.responseTime && (
                              <p className="text-sm text-muted-foreground mb-1">
                                응답 시간: {testResult.responseTime}ms
                              </p>
                            )}
                            <p className="text-sm">{testResult.message}</p>
                          </div>
                        )}
                        
                        {!secret.exists && (
                          <Alert className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Secret 설정 필요</AlertTitle>
                            <AlertDescription className="mt-2">
                              Azure Environment variables에서 <code className="bg-muted px-1 py-0.5 rounded text-xs">{secret.key}</code>를 설정해주세요.
                              <br />Azure App Service의 Application Settings에서 설정할 수 있습니다.
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Prompt Editor Tab */}
          <TabsContent value="prompts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">프롬프트 에디터</h3>
                <p className="text-muted-foreground text-sm">고급 프롬프트 템플릿을 생성하고 테스트합니다</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prompt Template Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wand2 className="w-5 h-5" />
                    <span>프롬프트 템플릿</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="prompt-category">카테고리</Label>
                    <Select value={promptCategory} onValueChange={setPromptCategory}>
                      <SelectTrigger data-testid="select-prompt-category">
                        <SelectValue placeholder="프롬프트 카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="financial">금융 분석</SelectItem>
                        <SelectItem value="news">뉴스 요약</SelectItem>
                        <SelectItem value="analysis">시장 분석</SelectItem>
                        <SelectItem value="rag">RAG 검색</SelectItem>
                        <SelectItem value="general">일반</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="prompt-usecase">사용 용도</Label>
                    <Input
                      id="prompt-usecase"
                      placeholder="예: 종목 분석, 뉴스 요약, 시황 생성"
                      value={promptUseCase}
                      onChange={(e) => setPromptUseCase(e.target.value)}
                      data-testid="input-prompt-usecase"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="prompt-template">프롬프트 템플릿</Label>
                    <Textarea
                      id="prompt-template"
                      placeholder={`프롬프트를 입력하세요. 변수는 {{변수명}} 형식으로 사용할 수 있습니다.\n\n예시:\n다음 {{symbol}} 종목을 분석해주세요:\n- 가격: {{price}}\n- 거래량: {{volume}}\n\n{{#if includeNews}}뉴스 분석도 포함해주세요.{{/if}}`}
                      value={promptTemplate}
                      onChange={(e) => setPromptTemplate(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                      data-testid="textarea-prompt-template"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        if (promptTemplate) {
                          processPromptMutation.mutate({
                            template: promptTemplate,
                            variables: promptVariables
                          });
                        }
                      }}
                      disabled={!promptTemplate || processPromptMutation.isPending}
                      className="flex-1"
                      data-testid="button-process-prompt"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      {processPromptMutation.isPending ? '처리 중...' : '프롬프트 처리'}
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (promptTemplate) {
                          validatePromptMutation.mutate({
                            template: promptTemplate,
                            variables: []
                          });
                        }
                      }}
                      disabled={!promptTemplate || validatePromptMutation.isPending}
                      variant="outline"
                      data-testid="button-validate-prompt"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      검증
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Prompt Preview and Variables */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <span>프롬프트 미리보기</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {processedPrompt ? (
                    <div>
                      <Label>처리된 프롬프트</Label>
                      <div className="bg-muted p-4 rounded-lg border">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {processedPrompt}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>프롬프트를 입력하고 "처리" 버튼을 클릭하세요</p>
                    </div>
                  )}
                  
                  <div>
                    <Label>변수 설정</Label>
                    <div className="space-y-2 mt-2">
                      <Input
                        placeholder="변수명"
                        className="text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            const [key, value] = input.value.split('=');
                            if (key && value) {
                              setPromptVariables(prev => ({ ...prev, [key.trim()]: value.trim() }));
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <div className="text-xs text-muted-foreground">
                        변수는 "변수명=값" 형식으로 입력 후 Enter를 누르세요
                      </div>
                      {Object.entries(promptVariables).length > 0 && (
                        <div className="space-y-1">
                          {Object.entries(promptVariables).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between bg-muted p-2 rounded">
                              <span className="text-sm font-mono">
                                {key}: {String(value)}
                              </span>
                              <Button
                                onClick={() => {
                                  setPromptVariables(prev => {
                                    const updated = { ...prev };
                                    delete updated[key];
                                    return updated;
                                  });
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prompt Suggestions */}
            {promptSuggestions && promptSuggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>추천 프롬프트 템플릿</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {promptSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50" 
                           onClick={() => {
                             setPromptTemplate(suggestion.template);
                             setSelectedPromptTemplate(suggestion);
                           }}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{suggestion.name}</h4>
                          <Badge variant="outline">{suggestion.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                        <div className="text-xs bg-muted p-2 rounded font-mono">
                          {suggestion.template.substring(0, 100)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}