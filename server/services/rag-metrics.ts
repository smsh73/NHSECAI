import { storage } from "../storage";

interface Prediction {
  id: string;
  query: string;
  answer: string;
  sources: string[];
  confidence: number;
  timestamp: Date;
}

interface GroundTruth {
  id: string;
  query: string;
  correctAnswer: string;
  relevantSources: string[];
}

interface AccuracyMetrics {
  exactMatch: number;
  f1Score: number;
  bleuScore: number;
  rougeScore: {
    rouge1: number;
    rouge2: number;
    rougeL: number;
  };
  semanticSimilarity: number;
  factualAccuracy: number;
  sourceRelevance: number;
}

interface RetrievalMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  meanReciprocalRank: number;
  nDCG: number; // Normalized Discounted Cumulative Gain
  hitRate: {
    at1: number;
    at3: number;
    at5: number;
    at10: number;
  };
}

interface GenerationMetrics {
  fluency: number;
  coherence: number;
  relevance: number;
  informativeness: number;
  faithfulness: number; // How faithful to sources
  hallucination: number; // Inverse of faithfulness
}

interface Config {
  vectorWeight: number;
  keywordWeight: number;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  temperature: number;
  maxTokens: number;
  rerankingEnabled: boolean;
}

interface TestResult {
  winner: 'A' | 'B' | 'tie';
  confidenceLevel: number;
  metrics: {
    configA: AccuracyMetrics;
    configB: AccuracyMetrics;
  };
  statisticalSignificance: number;
  recommendations: string[];
}

interface SearchWeight {
  query: string;
  optimalVectorWeight: number;
  optimalKeywordWeight: number;
  performance: number;
  timestamp: Date;
}

export class RAGMetricsService {
  private metricsHistory: Map<string, any> = new Map();
  private optimalWeights: Map<string, SearchWeight> = new Map();
  
  /**
   * Calculate comprehensive accuracy metrics
   */
  async calculateAccuracy(
    predictions: Prediction[], 
    groundTruth: GroundTruth[]
  ): Promise<AccuracyMetrics> {
    const metrics: AccuracyMetrics = {
      exactMatch: 0,
      f1Score: 0,
      bleuScore: 0,
      rougeScore: {
        rouge1: 0,
        rouge2: 0,
        rougeL: 0
      },
      semanticSimilarity: 0,
      factualAccuracy: 0,
      sourceRelevance: 0
    };
    
    if (predictions.length === 0 || groundTruth.length === 0) {
      return metrics;
    }
    
    // Create ground truth map for quick lookup
    const truthMap = new Map(groundTruth.map(gt => [gt.query, gt]));
    
    let totalScores = {
      exactMatch: 0,
      f1: 0,
      bleu: 0,
      rouge1: 0,
      rouge2: 0,
      rougeL: 0,
      semantic: 0,
      factual: 0,
      sourceRel: 0
    };
    
    let validPredictions = 0;
    
    for (const prediction of predictions) {
      const truth = truthMap.get(prediction.query);
      if (!truth) continue;
      
      validPredictions++;
      
      // Exact match accuracy
      if (this.normalizeText(prediction.answer) === this.normalizeText(truth.correctAnswer)) {
        totalScores.exactMatch++;
      }
      
      // F1 Score (token-level)
      totalScores.f1 += this.calculateF1Score(prediction.answer, truth.correctAnswer);
      
      // BLEU Score
      totalScores.bleu += this.calculateBLEUScore(prediction.answer, truth.correctAnswer);
      
      // ROUGE Scores
      const rouge = this.calculateROUGEScores(prediction.answer, truth.correctAnswer);
      totalScores.rouge1 += rouge.rouge1;
      totalScores.rouge2 += rouge.rouge2;
      totalScores.rougeL += rouge.rougeL;
      
      // Semantic similarity
      totalScores.semantic += await this.calculateSemanticSimilarity(
        prediction.answer, 
        truth.correctAnswer
      );
      
      // Factual accuracy
      totalScores.factual += this.calculateFactualAccuracy(
        prediction.answer,
        truth.correctAnswer,
        prediction.sources
      );
      
      // Source relevance
      totalScores.sourceRel += this.calculateSourceRelevance(
        prediction.sources,
        truth.relevantSources
      );
    }
    
    // Average all metrics
    if (validPredictions > 0) {
      metrics.exactMatch = totalScores.exactMatch / validPredictions;
      metrics.f1Score = totalScores.f1 / validPredictions;
      metrics.bleuScore = totalScores.bleu / validPredictions;
      metrics.rougeScore.rouge1 = totalScores.rouge1 / validPredictions;
      metrics.rougeScore.rouge2 = totalScores.rouge2 / validPredictions;
      metrics.rougeScore.rougeL = totalScores.rougeL / validPredictions;
      metrics.semanticSimilarity = totalScores.semantic / validPredictions;
      metrics.factualAccuracy = totalScores.factual / validPredictions;
      metrics.sourceRelevance = totalScores.sourceRel / validPredictions;
    }
    
    // Store metrics for historical tracking
    await this.storeMetrics('accuracy', metrics);
    
    return metrics;
  }
  
