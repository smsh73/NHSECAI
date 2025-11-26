import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { KPITile } from "./kpi-tile";
import { useEffect, useState } from "react";

interface AlertStats {
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  acknowledgedAlerts: number;
  recentAlerts: Array<{
    id: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
    acknowledged: boolean;
    source: string;
  }>;
  alertTrend: number; // Change in alerts over last 24h
}

export function AlertCountTile() {
  const { subscribe, isConnected } = useWebSocket();
  const [realtimeAlerts, setRealtimeAlerts] = useState<Partial<AlertStats> | null>(null);

  // Fetch alert statistics
  const { data: alertStats, isLoading, refetch } = useQuery<AlertStats>({
    queryKey: ['/api/alerts/stats'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Subscribe to real-time alert events
  useEffect(() => {
    const unsubscribeNewAlert = subscribe('new_alert', (data) => {
      console.log('New alert:', data);
      setRealtimeAlerts(prev => ({
        ...prev,
        totalAlerts: (prev?.totalAlerts || alertStats?.totalAlerts || 0) + 1,
        ...(data.type === 'critical' && {
          criticalAlerts: (prev?.criticalAlerts || alertStats?.criticalAlerts || 0) + 1
        }),
        ...(data.type === 'warning' && {
          warningAlerts: (prev?.warningAlerts || alertStats?.warningAlerts || 0) + 1
        }),
        ...(data.type === 'info' && {
          infoAlerts: (prev?.infoAlerts || alertStats?.infoAlerts || 0) + 1
        })
      }));
      refetch();
    });

    const unsubscribeAlertAcknowledged = subscribe('alert_acknowledged', (data) => {
      console.log('Alert acknowledged:', data);
      setRealtimeAlerts(prev => ({
        ...prev,
        acknowledgedAlerts: (prev?.acknowledgedAlerts || alertStats?.acknowledgedAlerts || 0) + 1
      }));
      refetch();
    });

    const unsubscribeJobFailed = subscribe('job_failed', (data) => {
      // Job failures should trigger alerts
      console.log('Job failed alert:', data);
      setRealtimeAlerts(prev => ({
        ...prev,
        totalAlerts: (prev?.totalAlerts || alertStats?.totalAlerts || 0) + 1,
        warningAlerts: (prev?.warningAlerts || alertStats?.warningAlerts || 0) + 1
      }));
      refetch();
    });

    const unsubscribeWorkflowError = subscribe('workflow_stage_error', (data) => {
      // Workflow errors should trigger critical alerts
      console.log('Workflow error alert:', data);
      setRealtimeAlerts(prev => ({
        ...prev,
        totalAlerts: (prev?.totalAlerts || alertStats?.totalAlerts || 0) + 1,
        criticalAlerts: (prev?.criticalAlerts || alertStats?.criticalAlerts || 0) + 1
      }));
      refetch();
    });

    return () => {
      unsubscribeNewAlert();
      unsubscribeAlertAcknowledged();
      unsubscribeJobFailed();
      unsubscribeWorkflowError();
    };
  }, [subscribe, refetch, alertStats]);

  // Use real-time data if available, otherwise fall back to API data
  const stats = realtimeAlerts || alertStats;
  
  const totalAlerts = stats?.totalAlerts || 0;
  const criticalAlerts = stats?.criticalAlerts || 0;
  const warningAlerts = stats?.warningAlerts || 0;
  const infoAlerts = stats?.infoAlerts || 0;
  const acknowledgedAlerts = stats?.acknowledgedAlerts || 0;
  const alertTrend = stats?.alertTrend || 0;

  const unacknowledgedAlerts = totalAlerts - acknowledgedAlerts;
  const acknowledgmentRate = totalAlerts > 0 ? (acknowledgedAlerts / totalAlerts) * 100 : 0;

  // Calculate trend
  const getTrend = () => {
    if (alertTrend > 0) {
      return { value: Math.abs(alertTrend), direction: 'down' as const, label: 'increase (24h)' };
    } else if (alertTrend < 0) {
      return { value: Math.abs(alertTrend), direction: 'up' as const, label: 'decrease (24h)' };
    } else {
      return { value: 0, direction: 'neutral' as const, label: 'no change (24h)' };
    }
  };

  const getStatus = () => {
    if (criticalAlerts > 0) {
      return { label: 'Critical', variant: 'error' as const };
    } else if (warningAlerts > 5) {
      return { label: 'Warning', variant: 'warning' as const };
    } else if (unacknowledgedAlerts > 10) {
      return { label: 'Review Needed', variant: 'warning' as const };
    } else if (totalAlerts === 0) {
      return { label: 'All Clear', variant: 'success' as const };
    } else {
      return { label: 'Normal', variant: 'info' as const };
    }
  };

  const getDisplayValue = () => {
    if (criticalAlerts > 0) return criticalAlerts;
    if (unacknowledgedAlerts > 0) return unacknowledgedAlerts;
    return totalAlerts;
  };

  const getSubtitle = () => {
    if (criticalAlerts > 0) return `${criticalAlerts} critical alerts require attention`;
    if (unacknowledgedAlerts > 0) return `${unacknowledgedAlerts} unacknowledged alerts`;
    if (totalAlerts === 0) return "No active alerts";
    return `${totalAlerts} total alerts`;
  };

  const metrics = [
    {
      label: 'Critical',
      value: criticalAlerts,
      color: criticalAlerts > 0 ? 'destructive' : 'muted-foreground'
    },
    {
      label: 'Warning',
      value: warningAlerts,
      color: warningAlerts > 0 ? 'warning' : 'muted-foreground'
    },
    {
      label: 'Info',
      value: infoAlerts,
      color: infoAlerts > 0 ? 'info' : 'muted-foreground'
    },
    {
      label: 'Ack Rate',
      value: `${acknowledgmentRate.toFixed(0)}%`,
      color: acknowledgmentRate >= 90 ? 'success' : acknowledgmentRate >= 70 ? 'warning' : 'destructive'
    }
  ];

  return (
    <KPITile
      title="Alert Count"
      icon={<AlertCircle className="h-4 w-4" />}
      value={getDisplayValue()}
      subtitle={getSubtitle()}
      trend={getTrend()}
      status={getStatus()}
      metrics={metrics}
      isLoading={isLoading}
      data-testid="alert-count-tile"
    />
  );
}