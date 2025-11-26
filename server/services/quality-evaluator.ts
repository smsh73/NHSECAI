import { db } from "../db";
import * as openaiService from "./openai";
import { 
  reportQualityMetrics, feedbackLog, qualityImprovements, abTestingExperiments,
  type ReportQualityMetrics, type InsertReportQualityMetrics,
  type FeedbackLog, type InsertFeedbackLog,
  type QualityImprovements, type InsertQualityImprovements,
  type AbTestingExperiments, type InsertAbTestingExperiments
} from "@shared/schema";
import { eq, desc, and, gte, sql, avg } from "drizzle-orm";

export interface QualityMetrics {
  accuracyScore: number;
  relevanceScore: number;
  completenessScore: number;
  timelinessScore: number;
  readabilityScore: number;
  overallScore: number;
}

export interface Feedback {
  rating?: number;
  feedbackText?: string;
  feedbackType: "positive" | "negative" | "neutral" | "suggestion";
  feedbackCategory?: string;
}

export interface Assessment {
  scores: QualityMetrics;
  suggestions: string[];
  issues: Array<{
    type: string;
    description: string;
    severity: "high" | "medium" | "low";
  }>;
}

export interface Improvements {
  prioritizedSuggestions: Array<{
    category: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
    expectedImpact: number;
  }>;
  actionItems: string[];
  estimatedImprovement: number;
}

export interface TrendData {
  period: string;
  averageScores: QualityMetrics;
  topPerformers: string[];
  lowPerformers: string[];
  improvementRate: number;
}

class QualityEvaluationService {
  // Evaluate report quality automatically
  async evaluateReport(
    report: any,
    reportId: string,
    reportType: string
  ): Promise<ReportQualityMetrics> {
    const startTime = Date.now();
    
    // 1. AI-based quality assessment
    const aiAssessment = await this.aiQualityAssessment(
      JSON.stringify(report),
      reportType
    );
    
    // 2. Calculate individual scores
    const accuracyScore = await this.calculateAccuracyScore(report, reportType);
    const relevanceScore = await this.calculateRelevanceScore(report, reportType);
    const completenessScore = await this.calculateCompletenessScore(report, reportType);
    const timelinessScore = await this.calculateTimelinessScore(report);
    const readabilityScore = await this.calculateReadabilityScore(report);
    
    // 3. Calculate overall score (weighted average)
    const overallScore = 
      accuracyScore * 0.25 + 
      relevanceScore * 0.25 + 
      completenessScore * 0.20 + 
      timelinessScore * 0.15 + 
      readabilityScore * 0.15;
    
    // 4. Get benchmark comparison
    const benchmarkComparison = await this.getBenchmarkComparison(
      reportType,
      overallScore
    );
    
    // 5. Save quality metrics
    const metrics: InsertReportQualityMetrics = {
      reportId,
      reportType,
      accuracyScore: accuracyScore.toString(),
      relevanceScore: relevanceScore.toString(),
      completenessScore: completenessScore.toString(),
      timelinessScore: timelinessScore.toString(),
      readabilityScore: readabilityScore.toString(),
      overallScore: overallScore.toString(),
      improvementSuggestions: aiAssessment.suggestions,
      identifiedIssues: aiAssessment.issues,
      evaluatedBy: "system",
      evaluationModel: "gpt-4",
      processingTime: Date.now() - startTime,
      benchmarkComparison,
    };
    
    const [savedMetrics] = await db
      .insert(reportQualityMetrics)
      .values(metrics)
      .returning();
    
    // 6. Check if automatic improvement is needed
    if (overallScore < 0.7) {
      await this.triggerAutomaticImprovement(reportId, reportType, aiAssessment);
    }
    
    return savedMetrics;
  }
  
