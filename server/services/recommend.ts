import type { 
  EtfProduct, 
  EtfMetric, 
  UserRiskProfile,
  InsertEtfProduct,
  InsertEtfMetric
} from "@shared/schema";
import { storage } from "../storage";
import * as openaiService from "./openai";

// MCDA Criteria weights and configuration
export interface MCDACriteria {
  riskAlignment: number;      // How well ETF risk matches user risk tolerance
  expenseRatio: number;       // Cost efficiency (lower is better)
  liquidity: number;          // Trading volume and bid-ask spread
  diversification: number;    // Number of holdings and sector distribution
  trackingDifference: number; // How closely ETF tracks its index
  taxEfficiency: number;      // Tax implications and turnover
  performance: number;        // Historical returns and volatility
}

// Default criteria weights (should sum to 1.0)
const DEFAULT_CRITERIA_WEIGHTS: MCDACriteria = {
  riskAlignment: 0.25,      // 25% - Most important for suitability
  expenseRatio: 0.20,       // 20% - Cost is critical for long-term returns
  liquidity: 0.15,          // 15% - Important for execution
  diversification: 0.15,    // 15% - Risk reduction through diversification
  trackingDifference: 0.15, // 15% - Fund effectiveness
  taxEfficiency: 0.05,      // 5%  - Less critical for tax-advantaged accounts
  performance: 0.05,        // 5%  - Past performance doesn't predict future
};

// Recommendation result interface
export interface ETFRecommendation {
  etf: EtfProduct;
  score: number;
  reasoning: string;
  criteria: Record<string, {
    score: number;
    weight: number;
    explanation: string;
  }>;
  metrics?: EtfMetric;
  suitabilityScore: number;
  riskWarnings: string[];
}

// Portfolio recommendation interface
export interface PortfolioRecommendation {
  portfolio: Array<{
    etf: EtfProduct;
    allocation: number;     // Percentage allocation
    amount: number;         // Dollar amount
    reasoning: string;
  }>;
  totalScore: number;
  riskMetrics: {
    portfolioRisk: number;
    expectedReturn: number;
    sharpeRatio: number;
    volatility: number;
  };
  diversificationMetrics: {
    assetClassDiversification: number;
    geographicDiversification: number;
    sectorDiversification: number;
    correlationMatrix: number[][];
  };
  rebalancingFrequency: string;
  totalExpenseRatio: number;
}

// Filter criteria for ETF screening
export interface ETFFilters {
  maxResults?: number;
  minScore?: number;
  assetClass?: string[];
  region?: string[];
  maxExpenseRatio?: number;
  minAum?: number;
  minLiquidity?: number;
  excludeTickers?: string[];
  includeOnlyTickers?: string[];
  riskRange?: { min: number; max: number };
}

class ETFRecommendationService {
  // Main recommendation method with MCDA scoring
  async getRecommendations(
    userId: string, 
    filters: ETFFilters = {},
    customWeights?: Partial<MCDACriteria>
  ): Promise<ETFRecommendation[]> {
    try {
      // Get user risk profile
      const userProfile = await storage.getUserRiskProfile(userId);
      if (!userProfile) {
        throw new Error("User risk profile not found. Please complete risk assessment first.");
      }

      // Get candidate ETFs based on filters
      const candidateETFs = await this.getCandidateETFs(filters, userProfile);
      
      // Get latest metrics for all candidate ETFs
      const etfMetrics = await this.getETFMetrics(candidateETFs.map(etf => etf.id));
      
      // Calculate MCDA scores for each ETF
      const criteriaWeights = { ...DEFAULT_CRITERIA_WEIGHTS, ...customWeights };
      const recommendations: ETFRecommendation[] = [];

      for (const etf of candidateETFs) {
        const metrics = etfMetrics.find(m => m.etfId === etf.id);
        const recommendation = await this.calculateMCDAScore(
          etf, 
          metrics, 
          userProfile, 
          criteriaWeights
        );
        
        if (recommendation.score >= (filters.minScore || 0)) {
          recommendations.push(recommendation);
        }
      }

      // Sort by score descending and limit results
      recommendations.sort((a, b) => b.score - a.score);
      
      const maxResults = filters.maxResults || 20;
      return recommendations.slice(0, maxResults);
      
    } catch (error) {
      console.error("Error getting ETF recommendations:", error);
      throw new Error(`Failed to generate recommendations: ${error}`);
    }
  }

