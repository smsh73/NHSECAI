import OpenAI from "openai";
import type { 
  AnalysisResult,
  CausalAnalysisResult,
  MarketEventAnalysis,
  EtfProduct,
  EtfMetric,
  UserRiskProfile,
  EtfChatMessage
} from '@shared/schema';
import { ragService } from './ragService';
import type { ETFRecommendation } from './recommend';
import { AzureConfigService } from './azure-config.js';

// Initialize OpenAI clients with environment-based configuration
function initializeOpenAIClients() {
  const ptuConfig = AzureConfigService.getOpenAIPTUConfig();
  const embeddingConfig = AzureConfigService.getEmbeddingConfig();
  
  // Primary OpenAI client for chat/analysis (APIM-compatible)
  // Note: apiKey in options already sets Authorization header, don't duplicate with defaultHeaders
  const openaiPTU = ptuConfig.apiKey && ptuConfig.endpoint ? new OpenAI({
    apiKey: ptuConfig.apiKey,
    baseURL: `${ptuConfig.endpoint}/deployments/${ptuConfig.deploymentName}`,
    ...(ptuConfig.apiVersion ? { defaultQuery: { 'api-version': ptuConfig.apiVersion } } : {}),
    // APIM expects 'api-key' header
    defaultHeaders: { 'api-key': ptuConfig.apiKey },
  }) : null;
  
  // Embedding client (APIM-compatible)
  // Note: apiKey in options already sets Authorization header, don't duplicate with defaultHeaders
  const openaiEmbedding = embeddingConfig.apiKey && embeddingConfig.endpoint ? new OpenAI({
    apiKey: embeddingConfig.apiKey,
    baseURL: `${embeddingConfig.endpoint}/deployments/${embeddingConfig.deploymentName}`,
    ...(embeddingConfig.apiVersion ? { defaultQuery: { 'api-version': embeddingConfig.apiVersion } } : {}),
    // APIM expects 'api-key' header
    defaultHeaders: { 'api-key': embeddingConfig.apiKey },
  }) : null;
  
  // Fallback to standard OpenAI if Azure is not configured
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
  const openaiStandard = apiKey && apiKey !== "default_key" ? new OpenAI({ apiKey }) : null;
  
  return {
    ptu: openaiPTU,
    embedding: openaiEmbedding,
    standard: openaiStandard,
  };
}

const openaiClients = initializeOpenAIClients();
const openai = openaiClients.ptu || openaiClients.standard;
const openaiEmbedding = openaiClients.embedding || openaiClients.standard;

// Get chat model name from configuration
export function getChatModelName(): string {
  const ptuConfig = AzureConfigService.getOpenAIPTUConfig();
  return ptuConfig.modelName || 'gpt-4.1';
}

// Export openai client for use in other modules
export { openai };

/**
 * Parse JSON from AI response, handling markdown code blocks
 * AI sometimes returns JSON wrapped in markdown code blocks like:
 * ```json
 * {...}
 * ```
 */
export function parseJsonResponse(content: string | null | undefined): any {
  if (!content) {
    return {};
  }

  try {
    // First, try direct JSON parse
    return JSON.parse(content);
  } catch (error) {
    // If direct parse fails, try to extract JSON from markdown code blocks
    try {
      // Match JSON in markdown code blocks (```json ... ``` or ``` ... ```)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1].trim());
      }
      
      // Try to find JSON object in the content (between { and })
      const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }
      
      // If all else fails, throw original error
      throw error;
    } catch (parseError) {
      console.warn('Failed to parse JSON response, returning raw content:', parseError);
      // Return a safe fallback object
      return { rawContent: content, parseError: parseError instanceof Error ? parseError.message : 'Unknown error' };
    }
  }
}

export async function analyzeNews(newsData: any[], prompt: string): Promise<AnalysisResult> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: "You are a financial market analyst. Analyze the provided news data and provide insights in JSON format."
        },
        {
          role: "user",
          content: `${prompt}\n\nNews data: ${JSON.stringify(newsData)}\n\nProvide analysis in this JSON format: { "summary": string, "key_points": string[], "sentiment": "positive"|"negative"|"neutral", "confidence": number, "recommendations": string[] }`
        }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`News analysis failed: ${error}`);
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!openaiEmbedding) {
      console.warn('Embedding client not initialized - API key not available');
      return [];
    }
    
    const embeddingConfig = AzureConfigService.getEmbeddingConfig();
    const modelName = embeddingConfig.modelName || "text-embedding-3-large";
    
    // Only use dimensions parameter for embedding-3 models
    const supportsDimensions = modelName.includes('text-embedding-3');
    
    const response = await openaiEmbedding.embeddings.create({
      model: modelName,
      input: text,
      ...(supportsDimensions && { dimensions: 3072 })
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.warn('Embedding generation failed, continuing without embeddings:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    if (!openaiEmbedding) {
      console.warn('Embedding client not initialized - API key not available');
      return texts.map(() => []);
    }
    
    const embeddingConfig = AzureConfigService.getEmbeddingConfig();
    const modelName = embeddingConfig.modelName || "text-embedding-3-large";
    
    // Only use dimensions parameter for embedding-3 models
    const supportsDimensions = modelName.includes('text-embedding-3');
    
    // Process in batches of 100 (OpenAI limit)
    const batchSize = 100;
    const results: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const response = await openaiEmbedding.embeddings.create({
        model: modelName,
        input: batch,
        ...(supportsDimensions && { dimensions: 3072 })
      });
      
      results.push(...response.data.map(item => item.embedding));
    }
    
    return results;
  } catch (error) {
    console.warn('Batch embedding generation failed:', error instanceof Error ? error.message : 'Unknown error');
    return texts.map(() => []);
  }
}