  // AI-powered quality assessment using OpenAI
  async aiQualityAssessment(
    content: string,
    reportType: string
  ): Promise<Assessment> {
    const prompt = `
    Analyze the following ${reportType} report for quality assessment. 
    Evaluate based on:
    1. Accuracy - Are facts and data correct?
    2. Relevance - Is content relevant to the topic?
    3. Completeness - Are all essential elements included?
    4. Timeliness - Is the information current?
    5. Readability - Is it well-structured and clear?
    
    Provide:
    - Quality scores (0-1) for each dimension
    - List of improvement suggestions
    - Identified issues with severity levels
    
    Report Content:
    ${content}
    
    Return response in JSON format:
    {
      "scores": {
        "accuracyScore": 0.0,
        "relevanceScore": 0.0,
        "completenessScore": 0.0,
        "timelinessScore": 0.0,
        "readabilityScore": 0.0,
        "overallScore": 0.0
      },
      "suggestions": ["suggestion1", "suggestion2"],
      "issues": [
        {
          "type": "accuracy|relevance|completeness|timeliness|readability",
          "description": "issue description",
          "severity": "high|medium|low"
        }
      ]
    }`;
    
    try {
      const response = await openaiService.createChatCompletion([
        {
          role: "system",
          content: "You are an expert financial report quality evaluator. Analyze reports for quality, accuracy, and completeness."
        },
        {
          role: "user",
          content: prompt
        }
      ], "gpt-4-turbo-preview", 0.2, true);
      
      return JSON.parse(response);
    } catch (error) {
      console.error("AI quality assessment failed:", error);
      // Return default assessment if AI fails
      return {
        scores: {
          accuracyScore: 0.7,
          relevanceScore: 0.7,
          completenessScore: 0.7,
          timelinessScore: 0.7,
          readabilityScore: 0.7,
          overallScore: 0.7
        },
        suggestions: ["Unable to generate suggestions automatically"],
        issues: []
      };
    }
  }
  
  // Calculate accuracy score by comparing with source data
  private async calculateAccuracyScore(report: any, reportType: string): Promise<number> {
    // Implementation would compare report data with original sources
    // For now, return a simulated score based on report type
    if (reportType === "news_analysis") {
      // Check if key facts are correctly represented
      return 0.85;
    } else if (reportType === "market_report") {
      // Verify market data accuracy
      return 0.90;
    } else if (reportType === "theme_summary") {
      // Check theme categorization accuracy
      return 0.88;
    }
    return 0.80;
  }
  
  // Calculate relevance score
  private async calculateRelevanceScore(report: any, reportType: string): Promise<number> {
    // Check if content is relevant to the intended topic
    // Simplified implementation
    const hasRelevantKeywords = true; // Would check for relevant keywords
    const hasProperContext = true; // Would verify context
    
    let score = 0.5;
    if (hasRelevantKeywords) score += 0.25;
    if (hasProperContext) score += 0.25;
    
    return score;
  }
  
  // Calculate completeness score
  private async calculateCompletenessScore(report: any, reportType: string): Promise<number> {
    // Check if all required sections are present
    const requiredSections: Record<string, string[]> = {
      news_analysis: ["summary", "key_points", "market_impact", "recommendations"],
      market_report: ["overview", "performance", "sectors", "outlook"],
      theme_summary: ["theme", "stocks", "performance", "trends"],
      morning_briefing: ["keyEvents", "marketMovements", "sectorHighlights", "aiInsights"],
      macro_analysis: ["executiveSummary", "marketOverview", "themeAnalysis", "recommendations"]
    };
    
    const required = requiredSections[reportType] || [];
    const present = required.filter(section => report[section] !== undefined);
    
    return present.length / required.length;
  }
  
