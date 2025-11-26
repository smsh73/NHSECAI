import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface WorkflowStatus {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message?: string;
  data?: any;
  error?: string;
}

interface NewsCollectionStatus {
  isCollecting: boolean;
  progress: number;
  collectedCount: number;
  totalCount: number;
  currentItem?: string;
  error?: string;
}

export const useWorkflowStatus = () => {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus[]>([]);
  const [newsCollectionStatus, setNewsCollectionStatus] = useState<NewsCollectionStatus>({
    isCollecting: false,
    progress: 0,
    collectedCount: 0,
    totalCount: 0
  });
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket 연결
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000/ws');
    
    ws.onopen = () => {
      console.log('WebSocket 연결됨');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'workflow_status') {
          setWorkflowStatus(prev => {
            const existing = prev.find(s => s.stepId === data.stepId);
            if (existing) {
              return prev.map(s => s.stepId === data.stepId ? { ...s, ...data } : s);
            } else {
              return [...prev, data];
            }
          });
        }
        
        if (data.type === 'news_collection') {
          setNewsCollectionStatus(prev => ({
            ...prev,
            ...data
          }));
          
          // 토스트 알림
          if (data.isCollecting && data.progress === 0) {
            toast.info('뉴스 데이터 수집을 시작합니다...');
          } else if (data.progress === 100) {
            toast.success(`뉴스 데이터 수집 완료! ${data.collectedCount}건 수집됨`);
          } else if (data.error) {
            toast.error(`뉴스 수집 오류: ${data.error}`);
          }
        }
      } catch (error) {
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket 연결 종료');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  // 수동 상태 업데이트 (WebSocket이 없을 때 폴백)
  const updateWorkflowStatus = useCallback(async (workflowId: string) => {
    try {
      const response = await fetch(`/api/ai-market-analysis/workflow-status/${workflowId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkflowStatus(data.status || []);
      }
    } catch (error) {
      console.error('워크플로우 상태 조회 오류:', error);
    }
  }, []);

  // 뉴스 수집 상태 폴링
  const pollNewsCollectionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-market-analysis/news-collection-status');
      if (response.ok) {
        const data = await response.json();
        setNewsCollectionStatus(data);
      }
    } catch (error) {
      console.error('뉴스 수집 상태 조회 오류:', error);
    }
  }, []);

  // 폴링 시작 (WebSocket이 연결되지 않았을 때)
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(pollNewsCollectionStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [isConnected, pollNewsCollectionStatus]);

  return {
    workflowStatus,
    newsCollectionStatus,
    isConnected,
    updateWorkflowStatus,
    pollNewsCollectionStatus
  };
};