  // Calculate MCDA score for a single ETF
  private async calculateMCDAScore(
    etf: EtfProduct,
    metrics: EtfMetric | undefined,
    userProfile: UserRiskProfile,
    weights: MCDACriteria
  ): Promise<ETFRecommendation> {
    const criteriaScores: Record<string, { score: number; weight: number; explanation: string }> = {};

    // 1. Risk Alignment Score
    const riskAlignmentResult = this.calculateRiskAlignment(etf, userProfile);
    criteriaScores.riskAlignment = {
      score: riskAlignmentResult.score,
      weight: weights.riskAlignment,
      explanation: riskAlignmentResult.explanation
    };

    // 2. Expense Ratio Score (lower is better)
    const expenseRatioResult = this.calculateExpenseRatioScore(etf);
    criteriaScores.expenseRatio = {
      score: expenseRatioResult.score,
      weight: weights.expenseRatio,
      explanation: expenseRatioResult.explanation
    };

    // 3. Liquidity Score
    const liquidityResult = this.calculateLiquidityScore(etf, metrics);
    criteriaScores.liquidity = {
      score: liquidityResult.score,
      weight: weights.liquidity,
      explanation: liquidityResult.explanation
    };

    // 4. Diversification Score
    const diversificationResult = this.calculateDiversificationScore(etf);
    criteriaScores.diversification = {
      score: diversificationResult.score,
      weight: weights.diversification,
      explanation: diversificationResult.explanation
    };

    // 5. Tracking Difference Score
    const trackingResult = this.calculateTrackingScore(etf, metrics);
    criteriaScores.trackingDifference = {
      score: trackingResult.score,
      weight: weights.trackingDifference,
      explanation: trackingResult.explanation
    };

    // 6. Tax Efficiency Score
    const taxResult = this.calculateTaxEfficiencyScore(etf);
    criteriaScores.taxEfficiency = {
      score: taxResult.score,
      weight: weights.taxEfficiency,
      explanation: taxResult.explanation
    };

    // 7. Performance Score
    const performanceResult = this.calculatePerformanceScore(etf, metrics);
    criteriaScores.performance = {
      score: performanceResult.score,
      weight: weights.performance,
      explanation: performanceResult.explanation
    };

    // Calculate weighted total score
    const totalScore = Object.entries(criteriaScores).reduce((sum, [key, data]) => {
      return sum + (data.score * data.weight);
    }, 0);

    // Generate reasoning and warnings
    const reasoning = await this.generateRecommendationReasoning(etf, criteriaScores, userProfile);
    const riskWarnings = this.generateRiskWarnings(etf, userProfile);
    const suitabilityScore = riskAlignmentResult.score;

    return {
      etf,
      score: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
      reasoning,
      criteria: criteriaScores,
      metrics,
      suitabilityScore,
      riskWarnings
    };
  }

  // Individual scoring methods for each criterion
  private calculateRiskAlignment(etf: EtfProduct, userProfile: UserRiskProfile): { score: number; explanation: string } {
    const etfRisk = etf.riskScore || 5;
    const userRiskScore = this.mapRiskToleranceToScore(userProfile.riskLevel);
    
    // Perfect match = 1.0, decrease as difference increases
    const difference = Math.abs(Number(etfRisk) - Number(userRiskScore));
    const maxDifference = 9; // Maximum possible difference (1-10 scale)
    const score = Math.max(0, 1 - (difference / maxDifference));
    
    let explanation = `ETF 위험도 ${etfRisk}/10, 사용자 선호 위험도 ${userRiskScore}/10`;
    if (difference <= 1) {
      explanation += " - 완벽한 위험도 매칭";
    } else if (difference <= 2) {
      explanation += " - 적절한 위험도 매칭";
    } else {
      explanation += " - 위험도 불일치 주의";
    }
    
    return { score, explanation };
  }