  /**
   * Evaluate retrieval quality
   */
  async evaluateRetrievalQuality(
    retrieved: any[], 
    relevant: any[]
  ): Promise<RetrievalMetrics> {
    const metrics: RetrievalMetrics = {
      precision: 0,
      recall: 0,
      f1Score: 0,
      meanReciprocalRank: 0,
      nDCG: 0,
      hitRate: {
        at1: 0,
        at3: 0,
        at5: 0,
        at10: 0
      }
    };
    
    if (retrieved.length === 0) {
      return metrics;
    }
    
    // Create relevance map
    const relevantSet = new Set(relevant.map(r => r.id || r));
    
    // Calculate precision and recall
    let truePositives = 0;
    let firstRelevantRank = -1;
    
    for (let i = 0; i < retrieved.length; i++) {
      const docId = retrieved[i].id || retrieved[i];
      if (relevantSet.has(docId)) {
        truePositives++;
        if (firstRelevantRank === -1) {
          firstRelevantRank = i + 1;
        }
        
        // Update hit rate metrics
        if (i < 1) metrics.hitRate.at1 = 1;
        if (i < 3) metrics.hitRate.at3 = 1;
        if (i < 5) metrics.hitRate.at5 = 1;
        if (i < 10) metrics.hitRate.at10 = 1;
      }
    }
    
    metrics.precision = retrieved.length > 0 ? truePositives / retrieved.length : 0;
    metrics.recall = relevant.length > 0 ? truePositives / relevant.length : 0;
    
    // F1 Score
    if (metrics.precision + metrics.recall > 0) {
      metrics.f1Score = 2 * (metrics.precision * metrics.recall) / 
                       (metrics.precision + metrics.recall);
    }
    
    // Mean Reciprocal Rank
    metrics.meanReciprocalRank = firstRelevantRank > 0 ? 1 / firstRelevantRank : 0;
    
    // nDCG (simplified)
    metrics.nDCG = this.calculateNDCG(retrieved, relevantSet);
    
    // Store metrics
    await this.storeMetrics('retrieval', metrics);
    
    return metrics;
  }
  
  /**
   * Evaluate generation quality
   */
  async evaluateGenerationQuality(
    answer: string, 
    references: string[]
  ): Promise<GenerationMetrics> {
    const metrics: GenerationMetrics = {
      fluency: 0,
      coherence: 0,
      relevance: 0,
      informativeness: 0,
      faithfulness: 0,
      hallucination: 0
    };
    
    if (!answer || references.length === 0) {
      return metrics;
    }
    
    // Fluency - based on sentence structure and grammar patterns
    metrics.fluency = this.evaluateFluency(answer);
    
    // Coherence - logical flow and consistency
    metrics.coherence = this.evaluateCoherence(answer);
    
    // Relevance - how well it matches references
    metrics.relevance = await this.evaluateRelevance(answer, references);
    
    // Informativeness - information density
    metrics.informativeness = this.evaluateInformativeness(answer, references);
    
    // Faithfulness - how well it sticks to source material
    metrics.faithfulness = this.evaluateFaithfulness(answer, references);
    
    // Hallucination - inverse of faithfulness
    metrics.hallucination = 1 - metrics.faithfulness;
    
    // Store metrics
    await this.storeMetrics('generation', metrics);
    
    return metrics;
  }
  
