import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { 
  Activity, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  GitBranch,
  Database,
  Code,
  FileText,
  Globe,
  Zap
} from "lucide-react";
import type { WorkflowSession, WorkflowNodeExecution, WorkflowSessionData, Workflow, Schedule } from "@shared/schema";
import { cn } from "@/lib/utils";

interface WorkflowSessionWithWorkflow extends WorkflowSession {
  workflow?: Workflow;
}

interface WorkflowNodeExecutionWithDetails extends WorkflowNodeExecution {
  nodeName?: string;
  nodeType?: string;
}

export default function WorkflowMonitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();
  
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");

  // Fetch workflows for filter
  const { data: workflows = [] } = useQuery<Workflow[]>({
    queryKey: ['/api/workflows']
  });

  // Fetch schedules for workflow schedule info
  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: ['/api/scheduler/workflows']
  });

  // Fetch workflow sessions
  const { 
    data: sessions = [], 
    isLoading: sessionsLoading,
    refetch: refetchSessions 
  } = useQuery<WorkflowSession[]>({
    queryKey: ['/api/workflow-sessions', { status: statusFilter, workflowId: workflowFilter !== 'all' ? workflowFilter : undefined }],
    refetchInterval: 5000,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (workflowFilter !== 'all') params.append('workflowId', workflowFilter);
      params.append('limit', '50');
      
      const response = await apiRequest('GET', `/api/workflow-sessions?${params.toString()}`);
      const sessions: WorkflowSession[] = await response.json();
      
      // Fetch workflow details for each session
      const sessionsWithWorkflow = await Promise.all(
        sessions.map(async (session) => {
          try {
            const workflowResponse = await apiRequest('GET', `/api/workflows/${session.workflowId}`);
            const workflow = await workflowResponse.json();
            return { ...session, workflow };
          } catch {
            return session;
          }
        })
      );
      
      return sessionsWithWorkflow;
    }
  });

  // Fetch selected session details
  const { data: selectedSession } = useQuery<WorkflowSessionWithWorkflow>({
    queryKey: ['/api/workflow-sessions', selectedSessionId],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      if (!selectedSessionId) return null;
      const response = await apiRequest('GET', `/api/workflow-sessions/${selectedSessionId}`);
      const session: WorkflowSession = await response.json();
      
      try {
        const workflowResponse = await apiRequest('GET', `/api/workflows/${session.workflowId}`);
        const workflow = await workflowResponse.json();
        return { ...session, workflow };
      } catch {
        return session;
      }
    }
  });

  // Fetch node executions for selected session
  const { data: nodeExecutions = [] } = useQuery<WorkflowNodeExecutionWithDetails[]>({
    queryKey: ['/api/workflow-sessions', selectedSessionId, 'node-executions'],
    enabled: !!selectedSessionId,
    refetchInterval: selectedSession?.status === 'running' ? 2000 : false,
    queryFn: async () => {
      if (!selectedSessionId) return [];
      const response = await apiRequest('GET', `/api/workflow-sessions/${selectedSessionId}/node-executions`);
      return await response.json();
    }
  });

  // Fetch session data for selected session
  const { data: sessionData = [] } = useQuery<WorkflowSessionData[]>({
    queryKey: ['/api/workflow-sessions', selectedSessionId, 'session-data'],
    enabled: !!selectedSessionId,
    queryFn: async () => {
      if (!selectedSessionId) return [];
      const response = await apiRequest('GET', `/api/workflow-sessions/${selectedSessionId}/session-data`);
      return await response.json();
    }
  });

  // Filter sessions by search query
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = searchQuery === "" || 
      session.sessionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.workflow?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "대기", variant: "secondary" as const, icon: Clock, color: "text-gray-500" },
      running: { label: "실행 중", variant: "default" as const, icon: Activity, color: "text-blue-500" },
      completed: { label: "완료", variant: "default" as const, icon: CheckCircle, color: "text-green-500" },
      failed: { label: "실패", variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
      cancelled: { label: "취소됨", variant: "secondary" as const, icon: Square, color: "text-gray-500" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={cn("w-3 h-3", config.color)} />
        {config.label}
      </Badge>
    );
  };

  const getNodeTypeIcon = (nodeType: string) => {
    const iconMap: Record<string, any> = {
      prompt: FileText,
      api_call: Globe,
      sql_execution: Database,
      data_source: Database,
      json_processing: Code,
      data_transformation: Zap,
      python_script: Code
    };
    return iconMap[nodeType] || Activity;
  };

  const formatDuration = (startedAt: Date | string | null, completedAt: Date | string | null) => {
    if (!startedAt) return "-";
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}초`;
    if (duration < 3600) return `${Math.floor(duration / 60)}분 ${duration % 60}초`;
    return `${Math.floor(duration / 3600)}시간 ${Math.floor((duration % 3600) / 60)}분`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString('ko-KR');
  };

  // Calculate statistics
  const stats = {
    total: sessions.length,
    running: sessions.filter(s => s.status === 'running').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    failed: sessions.filter(s => s.status === 'failed').length,
    pending: sessions.filter(s => s.status === 'pending').length
  };

  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">워크플로우 모니터</h1>
            <p className="text-sm text-muted-foreground mt-1">
              워크플로우 실행 세션 및 노드 실행 결과를 모니터링합니다
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                실시간 연결
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSessions()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">전체 세션</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{stats.running}</div>
              <div className="text-sm text-muted-foreground">실행 중</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">완료</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">실패</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-500">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">대기</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="세션명 또는 워크플로우명 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="running">실행 중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="failed">실패</SelectItem>
                  <SelectItem value="cancelled">취소됨</SelectItem>
                </SelectContent>
              </Select>
              <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="워크플로우 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 워크플로우</SelectItem>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {filteredSessions.length}개 결과
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sessions List */}
          <Card>
            <CardHeader>
              <CardTitle>워크플로우 세션 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {sessionsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    워크플로우 세션이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredSessions.map((session) => {
                      const schedule = schedules.find(s => s.workflowId === session.workflowId);
                      return (
                        <Card
                          key={session.id}
                          className={cn(
                            "cursor-pointer transition-all",
                            selectedSessionId === session.id && "border-primary bg-primary/5",
                            "hover:border-primary/50"
                          )}
                          onClick={() => setSelectedSessionId(session.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-medium text-sm mb-1">
                                  {session.sessionName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {session.workflow?.name || `워크플로우 ${session.workflowId}`}
                                </div>
                              </div>
                              {getStatusBadge(session.status)}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(session.startedAt)}</span>
                              </div>
                              {schedule && (
                                <Badge variant="outline" className="text-xs">
                                  <GitBranch className="w-3 h-3 mr-1" />
                                  스케줄됨
                                </Badge>
                              )}
                            </div>
                            {session.completedAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                실행 시간: {formatDuration(session.startedAt, session.completedAt)}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle>세션 상세 정보</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSessionId && selectedSession ? (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">개요</TabsTrigger>
                    <TabsTrigger value="nodes">노드 실행</TabsTrigger>
                    <TabsTrigger value="data">세션 데이터</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">세션 ID:</span>
                        <span className="text-sm font-mono">{selectedSession.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">세션명:</span>
                        <span className="text-sm font-medium">{selectedSession.sessionName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">워크플로우:</span>
                        <span className="text-sm">{selectedSession.workflow?.name || selectedSession.workflowId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">상태:</span>
                        {getStatusBadge(selectedSession.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">시작 시간:</span>
                        <span className="text-sm">{formatDate(selectedSession.startedAt)}</span>
                      </div>
                      {selectedSession.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">완료 시간:</span>
                          <span className="text-sm">{formatDate(selectedSession.completedAt)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">실행 시간:</span>
                        <span className="text-sm">{formatDuration(selectedSession.startedAt, selectedSession.completedAt)}</span>
                      </div>
                    </div>

                    {selectedSession.workflow && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">워크플로우 정보</h4>
                        <div className="space-y-1 text-sm">
                          <div>{selectedSession.workflow.description || "설명 없음"}</div>
                        </div>
                      </div>
                    )}

                    {selectedSession.metadata && Object.keys(selectedSession.metadata).length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">메타데이터</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(selectedSession.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="nodes" className="mt-4">
                    <ScrollArea className="h-[500px]">
                      {nodeExecutions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          노드 실행 기록이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {nodeExecutions.map((nodeExec, index) => {
                            const NodeIcon = getNodeTypeIcon(nodeExec.nodeType || '');
                            const duration = formatDuration(nodeExec.startedAt, nodeExec.completedAt);
                            
                            return (
                              <Card key={nodeExec.id} className="border-l-4 border-l-primary">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <NodeIcon className="w-4 h-4 text-muted-foreground" />
                                      <div>
                                        <div className="font-medium text-sm">
                                          노드 {index + 1}: {nodeExec.nodeId}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          타입: {nodeExec.nodeType}
                                        </div>
                                      </div>
                                    </div>
                                    {getStatusBadge(nodeExec.status)}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                                    <div>
                                      <span>시작:</span> {formatDate(nodeExec.startedAt)}
                                    </div>
                                    <div>
                                      <span>완료:</span> {formatDate(nodeExec.completedAt)}
                                    </div>
                                    <div>
                                      <span>실행 시간:</span> {duration}
                                    </div>
                                    {nodeExec.retryCount > 0 && (
                                      <div>
                                        <span>재시도:</span> {nodeExec.retryCount}회
                                      </div>
                                    )}
                                  </div>

                                  {nodeExec.errorMessage && (
                                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                                      오류: {nodeExec.errorMessage}
                                    </div>
                                  )}

                                  <div className="mt-3 flex space-x-2">
                                    {nodeExec.inputData && (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm" className="text-xs">
                                            입력 데이터
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[80vh]">
                                          <DialogHeader>
                                            <DialogTitle>노드 입력 데이터</DialogTitle>
                                          </DialogHeader>
                                          <ScrollArea className="max-h-[60vh]">
                                            <pre className="text-xs p-4 bg-muted rounded">
                                              {JSON.stringify(nodeExec.inputData, null, 2)}
                                            </pre>
                                          </ScrollArea>
                                        </DialogContent>
                                      </Dialog>
                                    )}
                                    {nodeExec.outputData && (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm" className="text-xs">
                                            출력 데이터
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[80vh]">
                                          <DialogHeader>
                                            <DialogTitle>노드 출력 데이터</DialogTitle>
                                          </DialogHeader>
                                          <ScrollArea className="max-h-[60vh]">
                                            <pre className="text-xs p-4 bg-muted rounded">
                                              {JSON.stringify(nodeExec.outputData, null, 2)}
                                            </pre>
                                          </ScrollArea>
                                        </DialogContent>
                                      </Dialog>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="data" className="mt-4">
                    <ScrollArea className="h-[500px]">
                      {sessionData.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          세션 데이터가 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sessionData.map((data) => (
                            <Card key={data.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="font-medium text-sm">{data.dataKey}</div>
                                    <div className="text-xs text-muted-foreground">
                                      타입: {data.dataType}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {data.executionStatus || 'success'}
                                  </Badge>
                                </div>
                                <div className="mt-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-xs">
                                        데이터 보기
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[80vh]">
                                      <DialogHeader>
                                        <DialogTitle>{data.dataKey} - 세션 데이터</DialogTitle>
                                      </DialogHeader>
                                      <ScrollArea className="max-h-[60vh]">
                                        <pre className="text-xs p-4 bg-muted rounded">
                                          {JSON.stringify(data.dataValue, null, 2)}
                                        </pre>
                                      </ScrollArea>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                {data.errorMessage && (
                                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                                    오류: {data.errorMessage}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  세션을 선택하여 상세 정보를 확인하세요.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
