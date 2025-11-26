import { Activity, Play, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { KPITile } from "./kpi-tile";
import { useEffect, useState } from "react";

interface WorkflowStats {
  totalJobs: number;
  runningJobs: number;
  errorCount: number;
  lastUpdate: string;
  completionRate: number;
  jobs: Array<{
    id: string;
    name: string;
    isRunning: boolean;
    errorCount: number;
    lastRun?: string;
  }>;
}

export function ActiveWorkflowsTile() {
  const { subscribe, isConnected } = useWebSocket();
  const [realtimeStats, setRealtimeStats] = useState<Partial<WorkflowStats> | null>(null);

  // Fetch workflow status from API
  const { data: workflowStats, isLoading, refetch } = useQuery<WorkflowStats>({
    queryKey: ['/api/workflows/stats'],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Subscribe to real-time workflow updates
  useEffect(() => {
    const unsubscribeJobCompleted = subscribe('job_completed', (data) => {
      console.log('Job completed:', data);
      setRealtimeStats(prev => ({
        ...prev,
        lastUpdate: new Date().toISOString()
      }));
      refetch();
    });

    const unsubscribeJobFailed = subscribe('job_failed', (data) => {
      console.log('Job failed:', data);
      setRealtimeStats(prev => ({
        ...prev,
        errorCount: (prev?.errorCount || 0) + 1,
        lastUpdate: new Date().toISOString()
      }));
      refetch();
    });

    const unsubscribeSchedulerStatus = subscribe('scheduler_status', (data) => {
      console.log('Scheduler status:', data);
      if (data.jobs) {
        setRealtimeStats({
          totalJobs: data.jobs.totalJobs,
          runningJobs: data.jobs.runningJobs,
          errorCount: data.jobs.errorCount,
          lastUpdate: new Date().toISOString()
        });
      }
      refetch();
    });

    return () => {
      unsubscribeJobCompleted();
      unsubscribeJobFailed();
      unsubscribeSchedulerStatus();
    };
  }, [subscribe, refetch]);

  // Use real-time data if available, otherwise fall back to API data
  const stats = realtimeStats || workflowStats;
  
  const activeCount = stats?.runningJobs || 0;
  const totalCount = stats?.totalJobs || 0;
  const completionRate = stats?.completionRate || (totalCount > 0 ? ((totalCount - (stats?.errorCount || 0)) / totalCount * 100) : 0);
  const errorCount = stats?.errorCount || 0;

  // Calculate trend based on completion rate
  const getTrend = () => {
    if (completionRate >= 95) {
      return { value: completionRate, direction: 'up' as const, label: 'excellent' };
    } else if (completionRate >= 85) {
      return { value: completionRate, direction: 'up' as const, label: 'good' };
    } else if (completionRate >= 70) {
      return { value: completionRate, direction: 'neutral' as const, label: 'average' };
    } else {
      return { value: completionRate, direction: 'down' as const, label: 'needs attention' };
    }
  };

  const getStatus = () => {
    if (errorCount === 0 && activeCount > 0) {
      return { label: 'All Active', variant: 'success' as const };
    } else if (errorCount > 0 && errorCount < totalCount * 0.2) {
      return { label: 'Minor Issues', variant: 'warning' as const };
    } else if (errorCount >= totalCount * 0.2) {
      return { label: 'Critical', variant: 'error' as const };
    } else if (activeCount === 0) {
      return { label: 'Idle', variant: 'info' as const };
    }
    return { label: 'Active', variant: 'default' as const };
  };

  const metrics = [
    {
      label: 'Running',
      value: activeCount,
      color: 'success'
    },
    {
      label: 'Total Jobs',
      value: totalCount,
      color: 'foreground'
    },
    {
      label: 'Errors',
      value: errorCount,
      color: errorCount > 0 ? 'destructive' : 'muted-foreground'
    },
    {
      label: 'Connected',
      value: isConnected ? 'Yes' : 'No',
      color: isConnected ? 'success' : 'destructive'
    }
  ];

  return (
    <KPITile
      title="Active Workflows"
      icon={<Activity className="h-4 w-4" />}
      value={activeCount}
      subtitle={`${totalCount} total workflows configured`}
      trend={getTrend()}
      status={getStatus()}
      metrics={metrics}
      isLoading={isLoading}
      data-testid="active-workflows-tile"
    />
  );
}