export async function generateEmbeddingWithMetadata(text: string): Promise<{
  embedding: number[];
  model: string;
  dimensions: number;
  tokens: number;
}> {
  try {
    if (!openaiEmbedding) {
      console.warn('Embedding client not initialized - API key not available');
      return {
        embedding: [],
        model: "text-embedding-3-large",
        dimensions: 3072,
        tokens: 0
      };
    }
    
    const embeddingConfig = AzureConfigService.getEmbeddingConfig();
    const modelName = embeddingConfig.modelName || "text-embedding-3-large";
    
    // Only use dimensions parameter for embedding-3 models
    const supportsDimensions = modelName.includes('text-embedding-3');
    const targetDimensions = supportsDimensions ? 3072 : 1536; // 3072 for v3, 1536 for ada-002
    
    const response = await openaiEmbedding.embeddings.create({
      model: modelName,
      input: text,
      ...(supportsDimensions && { dimensions: targetDimensions })
    });
    
    return {
      embedding: response.data[0].embedding,
      model: response.model,
      dimensions: response.data[0].embedding.length,
      tokens: response.usage?.total_tokens || 0
    };
  } catch (error) {
    console.warn('Embedding with metadata generation failed:', error instanceof Error ? error.message : 'Unknown error');
    return {
      embedding: [],
      model: "text-embedding-3-large",
      dimensions: 3072,
      tokens: 0
    };
  }
}

export async function analyzeThemes(financialData: any[], prompt: string): Promise<AnalysisResult> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: "You are a thematic investment analyst. Analyze market themes and sector trends based on financial data."
        },
        {
          role: "user",
          content: `${prompt}\n\nFinancial data: ${JSON.stringify(financialData)}\n\nProvide analysis in this JSON format: { "summary": string, "key_points": string[], "sentiment": "positive"|"negative"|"neutral", "confidence": number, "recommendations": string[] }`
        }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`Theme analysis failed: ${error}`);
  }
}

export async function analyzeQuantitative(financialData: any[], prompt: string): Promise<AnalysisResult> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: "You are a quantitative analyst. Analyze numerical market data and provide statistical insights."
        },
        {
          role: "user",
          content: `${prompt}\n\nFinancial data: ${JSON.stringify(financialData)}\n\nProvide analysis in this JSON format: { "summary": string, "key_points": string[], "sentiment": "positive"|"negative"|"neutral", "confidence": number, "recommendations": string[] }`
        }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`Quantitative analysis failed: ${error}`);
  }
}

export async function generateMacroAnalysis(
  newsAnalysis: AnalysisResult,
  themeAnalysis: AnalysisResult,
  quantitativeAnalysis: AnalysisResult,
  mergePrompt: string
): Promise<AnalysisResult> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: "You are a senior market analyst. Synthesize different types of analysis into a comprehensive macro market outlook."
        },
        {
          role: "user",
          content: `${mergePrompt}\n\nNews Analysis: ${JSON.stringify(newsAnalysis)}\n\nTheme Analysis: ${JSON.stringify(themeAnalysis)}\n\nQuantitative Analysis: ${JSON.stringify(quantitativeAnalysis)}\n\nProvide comprehensive macro analysis in this JSON format: { "summary": string, "key_points": string[], "sentiment": "positive"|"negative"|"neutral", "confidence": number, "recommendations": string[] }`
        }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`Macro analysis generation failed: ${error}`);
  }
}

