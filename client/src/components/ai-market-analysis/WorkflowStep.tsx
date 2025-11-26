import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play,
  AlertCircle,
  Database,
  Brain,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface WorkflowStepProps {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  data?: any;
  onExecute: (stepId: string) => void;
  disabled?: boolean;
}

const WorkflowStep: React.FC<WorkflowStepProps> = ({
  id,
  name,
  description,
  status,
  progress,
  startTime,
  endTime,
  error,
  data,
  onExecute,
  disabled = false
}) => {
  const getStepIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">완료</Badge>;
      case 'error':
        return <Badge variant="destructive">오류</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500">실행중</Badge>;
      default:
        return <Badge variant="secondary">대기</Badge>;
    }
  };

  const getStepIconByType = (stepId: string) => {
    switch (stepId) {
      case 'collect-news':
        return <Database className="h-4 w-4" />;
      case 'extract-events':
        return <Brain className="h-4 w-4" />;
      case 'generate-themes':
        return <TrendingUp className="h-4 w-4" />;
      case 'generate-macro':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Play className="h-4 w-4" />;
    }
  };

  const formatDuration = (start: Date, end: Date) => {
    const duration = end.getTime() - start.getTime();
    return `${(duration / 1000).toFixed(1)}초`;
  };

  return (
    <Card className={`transition-all duration-200 ${
      status === 'running' ? 'ring-2 ring-blue-200' : 
      status === 'completed' ? 'ring-2 ring-green-200' :
      status === 'error' ? 'ring-2 ring-red-200' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStepIcon()}
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {getStepIconByType(id)}
                {name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStepBadge()}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExecute(id)}
              disabled={disabled || status === 'running'}
              className="min-w-[60px]"
            >
              {status === 'running' ? '실행중' : '실행'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {status === 'running' && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground">
              진행률: {progress}%
            </p>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mt-2 p-2 bg-red-50 rounded">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        {startTime && endTime && (
          <div className="text-xs text-muted-foreground mt-2">
            실행 시간: {formatDuration(startTime, endTime)}
          </div>
        )}
        
        {data && status === 'completed' && (
          <div className="mt-3 p-2 bg-green-50 rounded text-sm">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">실행 완료</span>
            </div>
            {Array.isArray(data) && (
              <p className="text-green-600">{data.length}건 처리됨</p>
            )}
            {typeof data === 'object' && data.title && (
              <p className="text-green-600">{data.title}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowStep;
