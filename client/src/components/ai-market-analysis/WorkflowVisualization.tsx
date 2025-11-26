import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, 
  Database, 
  Brain, 
  TrendingUp, 
  BarChart3,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  data?: any;
}

interface WorkflowVisualizationProps {
  steps: WorkflowStep[];
  onStepExecute: (stepId: string) => void;
  disabled?: boolean;
}

const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({
  steps,
  onStepExecute,
  disabled = false
}) => {
  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'collect-news':
        return <Database className="h-6 w-6 text-blue-500" />;
      case 'extract-events':
        return <Brain className="h-6 w-6 text-purple-500" />;
      case 'generate-themes':
        return <TrendingUp className="h-6 w-6 text-green-500" />;
      case 'generate-macro':
        return <BarChart3 className="h-6 w-6 text-orange-500" />;
      default:
        return <Database className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: WorkflowStep['status']) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          AI 시황 생성 워크플로우
        </CardTitle>
        <CardDescription>
          Databricks 기반 AI 시황 생성 프로세스를 시각화합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 워크플로우 플로우차트 */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center space-y-2">
                  <div className={`p-3 rounded-full border-2 transition-all duration-200 ${
                    step.status === 'completed' ? 'border-green-500 bg-green-50' :
                    step.status === 'running' ? 'border-blue-500 bg-blue-50' :
                    step.status === 'error' ? 'border-red-500 bg-red-50' :
                    'border-gray-300 bg-gray-50'
                  }`}>
                    {getStepIcon(step.id)}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{step.name}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(step.status)}
                    {getStatusBadge(step.status)}
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-gray-400 mx-4" />
                )}
              </React.Fragment>
            ))}
          </div>
          
          <Separator />
          
          {/* 상세 단계별 정보 */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">단계별 상세 정보</h4>
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStepIcon(step.id)}
                  <div>
                    <p className="font-medium text-sm">{step.name}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(step.status)}
                  {getStatusBadge(step.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowVisualization;
