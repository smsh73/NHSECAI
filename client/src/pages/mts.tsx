import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  type EtfChatSession,
  type EtfChatMessage,
  type EtfProduct,
  type UserRiskProfile,
} from '@shared/schema';
import {
  Cpu,
  Battery,
  Heart,
  DollarSign,
  ShoppingCart,
  Factory,
  Play,
  Home,
  Rocket,
  Gem,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  AlertCircle,
  Wifi,
  BatteryCharging,
  Signal,
  MessageCircle,
  Send,
  Bot,
  User,
  AlertTriangle,
  BarChart3,
  Shield,
  Sparkles,
  Loader2,
  Star,
  PieChart,
  Info,
  CheckCircle,
  XCircle,
  Settings,
  Zap
} from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
}

interface ThemeStats {
  themeId: string;
  themeName: string;
  color: string;
  icon?: string;
  newsCount: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  lastUpdated: string | null;
}

interface ThemeSummary {
  themeId: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  summary: string;
  keyPoints: string[];
  impactScore: number;
  relatedSymbols: string[];
  lastUpdated: Date;
}

interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  sentiment?: string;
  source?: string;
  publishedAt: string;
  relevantSymbols?: string[];
}

// ETF-related interfaces for mobile optimization
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

// Development only: Sample ETF data for testing
const isDev = import.meta.env.DEV;

const SAMPLE_ETF_DATA: any[] = isDev ? [
  {
    id: "test-kodex-200",
    symbol: "KODEX 200",
    name: "KODEX 200",
    category: "국내주식",
    benchmark: "KOSPI 200",
    expenseRatio: 0.15,
    totalAssets: 1500000000000,
    description: "한국 대표 주가지수인 KOSPI 200을 추적하는 ETF",
    holdings: [],
    performance: {
      oneDay: 0.5,
      oneWeek: 2.1,
      oneMonth: 4.2,
      threeMonths: 8.7,
      sixMonths: 12.3,
      oneYear: 15.8,
      threeYears: 7.2,
      fiveYears: 6.8
    },
    riskMetrics: {
      volatility: 18.5,
      sharpeRatio: 0.65,
      maxDrawdown: 25.8,
      beta: 1.0
    },
    dividendYield: 2.1
  },
  {
    id: "test-tiger-nasdaq100",
    symbol: "TIGER NASDAQ100",
    name: "TIGER 나스닥100",
    category: "해외주식",
    benchmark: "NASDAQ 100",
    expenseRatio: 0.45,
    totalAssets: 800000000000,
    description: "나스닥 100 지수를 추적하는 해외주식 ETF",
    holdings: [],
    performance: {
      oneDay: -0.3,
      oneWeek: 1.8,
      oneMonth: 6.5,
      threeMonths: 12.4,
      sixMonths: 18.9,
      oneYear: 28.3,
      threeYears: 15.2,
      fiveYears: 18.7
    },
    riskMetrics: {
      volatility: 22.3,
      sharpeRatio: 0.85,
      maxDrawdown: 32.1,
      beta: 1.15
    },
    dividendYield: 0.8
  },
  {
    id: "test-arirang-esg",
    symbol: "ARIRANG ESG",
    name: "ARIRANG ESG 우수기업",
    category: "ESG",
    benchmark: "ESG 스코어 기반",
    expenseRatio: 0.25,
    totalAssets: 300000000000,
    description: "ESG 우수 기업들로 구성된 사회책임투자 ETF",
    holdings: [],
    performance: {
      oneDay: 0.2,
      oneWeek: 1.5,
      oneMonth: 3.8,
      threeMonths: 7.2,
      sixMonths: 11.5,
      oneYear: 13.9,
      threeYears: 9.1,
      fiveYears: 8.3
    },
    riskMetrics: {
      volatility: 16.8,
      sharpeRatio: 0.72,
      maxDrawdown: 22.4,
      beta: 0.88
    },
    dividendYield: 2.8
  }
] : [];