  /**
   * Run A/B test between two configurations
   */
  async runABTest(
    configA: Config, 
    configB: Config,
    testQueries: string[],
    groundTruth?: GroundTruth[]
  ): Promise<TestResult> {
    console.log('Starting A/B test with', testQueries.length, 'queries');
    
    const resultsA: Prediction[] = [];
    const resultsB: Prediction[] = [];
    
    // Run tests with both configurations
    for (const query of testQueries) {
      // Test with config A
      const predictionA = await this.testConfiguration(query, configA);
      resultsA.push(predictionA);
      
      // Test with config B
      const predictionB = await this.testConfiguration(query, configB);
      resultsB.push(predictionB);
    }
    
    // Calculate metrics for both configurations
    let metricsA: AccuracyMetrics;
    let metricsB: AccuracyMetrics;
    
    if (groundTruth && groundTruth.length > 0) {
      metricsA = await this.calculateAccuracy(resultsA, groundTruth);
      metricsB = await this.calculateAccuracy(resultsB, groundTruth);
    } else {
      // Use proxy metrics when ground truth is not available
      metricsA = await this.calculateProxyMetrics(resultsA);
      metricsB = await this.calculateProxyMetrics(resultsB);
    }
    
    // Determine winner
    const scoreA = this.calculateOverallScore(metricsA);
    const scoreB = this.calculateOverallScore(metricsB);
    
    let winner: 'A' | 'B' | 'tie';
    const difference = Math.abs(scoreA - scoreB);
    
    if (difference < 0.05) {
      winner = 'tie';
    } else {
      winner = scoreA > scoreB ? 'A' : 'B';
    }
    
    // Calculate statistical significance (simplified)
    const significance = this.calculateSignificance(resultsA, resultsB);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      configA,
      configB,
      metricsA,
      metricsB
    );
    
