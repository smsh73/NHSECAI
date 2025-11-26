import OpenAI from "openai";
import { storage } from "../storage";
import * as openaiService from "./openai";
import { azureConfigService } from './azure-config.js';

// Initialize OpenAI Embedding client with Azure configuration
function initializeEmbeddingClient() {
  const embeddingConfig = azureConfigService.getEmbeddingConfig();
  
  // Azure OpenAI Embedding (APIM-compatible)
  if (embeddingConfig.apiKey && embeddingConfig.endpoint) {
    return new OpenAI({
      apiKey: embeddingConfig.apiKey,
      baseURL: `${embeddingConfig.endpoint}/deployments/${embeddingConfig.deploymentName}`,
      ...(embeddingConfig.apiVersion ? { defaultQuery: { 'api-version': embeddingConfig.apiVersion } } : {}),
      // APIM expects 'api-key' header
      defaultHeaders: { 'api-key': embeddingConfig.apiKey },
    });
  }
  
  // Fallback to Standard OpenAI
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
  if (apiKey && apiKey !== "default_key") {
    return new OpenAI({ apiKey });
  }
  
  return null;
}

const openai = initializeEmbeddingClient();

export interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  similarity: number;
  score?: number; // Hybrid score (vector + keyword)
  source: 'financial' | 'news' | 'market_event';
}

export interface HybridSearchQuery {
  query: string;
  vectorWeight?: number; // Default 0.7
  keywordWeight?: number; // Default 0.3
  filters?: {
    symbol?: string;
    market?: string;
    country?: string;
    dataType?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    sentiment?: string;
    minConfidence?: number;
  };
  topK?: number;
  threshold?: number;
}

export interface AnalysisSearchQuery {
  query: string;
  analysisType?: 'news' | 'theme' | 'quantitative' | 'causal';
  contextData?: any;
  timeframe?: string;
}

export interface SimilarEventQuery {
  eventId: string;
  eventType?: string;
  timeRadius?: number; // milliseconds
  similarityThreshold?: number;
}

