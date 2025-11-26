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
  Shield, 
  AlertTriangle, 
  Activity,
  FileText,
  Power,
  Search,
  RefreshCw,
  Download,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  Filter,
  Calendar
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ===================================
// Types
// ===================================

interface KillswitchStatus {
  isActive: boolean;
  activationReason?: string;
  activatedAt?: string;
  activatedBy?: string;
  affectedServices?: string[];
  affectedEndpoints?: string[];
}

interface GuardrailDetection {
  detected: boolean;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: string;
  message: string;
  details?: any;
}

interface AdversarialAttackEvent {
  id: string;
  attackType: string;
  attackSeverity: string;
  attackPattern?: string;
  detectionMethod?: string;
  detectionConfidence?: number;
  attemptedPrompt?: string;
  userId?: string;
  username?: string;
  userIp?: string;
  mitigationAction?: string;
  mitigationStatus?: string;
  detectedAt: string;
}

interface AttackStatistics {
  totalAttacks: number;
  attacksByType: Record<string, number>;
  attacksBySeverity: Record<string, number>;
  recentAttacks: AdversarialAttackEvent[];
  topAttackers: Array<{
    userId?: string;
    username?: string;
    userIp?: string;
    attackCount: number;
  }>;
}

interface TamperingDetection {
  id: string;
  documentId: string;
  schemaId?: string;
  detectionType: string;
  detectionSeverity: string;
  detectionDetails: any;
  expectedHash?: string;
  actualHash?: string;
  detectedAt: string;
  mitigationStatus?: string;
}

interface AnomalyDetection {
  id: string;
  documentId: string;
  schemaId?: string;
  anomalyType: string;
  anomalyScore: number;
  anomalyDescription?: string;
  detectedAt: string;
  verified?: boolean;
}

interface AuditLog {
  id: string;
  eventType: string;
  severity: string;
  action: string;
  userId?: string;
  username?: string;
  userIdentifier?: string;
  guardrailDetected: boolean;
  guardrailType?: string;
  createdAt: string;
}

interface BenchmarkTestResult {
  id: string;
  testName: string;
  testType: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  executedAt: string;
}

// ===================================
// Main Component
// ===================================

