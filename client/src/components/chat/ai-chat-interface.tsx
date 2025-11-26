import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Send, 
  Mic, 
  Paperclip,
  Bot,
  User,
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePromptSuggestions } from '@/hooks/use-prompt-suggestions';
import { PromptSuggestionsOverlay } from './prompt-suggestions-overlay';

// Remove markdown formatting from text
const removeMarkdown = (text: string): string => {
  return text
    .replace(/#{1,6}\s+/g, '')           // Remove # headers
    .replace(/\*\*(.+?)\*\*/g, '$1')     // Remove ** bold **
    .replace(/\*(.+?)\*/g, '$1')         // Remove * italic *
    .replace(/__(.+?)__/g, '$1')         // Remove __ bold __
    .replace(/_(.+?)_/g, '$1')           // Remove _ italic _
    .replace(/`(.+?)`/g, '$1')           // Remove `code`
    .replace(/~~(.+?)~~/g, '$1')         // Remove ~~strikethrough~~
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // Remove [text](url) -> text
    .replace(/^\s*[-*+]\s+/gm, '• ')     // Replace list markers with bullet
    .replace(/^\s*\d+\.\s+/gm, '')       // Remove numbered list markers
    .replace(/^>\s+/gm, '')              // Remove blockquote >
    .replace(/---+/g, '')                // Remove horizontal rules
    .replace(/\n{3,}/g, '\n\n');         // Normalize multiple newlines
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ExamplePrompt {
  id: string;
  title: string;
  prompt: string;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    id: '1',
    title: '시황 분석 생성',
    prompt: '최근 주요 뉴스를 바탕으로 오늘의 시장 시황 분석을 작성해주세요.'
  },
  {
    id: '2',
    title: '워크플로우 상태 확인',
    prompt: '현재 실행 중인 워크플로우들의 상태와 성능을 요약해주세요.'
  },
  {
    id: '3',
    title: '데이터 스키마 조회',
    prompt: '금융 데이터 스키마의 주요 테이블과 관계를 설명해주세요.'
  },
  {
    id: '4',
    title: 'RAG 검색 실행',
    prompt: '특정 종목이나 테마에 대한 최신 분석 정보를 검색해주세요.'
  },
  {
    id: '5',
    title: '리포트 생성',
    prompt: '선택한 ETF에 대한 상세 투자 리포트를 생성해주세요.'
  },
  {
    id: '6',
    title: '시스템 최적화',
    prompt: '시스템 성능 개선을 위한 추천 사항을 제안해주세요.'
  }
];

interface AIChatInterfaceProps {
  className?: string;
}

export function AIChatInterface({ className }: AIChatInterfaceProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Fetch current OpenAI model name
  const { data: modelData } = useQuery<{ modelName: string }>({
    queryKey: ['/api/azure/config/model-name'],
  });

  const modelName = modelData?.modelName || 'GPT-4.1';

  // Initialize prompt suggestions hook
  const {
    suggestions,
    isVisible: suggestionsVisible,
    isLoading: suggestionsLoading,
    updateInput,
    addToHistory,
    showSuggestions,
    hideSuggestions,
    toggleSuggestions
  } = usePromptSuggestions({
    debounceMs: 300,
    minInputLength: 2,
    maxSuggestions: 6,
    autoShow: true
  });

  // Scroll to bottom when new message is added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/ai-chat', {
        content,
        context: 'home_assistant'
      });
      const data = await response.json();
      
      // Check if response is successful
      if (!data.success) {
        throw new Error(data.error || 'AI API call failed');
      }
      
      return data;
    },
    onSuccess: (response) => {
      // Add AI response
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.content || '죄송합니다. 응답을 생성할 수 없습니다.',
          timestamp: new Date()
        }
      ]);
    },
    onError: (error: any) => {
      console.error('Message send error:', error);
      toast({
        title: "메시지 전송 실패",
        description: error?.message || "메시지를 전송하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    addToHistory({ role: 'user', content: inputMessage });
    sendMessageMutation.mutate(inputMessage);
    setInputMessage('');
    hideSuggestions();
  };

  const handlePromptClick = (prompt: ExamplePrompt) => {
    setInputMessage(prompt.prompt);
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);
    updateInput(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Space (or Cmd+Space on Mac) for suggestions
    if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      toggleSuggestions();
    }
    // Ctrl+A / Cmd+A for select all in input field
    if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
      if (e.target === inputRef.current || (e.target as HTMLElement)?.tagName === 'INPUT') {
        e.stopPropagation();
        // Allow default behavior (select all)
        return;
      }
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    setInputMessage(suggestion.text);
    hideSuggestions();
    inputRef.current?.focus();
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="bg-gradient-to-b from-background via-background to-muted/20 border-t">
        <div className="container mx-auto px-6 py-8">
          
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-foreground">
              AI 어시스턴트에게 물어보세요
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              아래 예시를 클릭하거나 직접 질문을 입력하세요
            </p>
          </div>

          {/* Example Prompts - Simple Text Style */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {EXAMPLE_PROMPTS.map((prompt) => {
              return (
                <button
                  key={prompt.id}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-4 py-2 rounded-lg border border-border/50 bg-card hover:bg-muted/50 hover:border-primary/50 transition-colors text-sm text-foreground"
                  data-testid={`button-prompt-${prompt.id}`}
                >
                  {prompt.prompt}
                </button>
              );
            })}
          </div>

          {/* Chat Interface */}
          <Card className="border-2 shadow-2xl bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader 
              className="pb-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-chat-toggle"
            >
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg animate-pulse" />
                    <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80">
                      <Bot className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                  <span className="text-lg font-bold">AI 어시스턴트</span>
                  <Badge variant="secondary" className="font-semibold px-3 shadow-sm">
                    {modelName}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="gap-2">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span className="text-sm">접기</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span className="text-sm">펼치기</span>
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="pt-0 pb-6">
                {/* Messages Area */}
                <ScrollArea 
                  className="h-96 mb-6 border-2 rounded-xl p-4 bg-muted/20"
                  ref={scrollAreaRef}
                  style={{ userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text', msUserSelect: 'text', cursor: 'text' }}
                  onSelect={(e) => e.stopPropagation()}
                  onDragStart={(e) => {
                    const selection = window.getSelection();
                    if (selection && selection.toString().length > 0) {
                      e.dataTransfer.setData('text/plain', selection.toString());
                    }
                  }}
                  data-testid="chat-messages-area"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-4">
                        <Bot className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">대화를 시작해보세요!</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        궁금한 것을 물어보시면 AI가 도와드리겠습니다
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3 items-start",
                            message.role === 'user' ? "justify-end" : "justify-start"
                          )}
                          data-testid={`message-${message.role}-${message.id}`}
                        >
                          {message.role === 'assistant' && (
                            <div className="relative flex-shrink-0">
                              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md" />
                              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-4 py-3 shadow-md",
                              message.role === 'user'
                                ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                                : "bg-white dark:bg-gray-800 border-2 border-border/50 text-gray-900 dark:text-gray-100"
                            )}
                          >
                            <p 
                              className="text-sm leading-relaxed whitespace-pre-wrap select-text"
                              onDragStart={(e) => {
                                // Allow dragging text content
                                e.dataTransfer.effectAllowed = 'copy';
                                const selection = window.getSelection();
                                if (selection && selection.toString()) {
                                  e.dataTransfer.setData('text/plain', selection.toString());
                                } else {
                                  e.dataTransfer.setData('text/plain', message.content);
                                }
                              }}
                              onKeyDown={(e) => {
                                // Enable Ctrl+A / Cmd+A for select all in message content
                                if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
                                  e.stopPropagation();
                                  // Allow default behavior (select all)
                                  return;
                                }
                              }}
                              style={{ userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text', msUserSelect: 'text', cursor: 'text' }}
                              onSelect={(e) => e.stopPropagation()}
                              onDragStartCapture={(e) => {
                                const selection = window.getSelection();
                                if (selection && selection.toString().length > 0) {
                                  e.dataTransfer.setData('text/plain', selection.toString());
                                }
                              }}
                            >
                              {removeMarkdown(message.content)}
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                              <span className={cn(
                                "text-xs",
                                message.role === 'user' ? "text-primary-foreground/70" : "text-gray-500 dark:text-gray-400"
                              )}>
                                {new Date(message.timestamp).toLocaleTimeString('ko-KR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(message.content);
                                    toast({
                                      title: "복사됨",
                                      description: "메시지가 클립보드에 복사되었습니다.",
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "복사 실패",
                                      description: "클립보드에 복사할 수 없습니다.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                data-testid={`button-copy-${message.id}`}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {message.role === 'user' && (
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center flex-shrink-0 shadow-md">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Loading indicator */}
                      {sendMessageMutation.isPending && (
                        <div className="flex gap-3 items-start justify-start">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md animate-pulse" />
                            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-primary-foreground" />
                            </div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 border-2 border-border/50 rounded-2xl px-4 py-3 shadow-md">
                            <div className="flex gap-1.5">
                              <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" />
                              <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Input Area */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="relative" ref={inputContainerRef}>
                      <Input
                        ref={inputRef}
                        value={inputMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        onKeyDown={handleKeyDown}
                        placeholder="메시지를 입력하세요... (Ctrl+Space로 제안 보기)"
                        disabled={sendMessageMutation.isPending}
                        className="h-12 pr-32 text-base border-2 focus:ring-2 focus:ring-primary/20"
                        data-testid="input-chat-message"
                      />
                      
                      {/* Suggestions Overlay */}
                      <PromptSuggestionsOverlay
                        suggestions={suggestions}
                        isVisible={suggestionsVisible && isExpanded}
                        isLoading={suggestionsLoading}
                        onSuggestionSelect={handleSuggestionSelect}
                        onDismiss={hideSuggestions}
                        className="left-0 right-0"
                        position="top"
                      />
                      
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8 w-8 p-0 transition-colors",
                            suggestionsVisible 
                              ? "bg-primary/10 hover:bg-primary/20 text-primary" 
                              : "hover:bg-muted text-muted-foreground"
                          )}
                          onClick={toggleSuggestions}
                          title={suggestionsVisible ? "스마트 제안 숨기기 (Ctrl+Space)" : "스마트 제안 보기 (Ctrl+Space)"}
                          data-testid="button-toggle-suggestions"
                          aria-pressed={suggestionsVisible}
                        >
                          <Lightbulb className={cn(
                            "w-4 h-4 transition-colors",
                            suggestionsVisible ? "text-primary fill-primary" : "text-muted-foreground"
                          )} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            toast({
                              title: "파일 첨부",
                              description: "파일 첨부 기능은 곧 제공될 예정입니다.",
                            });
                          }}
                          title="파일 첨부"
                          data-testid="button-attach-file"
                        >
                          <Paperclip className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            toast({
                              title: "음성 입력",
                              description: "음성 입력 기능은 곧 제공될 예정입니다.",
                            });
                          }}
                          title="음성 입력"
                          data-testid="button-voice-input"
                        >
                          <Mic className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                    size="lg"
                    className="h-12 px-6 gap-2 shadow-lg hover:shadow-xl transition-all"
                    data-testid="button-send-message"
                  >
                    <Send className="w-5 h-5" />
                    <span className="font-semibold">전송</span>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
