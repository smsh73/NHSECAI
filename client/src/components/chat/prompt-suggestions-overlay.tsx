import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lightbulb, 
  Zap, 
  Search, 
  FileText, 
  TrendingUp,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PromptSuggestion {
  id: string;
  text: string;
  category: 'completion' | 'template' | 'context' | 'smart';
  confidence: number;
  icon?: string;
  description?: string;
  context?: string;
}

interface PromptSuggestionsOverlayProps {
  suggestions: PromptSuggestion[];
  isVisible: boolean;
  isLoading?: boolean;
  onSuggestionSelect: (suggestion: PromptSuggestion) => void;
  onDismiss: () => void;
  className?: string;
  position?: 'top' | 'bottom';
}

export function PromptSuggestionsOverlay({
  suggestions,
  isVisible,
  isLoading = false,
  onSuggestionSelect,
  onDismiss,
  className,
  position = 'top'
}: PromptSuggestionsOverlayProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            onSuggestionSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onDismiss();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, suggestions, selectedIndex, onSuggestionSelect, onDismiss]);

  // Get icon component for category
  const getCategoryIcon = (category: string, customIcon?: string) => {
    if (customIcon) {
      return <span className="text-sm">{customIcon}</span>;
    }

    const iconProps = { className: "w-4 h-4" };
    switch (category) {
      case 'completion':
        return <Zap {...iconProps} />;
      case 'template':
        return <FileText {...iconProps} />;
      case 'context':
        return <TrendingUp {...iconProps} />;
      case 'smart':
        return <Sparkles {...iconProps} />;
      default:
        return <Lightbulb {...iconProps} />;
    }
  };

  // Get badge color for category
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'completion':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'template':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'context':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'smart':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        "absolute z-50 w-full max-w-[90vw]",
        position === 'top' ? "bottom-full mb-2" : "top-full mt-2",
        className
      )}
      data-testid="prompt-suggestions-overlay"
    >
      <Card className="bg-background/95 backdrop-blur-sm border-border/50 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">스마트 제안</span>
              {isLoading && (
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
              data-testid="button-dismiss-suggestions"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Suggestions List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading && suggestions.length === 0 ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-4 h-4 rounded" />
                    <div className="flex-1">
                      <Skeleton className="w-full h-4 mb-1" />
                      <Skeleton className="w-3/4 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">제안할 프롬프트가 없습니다</p>
              </div>
            ) : (
              <div className="p-1">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={suggestion.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start p-3 h-auto text-left group transition-all duration-150",
                      index === selectedIndex && "bg-muted/80",
                      "hover:bg-muted/60"
                    )}
                    onClick={() => onSuggestionSelect(suggestion)}
                    data-testid={`suggestion-${suggestion.id}`}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
                        {getCategoryIcon(suggestion.category, suggestion.icon)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs px-2 py-0.5",
                              getCategoryColor(suggestion.category)
                            )}
                          >
                            {suggestion.description || suggestion.category}
                          </Badge>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <span>신뢰도</span>
                            <div className="flex space-x-0.5">
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "w-1 h-1 rounded-full",
                                    i < Math.round(suggestion.confidence * 5) 
                                      ? "bg-primary" 
                                      : "bg-muted-foreground/30"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {suggestion.text}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {suggestions.length > 0 && (
            <div className="p-2 border-t border-border/50 bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                ↑↓ 키로 선택, Enter로 적용, Esc로 닫기
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}