export async function executeCustomPrompt(prompt: string, data: any, systemPrompt?: string): Promise<any> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: systemPrompt || "You are a financial AI assistant. Process the given data according to the user's prompt and return results in JSON format."
        },
        {
          role: "user",
          content: `${prompt}\n\nData: ${JSON.stringify(data)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`Custom prompt execution failed: ${error}`);
  }
}

// Causal Analysis Interfaces
// Enhanced Causal Analysis Functions
export async function analyzeCausalFactors(
  priceMovement: any,
  newsFactors: any[],
  technicalFactors: any[],
  marketContext: any
): Promise<CausalAnalysisResult> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const systemPrompt = `당신은 NH투자증권의 시니어 마켓 애널리스트입니다. 시장 움직임의 원인을 분석하는 전문가로서, 다음과 같은 역할을 수행합니다:

1. 가격 변동과 뉴스/이벤트 간의 인과관계 분석
2. 기술적 지표와 시장 심리 요인 평가
3. 다각도 분석을 통한 신뢰도 높은 원인 규명
4. 한국 시장 특성을 고려한 분석

분석 시 고려사항:
- 시간적 연관성 (뉴스 발생 시간과 가격 변동 시간)
- 거래량 변화와 가격 움직임의 상관관계
- 시장 전체적 맥락과 개별 종목 특성
- 외부 요인 (정책, 글로벌 시장 등)의 영향

결과는 투명하고 근거 있는 분석을 제공해야 합니다.`;

    const userPrompt = `다음 시장 움직임에 대한 종합적인 원인 분석을 수행해 주세요:

**가격 움직임 정보:**
${JSON.stringify(priceMovement, null, 2)}

**뉴스 관련 요인:**
${JSON.stringify(newsFactors, null, 2)}

**기술적 요인:**
${JSON.stringify(technicalFactors, null, 2)}

**시장 상황:**
${JSON.stringify(marketContext, null, 2)}

다음 JSON 형식으로 분석 결과를 제공해 주세요:
{
  "identified_causes": [
    {
      "type": "원인 유형 (news_driven, technical, sentiment, external 등)",
      "description": "원인에 대한 상세 설명",
      "importance": "중요도 (0-1)",
      "evidence": "근거 데이터"
    }
  ],
  "correlation_strength": "전체 상관관계 강도 (0-1)",
  "ai_reasoning": "AI의 분석 과정과 논리적 추론 설명",
  "confidence_score": "분석 신뢰도 (0-1)",
  "alternative_explanations": ["대안적 설명들"],
  "market_sentiment": "시장 심리 (positive/negative/neutral/mixed)",
  "time_relevance": "시간적 연관성 점수 (0-1)"
}`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`Causal analysis failed: ${error}`);
  }
}

export async function detectMarketEvent(
  marketData: any[],
  symbol: string,
  timeframe: string
): Promise<MarketEventAnalysis> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const systemPrompt = `당신은 시장 이벤트 감지 전문가입니다. 시장 데이터를 분석하여 다음을 수행합니다:

1. 비정상적인 가격/거래량 움직임 감지
2. 이벤트의 심각도와 시장 영향도 평가
3. 영향받는 섹터와 관련 지표 식별
4. 이벤트 유형 분류 (급등, 급락, 거래량 급증 등)

한국 시장의 특성을 고려하여 분석합니다.`;

    const userPrompt = `다음 시장 데이터를 분석하여 시장 이벤트를 감지하고 평가해 주세요:

**종목:** ${symbol}
**시간대:** ${timeframe}
**시장 데이터:**
${JSON.stringify(marketData, null, 2)}

다음 JSON 형식으로 결과를 제공해 주세요:
{
  "event_type": "이벤트 유형 (price_spike, volume_surge, sector_rotation 등)",
  "severity": "심각도 (0-1)",
  "market_impact": "시장 영향도 (high/medium/low)",
  "affected_sectors": ["영향받는 섹터들"],
  "key_indicators": ["주요 지표들"],
  "reasoning": "이벤트 감지 근거와 분석"
}`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`Market event detection failed: ${error}`);
  }
}

export async function generateCausalReasoning(
  causes: any[],
  correlationData: any,
  marketContext: any
): Promise<{
  reasoning: string;
  confidence_explanation: string;
  risk_factors: string[];
  actionable_insights: string[];
}> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const systemPrompt = `당신은 NH투자증권의 시장 분석 전문가입니다. 복잡한 시장 원인 분석을 이해하기 쉽게 설명하는 역할을 합니다:

1. 다양한 원인들 간의 연관성과 우선순위 설명
2. 분석의 신뢰도와 불확실성 요소 명시
3. 투자자가 알아야 할 리스크 요인 제시
4. 실행 가능한 인사이트와 대응 방안 제안

설명은 전문적이면서도 명확하고, 한국 시장 상황을 반영해야 합니다.`;

    const userPrompt = `다음 원인 분석 결과를 바탕으로 종합적인 추론과 인사이트를 제공해 주세요:

**식별된 원인들:**
${JSON.stringify(causes, null, 2)}

**상관관계 데이터:**
${JSON.stringify(correlationData, null, 2)}

**시장 상황:**
${JSON.stringify(marketContext, null, 2)}

다음 JSON 형식으로 결과를 제공해 주세요:
{
  "reasoning": "종합적인 원인 분석 추론 과정",
  "confidence_explanation": "신뢰도 근거와 불확실성 요소 설명",
  "risk_factors": ["주의해야 할 리스크 요인들"],
  "actionable_insights": ["실행 가능한 인사이트와 대응 방안들"]
}`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`Causal reasoning generation failed: ${error}`);
  }
}

export async function calculateConfidenceScore(
  analysisData: any,
  dataQuality: any,
  temporalFactors: any
): Promise<{
  overall_confidence: number;
  confidence_breakdown: {
    data_quality: number;
    temporal_relevance: number;
    correlation_strength: number;
    market_consistency: number;
  };
  confidence_explanation: string;
  improvement_suggestions: string[];
}> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const systemPrompt = `당신은 AI 분석 신뢰도 평가 전문가입니다. 다음을 수행합니다:

1. 다양한 신뢰도 요소들을 종합적으로 평가
2. 각 요소별 신뢰도 점수 산출
3. 전체 신뢰도에 대한 명확한 설명
4. 신뢰도 향상을 위한 구체적인 제안

평가 기준:
- 데이터 품질 (완성도, 정확성, 최신성)
- 시간적 연관성 (이벤트와 결과 간의 시간적 근접성)
- 상관관계 강도 (통계적 유의성)
- 시장 일관성 (기존 시장 패턴과의 일치성)`;

    const userPrompt = `다음 분석 데이터를 바탕으로 신뢰도를 평가해 주세요:

**분석 데이터:**
${JSON.stringify(analysisData, null, 2)}

**데이터 품질 정보:**
${JSON.stringify(dataQuality, null, 2)}

**시간적 요인:**
${JSON.stringify(temporalFactors, null, 2)}

다음 JSON 형식으로 결과를 제공해 주세요:
{
  "overall_confidence": "전체 신뢰도 (0-1)",
  "confidence_breakdown": {
    "data_quality": "데이터 품질 점수 (0-1)",
    "temporal_relevance": "시간적 연관성 점수 (0-1)",
    "correlation_strength": "상관관계 강도 점수 (0-1)",
    "market_consistency": "시장 일관성 점수 (0-1)"
  },
  "confidence_explanation": "신뢰도 점수에 대한 상세 설명",
  "improvement_suggestions": ["신뢰도 향상을 위한 구체적 제안들"]
}`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`Confidence score calculation failed: ${error}`);
  }
}

export async function generateAlternativeExplanations(
  primaryAnalysis: any,
  marketData: any,
  contextualFactors: any
): Promise<{
  alternative_explanations: Array<{
    explanation: string;
    likelihood: number;
    supporting_evidence: string[];
    contradicting_evidence: string[];
  }>;
  uncertainty_factors: string[];
  recommendation: string;
}> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const systemPrompt = `당신은 시장 분석의 다각적 해석 전문가입니다. 주요 분석 외에 가능한 대안적 설명들을 제시합니다:

1. 1차 분석과 다른 관점의 해석 제시
2. 각 대안의 가능성과 근거 평가
3. 불확실성 요소들 명시
4. 균형잡힌 분석적 관점 제공

목표는 분석의 완전성을 높이고 편향을 줄이는 것입니다.`;

    const userPrompt = `다음 1차 분석에 대한 대안적 설명들을 제시해 주세요:

**1차 분석 결과:**
${JSON.stringify(primaryAnalysis, null, 2)}

**시장 데이터:**
${JSON.stringify(marketData, null, 2)}

**상황적 요인:**
${JSON.stringify(contextualFactors, null, 2)}

다음 JSON 형식으로 결과를 제공해 주세요:
{
  "alternative_explanations": [
    {
      "explanation": "대안적 설명",
      "likelihood": "가능성 (0-1)",
      "supporting_evidence": ["지지 근거들"],
      "contradicting_evidence": ["반대 근거들"]
    }
  ],
  "uncertainty_factors": ["불확실성 요소들"],
  "recommendation": "종합적 판단과 권고사항"
}`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    throw new Error(`Alternative explanations generation failed: ${error}`);
  }
}

export interface SchemaRecommendationResult {
  financialFilters?: {
    symbol?: string;
    market?: string;
    country?: string;
    dataType?: string;
    startDate?: string;
    endDate?: string;
  };
  newsFilters?: {
    category?: string;
    startDate?: string;
    endDate?: string;
  };
  rationale?: string;
  confidence?: number;
}

// Keyword-based fallback mapping
function getKeywordBasedRecommendation(prompt: string): SchemaRecommendationResult {
  const lowerPrompt = prompt.toLowerCase();
  
  // Keywords mapping for financial filters
  const stockMappings: Record<string, { symbol: string; market: string }> = {
    "삼성전자": { symbol: "005930", market: "국내증권" },
    "sk하이닉스": { symbol: "000660", market: "국내증권" },
    "lg화학": { symbol: "051910", market: "국내증권" },
    "현대차": { symbol: "005380", market: "국내증권" },
    "네이버": { symbol: "035420", market: "국내증권" },
    "카카오": { symbol: "035720", market: "국내증권" },
    "포스코": { symbol: "005490", market: "국내증권" },
    "tsmc": { symbol: "TSM", market: "해외증권" },
    "nvidia": { symbol: "NVDA", market: "해외증권" },
    "apple": { symbol: "AAPL", market: "해외증권" },
    "tesla": { symbol: "TSLA", market: "해외증권" }
  };

  const countryMappings: Record<string, { country: string; market: string }> = {
    "미국": { country: "US", market: "해외증권" },
    "미주": { country: "US", market: "해외증권" },
    "일본": { country: "JP", market: "해외증권" },
    "중국": { country: "CN", market: "해외증권" },
    "유럽": { country: "EU", market: "해외증권" }
  };

  const sectorMappings: Record<string, string> = {
    "반도체": "산업뉴스",
    "자동차": "산업뉴스", 
    "바이오": "산업뉴스",
    "제약": "산업뉴스",
    "화학": "산업뉴스",
    "금융": "산업뉴스",
    "통신": "산업뉴스",
    "건설": "산업뉴스",
    "에너지": "산업뉴스"
  };

  const newsKeywords: Record<string, string> = {
    "뉴스": "시장뉴스",
    "기업": "기업뉴스",
    "경제": "경제뉴스",
    "국제": "국제뉴스",
    "시황": "시장뉴스",
    "이슈": "시장뉴스"
  };

  const dataTypeKeywords: Record<string, string> = {
    "주가": "시세",
    "시세": "시세", 
    "가격": "시세",
    "지수": "지수",
    "수급": "수급량",
    "거래량": "수급량"
  };

  // Set default date range (last 7 days)
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let result: SchemaRecommendationResult = {
    rationale: "키워드 기반 분석을 통한 기본 추천",
    confidence: 0.5
  };

  let matchedKeywords: string[] = [];
  let confidenceBoost = 0;

  // Check for stock symbols
  for (const [keyword, mapping] of Object.entries(stockMappings)) {
    if (lowerPrompt.includes(keyword)) {
      result.financialFilters = {
        ...result.financialFilters,
        ...mapping,
        startDate,
        endDate
      };
      matchedKeywords.push(keyword);
      confidenceBoost += 0.15;
      break; // Only match one stock
    }
  }

  // Check for countries
  for (const [keyword, mapping] of Object.entries(countryMappings)) {
    if (lowerPrompt.includes(keyword)) {
      result.financialFilters = {
        ...result.financialFilters,
        ...mapping,
        startDate,
        endDate
      };
      matchedKeywords.push(keyword);
      confidenceBoost += 0.1;
      break;
    }
  }

  // Check for data types
  for (const [keyword, dataType] of Object.entries(dataTypeKeywords)) {
    if (lowerPrompt.includes(keyword)) {
      result.financialFilters = {
        ...result.financialFilters,
        dataType,
        market: result.financialFilters?.market || "국내증권",
        startDate,
        endDate
      };
      matchedKeywords.push(keyword);
      confidenceBoost += 0.1;
      break;
    }
  }

  // Check for sectors and news keywords
  let newsCategory = "";
  for (const [keyword, category] of Object.entries(sectorMappings)) {
    if (lowerPrompt.includes(keyword)) {
      newsCategory = category;
      matchedKeywords.push(keyword);
      confidenceBoost += 0.1;
      break;
    }
  }

  for (const [keyword, category] of Object.entries(newsKeywords)) {
    if (lowerPrompt.includes(keyword)) {
      newsCategory = newsCategory || category;
      matchedKeywords.push(keyword);
      confidenceBoost += 0.1;
      break;
    }
  }

  if (newsCategory) {
    result.newsFilters = {
      category: newsCategory,
      startDate,
      endDate
    };
  }

  // If no specific keywords found, provide default filters
  if (matchedKeywords.length === 0) {
    result.financialFilters = {
      market: "국내증권",
      dataType: "시세",
      startDate,
      endDate
    };
    result.newsFilters = {
      category: "시장뉴스", 
      startDate,
      endDate
    };
    result.confidence = 0.3;
  } else {
    result.confidence = Math.min(0.5 + confidenceBoost, 0.8);
  }

  result.rationale = matchedKeywords.length > 0 
    ? `키워드 기반 분석: '${matchedKeywords.join("', '")}' 키워드를 인식하여 관련 필터를 설정했습니다.`
    : "특정 키워드를 찾지 못해 기본 시장 데이터 필터를 적용했습니다.";

  return result;
}

// Export service object for easy mocking in tests
export const openaiService = {
  analyzeNews,
  generateEmbedding,
  generateBatchEmbeddings,
  generateEmbeddingWithMetadata,
  analyzeThemes,
  analyzeQuantitative,
  generateMacroAnalysis,
  executeCustomPrompt,
  analyzeCausalFactors,
  detectMarketEvent,
  generateCausalReasoning,
  calculateConfidenceScore,
  generateAlternativeExplanations,
  recommendSchemas
};

export async function recommendSchemas(prompt: string): Promise<SchemaRecommendationResult> {
  try {
    if (!openai) {
      // Use keyword-based fallback when OpenAI is not available
      return getKeywordBasedRecommendation(prompt);
    }

    const systemPrompt = `
You are a financial data analysis assistant. Analyze user prompts to recommend appropriate filters for financial market data and news searches.

Available financial data filters:
- symbol: Stock/index code (e.g., "005930" for Samsung Electronics, "^KS11" for KOSPI)
- market: 국내증권, 해외증권, 국내지수, 해외지수
- country: KR, US, JP, CN, EU
- dataType: 시세, 지수, 수급량, 마스터파일
- startDate/endDate: ISO date format (YYYY-MM-DD)

Available news filters:
- category: 기업뉴스, 시장뉴스, 경제뉴스, 산업뉴스, 국제뉴스
- startDate/endDate: ISO date format (YYYY-MM-DD)

Examples:
- "삼성전자 주가 분석" → symbol: "005930", market: "국내증권", newsFilters: {category: "기업뉴스"}
- "미국 증시 시황" → market: "해외증권", country: "US", newsFilters: {category: "시장뉴스"}
- "반도체 업종 뉴스" → newsFilters: {category: "산업뉴스"}

Respond with a JSON object containing recommended filters, rationale, and confidence (0-1).
`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `User prompt: "${prompt}"\n\nAnalyze this prompt and recommend appropriate filters for financial data and news searches. Provide response in JSON format with fields: financialFilters, newsFilters, rationale, confidence.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = parseJsonResponse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Schema recommendation failed:', error);
    throw new Error(`Schema recommendation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ========== ETF Investment Guide Chatbot AI Functions ==========

// Structured response interface for ETF consultation
export interface ETFConsultationResponse {
  message: string;
  recommendations?: ETFRecommendation[];
  educationalContent?: {
    topic: string;
    explanation: string;
    keyPoints: string[];
    resources: string[];
  };
  riskAssessment?: {
    currentRiskLevel: string;
    recommendedActions: string[];
    warnings: string[];
  };
  nextSteps?: string[];
  disclaimer: string;
}

// Portfolio analysis response interface
export interface PortfolioAnalysisResponse {
  analysis: {
    strengths: string[];
    weaknesses: string[];
    riskLevel: string;
    diversificationScore: number;
  };
  recommendations: {
    rebalancing: string[];
    additions: string[];
    removals: string[];
  };
  projections: {
    expectedReturn: string;
    riskMetrics: Record<string, string>;
  };
  disclaimer: string;
}

// Risk assessment questionnaire response
export interface RiskAssessmentResponse {
  questions: Array<{
    id: string;
    question: string;
    options: Array<{
      value: string;
      label: string;
      points: number;
    }>;
  }>;
  instructions: string;
  totalQuestions: number;
}

// Generate ETF consultation response with structured output
export async function generateEtfConsultation(
  userMessage: string,
  chatHistory: EtfChatMessage[],
  userProfile?: UserRiskProfile,
  contextData?: {
    recommendations?: ETFRecommendation[];
    etfData?: EtfProduct[];
    marketData?: any;
  }
): Promise<ETFConsultationResponse> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }

    // Build context from chat history
    const conversationContext = chatHistory
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Build user profile context
    const profileContext = userProfile ? 
      `사용자 프로필: 위험수준 ${userProfile.riskLevel}, 투자기간 ${userProfile.horizon}, 목표 ${userProfile.objectives?.join(', ') || '없음'}` :
      "사용자 프로필 없음";

    // Build data context
    const dataContext = contextData?.etfData ? 
      `관련 ETF 정보: ${contextData.etfData.map(etf => `${etf.ticker}: ${etf.name}`).join(', ')}` :
      "";

    const systemPrompt = `
당신은 전문 ETF 투자 상담사입니다. 다음 원칙을 반드시 지켜주세요:

핵심 원칙:
1. 항상 교육적이고 중립적인 관점 유지
2. 개인 투자 조언이 아닌 일반적 정보 제공
3. 위험성을 명확히 설명하고 면책조항 포함
4. 사실 기반 정보만 제공, 추측 금지
5. 사용자의 위험성향에 맞는 조언 제공

금지사항:
- 특정 ETF 매수/매도 직접 권유
- 수익률 보장 또는 예측
- 개인 세무/법률 조언
- 근거없는 시장 전망
- 긴급성을 조장하는 언어

응답 구조:
- 명확하고 이해하기 쉬운 설명
- 구체적인 교육 내용 포함
- 적절한 위험 경고
- 다음 단계 안내
- 반드시 면책조항 포함

톤: 친근하지만 전문적, 교육적, 중립적
`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `
대화 맥락:
${conversationContext}

${profileContext}

${dataContext}

사용자 메시지: "${userMessage}"

위 내용을 바탕으로 ETF 투자 상담 응답을 생성해주세요. 응답은 다음 JSON 형식으로 해주세요:

{
  "message": "메인 응답 메시지",
  "educationalContent": {
    "topic": "주요 교육 주제",
    "explanation": "상세 설명",
    "keyPoints": ["핵심 포인트들"],
    "resources": ["추가 학습 자료들"]
  },
  "riskAssessment": {
    "currentRiskLevel": "현재 위험 수준 평가",
    "recommendedActions": ["권장 행동들"],
    "warnings": ["주의사항들"]
  },
  "nextSteps": ["다음 단계 안내"],
  "disclaimer": "면책조항"
}
`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result: ETFConsultationResponse = parseJsonResponse(response.choices[0].message.content);
    
    // Add context recommendations if available
    if (contextData?.recommendations && contextData.recommendations.length > 0) {
      result.recommendations = contextData.recommendations.slice(0, 3); // Top 3 recommendations
    }

    return result;
  } catch (error) {
    console.error('ETF consultation failed:', error);
    throw new Error(`ETF consultation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate risk assessment questionnaire
export async function generateRiskAssessmentQuestionnaire(): Promise<RiskAssessmentResponse> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }

    const systemPrompt = `
당신은 투자 위험성향 평가 전문가입니다. ETF 투자자를 위한 종합적인 위험성향 평가 설문을 생성해주세요.

설문 요구사항:
1. 10-12개의 질문으로 구성
2. 각 질문별 3-4개의 선택지
3. 선택지별 점수 배정 (1-5점)
4. 다양한 측면 평가: 투자경험, 위험감수능력, 투자목적, 시간지평, 손실허용도

질문 영역:
- 투자 경험 및 지식
- 위험 감수 능력
- 투자 목적 및 목표
- 투자 기간
- 손실에 대한 태도
- 시장 변동성에 대한 반응
- 유동성 필요성
- 연령 및 소득 상황

각 질문은 실제 투자 상황을 반영하고 이해하기 쉬워야 합니다.
`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `ETF 투자자를 위한 위험성향 평가 설문을 생성해주세요. 다음 JSON 형식으로 응답해주세요:

{
  "questions": [
    {
      "id": "질문ID",
      "question": "질문 내용",
      "options": [
        {
          "value": "선택지값",
          "label": "선택지 라벨",
          "points": 점수
        }
      ]
    }
  ],
  "instructions": "설문 작성 안내",
  "totalQuestions": 총질문수
}
`
        }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    console.error('Risk assessment questionnaire generation failed:', error);
    throw new Error(`Risk assessment generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Analyze portfolio and provide structured feedback
export async function analyzePortfolio(
  portfolio: Array<{ etf: EtfProduct; allocation: number; metrics?: EtfMetric }>,
  userProfile: UserRiskProfile,
  marketContext?: any
): Promise<PortfolioAnalysisResponse> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }

    const portfolioData = portfolio.map(item => ({
      ticker: item.etf.ticker,
      name: item.etf.name,
      allocation: item.allocation,
      assetClass: item.etf.assetClass,
      region: item.etf.region,
      expenseRatio: item.etf.expenseRatio,
      riskScore: item.etf.riskScore
    }));

    const systemPrompt = `
당신은 포트폴리오 분석 전문가입니다. ETF 포트폴리오를 종합적으로 분석하고 개선 방안을 제시해주세요.

분석 영역:
1. 분산투자 효과성
2. 위험-수익 프로필
3. 비용 효율성
4. 자산배분의 적절성
5. 사용자 위험성향과의 일치성

분석 시 고려사항:
- 상관관계 및 중복성
- 섹터/지역 분산도
- 리밸런싱 필요성
- 비용 최적화 기회
- 위험 조정 수익률

객관적이고 건설적인 피드백을 제공하되, 교육적 관점을 유지해주세요.
`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `
포트폴리오 구성:
${JSON.stringify(portfolioData, null, 2)}

사용자 프로필:
- 위험수준: ${userProfile.riskLevel}
- 투자기간: ${userProfile.horizon}
- 투자목표: ${userProfile.objectives?.join(', ') || '없음'}
- 제외종목: ${userProfile.excludedTickers?.join(', ') || '없음'}

포트폴리오를 종합 분석하고 다음 JSON 형식으로 응답해주세요:

{
  "analysis": {
    "strengths": ["포트폴리오 강점들"],
    "weaknesses": ["개선이 필요한 부분들"],
    "riskLevel": "전체 위험 수준",
    "diversificationScore": 분산투자점수(0-100)
  },
  "recommendations": {
    "rebalancing": ["리밸런싱 권장사항"],
    "additions": ["추가 고려 ETF/자산"],
    "removals": ["제거 고려 항목들"]
  },
  "projections": {
    "expectedReturn": "예상 수익률 범위",
    "riskMetrics": {
      "volatility": "예상 변동성",
      "maxDrawdown": "최대 손실 가능성"
    }
  },
  "disclaimer": "분석 면책조항"
}
`
        }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    console.error('Portfolio analysis failed:', error);
    throw new Error(`Portfolio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate educational content about ETFs
export async function generateETFEducationalContent(
  topic: string,
  userLevel: "beginner" | "intermediate" | "advanced" = "beginner"
): Promise<{
  title: string;
  content: string;
  keyPoints: string[];
  examples: string[];
  nextTopics: string[];
  quiz?: Array<{ question: string; options: string[]; correct: number }>;
}> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }

    const levelPrompts = {
      beginner: "초보자도 쉽게 이해할 수 있도록 기본 개념부터 설명",
      intermediate: "기본 개념은 알고 있다고 가정하고 실무적인 내용 포함",
      advanced: "고급 전략과 세부적인 분석 방법까지 포함"
    };

    const systemPrompt = `
당신은 ETF 교육 전문가입니다. 요청된 주제에 대해 ${levelPrompts[userLevel]}해주세요.

교육 원칙:
1. 정확하고 객관적인 정보 제공
2. 실용적인 예시 포함
3. 단계적 학습 구조
4. 위험성 명확히 설명
5. 다음 학습 단계 안내

내용 구성:
- 명확한 정의와 개념 설명
- 구체적인 예시와 사례
- 핵심 포인트 정리
- 다음 단계 학습 주제 제안
- 이해도 확인 퀴즈 (선택적)
`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `
주제: "${topic}"
대상 수준: ${userLevel}

위 주제에 대한 교육 콘텐츠를 생성해주세요. 다음 JSON 형식으로 응답해주세요:

{
  "title": "교육 콘텐츠 제목",
  "content": "주요 교육 내용",
  "keyPoints": ["핵심 포인트들"],
  "examples": ["구체적인 예시들"],
  "nextTopics": ["다음 학습 추천 주제들"],
  "quiz": [
    {
      "question": "퀴즈 질문",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correct": 정답번호(0-3)
    }
  ]
}
`
        }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    console.error('Educational content generation failed:', error);
    throw new Error(`Educational content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Compare multiple ETFs with structured analysis
export async function compareETFs(
  etfs: Array<{ etf: EtfProduct; metrics?: EtfMetric }>,
  comparisonCriteria?: string[]
): Promise<{
  comparison: {
    summary: string;
    winner: string;
    criteria: Array<{
      criterion: string;
      analysis: string;
      rankings: Array<{ ticker: string; score: number; reason: string }>;
    }>;
  };
  recommendations: {
    bestFor: Record<string, { ticker: string; reason: string }>;
    avoid: Array<{ ticker: string; reason: string }>;
  };
  disclaimer: string;
}> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }

    const etfData = etfs.map(item => ({
      ticker: item.etf.ticker,
      name: item.etf.name,
      assetClass: item.etf.assetClass,
      region: item.etf.region,
      expenseRatio: item.etf.expenseRatio,
      riskScore: item.etf.riskScore,
      aum: item.etf.aum,
      metrics: item.metrics ? {
        nav: item.metrics.nav,
        price: item.metrics.price,
        volume: (item.metrics as any).volume || 0,
        ret1y: item.metrics.ret1y,
        vol30d: item.metrics.vol30d,
        trackingDiff: item.metrics.trackingDiff
      } : null
    }));

    const criteria = comparisonCriteria || [
      "비용 효율성",
      "위험 수준",
      "유동성",
      "추적 오차",
      "성과",
      "분산도"
    ];

    const systemPrompt = `
당신은 ETF 비교분석 전문가입니다. 여러 ETF를 다양한 기준으로 객관적으로 비교분석해주세요.

비교분석 원칙:
1. 정량적 데이터 기반 객관적 평가
2. 각 기준별 명확한 근거 제시
3. 투자자 유형별 적합성 고려
4. 장단점 균형있게 제시
5. 절대적 우위보다는 상황별 적합성 강조

금지사항:
- 특정 ETF 직접 매수 권유
- 근거없는 선호도 표현
- 과도한 일반화
- 미래 성과 예측
`;

    const response = await openai.chat.completions.create({
      model: getChatModelName(),
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `
비교 대상 ETF:
${JSON.stringify(etfData, null, 2)}

비교 기준:
${criteria.join(", ")}

위 ETF들을 종합 비교분석하고 다음 JSON 형식으로 응답해주세요:

{
  "comparison": {
    "summary": "전체 비교 요약",
    "winner": "종합 우승자 (있다면)",
    "criteria": [
      {
        "criterion": "기준명",
        "analysis": "기준별 분석",
        "rankings": [
          {
            "ticker": "ETF티커",
            "score": 점수(1-10),
            "reason": "점수 근거"
          }
        ]
      }
    ]
  },
  "recommendations": {
    "bestFor": {
      "초보투자자": {"ticker": "추천ETF", "reason": "이유"},
      "안정추구투자자": {"ticker": "추천ETF", "reason": "이유"},
      "성장추구투자자": {"ticker": "추천ETF", "reason": "이유"}
    },
    "avoid": [
      {"ticker": "주의ETF", "reason": "주의사유"}
    ]
  },
  "disclaimer": "비교분석 면책조항"
}
`
        }
      ],
      response_format: { type: "json_object" },
    });

    return parseJsonResponse(response.choices[0].message.content);
  } catch (error) {
    console.error('ETF comparison failed:', error);
    throw new Error(`ETF comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generic completion function for workflow execution
export async function generateCompletion(params: {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
}): Promise<any> {
  try {
    if (!openai) {
      throw new Error('OpenAI client not initialized - API key not available');
    }
    
    const requestParams: any = {
      model: getChatModelName(),
      messages: params.messages,
      max_tokens: params.maxTokens || 1500,
      temperature: params.temperature !== undefined ? params.temperature : 0.7,
    };
    
    // Add response_format if JSON is requested
    if (params.responseFormat === 'json') {
      requestParams.response_format = { type: "json_object" };
    }
    
    const response = await openai.chat.completions.create(requestParams);
    
    return {
      choices: response.choices,
      text: response.choices[0].message.content,
      model: response.model,
      usage: response.usage
    };
  } catch (error) {
    console.error('Completion generation failed:', error);
    throw new Error(`Completion generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