    return {
      winner,
      confidenceLevel: Math.min(difference * 10, 1),
      metrics: {
        configA: metricsA,
        configB: metricsB
      },
      statisticalSignificance: significance,
      recommendations
    };
  }
  
  /**
   * Track and optimize search weights
   */
  async updateSearchWeights(
    query: string,
    vectorWeight: number,
    keywordWeight: number,
    performance: number
  ): Promise<void> {
    const weight: SearchWeight = {
      query,
      optimalVectorWeight: vectorWeight,
      optimalKeywordWeight: keywordWeight,
      performance,
      timestamp: new Date()
    };
    
    // Store in memory
    this.optimalWeights.set(query, weight);
    
    // Persist to storage
    await storage.saveRAGMetrics({
      type: 'search_weight',
      query,
      data: weight
    });
    
    // Learn patterns for similar queries
    await this.learnWeightPatterns(query, weight);
  }
  
  /**
   * Get optimal weights for a query
   */
  async getOptimalWeights(query: string): Promise<{ vector: number; keyword: number } | null> {
    // Check exact match
    const exactMatch = this.optimalWeights.get(query);
    if (exactMatch) {
      return {
        vector: exactMatch.optimalVectorWeight,
        keyword: exactMatch.optimalKeywordWeight
      };
    }
    
    // Find similar queries and use their weights
    const similar = await this.findSimilarQueries(query);
    if (similar.length > 0) {
      // Average weights from similar queries
      const avgVector = similar.reduce((sum, s) => sum + s.optimalVectorWeight, 0) / similar.length;
      const avgKeyword = similar.reduce((sum, s) => sum + s.optimalKeywordWeight, 0) / similar.length;
      
      return {
        vector: avgVector,
        keyword: avgKeyword
      };
    }
    
    return null;
  }
  
  // Helper methods
  
  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  
  private calculateF1Score(prediction: string, truth: string): number {
    const predTokens = new Set(prediction.toLowerCase().split(/\s+/));
    const truthTokens = new Set(truth.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...predTokens].filter(x => truthTokens.has(x)));
    const precision = predTokens.size > 0 ? intersection.size / predTokens.size : 0;
    const recall = truthTokens.size > 0 ? intersection.size / truthTokens.size : 0;
    
    if (precision + recall === 0) return 0;
    return 2 * (precision * recall) / (precision + recall);
  }
  
  private calculateBLEUScore(prediction: string, reference: string): number {
    // Simplified BLEU-1 score
    const predTokens = prediction.toLowerCase().split(/\s+/);
    const refTokens = reference.toLowerCase().split(/\s+/);
    
    let matches = 0;
    const refSet = new Set(refTokens);
    
    for (const token of predTokens) {
      if (refSet.has(token)) {
        matches++;
      }
    }
    
    const precision = predTokens.length > 0 ? matches / predTokens.length : 0;
    
    // Brevity penalty
    const brevityPenalty = Math.exp(Math.min(0, 1 - refTokens.length / predTokens.length));
    
    return brevityPenalty * precision;
  }
  
  private calculateROUGEScores(prediction: string, reference: string): any {
    const predTokens = prediction.toLowerCase().split(/\s+/);
    const refTokens = reference.toLowerCase().split(/\s+/);
    
    // ROUGE-1 (unigram overlap)
    const rouge1 = this.calculateF1Score(prediction, reference);
    
    // ROUGE-2 (bigram overlap)
    const predBigrams = this.getBigrams(predTokens);
    const refBigrams = this.getBigrams(refTokens);
    const bigramOverlap = this.calculateOverlap(predBigrams, refBigrams);
    
    // ROUGE-L (longest common subsequence)
    const lcs = this.longestCommonSubsequence(predTokens, refTokens);
    const rougeL = lcs.length > 0 ? 
      (2 * lcs.length) / (predTokens.length + refTokens.length) : 0;
    
    return {
      rouge1,
      rouge2: bigramOverlap,
      rougeL
    };
  }
  
  private getBigrams(tokens: string[]): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < tokens.length - 1; i++) {
      bigrams.add(`${tokens[i]} ${tokens[i + 1]}`);
    }
    return bigrams;
  }
  
  private calculateOverlap(set1: Set<string>, set2: Set<string>): number {
    if (set1.size === 0 || set2.size === 0) return 0;
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const precision = intersection.size / set1.size;
    const recall = intersection.size / set2.size;
    
    if (precision + recall === 0) return 0;
    return 2 * (precision * recall) / (precision + recall);
  }
  
  private longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  }
  
  private async calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
    // Simplified semantic similarity using word overlap and synonyms
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    // Direct overlap
    const overlap = [...words1].filter(w => words2.has(w)).length;
    
    // Check for synonyms (simplified)
    let synonymMatches = 0;
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (this.areSynonyms(w1, w2)) {
          synonymMatches++;
        }
      }
    }
    
    const totalMatches = overlap + synonymMatches * 0.5; // Weight synonyms less
    const avgSize = (words1.size + words2.size) / 2;
    
    return avgSize > 0 ? Math.min(totalMatches / avgSize, 1) : 0;
  }
  
  private areSynonyms(word1: string, word2: string): boolean {
    const synonymGroups = [
      ['buy', 'purchase', 'acquire'],
      ['sell', 'vend', 'dispose'],
      ['increase', 'rise', 'grow', '증가', '상승'],
      ['decrease', 'fall', 'drop', '감소', '하락'],
      ['good', 'excellent', 'great', '좋은', '훌륭한'],
      ['bad', 'poor', 'terrible', '나쁜', '좋지않은']
    ];
    
    for (const group of synonymGroups) {
      if (group.includes(word1) && group.includes(word2)) {
        return true;
      }
    }
    
    return false;
  }
  
  private calculateFactualAccuracy(
    prediction: string,
    truth: string,
    sources: string[]
  ): number {
    // Check if facts in prediction are supported by truth or sources
    const facts = this.extractFacts(prediction);
    const truthFacts = this.extractFacts(truth);
    const sourceFacts = sources.flatMap(s => this.extractFacts(s));
    
    if (facts.length === 0) return 1; // No facts to verify
    
    let correctFacts = 0;
    for (const fact of facts) {
      if (truthFacts.includes(fact) || sourceFacts.includes(fact)) {
        correctFacts++;
      }
    }
    
    return correctFacts / facts.length;
  }
  
  private extractFacts(text: string): string[] {
    // Extract sentences that look like facts (contain numbers, dates, names)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const facts: string[] = [];
    
    for (const sentence of sentences) {
      if (sentence.match(/\d+|[A-Z][a-z]+|\d{4}/) && !sentence.includes('?')) {
        facts.push(sentence.trim());
      }
    }
    
    return facts;
  }
  
  private calculateSourceRelevance(
    usedSources: string[],
    relevantSources: string[]
  ): number {
    if (relevantSources.length === 0) return 1;
    
    const relevantSet = new Set(relevantSources);
    const overlap = usedSources.filter(s => relevantSet.has(s)).length;
    
    return overlap / relevantSources.length;
  }
  
  private calculateNDCG(retrieved: any[], relevantSet: Set<any>): number {
    let dcg = 0;
    let idcg = 0;
    
    // Calculate DCG
    for (let i = 0; i < retrieved.length; i++) {
      const docId = retrieved[i].id || retrieved[i];
      const relevance = relevantSet.has(docId) ? 1 : 0;
      dcg += relevance / Math.log2(i + 2);
    }
    
    // Calculate IDCG (ideal DCG)
    const idealOrder = Math.min(relevantSet.size, retrieved.length);
    for (let i = 0; i < idealOrder; i++) {
      idcg += 1 / Math.log2(i + 2);
    }
    
    return idcg > 0 ? dcg / idcg : 0;
  }
  
  private evaluateFluency(text: string): number {
    // Check for sentence structure and grammar patterns
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0) return 0;
    
    let fluencyScore = 0;
    for (const sentence of sentences) {
      // Check basic grammar patterns
      if (sentence.trim().length > 5 && sentence.trim().length < 200) {
        fluencyScore += 0.5;
      }
      
      // Check for capitalization
      if (/^[A-Z]/.test(sentence.trim())) {
        fluencyScore += 0.3;
      }
      
      // Check for punctuation
      if (/[.!?]$/.test(sentence.trim())) {
        fluencyScore += 0.2;
      }
    }
    
    return Math.min(fluencyScore / sentences.length, 1);
  }
  
  private evaluateCoherence(text: string): number {
    // Check logical flow and consistency
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length < 2) return 1;
    
    let coherenceScore = 0;
    const transitions = ['therefore', 'however', 'moreover', 'furthermore', 'additionally'];
    
    for (let i = 1; i < sentences.length; i++) {
      const prevWords = new Set(sentences[i - 1].toLowerCase().split(/\s+/));
      const currWords = new Set(sentences[i].toLowerCase().split(/\s+/));
      
      // Check word overlap (topic continuity)
      const overlap = [...prevWords].filter(w => currWords.has(w)).length;
      if (overlap > 0) {
        coherenceScore += 0.5;
      }
      
      // Check for transition words
      if (transitions.some(t => sentences[i].toLowerCase().includes(t))) {
        coherenceScore += 0.5;
      }
    }
    
    return Math.min(coherenceScore / (sentences.length - 1), 1);
  }
  
  private async evaluateRelevance(text: string, references: string[]): Promise<number> {
    // Calculate how well the text matches references
    const refContent = references.join(' ');
    return this.calculateF1Score(text, refContent);
  }
  
  private evaluateInformativeness(text: string, references: string[]): number {
    // Measure information density
    const uniqueWords = new Set(text.toLowerCase().split(/\s+/));
    const totalWords = text.split(/\s+/).length;
    
    if (totalWords === 0) return 0;
    
    // Lexical diversity
    const diversity = uniqueWords.size / totalWords;
    
    // Information coverage from references
    const refWords = new Set(references.join(' ').toLowerCase().split(/\s+/));
    const coverage = [...uniqueWords].filter(w => refWords.has(w)).length / refWords.size;
    
    return (diversity * 0.3 + coverage * 0.7);
  }
  
  private evaluateFaithfulness(text: string, references: string[]): number {
    // Check how well the text sticks to source material
    const textClaims = this.extractFacts(text);
    const sourceFacts = references.flatMap(r => this.extractFacts(r));
    
    if (textClaims.length === 0) return 1;
    
    let supportedClaims = 0;
    for (const claim of textClaims) {
      // Check if claim is supported by any source
      if (sourceFacts.some(fact => this.claimsMatch(claim, fact))) {
        supportedClaims++;
      }
    }
    
    return supportedClaims / textClaims.length;
  }
  
  private claimsMatch(claim1: string, claim2: string): boolean {
    // Simple matching based on key terms
    const words1 = new Set(claim1.toLowerCase().split(/\s+/));
    const words2 = new Set(claim2.toLowerCase().split(/\s+/));
    const overlap = [...words1].filter(w => words2.has(w)).length;
    
    return overlap >= Math.min(words1.size, words2.size) * 0.5;
  }
  
  private async testConfiguration(query: string, config: Config): Promise<Prediction> {
    // Simulate testing a configuration
    // In production, this would actually run the RAG pipeline
    return {
      id: `pred_${Date.now()}`,
      query,
      answer: `Test answer for ${query} with config`,
      sources: [`source1`, `source2`],
      confidence: Math.random() * 0.5 + 0.5,
      timestamp: new Date()
    };
  }
  
  private async calculateProxyMetrics(predictions: Prediction[]): Promise<AccuracyMetrics> {
    // When ground truth is not available, use proxy metrics
    let avgConfidence = 0;
    let avgSourceCount = 0;
    
    for (const pred of predictions) {
      avgConfidence += pred.confidence;
      avgSourceCount += pred.sources.length;
    }
    
    avgConfidence /= predictions.length;
    avgSourceCount /= predictions.length;
    
    return {
      exactMatch: 0,
      f1Score: avgConfidence,
      bleuScore: avgConfidence * 0.9,
      rougeScore: {
        rouge1: avgConfidence * 0.85,
        rouge2: avgConfidence * 0.7,
        rougeL: avgConfidence * 0.8
      },
      semanticSimilarity: avgConfidence,
      factualAccuracy: Math.min(avgSourceCount / 5, 1),
      sourceRelevance: Math.min(avgSourceCount / 3, 1)
    };
  }
  
  private calculateOverallScore(metrics: AccuracyMetrics): number {
    return (
      metrics.exactMatch * 0.1 +
      metrics.f1Score * 0.15 +
      metrics.bleuScore * 0.1 +
      metrics.rougeScore.rouge1 * 0.1 +
      metrics.semanticSimilarity * 0.2 +
      metrics.factualAccuracy * 0.2 +
      metrics.sourceRelevance * 0.15
    );
  }
  
  private calculateSignificance(resultsA: Prediction[], resultsB: Prediction[]): number {
    // Simplified statistical significance calculation
    const scoresA = resultsA.map(r => r.confidence);
    const scoresB = resultsB.map(r => r.confidence);
    
    const meanA = scoresA.reduce((sum, s) => sum + s, 0) / scoresA.length;
    const meanB = scoresB.reduce((sum, s) => sum + s, 0) / scoresB.length;
    
    const varA = scoresA.reduce((sum, s) => sum + Math.pow(s - meanA, 2), 0) / scoresA.length;
    const varB = scoresB.reduce((sum, s) => sum + Math.pow(s - meanB, 2), 0) / scoresB.length;
    
    // T-statistic
    const pooledStdDev = Math.sqrt((varA + varB) / 2);
    const tStat = Math.abs(meanA - meanB) / (pooledStdDev * Math.sqrt(2 / scoresA.length));
    
    // Convert to p-value approximation
    const pValue = Math.exp(-0.717 * tStat - 0.416 * tStat * tStat);
    
    return 1 - pValue; // Return confidence level
  }
  
  private generateRecommendations(
    configA: Config,
    configB: Config,
    metricsA: AccuracyMetrics,
    metricsB: AccuracyMetrics
  ): string[] {
    const recommendations: string[] = [];
    
    // Compare configs and suggest improvements
    if (configA.vectorWeight > configB.vectorWeight && metricsA.semanticSimilarity > metricsB.semanticSimilarity) {
      recommendations.push('Higher vector weight improves semantic understanding');
    }
    
    if (configA.chunkSize > configB.chunkSize && metricsA.factualAccuracy > metricsB.factualAccuracy) {
      recommendations.push('Larger chunk sizes preserve more context');
    }
    
    if (configA.rerankingEnabled && !configB.rerankingEnabled && metricsA.f1Score > metricsB.f1Score) {
      recommendations.push('Reranking significantly improves accuracy');
    }
    
    if (configA.temperature < configB.temperature && metricsA.factualAccuracy > metricsB.factualAccuracy) {
      recommendations.push('Lower temperature reduces hallucinations');
    }
    
    // General recommendations based on metrics
    if (metricsA.sourceRelevance < 0.5 && metricsB.sourceRelevance < 0.5) {
      recommendations.push('Consider improving retrieval quality');
    }
    
    if (metricsA.semanticSimilarity < 0.6 && metricsB.semanticSimilarity < 0.6) {
      recommendations.push('Both configs struggle with semantic understanding');
    }
    
    return recommendations;
  }
  
  private async storeMetrics(type: string, metrics: any): Promise<void> {
    const timestamp = new Date();
    const key = `${type}_${timestamp.getTime()}`;
    
    this.metricsHistory.set(key, {
      type,
      metrics,
      timestamp
    });
    
    // Persist to storage
    try {
      await storage.saveRAGMetrics({
        type,
        metrics,
        timestamp
      });
    } catch (error) {
      console.error('Failed to persist metrics:', error);
    }
    
    // Cleanup old metrics
    if (this.metricsHistory.size > 1000) {
      const oldestKeys = Array.from(this.metricsHistory.keys()).slice(0, 100);
      for (const key of oldestKeys) {
        this.metricsHistory.delete(key);
      }
    }
  }
  
  private async learnWeightPatterns(query: string, weight: SearchWeight): Promise<void> {
    // Analyze query patterns and learn optimal weights
    const queryType = this.classifyQuery(query);
    const existingPatterns = Array.from(this.optimalWeights.values())
      .filter(w => this.classifyQuery(w.query) === queryType);
    
    if (existingPatterns.length >= 5) {
      // Calculate average weights for this query type
      const avgVector = existingPatterns.reduce((sum, p) => sum + p.optimalVectorWeight, 0) / existingPatterns.length;
      const avgKeyword = existingPatterns.reduce((sum, p) => sum + p.optimalKeywordWeight, 0) / existingPatterns.length;
      
      console.log(`Learned pattern for ${queryType} queries: vector=${avgVector}, keyword=${avgKeyword}`);
    }
  }
  
  private classifyQuery(query: string): string {
    const lower = query.toLowerCase();
    
    if (lower.includes('what') || lower.includes('explain')) return 'explanatory';
    if (lower.includes('how') || lower.includes('why')) return 'analytical';
    if (lower.includes('when') || lower.includes('where')) return 'factual';
    if (lower.includes('compare') || lower.includes('vs')) return 'comparative';
    
    return 'general';
  }
  
  private async findSimilarQueries(query: string): Promise<SearchWeight[]> {
    const queryType = this.classifyQuery(query);
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    
    const similar: SearchWeight[] = [];
    
    for (const [storedQuery, weight] of this.optimalWeights) {
      // Check if same query type
      if (this.classifyQuery(storedQuery) !== queryType) continue;
      
      // Calculate similarity
      const storedWords = new Set(storedQuery.toLowerCase().split(/\s+/));
      const overlap = [...queryWords].filter(w => storedWords.has(w)).length;
      const similarity = overlap / Math.max(queryWords.size, storedWords.size);
      
      if (similarity > 0.5) {
        similar.push(weight);
      }
    }
    
    return similar;
  }
  
  /**
   * Get comprehensive metrics report
   */
  async getMetricsReport(): Promise<any> {
    const recent = Array.from(this.metricsHistory.values()).slice(-100);
    
    const report = {
      totalEvaluations: this.metricsHistory.size,
      recentMetrics: recent,
      averageScores: this.calculateAverageMetrics(recent),
      trends: this.analyzeTrends(recent),
      recommendations: this.generateGlobalRecommendations(recent)
    };
    
    return report;
  }
  
  private calculateAverageMetrics(metrics: any[]): any {
    const accuracyMetrics = metrics.filter(m => m.type === 'accuracy');
    if (accuracyMetrics.length === 0) return null;
    
    const sum = accuracyMetrics.reduce((acc, m) => {
      const metrics = m.metrics;
      return {
        f1Score: acc.f1Score + metrics.f1Score,
        semanticSimilarity: acc.semanticSimilarity + metrics.semanticSimilarity,
        factualAccuracy: acc.factualAccuracy + metrics.factualAccuracy,
        sourceRelevance: acc.sourceRelevance + metrics.sourceRelevance
      };
    }, { f1Score: 0, semanticSimilarity: 0, factualAccuracy: 0, sourceRelevance: 0 });
    
    const count = accuracyMetrics.length;
    return {
      f1Score: sum.f1Score / count,
      semanticSimilarity: sum.semanticSimilarity / count,
      factualAccuracy: sum.factualAccuracy / count,
      sourceRelevance: sum.sourceRelevance / count
    };
  }
  
  private analyzeTrends(metrics: any[]): any {
    // Analyze improvement or degradation trends
    if (metrics.length < 10) return { trend: 'insufficient_data' };
    
    const recent = metrics.slice(-10);
    const older = metrics.slice(-20, -10);
    
    const recentAvg = this.calculateAverageMetrics(recent);
    const olderAvg = this.calculateAverageMetrics(older);
    
    if (!recentAvg || !olderAvg) return { trend: 'no_data' };
    
    const improvement = recentAvg.f1Score - olderAvg.f1Score;
    
    return {
      trend: improvement > 0 ? 'improving' : 'degrading',
      change: improvement,
      details: {
        recent: recentAvg,
        older: olderAvg
      }
    };
  }
  
  private generateGlobalRecommendations(metrics: any[]): string[] {
    const recommendations: string[] = [];
    const avg = this.calculateAverageMetrics(metrics);
    
    if (!avg) return recommendations;
    
    if (avg.f1Score < 0.6) {
      recommendations.push('Consider improving token-level accuracy through better preprocessing');
    }
    
    if (avg.semanticSimilarity < 0.7) {
      recommendations.push('Enhance semantic understanding with better embeddings or reranking');
    }
    
    if (avg.factualAccuracy < 0.8) {
      recommendations.push('Reduce hallucinations by improving source verification');
    }
    
    if (avg.sourceRelevance < 0.7) {
      recommendations.push('Improve retrieval quality with better chunking and indexing');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const ragMetricsService = new RAGMetricsService();