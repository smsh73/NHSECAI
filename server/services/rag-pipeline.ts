import { ragService } from "./ragService";
import { advancedVectorSearch } from "./vector-search";
import * as openaiService from "./openai";

interface Chunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    position: number;
    type: 'header' | 'paragraph' | 'list' | 'table' | 'conclusion';
    importance: number;
    keywords: string[];
    entities: string[];
  };
  embedding?: number[];
  relevanceScore?: number;
}

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

interface Source {
  id: string;
  content: string;
  score: number;
  metadata: any;
}

interface Feedback {
  queryId: string;
  query: string;
  answer: string;
  rating: number;
  issues?: string[];
  correctAnswer?: string;
}

interface OptimizationConfig {
  chunkSize: number;
  chunkOverlap: number;
  maxContextLength: number;
  minRelevanceScore: number;
  rerankingEnabled: boolean;
  diversityWeight: number;
}

interface GenerationResult {
  answer: string;
  sources: Source[];
  confidence: number;
  metadata: {
    tokensUsed: number;
    latency: number;
    model: string;
  };
}

export class EnhancedRAGPipeline {
  private config: OptimizationConfig = {
    chunkSize: 512,
    chunkOverlap: 128,
    maxContextLength: 8000,
    minRelevanceScore: 0.5,
    rerankingEnabled: true,
    diversityWeight: 0.3
  };
  
  private feedbackHistory: Feedback[] = [];
  private performanceMetrics: Map<string, any> = new Map();
  
  /**
   * Main RAG pipeline with advanced features
   */
  async enhancedRAG(
    query: string,
    documents?: string[],
    options?: Partial<OptimizationConfig>
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const config = { ...this.config, ...options };
    
    try {
      // Step 1: Query understanding and expansion
      const expandedQuery = await this.enhanceQuery(query);
      
      // Step 2: Intelligent retrieval
      const retrievedChunks = await this.retrieveRelevantChunks(
        expandedQuery,
        documents,
        config
      );
      
      // Step 3: Context optimization
      const optimizedContext = await this.optimizeContext(
        retrievedChunks,
        query,
        config
      );
      
      // Step 4: Answer generation with validation
      const answer = await this.generateAnswer(
        query,
        optimizedContext,
        config
      );
      
      // Step 5: Post-processing and validation
      const validatedResult = await this.validateAndRefine(
        answer,
        optimizedContext,
        query
      );
      
      // Step 6: Track performance
      this.trackPerformance(query, validatedResult, Date.now() - startTime);
      
      return validatedResult;
      
    } catch (error) {
      console.error('RAG pipeline error:', error);
      throw new Error('Failed to generate answer');
    }
  }
  
  /**
   * Intelligent document chunking with semantic boundaries
   */
  async intelligentChunking(document: string, metadata?: any): Promise<Chunk[]> {
    const chunks: Chunk[] = [];
    
    // Analyze document structure
    const structure = this.analyzeStructure(document);
    
    // Split by semantic boundaries
    const sections = this.splitBySemantic(document, structure);
    
    // Process each section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Determine optimal chunk size for this section type
      const optimalSize = this.getOptimalChunkSize(section.type);
      
      // Create overlapping chunks
      const sectionChunks = this.createSmartChunks(
        section.content,
        optimalSize,
        section.type
      );
      
      // Add metadata and embeddings
      for (const chunk of sectionChunks) {
        const processedChunk: Chunk = {
          id: `chunk_${Date.now()}_${Math.random()}`,
          content: chunk.text,
          metadata: {
            documentId: metadata?.documentId || 'unknown',
            position: i,
            type: section.type,
            importance: this.calculateImportance(chunk.text, section.type),
            keywords: this.extractKeywords(chunk.text),
            entities: this.extractEntities(chunk.text)
          }
        };
        
        // Generate embedding
        processedChunk.embedding = await ragService.generateEmbedding(chunk.text);
        
        chunks.push(processedChunk);
      }
    }
    
