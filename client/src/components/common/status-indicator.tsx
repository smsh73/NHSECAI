import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: 'normal' | 'warning' | 'error' | 'active' | 'inactive';
  label: string;
  value?: string;
  animated?: boolean;
  className?: string;
}

export function StatusIndicator({ 
  status, 
  label, 
  value, 
  animated = false, 
  className 
}: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'normal':
      case 'active':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'inactive':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBgColor = () => {
    switch (status) {
      case 'normal':
      case 'active':
        return 'bg-green-900/20 text-green-300';
      case 'warning':
        return 'bg-yellow-900/20 text-yellow-300';
      case 'error':
        return 'bg-red-900/20 text-red-300';
      case 'inactive':
        return 'bg-gray-900/20 text-gray-300';
      default:
        return 'bg-gray-900/20 text-gray-300';
    }
  };

  // Icon-only mode for compact display
  if (className?.includes('w-') && !label) {
    return (
      <div 
        className={cn(
          "w-2 h-2 rounded-full",
          getStatusColor(),
          animated && "animate-pulse",
          className
        )} 
        data-testid={`status-icon-${status}`}
        title={status === 'normal' || status === 'active' ? '정상' : 
               status === 'warning' ? '경고' : 
               status === 'error' ? '오류' : '비활성'}
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)} data-testid={`status-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-2">
        <div 
          className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            getStatusColor(),
            animated && "animate-pulse"
          )} 
          title={status === 'normal' || status === 'active' ? '정상' : 
                 status === 'warning' ? '경고' : 
                 status === 'error' ? '오류' : '비활성'}
        />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      {value && (
        <span className="text-xs text-muted-foreground ml-4">{value}</span>
      )}
      {!value && !className?.includes('w-') && (
        <span className={cn(
          "inline-flex items-center px-2 py-1 rounded-full text-xs ml-4",
          getStatusBgColor()
        )}>
          {status === 'normal' || status === 'active' ? '정상' : 
           status === 'warning' ? '경고' : 
           status === 'error' ? '오류' : '비활성'}
        </span>
      )}
    </div>
  );
}
