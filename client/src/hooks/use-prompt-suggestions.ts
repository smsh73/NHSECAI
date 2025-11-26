import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { PromptSuggestion } from '@/components/chat/prompt-suggestions-overlay';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InferenceContext {
  currentInput: string;
  conversationHistory: ConversationMessage[];
  userPreferences?: Record<string, any>;
  availableData?: string[];
  currentPage?: string;
}

interface UsePromptSuggestionsProps {
  debounceMs?: number;
  minInputLength?: number;
  maxSuggestions?: number;
  autoShow?: boolean;
}

export function usePromptSuggestions({
  debounceMs = 300,
  minInputLength = 2,
  maxSuggestions = 6,
  autoShow = true
}: UsePromptSuggestionsProps = {}) {
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  
  const debounceTimer = useRef<NodeJS.Timeout>();
  const lastInputRef = useRef('');

  // Mutation for fetching suggestions from backend
  const suggestionsMutation = useMutation({
    mutationFn: async (context: InferenceContext) => {
      const response = await apiRequest('POST', '/api/prompt-suggestions', context);
      return response.json();
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
      if (autoShow && data.suggestions?.length > 0) {
        setIsVisible(true);
      }
    },
    onError: (error) => {
      console.error('Failed to fetch prompt suggestions:', error);
      setSuggestions([]);
    }
  });

  // Debounced suggestion fetching
  const fetchSuggestions = useCallback((input: string) => {
    if (input.length < minInputLength) {
      setSuggestions([]);
      setIsVisible(false);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      const context: InferenceContext = {
        currentInput: input,
        conversationHistory,
        currentPage: window.location.pathname,
        userPreferences: {
          maxSuggestions
        }
      };

      suggestionsMutation.mutate(context);
    }, debounceMs);
  }, [conversationHistory, maxSuggestions, debounceMs, minInputLength, suggestionsMutation]);

  // Update input and trigger suggestions
  const updateInput = useCallback((input: string) => {
    const previousInput = lastInputRef.current;
    setCurrentInput(input);
    lastInputRef.current = input;
    
    if (input !== previousInput) {
      fetchSuggestions(input);
    }
  }, [fetchSuggestions]);

  // Add message to conversation history
  const addToHistory = useCallback((message: ConversationMessage) => {
    setConversationHistory(prev => [...prev.slice(-10), message]); // Keep last 10 messages
  }, []);

  // Clear conversation history
  const clearHistory = useCallback(() => {
    setConversationHistory([]);
  }, []);

  // Show suggestions manually
  const showSuggestions = useCallback(() => {
    if (suggestions.length > 0) {
      setIsVisible(true);
    } else if (currentInput.length >= minInputLength) {
      fetchSuggestions(currentInput);
    }
  }, [suggestions.length, currentInput, minInputLength, fetchSuggestions]);

  // Hide suggestions
  const hideSuggestions = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Toggle suggestions visibility
  const toggleSuggestions = useCallback(() => {
    if (isVisible) {
      hideSuggestions();
    } else {
      showSuggestions();
    }
  }, [isVisible, hideSuggestions, showSuggestions]);

  // Get suggestions for specific input without updating state
  const getSuggestionsFor = useCallback(async (input: string): Promise<PromptSuggestion[]> => {
    try {
      const context: InferenceContext = {
        currentInput: input,
        conversationHistory,
        currentPage: window.location.pathname,
        userPreferences: { maxSuggestions }
      };

      const response = await apiRequest('POST', '/api/prompt-suggestions', context);
      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }, [conversationHistory, maxSuggestions]);

  // Generate contextual suggestions based on current conversation
  const getContextualSuggestions = useCallback(() => {
    const contextualSuggestions: PromptSuggestion[] = [];

    if (conversationHistory.length === 0) {
      // Initial suggestions for new conversation
      contextualSuggestions.push(
        {
          id: 'initial-1',
          text: '오늘의 주요 시장 동향을 분석해주세요.',
          category: 'smart',
          confidence: 0.9,
          icon: '📊',
          description: '시장 분석'
        },
        {
          id: 'initial-2', 
          text: '추천 ETF와 투자 전략을 제안해주세요.',
          category: 'smart',
          confidence: 0.9,
          icon: '💰',
          description: 'ETF 추천'
        }
      );
    } else {
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      if (lastMessage.role === 'assistant') {
        contextualSuggestions.push(
          {
            id: 'context-1',
            text: '더 자세한 설명을 부탁드립니다.',
            category: 'context',
            confidence: 0.8,
            icon: '💬',
            description: '추가 질문'
          },
          {
            id: 'context-2',
            text: '다른 관점에서 분석해주세요.',
            category: 'context', 
            confidence: 0.7,
            icon: '🔄',
            description: '다른 관점'
          }
        );
      }
    }

    return contextualSuggestions;
  }, [conversationHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Auto-hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (isVisible) {
        setIsVisible(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isVisible]);

  return {
    // State
    suggestions,
    isVisible,
    isLoading: suggestionsMutation.isPending,
    currentInput,
    conversationHistory,
    
    // Actions
    updateInput,
    addToHistory,
    clearHistory,
    showSuggestions,
    hideSuggestions,
    toggleSuggestions,
    getSuggestionsFor,
    getContextualSuggestions,
    
    // Utils
    hasInput: currentInput.length >= minInputLength,
    hasSuggestions: suggestions.length > 0
  };
}