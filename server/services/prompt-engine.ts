export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'system' | 'user' | 'preprocessing' | 'postprocessing';
  template: string;
  variables: PromptVariable[];
  examples: {
    title: string;
    input: Record<string, any>;
    expectedOutput: string;
  }[];
  metadata: {
    tags: string[];
    useCase: string;
    model: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTokens: number;
  };
}

export interface ProcessedPrompt {
  prompt: string;
  variables: Record<string, any>;
  metadata: {
    templateId: string;
    processedAt: Date;
    estimatedTokens: number;
  };
}

export class PromptEngine {
  
  // Core prompt processing with advanced variable substitution
  static processPrompt(template: string, variables: Record<string, any>, context?: any): ProcessedPrompt {
    let processedPrompt = template;
    const usedVariables: Record<string, any> = {};
    
    // 1. Simple variable substitution {{variable}}
    processedPrompt = processedPrompt.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (variables.hasOwnProperty(varName)) {
        usedVariables[varName] = variables[varName];
        return String(variables[varName]);
      }
      return match; // Keep original if not found
    });
    
    // 2. Conditional blocks {{#if condition}} ... {{/if}}
    processedPrompt = processedPrompt.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
      if (variables[condition] && variables[condition] !== false && variables[condition] !== '') {
        return content;
      }
      return '';
    });
    
    // 3. Array loops {{#each array}} ... {{/each}}
    processedPrompt = processedPrompt.replace(/\{\{#each\s+(\w+)\}\}(.*?)\{\{\/each\}\}/gs, (match, arrayName, content) => {
      if (Array.isArray(variables[arrayName])) {
        return variables[arrayName].map((item, index) => {
          let itemContent = content;
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
          itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
          if (typeof item === 'object') {
            Object.keys(item).forEach(key => {
              itemContent = itemContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(item[key]));
            });
          }
          return itemContent;
        }).join('');
      }
      return '';
    });
    
    // 4. Date formatting {{date:format}}
    processedPrompt = processedPrompt.replace(/\{\{date:([^}]+)\}\}/g, (match, format) => {
      const now = new Date();
      if (format === 'iso') return now.toISOString();
      if (format === 'short') return now.toLocaleDateString();
      if (format === 'long') return now.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      return now.toISOString();
    });
    
    // 5. Context variables from external context
    if (context) {
      Object.keys(context).forEach(key => {
        const regex = new RegExp(`\\{\\{ctx\\.${key}\\}\\}`, 'g');
        processedPrompt = processedPrompt.replace(regex, String(context[key]));
      });
    }
    
    return {
      prompt: processedPrompt,
      variables: usedVariables,
      metadata: {
        templateId: 'runtime',
        processedAt: new Date(),
        estimatedTokens: this.estimateTokens(processedPrompt)
      }
    };
  }
  
  // Token estimation for cost calculation
  static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English, adjust for Korean
    const hasKorean = /[\u3131-\u3163\uac00-\ud7a3]/g.test(text);
    const baseRatio = hasKorean ? 2.5 : 4; // Korean characters are more token-dense
    return Math.ceil(text.length / baseRatio);
  }
  
  // Validate template variables
  static validateTemplate(template: string, variables: PromptVariable[]): { isValid: boolean; errors: string[]; estimatedTokens: number } {
    const errors: string[] = [];
    
    // Extract variables from template
    const templateVars = new Set<string>();
    const varMatches = template.match(/\{\{(\w+)\}\}/g);
    if (varMatches) {
      varMatches.forEach(match => {
        const varName = match.replace(/[{}]/g, '');
        templateVars.add(varName);
      });
    }
    
    // Check required variables
    variables.forEach(variable => {
      if (variable.required && !templateVars.has(variable.name)) {
        errors.push(`Required variable '${variable.name}' not found in template`);
      }
    });
    
    // Check for undefined variables in template
    const definedVars = new Set(variables.map(v => v.name));
    templateVars.forEach(templateVar => {
      if (!definedVars.has(templateVar) && !['date', 'ctx'].includes(templateVar.split('.')[0])) {
        errors.push(`Undefined variable '${templateVar}' found in template`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      estimatedTokens: this.estimateTokens(template)
    };
  }
  
  // Generate prompt suggestions based on context
  static generatePromptSuggestions(category: string, useCase: string): PromptTemplate[] {
    const suggestions: PromptTemplate[] = [];
    
    if (category === 'financial' && useCase.includes('분석')) {
      suggestions.push({
        id: 'financial-analysis-basic',
        name: '기본 금융 분석',
        description: '주식, 채권, 원자재 등의 기본 금융 분석을 위한 프롬프트',
        category: 'financial',
        type: 'system',
        template: `당신은 전문 금융 애널리스트입니다. 다음 데이터를 분석하여 객관적이고 정확한 투자 인사이트를 제공해주세요.

분석 대상: {{symbol}} ({{symbolName}})
분석 기간: {{startDate}} ~ {{endDate}}
시장: {{market}}

분석할 항목:
{{#each analysisItems}}
- {{this}}
{{/each}}

분석 결과는 다음 형식으로 제공해주세요:
1. 요약
2. 주요 발견사항
3. 리스크 요인
4. 투자 의견
5. 목표 가격 (해당하는 경우)

모든 분석은 데이터에 기반해야 하며, 추측성 내용은 피해주세요.`,
        variables: [
          { name: 'symbol', type: 'string', description: '종목 코드', required: true },
          { name: 'symbolName', type: 'string', description: '종목명', required: true },
          { name: 'startDate', type: 'date', description: '분석 시작일', required: true },
          { name: 'endDate', type: 'date', description: '분석 종료일', required: true },
          { name: 'market', type: 'string', description: '시장 (KOSPI/KOSDAQ/NYSE 등)', required: true },
          { name: 'analysisItems', type: 'array', description: '분석할 항목들', required: true }
        ],
        examples: [{
          title: 'KOSPI 대형주 분석',
          input: {
            symbol: '005930',
            symbolName: '삼성전자',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            market: 'KOSPI',
            analysisItems: ['기술적 분석', '재무 분석', '산업 동향', '경쟁사 비교']
          },
          expectedOutput: '구조화된 삼성전자 투자 분석 보고서'
        }],
        metadata: {
          tags: ['financial', 'analysis', 'investment', 'korean'],
          useCase: '개별 종목 투자 분석',
          model: ['gpt-4', 'claude-3', 'gemini-pro'],
          difficulty: 'intermediate',
          estimatedTokens: 450
        }
      });
    }
    
    if (category === 'news' && useCase.includes('요약')) {
      suggestions.push({
        id: 'news-summary-financial',
        name: '금융 뉴스 요약',
        description: '금융 및 경제 뉴스를 간결하게 요약하는 프롬프트',
        category: 'news',
        type: 'preprocessing',
        template: `다음 금융 뉴스를 분석하여 핵심 내용을 요약해주세요.

뉴스 제목: {{title}}
뉴스 내용: {{content}}
발행일: {{publishDate}}
출처: {{source}}

요약 형식:
📊 **핵심 요점** (3-5줄 요약)
📈 **시장 영향** (예상되는 시장 반응)
🎯 **관련 종목/섹터** (영향받을 종목이나 섹터)
⚠️ **주요 리스크** (주의할 점이나 리스크)

{{#if includeAnalysis}}
📋 **심화 분석**
- 장기적 영향
- 유사 사례 비교
- 전문가 의견 종합
{{/if}}

모든 내용은 객관적 사실에 기반하여 작성해주세요.`,
        variables: [
          { name: 'title', type: 'string', description: '뉴스 제목', required: true },
          { name: 'content', type: 'string', description: '뉴스 본문', required: true },
          { name: 'publishDate', type: 'date', description: '발행일', required: false },
          { name: 'source', type: 'string', description: '뉴스 출처', required: false },
          { name: 'includeAnalysis', type: 'boolean', description: '심화 분석 포함 여부', required: false, defaultValue: false }
        ],
        examples: [{
          title: '금융 뉴스 요약 예시',
          input: {
            title: '한국은행 기준금리 동결',
            content: '한국은행이 이번 달 통화정책결정회의에서 기준금리를 현 수준에서 동결하기로 결정했다...',
            publishDate: '2024-01-15',
            source: '경제일보',
            includeAnalysis: true
          },
          expectedOutput: '구조화된 금융 뉴스 요약과 시장 영향 분석'
        }],
        metadata: {
          tags: ['news', 'summary', 'financial', 'korean'],
          useCase: '금융 뉴스 자동 요약',
          model: ['gpt-4', 'claude-3'],
          difficulty: 'beginner',
          estimatedTokens: 350
        }
      });
    }
    
    return suggestions;
  }
  
  // Create prompt chain for complex workflows
  static createPromptChain(prompts: { template: string; variables: Record<string, any> }[]): ProcessedPrompt[] {
    return prompts.map((prompt, index) => {
      const processed = this.processPrompt(prompt.template, prompt.variables);
      processed.metadata.templateId = `chain-${index}`;
      return processed;
    });
  }
  
  // Financial-specific prompt utilities
  static createFinancialAnalysisPrompt(params: {
    analysisType: 'technical' | 'fundamental' | 'sentiment' | 'macro';
    symbol: string;
    timeframe: string;
    data: any;
    language: 'ko' | 'en';
  }): ProcessedPrompt {
    const isKorean = params.language === 'ko';
    
    let template = '';
    
    if (params.analysisType === 'technical') {
      template = isKorean 
        ? `{{symbol}} 종목에 대한 기술적 분석을 수행해주세요.

분석 기간: {{timeframe}}
가격 데이터: {{data.prices}}
거래량 데이터: {{data.volumes}}
기술 지표: {{data.indicators}}

다음 항목들을 포함하여 분석해주세요:
1. 주요 지지/저항 수준
2. 추세 분석 (상승/하락/횡보)
3. 모멘텀 지표 해석
4. 매매 시그널
5. 목표가 및 손절가 제안

분석 결과는 투자 경험이 있는 일반인도 이해할 수 있도록 설명해주세요.`
        : `Perform technical analysis for {{symbol}}.

Timeframe: {{timeframe}}
Price data: {{data.prices}}
Volume data: {{data.volumes}}
Technical indicators: {{data.indicators}}

Please include:
1. Key support/resistance levels
2. Trend analysis
3. Momentum indicators
4. Trading signals
5. Target and stop-loss recommendations`;
    } else if (params.analysisType === 'fundamental') {
      template = isKorean
        ? `{{symbol}} 종목에 대한 펀더멘털 분석을 수행해주세요.

재무 데이터: {{data.financials}}
산업 정보: {{data.industry}}
경쟁사 정보: {{data.competitors}}

분석 항목:
1. 재무 건전성 (부채비율, 유동비율 등)
2. 수익성 지표 (ROE, ROA, 영업이익률)
3. 성장성 분석 (매출/이익 증가율)
4. 밸류에이션 (PER, PBR, EV/EBITDA)
5. 산업 내 경쟁 위치
6. 향후 전망 및 리스크 요인

각 지표에 대해 업계 평균과 비교하여 설명해주세요.`
        : `Perform fundamental analysis for {{symbol}}.

Financial data: {{data.financials}}
Industry info: {{data.industry}}
Competitor info: {{data.competitors}}

Analyze:
1. Financial health
2. Profitability metrics
3. Growth analysis
4. Valuation metrics
5. Industry position
6. Future outlook and risks`;
    }
    
    return this.processPrompt(template, {
      symbol: params.symbol,
      timeframe: params.timeframe,
      data: params.data
    });
  }
  
  // Generate context-aware system prompts
  static generateSystemPrompt(role: string, domain: string, language: 'ko' | 'en' = 'ko'): string {
    const prompts = {
      ko: {
        'financial-analyst': '당신은 15년 경력의 전문 금융 애널리스트입니다. 객관적이고 데이터 기반의 분석을 제공하며, 리스크를 명확히 제시합니다.',
        'investment-advisor': '당신은 고객의 투자 목표와 위험 성향을 고려하여 맞춤형 투자 조언을 제공하는 전문 투자 상담사입니다.',
        'market-researcher': '당신은 시장 동향과 산업 트렌드를 분석하는 시장 조사 전문가입니다. 최신 데이터와 통계를 활용하여 인사이트를 제공합니다.',
        'risk-manager': '당신은 포트폴리오 리스크 관리 전문가입니다. 다양한 리스크 지표를 활용하여 위험을 평가하고 관리 방안을 제시합니다.'
      },
      en: {
        'financial-analyst': 'You are an experienced financial analyst with 15 years of expertise. Provide objective, data-driven analysis with clear risk assessment.',
        'investment-advisor': 'You are a professional investment advisor who provides personalized investment advice based on client goals and risk tolerance.',
        'market-researcher': 'You are a market research expert analyzing market trends and industry patterns using latest data and statistics.',
        'risk-manager': 'You are a portfolio risk management specialist who evaluates and manages risks using various risk metrics.'
      }
    };
    
    return prompts[language][`${domain}-${role}`] || prompts[language]['financial-analyst'];
  }
}

export default PromptEngine;