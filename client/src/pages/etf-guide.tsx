import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  type EtfChatSession,
  type EtfChatMessage,
  type EtfProduct,
  type UserRiskProfile,
} from "@shared/schema";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Shield,
  Sparkles,
  Loader2,
  RefreshCw,
  Star,
  PieChart,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for ETF recommendations and analysis
interface ETFRecommendation {
  etf: EtfProduct;
  score: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
  fees: number;
  suitabilityMatch: number;
  warnings?: string[];
}

interface PortfolioAnalysis {
  totalValue: number;
  diversificationScore: number;
  riskLevel: string;
  expectedReturn: number;
  recommendations: string[];
  warnings: string[];
}

interface GuardrailAlert {
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export default function ETFGuide() {
  const { toast } = useToast();
  const { isConnected, sendMessage, subscribe } = useWebSocket();
  const [currentSession, setCurrentSession] = useState<EtfChatSession | null>(null);
  const [messages, setMessages] = useState<EtfChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentTab, setCurrentTab] = useState("chat");
  const [guardrailAlerts, setGuardrailAlerts] = useState<GuardrailAlert[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef("");

  // Get authenticated user from auth context
  const { user, isAuthenticated } = useAuth();

  // Get or create active ETF chat session
  const { data: activeSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['/api/etf-bot/sessions', user?.id, 'active'],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/etf-bot/sessions?userId=${user?.id}&status=active`);
      if (!response.ok) {
        throw new Error('Failed to fetch active session');
      }
      const sessions = await response.json();
      return sessions.length > 0 ? sessions[0] : null;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Get chat history for current session
  const { data: chatHistory, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/etf-bot/sessions', currentSession?.id, 'messages'],
    enabled: !!currentSession?.id,
    queryFn: async () => {
      if (!currentSession?.id) return [];
      const response = await apiRequest('GET', `/api/etf-bot/sessions/${currentSession.id}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      return await response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get ETF recommendations
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<ETFRecommendation[]>({
    queryKey: ['/api/etf-bot/recommendations', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/etf-bot/recommendations?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ETF recommendations');
      }
      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get user risk profile
  const { data: riskProfile } = useQuery<UserRiskProfile>({
    queryKey: ['/api/etf-bot/risk-assessment', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/etf-bot/risk-assessment?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch risk profile');
      }
      return await response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get portfolio analysis if user has holdings
  const { data: portfolioAnalysis } = useQuery<PortfolioAnalysis>({
    queryKey: ['/api/etf-bot/portfolio-analysis', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/etf-bot/portfolio-analysis?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio analysis');
      }
      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Start new ETF session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (topic?: string) => {
      const response = await apiRequest('POST', '/api/etf-bot/session', { topic });
      return response.json();
    },
    onSuccess: (session) => {
      setCurrentSession(session);
      toast({
        title: "ETF 투자상담이 시작되었습니다",
        description: "궁금한 점을 언제든 물어보세요.",
      });
    },
    onError: (error) => {
      toast({
        title: "세션 시작 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentSession?.id) throw new Error("No active session");
      
      const response = await apiRequest('POST', '/api/etf-bot/message', {
        sessionId: currentSession.id,
        content,
        metadata: { source: 'web_chat' }
      });
      return response.json();
    },
    onSuccess: (response) => {
      // Add user message immediately
      const userMessage: EtfChatMessage = {
        id: `temp-${Date.now()}`,
        sessionId: currentSession!.id,
        content: inputMessage,
        role: 'user',
        toolCalls: null,
        safetyFlags: null,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputMessage("");
      
      // Handle streaming response if applicable
      if (response.streaming) {
        setIsStreaming(true);
        setStreamingContent("");
      } else {
        // Add AI response immediately if not streaming
        if (response.message) {
          const aiMessage: EtfChatMessage = {
            id: response.message.id,
            sessionId: currentSession!.id,
            content: response.message.content,
            role: 'assistant',
            toolCalls: response.message.toolCalls || null,
            safetyFlags: response.message.safetyFlags || null,
            createdAt: new Date(response.message.createdAt)
          };
          setMessages(prev => [...prev, aiMessage]);
        }
      }

      // Handle recommendations if provided
      if (response.recommendations) {
        queryClient.invalidateQueries({ queryKey: ['/api/etf-bot/recommendations', user?.id] });
      }

      // Handle guardrail alerts
      if (response.guardrails?.violations?.length > 0) {
        const alerts: GuardrailAlert[] = response.guardrails.violations.map((violation: any) => ({
          type: violation.severity === 'high' ? 'error' : 'warning',
          title: violation.type,
          message: violation.message,
          severity: violation.severity
        }));
        setGuardrailAlerts(prev => [...prev, ...alerts]);
      }
    },
    onError: (error) => {
      toast({
        title: "메시지 전송 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  });

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!isConnected || !currentSession?.id || !user?.id) return;

    // Reset streaming content ref when starting new subscription
    streamingContentRef.current = "";

    const unsubscribeStream = subscribe('etf_message_stream', (data) => {
      if (data.sessionId === currentSession.id) {
        if (data.type === 'content_delta') {
          // Use functional setter to avoid dependency on streamingContent
          streamingContentRef.current += data.content;
          setStreamingContent(streamingContentRef.current);
        } else if (data.type === 'content_complete') {
          setIsStreaming(false);
          const finalContent = streamingContentRef.current + data.content;
          const aiMessage: EtfChatMessage = {
            id: data.messageId,
            sessionId: currentSession.id,
            content: finalContent,
            role: 'assistant',
            toolCalls: data.toolCalls || null,
            safetyFlags: data.safetyFlags || null,
            createdAt: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          setStreamingContent("");
          streamingContentRef.current = "";
        }
      }
    });

    const unsubscribeRecommendations = subscribe('etf_recommendations_update', (data) => {
      if (data.userId === user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/etf-bot/recommendations', user?.id] });
      }
    });

    const unsubscribeAlerts = subscribe('etf_guardrail_alert', (data) => {
      if (data.userId === user?.id) {
        const alert: GuardrailAlert = {
          type: data.severity === 'high' ? 'error' : 'warning',
          title: data.type,
          message: data.message,
          severity: data.severity
        };
        setGuardrailAlerts(prev => [...prev, alert]);
      }
    });

    return () => {
      unsubscribeStream();
      unsubscribeRecommendations();
      unsubscribeAlerts();
    };
  }, [isConnected, currentSession?.id, subscribe, user?.id]);

  // Update messages when chat history changes
  useEffect(() => {
    if (chatHistory && Array.isArray(chatHistory)) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Initialize session on component mount
  useEffect(() => {
    if (activeSession && typeof activeSession === 'object' && 'id' in activeSession) {
      setCurrentSession(activeSession as EtfChatSession);
    } else if (!sessionLoading && !startSessionMutation.isPending) {
      startSessionMutation.mutate("General ETF Consultation");
    }
  }, [activeSession, sessionLoading]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || sendMessageMutation.isPending) return;
    if (!currentSession) {
      // If no session, try to start one first
      startSessionMutation.mutate(undefined, {
        onSuccess: (session) => {
          setCurrentSession(session);
          // Retry sending message after session is created
          setTimeout(() => {
            sendMessageMutation.mutate(inputMessage.trim());
          }, 100);
        },
        onError: () => {
          toast({
            title: "세션 시작 실패",
            description: "세션을 시작할 수 없습니다. 잠시 후 다시 시도해주세요.",
            variant: "destructive",
          });
        }
      });
      return;
    }
    sendMessageMutation.mutate(inputMessage.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const dismissAlert = (index: number) => {
    setGuardrailAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Show login message if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="w-full px-6 py-6" data-testid="login-required">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center space-x-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span>로그인이 필요합니다</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              ETF 투자 가이드 상담을 이용하시려면 로그인해주세요.
            </p>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="w-full"
              data-testid="button-go-to-login"
            >
              로그인하러 가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6" data-testid="etf-guide">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ETF 투자가이드 상담
          </h1>
          <p className="text-muted-foreground mt-1">
            AI 전문가와 함께 최적의 ETF 투자 전략을 수립하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? "default" : "destructive"} data-testid="connection-status">
            {isConnected ? "연결됨" : "연결 중..."}
          </Badge>
          {riskProfile && (
            <Badge variant="outline" data-testid="risk-profile">
              위험성향: {riskProfile.riskLevel === 'conservative' ? '보수적' : 
                        riskProfile.riskLevel === 'moderate' ? '중간' : '공격적'}
            </Badge>
          )}
        </div>
      </div>

      {/* Guardrail Alerts */}
      {guardrailAlerts.length > 0 && (
        <div className="space-y-2" data-testid="guardrail-alerts">
          {guardrailAlerts.map((alert, index) => (
            <Alert 
              key={index} 
              variant={alert.type === 'error' ? 'destructive' : 'default'}
              className="relative"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="pr-8">
                <strong>{alert.title}:</strong> {alert.message}
              </AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-6 w-6 p-0"
                onClick={() => dismissAlert(index)}
                data-testid={`dismiss-alert-${index}`}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[700px] flex flex-col" data-testid="chat-interface">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>ETF 투자 상담</span>
                {isStreaming && (
                  <div className="flex items-center space-x-1 text-blue-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI가 답변하는 중...</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col space-y-4 p-4">
              {/* Messages Area */}
              <ScrollArea className="flex-1 pr-4" data-testid="messages-area">
                <div className="space-y-4">
                  {messages.length === 0 && !isStreaming ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Bot className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                      <p>ETF 투자 상담을 시작해보세요!</p>
                      <p className="text-sm mt-2">
                        "KODEX 200 ETF가 뭔가요?" 또는 "포트폴리오 분석해주세요"와 같이 물어보세요.
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex space-x-3",
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                          data-testid={`message-${message.role}-${message.id}`}
                        >
                          {message.role === 'assistant' && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-500 text-white">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg px-4 py-2",
                              message.role === 'user'
                                ? "bg-blue-500 text-white"
                                : "bg-muted"
                            )}
                          >
                            <div className="whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                            <div className="text-xs opacity-70 mt-1">
                              {new Date(message.createdAt || Date.now()).toLocaleTimeString('ko-KR')}
                            </div>
                          </div>
                          
                          {message.role === 'user' && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gray-500 text-white">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      
                      {/* Streaming Message */}
                      {isStreaming && (
                        <div className="flex space-x-3 justify-start" data-testid="streaming-message">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-500 text-white">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                            <div className="whitespace-pre-wrap break-words">
                              {streamingContent}
                              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Message Input */}
              <div className="flex-shrink-0 space-y-2">
                <div className="flex items-end space-x-2" data-testid="message-input">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="ETF에 대해 궁금한 점을 물어보세요..."
                    className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                    disabled={sendMessageMutation.isPending || startSessionMutation.isPending}
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || sendMessageMutation.isPending || startSessionMutation.isPending}
                    className="px-4 py-2 h-[60px]"
                    data-testid="button-send"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage("포트폴리오를 분석해주세요")}
                    disabled={sendMessageMutation.isPending}
                    data-testid="quick-portfolio-analysis"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    포트폴리오 분석
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage("추천 ETF를 알려주세요")}
                    disabled={sendMessageMutation.isPending}
                    data-testid="quick-recommendations"
                  >
                    <Star className="h-3 w-3 mr-1" />
                    ETF 추천
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage("위험성향 진단을 받고 싶어요")}
                    disabled={sendMessageMutation.isPending}
                    data-testid="quick-risk-assessment"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    위험성향 진단
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with Recommendations and Analysis */}
        <div className="space-y-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab} data-testid="sidebar-tabs">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recommendations" data-testid="tab-recommendations">추천</TabsTrigger>
              <TabsTrigger value="portfolio" data-testid="tab-portfolio">포트폴리오</TabsTrigger>
              <TabsTrigger value="education" data-testid="tab-education">학습</TabsTrigger>
            </TabsList>

            {/* ETF Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <Card data-testid="recommendations-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span>추천 ETF</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recommendationsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : recommendations && recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {recommendations.slice(0, 5).map((rec, index) => (
                        <div
                          key={rec.etf.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          data-testid={`recommendation-${index}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {rec.etf.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {rec.etf.ticker}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge
                                  variant={
                                    rec.riskLevel === 'low' ? 'default' :
                                    rec.riskLevel === 'medium' ? 'secondary' : 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {rec.riskLevel === 'low' ? '안전' :
                                   rec.riskLevel === 'medium' ? '중간' : '위험'}
                                </Badge>
                                <span className="text-xs text-green-600">
                                  {formatPercent(rec.expectedReturn)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {(rec.score * 100).toFixed(0)}점
                              </div>
                              <div className="text-xs text-muted-foreground">
                                적합도
                              </div>
                            </div>
                          </div>
                          {rec.reasoning && (
                            <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {rec.reasoning}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">추천 ETF를 받으려면</p>
                      <p className="text-sm">상담을 시작해보세요</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Portfolio Analysis Tab */}
            <TabsContent value="portfolio" className="space-y-4">
              <Card data-testid="portfolio-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-blue-500" />
                    <span>포트폴리오 분석</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {portfolioAnalysis ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(portfolioAnalysis.totalValue)}
                          </div>
                          <div className="text-xs text-muted-foreground">총 자산</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-lg font-bold">
                            {portfolioAnalysis.diversificationScore}/100
                          </div>
                          <div className="text-xs text-muted-foreground">분산도</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-2">위험 수준</div>
                        <Badge variant="outline" className="w-full justify-center">
                          {portfolioAnalysis.riskLevel}
                        </Badge>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">기대 수익률</div>
                        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                          <span className="text-green-600 font-bold">
                            {formatPercent(portfolioAnalysis.expectedReturn)}
                          </span>
                        </div>
                      </div>

                      {portfolioAnalysis.recommendations.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">추천사항</div>
                          <div className="space-y-1">
                            {portfolioAnalysis.recommendations.map((rec, index) => (
                              <div key={index} className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 rounded flex items-start space-x-2">
                                <CheckCircle className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {portfolioAnalysis.warnings.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">주의사항</div>
                          <div className="space-y-1">
                            {portfolioAnalysis.warnings.map((warning, index) => (
                              <div key={index} className="text-xs p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded flex items-start space-x-2">
                                <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span>{warning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <PieChart className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">포트폴리오 분석을 위해</p>
                      <p className="text-sm">보유 종목 정보가 필요합니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-4">
              <Card data-testid="education-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span>ETF 학습</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div 
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (currentSession) {
                          setInputMessage("ETF란 무엇인가요?");
                          setTimeout(() => handleSendMessage(), 100);
                        } else {
                          startSessionMutation.mutate("ETF 기본 개념", {
                            onSuccess: (session) => {
                              setCurrentSession(session);
                              setInputMessage("ETF란 무엇인가요?");
                              setTimeout(() => handleSendMessage(), 100);
                            }
                          });
                        }
                      }}
                    >
                      <div className="font-medium text-sm">ETF란 무엇인가요?</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        상장지수펀드의 기본 개념과 특징을 알아보세요
                      </div>
                    </div>
                    <div 
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (currentSession) {
                          setInputMessage("ETF와 뮤추얼펀드의 차이점은 무엇인가요?");
                          setTimeout(() => handleSendMessage(), 100);
                        } else {
                          startSessionMutation.mutate("ETF 비교", {
                            onSuccess: (session) => {
                              setCurrentSession(session);
                              setInputMessage("ETF와 뮤추얼펀드의 차이점은 무엇인가요?");
                              setTimeout(() => handleSendMessage(), 100);
                            }
                          });
                        }
                      }}
                    >
                      <div className="font-medium text-sm">ETF vs 뮤추얼펀드</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ETF와 뮤추얼펀드의 차이점을 비교해보세요
                      </div>
                    </div>
                    <div 
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (currentSession) {
                          setInputMessage("분산투자의 중요성에 대해 설명해주세요");
                          setTimeout(() => handleSendMessage(), 100);
                        } else {
                          startSessionMutation.mutate("분산투자", {
                            onSuccess: (session) => {
                              setCurrentSession(session);
                              setInputMessage("분산투자의 중요성에 대해 설명해주세요");
                              setTimeout(() => handleSendMessage(), 100);
                            }
                          });
                        }
                      }}
                    >
                      <div className="font-medium text-sm">분산투자의 중요성</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        위험을 줄이는 분산투자 전략을 배워보세요
                      </div>
                    </div>
                    <div 
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (currentSession) {
                          setInputMessage("ETF 투자 시 발생하는 비용과 수수료는 어떻게 되나요?");
                          setTimeout(() => handleSendMessage(), 100);
                        } else {
                          startSessionMutation.mutate("ETF 비용", {
                            onSuccess: (session) => {
                              setCurrentSession(session);
                              setInputMessage("ETF 투자 시 발생하는 비용과 수수료는 어떻게 되나요?");
                              setTimeout(() => handleSendMessage(), 100);
                            }
                          });
                        }
                      }}
                    >
                      <div className="font-medium text-sm">비용과 수수료</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ETF 투자 시 발생하는 비용들을 이해해보세요
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Profile Card */}
              {riskProfile && (
                <Card data-testid="risk-profile-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      <span>나의 위험성향</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-center">
                        <Badge variant="outline" className="px-4 py-2">
                          {riskProfile.riskLevel === 'conservative' ? '안정형' :
                           riskProfile.riskLevel === 'moderate' ? '균형형' : '적극형'}
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-2">투자 목표</div>
                        <div className="text-xs text-muted-foreground">
                          {riskProfile.objectives?.join(', ') || '미설정'}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">투자 기간</div>
                        <div className="text-xs text-muted-foreground">
                          {riskProfile.horizon === 'short_term' ? '단기 (3년 미만)' :
                           riskProfile.horizon === 'medium_term' ? '중기 (3-10년)' :
                           riskProfile.horizon === 'long_term' ? '장기 (10년 이상)' : '미설정'}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">위험 수준</div>
                        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                          <span className="text-green-600 font-bold">
                            {riskProfile.riskLevel === 'conservative' ? '보수적' :
                             riskProfile.riskLevel === 'moderate' ? '균형적' :
                             riskProfile.riskLevel === 'aggressive' ? '공격적' : riskProfile.riskLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}