  private calculateExpenseRatioScore(etf: EtfProduct): { score: number; explanation: string } {
    const expenseRatio = parseFloat(etf.expenseRatio?.toString() || "0.5");
    
    // Score inversely related to expense ratio
    // 0% = 1.0, 0.25% = 0.75, 0.5% = 0.5, 1% = 0, >1% = 0
    const score = Math.max(0, Math.min(1, 1 - (expenseRatio / 0.01))); // Convert to percentage
    
    let explanation = `연간 관리비용 ${(expenseRatio * 100).toFixed(2)}%`;
    if (expenseRatio < 0.002) {
      explanation += " - 매우 낮은 비용";
    } else if (expenseRatio < 0.005) {
      explanation += " - 낮은 비용";
    } else if (expenseRatio < 0.01) {
      explanation += " - 보통 비용";
    } else {
      explanation += " - 높은 비용 주의";
    }
    
    return { score, explanation };
  }

  private calculateLiquidityScore(etf: EtfProduct, metrics?: EtfMetric): { score: number; explanation: string } {
    const aum = parseFloat(etf.aum?.toString() || "0");
    const volume = Number((metrics as any)?.avgVolume) || 0;
    
    // Combine AUM and volume for liquidity score
    const aumScore = Math.min(1, aum / 1000000000); // Normalize to 1B AUM
    const volumeScore = volume > 1000000 ? 1 : volume / 1000000; // Normalize to 1M volume
    
    const score = (aumScore * 0.6 + volumeScore * 0.4);
    
    let explanation = `운용자산 ${this.formatCurrency(aum)}, 거래량 ${this.formatNumber(volume)}`;
    if (score > 0.8) {
      explanation += " - 높은 유동성";
    } else if (score > 0.5) {
      explanation += " - 적정 유동성";
    } else {
      explanation += " - 낮은 유동성 주의";
    }
    
    return { score, explanation };
  }

  private calculateDiversificationScore(etf: EtfProduct): { score: number; explanation: string } {
    const metadata = etf.metadata as any;
    const holdings = metadata?.holdings || 100; // Default assumption
    const sectors = metadata?.sectors?.length || 1;
    
    // Score based on number of holdings and sector diversification
    const holdingsScore = Math.min(1, holdings / 500); // Normalize to 500 holdings
    const sectorScore = Math.min(1, sectors / 10); // Normalize to 10 sectors
    
    const score = (holdingsScore * 0.7 + sectorScore * 0.3);
    
    let explanation = `${holdings}개 종목, ${sectors}개 섹터`;
    if (score > 0.8) {
      explanation += " - 높은 분산도";
    } else if (score > 0.5) {
      explanation += " - 적정 분산도";
    } else {
      explanation += " - 낮은 분산도";
    }
    
    return { score, explanation };
  }

  private calculateTrackingScore(etf: EtfProduct, metrics?: EtfMetric): { score: number; explanation: string } {
    const trackingDiff = Number(metrics?.trackingDiff) || 0.005; // Default 0.5% tracking difference
    
    // Lower tracking difference = higher score
    const score = Math.max(0, 1 - Math.abs(Number(trackingDiff)) / 0.02); // Normalize to 2% max difference
    
    let explanation = `추적오차 ${(Math.abs(Number(trackingDiff)) * 100).toFixed(2)}%`;
    if (Math.abs(Number(trackingDiff)) < 0.001) {
      explanation += " - 매우 정확한 추적";
    } else if (Math.abs(Number(trackingDiff)) < 0.005) {
      explanation += " - 양호한 추적";
    } else {
      explanation += " - 추적오차 주의";
    }
    
    return { score, explanation };
  }

