import type { 
  UserRiskProfile, 
  GuardrailPolicy, 
  EtfProduct, 
  EtfChatMessage 
} from "@shared/schema";
import { storage } from "../storage";
import { ragService } from "./ragService";
import * as openaiService from "./openai";

// Guardrail violation severity levels
export enum ViolationSeverity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical"
}

// Policy violation interface
export interface PolicyViolation {
  policyId: string;
  severity: ViolationSeverity;
  message: string;
  suggestedAction: string;
  modifiedContent?: string;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  violations: PolicyViolation[];
  modifiedContent?: string;
  disclaimer?: string;
  sources?: Array<{
    type: string;
    content: string;
    confidence: number;
  }>;
}

// Suitability check result
export interface SuitabilityResult {
  isCompatible: boolean;
  riskMismatch?: number; // 0-1 scale where 1 is severe mismatch
  reasons: string[];
  recommendations: string[];
}

class GuardrailsService {
  // Standard disclaimers for different types of content
  private readonly disclaimers = {
    general: "이 정보는 교육 목적으로만 제공되며, 개인 투자 조언이 아닙니다. 투자 전에 반드시 전문가와 상담하시기 바랍니다.",
    riskWarning: "모든 투자에는 위험이 따르며, 원금 손실 가능성이 있습니다. 본인의 위험 감수 능력을 신중히 고려하세요.",
    taxLegal: "세무 및 법률 관련 사항은 반드시 해당 분야 전문가와 상담하시기 바랍니다.",
    performance: "과거 성과는 미래 결과를 보장하지 않습니다.",
    diversification: "분산투자가 손실을 방지하거나 수익을 보장하지는 않습니다."
  };

  // Prohibited content patterns
  private readonly prohibitedPatterns = [
    // Personal tax/legal advice
    /세금.*절약.*방법/g,
    /법적.*책임.*회피/g,
    /탈세/g,
    /세무.*전략.*추천/g,
    
    // Guaranteed returns promises
    /반드시.*수익/g,
    /확실한.*이익/g,
    /보장.*수익률/g,
    /무위험.*투자/g,
    
    // Aggressive trading recommendations
    /지금.*당장.*사야/g,
    /급등.*확실/g,
    /단타.*추천/g,
    /레버리지.*권장/g,
    
    // Specific stock picks without proper analysis
    /이.*종목.*무조건/g,
    /반드시.*매수/g,
    /확실한.*종목/g,
  ];

  // High-risk content keywords that require extra validation
  private readonly highRiskKeywords = [
    "레버리지", "인버스", "선물", "옵션", "파생상품", 
    "신흥국", "소형주", "바이오", "암호화폐", "원자재"
  ];

  // Input validation - checks user messages for inappropriate requests
  async validateInput(content: string, userProfile?: UserRiskProfile): Promise<ValidationResult> {
    const violations: PolicyViolation[] = [];
    let modifiedContent = content;

    // Check for prohibited patterns
    for (const pattern of this.prohibitedPatterns) {
      if (pattern.test(content)) {
        violations.push({
          policyId: "prohibited_content",
          severity: ViolationSeverity.HIGH,
          message: "부적절한 요청이 감지되었습니다",
          suggestedAction: "투자 관련 일반적인 정보 요청으로 수정해주세요"
        });
      }
    }

    // Check for personal financial advice requests
    if (this.containsPersonalAdviceRequest(content)) {
      violations.push({
        policyId: "personal_advice_request",
        severity: ViolationSeverity.MEDIUM,
        message: "개인 투자 조언 요청이 감지되었습니다",
        suggestedAction: "일반적인 ETF 정보나 교육 자료를 요청해주세요"
      });
    }

    // Check for urgent/pressure language
    if (this.containsUrgencyLanguage(content)) {
      violations.push({
        policyId: "urgency_language",
        severity: ViolationSeverity.MEDIUM,
        message: "투자 압박성 언어가 감지되었습니다",
        suggestedAction: "신중한 투자 결정을 위해 충분한 시간을 두고 검토하세요"
      });
    }

    return {
      isValid: violations.length === 0,
      violations,
      modifiedContent: violations.length > 0 ? modifiedContent : undefined
    };
  }

