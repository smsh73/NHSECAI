import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  RefreshCw,
  Database,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  MessageSquare,
  Settings,
  Activity,
  FileText,
  Sparkles,
  StopCircle,
  Eye,
  Info
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ===================================
// Types
// ===================================

interface ConnectionStatus {
  status: "connected" | "disconnected" | "error";
  endpoint?: string;
  indexName?: string;
  hasApiKey: boolean;
  hasEndpoint: boolean;
  lastChecked: string;
  error?: string;
  indexExists?: boolean;
  documentCount?: number;
}

interface EmbeddingSchema {
  id: string;
  name: string;
  description?: string;
  databricksCatalog?: string;
  databricksSchema?: string;
  databricksTable: string;
  databricksQuery?: string;
  embeddingModel: string;
  embeddingDimensions?: number;
  embeddingField?: string;
  searchIndexName: string;
  vectorFieldName?: string;
  contentFieldName?: string;
  metadataFields?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface EmbeddingStatus {
  id: string;
  schemaId: string;
  latestDataEmbeddedAt?: string;
  latestDataEmbeddedCount: number;
  historicalDataEmbeddingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  historicalDataTotalRecords: number;
  historicalDataEmbeddedRecords: number;
  historicalDataProgressPercentage: number;
  totalRecordsInSource: number;
  totalEmbeddedRecords: number;
  totalFailedRecords: number;
}

interface EmbeddingJob {
  id: string;
  schemaId: string;
  jobType: string;
  jobStatus: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  progressPercentage: number;
  startTime?: string;
  endTime?: string;
  errorMessage?: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  searchResults?: any[];
  createdAt: string;
}

// ===================================
// Main Component
// ===================================

export default function RAGManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isCreateSchemaDialogOpen, setIsCreateSchemaDialogOpen] = useState(false);
  const [isEditSchemaDialogOpen, setIsEditSchemaDialogOpen] = useState(false);
  const [isSchemaDetailDialogOpen, setIsSchemaDetailDialogOpen] = useState(false);
  const [isJobDetailDialogOpen, setIsJobDetailDialogOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<EmbeddingSchema | null>(null);
  const [selectedJob, setSelectedJob] = useState<EmbeddingJob | null>(null);
  
  // Form states
  const [schemaFormData, setSchemaFormData] = useState({
    name: "",
    description: "",
    databricksCatalog: "",
    databricksSchema: "",
    databricksTable: "",
    databricksQuery: "",
    embeddingModel: "text-embedding-3-large",
    embeddingDimensions: 3072,
    embeddingField: "",
    searchIndexName: "",
    vectorFieldName: "content_vector",
    contentFieldName: "content",
    metadataFields: [] as string[],
  });

  // Chat states
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showSessionList, setShowSessionList] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndexName, setSearchIndexName] = useState("");
  const [searchTopK, setSearchTopK] = useState(10);
  const [searchMode, setSearchMode] = useState<"vector" | "keyword" | "hybrid">("hybrid");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Metadata states
  const [metadataFilters, setMetadataFilters] = useState({
    schemaId: "",
    symbol: "",
    dateFrom: "",
    dateTo: "",
    category: "",
    tags: "",
  });

  // ===================================
  // Connection Status
  // ===================================
  const { data: connectionStatus, isLoading: connectionLoading, refetch: refetchConnection } = useQuery<{ success: boolean; status: ConnectionStatus }>({
    queryKey: ['/api/rag/connection/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/connection/status');
      if (!response.ok) throw new Error('Failed to fetch connection status');
      return await response.json();
    },
    refetchInterval: 30000, // 30초마다 갱신
  });

  const { data: connectionConfig } = useQuery<{ success: boolean; config: any; environmentVariables: any[] }>({
    queryKey: ['/api/rag/connection/config'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/connection/config');
      if (!response.ok) throw new Error('Failed to fetch connection config');
      return await response.json();
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/rag/connection/test');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Connection test failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "연결 테스트 성공" : "연결 테스트 실패",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      refetchConnection();
    },
    onError: (error: any) => {
      toast({
        title: "연결 테스트 실패",
        description: error.message || "연결 테스트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // ===================================
  // Embedding Schemas
  // ===================================
  const { data: schemasData, isLoading: schemasLoading, refetch: refetchSchemas } = useQuery<{ success: boolean; schemas: EmbeddingSchema[] }>({
    queryKey: ['/api/rag/embedding/schemas'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/embedding/schemas');
      if (!response.ok) throw new Error('Failed to fetch schemas');
      return await response.json();
    },
  });

  const schemas = schemasData?.schemas || [];

  // Schema statuses
  const schemaStatuses = useQuery<Record<string, EmbeddingStatus>>({
    queryKey: ['/api/rag/embedding/schemas/statuses'],
    queryFn: async () => {
      const statuses: Record<string, EmbeddingStatus> = {};
      for (const schema of schemas) {
        try {
          const response = await apiRequest('GET', `/api/rag/embedding/schemas/${schema.id}/status`);
          if (response.ok) {
            const data = await response.json();
            statuses[schema.id] = data.status;
          }
        } catch (error) {
          // Ignore errors for individual status fetches
        }
      }
      return statuses;
    },
    enabled: schemas.length > 0,
    refetchInterval: 10000, // 10초마다 갱신
  });

  const createSchemaMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/rag/embedding/schemas', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to create schema');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "스키마 생성 완료",
        description: "임베딩 스키마가 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/embedding/schemas'] });
      setIsCreateSchemaDialogOpen(false);
      setSchemaFormData({
        name: "",
        description: "",
        databricksCatalog: "",
        databricksSchema: "",
        databricksTable: "",
        databricksQuery: "",
        embeddingModel: "text-embedding-3-large",
        embeddingDimensions: 3072,
        embeddingField: "",
        searchIndexName: "",
        vectorFieldName: "content_vector",
        contentFieldName: "content",
        metadataFields: [],
      });
    },
    onError: (error: any) => {
      toast({
        title: "스키마 생성 실패",
        description: error.message || "스키마 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateSchemaMutation = useMutation({
    mutationFn: async (data: { schemaId: string; updates: any }) => {
      const response = await apiRequest('PUT', `/api/rag/embedding/schemas/${data.schemaId}`, data.updates);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to update schema');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "스키마 수정 완료",
        description: "임베딩 스키마가 성공적으로 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/embedding/schemas'] });
      setIsEditSchemaDialogOpen(false);
      setSelectedSchema(null);
    },
    onError: (error: any) => {
      toast({
        title: "스키마 수정 실패",
        description: error.message || "스키마 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteSchemaMutation = useMutation({
    mutationFn: async (schemaId: string) => {
      const response = await apiRequest('DELETE', `/api/rag/embedding/schemas/${schemaId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to delete schema');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "스키마 삭제 완료",
        description: "임베딩 스키마가 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/embedding/schemas'] });
    },
    onError: (error: any) => {
      toast({
        title: "스키마 삭제 실패",
        description: error.message || "스키마 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const startEmbeddingMutation = useMutation({
    mutationFn: async (data: { schemaId: string; jobType: string; batchSize?: number }) => {
      const response = await apiRequest('POST', `/api/rag/embedding/schemas/${data.schemaId}/embed`, {
        jobType: data.jobType,
        batchSize: data.batchSize || 1000,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to start embedding');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "임베딩 작업 시작",
        description: "임베딩 작업이 백그라운드에서 시작되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/embedding/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/embedding/schemas/statuses'] });
    },
    onError: (error: any) => {
      toast({
        title: "임베딩 작업 시작 실패",
        description: error.message || "임베딩 작업 시작 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // ===================================
  // Embedding Jobs
  // ===================================
  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery<{ success: boolean; jobs: EmbeddingJob[] }>({
    queryKey: ['/api/rag/embedding/jobs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/embedding/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return await response.json();
    },
    refetchInterval: 5000, // 5초마다 갱신
  });

  const jobs = jobsData?.jobs || [];

  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest('POST', `/api/rag/embedding/jobs/${jobId}/cancel`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to cancel job');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "작업 취소 완료",
        description: "임베딩 작업이 취소되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/embedding/jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: "작업 취소 실패",
        description: error.message || "작업 취소 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Schema detail query
  const { data: schemaDetail, isLoading: schemaDetailLoading } = useQuery<{ success: boolean; schema: EmbeddingSchema }>({
    queryKey: ['/api/rag/embedding/schemas', selectedSchema?.id],
    queryFn: async () => {
      if (!selectedSchema?.id) throw new Error('Schema ID is required');
      const response = await apiRequest('GET', `/api/rag/embedding/schemas/${selectedSchema.id}`);
      if (!response.ok) throw new Error('Failed to fetch schema detail');
      return await response.json();
    },
    enabled: !!selectedSchema?.id && isSchemaDetailDialogOpen,
  });

  // Job detail query
  const { data: jobDetail, isLoading: jobDetailLoading } = useQuery<{ success: boolean; job: EmbeddingJob }>({
    queryKey: ['/api/rag/embedding/jobs', selectedJob?.id],
    queryFn: async () => {
      if (!selectedJob?.id) throw new Error('Job ID is required');
      const response = await apiRequest('GET', `/api/rag/embedding/jobs/${selectedJob.id}`);
      if (!response.ok) throw new Error('Failed to fetch job detail');
      return await response.json();
    },
    enabled: !!selectedJob?.id && isJobDetailDialogOpen,
  });

  // Handlers
  const handleViewSchemaDetail = (schema: EmbeddingSchema) => {
    setSelectedSchema(schema);
    setIsSchemaDetailDialogOpen(true);
  };

  const handleViewJobDetail = (job: EmbeddingJob) => {
    setSelectedJob(job);
    setIsJobDetailDialogOpen(true);
  };

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (data: { query: string; indexName: string; topK: number; searchMode: string }) => {
      const response = await apiRequest('POST', '/api/rag/search', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to search');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      toast({
        title: "검색 완료",
        description: `${data.results?.length || 0}개의 결과를 찾았습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "검색 실패",
        description: error.message || "검색 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Metadata query
  const { data: metadataData, isLoading: metadataLoading, refetch: refetchMetadata } = useQuery<{ success: boolean; results: any[] }>({
    queryKey: ['/api/rag/metadata', metadataFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (metadataFilters.schemaId) params.append('schemaId', metadataFilters.schemaId);
      if (metadataFilters.symbol) params.append('symbol', metadataFilters.symbol);
      if (metadataFilters.dateFrom) params.append('dateFrom', metadataFilters.dateFrom);
      if (metadataFilters.dateTo) params.append('dateTo', metadataFilters.dateTo);
      if (metadataFilters.category) params.append('category', metadataFilters.category);
      if (metadataFilters.tags) params.append('tags', metadataFilters.tags);
      params.append('limit', '100');

      const response = await apiRequest('GET', `/api/rag/metadata?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      return await response.json();
    },
    enabled: false, // 수동으로 호출
  });

  const handleSearch = () => {
    if (!searchQuery || !searchIndexName) {
      toast({
        title: "검색 실패",
        description: "검색어와 인덱스 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    setIsSearching(true);
    searchMutation.mutate({
      query: searchQuery,
      indexName: searchIndexName,
      topK: searchTopK,
      searchMode: searchMode,
    });
    setIsSearching(false);
  };

  const handleMetadataSearch = () => {
    refetchMetadata();
  };

  // ===================================
  // Chat Sessions
  // ===================================
  const { data: chatSessionsData, refetch: refetchChatSessions } = useQuery<{ success: boolean; sessions: any[] }>({
    queryKey: ['/api/rag/chat/sessions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/chat/sessions');
      if (!response.ok) throw new Error('Failed to fetch chat sessions');
      return await response.json();
    },
    enabled: showSessionList,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('DELETE', `/api/rag/chat/sessions/${sessionId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to delete session');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "세션 삭제 완료",
        description: "챗봇 세션이 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/chat/sessions'] });
      if (chatSessionId) {
        setChatSessionId(null);
        setChatMessages([]);
      }
    },
    onError: (error: any) => {
      toast({
        title: "세션 삭제 실패",
        description: error.message || "세션 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const loadSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('GET', `/api/rag/chat/sessions/${sessionId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to load session');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setChatSessionId(data.session.id);
      setChatMessages(
        (data.messages || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          searchResults: msg.searchResults ? JSON.parse(msg.searchResults) : undefined,
          createdAt: msg.createdAt,
        }))
      );
      setShowSessionList(false);
      toast({
        title: "세션 로드 완료",
        description: "챗봇 세션이 로드되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "세션 로드 실패",
        description: error.message || "세션 로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // ===================================
  // Chat
  // ===================================
  const sendChatMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/rag/chat/messages', {
        sessionId: chatSessionId,
        message,
        searchIndexName: "default-index",
        maxSearchResults: 5,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to send message');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      if (!chatSessionId && data.sessionId) {
        setChatSessionId(data.sessionId);
      }
      
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content: chatInput,
          createdAt: new Date().toISOString(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message.content,
          searchResults: data.searchResults,
          createdAt: new Date().toISOString(),
        },
      ]);
      setChatInput("");
    },
    onError: (error: any) => {
      toast({
        title: "메시지 전송 실패",
        description: error.message || "메시지 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // ===================================
  // Handlers
  // ===================================
  const handleCreateSchema = () => {
    createSchemaMutation.mutate(schemaFormData);
  };

  const handleEditSchema = (schema: EmbeddingSchema) => {
    setSelectedSchema(schema);
    setSchemaFormData({
      name: schema.name,
      description: schema.description || "",
      databricksCatalog: schema.databricksCatalog || "",
      databricksSchema: schema.databricksSchema || "",
      databricksTable: schema.databricksTable,
      databricksQuery: schema.databricksQuery || "",
      embeddingModel: schema.embeddingModel,
      embeddingDimensions: schema.embeddingDimensions || 3072,
      embeddingField: schema.embeddingField || "",
      searchIndexName: schema.searchIndexName,
      vectorFieldName: schema.vectorFieldName || "content_vector",
      contentFieldName: schema.contentFieldName || "content",
      metadataFields: schema.metadataFields || [],
    });
    setIsEditSchemaDialogOpen(true);
  };

  const handleUpdateSchema = () => {
    if (!selectedSchema) return;
    updateSchemaMutation.mutate({
      schemaId: selectedSchema.id,
      updates: schemaFormData,
    });
  };

  const handleDeleteSchema = (schemaId: string) => {
    if (confirm("정말로 이 스키마를 삭제하시겠습니까?")) {
      deleteSchemaMutation.mutate(schemaId);
    }
  };

  const handleStartEmbedding = (schemaId: string, jobType: string) => {
    startEmbeddingMutation.mutate({ schemaId, jobType });
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;
    sendChatMessageMutation.mutate(chatInput);
  };

  // ===================================
  // Render
  // ===================================
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RAG 관리</h1>
          <p className="text-muted-foreground mt-2">
            AI Search 기반 RAG 시스템 관리 및 벡터 임베딩 관리
          </p>
        </div>
      </div>

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection">연결 관리</TabsTrigger>
          <TabsTrigger value="schemas">스키마 관리</TabsTrigger>
          <TabsTrigger value="jobs">임베딩 작업</TabsTrigger>
          <TabsTrigger value="search">RAG 검색</TabsTrigger>
          <TabsTrigger value="metadata">메타데이터</TabsTrigger>
          <TabsTrigger value="chat">RAG 챗봇</TabsTrigger>
        </TabsList>

        {/* 연결 관리 탭 */}
        <TabsContent value="connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                AI Search 연결 상태
              </CardTitle>
              <CardDescription>
                Azure AI Search 서비스 연결 상태를 확인하고 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : connectionStatus?.status ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {connectionStatus.status.status === "connected" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-semibold">
                        {connectionStatus.status.status === "connected" ? "연결됨" : "연결 안됨"}
                      </span>
                    </div>
                    <Button
                      onClick={() => testConnectionMutation.mutate()}
                      variant="outline"
                      size="sm"
                      disabled={testConnectionMutation.isPending}
                    >
                      {testConnectionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      연결 테스트
                    </Button>
                  </div>

                  {connectionStatus.status.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{connectionStatus.status.error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>엔드포인트</Label>
                      <p className="text-sm text-muted-foreground">
                        {connectionStatus.status.endpoint || "설정되지 않음"}
                      </p>
                    </div>
                    <div>
                      <Label>인덱스 이름</Label>
                      <p className="text-sm text-muted-foreground">
                        {connectionStatus.status.indexName || "설정되지 않음"}
                      </p>
                    </div>
                    <div>
                      <Label>문서 수</Label>
                      <p className="text-sm text-muted-foreground">
                        {connectionStatus.status.documentCount?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div>
                      <Label>마지막 확인</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(connectionStatus.status.lastChecked).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {connectionConfig?.environmentVariables && (
                    <div className="mt-4">
                      <Label>필요한 환경변수</Label>
                      <div className="mt-2 space-y-2">
                        {connectionConfig.environmentVariables.map((env: any) => (
                          <div key={env.name} className="flex items-center gap-2">
                            {env.isSet ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm font-mono">{env.name}</span>
                            {env.isRequired && (
                              <Badge variant="outline" className="text-xs">필수</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>연결 상태를 불러올 수 없습니다.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 스키마 관리 탭 */}
        <TabsContent value="schemas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    임베딩 스키마 목록
                  </CardTitle>
                  <CardDescription>
                    Databricks 데이터 소스의 벡터 임베딩 스키마를 관리합니다.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsCreateSchemaDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  스키마 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {schemasLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : schemas.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    등록된 스키마가 없습니다. 스키마를 추가해주세요.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>Databricks 테이블</TableHead>
                      <TableHead>검색 인덱스</TableHead>
                      <TableHead>임베딩 모델</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>진행률</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemas.map((schema) => {
                      const status = schemaStatuses.data?.[schema.id];
                      return (
                        <TableRow key={schema.id}>
                          <TableCell className="font-medium">{schema.name}</TableCell>
                          <TableCell>{schema.databricksTable}</TableCell>
                          <TableCell>{schema.searchIndexName}</TableCell>
                          <TableCell>{schema.embeddingModel}</TableCell>
                          <TableCell>
                            {schema.isActive ? (
                              <Badge variant="default">활성</Badge>
                            ) : (
                              <Badge variant="secondary">비활성</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {status ? (
                              <div className="space-y-1">
                                <Progress value={status.historicalDataProgressPercentage} className="w-24" />
                                <span className="text-xs text-muted-foreground">
                                  {status.historicalDataEmbeddedRecords} / {status.historicalDataTotalRecords}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewSchemaDetail(schema)}
                                title="상세 보기"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSchema(schema)}
                                disabled={updateSchemaMutation.isPending}
                                title="수정"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEmbedding(schema.id, "MANUAL")}
                                disabled={startEmbeddingMutation.isPending}
                                title="임베딩 시작"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSchema(schema.id)}
                                disabled={deleteSchemaMutation.isPending}
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 임베딩 작업 탭 */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                임베딩 작업 목록
              </CardTitle>
              <CardDescription>
                벡터 임베딩 작업의 진행 상황을 모니터링합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : jobs.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    실행 중인 작업이 없습니다.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>작업 ID</TableHead>
                      <TableHead>작업 유형</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>진행률</TableHead>
                      <TableHead>처리된 레코드</TableHead>
                      <TableHead>실패한 레코드</TableHead>
                      <TableHead>시작 시간</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">{job.id.substring(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.jobType}</Badge>
                        </TableCell>
                        <TableCell>
                          {job.jobStatus === "COMPLETED" ? (
                            <Badge variant="default">완료</Badge>
                          ) : job.jobStatus === "RUNNING" ? (
                            <Badge variant="default" className="bg-blue-500">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              실행 중
                            </Badge>
                          ) : job.jobStatus === "CANCELLED" ? (
                            <Badge variant="secondary">취소됨</Badge>
                          ) : job.jobStatus === "FAILED" ? (
                            <Badge variant="destructive">실패</Badge>
                          ) : (
                            <Badge variant="outline">대기 중</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={job.progressPercentage} className="w-32" />
                            <span className="text-xs text-muted-foreground">{job.progressPercentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{job.processedRecords.toLocaleString()}</TableCell>
                        <TableCell>{job.failedRecords.toLocaleString()}</TableCell>
                        <TableCell>
                          {job.startTime ? new Date(job.startTime).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewJobDetail(job)}
                              title="상세 보기"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(job.jobStatus === "RUNNING" || job.jobStatus === "PENDING") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("정말로 이 작업을 취소하시겠습니까?")) {
                                    cancelJobMutation.mutate(job.id);
                                  }
                                }}
                                disabled={cancelJobMutation.isPending}
                                title="작업 취소"
                              >
                                <StopCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RAG 검색 탭 */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                RAG 검색
              </CardTitle>
              <CardDescription>
                벡터 검색, 키워드 검색, 하이브리드 검색을 통해 RAG 데이터를 검색합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search-query">검색어 *</Label>
                  <Input
                    id="search-query"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="검색어를 입력하세요"
                  />
                </div>
                <div>
                  <Label htmlFor="search-index">인덱스 이름 *</Label>
                  <Input
                    id="search-index"
                    value={searchIndexName}
                    onChange={(e) => setSearchIndexName(e.target.value)}
                    placeholder="index-name"
                  />
                </div>
                <div>
                  <Label htmlFor="search-topk">결과 개수</Label>
                  <Input
                    id="search-topk"
                    type="number"
                    value={searchTopK}
                    onChange={(e) => setSearchTopK(parseInt(e.target.value) || 10)}
                    min={1}
                    max={100}
                  />
                </div>
                <div>
                  <Label htmlFor="search-mode">검색 모드</Label>
                  <Select value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vector">벡터 검색</SelectItem>
                      <SelectItem value="keyword">키워드 검색</SelectItem>
                      <SelectItem value="hybrid">하이브리드 검색</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending || !searchQuery || !searchIndexName}
                className="w-full"
              >
                {searchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    검색
                  </>
                )}
              </Button>

              {searchResults.length > 0 && (
                <div className="mt-4">
                  <Label>검색 결과 ({searchResults.length}개)</Label>
                  <ScrollArea className="h-[400px] mt-2">
                    <div className="space-y-2">
                      {searchResults.map((result, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              {result.score && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">점수: {result.score.toFixed(4)}</Badge>
                                </div>
                              )}
                              {result.content && (
                                <p className="text-sm">{result.content}</p>
                              )}
                              {result.metadata && (
                                <div className="text-xs text-muted-foreground">
                                  <pre>{JSON.stringify(result.metadata, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 메타데이터 조회 탭 */}
        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                메타데이터 조회
              </CardTitle>
              <CardDescription>
                CosmosDB에 저장된 메타데이터를 검색하고 조회합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="metadata-schema-id">스키마 ID</Label>
                  <Input
                    id="metadata-schema-id"
                    value={metadataFilters.schemaId}
                    onChange={(e) => setMetadataFilters({ ...metadataFilters, schemaId: e.target.value })}
                    placeholder="스키마 ID"
                  />
                </div>
                <div>
                  <Label htmlFor="metadata-symbol">심볼</Label>
                  <Input
                    id="metadata-symbol"
                    value={metadataFilters.symbol}
                    onChange={(e) => setMetadataFilters({ ...metadataFilters, symbol: e.target.value })}
                    placeholder="심볼 코드"
                  />
                </div>
                <div>
                  <Label htmlFor="metadata-date-from">시작 날짜</Label>
                  <Input
                    id="metadata-date-from"
                    type="date"
                    value={metadataFilters.dateFrom}
                    onChange={(e) => setMetadataFilters({ ...metadataFilters, dateFrom: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="metadata-date-to">종료 날짜</Label>
                  <Input
                    id="metadata-date-to"
                    type="date"
                    value={metadataFilters.dateTo}
                    onChange={(e) => setMetadataFilters({ ...metadataFilters, dateTo: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="metadata-category">카테고리</Label>
                  <Input
                    id="metadata-category"
                    value={metadataFilters.category}
                    onChange={(e) => setMetadataFilters({ ...metadataFilters, category: e.target.value })}
                    placeholder="카테고리"
                  />
                </div>
                <div>
                  <Label htmlFor="metadata-tags">태그 (쉼표로 구분)</Label>
                  <Input
                    id="metadata-tags"
                    value={metadataFilters.tags}
                    onChange={(e) => setMetadataFilters({ ...metadataFilters, tags: e.target.value })}
                    placeholder="tag1, tag2"
                  />
                </div>
              </div>
              <Button
                onClick={handleMetadataSearch}
                disabled={metadataLoading}
                className="w-full"
              >
                {metadataLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    검색
                  </>
                )}
              </Button>

              {metadataData?.results && metadataData.results.length > 0 && (
                <div className="mt-4">
                  <Label>검색 결과 ({metadataData.results.length}개)</Label>
                  <ScrollArea className="h-[400px] mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>스키마 ID</TableHead>
                          <TableHead>심볼</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead>날짜</TableHead>
                          <TableHead>태그</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metadataData.results.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">{item.id?.substring(0, 8)}...</TableCell>
                            <TableCell className="font-mono text-xs">{item.schemaId || "-"}</TableCell>
                            <TableCell>{item.symbol || "-"}</TableCell>
                            <TableCell>{item.category || "-"}</TableCell>
                            <TableCell>{item.date ? new Date(item.date).toLocaleDateString() : "-"}</TableCell>
                            <TableCell>
                              {item.tags && Array.isArray(item.tags) ? (
                                <div className="flex gap-1 flex-wrap">
                                  {item.tags.map((tag: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                                  ))}
                                </div>
                              ) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {metadataData?.results && metadataData.results.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>검색 결과가 없습니다.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RAG 챗봇 탭 */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    RAG 챗봇
                  </CardTitle>
                  <CardDescription>
                    RAG 검색을 통해 시황정보를 검색하고 AI로 답변을 받습니다.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSessionList(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    세션 목록
                  </Button>
                  {chatSessionId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("현재 세션을 종료하시겠습니까?")) {
                          setChatSessionId(null);
                          setChatMessages([]);
                        }
                      }}
                    >
                      새 세션
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col h-[600px]">
                <ScrollArea className="flex-1 mb-4 p-4 border rounded-lg">
                  {chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>메시지를 입력하여 RAG 검색을 시작하세요.</p>
                        <p className="text-sm mt-2">예: "삼성전자의 최근 거래량을 날짜별로 보여줘"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.searchResults && message.searchResults.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-xs opacity-75 mb-1">참조 자료 ({message.searchResults.length}건)</p>
                                {message.searchResults.slice(0, 3).map((result: any, idx: number) => (
                                  <div key={idx} className="text-xs opacity-75 mt-1">
                                    • {result.content?.substring(0, 100)}...
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                    placeholder="메시지를 입력하세요..."
                    disabled={sendChatMessageMutation.isPending}
                  />
                  <Button
                    onClick={handleSendChatMessage}
                    disabled={sendChatMessageMutation.isPending || !chatInput.trim()}
                  >
                    {sendChatMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 스키마 생성 다이얼로그 */}
      <Dialog open={isCreateSchemaDialogOpen} onOpenChange={setIsCreateSchemaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>스키마 생성</DialogTitle>
            <DialogDescription>
              새로운 벡터 임베딩 스키마를 생성합니다.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="schema-name">스키마 이름 *</Label>
                <Input
                  id="schema-name"
                  value={schemaFormData.name}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, name: e.target.value })}
                  placeholder="예: financial-data-schema"
                />
              </div>
              <div>
                <Label htmlFor="schema-description">설명</Label>
                <Textarea
                  id="schema-description"
                  value={schemaFormData.description}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, description: e.target.value })}
                  placeholder="스키마에 대한 설명"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="databricks-catalog">Databricks Catalog</Label>
                  <Input
                    id="databricks-catalog"
                    value={schemaFormData.databricksCatalog}
                    onChange={(e) => setSchemaFormData({ ...schemaFormData, databricksCatalog: e.target.value })}
                    placeholder="catalog"
                  />
                </div>
                <div>
                  <Label htmlFor="databricks-schema">Databricks Schema</Label>
                  <Input
                    id="databricks-schema"
                    value={schemaFormData.databricksSchema}
                    onChange={(e) => setSchemaFormData({ ...schemaFormData, databricksSchema: e.target.value })}
                    placeholder="schema"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="databricks-table">Databricks 테이블 *</Label>
                <Input
                  id="databricks-table"
                  value={schemaFormData.databricksTable}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, databricksTable: e.target.value })}
                  placeholder="table_name"
                />
              </div>
              <div>
                <Label htmlFor="search-index-name">검색 인덱스 이름 *</Label>
                <Input
                  id="search-index-name"
                  value={schemaFormData.searchIndexName}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, searchIndexName: e.target.value })}
                  placeholder="예: financial-index"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="embedding-model">임베딩 모델</Label>
                  <Select
                    value={schemaFormData.embeddingModel}
                    onValueChange={(value) => setSchemaFormData({ ...schemaFormData, embeddingModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                      <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                      <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="embedding-dimensions">임베딩 차원</Label>
                  <Input
                    id="embedding-dimensions"
                    type="number"
                    value={schemaFormData.embeddingDimensions}
                    onChange={(e) => setSchemaFormData({ ...schemaFormData, embeddingDimensions: parseInt(e.target.value) || 3072 })}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateSchemaDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleCreateSchema}
              disabled={createSchemaMutation.isPending || !schemaFormData.name || !schemaFormData.databricksTable || !schemaFormData.searchIndexName}
            >
              {createSchemaMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  생성 중...
                </>
              ) : (
                "생성"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 스키마 수정 다이얼로그 */}
      <Dialog open={isEditSchemaDialogOpen} onOpenChange={setIsEditSchemaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>스키마 수정</DialogTitle>
            <DialogDescription>
              벡터 임베딩 스키마를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-schema-name">스키마 이름 *</Label>
                <Input
                  id="edit-schema-name"
                  value={schemaFormData.name}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, name: e.target.value })}
                  placeholder="예: financial-data-schema"
                />
              </div>
              <div>
                <Label htmlFor="edit-schema-description">설명</Label>
                <Textarea
                  id="edit-schema-description"
                  value={schemaFormData.description}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, description: e.target.value })}
                  placeholder="스키마에 대한 설명"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-databricks-catalog">Databricks Catalog</Label>
                  <Input
                    id="edit-databricks-catalog"
                    value={schemaFormData.databricksCatalog}
                    onChange={(e) => setSchemaFormData({ ...schemaFormData, databricksCatalog: e.target.value })}
                    placeholder="catalog"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-databricks-schema">Databricks Schema</Label>
                  <Input
                    id="edit-databricks-schema"
                    value={schemaFormData.databricksSchema}
                    onChange={(e) => setSchemaFormData({ ...schemaFormData, databricksSchema: e.target.value })}
                    placeholder="schema"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-databricks-table">Databricks 테이블 *</Label>
                <Input
                  id="edit-databricks-table"
                  value={schemaFormData.databricksTable}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, databricksTable: e.target.value })}
                  placeholder="table_name"
                />
              </div>
              <div>
                <Label htmlFor="edit-databricks-query">Databricks 쿼리 (선택)</Label>
                <Textarea
                  id="edit-databricks-query"
                  value={schemaFormData.databricksQuery}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, databricksQuery: e.target.value })}
                  placeholder="SELECT * FROM table WHERE ..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-embedding-model">임베딩 모델</Label>
                  <Input
                    id="edit-embedding-model"
                    value={schemaFormData.embeddingModel}
                    onChange={(e) => setSchemaFormData({ ...schemaFormData, embeddingModel: e.target.value })}
                    placeholder="text-embedding-3-large"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-embedding-dimensions">임베딩 차원</Label>
                  <Input
                    id="edit-embedding-dimensions"
                    type="number"
                    value={schemaFormData.embeddingDimensions}
                    onChange={(e) => setSchemaFormData({ ...schemaFormData, embeddingDimensions: parseInt(e.target.value) || 3072 })}
                    placeholder="3072"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-embedding-field">임베딩 필드</Label>
                <Input
                  id="edit-embedding-field"
                  value={schemaFormData.embeddingField}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, embeddingField: e.target.value })}
                  placeholder="content"
                />
              </div>
              <div>
                <Label htmlFor="edit-search-index-name">AI Search 인덱스 이름 *</Label>
                <Input
                  id="edit-search-index-name"
                  value={schemaFormData.searchIndexName}
                  onChange={(e) => setSchemaFormData({ ...schemaFormData, searchIndexName: e.target.value })}
                  placeholder="index-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-vector-field-name">벡터 필드 이름</Label>
                  <Input
                    id="edit-vector-field-name"
                    value={schemaFormData.vectorFieldName}
                    onChange={(e) => setSchemaFormData({ ...schemaFormData, vectorFieldName: e.target.value })}
                    placeholder="content_vector"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-content-field-name">컨텐츠 필드 이름</Label>
                  <Input
                    id="edit-content-field-name"
                    value={schemaFormData.contentFieldName}
                    onChange={(e) => setSchemaFormData({ ...schemaFormData, contentFieldName: e.target.value })}
                    placeholder="content"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditSchemaDialogOpen(false);
                setSelectedSchema(null);
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleUpdateSchema}
              disabled={updateSchemaMutation.isPending || !schemaFormData.name || !schemaFormData.databricksTable || !schemaFormData.searchIndexName}
            >
              {updateSchemaMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  수정 중...
                </>
              ) : (
                "수정"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 스키마 상세 조회 다이얼로그 */}
      <Dialog open={isSchemaDetailDialogOpen} onOpenChange={setIsSchemaDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              스키마 상세 정보
            </DialogTitle>
            <DialogDescription>
              임베딩 스키마의 상세 정보를 확인합니다.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {schemaDetailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : schemaDetail?.schema ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">스키마 ID</Label>
                    <p className="text-sm text-muted-foreground font-mono">{schemaDetail.schema.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">이름</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.name}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold">설명</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.description || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Databricks Catalog</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.databricksCatalog || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Databricks Schema</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.databricksSchema || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Databricks Table</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.databricksTable}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Search Index Name</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.searchIndexName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Embedding Model</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.embeddingModel}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Embedding Dimensions</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.embeddingDimensions || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Embedding Field</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.embeddingField || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Vector Field Name</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.vectorFieldName || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Content Field Name</Label>
                    <p className="text-sm text-muted-foreground">{schemaDetail.schema.contentFieldName || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Metadata Fields</Label>
                    <p className="text-sm text-muted-foreground">
                      {schemaDetail.schema.metadataFields && schemaDetail.schema.metadataFields.length > 0
                        ? schemaDetail.schema.metadataFields.join(", ")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">상태</Label>
                    <p className="text-sm">
                      {schemaDetail.schema.isActive ? (
                        <Badge variant="default">활성</Badge>
                      ) : (
                        <Badge variant="secondary">비활성</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">생성 시간</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(schemaDetail.schema.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {schemaDetail.schema.updatedAt && (
                    <div>
                      <Label className="text-sm font-semibold">수정 시간</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(schemaDetail.schema.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {schemaDetail.schema.databricksQuery && (
                    <div className="col-span-2">
                      <Label className="text-sm font-semibold">Databricks Query</Label>
                      <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto">
                        {schemaDetail.schema.databricksQuery}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>스키마 정보를 불러올 수 없습니다.</AlertDescription>
              </Alert>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSchemaDetailDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 작업 상세 조회 다이얼로그 */}
      <Dialog open={isJobDetailDialogOpen} onOpenChange={setIsJobDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              작업 상세 정보
            </DialogTitle>
            <DialogDescription>
              임베딩 작업의 상세 정보를 확인합니다.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {jobDetailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : jobDetail?.job ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold">작업 ID</Label>
                    <p className="text-sm text-muted-foreground font-mono">{jobDetail.job.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">스키마 ID</Label>
                    <p className="text-sm text-muted-foreground font-mono">{jobDetail.job.schemaId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">작업 유형</Label>
                    <p className="text-sm">
                      <Badge variant="outline">{jobDetail.job.jobType}</Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">작업 상태</Label>
                    <p className="text-sm">
                      {jobDetail.job.jobStatus === "COMPLETED" ? (
                        <Badge variant="default">완료</Badge>
                      ) : jobDetail.job.jobStatus === "RUNNING" ? (
                        <Badge variant="default" className="bg-blue-500">
                          실행 중
                        </Badge>
                      ) : jobDetail.job.jobStatus === "CANCELLED" ? (
                        <Badge variant="secondary">취소됨</Badge>
                      ) : jobDetail.job.jobStatus === "FAILED" ? (
                        <Badge variant="destructive">실패</Badge>
                      ) : (
                        <Badge variant="outline">대기 중</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">전체 레코드 수</Label>
                    <p className="text-sm text-muted-foreground">{jobDetail.job.totalRecords.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">처리된 레코드 수</Label>
                    <p className="text-sm text-muted-foreground">{jobDetail.job.processedRecords.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">실패한 레코드 수</Label>
                    <p className="text-sm text-muted-foreground">{jobDetail.job.failedRecords.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">진행률</Label>
                    <div className="space-y-1">
                      <Progress value={jobDetail.job.progressPercentage} className="w-full" />
                      <p className="text-sm text-muted-foreground">{jobDetail.job.progressPercentage}%</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">시작 시간</Label>
                    <p className="text-sm text-muted-foreground">
                      {jobDetail.job.startTime ? new Date(jobDetail.job.startTime).toLocaleString() : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">종료 시간</Label>
                    <p className="text-sm text-muted-foreground">
                      {jobDetail.job.endTime ? new Date(jobDetail.job.endTime).toLocaleString() : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">생성 시간</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(jobDetail.job.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {jobDetail.job.errorMessage && (
                    <div className="col-span-2">
                      <Label className="text-sm font-semibold">에러 메시지</Label>
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{jobDetail.job.errorMessage}</AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>작업 정보를 불러올 수 없습니다.</AlertDescription>
              </Alert>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsJobDetailDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 챗봇 세션 목록 다이얼로그 */}
      <Dialog open={showSessionList} onOpenChange={setShowSessionList}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>챗봇 세션 목록</DialogTitle>
            <DialogDescription>
              저장된 챗봇 세션을 관리합니다.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            {chatSessionsData?.sessions && chatSessionsData.sessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>메시지 수</TableHead>
                    <TableHead>생성 시간</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chatSessionsData.sessions.map((session: any) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.title || `세션 ${session.id.substring(0, 8)}`}</TableCell>
                      <TableCell>{session.messageCount || 0}</TableCell>
                      <TableCell>
                        {new Date(session.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadSessionMutation.mutate(session.id)}
                            disabled={loadSessionMutation.isPending}
                          >
                            열기
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("정말로 이 세션을 삭제하시겠습니까?")) {
                                deleteSessionMutation.mutate(session.id);
                              }
                            }}
                            disabled={deleteSessionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                저장된 세션이 없습니다.
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessionList(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

