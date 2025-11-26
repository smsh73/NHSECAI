import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, 
  Bot,
  User,
  DollarSign,
  TrendingUp,
  BookOpen,
  Search,
  Lightbulb,
  Copy,
  ExternalLink,
  AlertCircle,
  History,
  Trash2,
  RefreshCw,
  Download,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tools?: any[];
  sessionId?: string;
  searchResults?: any[]; // RAG 검색 결과
}

interface FinancialPrompt {
  id: string;
  title: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'terms' | 'analysis' | 'data';
}

const FINANCIAL_PROMPTS: FinancialPrompt[] = [
  {
    id: '1',
    title: '금융 용어 설명',
    prompt: '"주식", "채권", "ETF"의 차이점을 설명해주세요.',
    icon: BookOpen,
    category: 'terms'
  },
  {
    id: '2',
    title: '시장 분석',
    prompt: '최근 주식 시장 동향과 주요 이슈를 분석해주세요.',
    icon: TrendingUp,
    category: 'analysis'
  },
  {
    id: '3',
    title: '투자 지표 설명',
    prompt: 'PER, PBR, ROE 등 주요 투자 지표들의 의미를 설명해주세요.',
    icon: DollarSign,
    category: 'terms'
  },
  {
    id: '4',
    title: '거래량 분석',
    prompt: '거래량이 주가에 미치는 영향을 설명해주세요.',
    icon: TrendingUp,
    category: 'analysis'
  },
  {
    id: '5',
    title: '종목 정보 조회',
    prompt: '삼성전자의 최근 주가 동향과 관련 뉴스를 조회해주세요.',
    icon: Search,
    category: 'data'
  },
  {
    id: '6',
    title: '시장 용어 검색',
    prompt: '"공매도", "배당수익률", "시가총액"의 뜻을 알려주세요.',
    icon: BookOpen,
    category: 'terms'
  }
];

