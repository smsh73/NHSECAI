import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, RefreshCw, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivityLog {
  timestamp: string;
  type: string;
  action: string;
  details: Record<string, any>;
}

export default function LogsViewer() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { data: logFiles, isLoading: filesLoading, refetch: refetchFiles } = useQuery<{ files: string[] }>({
    queryKey: ['/api/logs/files'],
  });

  const { data: recentLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{ logs: string[] }>({
    queryKey: ['/api/logs/recent'],
  });

  const { data: activityLogs, isLoading: activityLogsLoading, refetch: refetchActivityLogs } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs'],
  });

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`/api/logs/download/${filename}`);
      
      if (!response.ok) {
        throw new Error('Failed to download log file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "다운로드 완료",
        description: `${filename} 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "로그 파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    refetchFiles();
    refetchLogs();
    refetchActivityLogs();
    toast({
      title: "새로고침 완료",
      description: "로그 목록이 업데이트되었습니다.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">시스템 로그 뷰어</h1>
          <p className="text-muted-foreground mt-2">
            에러 로그 및 활동 로그를 확인하고 다운로드할 수 있습니다
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-logs">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      <Tabs defaultValue="errors" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="errors" data-testid="tab-errors">에러 로그</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">활동 로그</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Log Files List */}
        <Card data-testid="card-log-files">
          <CardHeader>
            <CardTitle>로그 파일 목록</CardTitle>
            <CardDescription>
              {logFiles?.files.length || 0}개의 로그 파일이 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {logFiles?.files.map((file) => (
                    <div
                      key={file}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => setSelectedFile(file)}
                      data-testid={`log-file-${file}`}
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{file}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                        data-testid={`button-download-${file}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {logFiles?.files.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                      로그 파일이 없습니다
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs Preview */}
        <Card data-testid="card-recent-logs">
          <CardHeader>
            <CardTitle>최근 에러 로그</CardTitle>
            <CardDescription>
              가장 최근 {recentLogs?.logs.length || 0}개의 에러 로그
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {recentLogs?.logs.map((log, index) => {
                    // Parse log to identify error codes, stack traces, and metadata
                    const hasErrorCode = log.includes('errorCode:') || log.includes('Error Code:');
                    const hasStack = log.includes('Stack:');
                    const hasMetadata = log.includes('Metadata:');
                    
                    return (
                      <div
                        key={index}
                        className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        data-testid={`log-entry-${index}`}
                      >
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                          {log}
                        </pre>
                        {(hasErrorCode || hasStack || hasMetadata) && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <div className="flex gap-2 flex-wrap">
                              {hasErrorCode && (
                                <Badge variant="destructive" className="text-xs">
                                  에러 코드 포함
                                </Badge>
                              )}
                              {hasStack && (
                                <Badge variant="outline" className="text-xs">
                                  스택 트레이스 포함
                                </Badge>
                              )}
                              {hasMetadata && (
                                <Badge variant="secondary" className="text-xs">
                                  상세 정보 포함
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {recentLogs?.logs.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                      에러 로그가 없습니다
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

          {/* Log Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">총 로그 파일</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{logFiles?.files.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">저장된 로그 파일 수</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">최근 에러</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentLogs?.logs.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">최근 100개 로그 항목</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">상태</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="default" className="text-sm">
                  정상 작동 중
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">로깅 시스템 활성화됨</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card data-testid="card-activity-logs">
            <CardHeader>
              <CardTitle>활동 로그</CardTitle>
              <CardDescription>
                시스템 활동, 설정 확인, 워크플로우 실행 및 API 호출 로그
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {activityLogs?.map((log, index) => {
                      // Check if log contains error information
                      const hasError = log.details?.error || log.details?.errorCode || log.details?.errorName;
                      const hasStack = log.details?.stack;
                      
                      return (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                            hasError ? 'border-destructive/50 bg-destructive/5' : ''
                          }`}
                          data-testid={`activity-log-${index}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Activity className={`w-4 h-4 ${hasError ? 'text-destructive' : 'text-primary'}`} />
                              <Badge variant={hasError ? "destructive" : "outline"} className="text-xs">
                                {log.type}
                              </Badge>
                              <span className="text-sm font-medium">{log.action}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          
                          {/* Error Information Badges */}
                          {hasError && (
                            <div className="pl-6 mb-2 flex gap-2 flex-wrap">
                              {log.details.errorCode && (
                                <Badge variant="destructive" className="text-xs">
                                  코드: {log.details.errorCode}
                                </Badge>
                              )}
                              {log.details.errorName && (
                                <Badge variant="outline" className="text-xs">
                                  {log.details.errorName}
                                </Badge>
                              )}
                              {hasStack && (
                                <Badge variant="secondary" className="text-xs">
                                  스택 트레이스 있음
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {/* Details */}
                          <div className="pl-6">
                            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      );
                    })}
                    {activityLogs?.length === 0 && (
                      <div className="text-center p-8 text-muted-foreground">
                        활동 로그가 없습니다
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Activity Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">총 활동</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityLogs?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">최근 100개 활동</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">워크플로우</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activityLogs?.filter(log => log.type === 'workflow').length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">워크플로우 실행</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">API 호출</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activityLogs?.filter(log => log.type === 'api').length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">API 요청</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">설정 확인</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activityLogs?.filter(log => log.type === 'config_check').length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">환경변수 확인</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
