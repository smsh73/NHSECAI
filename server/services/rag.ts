import OpenAI from "openai";
import { storage } from "../storage";
import type { 
  SearchResult,
  RAGQuery,
  AnalysisSearchQuery 
} from '@shared/schema';
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

class RAGService {
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
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw new Error("Embedding generation failed");
    }
  }

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
      const textContent = `${data.title} ${data.content} ${data.category || ''}`;
      const embedding = await this.generateEmbedding(textContent);
      return JSON.stringify(embedding);
    } catch (error) {
      console.error("Failed to embed news data:", error);
      throw new Error("News data embedding failed");
    }
  }

  private financialDataToText(data: any): string {
    return `Symbol: ${data.symbol}, Market: ${data.market}, Country: ${data.country}, Type: ${data.dataType}, Price: ${data.price}, Volume: ${data.volume}, Metadata: ${JSON.stringify(data.metadata || {})}`;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async searchFinancialData(query: RAGQuery): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query.query);
      
      // Get financial data based on filters
      const financialData = await storage.searchFinancialData(query.filters || {});
      
      const results: SearchResult[] = [];
      
      for (const data of financialData) {
        if (data.embeddings) {
          try {
            const dataEmbedding = JSON.parse(data.embeddings);
            const similarity = this.cosineSimilarity(queryEmbedding, dataEmbedding);
            
            if (similarity >= (query.threshold || 0.7)) {
              results.push({
                id: data.id,
                content: this.financialDataToText(data),
                metadata: {
                  symbol: data.symbol,
                  market: data.market,
                  country: data.country,
                  dataType: data.dataType,
                  timestamp: data.timestamp,
                  ...(data.metadata && typeof data.metadata === 'object' ? data.metadata : {})
                },
                similarity
              });
            }
          } catch (error) {
            console.warn(`Failed to process embedding for financial data ${data.id}`);
          }
        }
      }
      
      // Sort by similarity and return top K
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, query.topK || 10);
      
    } catch (error) {
      console.error("Financial data search failed:", error);
      throw new Error("Financial data search failed");
    }
  }

  async searchNewsData(query: RAGQuery): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query.query);
      
      // Get news data based on filters
      const newsData = await storage.searchNewsData({
        category: query.filters?.category,
        startDate: query.filters?.startDate,
        endDate: query.filters?.endDate,
      });
      
      const results: SearchResult[] = [];
      
      for (const data of newsData) {
        if (data.embeddings) {
          try {
            const dataEmbedding = JSON.parse(data.embeddings);
            const similarity = this.cosineSimilarity(queryEmbedding, dataEmbedding);
            
            if (similarity >= (query.threshold || 0.7)) {
              results.push({
                id: data.id,
                content: `${data.title} ${data.content}`,
                metadata: {
                  title: data.title,
                  source: data.source,
                  category: data.category,
                  sentiment: data.sentiment,
                  keywords: data.keywords,
                  publishedAt: data.publishedAt,
                },
                similarity
              });
            }
          } catch (error) {
            console.warn(`Failed to process embedding for news data ${data.id}`);
          }
        }
      }
      
      // Sort by similarity and return top K
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, query.topK || 10);
      
    } catch (error) {
      console.error("News data search failed:", error);
      throw new Error("News data search failed");
    }
  }

  async hybridSearch(query: RAGQuery): Promise<{
    financial: SearchResult[];
    news: SearchResult[];
    combined: SearchResult[];
  }> {
    try {
      const [financialResults, newsResults] = await Promise.all([
        this.searchFinancialData(query),
        this.searchNewsData(query)
      ]);

      // Combine and re-rank results
      const combined = [...financialResults, ...newsResults]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, query.topK || 20);

      return {
        financial: financialResults,
        news: newsResults,
        combined
      };
    } catch (error) {
      console.error("Hybrid search failed:", error);
      throw new Error("Hybrid search failed");
    }
  }

  // Enhanced methods for causal analysis
  async analyzeMarketNewsCorrelation(
    priceMovement: any,
    timeWindow: number = 2 * 60 * 60 * 1000 // 2 hours in milliseconds
  ): Promise<{
    correlatedNews: SearchResult[];
    correlationStrength: number;
    temporalAnalysis: any;
  }> {
    try {
      const movementTime = new Date(priceMovement.timestamp);
      const searchStartTime = new Date(movementTime.getTime() - timeWindow);
      const searchEndTime = new Date(movementTime.getTime() + timeWindow);

      // Create search query for market movement
      const movementQuery = this.createMarketMovementQuery(priceMovement);
      
      // Search for correlated news with temporal constraints
      const correlatedNews = await this.searchNewsData({
        query: movementQuery,
        filters: {
          startDate: searchStartTime,
          endDate: searchEndTime
        },
        topK: 20,
        threshold: 0.6
      });

      // Calculate temporal correlation strength
      const temporalAnalysis = this.calculateTemporalCorrelation(
        priceMovement,
        correlatedNews,
        timeWindow
      );

      // Calculate overall correlation strength
      const correlationStrength = this.calculateOverallCorrelation(
        priceMovement,
        correlatedNews,
        temporalAnalysis
      );

      return {
        correlatedNews,
        correlationStrength,
        temporalAnalysis
      };
    } catch (error) {
      console.error("Market-news correlation analysis failed:", error);
      throw new Error("Market-news correlation analysis failed");
    }
  }

  async detectMarketAnomalies(
    marketData: any[],
    symbol: string,
    timeframe: string = "1hour"
  ): Promise<{
    anomalies: any[];
    severity: number;
    reasoning: string;
  }> {
    try {
      const anomalies = [];
      let totalSeverity = 0;

      // Price movement anomaly detection
      const priceAnomalies = this.detectPriceAnomalies(marketData);
      anomalies.push(...priceAnomalies);

      // Volume spike detection
      const volumeAnomalies = this.detectVolumeAnomalies(marketData);
      anomalies.push(...volumeAnomalies);

      // Calculate overall severity
      totalSeverity = anomalies.reduce((sum, anomaly) => sum + anomaly.severity, 0);
      const avgSeverity = anomalies.length > 0 ? totalSeverity / anomalies.length : 0;

      // Generate reasoning
      const reasoning = this.generateAnomalyReasoning(anomalies, symbol, timeframe);

      return {
        anomalies,
        severity: avgSeverity,
        reasoning
      };
    } catch (error) {
      console.error("Market anomaly detection failed:", error);
      throw new Error("Market anomaly detection failed");
    }
  }

  async findCausalFactors(
    marketEvent: any,
    searchRadius: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Promise<{
    newsFactors: SearchResult[];
    technicalFactors: any[];
    sentimentFactors: any[];
    externalFactors: SearchResult[];
    causalStrength: number;
  }> {
    try {
      const eventTime = new Date(marketEvent.timestamp);
      const searchStart = new Date(eventTime.getTime() - searchRadius);
      const searchEnd = new Date(eventTime.getTime() + (searchRadius / 4)); // Look ahead 6 hours

      // Multi-dimensional causal search
      const [newsFactors, technicalFactors, sentimentFactors, externalFactors] = await Promise.all([
        this.searchCausalNews(marketEvent, searchStart, searchEnd),
        this.analyzeTechnicalFactors(marketEvent),
        this.analyzeSentimentFactors(marketEvent, searchStart, searchEnd),
        this.searchExternalFactors(marketEvent, searchStart, searchEnd)
      ]);

      // Calculate combined causal strength
      const causalStrength = this.calculateCausalStrength({
        newsFactors,
        technicalFactors,
        sentimentFactors,
        externalFactors
      });

      return {
        newsFactors,
        technicalFactors,
        sentimentFactors,
        externalFactors,
        causalStrength
      };
    } catch (error) {
      console.error("Causal factor analysis failed:", error);
      throw new Error("Causal factor analysis failed");
    }
  }

  // Helper methods for causal analysis
  private createMarketMovementQuery(priceMovement: any): string {
    const { symbol, changePercent, volume } = priceMovement;
    const direction = changePercent > 0 ? "상승" : "하락";
    const magnitude = Math.abs(changePercent) > 5 ? "급등 급락" : "변동";
    
    return `${symbol} ${direction} ${magnitude} 주가 변동 시장 움직임 거래량 증가 뉴스 이벤트`;
  }

  private calculateTemporalCorrelation(
    priceMovement: any,
    newsResults: SearchResult[],
    timeWindow: number
  ): any {
    const movementTime = new Date(priceMovement.timestamp).getTime();
    
    const timeDecayAnalysis = newsResults.map(news => {
      const newsTime = new Date(news.metadata.publishedAt).getTime();
      const timeDiff = Math.abs(movementTime - newsTime);
      const timeDecay = Math.exp(-timeDiff / (timeWindow * 0.25)); // Exponential decay
      
      return {
        newsId: news.id,
        timeDiff: timeDiff / (60 * 1000), // Convert to minutes
        timeDecay,
        weightedSimilarity: news.similarity * timeDecay
      };
    });

    return {
      timeDecayAnalysis,
      avgTimeDecay: timeDecayAnalysis.reduce((sum, item) => sum + item.timeDecay, 0) / timeDecayAnalysis.length,
      bestTimeMatch: timeDecayAnalysis.reduce((best, item) => 
        item.weightedSimilarity > best.weightedSimilarity ? item : best, 
        { weightedSimilarity: 0 }
      )
    };
  }

  private calculateOverallCorrelation(
    priceMovement: any,
    newsResults: SearchResult[],
    temporalAnalysis: any
  ): number {
    if (newsResults.length === 0) return 0;

    // Base correlation from similarity scores
    const avgSimilarity = newsResults.reduce((sum, news) => sum + news.similarity, 0) / newsResults.length;
    
    // Temporal correlation bonus
    const temporalBonus = temporalAnalysis.avgTimeDecay * 0.3;
    
    // Volume correlation (if significant volume with news)
    const volumeBonus = priceMovement.volumeSpike ? 0.2 : 0;
    
    return Math.min(avgSimilarity + temporalBonus + volumeBonus, 1.0);
  }

  private detectPriceAnomalies(marketData: any[]): any[] {
    const anomalies = [];
    
    if (marketData.length < 2) return anomalies;

    for (let i = 1; i < marketData.length; i++) {
      const current = marketData[i];
      const previous = marketData[i - 1];
      
      if (current.price && previous.price) {
        const changePercent = ((current.price - previous.price) / previous.price) * 100;
        
        if (Math.abs(changePercent) > 3) { // 3% threshold
          anomalies.push({
            type: 'price_spike',
            timestamp: current.timestamp,
            severity: Math.min(Math.abs(changePercent) / 10, 1), // Normalize to 0-1
            details: {
              changePercent,
              previousPrice: previous.price,
              currentPrice: current.price
            }
          });
        }
      }
    }

    return anomalies;
  }

  private detectVolumeAnomalies(marketData: any[]): any[] {
    const anomalies = [];
    
    if (marketData.length < 5) return anomalies; // Need more data for average

    const volumes = marketData.map(d => d.volume || 0).filter(v => v > 0);
    if (volumes.length === 0) return anomalies;

    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    
    for (const data of marketData) {
      if (data.volume && data.volume > avgVolume * 2) {
        anomalies.push({
          type: 'volume_spike',
          timestamp: data.timestamp,
          severity: Math.min(data.volume / (avgVolume * 5), 1),
          details: {
            currentVolume: data.volume,
            averageVolume: avgVolume,
            ratio: data.volume / avgVolume
          }
        });
      }
    }

    return anomalies;
  }

  private generateAnomalyReasoning(anomalies: any[], symbol: string, timeframe: string): string {
    if (anomalies.length === 0) {
      return `${symbol}에서 ${timeframe} 기간 동안 특별한 이상 징후는 감지되지 않았습니다.`;
    }

    const priceAnomalies = anomalies.filter(a => a.type === 'price_spike');
    const volumeAnomalies = anomalies.filter(a => a.type === 'volume_spike');
    
    const reasoning = [];
    
    if (priceAnomalies.length > 0) {
      const maxPriceAnomaly = priceAnomalies.reduce((max, a) => 
        a.severity > max.severity ? a : max
      );
      reasoning.push(`${timeframe} 기간 중 최대 ${maxPriceAnomaly.details.changePercent.toFixed(2)}%의 급격한 가격 변동이 감지되었습니다.`);
    }
    
    if (volumeAnomalies.length > 0) {
      const maxVolumeAnomaly = volumeAnomalies.reduce((max, a) => 
        a.severity > max.severity ? a : max
      );
      reasoning.push(`평균 거래량 대비 최대 ${maxVolumeAnomaly.details.ratio.toFixed(1)}배의 거래량 급증이 관찰되었습니다.`);
    }

    return reasoning.join(' ');
  }

  private async searchCausalNews(
    marketEvent: any,
    startTime: Date,
    endTime: Date
  ): Promise<SearchResult[]> {
    const causalQuery = `${marketEvent.symbol} 관련 뉴스 이벤트 발표 실적 공시 정책 변화`;
    
    return await this.searchNewsData({
      query: causalQuery,
      filters: {
        startDate: startTime,
        endDate: endTime
      },
      topK: 15,
      threshold: 0.5
    });
  }

  private async analyzeTechnicalFactors(marketEvent: any): Promise<any[]> {
    // Simplified technical analysis - would be enhanced with real indicators
    const factors = [];
    
    if (marketEvent.volumeSpike) {
      factors.push({
        type: 'volume_indicator',
        signal: 'strong_buying_pressure',
        strength: Math.min(marketEvent.volumeSpike.ratio, 5),
        description: '거래량 급증으로 인한 강한 매수/매도 압력 감지'
      });
    }

    if (Math.abs(marketEvent.priceChange) > 5) {
      factors.push({
        type: 'price_momentum',
        signal: marketEvent.priceChange > 0 ? 'bullish_momentum' : 'bearish_momentum',
        strength: Math.min(Math.abs(marketEvent.priceChange) / 10, 1),
        description: `${Math.abs(marketEvent.priceChange).toFixed(2)}% 가격 변동으로 인한 모멘텀 신호`
      });
    }

    return factors;
  }

  private async analyzeSentimentFactors(
    marketEvent: any,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    try {
      const newsData = await storage.searchNewsData({
        startDate: startTime,
        endDate: endTime
      });

      const sentimentCounts = newsData.reduce((acc, news) => {
        const sentiment = news.sentiment || 'neutral';
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const factors: Array<{
        type: string;
        signal: string;
        strength: number;
        description: string;
      }> = [];

      Object.entries(sentimentCounts).forEach(([sentiment, count]) => {
        if (count > 2) { // Significant sentiment pattern
          factors.push({
            type: 'market_sentiment',
            signal: sentiment,
            strength: Math.min(count / 10, 1),
            description: `${sentiment} 감정의 뉴스 ${count}건이 시장 심리에 영향을 미쳤을 가능성`
          });
        }
      });

      return factors;
    } catch (error) {
      console.error("Sentiment analysis failed:", error);
      return [];
    }
  }

  private async searchExternalFactors(
    marketEvent: any,
    startTime: Date,
    endTime: Date
  ): Promise<SearchResult[]> {
    const externalQuery = `글로벌 시장 환율 금리 정책 경제지표 중앙은행 연준 한국은행`;
    
    return await this.searchNewsData({
      query: externalQuery,
      filters: {
        startDate: startTime,
        endDate: endTime,
        category: 'economic'
      },
      topK: 10,
      threshold: 0.4
    });
  }

  private calculateCausalStrength(factors: {
    newsFactors: SearchResult[];
    technicalFactors: any[];
    sentimentFactors: any[];
    externalFactors: SearchResult[];
  }): number {
    let strength = 0;

    // News factor contribution (0-0.4)
    if (factors.newsFactors.length > 0) {
      const avgNewsScore = factors.newsFactors.reduce((sum, f) => sum + f.similarity, 0) / factors.newsFactors.length;
      strength += avgNewsScore * 0.4;
    }

    // Technical factor contribution (0-0.3)
    if (factors.technicalFactors.length > 0) {
      const avgTechScore = factors.technicalFactors.reduce((sum, f) => sum + f.strength, 0) / factors.technicalFactors.length;
      strength += avgTechScore * 0.3;
    }

    // Sentiment factor contribution (0-0.2)
    if (factors.sentimentFactors.length > 0) {
      const avgSentimentScore = factors.sentimentFactors.reduce((sum, f) => sum + f.strength, 0) / factors.sentimentFactors.length;
      strength += avgSentimentScore * 0.2;
    }

    // External factor contribution (0-0.1)
    if (factors.externalFactors.length > 0) {
      const avgExternalScore = factors.externalFactors.reduce((sum, f) => sum + f.similarity, 0) / factors.externalFactors.length;
      strength += avgExternalScore * 0.1;
    }

    return Math.min(strength, 1.0);
  }
}

export const ragService = new RAGService();
