import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, FileText, Download, RefreshCw, Search, Filter, X, BarChart3, Calendar, TrendingUp, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface AuditLog {
  id: string;
  event_type: string;
  event_category: string;
  severity: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  user_id?: string;
  username?: string;
  user_ip?: string;
  success: boolean;
  error_message?: string;
  execution_time_ms?: number;
  created_at: string;
  metadata?: any;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  threat_level: string;
  user_id?: string;
  username?: string;
  user_ip: string;
  description: string;
  source?: string;
  affected_resource?: string;
  mitigation_action?: string;
  created_at: string;
}

interface DataAccessLog {
  id: string;
  access_type: string;
  table_name: string;
  record_id?: string;
  data_classification: string;
  user_id: string;
  username: string;
  success: boolean;
  record_count?: number;
  created_at: string;
}

export default function AuditLogManagement() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("audit");
  const [searchQuery, setSearchQuery] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel' | 'pdf'>('csv');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    event_type: "all",
    severity: "all",
    username: "",
    success: "all",
    start_date: "",
    end_date: "",
    resource_type: "",
    resource_id: "",
    ip_address: "",
    action: "",
  });

  // 감사 로그 조회
  const { data: auditLogsData, isLoading: auditLoading, error: auditError, refetch: refetchAudit } = useQuery({
    queryKey: ['/api/audit-logs', filters],
    enabled: selectedTab === "audit",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.event_type && filters.event_type !== 'all') params.append('event_type', filters.event_type);
      if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
      if (filters.username) params.append('username', filters.username);
      if (filters.success && filters.success !== 'all' && filters.success !== '') params.append('success', filters.success);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const response = await apiRequest('GET', `/api/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`감사 로그 조회 실패: ${response.status}`);
      }
      const data = await response.json();
      return data.logs || data.data || [];
    },
    retry: 2,
    retryDelay: 1000
  });

  const auditLogs: AuditLog[] = auditLogsData || [];

  // 보안 이벤트 조회
  const { data: securityEventsData, isLoading: securityLoading, error: securityError, refetch: refetchSecurity } = useQuery({
    queryKey: ['/api/audit-logs/security-events', filters],
    enabled: selectedTab === "security",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.event_type && filters.event_type !== 'all') params.append('event_type', filters.event_type);
      if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
      if (filters.username) params.append('username', filters.username);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const response = await apiRequest('GET', `/api/audit-logs/security-events?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`보안 이벤트 조회 실패: ${response.status}`);
      }
      const data = await response.json();
      return data.events || data.data || [];
    },
    retry: 2,
    retryDelay: 1000
  });

  const securityEvents: SecurityEvent[] = securityEventsData || [];

  // 데이터 액세스 로그 조회
  const { data: accessLogsData, isLoading: accessLoading, error: accessError, refetch: refetchAccess } = useQuery({
    queryKey: ['/api/audit-logs/data-access', filters],
    enabled: selectedTab === "access",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.event_type && filters.event_type !== 'all') params.append('access_type', filters.event_type);
      if (filters.username) params.append('username', filters.username);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const response = await apiRequest('GET', `/api/audit-logs/data-access?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`데이터 액세스 로그 조회 실패: ${response.status}`);
      }
      const data = await response.json();
      return data.logs || data.data || [];
    },
    retry: 2,
    retryDelay: 1000
  });

  const accessLogs: DataAccessLog[] = accessLogsData || [];

  // Filter logs based on search query
  const filteredAuditLogs = useMemo(() => {
    if (!searchQuery) return auditLogs;
    const query = searchQuery.toLowerCase();
    return auditLogs.filter(log => 
      log.event_type?.toLowerCase().includes(query) ||
      log.action?.toLowerCase().includes(query) ||
      log.username?.toLowerCase().includes(query) ||
      log.resource_type?.toLowerCase().includes(query) ||
      log.resource_id?.toLowerCase().includes(query) ||
      log.error_message?.toLowerCase().includes(query) ||
      log.user_ip?.toLowerCase().includes(query)
    );
  }, [auditLogs, searchQuery]);

  const filteredSecurityEvents = useMemo(() => {
    if (!searchQuery) return securityEvents;
    const query = searchQuery.toLowerCase();
    return securityEvents.filter(event =>
      event.event_type?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.username?.toLowerCase().includes(query) ||
      event.user_ip?.toLowerCase().includes(query) ||
      event.threat_level?.toLowerCase().includes(query)
    );
  }, [securityEvents, searchQuery]);

  const filteredAccessLogs = useMemo(() => {
    if (!searchQuery) return accessLogs;
    const query = searchQuery.toLowerCase();
    return accessLogs.filter(log =>
      log.access_type?.toLowerCase().includes(query) ||
      log.table_name?.toLowerCase().includes(query) ||
      log.username?.toLowerCase().includes(query) ||
      log.data_classification?.toLowerCase().includes(query)
    );
  }, [accessLogs, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const currentLogs = selectedTab === 'audit' ? filteredAuditLogs :
                       selectedTab === 'security' ? filteredSecurityEvents :
                       filteredAccessLogs;
    
    const total = currentLogs.length;
    const successful = currentLogs.filter((log: any) => log.success === true || log.success === 'true').length;
    const failed = total - successful;
    const critical = currentLogs.filter((log: any) => 
      log.severity === 'CRITICAL' || log.threat_level === 'CRITICAL'
    ).length;
    
    return {
      total,
      successful,
      failed,
      critical,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : '0',
    };
  }, [selectedTab, filteredAuditLogs, filteredSecurityEvents, filteredAccessLogs]);

  // Show error toast when API calls fail
  useEffect(() => {
    if (auditError) {
      toast({
        title: "감사 로그 조회 실패",
        description: auditError instanceof Error ? auditError.message : "감사 로그를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
    if (securityError) {
      toast({
        title: "보안 이벤트 조회 실패",
        description: securityError instanceof Error ? securityError.message : "보안 이벤트를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
    if (accessError) {
      toast({
        title: "데이터 액세스 로그 조회 실패",
        description: accessError instanceof Error ? accessError.message : "데이터 액세스 로그를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [auditError, securityError, accessError, toast]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      case 'HIGH':
        return 'bg-orange-500 text-white';
      case 'MEDIUM':
        return 'bg-yellow-500 text-white';
      case 'LOW':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN':
      case 'LOGOUT':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'SECURITY_EVENT':
      case 'BREACH_ATTEMPT':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'UNAUTHORIZED_ACCESS':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleExport = async (exportFmt: 'json' | 'csv' | 'excel' | 'pdf' = exportFormat) => {
    try {
      const currentLogs = selectedTab === 'audit' ? filteredAuditLogs :
                         selectedTab === 'security' ? filteredSecurityEvents :
                         filteredAccessLogs;
      
      if (currentLogs.length === 0) {
        toast({
          title: "내보내기 실패",
          description: "내보낼 로그가 없습니다.",
          variant: "destructive",
        });
        return;
      }

      let content = '';
      let filename = `audit-logs-${selectedTab}-${format(new Date(), 'yyyy-MM-dd')}`;
      let mimeType = 'text/plain';

      if (exportFmt === 'json') {
        content = JSON.stringify(currentLogs, null, 2);
        filename += '.json';
        mimeType = 'application/json';
      } else if (exportFmt === 'csv') {
        const rows: string[][] = [];
        
        if (selectedTab === 'audit') {
          rows.push(['시간', '이벤트 타입', '액션', '사용자', '리소스 타입', '리소스 ID', '심각도', '결과', '실행시간(ms)', '에러 메시지']);
          filteredAuditLogs.forEach(log => {
            rows.push([
              format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
              log.event_type || '',
              log.action || '',
              log.username || '',
              log.resource_type || '',
              log.resource_id || '',
              log.severity || '',
              log.success ? '성공' : '실패',
              log.execution_time_ms?.toString() || '',
              log.error_message || '',
            ]);
          });
        } else if (selectedTab === 'security') {
          rows.push(['시간', '이벤트 타입', '위협 수준', '사용자', 'IP 주소', '설명', '대응']);
          filteredSecurityEvents.forEach(event => {
            rows.push([
              format(new Date(event.created_at), 'yyyy-MM-dd HH:mm:ss'),
              event.event_type || '',
              event.threat_level || '',
              event.username || '',
              event.user_ip || '',
              event.description || '',
              event.mitigation_action || '',
            ]);
          });
        } else if (selectedTab === 'access') {
          rows.push(['시간', '액세스 타입', '테이블명', '사용자', '데이터 분류', '레코드 수', '결과']);
          filteredAccessLogs.forEach(log => {
            rows.push([
              format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
              log.access_type || '',
              log.table_name || '',
              log.username || '',
              log.data_classification || '',
              log.record_count?.toString() || '',
              log.success ? '성공' : '실패',
            ]);
          });
        }
        
        content = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        filename += '.csv';
        mimeType = 'text/csv';
      } else if (exportFmt === 'excel') {
        // Excel format - generate CSV with UTF-8 BOM for Excel compatibility
        const rowsExcel: string[][] = [];
        if (selectedTab === 'audit') {
          rowsExcel.push(['시간', '이벤트 타입', '액션', '사용자', '리소스 타입', '리소스 ID', '심각도', '결과', '실행시간(ms)', '에러 메시지']);
          filteredAuditLogs.forEach(log => {
            rowsExcel.push([
              format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
              log.event_type || '',
              log.action || '',
              log.username || '',
              log.resource_type || '',
              log.resource_id || '',
              log.severity || '',
              log.success ? '성공' : '실패',
              log.execution_time_ms?.toString() || '',
              log.error_message || '',
            ]);
          });
        } else if (selectedTab === 'security') {
          rowsExcel.push(['시간', '이벤트 타입', '위협 수준', '사용자', 'IP 주소', '설명', '대응']);
          filteredSecurityEvents.forEach(event => {
            rowsExcel.push([
              format(new Date(event.created_at), 'yyyy-MM-dd HH:mm:ss'),
              event.event_type || '',
              event.threat_level || '',
              event.username || '',
              event.user_ip || '',
              event.description || '',
              event.mitigation_action || '',
            ]);
          });
        } else if (selectedTab === 'access') {
          rowsExcel.push(['시간', '액세스 타입', '테이블명', '사용자', '데이터 분류', '레코드 수', '결과']);
          filteredAccessLogs.forEach(log => {
            rowsExcel.push([
              format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
              log.access_type || '',
              log.table_name || '',
              log.username || '',
              log.data_classification || '',
              log.record_count?.toString() || '',
              log.success ? '성공' : '실패',
            ]);
          });
        }
        const csvContent = rowsExcel.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        content = '\ufeff' + csvContent;
        filename += '.csv';
        mimeType = 'application/vnd.ms-excel';
      } else if (exportFmt === 'pdf') {
        // PDF format - for now, export as JSON or CSV
        // In a real implementation, you would use a PDF generation library
        toast({
          title: "PDF 내보내기",
          description: "PDF 내보내기는 현재 지원되지 않습니다. CSV 형식으로 내보내기 됩니다.",
        });
        await handleExport('csv');
        return;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "내보내기 완료",
        description: `${currentLogs.length}개의 로그가 ${exportFmt.toUpperCase()} 형식으로 내보내졌습니다.`,
      });
      
      setExportDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "내보내기 실패",
        description: error.message || "로그 내보내기 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      event_type: "all",
      severity: "all",
      username: "",
      success: "all",
      start_date: "",
      end_date: "",
      resource_type: "",
      resource_id: "",
      ip_address: "",
      action: "",
    });
    setSearchQuery("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">감사 로그 관리</h1>
          <p className="text-muted-foreground">시스템 전반의 감사 로그, 보안 이벤트, 데이터 액세스 로그를 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                내보내기
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>로그 내보내기</DialogTitle>
                <DialogDescription>
                  {selectedTab === 'audit' ? filteredAuditLogs.length :
                   selectedTab === 'security' ? filteredSecurityEvents.length :
                   filteredAccessLogs.length}개의 로그를 내보냅니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>내보내기 형식</Label>
                  <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel (CSV)</SelectItem>
                      <SelectItem value="pdf">PDF (준비 중)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={() => handleExport(exportFormat)}>
                    <Download className="mr-2 h-4 w-4" />
                    내보내기
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => {
            refetchAudit();
            refetchSecurity();
            refetchAccess();
          }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 로그 수</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">성공률</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">성공</p>
                <p className="text-2xl font-bold">{stats.successful}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">중요도</p>
                <p className="text-2xl font-bold">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>필터</CardTitle>
              <CardDescription>조건을 선택하여 로그를 필터링합니다</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}>
                <Filter className="mr-2 h-4 w-4" />
                고급 필터
              </Button>
              {(filters.event_type || filters.severity || filters.username || filters.success || filters.start_date || filters.end_date || filters.resource_type || filters.resource_id || filters.ip_address || filters.action || searchQuery) && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <X className="mr-2 h-4 w-4" />
                  초기화
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="검색... (이벤트 타입, 액션, 사용자명, 리소스, IP 등)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Select
              value={filters.event_type}
              onValueChange={(value) => setFilters({ ...filters, event_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="이벤트 타입" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="LOGIN">로그인</SelectItem>
                <SelectItem value="LOGOUT">로그아웃</SelectItem>
                <SelectItem value="CREATE">생성</SelectItem>
                <SelectItem value="UPDATE">수정</SelectItem>
                <SelectItem value="DELETE">삭제</SelectItem>
                <SelectItem value="EXECUTE">실행</SelectItem>
                <SelectItem value="SECURITY_EVENT">보안 이벤트</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.severity}
              onValueChange={(value) => setFilters({ ...filters, severity: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="심각도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="사용자명"
              value={filters.username}
              onChange={(e) => setFilters({ ...filters, username: e.target.value })}
            />

            <Select
              value={filters.success}
              onValueChange={(value) => setFilters({ ...filters, success: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="결과" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="true">성공</SelectItem>
                <SelectItem value="false">실패</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="시작 날짜"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />

            <Input
              type="date"
              placeholder="종료 날짜"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
          </div>
          
          {/* Advanced Filters */}
          {advancedFiltersOpen && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <Label>리소스 타입</Label>
                <Input
                  placeholder="리소스 타입"
                  value={filters.resource_type}
                  onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
                />
              </div>
              <div>
                <Label>리소스 ID</Label>
                <Input
                  placeholder="리소스 ID"
                  value={filters.resource_id}
                  onChange={(e) => setFilters({ ...filters, resource_id: e.target.value })}
                />
              </div>
              <div>
                <Label>IP 주소</Label>
                <Input
                  placeholder="IP 주소"
                  value={filters.ip_address}
                  onChange={(e) => setFilters({ ...filters, ip_address: e.target.value })}
                />
              </div>
              <div>
                <Label>액션</Label>
                <Input
                  placeholder="액션"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="audit">감사 로그</TabsTrigger>
          <TabsTrigger value="security">보안 이벤트</TabsTrigger>
          <TabsTrigger value="access">데이터 액세스</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>감사 로그</CardTitle>
              <CardDescription>시스템 전반의 모든 감사 이벤트</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>이벤트</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>리소스</TableHead>
                        <TableHead>심각도</TableHead>
                        <TableHead>결과</TableHead>
                        <TableHead>소요 시간</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditLogs?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            로그가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAuditLogs?.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEventIcon(log.event_type)}
                              <span>{log.action}</span>
                            </div>
                          </TableCell>
                          <TableCell>{log.username || '-'}</TableCell>
                          <TableCell>
                            {log.resource_type ? `${log.resource_type}: ${log.resource_id}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(log.severity)}>
                              {log.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.success ? (
                              <Badge className="bg-green-500 text-white">성공</Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white">실패</Badge>
                            )}
                          </TableCell>
                          <TableCell>{log.execution_time_ms ? `${log.execution_time_ms}ms` : '-'}</TableCell>
                        </TableRow>
                      )))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>보안 이벤트</CardTitle>
              <CardDescription>보안 관련 이상 징후 및 위협 이벤트</CardDescription>
            </CardHeader>
            <CardContent>
              {securityLoading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>이벤트 타입</TableHead>
                        <TableHead>위협 수준</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>설명</TableHead>
                        <TableHead>대응</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSecurityEvents?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            이벤트가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSecurityEvents?.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            {format(new Date(event.created_at), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEventIcon(event.event_type)}
                              <span>{event.event_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(event.threat_level)}>
                              {event.threat_level}
                            </Badge>
                          </TableCell>
                          <TableCell>{event.username || event.user_ip}</TableCell>
                          <TableCell>{event.description}</TableCell>
                          <TableCell>
                            {event.mitigation_action && (
                              <Badge variant="outline">{event.mitigation_action}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>데이터 액세스 로그</CardTitle>
              <CardDescription>데이터베이스 테이블 접근 이력</CardDescription>
            </CardHeader>
            <CardContent>
              {accessLoading ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>액세스 타입</TableHead>
                        <TableHead>테이블명</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>분류</TableHead>
                        <TableHead>레코드 수</TableHead>
                        <TableHead>결과</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccessLogs?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            로그가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAccessLogs?.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.access_type}</Badge>
                          </TableCell>
                          <TableCell>{log.table_name}</TableCell>
                          <TableCell>{log.username}</TableCell>
                          <TableCell>
                            <Badge className={
                              log.data_classification === 'SECRET' ? 'bg-red-500' :
                              log.data_classification === 'CONFIDENTIAL' ? 'bg-orange-500' :
                              'bg-blue-500'
                            }>
                              {log.data_classification}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.record_count || '-'}</TableCell>
                          <TableCell>
                            {log.success ? (
                              <Badge className="bg-green-500 text-white">성공</Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white">실패</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
