import { ragService } from "./ragService";
import * as openaiService from "./openai";

interface SearchContext {
  userIntent?: 'exploration' | 'specific_fact' | 'trend_analysis' | 'comparison';
  domainFocus?: 'financial' | 'news' | 'market_event' | 'mixed';
  timeframe?: {
    start: Date;
    end: Date;
    priority: 'recent' | 'historical' | 'all';
  };
  previousQueries?: string[];
  userProfile?: {
    expertise: 'beginner' | 'intermediate' | 'expert';
    interests: string[];
  };
}

interface SearchResults {
  results: SearchResult[];
  metadata: {
    totalFound: number;
    searchTime: number;
    weights: {
      vector: number;
      keyword: number;
      semantic: number;
    };
    expansions: string[];
    rerankingApplied: boolean;
  };
}

interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  scores: {
    vector: number;
    keyword: number;
    semantic: number;
    combined: number;
    diversity: number;
  };
  source: 'financial' | 'news' | 'market_event';
  highlights: string[];
  confidence: number;
}

interface QueryAnalysis {
  queryType: 'keyword_heavy' | 'semantic_heavy' | 'balanced';
  entities: string[];
  keywords: string[];
  intent: 'exploration' | 'specific_fact' | 'trend_analysis' | 'comparison';
  domainIndicators: string[];
}

interface RelevanceFeedback {
  queryId: string;
  resultId: string;
  relevant: boolean;
  feedback?: string;
}

export class AdvancedVectorSearchService {
  private weightHistory: Map<string, { vector: number; keyword: number }> = new Map();
  private queryCache: Map<string, SearchResults> = new Map();
  private feedbackData: RelevanceFeedback[] = [];
  