  private calculateTaxEfficiencyScore(etf: EtfProduct): { score: number; explanation: string } {
    const metadata = etf.metadata as any;
    const turnover = metadata?.turnover || 0.2; // Default 20% turnover
    const dividendYield = metadata?.dividendYield || 0.02; // Default 2% yield
    
    // Lower turnover and moderate dividend yield = better tax efficiency
    const turnoverScore = Math.max(0, 1 - turnover);
    const dividendScore = dividendYield > 0.05 ? 0.5 : 1; // Penalize high dividend yield
    
    const score = (turnoverScore * 0.7 + dividendScore * 0.3);
    
    let explanation = `회전율 ${(turnover * 100).toFixed(0)}%, 배당수익률 ${(dividendYield * 100).toFixed(1)}%`;
    if (score > 0.8) {
      explanation += " - 높은 세무효율성";
    } else if (score > 0.5) {
      explanation += " - 적정 세무효율성";
    } else {
      explanation += " - 낮은 세무효율성";
    }
    
    return { score, explanation };
  }

  private calculatePerformanceScore(etf: EtfProduct, metrics?: EtfMetric): { score: number; explanation: string } {
    const ret1y = Number(metrics?.ret1y) || 0.08; // Default 8% return
    const vol30d = Number(metrics?.vol30d) || 0.15; // Default 15% volatility
    
    // Risk-adjusted return (simple Sharpe-like ratio)
    const riskAdjustedReturn = vol30d > 0 ? Number(ret1y) / Number(vol30d) : 0;
    const score = Math.max(0, Math.min(1, (riskAdjustedReturn + 0.5) / 1.5)); // Normalize
    
    let explanation = `1년 수익률 ${(ret1y * 100).toFixed(1)}%, 변동성 ${(vol30d * 100).toFixed(1)}%`;
    if (score > 0.8) {
      explanation += " - 우수한 위험조정수익률";
    } else if (score > 0.5) {
      explanation += " - 적정한 성과";
    } else {
      explanation += " - 낮은 성과";
    }
    
    return { score, explanation };
  }

  // Portfolio generation with Modern Portfolio Theory principles
  async generatePortfolio(
    userId: string, 
    targetAmount: number, 
    diversificationLevel: string = "moderate"
  ): Promise<PortfolioRecommendation> {
    try {
      const userProfile = await storage.getUserRiskProfile(userId);
      if (!userProfile) {
        throw new Error("User risk profile required for portfolio generation");
      }

      // Get recommendations based on diversification level
      const maxETFs = this.getMaxETFsForDiversification(diversificationLevel);
      const recommendations = await this.getRecommendations(userId, { 
        maxResults: maxETFs * 2, // Get extra for selection
        minScore: 0.6 // Only high-quality ETFs
      });

      if (recommendations.length === 0) {
        throw new Error("No suitable ETFs found for portfolio construction");
      }

      // Select optimal combination of ETFs
      const selectedETFs = this.selectOptimalETFCombination(recommendations, maxETFs);
      
      // Calculate allocations based on risk profile and diversification
      const allocations = this.calculateOptimalAllocations(selectedETFs, userProfile, targetAmount);
      
      // Build portfolio with allocations
      const portfolio = allocations.map(allocation => ({
        etf: allocation.etf,
        allocation: allocation.percentage,
        amount: Math.round(allocation.amount),
        reasoning: allocation.reasoning
      }));

      // Calculate portfolio metrics
      const riskMetrics = this.calculatePortfolioRiskMetrics(portfolio);
      const diversificationMetrics = this.calculateDiversificationMetrics(portfolio);
      const totalExpenseRatio = this.calculateWeightedExpenseRatio(portfolio);
      const totalScore = this.calculatePortfolioScore(selectedETFs);

      return {
        portfolio,
        totalScore,
        riskMetrics,
        diversificationMetrics,
        rebalancingFrequency: this.getRebalancingFrequency(userProfile.riskLevel),
        totalExpenseRatio
      };

    } catch (error) {
      console.error("Error generating portfolio:", error);
      throw new Error(`Failed to generate portfolio: ${error}`);
    }
  }