  // Output validation - checks AI responses before sending to user
  async validateOutput(
    content: string, 
    userProfile?: UserRiskProfile, 
    context?: any
  ): Promise<ValidationResult> {
    const violations: PolicyViolation[] = [];
    let modifiedContent = content;
    let disclaimer = "";
    const sources: Array<{ type: string; content: string; confidence: number }> = [];

    // Check prohibited patterns in output
    for (const pattern of this.prohibitedPatterns) {
      if (pattern.test(content)) {
        violations.push({
          policyId: "output_prohibited_content",
          severity: ViolationSeverity.CRITICAL,
          message: "응답에 부적절한 내용이 포함되어 있습니다",
          suggestedAction: "응답을 재생성해야 합니다"
        });
      }
    }

    // RAG verification - check if facts are supported by data
    const ragValidation = await this.verifyWithRAG(content);
    if (!ragValidation.isValid) {
      violations.push({
        policyId: "unsupported_facts",
        severity: ViolationSeverity.HIGH,
        message: "검증되지 않은 정보가 포함되어 있습니다",
        suggestedAction: "사실 확인이 필요합니다",
        modifiedContent: ragValidation.correctedContent
      });
      
      if (ragValidation.sources) {
        sources.push(...ragValidation.sources);
      }
    }

    // Check for high-risk content and user compatibility
    if (this.containsHighRiskContent(content) && userProfile) {
      const suitabilityResult = await this.checkSuitability(content, userProfile);
      
      if (!suitabilityResult.isCompatible) {
        violations.push({
          policyId: "risk_mismatch",
          severity: ViolationSeverity.HIGH,
          message: "사용자 위험성향과 맞지 않는 내용입니다",
          suggestedAction: "사용자 리스크 프로필에 맞는 대안을 제시하세요"
        });
      }
    }

    // Add appropriate disclaimers
    disclaimer = this.generateDisclaimer(content, userProfile, violations);

    // Modify content if needed
    if (violations.some(v => v.modifiedContent)) {
      modifiedContent = violations.find(v => v.modifiedContent)?.modifiedContent || content;
    }

    // Add disclaimer to content
    if (disclaimer) {
      modifiedContent = `${modifiedContent}\n\n⚠️ ${disclaimer}`;
    }

    return {
      isValid: violations.filter(v => v.severity === ViolationSeverity.CRITICAL).length === 0,
      violations,
      modifiedContent: violations.length > 0 ? modifiedContent : undefined,
      disclaimer,
      sources
    };
  }

  // Suitability check - ensures high-risk ETFs aren't recommended to conservative users
  async checkSuitability(content: string, userProfile: UserRiskProfile): Promise<SuitabilityResult> {
    const reasons: string[] = [];
    const recommendations: string[] = [];
    let isCompatible = true;
    let riskMismatch = 0;

    // Extract ETF mentions and check their risk levels
    const etfMentions = this.extractETFMentions(content);
    
    for (const ticker of etfMentions) {
      const etf = await storage.getEtfProductByTicker(ticker);
      if (etf && userProfile) {
        const mismatch = this.calculateRiskMismatch(etf, userProfile);
        
        if (mismatch > 0.7) {
          isCompatible = false;
          riskMismatch = Math.max(riskMismatch, mismatch);
          reasons.push(`${ticker}는 귀하의 위험성향(${userProfile.riskTolerance})보다 위험도가 높습니다`);
          recommendations.push(`더 안정적인 ${etf.assetClass} ETF를 고려해보세요`);
        } else if (mismatch > 0.4) {
          reasons.push(`${ticker}는 주의 깊게 검토가 필요한 위험도입니다`);
          recommendations.push(`투자 전에 충분한 조사와 분산투자를 고려하세요`);
        }
      }
    }

    return {
      isCompatible,
      riskMismatch,
      reasons,
      recommendations
    };
  }

  // RAG verification to prevent hallucinations
  private async verifyWithRAG(content: string): Promise<{
    isValid: boolean;
    correctedContent?: string;
    sources?: Array<{ type: string; content: string; confidence: number }>;
  }> {
    try {
      // Extract factual claims from content
      const claims = this.extractFactualClaims(content);
      const sources: Array<{ type: string; content: string; confidence: number }> = [];
      let isValid = true;
      let correctedContent = content;

      for (const claim of claims) {
        // Search RAG database for supporting evidence
        const searchResults = await ragService.hybridSearch(claim, 0.7, 0.3, {
          topK: 5,
          threshold: 0.6
        });

        if (searchResults.length === 0) {
          isValid = false;
          // Mark unverified claims
          correctedContent = correctedContent.replace(
            claim,
            `${claim} (※ 출처 확인 필요)`
          );
        } else {
          // Add high-confidence sources
          const highConfidenceSources = searchResults.filter(r => (r.score || 0) > 0.8);
          sources.push(...highConfidenceSources.map(r => ({
            type: r.source,
            content: r.content.substring(0, 200) + "...",
            confidence: r.score || 0
          })));
        }
      }

      return {
        isValid,
        correctedContent: isValid ? undefined : correctedContent,
        sources: sources.length > 0 ? sources : undefined
      };
    } catch (error) {
      console.error("RAG verification failed:", error);
      return { isValid: false };
    }
  }

