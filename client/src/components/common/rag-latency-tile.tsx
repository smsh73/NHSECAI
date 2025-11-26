import { Zap, Search, Database, Timer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { KPITile } from "./kpi-tile";
import { useEffect, useState } from "react";

interface RAGLatencyStats {
  currentLatency: number;
  averageLatency: number;
  p95Latency: number;
  totalQueries: number;
  successfulQueries: number;
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  lastQueryTime: string;
  cacheHitRate: number;
}

export function RAGLatencyTile() {
  const { subscribe, isConnected } = useWebSocket();
  const [realtimeLatency, setRealtimeLatency] = useState<number | null>(null);
  const [queryCount, setQueryCount] = useState<number>(0);

  // Fetch RAG performance statistics
  const { data: ragStats, isLoading, refetch } = useQuery<RAGLatencyStats>({
    queryKey: ['/api/rag/stats'],
    refetchInterval: 5000, // Refresh every 5 seconds for performance monitoring
  });

  // Subscribe to real-time search events
  useEffect(() => {
    const unsubscribeSearchStart = subscribe('search_started', (data) => {
      console.log('Search started:', data);
      setRealtimeLatency(null); // Reset current latency while processing
    });

    const unsubscribeSearchComplete = subscribe('search_completed', (data) => {
      console.log('Search completed:', data);
      if (data.latency) {
        setRealtimeLatency(data.latency);
        setQueryCount(prev => prev + 1);
      }
      refetch();
    });

    const unsubscribeSearchError = subscribe('search_error', (data) => {
      console.log('Search error:', data);
      refetch();
    });

    return () => {
      unsubscribeSearchStart();
      unsubscribeSearchComplete();
      unsubscribeSearchError();
    };
  }, [subscribe, refetch]);

  const currentLatency = realtimeLatency || ragStats?.currentLatency || 0;
  const avgLatency = ragStats?.averageLatency || 0;
  const p95Latency = ragStats?.p95Latency || 0;
  const successRate = ragStats ? (ragStats.successfulQueries / Math.max(ragStats.totalQueries, 1)) * 100 : 0;
  const performanceGrade = ragStats?.performanceGrade || 'C';
  const cacheHitRate = ragStats?.cacheHitRate || 0;

  // Calculate trend based on current vs average latency
  const getTrend = () => {
    if (avgLatency === 0) return { value: 0, direction: 'neutral' as const, label: 'no baseline' };
    
    const improvement = ((avgLatency - currentLatency) / avgLatency) * 100;
    
    if (improvement > 10) {
      return { value: Math.round(improvement), direction: 'up' as const, label: 'faster than avg' };
    } else if (improvement < -10) {
      return { value: Math.round(Math.abs(improvement)), direction: 'down' as const, label: 'slower than avg' };
    } else {
      return { value: Math.round(Math.abs(improvement)), direction: 'neutral' as const, label: 'near average' };
    }
  };

  const getStatus = () => {
    switch (performanceGrade) {
      case 'A':
        return { label: 'Excellent', variant: 'success' as const };
      case 'B':
        return { label: 'Good', variant: 'success' as const };
      case 'C':
        return { label: 'Average', variant: 'warning' as const };
      case 'D':
        return { label: 'Poor', variant: 'warning' as const };
      case 'F':
        return { label: 'Critical', variant: 'error' as const };
      default:
        return { label: 'Unknown', variant: 'default' as const };
    }
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 10000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 1000)}s`;
  };

  const metrics = [
    {
      label: 'Average',
      value: formatLatency(avgLatency),
      color: avgLatency < 1000 ? 'success' : avgLatency < 3000 ? 'warning' : 'destructive'
    },
    {
      label: 'P95',
      value: formatLatency(p95Latency),
      color: p95Latency < 2000 ? 'success' : p95Latency < 5000 ? 'warning' : 'destructive'
    },
    {
      label: 'Success Rate',
      value: `${successRate.toFixed(1)}%`,
      color: successRate >= 95 ? 'success' : successRate >= 85 ? 'warning' : 'destructive'
    },
    {
      label: 'Cache Hit',
      value: `${(cacheHitRate * 100).toFixed(1)}%`,
      color: cacheHitRate > 0.8 ? 'success' : cacheHitRate > 0.5 ? 'warning' : 'destructive'
    }
  ];

  return (
    <KPITile
      title="RAG Latency"
      icon={<Zap className="h-4 w-4" />}
      value={formatLatency(currentLatency)}
      subtitle="Current search response time"
      trend={getTrend()}
      status={getStatus()}
      metrics={metrics}
      isLoading={isLoading}
      data-testid="rag-latency-tile"
    />
  );
}