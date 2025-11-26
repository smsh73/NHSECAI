import { PromptEngine } from './prompt-engine.js';

export interface PromptSuggestion {
  id: string;
  text: string;
  category: 'completion' | 'template' | 'context' | 'smart';
  confidence: number;
  icon?: string;
  description?: string;
  context?: string;
}

export interface InferenceContext {
  currentInput: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  userPreferences?: Record<string, any>;
  availableData?: string[];
  currentPage?: string;
}

export class PromptInferenceService {
  
  // Predefined prompt templates for different categories
  private static promptTemplates = {
    analysis: [
      { pattern: /시황|분석|현황/, suggestion: '최근 주요 뉴스를 바탕으로 오늘의 시장 시황 분석을 작성해주세요.' },
      { pattern: /리포트|보고서/, suggestion: '선택한 ETF에 대한 상세 투자 리포트를 생성해주세요.' },
      { pattern: /트렌드|동향/, suggestion: '최신 시장 트렌드와 투자 기회를 분석해주세요.' },
      { pattern: /예측|전망/, suggestion: '다음 분기 시장 전망과 주요 리스크 요인을 분석해주세요.' }
    ],
    workflow: [
      { pattern: /워크플로우|자동화/, suggestion: '현재 실행 중인 워크플로우들의 상태와 성능을 요약해주세요.' },
      { pattern: /스케줄|일정/, suggestion: '자동화된 분석 스케줄을 설정하고 관리해주세요.' },
      { pattern: /최적화|개선/, suggestion: '시스템 성능 개선을 위한 추천 사항을 제안해주세요.' }
    ],
    data: [
      { pattern: /스키마|데이터베이스/, suggestion: '금융 데이터 스키마의 주요 테이블과 관계를 설명해주세요.' },
      { pattern: /검색|조회/, suggestion: '특정 종목이나 테마에 대한 최신 분석 정보를 검색해주세요.' },
      { pattern: /데이터|정보/, suggestion: 'RAG 검색을 통해 관련 데이터를 찾아 분석해주세요.' }
    ],
    etf: [
      { pattern: /ETF|펀드/, suggestion: 'ETF 포트폴리오 분석과 투자 추천을 제공해주세요.' },
      { pattern: /포트폴리오|자산/, suggestion: '현재 포트폴리오를 분석하고 최적화 방안을 제시해주세요.' },
      { pattern: /위험|리스크/, suggestion: '투자 위험도를 평가하고 적절한 ETF를 추천해주세요.' }
    ]
  };

  // Smart completions based on context
  private static smartCompletions = [
    { trigger: '오늘', completion: '오늘의 주요 시장 동향을 분석해주세요.' },
    { trigger: '최근', completion: '최근 시장 변화와 투자 기회를 요약해주세요.' },
    { trigger: '추천', completion: '추천 ETF와 투자 전략을 제안해주세요.' },
    { trigger: '분석', completion: '분석 결과를 기반으로 투자 의견을 제시해주세요.' },
    { trigger: '검색', completion: '검색을 통해 관련 데이터를 찾아 분석해주세요.' },
    { trigger: '워크플로우', completion: '워크플로우 상태와 성능 지표를 확인해주세요.' },
    { trigger: '포트폴리오', completion: '포트폴리오 분석과 최적화 방안을 제시해주세요.' }
  ];

  // Analyze user input and generate suggestions
  static analyzeInput(context: InferenceContext): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    const input = context.currentInput.toLowerCase();

    // 1. Template-based suggestions
    Object.entries(this.promptTemplates).forEach(([category, templates]) => {
      templates.forEach((template, index) => {
        if (template.pattern.test(input)) {
          suggestions.push({
            id: `template-${category}-${index}`,
            text: template.suggestion,
            category: 'template',
            confidence: 0.8,
            icon: this.getCategoryIcon(category),
            description: `${category} 관련 제안`,
            context: category
          });
        }
      });
    });

    // 2. Smart completions
    this.smartCompletions.forEach((completion, index) => {
      if (input.includes(completion.trigger)) {
        suggestions.push({
          id: `smart-${index}`,
          text: completion.completion,
          category: 'smart',
          confidence: 0.9,
          icon: '🧠',
          description: '스마트 제안'
        });
      }
    });

    // 3. Context-based suggestions
    if (context.conversationHistory.length > 0) {
      const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
      if (lastMessage.role === 'assistant') {
        suggestions.push({
          id: 'context-followup',
          text: '더 자세한 설명을 부탁드립니다.',
          category: 'context',
          confidence: 0.7,
          icon: '💬',
          description: '대화 맥락 기반 제안'
        });
      }
    }

    // 4. Auto-completion for partial input
    if (input.length > 2) {
      const autocompletions = this.generateAutocompletions(input);
      autocompletions.forEach((completion, index) => {
        suggestions.push({
          id: `autocomplete-${index}`,
          text: completion,
          category: 'completion',
          confidence: 0.6,
          icon: '✨',
          description: '자동 완성'
        });
      });
    }

