import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StatusIndicator } from "@/components/common/status-indicator";
import { Play, Square, RefreshCw, Activity, Database, TrendingUp, Clock, Plus, Trash2, Edit, GitBranch } from "lucide-react";
import {
  SchedulerJob,
  SchedulerStats,
  SchedulerStatus,
  FinancialDataStats,
  NewsDataStats,
  Schedule,
  Workflow
} from "@shared/schema";

export default function Scheduler() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [scheduleName, setScheduleName] = useState("");
  const [cronExpression, setCronExpression] = useState("0 9 * * *");
  
  // Track scheduler active state to control polling
  const [isSchedulerActive, setIsSchedulerActive] = useState<boolean | null>(null);

  // Fetch scheduler status with real-time updates
  const { 
    data: schedulerStatus, 
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus
  } = useQuery<SchedulerStatus>({
    queryKey: ['/api/scheduler/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/scheduler/status');
      if (!response.ok) {
        throw new Error('Failed to fetch scheduler status');
      }
      const data = await response.json();
      const isActive = data.isActive ?? false;
      setIsSchedulerActive(isActive);
      return { isActive, timestamp: data.timestamp || new Date().toISOString(), stats: data.stats };
    },
    refetchInterval: (query) => {
      // Stop polling if scheduler is not active
      const isActive = query.state.data?.isActive ?? false;
      setIsSchedulerActive(isActive);
      // Poll every 5 seconds if active, stop if inactive
      // But always poll at least once to get initial status
      return isActive ? 5000 : (isSchedulerActive === null ? 5000 : false);
    },
    refetchIntervalInBackground: false, // Stop polling when tab is not visible
    enabled: true, // Always enabled to get initial status
  });

  // Synchronize scheduler status updates
  useEffect(() => {
    if (schedulerStatus) {
      setIsSchedulerActive(schedulerStatus.isActive);
    }
  }, [schedulerStatus]);

  // Fetch workflows for dropdown
  const { data: workflows = [] } = useQuery<Workflow[]>({
    queryKey: ['/api/workflows']
  });

  // Fetch workflow schedules
  const { data: workflowSchedules = [] } = useQuery<Schedule[]>({
    queryKey: ['/api/scheduler/workflows'],
    refetchInterval: 10000
  });

  // Start scheduler mutation
  const startSchedulerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/scheduler/start', {});
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || 'Failed to start scheduler');
      }
      return await response.json();
    },
    onSuccess: async () => {
      // Wait a bit for scheduler to fully start
      await new Promise(resolve => setTimeout(resolve, 200));
      setIsSchedulerActive(true); // Resume polling
      await refetchStatus(); // Immediately refetch status to sync
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/workflows'] });
      toast({
        title: "스케줄러 시작",
        description: "실시간 데이터 수신 스케줄러가 시작되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error('Start scheduler error:', error);
      toast({
        title: "시작 실패",
        description: error?.message || "스케줄러 시작 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Stop scheduler mutation
  const stopSchedulerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/scheduler/stop', {});
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || 'Failed to stop scheduler');
      }
      return await response.json();
    },
    onSuccess: async () => {
      // Wait a bit for scheduler to fully stop
      await new Promise(resolve => setTimeout(resolve, 200));
      setIsSchedulerActive(false); // Stop polling immediately
      await refetchStatus(); // Immediately refetch status to sync
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/workflows'] });
      // Update query data to reflect stopped state
      queryClient.setQueryData(['/api/scheduler/status'], (old: any) => ({
        ...old,
        isActive: false
      }));
      toast({
        title: "스케줄러 중지",
        description: "실시간 데이터 수신 스케줄러가 중지되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error('Stop scheduler error:', error);
      toast({
        title: "중지 실패",
        description: error?.message || "스케줄러 중지 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Create workflow schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: { name: string; workflowId: string; cronExpression: string }) => {
      const response = await apiRequest('POST', '/api/scheduler/workflows', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/workflows'] });
      setIsScheduleDialogOpen(false);
      setSelectedWorkflowId("");
      setScheduleName("");
      setCronExpression("0 9 * * *");
      toast({
        title: "스케줄 등록",
        description: "워크플로우 스케줄이 등록되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "등록 실패",
        description: "스케줄 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Delete workflow schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const response = await apiRequest('DELETE', `/api/scheduler/workflows/${scheduleId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/workflows'] });
      toast({
        title: "스케줄 삭제",
        description: "워크플로우 스케줄이 삭제되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "삭제 실패",
        description: "스케줄 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Toggle schedule active state mutation
  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: string; isActive: boolean }) => {
      const response = await apiRequest('PUT', `/api/scheduler/workflows/${scheduleId}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/workflows'] });
      toast({
        title: "스케줄 상태 변경",
        description: "스케줄 활성화 상태가 변경되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "상태 변경 실패",
        description: "스케줄 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Run workflow immediately mutation
  const runWorkflowMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const response = await apiRequest('POST', `/api/scheduler/workflows/${scheduleId}/run`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "워크플로우 실행",
        description: "워크플로우가 즉시 실행되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "실행 실패",
        description: "워크플로우 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const handleCreateSchedule = () => {
    if (!selectedWorkflowId || !scheduleName || !cronExpression) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    createScheduleMutation.mutate({
      name: scheduleName,
      workflowId: selectedWorkflowId,
      cronExpression
    });
  };

  // Data collection statistics
  const { data: dataStats } = useQuery<FinancialDataStats>({
    queryKey: ['/api/financial-data/stats'],
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: schedulerStatus?.isActive
  });

  const { data: newsStats } = useQuery<NewsDataStats>({
    queryKey: ['/api/news-data/stats'],
    refetchInterval: 10000,
    enabled: schedulerStatus?.isActive
  });

  const getJobTypeIcon = (jobId: string) => {
    switch (jobId) {
      case 'domestic-stock-prices':
      case 'foreign-stock-prices':
        return <TrendingUp className="w-4 h-4" />;
      case 'domestic-indices':
      case 'foreign-indices':
        return <Activity className="w-4 h-4" />;
      case 'volume-data':
        return <Database className="w-4 h-4" />;
      case 'news-updates':
        return <RefreshCw className="w-4 h-4" />;
      case 'master-files':
        return <Clock className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getJobTypeColor = (jobId: string) => {
    switch (jobId) {
      case 'domestic-stock-prices':
        return 'bg-blue-500';
      case 'foreign-stock-prices':
        return 'bg-green-500';
      case 'domestic-indices':
        return 'bg-purple-500';
      case 'foreign-indices':
        return 'bg-orange-500';
      case 'volume-data':
        return 'bg-cyan-500';
      case 'news-updates':
        return 'bg-red-500';
      case 'master-files':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatLastRun = (timestamp?: string | Date) => {
    if (!timestamp) return '없음';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString('ko-KR');
  };

  const formatNextRun = (timestamp?: string | Date) => {
    if (!timestamp) return '없음';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString('ko-KR');
  };

  const formatCronExpression = (cron: string) => {
    const presets: { [key: string]: string } = {
      '*/1 * * * *': '매분',
      '*/30 * * * * *': '30초마다',
      '0 8 * * *': '매일 오전 8시'
    };
    return presets[cron] || cron;
  };

  if (statusLoading && !schedulerStatus) {
    return (
      <div className="flex-1 overflow-hidden">

        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="flex-1 overflow-hidden">

        <div className="flex-1 p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <Activity className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">스케줄러 상태를 확인할 수 없습니다</h3>
              <p className="text-muted-foreground">서버와 연결을 확인해주세요.</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/scheduler/status'] })}
                className="mt-4"
                data-testid="button-retry-status"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 시도
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = schedulerStatus?.stats;
  const isActive = schedulerStatus?.isActive || false;

  return (
    <div className="flex-1 overflow-hidden">
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        
        {/* Control Panel */}
        <Card data-testid="scheduler-control-panel">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <StatusIndicator 
                    status={isActive ? 'active' : 'inactive'} 
                    label=""
                    className="w-3 h-3" 
                  />
                  <CardTitle>스케줄러 제어판</CardTitle>
                </div>
                <Badge variant={isActive ? "default" : "secondary"} data-testid="scheduler-status-badge">
                  {isActive ? '실행 중' : '중지됨'}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/scheduler/status'] })}
                  variant="outline"
                  size="sm"
                  data-testid="button-refresh-status"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
                {isActive ? (
                  <Button
                    onClick={() => stopSchedulerMutation.mutate()}
                    variant="destructive"
                    size="sm"
                    disabled={stopSchedulerMutation.isPending}
                    data-testid="button-stop-scheduler"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    {stopSchedulerMutation.isPending ? '중지 중...' : '중지'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => startSchedulerMutation.mutate()}
                    size="sm"
                    disabled={startSchedulerMutation.isPending}
                    data-testid="button-start-scheduler"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {startSchedulerMutation.isPending ? '시작 중...' : '시작'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {stats && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground" data-testid="total-jobs-count">
                    {stats.totalJobs}
                  </div>
                  <div className="text-sm text-muted-foreground">총 작업</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500" data-testid="running-jobs-count">
                    {stats.runningJobs}
                  </div>
                  <div className="text-sm text-muted-foreground">실행 중</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500" data-testid="error-jobs-count">
                    {stats.errorCount}
                  </div>
                  <div className="text-sm text-muted-foreground">오류</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">마지막 업데이트</div>
                  <div className="text-xs text-foreground" data-testid="last-update">
                    {formatLastRun(stats.lastUpdate)}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Data Collection Jobs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stats?.jobs?.map((job) => (
            <Card key={job.id} className="hover:border-primary/50 transition-colors" data-testid={`job-card-${job.id}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${getJobTypeColor(job.id)} text-white`}>
                      {getJobTypeIcon(job.id)}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{job.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {formatCronExpression(job.cronExpression)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center space-x-2">
                      <StatusIndicator 
                        status={job.isRunning ? 'active' : (job.errorCount > 0 ? 'error' : 'inactive')} 
                        label=""
                        className="w-2 h-2" 
                      />
                      <span className="text-xs text-muted-foreground">
                        {job.errorCount >= job.maxRetries 
                          ? '중지됨' 
                          : job.isRunning 
                          ? '실행 중' 
                          : job.errorCount > 0 
                          ? '오류' 
                          : '대기'}
                      </span>
                    </div>
                    {job.errorCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        오류 {job.errorCount}/{job.maxRetries}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">마지막 실행:</span>
                    <span className="text-foreground">{formatLastRun(job.lastRun)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">다음 실행:</span>
                    <span className="text-foreground">{formatNextRun(job.nextRun)}</span>
                  </div>
                  {job.errorCount > 0 && (
                    <div className="pt-2">
                      <Progress 
                        value={(job.errorCount / job.maxRetries) * 100} 
                        className="h-1"
                        data-testid={`error-progress-${job.id}`}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data Collection Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Financial Data Statistics */}
          <Card data-testid="financial-data-stats">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span>시세 데이터 수집 통계</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-500">
                      {dataStats?.totalRecords || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">총 레코드</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-500">
                      {dataStats?.todayRecords || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">오늘 수집</div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>국내증권시세:</span>
                    <span className="font-medium">{dataStats?.domesticStocks || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>해외증권시세:</span>
                    <span className="font-medium">{dataStats?.foreignStocks || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>지수 데이터:</span>
                    <span className="font-medium">{dataStats?.indices || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>수급량 정보:</span>
                    <span className="font-medium">{dataStats?.volumeData || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* News Data Statistics */}
          <Card data-testid="news-data-stats">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-red-500" />
                <span>뉴스 데이터 수집 통계</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-500">
                      {newsStats?.totalNews || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">총 뉴스</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-500">
                      {newsStats?.todayNews || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">오늘 수집</div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>긍정 뉴스:</span>
                    <span className="font-medium text-green-500">{newsStats?.positiveNews || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>부정 뉴스:</span>
                    <span className="font-medium text-red-500">{newsStats?.negativeNews || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>중립 뉴스:</span>
                    <span className="font-medium text-gray-500">{newsStats?.neutralNews || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>마스터파일:</span>
                    <span className="font-medium">{newsStats?.masterFiles || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time System Status */}
        <Card data-testid="system-status">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <span>시스템 상태</span>
              <Badge variant="outline" className="ml-2">실시간</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500 mb-2">
                  {isActive ? '정상' : '중지'}
                </div>
                <div className="text-sm text-muted-foreground">스케줄러 상태</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500 mb-2">
                  {stats?.runningJobs || 0}/{stats?.totalJobs || 0}
                </div>
                <div className="text-sm text-muted-foreground">활성 작업</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500 mb-2">
                  {stats?.errorCount === 0 ? '양호' : '주의'}
                </div>
                <div className="text-sm text-muted-foreground">시스템 건강도</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Schedules */}
        <Card data-testid="workflow-schedules">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center space-x-2">
                <GitBranch className="w-5 h-5 text-indigo-500" />
                <span>워크플로우 스케줄 관리</span>
              </CardTitle>
              <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-schedule">
                    <Plus className="w-4 h-4 mr-2" />
                    스케줄 등록
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>워크플로우 스케줄 등록</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="schedule-name">스케줄 이름</Label>
                      <Input
                        id="schedule-name"
                        placeholder="예: 아침 매크로 분석"
                        value={scheduleName}
                        onChange={(e) => setScheduleName(e.target.value)}
                        data-testid="input-schedule-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workflow-select">워크플로우</Label>
                      <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                        <SelectTrigger id="workflow-select" data-testid="select-workflow">
                          <SelectValue placeholder="워크플로우 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {workflows.map((workflow) => (
                            <SelectItem key={workflow.id} value={workflow.id}>
                              {workflow.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cron-expression">실행 주기 (Cron)</Label>
                      <Select value={cronExpression} onValueChange={setCronExpression}>
                        <SelectTrigger id="cron-expression" data-testid="select-cron">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0 9 * * *">매일 오전 9시</SelectItem>
                          <SelectItem value="0 18 * * *">매일 오후 6시</SelectItem>
                          <SelectItem value="0 9 * * 1">매주 월요일 오전 9시</SelectItem>
                          <SelectItem value="*/30 * * * *">30분마다</SelectItem>
                          <SelectItem value="0 * * * *">매시간</SelectItem>
                          <SelectItem value="0 9 1 * *">매월 1일 오전 9시</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleCreateSchedule}
                      disabled={createScheduleMutation.isPending}
                      className="w-full"
                      data-testid="button-create-schedule"
                    >
                      {createScheduleMutation.isPending ? "등록 중..." : "등록"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {workflowSchedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 워크플로우 스케줄이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowSchedules.map((schedule) => {
                  const workflow = workflows.find(w => w.id === schedule.workflowId);
                  return (
                    <Card key={schedule.id} className="border-2" data-testid={`schedule-card-${schedule.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-sm">{schedule.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {workflow?.name || "워크플로우 없음"}
                            </p>
                          </div>
                          <Badge variant={schedule.isActive ? "default" : "secondary"} data-testid={`schedule-status-${schedule.id}`}>
                            {schedule.isActive ? "활성" : "비활성"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">실행 주기:</span>
                          <span className="font-medium">{formatCronExpression(schedule.cronExpression)}</span>
                        </div>
                        {schedule.lastRun && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">마지막 실행:</span>
                            <span className="font-medium">{formatLastRun(schedule.lastRun)}</span>
                          </div>
                        )}
                        {schedule.nextRun && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">다음 실행:</span>
                            <span className="font-medium">{formatNextRun(schedule.nextRun)}</span>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleScheduleMutation.mutate({ 
                              scheduleId: schedule.id, 
                              isActive: !schedule.isActive 
                            })}
                            disabled={toggleScheduleMutation.isPending}
                            className="flex-1"
                            data-testid={`button-toggle-${schedule.id}`}
                          >
                            {schedule.isActive ? "비활성화" : "활성화"}
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => runWorkflowMutation.mutate(schedule.id)}
                            disabled={runWorkflowMutation.isPending}
                            data-testid={`button-run-${schedule.id}`}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            실행
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("이 스케줄을 삭제하시겠습니까?")) {
                                deleteScheduleMutation.mutate(schedule.id);
                              }
                            }}
                            disabled={deleteScheduleMutation.isPending}
                            data-testid={`button-delete-${schedule.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card data-testid="scheduler-instructions">
          <CardHeader>
            <CardTitle>스케줄러 사용 안내</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <strong>매 1분마다 수집:</strong> 국내/해외 증권시세, 지수, 수급량 정보가 자동으로 수집됩니다.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <strong>실시간 수집:</strong> 뉴스시황은 30초마다 체크하여 실시간으로 수집됩니다.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <strong>일간 수집:</strong> 마스터파일 정보(상장/폐지/거래정지 등)는 매일 오전 8시에 수집됩니다.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <strong>오류 처리:</strong> 각 작업은 최대 3회 재시도하며, 실패 시 자동으로 중지됩니다.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}