// Development only: Sample ETF scenarios for testing
const ETF_TEST_SCENARIOS = isDev ? [
  {
    id: "conservative-portfolio",
    name: "보수적 투자자",
    description: "안정적인 수익을 추구하는 보수적 투자 포트폴리오",
    riskLevel: "conservative" as const,
    recommendations: [
      {
        etf: SAMPLE_ETF_DATA[0],
        score: 0.85,
        reasoning: "낮은 변동성과 안정적인 배당수익을 제공하는 국내 대표 지수 ETF",
        riskLevel: "low" as const,
        expectedReturn: 6.5,
        fees: 0.15,
        suitabilityMatch: 95,
        warnings: []
      },
      {
        etf: SAMPLE_ETF_DATA[2],
        score: 0.78,
        reasoning: "ESG 투자로 지속가능한 수익과 사회적 가치를 동시에 추구",
        riskLevel: "low" as const,
        expectedReturn: 7.2,
        fees: 0.25,
        suitabilityMatch: 88,
        warnings: []
      }
    ],
    sampleQuestions: [
      "안전한 ETF 추천해주세요",
      "배당 수익이 좋은 ETF는 어떤 것이 있나요?",
      "ESG 투자가 뭔가요?"
    ]
  },
  {
    id: "aggressive-portfolio",
    name: "공격적 투자자",
    description: "높은 수익을 추구하는 공격적 투자 포트폴리오",
    riskLevel: "aggressive" as const,
    recommendations: [
      {
        etf: SAMPLE_ETF_DATA[1],
        score: 0.92,
        reasoning: "기술주 중심의 나스닥 100으로 높은 성장 잠재력 보유",
        riskLevel: "high" as const,
        expectedReturn: 18.5,
        fees: 0.45,
        suitabilityMatch: 92,
        warnings: ["높은 변동성 주의", "환율 위험 존재"]
      }
    ],
    sampleQuestions: [
      "수익률이 높은 ETF 추천해주세요",
      "나스닥 ETF는 어떤가요?",
      "해외주식 ETF 투자 시 주의사항은?"
    ]
  }
] : [];

// Development only: Sample guardrail scenarios
const SAMPLE_GUARDRAIL_ALERTS: GuardrailAlert[] = isDev ? [
  {
    type: "warning",
    title: "집중투자 위험",
    message: "포트폴리오의 70% 이상이 단일 섹터에 집중되어 있습니다. 분산투자를 고려해보세요.",
    severity: "medium"
  },
  {
    type: "error",
    title: "위험한계 초과",
    message: "현재 포트폴리오의 위험도가 설정된 한계를 초과했습니다. 안전 자산 비중을 늘려주세요.",
    severity: "high"
  },
  {
    type: "info",
    title: "리밸런싱 제안",
    message: "3개월이 지나 포트폴리오 리밸런싱을 권장합니다.",
    severity: "low"
  }
] : [];

// Theme icon mapping
const themeIcons: Record<string, any> = {
  'tech-innovation': Cpu,
  'green-energy': Battery,
  'bio-health': Heart,
  'finance': DollarSign,
  'consumer': ShoppingCart,
  'manufacturing': Factory,
  'entertainment': Play,
  'real-estate': Home,
  'defense-space': Rocket,
  'materials': Gem,
  'tech': Cpu,
  'energy': Battery,
  'health': Heart,
  'financial': DollarSign,
  'retail': ShoppingCart,
  'industrial': Factory,
  'media': Play,
  'property': Home,
  'aerospace': Rocket,
  'commodity': Gem,
  'etf-chatbot': MessageCircle // Special icon for ETF chatbot
};

// Default theme icon
const DefaultIcon = AlertCircle;

// Calculate circular position for theme buttons
const calculateCircularPosition = (index: number, total: number, radius: number) => {
  const angle = (index * 360 / total - 90) * (Math.PI / 180);
  const x = Math.cos(angle) * radius + 120; // Center adjusted 30px left from 150px
  const y = Math.sin(angle) * radius + 150;
  return { x, y };
};

// iPhone Status Bar Component
const IPhoneStatusBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-between items-center px-8 py-1 text-white text-sm font-medium">
      <div className="flex items-center gap-1">
        <span>{format(currentTime, 'HH:mm')}</span>
      </div>
      <div className="flex items-center gap-1">
        <Signal className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
        <BatteryCharging className="w-4 h-4" />
      </div>
    </div>
  );
};

// Dynamic Island Component
const DynamicIsland = ({ isActive }: { isActive: boolean }) => {
  return (
    <motion.div
      className="mx-auto bg-black rounded-full"
      initial={{ width: 126, height: 37 }}
      animate={{
        width: isActive ? 200 : 126,
        height: isActive ? 44 : 37
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center h-full text-white text-xs"
        >
          실시간 업데이트 중
        </motion.div>
      )}
    </motion.div>
  );
};