    return chunks;
  }
  
  /**
   * Optimize context window for better generation
   */
  async optimizeContext(
    chunks: Chunk[],
    query: string,
    config: OptimizationConfig
  ): Promise<Chunk[]> {
    // Step 1: Score chunks based on multiple factors
    const scoredChunks = await this.scoreChunks(chunks, query);
    
    // Step 2: Apply diversity penalty to avoid redundancy
    const diverseChunks = this.applyDiversityPenalty(scoredChunks, config.diversityWeight);
    
    // Step 3: Select top chunks within token limit
    const selectedChunks = this.selectOptimalChunks(
      diverseChunks,
      config.maxContextLength
    );
    
    // Step 4: Reorder for coherence
    const reorderedChunks = this.reorderForCoherence(selectedChunks);
    
    // Step 5: Add transitional context if needed
    const contextualizedChunks = this.addTransitionalContext(reorderedChunks);
    
    return contextualizedChunks;
  }
  
  /**
   * Validate and refine generated answer
   */
  async validateAnswer(
    answer: string,
    sources: Source[],
    query: string
  ): Promise<ValidationResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check factual consistency
    const factCheck = await this.checkFactualConsistency(answer, sources);
    if (!factCheck.isConsistent) {
      issues.push(...factCheck.issues);
      suggestions.push('Review source material for accuracy');
    }
    
    // Check answer completeness
    const completeness = this.checkCompleteness(answer, query);
    if (completeness < 0.8) {
      issues.push('Answer may be incomplete');
      suggestions.push('Consider including more relevant information');
    }
    
    // Check for hallucinations
    const hallucinations = this.detectHallucinations(answer, sources);
    if (hallucinations.length > 0) {
      issues.push(`Potential hallucinations detected: ${hallucinations.join(', ')}`);
      suggestions.push('Verify all claims against source documents');
    }
    
    // Check answer relevance
    const relevance = await this.checkRelevance(answer, query);
    if (relevance < 0.7) {
      issues.push('Answer may not directly address the question');
      suggestions.push('Refocus on the specific query');
    }
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(
      factCheck.score,
      completeness,
      hallucinations.length === 0 ? 1 : 0.5,
      relevance
    );
    
    return {
      isValid: issues.length === 0,
      confidence,
      issues,
      suggestions
    };
  }
  
  /**
   * Learn from user feedback to improve future performance
   */
  async improveFromFeedback(feedback: Feedback): Promise<void> {
    // Store feedback
    this.feedbackHistory.push(feedback);
    
    // Analyze feedback patterns
    if (this.feedbackHistory.length >= 10) {
      const patterns = this.analyzeFeedbackPatterns();
      
      // Adjust configuration based on patterns
      if (patterns.avgRating < 3) {
        // Poor performance - adjust parameters
        if (patterns.commonIssues.includes('incomplete')) {
          this.config.maxContextLength *= 1.2;
          this.config.chunkSize *= 1.1;
        }
        
        if (patterns.commonIssues.includes('irrelevant')) {
          this.config.minRelevanceScore *= 1.1;
          this.config.rerankingEnabled = true;
        }
        
        if (patterns.commonIssues.includes('hallucination')) {
          this.config.minRelevanceScore *= 1.2;
        }
      }
      
      // Learn query patterns
      await this.learnQueryPatterns(patterns);
      
      // Update prompt templates if needed
      if (patterns.promptIssues) {
        await this.optimizePrompts(patterns);
      }
    }
    
    // Trim old feedback
    if (this.feedbackHistory.length > 100) {
      this.feedbackHistory = this.feedbackHistory.slice(-50);
    }
  }
  
  // Helper methods
  
  private async enhanceQuery(query: string): Promise<string> {
    // Query expansion and enhancement
    const analysis = await this.analyzeQuery(query);
    
    // Add context clues
    let enhanced = query;
    if (analysis.needsContext) {
      enhanced = `${query} (provide detailed context and sources)`;
    }
    
    // Add domain-specific terms
    if (analysis.domain) {
      const domainTerms = this.getDomainTerms(analysis.domain);
      enhanced = `${enhanced} ${domainTerms.join(' ')}`;
    }
    
    return enhanced;
  }
  
  private async retrieveRelevantChunks(
    query: string,
    documents: string[] | undefined,
    config: OptimizationConfig
  ): Promise<Chunk[]> {
    let allChunks: Chunk[] = [];
    
    if (documents && documents.length > 0) {
      // Process provided documents
      for (const doc of documents) {
        const chunks = await this.intelligentChunking(doc);
        allChunks.push(...chunks);
      }
    } else {
      // Use vector search to find relevant documents
      const searchResults = await advancedVectorSearch.adaptiveHybridSearch(query);
      
      // Convert search results to chunks
      for (const result of searchResults.results) {
        const chunks = await this.intelligentChunking(result.content, {
          documentId: result.id
        });
        allChunks.push(...chunks);
      }
    }
    
    // Filter by minimum relevance score
    const relevantChunks = allChunks.filter(chunk => {
      const score = this.calculateRelevance(chunk, query);
      chunk.relevanceScore = score;
      return score >= config.minRelevanceScore;
    });
    
    return relevantChunks;
  }
  
  private async generateAnswer(
    query: string,
    context: Chunk[],
    config: OptimizationConfig
  ): Promise<GenerationResult> {
    // Prepare context string
    const contextStr = context
      .map(chunk => chunk.content)
      .join('\n\n');
    
    // Create optimized prompt
    const prompt = this.createOptimizedPrompt(query, contextStr);
    
    // Generate answer using OpenAI
    const startTime = Date.now();
    const response = await openaiService.executeCustomPrompt(
      prompt,
      { context: contextStr, query },
      "You are a helpful assistant providing accurate answers based on the given context."
    );
    
    return {
      answer: response,
      sources: context.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        score: chunk.relevanceScore || 0,
        metadata: chunk.metadata
      })),
      confidence: this.estimateConfidence(context),
      metadata: {
        tokensUsed: this.estimateTokens(prompt + response),
        latency: Date.now() - startTime,
        model: 'gpt-4'
      }
    };
  }
  
  private async validateAndRefine(
    result: GenerationResult,
    context: Chunk[],
    query: string
  ): Promise<GenerationResult> {
    // Validate the answer
    const validation = await this.validateAnswer(
      result.answer,
      result.sources,
      query
    );
    
    // If validation fails, try to refine
    if (!validation.isValid && validation.confidence < 0.6) {
      console.log('Answer validation failed, attempting refinement...');
      
      // Create refinement prompt
      const refinementPrompt = this.createRefinementPrompt(
        query,
        result.answer,
        validation.issues
      );
      
      // Generate refined answer
      const refinedAnswer = await openaiService.executeCustomPrompt(
        refinementPrompt,
        { originalAnswer: result.answer, validationIssues: validation.issues },
        "You are an expert at improving and refining answers based on validation feedback."
      );
      
      result.answer = refinedAnswer;
      result.confidence = validation.confidence * 1.2; // Slight boost after refinement
    }
    
    return result;
  }
  
  private analyzeStructure(document: string): any {
    const lines = document.split('\n');
    const structure = {
      hasHeaders: false,
      hasParagraphs: false,
      hasLists: false,
      hasTables: false,
      sections: []
    };
    
    for (const line of lines) {
      if (line.startsWith('#') || line.match(/^[A-Z\s]{3,}$/)) {
        structure.hasHeaders = true;
      }
      if (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./)) {
        structure.hasLists = true;
      }
      if (line.includes('|')) {
        structure.hasTables = true;
      }
      if (line.length > 100) {
        structure.hasParagraphs = true;
      }
    }
    
    return structure;
  }
  
  private splitBySemantic(document: string, structure: any): any[] {
    const sections: any[] = [];
    const lines = document.split('\n');
    let currentSection = { type: 'paragraph', content: '' };
    
    for (const line of lines) {
      // Detect section changes
      if (line.startsWith('#') || line.match(/^[A-Z\s]{3,}$/)) {
        if (currentSection.content) {
          sections.push(currentSection);
        }
        currentSection = { type: 'header', content: line };
      } else if (line.startsWith('-') || line.startsWith('*')) {
        if (currentSection.type !== 'list') {
          if (currentSection.content) {
            sections.push(currentSection);
          }
          currentSection = { type: 'list', content: line };
        } else {
          currentSection.content += '\n' + line;
        }
      } else if (line === '') {
        if (currentSection.content) {
          sections.push(currentSection);
          currentSection = { type: 'paragraph', content: '' };
        }
      } else {
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      }
    }
    
    if (currentSection.content) {
      sections.push(currentSection);
    }
    
    return sections;
  }
  
  private getOptimalChunkSize(sectionType: string): number {
    const sizes: { [key: string]: number } = {
      header: 100,
      paragraph: 512,
      list: 256,
      table: 384,
      conclusion: 512
    };
    
    return sizes[sectionType] || 512;
  }
  
  private createSmartChunks(
    text: string,
    size: number,
    type: string
  ): any[] {
    const chunks: any[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= size) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push({ text: currentChunk.trim(), type });
        }
        currentChunk = sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push({ text: currentChunk.trim(), type });
    }
    
    return chunks;
  }
  
  private calculateImportance(text: string, type: string): number {
    let importance = 0.5;
    
    // Type-based importance
    if (type === 'header' || type === 'conclusion') {
      importance += 0.2;
    }
    
    // Keyword-based importance
    const importantKeywords = ['important', '중요', 'critical', '핵심', 'key', 'main'];
    for (const keyword of importantKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        importance += 0.1;
      }
    }
    
    // Length-based (longer chunks might have more info)
    if (text.length > 300) {
      importance += 0.1;
    }
    
    return Math.min(importance, 1.0);
  }
  
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'for']);
    
    return words
      .filter(word => !stopWords.has(word) && word.length > 3)
      .slice(0, 10);
  }
  
  private extractEntities(text: string): string[] {
    // Simple entity extraction (proper nouns)
    const words = text.split(/\s+/);
    return words
      .filter(word => /^[A-Z]/.test(word) && word.length > 2)
      .slice(0, 5);
  }
  
  private calculateRelevance(chunk: Chunk, query: string): number {
    const queryLower = query.toLowerCase();
    const chunkLower = chunk.content.toLowerCase();
    
    // Keyword overlap
    const queryWords = queryLower.split(/\s+/);
    const chunkWords = chunkLower.split(/\s+/);
    const overlap = queryWords.filter(w => chunkWords.includes(w)).length;
    const keywordScore = overlap / queryWords.length;
    
    // Entity match
    const queryEntities = this.extractEntities(query);
    const entityScore = queryEntities.filter(e => 
      chunk.metadata.entities.includes(e)
    ).length / (queryEntities.length || 1);
    
    // Combine scores
    return keywordScore * 0.6 + entityScore * 0.4;
  }
  
  private async scoreChunks(chunks: Chunk[], query: string): Promise<Chunk[]> {
    return chunks.map(chunk => {
      const relevance = chunk.relevanceScore || this.calculateRelevance(chunk, query);
      const importance = chunk.metadata.importance;
      const position = 1 / (chunk.metadata.position + 1); // Earlier is better
      
      chunk.relevanceScore = relevance * 0.5 + importance * 0.3 + position * 0.2;
      return chunk;
    }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }
  
  private applyDiversityPenalty(chunks: Chunk[], weight: number): Chunk[] {
    const selected: Chunk[] = [];
    const remaining = [...chunks];
    
    while (remaining.length > 0 && selected.length < 20) {
      let bestScore = -1;
      let bestIndex = -1;
      
      for (let i = 0; i < remaining.length; i++) {
        const chunk = remaining[i];
        let diversity = 1.0;
        
        // Calculate diversity from already selected chunks
        for (const sel of selected) {
          const similarity = this.calculateSimilarity(chunk.content, sel.content);
          diversity = Math.min(diversity, 1 - similarity);
        }
        
        const score = (chunk.relevanceScore || 0) * (1 - weight) + diversity * weight;
        
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      
      if (bestIndex >= 0) {
        selected.push(remaining[bestIndex]);
        remaining.splice(bestIndex, 1);
      } else {
        break;
      }
    }
    
    return selected;
  }
  
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);
    
    return intersection.size / union.size;
  }
  
  private selectOptimalChunks(chunks: Chunk[], maxTokens: number): Chunk[] {
    const selected: Chunk[] = [];
    let currentTokens = 0;
    
    for (const chunk of chunks) {
      const chunkTokens = this.estimateTokens(chunk.content);
      if (currentTokens + chunkTokens <= maxTokens) {
        selected.push(chunk);
        currentTokens += chunkTokens;
      } else {
        break;
      }
    }
    
    return selected;
  }
  
  private reorderForCoherence(chunks: Chunk[]): Chunk[] {
    // Sort by document position for better flow
    return chunks.sort((a, b) => {
      if (a.metadata.documentId === b.metadata.documentId) {
        return a.metadata.position - b.metadata.position;
      }
      return 0;
    });
  }
  
  private addTransitionalContext(chunks: Chunk[]): Chunk[] {
    // Add brief transitions between chunks from different documents
    const enhanced: Chunk[] = [];
    let lastDocId: string | null = null;
    
    for (const chunk of chunks) {
      if (lastDocId && lastDocId !== chunk.metadata.documentId) {
        // Add transition
        enhanced.push({
          ...chunk,
          content: `[From another source:] ${chunk.content}`
        });
      } else {
        enhanced.push(chunk);
      }
      lastDocId = chunk.metadata.documentId;
    }
    
    return enhanced;
  }
  
  private async checkFactualConsistency(answer: string, sources: Source[]): Promise<any> {
    // Check if claims in answer are supported by sources
    const claims = this.extractClaims(answer);
    const issues: string[] = [];
    let supportedClaims = 0;
    
    for (const claim of claims) {
      let isSupported = false;
      for (const source of sources) {
        if (this.claimSupported(claim, source.content)) {
          isSupported = true;
          supportedClaims++;
          break;
        }
      }
      
      if (!isSupported) {
        issues.push(`Unsupported claim: "${claim}"`);
      }
    }
    
    return {
      isConsistent: issues.length === 0,
      score: claims.length > 0 ? supportedClaims / claims.length : 1,
      issues
    };
  }
  
  private extractClaims(text: string): string[] {
    // Extract factual claims from text
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.filter(s => 
      !s.includes('?') && // Not questions
      (s.includes('is') || s.includes('are') || s.includes('was') || s.includes('were'))
    );
  }
  
  private claimSupported(claim: string, source: string): boolean {
    // Simple check if claim is supported by source
    const claimKeywords = claim.toLowerCase().split(/\s+/)
      .filter(w => w.length > 3);
    const sourceLower = source.toLowerCase();
    
    const matches = claimKeywords.filter(keyword => 
      sourceLower.includes(keyword)
    ).length;
    
    return matches >= claimKeywords.length * 0.5;
  }
  
  private checkCompleteness(answer: string, query: string): number {
    // Check if answer addresses all aspects of the query
    const queryAspects = this.extractQueryAspects(query);
    const addressedAspects = queryAspects.filter(aspect =>
      answer.toLowerCase().includes(aspect.toLowerCase())
    );
    
    return addressedAspects.length / (queryAspects.length || 1);
  }
  
  private extractQueryAspects(query: string): string[] {
    // Extract key aspects from query
    const aspects: string[] = [];
    
    // Question words indicate aspects
    if (query.includes('who')) aspects.push('person');
    if (query.includes('what')) aspects.push('thing');
    if (query.includes('when')) aspects.push('time');
    if (query.includes('where')) aspects.push('location');
    if (query.includes('why')) aspects.push('reason');
    if (query.includes('how')) aspects.push('method');
    
    // Key nouns
    const nouns = query.match(/\b[A-Z][a-z]+\b/g) || [];
    aspects.push(...nouns);
    
    return aspects;
  }
  
  private detectHallucinations(answer: string, sources: Source[]): string[] {
    const hallucinations: string[] = [];
    const sourceContent = sources.map(s => s.content).join(' ');
    
    // Check for specific claims not in sources
    const specificClaims = answer.match(/\d+%|\$\d+|\d{4}/g) || [];
    for (const claim of specificClaims) {
      if (!sourceContent.includes(claim)) {
        hallucinations.push(claim);
      }
    }
    
    return hallucinations;
  }
  
  private async checkRelevance(answer: string, query: string): Promise<number> {
    // Calculate semantic similarity between query and answer
    const queryEmbedding = await ragService.generateEmbedding(query);
    const answerEmbedding = await ragService.generateEmbedding(answer);
    
    if (queryEmbedding.length === 0 || answerEmbedding.length === 0) {
      // Fallback to keyword overlap
      const queryWords = new Set(query.toLowerCase().split(/\s+/));
      const answerWords = new Set(answer.toLowerCase().split(/\s+/));
      const overlap = Array.from(queryWords).filter(w => answerWords.has(w)).length;
      return overlap / queryWords.size;
    }
    
    // Cosine similarity
    const dotProduct = queryEmbedding.reduce((sum, q, i) => sum + q * answerEmbedding[i], 0);
    const queryMag = Math.sqrt(queryEmbedding.reduce((sum, q) => sum + q * q, 0));
    const answerMag = Math.sqrt(answerEmbedding.reduce((sum, a) => sum + a * a, 0));
    
    return dotProduct / (queryMag * answerMag);
  }
  
  private calculateConfidence(...scores: number[]): number {
    // Calculate overall confidence from multiple scores
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return Math.min(avg, 1.0);
  }
  
  private trackPerformance(query: string, result: GenerationResult, latency: number): void {
    const metrics = {
      query,
      latency,
      confidence: result.confidence,
      sourcesUsed: result.sources.length,
      tokensUsed: result.metadata.tokensUsed,
      timestamp: new Date()
    };
    
    this.performanceMetrics.set(query, metrics);
  }
  
  private analyzeFeedbackPatterns(): any {
    const ratings = this.feedbackHistory.map(f => f.rating);
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    
    const issues = this.feedbackHistory
      .flatMap(f => f.issues || [])
      .reduce((acc: any, issue) => {
        acc[issue] = (acc[issue] || 0) + 1;
        return acc;
      }, {});
    
    const commonIssues = Object.entries(issues)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue]) => issue);
    
    return {
      avgRating,
      commonIssues,
      totalFeedback: this.feedbackHistory.length
    };
  }
  
  private async learnQueryPatterns(patterns: any): Promise<void> {
    // Analyze successful vs unsuccessful queries
    const successful = this.feedbackHistory.filter(f => f.rating >= 4);
    const unsuccessful = this.feedbackHistory.filter(f => f.rating <= 2);
    
    // Identify patterns in successful queries
    if (successful.length > 5) {
      // Update config based on successful patterns
      console.log('Learning from successful query patterns...');
    }
  }
  
  private async optimizePrompts(patterns: any): Promise<void> {
    // Optimize prompt templates based on feedback
    console.log('Optimizing prompts based on feedback patterns...');
  }
  
  private createOptimizedPrompt(query: string, context: string): string {
    return `You are a helpful AI assistant. Answer the following question based on the provided context and return the response in JSON format.

Question: ${query}

Context:
${context}

Instructions:
1. Base your answer strictly on the provided context
2. If the context doesn't contain enough information, say so
3. Return your response as a JSON object with an "answer" field
3. Be concise but complete
4. Cite relevant parts of the context when making claims

Answer:`;
  }
  
  private createRefinementPrompt(query: string, answer: string, issues: string[]): string {
    return `Please refine the following answer to address these issues: ${issues.join(', ')}

Original Question: ${query}
Original Answer: ${answer}

Provide an improved answer that addresses the identified issues:`;
  }
  
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  private estimateConfidence(context: Chunk[]): number {
    if (context.length === 0) return 0;
    
    const avgRelevance = context.reduce((sum, c) => sum + (c.relevanceScore || 0), 0) / context.length;
    const coverage = Math.min(context.length / 5, 1); // Assume 5 chunks is good coverage
    
    return avgRelevance * 0.7 + coverage * 0.3;
  }
  
  private analyzeQuery(query: string): any {
    return {
      needsContext: query.includes('explain') || query.includes('describe'),
      domain: this.detectDomain(query)
    };
  }
  
  private detectDomain(query: string): string | null {
    if (query.match(/stock|price|market|주식|시장/i)) return 'finance';
    if (query.match(/news|article|뉴스|기사/i)) return 'news';
    if (query.match(/tech|technology|기술/i)) return 'technology';
    return null;
  }
  
  private getDomainTerms(domain: string): string[] {
    const terms: { [key: string]: string[] } = {
      finance: ['market', 'price', 'stock', 'trading'],
      news: ['report', 'article', 'breaking', 'update'],
      technology: ['innovation', 'development', 'system', 'solution']
    };
    
    return terms[domain] || [];
  }
}

// Export singleton instance
export const enhancedRAGPipeline = new EnhancedRAGPipeline();