  // Generate appropriate disclaimers based on content and context
  private generateDisclaimer(
    content: string, 
    userProfile?: UserRiskProfile, 
    violations?: PolicyViolation[]
  ): string {
    const disclaimers: string[] = [this.disclaimers.general];

    // Add risk warning for high-risk content
    if (this.containsHighRiskContent(content)) {
      disclaimers.push(this.disclaimers.riskWarning);
    }

    // Add performance disclaimer for return discussions
    if (content.includes("수익") || content.includes("성과") || content.includes("returns")) {
      disclaimers.push(this.disclaimers.performance);
    }

    // Add diversification disclaimer
    if (content.includes("분산") || content.includes("포트폴리오")) {
      disclaimers.push(this.disclaimers.diversification);
    }

    // Add tax/legal disclaimer if relevant
    if (content.includes("세금") || content.includes("법적") || content.includes("tax")) {
      disclaimers.push(this.disclaimers.taxLegal);
    }

    return disclaimers.join(" ");
  }

  // Helper methods
  private containsPersonalAdviceRequest(content: string): boolean {
    const personalAdvicePatterns = [
      /나는.*어떻게.*해야/g,
      /제가.*투자.*해야/g,
      /저에게.*맞는.*ETF/g,
      /개인적으로.*추천/g,
      /내.*상황에서/g
    ];

    return personalAdvicePatterns.some(pattern => pattern.test(content));
  }

  private containsUrgencyLanguage(content: string): boolean {
    const urgencyPatterns = [
      /지금.*당장/g,
      /서둘러/g,
      /놓치면.*안.*되는/g,
      /기회.*놓치기.*전에/g,
      /급등.*예상/g
    ];

    return urgencyPatterns.some(pattern => pattern.test(content));
  }

  private containsHighRiskContent(content: string): boolean {
    return this.highRiskKeywords.some(keyword => content.includes(keyword));
  }

  private extractETFMentions(content: string): string[] {
    // Extract ticker patterns like "SPY", "QQQ", etc.
    const tickerRegex = /\b[A-Z]{2,5}\b/g;
    const matches = content.match(tickerRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  private calculateRiskMismatch(etf: EtfProduct, userProfile: UserRiskProfile): number {
    const etfRisk = etf.riskScore || 5; // Default to medium risk
    const userRisk = this.mapRiskToleranceToScore(userProfile.riskTolerance);
    
    // Calculate normalized mismatch (0-1 scale)
    const maxRiskDiff = 10;
    const riskDiff = Math.abs(etfRisk - userRisk);
    
    // Only consider it a mismatch if ETF is riskier than user preference
    if (etfRisk > userRisk) {
      return Math.min(riskDiff / maxRiskDiff, 1);
    }
    
    return 0; // No mismatch if ETF is less risky than user tolerance
  }

  private mapRiskToleranceToScore(tolerance: string): number {
    const mapping: Record<string, number> = {
      "very_conservative": 1,
      "conservative": 3,
      "moderate": 5,
      "aggressive": 7,
      "very_aggressive": 9
    };
    
    return mapping[tolerance] || 5;
  }

  private extractFactualClaims(content: string): string[] {
    // Extract sentences that contain factual claims (numbers, percentages, specific data)
    const sentences = content.split(/[.!?]+/);
    const factualClaims: string[] = [];

    for (const sentence of sentences) {
      // Look for sentences with numbers, percentages, or specific data
      if (sentence.match(/\d+%|\d+년|\d+\.\d+%|expense ratio|수익률|성과|returns/)) {
        factualClaims.push(sentence.trim());
      }
    }

    return factualClaims;
  }

  // Policy management methods
  async loadPolicies(): Promise<GuardrailPolicy[]> {
    return await storage.getGuardrailPolicies({ isActive: true });
  }

  async updatePolicy(policyId: string, updates: Partial<GuardrailPolicy>): Promise<void> {
    await storage.updateGuardrailPolicy(policyId, updates);
  }

  // Main validation method that combines input and output validation
  async validateContent(
    content: string,
    type: "input" | "output",
    userProfile?: UserRiskProfile,
    context?: any
  ): Promise<ValidationResult> {
    if (type === "input") {
      return this.validateInput(content, userProfile);
    } else {
      return this.validateOutput(content, userProfile, context);
    }
  }

  // Generate safe response when violations are found
  async generateSafeResponse(
    originalContent: string,
    violations: PolicyViolation[],
    userProfile?: UserRiskProfile
  ): Promise<string> {
    const criticalViolations = violations.filter(v => v.severity === ViolationSeverity.CRITICAL);
    
    if (criticalViolations.length > 0) {
      return "죄송합니다. 요청하신 내용에 대해 적절한 답변을 드릴 수 없습니다. ETF에 대한 일반적인 정보나 교육 자료에 대해 문의해 주시기 바랍니다.";
    }

    // For non-critical violations, provide modified response
    let safeContent = originalContent;
    
    for (const violation of violations) {
      if (violation.modifiedContent) {
        safeContent = violation.modifiedContent;
      }
    }

    // Add comprehensive disclaimer
    const disclaimer = this.generateDisclaimer(safeContent, userProfile, violations);
    return `${safeContent}\n\n⚠️ ${disclaimer}`;
  }
}

export const guardrailsService = new GuardrailsService();
export default guardrailsService;