// Theme Button Component
const ThemeButton = ({
  theme,
  stats,
  position,
  index,
  onClick
}: {
  theme: Theme;
  stats?: ThemeStats;
  position: { x: number; y: number };
  index: number;
  onClick: () => void;
}) => {
  const Icon = themeIcons[theme.id] || themeIcons[theme.icon || ''] || DefaultIcon;
  
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-500';
      case 'negative':
        return 'text-red-500';
      case 'mixed':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-3 h-3" />;
      case 'negative':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.1,
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="absolute flex flex-col items-center gap-1 group"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10
      }}
      data-testid={`button-theme-${theme.id}`}
    >
      <div
        className={cn(
          "relative w-16 h-16 rounded-2xl shadow-lg",
          "flex items-center justify-center",
          "transition-all duration-200",
          "group-hover:shadow-xl group-hover:scale-105",
          "bg-gradient-to-br"
        )}
        style={{
          background: `linear-gradient(135deg, ${theme.color}33 0%, ${theme.color}66 100%)`
        }}
      >
        <Icon className="w-8 h-8 text-white" />
        {stats && stats.newsCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 min-w-[20px] h-5 p-0 flex items-center justify-center"
            variant={stats.newsCount > 10 ? "destructive" : "default"}
          >
            {stats.newsCount}
          </Badge>
        )}
      </div>
      <div className="text-center">
        <p className="text-[10px] font-medium text-white/90 max-w-[60px] truncate">
          {theme.name}
        </p>
        {stats && (
          <div className={cn("flex items-center gap-0.5", getSentimentColor(stats.sentiment))}>
            {getSentimentIcon(stats.sentiment)}
            <span className="text-[8px]">{stats.newsCount}건</span>
          </div>
        )}
      </div>
    </motion.button>
  );
};