export function FinancialChatbot() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'qa' | 'terms'>('qa');
  const [selectedHistorySession, setSelectedHistorySession] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamingRef = useRef('');

  // WebSocket for real-time updates
  const { lastMessage, isConnected } = useWebSocket('/ws');

  // Fetch chat sessions history
  const { data: chatSessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['/api/ai-chat/sessions', user?.id],
    enabled: !!user?.id && isAuthenticated,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai-chat/sessions?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat sessions');
      }
      const data = await response.json();
      return data.sessions || data || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch messages for selected session
  const { data: sessionMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/ai-chat/sessions', selectedHistorySession, 'messages'],
    enabled: !!selectedHistorySession && !!user?.id,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai-chat/sessions/${selectedHistorySession}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch session messages');
      }
      const data = await response.json();
      const fetchedMessages = (data.messages || data || []).map((msg: any) => ({
        id: msg.id || msg.messageId,
        role: msg.role || msg.type || 'assistant',
        content: msg.content || msg.text || msg.message || '',
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(msg.createdAt || Date.now()),
        sessionId: msg.sessionId || selectedHistorySession,
        tools: msg.tools || msg.metadata?.tools
      }));
      return fetchedMessages;
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Load session messages when session is selected
  useEffect(() => {
    if (sessionMessages && selectedHistorySession) {
      setMessages(sessionMessages);
      setCurrentSessionId(selectedHistorySession);
    }
  }, [sessionMessages, selectedHistorySession]);

  // Handle WebSocket messages with streaming support
  useEffect(() => {
    if (lastMessage) {
      const messageType = lastMessage.type || lastMessage.event;
      const data = lastMessage.data || lastMessage;
      
      if (messageType === 'chat_message' || messageType === 'message') {
        if (data.sessionId === currentSessionId || !currentSessionId) {
          if (data.role === 'assistant' || data.type === 'assistant') {
            // Handle streaming content
            if (data.streaming) {
              setIsStreaming(true);
              streamingRef.current += data.content || data.chunk || '';
              setStreamingContent(streamingRef.current);
            } else if (data.done || data.finished) {
              // Streaming complete, save final message
              setIsStreaming(false);
              const assistantMessage: ChatMessage = {
                id: data.id || data.messageId || `ws-${Date.now()}`,
                role: 'assistant',
                content: streamingRef.current || data.content || '',
                timestamp: new Date(data.timestamp || Date.now()),
                tools: data.tools || data.metadata?.tools,
                sessionId: data.sessionId || currentSessionId,
                searchResults: data.searchResults || data.metadata?.searchResults // RAG 검색 결과 포함
              };
              setMessages(prev => {
                // Remove any temporary streaming messages and add final
                const filtered = prev.filter(msg => !msg.id.startsWith('streaming-'));
                return [...filtered, assistantMessage];
              });
              streamingRef.current = '';
              setStreamingContent('');
              
              // Refresh sessions
              if (data.sessionId) {
                setCurrentSessionId(data.sessionId);
                queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/sessions'] });
              }
            } else {
              // Regular message
              const assistantMessage: ChatMessage = {
                id: data.id || data.messageId || `ws-${Date.now()}`,
                role: 'assistant',
                content: data.content || data.text || data.message || '',
                timestamp: new Date(data.timestamp || Date.now()),
                tools: data.tools || data.metadata?.tools,
                sessionId: data.sessionId || currentSessionId
              };
              setMessages(prev => {
                // Avoid duplicate messages
                const exists = prev.some(msg => msg.id === assistantMessage.id || 
                  (msg.content === assistantMessage.content && msg.role === 'assistant' && 
                   Math.abs(msg.timestamp.getTime() - assistantMessage.timestamp.getTime()) < 5000));
                if (exists) return prev;
                return [...prev, assistantMessage];
              });
              
              if (data.sessionId && !currentSessionId) {
                setCurrentSessionId(data.sessionId);
              }
              
              // Refresh sessions
              queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/sessions'] });
            }
          } else if (data.role === 'user' || data.type === 'user') {
            // User message from server (e.g., after save)
            // Replace temporary user message if it exists
            const userMessage: ChatMessage = {
              id: data.id || data.messageId || `user-${Date.now()}`,
              role: 'user',
              content: data.content || data.text || data.message || '',
              timestamp: new Date(data.timestamp || Date.now()),
              sessionId: data.sessionId || currentSessionId
            };
            setMessages(prev => {
              // Check if this is a replacement for a temp message
              const tempMessageIndex = prev.findIndex(msg => 
                msg.id.startsWith('user-temp-') && 
                msg.content === userMessage.content &&
                Math.abs(msg.timestamp.getTime() - userMessage.timestamp.getTime()) < 5000
              );
              
              if (tempMessageIndex >= 0) {
                // Replace temp message with saved message
                const updated = [...prev];
                updated[tempMessageIndex] = userMessage;
                return updated;
              }
              
              // Check for duplicate by ID or content
              const exists = prev.some(msg => 
                msg.id === userMessage.id || 
                (msg.role === 'user' && msg.content === userMessage.content && 
                 Math.abs(msg.timestamp.getTime() - userMessage.timestamp.getTime()) < 2000)
              );
              if (exists) return prev;
              return [...prev, userMessage];
            });
          }
        }
      }
    }
  }, [lastMessage, currentSessionId, queryClient]);

  // Scroll to bottom when new message is added or streaming content changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      });
    }
  }, [messages, streamingContent]);

  // Auto-focus input after streaming completes
  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isStreaming]);

  // Send message mutation with enhanced streaming
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/ai-chat/session', {
        message: content,
        sessionId: currentSessionId,
        userId: user?.id,
        context: 'financial',
        model: 'gpt-4o-mini',
        stream: true, // Enable streaming
        enableRAG: true, // RAG 검색 활성화
        searchIndexName: 'default-index', // RAG 검색 인덱스 이름
        maxSearchResults: 5 // 최대 검색 결과 수
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || 'Failed to send message');
      }
      return await response.json();
    },
    onSuccess: (response) => {
      if (response.success || response.sessionId) {
        if (response.sessionId && !currentSessionId) {
          setCurrentSessionId(response.sessionId);
        }
        // Refresh sessions list
        queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/sessions'] });
        // Don't add assistant message here - wait for WebSocket/streaming
      }
    },
    onError: (error: any) => {
      toast({
        title: "메시지 전송 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error.message || '죄송합니다. 현재 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsStreaming(false);
      streamingRef.current = '';
      setStreamingContent('');
    }
  });

  // Create new session
  const createNewSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai-chat/sessions', {
        userId: user?.id,
        context: 'financial',
        model: 'gpt-4o-mini'
      });
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      const sessionId = data.sessionId || data.id;
      if (sessionId) {
        setCurrentSessionId(sessionId);
        setMessages([]);
        setSelectedHistorySession(null);
        queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/sessions'] });
        toast({
          title: "새 세션 생성",
          description: "새로운 대화를 시작합니다.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "세션 생성 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  });

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('DELETE', `/api/ai-chat/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to delete session');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-chat/sessions'] });
      if (selectedHistorySession === currentSessionId) {
        setSelectedHistorySession(null);
        setCurrentSessionId(null);
        setMessages([]);
      }
      toast({
        title: "세션 삭제 완료",
        description: "세션이 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "세션 삭제 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim() || sendMessageMutation.isPending) return;
    if (!isAuthenticated || !user?.id) {
      toast({
        title: "로그인 필요",
        description: "채팅 기능을 사용하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    const messageToSend = inputMessage.trim();
    const messageId = `user-temp-${Date.now()}`;
    
    // Initialize streaming state
    setIsStreaming(true);
    streamingRef.current = '';
    setStreamingContent('');

    // Add user message immediately (will be replaced with saved message from server if it comes back)
    const userMessage: ChatMessage = {
      id: messageId,
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
      sessionId: currentSessionId || undefined
    };
    
    setMessages(prev => {
      // Check for duplicate messages by content and recent timestamp
      const isDuplicate = prev.some(msg => 
        msg.role === 'user' && 
        msg.content === messageToSend && 
        Math.abs(msg.timestamp.getTime() - userMessage.timestamp.getTime()) < 2000
      );
      if (isDuplicate) return prev;
      return [...prev, userMessage];
    });
    
    // Add temporary streaming message placeholder
    const streamingPlaceholder: ChatMessage = {
      id: `streaming-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sessionId: currentSessionId || undefined
    };
    setMessages(prev => [...prev, streamingPlaceholder]);
    
    // Clear input
    setInputMessage('');
    
    // Send to API
    sendMessageMutation.mutate(messageToSend);
  };

  const handleNewSession = () => {
    createNewSessionMutation.mutate();
  };

  const handleLoadSession = (sessionId: string) => {
    setSelectedHistorySession(sessionId);
    setCurrentSessionId(sessionId);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('이 세션을 삭제하시겠습니까?')) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) {
      toast({
        title: "내보낼 메시지 없음",
        description: "대화 내역이 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    const chatExport = {
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }))
    };
    
    const blob = new Blob([JSON.stringify(chatExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${currentSessionId || 'new'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "내보내기 완료",
      description: "대화 내역이 다운로드되었습니다.",
    });
  };

  const handlePromptClick = (prompt: FinancialPrompt) => {
    setInputMessage(prompt.prompt);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "복사 완료",
      description: "메시지가 클립보드에 복사되었습니다.",
    });
  };

  const formatMessage = (content: string) => {
    // Enhanced markdown-like formatting with Perplexity style
    let formatted = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-5 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-lg my-3 overflow-x-auto"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline inline-flex items-center gap-1"><span>$1</span><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="my-2">')
      .replace(/\n/g, '<br/>');
    
    // Wrap in paragraph if not already wrapped
    if (!formatted.startsWith('<')) {
      formatted = '<p>' + formatted + '</p>';
    }
    
    return formatted;
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-background to-muted/20" data-testid="financial-chatbot-page">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="text-page-title">
            금융 AI 어시스턴트
          </h1>
          <p className="text-muted-foreground text-lg">
            금융 용어 설명, 시장 분석, 투자 정보 등을 AI와 대화를 통해 알아보세요
          </p>
          <div className="flex items-center justify-center mt-3 space-x-4">
            <Badge variant={isConnected ? "default" : "destructive"} data-testid="status-websocket" className="px-3 py-1">
              {isConnected ? "실시간 연결됨" : "연결 끊김"}
            </Badge>
            <Badge variant="secondary" data-testid="status-model" className="px-3 py-1">GPT-4o-mini</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Prompts Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                빠른 질문
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={chatMode} onValueChange={(value) => setChatMode(value as 'qa' | 'terms')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="qa" data-testid="tab-qa">질문/분석</TabsTrigger>
                  <TabsTrigger value="terms" data-testid="tab-terms">용어 설명</TabsTrigger>
                </TabsList>
                
                <TabsContent value="qa" className="space-y-2">
                  {FINANCIAL_PROMPTS
                    .filter(p => p.category === 'analysis' || p.category === 'data')
                    .map((prompt) => {
                      const IconComponent = prompt.icon;
                      return (
                        <Button
                          key={prompt.id}
                          variant="outline"
                          size="sm"
                          className="w-full h-auto p-3 text-left justify-start text-xs"
                          onClick={() => handlePromptClick(prompt)}
                          data-testid={`button-prompt-${prompt.id}`}
                        >
                          <IconComponent className="w-3 h-3 mr-2 flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium">{prompt.title}</div>
                            <div className="text-muted-foreground mt-1 text-xs line-clamp-2">
                              {prompt.prompt}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                </TabsContent>
                
                <TabsContent value="terms" className="space-y-2">
                  {FINANCIAL_PROMPTS
                    .filter(p => p.category === 'terms')
                    .map((prompt) => {
                      const IconComponent = prompt.icon;
                      return (
                        <Button
                          key={prompt.id}
                          variant="outline"
                          size="sm"
                          className="w-full h-auto p-3 text-left justify-start text-xs"
                          onClick={() => handlePromptClick(prompt)}
                          data-testid={`button-prompt-${prompt.id}`}
                        >
                          <IconComponent className="w-3 h-3 mr-2 flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium">{prompt.title}</div>
                            <div className="text-muted-foreground mt-1 text-xs line-clamp-2">
                              {prompt.prompt}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-200px)] flex flex-col shadow-xl border-2">
            <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-lg font-semibold">금융 AI 어시스턴트</span>
                    <p className="text-xs text-muted-foreground mt-0.5">RAG 검색 기반 AI 챗봇</p>
                  </div>
                </div>
                {currentSessionId && (
                  <Badge variant="outline" className="text-xs font-mono px-2 py-1">
                    {currentSessionId.slice(0, 8)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 min-h-0 bg-gradient-to-b from-background to-muted/30">
              {/* Messages Area */}
              <div 
                className="flex-1 p-6 overflow-y-auto overflow-x-hidden"
                ref={scrollAreaRef}
                data-testid="chat-messages-area"
                style={{ 
                  userSelect: 'text', 
                  WebkitUserSelect: 'text',
                  maxHeight: 'calc(100% - 140px)', // Reserve space for input area
                  minHeight: 0
                }}
              >
                {messages.length === 0 && !isStreaming ? (
                  <div className="text-center text-muted-foreground py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Bot className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-2xl font-semibold mb-3 text-foreground">금융 AI 어시스턴트입니다</p>
                    <p className="text-base mb-6 max-w-md mx-auto">
                      금융 용어, 시장 분석, 투자 정보 등 궁금한 것을 물어보세요
                    </p>
                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200 max-w-md mx-auto">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      모든 정보는 참고용이며, 투자 결정은 개인의 책임입니다.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 max-w-4xl mx-auto">
                    {messages.map((message) => {
                      // Skip temporary streaming placeholder if no content
                      if (message.id.startsWith('streaming-') && !streamingContent) {
                        return null;
                      }
                      
                      // Update streaming message content
                      const displayContent = message.id.startsWith('streaming-') 
                        ? streamingContent 
                        : message.content;
                      
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-4",
                            message.role === 'user' ? "justify-end" : "justify-start flex-col"
                          )}
                          data-testid={`message-${message.role}-${message.id}`}
                        >
                          {message.role === 'assistant' && (
                            <div className="flex items-center gap-3 mb-1">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Bot className="w-5 h-5 text-primary" />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">AI 어시스턴트</span>
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-2xl px-5 py-4 text-sm shadow-sm transition-all",
                              message.role === 'user'
                                ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground max-w-[75%] rounded-br-md"
                                : "bg-white dark:bg-gray-800 border border-border/50 max-w-full rounded-bl-md"
                            )}
                          >
                            {message.id.startsWith('streaming-') && isStreaming ? (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="prose prose-sm dark:prose-invert max-w-none"
                                  dangerouslySetInnerHTML={{ 
                                    __html: formatMessage(displayContent) 
                                  }}
                                />
                                <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded" />
                              </div>
                            ) : (
                              <div 
                                className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                                dangerouslySetInnerHTML={{ 
                                  __html: formatMessage(displayContent) 
                                }}
                              />
                            )}
                            
                            {/* RAG Search Results - Perplexity Style */}
                            {message.searchResults && message.searchResults.length > 0 && (
                              <div className="mt-5 space-y-3 border-t border-border/50 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Search className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-semibold text-foreground">참조 자료</span>
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {message.searchResults.length}건
                                  </Badge>
                                </div>
                                <div className="space-y-3">
                                  {message.searchResults.slice(0, 5).map((result: any, index: number) => (
                                    <div
                                      key={index}
                                      className="group relative flex gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                      onClick={() => {
                                        // 검색 결과 상세 보기 (향후 구현)
                                      }}
                                    >
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                        {index + 1}
                                      </div>
                                      <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                                            {result.content}
                                          </p>
                                          {result.score && (
                                            <Badge variant="outline" className="text-xs flex-shrink-0">
                                              {(result.score * 100).toFixed(0)}%
                                            </Badge>
                                          )}
                                        </div>
                                        {result.metadata && Object.keys(result.metadata).length > 0 && (
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {Object.entries(result.metadata)
                                              .slice(0, 3)
                                              .map(([key, value], idx) => (
                                                <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                                                  <span className="font-medium">{key}:</span>
                                                  <span>{String(value)}</span>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                        {result.highlights && Object.keys(result.highlights).length > 0 && (
                                          <div className="text-xs text-muted-foreground italic line-clamp-1">
                                            {Object.values(result.highlights).flat().slice(0, 1).join(' ... ')}
                                          </div>
                                        )}
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Tool Results */}
                            {message.tools && message.tools.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <div className="text-xs font-medium text-muted-foreground border-t pt-2">
                                  📊 활용된 도구:
                                </div>
                                {message.tools.map((tool, index) => (
                                  <div key={index} className="text-xs bg-background/50 rounded p-2">
                                    <div className="font-mono text-primary">{tool.tool}({tool.input})</div>
                                    <div className="mt-1">{JSON.stringify(tool.result, null, 2)}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {message.role === 'assistant' && !message.id.startsWith('streaming-') && (
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    {message.timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 hover:bg-muted"
                                    onClick={() => copyToClipboard(message.content)}
                                    data-testid={`button-copy-${message.id}`}
                                    title="복사"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 hover:bg-muted"
                                    onClick={() => {
                                      // 좋아요 기능 (향후 구현)
                                      toast({ title: "좋아요", description: "피드백 감사합니다" });
                                    }}
                                    title="좋아요"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 hover:bg-muted"
                                    onClick={() => {
                                      // 싫어요 기능 (향후 구현)
                                      toast({ title: "피드백", description: "개선하겠습니다" });
                                    }}
                                    title="싫어요"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                          {message.role === 'user' && (
                            <div className="flex items-center gap-3 mb-1 justify-end">
                              <span className="text-xs font-medium text-muted-foreground">사용자</span>
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <User className="w-5 h-5" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Loading indicator for initial request - Perplexity Style */}
                    {sendMessageMutation.isPending && !isStreaming && !messages.some(m => m.id.startsWith('streaming-')) && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">AI 어시스턴트</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-border/50 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex space-x-1.5">
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                            <span className="text-sm text-muted-foreground">AI가 답변을 생성하고 있습니다...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input Area - Perplexity Style */}
              <div className="border-t border-border/50 bg-background/50 backdrop-blur-sm p-4">
                <div className="max-w-4xl mx-auto">
                  <div className="relative flex items-end gap-3">
                    <div className="flex-1 relative">
                      <Textarea
                        ref={inputRef}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="금융 관련 질문을 입력하세요..."
                        disabled={sendMessageMutation.isPending}
                        data-testid="input-chat-message"
                        className="min-h-[60px] max-h-[200px] resize-none pr-12 text-base rounded-2xl border-2 focus:border-primary shadow-sm"
                        rows={1}
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                          <span>Enter</span>
                        </kbd>
                      </div>
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                      size="lg"
                      className="h-[60px] w-[60px] rounded-full shadow-lg hover:shadow-xl transition-shadow"
                    >
                      {sendMessageMutation.isPending ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      <span>팁: "삼성전자 주가", "PER 뜻", "채권 투자" 등으로 질문해보세요</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}