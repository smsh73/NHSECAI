import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Database, 
  Cloud, 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Key,
  Lock,
  Unlock,
  Settings,
  Info,
  Plus,
  Edit3,
  Trash2,
  Search,
  PlayCircle,
  Activity,
  BarChart3,
  Clock,
  Zap,
  Shield,
  Network,
  History
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConfigSummary {
  databricks?: {
    serverHostname: string;
    httpPath: string;
    hasAuthToken: boolean;
    usePrivateEndpoint: boolean;
    hasPrivateEndpoint: boolean;
  };
  postgresql?: {
    host: string;
    port: number;
    database: string;
    username: string;
    hasPassword: boolean;
    ssl: boolean;
    hasPrivateEndpoint: boolean;
  };
  cosmosdb?: {
    endpoint: string;
    databaseId: string;
    hasKey: boolean;
    hasPrivateEndpoint: boolean;
  };
  openaiPTU?: {
    endpoint: string;
    deploymentName: string;
    modelName?: string;
    apiVersion: string;
    hasApiKey: boolean;
    isPTU: boolean;
    hasPrivateEndpoint: boolean;
  };
  embedding?: {
    endpoint: string;
    deploymentName: string;
    modelName: string;
    apiVersion: string;
    hasApiKey: boolean;
    isEmbedding: boolean;
    hasPrivateEndpoint: boolean;
  };
  aiSearch?: {
    endpoint: string;
    indexName?: string;
    hasApiKey: boolean;
    usePrivateEndpoint?: boolean;
    hasPrivateEndpoint: boolean;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface EnvGuide {
  databricks: { required: string[]; optional: string[] };
  postgresql: { required: string[]; optional: string[] };
  cosmosdb: { required: string[]; optional: string[] };
  openaiPTU: { required: string[]; optional: string[] };
  embedding: { required: string[]; optional: string[] };
  aiSearch: { required: string[]; optional: string[] };
}

type ServiceType = 'databricks' | 'postgresql' | 'cosmosdb' | 'openaiPTU' | 'embedding' | 'aiSearch';

interface CustomService {
  id: string;
  name: string;
  description: string;
  serviceType: string;
  endpoint: string;
  privateEndpoint?: string;
  authConfig: Record<string, string>;
  isConfigured: boolean;
}

interface TestResult {
  service: string;
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  timestamp: string;
  duration?: number;
  logs?: string[];
  diagnostics?: {
    networkLatency?: number;
    dnsResolution?: boolean;
    authentication?: boolean;
    authorization?: boolean;
    connectionType?: string;
    statusCode?: number;
    errorType?: string;
    recommendations?: string[];
  };
}

interface TestHistory {
  id: string;
  service: string;
  success: boolean;
  timestamp: string;
  duration: number;
  error?: string;
}

export default function AzureConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testingConnection, setTestingConnection] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [showPrivateEndpointGuide, setShowPrivateEndpointGuide] = useState(false);
  
  // Test result state
  const [testResultDialogOpen, setTestResultDialogOpen] = useState(false);
  const [currentTestResult, setCurrentTestResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [batchTesting, setBatchTesting] = useState(false);
  const [batchResults, setBatchResults] = useState<TestResult[]>([]);
  const [selectedServicesForBatch, setSelectedServicesForBatch] = useState<Set<string>>(new Set());
  
  // PostgreSQL schema deployment state
  const [schemaDeployDialogOpen, setSchemaDeployDialogOpen] = useState(false);
  const [deployingSchema, setDeployingSchema] = useState(false);
  
  // Custom services state
  const [customServiceDialogOpen, setCustomServiceDialogOpen] = useState(false);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [editingCustomService, setEditingCustomService] = useState<CustomService | null>(null);
  const [customServiceForm, setCustomServiceForm] = useState({
    name: '',
    description: '',
    serviceType: 'api',
    endpoint: '',
    privateEndpoint: '',
    usePrivateEndpoint: false,
    authType: 'apiKey',
    apiKey: '',
    username: '',
    password: '',
  });
  
  // Service configuration state
  const [serviceConfig, setServiceConfig] = useState({
    // Databricks
    databricksHostname: '',
    databricksHttpPath: '',
    databricksToken: '',
    databricksUsePrivateEndpoint: false,
    databricksPrivateEndpoint: '',
    
    // PostgreSQL
    postgresqlHost: '',
    postgresqlPort: '5432',
    postgresqlDatabase: '',
    postgresqlUsername: '',
    postgresqlPassword: '',
    postgresqlSsl: false,
    postgresqlUsePrivateEndpoint: false,
    postgresqlPrivateEndpoint: '',
    
    // CosmosDB
    cosmosdbEndpoint: '',
    cosmosdbDatabaseId: '',
    cosmosdbKey: '',
    cosmosdbUsePrivateEndpoint: false,
    cosmosdbPrivateEndpoint: '',
    
    // OpenAI PTU
    openaiPtuEndpoint: '',
    openaiPtuDeployment: '',
    openaiPtuModel: '',
    openaiPtuApiVersion: '2024-02-15-preview',
    openaiPtuApiKey: '',
    openaiPtuUsePrivateEndpoint: false,
    openaiPtuPrivateEndpoint: '',
    
    // Embedding
    embeddingEndpoint: '',
    embeddingDeployment: '',
    embeddingModel: 'text-embedding-3-large',
    embeddingApiVersion: '2024-02-15-preview',
    embeddingApiKey: '',
    embeddingUsePrivateEndpoint: false,
    
    // AI Search
    aiSearchEndpoint: '',
    aiSearchIndexName: '',
    aiSearchApiKey: '',
    aiSearchUsePrivateEndpoint: false,
  });

  // Fetch configuration summary
  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useQuery<{ configuration: ConfigSummary }>({
    queryKey: ['/api/azure/config/summary'],
  });

  // Fetch validation results
  const { data: validationData, isLoading: validationLoading, refetch: refetchValidation } = useQuery<ValidationResult>({
    queryKey: ['/api/azure/config/validate'],
  });

  // Fetch environment guide
  const { data: envGuideData } = useQuery<{ guide: EnvGuide }>({
    queryKey: ['/api/azure/config/env-guide'],
  });

  // Check PostgreSQL environment variables
  const { data: pgEnvCheck } = useQuery<{
    success: boolean;
    isConfigured: boolean;
    connectionType: string;
    missingVars: string[];
    details: {
      hasDatabaseUrl: boolean;
      hasHost: boolean;
      hasDatabase: boolean;
      hasUser: boolean;
      hasPassword: boolean;
    };
  }>({
    queryKey: ['/api/database/check-env'],
  });

  // Initialize form when editing custom service
  useEffect(() => {
    if (editingCustomService) {
      setCustomServiceForm({
        name: editingCustomService.name,
        description: editingCustomService.description,
        serviceType: editingCustomService.serviceType,
        endpoint: editingCustomService.endpoint,
        privateEndpoint: editingCustomService.privateEndpoint || '',
        usePrivateEndpoint: !!editingCustomService.privateEndpoint,
        authType: editingCustomService.authConfig.apiKey ? 'apiKey' : 
                  (editingCustomService.authConfig.username ? 'basic' : 'none'),
        apiKey: editingCustomService.authConfig.apiKey || '',
        username: editingCustomService.authConfig.username || '',
        password: editingCustomService.authConfig.password || '',
      });
    }
  }, [editingCustomService]);

  const handleRefresh = () => {
    refetchConfig();
    refetchValidation();
    toast({
      title: "설정 새로고침",
      description: "Azure 설정이 새로고침되었습니다.",
    });
  };

  const handleOpenConfigDialog = (service: ServiceType) => {
    setSelectedService(service);
    setConfigDialogOpen(true);
    setShowPrivateEndpointGuide(false);
    
    // Load existing environment variables into form
    if (configData?.configuration) {
      const config = configData.configuration;
      
      switch (service) {
        case 'databricks':
          setServiceConfig(prev => ({
            ...prev,
            databricksHostname: config.databricks?.serverHostname || '',
            databricksHttpPath: config.databricks?.httpPath || '',
            databricksToken: config.databricks?.hasAuthToken ? '••••••••••••••••' : '',
            databricksUsePrivateEndpoint: config.databricks?.usePrivateEndpoint || false,
            databricksPrivateEndpoint: config.databricks?.hasPrivateEndpoint ? '••••••••••••••••' : '',
          }));
          break;
          
        case 'postgresql':
          setServiceConfig(prev => ({
            ...prev,
            postgresqlHost: config.postgresql?.host || '',
            postgresqlPort: config.postgresql?.port?.toString() || '5432',
            postgresqlDatabase: config.postgresql?.database || '',
            postgresqlUsername: config.postgresql?.username || '',
            postgresqlPassword: config.postgresql?.hasPassword ? '••••••••••••••••' : '',
            postgresqlSsl: config.postgresql?.ssl || false,
            postgresqlUsePrivateEndpoint: config.postgresql?.hasPrivateEndpoint || false,
            postgresqlPrivateEndpoint: config.postgresql?.hasPrivateEndpoint ? '••••••••••••••••' : '',
          }));
          break;
          
        case 'cosmosdb':
          setServiceConfig(prev => ({
            ...prev,
            cosmosdbEndpoint: config.cosmosdb?.endpoint || '',
            cosmosdbDatabaseId: config.cosmosdb?.databaseId || '',
            cosmosdbKey: config.cosmosdb?.hasKey ? '••••••••••••••••' : '',
            cosmosdbUsePrivateEndpoint: config.cosmosdb?.hasPrivateEndpoint || false,
            cosmosdbPrivateEndpoint: config.cosmosdb?.hasPrivateEndpoint ? '••••••••••••••••' : '',
          }));
          break;
          
        case 'openaiPTU':
          setServiceConfig(prev => ({
            ...prev,
            openaiPtuEndpoint: config.openaiPTU?.endpoint || '',
            openaiPtuDeployment: config.openaiPTU?.deploymentName || '',
            openaiPtuModel: config.openaiPTU?.modelName || '',
            openaiPtuApiVersion: config.openaiPTU?.apiVersion || '2024-02-15-preview',
            openaiPtuApiKey: config.openaiPTU?.hasApiKey ? '••••••••••••••••' : '',
            openaiPtuUsePrivateEndpoint: config.openaiPTU?.hasPrivateEndpoint || false,
            openaiPtuPrivateEndpoint: config.openaiPTU?.hasPrivateEndpoint ? '••••••••••••••••' : '',
          }));
          break;
          
        case 'embedding':
          setServiceConfig(prev => ({
            ...prev,
            embeddingEndpoint: config.embedding?.endpoint || '',
            embeddingDeployment: config.embedding?.deploymentName || '',
            embeddingModel: config.embedding?.modelName || 'text-embedding-3-large',
            embeddingApiVersion: config.embedding?.apiVersion || '2024-02-15-preview',
            embeddingApiKey: config.embedding?.hasApiKey ? '••••••••••••••••' : '',
            embeddingUsePrivateEndpoint: config.embedding?.hasPrivateEndpoint || false,
          }));
          break;
          
        case 'aiSearch':
          setServiceConfig(prev => ({
            ...prev,
            aiSearchEndpoint: config.aiSearch?.endpoint || '',
            aiSearchIndexName: config.aiSearch?.indexName || '',
            aiSearchApiKey: config.aiSearch?.hasApiKey ? '••••••••••••••••' : '',
            aiSearchUsePrivateEndpoint: config.aiSearch?.usePrivateEndpoint || false,
          }));
          break;
      }
    }
  };

  const validateServiceConfig = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (selectedService) {
      case 'databricks':
        if (!serviceConfig.databricksHostname.trim()) {
          errors.push('Server Hostname은 필수 항목입니다.');
        }
        if (!serviceConfig.databricksHttpPath.trim()) {
          errors.push('HTTP Path는 필수 항목입니다.');
        }
        if (!serviceConfig.databricksToken.trim()) {
          errors.push('Access Token은 필수 항목입니다.');
        }
        if (serviceConfig.databricksUsePrivateEndpoint && !serviceConfig.databricksPrivateEndpoint.trim()) {
          errors.push('Private Endpoint를 사용하려면 URL을 입력해야 합니다.');
        }
        break;

      case 'postgresql':
        if (!serviceConfig.postgresqlHost.trim()) {
          errors.push('Host는 필수 항목입니다.');
        }
        if (!serviceConfig.postgresqlDatabase.trim()) {
          errors.push('Database는 필수 항목입니다.');
        }
        if (!serviceConfig.postgresqlUsername.trim()) {
          errors.push('Username은 필수 항목입니다.');
        }
        if (!serviceConfig.postgresqlPassword.trim()) {
          errors.push('Password는 필수 항목입니다.');
        }
        const port = parseInt(serviceConfig.postgresqlPort);
        if (isNaN(port) || port < 1 || port > 65535) {
          errors.push('Port는 1-65535 사이의 숫자여야 합니다.');
        }
        if (serviceConfig.postgresqlUsePrivateEndpoint && !serviceConfig.postgresqlPrivateEndpoint.trim()) {
          errors.push('Private Endpoint를 사용하려면 URL을 입력해야 합니다.');
        }
        break;

      case 'cosmosdb':
        if (!serviceConfig.cosmosdbEndpoint.trim()) {
          errors.push('Endpoint는 필수 항목입니다.');
        } else if (!serviceConfig.cosmosdbEndpoint.startsWith('https://')) {
          errors.push('Endpoint는 https://로 시작해야 합니다.');
        }
        if (!serviceConfig.cosmosdbDatabaseId.trim()) {
          errors.push('Database ID는 필수 항목입니다.');
        }
        if (!serviceConfig.cosmosdbKey.trim()) {
          errors.push('API Key는 필수 항목입니다.');
        }
        if (serviceConfig.cosmosdbUsePrivateEndpoint && !serviceConfig.cosmosdbPrivateEndpoint.trim()) {
          errors.push('Private Endpoint를 사용하려면 URL을 입력해야 합니다.');
        }
        break;

      case 'openaiPTU':
        if (!serviceConfig.openaiPtuEndpoint.trim()) {
          errors.push('Endpoint는 필수 항목입니다.');
        } else if (!serviceConfig.openaiPtuEndpoint.startsWith('https://')) {
          errors.push('Endpoint는 https://로 시작해야 합니다.');
        }
        if (!serviceConfig.openaiPtuDeployment.trim()) {
          errors.push('Deployment Name은 필수 항목입니다.');
        }
        if (!serviceConfig.openaiPtuApiKey.trim()) {
          errors.push('API Key는 필수 항목입니다.');
        }
        if (serviceConfig.openaiPtuUsePrivateEndpoint && !serviceConfig.openaiPtuPrivateEndpoint.trim()) {
          errors.push('Private Endpoint를 사용하려면 URL을 입력해야 합니다.');
        }
        break;

      case 'embedding':
        if (!serviceConfig.embeddingEndpoint.trim()) {
          errors.push('Endpoint는 필수 항목입니다.');
        } else if (!serviceConfig.embeddingEndpoint.startsWith('https://')) {
          errors.push('Endpoint는 https://로 시작해야 합니다.');
        }
        if (!serviceConfig.embeddingDeployment.trim()) {
          errors.push('Deployment Name은 필수 항목입니다.');
        }
        if (!serviceConfig.embeddingApiKey.trim()) {
          errors.push('API Key는 필수 항목입니다.');
        }
        break;

      case 'aiSearch':
        if (!serviceConfig.aiSearchEndpoint.trim()) {
          errors.push('Endpoint는 필수 항목입니다.');
        } else if (!serviceConfig.aiSearchEndpoint.startsWith('https://')) {
          errors.push('Endpoint는 https://로 시작해야 합니다.');
        }
        if (!serviceConfig.aiSearchApiKey.trim()) {
          errors.push('API Key는 필수 항목입니다.');
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleSaveConfig = async () => {
    if (!selectedService) return;

    // Validate configuration
    const validation = validateServiceConfig();
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "입력값 오류",
        description: (
          <div className="space-y-1">
            <p>다음 항목을 확인해주세요:</p>
            <ul className="list-disc ml-4">
              {validation.errors.map((error, idx) => (
                <li key={idx} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        ),
      });
      return;
    }

    try {
      let envVars: Record<string, string> = {};

      // Build environment variables based on selected service
      switch (selectedService) {
        case 'databricks':
          envVars = {
            AZURE_DATABRICKS_SERVER_HOSTNAME: serviceConfig.databricksHostname,
            AZURE_DATABRICKS_HTTP_PATH: serviceConfig.databricksHttpPath,
            AZURE_DATABRICKS_TOKEN: serviceConfig.databricksToken,
          };
          if (serviceConfig.databricksUsePrivateEndpoint && serviceConfig.databricksPrivateEndpoint) {
            envVars.AZURE_DATABRICKS_PRIVATE_ENDPOINT = serviceConfig.databricksPrivateEndpoint;
          }
          break;

        case 'postgresql':
          envVars = {
            AZURE_POSTGRESQL_HOST: serviceConfig.postgresqlHost,
            AZURE_POSTGRESQL_PORT: serviceConfig.postgresqlPort,
            AZURE_POSTGRESQL_DATABASE: serviceConfig.postgresqlDatabase,
            AZURE_POSTGRESQL_USER: serviceConfig.postgresqlUsername,
            AZURE_POSTGRESQL_PASSWORD: serviceConfig.postgresqlPassword,
            AZURE_POSTGRESQL_SSL: serviceConfig.postgresqlSsl ? 'true' : 'false',
          };
          if (serviceConfig.postgresqlUsePrivateEndpoint && serviceConfig.postgresqlPrivateEndpoint) {
            envVars.AZURE_POSTGRESQL_PRIVATE_ENDPOINT = serviceConfig.postgresqlPrivateEndpoint;
          }
          break;

        case 'cosmosdb':
          envVars = {
            AZURE_COSMOS_ENDPOINT: serviceConfig.cosmosdbEndpoint,
            AZURE_COSMOS_DATABASE_ID: serviceConfig.cosmosdbDatabaseId,
            AZURE_COSMOS_KEY: serviceConfig.cosmosdbKey,
          };
          if (serviceConfig.cosmosdbUsePrivateEndpoint && serviceConfig.cosmosdbPrivateEndpoint) {
            envVars.AZURE_COSMOS_PRIVATE_ENDPOINT_URL = serviceConfig.cosmosdbPrivateEndpoint;
          }
          break;

        case 'openaiPTU':
          envVars = {
            AZURE_OPENAI_PTU_ENDPOINT: serviceConfig.openaiPtuEndpoint,
            AZURE_OPENAI_PTU_DEPLOYMENT: serviceConfig.openaiPtuDeployment,
            AZURE_OPENAI_PTU_MODEL: serviceConfig.openaiPtuModel,
            AZURE_OPENAI_PTU_API_VERSION: serviceConfig.openaiPtuApiVersion,
            AZURE_OPENAI_PTU_API_KEY: serviceConfig.openaiPtuApiKey,
          };
          if (serviceConfig.openaiPtuUsePrivateEndpoint) {
            envVars.AZURE_OPENAI_PTU_USE_PRIVATE_ENDPOINT = 'true';
          }
          break;

        case 'embedding':
          envVars = {
            AZURE_OPENAI_EMBEDDING_ENDPOINT: serviceConfig.embeddingEndpoint,
            AZURE_OPENAI_EMBEDDING_DEPLOYMENT: serviceConfig.embeddingDeployment,
            AZURE_OPENAI_EMBEDDING_MODEL: serviceConfig.embeddingModel,
            AZURE_OPENAI_EMBEDDING_API_VERSION: serviceConfig.embeddingApiVersion,
            AZURE_OPENAI_EMBEDDING_API_KEY: serviceConfig.embeddingApiKey,
          };
          if (serviceConfig.embeddingUsePrivateEndpoint) {
            envVars.AZURE_OPENAI_EMBEDDING_USE_PRIVATE_ENDPOINT = 'true';
          }
          break;

        case 'aiSearch':
          envVars = {
            AZURE_SEARCH_ENDPOINT: serviceConfig.aiSearchEndpoint,
            AZURE_SEARCH_KEY: serviceConfig.aiSearchApiKey,
          };
          if (serviceConfig.aiSearchIndexName) {
            envVars.AZURE_SEARCH_INDEX_NAME = serviceConfig.aiSearchIndexName;
          }
          if (serviceConfig.aiSearchUsePrivateEndpoint) {
            envVars.AZURE_SEARCH_USE_PRIVATE_ENDPOINT = 'true';
          }
          break;
      }

      // Save configuration to database
      const res = await apiRequest('POST', '/api/azure/config/save', {
        serviceName: selectedService,
        config: envVars
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "✅ 설정 저장 완료",
          description: (
            <div className="space-y-3 mt-2">
              <div className="p-3 bg-muted rounded-md">
                <p className="font-semibold mb-2">저장된 환경변수:</p>
                <div className="space-y-1 text-xs font-mono">
                  {Object.entries(envVars).map(([key, value]) => (
                    <div key={key} className="text-muted-foreground">
                      <span className="text-primary">{key}</span>={value.substring(0, 20)}...
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p className="font-semibold">저장 위치:</p>
                <ul className="list-disc ml-5">
                  <li>PostgreSQL 데이터베이스 (azureConfigs 테이블)</li>
                  <li>.env 파일 (프로젝트 루트)</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  서버를 재시작하면 새 환경변수가 적용됩니다.
                </p>
              </div>
            </div>
          ),
          duration: 10000,
        });

        // Refresh configuration to enable test button
        refetchConfig();
        refetchValidation();
        
        setConfigDialogOpen(false);
      } else {
        throw new Error(data.error || '설정 저장에 실패했습니다.');
      }
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "설정 저장 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  // Enhanced diagnostic analysis
  const analyzeDiagnostics = (service: string, duration: number, success: boolean, error?: string, data?: any): TestResult['diagnostics'] => {
    const diagnostics: TestResult['diagnostics'] = {
      networkLatency: duration,
      connectionType: configData?.configuration?.[service as keyof ConfigSummary] ? 'configured' : 'not configured',
      recommendations: []
    };

    // Network latency analysis
    if (duration < 100) {
      diagnostics.networkLatency = duration;
    } else if (duration < 500) {
      diagnostics.networkLatency = duration;
      diagnostics.recommendations?.push('네트워크 지연이 보통 수준입니다. Private Endpoint 사용을 고려하세요.');
    } else {
      diagnostics.networkLatency = duration;
      diagnostics.recommendations?.push('네트워크 지연이 높습니다. Private Endpoint 사용을 권장합니다.');
    }

    // Error analysis
    if (!success && error) {
      if (error.includes('authentication') || error.includes('unauthorized') || error.includes('401') || error.includes('403')) {
        diagnostics.authentication = false;
        diagnostics.authorization = error.includes('403') || error.includes('forbidden');
        diagnostics.errorType = error.includes('401') ? 'authentication' : 'authorization';
        diagnostics.recommendations?.push('인증 정보를 확인하세요. API 키 또는 자격 증명이 올바른지 확인하세요.');
      } else if (error.includes('timeout') || error.includes('connection') || error.includes('network')) {
        diagnostics.errorType = 'network';
        diagnostics.recommendations?.push('네트워크 연결 문제입니다. 방화벽 규칙과 네트워크 설정을 확인하세요.');
      } else if (error.includes('dns') || error.includes('hostname')) {
        diagnostics.dnsResolution = false;
        diagnostics.errorType = 'dns';
        diagnostics.recommendations?.push('DNS 해석 실패입니다. 엔드포인트 URL을 확인하세요.');
      } else {
        diagnostics.errorType = 'unknown';
        diagnostics.recommendations?.push('알 수 없는 오류입니다. 서비스 상태를 확인하세요.');
      }
    } else if (success) {
      diagnostics.authentication = true;
      diagnostics.authorization = true;
      diagnostics.dnsResolution = true;
    }

    return diagnostics;
  };

  const handleTestConnection = async (service: string) => {
    setTestingConnection(true);
    const startTime = Date.now();
    const logs: string[] = [];
    
    try {
      // Map service names to API endpoints
      const serviceMap: Record<string, string> = {
        'databricks': 'databricks',
        'postgresql': 'postgresql',
        'cosmosdb': 'cosmosdb',
        'openaiPTU': 'openai-ptu',
        'embedding': 'openai-embedding',
        'aiSearch': 'ai-search'
      };
      
      const endpoint = serviceMap[service] || service;
      const method = service === 'openaiPTU' || service === 'embedding' ? 'POST' : 'GET';
      
      // Get actual endpoint value for logging
      let actualEndpoint = 'N/A';
      if (service === 'cosmosdb' && configData?.configuration?.cosmosdb?.endpoint) {
        actualEndpoint = configData.configuration.cosmosdb.endpoint;
      } else if (service === 'openaiPTU' && configData?.configuration?.openaiPTU?.endpoint) {
        actualEndpoint = configData.configuration.openaiPTU.endpoint;
      } else if (service === 'embedding' && configData?.configuration?.embedding?.endpoint) {
        actualEndpoint = configData.configuration.embedding.endpoint;
      } else if (service === 'aiSearch' && configData?.configuration?.aiSearch?.endpoint) {
        actualEndpoint = configData.configuration.aiSearch.endpoint;
      } else if (service === 'databricks' && configData?.configuration?.databricks?.serverHostname) {
        actualEndpoint = configData.configuration.databricks.serverHostname;
      } else if (service === 'postgresql' && configData?.configuration?.postgresql?.host) {
        actualEndpoint = configData.configuration.postgresql.host;
      }
      
      logs.push(`[${new Date().toISOString()}] 테스트 시작: ${service}`);
      logs.push(`[${new Date().toISOString()}] 실제 서비스 엔드포인트: ${actualEndpoint}`);
      logs.push(`[${new Date().toISOString()}] API 엔드포인트: /api/azure/test/${endpoint}`);
      logs.push(`[${new Date().toISOString()}] HTTP 메서드: ${method}`);
      
      const requestStartTime = Date.now();
      const res = await apiRequest(method, `/api/azure/test/${endpoint}`, method === 'POST' ? {} : undefined);
      const requestDuration = Date.now() - requestStartTime;
      const data = await res.json();
      const duration = Date.now() - startTime;
      
      logs.push(`[${new Date().toISOString()}] 요청 소요 시간: ${requestDuration}ms`);
      logs.push(`[${new Date().toISOString()}] 응답 수신 (${duration}ms)`);
      logs.push(`[${new Date().toISOString()}] 상태: ${data.success ? '성공' : '실패'}`);
      
      const diagnostics = analyzeDiagnostics(service, duration, data.success, data.error, data.data);
      
      const testResult: TestResult = {
        service,
        success: data.success,
        message: data.message,
        data: data.data,
        error: data.error,
        timestamp: new Date().toISOString(),
        duration,
        logs,
        diagnostics: {
          ...diagnostics,
          statusCode: res.status
        }
      };
      
      // Add to history
      const historyEntry: TestHistory = {
        id: `test-${Date.now()}-${Math.random()}`,
        service,
        success: data.success,
        timestamp: new Date().toISOString(),
        duration,
        error: data.error
      };
      setTestHistory(prev => [historyEntry, ...prev].slice(0, 50)); // Keep last 50 tests
      
      setCurrentTestResult(testResult);
      setTestResultDialogOpen(true);
      
      if (data.success) {
        toast({
          title: "연결 테스트 성공",
          description: data.message || `${service} 연결이 성공했습니다.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "연결 실패",
          description: data.error || "연결 테스트에 실패했습니다.",
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logs.push(`[${new Date().toISOString()}] 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      
      const diagnostics = analyzeDiagnostics(service, duration, false, error instanceof Error ? error.message : '알 수 없는 오류');
      
      const testResult: TestResult = {
        service,
        success: false,
        error: error instanceof Error ? error.message : "테스트 중 오류가 발생했습니다.",
        timestamp: new Date().toISOString(),
        duration,
        logs,
        diagnostics
      };
      
      // Add to history
      const historyEntry: TestHistory = {
        id: `test-${Date.now()}-${Math.random()}`,
        service,
        success: false,
        timestamp: new Date().toISOString(),
        duration,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
      setTestHistory(prev => [historyEntry, ...prev].slice(0, 50));
      
      setCurrentTestResult(testResult);
      setTestResultDialogOpen(true);
      
      toast({
        variant: "destructive",
        title: "연결 테스트 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Batch test all services
  const handleBatchTest = async (services: string[] = []) => {
    const servicesToTest = services.length > 0 ? services : ['databricks', 'postgresql', 'cosmosdb', 'openaiPTU', 'embedding', 'aiSearch'];
    setBatchTesting(true);
    setBatchResults([]);
    
    const results: TestResult[] = [];
    for (const service of servicesToTest) {
      try {
        const startTime = Date.now();
        const serviceMap: Record<string, string> = {
          'databricks': 'databricks',
          'postgresql': 'postgresql',
          'cosmosdb': 'cosmosdb',
          'openaiPTU': 'openai-ptu',
          'embedding': 'openai-embedding',
          'aiSearch': 'ai-search'
        };
        
        const endpoint = serviceMap[service] || service;
        const method = service === 'openaiPTU' || service === 'embedding' ? 'POST' : 'GET';
        
        const res = await apiRequest(method, `/api/azure/test/${endpoint}`, method === 'POST' ? {} : undefined);
        const data = await res.json();
        const duration = Date.now() - startTime;
        
        const diagnostics = analyzeDiagnostics(service, duration, data.success, data.error, data.data);
        
        results.push({
          service,
          success: data.success,
          message: data.message,
          data: data.data,
          error: data.error,
          timestamp: new Date().toISOString(),
          duration,
          diagnostics: {
            ...diagnostics,
            statusCode: res.status || (data.success ? 200 : 500)
          }
        });
      } catch (error) {
        const startTime = Date.now();
        const duration = Date.now() - startTime;
        const diagnostics = analyzeDiagnostics(service, duration, false, error instanceof Error ? error.message : '알 수 없는 오류');
        
        results.push({
          service,
          success: false,
          error: error instanceof Error ? error.message : "테스트 중 오류가 발생했습니다.",
          timestamp: new Date().toISOString(),
          duration,
          diagnostics: {
            ...diagnostics,
            statusCode: 500
          }
        });
      }
    }
    
    setBatchResults(results);
    setBatchTesting(false);
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    toast({
      title: "배치 테스트 완료",
      description: `${totalCount}개 서비스 중 ${successCount}개 성공`,
    });
  };

  // Fetch custom services
  const { data: fetchedCustomServices, refetch: refetchCustomServices } = useQuery<CustomService[]>({
    queryKey: ['/api/azure/custom-services'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/azure/custom-services');
        if (response.ok) {
          return await response.json();
        }
        return [];
      } catch {
        return [];
      }
    },
    initialData: [],
  });

  useEffect(() => {
    if (fetchedCustomServices) {
      setCustomServices(fetchedCustomServices);
    }
  }, [fetchedCustomServices]);

  // Refetch custom services when dialog closes to ensure fresh data
  useEffect(() => {
    if (!customServiceDialogOpen && !editingCustomService) {
      refetchCustomServices();
    }
  }, [customServiceDialogOpen, editingCustomService, refetchCustomServices]);

  // Save custom service mutation
  const saveCustomServiceMutation = useMutation({
    mutationFn: async (serviceData: Omit<CustomService, 'id'> & { id?: string }) => {
      const isEdit = !!editingCustomService;
      const url = isEdit 
        ? `/api/azure/custom-services/${editingCustomService.id}`
        : '/api/azure/custom-services';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, url, serviceData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `서비스 ${isEdit ? '수정' : '추가'} 실패`);
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: editingCustomService ? "서비스 수정 완료" : "서비스 추가 완료",
        description: `${data.name || '서비스'}가 ${editingCustomService ? '수정' : '추가'}되었습니다.`,
      });
      // Refresh custom services list
      refetchCustomServices();
      queryClient.invalidateQueries({ queryKey: ['/api/azure/custom-services'] });
      setCustomServiceDialogOpen(false);
      setEditingCustomService(null);
      setCustomServiceForm({
        name: '',
        description: '',
        serviceType: 'api',
        endpoint: '',
        privateEndpoint: '',
        usePrivateEndpoint: false,
        authType: 'apiKey',
        apiKey: '',
        username: '',
        password: '',
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: error?.message || "알 수 없는 오류가 발생했습니다.",
      });
    },
  });

  // Delete custom service mutation
  const deleteCustomServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/azure/custom-services/${id}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || '서비스 삭제 실패');
      }
      if (response.status === 204 || response.ok) {
        return { success: true };
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "서비스 삭제 완료",
        description: "서비스가 삭제되었습니다.",
      });
      // Refresh custom services list
      refetchCustomServices();
      queryClient.invalidateQueries({ queryKey: ['/api/azure/custom-services'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "삭제 실패",
        description: error?.message || "서비스 삭제 중 오류가 발생했습니다.",
      });
    },
  });

  // Custom service handlers
  const handleSaveCustomService = () => {
    try {
      if (!customServiceForm.name || !customServiceForm.name.trim()) {
        toast({
          variant: "destructive",
          title: "필수 항목 누락",
          description: "서비스 이름을 입력해주세요.",
        });
        return;
      }

      if (!customServiceForm.endpoint || !customServiceForm.endpoint.trim()) {
        toast({
          variant: "destructive",
          title: "필수 항목 누락",
          description: "엔드포인트를 입력해주세요.",
        });
        return;
      }

      const authConfig: Record<string, string> = {};
      if (customServiceForm.authType === 'apiKey') {
        authConfig.apiKey = customServiceForm.apiKey || '';
      } else if (customServiceForm.authType === 'basic') {
        authConfig.username = customServiceForm.username || '';
        authConfig.password = customServiceForm.password || '';
      }

      const serviceData: Omit<CustomService, 'id'> & { id?: string } = {
        ...(editingCustomService && { id: editingCustomService.id }),
        name: customServiceForm.name,
        description: customServiceForm.description,
        serviceType: customServiceForm.serviceType,
        endpoint: customServiceForm.endpoint,
        privateEndpoint: customServiceForm.usePrivateEndpoint ? customServiceForm.privateEndpoint : undefined,
        authConfig,
        isConfigured: !!(customServiceForm.name && customServiceForm.endpoint),
      };

      saveCustomServiceMutation.mutate(serviceData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  };

  const handleDeleteCustomService = (id: string) => {
    const service = customServices.find(s => s.id === id);
    if (confirm(`"${service?.name || '서비스'}"를 정말 삭제하시겠습니까?`)) {
      deleteCustomServiceMutation.mutate(id);
    }
  };

  // PostgreSQL Schema Deployment
  const handleOpenSchemaDeployDialog = () => {
    // Check if PostgreSQL is configured
    if (!pgEnvCheck?.isConfigured) {
      toast({
        variant: "destructive",
        title: "PostgreSQL 환경변수 미설정",
        description: `다음 환경변수가 필요합니다: ${pgEnvCheck?.missingVars.join(', ')}`,
      });
      // Open PostgreSQL config dialog
      handleOpenConfigDialog('postgresql');
      return;
    }
    setSchemaDeployDialogOpen(true);
  };

  const handleDeploySchema = async () => {
    setDeployingSchema(true);
    try {
      const res = await apiRequest('POST', '/api/database/deploy-schema', {});
      const data = await res.json();

      if (data.success) {
        toast({
          title: "스키마 배포 성공",
          description: `PostgreSQL 스키마가 성공적으로 배포되었습니다. (${data.duration}ms)`,
        });
        setSchemaDeployDialogOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "스키마 배포 실패",
          description: data.error || data.message || "스키마 배포 중 오류가 발생했습니다.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "스키마 배포 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setDeployingSchema(false);
    }
  };

  const StatusBadge = ({ has, label }: { has: boolean; label: string }) => (
    <Badge variant={has ? "default" : "secondary"} className="gap-1">
      {has ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </Badge>
  );

  const config = configData?.configuration;

  return (
    <div className="w-full px-6 py-6 space-y-6">
      <h1 className="text-3xl font-bold">Azure 서비스 설정</h1>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground mt-2">
            환경변수 기반 Azure 서비스 연결 관리
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-config">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Validation Status */}
      {validationData && (
        <Alert variant={validationData.isValid ? "default" : "destructive"} data-testid="alert-validation">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {validationData.isValid ? "설정 검증 완료" : "설정 오류 발견"}
          </AlertTitle>
          <AlertDescription>
            {validationData.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold text-red-600">에러:</p>
                <ul className="list-disc ml-5">
                  {validationData.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validationData.warnings.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold text-yellow-600">경고:</p>
                <ul className="list-disc ml-5">
                  {validationData.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">개요</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">서비스 상세</TabsTrigger>
          <TabsTrigger value="custom" data-testid="tab-custom">커스텀 서비스</TabsTrigger>
          <TabsTrigger value="env-guide" data-testid="tab-env-guide">환경변수 가이드</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Batch Test Button */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  배치 연결 테스트
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleBatchTest()} 
                    disabled={batchTesting || testingConnection}
                    variant="outline"
                    data-testid="button-batch-test-all"
                  >
                    {batchTesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        테스트 중...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        전체 테스트
                      </>
                    )}
                  </Button>
                  {testHistory.length > 0 && (
                    <Button 
                      onClick={() => setTestResultDialogOpen(true)}
                      variant="secondary"
                      data-testid="button-view-history"
                    >
                      <History className="w-4 h-4 mr-2" />
                      테스트 히스토리 ({testHistory.length})
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>
                모든 Azure 서비스의 연결 상태를 한 번에 테스트합니다
              </CardDescription>
            </CardHeader>
            {batchResults.length > 0 && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {batchResults.map((result, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{result.service}</p>
                        <p className="text-xs text-muted-foreground">{result.duration}ms</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Databricks */}
            <Card data-testid="card-databricks" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    <CardTitle>Databricks</CardTitle>
                  </div>
                  <StatusBadge 
                    has={!!config?.databricks?.serverHostname} 
                    label={config?.databricks?.serverHostname ? "설정됨" : "미설정"} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {config?.databricks?.hasAuthToken ? <Lock className="w-4 h-4 text-green-500" /> : <Unlock className="w-4 h-4 text-red-500" />}
                  <span className="text-sm">인증 토큰: {config?.databricks?.hasAuthToken ? "있음" : "없음"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {config?.databricks?.usePrivateEndpoint ? <Key className="w-4 h-4 text-blue-500" /> : <Key className="w-4 h-4 text-gray-400" />}
                  <span className="text-sm">Private Endpoint: {config?.databricks?.usePrivateEndpoint ? "사용" : "미사용"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={() => handleTestConnection('databricks')} 
                    disabled={testingConnection || !config?.databricks?.serverHostname}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    data-testid="button-test-databricks"
                  >
                    테스트
                  </Button>
                  <Button 
                    onClick={() => handleOpenConfigDialog('databricks')}
                    className="flex-1"
                    size="sm"
                    data-testid="button-config-databricks"
                  >
                    설정
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* PostgreSQL */}
            <Card data-testid="card-postgresql" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    <CardTitle>PostgreSQL</CardTitle>
                  </div>
                  <StatusBadge 
                    has={!!config?.postgresql?.host} 
                    label={config?.postgresql?.host ? "설정됨" : "미설정"} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Host: {config?.postgresql?.host || "N/A"}</p>
                <p className="text-sm text-muted-foreground">Database: {config?.postgresql?.database || "N/A"}</p>
                <div className="flex items-center gap-2">
                  {config?.postgresql?.ssl ? <Lock className="w-4 h-4 text-green-500" /> : <Unlock className="w-4 h-4 text-gray-400" />}
                  <span className="text-sm">SSL: {config?.postgresql?.ssl ? "사용" : "미사용"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={() => handleTestConnection('postgresql')} 
                    disabled={testingConnection || !config?.postgresql?.host}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    data-testid="button-test-postgresql"
                  >
                    테스트
                  </Button>
                  <Button 
                    onClick={() => handleOpenConfigDialog('postgresql')}
                    className="flex-1"
                    size="sm"
                    data-testid="button-config-postgresql"
                  >
                    설정
                  </Button>
                </div>
                <Button 
                  onClick={handleOpenSchemaDeployDialog}
                  disabled={deployingSchema}
                  className="w-full mt-2"
                  size="sm"
                  variant="secondary"
                  data-testid="button-deploy-schema"
                >
                  {deployingSchema ? "배포 중..." : "스키마 배포"}
                </Button>
              </CardContent>
            </Card>

            {/* CosmosDB */}
            <Card data-testid="card-cosmosdb" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    <CardTitle>CosmosDB</CardTitle>
                  </div>
                  <StatusBadge 
                    has={!!config?.cosmosdb?.endpoint} 
                    label={config?.cosmosdb?.endpoint ? "설정됨" : "미설정"} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground truncate" title={config?.cosmosdb?.endpoint}>
                  Endpoint: {config?.cosmosdb?.endpoint || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Database: {config?.cosmosdb?.databaseId || "N/A"}</p>
                <div className="flex items-center gap-2">
                  {config?.cosmosdb?.hasKey ? <Key className="w-4 h-4 text-green-500" /> : <Key className="w-4 h-4 text-red-500" />}
                  <span className="text-sm">API Key: {config?.cosmosdb?.hasKey ? "있음" : "없음"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={() => handleTestConnection('cosmosdb')} 
                    disabled={testingConnection || !config?.cosmosdb?.endpoint}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    data-testid="button-test-cosmosdb"
                  >
                    테스트
                  </Button>
                  <Button 
                    onClick={() => handleOpenConfigDialog('cosmosdb')}
                    className="flex-1"
                    size="sm"
                    data-testid="button-config-cosmosdb"
                  >
                    설정
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* OpenAI PTU */}
            <Card data-testid="card-openai-ptu" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <CardTitle>OpenAI PTU</CardTitle>
                  </div>
                  <StatusBadge 
                    has={!!config?.openaiPTU?.endpoint} 
                    label={config?.openaiPTU?.endpoint ? "설정됨" : "미설정"} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Model: {config?.openaiPTU?.modelName || "N/A"}</p>
                <p className="text-sm text-muted-foreground">Deployment: {config?.openaiPTU?.deploymentName || "N/A"}</p>
                <p className="text-sm text-muted-foreground">API Version: {config?.openaiPTU?.apiVersion || "N/A"}</p>
                <div className="flex items-center gap-2">
                  {config?.openaiPTU?.hasApiKey ? <Key className="w-4 h-4 text-green-500" /> : <Key className="w-4 h-4 text-red-500" />}
                  <span className="text-sm">API Key: {config?.openaiPTU?.hasApiKey ? "있음" : "없음"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={() => handleTestConnection('openaiPTU')} 
                    disabled={testingConnection || !config?.openaiPTU?.endpoint}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    data-testid="button-test-openai-ptu"
                  >
                    테스트
                  </Button>
                  <Button 
                    onClick={() => handleOpenConfigDialog('openaiPTU')}
                    className="flex-1"
                    size="sm"
                    data-testid="button-config-openai-ptu"
                  >
                    설정
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* OpenAI Embedding */}
            <Card data-testid="card-embedding" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    <CardTitle>OpenAI Embedding</CardTitle>
                  </div>
                  <StatusBadge 
                    has={!!config?.embedding?.endpoint} 
                    label={config?.embedding?.endpoint ? "설정됨" : "미설정"} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Model: {config?.embedding?.modelName || "N/A"}</p>
                <p className="text-sm text-muted-foreground">Deployment: {config?.embedding?.deploymentName || "N/A"}</p>
                <div className="flex items-center gap-2">
                  {config?.embedding?.hasApiKey ? <Key className="w-4 h-4 text-green-500" /> : <Key className="w-4 h-4 text-red-500" />}
                  <span className="text-sm">API Key: {config?.embedding?.hasApiKey ? "있음" : "없음"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={() => handleTestConnection('embedding')} 
                    disabled={testingConnection || !config?.embedding?.endpoint}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    data-testid="button-test-embedding"
                  >
                    테스트
                  </Button>
                  <Button 
                    onClick={() => handleOpenConfigDialog('embedding')}
                    className="flex-1"
                    size="sm"
                    data-testid="button-config-embedding"
                  >
                    설정
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Azure AI Search */}
            <Card data-testid="card-ai-search" className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    <CardTitle>Azure AI Search</CardTitle>
                  </div>
                  <StatusBadge 
                    has={!!config?.aiSearch?.endpoint} 
                    label={config?.aiSearch?.endpoint ? "설정됨" : "미설정"} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground truncate" title={config?.aiSearch?.endpoint}>
                  Endpoint: {config?.aiSearch?.endpoint || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Index: {config?.aiSearch?.indexName || "N/A"}</p>
                <div className="flex items-center gap-2">
                  {config?.aiSearch?.hasApiKey ? <Key className="w-4 h-4 text-green-500" /> : <Key className="w-4 h-4 text-red-500" />}
                  <span className="text-sm">API Key: {config?.aiSearch?.hasApiKey ? "있음" : "없음"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={() => handleTestConnection('aiSearch')} 
                    disabled={testingConnection || !config?.aiSearch?.endpoint}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                    data-testid="button-test-ai-search"
                  >
                    테스트
                  </Button>
                  <Button 
                    onClick={() => handleOpenConfigDialog('aiSearch')}
                    className="flex-1"
                    size="sm"
                    data-testid="button-config-ai-search"
                  >
                    설정
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>서비스 상세 정보</CardTitle>
              <CardDescription>각 Azure 서비스의 상세 설정 정보</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm" data-testid="text-config-details">
                  {JSON.stringify(config, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Services Tab */}
        <TabsContent value="custom" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold">커스텀 Private Endpoint 서비스</h2>
              <p className="text-muted-foreground">사용자 정의 Azure 서비스 연결을 관리합니다</p>
            </div>
            <Button 
              onClick={() => {
                setCustomServiceDialogOpen(true);
                setEditingCustomService(null);
              }}
              data-testid="button-add-custom-service"
            >
              <Plus className="w-4 h-4 mr-2" />
              서비스 추가
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customServices.map((service) => (
              <Card key={service.id} data-testid={`card-custom-service-${service.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      <CardTitle>{service.name}</CardTitle>
                    </div>
                    <StatusBadge 
                      has={service.isConfigured} 
                      label={service.isConfigured ? "설정됨" : "미설정"} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">타입: {service.serviceType}</span>
                  </div>
                  {service.privateEndpoint && (
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-blue-500" />
                      <span className="text-sm truncate" title={service.privateEndpoint}>
                        {service.privateEndpoint}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button 
                      onClick={() => {
                        setEditingCustomService(service);
                        setCustomServiceDialogOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-edit-custom-${service.id}`}
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      편집
                    </Button>
                    <Button 
                      onClick={() => handleDeleteCustomService(service.id)}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-delete-custom-${service.id}`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {customServices.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>등록된 커스텀 서비스가 없습니다.</p>
                  <p className="text-sm mt-2">위의 "서비스 추가" 버튼을 클릭하여 새로운 서비스를 등록하세요.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Environment Guide Tab */}
        <TabsContent value="env-guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>환경변수 설정 가이드</CardTitle>
              <CardDescription>각 서비스별 필수 및 선택 환경변수</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {envGuideData?.guide && Object.entries(envGuideData.guide).map(([service, vars]) => (
                <div key={service} className="space-y-2" data-testid={`guide-${service}`}>
                  <h3 className="font-semibold text-lg capitalize">{service}</h3>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-700">필수 환경변수:</p>
                    <ul className="list-disc ml-5 text-sm text-muted-foreground">
                      {vars.required.map((v: string) => (
                        <li key={v}><code className="bg-muted px-1 rounded">{v}</code></li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-700">선택 환경변수:</p>
                    <ul className="list-disc ml-5 text-sm text-muted-foreground">
                      {vars.optional.map((v: string) => (
                        <li key={v}><code className="bg-muted px-1 rounded">{v}</code></li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {selectedService === 'databricks' && 'Databricks 설정'}
              {selectedService === 'postgresql' && 'PostgreSQL 설정'}
              {selectedService === 'cosmosdb' && 'CosmosDB 설정'}
              {selectedService === 'openaiPTU' && 'OpenAI PTU 설정'}
              {selectedService === 'embedding' && 'OpenAI Embedding 설정'}
            </DialogTitle>
            <DialogDescription>
              환경변수를 설정하여 Azure 서비스를 연결하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Databricks Configuration */}
            {selectedService === 'databricks' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="databricks-hostname">Server Hostname *</Label>
                    <span className="text-xs text-muted-foreground">Databricks 워크스페이스 호스트</span>
                  </div>
                  <Input
                    id="databricks-hostname"
                    placeholder="adb-xxxxxxxxx.x.azuredatabricks.net"
                    value={serviceConfig.databricksHostname}
                    onChange={(e) => setServiceConfig({...serviceConfig, databricksHostname: e.target.value})}
                    data-testid="input-databricks-hostname"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="databricks-http-path">HTTP Path *</Label>
                    <span className="text-xs text-muted-foreground">SQL Warehouse 경로</span>
                  </div>
                  <Input
                    id="databricks-http-path"
                    placeholder="/sql/1.0/warehouses/xxxxxx"
                    value={serviceConfig.databricksHttpPath}
                    onChange={(e) => setServiceConfig({...serviceConfig, databricksHttpPath: e.target.value})}
                    data-testid="input-databricks-http-path"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="databricks-token">Access Token *</Label>
                    <span className="text-xs text-muted-foreground">개인 액세스 토큰 (PAT)</span>
                  </div>
                  <Input
                    id="databricks-token"
                    type="password"
                    placeholder="dapi*********************"
                    value={serviceConfig.databricksToken}
                    onChange={(e) => setServiceConfig({...serviceConfig, databricksToken: e.target.value})}
                    data-testid="input-databricks-token"
                  />
                </div>
                
                {/* Private Endpoint Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="databricks-private-endpoint">Private Endpoint 사용</Label>
                    <Switch
                      id="databricks-private-endpoint"
                      checked={serviceConfig.databricksUsePrivateEndpoint}
                      onCheckedChange={(checked) => {
                        setServiceConfig({...serviceConfig, databricksUsePrivateEndpoint: checked});
                        if (checked) setShowPrivateEndpointGuide(true);
                      }}
                      data-testid="switch-databricks-private-endpoint"
                    />
                  </div>
                  
                  {showPrivateEndpointGuide && serviceConfig.databricksUsePrivateEndpoint && (
                    <Alert className="mb-3">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Private Endpoint 설정 가이드</AlertTitle>
                      <AlertDescription className="text-sm">
                        <p className="mb-2">Private Endpoint 사용 시 Azure 인프라에서 다음을 설정하세요:</p>
                        <ul className="list-disc ml-5 space-y-1">
                          <li>Azure Portal에서 Private Endpoint 리소스 생성</li>
                          <li>Databricks Workspace와 동일한 VNet에 위치</li>
                          <li>Private DNS Zone 자동 통합 활성화</li>
                          <li>Endpoint URL은 동일하게 유지 (DNS가 자동으로 Private IP로 해결)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {/* PostgreSQL Configuration */}
            {selectedService === 'postgresql' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="postgresql-host">Host *</Label>
                    <span className="text-xs text-muted-foreground">Azure PostgreSQL 서버 주소</span>
                  </div>
                  <Input
                    id="postgresql-host"
                    placeholder="myserver.postgres.database.azure.com"
                    value={serviceConfig.postgresqlHost}
                    onChange={(e) => setServiceConfig({...serviceConfig, postgresqlHost: e.target.value})}
                    data-testid="input-postgresql-host"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="postgresql-port">Port</Label>
                      <span className="text-xs text-muted-foreground">기본값: 5432</span>
                    </div>
                    <Input
                      id="postgresql-port"
                      placeholder="5432"
                      value={serviceConfig.postgresqlPort}
                      onChange={(e) => setServiceConfig({...serviceConfig, postgresqlPort: e.target.value})}
                      data-testid="input-postgresql-port"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="postgresql-database">Database *</Label>
                      <span className="text-xs text-muted-foreground">데이터베이스 이름</span>
                    </div>
                    <Input
                      id="postgresql-database"
                      placeholder="nh-investment"
                      value={serviceConfig.postgresqlDatabase}
                      onChange={(e) => setServiceConfig({...serviceConfig, postgresqlDatabase: e.target.value})}
                      data-testid="input-postgresql-database"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="postgresql-username">Username *</Label>
                    <span className="text-xs text-muted-foreground">관리자 계정 이름</span>
                  </div>
                  <Input
                    id="postgresql-username"
                    placeholder="dbadmin@myserver"
                    value={serviceConfig.postgresqlUsername}
                    onChange={(e) => setServiceConfig({...serviceConfig, postgresqlUsername: e.target.value})}
                    data-testid="input-postgresql-username"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="postgresql-password">Password *</Label>
                    <span className="text-xs text-muted-foreground">보안 암호</span>
                  </div>
                  <Input
                    id="postgresql-password"
                    type="password"
                    value={serviceConfig.postgresqlPassword}
                    onChange={(e) => setServiceConfig({...serviceConfig, postgresqlPassword: e.target.value})}
                    data-testid="input-postgresql-password"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="postgresql-ssl"
                    checked={serviceConfig.postgresqlSsl}
                    onCheckedChange={(checked) => setServiceConfig({...serviceConfig, postgresqlSsl: checked})}
                    data-testid="switch-postgresql-ssl"
                  />
                  <Label htmlFor="postgresql-ssl">SSL 연결 사용</Label>
                </div>
                
                {/* Private Endpoint Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="postgresql-private-endpoint">Private Endpoint 사용</Label>
                    <Switch
                      id="postgresql-private-endpoint"
                      checked={serviceConfig.postgresqlUsePrivateEndpoint}
                      onCheckedChange={(checked) => {
                        setServiceConfig({...serviceConfig, postgresqlUsePrivateEndpoint: checked});
                        if (checked) setShowPrivateEndpointGuide(true);
                      }}
                      data-testid="switch-postgresql-private-endpoint"
                    />
                  </div>
                  
                  {showPrivateEndpointGuide && serviceConfig.postgresqlUsePrivateEndpoint && (
                    <Alert className="mb-3">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Private Endpoint 설정 가이드</AlertTitle>
                      <AlertDescription className="text-sm">
                        <p className="mb-2">Private Endpoint 사용 시 Azure 인프라에서 다음을 설정하세요:</p>
                        <ul className="list-disc ml-5 space-y-1">
                          <li>Azure Portal에서 PostgreSQL Private Endpoint 생성</li>
                          <li>VNet 및 서브넷 선택</li>
                          <li>Private DNS Zone (privatelink.postgres.database.azure.com) 통합 활성화</li>
                          <li>연결 문자열은 동일하게 유지 (DNS가 자동으로 Private IP로 해결)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {/* CosmosDB Configuration */}
            {selectedService === 'cosmosdb' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="cosmosdb-endpoint">Endpoint *</Label>
                    <span className="text-xs text-muted-foreground">CosmosDB 계정 URI</span>
                  </div>
                  <Input
                    id="cosmosdb-endpoint"
                    placeholder="https://myaccount.documents.azure.com:443/"
                    value={serviceConfig.cosmosdbEndpoint}
                    onChange={(e) => setServiceConfig({...serviceConfig, cosmosdbEndpoint: e.target.value})}
                    data-testid="input-cosmosdb-endpoint"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="cosmosdb-database">Database ID *</Label>
                    <span className="text-xs text-muted-foreground">데이터베이스 식별자</span>
                  </div>
                  <Input
                    id="cosmosdb-database"
                    placeholder="nh-investment"
                    value={serviceConfig.cosmosdbDatabaseId}
                    onChange={(e) => setServiceConfig({...serviceConfig, cosmosdbDatabaseId: e.target.value})}
                    data-testid="input-cosmosdb-database"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="cosmosdb-key">Primary Key *</Label>
                    <span className="text-xs text-muted-foreground">액세스 키 (읽기/쓰기)</span>
                  </div>
                  <Input
                    id="cosmosdb-key"
                    type="password"
                    value={serviceConfig.cosmosdbKey}
                    onChange={(e) => setServiceConfig({...serviceConfig, cosmosdbKey: e.target.value})}
                    data-testid="input-cosmosdb-key"
                  />
                </div>
                
                {/* Private Endpoint Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="cosmosdb-private-endpoint">Private Endpoint 사용</Label>
                    <Switch
                      id="cosmosdb-private-endpoint"
                      checked={serviceConfig.cosmosdbUsePrivateEndpoint}
                      onCheckedChange={(checked) => {
                        setServiceConfig({...serviceConfig, cosmosdbUsePrivateEndpoint: checked});
                        if (checked) setShowPrivateEndpointGuide(true);
                      }}
                      data-testid="switch-cosmosdb-private-endpoint"
                    />
                  </div>
                  
                  {showPrivateEndpointGuide && serviceConfig.cosmosdbUsePrivateEndpoint && (
                    <Alert className="mb-3">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Private Endpoint 설정 가이드</AlertTitle>
                      <AlertDescription className="text-sm">
                        <p className="mb-2">Private Endpoint 사용 시 Azure 인프라에서 다음을 설정하세요:</p>
                        <ul className="list-disc ml-5 space-y-1">
                          <li>CosmosDB 계정에서 Private Endpoint 연결 생성</li>
                          <li>대상 하위 리소스 선택 (Sql, MongoDB, Cassandra 등)</li>
                          <li>Private DNS Zone (privatelink.documents.azure.com) 통합 활성화</li>
                          <li>Endpoint URL은 동일하게 유지 (DNS가 자동으로 Private IP로 해결)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {/* OpenAI PTU Configuration */}
            {selectedService === 'openaiPTU' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="openai-ptu-endpoint">Endpoint *</Label>
                    <span className="text-xs text-muted-foreground">Azure OpenAI 리소스 URL</span>
                  </div>
                  <Input
                    id="openai-ptu-endpoint"
                    placeholder="https://myresource.openai.azure.com/"
                    value={serviceConfig.openaiPtuEndpoint}
                    onChange={(e) => setServiceConfig({...serviceConfig, openaiPtuEndpoint: e.target.value})}
                    data-testid="input-openai-ptu-endpoint"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="openai-ptu-deployment">Deployment Name *</Label>
                      <span className="text-xs text-muted-foreground">Azure에 배포한 이름</span>
                    </div>
                    <Input
                      id="openai-ptu-deployment"
                      placeholder="my-gpt4-deployment"
                      value={serviceConfig.openaiPtuDeployment}
                      onChange={(e) => setServiceConfig({...serviceConfig, openaiPtuDeployment: e.target.value})}
                      data-testid="input-openai-ptu-deployment"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="openai-ptu-model">Model Name</Label>
                      <span className="text-xs text-muted-foreground">선택사항 (참고용, 예: gpt-4.1)</span>
                    </div>
                    <Input
                      id="openai-ptu-model"
                      placeholder="gpt-4.1 (선택사항)"
                      value={serviceConfig.openaiPtuModel}
                      onChange={(e) => setServiceConfig({...serviceConfig, openaiPtuModel: e.target.value})}
                      data-testid="input-openai-ptu-model"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="openai-ptu-api-version">API Version</Label>
                    <span className="text-xs text-muted-foreground">Azure OpenAI API 버전</span>
                  </div>
                  <Select 
                    value={serviceConfig.openaiPtuApiVersion}
                    onValueChange={(value) => setServiceConfig({...serviceConfig, openaiPtuApiVersion: value})}
                  >
                    <SelectTrigger id="openai-ptu-api-version" data-testid="select-openai-ptu-api-version">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-10-21">2024-10-21 (GA - 권장)</SelectItem>
                      <SelectItem value="2025-04-01-preview">2025-04-01-preview (최신)</SelectItem>
                      <SelectItem value="2024-06-01">2024-06-01</SelectItem>
                      <SelectItem value="2024-02-15-preview">2024-02-15-preview (구버전)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="openai-ptu-api-key">API Key *</Label>
                    <span className="text-xs text-muted-foreground">인증 키</span>
                  </div>
                  <Input
                    id="openai-ptu-api-key"
                    type="password"
                    value={serviceConfig.openaiPtuApiKey}
                    onChange={(e) => setServiceConfig({...serviceConfig, openaiPtuApiKey: e.target.value})}
                    data-testid="input-openai-ptu-api-key"
                  />
                </div>
                
                {/* Private Endpoint Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="openai-ptu-private-endpoint">Private Endpoint 사용</Label>
                    <Switch
                      id="openai-ptu-private-endpoint"
                      checked={serviceConfig.openaiPtuUsePrivateEndpoint}
                      onCheckedChange={(checked) => {
                        setServiceConfig({...serviceConfig, openaiPtuUsePrivateEndpoint: checked});
                        if (checked) setShowPrivateEndpointGuide(true);
                      }}
                      data-testid="switch-openai-ptu-private-endpoint"
                    />
                  </div>
                  
                  {showPrivateEndpointGuide && serviceConfig.openaiPtuUsePrivateEndpoint && (
                    <Alert className="mb-3">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Private Endpoint 설정 가이드</AlertTitle>
                      <AlertDescription className="text-sm">
                        <p className="mb-2">Private Endpoint 사용 시 Azure 인프라에서 다음을 설정하세요:</p>
                        <ul className="list-disc ml-5 space-y-1">
                          <li>Azure OpenAI 리소스에서 Private Endpoint 생성</li>
                          <li>네트워크 격리 설정 (Public access: Disabled)</li>
                          <li>Private DNS Zone (privatelink.openai.azure.com) 통합 활성화</li>
                          <li>Endpoint URL은 동일하게 유지 (DNS가 자동으로 Private IP로 해결)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {/* Embedding Configuration */}
            {selectedService === 'embedding' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="embedding-endpoint">Endpoint *</Label>
                    <span className="text-xs text-muted-foreground">Azure OpenAI 리소스 URL</span>
                  </div>
                  <Input
                    id="embedding-endpoint"
                    placeholder="https://myresource.openai.azure.com/"
                    value={serviceConfig.embeddingEndpoint}
                    onChange={(e) => setServiceConfig({...serviceConfig, embeddingEndpoint: e.target.value})}
                    data-testid="input-embedding-endpoint"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="embedding-deployment">Deployment Name *</Label>
                      <span className="text-xs text-muted-foreground">Azure에 배포한 이름</span>
                    </div>
                    <Input
                      id="embedding-deployment"
                      placeholder="my-embedding-deployment"
                      value={serviceConfig.embeddingDeployment}
                      onChange={(e) => setServiceConfig({...serviceConfig, embeddingDeployment: e.target.value})}
                      data-testid="input-embedding-deployment"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="embedding-model">Model Name</Label>
                      <span className="text-xs text-muted-foreground">선택사항 (참고용)</span>
                    </div>
                    <Select 
                      value={serviceConfig.embeddingModel}
                      onValueChange={(value) => setServiceConfig({...serviceConfig, embeddingModel: value})}
                    >
                      <SelectTrigger id="embedding-model" data-testid="select-embedding-model">
                        <SelectValue placeholder="선택사항" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                        <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                        <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="embedding-api-version">API Version</Label>
                    <span className="text-xs text-muted-foreground">Azure OpenAI API 버전</span>
                  </div>
                  <Select 
                    value={serviceConfig.embeddingApiVersion}
                    onValueChange={(value) => setServiceConfig({...serviceConfig, embeddingApiVersion: value})}
                  >
                    <SelectTrigger id="embedding-api-version" data-testid="select-embedding-api-version">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-10-21">2024-10-21 (GA - 권장)</SelectItem>
                      <SelectItem value="2025-04-01-preview">2025-04-01-preview (최신)</SelectItem>
                      <SelectItem value="2024-06-01">2024-06-01</SelectItem>
                      <SelectItem value="2024-02-15-preview">2024-02-15-preview (구버전)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="embedding-api-key">API Key *</Label>
                    <span className="text-xs text-muted-foreground">인증 키</span>
                  </div>
                  <Input
                    id="embedding-api-key"
                    type="password"
                    value={serviceConfig.embeddingApiKey}
                    onChange={(e) => setServiceConfig({...serviceConfig, embeddingApiKey: e.target.value})}
                    data-testid="input-embedding-api-key"
                  />
                </div>
                
                {/* Private Endpoint Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="embedding-private-endpoint">Private Endpoint 사용</Label>
                    <Switch
                      id="embedding-private-endpoint"
                      checked={serviceConfig.embeddingUsePrivateEndpoint}
                      onCheckedChange={(checked) => {
                        setServiceConfig({...serviceConfig, embeddingUsePrivateEndpoint: checked});
                        if (checked) setShowPrivateEndpointGuide(true);
                      }}
                      data-testid="switch-embedding-private-endpoint"
                    />
                  </div>
                  
                  {showPrivateEndpointGuide && serviceConfig.embeddingUsePrivateEndpoint && (
                    <Alert className="mb-3">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Private Endpoint 설정 가이드</AlertTitle>
                      <AlertDescription className="text-sm">
                        <p className="mb-2">Private Endpoint 사용 시 Azure 인프라에서 다음을 설정하세요:</p>
                        <ul className="list-disc ml-5 space-y-1">
                          <li>Azure OpenAI Embedding 리소스에서 Private Endpoint 생성</li>
                          <li>네트워크 격리 설정 (Public access: Disabled)</li>
                          <li>Private DNS Zone (privatelink.openai.azure.com) 통합 활성화</li>
                          <li>Endpoint URL은 동일하게 유지 (DNS가 자동으로 Private IP로 해결)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {/* AI Search Configuration */}
            {selectedService === 'aiSearch' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="ai-search-endpoint">Endpoint *</Label>
                    <span className="text-xs text-muted-foreground">Azure AI Search 엔드포인트</span>
                  </div>
                  <Input
                    id="ai-search-endpoint"
                    placeholder="https://mysearch.search.windows.net"
                    value={serviceConfig.aiSearchEndpoint}
                    onChange={(e) => setServiceConfig({...serviceConfig, aiSearchEndpoint: e.target.value})}
                    data-testid="input-ai-search-endpoint"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="ai-search-index-name">Index Name</Label>
                    <span className="text-xs text-muted-foreground">선택사항 (기본: nh-financial-index)</span>
                  </div>
                  <Input
                    id="ai-search-index-name"
                    placeholder="nh-financial-index"
                    value={serviceConfig.aiSearchIndexName}
                    onChange={(e) => setServiceConfig({...serviceConfig, aiSearchIndexName: e.target.value})}
                    data-testid="input-ai-search-index-name"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="ai-search-api-key">Admin API Key *</Label>
                    <span className="text-xs text-muted-foreground">관리자 키</span>
                  </div>
                  <Input
                    id="ai-search-api-key"
                    type="password"
                    value={serviceConfig.aiSearchApiKey}
                    onChange={(e) => setServiceConfig({...serviceConfig, aiSearchApiKey: e.target.value})}
                    data-testid="input-ai-search-api-key"
                  />
                </div>
                
                {/* Private Endpoint Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="ai-search-private-endpoint">Private Endpoint 사용</Label>
                    <Switch
                      id="ai-search-private-endpoint"
                      checked={serviceConfig.aiSearchUsePrivateEndpoint}
                      onCheckedChange={(checked) => {
                        setServiceConfig({...serviceConfig, aiSearchUsePrivateEndpoint: checked});
                        if (checked) setShowPrivateEndpointGuide(true);
                      }}
                      data-testid="switch-ai-search-private-endpoint"
                    />
                  </div>
                  
                  {showPrivateEndpointGuide && serviceConfig.aiSearchUsePrivateEndpoint && (
                    <Alert className="mb-3">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Private Endpoint 설정 가이드</AlertTitle>
                      <AlertDescription className="text-sm">
                        <p className="mb-2">Private Endpoint 사용 시 Azure 인프라에서 다음을 설정하세요:</p>
                        <ul className="list-disc ml-5 space-y-1">
                          <li>Azure Portal에서 AI Search Private Endpoint 생성</li>
                          <li>VNet 및 서브넷 선택</li>
                          <li>Private DNS Zone (privatelink.search.windows.net) 통합 활성화</li>
                          <li>Endpoint URL은 동일하게 유지 (DNS가 자동으로 Private IP로 해결)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)} data-testid="button-cancel-config">
              취소
            </Button>
            <Button onClick={handleSaveConfig} data-testid="button-save-config">
              환경변수 확인 및 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Service Dialog */}
      <Dialog open={customServiceDialogOpen} onOpenChange={(open) => {
        setCustomServiceDialogOpen(open);
        if (!open) {
          setCustomServiceForm({
            name: '',
            description: '',
            serviceType: 'api',
            endpoint: '',
            privateEndpoint: '',
            usePrivateEndpoint: false,
            authType: 'apiKey',
            apiKey: '',
            username: '',
            password: '',
          });
          setEditingCustomService(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {editingCustomService ? '커스텀 서비스 편집' : '커스텀 서비스 추가'}
            </DialogTitle>
            <DialogDescription>
              Private Endpoint를 사용하는 Azure 서비스 연결을 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-name">서비스 이름 *</Label>
                <Input
                  id="custom-name"
                  placeholder="My Custom Service"
                  value={customServiceForm.name}
                  onChange={(e) => setCustomServiceForm({...customServiceForm, name: e.target.value})}
                  data-testid="input-custom-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-type">서비스 타입</Label>
                <Select 
                  value={customServiceForm.serviceType}
                  onValueChange={(value) => setCustomServiceForm({...customServiceForm, serviceType: value})}
                >
                  <SelectTrigger id="custom-type" data-testid="select-custom-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="ai">AI Service</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-description">설명</Label>
              <Input
                id="custom-description"
                placeholder="서비스에 대한 간단한 설명"
                value={customServiceForm.description}
                onChange={(e) => setCustomServiceForm({...customServiceForm, description: e.target.value})}
                data-testid="input-custom-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-endpoint">Endpoint *</Label>
              <Input
                id="custom-endpoint"
                placeholder="https://myservice.azure.com"
                value={customServiceForm.endpoint}
                onChange={(e) => setCustomServiceForm({...customServiceForm, endpoint: e.target.value})}
                data-testid="input-custom-endpoint"
              />
            </div>

            {/* Private Endpoint Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="custom-use-private-endpoint">Private Endpoint 사용</Label>
                <Switch
                  id="custom-use-private-endpoint"
                  checked={customServiceForm.usePrivateEndpoint}
                  onCheckedChange={(checked) => setCustomServiceForm({...customServiceForm, usePrivateEndpoint: checked})}
                  data-testid="switch-custom-private-endpoint"
                />
              </div>

              {customServiceForm.usePrivateEndpoint && (
                <>
                  <Alert className="mb-3">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Private Endpoint 설정</AlertTitle>
                    <AlertDescription className="text-sm">
                      <ul className="list-disc ml-5 space-y-1">
                        <li>Azure Portal에서 Private Endpoint 생성</li>
                        <li>Virtual Network 및 서브넷 연결</li>
                        <li>Private DNS Zone 구성</li>
                        <li>네트워크 보안 그룹 규칙 설정</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="custom-private-endpoint">Private Endpoint URL</Label>
                    <Input
                      id="custom-private-endpoint"
                      placeholder="privatelink.myservice.azure.com"
                      value={customServiceForm.privateEndpoint}
                      onChange={(e) => setCustomServiceForm({...customServiceForm, privateEndpoint: e.target.value})}
                      data-testid="input-custom-private-endpoint-url"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Authentication Section */}
            <div className="border-t pt-4">
              <div className="space-y-2 mb-3">
                <Label htmlFor="custom-auth-type">인증 방식</Label>
                <Select 
                  value={customServiceForm.authType}
                  onValueChange={(value) => setCustomServiceForm({...customServiceForm, authType: value})}
                >
                  <SelectTrigger id="custom-auth-type" data-testid="select-custom-auth-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apiKey">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                    <SelectItem value="none">인증 없음</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {customServiceForm.authType === 'apiKey' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-api-key">API Key</Label>
                  <Input
                    id="custom-api-key"
                    type="password"
                    placeholder="Enter API Key"
                    value={customServiceForm.apiKey}
                    onChange={(e) => setCustomServiceForm({...customServiceForm, apiKey: e.target.value})}
                    data-testid="input-custom-api-key"
                  />
                </div>
              )}

              {customServiceForm.authType === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-username">Username</Label>
                    <Input
                      id="custom-username"
                      placeholder="Username"
                      value={customServiceForm.username}
                      onChange={(e) => setCustomServiceForm({...customServiceForm, username: e.target.value})}
                      data-testid="input-custom-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-password">Password</Label>
                    <Input
                      id="custom-password"
                      type="password"
                      placeholder="Password"
                      value={customServiceForm.password}
                      onChange={(e) => setCustomServiceForm({...customServiceForm, password: e.target.value})}
                      data-testid="input-custom-password"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCustomServiceDialogOpen(false)} 
              data-testid="button-cancel-custom-service"
            >
              취소
            </Button>
            <Button 
              onClick={handleSaveCustomService}
              disabled={!customServiceForm.name || !customServiceForm.endpoint || saveCustomServiceMutation.isPending}
              data-testid="button-save-custom-service"
            >
              {saveCustomServiceMutation.isPending ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  {editingCustomService ? '수정 중...' : '추가 중...'}
                </>
              ) : (
                <>
                  {editingCustomService ? '수정' : '추가'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog open={testResultDialogOpen} onOpenChange={setTestResultDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-test-result">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentTestResult?.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              테스트 결과: {currentTestResult?.service || '배치 테스트'}
            </DialogTitle>
            <DialogDescription>
              {currentTestResult?.timestamp && `실행 시간: ${currentTestResult.timestamp} | 소요 시간: ${currentTestResult.duration}ms`}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={currentTestResult ? "single" : batchResults.length > 0 ? "batch" : "history"} className="w-full">
            <TabsList>
              {currentTestResult && <TabsTrigger value="single">단일 테스트</TabsTrigger>}
              {batchResults.length > 0 && <TabsTrigger value="batch">배치 테스트</TabsTrigger>}
              <TabsTrigger value="history">테스트 히스토리</TabsTrigger>
            </TabsList>

            {currentTestResult && (
              <TabsContent value="single" className="space-y-4 mt-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant={currentTestResult?.success ? "default" : "destructive"}>
                {currentTestResult?.success ? "성공" : "실패"}
              </Badge>
              {currentTestResult?.message && (
                <span className="text-sm text-muted-foreground">{currentTestResult.message}</span>
              )}
            </div>

            {/* Diagnostics */}
            {currentTestResult?.diagnostics && (
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  진단 정보
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {currentTestResult.diagnostics.networkLatency !== undefined && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">네트워크 지연</p>
                        <p className="text-sm font-semibold">
                          {currentTestResult.diagnostics.networkLatency}ms
                          {currentTestResult.diagnostics.networkLatency > 500 && (
                            <Badge variant="destructive" className="ml-2">높음</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentTestResult.diagnostics.statusCode && (
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">HTTP 상태 코드</p>
                        <p className="text-sm font-semibold">{currentTestResult.diagnostics.statusCode}</p>
                      </div>
                    </div>
                  )}
                  {currentTestResult.diagnostics.authentication !== undefined && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">인증</p>
                        <Badge variant={currentTestResult.diagnostics.authentication ? "default" : "destructive"}>
                          {currentTestResult.diagnostics.authentication ? "성공" : "실패"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {currentTestResult.diagnostics.dnsResolution !== undefined && (
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">DNS 해석</p>
                        <Badge variant={currentTestResult.diagnostics.dnsResolution ? "default" : "destructive"}>
                          {currentTestResult.diagnostics.dnsResolution ? "성공" : "실패"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
                {currentTestResult.diagnostics.recommendations && currentTestResult.diagnostics.recommendations.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>권장 사항</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc ml-5 space-y-1 mt-2">
                        {currentTestResult.diagnostics.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Error Message */}
            {currentTestResult?.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>오류</AlertTitle>
                <AlertDescription className="font-mono text-xs">
                  {currentTestResult.error}
                </AlertDescription>
              </Alert>
            )}

            {/* Response Data */}
            {currentTestResult?.data && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">응답 데이터</Label>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap" data-testid="text-response-data">
                    {JSON.stringify(currentTestResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Logs */}
            {currentTestResult?.logs && currentTestResult.logs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">실행 로그</Label>
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs space-y-1" data-testid="text-execution-logs">
                  {currentTestResult.logs.map((log, idx) => (
                    <div key={idx}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          

                </TabsContent>
              )}

              {batchResults.length > 0 && (
                <TabsContent value="batch" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">배치 테스트 결과</h3>
                        <p className="text-sm text-muted-foreground">
                          총 {batchResults.length}개 서비스 테스트 완료
                        </p>
                      </div>
                      <Badge variant="outline">
                        성공: {batchResults.filter(r => r.success).length} / 실패: {batchResults.filter(r => !r.success).length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
                      {batchResults.map((result, idx) => (
                        <Card key={idx} className={result.success ? "border-green-500" : "border-red-500"}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {result.success ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <CardTitle className="text-sm">{result.service}</CardTitle>
                              </div>
                              <Badge variant={result.success ? "default" : "destructive"}>
                                {result.duration}ms
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {result.error && (
                              <p className="text-xs text-red-500 mb-2">{result.error}</p>
                            )}
                            {result.message && (
                              <p className="text-xs text-muted-foreground">{result.message}</p>
                            )}
                            {result.diagnostics && (
                              <div className="mt-2 space-y-1">
                                {result.diagnostics.networkLatency !== undefined && (
                                  <p className="text-xs text-muted-foreground">
                                    네트워크 지연: {result.diagnostics.networkLatency}ms
                                  </p>
                                )}
                                {result.diagnostics.recommendations && result.diagnostics.recommendations.length > 0 && (
                                  <Alert className="py-2">
                                    <Info className="h-3 w-3" />
                                    <AlertDescription className="text-xs">
                                      {result.diagnostics.recommendations[0]}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">테스트 히스토리</h3>
                      <p className="text-sm text-muted-foreground">
                        최근 {testHistory.length}개의 테스트 기록
                      </p>
                    </div>
                    {testHistory.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setTestHistory([])}
                        data-testid="button-clear-history"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        히스토리 삭제
                      </Button>
                    )}
                  </div>
                  {testHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-lg font-medium mb-2">테스트 히스토리 없음</h3>
                      <p className="text-sm text-muted-foreground">
                        아직 테스트를 수행하지 않았습니다
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {testHistory.map((history) => (
                        <Card key={history.id} className={history.success ? "border-green-500" : "border-red-500"}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {history.success ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold">{history.service}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(history.timestamp).toLocaleString('ko-KR')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={history.success ? "default" : "destructive"}>
                                  {history.duration}ms
                                </Badge>
                                {history.error && (
                                  <p className="text-xs text-red-500 mt-1 truncate max-w-[200px]">
                                    {history.error}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setTestResultDialogOpen(false)}
              data-testid="button-close-test-result"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PostgreSQL Schema Deploy Dialog */}
      <Dialog open={schemaDeployDialogOpen} onOpenChange={setSchemaDeployDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-schema-deploy">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              PostgreSQL 스키마 배포
            </DialogTitle>
            <DialogDescription>
              데이터베이스 스키마를 PostgreSQL에 배포합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Environment Check Status */}
            {pgEnvCheck && (
              <Alert variant={pgEnvCheck.isConfigured ? "default" : "destructive"}>
                <Info className="h-4 w-4" />
                <AlertTitle>환경변수 상태</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2 mt-2">
                    <p className="font-semibold">
                      연결 방식: {pgEnvCheck.connectionType}
                    </p>
                    {pgEnvCheck.details && (
                      <div className="text-sm">
                        <p>✓ DATABASE_URL: {pgEnvCheck.details.hasDatabaseUrl ? '설정됨' : '미설정'}</p>
                        <p>✓ Host: {pgEnvCheck.details.hasHost ? '설정됨' : '미설정'}</p>
                        <p>✓ Database: {pgEnvCheck.details.hasDatabase ? '설정됨' : '미설정'}</p>
                        <p>✓ User: {pgEnvCheck.details.hasUser ? '설정됨' : '미설정'}</p>
                        <p>✓ Password: {pgEnvCheck.details.hasPassword ? '설정됨' : '미설정'}</p>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>중요 안내</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>이 작업은 다음을 수행합니다:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>데이터베이스 스키마를 최신 버전으로 업데이트합니다</li>
                  <li>새로운 테이블 및 컬럼이 추가될 수 있습니다</li>
                  <li><strong>기존 데이터는 유지됩니다</strong> (Upsert 방식)</li>
                  <li>배포 시간은 약 10-30초 소요됩니다</li>
                </ul>
                <p className="mt-2 text-sm text-amber-600">
                  ⚠️ 프로덕션 환경인 경우 배포 전에 반드시 백업을 수행하세요.
                </p>
              </AlertDescription>
            </Alert>

            {/* Deployment Info */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">배포 정보</h4>
              <p className="text-sm text-muted-foreground">
                • 명령어: <code className="bg-background px-2 py-1 rounded">npm run db:push --force</code>
              </p>
              <p className="text-sm text-muted-foreground">
                • 스키마 파일: <code className="bg-background px-2 py-1 rounded">shared/schema.ts</code>
              </p>
              <p className="text-sm text-muted-foreground">
                • 배포 방식: Drizzle ORM Push (Upsert 모드)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSchemaDeployDialogOpen(false)}
              disabled={deployingSchema}
              data-testid="button-cancel-schema-deploy"
            >
              취소
            </Button>
            <Button 
              onClick={handleDeploySchema}
              disabled={deployingSchema}
              data-testid="button-confirm-schema-deploy"
            >
              {deployingSchema ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  배포 중...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  스키마 배포 시작
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