// Theme Detail View Component
const ThemeDetailView = ({
  themeId,
  onBack
}: {
  themeId: string;
  onBack: () => void;
}) => {
  // Fetch theme data
  const { data: theme } = useQuery<Theme>({
    queryKey: ['/api/themes', themeId]
  });

  // Fetch theme summary
  const { data: summary } = useQuery<ThemeSummary>({
    queryKey: [`/api/themes/${themeId}/summary`]
  });

  // Fetch theme news
  const { data: news = [] } = useQuery<NewsItem[]>({
    queryKey: [`/api/themes/${themeId}/news`]
  });

  const Icon = theme ? (themeIcons[theme.id] || themeIcons[theme.icon || ''] || DefaultIcon) : DefaultIcon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: theme?.color || '#6B7280' }}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">{theme?.name || '로딩중...'}</h2>
              <p className="text-xs text-white/60">
                {summary?.lastUpdated && format(new Date(summary.lastUpdated), 'HH:mm 업데이트', { locale: ko })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4">
        {/* AI Summary */}
        {summary && (
          <Card className="mt-4 p-4 bg-white/5 border-white/10">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              AI 분석 요약
            </h3>
            <p className="text-xs text-white/80 leading-relaxed">
              {summary.summary}
            </p>
            
            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <>
                <Separator className="my-3 bg-white/10" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold mb-2">주요 포인트</h4>
                  {summary.keyPoints.map((point, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-xs text-white/40">•</span>
                      <p className="text-xs text-white/80 flex-1">{point}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {summary.relatedSymbols && summary.relatedSymbols.length > 0 && (
              <>
                <Separator className="my-3 bg-white/10" />
                <div>
                  <h4 className="text-xs font-semibold mb-2">관련 종목</h4>
                  <div className="flex flex-wrap gap-1">
                    {summary.relatedSymbols.map((symbol, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-xs border-white/20 text-white/80"
                      >
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

        {/* News List */}
        <div className="mt-4 space-y-2 pb-4">
          <h3 className="text-sm font-semibold mb-2">관련 뉴스</h3>
          {news.map((item) => (
            <Card
              key={item.id}
              className="p-3 bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/90 line-clamp-2">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="text-[10px] text-white/60 mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {item.source && (
                      <span className="text-[10px] text-white/40">{item.source}</span>
                    )}
                    <span className="text-[10px] text-white/40">
                      {format(new Date(item.publishedAt), 'HH:mm', { locale: ko })}
                    </span>
                  </div>
                </div>
                {item.sentiment && (
                  <Badge
                    variant={
                      item.sentiment === 'positive' ? 'default' :
                      item.sentiment === 'negative' ? 'destructive' :
                      'secondary'
                    }
                    className="text-[10px] shrink-0"
                  >
                    {item.sentiment === 'positive' ? '긍정' :
                     item.sentiment === 'negative' ? '부정' : '중립'}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

// ETF Chatbot View Component
const ETFChatbotView = ({
  onBack
}: {
  onBack: () => void;
}) => {
  const { toast } = useToast();
  const { isConnected, sendMessage, subscribe } = useWebSocket();
  const [currentSession, setCurrentSession] = useState<EtfChatSession | null>(null);
  const [messages, setMessages] = useState<EtfChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [guardrailAlerts, setGuardrailAlerts] = useState<GuardrailAlert[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef("");
  
  // Touch gesture handling for mobile UX
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Get authenticated user from auth context
  const { user, isAuthenticated } = useAuth();

  // Get or create active ETF chat session
  const { data: activeSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['/api/etf-bot/sessions', user?.id, 'active'],
    enabled: !!user?.id && isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get chat history for current session
  const { data: chatHistory } = useQuery({
    queryKey: ['/api/etf-bot/sessions', currentSession?.id, 'messages'],
    enabled: !!currentSession?.id,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get ETF recommendations
  const { data: recommendations = [] } = useQuery<ETFRecommendation[]>({
    queryKey: ['/api/etf-bot/recommendations', user?.id],
    enabled: !!user?.id && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get user risk profile
  const { data: riskProfile } = useQuery<UserRiskProfile>({
    queryKey: ['/api/etf-bot/risk-assessment', user?.id],
    enabled: !!user?.id && isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
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
        metadata: { source: 'mobile_mts' }
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
    } else if (!sessionLoading && !startSessionMutation.isPending && isAuthenticated) {
      startSessionMutation.mutate("Mobile MTS ETF Consultation");
    }
  }, [activeSession, sessionLoading, isAuthenticated]);

  // Mobile keyboard visibility detection
  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      const keyboardThreshold = windowHeight * 0.75;
      setIsKeyboardVisible(viewportHeight < keyboardThreshold);
    };

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);

  // Touch gesture handling for swipe to toggle recommendations
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;
    
    // Horizontal swipe is longer than vertical swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swipe left - show recommendations
        setShowRecommendations(true);
      } else {
        // Swipe right - hide recommendations
        setShowRecommendations(false);
      }
      
      // Haptic feedback simulation (visual feedback)
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Demo/Test functionality using sample data (development only)
  const handleDemoRecommendations = (riskLevel: string) => {
    if (!isDev) {
      console.warn('Demo functionality is only available in development mode');
      return;
    }
    const scenario = ETF_TEST_SCENARIOS.find(s => s.riskLevel === riskLevel) || ETF_TEST_SCENARIOS[0];
    
    // Simulate AI response for recommendations
    const demoMessage: EtfChatMessage = {
      id: `demo-${Date.now()}`,
      sessionId: currentSession?.id || 'demo-session',
      content: `${scenario.name} 프로필에 맞는 ETF 추천을 해드릴게요.\n\n` +
        scenario.recommendations.map((rec, index) => 
          `${index + 1}. **${rec.etf.name} (${rec.etf.ticker})**\n` +
          `   - 기대수익률: ${formatPercent(rec.expectedReturn)}\n` +
          `   - 수수료: ${rec.fees}%\n` +
          `   - 추천이유: ${rec.reasoning}\n` +
          (rec.warnings && rec.warnings.length > 0 ? `   - 주의사항: ${rec.warnings.join(', ')}\n` : '')
        ).join('\n'),
      role: 'assistant',
      toolCalls: null,
      safetyFlags: null,
      createdAt: new Date()
    };
    
    setMessages(prev => [...prev, demoMessage]);
    
    // Simulate updating recommendations
    setTimeout(() => {
      queryClient.setQueryData(['/api/etf-bot/recommendations', user?.id], scenario.recommendations);
    }, 500);
  };

  const handleDemoGuardrailAlert = () => {
    if (!isDev) {
      console.warn('Demo functionality is only available in development mode');
      return;
    }
    const randomAlert = SAMPLE_GUARDRAIL_ALERTS[Math.floor(Math.random() * SAMPLE_GUARDRAIL_ALERTS.length)];
    setGuardrailAlerts(prev => [...prev, randomAlert]);
    
    toast({
      title: "가드레일 알림",
      description: randomAlert.message,
      variant: randomAlert.type === 'error' ? 'destructive' : 'default',
    });
  };

  const handleDemoPortfolioAnalysis = () => {
    if (!isDev) {
      console.warn('Demo functionality is only available in development mode');
      return;
    }
    const analysisMessage: EtfChatMessage = {
      id: `demo-analysis-${Date.now()}`,
      sessionId: currentSession?.id || 'demo-session',
      content: `포트폴리오 분석 결과를 알려드릴게요.\n\n` +
        `📊 **현재 포트폴리오 현황**\n` +
        `- 총 자산: ${formatCurrency(5000000)}\n` +
        `- 분산도 점수: 75/100\n` +
        `- 위험도: 중간\n` +
        `- 기대수익률: 8.5%\n\n` +
        `💡 **개선 제안사항**\n` +
        `- 해외주식 비중 확대 (현재 20% → 권장 30%)\n` +
        `- ESG 테마 ETF 추가 고려\n` +
        `- 리밸런싱 주기 3개월로 조정`,
      role: 'assistant',
      toolCalls: null,
      safetyFlags: null,
      createdAt: new Date()
    };
    
    setMessages(prev => [...prev, analysisMessage]);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || sendMessageMutation.isPending) return;
    
    // Check for demo commands first
    const message = inputMessage.trim().toLowerCase();
    
    if (message.includes('데모') || message.includes('테스트')) {
      const userMessage: EtfChatMessage = {
        id: `demo-user-${Date.now()}`,
        sessionId: currentSession?.id || 'demo-session',
        content: inputMessage,
        role: 'user',
        toolCalls: null,
        safetyFlags: null,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputMessage("");
      
      // Simulate typing delay
      setTimeout(() => {
        const demoResponse: EtfChatMessage = {
          id: `demo-response-${Date.now()}`,
          sessionId: currentSession?.id || 'demo-session',
          content: `ETF 챗봇 데모 모드입니다! 다음 명령어를 사용해보세요:\n\n` +
            `🔹 "보수적 추천" - 안전한 ETF 추천\n` +
            `🔹 "공격적 추천" - 고수익 ETF 추천\n` +
            `🔹 "포트폴리오 분석" - 포트폴리오 분석\n` +
            `🔹 "가드레일 테스트" - 위험 알림 테스트\n\n` +
            `아래 빠른 버튼들도 사용해보세요!`,
          role: 'assistant',
          toolCalls: null,
          safetyFlags: null,
          createdAt: new Date()
        };
        setMessages(prev => [...prev, demoResponse]);
      }, 1000);
      
      return;
    }
    
    if (message.includes('보수적') && message.includes('추천')) {
      const userMessage: EtfChatMessage = {
        id: `user-${Date.now()}`,
        sessionId: currentSession?.id || 'demo-session',
        content: inputMessage,
        role: 'user',
        toolCalls: null,
        safetyFlags: null,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputMessage("");
      
      setTimeout(() => handleDemoRecommendations('conservative'), 800);
      return;
    }
    
    if (message.includes('공격적') && message.includes('추천')) {
      const userMessage: EtfChatMessage = {
        id: `user-${Date.now()}`,
        sessionId: currentSession?.id || 'demo-session',
        content: inputMessage,
        role: 'user',
        toolCalls: null,
        safetyFlags: null,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputMessage("");
      
      setTimeout(() => handleDemoRecommendations('aggressive'), 800);
      return;
    }
    
    if (message.includes('포트폴리오') && message.includes('분석')) {
      const userMessage: EtfChatMessage = {
        id: `user-${Date.now()}`,
        sessionId: currentSession?.id || 'demo-session',
        content: inputMessage,
        role: 'user',
        toolCalls: null,
        safetyFlags: null,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputMessage("");
      
      setTimeout(() => handleDemoPortfolioAnalysis(), 800);
      return;
    }
    
    if (message.includes('가드레일') && message.includes('테스트')) {
      const userMessage: EtfChatMessage = {
        id: `user-${Date.now()}`,
        sessionId: currentSession?.id || 'demo-session',
        content: inputMessage,
        role: 'user',
        toolCalls: null,
        safetyFlags: null,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputMessage("");
      
      setTimeout(() => {
        handleDemoGuardrailAlert();
        const responseMessage: EtfChatMessage = {
          id: `guardrail-response-${Date.now()}`,
          sessionId: currentSession?.id || 'demo-session',
          content: "가드레일 알림을 발생시켰습니다. 상단의 알림을 확인해보세요!",
          role: 'assistant',
          toolCalls: null,
          safetyFlags: null,
          createdAt: new Date()
        };
        setMessages(prev => [...prev, responseMessage]);
      }, 800);
      return;
    }
    
    // If not a demo command, use regular mutation
    if (currentSession) {
      sendMessageMutation.mutate(inputMessage.trim());
    } else {
      // If no session, provide demo response
      const userMessage: EtfChatMessage = {
        id: `user-${Date.now()}`,
        sessionId: 'demo-session',
        content: inputMessage,
        role: 'user',
        toolCalls: null,
        safetyFlags: null,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputMessage("");
      
      setTimeout(() => {
        const demoResponse: EtfChatMessage = {
          id: `demo-${Date.now()}`,
          sessionId: 'demo-session',
          content: `ETF 관련 질문 감사합니다! 현재는 데모 모드로 동작하고 있습니다.\n\n` +
            `실제 ETF 상담을 위해서는 로그인이 필요합니다. "데모"라고 입력하시면 테스트 기능들을 사용해보실 수 있어요!`,
          role: 'assistant',
          toolCalls: null,
          safetyFlags: null,
          createdAt: new Date()
        };
        setMessages(prev => [...prev, demoResponse]);
      }, 1000);
    }
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
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-white hover:bg-white/10"
              data-testid="button-back-etf-chatbot"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold">ETF 투자가이드</h2>
                <p className="text-xs text-white/60">로그인 필요</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Required Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Shield className="w-12 h-12 mx-auto text-blue-500" />
            <h3 className="text-lg font-semibold">로그인이 필요합니다</h3>
            <p className="text-sm text-white/60">
              ETF 투자 가이드 상담을 이용하시려면
              로그인해주세요.
            </p>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-500 hover:bg-blue-600"
              data-testid="button-go-to-login"
            >
              로그인하러 가기
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-white/10"
            data-testid="button-back-etf-chatbot"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">ETF 투자가이드</h2>
              <p className="text-xs text-white/60">
                {riskProfile && `위험성향: ${riskProfile.riskLevel === 'conservative' ? '보수적' : 
                                    riskProfile.riskLevel === 'moderate' ? '중간' : '공격적'}`}
              </p>
            </div>
          </div>
          {/* Toggle recommendations panel */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="text-white hover:bg-white/10"
            data-testid="button-toggle-recommendations"
          >
            {showRecommendations ? <XCircle className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Guardrail Alerts */}
      {guardrailAlerts.length > 0 && (
        <div className="p-2 space-y-1" data-testid="guardrail-alerts">
          {guardrailAlerts.map((alert, index) => (
            <Alert 
              key={index} 
              variant={alert.type === 'error' ? 'destructive' : 'default'}
              className="py-2 px-3 bg-white/5 border-white/10"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs pr-6">
                <strong>{alert.title}:</strong> {alert.message}
              </AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1 h-6 w-6 p-0 text-white/60 hover:text-white"
                onClick={() => dismissAlert(index)}
                data-testid={`dismiss-alert-${index}`}
              >
                <XCircle className="h-3 w-3" />
              </Button>
            </Alert>
          ))}
        </div>
      )}

      <div className="flex-1 flex">
        {/* Chat Interface with Touch Gesture Support */}
        <div 
          className={cn(
            "flex flex-col transition-all duration-300",
            showRecommendations ? "w-2/3" : "w-full"
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'pan-y' }} // Allow vertical scrolling, handle horizontal swipes
        >
          {/* Messages Area */}
          <ScrollArea className="flex-1 px-4 py-2" data-testid="messages-area">
            <div className="space-y-3">
              {messages.length === 0 && !isStreaming ? (
                <div className="text-center text-white/60 py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                  <p className="text-sm">ETF 투자 상담을 시작해보세요!</p>
                  <p className="text-xs mt-2">
                    "KODEX 200 ETF가 뭔가요?" 또는
                    "포트폴리오 분석해주세요"와 같이 물어보세요.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex space-x-2 items-start",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                      data-testid={`message-${message.role}-${message.id}`}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="h-6 w-6 mt-1">
                          <AvatarFallback className="bg-blue-500 text-white text-xs">
                            <Bot className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          message.role === 'user'
                            ? "bg-blue-500 text-white"
                            : "bg-white/10 text-white"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                          {message.content}
                        </div>
                        <div className="text-[10px] opacity-70 mt-1">
                          {new Date(message.createdAt || Date.now()).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      
                      {message.role === 'user' && (
                        <Avatar className="h-6 w-6 mt-1">
                          <AvatarFallback className="bg-gray-500 text-white text-xs">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  
                  {/* Streaming Message */}
                  {isStreaming && (
                    <div className="flex space-x-2 items-start justify-start" data-testid="streaming-message">
                      <Avatar className="h-6 w-6 mt-1">
                        <AvatarFallback className="bg-blue-500 text-white text-xs">
                          <Bot className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-[80%] rounded-lg px-3 py-2 bg-white/10 text-white">
                        <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                          {streamingContent}
                          <span className="inline-block w-1 h-3 bg-blue-500 animate-pulse ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Quick Action Buttons with Enhanced Mobile UX */}
          <div className="px-4 py-2">
            <div className="flex flex-wrap gap-1 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("포트폴리오를 분석해주세요")}
                disabled={sendMessageMutation.isPending}
                className="text-xs h-8 px-3 bg-white/5 border-white/10 text-white hover:bg-white/10 active:bg-white/20 transition-all duration-150 touch-manipulation"
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
                className="text-xs h-8 px-3 bg-white/5 border-white/10 text-white hover:bg-white/10 active:bg-white/20 transition-all duration-150 touch-manipulation"
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
                className="text-xs h-8 px-3 bg-white/5 border-white/10 text-white hover:bg-white/10 active:bg-white/20 transition-all duration-150 touch-manipulation"
                data-testid="quick-risk-assessment"
              >
                <Shield className="h-3 w-3 mr-1" />
                위험성향 진단
              </Button>
            </div>
            
            {/* Demo Action Buttons */}
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("데모")}
                className="text-xs h-7 px-2 bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30 active:bg-blue-500/40 transition-all duration-150 touch-manipulation"
                data-testid="quick-demo"
              >
                <Zap className="h-3 w-3 mr-1" />
                데모
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("보수적 추천")}
                className="text-xs h-7 px-2 bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30 active:bg-green-500/40 transition-all duration-150 touch-manipulation"
                data-testid="quick-conservative"
              >
                <Shield className="h-3 w-3 mr-1" />
                보수적
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("공격적 추천")}
                className="text-xs h-7 px-2 bg-orange-500/20 border-orange-500/30 text-orange-300 hover:bg-orange-500/30 active:bg-orange-500/40 transition-all duration-150 touch-manipulation"
                data-testid="quick-aggressive"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                공격적
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("가드레일 테스트")}
                className="text-xs h-7 px-2 bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 active:bg-red-500/40 transition-all duration-150 touch-manipulation"
                data-testid="quick-guardrail"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                가드레일
              </Button>
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-end space-x-2" data-testid="message-input">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="ETF에 대해 궁금한 점을 물어보세요..."
                className="flex-1 bg-white/5 border-white/10 text-white placeholder-white/50 text-sm h-9"
                disabled={sendMessageMutation.isPending || !currentSession}
                data-testid="input-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || sendMessageMutation.isPending || !currentSession}
                className="px-3 h-9 bg-blue-500 hover:bg-blue-600"
                data-testid="button-send"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Recommendations Sidebar */}
        <AnimatePresence>
          {showRecommendations && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="w-1/3 border-l border-white/10 p-3"
            >
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                추천 ETF
              </h3>
              
              <ScrollArea className="h-full">
                {recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {recommendations.slice(0, 3).map((rec, index) => (
                      <Card
                        key={rec.etf.id}
                        className="p-2 bg-white/5 border-white/10"
                        data-testid={`recommendation-${index}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-medium truncate">{rec.etf.name}</h4>
                            <Badge
                              variant={
                                rec.riskLevel === 'low' ? 'default' :
                                rec.riskLevel === 'medium' ? 'secondary' : 'destructive'
                              }
                              className="text-[10px] h-4"
                            >
                              {rec.riskLevel === 'low' ? '낮음' :
                               rec.riskLevel === 'medium' ? '중간' : '높음'}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-white/60 truncate">{rec.etf.ticker}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-green-400">
                              {formatPercent(rec.expectedReturn)}
                            </span>
                            <span className="text-[10px] text-white/60">
                              수수료: {rec.fees.toFixed(2)}%
                            </span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1">
                            <div 
                              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${rec.score * 100}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-white/70 leading-tight line-clamp-2">
                            {rec.reasoning}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-white/60 py-4">
                    <PieChart className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-xs">추천 ETF가
                    준비되고 있습니다</p>
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Main MTS Component
export default function MTS() {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showETFChatbot, setShowETFChatbot] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Fetch themes
  const { data: themes = [] } = useQuery<Theme[]>({
    queryKey: ['/api/themes']
  });

  // Fetch theme statistics
  const { data: themeStats = [] } = useQuery<ThemeStats[]>({
    queryKey: ['/api/themes/stats'],
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // WebSocket connection for real-time updates
  const { subscribe } = useWebSocket();

  useEffect(() => {
    // Subscribe to theme updates
    const unsubThemeNews = subscribe('theme_news', (data) => {
      console.log('Theme news update:', data);
      setIsConnected(true);
      setTimeout(() => setIsConnected(false), 3000);
    });

    const unsubThemeSummary = subscribe('theme_summary', (data) => {
      console.log('Theme summary update:', data);
      setIsConnected(true);
      setTimeout(() => setIsConnected(false), 3000);
    });

    return () => {
      unsubThemeNews();
      unsubThemeSummary();
    };
  }, [subscribe]);

  // Create theme stats map for quick lookup
  const themeStatsMap = useMemo(() => {
    const map: Record<string, ThemeStats> = {};
    themeStats.forEach(stat => {
      map[stat.themeId] = stat;
    });
    return map;
  }, [themeStats]);

  // Get sorted themes (limit to 10)
  const displayThemes = useMemo(() => {
    return themes.slice(0, 10);
  }, [themes]);

  const isDesktop = window.innerWidth >= 1024;

  const phoneContent = (
    <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black rounded-[27px] overflow-hidden">
      {/* iPhone Status Bar */}
      <IPhoneStatusBar />
      
      {/* Dynamic Island */}
      <div className="px-4 py-2">
        <DynamicIsland isActive={isConnected} />
      </div>

      {/* Main Content */}
      <div className="h-[calc(100%-100px)] relative">
        <AnimatePresence mode="wait">
          {selectedTheme ? (
            <ThemeDetailView
              key="detail"
              themeId={selectedTheme}
              onBack={() => setSelectedTheme(null)}
            />
          ) : (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <div className="flex flex-col items-center justify-center">
                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white text-xl font-bold mb-8"
                >
                  테마별 시황
                </motion.h1>

                {/* Circular Menu Container */}
                <div className="relative w-[300px] h-[300px] flex items-center justify-center overflow-visible">
                {/* Center Logo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-2xl">
                    <span className="text-white font-bold text-2xl">NH</span>
                  </div>
                </motion.div>

                {/* Theme Buttons */}
                {displayThemes.map((theme, index) => {
                  const position = calculateCircularPosition(index, displayThemes.length + 1, 110);
                  return (
                    <ThemeButton
                      key={theme.id}
                      theme={theme}
                      stats={themeStatsMap[theme.id]}
                      position={position}
                      index={index}
                      onClick={() => setSelectedTheme(theme.id)}
                    />
                  );
                })}

                {/* ETF Chatbot Button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: displayThemes.length * 0.1,
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowETFChatbot(true)}
                  className="absolute flex flex-col items-center gap-1 group"
                  style={{
                    left: `${calculateCircularPosition(displayThemes.length, displayThemes.length + 1, 110).x}px`,
                    top: `${calculateCircularPosition(displayThemes.length, displayThemes.length + 1, 110).y}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  data-testid="button-etf-chatbot"
                >
                  <div className="relative w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-200 group-hover:shadow-xl group-hover:scale-105 bg-gradient-to-br from-blue-500/40 to-blue-600/60">
                    <MessageCircle className="w-8 h-8 text-white" />
                    {isAuthenticated && (
                      <Badge className="absolute -top-1 -right-1 min-w-[20px] h-5 p-0 flex items-center justify-center bg-green-500 text-white">
                        <CheckCircle className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-medium text-white/90 max-w-[60px] truncate">
                      ETF 챗봇
                    </p>
                    <div className="flex items-center gap-0.5 text-blue-400">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-[8px]">AI 상담</span>
                    </div>
                  </div>
                </motion.button>
                </div>

                {/* Last Update Time */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="mt-8 flex flex-col items-center gap-3"
                >
                  <div className="flex items-center gap-2 text-white/60 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>실시간 업데이트 중</span>
                  </div>
                  
                  {/* Admin Link for Theme Management */}
                  {(user?.role === 'admin' || user?.role === 'ops' || user?.role === 'analyst') && (
                    <motion.a
                      href="/theme-cluster-management"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.4 }}
                      className="px-3 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
                      data-testid="link-theme-admin"
                    >
                      <Settings className="w-3 h-3 inline mr-1" />
                      테마 관리
                    </motion.a>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="w-32 h-1 bg-white/30 rounded-full" />
      </div>
    </div>
  );

  if (!isDesktop) {
    // Mobile view - full screen without frame
    return (
      <div className="fixed inset-0 bg-black">
        {phoneContent}
      </div>
    );
  }

  // Desktop view - with iPhone frame
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      {/* iPhone 15 Pro Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="relative"
      >
        <div 
          className="relative w-[430px] h-[880px] rounded-[54px] p-[14px] shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.1),
              0 0 0 4px #1a1a1a,
              0 0 0 6px #404040,
              0 20px 40px rgba(0,0,0,0.6),
              0 50px 80px rgba(0,0,0,0.4)
            `
          }}
        >
          {/* Screen */}
          <div className="w-full h-full bg-black rounded-[40px] overflow-hidden">
            {phoneContent}
          </div>

          {/* Side Buttons */}
          <div className="absolute top-[180px] -left-[3px] w-[3px] h-[40px] bg-gray-700 rounded-l-md" />
          <div className="absolute top-[240px] -left-[3px] w-[3px] h-[60px] bg-gray-700 rounded-l-md" />
          <div className="absolute top-[320px] -left-[3px] w-[3px] h-[60px] bg-gray-700 rounded-l-md" />
          <div className="absolute top-[200px] -right-[3px] w-[3px] h-[80px] bg-gray-700 rounded-r-md" />
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-3xl animate-pulse" />
        </div>
      </motion.div>

      {/* Desktop Info */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="ml-12 max-w-sm"
      >
        <h2 className="text-3xl font-bold text-white mb-4">
          MTS 테마 시황
        </h2>
        <p className="text-white/70 mb-6">
          실시간 뉴스 클러스터링을 통한 테마별 시장 분석을 모바일에서 간편하게 확인하세요.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-white/60">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm">실시간 업데이트</span>
          </div>
          <div className="flex items-center gap-3 text-white/60">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-sm">AI 기반 요약</span>
          </div>
          <div className="flex items-center gap-3 text-white/60">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span className="text-sm">10개 주요 테마</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}