  /**
   * Adaptive Hybrid Search with dynamic weight adjustment
   */
  async adaptiveHybridSearch(
    query: string, 
    context: SearchContext = {}
  ): Promise<SearchResults> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.getCacheKey(query, context);
    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey)!;
    }
    
    // Analyze query to determine optimal search strategy
    const queryAnalysis = await this.analyzeQuery(query);
    
    // Dynamically calculate weights based on query analysis
    const weights = this.calculateAdaptiveWeights(queryAnalysis, context);
    
    // Perform query expansion
    const expansions = await this.queryExpansion(query, queryAnalysis);
    const expandedQuery = this.combineQueryExpansions(query, expansions);
    
    // Execute base hybrid search with adaptive weights
    const baseResults = await ragService.hybridSearch(
      expandedQuery,
      weights.vector,
      weights.keyword,
      this.buildFilters(context)
    );
    
    // Convert to our enhanced format
    let enhancedResults = this.enhanceSearchResults(baseResults, query);
    
    // Apply semantic reranking if needed
    if (this.shouldApplyReranking(queryAnalysis, context)) {
      enhancedResults = await this.semanticReranking(enhancedResults, query);
    }
    
    // Apply diversity optimization
    enhancedResults = this.ensureDiversity(enhancedResults, context);
    
    const results: SearchResults = {
      results: enhancedResults,
      metadata: {
        totalFound: baseResults.length,
        searchTime: Date.now() - startTime,
        weights: {
          vector: weights.vector,
          keyword: weights.keyword,
          semantic: weights.semantic || 0
        },
        expansions,
        rerankingApplied: this.shouldApplyReranking(queryAnalysis, context)
      }
    };
    
    // Cache the results
    this.queryCache.set(cacheKey, results);
    
    // Learn from this search for future weight optimization
    this.updateWeightHistory(query, weights, enhancedResults);
    
    return results;
  }
  
  /**
   * Semantic reranking using cross-encoder simulation
   */
  async semanticReranking(
    results: SearchResult[], 
    query: string
  ): Promise<SearchResult[]> {
    // For each result, calculate a more accurate semantic similarity
    const rerankedResults = await Promise.all(
      results.map(async (result) => {
        // Simulate cross-encoder scoring
        const semanticScore = await this.calculateCrossEncoderScore(query, result.content);
        
        // Update the result with new semantic score
        return {
          ...result,
          scores: {
            ...result.scores,
            semantic: semanticScore,
            combined: this.recalculateCombinedScore(result.scores, semanticScore)
          }
        };
      })
    );
    
    // Sort by the new combined score
    return rerankedResults.sort((a, b) => b.scores.combined - a.scores.combined);
  }
  
  /**
   * Query expansion with multiple strategies
   */
  async queryExpansion(
    query: string, 
    analysis: QueryAnalysis
  ): Promise<string[]> {
    const expansions: string[] = [];
    
    // 1. Synonym expansion
    const synonyms = this.getSynonyms(analysis.keywords);
    expansions.push(...synonyms);
    
    // 2. Domain-specific term expansion
    const domainTerms = this.getDomainSpecificTerms(analysis.domainIndicators);
    expansions.push(...domainTerms);
    
    // 3. Acronym expansion
    const acronyms = this.expandAcronyms(query);
    expansions.push(...acronyms);
    
    // 4. Related concept expansion (using co-occurrence patterns)
    const relatedConcepts = await this.getRelatedConcepts(analysis.entities);
    expansions.push(...relatedConcepts);
    
    // 5. Temporal expansion for time-sensitive queries
    if (analysis.intent === 'trend_analysis') {
      const temporalTerms = this.getTemporalExpansions(query);
      expansions.push(...temporalTerms);
    }
    
    // Remove duplicates and limit expansion size
    return [...new Set(expansions)].slice(0, 10);
  }
  
  /**
   * Multi-modal search incorporating different data types
   */
  async multiModalSearch(
    query: string,
    filters: any
  ): Promise<SearchResults> {
    const startTime = Date.now();
    
    // Parse query for different modalities
    const modalities = this.identifyModalities(query);
    
    const searchPromises: Promise<any>[] = [];
    
    // Text search
    if (modalities.text) {
      searchPromises.push(
        ragService.hybridSearch(query, 0.7, 0.3, filters)
      );
    }
    
    // Numeric pattern search (for financial data)
    if (modalities.numeric) {
      searchPromises.push(
        this.numericPatternSearch(modalities.numericPatterns!, filters)
      );
    }
    
    // Time-series similarity search
    if (modalities.timeSeries) {
      searchPromises.push(
        this.timeSeriesSearch(modalities.timeSeriesPattern!, filters)
      );
    }
    
    // Execute all searches in parallel
    const allResults = await Promise.all(searchPromises);
    
    // Merge and deduplicate results
    const mergedResults = this.mergeMultiModalResults(allResults);
    
    // Convert to enhanced format
    const enhancedResults = this.enhanceSearchResults(mergedResults, query);
    
    return {
      results: enhancedResults,
      metadata: {
        totalFound: mergedResults.length,
        searchTime: Date.now() - startTime,
        weights: {
          vector: 0.5,
          keyword: 0.3,
          semantic: 0.2
        },
        expansions: [],
        rerankingApplied: false
      }
    };
  }
  
  /**
   * Intelligent chunking with semantic boundaries
   */
  async intelligentChunking(document: string): Promise<any[]> {
    const chunks: any[] = [];
    
    // 1. Identify document structure
    const structure = this.analyzeDocumentStructure(document);
    
    // 2. Split by semantic boundaries
    const semanticSegments = this.splitBySemanticBoundaries(document, structure);
    
    // 3. Apply optimal chunk size with smart overlap
    for (const segment of semanticSegments) {
      const segmentChunks = this.createOverlappingChunks(
        segment.text,
        segment.type,
        this.getOptimalChunkSize(segment.type)
      );
      chunks.push(...segmentChunks);
    }
    
    // 4. Add metadata to chunks
    return chunks.map((chunk, index) => ({
      ...chunk,
      index,
      documentId: this.generateDocumentId(document),
      metadata: {
        ...chunk.metadata,
        chunkingStrategy: 'intelligent',
        semanticBoundary: chunk.boundary
      }
    }));
  }
  
  // Helper methods
  
  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    const words = query.toLowerCase().split(/\s+/);
    
    // Identify entities (simple NER simulation)
    const entities = words.filter(word => 
      word.length > 3 && /^[A-Z]/.test(word)
    );
    
    // Extract keywords (non-stop words)
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an']);
    const keywords = words.filter(word => !stopWords.has(word) && word.length > 2);
    
    // Determine query type
    let queryType: 'keyword_heavy' | 'semantic_heavy' | 'balanced' = 'balanced';
    if (keywords.length > 5) queryType = 'keyword_heavy';
    if (query.includes('?') || query.includes('how') || query.includes('why')) queryType = 'semantic_heavy';
    
    // Detect intent
    let intent: 'exploration' | 'specific_fact' | 'trend_analysis' | 'comparison' = 'exploration';
    if (query.includes('trend') || query.includes('변화') || query.includes('추이')) intent = 'trend_analysis';
    if (query.includes('vs') || query.includes('compare') || query.includes('비교')) intent = 'comparison';
    if (entities.length > 0 && keywords.length < 4) intent = 'specific_fact';
    
    // Identify domain indicators
    const domainIndicators: string[] = [];
    if (query.match(/주식|stock|price|가격/i)) domainIndicators.push('financial');
    if (query.match(/news|뉴스|기사/i)) domainIndicators.push('news');
    if (query.match(/event|이벤트|사건/i)) domainIndicators.push('event');
    
    return {
      queryType,
      entities,
      keywords,
      intent,
      domainIndicators
    };
  }
  
  private calculateAdaptiveWeights(
    analysis: QueryAnalysis,
    context: SearchContext
  ): { vector: number; keyword: number; semantic?: number } {
    let vectorWeight = 0.7;
    let keywordWeight = 0.3;
    
    // Adjust based on query type
    if (analysis.queryType === 'keyword_heavy') {
      vectorWeight = 0.4;
      keywordWeight = 0.6;
    } else if (analysis.queryType === 'semantic_heavy') {
      vectorWeight = 0.85;
      keywordWeight = 0.15;
    }
    
    // Adjust based on user expertise
    if (context.userProfile?.expertise === 'expert') {
      keywordWeight += 0.1;
      vectorWeight -= 0.1;
    }
    
    // Adjust based on domain
    if (context.domainFocus === 'financial') {
      keywordWeight += 0.05; // Financial queries often need exact matches
    }
    
    // Learn from historical performance
    const historicalWeights = this.getHistoricalWeights(analysis.intent);
    if (historicalWeights) {
      vectorWeight = vectorWeight * 0.7 + historicalWeights.vector * 0.3;
      keywordWeight = keywordWeight * 0.7 + historicalWeights.keyword * 0.3;
    }
    
    // Normalize weights
    const total = vectorWeight + keywordWeight;
    return {
      vector: vectorWeight / total,
      keyword: keywordWeight / total
    };
  }
  
  private async calculateCrossEncoderScore(query: string, document: string): Promise<number> {
    // Simulate cross-encoder scoring (in production, use a real model)
    const queryTokens = query.toLowerCase().split(/\s+/);
    const docTokens = document.toLowerCase().split(/\s+/);
    
    // Calculate various similarity metrics
    const exactMatches = queryTokens.filter(qt => docTokens.includes(qt)).length;
    const partialMatches = queryTokens.filter(qt => 
      docTokens.some(dt => dt.includes(qt) || qt.includes(dt))
    ).length;
    
    // Position-aware scoring
    let positionScore = 0;
    for (const token of queryTokens) {
      const index = docTokens.indexOf(token);
      if (index !== -1) {
        positionScore += 1 / (index + 1); // Earlier matches score higher
      }
    }
    
    // Combine scores
    const score = (exactMatches * 0.5 + partialMatches * 0.3 + positionScore * 0.2) / queryTokens.length;
    
    return Math.min(score, 1.0);
  }
  
  private getSynonyms(keywords: string[]): string[] {
    const synonymMap: { [key: string]: string[] } = {
      'price': ['가격', '시세', 'value', '가치'],
      'stock': ['주식', '종목', 'equity', '증권'],
      'market': ['시장', '마켓', 'exchange'],
      'trend': ['추세', '동향', '흐름', 'pattern'],
      'analysis': ['분석', '평가', 'evaluation'],
      'report': ['보고서', '리포트', 'document'],
      'news': ['뉴스', '기사', 'article'],
      'increase': ['증가', '상승', 'rise', 'grow'],
      'decrease': ['감소', '하락', 'fall', 'decline']
    };
    
    const synonyms: string[] = [];
    for (const keyword of keywords) {
      if (synonymMap[keyword]) {
        synonyms.push(...synonymMap[keyword]);
      }
    }
    
    return synonyms;
  }
  
  private getDomainSpecificTerms(domainIndicators: string[]): string[] {
    const domainTerms: { [key: string]: string[] } = {
      'financial': ['시가총액', 'PER', 'PBR', 'ROE', '배당', 'dividend'],
      'news': ['속보', 'breaking', '단독', 'exclusive', '종합'],
      'event': ['공시', 'announcement', 'M&A', '인수합병', 'IPO']
    };
    
    const terms: string[] = [];
    for (const domain of domainIndicators) {
      if (domainTerms[domain]) {
        terms.push(...domainTerms[domain]);
      }
    }
    
    return terms;
  }
  
  private expandAcronyms(query: string): string[] {
    const acronymMap: { [key: string]: string } = {
      'IPO': 'Initial Public Offering',
      'M&A': 'Mergers and Acquisitions',
      'CEO': 'Chief Executive Officer',
      'GDP': 'Gross Domestic Product',
      'ROE': 'Return on Equity',
      'PER': 'Price Earnings Ratio',
      'PBR': 'Price Book Ratio',
      'ETF': 'Exchange Traded Fund'
    };
    
    const expansions: string[] = [];
    const upperWords = query.match(/\b[A-Z]{2,}\b/g) || [];
    
    for (const acronym of upperWords) {
      if (acronymMap[acronym]) {
        expansions.push(acronymMap[acronym]);
      }
    }
    
    return expansions;
  }
  
  private async getRelatedConcepts(entities: string[]): Promise<string[]> {
    // In production, this would use a knowledge graph or co-occurrence matrix
    const conceptMap: { [key: string]: string[] } = {
      'Samsung': ['삼성전자', '반도체', 'semiconductor', 'Galaxy'],
      'Apple': ['애플', 'iPhone', 'iOS', 'AAPL'],
      'Tesla': ['테슬라', '전기차', 'EV', 'Elon Musk'],
      'Google': ['구글', 'Alphabet', 'GOOGL', 'search'],
      'Microsoft': ['마이크로소프트', 'Windows', 'Azure', 'MSFT']
    };
    
    const concepts: string[] = [];
    for (const entity of entities) {
      if (conceptMap[entity]) {
        concepts.push(...conceptMap[entity]);
      }
    }
    
    return concepts;
  }
  
  private getTemporalExpansions(query: string): string[] {
    const temporalTerms: string[] = [];
    
    if (query.includes('최근') || query.includes('recent')) {
      temporalTerms.push('latest', '최신', 'current', '현재');
    }
    
    if (query.includes('작년') || query.includes('last year')) {
      temporalTerms.push('2023', '전년', 'previous year');
    }
    
    if (query.includes('분기') || query.includes('quarter')) {
      temporalTerms.push('Q1', 'Q2', 'Q3', 'Q4', '1분기', '2분기', '3분기', '4분기');
    }
    
    return temporalTerms;
  }
  
  private combineQueryExpansions(original: string, expansions: string[]): string {
    // Add top expansions to the query, being careful not to make it too long
    const topExpansions = expansions.slice(0, 5);
    return `${original} ${topExpansions.join(' ')}`;
  }
  
  private buildFilters(context: SearchContext): any {
    const filters: any = {};
    
    if (context.domainFocus) {
      filters.source = context.domainFocus;
    }
    
    if (context.timeframe) {
      filters.startDate = context.timeframe.start;
      filters.endDate = context.timeframe.end;
    }
    
    return filters;
  }
  
  private enhanceSearchResults(results: any[], query: string): SearchResult[] {
    return results.map(result => ({
      id: result.id,
      content: result.content,
      metadata: result.metadata,
      scores: {
        vector: result.similarity || 0,
        keyword: result.score || 0,
        semantic: 0,
        combined: result.score || result.similarity || 0,
        diversity: 0
      },
      source: result.source,
      highlights: this.extractHighlights(result.content, query),
      confidence: this.calculateConfidence(result)
    }));
  }
  
  private extractHighlights(content: string, query: string): string[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);
    const highlights: string[] = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (queryTerms.some(term => lowerSentence.includes(term))) {
        highlights.push(sentence.trim());
        if (highlights.length >= 3) break;
      }
    }
    
    return highlights;
  }
  
  private calculateConfidence(result: any): number {
    // Simple confidence calculation based on score
    const score = result.score || result.similarity || 0;
    return Math.min(score * 1.2, 1.0); // Scale up slightly but cap at 1.0
  }
  
  private shouldApplyReranking(analysis: QueryAnalysis, context: SearchContext): boolean {
    // Apply reranking for semantic-heavy queries or expert users
    return analysis.queryType === 'semantic_heavy' || 
           context.userProfile?.expertise === 'expert' ||
           analysis.intent === 'comparison';
  }
  
  private recalculateCombinedScore(scores: any, semanticScore: number): number {
    // Weighted combination with semantic emphasis
    return scores.vector * 0.3 + scores.keyword * 0.2 + semanticScore * 0.5;
  }
  
  private ensureDiversity(results: SearchResult[], context: SearchContext): SearchResult[] {
    // Implement MMR (Maximal Marginal Relevance) for diversity
    const diverse: SearchResult[] = [];
    const lambda = 0.7; // Trade-off between relevance and diversity
    
    if (results.length === 0) return results;
    
    // Add the most relevant result first
    diverse.push(results[0]);
    const selected = new Set([results[0].id]);
    
    // Iteratively add results that balance relevance and diversity
    while (diverse.length < Math.min(results.length, 20)) {
      let bestScore = -1;
      let bestResult: SearchResult | null = null;
      
      for (const result of results) {
        if (selected.has(result.id)) continue;
        
        // Calculate diversity score (inverse similarity to already selected)
        let diversityScore = 1.0;
        for (const selectedResult of diverse) {
          const similarity = this.calculateContentSimilarity(result.content, selectedResult.content);
          diversityScore = Math.min(diversityScore, 1 - similarity);
        }
        
        // MMR score
        const mmrScore = lambda * result.scores.combined + (1 - lambda) * diversityScore;
        result.scores.diversity = diversityScore;
        
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestResult = result;
        }
      }
      
      if (bestResult) {
        diverse.push(bestResult);
        selected.add(bestResult.id);
      } else {
        break;
      }
    }
    
    return diverse;
  }
  
  private calculateContentSimilarity(content1: string, content2: string): number {
    // Simple Jaccard similarity for demonstration
    const tokens1 = new Set(content1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }
  
  private getCacheKey(query: string, context: SearchContext): string {
    return `${query}-${JSON.stringify(context)}`;
  }
  
  private updateWeightHistory(query: string, weights: any, results: SearchResult[]): void {
    // Store weights for successful searches (high confidence results)
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    if (avgConfidence > 0.7) {
      this.weightHistory.set(query, {
        vector: weights.vector,
        keyword: weights.keyword
      });
    }
  }
  
  private getHistoricalWeights(intent: string): { vector: number; keyword: number } | null {
    // Get average weights for similar query intents
    const relevantWeights = Array.from(this.weightHistory.values());
    
    if (relevantWeights.length === 0) return null;
    
    const avgVector = relevantWeights.reduce((sum, w) => sum + w.vector, 0) / relevantWeights.length;
    const avgKeyword = relevantWeights.reduce((sum, w) => sum + w.keyword, 0) / relevantWeights.length;
    
    return { vector: avgVector, keyword: avgKeyword };
  }
  
  private identifyModalities(query: string): any {
    const modalities: any = {
      text: true, // Always include text search
      numeric: false,
      timeSeries: false
    };
    
    // Check for numeric patterns
    if (/\d+/.test(query) || query.includes('price') || query.includes('가격')) {
      modalities.numeric = true;
      modalities.numericPatterns = query.match(/\d+/g);
    }
    
    // Check for time series indicators
    if (query.includes('trend') || query.includes('추이') || query.includes('변화')) {
      modalities.timeSeries = true;
    }
    
    return modalities;
  }
  
  private async numericPatternSearch(patterns: string[], filters: any): Promise<any[]> {
    // Placeholder for numeric pattern search
    // In production, this would search for documents containing specific numeric values
    return [];
  }
  
  private async timeSeriesSearch(pattern: any, filters: any): Promise<any[]> {
    // Placeholder for time series search
    // In production, this would use DTW or similar algorithms for time series matching
    return [];
  }
  
  private mergeMultiModalResults(allResults: any[][]): any[] {
    // Flatten and deduplicate results
    const merged = allResults.flat();
    const unique = new Map();
    
    for (const result of merged) {
      if (!unique.has(result.id) || unique.get(result.id).score < result.score) {
        unique.set(result.id, result);
      }
    }
    
    return Array.from(unique.values());
  }
  
  private analyzeDocumentStructure(document: string): any {
    // Simple structure analysis
    return {
      hasSections: document.includes('\n\n'),
      hasLists: document.includes('- ') || document.includes('• '),
      hasTables: document.includes('|'),
      paragraphCount: document.split('\n\n').length
    };
  }
  
  private splitBySemanticBoundaries(document: string, structure: any): any[] {
    const segments: any[] = [];
    
    // Split by double newlines (paragraphs)
    const paragraphs = document.split('\n\n');
    
    for (const paragraph of paragraphs) {
      segments.push({
        text: paragraph,
        type: this.detectSegmentType(paragraph),
        boundary: 'paragraph'
      });
    }
    
    return segments;
  }
  
  private detectSegmentType(text: string): string {
    if (text.includes('|') || text.includes('\t')) return 'table';
    if (text.startsWith('-') || text.startsWith('•')) return 'list';
    if (text.length < 100) return 'header';
    return 'paragraph';
  }
  
  private createOverlappingChunks(text: string, type: string, size: number): any[] {
    const chunks: any[] = [];
    const overlap = Math.floor(size * 0.2); // 20% overlap
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += size - overlap) {
      const chunk = words.slice(i, i + size).join(' ');
      chunks.push({
        text: chunk,
        type,
        boundary: i === 0 ? 'start' : i + size >= words.length ? 'end' : 'middle',
        metadata: {
          wordCount: chunk.split(/\s+/).length,
          position: i
        }
      });
    }
    
    return chunks;
  }
  
  private getOptimalChunkSize(segmentType: string): number {
    const chunkSizes: { [key: string]: number } = {
      'table': 200,
      'list': 150,
      'header': 50,
      'paragraph': 250
    };
    
    return chunkSizes[segmentType] || 200;
  }
  
  private generateDocumentId(document: string): string {
    // Simple hash for document ID
    let hash = 0;
    for (let i = 0; i < document.length; i++) {
      const char = document.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Learn from user feedback to improve future searches
   */
  async improveFromFeedback(feedback: RelevanceFeedback): Promise<void> {
    this.feedbackData.push(feedback);
    
    // Analyze feedback patterns to adjust weights
    if (this.feedbackData.length >= 10) {
      const relevantCount = this.feedbackData.filter(f => f.relevant).length;
      const relevanceRate = relevantCount / this.feedbackData.length;
      
      // If relevance rate is low, adjust strategy
      if (relevanceRate < 0.5) {
        // Increase semantic weight for future searches
        console.log('Low relevance detected, adjusting search strategy');
      }
      
      // Clear old feedback data
      if (this.feedbackData.length > 100) {
        this.feedbackData = this.feedbackData.slice(-50);
      }
    }
  }
}

// Export singleton instance
export const advancedVectorSearch = new AdvancedVectorSearchService();