import { FileText, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { KPITile } from "./kpi-tile";
import { useEffect, useState } from "react";

interface ReportsStats {
  todaysReports: number;
  successRate: number;
  averageGenerationTime: number;
  totalReportsThisWeek: number;
  recentReports: Array<{
    id: string;
    title: string;
    type: string;
    generatedAt: string;
    confidence?: number;
  }>;
}

export function TodaysReportsTile() {
  const { subscribe, isConnected } = useWebSocket();
  const [realtimeCount, setRealtimeCount] = useState<number | null>(null);

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's reports statistics
  const { data: reportsStats, isLoading, refetch } = useQuery<ReportsStats>({
    queryKey: ['/api/reports/stats', today],
    refetchInterval: 60000, // Refresh every minute
  });

  // Subscribe to real-time report generation updates
  useEffect(() => {
    const unsubscribeReportGenerated = subscribe('report_generated', (data) => {
      console.log('New report generated:', data);
      setRealtimeCount(prev => (prev || reportsStats?.todaysReports || 0) + 1);
      refetch();
    });

    const unsubscribeAnalysisComplete = subscribe('workflow_stage_complete', (data) => {
      if (data.stage === 'D' && data.success) {
        // Stage D generates integrated macro analysis reports
        console.log('Macro analysis report generated:', data);
        setRealtimeCount(prev => (prev || reportsStats?.todaysReports || 0) + 1);
        refetch();
      }
    });

    return () => {
      unsubscribeReportGenerated();
      unsubscribeAnalysisComplete();
    };
  }, [subscribe, refetch, reportsStats?.todaysReports]);

  const todaysCount = realtimeCount || reportsStats?.todaysReports || 0;
  const successRate = reportsStats?.successRate || 0;
  const avgGenTime = reportsStats?.averageGenerationTime || 0;
  const weeklyTotal = reportsStats?.totalReportsThisWeek || 0;

  // Calculate trend based on weekly comparison
  const getTrend = () => {
    const weeklyAverage = Math.floor(weeklyTotal / 7);
    const difference = todaysCount - weeklyAverage;
    const percentage = weeklyAverage > 0 ? Math.round((difference / weeklyAverage) * 100) : 0;
    
    if (percentage > 10) {
      return { value: percentage, direction: 'up' as const, label: 'vs weekly avg' };
    } else if (percentage < -10) {
      return { value: Math.abs(percentage), direction: 'down' as const, label: 'vs weekly avg' };
    } else {
      return { value: Math.abs(percentage), direction: 'neutral' as const, label: 'vs weekly avg' };
    }
  };

  const getStatus = () => {
    if (successRate >= 95) {
      return { label: 'Excellent', variant: 'success' as const };
    } else if (successRate >= 90) {
      return { label: 'Good', variant: 'success' as const };
    } else if (successRate >= 80) {
      return { label: 'Fair', variant: 'warning' as const };
    } else if (successRate < 80 && successRate > 0) {
      return { label: 'Poor', variant: 'error' as const };
    }
    return { label: 'No Data', variant: 'default' as const };
  };

  const formatTime = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
    return `${(milliseconds / 60000).toFixed(1)}m`;
  };

  const metrics = [
    {
      label: 'Success Rate',
      value: `${successRate.toFixed(1)}%`,
      color: successRate >= 90 ? 'success' : successRate >= 80 ? 'warning' : 'destructive'
    },
    {
      label: 'Avg Gen Time',
      value: formatTime(avgGenTime),
      color: avgGenTime < 30000 ? 'success' : avgGenTime < 60000 ? 'warning' : 'destructive'
    },
    {
      label: 'This Week',
      value: weeklyTotal,
      color: 'foreground'
    },
    {
      label: 'Status',
      value: isConnected ? 'Live' : 'Offline',
      color: isConnected ? 'success' : 'destructive'
    }
  ];

  return (
    <KPITile
      title="Today's Reports"
      icon={<FileText className="h-4 w-4" />}
      value={todaysCount}
      subtitle="AI-generated market analysis reports"
      trend={getTrend()}
      status={getStatus()}
      metrics={metrics}
      isLoading={isLoading}
      data-testid="todays-reports-tile"
    />
  );
}