import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Settings,
  Shield,
  Sparkles,
  Target,
  Sliders,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Zap,
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  MessageSquare,
  Globe,
  Lock,
  Unlock,
  Info,
  History,
  RefreshCw,
} from "lucide-react";

// Mock data types for development
interface GuardrailSettings {
  id: string;
  name: string;
  description: string;
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  portfolioConcentrationLimit: number;
  investmentLimits: {
    minAmount: number;
    maxAmount: number;
  };
  isActive: boolean;
  disclaimer: string;
  prohibitedRecommendations: string[];
}

interface RecommendationSettings {
  id: string;
  name: string;
  mcdaWeights: {
    riskAlignment: number;
    expenseRatio: number;
    liquidity: number;
    diversification: number;
    trackingDifference: number;
    taxEfficiency: number;
    performance: number;
  };
  maxRecommendations: number;
  minScore: number;
  filteringCriteria: {
    assetClass: string[];
    region: string[];
    maxExpenseRatio: number;
    minAum: number;
    minLiquidity: number;
  };
  isActive: boolean;
}

interface AIModelSettings {
  id: string;
  name: string;
  modelRef: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  responseLength: 'short' | 'medium' | 'long';
  isActive: boolean;
}

// Form schemas
const guardrailFormSchema = z.object({
  riskThresholds: z.object({
    low: z.number().min(0).max(10),
    medium: z.number().min(0).max(10),
    high: z.number().min(0).max(10),
  }),
  portfolioConcentrationLimit: z.number().min(0).max(100),
  investmentLimits: z.object({
    minAmount: z.number().min(0),
    maxAmount: z.number().min(0),
  }),
  isActive: z.boolean(),
  disclaimer: z.string().min(10).max(500),
  prohibitedRecommendations: z.array(z.string()).optional(),
});

const recommendationFormSchema = z.object({
  mcdaWeights: z.object({
    riskAlignment: z.number().min(0).max(1),
    expenseRatio: z.number().min(0).max(1),
    liquidity: z.number().min(0).max(1),
    diversification: z.number().min(0).max(1),
    trackingDifference: z.number().min(0).max(1),
    taxEfficiency: z.number().min(0).max(1),
    performance: z.number().min(0).max(1),
  }),
  maxRecommendations: z.number().min(1).max(50),
  minScore: z.number().min(0).max(1),
  filteringCriteria: z.object({
    assetClass: z.array(z.string()),
    region: z.array(z.string()),
    maxExpenseRatio: z.number().min(0).max(5),
    minAum: z.number().min(0),
    minLiquidity: z.number().min(0),
  }),
});

const aiModelFormSchema = z.object({
  modelRef: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(16000),
  topP: z.number().min(0).max(1),
  systemPrompt: z.string().min(50),
  responseLength: z.enum(['short', 'medium', 'long']),
});