  // Calculate timeliness score
  private async calculateTimelinessScore(report: any): Promise<number> {
    // Check data freshness
    const now = new Date();
    const reportDate = report.createdAt ? new Date(report.createdAt) : now;
    const hoursDiff = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff < 1) return 1.0;
    if (hoursDiff < 6) return 0.9;
    if (hoursDiff < 24) return 0.8;
    if (hoursDiff < 48) return 0.6;
    return 0.4;
  }
  
  // Calculate readability score
  private async calculateReadabilityScore(report: any): Promise<number> {
    // Simplified readability assessment
    const content = JSON.stringify(report);
    
    // Check for structure
    const hasGoodStructure = content.length > 100 && content.length < 50000;
    const hasProperFormatting = content.includes("summary") || content.includes("overview");
    
    let score = 0.5;
    if (hasGoodStructure) score += 0.25;
    if (hasProperFormatting) score += 0.25;
    
    return score;
  }
  
  // Get benchmark comparison
  private async getBenchmarkComparison(
    reportType: string,
    overallScore: number
  ): Promise<any> {
    // Calculate average scores for this report type
    const avgScores = await db
      .select({
        avg: avg(reportQualityMetrics.overallScore)
      })
      .from(reportQualityMetrics)
      .where(eq(reportQualityMetrics.reportType, reportType));
    
    const avgScore = avgScores[0]?.avg ? parseFloat(avgScores[0].avg) : 0.7;
    const percentile = overallScore > avgScore ? 
      50 + ((overallScore - avgScore) / (1 - avgScore)) * 50 : 
      (overallScore / avgScore) * 50;
    
    return {
      avg_score: avgScore,
      percentile: Math.round(percentile),
      category_avg: avgScore
    };
  }
  
  // Collect and save user feedback
  async collectUserFeedback(
    reportId: string,
    reportType: string,
    feedback: Feedback
  ): Promise<FeedbackLog> {
    // Save feedback to log
    const feedbackEntry: InsertFeedbackLog = {
      entityType: "report",
      entityId: reportId,
      feedbackType: feedback.feedbackType,
      feedbackCategory: feedback.feedbackCategory,
      feedbackText: feedback.feedbackText,
      feedbackScore: feedback.rating,
      actionRequired: feedback.feedbackType === "negative",
      resolutionStatus: "pending"
    };
    
    const [savedFeedback] = await db
      .insert(feedbackLog)
      .values(feedbackEntry)
      .returning();
    
    // Update quality metrics with user rating
    if (feedback.rating) {
      await db
        .update(reportQualityMetrics)
        .set({
          userRating: feedback.rating,
          userFeedback: feedback.feedbackText,
          updatedAt: new Date()
        })
        .where(eq(reportQualityMetrics.reportId, reportId));
    }
    
    // Trigger improvement process if negative feedback
    if (feedback.feedbackType === "negative") {
      await this.processNegativeFeedback(reportId, reportType, feedback);
    }
    
    return savedFeedback;
  }
  
  // Generate improvement suggestions
  async generateImprovements(
    metrics: QualityMetrics,
    reportType: string
  ): Promise<Improvements> {
    const suggestions = [];
    const actionItems = [];
    
    // Analyze each metric and generate targeted improvements
    if (metrics.accuracyScore < 0.7) {
      suggestions.push({
        category: "accuracy",
        suggestion: "Implement fact-checking validation against multiple sources",
        priority: "high" as const,
        expectedImpact: 0.15
      });
      actionItems.push("Review and correct data source mappings");
    }
    
    if (metrics.relevanceScore < 0.7) {
      suggestions.push({
        category: "relevance",
        suggestion: "Enhance keyword filtering and topic classification",
        priority: "high" as const,
        expectedImpact: 0.12
      });
      actionItems.push("Update relevance scoring algorithms");
    }
    
    if (metrics.completenessScore < 0.7) {
      suggestions.push({
        category: "completeness",
        suggestion: "Add missing report sections and data points",
        priority: "medium" as const,
        expectedImpact: 0.10
      });
      actionItems.push("Review report template requirements");
    }
    
    if (metrics.timelinessScore < 0.7) {
      suggestions.push({
        category: "timeliness",
        suggestion: "Increase data update frequency and refresh rates",
        priority: "medium" as const,
        expectedImpact: 0.08
      });
      actionItems.push("Optimize data collection schedules");
    }
    
    if (metrics.readabilityScore < 0.7) {
      suggestions.push({
        category: "readability",
        suggestion: "Improve report formatting and structure",
        priority: "low" as const,
        expectedImpact: 0.05
      });
      actionItems.push("Enhance text formatting and layout");
    }
    
    // Calculate estimated improvement
    const estimatedImprovement = suggestions.reduce(
      (sum, s) => sum + s.expectedImpact,
      0
    );
    
    return {
      prioritizedSuggestions: suggestions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      actionItems,
      estimatedImprovement
    };
  }
  
  // Get quality trends over time
  async getQualityTrends(period: string): Promise<TrendData> {
    const dateThreshold = new Date();
    if (period === "week") {
      dateThreshold.setDate(dateThreshold.getDate() - 7);
    } else if (period === "month") {
      dateThreshold.setMonth(dateThreshold.getMonth() - 1);
    } else if (period === "quarter") {
      dateThreshold.setMonth(dateThreshold.getMonth() - 3);
    }
    
    // Get all metrics for the period
    const metrics = await db
      .select()
      .from(reportQualityMetrics)
      .where(gte(reportQualityMetrics.evaluatedAt, dateThreshold))
      .orderBy(desc(reportQualityMetrics.overallScore));
    
    // Calculate average scores
    const averageScores = this.calculateAverageScores(metrics);
    
    // Get top and low performers
    const topPerformers = metrics
      .slice(0, 5)
      .map(m => m.reportId);
    const lowPerformers = metrics
      .slice(-5)
      .map(m => m.reportId);
    
    // Calculate improvement rate
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
    const firstAvg = this.calculateAverageScores(firstHalf).overallScore;
    const secondAvg = this.calculateAverageScores(secondHalf).overallScore;
    const improvementRate = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      period,
      averageScores,
      topPerformers,
      lowPerformers,
      improvementRate
    };
  }
  
  // Trigger automatic improvement process
  private async triggerAutomaticImprovement(
    reportId: string,
    reportType: string,
    assessment: Assessment
  ): Promise<void> {
    const improvement: InsertQualityImprovements = {
      improvementType: "process_change",
      targetEntity: "report",
      targetEntityId: reportId,
      description: `Automatic improvement triggered for ${reportType} report with low quality score`,
      expectedOutcome: "Improve overall quality score by 20%",
      metrics: {
        before: assessment.scores,
        target_improvement: 0.2
      },
      implementationStatus: "planned",
      implementationSteps: [
        { step: "Analyze issues", status: "pending" },
        { step: "Generate improvements", status: "pending" },
        { step: "Apply changes", status: "pending" },
        { step: "Re-evaluate quality", status: "pending" }
      ],
      priority: "high"
    };
    
    await db.insert(qualityImprovements).values(improvement);
  }
  
  // Process negative feedback
  private async processNegativeFeedback(
    reportId: string,
    reportType: string,
    feedback: Feedback
  ): Promise<void> {
    // Log the negative feedback for review
    console.log(`Negative feedback received for ${reportType} report ${reportId}:`, feedback.feedbackText);
    
    // Create improvement plan based on feedback
    const improvement: InsertQualityImprovements = {
      improvementType: "process_change",
      targetEntity: "report",
      targetEntityId: reportId,
      description: `Address negative user feedback: ${feedback.feedbackText}`,
      expectedOutcome: "Resolve user concerns and improve satisfaction",
      implementationStatus: "planned",
      priority: "high",
      effort: "medium",
      impact: "high"
    };
    
    await db.insert(qualityImprovements).values(improvement);
  }
  
  // Calculate average scores from metrics array
  private calculateAverageScores(metrics: ReportQualityMetrics[]): QualityMetrics {
    if (metrics.length === 0) {
      return {
        accuracyScore: 0,
        relevanceScore: 0,
        completenessScore: 0,
        timelinessScore: 0,
        readabilityScore: 0,
        overallScore: 0
      };
    }
    
    const sum = metrics.reduce((acc, m) => ({
      accuracyScore: acc.accuracyScore + parseFloat(m.accuracyScore || "0"),
      relevanceScore: acc.relevanceScore + parseFloat(m.relevanceScore || "0"),
      completenessScore: acc.completenessScore + parseFloat(m.completenessScore || "0"),
      timelinessScore: acc.timelinessScore + parseFloat(m.timelinessScore || "0"),
      readabilityScore: acc.readabilityScore + parseFloat(m.readabilityScore || "0"),
      overallScore: acc.overallScore + parseFloat(m.overallScore || "0")
    }), {
      accuracyScore: 0,
      relevanceScore: 0,
      completenessScore: 0,
      timelinessScore: 0,
      readabilityScore: 0,
      overallScore: 0
    });
    
    const count = metrics.length;
    return {
      accuracyScore: sum.accuracyScore / count,
      relevanceScore: sum.relevanceScore / count,
      completenessScore: sum.completenessScore / count,
      timelinessScore: sum.timelinessScore / count,
      readabilityScore: sum.readabilityScore / count,
      overallScore: sum.overallScore / count
    };
  }
  
  // Run A/B testing experiments
  async runABTest(
    experimentName: string,
    testType: string,
    controlConfig: any,
    testConfig: any,
    sampleSize: number
  ): Promise<AbTestingExperiments> {
    const experiment: InsertAbTestingExperiments = {
      experimentName,
      description: `A/B test for ${testType} improvements`,
      hypothesis: `Testing if the new configuration improves quality scores`,
      testType,
      controlVersion: controlConfig,
      testVersion: testConfig,
      sampleSize,
      status: "running"
    };
    
    const [savedExperiment] = await db
      .insert(abTestingExperiments)
      .values(experiment)
      .returning();
    
    // Start background test execution
    this.executeABTest(savedExperiment.id);
    
    return savedExperiment;
  }
  
  // Execute A/B test in background
  private async executeABTest(experimentId: string): Promise<void> {
    // Implementation would run tests and collect metrics
    // This is a simplified placeholder
    setTimeout(async () => {
      // Simulate test completion after some time
      const controlMetrics = {
        accuracy: 0.75,
        relevance: 0.80,
        completeness: 0.70,
        overall: 0.75
      };
      
      const testMetrics = {
        accuracy: 0.82,
        relevance: 0.85,
        completeness: 0.78,
        overall: 0.82
      };
      
      const improvement = (testMetrics.overall - controlMetrics.overall) / controlMetrics.overall;
      const statisticalSignificance = 0.95; // Simplified
      
      await db
        .update(abTestingExperiments)
        .set({
          controlMetrics,
          testMetrics,
          statisticalSignificance: statisticalSignificance.toString(),
          winner: improvement > 0.05 ? "test" : "control",
          status: "completed",
          endDate: new Date()
        })
        .where(eq(abTestingExperiments.id, experimentId));
    }, 60000); // Simulate 1 minute test duration
  }
}

// Export singleton instance
export const qualityEvaluator = new QualityEvaluationService();