  // Helper methods
  private async getCandidateETFs(filters: ETFFilters, userProfile: UserRiskProfile): Promise<EtfProduct[]> {
    // Apply user risk profile constraints
    const riskRange = filters.riskRange || this.getRiskRangeForProfile(userProfile);
    
    const etfFilters = {
      region: filters.region,
      assetClass: filters.assetClass,
      minRiskScore: riskRange.min,
      maxRiskScore: riskRange.max,
      maxExpenseRatio: filters.maxExpenseRatio || 0.01, // Default 1% max expense ratio
      minAum: filters.minAum || 100000000, // Default 100M min AUM
      isActive: true,
      limit: filters.maxResults ? filters.maxResults * 5 : 500 // Get more candidates for scoring
    };

    const candidates = await storage.getEtfProducts(etfFilters);
    
    // Apply exclusions
    return candidates.filter(etf => {
      if (filters.excludeTickers?.includes(etf.ticker)) return false;
      if (filters.includeOnlyTickers && !filters.includeOnlyTickers.includes(etf.ticker)) return false;
      return true;
    });
  }

  private async getETFMetrics(etfIds: string[]): Promise<EtfMetric[]> {
    const metricsPromises = etfIds.map(id => storage.getLatestEtfMetrics(id));
    const results = await Promise.allSettled(metricsPromises);
    
    return results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => (result as PromiseFulfilledResult<EtfMetric>).value);
  }

  private async generateRecommendationReasoning(
    etf: EtfProduct,
    criteria: Record<string, { score: number; weight: number; explanation: string }>,
    userProfile: UserRiskProfile
  ): Promise<string> {
    const topCriteria = Object.entries(criteria)
      .sort((a, b) => (b[1].score * b[1].weight) - (a[1].score * a[1].weight))
      .slice(0, 3);

    const strengths = topCriteria
      .filter(([_, data]) => data.score > 0.7)
      .map(([_, data]) => data.explanation);

    const concerns = Object.entries(criteria)
      .filter(([_, data]) => data.score < 0.4)
      .map(([_, data]) => data.explanation);

    let reasoning = `${etf.name} (${etf.ticker})는 `;
    
    if (strengths.length > 0) {
      reasoning += `다음과 같은 강점을 가지고 있습니다: ${strengths.join(", ")}. `;
    }
    
    if (concerns.length > 0) {
      reasoning += `다음 사항을 고려하세요: ${concerns.join(", ")}. `;
    }

    reasoning += `귀하의 ${userProfile.riskLevel} 위험성향에 적합한 선택입니다.`;

    return reasoning;
  }

  private generateRiskWarnings(etf: EtfProduct, userProfile: UserRiskProfile): string[] {
    const warnings: string[] = [];
    const etfRisk = etf.riskScore || 5;
    const userRiskScore = this.mapRiskToleranceToScore(userProfile.riskLevel);

    if (Number(etfRisk) > Number(userRiskScore) + 2) {
      warnings.push("이 ETF는 귀하의 위험성향보다 위험도가 높습니다");
    }

    if (Number(etf.expenseRatio || 0) > 0.01) {
      warnings.push("높은 관리비용으로 인한 수익률 저하 가능성");
    }

    if (etf.assetClass?.includes("레버리지") || etf.assetClass?.includes("인버스")) {
      warnings.push("파생상품 ETF로 높은 위험성을 수반합니다");
    }

    if (etf.region === "신흥국") {
      warnings.push("신흥국 투자에 따른 환율 및 정치적 위험");
    }

    return warnings;
  }

  // Utility methods
  private mapRiskToleranceToScore(tolerance: string): number {
    const mapping: Record<string, number> = {
      "very_conservative": 2,
      "conservative": 4,
      "moderate": 6,
      "aggressive": 8,
      "very_aggressive": 10
    };
    return mapping[tolerance] || 6;
  }

  private getRiskRangeForProfile(userProfile: UserRiskProfile): { min: number; max: number } {
    const baseScore = this.mapRiskToleranceToScore(userProfile.riskLevel);
    return {
      min: Math.max(1, Number(baseScore) - 2),
      max: Math.min(10, Number(baseScore) + 1)
    };
  }

  private getMaxETFsForDiversification(level: string): number {
    const mapping: Record<string, number> = {
      "simple": 3,
      "moderate": 5,
      "complex": 8
    };
    return mapping[level] || 5;
  }

  private selectOptimalETFCombination(recommendations: ETFRecommendation[], maxETFs: number): ETFRecommendation[] {
    // Ensure diversification across asset classes
    const assetClasses = new Set<string>();
    const selected: ETFRecommendation[] = [];

    // First pass: select top ETF from each asset class
    for (const rec of recommendations) {
      if (selected.length >= maxETFs) break;
      if (!assetClasses.has(rec.etf.assetClass || "기타")) {
        selected.push(rec);
        assetClasses.add(rec.etf.assetClass || "기타");
      }
    }

    // Second pass: fill remaining slots with highest scoring ETFs
    for (const rec of recommendations) {
      if (selected.length >= maxETFs) break;
      if (!selected.find(s => s.etf.id === rec.etf.id)) {
        selected.push(rec);
      }
    }

    return selected;
  }

  private calculateOptimalAllocations(
    etfs: ETFRecommendation[], 
    userProfile: UserRiskProfile, 
    targetAmount: number
  ): Array<{ etf: EtfProduct; percentage: number; amount: number; reasoning: string }> {
    // Simple equal-weight allocation with risk adjustments
    const baseAllocation = 100 / etfs.length;
    let allocations = etfs.map(rec => ({
      etf: rec.etf,
      percentage: baseAllocation,
      amount: targetAmount * (baseAllocation / 100),
      reasoning: `${rec.etf.assetClass} 분산투자를 위한 ${baseAllocation.toFixed(1)}% 배분`
    }));

    // Risk adjustment based on user profile
    const userRiskScore = this.mapRiskToleranceToScore(userProfile.riskLevel);
    
    allocations = allocations.map(allocation => {
      const etfRisk = allocation.etf.riskScore || 5;
      const riskAdjustment = (Number(etfRisk) - Number(userRiskScore)) * 2; // ±2% per risk level difference
      const adjustedPercentage = Math.max(5, Math.min(40, allocation.percentage - riskAdjustment));
      
      return {
        ...allocation,
        percentage: adjustedPercentage,
        amount: targetAmount * (adjustedPercentage / 100)
      };
    });

    // Normalize to ensure total is 100%
    const total = allocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
    allocations.forEach(allocation => {
      allocation.percentage = (allocation.percentage / total) * 100;
      allocation.amount = targetAmount * (allocation.percentage / 100);
    });

    return allocations;
  }

  private calculatePortfolioRiskMetrics(portfolio: any[]): any {
    // Simplified portfolio metrics calculation
    const weightedRisk = portfolio.reduce((sum, item) => 
      sum + ((item.etf.riskScore || 5) * (item.allocation / 100)), 0
    );

    return {
      portfolioRisk: weightedRisk,
      expectedReturn: 0.08, // Placeholder
      sharpeRatio: 0.6,      // Placeholder
      volatility: 0.12       // Placeholder
    };
  }

  private calculateDiversificationMetrics(portfolio: any[]): any {
    const assetClasses = new Set(portfolio.map(item => item.etf.assetClass));
    const regions = new Set(portfolio.map(item => item.etf.region));
    
    return {
      assetClassDiversification: assetClasses.size / 5, // Normalize to max 5 asset classes
      geographicDiversification: regions.size / 4,      // Normalize to max 4 regions
      sectorDiversification: 0.8,                       // Placeholder
      correlationMatrix: []                             // Placeholder
    };
  }

  private calculateWeightedExpenseRatio(portfolio: any[]): number {
    return portfolio.reduce((sum, item) => 
      sum + (parseFloat(item.etf.expenseRatio?.toString() || "0.005") * (item.allocation / 100)), 0
    );
  }

  private calculatePortfolioScore(etfs: ETFRecommendation[]): number {
    return etfs.reduce((sum, rec) => sum + rec.score, 0) / etfs.length;
  }

  private getRebalancingFrequency(riskTolerance: string): string {
    const mapping: Record<string, string> = {
      "very_conservative": "연 2회",
      "conservative": "분기별", 
      "moderate": "분기별",
      "aggressive": "월간",
      "very_aggressive": "월간"
    };
    return mapping[riskTolerance] || "분기별";
  }

  private formatCurrency(amount: number): string {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
    return amount.toString();
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('ko-KR').format(num);
  }
}

export const etfRecommendationService = new ETFRecommendationService();
export default etfRecommendationService;