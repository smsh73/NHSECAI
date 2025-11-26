import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ReportQualityMetrics, 
  FeedbackLog, 
  QualityImprovements 
} from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  MessageSquare,
  RefreshCw,
  Download,
  Filter,
  ChevronRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  Activity,
} from "lucide-react";
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";

// Type helpers to handle nullable decimal fields from Drizzle
type WithNumberFields<T> = Omit<T, 'accuracyScore' | 'relevanceScore' | 'completenessScore' | 'timelinessScore' | 'readabilityScore' | 'overallScore'> & {
  accuracyScore: number;
  relevanceScore: number;
  completenessScore: number;
  timelinessScore: number;
  readabilityScore: number;
  overallScore: number;
};

type QualityMetricsDisplay = WithNumberFields<ReportQualityMetrics>;

export default function QualityDashboard() {
  const [selectedReportType, setSelectedReportType] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("week");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<QualityMetricsDisplay | null>(null);
  const { toast } = useToast();

  // Fetch quality metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics} = useQuery<QualityMetricsDisplay[]>({
    queryKey: ["/api/quality/metrics", selectedReportType],
    queryFn: async () => {
      const params = selectedReportType !== "all" ? `?reportType=${selectedReportType}` : "";
      const res = await apiRequest('GET', `/api/quality/metrics${params}`);
      const response: ReportQualityMetrics[] = await res.json();
      // Convert decimal strings to numbers
      return response.map(m => ({
        ...m,
        accuracyScore: Number(m.accuracyScore || 0),
        relevanceScore: Number(m.relevanceScore || 0),
        completenessScore: Number(m.completenessScore || 0),
        timelinessScore: Number(m.timelinessScore || 0),
        readabilityScore: Number(m.readabilityScore || 0),
        overallScore: Number(m.overallScore || 0),
      }));
    },
  });

  // Fetch quality trends
  const { data: trends, isLoading: trendsLoading } = useQuery<any[]>({
    queryKey: ["/api/quality/trends", selectedPeriod, selectedReportType],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("period", selectedPeriod);
      if (selectedReportType !== "all") {
        params.append("reportType", selectedReportType);
      }
      const res = await apiRequest('GET', `/api/quality/trends?${params}`);
      return await res.json();
    },
  });

  // Fetch feedback list
  const { data: feedbackList, refetch: refetchFeedback } = useQuery<FeedbackLog[]>({
    queryKey: ["/api/quality/feedback"],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/quality/feedback?limit=50');
      return await res.json();
    },
  });

  // Fetch improvement suggestions
  const { data: improvements } = useQuery<QualityImprovements[]>({
    queryKey: ["/api/quality/improvements"],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/quality/improvements');
      return await res.json();
    },
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedback: any) => {
      return await apiRequest('POST', '/api/quality/feedback', feedback);
    },
    onSuccess: () => {
      toast({
        title: "피드백 제출 완료",
        description: "소중한 피드백 감사합니다.",
      });
      setShowFeedbackDialog(false);
      refetchFeedback();
      refetchMetrics();
    },
    onError: () => {
      toast({
        title: "피드백 제출 실패",
        description: "다시 시도해 주세요.",
        variant: "destructive",
      });
    },
  });

  // Evaluate report mutation
  const evaluateReportMutation = useMutation({
    mutationFn: async (report: any) => {
      return await apiRequest('POST', '/api/quality/evaluate', report);
    },
    onSuccess: () => {
      toast({
        title: "품질 평가 완료",
        description: "보고서 품질 평가가 완료되었습니다.",
      });
      refetchMetrics();
    },
    onError: () => {
      toast({
        title: "평가 실패",
        description: "다시 시도해 주세요.",
        variant: "destructive",
      });
    },
  });

  // Calculate average scores
  const averageScores = metrics?.length ? {
    accuracy: metrics.reduce((sum, m) => sum + (m.accuracyScore || 0), 0) / metrics.length,
    relevance: metrics.reduce((sum, m) => sum + (m.relevanceScore || 0), 0) / metrics.length,
    completeness: metrics.reduce((sum, m) => sum + (m.completenessScore || 0), 0) / metrics.length,
    timeliness: metrics.reduce((sum, m) => sum + (m.timelinessScore || 0), 0) / metrics.length,
    readability: metrics.reduce((sum, m) => sum + (m.readabilityScore || 0), 0) / metrics.length,
    overall: metrics.reduce((sum, m) => sum + (m.overallScore || 0), 0) / metrics.length,
  } : null;

  // Prepare radar chart data
  const radarData = averageScores ? [
    { metric: "정확성", score: averageScores.accuracy * 100, fullMark: 100 },
    { metric: "관련성", score: averageScores.relevance * 100, fullMark: 100 },
    { metric: "완전성", score: averageScores.completeness * 100, fullMark: 100 },
    { metric: "시의성", score: averageScores.timeliness * 100, fullMark: 100 },
    { metric: "가독성", score: averageScores.readability * 100, fullMark: 100 },
  ] : [];

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return { text: "우수", variant: "default" as const };
    if (score >= 0.6) return { text: "보통", variant: "secondary" as const };
    return { text: "개선필요", variant: "destructive" as const };
  };

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-quality-dashboard">품질 평가 대시보드</h1>
          <p className="text-muted-foreground mt-2">
            시황 보고서 품질 모니터링 및 피드백 관리
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => refetchMetrics()} 
            variant="outline"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>보고서 유형</Label>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="news_analysis">뉴스 분석</SelectItem>
                  <SelectItem value="market_report">시장 보고서</SelectItem>
                  <SelectItem value="theme_summary">테마 요약</SelectItem>
                  <SelectItem value="morning_briefing">모닝 브리핑</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>기간</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger data-testid="select-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">일간</SelectItem>
                  <SelectItem value="week">주간</SelectItem>
                  <SelectItem value="month">월간</SelectItem>
                  <SelectItem value="quarter">분기</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">평균 품질 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(averageScores?.overall || 0)}`} data-testid="text-avg-score">
                {averageScores ? `${(averageScores.overall * 100).toFixed(1)}%` : "-"}
              </span>
              {averageScores && (
                <Badge {...getScoreBadge(averageScores.overall)} data-testid="badge-score-status">
                  {getScoreBadge(averageScores.overall).text}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">평가된 보고서</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="text-report-count">
                {metrics?.length || 0}
              </span>
              <span className="text-sm text-muted-foreground">건</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">사용자 피드백</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="text-feedback-count">
                {feedbackList?.length || 0}
              </span>
              <span className="text-sm text-muted-foreground">건</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">개선 제안</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="text-improvement-count">
                {improvements?.filter(i => i.implementationStatus === 'pending').length || 0}
              </span>
              <span className="text-sm text-muted-foreground">건 대기중</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList data-testid="tabs-main">
          <TabsTrigger value="overview">품질 개요</TabsTrigger>
          <TabsTrigger value="reports">보고서별 평가</TabsTrigger>
          <TabsTrigger value="feedback">피드백</TabsTrigger>
          <TabsTrigger value="improvements">개선 제안</TabsTrigger>
          <TabsTrigger value="trends">트렌드 분석</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>품질 지표 분포</CardTitle>
                <CardDescription>각 품질 지표별 평균 점수</CardDescription>
              </CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar 
                        name="점수" 
                        dataKey="score" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.6} 
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    데이터가 없습니다
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>점수 분포</CardTitle>
                <CardDescription>보고서별 전체 점수 분포</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics && metrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={[
                        { range: '0-20%', count: metrics.filter(m => m.overallScore < 0.2).length },
                        { range: '20-40%', count: metrics.filter(m => m.overallScore >= 0.2 && m.overallScore < 0.4).length },
                        { range: '40-60%', count: metrics.filter(m => m.overallScore >= 0.4 && m.overallScore < 0.6).length },
                        { range: '60-80%', count: metrics.filter(m => m.overallScore >= 0.6 && m.overallScore < 0.8).length },
                        { range: '80-100%', count: metrics.filter(m => m.overallScore >= 0.8).length },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    데이터가 없습니다
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Low Score Reports */}
          {metrics && metrics.filter(m => m.overallScore < 0.6).length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>주의:</strong> {metrics.filter(m => m.overallScore < 0.6).length}개의 보고서가 
                품질 기준(60%) 미달입니다. 개선이 필요합니다.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="space-y-4">
            {metricsLoading ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex justify-center">
                    <RefreshCw className="animate-spin" />
                  </div>
                </CardContent>
              </Card>
            ) : metrics && metrics.length > 0 ? (
              metrics.map((metric) => (
                <Card key={metric.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          보고서 #{metric.reportId.slice(0, 8)}
                        </CardTitle>
                        <CardDescription>
                          {metric.reportType} | {metric.evaluatedAt ? format(new Date(metric.evaluatedAt), 'PPpp', { locale: ko }) : 'Date not available'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge {...getScoreBadge(metric.overallScore)} data-testid={`badge-report-${metric.id}`}>
                          {(metric.overallScore * 100).toFixed(0)}%
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(metric);
                            setShowFeedbackDialog(true);
                          }}
                          data-testid={`button-feedback-${metric.id}`}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          피드백
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">정확성</p>
                        <Progress value={metric.accuracyScore * 100} className="mt-1" />
                        <p className="text-xs mt-1">{(metric.accuracyScore * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">관련성</p>
                        <Progress value={metric.relevanceScore * 100} className="mt-1" />
                        <p className="text-xs mt-1">{(metric.relevanceScore * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">완전성</p>
                        <Progress value={metric.completenessScore * 100} className="mt-1" />
                        <p className="text-xs mt-1">{(metric.completenessScore * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">시의성</p>
                        <Progress value={metric.timelinessScore * 100} className="mt-1" />
                        <p className="text-xs mt-1">{(metric.timelinessScore * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">가독성</p>
                        <Progress value={metric.readabilityScore * 100} className="mt-1" />
                        <p className="text-xs mt-1">{(metric.readabilityScore * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    {metric.userRating && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-muted-foreground">사용자 평점:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-4 h-4 ${star <= metric.userRating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {metric.improvementSuggestions && Array.isArray(metric.improvementSuggestions) && metric.improvementSuggestions.length > 0 ? (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-2">개선 제안:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {metric.improvementSuggestions.slice(0, 3).map((suggestion: any, index: number) => (
                            <li key={index} className="flex items-start gap-1">
                              <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{suggestion.description || suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">평가된 보고서가 없습니다</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="space-y-4">
            {feedbackList && feedbackList.length > 0 ? (
              feedbackList.map((feedback) => (
                <Card key={feedback.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {feedback.feedbackType === 'positive' && <ThumbsUp className="w-4 h-4 text-green-600" />}
                        {feedback.feedbackType === 'negative' && <ThumbsDown className="w-4 h-4 text-red-600" />}
                        <CardTitle className="text-base">
                          {feedback.entityType} - {feedback.entityId.slice(0, 8)}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {feedback.priority === 'high' && (
                          <Badge variant="destructive" data-testid={`badge-priority-${feedback.id}`}>긴급</Badge>
                        )}
                        {feedback.resolutionStatus === 'resolved' ? (
                          <Badge variant="outline" data-testid={`badge-status-${feedback.id}`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            해결됨
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-status-${feedback.id}`}>
                            대기중
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {feedback.createdAt ? format(new Date(feedback.createdAt), 'PPpp', { locale: ko }) : 'Date not available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{feedback.feedbackText || ''}</p>
                    {feedback.feedbackScore && (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-sm text-muted-foreground">평점:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-3 h-3 ${star <= feedback.feedbackScore! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">피드백이 없습니다</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Improvements Tab */}
        <TabsContent value="improvements" className="space-y-4">
          <div className="space-y-4">
            {improvements && improvements.length > 0 ? (
              improvements.map((improvement) => (
                <Card key={improvement.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          {improvement.description}
                        </CardTitle>
                        <CardDescription>
                          {improvement.improvementType} | 예상 효과: {improvement.expectedOutcome || '미정'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={improvement.priority === 'high' ? 'destructive' : 'secondary'}
                          data-testid={`badge-improvement-${improvement.id}`}
                        >
                          {improvement.priority === 'high' ? '높음' : '보통'}
                        </Badge>
                        <Badge 
                          variant={improvement.implementationStatus === 'completed' ? 'default' : 'outline'}
                          data-testid={`badge-impl-status-${improvement.id}`}
                        >
                          {improvement.implementationStatus === 'completed' ? '완료' : '대기중'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {improvement.metrics ? (
                    <CardContent>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(improvement.metrics, null, 2)}
                      </pre>
                    </CardContent>
                  ) : null}
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">개선 제안이 없습니다</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>품질 트렌드</CardTitle>
              <CardDescription>시간별 품질 점수 변화 추이</CardDescription>
            </CardHeader>
            <CardContent>
              {trends && Array.isArray(trends) && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="overallScore" 
                      stroke="#8884d8" 
                      name="전체 점수"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="accuracyScore" 
                      stroke="#82ca9d" 
                      name="정확성"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="relevanceScore" 
                      stroke="#ffc658" 
                      name="관련성"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  트렌드 데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>피드백 제출</DialogTitle>
            <DialogDescription>
              이 보고서에 대한 피드백을 남겨주세요
            </DialogDescription>
          </DialogHeader>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              submitFeedbackMutation.mutate({
                entityType: 'report',
                entityId: selectedReport?.reportId || '',
                feedbackType: formData.get('type'),
                feedbackScore: parseInt(formData.get('rating') as string),
                feedbackText: formData.get('text'),
                feedbackCategory: 'quality',
                priority: 'normal',
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="feedback-type">피드백 유형</Label>
              <select 
                name="type" 
                id="feedback-type"
                defaultValue="neutral"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid="select-feedback-type"
              >
                <option value="positive">긍정적</option>
                <option value="neutral">중립</option>
                <option value="negative">부정적</option>
              </select>
            </div>
            <div>
              <Label htmlFor="feedback-rating">평점</Label>
              <select 
                name="rating" 
                id="feedback-rating"
                defaultValue="3"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid="select-rating"
              >
                <option value="5">⭐⭐⭐⭐⭐ 매우 만족</option>
                <option value="4">⭐⭐⭐⭐ 만족</option>
                <option value="3">⭐⭐⭐ 보통</option>
                <option value="2">⭐⭐ 불만족</option>
                <option value="1">⭐ 매우 불만족</option>
              </select>
            </div>
            <div>
              <Label htmlFor="text">피드백 내용</Label>
              <Textarea 
                name="text" 
                placeholder="개선이 필요한 부분이나 좋았던 점을 알려주세요" 
                rows={4}
                data-testid="input-feedback-text"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowFeedbackDialog(false)}
                data-testid="button-cancel-feedback"
              >
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={submitFeedbackMutation.isPending}
                data-testid="button-submit-feedback"
              >
                {submitFeedbackMutation.isPending ? "제출 중..." : "제출"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}