export default function RAGSecurityManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [isKillswitchDialogOpen, setIsKillswitchDialogOpen] = useState(false);
  const [isBenchmarkDialogOpen, setIsBenchmarkDialogOpen] = useState(false);
  const [killswitchAction, setKillswitchAction] = useState<"activate" | "deactivate">("activate");
  const [killswitchReason, setKillswitchReason] = useState("");
  const [selectedAffectedServices, setSelectedAffectedServices] = useState<string[]>([]);
  const [benchmarkTestName, setBenchmarkTestName] = useState("");
  const [benchmarkTestCases, setBenchmarkTestCases] = useState("");

  // Filter states
  const [attackTypeFilter, setAttackTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start?: string; end?: string }>({});

  // Guardrails test states
  const [guardrailTestPrompt, setGuardrailTestPrompt] = useState("");
  const [guardrailTestType, setGuardrailTestType] = useState<"input" | "output">("input");
  const [guardrailTestResult, setGuardrailTestResult] = useState<any>(null);

  // User audit log states
  const [userIdentifierFilter, setUserIdentifierFilter] = useState("");

  // Archive states
  const [archiveDateFrom, setArchiveDateFrom] = useState("");
  const [archiveDateTo, setArchiveDateTo] = useState("");

  // ===================================
  // Killswitch Status
  // ===================================
  const { data: killswitchStatus, isLoading: killswitchLoading, refetch: refetchKillswitch } = useQuery<{ success: boolean; status: KillswitchStatus }>({
    queryKey: ['/api/rag/security/killswitch/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/security/killswitch/status');
      if (!response.ok) throw new Error('Failed to fetch killswitch status');
      return await response.json();
    },
    refetchInterval: 5000, // 5초마다 갱신
  });

  const killswitchActivateMutation = useMutation({
    mutationFn: async (data: { reason: string; affectedServices?: string[]; affectedEndpoints?: string[] }) => {
      const response = await apiRequest('POST', '/api/rag/security/killswitch/activate', data);
      if (!response.ok) throw new Error('Failed to activate killswitch');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "성공", description: "킬스위치가 활성화되었습니다" });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/security/killswitch'] });
      setIsKillswitchDialogOpen(false);
      setKillswitchReason("");
    },
    onError: (error: any) => {
      toast({ title: "오류", description: error.message || "킬스위치 활성화 실패", variant: "destructive" });
    },
  });

  const killswitchDeactivateMutation = useMutation({
    mutationFn: async (data: { reason: string }) => {
      const response = await apiRequest('POST', '/api/rag/security/killswitch/deactivate', data);
      if (!response.ok) throw new Error('Failed to deactivate killswitch');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "성공", description: "킬스위치가 비활성화되었습니다" });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/security/killswitch'] });
      setIsKillswitchDialogOpen(false);
      setKillswitchReason("");
    },
    onError: (error: any) => {
      toast({ title: "오류", description: error.message || "킬스위치 비활성화 실패", variant: "destructive" });
    },
  });

  const { data: killswitchHistory, isLoading: killswitchHistoryLoading, refetch: refetchKillswitchHistory } = useQuery<{ success: boolean; history: any[] }>({
    queryKey: ['/api/rag/security/killswitch/history'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/security/killswitch/history?limit=50');
      if (!response.ok) throw new Error('Failed to fetch killswitch history');
      return await response.json();
    },
  });

  // ===================================
  // Adversarial Attack Events
  // ===================================
  const { data: attackEvents, isLoading: attackEventsLoading, refetch: refetchAttackEvents } = useQuery<{ success: boolean; events: AdversarialAttackEvent[] }>({
    queryKey: ['/api/rag/security/adversarial/events', attackTypeFilter, severityFilter, dateRangeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (attackTypeFilter !== "all") params.append("attackType", attackTypeFilter);
      if (severityFilter !== "all") params.append("attackSeverity", severityFilter);
      if (dateRangeFilter.start) params.append("startDate", dateRangeFilter.start);
      if (dateRangeFilter.end) params.append("endDate", dateRangeFilter.end);
      params.append("limit", "50");

      const response = await apiRequest('GET', `/api/rag/security/adversarial/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch attack events');
      return await response.json();
    },
    refetchInterval: 10000, // 10초마다 갱신
  });

  const { data: attackStatistics, isLoading: statisticsLoading } = useQuery<{ success: boolean } & AttackStatistics>({
    queryKey: ['/api/rag/security/adversarial/statistics', dateRangeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRangeFilter.start) params.append("startDate", dateRangeFilter.start);
      if (dateRangeFilter.end) params.append("endDate", dateRangeFilter.end);

      const response = await apiRequest('GET', `/api/rag/security/adversarial/statistics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch attack statistics');
      return await response.json();
    },
    refetchInterval: 30000, // 30초마다 갱신
  });

  // ===================================
  // Tampering Detection
  // ===================================
  const { data: tamperingDetections, isLoading: tamperingLoading, refetch: refetchTampering } = useQuery<{ success: boolean; detections: TamperingDetection[] }>({
    queryKey: ['/api/rag/security/tampering-detection/list'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/security/tampering-detection/list?limit=50');
      if (!response.ok) throw new Error('Failed to fetch tampering detections');
      return await response.json();
    },
    refetchInterval: 15000, // 15초마다 갱신
  });

  // ===================================
  // Anomaly Detection
  // ===================================
  const { data: anomalyDetections, isLoading: anomalyLoading, refetch: refetchAnomaly } = useQuery<{ success: boolean; detections: AnomalyDetection[] }>({
    queryKey: ['/api/rag/security/anomaly-detection/list'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/security/anomaly-detection/list?limit=50');
      if (!response.ok) throw new Error('Failed to fetch anomaly detections');
      return await response.json();
    },
    refetchInterval: 15000, // 15초마다 갱신
  });

  // ===================================
  // Audit Logs
  // ===================================
  const { data: guardrailLogs, isLoading: guardrailLogsLoading, refetch: refetchGuardrailLogs } = useQuery<{ success: boolean; logs: AuditLog[] }>({
    queryKey: ['/api/rag/security/audit-logs/guardrail'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/security/audit-logs/guardrail?limit=100');
      if (!response.ok) throw new Error('Failed to fetch guardrail logs');
      return await response.json();
    },
    refetchInterval: 10000, // 10초마다 갱신
  });

  const { data: auditLogStatistics, isLoading: auditLogStatisticsLoading, refetch: refetchAuditLogStatistics } = useQuery<{ success: boolean; totalLogs: number; logsByEventType: Record<string, number>; logsBySeverity: Record<string, number>; guardrailDetections: number; logsByUser: Record<string, number> }>({
    queryKey: ['/api/rag/security/audit-logs/statistics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/security/audit-logs/statistics');
      if (!response.ok) throw new Error('Failed to fetch audit log statistics');
      return await response.json();
    },
    refetchInterval: 30000, // 30초마다 갱신
  });

  // ===================================
  // Benchmark Tests
  // ===================================
  const { data: benchmarkResults, isLoading: benchmarkLoading, refetch: refetchBenchmark } = useQuery<{ success: boolean; results: BenchmarkTestResult[] }>({
    queryKey: ['/api/rag/security/benchmark/results'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/security/benchmark/results?limit=20');
      if (!response.ok) throw new Error('Failed to fetch benchmark results');
      return await response.json();
    },
  });

  const benchmarkRunMutation = useMutation({
    mutationFn: async (data: { testName: string; testType: string; testDescription?: string; testCases: any[] }) => {
      const response = await apiRequest('POST', '/api/rag/security/benchmark/run', data);
      if (!response.ok) throw new Error('Failed to run benchmark test');
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "성공", description: "벤치마크 테스트가 실행되었습니다" });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/security/benchmark'] });
      setIsBenchmarkDialogOpen(false);
      setBenchmarkTestName("");
      setBenchmarkTestCases("");
    },
    onError: (error: any) => {
      toast({ title: "오류", description: error.message || "벤치마크 테스트 실행 실패", variant: "destructive" });
    },
  });

  // ===================================
  // Handlers
  // ===================================
  const handleKillswitchAction = () => {
    if (!killswitchReason.trim()) {
      toast({ title: "오류", description: "사유를 입력해주세요", variant: "destructive" });
      return;
    }

    if (killswitchAction === "activate") {
      killswitchActivateMutation.mutate({
        reason: killswitchReason,
        affectedServices: selectedAffectedServices.length > 0 ? selectedAffectedServices : undefined,
      });
    } else {
      killswitchDeactivateMutation.mutate({ reason: killswitchReason });
    }
  };

  const handleRunBenchmark = () => {
    if (!benchmarkTestName.trim() || !benchmarkTestCases.trim()) {
      toast({ title: "오류", description: "테스트 이름과 테스트 케이스를 입력해주세요", variant: "destructive" });
      return;
    }

    try {
      const testCases = benchmarkTestCases.split('\n').filter(line => line.trim()).map((line, index) => ({
        name: `Test Case ${index + 1}`,
        prompt: line.trim(),
      }));

      benchmarkRunMutation.mutate({
        testName: benchmarkTestName,
        testType: "ADVERSARIAL",
        testDescription: "적대적 공격 벤치마크 테스트",
        testCases,
      });
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "테스트 케이스 파싱 실패", variant: "destructive" });
    }
  };

  // Guardrails validation mutation
  const guardrailValidationMutation = useMutation({
    mutationFn: async (data: { prompt: string; type: "input" | "output" }) => {
      const endpoint = data.type === "input" 
        ? "/api/rag/security/guardrails/input/validate"
        : "/api/rag/security/guardrails/output/validate";
      const response = await apiRequest('POST', endpoint, { prompt: data.prompt });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Validation failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setGuardrailTestResult(data);
      toast({
        title: "검증 완료",
        description: data.detected ? "문제가 감지되었습니다." : "검증 통과",
        variant: data.detected ? "destructive" : "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "검증 실패",
        description: error.message || "검증 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Attack patterns query
  const { data: attackPatterns, isLoading: attackPatternsLoading, refetch: refetchAttackPatterns } = useQuery<{ success: boolean; patterns: any[]; statistics: any }>({
    queryKey: ['/api/rag/security/adversarial/patterns', dateRangeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRangeFilter.start) params.append('startDate', dateRangeFilter.start);
      if (dateRangeFilter.end) params.append('endDate', dateRangeFilter.end);
      const response = await apiRequest('GET', `/api/rag/security/adversarial/patterns?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch attack patterns');
      return await response.json();
    },
  });

  // Version control history query
  const { data: versionHistory, isLoading: versionHistoryLoading, refetch: refetchVersionHistory } = useQuery<{ success: boolean; history: any[] }>({
    queryKey: ['/api/rag/security/version-control/history'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/security/version-control/history?limit=50');
      if (!response.ok) throw new Error('Failed to fetch version history');
      return await response.json();
    },
  });

  // Data processing logs query
  const { data: dataProcessingLogs, isLoading: dataProcessingLogsLoading, refetch: refetchDataProcessingLogs } = useQuery<{ success: boolean; logs: any[] }>({
    queryKey: ['/api/rag/security/data-processing/logs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rag/security/data-processing/logs?limit=100');
      if (!response.ok) throw new Error('Failed to fetch data processing logs');
      return await response.json();
    },
  });

  // User audit logs query
  const { data: userAuditLogs, isLoading: userAuditLogsLoading, refetch: refetchUserAuditLogs } = useQuery<{ success: boolean; logs: any[] }>({
    queryKey: ['/api/rag/security/audit-logs/user', userIdentifierFilter],
    queryFn: async () => {
      if (!userIdentifierFilter) return { success: true, logs: [] };
      const response = await apiRequest('GET', `/api/rag/security/audit-logs/user/${userIdentifierFilter}?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch user audit logs');
      return await response.json();
    },
    enabled: !!userIdentifierFilter,
  });

  // Archive logs query
  const { data: archiveLogs, isLoading: archiveLogsLoading, refetch: refetchArchiveLogs } = useQuery<{ success: boolean; logs: any[] }>({
    queryKey: ['/api/rag/security/audit-logs/archive', archiveDateFrom, archiveDateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (archiveDateFrom) params.append('dateFrom', archiveDateFrom);
      if (archiveDateTo) params.append('dateTo', archiveDateTo);
      params.append('limit', '100');
      const response = await apiRequest('GET', `/api/rag/security/audit-logs/archive?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch archive logs');
      return await response.json();
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (data: { dateFrom?: string; dateTo?: string }) => {
      const response = await apiRequest('POST', '/api/rag/security/audit-logs/archive', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Archive failed');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "아카이브 완료",
        description: "로그가 성공적으로 아카이브되었습니다.",
      });
      refetchArchiveLogs();
    },
    onError: (error: any) => {
      toast({
        title: "아카이브 실패",
        description: error.message || "아카이브 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleGuardrailTest = () => {
    if (!guardrailTestPrompt) {
      toast({
        title: "검증 실패",
        description: "프롬프트를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    guardrailValidationMutation.mutate({
      prompt: guardrailTestPrompt,
      type: guardrailTestType,
    });
  };

  const handleExportBenchmark = async (testId: string) => {
    try {
      const response = await apiRequest('GET', `/api/rag/security/benchmark/export?testId=${testId}`);
      if (!response.ok) throw new Error('Failed to export benchmark');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark-${testId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "성공", description: "벤치마크 결과가 내보내졌습니다" });
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "내보내기 실패", variant: "destructive" });
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      CRITICAL: "destructive",
      HIGH: "destructive",
      MEDIUM: "default",
      LOW: "secondary",
    };
    return <Badge variant={variants[severity] || "default"}>{severity}</Badge>;
  };

  // ===================================
  // Render
  // ===================================
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RAG 보안 관리</h1>
          <p className="text-muted-foreground mt-2">
            가드레일, 적대적 공격 모니터링, 형상관리 및 킬스위치 관리
          </p>
        </div>
      </div>

      <Tabs defaultValue="killswitch" className="space-y-4">
        <TabsList>
          <TabsTrigger value="killswitch">킬스위치</TabsTrigger>
          <TabsTrigger value="adversarial">적대적 공격 모니터링</TabsTrigger>
          <TabsTrigger value="patterns">공격 패턴 분석</TabsTrigger>
          <TabsTrigger value="guardrails">프롬프트 검증</TabsTrigger>
          <TabsTrigger value="tampering">위변조 탐지</TabsTrigger>
          <TabsTrigger value="anomaly">이상치 탐지</TabsTrigger>
          <TabsTrigger value="version">버전 이력</TabsTrigger>
          <TabsTrigger value="data-processing">데이터 가공 로그</TabsTrigger>
          <TabsTrigger value="audit">감사 로그</TabsTrigger>
          <TabsTrigger value="user-audit">사용자별 로그</TabsTrigger>
          <TabsTrigger value="archive">로그 아카이브</TabsTrigger>
          <TabsTrigger value="benchmark">벤치마크 테스트</TabsTrigger>
        </TabsList>

        {/* 킬스위치 탭 */}
        <TabsContent value="killswitch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="w-5 h-5" />
                킬스위치 상태
              </CardTitle>
              <CardDescription>
                시스템 긴급 중단 기능 관리
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {killswitchLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : killswitchStatus?.status ? (
                <>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {killswitchStatus.status.isActive ? (
                        <XCircle className="w-8 h-8 text-destructive" />
                      ) : (
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      )}
                      <div>
                        <p className="font-semibold">
                          {killswitchStatus.status.isActive ? "활성화됨" : "비활성화됨"}
                        </p>
                        {killswitchStatus.status.activationReason && (
                          <p className="text-sm text-muted-foreground">
                            사유: {killswitchStatus.status.activationReason}
                          </p>
                        )}
                        {killswitchStatus.status.activatedAt && (
                          <p className="text-sm text-muted-foreground">
                            활성화 시간: {new Date(killswitchStatus.status.activatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={killswitchStatus.status.isActive ? "default" : "destructive"}
                      onClick={() => {
                        setKillswitchAction(killswitchStatus.status.isActive ? "deactivate" : "activate");
                        setIsKillswitchDialogOpen(true);
                      }}
                    >
                      {killswitchStatus.status.isActive ? "비활성화" : "활성화"}
                    </Button>
                  </div>

                  {killswitchStatus.status.isActive && (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        킬스위치가 활성화되어 있습니다. RAG 서비스가 차단되었습니다.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>킬스위치 상태를 불러올 수 없습니다</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  킬스위치 이력
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchKillswitchHistory()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {killswitchHistoryLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : killswitchHistory?.history && killswitchHistory.history.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>상태</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead>활성화 시간</TableHead>
                        <TableHead>활성화자</TableHead>
                        <TableHead>비활성화 시간</TableHead>
                        <TableHead>비활성화자</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {killswitchHistory.history.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.isActive ? (
                              <Badge variant="destructive">활성화됨</Badge>
                            ) : (
                              <Badge variant="default">비활성화됨</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {item.activationReason || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.activatedAt ? new Date(item.activatedAt).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>{item.activatedByUsername || item.activatedBy || "-"}</TableCell>
                          <TableCell className="text-sm">
                            {item.deactivatedAt ? new Date(item.deactivatedAt).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>{item.deactivatedByUsername || item.deactivatedBy || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  킬스위치 이력이 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 적대적 공격 모니터링 탭 */}
        <TabsContent value="adversarial" className="space-y-4">
          <div className="flex items-center justify-between">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  공격 통계
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statisticsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : attackStatistics ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">총 공격 수</p>
                      <p className="text-2xl font-bold">{attackStatistics.totalAttacks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CRITICAL</p>
                      <p className="text-2xl font-bold text-destructive">
                        {attackStatistics.attacksBySeverity.CRITICAL || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">HIGH</p>
                      <p className="text-2xl font-bold text-orange-500">
                        {attackStatistics.attacksBySeverity.HIGH || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">MEDIUM</p>
                      <p className="text-2xl font-bold">
                        {attackStatistics.attacksBySeverity.MEDIUM || 0}
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  공격 이벤트
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={attackTypeFilter} onValueChange={setAttackTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="공격 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="PROMPT_INJECTION">프롬프트 인젝션</SelectItem>
                      <SelectItem value="JAILBREAK">Jailbreak</SelectItem>
                      <SelectItem value="DATA_POISONING">데이터 포이즈닝</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="심각도" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="LOW">LOW</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => refetchAttackEvents()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {attackEventsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : attackEvents?.events && attackEvents.events.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>공격 유형</TableHead>
                        <TableHead>심각도</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>대응 상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attackEvents.events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-sm">
                            {new Date(event.detectedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>{event.attackType}</TableCell>
                          <TableCell>{getSeverityBadge(event.attackSeverity)}</TableCell>
                          <TableCell>{event.username || event.userId || "-"}</TableCell>
                          <TableCell className="text-sm">{event.userIp || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={event.mitigationStatus === "COMPLETED" ? "default" : "secondary"}>
                              {event.mitigationStatus || "PENDING"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  공격 이벤트가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 공격 패턴 분석 탭 */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  공격 패턴 분석
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchAttackPatterns()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                적대적 공격의 패턴을 분석하고 통계를 확인합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attackPatternsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : attackPatterns?.patterns ? (
                <div className="space-y-4">
                  {attackPatterns.patterns.length > 0 ? (
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>패턴</TableHead>
                            <TableHead>빈도</TableHead>
                            <TableHead>심각도</TableHead>
                            <TableHead>최근 발생</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attackPatterns.patterns.map((pattern: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">{pattern.pattern || "-"}</TableCell>
                              <TableCell>{pattern.frequency || 0}</TableCell>
                              <TableCell>{getSeverityBadge(pattern.severity || "MEDIUM")}</TableCell>
                              <TableCell className="text-sm">
                                {pattern.lastOccurred ? new Date(pattern.lastOccurred).toLocaleString() : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      공격 패턴이 없습니다
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>공격 패턴을 불러올 수 없습니다.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 프롬프트 검증 탭 */}
        <TabsContent value="guardrails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                프롬프트 검증 테스트
              </CardTitle>
              <CardDescription>
                입력/출력 프롬프트의 가드레일 검증을 테스트합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guardrail-type">검증 유형</Label>
                  <Select value={guardrailTestType} onValueChange={(value: any) => setGuardrailTestType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="input">입력 프롬프트</SelectItem>
                      <SelectItem value="output">출력 프롬프트</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="guardrail-prompt">프롬프트 *</Label>
                  <Textarea
                    id="guardrail-prompt"
                    value={guardrailTestPrompt}
                    onChange={(e) => setGuardrailTestPrompt(e.target.value)}
                    placeholder="검증할 프롬프트를 입력하세요"
                    rows={4}
                  />
                </div>
              </div>
              <Button
                onClick={handleGuardrailTest}
                disabled={guardrailValidationMutation.isPending || !guardrailTestPrompt}
                className="w-full"
              >
                {guardrailValidationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    검증 중...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    검증 실행
                  </>
                )}
              </Button>

              {guardrailTestResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">검증 결과</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold">감지 여부:</Label>
                        {guardrailTestResult.detected ? (
                          <Badge variant="destructive">감지됨</Badge>
                        ) : (
                          <Badge variant="default">통과</Badge>
                        )}
                      </div>
                      {guardrailTestResult.severity && (
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold">심각도:</Label>
                          {getSeverityBadge(guardrailTestResult.severity)}
                        </div>
                      )}
                      {guardrailTestResult.type && (
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold">유형:</Label>
                          <span className="text-sm">{guardrailTestResult.type}</span>
                        </div>
                      )}
                      {guardrailTestResult.message && (
                        <div>
                          <Label className="text-sm font-semibold">메시지:</Label>
                          <p className="text-sm text-muted-foreground">{guardrailTestResult.message}</p>
                        </div>
                      )}
                      {guardrailTestResult.sanitizedInput && (
                        <div>
                          <Label className="text-sm font-semibold">정제된 입력:</Label>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                            {guardrailTestResult.sanitizedInput}
                          </pre>
                        </div>
                      )}
                      {guardrailTestResult.sanitizedOutput && (
                        <div>
                          <Label className="text-sm font-semibold">정제된 출력:</Label>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                            {guardrailTestResult.sanitizedOutput}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 위변조 탐지 탭 */}
        <TabsContent value="tampering" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  위변조 탐지 목록
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchTampering()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tamperingLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : tamperingDetections?.detections && tamperingDetections.detections.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>문서 ID</TableHead>
                        <TableHead>탐지 유형</TableHead>
                        <TableHead>심각도</TableHead>
                        <TableHead>대응 상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tamperingDetections.detections.map((detection) => (
                        <TableRow key={detection.id}>
                          <TableCell className="text-sm">
                            {new Date(detection.detectedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{detection.documentId}</TableCell>
                          <TableCell>{detection.detectionType}</TableCell>
                          <TableCell>{getSeverityBadge(detection.detectionSeverity)}</TableCell>
                          <TableCell>
                            <Badge variant={detection.mitigationStatus === "COMPLETED" ? "default" : "secondary"}>
                              {detection.mitigationStatus || "PENDING"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  위변조 탐지가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 이상치 탐지 탭 */}
        <TabsContent value="anomaly" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  이상치 탐지 목록
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchAnomaly()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {anomalyLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : anomalyDetections?.detections && anomalyDetections.detections.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>문서 ID</TableHead>
                        <TableHead>이상치 유형</TableHead>
                        <TableHead>점수</TableHead>
                        <TableHead>검증</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anomalyDetections.detections.map((detection) => (
                        <TableRow key={detection.id}>
                          <TableCell className="text-sm">
                            {new Date(detection.detectedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{detection.documentId}</TableCell>
                          <TableCell>{detection.anomalyType}</TableCell>
                          <TableCell>
                            <Badge variant={detection.anomalyScore > 0.7 ? "destructive" : detection.anomalyScore > 0.5 ? "default" : "secondary"}>
                              {(detection.anomalyScore * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {detection.verified ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  이상치 탐지가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 버전 이력 탭 */}
        <TabsContent value="version" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  버전 이력
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchVersionHistory()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                RAG 참조 데이터의 버전 이력을 조회합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versionHistoryLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : versionHistory?.history && versionHistory.history.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>문서 ID</TableHead>
                        <TableHead>버전</TableHead>
                        <TableHead>해시</TableHead>
                        <TableHead>이전 해시</TableHead>
                        <TableHead>생성 시간</TableHead>
                        <TableHead>생성자</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versionHistory.history.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.documentId || "-"}</TableCell>
                          <TableCell>{item.version || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{item.versionHash?.substring(0, 16) || "-"}...</TableCell>
                          <TableCell className="font-mono text-xs">{item.previousVersionHash?.substring(0, 16) || "-"}...</TableCell>
                          <TableCell className="text-sm">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>{item.createdBy || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  버전 이력이 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 데이터 가공 처리 로그 탭 */}
        <TabsContent value="data-processing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  데이터 가공 처리 로그
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchDataProcessingLogs()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                데이터 가공 처리 로그를 조회합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataProcessingLogsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : dataProcessingLogs?.logs && dataProcessingLogs.logs.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>문서 ID</TableHead>
                        <TableHead>처리 유형</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>처리자</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataProcessingLogs.logs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {log.processedAt ? new Date(log.processedAt).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.documentId || "-"}</TableCell>
                          <TableCell>{log.processingType || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "SUCCESS" ? "default" : "destructive"}>
                              {log.status || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.processedBy || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  데이터 가공 처리 로그가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 감사 로그 탭 */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  감사 로그 통계
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchAuditLogStatistics()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogStatisticsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : auditLogStatistics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">총 로그 수</p>
                    <p className="text-2xl font-bold">{auditLogStatistics.totalLogs}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">가드레일 탐지</p>
                    <p className="text-2xl font-bold text-destructive">
                      {auditLogStatistics.guardrailDetections}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CRITICAL</p>
                    <p className="text-2xl font-bold text-destructive">
                      {auditLogStatistics.logsBySeverity.CRITICAL || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">HIGH</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {auditLogStatistics.logsBySeverity.HIGH || 0}
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  가드레일 탐지 로그
                </CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchGuardrailLogs()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {guardrailLogsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : guardrailLogs?.logs && guardrailLogs.logs.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>이벤트 유형</TableHead>
                        <TableHead>액션</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>가드레일 유형</TableHead>
                        <TableHead>심각도</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {guardrailLogs.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>{log.eventType}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.userIdentifier || log.username || log.userId || "-"}</TableCell>
                          <TableCell>{log.guardrailType || "-"}</TableCell>
                          <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  가드레일 탐지 로그가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 사용자별 감사 로그 탭 */}
        <TabsContent value="user-audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                사용자별 감사 로그
              </CardTitle>
              <CardDescription>
                특정 사용자의 감사 로그를 조회합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="사용자 ID 또는 사용자명 입력"
                  value={userIdentifierFilter}
                  onChange={(e) => setUserIdentifierFilter(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => refetchUserAuditLogs()}
                  disabled={!userIdentifierFilter || userAuditLogsLoading}
                >
                  {userAuditLogsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {userAuditLogsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : userAuditLogs?.logs && userAuditLogs.logs.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>이벤트 유형</TableHead>
                        <TableHead>심각도</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>가드레일 탐지</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userAuditLogs.logs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>{log.eventType || "-"}</TableCell>
                          <TableCell>{getSeverityBadge(log.severity || "LOW")}</TableCell>
                          <TableCell>{log.userIdentifier || log.userId || "-"}</TableCell>
                          <TableCell className="text-sm">{log.userIp || "-"}</TableCell>
                          <TableCell>
                            {log.guardrailDetected ? (
                              <Badge variant="destructive">예</Badge>
                            ) : (
                              <Badge variant="secondary">아니오</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : userIdentifierFilter ? (
                <div className="text-center p-8 text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>사용자 ID 또는 사용자명을 입력해주세요.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 로그 아카이브 탭 */}
        <TabsContent value="archive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                로그 아카이브 관리
              </CardTitle>
              <CardDescription>
                오래된 로그를 아카이브하고 아카이브된 로그를 조회합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="archive-date-from">시작 날짜</Label>
                  <Input
                    id="archive-date-from"
                    type="date"
                    value={archiveDateFrom}
                    onChange={(e) => setArchiveDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="archive-date-to">종료 날짜</Label>
                  <Input
                    id="archive-date-to"
                    type="date"
                    value={archiveDateTo}
                    onChange={(e) => setArchiveDateTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!archiveDateFrom || !archiveDateTo) {
                      toast({
                        title: "오류",
                        description: "시작 날짜와 종료 날짜를 입력해주세요.",
                        variant: "destructive",
                      });
                      return;
                    }
                    archiveMutation.mutate({
                      dateFrom: archiveDateFrom,
                      dateTo: archiveDateTo,
                    });
                  }}
                  disabled={archiveMutation.isPending || !archiveDateFrom || !archiveDateTo}
                >
                  {archiveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      아카이브 중...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      아카이브 실행
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => refetchArchiveLogs()}
                  disabled={archiveLogsLoading}
                >
                  {archiveLogsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {archiveLogsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : archiveLogs?.logs && archiveLogs.logs.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>아카이브 ID</TableHead>
                        <TableHead>시작 날짜</TableHead>
                        <TableHead>종료 날짜</TableHead>
                        <TableHead>로그 수</TableHead>
                        <TableHead>아카이브 시간</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archiveLogs.logs.map((archive: any) => (
                        <TableRow key={archive.id}>
                          <TableCell className="font-mono text-xs">{archive.id?.substring(0, 8)}...</TableCell>
                          <TableCell className="text-sm">
                            {archive.dateFrom ? new Date(archive.dateFrom).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {archive.dateTo ? new Date(archive.dateTo).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>{archive.logCount || 0}</TableCell>
                          <TableCell className="text-sm">
                            {archive.archivedAt ? new Date(archive.archivedAt).toLocaleString() : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  아카이브된 로그가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 벤치마크 테스트 탭 */}
        <TabsContent value="benchmark" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  벤치마크 테스트
                </CardTitle>
                <Button onClick={() => setIsBenchmarkDialogOpen(true)}>
                  <Play className="w-4 h-4 mr-2" />
                  테스트 실행
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {benchmarkLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : benchmarkResults?.results && benchmarkResults.results.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>테스트 이름</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>실행 시간</TableHead>
                        <TableHead>통과율</TableHead>
                        <TableHead>결과</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {benchmarkResults.results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>{result.testName}</TableCell>
                          <TableCell>{result.testType}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(result.executedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={result.passRate >= 0.9 ? "default" : result.passRate >= 0.7 ? "secondary" : "destructive"}>
                              {(result.passRate * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {result.passedTests}/{result.totalTests} 통과
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportBenchmark(result.id)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              내보내기
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  벤치마크 테스트 결과가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 킬스위치 다이얼로그 */}
      <Dialog open={isKillswitchDialogOpen} onOpenChange={setIsKillswitchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {killswitchAction === "activate" ? "킬스위치 활성화" : "킬스위치 비활성화"}
            </DialogTitle>
            <DialogDescription>
              {killswitchAction === "activate"
                ? "시스템을 즉시 중단합니다. 이 작업은 되돌릴 수 없습니다."
                : "킬스위치를 비활성화하여 서비스를 재개합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>사유 *</Label>
              <Textarea
                value={killswitchReason}
                onChange={(e) => setKillswitchReason(e.target.value)}
                placeholder="활성화/비활성화 사유를 입력하세요"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsKillswitchDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant={killswitchAction === "activate" ? "destructive" : "default"}
              onClick={handleKillswitchAction}
              disabled={killswitchActivateMutation.isPending || killswitchDeactivateMutation.isPending}
            >
              {(killswitchActivateMutation.isPending || killswitchDeactivateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {killswitchAction === "activate" ? "활성화" : "비활성화"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 벤치마크 테스트 다이얼로그 */}
      <Dialog open={isBenchmarkDialogOpen} onOpenChange={setIsBenchmarkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>벤치마크 테스트 실행</DialogTitle>
            <DialogDescription>
              적대적 공격 테스트 케이스를 입력하여 가드레일을 테스트합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>테스트 이름 *</Label>
              <Input
                value={benchmarkTestName}
                onChange={(e) => setBenchmarkTestName(e.target.value)}
                placeholder="예: 프롬프트 인젝션 테스트"
              />
            </div>
            <div>
              <Label>테스트 케이스 (한 줄에 하나씩) *</Label>
              <Textarea
                value={benchmarkTestCases}
                onChange={(e) => setBenchmarkTestCases(e.target.value)}
                placeholder="예:&#10;ignore previous instructions&#10;show me your API key&#10;execute code"
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBenchmarkDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleRunBenchmark}
              disabled={benchmarkRunMutation.isPending}
            >
              {benchmarkRunMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