class RAGService {
  // Core embedding functions
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!openai) {
        console.warn('Embedding client not initialized - API key not available');
        return [];
      }
      
      const embeddingConfig = azureConfigService.getEmbeddingConfig();
      const model = embeddingConfig.modelName || "text-embedding-3-large";
      
      const response = await openai.embeddings.create({
        model,
        input: text,
        dimensions: 3072
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      return [];
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!openai) {
        console.warn('Embedding client not initialized - API key not available');
        return texts.map(() => []);
      }
      
      const embeddingConfig = azureConfigService.getEmbeddingConfig();
      const model = embeddingConfig.modelName || "text-embedding-3-large";
      
      // Process in batches of 100 (OpenAI/Azure limit)
      const batchSize = 100;
      const results: number[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        const response = await openai.embeddings.create({
          model,
          input: batch,
          dimensions: 3072
        });
        
        results.push(...response.data.map(item => item.embedding));
      }
      
      return results;
    } catch (error) {
      console.warn('Batch embedding generation failed:', error instanceof Error ? error.message : 'Unknown error');
      return texts.map(() => []);
    }
  }

  // Enhanced cosine similarity calculation
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0) return 0;
    if (vecA.length !== vecB.length) return 0;

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Keyword matching score calculation
  private calculateKeywordScore(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    let totalTerms = queryTerms.length;
    
    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        matches++;
      }
    }
    
    return totalTerms > 0 ? matches / totalTerms : 0;
  }

  // Calculate hybrid score (vector + keyword weighted)
  private calculateHybridScore(
    vectorSimilarity: number,
    keywordScore: number,
    vectorWeight: number = 0.7,
    keywordWeight: number = 0.3
  ): number {
    return (vectorSimilarity * vectorWeight) + (keywordScore * keywordWeight);
  }

  // Data embedding functions
  async embedFinancialData(data: any): Promise<string> {
    try {
      const textContent = this.financialDataToText(data);
      const embedding = await this.generateEmbedding(textContent);
      return JSON.stringify(embedding);
    } catch (error) {
      console.error("Failed to embed financial data:", error);
      throw new Error("Financial data embedding failed");
    }
  }

  async embedNewsData(data: any): Promise<string> {
    try {
      const textContent = `${data.title || ''} ${data.content || ''} ${data.category || ''} ${data.summary || ''}`;
      const embedding = await this.generateEmbedding(textContent);
      return JSON.stringify(embedding);
    } catch (error) {
      console.error("Failed to embed news data:", error);
      throw new Error("News data embedding failed");
    }
  }

  private financialDataToText(data: any): string {
    const parts = [
      `종목: ${data.symbol || ''}`,
      `종목명: ${data.symbolName || ''}`,
      `시장: ${data.market || ''}`,
      `국가: ${data.country || ''}`,
      `데이터타입: ${data.dataType || ''}`,
      `가격: ${data.price || ''}`,
      `거래량: ${data.volume || ''}`,
      `업종: ${data.sectorName || ''}`,
      `테마: ${data.themeName || ''}`
    ];
    
    if (data.metadata) {
      parts.push(`메타데이터: ${JSON.stringify(data.metadata)}`);
    }
    
    return parts.filter(part => part.includes(': ') && !part.endsWith(': ')).join(' ');
  }

  // Main HYBRID RAG search function
  async hybridSearch(
    query: string,
    vectorWeight: number = 0.7,
    keywordWeight: number = 0.3,
    filters: any = {}
  ): Promise<SearchResult[]> {
    try {
      const searchQuery: HybridSearchQuery = {
        query,
        vectorWeight,
        keywordWeight,
        filters,
        topK: filters.topK || 20,
        threshold: filters.threshold || 0.3
      };

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      if (queryEmbedding.length === 0) {
        console.warn('Query embedding failed, using keyword-only search');
        return await this.keywordOnlySearch(searchQuery);
      }

      // Search both financial and news data in parallel
      const [financialResults, newsResults] = await Promise.all([
        this.searchFinancialData(queryEmbedding, searchQuery),
        this.searchNewsData(queryEmbedding, searchQuery)
      ]);

      // Combine and rank results
      const combinedResults = [...financialResults, ...newsResults];
      
      // Sort by hybrid score
      combinedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      return combinedResults.slice(0, searchQuery.topK);
    } catch (error) {
      console.error("Hybrid search failed:", error);
      throw new Error("Hybrid search failed");
    }
  }

  // Search for analysis contexts
  async searchForAnalysis(query: AnalysisSearchQuery): Promise<SearchResult[]> {
    try {
      const hybridQuery: HybridSearchQuery = {
        query: query.query,
        vectorWeight: 0.8, // Higher vector weight for analysis
        keywordWeight: 0.2,
        topK: 15,
        threshold: 0.4
      };

      // Add analysis-specific filters
      if (query.analysisType) {
        switch (query.analysisType) {
          case 'news':
            hybridQuery.filters = { category: 'news', ...hybridQuery.filters };
            break;
          case 'theme':
            hybridQuery.filters = { dataType: '테마', ...hybridQuery.filters };
            break;
          case 'quantitative':
            hybridQuery.filters = { 
              dataType: ['국내증권시세', '해외증권시세', '국내지수', '해외지수'],
              ...hybridQuery.filters 
            };
            break;
          case 'causal':
            // Broader search for causal analysis
            hybridQuery.threshold = 0.3;
            hybridQuery.topK = 25;
            break;
        }
      }

      return await this.hybridSearch(
        hybridQuery.query,
        hybridQuery.vectorWeight,
        hybridQuery.keywordWeight,
        hybridQuery.filters
      );
    } catch (error) {
      console.error("Analysis search failed:", error);
      throw new Error("Analysis search failed");
    }
  }

  // Find similar events
  async findSimilarEvents(eventId: string): Promise<SearchResult[]> {
    try {
      // Get the reference event
      const referenceEvent = await this.getEventData(eventId);
      if (!referenceEvent) {
        throw new Error("Reference event not found");
      }

      // Create search query from event
      const eventQuery = this.createEventSearchQuery(referenceEvent);
      
      // Search for similar events
      const similarResults = await this.hybridSearch(
        eventQuery,
        0.8, // High vector weight for semantic similarity
        0.2,
        {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          threshold: 0.6,
          topK: 10
        }
      );

      // Filter out the reference event itself
      return similarResults.filter(result => result.id !== eventId);
    } catch (error) {
      console.error("Similar events search failed:", error);
      throw new Error("Similar events search failed");
    }
  }

  // Generate search suggestions
  async generateSearchSuggestions(partialQuery: string): Promise<string[]> {
    try {
      if (partialQuery.length < 2) return [];

      // Get recent frequently searched terms
      const recentTerms = await this.getRecentSearchTerms();
      
      // Get common financial terms
      const financialTerms = await this.getCommonFinancialTerms();
      
      // Combine and filter suggestions
      const allTerms = [...recentTerms, ...financialTerms];
      const suggestions = allTerms
        .filter(term => term.toLowerCase().includes(partialQuery.toLowerCase()))
        .slice(0, 10);

      // Add AI-generated suggestions if we have few matches
      if (suggestions.length < 5 && openai) {
        const aiSuggestions = await this.generateAISuggestions(partialQuery);
        suggestions.push(...aiSuggestions);
      }

      return [...new Set(suggestions)].slice(0, 10);
    } catch (error) {
      console.error("Search suggestions generation failed:", error);
      return [];
    }
  }

  // Helper methods for search operations
  private async searchFinancialData(
    queryEmbedding: number[],
    searchQuery: HybridSearchQuery
  ): Promise<SearchResult[]> {
    try {
      const financialData = await storage.searchFinancialData(searchQuery.filters || {});
      const results: SearchResult[] = [];

      for (const data of financialData) {
        if (data.embeddings) {
          try {
            const dataEmbedding = JSON.parse(data.embeddings);
            const vectorSimilarity = this.cosineSimilarity(queryEmbedding, dataEmbedding);
            
            const content = this.financialDataToText(data);
            const keywordScore = this.calculateKeywordScore(searchQuery.query, content);
            
            const hybridScore = this.calculateHybridScore(
              vectorSimilarity,
              keywordScore,
              searchQuery.vectorWeight,
              searchQuery.keywordWeight
            );

            if (hybridScore >= (searchQuery.threshold || 0.3)) {
              results.push({
                id: data.id,
                content,
                metadata: {
                  symbol: data.symbol,
                  symbolName: data.symbolName,
                  market: data.market,
                  country: data.country,
                  dataType: data.dataType,
                  timestamp: data.timestamp,
                  price: data.price,
                  volume: data.volume,
                  ...(data.metadata && typeof data.metadata === 'object' ? data.metadata : {})
                },
                similarity: vectorSimilarity,
                score: hybridScore,
                source: 'financial'
              });
            }
          } catch (error) {
            console.warn(`Failed to process embedding for financial data ${data.id}`);
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Financial data search failed:", error);
      return [];
    }
  }

  private async searchNewsData(
    queryEmbedding: number[],
    searchQuery: HybridSearchQuery
  ): Promise<SearchResult[]> {
    try {
      const newsData = await storage.searchNewsData({
        category: searchQuery.filters?.category,
        keywords: searchQuery.query.split(' '),
        startDate: searchQuery.filters?.startDate,
        endDate: searchQuery.filters?.endDate,
        sentiment: searchQuery.filters?.sentiment
      });

      const results: SearchResult[] = [];

      for (const data of newsData) {
        if (data.embeddings) {
          try {
            const dataEmbedding = JSON.parse(data.embeddings);
            const vectorSimilarity = this.cosineSimilarity(queryEmbedding, dataEmbedding);
            
            const content = `${data.title} ${data.content}`;
            const keywordScore = this.calculateKeywordScore(searchQuery.query, content);
            
            const hybridScore = this.calculateHybridScore(
              vectorSimilarity,
              keywordScore,
              searchQuery.vectorWeight,
              searchQuery.keywordWeight
            );

            if (hybridScore >= (searchQuery.threshold || 0.3)) {
              results.push({
                id: data.id,
                content,
                metadata: {
                  title: data.title,
                  source: data.source,
                  category: data.category,
                  sentiment: data.sentiment,
                  keywords: data.keywords,
                  publishedAt: data.publishedAt,
                  url: data.url
                },
                similarity: vectorSimilarity,
                score: hybridScore,
                source: 'news'
              });
            }
          } catch (error) {
            console.warn(`Failed to process embedding for news data ${data.id}`);
          }
        }
      }

      return results;
    } catch (error) {
      console.error("News data search failed:", error);
      return [];
    }
  }

  private async keywordOnlySearch(searchQuery: HybridSearchQuery): Promise<SearchResult[]> {
    try {
      console.log('Performing enhanced keyword-only search with query:', searchQuery.query);
      
      // Use enhanced full-text search methods
      const [financialData, newsData] = await Promise.all([
        storage.fullTextSearchFinancialData(searchQuery.query, {
          symbol: searchQuery.filters?.symbol,
          market: searchQuery.filters?.market,
          dataType: searchQuery.filters?.dataType,
          limit: Math.ceil((searchQuery.topK || 20) * 0.6) // 60% for financial data
        }),
        storage.fullTextSearchNewsData(searchQuery.query, {
          category: searchQuery.filters?.category,
          sentiment: searchQuery.filters?.sentiment,
          startDate: searchQuery.filters?.startDate,
          endDate: searchQuery.filters?.endDate,
          limit: Math.ceil((searchQuery.topK || 20) * 0.6) // 60% for news data
        })
      ]);

      const results: SearchResult[] = [];
      const threshold = searchQuery.threshold || 0.1; // Lower threshold for better coverage

      // Process financial data with PostgreSQL ranking
      for (const data of financialData) {
        const content = this.financialDataToText(data);
        const pgRank = data.search_rank || 0;
        const keywordScore = this.calculateKeywordScore(searchQuery.query, content);
        
        // Combine PostgreSQL full-text ranking with keyword matching
        const finalScore = (pgRank * 0.7) + (keywordScore * 0.3);
        
        if (finalScore >= threshold) {
          results.push({
            id: data.id,
            content,
            metadata: {
              symbol: data.symbol,
              symbolName: data.symbolName,
              market: data.market,
              dataType: data.dataType,
              sectorName: data.sectorName,
              themeName: data.themeName,
              timestamp: data.timestamp,
              price: data.price,
              changeRate: data.changeRate
            },
            similarity: finalScore,
            score: finalScore,
            source: 'financial'
          });
        }
      }

      // Process news data with PostgreSQL ranking
      for (const data of newsData) {
        const content = `${data.title || ''} ${data.content || ''} ${data.summary || ''}`;
        const pgRank = data.search_rank || 0;
        const keywordScore = this.calculateKeywordScore(searchQuery.query, content);
        
        // Combine PostgreSQL full-text ranking with keyword matching
        const finalScore = (pgRank * 0.7) + (keywordScore * 0.3);
        
        if (finalScore >= threshold) {
          results.push({
            id: data.id,
            content,
            metadata: {
              title: data.title,
              source: data.source,
              category: data.category,
              sentiment: data.sentiment,
              keywords: data.keywords,
              publishedAt: data.publishedAt,
              url: data.url
            },
            similarity: finalScore,
            score: finalScore,
            source: 'news'
          });
        }
      }

      // Enhanced sorting with diversity
      results.sort((a, b) => {
        // Primary sort by score
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (Math.abs(scoreDiff) > 0.1) return scoreDiff;
        
        // Secondary sort by source diversity (prefer mixed results)
        if (a.source !== b.source) {
          return a.source === 'news' ? -1 : 1; // Slightly prefer news for recency
        }
        
        return scoreDiff;
      });

      const finalResults = results.slice(0, searchQuery.topK || 20);
      console.log(`Enhanced keyword search returned ${finalResults.length} results`);
      
      return finalResults;
    } catch (error) {
      console.error("Enhanced keyword-only search failed:", error);
      
      // Fallback to basic search if enhanced search fails
      try {
        const [basicFinancial, basicNews] = await Promise.all([
          storage.searchFinancialData(searchQuery.filters || {}),
          storage.searchNewsData({
            keywords: searchQuery.query.split(' ').filter(word => word.length > 1),
            category: searchQuery.filters?.category,
            startDate: searchQuery.filters?.startDate,
            endDate: searchQuery.filters?.endDate
          })
        ]);

        const fallbackResults: SearchResult[] = [];
        
        // Add top financial results
        basicFinancial.slice(0, 10).forEach(data => {
          const content = this.financialDataToText(data);
          fallbackResults.push({
            id: data.id,
            content,
            metadata: { symbol: data.symbol, market: data.market },
            similarity: 0.5,
            score: 0.5,
            source: 'financial'
          });
        });
        
        // Add top news results
        basicNews.slice(0, 10).forEach(data => {
          fallbackResults.push({
            id: data.id,
            content: `${data.title} ${data.content}`,
            metadata: { title: data.title, category: data.category },
            similarity: 0.5,
            score: 0.5,
            source: 'news'
          });
        });

        console.log(`Fallback search returned ${fallbackResults.length} results`);
        return fallbackResults.slice(0, searchQuery.topK || 20);
      } catch (fallbackError) {
        console.error("Fallback search also failed:", fallbackError);
        return [];
      }
    }
  }

  private async getEventData(eventId: string): Promise<any> {
    try {
      // Try to get from various event sources
      const [majorEvent, causalAnalysis, marketAnalysis] = await Promise.all([
        storage.getMajorEvent(eventId).catch(() => null),
        storage.getCausalAnalysis(eventId).catch(() => null),
        storage.getMarketAnalysis('event', 1).then(results => 
          results.find(r => r.id === eventId) || null
        ).catch(() => null)
      ]);

      return majorEvent || causalAnalysis || marketAnalysis;
    } catch (error) {
      console.error("Failed to get event data:", error);
      return null;
    }
  }

  private createEventSearchQuery(event: any): string {
    const queryParts = [];
    
    if (event.majorIssueName) queryParts.push(event.majorIssueName);
    if (event.situationType) queryParts.push(event.situationType);
    if (event.marketEvent) queryParts.push(event.marketEvent);
    if (event.symbol) queryParts.push(event.symbol);
    if (event.analysisType) queryParts.push(event.analysisType);
    
    return queryParts.join(' ');
  }

  private async getRecentSearchTerms(): Promise<string[]> {
    // This would typically come from a search log table
    // For now, return common financial terms
    return [
      "삼성전자", "SK하이닉스", "LG에너지솔루션", "카카오", "네이버",
      "코스피", "코스닥", "환율", "금리", "인플레이션",
      "실적", "배당", "IPO", "증자", "M&A"
    ];
  }

  private async getCommonFinancialTerms(): Promise<string[]> {
    return [
      "주가", "시가총액", "거래량", "외국인", "기관", "개인",
      "매수", "매도", "상승", "하락", "급등", "급락",
      "반도체", "바이오", "2차전지", "자동차", "화학",
      "은행", "증권", "보험", "건설", "조선"
    ];
  }

  private async generateAISuggestions(partialQuery: string): Promise<string[]> {
    try {
      if (!openai) return [];

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "당신은 한국 금융시장 전문 검색 어시스턴트입니다. 부분 검색어에 대해 관련된 한국 주식, 시장 용어, 회사명을 5개 제안해주세요."
          },
          {
            role: "user",
            content: `"${partialQuery}"와 관련된 검색 제안어 5개를 JSON 배열로 반환해주세요. 예: ["삼성전자", "반도체", "SK하이닉스"]`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return Array.isArray(result.suggestions) ? result.suggestions : [];
    } catch (error) {
      console.error("AI suggestions generation failed:", error);
      return [];
    }
  }

  // Market correlation analysis for enhanced RAG
  async analyzeMarketCorrelation(
    symbol: string,
    timeframe: string = '1d'
  ): Promise<{
    correlatedSymbols: string[];
    correlatedNews: SearchResult[];
    correlationStrength: number;
  }> {
    try {
      // Search for related financial data
      const correlatedData = await this.hybridSearch(
        `${symbol} 관련 종목 업종 테마 동조`,
        0.6,
        0.4,
        {
          dataType: ['국내증권시세', '해외증권시세'],
          topK: 15
        }
      );

      // Search for related news
      const correlatedNews = await this.hybridSearch(
        `${symbol} 뉴스 이벤트 발표`,
        0.7,
        0.3,
        {
          category: 'market',
          topK: 10
        }
      );

      const correlatedSymbols = correlatedData
        .map(item => item.metadata.symbol)
        .filter(s => s && s !== symbol)
        .slice(0, 10);

      const correlationStrength = correlatedData.length > 0 
        ? correlatedData.reduce((sum, item) => sum + (item.score || 0), 0) / correlatedData.length
        : 0;

      return {
        correlatedSymbols,
        correlatedNews,
        correlationStrength
      };
    } catch (error) {
      console.error("Market correlation analysis failed:", error);
      throw new Error("Market correlation analysis failed");
    }
  }

  // Enhanced causal analysis with RAG
  async performCausalAnalysis(
    marketEvent: any,
    timeWindow: number = 4 * 60 * 60 * 1000 // 4 hours
  ): Promise<{
    directCauses: SearchResult[];
    indirectCauses: SearchResult[];
    temporalFactors: any[];
    causalStrength: number;
  }> {
    try {
      const eventTime = new Date(marketEvent.timestamp);
      const searchStart = new Date(eventTime.getTime() - timeWindow);
      const searchEnd = new Date(eventTime.getTime() + timeWindow / 4);

      // Search for direct causal factors
      const directCauses = await this.hybridSearch(
        `${marketEvent.symbol} ${marketEvent.eventType} 직접 원인 발표 공시`,
        0.8,
        0.2,
        {
          startDate: searchStart,
          endDate: searchEnd,
          topK: 10,
          threshold: 0.6
        }
      );

      // Search for indirect causal factors
      const indirectCauses = await this.hybridSearch(
        `시장 환경 경제 정책 글로벌 ${marketEvent.market || ''}`,
        0.6,
        0.4,
        {
          startDate: searchStart,
          endDate: searchEnd,
          topK: 15,
          threshold: 0.4
        }
      );

      // Analyze temporal relationships
      const temporalFactors = this.analyzeTemporalRelationships(
        marketEvent,
        [...directCauses, ...indirectCauses]
      );

      const causalStrength = this.calculateCausalStrength(
        directCauses,
        indirectCauses,
        temporalFactors
      );

      return {
        directCauses,
        indirectCauses,
        temporalFactors,
        causalStrength
      };
    } catch (error) {
      console.error("Causal analysis failed:", error);
      throw new Error("Causal analysis failed");
    }
  }

  private analyzeTemporalRelationships(
    marketEvent: any,
    searchResults: SearchResult[]
  ): any[] {
    const eventTime = new Date(marketEvent.timestamp).getTime();
    
    return searchResults.map(result => {
      const resultTime = new Date(result.metadata.publishedAt || result.metadata.timestamp).getTime();
      const timeDiff = Math.abs(eventTime - resultTime);
      const timeDecay = Math.exp(-timeDiff / (2 * 60 * 60 * 1000)); // 2-hour decay
      
      return {
        resultId: result.id,
        timeDiff: timeDiff / (60 * 1000), // minutes
        timeDecay,
        temporalRelevance: (result.score || 0) * timeDecay,
        sequence: resultTime < eventTime ? 'before' : 'after'
      };
    });
  }

  private calculateCausalStrength(
    directCauses: SearchResult[],
    indirectCauses: SearchResult[],
    temporalFactors: any[]
  ): number {
    let strength = 0;

    // Direct causes contribute more
    if (directCauses.length > 0) {
      const directScore = directCauses.reduce((sum, c) => sum + (c.score || 0), 0) / directCauses.length;
      strength += directScore * 0.6;
    }

    // Indirect causes contribute less
    if (indirectCauses.length > 0) {
      const indirectScore = indirectCauses.reduce((sum, c) => sum + (c.score || 0), 0) / indirectCauses.length;
      strength += indirectScore * 0.3;
    }

    // Temporal relevance contributes
    if (temporalFactors.length > 0) {
      const temporalScore = temporalFactors.reduce((sum, f) => sum + f.temporalRelevance, 0) / temporalFactors.length;
      strength += temporalScore * 0.1;
    }

    return Math.min(strength, 1.0);
  }
}

export const ragService = new RAGService();