export default function ETFAdminSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected, sendMessage, subscribe } = useWebSocket();
  const [activeTab, setActiveTab] = useState("recommendations");
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Check admin permissions
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center" role="main" aria-label="권한 없음">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            이 페이지는 관리자만 접근할 수 있습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Fetch ETF admin settings from API
  const { data: settings, isLoading: isLoadingSettings, error } = useQuery<any>({
    queryKey: ['/api/etf-admin/settings'],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // WebSocket subscription for real-time updates
  useEffect(() => {
    const unsubscribe = subscribe('etf-settings-updated', (data) => {
      console.log('ETF settings updated via WebSocket:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/etf-admin/settings'] });
      toast({
        title: "설정 업데이트됨",
        description: "다른 관리자가 ETF 설정을 업데이트했습니다.",
      });
    });
    return unsubscribe;
  }, [subscribe, queryClient, toast]);

  // Create mutations for updating settings
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', '/api/etf-admin/settings', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/etf-admin/settings'] });
      setLastSaved(new Date());
    },
    onError: (error: any) => {
      console.error('Update settings error:', error);
      toast({
        title: "저장 실패",
        description: error?.response?.data?.message || "설정을 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Loading state
  if (isLoadingSettings) {
    return (
      <div className="flex h-full items-center justify-center" role="main" aria-label="로딩 중">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>ETF 설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center" role="main" aria-label="오류 발생">
        <Alert className="max-w-md" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ETF 설정을 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Default settings structure (fallback)
  const defaultSettings = {
    id: 'default-settings',
    name: 'Default ETF Recommendation Settings',
    mcdaWeights: {
      riskAlignment: 0.25,
      expenseRatio: 0.20,
      liquidity: 0.15,
      diversification: 0.15,
      trackingDifference: 0.15,
      taxEfficiency: 0.05,
      performance: 0.05
    },
    maxRecommendations: 20,
    minScore: 0.5,
    filteringCriteria: {
      assetClass: ['주식', '채권', '원자재'],
      region: ['국내', '미국', '선진국', '신흥국'],
      maxExpenseRatio: 1.0,
      minAum: 1000000000,
      minLiquidity: 1000000
    },
    isActive: true
  };

  // Use fetched settings or default
  const currentSettings = settings || defaultSettings;

  // Forms with real data
  const recommendationForm = useForm<z.infer<typeof recommendationFormSchema>>({
    resolver: zodResolver(recommendationFormSchema),
    defaultValues: {
      mcdaWeights: currentSettings.mcdaWeights,
      maxRecommendations: currentSettings.maxRecommendations,
      minScore: currentSettings.minScore,
      filteringCriteria: currentSettings.filteringCriteria,
    },
  });

  const guardrailForm = useForm<z.infer<typeof guardrailFormSchema>>({
    resolver: zodResolver(guardrailFormSchema),
    defaultValues: {
      riskThresholds: { low: 0.3, medium: 0.6, high: 1.0 },
      portfolioConcentrationLimit: 0.25,
      investmentLimits: { minAmount: 10000, maxAmount: 10000000 },
      isActive: true,
      disclaimer: "투자는 원금 손실의 위험이 있습니다.",
      prohibitedRecommendations: [],
    },
  });

  const aiModelForm = useForm<z.infer<typeof aiModelFormSchema>>({
    resolver: zodResolver(aiModelFormSchema),
    defaultValues: {
      modelRef: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9,
      systemPrompt: 'You are a professional ETF investment advisor.',
      responseLength: 'medium',
    },
  });

  // Update form when settings change
  useEffect(() => {
    if (settings) {
      recommendationForm.reset({
        mcdaWeights: settings.mcdaWeights,
        maxRecommendations: settings.maxRecommendations,
        minScore: settings.minScore,
        filteringCriteria: settings.filteringCriteria,
      });
    }
  }, [settings, recommendationForm]);

  // Calculate total MCDA weights for validation
  const mcdaWeights = recommendationForm.watch("mcdaWeights");
  const totalWeight = Object.values(mcdaWeights || {}).reduce((sum, weight) => sum + weight, 0);
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.001;

  // Save function with real API call
  const saveRecommendationSettings = async (data: z.infer<typeof recommendationFormSchema>) => {
    if (!isWeightValid) {
      toast({
        title: "가중치 오류",
        description: "MCDA 가중치의 합계가 1.0이 되어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        name: currentSettings.name || 'ETF Recommendation Settings',
        mcdaWeights: data.mcdaWeights,
        maxRecommendations: data.maxRecommendations,
        minScore: data.minScore,
        filteringCriteria: data.filteringCriteria,
        isActive: true
      });
      
      toast({
        title: "추천 엔진 설정 저장됨",
        description: "ETF 추천 엔진에 새로운 설정이 적용되었습니다.",
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const saveGuardrailSettings = async (data: z.infer<typeof guardrailFormSchema>) => {
    try {
      await updateSettingsMutation.mutateAsync({
        type: 'guardrails',
        ...data
      });
      
      toast({
        title: "가드레일 설정 저장됨",
        description: "가드레일 설정이 적용되었습니다.",
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const saveAIModelSettings = async (data: z.infer<typeof aiModelFormSchema>) => {
    try {
      await updateSettingsMutation.mutateAsync({
        type: 'ai_model',
        ...data
      });
      
      toast({
        title: "AI 모델 설정 저장됨",
        description: "AI 모델 설정이 적용되었습니다.",
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const resetToDefaults = (formType: string) => {
    switch (formType) {
      case 'guardrails':
        guardrailForm.reset();
        break;
      case 'recommendations':
        recommendationForm.reset();
        break;
      case 'ai_model':
        aiModelForm.reset();
        break;
    }
    
    toast({
      title: "기본값으로 재설정",
      description: "모든 설정이 기본값으로 재설정되었습니다.",
    });
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="page-title">
            ETF 챗봇 관리자 설정
          </h1>
          <p className="text-sm text-muted-foreground">
            ETF 투자 상담 챗봇의 동작을 제어하고 설정합니다
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {lastSaved && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              마지막 저장: {lastSaved.toLocaleTimeString()}
            </div>
          )}
          
          <Badge variant={isConnected ? "default" : "secondary"} data-testid="websocket-status">
            <Zap className="mr-1 h-3 w-3" />
            {isConnected ? "실시간 연결됨" : "연결 끊어짐"}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-3" data-testid="settings-tabs">
              <TabsTrigger value="guardrails" data-testid="tab-guardrails">
                <Shield className="mr-2 h-4 w-4" />
                가드레일
              </TabsTrigger>
              <TabsTrigger value="recommendations" data-testid="tab-recommendations">
                <Target className="mr-2 h-4 w-4" />
                추천 엔진
              </TabsTrigger>
              <TabsTrigger value="ai_model" data-testid="tab-ai-model">
                <Sparkles className="mr-2 h-4 w-4" />
                AI 모델
              </TabsTrigger>
            </TabsList>

            {/* Guardrails Settings */}
            <TabsContent value="guardrails" className="mt-6 h-[calc(100%-3rem)] overflow-auto">
              <Form {...guardrailForm}>
                <form onSubmit={guardrailForm.handleSubmit(saveGuardrailSettings)} className="space-y-6">
                  {/* Risk Thresholds */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        위험도 임계값 설정
                      </CardTitle>
                      <CardDescription>
                        ETF 위험성향 평가를 위한 점수 기준을 설정합니다 (0-10점)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={guardrailForm.control}
                          name="riskThresholds.low"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>낮음 임계값</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  placeholder="3.0"
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value))}
                                  data-testid="input-risk-low"
                                />
                              </FormControl>
                              <FormDescription>낮은 위험 기준점</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={guardrailForm.control}
                          name="riskThresholds.medium"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>중간 임계값</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  placeholder="5.0"
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value))}
                                  data-testid="input-risk-medium"
                                />
                              </FormControl>
                              <FormDescription>중간 위험 기준점</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={guardrailForm.control}
                          name="riskThresholds.high"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>높음 임계값</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="10"
                                  placeholder="7.5"
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value))}
                                  data-testid="input-risk-high"
                                />
                              </FormControl>
                              <FormDescription>높은 위험 기준점</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Portfolio Concentration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        포트폴리오 집중도 한계
                      </CardTitle>
                      <CardDescription>
                        단일 종목이 전체 포트폴리오에서 차지할 수 있는 최대 비율
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={guardrailForm.control}
                        name="portfolioConcentrationLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>최대 집중도 (%)</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Slider
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={[field.value]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  data-testid="slider-concentration-limit"
                                />
                                <div className="text-center text-sm font-medium">
                                  {field.value}%
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              포트폴리오 집중 위험을 방지하기 위한 설정입니다
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Investment Limits */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        투자 금액 한계
                      </CardTitle>
                      <CardDescription>
                        사용자가 설정할 수 있는 투자 금액의 최소/최대 범위
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={guardrailForm.control}
                          name="investmentLimits.minAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>최소 투자 금액</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="10,000"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-min-amount"
                                />
                              </FormControl>
                              <FormDescription>원 단위</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={guardrailForm.control}
                          name="investmentLimits.maxAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>최대 투자 금액</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="100,000,000"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-max-amount"
                                />
                              </FormControl>
                              <FormDescription>원 단위</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Toggle */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        가드레일 활성화
                      </CardTitle>
                      <CardDescription>
                        ETF 챗봇의 가드레일 정책 적용 여부를 설정합니다
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={guardrailForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>가드레일 정책 적용</FormLabel>
                              <FormDescription>
                                비활성화 시 모든 가드레일 검사를 무시합니다
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-guardrails-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Disclaimer */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        법적 고지사항
                      </CardTitle>
                      <CardDescription>
                        모든 ETF 추천에 포함될 기본 고지사항
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={guardrailForm.control}
                        name="disclaimer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>고지사항 텍스트</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={4}
                                placeholder="투자 위험성 및 법적 고지사항을 입력하세요..."
                                {...field}
                                data-testid="textarea-disclaimer"
                              />
                            </FormControl>
                            <FormDescription>
                              최소 10자 이상, 최대 500자 이하로 작성해주세요
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resetToDefaults('guardrails')}
                      data-testid="button-reset-guardrails"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      기본값으로 재설정
                    </Button>
                    
                    <Button type="submit" disabled={isLoading} data-testid="button-save-guardrails">
                      {isLoading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      가드레일 설정 저장
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Recommendations Settings */}
            <TabsContent value="recommendations" className="mt-6 h-[calc(100%-3rem)] overflow-auto">
              <Form {...recommendationForm}>
                <form onSubmit={recommendationForm.handleSubmit(saveRecommendationSettings)} className="space-y-6">
                  {/* MCDA Weights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        MCDA 평가 기준 가중치
                      </CardTitle>
                      <CardDescription>
                        ETF 추천을 위한 7개 평가 기준의 중요도를 설정합니다 (합계 1.0)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!isWeightValid && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            가중치의 합계가 {totalWeight.toFixed(3)}입니다. 정확히 1.0이 되어야 합니다.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">가중치 합계</div>
                        <Progress 
                          value={totalWeight * 100} 
                          className={cn(
                            "h-2",
                            !isWeightValid && "bg-destructive/20"
                          )}
                          data-testid="progress-weight-total"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {totalWeight.toFixed(3)} / 1.000
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: 'riskAlignment', label: '위험성향 적합성', description: '사용자 위험성향과의 일치도' },
                          { key: 'expenseRatio', label: '비용 효율성', description: '운용보수 및 수수료 수준' },
                          { key: 'liquidity', label: '유동성', description: '거래량 및 호가 스프레드' },
                          { key: 'diversification', label: '분산도', description: '보유 종목 수 및 섹터 분산' },
                          { key: 'trackingDifference', label: '추적 오차', description: '지수 대비 추적 정확도' },
                          { key: 'taxEfficiency', label: '세금 효율성', description: '세금 최적화 정도' },
                          { key: 'performance', label: '성과', description: '과거 수익률 및 변동성' },
                        ].map(({ key, label, description }) => (
                          <FormField
                            key={key}
                            control={recommendationForm.control}
                            name={`mcdaWeights.${key}` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{label}</FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    <Slider
                                      min={0}
                                      max={1}
                                      step={0.01}
                                      value={[field.value]}
                                      onValueChange={(value) => field.onChange(value[0])}
                                      data-testid={`slider-weight-${key}`}
                                    />
                                    <div className="text-center text-sm font-medium">
                                      {(field.value * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                </FormControl>
                                <FormDescription className="text-xs">
                                  {description}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendation Limits */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sliders className="h-5 w-5" />
                        추천 개수 및 점수 기준
                      </CardTitle>
                      <CardDescription>
                        ETF 추천 결과의 개수와 최소 점수를 설정합니다
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={recommendationForm.control}
                          name="maxRecommendations"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>최대 추천 개수</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="50"
                                  placeholder="20"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-max-recommendations"
                                />
                              </FormControl>
                              <FormDescription>한 번에 추천할 ETF 개수</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={recommendationForm.control}
                          name="minScore"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>최소 점수</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[field.value]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    data-testid="slider-min-score"
                                  />
                                  <div className="text-center text-sm font-medium">
                                    {(field.value * 100).toFixed(1)}점
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                이 점수 이하의 ETF는 추천하지 않습니다
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        recommendationForm.reset({
                          mcdaWeights: defaultSettings.mcdaWeights,
                          maxRecommendations: defaultSettings.maxRecommendations,
                          minScore: defaultSettings.minScore,
                          filteringCriteria: defaultSettings.filteringCriteria
                        });
                      }}
                      data-testid="button-reset-recommendations"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      기본값으로 재설정
                    </Button>
                    
                    <Button 
                      type="submit" 
                      disabled={updateSettingsMutation.isPending || !isWeightValid}
                      data-testid="button-save-recommendations"
                    >
                      {updateSettingsMutation.isPending ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      추천 엔진 설정 저장
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* AI Model Settings */}
            <TabsContent value="ai_model" className="mt-6 h-[calc(100%-3rem)] overflow-auto">
              <Form {...aiModelForm}>
                <form onSubmit={aiModelForm.handleSubmit(saveAIModelSettings)} className="space-y-6">
                  {/* Model Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        AI 모델 선택
                      </CardTitle>
                      <CardDescription>
                        ETF 챗봇에서 사용할 AI 모델을 선택합니다
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={aiModelForm.control}
                        name="modelRef"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>모델</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-ai-model">
                                  <SelectValue placeholder="AI 모델을 선택하세요" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="gpt-4">GPT-4</SelectItem>
                                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                                <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              더 높은 성능의 모델일수록 비용이 많이 듭니다
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Model Parameters */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        모델 파라미터
                      </CardTitle>
                      <CardDescription>
                        AI 모델의 응답 특성을 조정합니다
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={aiModelForm.control}
                          name="temperature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>창의성 (Temperature)</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={[field.value]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    data-testid="slider-temperature"
                                  />
                                  <div className="text-center text-sm font-medium">
                                    {field.value.toFixed(1)}
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                높을수록 창의적, 낮을수록 일관적
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={aiModelForm.control}
                          name="topP"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>핵심 샘플링 (Top P)</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[field.value]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    data-testid="slider-top-p"
                                  />
                                  <div className="text-center text-sm font-medium">
                                    {field.value.toFixed(2)}
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                응답 다양성을 조절합니다
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={aiModelForm.control}
                          name="maxTokens"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>최대 토큰 수</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="100"
                                  max="16000"
                                  step="100"
                                  placeholder="4096"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-max-tokens"
                                />
                              </FormControl>
                              <FormDescription>
                                응답의 최대 길이를 제한합니다
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={aiModelForm.control}
                          name="responseLength"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>응답 길이 기본값</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-response-length">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="short">짧음 (간결한 답변)</SelectItem>
                                  <SelectItem value="medium">보통 (균형잡힌 답변)</SelectItem>
                                  <SelectItem value="long">길음 (자세한 설명)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                기본 응답 스타일을 선택합니다
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Prompt */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        시스템 프롬프트
                      </CardTitle>
                      <CardDescription>
                        ETF 챗봇의 기본 행동과 역할을 정의합니다
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={aiModelForm.control}
                        name="systemPrompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>프롬프트 템플릿</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={10}
                                placeholder="ETF 챗봇의 역할과 행동 지침을 입력하세요..."
                                className="font-mono text-sm"
                                {...field}
                                data-testid="textarea-system-prompt"
                              />
                            </FormControl>
                            <FormDescription>
                              이 프롬프트가 모든 대화의 기본 컨텍스트가 됩니다
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resetToDefaults('ai_model')}
                      data-testid="button-reset-ai-model"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      기본값으로 재설정
                    </Button>
                    
                    <Button type="submit" disabled={isLoading} data-testid="button-save-ai-model">
                      {isLoading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      AI 모델 설정 저장
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}