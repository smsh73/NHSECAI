import { Handle, Position } from 'reactflow';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkflowNode as WorkflowNodeType } from "@/types/workflow";
import { WorkflowError } from "@/utils/workflow-execution";
import { 
  Play, 
  MessageSquare, 
  Bot, 
  Search, 
  Merge, 
  GitBranch, 
  Circle, 
  AlertTriangle, 
  AlertCircle, 
  Settings, 
  Trash2,
  Sparkles,
  Tags,
  Bell,
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  StopCircle
} from "lucide-react";

type NodeStatus = 'idle' | 'running' | 'success' | 'error';

interface WorkflowNodeProps {
  data: WorkflowNodeType['data'] & {
    onConfig?: () => void;
    onDelete?: () => void;
    isHoverTarget?: boolean;
    overlapSide?: 'left' | 'right' | 'top' | 'bottom' | null;
    hasError?: boolean;
    errorInfo?: WorkflowError;
    status?: NodeStatus;
    executionTime?: number;
    simulationMode?: boolean;
    executionResult?: {
      input?: any;
      output?: any;
      error?: string;
      executionTime?: number;
      status?: string;
    };
    onExecuteNode?: (nodeId: string) => void;
  };
  selected?: boolean;
}

export function WorkflowNode({ data, selected }: WorkflowNodeProps) {
  const nodeStatus: NodeStatus = data.executionResult?.status === 'completed' ? 'success' 
    : data.executionResult?.status === 'failed' ? 'error'
    : data.executionResult?.status === 'running' ? 'running'
    : data.status || 'idle';
  const getNodeColor = (type: string, hasError: boolean = false, status?: NodeStatus) => {
    if (hasError) {
      return 'border-red-500 border-2';
    }
    
    if (status === 'running') {
      return 'border-yellow-500 border-2 animate-pulse';
    } else if (status === 'success') {
      return 'border-green-500 border-2';
    } else if (status === 'error') {
      return 'border-red-500 border-2';
    }
    
    switch (type) {
      case 'start':
        return 'border-primary';
      case 'end':
        return 'border-gray-600';
      case 'prompt':
        return 'border-blue-500';
      case 'api':
        return 'border-accent';
      case 'rag':
        return 'border-chart-2';
      case 'merge':
        return 'border-orange-400';
      case 'condition':
        return 'border-purple-400';
      case 'ai_analysis':
        return 'border-purple-500';
      case 'theme_classifier':
        return 'border-blue-600';
      case 'alert':
        return 'border-red-400';
      case 'data_aggregator':
        return 'border-green-500';
      case 'loop':
        return 'border-orange-500';
      case 'branch':
        return 'border-cyan-500';
      default:
        return 'border-border';
    }
  };

  const getHoverTargetStyles = () => {
    if (!data.isHoverTarget) return '';
    
    // Create a glowing border effect based on overlap side
    const glowColor = data.overlapSide === 'right' || data.overlapSide === 'bottom' 
      ? 'shadow-green-500/50' 
      : 'shadow-blue-500/50';
    
    return `ring-2 ring-primary/60 shadow-lg ${glowColor} animate-pulse`;
  };
  
  const getErrorStyles = () => {
    if (!data.hasError) return '';
    
    return 'ring-2 ring-red-500/60 shadow-lg shadow-red-500/30 animate-pulse bg-red-50/10 dark:bg-red-950/20';
  };
  
  const getNodeIconColor = (type: string) => {
    if (data.hasError) {
      return 'text-red-500';
    }
    
    switch (type) {
      case 'start':
        return 'text-primary';
      case 'end':
        return 'text-gray-600';
      case 'prompt':
        return 'text-blue-400';
      case 'api':
        return 'text-accent';
      case 'rag':
        return 'text-chart-2';
      case 'merge':
        return 'text-orange-400';
      case 'condition':
        return 'text-purple-400';
      case 'ai_analysis':
        return 'text-purple-500';
      case 'theme_classifier':
        return 'text-blue-600';
      case 'alert':
        return 'text-red-400';
      case 'data_aggregator':
        return 'text-green-500';
      case 'loop':
        return 'text-orange-500';
      case 'branch':
        return 'text-cyan-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getNodeIcon = (type: string, colorClass?: string) => {
    const iconProps = { className: `w-4 h-4 ${colorClass || getNodeIconColor(type)}` };
    switch (type) {
      case 'start':
        return <Play {...iconProps} />;
      case 'end':
        return <StopCircle {...iconProps} />;
      case 'prompt':
        return <MessageSquare {...iconProps} />;
      case 'api':
        return <Bot {...iconProps} />;
      case 'rag':
        return <Search {...iconProps} />;
      case 'merge':
        return <Merge {...iconProps} />;
      case 'condition':
        return <GitBranch {...iconProps} />;
      case 'ai_analysis':
        return <Sparkles {...iconProps} />;
      case 'theme_classifier':
        return <Tags {...iconProps} />;
      case 'alert':
        return <Bell {...iconProps} />;
      case 'data_aggregator':
        return <Database {...iconProps} />;
      case 'loop':
        return <RefreshCw {...iconProps} />;
      case 'branch':
        return <GitBranch {...iconProps} />;
      default:
        return <Circle {...iconProps} />;
    }
  };

  const getStatusIcon = () => {
    if (!data.status || data.status === 'idle') return null;
    
    const iconProps = { className: "w-3 h-3" };
    switch (data.status) {
      case 'running':
        return <Loader2 {...iconProps} className="w-3 h-3 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircle {...iconProps} className="w-3 h-3 text-green-500" />;
      case 'error':
        return <XCircle {...iconProps} className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={`w-52 shadow-lg ${getNodeColor(data.config?.type || 'default', data.hasError, nodeStatus)} ${
              selected ? 'ring-2 ring-primary' : ''
            } ${getHoverTargetStyles()} ${getErrorStyles()} relative transition-all duration-200`}
            data-testid={`workflow-node-${data.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {/* Error Badge */}
            {data.hasError && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -left-2 z-20 min-w-[24px] h-5 text-xs px-1.5 py-0 bg-red-500 text-white font-medium animate-pulse"
                data-testid={`error-badge-${data.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <AlertTriangle className="w-3 h-3" />
              </Badge>
            )}
            {/* Execution Order Badge */}
            {data.executionIndex && !data.hasError && (
              <Badge
                variant="secondary"
                className="absolute -top-2 -right-2 z-10 min-w-[24px] h-5 text-xs px-1.5 py-0 bg-primary/90 text-primary-foreground font-medium"
                data-testid={`execution-order-${data.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {data.executionIndex}
              </Badge>
            )}
      
      <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center flex-1">
                <div className="mr-2">
                  {getNodeIcon(
                    data.config?.type || 'default',
                    data.hasError ? 'text-red-500' : undefined
                  )}
                </div>
                <span className={`text-sm font-medium flex-1 ${data.hasError ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                  {data.label}
                </span>
                <div className="flex items-center gap-1">
                  {getStatusIcon()}
                  {data.hasError && (
                    <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />
                  )}
                </div>
              </div>
          <div className="flex items-center space-x-1">
            {data.simulationMode && data.onExecuteNode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // nodeId는 워크플로우 에디터에서 data.id로 전달됨
                  const nodeId = (data as any).id || '';
                  if (nodeId) {
                    data.onExecuteNode?.(nodeId);
                  }
                }}
                className="w-6 h-6 p-0 text-green-600 hover:text-green-700"
                data-testid={`button-execute-${data.label.toLowerCase().replace(/\s+/g, '-')}`}
                disabled={nodeStatus === 'running'}
                title="노드 실행"
              >
                {nodeStatus === 'running' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </Button>
            )}
            {data.onConfig && (
              <Button
                variant="ghost"
                size="sm"
                onClick={data.onConfig}
                className="w-6 h-6 p-0"
                data-testid={`button-config-${data.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Settings className="w-3 h-3" />
              </Button>
            )}
            {data.onDelete && (
              <Button
                variant="ghost"
                size="sm" 
                onClick={data.onDelete}
                className="w-6 h-6 p-0 text-destructive hover:text-destructive"
                data-testid={`button-delete-${data.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        
        {data.description && (
          <div className="text-xs text-muted-foreground mb-3">{data.description}</div>
        )}
        
        {data.config && (
          <div className="space-y-1">
            {(() => {
              const configEntries = Object.entries(data.config).filter(([key]) => key !== 'type');
              const maxDisplayItems = 3;
              const displayEntries = configEntries.slice(0, maxDisplayItems);
              const remainingCount = configEntries.length - maxDisplayItems;
              
              return (
                <>
                  {displayEntries.map(([key, value]) => {
                    // Truncate long values
                    const valueStr = String(value);
                    const truncatedValue = valueStr.length > 30 
                      ? valueStr.substring(0, 30) + '...' 
                      : valueStr;
                    
                    return (
                      <div key={key} className="text-xs text-muted-foreground truncate" title={`${key}: ${valueStr}`}>
                        {key}: {truncatedValue}
                      </div>
                    );
                  })}
                  {remainingCount > 0 && (
                    <div className="text-xs text-muted-foreground italic">
                      +{remainingCount} more
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
        
        {(data.executionTime || data.executionResult?.executionTime) && (
          <div className="mt-2 flex items-center text-xs text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />
            {(data.executionResult?.executionTime || data.executionTime)?.toLocaleString()}ms
          </div>
        )}
        
        {data.executionResult && (
          <div className="mt-2 space-y-1">
            {data.executionResult.status === 'completed' && data.executionResult.output && (
              <div className="text-xs p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                <div className="font-medium text-green-700 dark:text-green-300 mb-1">실행 결과:</div>
                <div className="text-xs text-green-600 dark:text-green-400 max-h-20 overflow-y-auto">
                  {typeof data.executionResult.output === 'string' 
                    ? data.executionResult.output.substring(0, 100) + (data.executionResult.output.length > 100 ? '...' : '')
                    : JSON.stringify(data.executionResult.output, null, 2).substring(0, 200) + '...'
                  }
                </div>
              </div>
            )}
            {data.executionResult.status === 'failed' && data.executionResult.error && (
              <div className="text-xs p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                <div className="font-medium text-red-700 dark:text-red-300 mb-1">실행 오류:</div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  {data.executionResult.error}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary border-2 border-background"
        data-testid={`handle-target-${data.label.toLowerCase().replace(/\s+/g, '-')}`}
      />
      <Handle
        type="source"
        position={Position.Right} 
        className="w-3 h-3 bg-primary border-2 border-background"
        data-testid={`handle-source-${data.label.toLowerCase().replace(/\s+/g, '-')}`}
      />
          </Card>
        </TooltipTrigger>
        {data.hasError && data.errorInfo && (
          <TooltipContent 
            side="top" 
            className="max-w-sm p-3 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
            data-testid={`error-tooltip-${data.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="space-y-2">
              <div className="flex items-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-3 h-3 mr-2" />
                <span className="font-semibold text-sm">{data.errorInfo.type === 'cycle' ? '순환 참조' : data.errorInfo.type === 'isolated' ? '연결 끊김' : '워크플로우 오류'}</span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300">
                {data.errorInfo.userMessage}
              </p>
              {data.errorInfo.suggestions && data.errorInfo.suggestions.length > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  <span className="font-medium">해결방법:</span>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {data.errorInfo.suggestions.slice(0, 2).map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