    // Sort by confidence and limit results
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 6);
  }

  // Generate real-time suggestions as user types
  static generateRealTimeSuggestions(
    partialInput: string,
    context: InferenceContext
  ): PromptSuggestion[] {
    if (partialInput.length < 2) return [];

    const suggestions: PromptSuggestion[] = [];
    const inputLower = partialInput.toLowerCase().trim();
    
    // 1. Find matching templates based on input keywords
    Object.entries(this.promptTemplates).forEach(([category, templates]) => {
      templates.forEach((template, index) => {
        const suggestionLower = template.suggestion.toLowerCase();
        const patternMatches = template.pattern.test(inputLower);
        const textMatches = suggestionLower.includes(inputLower) || inputLower.split(' ').some(word => 
          word.length >= 2 && suggestionLower.includes(word)
        );
        
        if (patternMatches || textMatches) {
          const matchScore = patternMatches ? 0.9 : this.calculateMatchScore(
            inputLower.split(/\s+/),
            suggestionLower.split(/\s+/)
          );
          
          if (matchScore > 0.2) {
            suggestions.push({
              id: `realtime-${category}-${index}`,
              text: template.suggestion,
              category: 'template',
              confidence: matchScore,
              icon: this.getCategoryIcon(category),
              description: `${category} 관련 제안`,
              context: category
            });
          }
        }
      });
    });

    // 2. Add smart completions if input matches triggers
    this.smartCompletions.forEach((completion, index) => {
      if (inputLower.includes(completion.trigger.toLowerCase())) {
        suggestions.push({
          id: `smart-realtime-${index}`,
          text: completion.completion,
          category: 'smart',
          confidence: 0.85,
          icon: '🧠',
          description: '스마트 제안'
        });
      }
    });

    // 3. Add autocompletions for partial matches
    const autocompletions = this.generateAutocompletions(partialInput);
    autocompletions.forEach((completion, index) => {
      suggestions.push({
        id: `autocomplete-realtime-${index}`,
        text: completion,
        category: 'completion',
        confidence: 0.7,
        icon: '✨',
        description: '자동 완성'
      });
    });

    // Remove duplicates and sort by confidence
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.text === suggestion.text)
    );

    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }

  // Calculate match score between input and template
  private static calculateMatchScore(inputWords: string[], templateWords: string[]): number {
    let matches = 0;
    const totalWords = Math.max(inputWords.length, templateWords.length);

    inputWords.forEach(inputWord => {
      if (templateWords.some(templateWord => 
        templateWord.includes(inputWord) || inputWord.includes(templateWord)
      )) {
        matches++;
      }
    });

    return matches / totalWords;
  }

  // Generate auto-completions for partial input
  private static generateAutocompletions(partialInput: string): string[] {
    const completions: string[] = [];
    
    // Common phrases and completions
    const commonPhrases = [
      '최근 시장 동향을 분석해주세요.',
      '포트폴리오 최적화 방안을 제시해주세요.',
      'ETF 투자 추천을 제공해주세요.',
      '위험도 분석과 대응 방안을 알려주세요.',
      '워크플로우 상태를 확인해주세요.',
      '데이터 검색을 실행해주세요.',
      '상세한 리포트를 생성해주세요.'
    ];

    commonPhrases.forEach(phrase => {
      if (phrase.toLowerCase().includes(partialInput.toLowerCase())) {
        completions.push(phrase);
      }
    });

    return completions.slice(0, 3);
  }

  // Get icon for category
  private static getCategoryIcon(category: string): string {
    const icons = {
      analysis: '📊',
      workflow: '⚡',
      data: '🗄️',
      etf: '💰'
    };
    return icons[category as keyof typeof icons] || '💡';
  }

  // Extract intent from user input
  static extractIntent(input: string): {
    intent: string;
    entities: string[];
    confidence: number;
  } {
    const intentPatterns = {
      analysis: /분석|시황|동향|트렌드|예측|전망/,
      search: /검색|찾기|조회|확인/,
      recommendation: /추천|제안|의견|조언/,
      portfolio: /포트폴리오|자산|투자/,
      workflow: /워크플로우|자동화|스케줄/,
      report: /리포트|보고서|요약/
    };

    let bestIntent = 'general';
    let bestConfidence = 0;

    Object.entries(intentPatterns).forEach(([intent, pattern]) => {
      if (pattern.test(input)) {
        const confidence = 0.8; // Simple confidence scoring
        if (confidence > bestConfidence) {
          bestIntent = intent;
          bestConfidence = confidence;
        }
      }
    });

    // Extract entities (simple keyword extraction)
    const entities = input.match(/ETF|주식|채권|금융|시장|투자|포트폴리오/g) || [];

    return {
      intent: bestIntent,
      entities,
      confidence: bestConfidence
    };
  }
}