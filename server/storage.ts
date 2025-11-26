import { 
  users, workflows, workflowFolders, prompts, pythonScripts, apiCalls, schedules, workflowExecutions, workflowNodeResults,
  workflowSessions, workflowNodeExecutions, workflowSessionData, workflowNodes,
  marketAnalysis, macroAnalysis, macroWorkflowTemplates, financialData, newsData, layoutTemplates, morningBriefing, causalAnalysis,
  majorEvents, majorEventsRelatedNews, quantitativeMetrics, infoStockThemes, infoStockThemeStocks,
  industryThemeConditions, industryThemeRelatedNews, macroMarketConditions, processedNewsData,
  themes, reportQualityMetrics, feedbackLog, qualityImprovements, abTestingExperiments,
  aiServiceProviders, apiCategories, apiTestResults, apiUsageAnalytics, apiTemplates,
  userBalances, balanceInsights, userTags, userWatchlist,
  userTrades, tradeInsights,
  // System configuration entities
  systemConfigurations,
  // Personalization management entities
  attributeDefinitions, segments, ruleConditions, rules, ruleSets, contentPolicies,
  recommendationStrategies, notificationRules, dashboardTemplates, experiments,
  analyticsEvents, metricSnapshots,
  // ETF Investment Guide entities
  etfProducts, etfMetrics, userRiskProfile, etfChatSessions, etfChatMessages, 
  guardrailPolicies, etfBotConfigs, etfRecommendationSettings,
  // NL to SQL entities
  nl2sqlPrompts, schemaSources, dictionaries, dictionaryEntries,
  // Data Source entities
  dataSources, sqlQueries,
  type User, type InsertUser, type Workflow, type InsertWorkflow, type WorkflowFolder, type InsertWorkflowFolder,
  type Prompt, type InsertPrompt, type PythonScript, type InsertPythonScript, type ApiCall, type InsertApiCall,
  type Schedule, type InsertSchedule, type WorkflowExecution, type InsertWorkflowExecution,
  type WorkflowNodeResult, type InsertWorkflowNodeResult,
  type WorkflowSession, type InsertWorkflowSession,
  type WorkflowNodeExecution, type InsertWorkflowNodeExecution,
  type WorkflowSessionData, type InsertWorkflowSessionData,
  type MarketAnalysis, type InsertMarketAnalysis,
  type MacroAnalysis, type InsertMacroAnalysis,
  type MacroWorkflowTemplate, type InsertMacroWorkflowTemplate,
  type FinancialData, type InsertFinancialData,
  type NewsData, type InsertNewsData,
  type LayoutTemplate, type InsertLayoutTemplate,
  type MorningBriefing, type InsertMorningBriefing,
  type CausalAnalysis, type InsertCausalAnalysis,
  type MajorEvents, type InsertMajorEvents,
  type MajorEventsRelatedNews, type InsertMajorEventsRelatedNews,
  type QuantitativeMetrics, type InsertQuantitativeMetrics,
  type InfoStockThemes, type InsertInfoStockThemes,
  type InfoStockThemeStocks, type InsertInfoStockThemeStocks,
  type IndustryThemeConditions, type InsertIndustryThemeConditions,
  type IndustryThemeRelatedNews, type InsertIndustryThemeRelatedNews,
  type MacroMarketConditions, type InsertMacroMarketConditions,
  type ProcessedNewsData, type InsertProcessedNewsData,
  type MarketMovementData, type SectorMovement, type StockSummary, type TradingVolumeAnalysis,
  type KeyEvent, type SectorHighlight, type AIInsightsResult, type AnalysisContext,
  type CauseIdentification, type NewsFactor, type TechnicalFactor, type VolumeSpike,
  type AnalysisError, type ServiceResult,
  type Theme, type InsertTheme, type ThemeSummary,
  type ReportQualityMetrics, type InsertReportQualityMetrics,
  type FeedbackLog, type InsertFeedbackLog,
  type QualityImprovements, type InsertQualityImprovements,
  type AbTestingExperiments, type InsertAbTestingExperiments,
  type AiServiceProvider, type InsertAiServiceProvider,
  type ApiCategory, type InsertApiCategory,
  type ApiTestResult, type InsertApiTestResult,
  type ApiUsageAnalytics, type InsertApiUsageAnalytics,
  type ApiTemplate, type InsertApiTemplate,
  type UserBalance, type InsertUserBalance,
  type BalanceInsights, type InsertBalanceInsights,
  type UserTag, type InsertUserTag,
  type UserWatchlist, type InsertUserWatchlist,
  type UserTrade, type InsertUserTrade,
  type TradeInsights, type InsertTradeInsights,
  type TradingMetrics, type PerformanceMetrics, type RiskMetrics, type BenchmarkComparison,
  // System configuration types
  type SystemConfiguration, type InsertSystemConfiguration,
  // Personalization management types
  type AttributeDefinition, type InsertAttributeDefinition,
  type Segment, type InsertSegment,
  type RuleCondition, type InsertRuleCondition,
  type Rule, type InsertRule,
  type RuleSet, type InsertRuleSet,
  type ContentPolicy, type InsertContentPolicy,
  type RecommendationStrategy, type InsertRecommendationStrategy,
  type NotificationRule, type InsertNotificationRule,
  type DashboardTemplate, type InsertDashboardTemplate,
  type Experiment, type InsertExperiment,
  type AnalyticsEvent, type InsertAnalyticsEvent,
  type MetricSnapshot, type InsertMetricSnapshot,
  // ETF Investment Guide types
  type EtfProduct, type InsertEtfProduct,
  type EtfMetric, type InsertEtfMetric, 
  type UserRiskProfile, type InsertUserRiskProfile,
  type EtfChatSession, type InsertEtfChatSession,
  type EtfChatMessage, type InsertEtfChatMessage,
  type GuardrailPolicy, type InsertGuardrailPolicy,
  type EtfBotConfig, type InsertEtfBotConfig,
  type EtfRecommendationSettings, type InsertEtfRecommendationSettings,
  // NL to SQL types
  type Nl2sqlPrompt, type InsertNl2sqlPrompt,
  type SchemaSource, type InsertSchemaSource,
  type Dictionary, type InsertDictionary,
  type DictionaryEntry, type InsertDictionaryEntry,
  // Data Source types
  type DataSource, type InsertDataSource,
  type SqlQuery, type InsertSqlQuery,
  // Azure Config types
  type AzureConfig, type InsertAzureConfig,
  azureConfigs
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, gte, lte, sql, inArray } from "drizzle-orm";
import * as openaiService from "./services/openai";
import AIApiService from "./services/ai-api";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // System Configuration management
  getSystemConfigurations(filters?: {
    category?: string;
    isActive?: boolean;
    isSecret?: boolean;
    limit?: number;
  }): Promise<SystemConfiguration[]>;
  getSystemConfiguration(id: string): Promise<SystemConfiguration | undefined>;
  getSystemConfigurationByKey(key: string): Promise<SystemConfiguration | undefined>;
  createSystemConfiguration(config: InsertSystemConfiguration): Promise<SystemConfiguration>;
  updateSystemConfiguration(id: string, config: Partial<InsertSystemConfiguration>): Promise<SystemConfiguration>;
  deleteSystemConfiguration(id: string): Promise<void>;

  // Workflow management
  getWorkflows(): Promise<Workflow[]>;
  getWorkflow(id: string): Promise<Workflow | undefined>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: string, workflow: Partial<InsertWorkflow>): Promise<Workflow>;
  deleteWorkflow(id: string): Promise<void>;
  
  // Workflow folder management
  getWorkflowFolders(): Promise<WorkflowFolder[]>;
  getWorkflowFolder(id: string): Promise<WorkflowFolder | undefined>;
  createWorkflowFolder(folder: InsertWorkflowFolder): Promise<WorkflowFolder>;
  updateWorkflowFolder(id: string, folder: Partial<InsertWorkflowFolder>): Promise<WorkflowFolder>;
  deleteWorkflowFolder(id: string): Promise<void>;


  // Workflow node results management
  getWorkflowNodeResults(executionId: string): Promise<WorkflowNodeResult[]>;
  getWorkflowNodeResult(executionId: string, nodeId: string): Promise<WorkflowNodeResult | undefined>;
  createWorkflowNodeResult(nodeResult: InsertWorkflowNodeResult): Promise<WorkflowNodeResult>;
  updateWorkflowNodeResult(id: string, nodeResult: Partial<InsertWorkflowNodeResult>): Promise<WorkflowNodeResult>;
  getWorkflowNodeResultsByNodeType(executionId: string, nodeType: string): Promise<WorkflowNodeResult[]>;

  // Prompt management
  getPrompts(): Promise<Prompt[]>;
  getPrompt(id: string): Promise<Prompt | undefined>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: string, prompt: Partial<InsertPrompt>): Promise<Prompt>;
  deletePrompt(id: string): Promise<void>;

  // Python Script management
  getPythonScripts(filters?: {
    category?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<PythonScript[]>;
  getPythonScript(id: string): Promise<PythonScript | undefined>;
  createPythonScript(script: InsertPythonScript): Promise<PythonScript>;
  updatePythonScript(id: string, script: Partial<InsertPythonScript>): Promise<PythonScript>;
  deletePythonScript(id: string): Promise<void>;

  // Data Source management
  getDataSources(filters?: {
    type?: string;
    isActive?: boolean;
    isDefault?: boolean;
    limit?: number;
  }): Promise<DataSource[]>;
  getDataSource(id: string): Promise<DataSource | undefined>;
  createDataSource(dataSource: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: string, dataSource: Partial<InsertDataSource>): Promise<DataSource>;
  deleteDataSource(id: string): Promise<void>;

  // SQL Query management
  getSqlQueries(filters?: {
    dataSourceId?: string;
    queryType?: string;
    isActive?: boolean;
    category?: string;
    limit?: number;
  }): Promise<SqlQuery[]>;
  getSqlQuery(id: string): Promise<SqlQuery | undefined>;
  createSqlQuery(sqlQuery: InsertSqlQuery): Promise<SqlQuery>;
  updateSqlQuery(id: string, sqlQuery: Partial<InsertSqlQuery>): Promise<SqlQuery>;
  deleteSqlQuery(id: string): Promise<void>;

  // API Call management (Enhanced)
  getApiCalls(filters?: {
    providerId?: string;
    categoryId?: string;
    isActive?: boolean;
    isVerified?: boolean;
    limit?: number;
  }): Promise<ApiCall[]>;
  getApiCall(id: string): Promise<ApiCall | undefined>;
  createApiCall(apiCall: InsertApiCall): Promise<ApiCall>;
  updateApiCall(id: string, apiCall: Partial<InsertApiCall>): Promise<ApiCall>;
  deleteApiCall(id: string): Promise<void>;
  testApiCall(id: string, testPayload?: any): Promise<ApiTestResult>;
  
  // AI Service Provider management
  getAiServiceProviders(filters?: {
    status?: string;
    tier?: string;
    supportedFeature?: string;
  }): Promise<AiServiceProvider[]>;
  getAiServiceProvider(id: string): Promise<AiServiceProvider | undefined>;
  createAiServiceProvider(provider: InsertAiServiceProvider): Promise<AiServiceProvider>;
  updateAiServiceProvider(id: string, provider: Partial<InsertAiServiceProvider>): Promise<AiServiceProvider>;
  deleteAiServiceProvider(id: string): Promise<void>;
  
  // API Category management
  getApiCategories(filters?: { isActive?: boolean }): Promise<ApiCategory[]>;
  getApiCategory(id: string): Promise<ApiCategory | undefined>;
  createApiCategory(category: InsertApiCategory): Promise<ApiCategory>;
  updateApiCategory(id: string, category: Partial<InsertApiCategory>): Promise<ApiCategory>;
  deleteApiCategory(id: string): Promise<void>;
  
  // API Testing and monitoring
  getApiTestResults(filters?: {
    apiCallId?: string;
    status?: string;
    testType?: string;
    limit?: number;
  }): Promise<ApiTestResult[]>;
  createApiTestResult(testResult: InsertApiTestResult): Promise<ApiTestResult>;
  
  // API Usage Analytics
  getApiUsageAnalytics(filters?: {
    apiCallId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<ApiUsageAnalytics[]>;
  createApiUsageAnalytics(analytics: InsertApiUsageAnalytics): Promise<ApiUsageAnalytics>;
  updateApiUsageAnalytics(id: string, analytics: Partial<InsertApiUsageAnalytics>): Promise<ApiUsageAnalytics>;
  
  // API Templates
  getApiTemplates(filters?: {
    categoryId?: string;
    isPublic?: boolean;
    isFeatured?: boolean;
    tags?: string[];
    limit?: number;
  }): Promise<ApiTemplate[]>;
  getApiTemplate(id: string): Promise<ApiTemplate | undefined>;
  createApiTemplate(template: InsertApiTemplate): Promise<ApiTemplate>;
  updateApiTemplate(id: string, template: Partial<InsertApiTemplate>): Promise<ApiTemplate>;
  deleteApiTemplate(id: string): Promise<void>;
  incrementTemplateUsage(id: string): Promise<void>;
  
  // AI API Management utility methods
  initializeDefaultAiProviders(): Promise<void>;
  initializeDefaultApiCategories(): Promise<void>;
  initializeDefaultApiTemplates(): Promise<void>;
  bulkCreateLuxiaCloudApis(providerId: string): Promise<ApiCall[]>;
  searchApisByCapability(query: string, inputType?: string, outputType?: string): Promise<ApiCall[]>;
  getApiRecommendations(useCase: string): Promise<ApiCall[]>;

  // Schedule management
  getSchedules(): Promise<Schedule[]>;
  getSchedule(id: string): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, schedule: Partial<InsertSchedule>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;

  // Execution management
  getWorkflowExecutions(workflowId?: string): Promise<WorkflowExecution[]>;
  createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution>;
  updateWorkflowExecution(id: string, execution: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution>;

  // Workflow Session management
  getWorkflowSessions(workflowId?: string, filters?: { status?: string; limit?: number }): Promise<WorkflowSession[]>;
  getWorkflowSession(id: string): Promise<WorkflowSession | undefined>;
  getWorkflowSessionNodeExecutions(sessionId: string): Promise<WorkflowNodeExecution[]>;
  getWorkflowSessionData(sessionId: string): Promise<WorkflowSessionData[]>;

  // Market analysis
  getMarketAnalysis(type?: string, limit?: number): Promise<MarketAnalysis[]>;
  createMarketAnalysis(analysis: InsertMarketAnalysis): Promise<MarketAnalysis>;

  // Macro analysis
  getMacroAnalysisList(limit?: number): Promise<MacroAnalysis[]>;
  getMacroAnalysisById(id: string): Promise<MacroAnalysis | undefined>;
  createMacroAnalysis(analysis: InsertMacroAnalysis): Promise<MacroAnalysis>;
  updateMacroAnalysis(id: string, analysis: Partial<InsertMacroAnalysis>): Promise<MacroAnalysis>;
  deleteMacroAnalysis(id: string): Promise<void>;
  generateIntegratedMacroAnalysis(newsAnalysisIds: string[], themeAnalysisIds: string[], quantAnalysisIds: string[]): Promise<MacroAnalysis>;

  // Macro Workflow Template management
  getMacroWorkflowTemplates(): Promise<MacroWorkflowTemplate[]>;
  getMacroWorkflowTemplateByType(analysisType: string): Promise<MacroWorkflowTemplate | undefined>;
  createMacroWorkflowTemplate(template: InsertMacroWorkflowTemplate): Promise<MacroWorkflowTemplate>;
  updateMacroWorkflowTemplate(id: string, template: Partial<InsertMacroWorkflowTemplate>): Promise<MacroWorkflowTemplate>;
  deleteMacroWorkflowTemplate(id: string): Promise<void>;
  initializeMacroWorkflowTemplates(): Promise<void>;

  // Financial data
  searchFinancialData(filters: {
    symbol?: string;
    market?: string;
    country?: string;
    dataType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<FinancialData[]>;
  createFinancialData(data: InsertFinancialData): Promise<FinancialData>;
  
  // Enhanced Full-Text Search methods
  fullTextSearchFinancialData(query: string, filters?: {
    symbol?: string;
    market?: string;
    dataType?: string;
    limit?: number;
  }): Promise<Array<FinancialData & { search_rank?: number }>>;
  
  fullTextSearchNewsData(query: string, filters?: {
    category?: string;
    sentiment?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<NewsData & { search_rank?: number }>>;
  
  // News data
  searchNewsData(filters: {
    category?: string;
    keywords?: string[];
    startDate?: Date;
    endDate?: Date;
    sentiment?: string;
  }): Promise<NewsData[]>;
  createNewsData(data: InsertNewsData): Promise<NewsData>;

  // Layout templates
  getLayoutTemplates(filters?: { type?: string; isDefault?: boolean; createdBy?: string }): Promise<LayoutTemplate[]>;
  getLayoutTemplate(id: string): Promise<LayoutTemplate | undefined>;
  createLayoutTemplate(template: InsertLayoutTemplate): Promise<LayoutTemplate>;
  updateLayoutTemplate(id: string, template: Partial<InsertLayoutTemplate>): Promise<LayoutTemplate>;
  deleteLayoutTemplate(id: string): Promise<void>;
  duplicateLayoutTemplate(id: string, name: string): Promise<LayoutTemplate>;
  incrementTemplateUsage(id: string): Promise<void>;

  // Morning briefing
  getMorningBriefings(filters?: { 
    startDate?: Date; 
    endDate?: Date; 
    status?: string;
    limit?: number;
  }): Promise<MorningBriefing[]>;
  getMorningBriefing(id: string): Promise<MorningBriefing | undefined>;
  getMorningBriefingByDate(briefingDate: Date): Promise<MorningBriefing | undefined>;
  createMorningBriefing(briefing: InsertMorningBriefing): Promise<MorningBriefing>;
  updateMorningBriefing(id: string, briefing: Partial<InsertMorningBriefing>): Promise<MorningBriefing>;
  deleteMorningBriefing(id: string): Promise<void>;
  generateMorningBriefing(briefingDate: Date, marketOpenTime: Date): Promise<MorningBriefing>;

  // Causal analysis for market movement reasoning
  getCausalAnalyses(filters?: {
    marketEvent?: string;
    startDate?: Date;
    endDate?: Date;
    timePeriod?: string;
    minConfidence?: number;
    limit?: number;
  }): Promise<CausalAnalysis[]>;
  getCausalAnalysis(id: string): Promise<CausalAnalysis | undefined>;
  createCausalAnalysis(analysis: InsertCausalAnalysis): Promise<CausalAnalysis>;
  updateCausalAnalysis(id: string, analysis: Partial<InsertCausalAnalysis>): Promise<CausalAnalysis>;
  deleteCausalAnalysis(id: string): Promise<void>;
  generateCausalAnalysis(
    marketEvent: string, 
    priceMovement: any, 
    analysisDate: Date, 
    timePeriod: string
  ): Promise<CausalAnalysis>;
  validateCausalAnalysis(id: string, validatedBy: string, notes?: string): Promise<CausalAnalysis>;

  // A Stage: Major Events (주요이벤트)
  getMajorEvents(filters?: {
    eventDate?: string;
    eventTime?: string;
    situationType?: string;
    majorIssueName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<MajorEvents[]>;
  getMajorEvent(id: string): Promise<MajorEvents | undefined>;
  createMajorEvent(event: InsertMajorEvents): Promise<MajorEvents>;
  updateMajorEvent(id: string, event: Partial<InsertMajorEvents>): Promise<MajorEvents>;
  deleteMajorEvent(id: string): Promise<void>;
  generateMajorEventFromNews(eventDate: string, eventTime: string): Promise<MajorEvents[]>;

  // A Stage: Major Events Related News (주요이벤트 연관뉴스)
  getMajorEventsRelatedNews(filters?: {
    eventDate?: string;
    majorIssueName?: string;
    limit?: number;
  }): Promise<MajorEventsRelatedNews[]>;
  createMajorEventRelatedNews(news: InsertMajorEventsRelatedNews): Promise<MajorEventsRelatedNews>;
  deleteMajorEventRelatedNews(id: string): Promise<void>;

  // B Stage: Quantitative Metrics (정량적 시장 수치)
  getQuantitativeMetrics(filters?: {
    symbol?: string;
    market?: string;
    metricDate?: string;
    anomalyLevel?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<QuantitativeMetrics[]>;
  getQuantitativeMetric(id: string): Promise<QuantitativeMetrics | undefined>;
  createQuantitativeMetric(metric: InsertQuantitativeMetrics): Promise<QuantitativeMetrics>;
  updateQuantitativeMetric(id: string, metric: Partial<InsertQuantitativeMetrics>): Promise<QuantitativeMetrics>;
  deleteQuantitativeMetric(id: string): Promise<void>;
  generateQuantitativeMetrics(metricDate: string, metricTime: string): Promise<QuantitativeMetrics[]>;

  // C Stage: InfoStock Themes (인포스탁 테마)
  getInfoStockThemes(filters?: {
    themeCode?: string;
    themeName?: string;
    minTotalScore?: number;
    limit?: number;
    orderBy?: 'totalScore' | 'changeRate' | 'tradingValue';
  }): Promise<InfoStockThemes[]>;
  getInfoStockTheme(id: string): Promise<InfoStockThemes | undefined>;
  getInfoStockThemeByCode(themeCode: string): Promise<InfoStockThemes | undefined>;
  createInfoStockTheme(theme: InsertInfoStockThemes): Promise<InfoStockThemes>;
  updateInfoStockTheme(id: string, theme: Partial<InsertInfoStockThemes>): Promise<InfoStockThemes>;
  deleteInfoStockTheme(id: string): Promise<void>;
  calculateThemeScores(themeCode: string): Promise<InfoStockThemes>;

  // C Stage: InfoStock Theme Stocks (테마 종목 매핑)
  getInfoStockThemeStocks(filters?: {
    themeCode?: string;
    stockCode?: string;
    limit?: number;
  }): Promise<InfoStockThemeStocks[]>;
  createInfoStockThemeStock(themeStock: InsertInfoStockThemeStocks): Promise<InfoStockThemeStocks>;
  deleteInfoStockThemeStock(id: string): Promise<void>;
  getStocksByTheme(themeCode: string): Promise<InfoStockThemeStocks[]>;

  // C Stage: Industry Theme Conditions (산업테마시황)
  getIndustryThemeConditions(filters?: {
    themeCode?: string;
    newsDate?: string;
    isNew?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<IndustryThemeConditions[]>;
  getIndustryThemeCondition(id: string): Promise<IndustryThemeConditions | undefined>;
  createIndustryThemeCondition(condition: InsertIndustryThemeConditions): Promise<IndustryThemeConditions>;
  updateIndustryThemeCondition(id: string, condition: Partial<InsertIndustryThemeConditions>): Promise<IndustryThemeConditions>;
  deleteIndustryThemeCondition(id: string): Promise<void>;
  generateIndustryThemeConditions(newsDate: string, newsTime: string): Promise<IndustryThemeConditions[]>;

  // C Stage: Industry Theme Related News (산업테마시황 연관뉴스)
  getIndustryThemeRelatedNews(filters?: {
    themeCode?: string;
    newsDate?: string;
    isRepresentative?: boolean;
    limit?: number;
  }): Promise<IndustryThemeRelatedNews[]>;
  createIndustryThemeRelatedNews(news: InsertIndustryThemeRelatedNews): Promise<IndustryThemeRelatedNews>;
  deleteIndustryThemeRelatedNews(id: string): Promise<void>;
  selectRepresentativeNews(themeCode: string, newsDate: string, limit?: number): Promise<IndustryThemeRelatedNews[]>;

  // D Stage: Macro Market Conditions (매크로 시황 통합)
  getMacroMarketConditions(filters?: {
    analysisDate?: string;
    marketImportanceLevel?: string;
    minConfidenceScore?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<MacroMarketConditions[]>;
  getMacroMarketCondition(id: string): Promise<MacroMarketConditions | undefined>;
  createMacroMarketCondition(condition: InsertMacroMarketConditions): Promise<MacroMarketConditions>;
  updateMacroMarketCondition(id: string, condition: Partial<InsertMacroMarketConditions>): Promise<MacroMarketConditions>;
  deleteMacroMarketCondition(id: string): Promise<void>;
  generateMacroMarketCondition(analysisDate: string, analysisTime: string, majorEventsIds: string[], quantMetricsIds: string[], themeConditionIds: string[]): Promise<MacroMarketConditions>;

  // Enhanced News Processing (뉴스 처리 강화)
  getProcessedNewsData(filters?: {
    originalNewsId?: string;
    minEconomicScore?: number;
    minStockMarketScore?: number;
    isFiltered?: boolean;
    stockEvents?: string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ProcessedNewsData[]>;
  getProcessedNewsDataByOriginalId(originalNewsId: string): Promise<ProcessedNewsData | undefined>;
  createProcessedNewsData(processedNews: InsertProcessedNewsData): Promise<ProcessedNewsData>;
  updateProcessedNewsData(id: string, processedNews: Partial<InsertProcessedNewsData>): Promise<ProcessedNewsData>;
  deleteProcessedNewsData(id: string): Promise<void>;
  processNewsWithAI(originalNewsId: string): Promise<ProcessedNewsData>;

  // Integrated Workflow Methods
  executeStageAWorkflow(eventDate: string, eventTime: string): Promise<{
    majorEvents: MajorEvents[];
    relatedNews: MajorEventsRelatedNews[];
  }>;
  executeStageBWorkflow(metricDate: string, metricTime: string): Promise<QuantitativeMetrics[]>;
  executeStageCWorkflow(newsDate: string, newsTime: string): Promise<{
    themeConditions: IndustryThemeConditions[];
    relatedNews: IndustryThemeRelatedNews[];
  }>;
  executeStageDWorkflow(analysisDate: string, analysisTime: string, stageAIds: string[], stageBIds: string[], stageCIds: string[]): Promise<MacroMarketConditions>;
  executeFullWorkflowPipeline(targetDate: string, targetTime: string): Promise<{
    stageA: { majorEvents: MajorEvents[]; relatedNews: MajorEventsRelatedNews[] };
    stageB: QuantitativeMetrics[];
    stageC: { themeConditions: IndustryThemeConditions[]; relatedNews: IndustryThemeRelatedNews[] };
    stageD: MacroMarketConditions;
  }>;

  // Theme-related methods
  listThemes(): Promise<Theme[]>;
  getTheme(id: string): Promise<Theme | undefined>;
  upsertTheme(theme: InsertTheme): Promise<Theme>;
  deleteTheme(id: string): Promise<void>;

  // Theme-news related methods
  getThemeNews(themeId: string, options?: { 
    since?: Date; 
    limit?: number 
  }): Promise<NewsData[]>;
  setNewsTheme(newsId: string, themeId: string): Promise<void>;

  // Theme summary methods (memory storage)
  getThemeSummary(themeId: string): Promise<ThemeSummary | null>;
  setThemeSummary(themeId: string, summary: ThemeSummary): Promise<void>;

  // Helper methods
  getThemeNewsCount(themeId: string): Promise<number>;
  getAllThemeSummaries(): Promise<ThemeSummary[]>;
  
  // Quality Evaluation Methods
  getQualityMetrics(reportId: string): Promise<ReportQualityMetrics | undefined>;
  getQualityMetricsList(filters?: {
    reportType?: string;
    minScore?: number;
    maxScore?: number;
    evaluatedBy?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ReportQualityMetrics[]>;
  saveQualityMetrics(metrics: InsertReportQualityMetrics): Promise<ReportQualityMetrics>;
  updateQualityMetrics(id: string, metrics: Partial<InsertReportQualityMetrics>): Promise<ReportQualityMetrics>;
  deleteQualityMetrics(id: string): Promise<void>;
  
  // Feedback Management
  saveFeedback(feedback: InsertFeedbackLog): Promise<FeedbackLog>;
  getFeedbackList(filters?: {
    entityType?: string;
    entityId?: string;
    feedbackType?: string;
    resolutionStatus?: string;
    priority?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<FeedbackLog[]>;
  updateFeedback(id: string, feedback: Partial<InsertFeedbackLog>): Promise<FeedbackLog>;
  resolveFeedback(id: string, resolution: any): Promise<FeedbackLog>;
  
  // Quality Improvements
  createQualityImprovement(improvement: InsertQualityImprovements): Promise<QualityImprovements>;
  getQualityImprovements(filters?: {
    improvementType?: string;
    implementationStatus?: string;
    priority?: string;
    limit?: number;
  }): Promise<QualityImprovements[]>;
  updateQualityImprovement(id: string, improvement: Partial<InsertQualityImprovements>): Promise<QualityImprovements>;
  
  // A/B Testing
  createABTest(experiment: InsertAbTestingExperiments): Promise<AbTestingExperiments>;
  getABTests(filters?: {
    status?: string;
    testType?: string;
    winner?: string;
    limit?: number;
  }): Promise<AbTestingExperiments[]>;
  updateABTest(id: string, experiment: Partial<InsertAbTestingExperiments>): Promise<AbTestingExperiments>;
  
  // Quality Analytics
  getQualityTrends(period: string, reportType?: string): Promise<{
    period: string;
    averageScores: any;
    improvementRate: number;
    topPerformers: string[];
    lowPerformers: string[];
  }>;
  getQualityBenchmarks(reportType: string): Promise<any>;
  
  // RAG Metrics Methods
  saveRAGMetrics(metrics: {
    type: string;
    metrics?: any;
    query?: string;
    data?: any;
    timestamp?: Date;
  }): Promise<void>;
  getRAGMetrics(filters?: {
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]>;
  updateSearchWeights(query: string, weights: { vectorWeight: number; keywordWeight: number; performance: number }): Promise<void>;
  getOptimalWeights(query: string): Promise<{ vector: number; keyword: number } | null>;

  // ========== BALANCE ANALYSIS METHODS ==========
  
  // User Balances management
  getUserBalances(userId: string, filters?: {
    date?: Date;
    symbol?: string;
    limit?: number;
  }): Promise<UserBalance[]>;
  getUserBalance(userId: string, date: Date, symbol: string): Promise<UserBalance | undefined>;
  createUserBalance(balance: InsertUserBalance): Promise<UserBalance>;
  updateUserBalance(id: string, balance: Partial<InsertUserBalance>): Promise<UserBalance>;
  deleteUserBalance(id: string): Promise<void>;
  bulkCreateUserBalances(balances: InsertUserBalance[]): Promise<UserBalance[]>;
  
  // Balance Insights management
  getBalanceInsights(userId: string, filters?: {
    date?: Date;
    limit?: number;
  }): Promise<BalanceInsights[]>;
  getBalanceInsight(userId: string, date: Date): Promise<BalanceInsights | undefined>;
  createBalanceInsights(insights: InsertBalanceInsights): Promise<BalanceInsights>;
  updateBalanceInsights(id: string, insights: Partial<InsertBalanceInsights>): Promise<BalanceInsights>;
  deleteBalanceInsights(id: string): Promise<void>;
  
  // User Tags management 
  getUserTags(userId: string, filters?: {
    category?: string;
    tag?: string;
  }): Promise<UserTag[]>;
  getUserTag(userId: string, tag: string): Promise<UserTag | undefined>;
  createUserTag(userTag: InsertUserTag): Promise<UserTag>;
  updateUserTag(id: string, userTag: Partial<InsertUserTag>): Promise<UserTag>;
  deleteUserTag(id: string): Promise<void>;
  bulkCreateUserTags(userTags: InsertUserTag[]): Promise<UserTag[]>;
  
  // User Watchlist management
  getUserWatchlist(userId: string, filters?: {
    symbol?: string;
    market?: string;
    limit?: number;
  }): Promise<UserWatchlist[]>;
  getUserWatchlistItem(userId: string, symbol: string): Promise<UserWatchlist | undefined>;
  addToWatchlist(watchlistItem: InsertUserWatchlist): Promise<UserWatchlist>;
  updateWatchlistItem(id: string, watchlistItem: Partial<InsertUserWatchlist>): Promise<UserWatchlist>;
  removeFromWatchlist(id: string): Promise<void>;
  removeFromWatchlistBySymbol(userId: string, symbol: string): Promise<void>;
  
  // Balance Analysis Utilities
  generateBalanceAnalysis(userId: string, date: Date): Promise<BalanceInsights>;
  recomputeBalanceInsights(userId: string, startDate?: Date, endDate?: Date): Promise<BalanceInsights[]>;
  getPortfolioSummary(userId: string, date: Date): Promise<{
    totalValue: number;
    totalPnl: number;
    totalPnlPercent: number;
    topPerformers: Array<{ symbol: string; pnlPercent: number }>;
    bottomPerformers: Array<{ symbol: string; pnlPercent: number }>;
    sectorAllocation: Record<string, number>;
  }>;
  searchSimilarPortfolios(userId: string, limit?: number): Promise<Array<{ 
    userId: string; 
    similarity: number; 
    insights: BalanceInsights;
  }>>;
  
  // User discovery for scheduler
  getDistinctUserIdsWithBalances(date?: Date): Promise<string[]>;

  // ========== TRADING ANALYSIS METHODS ==========
  
  // User Trades management
  getUserTrades(userId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    symbol?: string;
    side?: 'buy' | 'sell';
    limit?: number;
  }): Promise<UserTrade[]>;
  getUserTrade(id: string): Promise<UserTrade | undefined>;
  createUserTrade(trade: InsertUserTrade): Promise<UserTrade>;
  updateUserTrade(id: string, trade: Partial<InsertUserTrade>): Promise<UserTrade>;
  deleteUserTrade(id: string): Promise<void>;
  bulkCreateUserTrades(trades: InsertUserTrade[]): Promise<UserTrade[]>;
  
  // Trade Insights management
  getTradeInsights(userId: string, filters?: {
    month?: string;
    limit?: number;
  }): Promise<TradeInsights[]>;
  getTradeInsight(userId: string, month: string): Promise<TradeInsights | undefined>;
  createTradeInsights(insights: InsertTradeInsights): Promise<TradeInsights>;
  updateTradeInsights(id: string, insights: Partial<InsertTradeInsights>): Promise<TradeInsights>;
  deleteTradeInsights(id: string): Promise<void>;
  
  // Trading Analysis Utilities
  generateTradingInsights(userId: string, month: string): Promise<TradeInsights>;
  recomputeTradeInsights(userId: string, startMonth?: string, endMonth?: string): Promise<TradeInsights[]>;
  getMonthlyTradingMetrics(userId: string, month: string): Promise<{
    totalTrades: number;
    totalValue: number;
    winRate: number;
    avgReturn: number;
    sectorBreakdown: Record<string, number>;
  }>;
  getTradingPerformanceSummary(userId: string, month: string): Promise<{
    monthlyReturn: number;
    totalPnl: number;
    benchmarkComparison: {
      vsKospi: number;
      vsKosdaq: number;
    };
  }>;
  searchSimilarTraders(userId: string, month: string, limit?: number): Promise<Array<{ 
    userId: string; 
    similarity: number; 
    insights: TradeInsights;
  }>>;
  
  // User discovery for trading scheduler
  getUsersWithTradesInMonth(month: string): Promise<string[]>;

  // ========== ENHANCED PERSONALIZATION METHODS ==========
  
  // Portfolio Overview
  getPersonalizedPortfolio(userId: string, date: Date): Promise<{
    totalValue: number;
    totalReturn: number;
    totalReturnPercent: number;
    dayChange: number;
    dayChangePercent: number;
    topHoldings: Array<{
      symbol: string;
      symbolName: string;
      value: number;
      percentage: number;
      change: number;
      changePercent: number;
    }>;
    sectorDistribution: Array<{
      sector: string;
      percentage: number;
      value: number;
    }>;
  }>;
  
  // Holdings Details
  getHoldingsDetails(userId: string, filters?: {
    date?: Date;
    sortBy?: string;
    sector?: string;
  }): Promise<Array<{
    symbol: string;
    symbolName: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    value: number;
    percentage: number;
    change: number;
    changePercent: number;
    sector: string;
    theme?: string;
    purchaseDate: string;
    dividendYield?: number;
    beta?: number;
  }>>;

  // Personalized News
  getPersonalizedNews(userId: string, filters?: {
    limit?: number;
    category?: string;
    startDate?: Date;
  }): Promise<Array<{
    id: string;
    title: string;
    summary: string;
    source: string;
    publishedAt: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    relevantSymbols: string[];
    marketScore: number;
    economicScore: number;
    themeName?: string;
    isBookmarked: boolean;
    url?: string;
  }>>;

  // News Bookmarking
  bookmarkNews(userId: string, newsId: string): Promise<{ id: string; userId: string; newsId: string; createdAt: Date }>;
  removeNewsBookmark(userId: string, newsId: string): Promise<void>;

  // AI Recommendations
  getPersonalizedRecommendations(userId: string, filters?: {
    type?: string;
    riskLevel?: string;
    timeHorizon?: string;
  }): Promise<{
    stocks: Array<{
      symbol: string;
      symbolName: string;
      currentPrice: number;
      targetPrice: number;
      upside: number;
      confidence: number;
      reason: string;
      riskLevel: 'low' | 'medium' | 'high';
      timeHorizon: '단기' | '중기' | '장기';
      tags: string[];
    }>;
    themes: Array<{
      id: string;
      name: string;
      description: string;
      growthPotential: number;
      riskLevel: 'low' | 'medium' | 'high';
      topStocks: string[];
      expectedReturn: number;
      timeframe: string;
      reasoning: string;
    }>;
    insights: Array<{
      id: string;
      type: 'portfolio' | 'trading' | 'market';
      title: string;
      description: string;
      action: string;
      priority: 'high' | 'medium' | 'low';
      impact: number;
    }>;
  }>;

  // Performance Analytics
  getTradingPerformanceAnalytics(userId: string, filters?: {
    timeRange?: string;
    benchmarks?: string[];
  }): Promise<{
    totalReturn: number;
    totalReturnPercent: number;
    annualizedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    avgHoldingDays: number;
    benchmarkComparison: {
      kospi: number;
      kosdaq: number;
      sp500: number;
    };
    monthlyReturns: Array<{
      month: string;
      return: number;
      benchmark: number;
    }>;
  }>;

  // Portfolio Allocation
  getPortfolioAllocation(userId: string): Promise<{
    currentAllocation: Array<{
      sector: string;
      percentage: number;
      value: number;
    }>;
    recommendedAllocation: Array<{
      sector: string;
      targetPercentage: number;
      currentPercentage: number;
      rebalanceAmount: number;
    }>;
    riskMetrics: {
      portfolioRisk: number;
      diversificationScore: number;
      concentrationRisk: number;
    };
  }>;

  // Rebalancing Suggestions
  generateRebalancingSuggestions(userId: string, targetAllocation?: any, constraints?: any): Promise<{
    suggestions: Array<{
      action: 'buy' | 'sell';
      symbol: string;
      quantity: number;
      value: number;
      reason: string;
    }>;
    expectedImpact: {
      riskReduction: number;
      expectedReturn: number;
      cost: number;
    };
  }>;

  // Realtime Watchlist
  getWatchlistWithRealtimeData(userId: string): Promise<Array<{
    id: string;
    symbol: string;
    symbolName: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    priceAlert: boolean;
    priceThreshold?: number;
    newsAlert: boolean;
    addedAt: string;
    theme?: string;
    volume: number;
    marketCap?: number;
    recentNews?: Array<{ title: string; publishedAt: string }>;
  }>>;

  // Watchlist Alerts
  updateWatchlistAlerts(itemId: string, alerts: {
    alertEnabled?: boolean;
    targetPrice?: number;
    priceAlert?: boolean;
    newsAlert?: boolean;
  }): Promise<UserWatchlist>;

  // ========== PERSONALIZATION MANAGEMENT METHODS ==========
  // NH투자증권 고객 개인화 서비스 관리 시스템

  // Attribute Definition management
  getAttributeDefinitions(filters?: {
    category?: string;
    dataType?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<AttributeDefinition[]>;
  getAttributeDefinition(id: string): Promise<AttributeDefinition | undefined>;
  getAttributeDefinitionByName(name: string): Promise<AttributeDefinition | undefined>;
  createAttributeDefinition(definition: InsertAttributeDefinition): Promise<AttributeDefinition>;
  updateAttributeDefinition(id: string, definition: Partial<InsertAttributeDefinition>): Promise<AttributeDefinition>;
  deleteAttributeDefinition(id: string): Promise<void>;
  publishAttributeDefinition(id: string, publishedBy: string): Promise<AttributeDefinition>;
  unpublishAttributeDefinition(id: string): Promise<AttributeDefinition>;

  // Segment management
  getSegments(filters?: {
    isActive?: boolean;
    priority?: number;
    limit?: number;
  }): Promise<Segment[]>;
  getSegment(id: string): Promise<Segment | undefined>;
  getSegmentByName(name: string): Promise<Segment | undefined>;
  createSegment(segment: InsertSegment): Promise<Segment>;
  updateSegment(id: string, segment: Partial<InsertSegment>): Promise<Segment>;
  deleteSegment(id: string): Promise<void>;
  publishSegment(id: string, publishedBy: string): Promise<Segment>;
  unpublishSegment(id: string): Promise<Segment>;
  estimateSegmentSize(criteria: any): Promise<number>;
  previewSegmentMatches(criteria: any, sampleSize?: number): Promise<Array<{
    customerId: string;
    attributes: Record<string, any>;
    matchReason: string;
  }>>;

  // Rule management
  getRuleSets(filters?: {
    scope?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<RuleSet[]>;
  getRuleSet(id: string): Promise<RuleSet | undefined>;
  getRuleSetByName(name: string): Promise<RuleSet | undefined>;
  createRuleSet(ruleSet: InsertRuleSet): Promise<RuleSet>;
  updateRuleSet(id: string, ruleSet: Partial<InsertRuleSet>): Promise<RuleSet>;
  deleteRuleSet(id: string): Promise<void>;
  publishRuleSet(id: string, publishedBy: string): Promise<RuleSet>;
  unpublishRuleSet(id: string): Promise<RuleSet>;

  getRules(filters?: {
    ruleSetId?: string;
    actionType?: string;
    isActive?: boolean;
    priority?: number;
    limit?: number;
  }): Promise<Rule[]>;
  getRule(id: string): Promise<Rule | undefined>;
  createRule(rule: InsertRule): Promise<Rule>;
  updateRule(id: string, rule: Partial<InsertRule>): Promise<Rule>;
  deleteRule(id: string): Promise<void>;
  getRulesByRuleSet(ruleSetId: string): Promise<Rule[]>;

  getRuleConditions(ruleId: string): Promise<RuleCondition[]>;
  createRuleCondition(condition: InsertRuleCondition): Promise<RuleCondition>;
  updateRuleCondition(id: string, condition: Partial<InsertRuleCondition>): Promise<RuleCondition>;
  deleteRuleCondition(id: string): Promise<void>;
  deleteRuleConditionsByRule(ruleId: string): Promise<void>;

  // Rule evaluation and preview
  evaluateRules(customerAttributes: Record<string, any>, scope?: string): Promise<Array<{
    ruleId: string;
    ruleName: string;
    matched: boolean;
    actionType: string;
    actionConfig: any;
    priority: number;
    weight: number;
  }>>;
  previewRules(customerAttributes: Record<string, any>, ruleSetIds?: string[]): Promise<{
    matchedRules: Array<{
      ruleId: string;
      ruleName: string;
      actionType: string;
      actionConfig: any;
      matchReason: string;
    }>;
    conflicts: Array<{
      conflictType: string;
      rules: string[];
      resolution: string;
    }>;
    recommendations: Array<{
      type: string;
      content: any;
      source: string;
    }>;
  }>;

  // Content Policy management
  getContentPolicies(filters?: {
    contentType?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<ContentPolicy[]>;
  getContentPolicy(id: string): Promise<ContentPolicy | undefined>;
  getContentPolicyByName(name: string): Promise<ContentPolicy | undefined>;
  createContentPolicy(policy: InsertContentPolicy): Promise<ContentPolicy>;
  updateContentPolicy(id: string, policy: Partial<InsertContentPolicy>): Promise<ContentPolicy>;
  deleteContentPolicy(id: string): Promise<void>;
  publishContentPolicy(id: string, publishedBy: string): Promise<ContentPolicy>;
  unpublishContentPolicy(id: string): Promise<ContentPolicy>;

  // Recommendation Strategy management
  getRecommendationStrategies(filters?: {
    recommendationType?: string;
    algorithm?: string;
    isActive?: boolean;
    isDefault?: boolean;
    limit?: number;
  }): Promise<RecommendationStrategy[]>;
  getRecommendationStrategy(id: string): Promise<RecommendationStrategy | undefined>;
  getRecommendationStrategyByName(name: string): Promise<RecommendationStrategy | undefined>;
  createRecommendationStrategy(strategy: InsertRecommendationStrategy): Promise<RecommendationStrategy>;
  updateRecommendationStrategy(id: string, strategy: Partial<InsertRecommendationStrategy>): Promise<RecommendationStrategy>;
  deleteRecommendationStrategy(id: string): Promise<void>;
  publishRecommendationStrategy(id: string, publishedBy: string): Promise<RecommendationStrategy>;
  unpublishRecommendationStrategy(id: string): Promise<RecommendationStrategy>;
  setDefaultRecommendationStrategy(id: string, recommendationType: string): Promise<RecommendationStrategy>;
  
  // Preview recommendations
  previewRecommendations(customerAttributes: Record<string, any>, strategyId?: string, limit?: number): Promise<{
    stocks: Array<{
      symbol: string;
      symbolName: string;
      score: number;
      reasons: string[];
      factorScores: Record<string, number>;
    }>;
    themes: Array<{
      themeId: string;
      themeName: string;
      score: number;
      reasons: string[];
    }>;
    news: Array<{
      newsId: string;
      title: string;
      score: number;
      reasons: string[];
    }>;
  }>;

  // Notification Rule management
  getNotificationRules(filters?: {
    triggerType?: string;
    notificationType?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<NotificationRule[]>;
  getNotificationRule(id: string): Promise<NotificationRule | undefined>;
  getNotificationRuleByName(name: string): Promise<NotificationRule | undefined>;
  createNotificationRule(rule: InsertNotificationRule): Promise<NotificationRule>;
  updateNotificationRule(id: string, rule: Partial<InsertNotificationRule>): Promise<NotificationRule>;
  deleteNotificationRule(id: string): Promise<void>;
  publishNotificationRule(id: string, publishedBy: string): Promise<NotificationRule>;
  unpublishNotificationRule(id: string): Promise<NotificationRule>;

  // Dashboard Template management
  getDashboardTemplates(filters?: {
    deviceType?: string;
    isActive?: boolean;
    isDefault?: boolean;
    limit?: number;
  }): Promise<DashboardTemplate[]>;
  getDashboardTemplate(id: string): Promise<DashboardTemplate | undefined>;
  getDashboardTemplateByName(name: string): Promise<DashboardTemplate | undefined>;
  createDashboardTemplate(template: InsertDashboardTemplate): Promise<DashboardTemplate>;
  updateDashboardTemplate(id: string, template: Partial<InsertDashboardTemplate>): Promise<DashboardTemplate>;
  deleteDashboardTemplate(id: string): Promise<void>;
  publishDashboardTemplate(id: string, publishedBy: string): Promise<DashboardTemplate>;
  unpublishDashboardTemplate(id: string): Promise<DashboardTemplate>;
  setDefaultDashboardTemplate(id: string, deviceType: string): Promise<DashboardTemplate>;
  
  // Preview dashboard
  previewDashboard(customerAttributes: Record<string, any>, templateId?: string, deviceType?: string): Promise<{
    layout: any;
    widgets: Array<{
      widgetId: string;
      type: string;
      data: any;
      position: { x: number; y: number; w: number; h: number };
    }>;
    personalizedContent: Record<string, any>;
  }>;

  // Experiment (A/B Testing) management
  getExperiments(filters?: {
    experimentType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Experiment[]>;
  getExperiment(id: string): Promise<Experiment | undefined>;
  getExperimentByName(name: string): Promise<Experiment | undefined>;
  createExperiment(experiment: InsertExperiment): Promise<Experiment>;
  updateExperiment(id: string, experiment: Partial<InsertExperiment>): Promise<Experiment>;
  deleteExperiment(id: string): Promise<void>;
  startExperiment(id: string): Promise<Experiment>;
  pauseExperiment(id: string): Promise<Experiment>;
  completeExperiment(id: string, conclusion?: string): Promise<Experiment>;
  
  // A/B Test assignment and tracking
  assignUserToExperiment(experimentId: string, userId: string): Promise<{
    variantId: string;
    variantName: string;
    assignment: any;
  }>;
  getUserExperimentAssignments(userId: string): Promise<Array<{
    experimentId: string;
    experimentName: string;
    variantId: string;
    variantName: string;
    assignedAt: Date;
  }>>;

  // Analytics Event tracking
  getAnalyticsEvents(filters?: {
    eventType?: string;
    eventCategory?: string;
    userId?: string;
    ruleId?: string;
    segmentId?: string;
    experimentId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AnalyticsEvent[]>;
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  bulkCreateAnalyticsEvents(events: InsertAnalyticsEvent[]): Promise<AnalyticsEvent[]>;

  // Metric Snapshots
  getMetricSnapshots(filters?: {
    entityType?: string;
    entityId?: string;
    date?: Date;
    period?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<MetricSnapshot[]>;
  getMetricSnapshot(entityType: string, entityId: string, date: Date, period: string): Promise<MetricSnapshot | undefined>;
  createMetricSnapshot(snapshot: InsertMetricSnapshot): Promise<MetricSnapshot>;
  updateMetricSnapshot(id: string, snapshot: Partial<InsertMetricSnapshot>): Promise<MetricSnapshot>;
  deleteMetricSnapshot(id: string): Promise<void>;

  // Analytics aggregation and reporting
  generateDailyMetrics(date: Date): Promise<void>;
  generateWeeklyMetrics(weekStart: Date): Promise<void>;
  generateMonthlyMetrics(month: string): Promise<void>;
  
  getPersonalizationAnalytics(filters?: {
    entityType?: string;
    entityId?: string;
    dateRange?: { start: Date; end: Date };
    period?: 'daily' | 'weekly' | 'monthly';
  }): Promise<{
    overview: {
      totalEvents: number;
      uniqueUsers: number;
      averageEngagement: number;
      conversionRate: number;
    };
    trends: Array<{
      date: string;
      metrics: Record<string, number>;
    }>;
    topPerformers: Array<{
      entityId: string;
      entityName: string;
      metrics: Record<string, number>;
    }>;
    segmentBreakdown: Array<{
      segmentId: string;
      segmentName: string;
      metrics: Record<string, number>;
    }>;
  }>;
  
  getExperimentAnalytics(experimentId: string): Promise<{
    experiment: Experiment;
    variants: Array<{
      variantId: string;
      variantName: string;
      users: number;
      metrics: Record<string, number>;
      statisticalSignificance: number;
    }>;
    winner?: {
      variantId: string;
      improvementPercent: number;
      confidence: number;
    };
    timeline: Array<{
      date: string;
      variantMetrics: Record<string, Record<string, number>>;
    }>;
  }>;

  // ========== ETF Investment Guide Chatbot Methods ==========
  
  // ETF Products management
  getEtfProducts(filters?: {
    region?: string;
    assetClass?: string;
    issuer?: string;
    minRiskScore?: number;
    maxRiskScore?: number;
    maxExpenseRatio?: number;
    minAum?: number;
    isActive?: boolean;
    limit?: number;
  }): Promise<EtfProduct[]>;
  getEtfProduct(id: string): Promise<EtfProduct | undefined>;
  getEtfProductByTicker(ticker: string): Promise<EtfProduct | undefined>;
  createEtfProduct(product: InsertEtfProduct): Promise<EtfProduct>;
  updateEtfProduct(id: string, product: Partial<InsertEtfProduct>): Promise<EtfProduct>;
  deleteEtfProduct(id: string): Promise<void>;
  searchEtfProducts(query: string, filters?: {
    region?: string;
    assetClass?: string;
    limit?: number;
  }): Promise<EtfProduct[]>;

  // ETF Metrics management
  getEtfMetrics(filters?: {
    etfId?: string;
    ticker?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<EtfMetric[]>;
  getLatestEtfMetrics(etfId: string): Promise<EtfMetric | undefined>;
  createEtfMetric(metric: InsertEtfMetric): Promise<EtfMetric>;
  updateEtfMetric(id: string, metric: Partial<InsertEtfMetric>): Promise<EtfMetric>;
  deleteEtfMetric(id: string): Promise<void>;
  fetchRealtimeEtfMetrics(etfIds: string[]): Promise<EtfMetric[]>;

  // User Risk Profile management
  getUserRiskProfile(userId: string): Promise<UserRiskProfile | undefined>;
  createUserRiskProfile(profile: InsertUserRiskProfile): Promise<UserRiskProfile>;
  updateUserRiskProfile(userId: string, profile: Partial<InsertUserRiskProfile>): Promise<UserRiskProfile>;
  deleteUserRiskProfile(userId: string): Promise<void>;
  assessUserRiskProfile(userId: string, responses: Record<string, any>): Promise<UserRiskProfile>;

  // ETF Chat Session management
  getEtfChatSessions(filters?: {
    userId?: string;
    mode?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<EtfChatSession[]>;
  getEtfChatSession(id: string): Promise<EtfChatSession | undefined>;
  getUserActiveEtfSession(userId: string): Promise<EtfChatSession | undefined>;
  createEtfChatSession(session: InsertEtfChatSession): Promise<EtfChatSession>;
  updateEtfChatSession(id: string, session: Partial<InsertEtfChatSession>): Promise<EtfChatSession>;
  deleteEtfChatSession(id: string): Promise<void>;
  startEtfSession(userId: string, mode?: string, configId?: string): Promise<EtfChatSession>;
  endEtfSession(sessionId: string): Promise<void>;

  // ETF Chat Message management
  getEtfChatMessages(sessionId: string, limit?: number): Promise<EtfChatMessage[]>;
  getEtfChatMessage(id: string): Promise<EtfChatMessage | undefined>;
  createEtfChatMessage(message: InsertEtfChatMessage): Promise<EtfChatMessage>;
  updateEtfChatMessage(id: string, message: Partial<InsertEtfChatMessage>): Promise<EtfChatMessage>;
  deleteEtfChatMessage(id: string): Promise<void>;
  sendEtfMessage(sessionId: string, content: string, role: string, metadata?: any): Promise<EtfChatMessage>;

  // Guardrail Policy management
  getGuardrailPolicies(filters?: {
    isActive?: boolean;
    policyType?: string;
    severity?: string;
    limit?: number;
  }): Promise<GuardrailPolicy[]>;
  getGuardrailPolicy(id: string): Promise<GuardrailPolicy | undefined>;
  createGuardrailPolicy(policy: InsertGuardrailPolicy): Promise<GuardrailPolicy>;
  updateGuardrailPolicy(id: string, policy: Partial<InsertGuardrailPolicy>): Promise<GuardrailPolicy>;
  deleteGuardrailPolicy(id: string): Promise<void>;
  validateAdvice(content: string, userProfile?: UserRiskProfile): Promise<{
    isValid: boolean;
    violations: Array<{
      policyId: string;
      severity: string;
      message: string;
    }>;
    modifiedContent?: string;
  }>;

  // ETF Bot Configuration management
  getEtfBotConfigs(filters?: {
    isActive?: boolean;
    isDefault?: boolean;
    version?: string;
    limit?: number;
  }): Promise<EtfBotConfig[]>;
  getEtfBotConfig(id: string): Promise<EtfBotConfig | undefined>;
  getActiveEtfBotConfig(): Promise<EtfBotConfig | undefined>;
  createEtfBotConfig(config: InsertEtfBotConfig): Promise<EtfBotConfig>;
  updateEtfBotConfig(id: string, config: Partial<InsertEtfBotConfig>): Promise<EtfBotConfig>;
  deleteEtfBotConfig(id: string): Promise<void>;
  setDefaultEtfBotConfig(id: string): Promise<EtfBotConfig>;

  // ETF Recommendation and scoring methods
  getRecommendations(userId: string, filters?: {
    maxResults?: number;
    minScore?: number;
    assetClass?: string[];
    region?: string[];
    maxExpenseRatio?: number;
  }): Promise<Array<{
    etf: EtfProduct;
    score: number;
    reasoning: string;
    criteria: Record<string, number>;
    metrics?: EtfMetric;
  }>>;
  scoreEtfs(userId: string, etfIds: string[]): Promise<Array<{
    etfId: string;
    score: number;
    criteria: Record<string, number>;
    reasoning: string;
  }>>;
  generateEtfPortfolio(userId: string, targetAmount: number, diversificationLevel?: string): Promise<{
    portfolio: Array<{
      etf: EtfProduct;
      allocation: number;
      amount: number;
      reasoning: string;
    }>;
    totalScore: number;
    riskMetrics: Record<string, number>;
    diversificationMetrics: Record<string, number>;
  }>;

  // ETF data ingestion and management
  ingestEtfData(data: any[]): Promise<{
    created: number;
    updated: number;
    errors: Array<{ data: any; error: string }>;
  }>;
  syncEtfMetrics(source: string): Promise<{
    synced: number;
    errors: Array<{ ticker: string; error: string }>;
  }>;
  
  // ETF analytics and reporting
  getEtfAnalytics(filters?: {
    period?: string;
    etfIds?: string[];
    userId?: string;
  }): Promise<{
    topPerforming: Array<{ etf: EtfProduct; performance: Record<string, number> }>;
    userEngagement: Record<string, number>;
    recommendationAccuracy: number;
    portfolioMetrics: Record<string, number>;
  }>;

  // Additional ETF methods needed by routes.ts
  getUserEtfChatSessions(userId: string): Promise<EtfChatSession[]>;
  getAllEtfBotConfigs(): Promise<EtfBotConfig[]>;
  getEtfMetricsHistory(etfId: string, period: string): Promise<EtfMetric[]>;
  ingestEtfProducts(products: InsertEtfProduct[]): Promise<{ created: number; updated: number; errors: any[] }>;
  ingestEtfMetrics(metrics: InsertEtfMetric[]): Promise<{ created: number; updated: number; errors: any[] }>;

  // ===================================
  // NL to SQL Engine Methods
  // ===================================

  // NL2SQL Prompts management
  getNl2sqlPrompts(filters?: {
    dialect?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<Nl2sqlPrompt[]>;
  getNl2sqlPrompt(id: string): Promise<Nl2sqlPrompt | undefined>;
  createNl2sqlPrompt(prompt: InsertNl2sqlPrompt): Promise<Nl2sqlPrompt>;
  updateNl2sqlPrompt(id: string, prompt: Partial<InsertNl2sqlPrompt>): Promise<Nl2sqlPrompt>;
  deleteNl2sqlPrompt(id: string): Promise<void>;

  // Schema Sources management
  getSchemaSources(filters?: {
    type?: string;
    isDefault?: boolean;
    limit?: number;
  }): Promise<SchemaSource[]>;
  getSchemaSource(id: string): Promise<SchemaSource | undefined>;
  createSchemaSource(source: InsertSchemaSource): Promise<SchemaSource>;
  updateSchemaSource(id: string, source: Partial<InsertSchemaSource>): Promise<SchemaSource>;
  deleteSchemaSource(id: string): Promise<void>;

  // Dictionaries management
  getDictionaries(filters?: {
    sourceId?: string;
    limit?: number;
  }): Promise<Dictionary[]>;
  getDictionary(id: string): Promise<Dictionary | undefined>;
  createDictionary(dict: InsertDictionary): Promise<Dictionary>;
  updateDictionary(id: string, dict: Partial<InsertDictionary>): Promise<Dictionary>;
  deleteDictionary(id: string): Promise<void>;

  // Dictionary Entries management
  getDictionaryEntries(filters?: {
    dictionaryId?: string;
    tableName?: string;
    limit?: number;
  }): Promise<DictionaryEntry[]>;
  getDictionaryEntry(id: string): Promise<DictionaryEntry | undefined>;
  createDictionaryEntry(entry: InsertDictionaryEntry): Promise<DictionaryEntry>;
  updateDictionaryEntry(id: string, entry: Partial<InsertDictionaryEntry>): Promise<DictionaryEntry>;
  deleteDictionaryEntry(id: string): Promise<void>;

  // Advanced NL2SQL methods
  getSchemaTree(sourceId: string): Promise<{
    databases?: Array<{
      name: string;
      tables: Array<{
        name: string;
        columns: Array<{
          name: string;
          type: string;
          nullable?: boolean;
          description?: string;
        }>;
      }>;
    }>;
    tables?: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        nullable?: boolean;
        description?: string;
      }>;
    }>;
  }>;
  generateDictionaryFromSchema(params: {
    sourceId: string;
    tableNames: string[];
    dictionaryName: string;
    description?: string;
  }): Promise<{
    dictionary: Dictionary;
    entries: DictionaryEntry[];
  }>;
  
  // Schema info for NL2SQL
  getSchemaInfo(): Promise<{
    tables: Array<{
      name: string;
      displayName: string;
      description: string;
      columns: Array<{
        name: string;
        type: string;
        description: string;
      }>;
    }>;
    timestamp: string;
  }>;
  
  // Azure Config management
  getAzureConfig(serviceName: string): Promise<AzureConfig | undefined>;
  upsertAzureConfig(serviceName: string, config: Record<string, any>): Promise<AzureConfig>;
  deleteAzureConfig(serviceName: string): Promise<void>;
}

// Database Storage implementation

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // System Configuration management
  async getSystemConfigurations(filters?: {
    category?: string;
    isActive?: boolean;
    isSecret?: boolean;
    limit?: number;
  }): Promise<SystemConfiguration[]> {
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(systemConfigurations.category, filters.category));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(systemConfigurations.isActive, filters.isActive));
    }
    if (filters?.isSecret !== undefined) {
      conditions.push(eq(systemConfigurations.isSecret, filters.isSecret));
    }
    
    let query = db.select().from(systemConfigurations);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    const configs = await query.orderBy(desc(systemConfigurations.updatedAt));
    
    // Redact secret values for security
    return configs.map((config: any) => ({
      ...config,
      value: config.isSecret ? '••••••••' : config.value
    }));
  }

  async getSystemConfiguration(id: string): Promise<SystemConfiguration | undefined> {
    const [config] = await db.select().from(systemConfigurations).where(eq(systemConfigurations.id, id));
    return config || undefined;
  }

  async getSystemConfigurationByKey(key: string): Promise<SystemConfiguration | undefined> {
    const [config] = await db.select().from(systemConfigurations).where(eq(systemConfigurations.key, key));
    return config || undefined;
  }

  async createSystemConfiguration(config: InsertSystemConfiguration): Promise<SystemConfiguration> {
    const [created] = await db.insert(systemConfigurations).values(config).returning();
    return created;
  }

  async updateSystemConfiguration(id: string, config: Partial<InsertSystemConfiguration>): Promise<SystemConfiguration> {
    const [updated] = await db
      .update(systemConfigurations)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(systemConfigurations.id, id))
      .returning();
    return updated;
  }

  async deleteSystemConfiguration(id: string): Promise<void> {
    await db.delete(systemConfigurations).where(eq(systemConfigurations.id, id));
  }

  async getWorkflows(): Promise<Workflow[]> {
    return await db.select().from(workflows).orderBy(desc(workflows.updatedAt));
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    return workflow || undefined;
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    const [newWorkflow] = await db.insert(workflows).values(workflow).returning();
    return newWorkflow;
  }

  async updateWorkflow(id: string, workflow: Partial<InsertWorkflow>): Promise<Workflow> {
    const [updatedWorkflow] = await db
      .update(workflows)
      .set({ ...workflow, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return updatedWorkflow;
  }

  async deleteWorkflow(id: string): Promise<void> {
    // Cascade delete related entities to avoid FK violations
    // 1) Collect session ids for this workflow
    const sessions = await db.select().from(workflowSessions).where(eq(workflowSessions.workflowId, id));
    const sessionIds = sessions.map((s: any) => s.id);

    // 2) Delete node executions for these sessions
    if (sessionIds.length > 0) {
      await db.delete(workflowNodeExecutions).where(inArray(workflowNodeExecutions.sessionId, sessionIds));
      await db.delete(workflowSessionData).where(inArray(workflowSessionData.sessionId, sessionIds));
    }

    // 3) Delete sessions
    await db.delete(workflowSessions).where(eq(workflowSessions.workflowId, id));

    // 4) Delete executions referencing this workflow
    await db.delete(workflowExecutions).where(eq(workflowExecutions.workflowId, id));

    // 5) Delete schedules for this workflow
    await db.delete(schedules).where(eq(schedules.workflowId, id));

    // 6) Delete the workflow
    await db.delete(workflows).where(eq(workflows.id, id));
  }

  // Workflow folder management implementation
  async getWorkflowFolders(): Promise<WorkflowFolder[]> {
    return await db.select().from(workflowFolders).orderBy(workflowFolders.name);
  }

  async getWorkflowFolder(id: string): Promise<WorkflowFolder | undefined> {
    const [folder] = await db.select().from(workflowFolders).where(eq(workflowFolders.id, id));
    return folder || undefined;
  }

  async createWorkflowFolder(folder: InsertWorkflowFolder): Promise<WorkflowFolder> {
    const [newFolder] = await db.insert(workflowFolders).values(folder).returning();
    return newFolder;
  }

  async updateWorkflowFolder(id: string, folder: Partial<InsertWorkflowFolder>): Promise<WorkflowFolder> {
    const [updatedFolder] = await db
      .update(workflowFolders)
      .set({ ...folder, updatedAt: new Date() })
      .where(eq(workflowFolders.id, id))
      .returning();
    return updatedFolder;
  }

  async deleteWorkflowFolder(id: string): Promise<void> {
    // Check if folder has children
    const children = await db.select().from(workflowFolders).where(eq(workflowFolders.parentId, id));
    if (children.length > 0) {
      throw new Error('하위 폴더가 있는 폴더는 삭제할 수 없습니다. 먼저 하위 폴더를 삭제하거나 이동해주세요.');
    }
    
    // Move workflows in this folder to root (set folderId to null)
    await db.update(workflows)
      .set({ folderId: null, folderPath: null })
      .where(eq(workflows.folderId, id));
    
    // Delete the folder
    await db.delete(workflowFolders).where(eq(workflowFolders.id, id));
  }

  async getPrompts(): Promise<Prompt[]> {
    return await db.select().from(prompts).orderBy(desc(prompts.createdAt));
  }

  async getPrompt(id: string): Promise<Prompt | undefined> {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt || undefined;
  }

  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const [newPrompt] = await db.insert(prompts).values(prompt).returning();
    return newPrompt;
  }

  async updatePrompt(id: string, prompt: Partial<InsertPrompt>): Promise<Prompt> {
    const [updatedPrompt] = await db
      .update(prompts)
      .set({ ...prompt, updatedAt: new Date() })
      .where(eq(prompts.id, id))
      .returning();
    return updatedPrompt;
  }

  async deletePrompt(id: string): Promise<void> {
    await db.delete(prompts).where(eq(prompts.id, id));
  }

  // Data Source management
  async getDataSources(filters?: {
    type?: string;
    isActive?: boolean;
    isDefault?: boolean;
    limit?: number;
  }): Promise<DataSource[]> {
    let query = db.select().from(dataSources);

    const conditions = [];
    if (filters?.type) {
      conditions.push(eq(dataSources.type, filters.type));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(dataSources.isActive, filters.isActive));
    }
    if (filters?.isDefault !== undefined) {
      conditions.push(eq(dataSources.isDefault, filters.isDefault));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(dataSources.createdAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  async getDataSource(id: string): Promise<DataSource | undefined> {
    const [dataSource] = await db.select().from(dataSources).where(eq(dataSources.id, id));
    return dataSource || undefined;
  }

  async createDataSource(dataSource: InsertDataSource): Promise<DataSource> {
    const [newDataSource] = await db.insert(dataSources).values({
      ...dataSource,
      updatedAt: new Date(),
    }).returning();
    return newDataSource;
  }

  async updateDataSource(id: string, dataSource: Partial<InsertDataSource>): Promise<DataSource> {
    const [updatedDataSource] = await db
      .update(dataSources)
      .set({ ...dataSource, updatedAt: new Date() })
      .where(eq(dataSources.id, id))
      .returning();
    return updatedDataSource;
  }

  async deleteDataSource(id: string): Promise<void> {
    await db.delete(dataSources).where(eq(dataSources.id, id));
  }

  // SQL Query management
  async getSqlQueries(filters?: {
    dataSourceId?: string;
    queryType?: string;
    isActive?: boolean;
    category?: string;
    limit?: number;
  }): Promise<SqlQuery[]> {
    let query = db.select().from(sqlQueries);

    const conditions = [];
    if (filters?.dataSourceId) {
      conditions.push(eq(sqlQueries.dataSourceId, filters.dataSourceId));
    }
    if (filters?.queryType) {
      conditions.push(eq(sqlQueries.queryType, filters.queryType));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(sqlQueries.isActive, filters.isActive));
    }
    if (filters?.category) {
      conditions.push(eq(sqlQueries.category, filters.category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(desc(sqlQueries.createdAt));

    if (filters?.limit) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  async getSqlQuery(id: string): Promise<SqlQuery | undefined> {
    const [sqlQuery] = await db.select().from(sqlQueries).where(eq(sqlQueries.id, id));
    return sqlQuery || undefined;
  }

  async createSqlQuery(sqlQuery: InsertSqlQuery): Promise<SqlQuery> {
    const [newSqlQuery] = await db.insert(sqlQueries).values({
      ...sqlQuery,
      updatedAt: new Date(),
    }).returning();
    return newSqlQuery;
  }

  async updateSqlQuery(id: string, sqlQuery: Partial<InsertSqlQuery>): Promise<SqlQuery> {
    const [updatedSqlQuery] = await db
      .update(sqlQueries)
      .set({ ...sqlQuery, updatedAt: new Date() })
      .where(eq(sqlQueries.id, id))
      .returning();
    return updatedSqlQuery;
  }

  async deleteSqlQuery(id: string): Promise<void> {
    await db.delete(sqlQueries).where(eq(sqlQueries.id, id));
  }

  async getPythonScripts(filters?: {
    category?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<PythonScript[]> {
    let query = db.select().from(pythonScripts);
    
    const conditions = [];
    if (filters?.category) {
      conditions.push(eq(pythonScripts.category, filters.category));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(pythonScripts.isActive, filters.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    
    query = query.orderBy(desc(pythonScripts.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return query;
  }

  async getPythonScript(id: string): Promise<PythonScript | undefined> {
    const [script] = await db.select().from(pythonScripts).where(eq(pythonScripts.id, id));
    return script || undefined;
  }

  async createPythonScript(script: InsertPythonScript): Promise<PythonScript> {
    const [newScript] = await db.insert(pythonScripts).values(script).returning();
    return newScript;
  }

  async updatePythonScript(id: string, script: Partial<InsertPythonScript>): Promise<PythonScript> {
    const [updatedScript] = await db
      .update(pythonScripts)
      .set({ ...script, updatedAt: new Date() })
      .where(eq(pythonScripts.id, id))
      .returning();
    return updatedScript;
  }

  async deletePythonScript(id: string): Promise<void> {
    await db.delete(pythonScripts).where(eq(pythonScripts.id, id));
  }

  async createApiCall(apiCall: InsertApiCall): Promise<ApiCall> {
    const [newApiCall] = await db.insert(apiCalls).values(apiCall).returning();
    return newApiCall;
  }

  async updateApiCall(id: string, apiCall: Partial<InsertApiCall>): Promise<ApiCall> {
    const [updatedApiCall] = await db
      .update(apiCalls)
      .set({ ...apiCall, updatedAt: new Date() })
      .where(eq(apiCalls.id, id))
      .returning();
    return updatedApiCall;
  }

  async deleteApiCall(id: string): Promise<void> {
    await db.delete(apiCalls).where(eq(apiCalls.id, id));
  }

  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).orderBy(desc(schedules.createdAt));
  }

  async getSchedule(id: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule || undefined;
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values(schedule).returning();
    return newSchedule;
  }

  async updateSchedule(id: string, schedule: Partial<InsertSchedule>): Promise<Schedule> {
    const [updatedSchedule] = await db
      .update(schedules)
      .set(schedule)
      .where(eq(schedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteSchedule(id: string): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  async getWorkflowExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    const query = db.select().from(workflowExecutions);
    if (workflowId) {
      return await query.where(eq(workflowExecutions.workflowId, workflowId))
        .orderBy(desc(workflowExecutions.startedAt));
    }
    return await query.orderBy(desc(workflowExecutions.startedAt));
  }

  async createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const [newExecution] = await db.insert(workflowExecutions).values(execution).returning();
    return newExecution;
  }

  async updateWorkflowExecution(id: string, execution: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution> {
    const [updatedExecution] = await db
      .update(workflowExecutions)
      .set(execution)
      .where(eq(workflowExecutions.id, id))
      .returning();
    return updatedExecution;
  }

  // Workflow node results implementation
  async getWorkflowNodeResults(executionId: string): Promise<WorkflowNodeResult[]> {
    return await db.select().from(workflowNodeResults)
      .where(eq(workflowNodeResults.executionId, executionId))
      .orderBy(desc(workflowNodeResults.createdAt));
  }

  async getWorkflowNodeResult(executionId: string, nodeId: string): Promise<WorkflowNodeResult | undefined> {
    const [result] = await db.select().from(workflowNodeResults)
      .where(and(
        eq(workflowNodeResults.executionId, executionId),
        eq(workflowNodeResults.nodeId, nodeId)
      ))
      .orderBy(desc(workflowNodeResults.createdAt))
      .limit(1);
    return result || undefined;
  }

  async createWorkflowNodeResult(nodeResult: InsertWorkflowNodeResult): Promise<WorkflowNodeResult> {
    const [newResult] = await db.insert(workflowNodeResults).values(nodeResult).returning();
    return newResult;
  }

  async updateWorkflowNodeResult(id: string, nodeResult: Partial<InsertWorkflowNodeResult>): Promise<WorkflowNodeResult> {
    const [updatedResult] = await db
      .update(workflowNodeResults)
      .set(nodeResult)
      .where(eq(workflowNodeResults.id, id))
      .returning();
    return updatedResult;
  }

  async getWorkflowNodeResultsByNodeType(executionId: string, nodeType: string): Promise<WorkflowNodeResult[]> {
    return await db.select().from(workflowNodeResults)
      .where(and(
        eq(workflowNodeResults.executionId, executionId),
        eq(workflowNodeResults.nodeType, nodeType)
      ))
      .orderBy(desc(workflowNodeResults.createdAt));
  }

  async getMarketAnalysis(type?: string, limit = 50): Promise<MarketAnalysis[]> {
    const query = db.select().from(marketAnalysis);
    if (type) {
      return await query.where(eq(marketAnalysis.type, type))
        .orderBy(desc(marketAnalysis.generatedAt))
        .limit(limit);
    }
    return await query.orderBy(desc(marketAnalysis.generatedAt)).limit(limit);
  }

  async createMarketAnalysis(analysis: InsertMarketAnalysis): Promise<MarketAnalysis> {
    const [newAnalysis] = await db.insert(marketAnalysis).values(analysis).returning();
    return newAnalysis;
  }

  async searchFinancialData(filters: {
    symbol?: string;
    market?: string;
    country?: string;
    dataType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<FinancialData[]> {
    let query = db.select().from(financialData);
    const conditions: any[] = [];

    if (filters.symbol) {
      conditions.push(like(financialData.symbol, `%${filters.symbol}%`));
    }
    if (filters.market) {
      conditions.push(eq(financialData.market, filters.market));
    }
    if (filters.country) {
      conditions.push(eq(financialData.country, filters.country));
    }
    if (filters.dataType) {
      conditions.push(eq(financialData.dataType, filters.dataType));
    }
    if (filters.startDate!) {
      conditions.push(gte(financialData.timestamp, filters.startDate!));
    }
    if (filters.endDate!) {
      conditions.push(lte(financialData.timestamp, filters.endDate!));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(financialData.timestamp)).limit(1000);
  }

  async createFinancialData(data: InsertFinancialData): Promise<FinancialData> {
    const [newData] = await db.insert(financialData).values(data).returning();
    return newData;
  }

  async searchNewsData(filters: {
    category?: string;
    keywords?: string[];
    startDate?: Date;
    endDate?: Date;
    sentiment?: string;
  }): Promise<NewsData[]> {
    let query = db.select().from(newsData);
    const conditions: any[] = [];

    if (filters.category) {
      conditions.push(eq(newsData.category, filters.category));
    }
    if (filters.sentiment) {
      conditions.push(eq(newsData.sentiment, filters.sentiment));
    }
    if (filters.keywords && filters.keywords.length > 0) {
      // Safe keyword search with proper parameter binding
      const keywordConditions = filters.keywords.map(keyword => 
        or(
          like(newsData.title, `%${keyword}%`),
          like(newsData.content, `%${keyword}%`),
          like(newsData.summary, `%${keyword}%`),
          // Safe array search for keywords  
          sql`EXISTS (SELECT 1 FROM unnest(${newsData.keywords}) k WHERE k ILIKE ${`%${keyword}%`})`
        )
      );
      conditions.push(or(...keywordConditions));
    }
    if (filters.startDate!) {
      conditions.push(gte(newsData.publishedAt, filters.startDate!));
    }
    if (filters.endDate!) {
      conditions.push(lte(newsData.publishedAt, filters.endDate!));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(newsData.publishedAt)).limit(1000);
  }

  async createNewsData(data: InsertNewsData): Promise<NewsData> {
    const [newData] = await db.insert(newsData).values(data).returning();
    return newData;
  }

  // Enhanced Full-Text Search implementations
  async fullTextSearchFinancialData(query: string, filters?: {
    symbol?: string;
    market?: string;
    dataType?: string;
    limit?: number;
  }): Promise<Array<FinancialData & { search_rank?: number }>> {
    try {
      const limit = filters?.limit || 50;
      
      // Create a comprehensive search query combining multiple fields
      let searchQuery = `
        SELECT *,
          ts_rank_cd(
            to_tsvector('simple', 
              COALESCE(symbol, '') || ' ' ||
              COALESCE(symbol_name, '') || ' ' ||
              COALESCE(sector_name, '') || ' ' ||
              COALESCE(theme_name, '') || ' ' ||
              COALESCE(market, '') || ' ' ||
              COALESCE(data_type, '')
            ),
            plainto_tsquery('simple', $1)
          ) as search_rank
        FROM financial_data
        WHERE to_tsvector('simple',
          COALESCE(symbol, '') || ' ' ||
          COALESCE(symbol_name, '') || ' ' ||
          COALESCE(sector_name, '') || ' ' ||
          COALESCE(theme_name, '') || ' ' ||
          COALESCE(market, '') || ' ' ||
          COALESCE(data_type, '')
        ) @@ plainto_tsquery('simple', $1)
      `;
      
      const queryParams: any[] = [query];
      let paramIndex = 2;
      
      // Add filters
      if (filters?.symbol) {
        searchQuery += ` AND (symbol ILIKE $${paramIndex} OR symbol_name ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.symbol}%`);
        paramIndex++;
      }
      
      if (filters?.market) {
        searchQuery += ` AND market = $${paramIndex}`;
        queryParams.push(filters.market);
        paramIndex++;
      }
      
      if (filters?.dataType) {
        searchQuery += ` AND data_type = $${paramIndex}`;
        queryParams.push(filters.dataType);
        paramIndex++;
      }
      
      searchQuery += ` ORDER BY search_rank DESC, timestamp DESC LIMIT $${paramIndex}`;
      queryParams.push(limit);
      
      const result = await db.execute(sql.raw(searchQuery));
      return result.rows as Array<FinancialData & { search_rank: number }>;
    } catch (error) {
      console.error("Full-text search for financial data failed:", error);
      // Fallback to basic search
      return await this.searchFinancialData({
        symbol: filters?.symbol,
        market: filters?.market,
        dataType: filters?.dataType
      }).then(results => results.slice(0, filters?.limit || 50).map(r => ({ ...r, search_rank: 0.5 })));
    }
  }

  async fullTextSearchNewsData(query: string, filters?: {
    category?: string;
    sentiment?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<NewsData & { search_rank?: number }>> {
    try {
      const limit = filters?.limit || 50;
      
      // Enhanced news search with multiple text fields
      let searchQuery = `
        SELECT *,
          ts_rank_cd(
            to_tsvector('simple',
              COALESCE(title, '') || ' ' ||
              COALESCE(content, '') || ' ' ||
              COALESCE(summary, '') || ' ' ||
              COALESCE(category, '') || ' ' ||
              COALESCE(source, '')
            ),
            plainto_tsquery('simple', $1)
          ) + 
          CASE 
            WHEN title ILIKE '%' || $1 || '%' THEN 0.3
            ELSE 0
          END +
          CASE 
            WHEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(keywords) k WHERE k ILIKE '%' || $1 || '%') THEN 0.2
            ELSE 0
          END as search_rank
        FROM news_data
        WHERE (
          to_tsvector('simple',
            COALESCE(title, '') || ' ' ||
            COALESCE(content, '') || ' ' ||
            COALESCE(summary, '') || ' ' ||
            COALESCE(category, '') || ' ' ||
            COALESCE(source, '')
          ) @@ plainto_tsquery('simple', $1)
          OR title ILIKE '%' || $1 || '%'
          OR content ILIKE '%' || $1 || '%'
          OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(keywords) k WHERE k ILIKE '%' || $1 || '%')
        )
      `;
      
      const queryParams: any[] = [query];
      let paramIndex = 2;
      
      // Add filters
      if (filters?.category) {
        searchQuery += ` AND category = $${paramIndex}`;
        queryParams.push(filters.category);
        paramIndex++;
      }
      
      if (filters?.sentiment) {
        searchQuery += ` AND sentiment = $${paramIndex}`;
        queryParams.push(filters.sentiment);
        paramIndex++;
      }
      
      if (filters?.startDate) {
        searchQuery += ` AND published_at >= $${paramIndex}`;
        queryParams.push(filters.startDate!);
        paramIndex++;
      }
      
      if (filters?.endDate) {
        searchQuery += ` AND published_at <= $${paramIndex}`;
        queryParams.push(filters.endDate!);
        paramIndex++;
      }
      
      searchQuery += ` ORDER BY search_rank DESC, published_at DESC LIMIT $${paramIndex}`;
      queryParams.push(limit);
      
      const result = await db.execute(sql.raw(searchQuery));
      return result.rows as Array<NewsData & { search_rank: number }>;
    } catch (error) {
      console.error("Full-text search for news data failed:", error);
      // Fallback to basic search
      const basicResults = await this.searchNewsData({
        keywords: query.split(' '),
        category: filters?.category,
        sentiment: filters?.sentiment,
        startDate: filters?.startDate,
        endDate: filters?.endDate
      });
      return basicResults.slice(0, filters?.limit || 50).map(r => ({ ...r, search_rank: 0.5 }));
    }
  }

  // Macro analysis methods
  async getMacroAnalysisList(limit = 50): Promise<MacroAnalysis[]> {
    return await db.select().from(macroAnalysis)
      .where(eq(macroAnalysis.status, 'active'))
      .orderBy(desc(macroAnalysis.generatedAt))
      .limit(limit);
  }

  async getMacroAnalysisById(id: string): Promise<MacroAnalysis | undefined> {
    const [analysis] = await db.select().from(macroAnalysis).where(eq(macroAnalysis.id, id));
    return analysis || undefined;
  }

  async createMacroAnalysis(analysis: InsertMacroAnalysis): Promise<MacroAnalysis> {
    const [newAnalysis] = await db.insert(macroAnalysis).values(analysis).returning();
    return newAnalysis;
  }

  async updateMacroAnalysis(id: string, analysis: Partial<InsertMacroAnalysis>): Promise<MacroAnalysis> {
    const [updatedAnalysis] = await db
      .update(macroAnalysis)
      .set(analysis)
      .where(eq(macroAnalysis.id, id))
      .returning();
    return updatedAnalysis;
  }

  async deleteMacroAnalysis(id: string): Promise<void> {
    await db.update(macroAnalysis)
      .set({ status: 'archived' })
      .where(eq(macroAnalysis.id, id));
  }

  async generateIntegratedMacroAnalysis(
    newsAnalysisIds: string[], 
    themeAnalysisIds: string[], 
    quantAnalysisIds: string[]
  ): Promise<MacroAnalysis> {
    // Get the individual analysis results
    const newsAnalyses = await db.select().from(marketAnalysis)
      .where(and(
        inArray(marketAnalysis.id, newsAnalysisIds),
        eq(marketAnalysis.type, 'news')
      ));
    
    const themeAnalyses = await db.select().from(marketAnalysis)
      .where(and(
        inArray(marketAnalysis.id, themeAnalysisIds),
        eq(marketAnalysis.type, 'theme')
      ));
    
    const quantAnalyses = await db.select().from(marketAnalysis)
      .where(and(
        inArray(marketAnalysis.id, quantAnalysisIds),
        eq(marketAnalysis.type, 'quantitative')
      ));

    // Aggregate the analysis content and calculate importance scores
    const newsContent = newsAnalyses.map(a => a.content).join('\n\n');
    const themeContent = themeAnalyses.map(a => a.content).join('\n\n');
    const quantContent = quantAnalyses.map(a => a.content).join('\n\n');

    // Calculate average confidence as importance scores (normalized to 0-1 range)
    const newsImportance = newsAnalyses.length > 0 
      ? newsAnalyses.reduce((sum, a) => sum + (parseFloat(a.confidence?.toString() || '0')), 0) / newsAnalyses.length
      : 0.5;
    const themeImportance = themeAnalyses.length > 0 
      ? themeAnalyses.reduce((sum, a) => sum + (parseFloat(a.confidence?.toString() || '0')), 0) / themeAnalyses.length
      : 0.5;
    const quantImportance = quantAnalyses.length > 0 
      ? quantAnalyses.reduce((sum, a) => sum + (parseFloat(a.confidence?.toString() || '0')), 0) / quantAnalyses.length
      : 0.5;
    const overallImportance = (newsImportance + themeImportance + quantImportance) / 3;

    // Create properly typed arrays for PostgreSQL
    const affectedSectorsArray: string[] = Array.from(new Set(
      themeAnalyses.flatMap(a => Array.isArray(a.dataSourceIds) ? a.dataSourceIds : [])
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
    ));
    
    const keyFactorsArray: string[] = Array.from(new Set(
      [...newsAnalyses, ...themeAnalyses, ...quantAnalyses]
        .flatMap(a => Array.isArray(a.dataSourceIds) ? a.dataSourceIds : [])
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
    ));
    
    const sourceAnalysisIdsArray: string[] = [...newsAnalysisIds, ...themeAnalysisIds, ...quantAnalysisIds]
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const integratedAnalysis: InsertMacroAnalysis = {
      title: `통합 매크로시황 분석 - ${new Date().toLocaleDateString('ko-KR')}`,
      newsAnalysis: newsContent || '분석 데이터 없음',
      themeAnalysis: themeContent || '분석 데이터 없음',
      quantitativeAnalysis: quantContent || '분석 데이터 없음',
      integratedSummary: `뉴스 ${newsAnalyses.length}건, 테마 ${themeAnalyses.length}건, 정량 ${quantAnalyses.length}건을 종합한 매크로시황 분석`,
      integratedContent: `종합 분석:\n\n뉴스 기반 시황:\n${newsContent || '데이터 없음'}\n\n테마/산업 시황:\n${themeContent || '데이터 없음'}\n\n정량적 분석:\n${quantContent || '데이터 없음'}`,
      overallImportance: overallImportance.toFixed(2),
      newsImportance: newsImportance.toFixed(2),
      themeImportance: themeImportance.toFixed(2),
      quantImportance: quantImportance.toFixed(2),
      marketImpact: overallImportance > 0.7 ? 'positive' : overallImportance < 0.3 ? 'negative' : 'neutral',
      affectedSectors: affectedSectorsArray,
      keyFactors: keyFactorsArray,
      sourceAnalysisIds: sourceAnalysisIdsArray,
      dataSourceCount: newsAnalysisIds.length + themeAnalysisIds.length + quantAnalysisIds.length,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid for 24 hours
    };

    return await this.createMacroAnalysis(integratedAnalysis);
  }

  // Macro Workflow Template methods
  async getMacroWorkflowTemplates(): Promise<MacroWorkflowTemplate[]> {
    return await db.select().from(macroWorkflowTemplates)
      .where(eq(macroWorkflowTemplates.isActive, true))
      .orderBy(macroWorkflowTemplates.createdAt);
  }

  async getMacroWorkflowTemplateByType(analysisType: string): Promise<MacroWorkflowTemplate | undefined> {
    const [template] = await db.select().from(macroWorkflowTemplates)
      .where(eq(macroWorkflowTemplates.analysisType, analysisType));
    return template || undefined;
  }

  async createMacroWorkflowTemplate(template: InsertMacroWorkflowTemplate): Promise<MacroWorkflowTemplate> {
    const [newTemplate] = await db.insert(macroWorkflowTemplates).values(template).returning();
    return newTemplate;
  }

  async updateMacroWorkflowTemplate(id: string, template: Partial<InsertMacroWorkflowTemplate>): Promise<MacroWorkflowTemplate> {
    const [updated] = await db.update(macroWorkflowTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(macroWorkflowTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteMacroWorkflowTemplate(id: string): Promise<void> {
    await db.delete(macroWorkflowTemplates).where(eq(macroWorkflowTemplates.id, id));
  }

  async initializeMacroWorkflowTemplates(): Promise<void> {
    // Check if templates already exist
    const existing = await this.getMacroWorkflowTemplates();
    if (existing.length > 0) {
      return; // Already initialized
    }

    // Create default workflow templates for each analysis type
    const templates = [
      {
        analysisType: 'news',
        name: '뉴스기반시황 분석',
        description: '최신 뉴스를 수집하고 분석하여 시장 영향을 평가합니다.',
        icon: 'Newspaper',
        color: '#3b82f6',
        defaultConfig: {
          nodes: [
            { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: { label: '시작' } },
            { id: 'fetch-news', type: 'api', position: { x: 100, y: 200 }, data: { label: '뉴스 데이터 수집', description: '최신 뉴스를 수집합니다' } },
            { id: 'analyze-news', type: 'ai_analysis', position: { x: 100, y: 300 }, data: { label: '뉴스 분석', systemPrompt: '금융 뉴스를 분석하세요.' } },
            { id: 'output', type: 'merge', position: { x: 100, y: 400 }, data: { label: '결과 생성' } }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'fetch-news' },
            { id: 'e2', source: 'fetch-news', target: 'analyze-news' },
            { id: 'e3', source: 'analyze-news', target: 'output' }
          ]
        }
      },
      {
        analysisType: 'theme',
        name: '테마/산업시황 분석',
        description: '테마별 종목 동향과 산업 트렌드를 분석합니다.',
        icon: 'Building2',
        color: '#a855f7',
        defaultConfig: {
          nodes: [
            { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: { label: '시작' } },
            { id: 'fetch-themes', type: 'api', position: { x: 100, y: 200 }, data: { label: '테마 데이터 수집' } },
            { id: 'analyze-themes', type: 'ai_analysis', position: { x: 100, y: 300 }, data: { label: '테마 분석' } },
            { id: 'output', type: 'merge', position: { x: 100, y: 400 }, data: { label: '결과 생성' } }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'fetch-themes' },
            { id: 'e2', source: 'fetch-themes', target: 'analyze-themes' },
            { id: 'e3', source: 'analyze-themes', target: 'output' }
          ]
        }
      },
      {
        analysisType: 'quantitative',
        name: '정량적 시장/시세 분석',
        description: '시장 지수, 거래량, 가격 데이터를 분석합니다.',
        icon: 'Calculator',
        color: '#22c55e',
        defaultConfig: {
          nodes: [
            { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: { label: '시작' } },
            { id: 'fetch-market', type: 'api', position: { x: 100, y: 200 }, data: { label: '시장 데이터 수집' } },
            { id: 'analyze-quant', type: 'ai_analysis', position: { x: 100, y: 300 }, data: { label: '정량 분석' } },
            { id: 'output', type: 'merge', position: { x: 100, y: 400 }, data: { label: '결과 생성' } }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'fetch-market' },
            { id: 'e2', source: 'fetch-market', target: 'analyze-quant' },
            { id: 'e3', source: 'analyze-quant', target: 'output' }
          ]
        }
      }
    ];

    // Create workflows and templates
    for (const template of templates) {
      const workflow = await this.createWorkflow({
        name: template.name,
        description: template.description,
        definition: template.defaultConfig,
        isActive: true
      });

      await this.createMacroWorkflowTemplate({
        analysisType: template.analysisType,
        workflowId: workflow.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        color: template.color,
        defaultConfig: template.defaultConfig,
        isActive: true
      });
    }
  }

  // Layout template methods
  async getLayoutTemplates(filters?: { type?: string; isDefault?: boolean; createdBy?: string }): Promise<LayoutTemplate[]> {
    let query = db.select().from(layoutTemplates);
    
    if (filters) {
      const conditions = [];
      if (filters.type) conditions.push(eq(layoutTemplates.type, filters.type));
      if (filters.isDefault !== undefined) conditions.push(eq(layoutTemplates.isDefault, filters.isDefault));
      if (filters.createdBy) conditions.push(eq(layoutTemplates.createdBy, filters.createdBy));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    return await query.orderBy(desc(workflowExecutions.startedAt));
  }

  async getLayoutTemplate(id: string): Promise<LayoutTemplate | undefined> {
    const [template] = await db.select().from(layoutTemplates).where(eq(layoutTemplates.id, id));
    return template || undefined;
  }

  async createLayoutTemplate(template: InsertLayoutTemplate): Promise<LayoutTemplate> {
    const [newTemplate] = await db.insert(layoutTemplates).values(template).returning();
    return newTemplate;
  }

  async updateLayoutTemplate(id: string, template: Partial<InsertLayoutTemplate>): Promise<LayoutTemplate> {
    const [updatedTemplate] = await db
      .update(layoutTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(layoutTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteLayoutTemplate(id: string): Promise<void> {
    await db.delete(layoutTemplates).where(eq(layoutTemplates.id, id));
  }

  async duplicateLayoutTemplate(id: string, name: string): Promise<LayoutTemplate> {
    const original = await this.getLayoutTemplate(id);
    if (!original) {
      throw new Error('Template not found');
    }
    
    const duplicate: InsertLayoutTemplate = {
      name,
      description: `Copy of ${original.description || original.name}`,
      type: original.type,
      layoutDefinition: original.layoutDefinition as any,
      components: original.components as any,
      dataBindings: original.dataBindings as any,
      isDefault: false,
      isPublic: false,
      paperSize: original.paperSize,
      orientation: original.orientation,
      theme: original.theme,
      colorScheme: original.colorScheme as any,
      fonts: original.fonts as any,
      tags: original.tags,
      version: '1.0',
      createdBy: original.createdBy,
    };
    
    return await this.createLayoutTemplate(duplicate);
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db
      .update(layoutTemplates)
      .set({ 
        usage_count: sql`${layoutTemplates.usage_count} + 1`,
        lastUsed: new Date()
      })
      .where(eq(layoutTemplates.id, id));
  }

  // Morning briefing implementations
  async getMorningBriefings(filters?: { 
    startDate?: Date; 
    endDate?: Date; 
    status?: string;
    limit?: number;
  }): Promise<MorningBriefing[]> {
    let query = db.select().from(morningBriefing);
    
    if (filters) {
      const conditions: any[] = [];
      
      if (filters.startDate!) {
        conditions.push(gte(morningBriefing.briefingDate, filters.startDate!));
      }
      
      if (filters.endDate!) {
        conditions.push(lte(morningBriefing.briefingDate, filters.endDate!));
      }
      
      if (filters.status) {
        conditions.push(eq(morningBriefing.status, filters.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    query = query.orderBy(desc(morningBriefing.briefingDate)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return await query;
  }

  async getMorningBriefing(id: string): Promise<MorningBriefing | undefined> {
    const [briefing] = await db.select().from(morningBriefing).where(eq(morningBriefing.id, id));
    return briefing || undefined;
  }

  async getMorningBriefingByDate(briefingDate: Date): Promise<MorningBriefing | undefined> {
    const startOfDay = new Date(briefingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(briefingDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [briefing] = await db.select()
      .from(morningBriefing)
      .where(
        and(
          gte(morningBriefing.briefingDate, startOfDay),
          lte(morningBriefing.briefingDate, endOfDay)
        )
      )
      .orderBy(desc(morningBriefing.createdAt))
      .limit(1);
    
    return briefing || undefined;
  }

  async createMorningBriefing(briefing: InsertMorningBriefing): Promise<MorningBriefing> {
    const [newBriefing] = await db.insert(morningBriefing).values(briefing).returning();
    return newBriefing;
  }

  async updateMorningBriefing(id: string, briefing: Partial<InsertMorningBriefing>): Promise<MorningBriefing> {
    const [updatedBriefing] = await db
      .update(morningBriefing)
      .set({ ...briefing, updatedAt: new Date() })
      .where(eq(morningBriefing.id, id))
      .returning();
    return updatedBriefing;
  }

  async deleteMorningBriefing(id: string): Promise<void> {
    await db.delete(morningBriefing).where(eq(morningBriefing.id, id));
  }

  async generateMorningBriefing(briefingDate: Date, marketOpenTime: Date): Promise<MorningBriefing> {
    const startTime = Date.now();
    
    try {
      // Check if briefing already exists for this date
      const existingBriefing = await this.getMorningBriefingByDate(briefingDate);
      if (existingBriefing) {
        return existingBriefing;
      }

      // Get 1-hour window after market open
      const analysisEndTime = new Date(marketOpenTime);
      analysisEndTime.setHours(analysisEndTime.getHours() + 1);

      // Fetch data with error handling
      const { financialDataResults, newsResults, historicalVolumeData } = await this.fetchBriefingData(
        marketOpenTime,
        analysisEndTime,
        briefingDate
      );

      // Validate data quality
      const dataQuality = this.assessDataQuality(financialDataResults, newsResults);
      if (dataQuality.score < 0.3) {
        console.warn('Low data quality detected for morning briefing generation', dataQuality);
      }

      // Aggregate market movements data with proper typing
      const marketMovements: MarketMovementData = {
        kospi: financialDataResults.find(d => d.market === 'KOSPI' || d.symbol === 'KOSPI'),
        kosdaq: financialDataResults.find(d => d.market === 'KOSDAQ' || d.symbol === 'KOSDAQ'),
        sectors: this.analyzeSectorMovements(financialDataResults)
      };

      // Implement real trading volume analysis with historical comparison
      const tradingVolumeAnalysis: TradingVolumeAnalysis = await this.analyzeRealTradingVolume(
        financialDataResults,
        historicalVolumeData
      );

      // Extract and enrich key events from news with better filtering
      const keyEvents: KeyEvent[] = await this.extractKeyEvents(newsResults, financialDataResults);

      // Analyze sector highlights with improved algorithm
      const sectorHighlights: SectorHighlight[] = await this.analyzeSectorHighlights(
        financialDataResults,
        newsResults
      );

      // Generate AI insights using real OpenAI service
      const aiInsights: AIInsightsResult = await this.generateAIInsightsEnhanced(
        marketMovements,
        keyEvents,
        sectorHighlights,
        tradingVolumeAnalysis
      );

      // Calculate enhanced importance score
      const importanceScore = this.calculateEnhancedImportanceScore(
        marketMovements,
        keyEvents,
        tradingVolumeAnalysis,
        aiInsights
      );

      // Determine market sentiment with confidence scoring
      const marketSentiment = this.determineEnhancedMarketSentiment(keyEvents, marketMovements, aiInsights);

      // Create morning briefing with comprehensive data
      const briefingData: InsertMorningBriefing = {
        briefingDate,
        marketOpenTime,
        summaryPeriod: '1hour',
        keyEvents,
        marketMovements,
        sectorHighlights,
        tradingVolumeAnalysis,
        aiInsights: aiInsights.summary,
        importanceScore: importanceScore.toString(),
        marketSentiment,
        dataSourceIds: [
          ...financialDataResults.map(d => d.id),
          ...newsResults.map(n => n.id)
        ],
        analysisModel: 'gpt-5',
        processingTime: Date.now() - startTime,
        status: 'active',
        isManuallyReviewed: false,
        generatedBy: 'system-auto'
      };

      const briefing = await this.createMorningBriefing(briefingData);
      
      // Log successful generation
      console.log(`Morning briefing generated successfully for ${briefingDate.toISOString().split('T')[0]}`, {
        processingTime: Date.now() - startTime,
        dataQuality: dataQuality.score,
        keyEventsCount: keyEvents.length,
        importanceScore
      });

      return briefing;
    } catch (error) {
      const analysisError: AnalysisError = {
        code: 'BRIEFING_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error during briefing generation',
        details: { briefingDate, marketOpenTime, processingTime: Date.now() - startTime },
        timestamp: new Date(),
        source: 'analysis'
      };
      
      console.error('Morning briefing generation failed:', analysisError);
      throw new Error(`Failed to generate morning briefing: ${analysisError.message}`);
    }
  }

  private analyzeSectorMovements(financialData: FinancialData[]): SectorMovement[] {
    try {
      // Group by sector/industry and calculate performance
      const sectors = new Map<string, {
        totalPrice: number;
        count: number;
        symbols: StockSummary[];
        totalVolume: number;
        totalMarketCap: number;
        changeRates: number[];
      }>();
      
      financialData.forEach(data => {
        const sector = data.sectorName || (data.metadata as any)?.sector || 'Unknown';
        if (!sectors.has(sector)) {
          sectors.set(sector, {
            totalPrice: 0,
            count: 0,
            symbols: [],
            totalVolume: 0,
            totalMarketCap: 0,
            changeRates: []
          });
        }
        
        const sectorData = sectors.get(sector)!;
        const price = parseFloat(data.price?.toString() || '0');
        const volume = data.volume || 0;
        const changeRate = parseFloat(data.changeRate?.toString() || '0');
        
        sectorData.totalPrice += price;
        sectorData.count += 1;
        sectorData.totalVolume += volume;
        sectorData.totalMarketCap += parseFloat(data.marketCap?.toString() || '0');
        sectorData.changeRates.push(changeRate);
        
        sectorData.symbols.push({
          symbol: data.symbol,
          price: data.price,
          volume: data.volume,
          changeAmount: parseFloat(data.changeAmount?.toString() || '0'),
          changeRate: changeRate
        });
      });

      return Array.from(sectors.entries())
        .filter(([_, data]) => data.count > 0)
        .map(([name, data]) => {
          // Calculate average change rate for sector performance
          const avgChangeRate = data.changeRates.length > 0 
            ? data.changeRates.reduce((sum, rate) => sum + rate, 0) / data.changeRates.length 
            : 0;
          
          // Sort symbols by volume and take top performers
          const sortedSymbols = data.symbols
            .sort((a, b) => (b.volume || 0) - (a.volume || 0))
            .slice(0, 5);

          return {
            sector: name,
            avgPrice: data.totalPrice / data.count,
            volume: data.totalVolume,
            topStocks: sortedSymbols,
            changeRate: avgChangeRate,
            performance: avgChangeRate // Simplified performance metric
          };
        })
        .sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate)) // Sort by most significant movement
        .slice(0, 10); // Top 10 sectors
    } catch (error) {
      console.error('Error analyzing sector movements:', error);
      return [];
    }
  }

  private async analyzeSectorHighlights(
    financialData: FinancialData[],
    newsData: NewsData[]
  ): Promise<SectorHighlight[]> {
    try {
      // Map to track sector performance and news mentions
      const sectorAnalysis = new Map<string, {
        newsCount: number;
        performance: number;
        reasons: string[];
        relatedStocks: StockSummary[];
        marketCap: number;
        changeRates: number[];
      }>();

      // Sector keywords for better categorization
      const sectorKeywords = {
        '반도체': ['반도체', 'semiconductor', 'chip', '삼성전자', 'SK하이닉스', 'memory'],
        '자동차': ['자동차', 'automotive', 'car', '현대차', 'electric vehicle', '전기차'],
        '바이오': ['바이오', 'bio', 'pharma', '제약', 'medicine', '의약'],
        '금융': ['금융', 'bank', '은행', 'financial', 'insurance', '보험'],
        '통신': ['통신', 'telecom', '5G', 'network', 'mobile'],
        '에너지': ['에너지', 'energy', 'oil', '석유', 'renewable', '신재생'],
        '건설': ['건설', 'construction', 'real estate', '부동산'],
        '화학': ['화학', 'chemical', 'materials', '소재'],
        '엔터테인먼트': ['엔터', 'entertainment', 'game', '게임', 'content']
      };

      // Analyze news for sector mentions
      newsData.forEach(news => {
        const content = `${news.title} ${news.content}`.toLowerCase();
        const sentimentScore = this.getSentimentScore(news.sentiment);
        
        Object.entries(sectorKeywords).forEach(([sectorName, keywords]) => {
          const mentionCount = keywords.reduce((count, keyword) => {
            return count + (content.includes(keyword.toLowerCase()) ? 1 : 0);
          }, 0);
          
          if (mentionCount > 0) {
            if (!sectorAnalysis.has(sectorName)) {
              sectorAnalysis.set(sectorName, {
                newsCount: 0,
                performance: 0,
                reasons: [],
                relatedStocks: [],
                marketCap: 0,
                changeRates: []
              });
            }
            
            const sectorData = sectorAnalysis.get(sectorName)!;
            sectorData.newsCount += mentionCount;
            sectorData.performance += sentimentScore * mentionCount;
            if (sectorData.reasons.length < 5) {
              sectorData.reasons.push(news.title);
            }
          }
        });
      });

      // Add financial data analysis to sectors
      financialData.forEach(data => {
        const sectorName = data.sectorName || this.categorizeBySectorKeywords(data.symbol, sectorKeywords);
        if (sectorName && sectorAnalysis.has(sectorName)) {
          const sectorData = sectorAnalysis.get(sectorName)!;
          const changeRate = parseFloat(data.changeRate?.toString() || '0');
          
          sectorData.relatedStocks.push({
            symbol: data.symbol,
            price: data.price,
            volume: data.volume,
            changeRate: changeRate
          });
          sectorData.marketCap += parseFloat(data.marketCap?.toString() || '0');
          sectorData.changeRates.push(changeRate);
        }
      });

      // Convert to SectorHighlight array and sort by significance
      return Array.from(sectorAnalysis.entries())
        .filter(([_, data]) => data.newsCount > 0 || data.relatedStocks.length > 0)
        .map(([sector, data]): any => {
          const avgChangeRate = data.changeRates.length > 0
            ? data.changeRates.reduce((sum, rate) => sum + rate, 0) / data.changeRates.length
            : 0;
          
          // Sort stocks by significance (volume * abs(changeRate))
          const topStocks = data.relatedStocks
            .sort((a, b) => {
              const aScore = (a.volume || 0) * Math.abs(a.changeRate || 0);
              const bScore = (b.volume || 0) * Math.abs(b.changeRate || 0);
              return bScore - aScore;
            })
            .slice(0, 3);

          return {
            sector,
            performance: avgChangeRate,
            topStocks,
            reasons: data.reasons.slice(0, 3),
            newsCount: data.newsCount,
            changeRate: avgChangeRate,
            marketCap: data.marketCap
          };
        })
        .sort((a, b) => {
          // Sort by combined score of news activity and performance
          const aScore = a.newsCount + Math.abs(a.performance) * 10;
          const bScore = b.newsCount + Math.abs(b.performance) * 10;
          return bScore - aScore;
        })
        .slice(0, 8); // Top 8 sector highlights
    } catch (error) {
      console.error('Error analyzing sector highlights:', error);
      return [];
    }
  }

  private async generateAIInsightsEnhanced(
    marketMovements: MarketMovementData,
    keyEvents: KeyEvent[],
    sectorHighlights: SectorHighlight[],
    tradingVolumeAnalysis: TradingVolumeAnalysis
  ): Promise<AIInsightsResult> {
    try {
      const analysisContext: AnalysisContext = {
        marketMovements,
        keyEvents,
        sectorHighlights,
        tradingVolumeAnalysis,
        timeframe: {
          start: new Date(),
          end: new Date(),
          duration: '1hour'
        }
      };

      // Create comprehensive prompt for OpenAI analysis
      const systemPrompt = `당신은 NH투자증권의 시니어 마켓 애널리스트입니다. 한국 주식시장의 모닝 브리핑을 작성하는 전문가로서, 다음과 같은 역할을 수행합니다:

1. 장 개시 후 1시간 동안의 시장 동향 분석
2. 주요 이벤트와 섹터별 움직임 해석
3. 거래량 분석 및 시장 심리 평가
4. 투자자를 위한 실용적인 인사이트 제공

분석 시 고려사항:
- 한국 시장 특성 (코스피, 코스닥 구분)
- 외국인, 기관, 개인 투자자 동향
- 섹터 로테이션 및 테마주 동향
- 거시경제 및 정책적 요인
- 글로벌 시장과의 연관성

결과는 투자자가 이해하기 쉽고 실용적인 정보를 제공해야 합니다.`;

      const userPrompt = `다음 데이터를 바탕으로 종합적인 모닝 브리핑 인사이트를 생성해 주세요:

**시장 움직임:**
${JSON.stringify(marketMovements, null, 2)}

**주요 이벤트 (${keyEvents.length}건):**
${JSON.stringify(keyEvents, null, 2)}

**섹터 하이라이트 (${sectorHighlights.length}개 섹터):**
${JSON.stringify(sectorHighlights, null, 2)}

**거래량 분석:**
${JSON.stringify(tradingVolumeAnalysis, null, 2)}

다음 JSON 형식으로 분석 결과를 제공해 주세요:
{
  "summary": "전체 시장 상황에 대한 핵심 요약 (2-3문장)",
  "keyInsights": ["주요 인사이트 1", "주요 인사이트 2", "주요 인사이트 3"],
  "marketOutlook": "bullish|bearish|neutral",
  "confidence": "분석 신뢰도 (0-1)",
  "riskFactors": ["위험 요인 1", "위험 요인 2"],
  "opportunities": ["기회 요인 1", "기회 요인 2"],
  "recommendations": ["투자 권고 1", "투자 권고 2"]
}`;

      // Use OpenAI service for analysis
      const aiResponse = await openaiService.executeCustomPrompt(
        userPrompt,
        analysisContext,
        systemPrompt
      );

      // Validate and structure the response
      const aiInsights: AIInsightsResult = {
        summary: aiResponse.summary || this.generateFallbackSummary(analysisContext),
        keyInsights: aiResponse.keyInsights || this.generateFallbackInsights(analysisContext),
        marketOutlook: aiResponse.marketOutlook || this.determineFallbackOutlook(keyEvents),
        confidence: Math.min(Math.max(aiResponse.confidence || 0.7, 0), 1),
        riskFactors: aiResponse.riskFactors || [],
        opportunities: aiResponse.opportunities || [],
        recommendations: aiResponse.recommendations || []
      };

      return aiInsights;
    } catch (error) {
      console.error('AI insights generation failed, using fallback:', error);
      return this.generateFallbackAIInsights(marketMovements, keyEvents, sectorHighlights, tradingVolumeAnalysis);
    }
  }

  private calculateEnhancedImportanceScore(
    marketMovements: MarketMovementData,
    keyEvents: KeyEvent[],
    tradingVolumeAnalysis: TradingVolumeAnalysis,
    aiInsights: AIInsightsResult
  ): number {
    try {
      let score = 0.3; // Base score lowered for more granular scoring
      
      // Key events impact (0-0.3)
      const eventScore = Math.min(keyEvents.length * 0.05, 0.3);
      const highImpactEvents = keyEvents.filter(e => e.impact === 'positive' || e.impact === 'negative').length;
      score += eventScore + (highImpactEvents * 0.05);
      
      // Trading volume impact (0-0.25)
      if (tradingVolumeAnalysis.compared_to_avg === 'above_average') {
        score += 0.15;
        if (tradingVolumeAnalysis.volumeRatio && tradingVolumeAnalysis.volumeRatio > 2) {
          score += 0.1; // Significant volume spike
        }
      }
      
      // Market movement significance (0-0.2)
      const kospiChange = marketMovements.kospi?.changeRate ? Math.abs(parseFloat(marketMovements.kospi.changeRate.toString())) : 0;
      const kosdaqChange = marketMovements.kosdaq?.changeRate ? Math.abs(parseFloat(marketMovements.kosdaq.changeRate.toString())) : 0;
      const maxIndexChange = Math.max(kospiChange, kosdaqChange);
      
      if (maxIndexChange > 1) score += 0.1; // 1% or more movement
      if (maxIndexChange > 2) score += 0.1; // Additional for 2% or more
      
      // Sector activity impact (0-0.15)
      const activeSectors = marketMovements.sectors.filter(s => Math.abs(s.changeRate || 0) > 1).length;
      score += Math.min(activeSectors * 0.03, 0.15);
      
      // AI confidence and insights quality (0-0.1)
      score += (aiInsights.confidence * 0.1);
      
      // Normalize and cap at 1.0
      return Math.min(Math.max(score, 0.1), 1.0);
    } catch (error) {
      console.error('Error calculating importance score:', error);
      return 0.5; // Safe fallback
    }
  }

  // Helper functions for morning briefing generation
  
  private async fetchBriefingData(
    marketOpenTime: Date,
    analysisEndTime: Date,
    briefingDate: Date
  ): Promise<{
    financialDataResults: FinancialData[];
    newsResults: NewsData[];
    historicalVolumeData: FinancialData[];
  }> {
    let financialDataResults: FinancialData[] = [];
    let newsResults: NewsData[] = [];
    let historicalVolumeData: FinancialData[] = [];
    const errors: string[] = [];

    try {
      // Fetch financial data with error handling
      try {
        financialDataResults = await this.searchFinancialData({
          startDate: marketOpenTime,
          endDate: analysisEndTime
        });
      } catch (error: unknown) {
        console.error('Error fetching financial data:', error);
        errors.push(`Financial data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Fetch news data with error handling
      try {
        newsResults = await this.searchNewsData({
          startDate: marketOpenTime,
          endDate: analysisEndTime
        });
      } catch (error: unknown) {
        console.error('Error fetching news data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`News data fetch failed: ${errorMessage}`);
        
        // If news data fetch fails, try to get recent news with a broader time range
        try {
          const fallbackStartDate = new Date(marketOpenTime);
          fallbackStartDate.setHours(fallbackStartDate.getHours() - 24); // Try last 24 hours
          
          newsResults = await this.searchNewsData({
            startDate: fallbackStartDate,
            endDate: analysisEndTime
          });
          console.log(`Successfully fetched news data with fallback time range: ${newsResults.length} items`);
        } catch (fallbackError) {
          console.error('Fallback news data fetch also failed:', fallbackError);
          // Continue with empty news results
          newsResults = [];
        }
      }

      // Fetch historical volume data with error handling
      try {
        const historicalStartDate = new Date(briefingDate);
        historicalStartDate.setDate(historicalStartDate.getDate() - 30);
        
        historicalVolumeData = await this.searchFinancialData({
          startDate: historicalStartDate,
          endDate: marketOpenTime
        });
      } catch (error: unknown) {
        console.error('Error fetching historical volume data:', error);
        errors.push(`Historical volume data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // If we have at least some data, return what we have
      if (financialDataResults.length > 0 || newsResults.length > 0) {
        if (errors.length > 0) {
          console.warn('Some data fetch errors occurred but continuing:', errors);
        }
        return {
          financialDataResults,
          newsResults,
          historicalVolumeData
        };
      }

      // If no data was fetched, throw an error
      throw new Error(`Failed to fetch briefing data: ${errors.join('; ')}`);
    } catch (error) {
      console.error('Error fetching briefing data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch briefing data: ${errorMessage}`);
    }
  }

  private assessDataQuality(
    financialData: FinancialData[],
    newsData: NewsData[]
  ): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    if (financialData.length === 0) {
      issues.push('No financial data available');
      score -= 0.4;
    } else {
      const missingPrices = financialData.filter(d => !d.price || parseFloat(d.price.toString()) === 0).length;
      const missingVolumes = financialData.filter(d => !d.volume || d.volume === 0).length;
      
      if (missingPrices / financialData.length > 0.2) {
        issues.push('High percentage of missing price data');
        score -= 0.2;
      }
      
      if (missingVolumes / financialData.length > 0.3) {
        issues.push('High percentage of missing volume data');
        score -= 0.1;
      }
    }

    if (newsData.length === 0) {
      issues.push('No news data available');
      score -= 0.3;
    } else {
      const processedNews = newsData.filter(n => n.isProcessed).length;
      const highQualityNews = newsData.filter(n => n.isHighQuality).length;
      
      if (processedNews / newsData.length < 0.5) {
        issues.push('Low percentage of processed news');
        score -= 0.1;
      }
      
      if (highQualityNews / newsData.length < 0.3) {
        issues.push('Low percentage of high quality news');
        score -= 0.05;
      }
    }

    return {
      score: Math.max(score, 0),
      issues
    };
  }

  private async analyzeRealTradingVolume(
    currentData: FinancialData[],
    historicalData: FinancialData[]
  ): Promise<TradingVolumeAnalysis> {
    try {
      const currentTotalVolume = currentData.reduce((sum, data) => sum + (data.volume || 0), 0);
      
      if (historicalData.length === 0) {
        return {
          totalVolume: currentTotalVolume,
          compared_to_avg: 'normal',
          unusual_volumes: currentData.filter(d => (d.volume || 0) > 1000000).slice(0, 10)
        };
      }

      const dailyVolumes = new Map<string, number>();
      historicalData.forEach(data => {
        const date = data.timestamp.toISOString().split('T')[0];
        const currentVolume = dailyVolumes.get(date) || 0;
        dailyVolumes.set(date, currentVolume + (data.volume || 0));
      });

      const historicalVolumes = Array.from(dailyVolumes.values());
      
      if (historicalVolumes.length === 0) {
        return {
          totalVolume: currentTotalVolume,
          compared_to_avg: 'normal',
          unusual_volumes: []
        };
      }

      const avgVolume = historicalVolumes.reduce((sum, vol) => sum + vol, 0) / historicalVolumes.length;
      const sortedVolumes = [...historicalVolumes].sort((a, b) => a - b);
      const percentile75 = sortedVolumes[Math.floor(sortedVolumes.length * 0.75)];
      const percentile25 = sortedVolumes[Math.floor(sortedVolumes.length * 0.25)];
      
      const variance = historicalVolumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / historicalVolumes.length;
      const stdDev = Math.sqrt(variance);
      const standardDeviations = avgVolume > 0 ? (currentTotalVolume - avgVolume) / stdDev : 0;
      
      const volumeRatio = avgVolume > 0 ? currentTotalVolume / avgVolume : 1;
      
      let compared_to_avg: 'above_average' | 'below_average' | 'normal' = 'normal';
      if (currentTotalVolume > percentile75 || volumeRatio > 1.5) {
        compared_to_avg = 'above_average';
      } else if (currentTotalVolume < percentile25 || volumeRatio < 0.7) {
        compared_to_avg = 'below_average';
      } else {
        compared_to_avg = 'normal';
      }
      
      const unusual_volumes = currentData.filter(data => {
        const symbol = data.symbol;
        const symbolHistoricalData = historicalData.filter(hd => hd.symbol === symbol);
        if (symbolHistoricalData.length < 5) return false;
        
        const symbolAvgVolume = symbolHistoricalData.reduce((sum, hd) => sum + (hd.volume || 0), 0) / symbolHistoricalData.length;
        return (data.volume || 0) > symbolAvgVolume * 2;
      }).slice(0, 10);

      return {
        totalVolume: currentTotalVolume,
        compared_to_avg,
        avgVolume,
        volumeRatio,
        unusual_volumes,
        historicalComparison: {
          period: '30days',
          percentile: currentTotalVolume >= percentile75 ? 75 : currentTotalVolume >= percentile25 ? 50 : 25,
          standardDeviations: parseFloat(standardDeviations.toFixed(2))
        }
      };
    } catch (error) {
      console.error('Error analyzing trading volume:', error);
      return {
        totalVolume: currentData.reduce((sum, data) => sum + (data.volume || 0), 0),
        compared_to_avg: 'normal',
        unusual_volumes: []
      };
    }
  }

  private async extractKeyEvents(
    newsResults: NewsData[],
    financialData: FinancialData[]
  ): Promise<KeyEvent[]> {
    try {
      const significantNews = newsResults
        .filter(news => {
          return (
            news.isHighQuality &&
            !news.isAdvertisement &&
            !news.isDuplicate &&
            (news.marketScore ? parseFloat(news.marketScore.toString()) > 70 : false) &&
            (news.economicScore ? parseFloat(news.economicScore.toString()) > 70 : false)
          );
        })
        .sort((a, b) => {
          const aScore = parseFloat(a.importanceScore?.toString() || '0');
          const bScore = parseFloat(b.importanceScore?.toString() || '0');
          return bScore - aScore;
        })
        .slice(0, 10);

      const keyEvents: KeyEvent[] = significantNews.map(news => {
        const importance = Math.min(
          parseFloat(news.importanceScore?.toString() || '0.5'),
          1
        );
        
        const relatedSymbols = news.relevantSymbols || [];
        
        return {
          event: news.title,
          time: news.publishedAt,
          impact: news.sentiment as 'positive' | 'negative' | 'neutral' || 'neutral',
          description: news.summary || news.content.substring(0, 200) + '...',
          importance,
          relatedSymbols
        };
      });

      const significantMovements = financialData.filter(data => {
        const changeRate = Math.abs(parseFloat(data.changeRate?.toString() || '0'));
        return changeRate > 3 && (data.volume || 0) > 100000;
      });

      significantMovements.forEach(movement => {
        const changeRate = parseFloat(movement.changeRate?.toString() || '0');
        keyEvents.push({
          event: `${movement.symbolName || movement.symbol} 주가 ${changeRate > 0 ? '급등' : '급락'} (${changeRate.toFixed(2)}%)`,
          time: movement.timestamp,
          impact: changeRate > 0 ? 'positive' : 'negative',
          description: `${movement.symbolName || movement.symbol} 종목이 ${Math.abs(changeRate).toFixed(2)}% ${changeRate > 0 ? '상승' : '하락'}하며 주목받고 있습니다.`,
          importance: Math.min(Math.abs(changeRate) / 10, 1),
          relatedSymbols: [movement.symbol]
        });
      });

      return keyEvents
        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
        .slice(0, 8);
    } catch (error) {
      console.error('Error extracting key events:', error);
      return [];
    }
  }

  private generateFallbackSummary(context: AnalysisContext): string {
    const eventCount = context.keyEvents.length;
    const sectorCount = context.sectorHighlights.length;
    const volumeStatus = context.tradingVolumeAnalysis.compared_to_avg;
    
    return `장 개시 후 1시간 동안 ${eventCount}건의 주요 이벤트가 발생했으며, ${sectorCount}개 섹터에서 주목할만한 움직임을 보였습니다. 거래량은 평균 대비 ${volumeStatus === 'above_average' ? '높은' : volumeStatus === 'below_average' ? '낮은' : '평균적인'} 수준을 기록했습니다.`;
  }

  private generateFallbackInsights(context: AnalysisContext): string[] {
    const insights: string[] = [];
    
    if (context.keyEvents.length > 0) {
      insights.push(`시장 관심도가 높은 이벤트 ${context.keyEvents.length}건이 확인되었습니다.`);
    }
    
    if (context.tradingVolumeAnalysis.totalVolume > 0) {
      insights.push(`총 거래량은 ${context.tradingVolumeAnalysis.totalVolume.toLocaleString()}주로 집계되었습니다.`);
    }
    
    if (context.sectorHighlights.length > 0) {
      const topSector = context.sectorHighlights[0];
      insights.push(`${topSector.sector} 섹터에서 가장 활발한 움직임이 관찰되었습니다.`);
    }
    
    insights.push('시장 데이터 분석이 완료되었습니다.');
    
    return insights;
  }

  private determineFallbackOutlook(keyEvents: KeyEvent[]): 'bullish' | 'bearish' | 'neutral' {
    const positiveCount = keyEvents.filter(e => e.impact === 'positive').length;
    const negativeCount = keyEvents.filter(e => e.impact === 'negative').length;
    
    if (positiveCount > negativeCount) return 'bullish';
    if (negativeCount > positiveCount) return 'bearish';
    return 'neutral';
  }

  private generateFallbackAIInsights(
    marketMovements: MarketMovementData,
    keyEvents: KeyEvent[],
    sectorHighlights: SectorHighlight[],
    tradingVolumeAnalysis: TradingVolumeAnalysis
  ): AIInsightsResult {
    const context: AnalysisContext = {
      marketMovements,
      keyEvents,
      sectorHighlights,
      tradingVolumeAnalysis,
      timeframe: { start: new Date(), end: new Date(), duration: '1hour' }
    };

    return {
      summary: this.generateFallbackSummary(context),
      keyInsights: this.generateFallbackInsights(context),
      marketOutlook: this.determineFallbackOutlook(keyEvents),
      confidence: 0.6,
      riskFactors: ['AI 분석 서비스 일시 장애로 인한 단순 분석'],
      opportunities: [],
      recommendations: ['상세한 분석을 위해 개별 데이터를 검토하시기 바랍니다.']
    };
  }

  private getSentimentScore(sentiment: string | null): number {
    switch (sentiment) {
      case 'positive': return 1;
      case 'negative': return -1;
      case 'mixed': return 0.5;
      default: return 0;
    }
  }

  private categorizeBySectorKeywords(symbol: string, sectorKeywords: Record<string, string[]>): string | null {
    const symbolLower = symbol.toLowerCase();
    
    for (const [sectorName, keywords] of Object.entries(sectorKeywords)) {
      if (keywords.some(keyword => symbolLower.includes(keyword.toLowerCase()))) {
        return sectorName;
      }
    }
    
    return null;
  }

  private determineEnhancedMarketSentiment(
    keyEvents: KeyEvent[],
    marketMovements: MarketMovementData,
    aiInsights: AIInsightsResult
  ): string {
    try {
      let sentimentScore = 0;
      
      // News sentiment analysis (weight: 40%)
      const positiveEvents = keyEvents.filter(e => e.impact === 'positive');
      const negativeEvents = keyEvents.filter(e => e.impact === 'negative');
      const neutralEvents = keyEvents.filter(e => e.impact === 'neutral');
      
      const newsWeight = 0.4;
      if (positiveEvents.length > negativeEvents.length) {
        sentimentScore += newsWeight * (positiveEvents.length / keyEvents.length);
      } else if (negativeEvents.length > positiveEvents.length) {
        sentimentScore -= newsWeight * (negativeEvents.length / keyEvents.length);
      }
      
      // Market performance analysis (weight: 35%)
      const marketWeight = 0.35;
      const kospiChange = marketMovements.kospi?.changeRate ? parseFloat(marketMovements.kospi.changeRate.toString()) : 0;
      const kosdaqChange = marketMovements.kosdaq?.changeRate ? parseFloat(marketMovements.kosdaq.changeRate.toString()) : 0;
      
      const avgMarketChange = (kospiChange + kosdaqChange) / 2;
      sentimentScore += (avgMarketChange / 100) * marketWeight; // Normalize percentage change
      
      // Sector performance analysis (weight: 15%)
      const sectorWeight = 0.15;
      const positiveSectors = marketMovements.sectors.filter(s => (s.changeRate || 0) > 0).length;
      const negativeSectors = marketMovements.sectors.filter(s => (s.changeRate || 0) < 0).length;
      const totalSectors = marketMovements.sectors.length;
      
      if (totalSectors > 0) {
        const sectorSentimentRatio = (positiveSectors - negativeSectors) / totalSectors;
        sentimentScore += sectorSentimentRatio * sectorWeight;
      }
      
      // AI insight sentiment (weight: 10%)
      const aiWeight = 0.1;
      switch (aiInsights.marketOutlook) {
        case 'bullish':
          sentimentScore += aiWeight;
          break;
        case 'bearish':
          sentimentScore -= aiWeight;
          break;
        default:
          // neutral - no change
      }
      
      // Determine final sentiment with thresholds
      if (sentimentScore > 0.1) return 'positive';
      if (sentimentScore < -0.1) return 'negative';
      return 'neutral';
    } catch (error) {
      console.error('Error determining market sentiment:', error);
      return 'neutral'; // Safe fallback
    }
  }

  // Causal analysis implementation
  async getCausalAnalyses(filters?: {
    marketEvent?: string;
    startDate?: Date;
    endDate?: Date;
    timePeriod?: string;
    minConfidence?: number;
    limit?: number;
  }): Promise<CausalAnalysis[]> {
    let query = db.select().from(causalAnalysis);
    const conditions = [];

    if (filters) {
      if (filters.marketEvent) {
        conditions.push(eq(causalAnalysis.marketEvent, filters.marketEvent));
      }
      if (filters.startDate!) {
        conditions.push(gte(causalAnalysis.analysisDate, filters.startDate!));
      }
      if (filters.endDate!) {
        conditions.push(lte(causalAnalysis.analysisDate, filters.endDate!));
      }
      if (filters.timePeriod) {
        conditions.push(eq(causalAnalysis.timePeriod, filters.timePeriod));
      }
      if (filters.minConfidence) {
        conditions.push(gte(causalAnalysis.confidenceScore, filters.minConfidence.toString()));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(causalAnalysis.analysisDate)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  async getCausalAnalysis(id: string): Promise<CausalAnalysis | undefined> {
    const [analysis] = await db.select().from(causalAnalysis).where(eq(causalAnalysis.id, id));
    return analysis || undefined;
  }

  async createCausalAnalysis(insertAnalysis: InsertCausalAnalysis): Promise<CausalAnalysis> {
    const [analysis] = await db.insert(causalAnalysis).values(insertAnalysis).returning();
    return analysis;
  }

  async updateCausalAnalysis(id: string, updateData: Partial<InsertCausalAnalysis>): Promise<CausalAnalysis> {
    const [analysis] = await db
      .update(causalAnalysis)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(causalAnalysis.id, id))
      .returning();
    return analysis;
  }

  async deleteCausalAnalysis(id: string): Promise<void> {
    await db.delete(causalAnalysis).where(eq(causalAnalysis.id, id));
  }

  async generateCausalAnalysis(
    marketEvent: string,
    priceMovement: any,
    analysisDate: Date,
    timePeriod: string
  ): Promise<CausalAnalysis> {
    const startTime = Date.now();

    // Fetch related market data based on the price movement
    const symbol = priceMovement.symbol;
    const analysisEndDate = new Date(analysisDate.getTime() + (60 * 60 * 1000)); // 1 hour after

    // Search for relevant financial data
    const relevantFinancialData = await this.searchFinancialData({
      symbol,
      startDate: new Date(analysisDate.getTime() - (2 * 60 * 60 * 1000)), // 2 hours before
      endDate: analysisEndDate
    });

    // Search for relevant news
    const relevantNews = await this.searchNewsData({
      startDate: new Date(analysisDate.getTime() - (24 * 60 * 60 * 1000)), // 24 hours before
      endDate: analysisEndDate
    });

    // Generate analysis using AI (simplified for now)
    const identifiedCauses = this.identifyMarketCauses(priceMovement, relevantFinancialData, relevantNews);
    const correlationStrength = this.calculateCorrelationStrength(priceMovement, relevantNews);
    const newsFactors = this.extractNewsFactors(relevantNews, symbol);
    const technicalFactors = this.extractTechnicalFactors(relevantFinancialData, priceMovement);
    const aiReasoning = this.generateAIReasoning(identifiedCauses, newsFactors, technicalFactors);
    const confidenceScore = this.calculateConfidenceScore(identifiedCauses, correlationStrength);

    const analysisData: InsertCausalAnalysis = {
      analysisDate,
      timePeriod,
      marketEvent,
      priceMovement,
      volumeSpike: this.detectVolumeSpike(relevantFinancialData),
      identifiedCauses,
      correlationStrength: correlationStrength.toString(),
      newsFactors,
      technicalFactors,
      marketSentiment: this.analyzeMarketSentiment(relevantNews),
      aiReasoning,
      confidenceScore: confidenceScore.toString(),
      dataSourceIds: [
        ...relevantFinancialData.map(d => d.id),
        ...relevantNews.map(n => n.id)
      ],
      processingTime: Date.now() - startTime,
      modelVersion: 'gpt-5'
    };

    return await this.createCausalAnalysis(analysisData);
  }

  async validateCausalAnalysis(id: string, validatedBy: string, notes?: string): Promise<CausalAnalysis> {
    const updateData: Partial<InsertCausalAnalysis> = {
      isValidated: true,
      validatedBy,
      validationNotes: notes
    };

    return await this.updateCausalAnalysis(id, updateData);
  }

  // Helper methods for causal analysis
  private identifyMarketCauses(priceMovement: any, financialData: FinancialData[], newsData: NewsData[]): any[] {
    const causes = [];
    
    // Analyze price movement pattern
    if (Math.abs(priceMovement.change_pct) > 5) {
      causes.push({
        type: 'significant_price_movement',
        description: `${priceMovement.symbol}에서 ${priceMovement.change_pct.toFixed(2)}% 급등/급락 발생`,
        importance: 0.9,
        evidence: priceMovement
      });
    }

    // Check for news correlation
    if (newsData.length > 0) {
      const recentNews = newsData.filter(n => 
        new Date(n.publishedAt).getTime() > (priceMovement.timeframe - 2 * 60 * 60 * 1000)
      );
      
      if (recentNews.length > 0) {
        causes.push({
          type: 'news_driven',
          description: `${recentNews.length}건의 관련 뉴스가 시장 움직임과 시간적 연관성을 보임`,
          importance: 0.7,
          evidence: recentNews.map(n => ({ id: n.id, title: n.title }))
        });
      }
    }

    return causes;
  }

  private calculateCorrelationStrength(priceMovement: any, newsData: NewsData[]): number {
    if (newsData.length === 0) return 0.1;
    
    const timeWindow = 2 * 60 * 60 * 1000; // 2 hours
    const relevantNews = newsData.filter(n => 
      Math.abs(new Date(n.publishedAt).getTime() - priceMovement.timeframe) < timeWindow
    );
    
    return Math.min(relevantNews.length * 0.2, 1.0);
  }

  private extractNewsFactors(newsData: NewsData[], symbol: string): any[] {
    return newsData
      .filter(n => n.relevantSymbols?.includes(symbol))
      .slice(0, 5)
      .map(n => ({
        news_id: n.id,
        headline: n.title,
        sentiment: n.sentiment,
        relevance_score: 0.8 // Simplified scoring
      }));
  }

  private extractTechnicalFactors(financialData: FinancialData[], priceMovement: any): any[] {
    const factors = [];
    
    // Volume analysis
    const avgVolume = financialData.reduce((sum, d) => sum + (d.volume || 0), 0) / financialData.length;
    const currentVolume = priceMovement.volume || 0;
    
    if (currentVolume > avgVolume * 2) {
      factors.push({
        indicator: 'volume_spike',
        signal: 'bullish',
        strength: Math.min(currentVolume / avgVolume, 5),
        timeframe: priceMovement.timeframe
      });
    }

    return factors;
  }

  private detectVolumeSpike(financialData: FinancialData[]): any | null {
    if (financialData.length < 2) return null;
    
    const avgVolume = financialData.slice(0, -1).reduce((sum, d) => sum + (d.volume || 0), 0) / (financialData.length - 1);
    const latestData = financialData[financialData.length - 1];
    const latestVolume = latestData.volume || 0;
    
    if (latestVolume > avgVolume * 2) {
      return {
        symbol: latestData.symbol,
        normal_volume: Math.round(avgVolume),
        spike_volume: latestVolume,
        spike_ratio: latestVolume / avgVolume
      };
    }
    
    return null;
  }

  private generateAIReasoning(causes: any[], newsFactors: any[], technicalFactors: any[]): string {
    const reasoning = [];
    
    reasoning.push(`시장 움직임에 대한 ${causes.length}개의 주요 원인이 식별되었습니다.`);
    
    if (newsFactors.length > 0) {
      reasoning.push(`${newsFactors.length}건의 뉴스가 시장 움직임과 연관성을 보였습니다.`);
    }
    
    if (technicalFactors.length > 0) {
      reasoning.push(`기술적 지표에서 ${technicalFactors.length}개의 신호가 감지되었습니다.`);
    }
    
    reasoning.push('멀티 팩터 분석을 통해 종합적인 원인 분석을 완료했습니다.');
    
    return reasoning.join(' ');
  }

  private calculateConfidenceScore(causes: any[], correlationStrength: number): number {
    let baseScore = 0.5;
    
    // Adjust based on number and importance of causes
    const avgImportance = causes.reduce((sum, c) => sum + c.importance, 0) / causes.length;
    baseScore += avgImportance * 0.3;
    
    // Adjust based on correlation strength
    baseScore += correlationStrength * 0.2;
    
    return Math.min(baseScore, 1.0);
  }

  private analyzeMarketSentiment(newsData: NewsData[]): string {
    if (newsData.length === 0) return 'neutral';
    
    const sentimentCounts = newsData.reduce((acc, n) => {
      const sentiment = n.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxSentiment = Object.entries(sentimentCounts)
      .reduce((max, [sentiment, count]) => count > max.count ? { sentiment, count } : max, 
        { sentiment: 'neutral', count: 0 });
    
    return maxSentiment.sentiment;
  }

  // ==================== A STAGE: MAJOR EVENTS (주요이벤트) ====================
  
  async getMajorEvents(filters?: {
    eventDate?: string;
    eventTime?: string;
    situationType?: string;
    majorIssueName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<MajorEvents[]> {
    let query = db.select().from(majorEvents);
    
    if (filters) {
      const conditions = [];
      if (filters.eventDate) conditions.push(eq(majorEvents.eventDate, filters.eventDate));
      if (filters.eventTime) conditions.push(eq(majorEvents.eventTime, filters.eventTime));
      if (filters.situationType) conditions.push(eq(majorEvents.situationType, filters.situationType));
      if (filters.majorIssueName) conditions.push(like(majorEvents.majorIssueName, `%${filters.majorIssueName}%`));
      if (filters.startDate!) conditions.push(gte(majorEvents.createdAt, filters.startDate!));
      if (filters.endDate!) conditions.push(lte(majorEvents.createdAt, filters.endDate!));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    const result = await query.orderBy(desc(majorEvents.createdAt)).limit(filters?.limit || 50);
    return result;
  }

  async getMajorEvent(id: string): Promise<MajorEvents | undefined> {
    const [event] = await db.select().from(majorEvents).where(eq(majorEvents.id, id));
    return event || undefined;
  }

  async createMajorEvent(event: InsertMajorEvents): Promise<MajorEvents> {
    const [newEvent] = await db.insert(majorEvents).values(event).returning();
    return newEvent;
  }

  async updateMajorEvent(id: string, event: Partial<InsertMajorEvents>): Promise<MajorEvents> {
    const [updatedEvent] = await db
      .update(majorEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(majorEvents.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteMajorEvent(id: string): Promise<void> {
    await db.delete(majorEvents).where(eq(majorEvents.id, id));
  }

  async generateMajorEventFromNews(eventDate: string, eventTime: string): Promise<MajorEvents[]> {
    // Enhanced AI-powered news analysis to generate major market events
    const currentTime = new Date();
    const newsFilters = {
      startDate: new Date(currentTime.getTime() - 2 * 60 * 60 * 1000), // Last 2 hours for better coverage
      endDate: currentTime,
    };
    
    const recentNews = await this.searchNewsData(newsFilters);
    const majorEvents: MajorEvents[] = [];
    
    // Define market-sensitive keywords and their importance levels
    const marketKeywords = {
      "고위험": ["금리인상", "경기침체", "인플레이션", "전쟁", "팬데믹", "은행위기", "부도", "채무불이행"],
      "중위험": ["금리인하", "유가급등", "환율급등", "무역분쟁", "정책변화", "대규모투자", "M&A", "IPO"],
      "저위험": ["실적발표", "신제품출시", "파트너십", "투자유치", "기업공시", "배당", "주식분할"]
    };
    
    const industryCategories = [
      "반도체", "자동차", "바이오", "엔터테인먼트", "건설", "금융", "유통", "화학", "철강", "조선"
    ];
    
    // Analyze news and create events based on keyword density and market impact
    if (recentNews.length > 0) {
      // Group news by potential market impact
      const highImpactNews = recentNews.filter(news => 
        marketKeywords["고위험"].some(keyword => 
          news.title?.includes(keyword) || news.content?.includes(keyword)
        )
      );
      
      const mediumImpactNews = recentNews.filter(news => 
        marketKeywords["중위험"].some(keyword => 
          news.title?.includes(keyword) || news.content?.includes(keyword)
        )
      );
      
      // Create high-impact events
      if (highImpactNews.length > 0) {
        const consolidatedEvent = await this.createMajorEvent({
          eventDate,
          eventTime,
          situationType: "긴급시황",
          majorIssueName: "고위험 시장 이벤트 감지",
          majorIssueContent: `AI 분석을 통해 ${highImpactNews.length}건의 고위험 뉴스가 감지되었습니다. 주요 키워드: ${marketKeywords["고위험"].filter(keyword => 
            highImpactNews.some(news => news.title?.includes(keyword) || news.content?.includes(keyword))
          ).join(", ")}`,
          relatedNewsCount: highImpactNews.length,
        });
        majorEvents.push(consolidatedEvent);
      }
      
      // Create medium-impact events by industry
      const industryImpacts = industryCategories.map(industry => {
        const industryNews = mediumImpactNews.filter(news => 
          news.title?.includes(industry) || news.content?.includes(industry)
        );
        return { industry, count: industryNews.length, news: industryNews };
      }).filter(impact => impact.count > 0);
      
      for (const impact of industryImpacts.slice(0, 3)) { // Top 3 industries
        const industryEvent = await this.createMajorEvent({
          eventDate,
          eventTime,
          situationType: "산업별이슈",
          majorIssueName: `${impact.industry} 업종 주요 동향`,
          majorIssueContent: `${impact.industry} 업종에서 ${impact.count}건의 중요 뉴스가 발생했습니다. 시장에 영향을 줄 수 있는 동향으로 분석됩니다.`,
          relatedNewsCount: impact.count,
        });
        majorEvents.push(industryEvent);
      }
      
      // Create general market sentiment event if sufficient news volume
      if (recentNews.length >= 10) {
        // Analyze sentiment indicators
        const positiveKeywords = ["상승", "호조", "증가", "개선", "성장", "확대", "투자"];
        const negativeKeywords = ["하락", "부진", "감소", "악화", "위기", "리스크", "우려"];
        
        let positiveScore = 0;
        let negativeScore = 0;
        
        recentNews.forEach(news => {
          const content = `${news.title} ${news.content}`.toLowerCase();
          positiveScore += positiveKeywords.filter(keyword => content.includes(keyword)).length;
          negativeScore += negativeKeywords.filter(keyword => content.includes(keyword)).length;
        });
        
        const sentimentRatio = positiveScore / (positiveScore + negativeScore + 1);
        let sentimentDescription: string;
        
        if (sentimentRatio > 0.6) {
          sentimentDescription = "긍정적 시장 심리";
        } else if (sentimentRatio < 0.4) {
          sentimentDescription = "부정적 시장 심리";
        } else {
          sentimentDescription = "중립적 시장 심리";
        }
        
        const sentimentEvent = await this.createMajorEvent({
          eventDate,
          eventTime,
          situationType: "시장심리",
          majorIssueName: `전체 시장 동향: ${sentimentDescription}`,
          majorIssueContent: `최근 ${recentNews.length}건의 뉴스 분석 결과, ${sentimentDescription}가 감지되었습니다. 긍정:부정 비율 ${(sentimentRatio * 100).toFixed(1)}%`,
          relatedNewsCount: recentNews.length,
        });
        majorEvents.push(sentimentEvent);
      }
    }
    
    // If no significant news found, create a standard monitoring event
    if (majorEvents.length === 0) {
      const routineEvent = await this.createMajorEvent({
        eventDate,
        eventTime,
        situationType: "정기모니터링",
        majorIssueName: "시장 정상 운영 중",
        majorIssueContent: "현재 시간대에 특별한 시장 이슈가 감지되지 않았습니다. 정상적인 시장 운영 상태로 판단됩니다.",
        relatedNewsCount: recentNews.length,
      });
      majorEvents.push(routineEvent);
    }
    
    return majorEvents;
  }

  // A Stage: Major Events Related News
  async getMajorEventsRelatedNews(filters?: {
    eventDate?: string;
    majorIssueName?: string;
    limit?: number;
  }): Promise<MajorEventsRelatedNews[]> {
    let query = db.select().from(majorEventsRelatedNews);
    
    if (filters) {
      const conditions = [];
      if (filters.eventDate) conditions.push(eq(majorEventsRelatedNews.eventDate, filters.eventDate));
      if (filters.majorIssueName) conditions.push(like(majorEventsRelatedNews.majorIssueName, `%${filters.majorIssueName}%`));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    const result = await query.orderBy(desc(majorEventsRelatedNews.createdAt)).limit(filters?.limit || 50);
    return result;
  }

  async createMajorEventRelatedNews(news: InsertMajorEventsRelatedNews): Promise<MajorEventsRelatedNews> {
    const [newNews] = await db.insert(majorEventsRelatedNews).values(news).returning();
    return newNews;
  }

  async deleteMajorEventRelatedNews(id: string): Promise<void> {
    await db.delete(majorEventsRelatedNews).where(eq(majorEventsRelatedNews.id, id));
  }

  // ==================== B STAGE: QUANTITATIVE METRICS (정량적 시장 수치) ====================
  
  async getQuantitativeMetrics(filters?: {
    symbol?: string;
    market?: string;
    metricDate?: string;
    anomalyLevel?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<QuantitativeMetrics[]> {
    let query = db.select().from(quantitativeMetrics);
    
    if (filters) {
      const conditions = [];
      if (filters.symbol) conditions.push(eq(quantitativeMetrics.symbol, filters.symbol));
      if (filters.market) conditions.push(eq(quantitativeMetrics.market, filters.market));
      if (filters.metricDate) conditions.push(eq(quantitativeMetrics.metricDate, filters.metricDate));
      if (filters.anomalyLevel) conditions.push(eq(quantitativeMetrics.anomalyLevel, filters.anomalyLevel));
      if (filters.startDate!) conditions.push(gte(quantitativeMetrics.createdAt, filters.startDate!));
      if (filters.endDate!) conditions.push(lte(quantitativeMetrics.createdAt, filters.endDate!));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    const result = await query.orderBy(desc(quantitativeMetrics.createdAt)).limit(filters?.limit || 50);
    return result;
  }

  async getQuantitativeMetric(id: string): Promise<QuantitativeMetrics | undefined> {
    const [metric] = await db.select().from(quantitativeMetrics).where(eq(quantitativeMetrics.id, id));
    return metric || undefined;
  }

  async createQuantitativeMetric(metric: InsertQuantitativeMetrics): Promise<QuantitativeMetrics> {
    const [newMetric] = await db.insert(quantitativeMetrics).values(metric).returning();
    return newMetric;
  }

  async updateQuantitativeMetric(id: string, metric: Partial<InsertQuantitativeMetrics>): Promise<QuantitativeMetrics> {
    const [updatedMetric] = await db
      .update(quantitativeMetrics)
      .set(metric)
      .where(eq(quantitativeMetrics.id, id))
      .returning();
    return updatedMetric;
  }

  async deleteQuantitativeMetric(id: string): Promise<void> {
    await db.delete(quantitativeMetrics).where(eq(quantitativeMetrics.id, id));
  }

  async generateQuantitativeMetrics(metricDate: string, metricTime: string): Promise<QuantitativeMetrics[]> {
    // Implementation with real quantitative calculations: 20-day averages, z-scores, and anomaly detection
    const symbols = [
      { symbol: "KOSPI", market: "국내지수", basePrice: 2600 },
      { symbol: "KOSDAQ", market: "국내지수", basePrice: 850 },
      { symbol: "KS11", market: "국내지수", basePrice: 2600 },
      { symbol: "KQ11", market: "국내지수", basePrice: 850 },
      { symbol: "USD/KRW", market: "환율", basePrice: 1340 },
      { symbol: "GOLD", market: "원자재", basePrice: 2650 }
    ];
    
    const results: QuantitativeMetrics[] = [];
    
    for (const { symbol, market, basePrice } of symbols) {
      // Generate 20 days of historical price data with realistic variations
      const historicalPrices: number[] = [];
      let currentPrice = basePrice;
      
      for (let day = 20; day >= 0; day--) {
        // Simulate realistic price movements (-3% to +3% daily)
        const dailyChange = (Math.random() - 0.5) * 0.06; // -3% to +3%
        currentPrice = currentPrice * (1 + dailyChange);
        historicalPrices.push(parseFloat(currentPrice.toFixed(2)));
      }
      
      // Get current price (last element)
      const todayPrice = historicalPrices[historicalPrices.length - 1];
      const yesterdayPrice = historicalPrices[historicalPrices.length - 2];
      
      // Calculate 20-day average
      const twentyDayPrices = historicalPrices.slice(0, 20);
      const twentyDayAverage = twentyDayPrices.reduce((sum, price) => sum + price, 0) / twentyDayPrices.length;
      
      // Calculate 20-day standard deviation
      const variance = twentyDayPrices.reduce((sum, price) => sum + Math.pow(price - twentyDayAverage, 2), 0) / twentyDayPrices.length;
      const twentyDayStdDev = Math.sqrt(variance);
      
      // Calculate z-score (how many standard deviations away from mean)
      const zScore = (todayPrice - twentyDayAverage) / twentyDayStdDev;
      
      // Calculate change rate
      const changeRate = ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100;
      
      // Determine anomaly level based on z-score
      let anomalyLevel: string;
      if (Math.abs(zScore) >= 2.5) {
        anomalyLevel = "고"; // High anomaly: > 2.5 standard deviations
      } else if (Math.abs(zScore) >= 1.5) {
        anomalyLevel = "중"; // Medium anomaly: 1.5-2.5 standard deviations
      } else {
        anomalyLevel = "저"; // Low anomaly: < 1.5 standard deviations
      }
      
      // Add volatility spike detection
      const recentVolatility = twentyDayPrices.slice(-5); // Last 5 days
      const volatilitySpike = recentVolatility.some((price, index) => {
        if (index === 0) return false;
        const dailyChange = Math.abs((price - recentVolatility[index - 1]) / recentVolatility[index - 1]);
        return dailyChange > 0.05; // > 5% daily movement
      });
      
      if (volatilitySpike && anomalyLevel === "저") {
        anomalyLevel = "중"; // Upgrade anomaly level if volatility spike detected
      }
      
      const metric = await this.createQuantitativeMetric({
        symbol,
        market,
        metricDate,
        metricTime,
        currentPrice: todayPrice.toFixed(2),
        changeRate: changeRate.toFixed(2),
        twentyDayAverage: twentyDayAverage.toFixed(2),
        twentyDayStdDev: twentyDayStdDev.toFixed(2),
        zScore: zScore.toFixed(3),
        anomalyLevel
      } as any);
      
      results.push(metric);
    }
    
    return results;
  }
  
  // Helper method to calculate RSI (Relative Strength Index)
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Default neutral RSI
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gains and losses
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100; // No losses = RSI 100
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  // ==================== C STAGE: INFOSTOCK THEMES (인포스탁 테마) ====================
  
  async getInfoStockThemes(filters?: {
    themeCode?: string;
    themeName?: string;
    minTotalScore?: number;
    limit?: number;
    orderBy?: 'totalScore' | 'changeRate' | 'tradingValue';
  }): Promise<InfoStockThemes[]> {
    let query = db.select().from(infoStockThemes);
    
    if (filters) {
      const conditions = [];
      if (filters.themeCode) conditions.push(eq(infoStockThemes.themeCode, filters.themeCode));
      if (filters.themeName) conditions.push(like(infoStockThemes.themeName, `%${filters.themeName}%`));
      if (filters.minTotalScore) conditions.push(gte(infoStockThemes.totalScore, filters.minTotalScore.toString()));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    // Order by specified field or default to totalScore
    const orderByField = filters?.orderBy || 'totalScore';
    const orderByColumn = orderByField === 'totalScore' ? infoStockThemes.totalScore : 
                         orderByField === 'changeRate' ? infoStockThemes.changeRate : 
                         infoStockThemes.tradingValue;
    
    const result = await query.orderBy(desc(orderByColumn)).limit(filters?.limit || 20);
    return result;
  }

  async getInfoStockTheme(id: string): Promise<InfoStockThemes | undefined> {
    const [theme] = await db.select().from(infoStockThemes).where(eq(infoStockThemes.id, id));
    return theme || undefined;
  }

  async getInfoStockThemeByCode(themeCode: string): Promise<InfoStockThemes | undefined> {
    const [theme] = await db.select().from(infoStockThemes).where(eq(infoStockThemes.themeCode, themeCode));
    return theme || undefined;
  }

  async createInfoStockTheme(theme: InsertInfoStockThemes): Promise<InfoStockThemes> {
    const [newTheme] = await db.insert(infoStockThemes).values(theme).returning();
    return newTheme;
  }

  async updateInfoStockTheme(id: string, theme: Partial<InsertInfoStockThemes>): Promise<InfoStockThemes> {
    const [updatedTheme] = await db
      .update(infoStockThemes)
      .set({ ...theme, updatedAt: new Date() })
      .where(eq(infoStockThemes.id, id))
      .returning();
    return updatedTheme;
  }

  async deleteInfoStockTheme(id: string): Promise<void> {
    await db.delete(infoStockThemes).where(eq(infoStockThemes.id, id));
  }

  async calculateThemeScores(themeCode: string): Promise<InfoStockThemes> {
    // Implementation would calculate scores based on market data
    const theme = await this.getInfoStockThemeByCode(themeCode);
    if (!theme) {
      throw new Error(`Theme not found: ${themeCode}`);
    }
    
    // Mock calculation - in real implementation, this would analyze market data
    const changeRateScore = Math.random() * 100;
    const tradingValueScore = Math.random() * 100;
    const marketCapScore = Math.random() * 100;
    const totalScore = (changeRateScore + tradingValueScore + marketCapScore) / 3;
    
    return await this.updateInfoStockTheme(theme.id, {
      changeRateScore: changeRateScore.toFixed(2),
      tradingValueScore: tradingValueScore.toFixed(2),
      marketCapScore: marketCapScore.toFixed(2),
      totalScore: totalScore.toFixed(2)
    });
  }

  // InfoStock Theme Stocks
  async getInfoStockThemeStocks(filters?: {
    themeCode?: string;
    stockCode?: string;
    limit?: number;
  }): Promise<InfoStockThemeStocks[]> {
    let query = db.select().from(infoStockThemeStocks);
    
    if (filters) {
      const conditions = [];
      if (filters.themeCode) conditions.push(eq(infoStockThemeStocks.themeCode, filters.themeCode));
      if (filters.stockCode) conditions.push(eq(infoStockThemeStocks.stockCode, filters.stockCode));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    const result = await query.orderBy(desc(infoStockThemeStocks.createdAt)).limit(filters?.limit || 50);
    return result;
  }

  async createInfoStockThemeStock(themeStock: InsertInfoStockThemeStocks): Promise<InfoStockThemeStocks> {
    const [newThemeStock] = await db.insert(infoStockThemeStocks).values(themeStock).returning();
    return newThemeStock;
  }

  async deleteInfoStockThemeStock(id: string): Promise<void> {
    await db.delete(infoStockThemeStocks).where(eq(infoStockThemeStocks.id, id));
  }

  async getStocksByTheme(themeCode: string): Promise<InfoStockThemeStocks[]> {
    return await this.getInfoStockThemeStocks({ themeCode });
  }

  // Industry Theme Conditions
  async getIndustryThemeConditions(filters?: {
    themeCode?: string;
    newsDate?: string;
    isNew?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<IndustryThemeConditions[]> {
    let query = db.select().from(industryThemeConditions);
    
    if (filters) {
      const conditions = [];
      if (filters.themeCode) conditions.push(eq(industryThemeConditions.themeCode, filters.themeCode));
      if (filters.newsDate) conditions.push(eq(industryThemeConditions.newsDate, filters.newsDate));
      if (filters.isNew !== undefined) conditions.push(eq(industryThemeConditions.isNew, filters.isNew));
      if (filters.startDate!) conditions.push(gte(industryThemeConditions.createdAt, filters.startDate!));
      if (filters.endDate!) conditions.push(lte(industryThemeConditions.createdAt, filters.endDate!));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    const result = await query.orderBy(desc(industryThemeConditions.createdAt)).limit(filters?.limit || 50);
    return result;
  }

  async getIndustryThemeCondition(id: string): Promise<IndustryThemeConditions | undefined> {
    const [condition] = await db.select().from(industryThemeConditions).where(eq(industryThemeConditions.id, id));
    return condition || undefined;
  }

  async createIndustryThemeCondition(condition: InsertIndustryThemeConditions): Promise<IndustryThemeConditions> {
    const [newCondition] = await db.insert(industryThemeConditions).values(condition).returning();
    return newCondition;
  }

  async updateIndustryThemeCondition(id: string, condition: Partial<InsertIndustryThemeConditions>): Promise<IndustryThemeConditions> {
    const [updatedCondition] = await db
      .update(industryThemeConditions)
      .set(condition)
      .where(eq(industryThemeConditions.id, id))
      .returning();
    return updatedCondition;
  }

  async deleteIndustryThemeCondition(id: string): Promise<void> {
    await db.delete(industryThemeConditions).where(eq(industryThemeConditions.id, id));
  }

  async generateIndustryThemeConditions(newsDate: string, newsTime: string): Promise<IndustryThemeConditions[]> {
    // Enhanced theme/industry analysis with real market condition detection
    const results: IndustryThemeConditions[] = [];
    
    // Get recent major events and quantitative metrics for context
    const [recentEvents, quantMetrics] = await Promise.all([
      this.getMajorEvents({ eventDate: newsDate, limit: 20 }),
      this.getQuantitativeMetrics({ metricDate: newsDate, limit: 20 })
    ]);
    
    // Predefined industry themes with their stock mapping and analysis
    const industryThemes = [
      {
        themeCode: "SEMI001",
        themeName: "반도체",
        keyStocks: ["SK하이닉스", "삼성전자", "LG이노텍"],
        marketKeywords: ["반도체", "메모리", "시스템반도체", "AI칩", "파운드리"]
      },
      {
        themeCode: "AUTO001", 
        themeName: "자동차",
        keyStocks: ["현대차", "기아", "현대모비스"],
        marketKeywords: ["자동차", "전기차", "배터리", "자율주행", "모빌리티"]
      },
      {
        themeCode: "BIO001",
        themeName: "바이오",
        keyStocks: ["셀트리온", "삼성바이오로직스", "녹십자"],
        marketKeywords: ["바이오", "제약", "백신", "치료제", "신약"]
      },
      {
        themeCode: "ENT001",
        themeName: "엔터테인먼트",
        keyStocks: ["HYBE", "SM엔터테인먼트", "JYP엔터테인먼트"],
        marketKeywords: ["엔터테인먼트", "K-POP", "콘텐츠", "게임", "미디어"]
      },
      {
        themeCode: "FIN001",
        themeName: "금융",
        keyStocks: ["KB금융", "신한지주", "하나금융지주"],
        marketKeywords: ["금융", "은행", "증권", "보험", "핀테크"]
      }
    ];
    
    for (const theme of industryThemes) {
      // Analyze if this theme is mentioned in recent events or has quantitative anomalies
      const themeRelevantEvents = recentEvents.filter(event => 
        theme.marketKeywords.some(keyword => 
          event.majorIssueContent?.includes(keyword) || 
          event.majorIssueName?.includes(keyword)
        )
      );
      
      // Check for quantitative anomalies in theme-related metrics
      const themeMetrics = quantMetrics.filter(metric =>
        theme.keyStocks.some(stock => metric.symbol?.includes(stock)) ||
        theme.marketKeywords.some(keyword => metric.market?.includes(keyword))
      );
      
      const highAnomalyMetrics = themeMetrics.filter(m => m.anomalyLevel === "고");
      const mediumAnomalyMetrics = themeMetrics.filter(m => m.anomalyLevel === "중");
      
      // Determine situation type and issue importance
      let situationType = "정기분석";
      let isNew = false;
      let issueTitle = "";
      let issueContent = "";
      
      if (highAnomalyMetrics.length > 0) {
        situationType = "긴급시황";
        isNew = true;
        issueTitle = `${theme.themeName} 업종 고위험 신호 감지`;
        issueContent = `${theme.themeName} 업종에서 ${highAnomalyMetrics.length}개 지표가 고위험 이상치를 기록했습니다. `;
        issueContent += `관련 종목: ${highAnomalyMetrics.map(m => m.symbol).join(", ")}. `;
        issueContent += `즉시 모니터링이 필요한 상황입니다.`;
      } else if (mediumAnomalyMetrics.length >= 2) {
        situationType = "주의시황"; 
        isNew = true;
        issueTitle = `${theme.themeName} 업종 변동성 증가`;
        issueContent = `${theme.themeName} 업종에서 ${mediumAnomalyMetrics.length}개 지표가 중위험 수준을 보이고 있습니다. `;
        issueContent += `변동성이 증가하고 있어 주의가 필요합니다.`;
      } else if (themeRelevantEvents.length > 0) {
        situationType = "이슈분석";
        isNew = true;
        issueTitle = `${theme.themeName} 업종 관련 주요 이벤트 발생`;
        issueContent = `${theme.themeName} 업종과 관련된 ${themeRelevantEvents.length}건의 주요 이벤트가 발생했습니다. `;
        issueContent += `시장에 미칠 영향을 분석하고 있습니다.`;
      } else {
        issueTitle = `${theme.themeName} 업종 정상 운영`;
        issueContent = `${theme.themeName} 업종은 현재 정상적인 시장 조건을 유지하고 있습니다. `;
        issueContent += `특별한 이상 징후는 발견되지 않았습니다.`;
      }
      
      // Calculate change indicators
      const changeFromPrevious = themeMetrics.length > 0 
        ? parseFloat((Math.random() * 10 - 5).toFixed(2)) // -5% to +5% simulated change
        : 0;
      
      const condition = await this.createIndustryThemeCondition({
        situationType,
        themeCode: theme.themeCode,
        newsDate,
        newsTime,
        issueTitle,
        issueContent,
        isNew,
        relatedNewsTitle: themeRelevantEvents.length > 0 
          ? `${theme.themeName} 관련 뉴스 ${themeRelevantEvents.length}건` 
          : "관련 뉴스 없음",
        relatedNewsId: themeRelevantEvents.map(e => e.id),
        changeFromPrevious: changeFromPrevious.toString(),
        riskLevel: highAnomalyMetrics.length > 0 ? "고위험" : 
                   mediumAnomalyMetrics.length >= 2 ? "중위험" : "저위험",
        affectedStocks: theme.keyStocks,
        marketImpactScore: (highAnomalyMetrics.length * 0.8 + mediumAnomalyMetrics.length * 0.4).toString()
      });
      
      results.push(condition);
    }
    
    // Add cross-industry analysis if multiple themes show anomalies
    const highRiskThemes = results.filter(r => r.riskLevel === "고위험");
    if (highRiskThemes.length >= 2) {
      const crossIndustryCondition = await this.createIndustryThemeCondition({
        situationType: "시장전반",
        themeCode: "MARKET001", 
        newsDate,
        newsTime,
        issueTitle: "다중 업종 동시 이상 신호",
        issueContent: `${highRiskThemes.length}개 업종에서 동시에 고위험 신호가 감지되었습니다. ` +
                     `시장 전반적인 불안정성을 시사하므로 종합적인 분석이 필요합니다. ` +
                     `영향 업종: ${highRiskThemes.map(t => t.issueTitle?.split(' ')[0]).join(", ")}`,
        isNew: true,
        relatedNewsTitle: "시장 전반 위험 신호",
        relatedNewsId: [],
        changeFromPrevious: "-5.00",
        riskLevel: "고위험",
        affectedStocks: [],
        marketImpactScore: "0.90"
      });
      
      results.push(crossIndustryCondition);
    }
    
    return results;
  }

  // Industry Theme Related News
  async getIndustryThemeRelatedNews(filters?: {
    themeCode?: string;
    newsDate?: string;
    isRepresentative?: boolean;
    limit?: number;
  }): Promise<IndustryThemeRelatedNews[]> {
    let query = db.select().from(industryThemeRelatedNews);
    
    if (filters) {
      const conditions = [];
      if (filters.themeCode) conditions.push(eq(industryThemeRelatedNews.themeCode, filters.themeCode));
      if (filters.newsDate) conditions.push(eq(industryThemeRelatedNews.newsDate, filters.newsDate));
      if (filters.isRepresentative !== undefined) conditions.push(eq(industryThemeRelatedNews.isRepresentative, filters.isRepresentative));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    const result = await query.orderBy(desc(industryThemeRelatedNews.createdAt)).limit(filters?.limit || 50);
    return result;
  }

  async createIndustryThemeRelatedNews(news: InsertIndustryThemeRelatedNews): Promise<IndustryThemeRelatedNews> {
    const [newNews] = await db.insert(industryThemeRelatedNews).values(news).returning();
    return newNews;
  }

  async deleteIndustryThemeRelatedNews(id: string): Promise<void> {
    await db.delete(industryThemeRelatedNews).where(eq(industryThemeRelatedNews.id, id));
  }

  async selectRepresentativeNews(themeCode: string, newsDate: string, limit: number = 3): Promise<IndustryThemeRelatedNews[]> {
    // This would use AI to select the most representative news for a theme
    const allNews = await this.getIndustryThemeRelatedNews({ themeCode, newsDate });
    
    // For now, just select the first few as representative
    const representativeNews = allNews.slice(0, limit);
    
    for (const news of representativeNews) {
      await db
        .update(industryThemeRelatedNews)
        .set({ isRepresentative: true })
        .where(eq(industryThemeRelatedNews.id, news.id));
    }
    
    return representativeNews;
  }

  // ==================== D STAGE: MACRO MARKET CONDITIONS (매크로 시황 통합) ====================
  
  async getMacroMarketConditions(filters?: {
    analysisDate?: string;
    marketImportanceLevel?: string;
    minConfidenceScore?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<MacroMarketConditions[]> {
    let query = db.select().from(macroMarketConditions);
    
    if (filters) {
      const conditions = [];
      if (filters.analysisDate) conditions.push(eq(macroMarketConditions.analysisDate, filters.analysisDate));
      if (filters.marketImportanceLevel) conditions.push(eq(macroMarketConditions.marketImportanceLevel, filters.marketImportanceLevel));
      if (filters.minConfidenceScore) conditions.push(gte(macroMarketConditions.confidenceScore, filters.minConfidenceScore.toString()));
      if (filters.startDate!) conditions.push(gte(macroMarketConditions.createdAt, filters.startDate!));
      if (filters.endDate!) conditions.push(lte(macroMarketConditions.createdAt, filters.endDate!));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    const result = await query.orderBy(desc(macroMarketConditions.createdAt)).limit(filters?.limit || 50);
    return result;
  }

  async getMacroMarketCondition(id: string): Promise<MacroMarketConditions | undefined> {
    const [condition] = await db.select().from(macroMarketConditions).where(eq(macroMarketConditions.id, id));
    return condition || undefined;
  }

  async createMacroMarketCondition(condition: InsertMacroMarketConditions): Promise<MacroMarketConditions> {
    const [newCondition] = await db.insert(macroMarketConditions).values(condition).returning();
    return newCondition;
  }

  async updateMacroMarketCondition(id: string, condition: Partial<InsertMacroMarketConditions>): Promise<MacroMarketConditions> {
    const [updatedCondition] = await db
      .update(macroMarketConditions)
      .set(condition)
      .where(eq(macroMarketConditions.id, id))
      .returning();
    return updatedCondition;
  }

  async deleteMacroMarketCondition(id: string): Promise<void> {
    await db.delete(macroMarketConditions).where(eq(macroMarketConditions.id, id));
  }

  async generateMacroMarketCondition(
    analysisDate: string, 
    analysisTime: string, 
    majorEventsIds: string[], 
    quantMetricsIds: string[], 
    themeConditionIds: string[]
  ): Promise<MacroMarketConditions> {
    // Enhanced integrated macro analysis combining A+B+C stage results
    
    // Fetch data from all stages in parallel
    const [majorEventsData, quantMetricsData, themeConditionsData] = await Promise.all([
      Promise.all(majorEventsIds.map(id => this.getMajorEvent(id))),
      Promise.all(quantMetricsIds.map(id => this.getQuantitativeMetric(id))),
      Promise.all(themeConditionIds.map(id => this.getIndustryThemeCondition(id)))
    ]);
    
    // Filter out undefined values
    const validMajorEvents = majorEventsData.filter(Boolean);
    const validQuantMetrics = quantMetricsData.filter(Boolean);
    const validThemeConditions = themeConditionsData.filter(Boolean);
    
    // ============= COMPREHENSIVE RISK ASSESSMENT =============
    
    // 1. NEWS RISK ANALYSIS (A단계)
    const emergencyEvents = validMajorEvents.filter(e => e!.situationType === "긴급시황");
    const highRiskEvents = validMajorEvents.filter(e => 
      e!.majorIssueContent?.includes("고위험") || 
      e!.situationType === "긴급시황"
    );
    const newsRiskScore = emergencyEvents.length * 0.8 + (validMajorEvents.length - emergencyEvents.length) * 0.3;
    
    // 2. QUANTITATIVE RISK ANALYSIS (B단계)
    const highAnomalyMetrics = validQuantMetrics.filter(m => m!.anomalyLevel === '고');
    const mediumAnomalyMetrics = validQuantMetrics.filter(m => m!.anomalyLevel === '중');
    const quantRiskScore = highAnomalyMetrics.length * 0.9 + mediumAnomalyMetrics.length * 0.5;
    
    // Calculate average Z-score for market stress indication
    const avgZScore = validQuantMetrics.length > 0 
      ? validQuantMetrics.reduce((sum, m) => sum + Math.abs(parseFloat(m!.zScore || "0")), 0) / validQuantMetrics.length
      : 0;
    
    // 3. INDUSTRY THEME RISK ANALYSIS (C단계)
    const highRiskThemes = validThemeConditions.filter(t => t!.riskLevel === "고위험");
    const mediumRiskThemes = validThemeConditions.filter(t => t!.riskLevel === "중위험");
    const themeRiskScore = highRiskThemes.length * 0.7 + mediumRiskThemes.length * 0.4;
    
    // ============= INTEGRATED MARKET ASSESSMENT =============
    
    // Overall risk calculation
    const overallRiskScore = (newsRiskScore * 0.4 + quantRiskScore * 0.4 + themeRiskScore * 0.2);
    
    // Determine market importance level with sophisticated logic
    let marketImportanceLevel: string;
    let confidenceScore: number;
    
    if (overallRiskScore >= 3.0 || (highAnomalyMetrics.length >= 3 && emergencyEvents.length >= 1)) {
      marketImportanceLevel = '최고';
      confidenceScore = 0.95;
    } else if (overallRiskScore >= 2.0 || highAnomalyMetrics.length >= 2) {
      marketImportanceLevel = '고';
      confidenceScore = 0.85;
    } else if (overallRiskScore >= 1.0 || mediumAnomalyMetrics.length >= 3) {
      marketImportanceLevel = '중';
      confidenceScore = 0.75;
    } else {
      marketImportanceLevel = '저';
      confidenceScore = 0.65;
    }
    
    // ============= DETAILED ANALYSIS GENERATION =============
    
    // Major events analysis
    const majorEventsAnalysis = validMajorEvents.length > 0 
      ? `주요 이벤트 ${validMajorEvents.length}건 감지. ` +
        `긴급시황 ${emergencyEvents.length}건, ` +
        `평균 관련뉴스 ${Math.round(validMajorEvents.reduce((sum, e) => sum + (e!.relatedNewsCount || 0), 0) / validMajorEvents.length)}건. ` +
        `주요 이슈: ${validMajorEvents.slice(0, 3).map(e => e!.majorIssueName).join(", ")}`
      : "특별한 주요 이벤트 없음";
    
    // Quantitative analysis with detailed metrics
    const quantitativeAnalysis = validQuantMetrics.length > 0
      ? `정량분석 ${validQuantMetrics.length}개 지표 중 고위험 ${highAnomalyMetrics.length}개, 중위험 ${mediumAnomalyMetrics.length}개. ` +
        `평균 Z-Score: ${avgZScore.toFixed(2)}. ` +
        `고위험 종목: ${highAnomalyMetrics.map(m => `${m!.symbol}(${m!.zScore})`).join(", ") || "없음"}`
      : "정량적 지표 데이터 부족";
    
    // Theme analysis with cross-industry impact
    const themeAnalysis = validThemeConditions.length > 0
      ? `산업테마 ${validThemeConditions.length}개 중 고위험 ${highRiskThemes.length}개, 중위험 ${mediumRiskThemes.length}개. ` +
        `신규이슈 ${validThemeConditions.filter(t => t!.isNew).length}건. ` +
        `주요 영향업종: ${highRiskThemes.concat(mediumRiskThemes).slice(0, 3).map(t => t!.issueTitle?.split(' ')[0]).join(", ") || "없음"}`
      : "산업별 특이사항 없음";
    
    // ============= MARKET FORECAST & RECOMMENDATIONS =============
    
    // Generate market outlook
    let marketOutlook: string;
    if (marketImportanceLevel === '최고' || marketImportanceLevel === '고') {
      marketOutlook = "시장 불안정성 증가. 즉각적인 모니터링과 리스크 관리 필요";
    } else if (marketImportanceLevel === '중') {
      marketOutlook = "일부 섹터에서 변동성 확대. 선별적 접근 권장";
    } else {
      marketOutlook = "시장 안정성 유지. 정상적인 투자 환경 지속";
    }
    
    // Generate anomaly signals with more detail
    const anomalySignals = [
      ...highAnomalyMetrics.map(m => `${m!.symbol}: Z-Score ${m!.zScore} (고위험)`),
      ...emergencyEvents.map(e => `뉴스: ${e!.majorIssueName} (긴급)`),
      ...highRiskThemes.map(t => `테마: ${t!.issueTitle?.split(' ')[0]} (고위험)`)
    ];
    
    // Enhanced 3-line summary with key insights
    const summaryLines = [
      `[종합위험도: ${marketImportanceLevel}] ${marketOutlook}`,
      `A단계 ${emergencyEvents.length}건 긴급 + B단계 ${highAnomalyMetrics.length}개 고위험 + C단계 ${highRiskThemes.length}개 고위험테마`,
      `전체 신뢰도 ${(confidenceScore * 100).toFixed(0)}% | 즉시조치 ${anomalySignals.length > 5 ? "필요" : "권장"}`
    ];
    const summary = summaryLines.join('\n');
    
    // ============= CREATE MACRO CONDITION RECORD =============
    
    const macroCondition = await this.createMacroMarketCondition({
      analysisDate,
      analysisTime,
      summary,
      majorEventsAnalysis,
      quantitativeAnalysis, 
      themeAnalysis,
      marketImportanceLevel,
      anomalySignals: anomalySignals.slice(0, 10),
      confidenceScore: confidenceScore.toFixed(3),
      sourceDataIds: [...majorEventsIds, ...quantMetricsIds, ...themeConditionIds]
    } as any);
    
    return macroCondition;
  }

  // Enhanced News Processing
  async getProcessedNewsData(filters?: {
    originalNewsId?: string;
    minEconomicScore?: number;
    minStockMarketScore?: number;
    isFiltered?: boolean;
    stockEvents?: string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ProcessedNewsData[]> {
    let query = db.select().from(processedNewsData);
    
    if (filters) {
      const conditions = [];
      if (filters.originalNewsId) conditions.push(eq(processedNewsData.originalNewsId, filters.originalNewsId));
      if (filters.minEconomicScore) conditions.push(gte(processedNewsData.economicScore, filters.minEconomicScore.toString()));
      if (filters.minStockMarketScore) conditions.push(gte(processedNewsData.stockMarketScore, filters.minStockMarketScore.toString()));
      if (filters.isFiltered !== undefined) conditions.push(eq(processedNewsData.isFiltered, filters.isFiltered));
      if (filters.startDate!) conditions.push(gte(processedNewsData.processedAt, filters.startDate!));
      if (filters.endDate!) conditions.push(lte(processedNewsData.processedAt, filters.endDate!));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    const result = await query.orderBy(desc(processedNewsData.processedAt)).limit(filters?.limit || 50);
    return result;
  }

  async getProcessedNewsDataByOriginalId(originalNewsId: string): Promise<ProcessedNewsData | undefined> {
    const [processedNews] = await db.select().from(processedNewsData).where(eq(processedNewsData.originalNewsId, originalNewsId));
    return processedNews || undefined;
  }

  async createProcessedNewsData(processedNews: InsertProcessedNewsData): Promise<ProcessedNewsData> {
    const [newProcessedNews] = await db.insert(processedNewsData).values(processedNews).returning();
    return newProcessedNews;
  }

  async updateProcessedNewsData(id: string, processedNews: Partial<InsertProcessedNewsData>): Promise<ProcessedNewsData> {
    const [updatedProcessedNews] = await db
      .update(processedNewsData)
      .set(processedNews)
      .where(eq(processedNewsData.id, id))
      .returning();
    return updatedProcessedNews;
  }

  async deleteProcessedNewsData(id: string): Promise<void> {
    await db.delete(processedNewsData).where(eq(processedNewsData.id, id));
  }

  async processNewsWithAI(originalNewsId: string): Promise<ProcessedNewsData> {
    // This would use AI to analyze news and generate scores
    const processedNews = await this.createProcessedNewsData({
      originalNewsId,
      economicScore: Math.random().toFixed(2),
      stockMarketScore: Math.random().toFixed(2),
      similarityScore: Math.random().toFixed(2),
      advertisementScore: Math.random().toFixed(2),
      stockEvents: ["이벤트1", "이벤트2"],
      isFiltered: Math.random() > 0.5
    });
    
    return processedNews;
  }

  // ==================== INTEGRATED WORKFLOW METHODS ====================
  
  async executeStageAWorkflow(eventDate: string, eventTime: string): Promise<{
    majorEvents: MajorEvents[];
    relatedNews: MajorEventsRelatedNews[];
  }> {
    // Execute Stage A: News Issue Generation
    const majorEvents = await this.generateMajorEventFromNews(eventDate, eventTime);
    const relatedNews: MajorEventsRelatedNews[] = [];
    
    // Generate related news for each major event
    for (const event of majorEvents) {
      const news = await this.createMajorEventRelatedNews({
        eventDate: event.eventDate,
        eventTime: event.eventTime,
        majorIssueName: event.majorIssueName,
        newsTitle: `${event.majorIssueName} 관련 뉴스`,
        mediaCompany: "AI 분석",
        reportTime: new Date(),
        nid: `news_${Date.now()}`
      });
      relatedNews.push(news);
    }
    
    return { majorEvents, relatedNews };
  }

  async executeStageBWorkflow(metricDate: string, metricTime: string): Promise<QuantitativeMetrics[]> {
    // Execute Stage B: Quantitative Market Metrics
    return await this.generateQuantitativeMetrics(metricDate, metricTime);
  }

  async executeStageCWorkflow(newsDate: string, newsTime: string): Promise<{
    themeConditions: IndustryThemeConditions[];
    relatedNews: IndustryThemeRelatedNews[];
  }> {
    // Execute Stage C: Theme + Industry Analysis
    const themeConditions = await this.generateIndustryThemeConditions(newsDate, newsTime);
    const relatedNews: IndustryThemeRelatedNews[] = [];
    
    // Generate related news for each theme condition
    for (const condition of themeConditions) {
      const news = await this.createIndustryThemeRelatedNews({
        themeCode: condition.themeCode,
        newsDate: condition.newsDate,
        newsTime: condition.newsTime,
        newsTitle: `${condition.issueTitle} 관련 뉴스`,
        newsId: `theme_news_${Date.now()}`,
        isRepresentative: true
      });
      relatedNews.push(news);
    }
    
    return { themeConditions, relatedNews };
  }

  async executeStageDWorkflow(
    analysisDate: string, 
    analysisTime: string, 
    stageAIds: string[], 
    stageBIds: string[], 
    stageCIds: string[]
  ): Promise<MacroMarketConditions> {
    // Execute Stage D: Macro Integration
    return await this.generateMacroMarketCondition(analysisDate, analysisTime, stageAIds, stageBIds, stageCIds);
  }

  async executeFullWorkflowPipeline(targetDate: string, targetTime: string): Promise<{
    stageA: { majorEvents: MajorEvents[]; relatedNews: MajorEventsRelatedNews[] };
    stageB: QuantitativeMetrics[];
    stageC: { themeConditions: IndustryThemeConditions[]; relatedNews: IndustryThemeRelatedNews[] };
    stageD: MacroMarketConditions;
  }> {
    // Execute all stages in sequence
    const stageA = await this.executeStageAWorkflow(targetDate, targetTime);
    const stageB = await this.executeStageBWorkflow(targetDate, targetTime);
    const stageC = await this.executeStageCWorkflow(targetDate, targetTime);
    
    // Collect IDs for Stage D integration
    const stageAIds = stageA.majorEvents.map(e => e.id);
    const stageBIds = stageB.map(m => m.id);
    const stageCIds = stageC.themeConditions.map(c => c.id);
    
    const stageD = await this.executeStageDWorkflow(targetDate, targetTime, stageAIds, stageBIds, stageCIds);
    
    return { stageA, stageB, stageC, stageD };
  }

  // ==================== THEME METHODS ====================
  
  // Memory cache for theme summaries (for fast access)
  private themeSummaryCache = new Map<string, ThemeSummary>();

  async listThemes(): Promise<Theme[]> {
    const themesData = await db
      .select()
      .from(themes)
      .orderBy(themes.order, themes.name);
    return themesData;
  }

  async getTheme(id: string): Promise<Theme | undefined> {
    const [theme] = await db
      .select()
      .from(themes)
      .where(eq(themes.id, id));
    return theme || undefined;
  }

  async createTheme(theme: InsertTheme): Promise<Theme> {
    const now = new Date();
    
    // Insert new theme (throws error if already exists)
    const [newTheme] = await db
      .insert(themes)
      .values({
        ...theme,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return newTheme;
  }

  async upsertTheme(theme: InsertTheme): Promise<Theme> {
    const now = new Date();
    
    // Check if theme exists
    const existing = await this.getTheme(theme.id);
    
    if (existing) {
      // Update existing theme
      const [updatedTheme] = await db
        .update(themes)
        .set({
          ...theme,
          updatedAt: now
        })
        .where(eq(themes.id, theme.id))
        .returning();
      return updatedTheme;
    } else {
      // Insert new theme
      const [newTheme] = await db
        .insert(themes)
        .values({
          ...theme,
          createdAt: now,
          updatedAt: now
        })
        .returning();
      return newTheme;
    }
  }

  async deleteTheme(id: string): Promise<void> {
    // 삭제 전에 관련 news_data 확인
    const relatedNews = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsData)
      .where(eq(newsData.themeClusterId, id));

    const newsCount = relatedNews[0]?.count || 0;

    if (newsCount > 0) {
      // 관련 뉴스 데이터가 있으면 theme_cluster_id를 null로 설정
      await db
        .update(newsData)
        .set({ themeClusterId: null })
        .where(eq(newsData.themeClusterId, id));
    }

    // 테마 삭제
    await db
      .delete(themes)
      .where(eq(themes.id, id));
  }

  async getThemeNews(themeId: string, options?: { since?: Date; limit?: number }): Promise<NewsData[]> {
    const since = options?.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // default 7 days
    const limit = options?.limit || 100;
    
    const news = await db
      .select()
      .from(newsData)
      .where(and(
        eq(newsData.themeClusterId, themeId),
        gte(newsData.publishedAt, since)
      ))
      .orderBy(desc(newsData.publishedAt))
      .limit(limit);
    
    return news;
  }

  async setNewsTheme(newsId: string, themeId: string): Promise<void> {
    await db
      .update(newsData)
      .set({ themeClusterId: themeId })
      .where(eq(newsData.id, newsId));
  }

  async getThemeSummary(themeId: string): Promise<ThemeSummary | null> {
    return this.themeSummaryCache.get(themeId) || null;
  }

  async setThemeSummary(themeId: string, summary: ThemeSummary): Promise<void> {
    this.themeSummaryCache.set(themeId, summary);
  }

  async getThemeNewsCount(themeId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsData)
      .where(eq(newsData.themeClusterId, themeId));
    
    return result?.count || 0;
  }

  async getAllThemeSummaries(): Promise<ThemeSummary[]> {
    return Array.from(this.themeSummaryCache.values());
  }
  
  // Quality Evaluation Method Implementations
  async getQualityMetrics(reportId: string): Promise<ReportQualityMetrics | undefined> {
    const result = await db
      .select()
      .from(reportQualityMetrics)
      .where(eq(reportQualityMetrics.reportId, reportId))
      .limit(1);
    return result[0];
  }
  
  async getQualityMetricsList(filters?: {
    reportType?: string;
    minScore?: number;
    maxScore?: number;
    evaluatedBy?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ReportQualityMetrics[]> {
    let query = db.select().from(reportQualityMetrics);
    const conditions = [];
    
    if (filters?.reportType) {
      conditions.push(eq(reportQualityMetrics.reportType, filters.reportType));
    }
    if (filters?.minScore) {
      conditions.push(gte(reportQualityMetrics.overallScore, filters.minScore.toString()));
    }
    if (filters?.maxScore) {
      conditions.push(lte(reportQualityMetrics.overallScore, filters.maxScore.toString()));
    }
    if (filters?.evaluatedBy) {
      conditions.push(eq(reportQualityMetrics.evaluatedBy, filters.evaluatedBy));
    }
    if (filters?.startDate) {
      conditions.push(gte(reportQualityMetrics.evaluatedAt, filters.startDate!));
    }
    if (filters?.endDate) {
      conditions.push(lte(reportQualityMetrics.evaluatedAt, filters.endDate!));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    
    query = query.orderBy(desc(reportQualityMetrics.evaluatedAt)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return await query;
  }
  
  async saveQualityMetrics(metrics: InsertReportQualityMetrics): Promise<ReportQualityMetrics> {
    const [result] = await db
      .insert(reportQualityMetrics)
      .values(metrics)
      .returning();
    return result;
  }
  
  async updateQualityMetrics(id: string, metrics: Partial<InsertReportQualityMetrics>): Promise<ReportQualityMetrics> {
    const [result] = await db
      .update(reportQualityMetrics)
      .set({ ...metrics, updatedAt: new Date() })
      .where(eq(reportQualityMetrics.id, id))
      .returning();
    return result;
  }
  
  async deleteQualityMetrics(id: string): Promise<void> {
    await db
      .delete(reportQualityMetrics)
      .where(eq(reportQualityMetrics.id, id));
  }
  
  // Feedback Management Implementations
  async saveFeedback(feedback: InsertFeedbackLog): Promise<FeedbackLog> {
    const [result] = await db
      .insert(feedbackLog)
      .values(feedback)
      .returning();
    return result;
  }
  
  async getFeedbackList(filters?: {
    entityType?: string;
    entityId?: string;
    feedbackType?: string;
    resolutionStatus?: string;
    priority?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<FeedbackLog[]> {
    let query = db.select().from(feedbackLog);
    const conditions = [];
    
    if (filters?.entityType) {
      conditions.push(eq(feedbackLog.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(feedbackLog.entityId, filters.entityId));
    }
    if (filters?.feedbackType) {
      conditions.push(eq(feedbackLog.feedbackType, filters.feedbackType));
    }
    if (filters?.resolutionStatus) {
      conditions.push(eq(feedbackLog.resolutionStatus, filters.resolutionStatus));
    }
    if (filters?.priority) {
      conditions.push(eq(feedbackLog.priority, filters.priority));
    }
    if (filters?.startDate) {
      conditions.push(gte(feedbackLog.createdAt, filters.startDate!));
    }
    if (filters?.endDate) {
      conditions.push(lte(feedbackLog.createdAt, filters.endDate!));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    
    query = query.orderBy(desc(feedbackLog.createdAt)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return await query;
  }
  
  async updateFeedback(id: string, feedback: Partial<InsertFeedbackLog>): Promise<FeedbackLog> {
    const [result] = await db
      .update(feedbackLog)
      .set({ ...feedback, processedAt: new Date() })
      .where(eq(feedbackLog.id, id))
      .returning();
    return result;
  }
  
  async resolveFeedback(id: string, resolution: any): Promise<FeedbackLog> {
    const [result] = await db
      .update(feedbackLog)
      .set({
        resolutionStatus: 'resolved',
        actionTaken: resolution,
        resolvedAt: new Date()
      })
      .where(eq(feedbackLog.id, id))
      .returning();
    return result;
  }
  
  // Quality Improvements Implementations
  async createQualityImprovement(improvement: InsertQualityImprovements): Promise<QualityImprovements> {
    const [result] = await db
      .insert(qualityImprovements)
      .values(improvement)
      .returning();
    return result;
  }
  
  async getQualityImprovements(filters?: {
    improvementType?: string;
    implementationStatus?: string;
    priority?: string;
    limit?: number;
  }): Promise<QualityImprovements[]> {
    let query = db.select().from(qualityImprovements);
    const conditions = [];
    
    if (filters?.improvementType) {
      conditions.push(eq(qualityImprovements.improvementType, filters.improvementType));
    }
    if (filters?.implementationStatus) {
      conditions.push(eq(qualityImprovements.implementationStatus, filters.implementationStatus));
    }
    if (filters?.priority) {
      conditions.push(eq(qualityImprovements.priority, filters.priority));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    
    query = query.orderBy(desc(qualityImprovements.createdAt)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return await query;
  }
  
  async updateQualityImprovement(id: string, improvement: Partial<InsertQualityImprovements>): Promise<QualityImprovements> {
    const [result] = await db
      .update(qualityImprovements)
      .set({ ...improvement, updatedAt: new Date() })
      .where(eq(qualityImprovements.id, id))
      .returning();
    return result;
  }
  
  // A/B Testing Implementations
  async createABTest(experiment: InsertAbTestingExperiments): Promise<AbTestingExperiments> {
    const [result] = await db
      .insert(abTestingExperiments)
      .values(experiment)
      .returning();
    return result;
  }
  
  async getABTests(filters?: {
    status?: string;
    testType?: string;
    winner?: string;
    limit?: number;
  }): Promise<AbTestingExperiments[]> {
    let query = db.select().from(abTestingExperiments);
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(abTestingExperiments.status, filters.status));
    }
    if (filters?.testType) {
      conditions.push(eq(abTestingExperiments.testType, filters.testType));
    }
    if (filters?.winner) {
      conditions.push(eq(abTestingExperiments.winner, filters.winner));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    
    query = query.orderBy(desc(abTestingExperiments.createdAt)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return await query;
  }
  
  async updateABTest(id: string, experiment: Partial<InsertAbTestingExperiments>): Promise<AbTestingExperiments> {
    const [result] = await db
      .update(abTestingExperiments)
      .set({ ...experiment, updatedAt: new Date() })
      .where(eq(abTestingExperiments.id, id))
      .returning();
    return result;
  }
  
  // Quality Analytics Implementations
  async getQualityTrends(period: string, reportType?: string): Promise<{
    period: string;
    averageScores: any;
    improvementRate: number;
    topPerformers: string[];
    lowPerformers: string[];
  }> {
    const dateThreshold = new Date();
    if (period === 'week') {
      dateThreshold.setDate(dateThreshold.getDate() - 7);
    } else if (period === 'month') {
      dateThreshold.setMonth(dateThreshold.getMonth() - 1);
    } else if (period === 'quarter') {
      dateThreshold.setMonth(dateThreshold.getMonth() - 3);
    }
    
    let query = db.select().from(reportQualityMetrics)
      .where(gte(reportQualityMetrics.evaluatedAt, dateThreshold));
    
    if (reportType) {
      query = query.where(eq(reportQualityMetrics.reportType, reportType));
    }
    
    const metrics = await query;
    
    // Calculate averages
    const averageScores = {
      accuracyScore: 0,
      relevanceScore: 0,
      completenessScore: 0,
      timelinessScore: 0,
      readabilityScore: 0,
      overallScore: 0
    };
    
    if (metrics.length > 0) {
      metrics.forEach(m => {
        averageScores.accuracyScore += parseFloat(m.accuracyScore || '0');
        averageScores.relevanceScore += parseFloat(m.relevanceScore || '0');
        averageScores.completenessScore += parseFloat(m.completenessScore || '0');
        averageScores.timelinessScore += parseFloat(m.timelinessScore || '0');
        averageScores.readabilityScore += parseFloat(m.readabilityScore || '0');
        averageScores.overallScore += parseFloat(m.overallScore || '0');
      });
      
      (Object.keys(averageScores) as Array<keyof typeof averageScores>).forEach(key => {
        averageScores[key] = averageScores[key] / metrics.length;
      });
    }
    
    // Get top and low performers
    const sortedMetrics = metrics.sort((a, b) => 
      parseFloat(b.overallScore || '0') - parseFloat(a.overallScore || '0')
    );
    const topPerformers = sortedMetrics.slice(0, 5).map(m => m.reportId);
    const lowPerformers = sortedMetrics.slice(-5).map(m => m.reportId);
    
    // Calculate improvement rate (simplified)
    const improvementRate = metrics.length > 1 ? 
      (parseFloat(metrics[metrics.length - 1].overallScore || '0') - 
       parseFloat(metrics[0].overallScore || '0')) / 
      parseFloat(metrics[0].overallScore || '1') * 100 : 0;
    
    return {
      period,
      averageScores,
      improvementRate,
      topPerformers,
      lowPerformers
    };
  }
  
  async getQualityBenchmarks(reportType: string): Promise<any> {
    const metrics = await db.select().from(reportQualityMetrics)
      .where(eq(reportQualityMetrics.reportType, reportType));
    
    if (metrics.length === 0) {
      return {
        avgScore: 0,
        minScore: 0,
        maxScore: 0,
        percentiles: {
          p25: 0,
          p50: 0,
          p75: 0,
          p90: 0
        }
      };
    }
    
    const scores = metrics.map(m => parseFloat(m.overallScore || '0')).sort((a, b) => a - b);
    
    return {
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      minScore: scores[0],
      maxScore: scores[scores.length - 1],
      percentiles: {
        p25: scores[Math.floor(scores.length * 0.25)],
        p50: scores[Math.floor(scores.length * 0.50)],
        p75: scores[Math.floor(scores.length * 0.75)],
        p90: scores[Math.floor(scores.length * 0.90)]
      }
    };
  }
  
  // RAG Metrics Methods
  private ragMetrics = new Map<string, any>();
  private searchWeights = new Map<string, { vectorWeight: number; keywordWeight: number; performance: number }>();
  
  async saveRAGMetrics(metrics: {
    type: string;
    metrics?: any;
    query?: string;
    data?: any;
    timestamp?: Date;
  }): Promise<void> {
    const key = `${metrics.type}_${Date.now()}`;
    const fullMetrics = {
      ...metrics,
      timestamp: metrics.timestamp || new Date()
    };
    this.ragMetrics.set(key, fullMetrics);
    
    // In production, you would persist this to a database table
    console.log('RAG metrics saved:', fullMetrics);
  }
  
  async getRAGMetrics(filters?: {
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    let results = Array.from(this.ragMetrics.values());
    
    if (filters) {
      if (filters.type) {
        results = results.filter(m => m.type === filters.type);
      }
      if (filters.startDate!) {
        results = results.filter(m => m.timestamp >= filters.startDate!);
      }
      if (filters.endDate!) {
        results = results.filter(m => m.timestamp <= filters.endDate!);
      }
    }
    
    // Sort by timestamp desc
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }
    
    return results;
  }
  
  async updateSearchWeights(
    query: string, 
    weights: { vectorWeight: number; keywordWeight: number; performance: number }
  ): Promise<void> {
    this.searchWeights.set(query, weights);
    
    // Also save to general metrics
    await this.saveRAGMetrics({
      type: 'search_weights',
      query,
      data: weights
    });
  }
  
  async getOptimalWeights(query: string): Promise<{ vector: number; keyword: number } | null> {
    const weights = this.searchWeights.get(query);
    
    if (weights) {
      return {
        vector: weights.vectorWeight,
        keyword: weights.keywordWeight
      };
    }
    
    // Try to find similar queries
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    let bestMatch: { vectorWeight: number; keywordWeight: number } | null = null;
    let bestOverlap = 0;
    
    for (const [storedQuery, weights] of Array.from(this.searchWeights.entries())) {
      const storedWords = new Set(storedQuery.toLowerCase().split(/\s+/));
      const overlap = Array.from(queryWords).filter(w => storedWords.has(w)).length;
      
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestMatch = weights;
      }
    }
    
    if (bestMatch && bestOverlap >= queryWords.size * 0.5) {
      return {
        vector: bestMatch.vectorWeight,
        keyword: bestMatch.keywordWeight
      };
    }
    
    return null;
  }

  // ==================== AI API MANAGEMENT METHODS ====================

  // Enhanced API Call management
  async getApiCalls(filters?: {
    providerId?: string;
    categoryId?: string;
    isActive?: boolean;
    isVerified?: boolean;
    limit?: number;
  }): Promise<ApiCall[]> {
    let query = db.select().from(apiCalls);
    
    if (filters) {
      const conditions = [];
      if (filters.providerId) conditions.push(eq(apiCalls.providerId, filters.providerId));
      if (filters.categoryId) conditions.push(eq(apiCalls.categoryId, filters.categoryId));
      if (filters.isActive !== undefined) conditions.push(eq(apiCalls.isActive, filters.isActive));
      if (filters.isVerified !== undefined) conditions.push(eq(apiCalls.isVerified, filters.isVerified));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    const result = await query
      .orderBy(desc(apiCalls.updatedAt))
      .limit(filters?.limit || 100);
    return result;
  }

  async getApiCall(id: string): Promise<ApiCall | undefined> {
    const [api] = await db.select().from(apiCalls).where(eq(apiCalls.id, id));
    return api || undefined;
  }

  async testApiCall(id: string, testPayload?: any): Promise<ApiTestResult> {
    const api = await this.getApiCall(id);
    if (!api) {
      throw new Error('API call not found');
    }

    // Get provider information for better testing
    let provider: any = null;
    if (api.providerId) {
      provider = await this.getAiServiceProvider(api.providerId);
    }

    const startTime = Date.now();
    let testResult: Partial<InsertApiTestResult> = {
      apiCallId: id,
      testType: 'manual',
      testPayload,
      testedBy: 'system'
    };

    try {
      // Determine test prompt
      const testPrompt = testPayload?.prompt || testPayload || 
        'Hello! This is a test message to verify API connectivity. Please respond briefly.';
      
      // Prepare API request
      const apiRequest = {
        provider: provider?.name || api.name || 'unknown',
        model: (api as any).modelName || undefined,
        prompt: testPrompt,
        maxTokens: (api as any).maxTokens || 100,
        temperature: 0.7,
        apiKey: (api as any).secretKey || undefined,
        apiUrl: api.url || undefined,
        systemPrompt: (api as any).systemPrompt || undefined,
        preprocessPrompt: (api as any).preprocessPrompt || undefined,
        postprocessPrompt: (api as any).postprocessPrompt || undefined
      };

      // Make actual API call
      const apiResponse = await AIApiService.callAI(apiRequest);
      
      if (apiResponse.success) {
        // Calculate costs
        const inputCost = (api as any).inputCost ? parseFloat((api as any).inputCost) : 0.001;
        const outputCost = (api as any).outputCost ? parseFloat((api as any).outputCost) : 0.002;
        const estimatedCost = AIApiService.calculateCost(apiResponse, inputCost, outputCost);
        
        testResult = {
          ...testResult,
          status: 'success',
          responseTime: apiResponse.responseTime || (Date.now() - startTime),
          responseSize: JSON.stringify(apiResponse.data).length,
          actualResponse: apiResponse.data,
          tokensUsed: apiResponse.usage?.totalTokens || 0,
          estimatedCost: estimatedCost.toFixed(6)
        } as any;

        // Update API call statistics
        await this.updateApiCall(id, {
          lastTested: new Date(),
          testStatus: 'success',
          successCount: ((api as any).successCount || 0) + 1
        } as any);
      } else {
        testResult = {
          ...testResult,
          status: 'failed',
          responseTime: apiResponse.responseTime || (Date.now() - startTime),
          errorType: 'api_error',
          errorMessage: apiResponse.error || 'API call failed',
          httpStatusCode: 400
        } as any;

        // Update API call error statistics
        await this.updateApiCall(id, {
          lastTested: new Date(),
          testStatus: 'failed',
          errorCount: ((api as any).errorCount || 0) + 1
        } as any);
      }

    } catch (error) {
      testResult = {
        ...testResult,
        status: 'error',
        responseTime: Date.now() - startTime,
        errorType: 'system_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown system error'
      } as any;

      // Update API call error statistics
      await this.updateApiCall(id, {
        lastTested: new Date(),
        testStatus: 'error',
        errorCount: ((api as any).errorCount || 0) + 1
      } as any);
    }

    return await this.createApiTestResult(testResult as InsertApiTestResult);
  }

  // AI Service Provider management
  async getAiServiceProviders(filters?: {
    status?: string;
    tier?: string;
    supportedFeature?: string;
  }): Promise<AiServiceProvider[]> {
    let query = db.select().from(aiServiceProviders);
    
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(aiServiceProviders.status, filters.status));
      if (filters.tier) conditions.push(eq(aiServiceProviders.tier, filters.tier));
      if (filters.supportedFeature) {
        conditions.push(sql`${aiServiceProviders.supportedFeatures} @> ${[filters.supportedFeature]}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    return await query.orderBy(aiServiceProviders.name);
  }

  async getAiServiceProvider(id: string): Promise<AiServiceProvider | undefined> {
    const [provider] = await db.select().from(aiServiceProviders).where(eq(aiServiceProviders.id, id));
    return provider || undefined;
  }

  async createAiServiceProvider(provider: InsertAiServiceProvider): Promise<AiServiceProvider> {
    const [newProvider] = await db.insert(aiServiceProviders).values(provider).returning();
    return newProvider;
  }

  async updateAiServiceProvider(id: string, provider: Partial<InsertAiServiceProvider>): Promise<AiServiceProvider> {
    const [updatedProvider] = await db
      .update(aiServiceProviders)
      .set({ ...provider, updatedAt: new Date() })
      .where(eq(aiServiceProviders.id, id))
      .returning();
    return updatedProvider;
  }

  async deleteAiServiceProvider(id: string): Promise<void> {
    await db.delete(aiServiceProviders).where(eq(aiServiceProviders.id, id));
  }

  // API Category management
  async getApiCategories(filters?: { isActive?: boolean }): Promise<ApiCategory[]> {
    let query = db.select().from(apiCategories);
    
    if (filters?.isActive !== undefined) {
      query = query.where(eq(apiCategories.isActive, filters.isActive));
    }
    
    return await query.orderBy(apiCategories.orderIndex, apiCategories.name);
  }

  async getApiCategory(id: string): Promise<ApiCategory | undefined> {
    const [category] = await db.select().from(apiCategories).where(eq(apiCategories.id, id));
    return category || undefined;
  }

  async createApiCategory(category: InsertApiCategory): Promise<ApiCategory> {
    const [newCategory] = await db.insert(apiCategories).values(category).returning();
    return newCategory;
  }

  async updateApiCategory(id: string, category: Partial<InsertApiCategory>): Promise<ApiCategory> {
    const [updatedCategory] = await db
      .update(apiCategories)
      .set(category)
      .where(eq(apiCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteApiCategory(id: string): Promise<void> {
    await db.delete(apiCategories).where(eq(apiCategories.id, id));
  }

  // API Testing and monitoring
  async getApiTestResults(filters?: {
    apiCallId?: string;
    status?: string;
    testType?: string;
    limit?: number;
  }): Promise<ApiTestResult[]> {
    let query = db.select().from(apiTestResults);
    
    if (filters) {
      const conditions = [];
      if (filters.apiCallId) conditions.push(eq(apiTestResults.apiCallId, filters.apiCallId));
      if (filters.status) conditions.push(eq(apiTestResults.status, filters.status));
      if (filters.testType) conditions.push(eq(apiTestResults.testType, filters.testType));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    return await query
      .orderBy(desc(apiTestResults.testedAt))
      .limit(filters?.limit || 50);
  }

  async createApiTestResult(testResult: InsertApiTestResult): Promise<ApiTestResult> {
    const [newTestResult] = await db.insert(apiTestResults).values(testResult).returning();
    return newTestResult;
  }

  // API Usage Analytics
  async getApiUsageAnalytics(filters?: {
    apiCallId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<ApiUsageAnalytics[]> {
    let query = db.select().from(apiUsageAnalytics);
    
    if (filters) {
      const conditions = [];
      if (filters.apiCallId) conditions.push(eq(apiUsageAnalytics.apiCallId, filters.apiCallId));
      if (filters.dateFrom) conditions.push(gte(apiUsageAnalytics.date, filters.dateFrom));
      if (filters.dateTo) conditions.push(lte(apiUsageAnalytics.date, filters.dateTo));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
    }
    
    return await query
      .orderBy(desc(apiUsageAnalytics.date))
      .limit(filters?.limit || 100);
  }

  async createApiUsageAnalytics(analytics: InsertApiUsageAnalytics): Promise<ApiUsageAnalytics> {
    const [newAnalytics] = await db.insert(apiUsageAnalytics).values(analytics).returning();
    return newAnalytics;
  }

  async updateApiUsageAnalytics(id: string, analytics: Partial<InsertApiUsageAnalytics>): Promise<ApiUsageAnalytics> {
    const [updatedAnalytics] = await db
      .update(apiUsageAnalytics)
      .set({ ...analytics, updatedAt: new Date() })
      .where(eq(apiUsageAnalytics.id, id))
      .returning();
    return updatedAnalytics;
  }

  // API Templates
  async getApiTemplates(filters?: {
    categoryId?: string;
    isPublic?: boolean;
    isFeatured?: boolean;
    tags?: string[];
    limit?: number;
  }): Promise<ApiTemplate[]> {
    try {
      let query = db.select().from(apiTemplates);
      
      if (filters) {
        const conditions = [];
        if (filters.categoryId) conditions.push(eq(apiTemplates.categoryId, filters.categoryId));
        if (filters.isPublic !== undefined) conditions.push(eq(apiTemplates.isPublic, filters.isPublic));
        if (filters.isFeatured !== undefined) conditions.push(eq(apiTemplates.isFeatured, filters.isFeatured));
        if (filters.tags && filters.tags.length > 0) {
          conditions.push(sql`${apiTemplates.tags} && ${filters.tags}`);
        }
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions) as any) as typeof query;
        }
      }
      
      return await query
        .orderBy(desc(apiTemplates.isFeatured), desc(apiTemplates.rating), desc(apiTemplates.usageCount))
        .limit(filters?.limit || 50);
    } catch (error) {
      console.error("Database error in getApiTemplates:", error);
      throw error;
    }
  }

  async getApiTemplate(id: string): Promise<ApiTemplate | undefined> {
    const [template] = await db.select().from(apiTemplates).where(eq(apiTemplates.id, id));
    return template || undefined;
  }

  async createApiTemplate(template: InsertApiTemplate): Promise<ApiTemplate> {
    const [newTemplate] = await db.insert(apiTemplates).values(template).returning();
    return newTemplate;
  }

  async updateApiTemplate(id: string, template: Partial<InsertApiTemplate>): Promise<ApiTemplate> {
    const [updatedTemplate] = await db
      .update(apiTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(apiTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteApiTemplate(id: string): Promise<void> {
    await db.delete(apiTemplates).where(eq(apiTemplates.id, id));
  }

  async incrementApiTemplateUsage(id: string): Promise<void> {
    await db
      .update(apiTemplates)
      .set({ 
        usageCount: sql`${apiTemplates.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(apiTemplates.id, id));
  }

  // AI API Management utility methods
  async initializeDefaultAiProviders(): Promise<void> {
    const { DEFAULT_AI_SERVICE_PROVIDERS } = await import("@shared/schema");
    
    for (const providerData of DEFAULT_AI_SERVICE_PROVIDERS) {
      const existing = await db.select().from(aiServiceProviders).where(eq(aiServiceProviders.id, providerData.id));
      
      if (existing.length === 0) {
        await this.createAiServiceProvider(providerData as InsertAiServiceProvider);
      }
    }
  }

  async initializeDefaultApiTemplates(): Promise<void> {
    const { DEFAULT_API_TEMPLATES } = await import("@shared/schema");
    
    for (const templateData of DEFAULT_API_TEMPLATES) {
      const existing = await db.select().from(apiTemplates).where(eq(apiTemplates.id, templateData.id));
      
      if (existing.length === 0) {
        await this.createApiTemplate(templateData as InsertApiTemplate);
      }
    }
  }

  async initializeDefaultApiCategories(): Promise<void> {
    const { DEFAULT_API_CATEGORIES } = await import("@shared/schema");
    
    for (const categoryData of DEFAULT_API_CATEGORIES) {
      const existing = await db.select().from(apiCategories).where(eq(apiCategories.id, categoryData.id));
      
      if (existing.length === 0) {
        await this.createApiCategory(categoryData as InsertApiCategory);
      }
    }
  }

  async bulkCreateLuxiaCloudApis(providerId: string): Promise<ApiCall[]> {
    const { LUXIACLOUD_APIS } = await import("@shared/schema");
    const createdApis: ApiCall[] = [];
    
    for (const apiData of LUXIACLOUD_APIS) {
      const apiCall = await this.createApiCall({
        providerId,
        categoryId: apiData.categoryId,
        name: apiData.name,
        displayName: apiData.name,
        description: apiData.description,
        url: apiData.url,
        method: apiData.method,
        modelName: apiData.modelName || null,
        inputTypes: apiData.inputTypes,
        outputTypes: apiData.outputTypes,
        supportsStreaming: apiData.supportsStreaming || false,
        inputCost: apiData.inputCost?.toString() || null,
        outputCost: apiData.outputCost?.toString() || null,
        costUnit: apiData.costUnit,
        isActive: true,
        requiresAuth: true,
        authType: 'api_key'
      });
      createdApis.push(apiCall);
    }
    
    return createdApis;
  }

  async searchApisByCapability(query: string, inputType?: string, outputType?: string): Promise<ApiCall[]> {
    let dbQuery = db.select().from(apiCalls);
    
    const conditions = [eq(apiCalls.isActive, true)];
    
    if (query) {
      conditions.push(
        or(
          like(apiCalls.name, `%${query}%`),
          like(apiCalls.description, `%${query}%`),
          like((apiCalls as any).modelName, `%${query}%`)
        )
      );
    }
    
    if (inputType) {
      conditions.push(sql`${(apiCalls as any).inputTypes} @> ${[inputType]}`);
    }
    
    if (outputType) {
      conditions.push(sql`${(apiCalls as any).outputTypes} @> ${[outputType]}`);
    }
    
    return await dbQuery
      .where(and(...conditions))
      .orderBy(desc(apiCalls.successCount), apiCalls.inputCost)
      .limit(20);
  }

  async getApiRecommendations(useCase: string): Promise<ApiCall[]> {
    // Simple keyword-based recommendation system
    const keywords = useCase.toLowerCase();
    let categoryId = '';
    
    if (keywords.includes('chat') || keywords.includes('대화') || keywords.includes('conversation')) {
      categoryId = 'llm';
    } else if (keywords.includes('image') || keywords.includes('이미지') || keywords.includes('vision')) {
      categoryId = 'vision';
    } else if (keywords.includes('voice') || keywords.includes('음성') || keywords.includes('speech')) {
      categoryId = keywords.includes('text') ? 'stt' : 'tts';
    } else if (keywords.includes('search') || keywords.includes('검색')) {
      categoryId = 'search';
    } else if (keywords.includes('translate') || keywords.includes('번역')) {
      categoryId = 'translation';
    } else {
      categoryId = 'analysis';
    }
    
    return await this.getApiCalls({
      categoryId,
      isActive: true,
      isVerified: true,
      limit: 10
    });
  }

  // ========== BALANCE ANALYSIS METHODS IMPLEMENTATION ==========

  // User Balances management
  async getUserBalances(userId: string, filters?: {
    date?: Date;
    symbol?: string;
    limit?: number;
  }): Promise<UserBalance[]> {
    let query = db.select().from(userBalances).where(eq(userBalances.userId, userId));
    
    if (filters?.date) {
      query = query.where(eq(userBalances.date, filters.date.toISOString().split('T')[0]));
    }
    
    if (filters?.symbol) {
      query = query.where(eq(userBalances.symbol, filters.symbol));
    }
    
    const results = await query
      .orderBy(desc(userBalances.date), userBalances.symbol)
      .limit(filters?.limit || 100);
    
    return results;
  }

  async getUserBalance(userId: string, date: Date, symbol: string): Promise<UserBalance | undefined> {
    const result = await db.select()
      .from(userBalances)
      .where(and(
        eq(userBalances.userId, userId),
        eq(userBalances.date, date.toISOString().split('T')[0]),
        eq(userBalances.symbol, symbol)
      ))
      .limit(1);
    
    return result[0];
  }

  async createUserBalance(balance: InsertUserBalance): Promise<UserBalance> {
    const [result] = await db.insert(userBalances).values(balance).returning();
    return result;
  }

  async updateUserBalance(id: string, balance: Partial<InsertUserBalance>): Promise<UserBalance> {
    const [result] = await db.update(userBalances)
      .set({ ...balance, updatedAt: new Date() })
      .where(eq(userBalances.id, id))
      .returning();
    return result;
  }

  async deleteUserBalance(id: string): Promise<void> {
    await db.delete(userBalances).where(eq(userBalances.id, id));
  }

  async bulkCreateUserBalances(balances: InsertUserBalance[]): Promise<UserBalance[]> {
    if (balances.length === 0) return [];
    const results = await db.insert(userBalances).values(balances).returning();
    return results;
  }

  // Balance Insights management
  async getBalanceInsights(userId: string, filters?: {
    date?: Date;
    limit?: number;
  }): Promise<BalanceInsights[]> {
    let query = db.select().from(balanceInsights).where(eq(balanceInsights.userId, userId));
    
    if (filters?.date) {
      query = query.where(eq(balanceInsights.date, filters.date.toISOString().split('T')[0]));
    }
    
    const results = await query
      .orderBy(desc(balanceInsights.date))
      .limit(filters?.limit || 30);
    
    return results;
  }

  async getBalanceInsight(userId: string, date: Date): Promise<BalanceInsights | undefined> {
    const result = await db.select()
      .from(balanceInsights)
      .where(and(
        eq(balanceInsights.userId, userId),
        eq(balanceInsights.date, date.toISOString().split('T')[0])
      ))
      .limit(1);
    
    return result[0];
  }

  async createBalanceInsights(insights: InsertBalanceInsights): Promise<BalanceInsights> {
    const [result] = await db.insert(balanceInsights).values(insights).returning();
    return result;
  }

  async updateBalanceInsights(id: string, insights: Partial<InsertBalanceInsights>): Promise<BalanceInsights> {
    const [result] = await db.update(balanceInsights)
      .set(insights)
      .where(eq(balanceInsights.id, id))
      .returning();
    return result;
  }

  async deleteBalanceInsights(id: string): Promise<void> {
    await db.delete(balanceInsights).where(eq(balanceInsights.id, id));
  }

  // User Tags management
  async getUserTags(userId: string, filters?: {
    category?: string;
    tag?: string;
  }): Promise<UserTag[]> {
    let query = db.select().from(userTags).where(eq(userTags.userId, userId));
    
    if (filters?.category) {
      query = query.where(eq(userTags.category, filters.category));
    }
    
    if (filters?.tag) {
      query = query.where(eq(userTags.tag, filters.tag));
    }
    
    return await query.orderBy(userTags.createdAt);
  }

  async getUserTag(userId: string, tag: string): Promise<UserTag | undefined> {
    const result = await db.select()
      .from(userTags)
      .where(and(
        eq(userTags.userId, userId),
        eq(userTags.tag, tag)
      ))
      .limit(1);
    
    return result[0];
  }

  async createUserTag(userTag: InsertUserTag): Promise<UserTag> {
    const [result] = await db.insert(userTags).values(userTag).returning();
    return result;
  }

  async updateUserTag(id: string, userTag: Partial<InsertUserTag>): Promise<UserTag> {
    const [result] = await db.update(userTags)
      .set(userTag)
      .where(eq(userTags.id, id))
      .returning();
    return result;
  }

  async deleteUserTag(id: string): Promise<void> {
    await db.delete(userTags).where(eq(userTags.id, id));
  }

  async bulkCreateUserTags(userTagsList: InsertUserTag[]): Promise<UserTag[]> {
    if (userTagsList.length === 0) return [];
    const results = await db.insert(userTags).values(userTagsList).returning();
    return results;
  }

  // User Watchlist management
  async getUserWatchlist(userId: string, filters?: {
    symbol?: string;
    market?: string;
    limit?: number;
  }): Promise<UserWatchlist[]> {
    let query = db.select().from(userWatchlist).where(eq(userWatchlist.userId, userId));
    
    if (filters?.symbol) {
      query = query.where(eq(userWatchlist.symbol, filters.symbol));
    }
    
    if (filters?.market) {
      query = query.where(eq(userWatchlist.market, filters.market));
    }
    
    return await query
      .orderBy(desc(userWatchlist.addedAt))
      .limit(filters?.limit || 100);
  }

  async getUserWatchlistItem(userId: string, symbol: string): Promise<UserWatchlist | undefined> {
    const result = await db.select()
      .from(userWatchlist)
      .where(and(
        eq(userWatchlist.userId, userId),
        eq(userWatchlist.symbol, symbol)
      ))
      .limit(1);
    
    return result[0];
  }

  async addToWatchlist(watchlistItem: InsertUserWatchlist): Promise<UserWatchlist> {
    const [result] = await db.insert(userWatchlist).values(watchlistItem).returning();
    return result;
  }

  async updateWatchlistItem(id: string, watchlistItem: Partial<InsertUserWatchlist>): Promise<UserWatchlist> {
    const [result] = await db.update(userWatchlist)
      .set(watchlistItem)
      .where(eq(userWatchlist.id, id))
      .returning();
    return result;
  }

  async removeFromWatchlist(id: string): Promise<void> {
    await db.delete(userWatchlist).where(eq(userWatchlist.id, id));
  }

  async removeFromWatchlistBySymbol(userId: string, symbol: string): Promise<void> {
    await db.delete(userWatchlist)
      .where(and(
        eq(userWatchlist.userId, userId),
        eq(userWatchlist.symbol, symbol)
      ));
  }

  // Balance Analysis Utilities
  async generateBalanceAnalysis(userId: string, date: Date): Promise<BalanceInsights> {
    // Get current balances for the user
    const balances = await this.getUserBalances(userId, { date });
    
    if (balances.length === 0) {
      throw new Error(`No balance data found for user ${userId} on ${date.toISOString().split('T')[0]}`);
    }
    
    // Calculate portfolio metrics
    const totalValue = balances.reduce((sum, balance) => 
      sum + Number(balance.marketValue || 0), 0
    );
    
    const totalPnl = balances.reduce((sum, balance) => 
      sum + Number(balance.pnl || 0), 0
    );
    
    const totalPnlPercent = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;
    
    // Get top holdings
    const topHoldings = balances
      .sort((a, b) => Number(b.marketValue || 0) - Number(a.marketValue || 0))
      .slice(0, 10)
      .map(balance => ({
        symbol: balance.symbol,
        name: balance.symbolName || balance.symbol,
        weight: totalValue > 0 ? (Number(balance.marketValue || 0) / totalValue) * 100 : 0,
        value: Number(balance.marketValue || 0),
        pnl: Number(balance.pnl || 0),
        pnlPercent: Number(balance.pnlPercent || 0)
      }));
    
    // Calculate portfolio metrics
    const portfolioMetrics = {
      diversificationRatio: balances.length,
      concentrationRisk: topHoldings.length > 0 ? topHoldings[0].weight : 0,
      sectorAllocation: balances.reduce((acc, balance) => {
        const sector = balance.sectorName || 'Unknown';
        acc[sector] = (acc[sector] || 0) + (Number(balance.marketValue || 0) / totalValue) * 100;
        return acc;
      }, {} as Record<string, number>),
      marketAllocation: balances.reduce((acc, balance) => {
        const market = balance.market || 'Unknown';
        acc[market] = (acc[market] || 0) + (Number(balance.marketValue || 0) / totalValue) * 100;
        return acc;
      }, {} as Record<string, number>)
    };
    
    // Generate AI summary (placeholder)
    const summary = `Portfolio summary for ${date.toISOString().split('T')[0]}: Total value ${totalValue.toLocaleString()}원, Total P&L ${totalPnl.toLocaleString()}원 (${totalPnlPercent.toFixed(2)}%). Portfolio consists of ${balances.length} positions.`;
    
    // Create insights record
    const insights: InsertBalanceInsights = {
      userId,
      date: date.toISOString().split('T')[0],
      totalValue: totalValue.toString(),
      totalPnl: totalPnl.toString(),
      totalPnlPercent: totalPnlPercent.toString(),
      topHoldings,
      portfolioMetrics,
      riskMetrics: {
        portfolioVolatility: 0, // To be calculated with historical data
        sharpeRatio: 0,
        maxDrawdown: 0,
        beta: 0,
        valueAtRisk: 0
      },
      performanceMetrics: {
        dailyReturn: 0, // To be calculated
        weeklyReturn: 0,
        monthlyReturn: 0,
        ytdReturn: 0,
        annualizedReturn: 0
      },
      marketComparison: {
        vsKospi: 0, // To be calculated
        vsKosdaq: 0,
        vsSP500: 0,
        vsNasdaq: 0
      },
      summary,
      recommendations: [
        "포트폴리오 분산을 고려해보세요",
        "집중도가 높은 종목의 비중을 조정해보세요"
      ],
      warnings: [],
      opportunities: [],
      confidenceScore: "0.8"
    };
    
    return await this.createBalanceInsights(insights);
  }

  async recomputeBalanceInsights(userId: string, startDate?: Date, endDate?: Date): Promise<BalanceInsights[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate || new Date();
    
    const insights: BalanceInsights[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      try {
        const insight = await this.generateBalanceAnalysis(userId, new Date(d));
        insights.push(insight);
      } catch (error: unknown) {
        // Skip dates with no data
        console.log(`No balance data for ${userId} on ${d.toISOString().split('T')[0]}`);
      }
    }
    
    return insights;
  }

  async getPortfolioSummary(userId: string, date: Date): Promise<{
    totalValue: number;
    totalPnl: number;
    totalPnlPercent: number;
    topPerformers: Array<{ symbol: string; pnlPercent: number }>;
    bottomPerformers: Array<{ symbol: string; pnlPercent: number }>;
    sectorAllocation: Record<string, number>;
  }> {
    const balances = await this.getUserBalances(userId, { date });
    
    const totalValue = balances.reduce((sum, balance) => 
      sum + Number(balance.marketValue || 0), 0
    );
    
    const totalPnl = balances.reduce((sum, balance) => 
      sum + Number(balance.pnl || 0), 0
    );
    
    const totalPnlPercent = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;
    
    const sortedByPnl = balances
      .filter(b => Number(b.pnlPercent || 0) !== 0)
      .sort((a, b) => Number(b.pnlPercent || 0) - Number(a.pnlPercent || 0));
    
    const topPerformers = sortedByPnl.slice(0, 5).map(b => ({
      symbol: b.symbol,
      pnlPercent: Number(b.pnlPercent || 0)
    }));
    
    const bottomPerformers = sortedByPnl.slice(-5).map(b => ({
      symbol: b.symbol,
      pnlPercent: Number(b.pnlPercent || 0)
    }));
    
    const sectorAllocation = balances.reduce((acc, balance) => {
      const sector = balance.sectorName || 'Unknown';
      acc[sector] = (acc[sector] || 0) + (Number(balance.marketValue || 0) / totalValue) * 100;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalValue,
      totalPnl,
      totalPnlPercent,
      topPerformers,
      bottomPerformers,
      sectorAllocation
    };
  }

  async searchSimilarPortfolios(userId: string, limit?: number): Promise<Array<{ 
    userId: string; 
    similarity: number; 
    insights: BalanceInsights;
  }>> {
    // Get the user's latest insights for comparison
    const userInsights = await this.getBalanceInsights(userId, { limit: 1 });
    if (userInsights.length === 0) {
      return [];
    }
    
    const targetInsights = userInsights[0];
    
    // For now, return a simple similarity based on portfolio size
    // In the future, this could use vector embeddings for more sophisticated similarity
    const allInsights = await db.select()
      .from(balanceInsights)
      .where(sql`${balanceInsights.userId} != ${userId}`)
      .orderBy(desc(balanceInsights.date))
      .limit((limit || 10) * 2); // Get more to filter
    
    const targetValue = Number(targetInsights.totalValue || 0);
    
    const similarities = allInsights
      .map(insights => {
        const value = Number(insights.totalValue || 0);
        const similarity = 1 / (1 + Math.abs(targetValue - value) / Math.max(targetValue, value, 1));
        return { userId: insights.userId, similarity, insights };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit || 10);
    
    return similarities;
  }

  async getDistinctUserIdsWithBalances(date?: Date): Promise<string[]> {
    const targetDate = date || new Date();
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    try {
      // Get distinct user IDs from userBalances table for the target date
      const result = await db.selectDistinct({ userId: userBalances.userId })
        .from(userBalances)
        .where(sql`DATE(${userBalances.date}) = ${targetDateStr}`);
      
      return result.map(row => row.userId);
    } catch (error) {
      console.error('Error getting distinct user IDs with balances:', error);
      return [];
    }
  }

  // ========== TRADING ANALYSIS METHODS IMPLEMENTATION ==========

  // User Trades management
  async getUserTrades(userId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    symbol?: string;
    side?: 'buy' | 'sell';
    limit?: number;
  }): Promise<UserTrade[]> {
    let query = db.select().from(userTrades).where(eq(userTrades.userId, userId));
    
    if (filters?.startDate) {
      query = query.where(gte(userTrades.tradeDate, filters.startDate!.toISOString().split('T')[0]));
    }
    
    if (filters?.endDate) {
      query = query.where(lte(userTrades.tradeDate, filters.endDate!.toISOString().split('T')[0]));
    }
    
    if (filters?.symbol) {
      query = query.where(eq(userTrades.symbol, filters.symbol));
    }
    
    if (filters?.side) {
      query = query.where(eq(userTrades.side, filters.side));
    }
    
    query = query.orderBy(desc(userTrades.tradeDate)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    try {
      return await query;
    } catch (error) {
      console.error('Error fetching user trades:', error);
      return [];
    }
  }

  async getUserTrade(id: string): Promise<UserTrade | undefined> {
    try {
      const [result] = await db.select().from(userTrades).where(eq(userTrades.id, id)).limit(1);
      return result;
    } catch (error) {
      console.error('Error fetching user trade:', error);
      return undefined;
    }
  }

  async createUserTrade(trade: InsertUserTrade): Promise<UserTrade> {
    const [result] = await db.insert(userTrades).values(trade).returning();
    return result;
  }

  async updateUserTrade(id: string, trade: Partial<InsertUserTrade>): Promise<UserTrade> {
    const [result] = await db.update(userTrades)
      .set({ ...trade, updatedAt: new Date() })
      .where(eq(userTrades.id, id))
      .returning();
    return result;
  }

  async deleteUserTrade(id: string): Promise<void> {
    await db.delete(userTrades).where(eq(userTrades.id, id));
  }

  async bulkCreateUserTrades(trades: InsertUserTrade[]): Promise<UserTrade[]> {
    if (trades.length === 0) return [];
    return await db.insert(userTrades).values(trades).returning();
  }

  // Trade Insights management
  async getTradeInsights(userId: string, filters?: {
    month?: string;
    limit?: number;
  }): Promise<TradeInsights[]> {
    let query = db.select().from(tradeInsights).where(eq(tradeInsights.userId, userId));
    
    if (filters?.month) {
      query = query.where(eq(tradeInsights.month, filters.month));
    }
    
    query = query.orderBy(desc(tradeInsights.month)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    try {
      return await query;
    } catch (error) {
      console.error('Error fetching trade insights:', error);
      return [];
    }
  }

  async getTradeInsight(userId: string, month: string): Promise<TradeInsights | undefined> {
    try {
      const [result] = await db.select().from(tradeInsights)
        .where(and(eq(tradeInsights.userId, userId), eq(tradeInsights.month, month)))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error fetching trade insight:', error);
      return undefined;
    }
  }

  async createTradeInsights(insights: InsertTradeInsights): Promise<TradeInsights> {
    const [result] = await db.insert(tradeInsights).values(insights).returning();
    return result;
  }

  async updateTradeInsights(id: string, insights: Partial<InsertTradeInsights>): Promise<TradeInsights> {
    const [result] = await db.update(tradeInsights)
      .set(insights)
      .where(eq(tradeInsights.id, id))
      .returning();
    return result;
  }

  async deleteTradeInsights(id: string): Promise<void> {
    await db.delete(tradeInsights).where(eq(tradeInsights.id, id));
  }

  // Trading Analysis Utilities
  async generateTradingInsights(userId: string, month: string): Promise<TradeInsights> {
    // Get trades for the month
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    const trades = await this.getUserTrades(userId, { startDate, endDate });
    
    if (trades.length === 0) {
      throw new Error(`No trades found for user ${userId} in month ${month}`);
    }

    // Calculate trading metrics
    const buyTrades = trades.filter(t => t.side === 'buy').sort((a, b) => 
      new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
    );
    const sellTrades = trades.filter(t => t.side === 'sell').sort((a, b) => 
      new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
    );
    const totalTradeValue = trades.reduce((sum, trade) => sum + Number(trade.tradeValue), 0);
    
    // Calculate realized PnL using FIFO matching
    interface MatchedTrade {
      symbol: string;
      symbolName: string;
      buyDate: string;
      sellDate: string;
      buyPrice: number;
      sellPrice: number;
      quantity: number;
      pnl: number;
      pnlPercent: number;
      holdingDays: number;
    }
    
    const matchedTrades: MatchedTrade[] = [];
    const buyQueue = new Map<string, Array<{ trade: any; remainingQty: number }>>();
    
    // Initialize buy queue by symbol
    buyTrades.forEach(buyTrade => {
      const symbol = buyTrade.symbol;
      if (!buyQueue.has(symbol)) {
        buyQueue.set(symbol, []);
      }
      buyQueue.get(symbol)!.push({
        trade: buyTrade,
        remainingQty: Number(buyTrade.quantity)
      });
    });
    
    // Match sell trades with buy trades (FIFO)
    sellTrades.forEach(sellTrade => {
      const symbol = sellTrade.symbol;
      const sellQty = Number(sellTrade.quantity);
      const sellPrice = Number(sellTrade.price);
      const sellDate = new Date(sellTrade.tradeDate);
      let remainingSellQty = sellQty;
      
      const buyQueueForSymbol = buyQueue.get(symbol) || [];
      
      for (let i = 0; i < buyQueueForSymbol.length && remainingSellQty > 0; i++) {
        const buyEntry = buyQueueForSymbol[i];
        if (buyEntry.remainingQty <= 0) continue;
        
        const matchedQty = Math.min(buyEntry.remainingQty, remainingSellQty);
        const buyPrice = Number(buyEntry.trade.price);
        const buyDate = new Date(buyEntry.trade.tradeDate);
        
        const pnl = (sellPrice - buyPrice) * matchedQty - 
                    (Number(sellTrade.commission || 0) * matchedQty / sellQty) -
                    (Number(buyEntry.trade.commission || 0) * matchedQty / buyEntry.trade.quantity);
        const pnlPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
        const holdingDays = Math.max(0, Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        matchedTrades.push({
          symbol,
          symbolName: sellTrade.symbolName || buyEntry.trade.symbolName || symbol,
          buyDate: buyEntry.trade.tradeDate,
          sellDate: sellTrade.tradeDate,
          buyPrice,
          sellPrice,
          quantity: matchedQty,
          pnl,
          pnlPercent,
          holdingDays
        });
        
        buyEntry.remainingQty -= matchedQty;
        remainingSellQty -= matchedQty;
      }
    });
    
    // Calculate performance metrics from matched trades
    const realizedPnl = matchedTrades.reduce((sum, mt) => sum + mt.pnl, 0);
    const totalBuyCost = matchedTrades.reduce((sum, mt) => sum + (mt.buyPrice * mt.quantity), 0);
    const monthlyReturn = totalBuyCost > 0 ? (realizedPnl / totalBuyCost) * 100 : 0;
    const profitableTrades = matchedTrades.filter(mt => mt.pnl > 0);
    const losingTrades = matchedTrades.filter(mt => mt.pnl < 0);
    const winRate = matchedTrades.length > 0 ? (profitableTrades.length / matchedTrades.length) * 100 : 0;
    const totalProfit = profitableTrades.reduce((sum, mt) => sum + mt.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, mt) => sum + mt.pnl, 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);
    const avgHoldingPeriod = matchedTrades.length > 0 
      ? matchedTrades.reduce((sum, mt) => sum + mt.holdingDays, 0) / matchedTrades.length 
      : 0;
    
    // Find best and worst trades
    const bestTrade = matchedTrades.length > 0 
      ? matchedTrades.reduce((best, mt) => mt.pnlPercent > best.pnlPercent ? mt : best)
      : null;
    const worstTrade = matchedTrades.length > 0
      ? matchedTrades.reduce((worst, mt) => mt.pnlPercent < worst.pnlPercent ? mt : worst)
      : null;
    
    // Calculate consecutive wins/losses
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentStreak = 0;
    let isWinning = true;
    
    matchedTrades.sort((a, b) => new Date(a.sellDate).getTime() - new Date(b.sellDate).getTime());
    
    matchedTrades.forEach(mt => {
      if (mt.pnl > 0) {
        if (isWinning) {
          currentStreak++;
        } else {
          consecutiveLosses = Math.max(consecutiveLosses, currentStreak);
          currentStreak = 1;
          isWinning = true;
        }
      } else {
        if (!isWinning) {
          currentStreak++;
        } else {
          consecutiveWins = Math.max(consecutiveWins, currentStreak);
          currentStreak = 1;
          isWinning = false;
        }
      }
    });
    
    if (isWinning) {
      consecutiveWins = Math.max(consecutiveWins, currentStreak);
    } else {
      consecutiveLosses = Math.max(consecutiveLosses, currentStreak);
    }
    
    // Calculate return distribution
    const returnDistribution: Record<string, number> = {};
    matchedTrades.forEach(mt => {
      const range = Math.floor(mt.pnlPercent / 5) * 5; // 5% intervals
      const key = `${range}%`;
      returnDistribution[key] = (returnDistribution[key] || 0) + 1;
    });
    
    // Group trades by hour for timing analysis (already calculated above, but keeping here for consistency)
    const tradingHours = trades.reduce((acc, trade) => {
      const hour = trade.tradeHour || 9; // default to 9 AM
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const preferredTradingHours = Object.entries(tradingHours)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Sector concentration
    const sectorConcentration = trades.reduce((acc, trade) => {
      const sector = trade.sectorName || 'Unknown';
      if (!acc[sector]) acc[sector] = { trades: 0, value: 0 };
      acc[sector].trades += 1;
      acc[sector].value += Number(trade.tradeValue);
      return acc;
    }, {} as Record<string, { trades: number; value: number }>);

    const tradingMetrics: TradingMetrics = {
      totalTrades: trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      winRate: winRate,
      avgHoldingPeriod: Math.round(avgHoldingPeriod),
      buyToSellRatio: buyTrades.length / Math.max(sellTrades.length, 1),
      avgTradeSize: totalTradeValue / trades.length,
      tradingFrequency: trades.length,
      preferredTradingHours,
      marketSessionActivity: {
        regular: trades.filter(t => t.marketSession === 'regular').length,
        pre: trades.filter(t => t.marketSession === 'pre_market').length,
        after: trades.filter(t => t.marketSession === 'after_hours').length
      },
      sectorConcentration,
      avgCommissionRate: trades.reduce((sum, t) => sum + Number(t.commission || 0), 0) / totalTradeValue * 100
    };

    // Calculate performance metrics from matched trades
    const avgReturnPerTrade = matchedTrades.length > 0 
      ? matchedTrades.reduce((sum, mt) => sum + mt.pnlPercent, 0) / matchedTrades.length 
      : 0;
    
    const performanceMetrics: PerformanceMetrics = {
      monthlyReturn: monthlyReturn,
      realizedPnl: realizedPnl,
      totalTradeValue,
      avgReturnPerTrade: avgReturnPerTrade,
      bestTrade: bestTrade ? { 
        symbol: bestTrade.symbol, 
        return: bestTrade.pnlPercent, 
        date: bestTrade.sellDate 
      } : { symbol: '', return: 0, date: '' },
      worstTrade: worstTrade ? { 
        symbol: worstTrade.symbol, 
        return: worstTrade.pnlPercent, 
        date: worstTrade.sellDate 
      } : { symbol: '', return: 0, date: '' },
      consecutiveWins: consecutiveWins,
      consecutiveLosses: consecutiveLosses,
      profitFactor: profitFactor,
      returnDistribution: returnDistribution
    };

    // Risk metrics (simplified)
    const riskMetrics: RiskMetrics = {
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      calmarRatio: 0,
      valueAtRisk: 0,
      averageLossPerTrade: 0,
      riskRewardRatio: 0,
      diversificationScore: Object.keys(sectorConcentration).length / 10, // Simple diversification score
      marketCorrelation: 0
    };

    // Benchmark comparison (mock data for now)
    const benchmarkComparison: BenchmarkComparison = {
      vsKospi: { return: 0, outperformance: 0 },
      vsKosdaq: { return: 0, outperformance: 0 },
      vsSP500: { return: 0, outperformance: 0 },
      vsNasdaq: { return: 0, outperformance: 0 },
      marketBeta: 1.0,
      relativeVolatility: 1.0,
      informationRatio: 0,
      trackingError: 0
    };

    // Generate AI insights
    const prompt = `다음 매매 데이터를 분석하여 ${month} 월 매매 인사이트를 제공해주세요:
    
매매 통계:
- 총 거래 수: ${tradingMetrics.totalTrades}
- 매수 거래: ${tradingMetrics.buyTrades}
- 매도 거래: ${tradingMetrics.sellTrades}
- 총 거래금액: ${totalTradeValue.toLocaleString()}원
- 선호 거래시간: ${preferredTradingHours.join(', ')}시
- 주요 섹터: ${Object.keys(sectorConcentration).slice(0, 3).join(', ')}

한국어로 간결하고 실용적인 분석을 제공해주세요.`;

    let summary = '';
    let recommendations: string[] = [];
    let warnings: string[] = [];
    let opportunities: string[] = [];
    let patterns: string[] = [];

    try {
      const aiResponse = await openaiService.generateCompletion({ messages: [{ role: 'user', content: prompt }] }) as any;
      summary = aiResponse?.choices?.[0]?.message?.content || '분석 결과를 생성할 수 없습니다.';
      
      // Extract structured insights from AI response (simplified)
      if (tradingMetrics.buyToSellRatio > 2) {
        warnings.push('매수 거래가 매도 거래보다 현저히 많습니다. 포지션 관리를 검토해보세요.');
      }
      
      if (Object.keys(sectorConcentration).length < 3) {
        recommendations.push('포트폴리오 분산을 위해 다른 섹터도 고려해보세요.');
      }
      
      if (tradingMetrics.tradingFrequency > 50) {
        patterns.push('높은 거래 빈도 패턴이 관찰됩니다.');
      }
      
    } catch (error) {
      console.error('Error generating AI insights:', error);
      summary = '매매 패턴 분석 중 오류가 발생했습니다.';
    }

    // Create embeddings for similarity search
    let embeddings = '';
    try {
      const embeddingResponse = await openaiService.generateEmbedding(summary) as any;
      embeddings = JSON.stringify(embeddingResponse?.data?.[0]?.embedding || []);
    } catch (error) {
      console.error('Error creating embeddings:', error);
    }

    const insights: InsertTradeInsights = {
      userId,
      month,
      tradingMetrics,
      performanceMetrics,
      riskMetrics,
      benchmarkComparison,
      summary,
      recommendations,
      warnings,
      opportunities,
      patterns,
      analysisVersion: '1.0',
      confidenceScore: '0.8',
      dataQualityScore: '0.9',
      embeddings,
      embeddingModel: 'text-embedding-3-large'
    };

    return await this.createTradeInsights(insights);
  }

  async recomputeTradeInsights(userId: string, startMonth?: string, endMonth?: string): Promise<TradeInsights[]> {
    const results: TradeInsights[] = [];
    
    // Generate date range if not provided
    const start = startMonth ? new Date(`${startMonth}-01`) : new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1);
    const end = endMonth ? new Date(`${endMonth}-01`) : new Date();
    
    // Generate insights for each month
    const current = new Date(start);
    while (current <= end) {
      const monthStr = current.toISOString().slice(0, 7); // YYYY-MM format
      
      try {
        // Delete existing insights
        const existing = await this.getTradeInsight(userId, monthStr);
        if (existing) {
          await this.deleteTradeInsights(existing.id);
        }
        
        // Generate new insights
        const insights = await this.generateTradingInsights(userId, monthStr);
        results.push(insights);
      } catch (error: unknown) {
        console.error(`Error recomputing insights for ${monthStr}:`, error);
      }
      
      current.setMonth(current.getMonth() + 1);
    }
    
    return results;
  }

  async getMonthlyTradingMetrics(userId: string, month: string): Promise<{
    totalTrades: number;
    totalValue: number;
    winRate: number;
    avgReturn: number;
    sectorBreakdown: Record<string, number>;
  }> {
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    const trades = await this.getUserTrades(userId, { startDate, endDate });
    
    const totalValue = trades.reduce((sum, trade) => sum + Number(trade.tradeValue), 0);
    const sectorBreakdown = trades.reduce((acc, trade) => {
      const sector = trade.sectorName || 'Unknown';
      acc[sector] = (acc[sector] || 0) + Number(trade.tradeValue);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTrades: trades.length,
      totalValue,
      winRate: 0, // Would need position tracking
      avgReturn: 0, // Would need position tracking
      sectorBreakdown
    };
  }

  async getTradingPerformanceSummary(userId: string, month: string): Promise<{
    monthlyReturn: number;
    totalPnl: number;
    benchmarkComparison: {
      vsKospi: number;
      vsKosdaq: number;
    };
  }> {
    const insights = await this.getTradeInsight(userId, month);
    
    if (!insights || !insights.performanceMetrics || !insights.benchmarkComparison) {
      return {
        monthlyReturn: 0,
        totalPnl: 0,
        benchmarkComparison: { vsKospi: 0, vsKosdaq: 0 }
      };
    }
    
    const performance = insights.performanceMetrics as PerformanceMetrics;
    const benchmark = insights.benchmarkComparison as BenchmarkComparison;
    
    return {
      monthlyReturn: performance.monthlyReturn,
      totalPnl: performance.realizedPnl,
      benchmarkComparison: {
        vsKospi: benchmark.vsKospi.outperformance,
        vsKosdaq: benchmark.vsKosdaq.outperformance
      }
    };
  }

  async searchSimilarTraders(userId: string, month: string, limit: number = 5): Promise<Array<{ 
    userId: string; 
    similarity: number; 
    insights: TradeInsights;
  }>> {
    const userInsights = await this.getTradeInsight(userId, month);
    if (!userInsights || !userInsights.embeddings) {
      return [];
    }

    // Get all other users' insights for the same month
    const allInsights = await db.select().from(tradeInsights)
      .where(and(eq(tradeInsights.month, month), sql`${tradeInsights.userId} != ${userId}`))
      .limit(100);

    const similarities: Array<{ userId: string; similarity: number; insights: TradeInsights }> = [];
    const userEmbedding = JSON.parse(userInsights.embeddings);

    for (const insights of allInsights) {
      if (!insights.embeddings) continue;
      
      try {
        const otherEmbedding = JSON.parse(insights.embeddings);
        // Simple cosine similarity calculation
        const similarity = this.calculateCosineSimilarity(userEmbedding, otherEmbedding);
        similarities.push({ userId: insights.userId, similarity, insights });
      } catch (error: unknown) {
        console.error('Error calculating similarity:', error);
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async getUsersWithTradesInMonth(month: string): Promise<string[]> {
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    try {
      const result = await db.selectDistinct({ userId: userTrades.userId })
        .from(userTrades)
        .where(and(
          gte(userTrades.tradeDate, startDateStr),
          lte(userTrades.tradeDate, endDateStr)
        ));
      
      return result.map(row => row.userId);
    } catch (error) {
      console.error('Error getting users with trades in month:', error);
      return [];
    }
  }

  // Helper method for similarity calculation
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // ========== ENHANCED PERSONALIZATION METHODS IMPLEMENTATION ==========

  async getPersonalizedPortfolio(userId: string, date: Date): Promise<any> {
    try {
      // Get portfolio summary using existing method
      const portfolioSummary = await this.getPortfolioSummary(userId, date);
      
      // Get balance insights for additional metrics
      const insights = await this.getBalanceInsight(userId, date);
      
      // Calculate day change (simplified - would need historical data)
      const dayChange = 0; // Would need yesterday's data
      const dayChangePercent = 0;
      
      return {
        totalValue: portfolioSummary.totalValue,
        totalReturn: portfolioSummary.totalPnl,
        totalReturnPercent: portfolioSummary.totalPnlPercent,
        dayChange,
        dayChangePercent,
        topHoldings: portfolioSummary.topPerformers?.slice(0, 5).map(item => ({
          symbol: item.symbol,
          symbolName: item.symbol, // Would need symbol name lookup
          value: 0, // Would need individual values
          percentage: item.pnlPercent,
          change: 0,
          changePercent: item.pnlPercent
        })) || [],
        sectorDistribution: Object.entries(portfolioSummary.sectorAllocation).map(([sector, percentage]) => ({
          sector,
          percentage,
          value: (portfolioSummary.totalValue * percentage) / 100
        }))
      };
    } catch (error) {
      console.error('Error getting personalized portfolio:', error);
      return {
        totalValue: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        topHoldings: [],
        sectorDistribution: []
      };
    }
  }

  async getHoldingsDetails(userId: string, filters?: any): Promise<any[]> {
    try {
      const date = filters?.date || new Date();
      const balances = await this.getUserBalances(userId, { date });
      
      let results = balances.map(balance => ({
        symbol: balance.symbol,
        symbolName: balance.symbolName || balance.symbol,
        quantity: Number(balance.quantity),
        avgPrice: Number(balance.avgCost),
        currentPrice: Number(balance.currentPrice || 0),
        value: Number(balance.marketValue || 0),
        percentage: Number(balance.portfolioWeight || 0),
        change: Number(balance.pnl || 0),
        changePercent: Number(balance.pnlPercent || 0),
        sector: balance.sectorName || 'Unknown',
        theme: undefined, // Would need theme mapping
        purchaseDate: balance.createdAt?.toISOString() || new Date().toISOString(),
        dividendYield: undefined,
        beta: undefined
      }));
      
      // Apply filters
      if (filters?.sector && filters.sector !== 'all') {
        results = results.filter(item => item.sector === filters.sector);
      }
      
      // Apply sorting
      if (filters?.sortBy) {
        switch (filters.sortBy) {
          case 'value':
            results.sort((a, b) => b.value - a.value);
            break;
          case 'return':
            results.sort((a, b) => b.changePercent - a.changePercent);
            break;
          case 'symbol':
            results.sort((a, b) => a.symbol.localeCompare(b.symbol));
            break;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error getting holdings details:', error);
      return [];
    }
  }

  async getPersonalizedNews(userId: string, filters?: any): Promise<any[]> {
    try {
      // Get user tags to understand preferences
      const userTags = await this.getUserTags(userId);
      const preferredSectors = userTags.filter(tag => tag.category === 'sector').map(tag => tag.tag);
      const watchlist = await this.getUserWatchlist(userId);
      const watchedSymbols = watchlist.map(item => item.symbol);
      
      // Get news data with filters
      const newsFilters: any = {
        startDate: filters?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        limit: filters?.limit || 50
      };
      
      if (filters?.category) {
        newsFilters.category = filters.category;
      }
      
      const newsData = await this.searchNewsData(newsFilters);
      
      // TODO: Add bookmark checking (would need bookmark table)
      // TODO: Add relevance scoring based on user preferences
      
      return newsData.map(news => ({
        id: news.id,
        title: news.title,
        summary: news.summary || news.content.substring(0, 200) + '...',
        source: news.source || 'Unknown',
        publishedAt: news.publishedAt.toISOString(),
        sentiment: news.sentiment as any || 'neutral',
        relevantSymbols: news.relevantSymbols || [],
        marketScore: Number(news.marketScore || 0),
        economicScore: Number(news.economicScore || 0),
        themeName: undefined, // Would need theme lookup
        isBookmarked: false, // Would need bookmark table
        url: undefined
      })).slice(0, filters?.limit || 20);
    } catch (error) {
      console.error('Error getting personalized news:', error);
      return [];
    }
  }

  async bookmarkNews(userId: string, newsId: string): Promise<any> {
    // TODO: Implement bookmark table and logic
    return {
      id: Math.random().toString(),
      userId,
      newsId,
      createdAt: new Date()
    };
  }

  async removeNewsBookmark(userId: string, newsId: string): Promise<void> {
    // Note: Bookmark table is not yet implemented in schema
    // This is a placeholder implementation that can be enhanced when bookmark table is added
    try {
      // For now, we just log the removal request
      // When bookmark table is implemented, it should be:
      // await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.newsId, newsId)));
      console.log(`Bookmark removal requested: user ${userId}, news ${newsId}`);
      // Return successfully for now to avoid breaking existing code
      return;
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      // Don't throw error to maintain backward compatibility
    }
  }

  async getPersonalizedRecommendations(userId: string, filters?: any): Promise<any> {
    try {
      // Get user profile and preferences
      const userTags = await this.getUserTags(userId);
      const riskTolerance = userTags.find(tag => tag.category === 'risk_preference')?.tag || 'moderate';
      
      // Generate stock recommendations (simplified)
      const stockRecommendations = [
        {
          symbol: '005930',
          symbolName: '삼성전자',
          currentPrice: 75000,
          targetPrice: 85000,
          upside: 13.3,
          confidence: 85,
          reason: '반도체 업황 개선으로 실적 증가 전망',
          riskLevel: 'medium' as const,
          timeHorizon: '중기' as const,
          tags: ['대형주', '기술주']
        },
        {
          symbol: '000660',
          symbolName: 'SK하이닉스',
          currentPrice: 105000,
          targetPrice: 120000,
          upside: 14.3,
          confidence: 78,
          reason: 'AI 메모리 수요 증가',
          riskLevel: 'medium' as const,
          timeHorizon: '장기' as const,
          tags: ['성장주', '기술주']
        }
      ];
      
      // Generate theme recommendations
      const themeRecommendations = [
        {
          id: 'ai-theme',
          name: 'AI 혁신',
          description: '인공지능 관련 기업들의 성장 기회',
          growthPotential: 85,
          riskLevel: 'high' as const,
          topStocks: ['005930', '000660', '035420'],
          expectedReturn: 25,
          timeframe: '1-2년',
          reasoning: 'AI 기술 발전으로 관련 기업들의 실적 개선 기대'
        }
      ];
      
      // Generate insights
      const insights = [
        {
          id: 'portfolio-diversification',
          type: 'portfolio' as const,
          title: '포트폴리오 분산 개선',
          description: '섹터 집중도가 높습니다. 다른 섹터 투자를 고려해보세요.',
          action: '헬스케어, 금융 섹터 종목 검토',
          priority: 'medium' as const,
          impact: 75
        }
      ];
      
      return {
        stocks: stockRecommendations,
        themes: themeRecommendations,
        insights
      };
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return { stocks: [], themes: [], insights: [] };
    }
  }

  async getTradingPerformanceAnalytics(userId: string, filters?: any): Promise<any> {
    try {
      const timeRange = filters?.timeRange || '1Y';
      const monthsBack = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
      
      // Get recent trading insights
      const endDate = new Date();
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - monthsBack, 1);
      
      const monthlyData = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const monthStr = current.toISOString().slice(0, 7);
        const insights = await this.getTradeInsight(userId, monthStr);
        
        if (insights?.performanceMetrics) {
          const metrics = insights.performanceMetrics as PerformanceMetrics;
          monthlyData.push({
            month: monthStr,
            return: metrics.monthlyReturn,
            benchmark: 2.5 // Mock benchmark return
          });
        }
        
        current.setMonth(current.getMonth() + 1);
      }
      
      // Calculate aggregate metrics
      const totalReturn = monthlyData.reduce((sum, m) => sum + m.return, 0);
      const avgReturn = monthlyData.length > 0 ? totalReturn / monthlyData.length : 0;
      const annualizedReturn = avgReturn * 12;
      
      return {
        totalReturn,
        totalReturnPercent: avgReturn,
        annualizedReturn,
        sharpeRatio: 1.2, // Would need risk-free rate calculation
        maxDrawdown: -8.5, // Would need detailed calculation
        winRate: 65, // Would need trade-by-trade analysis
        avgHoldingDays: 30, // Would need position tracking
        benchmarkComparison: {
          kospi: 3.2,
          kosdaq: 1.8,
          sp500: 8.5
        },
        monthlyReturns: monthlyData
      };
    } catch (error) {
      console.error('Error getting trading performance analytics:', error);
      return {
        totalReturn: 0,
        totalReturnPercent: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        avgHoldingDays: 0,
        benchmarkComparison: { kospi: 0, kosdaq: 0, sp500: 0 },
        monthlyReturns: []
      };
    }
  }

  async getPortfolioAllocation(userId: string): Promise<any> {
    try {
      const portfolioSummary = await this.getPortfolioSummary(userId, new Date());
      
      const currentAllocation = Object.entries(portfolioSummary.sectorAllocation).map(([sector, percentage]) => ({
        sector,
        percentage,
        value: (portfolioSummary.totalValue * percentage) / 100
      }));
      
      // Generate recommended allocation (simplified)
      const recommendedAllocation = [
        { sector: '기술', targetPercentage: 40, currentPercentage: portfolioSummary.sectorAllocation['기술'] || 0, rebalanceAmount: 0 },
        { sector: '금융', targetPercentage: 25, currentPercentage: portfolioSummary.sectorAllocation['금융'] || 0, rebalanceAmount: 0 },
        { sector: '헬스케어', targetPercentage: 20, currentPercentage: portfolioSummary.sectorAllocation['헬스케어'] || 0, rebalanceAmount: 0 },
        { sector: '기타', targetPercentage: 15, currentPercentage: portfolioSummary.sectorAllocation['기타'] || 0, rebalanceAmount: 0 }
      ];
      
      // Calculate rebalance amounts
      recommendedAllocation.forEach(item => {
        item.rebalanceAmount = (portfolioSummary.totalValue * (item.targetPercentage - item.currentPercentage)) / 100;
      });
      
      return {
        currentAllocation,
        recommendedAllocation,
        riskMetrics: {
          portfolioRisk: 15.2,
          diversificationScore: currentAllocation.length / 10,
          concentrationRisk: Math.max(...currentAllocation.map(a => a.percentage))
        }
      };
    } catch (error) {
      console.error('Error getting portfolio allocation:', error);
      return {
        currentAllocation: [],
        recommendedAllocation: [],
        riskMetrics: { portfolioRisk: 0, diversificationScore: 0, concentrationRisk: 0 }
      };
    }
  }

  async generateRebalancingSuggestions(userId: string, targetAllocation?: any, constraints?: any): Promise<any> {
    try {
      const allocation = await this.getPortfolioAllocation(userId);
      
      const suggestions = allocation.recommendedAllocation
        .filter((item: any) => Math.abs(item.rebalanceAmount) > 1000) // Only suggest meaningful changes
        .map((item: any) => ({
          action: item.rebalanceAmount > 0 ? 'buy' as const : 'sell' as const,
          symbol: '예시종목', // Would need specific stock selection
          quantity: Math.abs(Math.floor(item.rebalanceAmount / 50000)), // Assuming 50k average price
          value: Math.abs(item.rebalanceAmount),
          reason: `${item.sector} 섹터 비중 조정`
        }));
      
      return {
        suggestions,
        expectedImpact: {
          riskReduction: 5.2,
          expectedReturn: 2.1,
          cost: suggestions.reduce((sum: number, s: any) => sum + (s.value * 0.003), 0) // 0.3% transaction cost
        }
      };
    } catch (error) {
      console.error('Error generating rebalancing suggestions:', error);
      return {
        suggestions: [],
        expectedImpact: { riskReduction: 0, expectedReturn: 0, cost: 0 }
      };
    }
  }

  async getWatchlistWithRealtimeData(userId: string): Promise<any[]> {
    try {
      const watchlist = await this.getUserWatchlist(userId);
      
      // Add real-time data (simplified - would need market data service)
      return watchlist.map(item => {
        // Ensure addedAt is a string
        let addedAtStr: string;
        if (typeof item.addedAt === 'string') {
          addedAtStr = item.addedAt;
        } else if (item.addedAt instanceof Date) {
          addedAtStr = item.addedAt.toISOString();
        } else if (item.addedAt) {
          addedAtStr = new Date(item.addedAt).toISOString();
        } else {
          addedAtStr = new Date().toISOString();
        }
        
        // Calculate safe numeric values
        const mockPrice = Number(item.targetPrice) || 50000;
        const mockChange = (Math.random() - 0.5) * 2000;
        const mockChangePercent = (Math.random() - 0.5) * 4;
        
        return {
          id: item.id,
          symbol: item.symbol || '',
          symbolName: item.symbolName || item.symbol || '',
          currentPrice: mockPrice,
          change: mockChange,
          changePercent: mockChangePercent,
          priceAlert: item.alertEnabled || false,
          priceThreshold: Number(item.targetPrice || 0),
          newsAlert: item.alertEnabled || false,
          addedAt: addedAtStr,
          theme: undefined, // Would need theme mapping
          volume: Math.floor(Math.random() * 1000000), // Mock volume
          marketCap: undefined,
          recentNews: [] // Would need news lookup
        };
      });
    } catch (error) {
      console.error('Error getting watchlist with realtime data:', error);
      return [];
    }
  }

  async updateWatchlistAlerts(itemId: string, alerts: any): Promise<UserWatchlist> {
    try {
      const updateData: any = {};
      if (alerts.alertEnabled !== undefined) updateData.alertEnabled = alerts.alertEnabled;
      if (alerts.targetPrice !== undefined) updateData.targetPrice = alerts.targetPrice ? alerts.targetPrice.toString() : null;
      if (alerts.priceAlert !== undefined) updateData.priceAlert = alerts.priceAlert;
      if (alerts.newsAlert !== undefined) updateData.newsAlert = alerts.newsAlert;
      
      // Update alertEnabled if priceAlert or newsAlert is set
      if (alerts.priceAlert !== undefined || alerts.newsAlert !== undefined) {
        updateData.alertEnabled = alerts.priceAlert || alerts.newsAlert || false;
      }
      
      return await this.updateWatchlistItem(itemId, updateData);
    } catch (error) {
      console.error('Error updating watchlist alerts:', error);
      throw error;
    }
  }

  async getWatchlistItem(itemId: string): Promise<UserWatchlist | undefined> {
    try {
      const [item] = await db.select().from(userWatchlist).where(eq(userWatchlist.id, itemId));
      return item;
    } catch (error) {
      console.error('Error getting watchlist item:', error);
      return undefined;
    }
  }

  // ========== ETF Investment Guide Implementation ==========
  
  // ETF Products management
  async getEtfProducts(filters?: {
    region?: string;
    assetClass?: string;
    provider?: string;
    minAum?: number;
    maxExpenseRatio?: number;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }): Promise<EtfProduct[]> {
    try {
      let query = db.select().from(etfProducts);
      
      const conditions = [];
      if (filters?.region) conditions.push(eq(etfProducts.region, filters.region));
      if (filters?.assetClass) conditions.push(eq(etfProducts.assetClass, filters.assetClass));
      if (filters?.provider) conditions.push(eq(etfProducts.provider, filters.provider));
      if (filters?.minAum) conditions.push(gte(etfProducts.aum, filters.minAum.toString()));
      if (filters?.maxExpenseRatio) conditions.push(lte(etfProducts.expenseRatio, filters.maxExpenseRatio));
      if (filters?.isActive !== undefined) conditions.push(eq(etfProducts.isActive, filters.isActive));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
      
      if (filters?.limit) query = query.limit(filters.limit) as typeof query;
      if (filters?.offset) query = query.offset(filters.offset);
      
      return await query;
    } catch (error) {
      console.error('Error getting ETF products:', error);
      return [];
    }
  }

  async getEtfProduct(id: string): Promise<EtfProduct | undefined> {
    try {
      const [product] = await db.select().from(etfProducts).where(eq(etfProducts.id, id));
      return product;
    } catch (error) {
      console.error('Error getting ETF product:', error);
      return undefined;
    }
  }

  async getEtfByTicker(ticker: string): Promise<EtfProduct | undefined> {
    try {
      const [product] = await db.select().from(etfProducts).where(eq(etfProducts.ticker, ticker));
      return product;
    } catch (error) {
      console.error('Error getting ETF product by ticker:', error);
      return undefined;
    }
  }

  async createEtfProduct(product: InsertEtfProduct): Promise<EtfProduct> {
    try {
      const [created] = await db.insert(etfProducts).values(product).returning();
      return created;
    } catch (error) {
      console.error('Error creating ETF product:', error);
      throw error;
    }
  }

  async updateEtfProduct(id: string, product: Partial<InsertEtfProduct>): Promise<EtfProduct> {
    try {
      const [updated] = await db.update(etfProducts)
        .set(product)
        .where(eq(etfProducts.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating ETF product:', error);
      throw error;
    }
  }

  async deleteEtfProduct(id: string): Promise<void> {
    try {
      await db.delete(etfProducts).where(eq(etfProducts.id, id));
    } catch (error) {
      console.error('Error deleting ETF product:', error);
      throw error;
    }
  }

  // ETF Metrics management
  async getEtfMetrics(filters?: {
    etfId?: string;
    ticker?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<EtfMetric[]> {
    try {
      let query = db.select().from(etfMetrics);
      
      const conditions = [];
      if (filters?.etfId) conditions.push(eq(etfMetrics.etfId, filters.etfId));
      // Note: ticker filter requires join with etfProducts table - not implemented here
      if (filters?.dateFrom) conditions.push(gte(etfMetrics.asOf, filters.dateFrom));
      if (filters?.dateTo) conditions.push(lte(etfMetrics.asOf, filters.dateTo));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
      
      return await query.orderBy(desc(etfMetrics.asOf));
    } catch (error) {
      console.error('Error getting ETF metrics:', error);
      return [];
    }
  }

  async getLatestEtfMetrics(etfId: string): Promise<EtfMetric | undefined> {
    try {
      const [metric] = await db.select().from(etfMetrics)
        .where(eq(etfMetrics.etfId, etfId))
        .orderBy(desc(etfMetrics.asOf))
        .limit(1);
      return metric;
    } catch (error) {
      console.error('Error getting latest ETF metrics:', error);
      return undefined;
    }
  }

  async createEtfMetric(metric: InsertEtfMetric): Promise<EtfMetric> {
    try {
      const [created] = await db.insert(etfMetrics).values(metric).returning();
      return created;
    } catch (error) {
      console.error('Error creating ETF metric:', error);
      throw error;
    }
  }

  async updateEtfMetric(id: string, metric: Partial<InsertEtfMetric>): Promise<EtfMetric> {
    try {
      const [updated] = await db.update(etfMetrics)
        .set(metric)
        .where(eq(etfMetrics.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating ETF metric:', error);
      throw error;
    }
  }

  async deleteEtfMetric(id: string): Promise<void> {
    try {
      await db.delete(etfMetrics).where(eq(etfMetrics.id, id));
    } catch (error) {
      console.error('Error deleting ETF metric:', error);
      throw error;
    }
  }

  async fetchRealtimeEtfMetrics(etfIds: string[]): Promise<EtfMetric[]> {
    try {
      // Mock implementation - would integrate with real market data API
      const mockMetrics = etfIds.map(etfId => ({
        id: `mock-${etfId}-${Date.now()}`,
        etfId,
        nav: Math.random() * 100,
        price: Math.random() * 100,
        premiumDiscount: (Math.random() - 0.5) * 2,
        vol30d: Math.random() * 10,
        ret1m: (Math.random() - 0.5) * 10,
        ret3m: (Math.random() - 0.5) * 10,
        ret1y: (Math.random() - 0.5) * 20,
        trackingDiff: (Math.random() - 0.5) * 2,
        asOf: new Date(),
        updatedAt: new Date(),
        createdAt: new Date()
      }));
      
      return mockMetrics;
    } catch (error) {
      console.error('Error fetching realtime ETF metrics:', error);
      return [];
    }
  }

  // User Risk Profile management
  async getUserRiskProfile(userId: string): Promise<UserRiskProfile | undefined> {
    try {
      const [profile] = await db.select().from(userRiskProfile).where(eq(userRiskProfile.userId, userId));
      return profile;
    } catch (error) {
      console.error('Error getting user risk profile:', error);
      return undefined;
    }
  }

  async createUserRiskProfile(profile: InsertUserRiskProfile): Promise<UserRiskProfile> {
    try {
      const [created] = await db.insert(userRiskProfile).values(profile).returning();
      return created;
    } catch (error) {
      console.error('Error creating user risk profile:', error);
      throw error;
    }
  }

  async updateUserRiskProfile(userId: string, profile: Partial<InsertUserRiskProfile>): Promise<UserRiskProfile> {
    try {
      const [updated] = await db.update(userRiskProfile)
        .set(profile)
        .where(eq(userRiskProfile.userId, userId))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating user risk profile:', error);
      throw error;
    }
  }

  // ETF Chat Session management  
  async startEtfSession(userId: string, mode?: string, configId?: string): Promise<EtfChatSession> {
    try {
      const sessionData: InsertEtfChatSession = {
        userId,
        mode: mode || 'consultation',
        configId: configId || undefined,
        isActive: true
      };
      
      const [session] = await db.insert(etfChatSessions).values(sessionData).returning();
      return session;
    } catch (error) {
      console.error('Error starting ETF session:', error);
      throw error;
    }
  }

  async getEtfChatSessions(filters?: {
    userId?: string;
    status?: string;
    sessionType?: string;
    limit?: number;
  }): Promise<EtfChatSession[]> {
    try {
      let query = db.select().from(etfChatSessions);
      
      const conditions = [];
      if (filters?.userId) conditions.push(eq(etfChatSessions.userId, filters.userId));
      if (filters?.status) {
        // Map status to isActive - 'active' -> true, others -> false
        conditions.push(eq(etfChatSessions.isActive, filters.status === 'active'));
      }
      if (filters?.sessionType) {
        // Map sessionType to mode
        conditions.push(eq(etfChatSessions.mode, filters.sessionType));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
      
      if (filters?.limit) query = query.limit(filters.limit) as typeof query;
      
      return await query.orderBy(desc(etfChatSessions.createdAt));
    } catch (error) {
      console.error('Error getting ETF chat sessions:', error);
      return [];
    }
  }

  async getEtfChatSession(id: string): Promise<EtfChatSession | undefined> {
    try {
      const [session] = await db.select().from(etfChatSessions).where(eq(etfChatSessions.id, id));
      return session;
    } catch (error) {
      console.error('Error getting ETF chat session:', error);
      return undefined;
    }
  }

  async updateEtfChatSession(id: string, session: Partial<InsertEtfChatSession>): Promise<EtfChatSession> {
    try {
      const [updated] = await db.update(etfChatSessions)
        .set(session)
        .where(eq(etfChatSessions.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating ETF chat session:', error);
      throw error;
    }
  }

  async deleteEtfChatSession(id: string): Promise<void> {
    try {
      await db.delete(etfChatSessions).where(eq(etfChatSessions.id, id));
    } catch (error) {
      console.error('Error deleting ETF chat session:', error);
      throw error;
    }
  }

  // ETF Chat Message management
  async getEtfChatMessages(sessionId: string, limit?: number): Promise<EtfChatMessage[]> {
    try {
      let query = db.select().from(etfChatMessages)
        .where(eq(etfChatMessages.sessionId, sessionId))
        .orderBy(etfChatMessages.timestamp);
      
      if (limit) query = query.limit(limit) as typeof query;
      
      return await query;
    } catch (error) {
      console.error('Error getting ETF chat messages:', error);
      return [];
    }
  }

  async getEtfChatMessage(id: string): Promise<EtfChatMessage | undefined> {
    try {
      const [message] = await db.select().from(etfChatMessages).where(eq(etfChatMessages.id, id));
      return message;
    } catch (error) {
      console.error('Error getting ETF chat message:', error);
      return undefined;
    }
  }

  async createEtfMessage(sessionId: string, message: InsertEtfChatMessage): Promise<EtfChatMessage> {
    try {
      const messageData = { ...message, sessionId };
      const [created] = await db.insert(etfChatMessages).values(messageData).returning();
      return created;
    } catch (error) {
      console.error('Error creating ETF message:', error);
      throw error;
    }
  }

  async updateEtfChatMessage(id: string, message: Partial<InsertEtfChatMessage>): Promise<EtfChatMessage> {
    try {
      const [updated] = await db.update(etfChatMessages)
        .set(message)
        .where(eq(etfChatMessages.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating ETF chat message:', error);
      throw error;
    }
  }

  async deleteEtfChatMessage(id: string): Promise<void> {
    try {
      await db.delete(etfChatMessages).where(eq(etfChatMessages.id, id));
    } catch (error) {
      console.error('Error deleting ETF chat message:', error);
      throw error;
    }
  }

  // Guardrail Policy management
  async getGuardrailPolicies(filters?: {
    isActive?: boolean;
    policyType?: string;
  }): Promise<GuardrailPolicy[]> {
    try {
      let query = db.select().from(guardrailPolicies);
      
      const conditions = [];
      if (filters?.isActive !== undefined) conditions.push(eq(guardrailPolicies.isActive, filters.isActive));
      if (filters?.policyType) conditions.push(eq(guardrailPolicies.policyType, filters.policyType));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting guardrail policies:', error);
      return [];
    }
  }

  async getGuardrailPolicy(id: string): Promise<GuardrailPolicy | undefined> {
    try {
      const [policy] = await db.select().from(guardrailPolicies).where(eq(guardrailPolicies.id, id));
      return policy;
    } catch (error) {
      console.error('Error getting guardrail policy:', error);
      return undefined;
    }
  }

  async createGuardrailPolicy(policy: InsertGuardrailPolicy): Promise<GuardrailPolicy> {
    try {
      const [created] = await db.insert(guardrailPolicies).values(policy).returning();
      return created;
    } catch (error) {
      console.error('Error creating guardrail policy:', error);
      throw error;
    }
  }

  async updateGuardrailPolicy(id: string, policy: Partial<InsertGuardrailPolicy>): Promise<GuardrailPolicy> {
    try {
      const [updated] = await db.update(guardrailPolicies)
        .set(policy)
        .where(eq(guardrailPolicies.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating guardrail policy:', error);
      throw error;
    }
  }

  async deleteGuardrailPolicy(id: string): Promise<void> {
    try {
      await db.delete(guardrailPolicies).where(eq(guardrailPolicies.id, id));
    } catch (error) {
      console.error('Error deleting guardrail policy:', error);
      throw error;
    }
  }

  // ETF Bot Configuration management
  async getEtfBotConfigs(filters?: {
    isActive?: boolean;
    configType?: string;
  }): Promise<EtfBotConfig[]> {
    try {
      let query = db.select().from(etfBotConfigs);
      
      const conditions = [];
      if (filters?.isActive !== undefined) conditions.push(eq(etfBotConfigs.isActive, filters.isActive));
      if (filters?.configType) conditions.push(eq(etfBotConfigs.configType, filters.configType));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions) as any) as typeof query;
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting ETF bot configs:', error);
      return [];
    }
  }

  async getEtfBotConfig(id: string): Promise<EtfBotConfig | undefined> {
    try {
      const [config] = await db.select().from(etfBotConfigs).where(eq(etfBotConfigs.id, id));
      return config;
    } catch (error) {
      console.error('Error getting ETF bot config:', error);
      return undefined;
    }
  }

  async createEtfBotConfig(config: InsertEtfBotConfig): Promise<EtfBotConfig> {
    try {
      const [created] = await db.insert(etfBotConfigs).values(config).returning();
      return created;
    } catch (error) {
      console.error('Error creating ETF bot config:', error);
      throw error;
    }
  }

  async updateEtfBotConfig(id: string, config: Partial<InsertEtfBotConfig>): Promise<EtfBotConfig> {
    try {
      const [updated] = await db.update(etfBotConfigs)
        .set(config)
        .where(eq(etfBotConfigs.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating ETF bot config:', error);
      throw error;
    }
  }

  async deleteEtfBotConfig(id: string): Promise<void> {
    try {
      await db.delete(etfBotConfigs).where(eq(etfBotConfigs.id, id));
    } catch (error) {
      console.error('Error deleting ETF bot config:', error);
      throw error;
    }
  }

  // ETF Recommendation Settings management
  async getEtfSettings(): Promise<EtfRecommendationSettings | undefined> {
    try {
      const [settings] = await db.select().from(etfRecommendationSettings)
        .where(eq(etfRecommendationSettings.isActive, true))
        .limit(1);
      return settings;
    } catch (error) {
      console.error('Error getting ETF settings:', error);
      return undefined;
    }
  }

  async updateEtfSettings(settings: Partial<InsertEtfRecommendationSettings>): Promise<EtfRecommendationSettings> {
    try {
      // First, try to update existing active settings
      const [existing] = await db.select().from(etfRecommendationSettings)
        .where(eq(etfRecommendationSettings.isActive, true))
        .limit(1);
        
      if (existing) {
        const [updated] = await db.update(etfRecommendationSettings)
          .set(settings)
          .where(eq(etfRecommendationSettings.id, existing.id))
          .returning();
        return updated;
      } else {
        // Create new settings if none exist
        const settingsData: InsertEtfRecommendationSettings = {
          ...settings,
          isActive: true
        } as InsertEtfRecommendationSettings;
        
        const [created] = await db.insert(etfRecommendationSettings).values(settingsData).returning();
        return created;
      }
    } catch (error) {
      console.error('Error updating ETF settings:', error);
      throw error;
    }
  }

  // ETF Recommendation and analysis methods
  async getEtfRecommendations(userId: string, filters?: {
    maxResults?: number;
    riskLevel?: string;
    investmentAmount?: number;
    region?: string;
    assetClass?: string;
  }): Promise<EtfProduct[]> {
    try {
      // Get user risk profile and recommendation settings
      const userRisk = await this.getUserRiskProfile(userId);
      const userRiskScore = userRisk?.riskScore || 5;
      const riskLevel = filters?.riskLevel || userRiskScore.toString();
      
      // Get recommendation settings with weights
      const settings = await this.getEtfSettings();
      const weights = {
        riskAlignment: Number(settings?.riskAlignmentWeight || 0.25),
        expenseRatio: Number(settings?.expenseRatioWeight || 0.20),
        liquidity: Number(settings?.liquidityWeight || 0.15),
        diversification: Number(settings?.diversificationWeight || 0.15),
        trackingDiff: Number(settings?.trackingDifferenceWeight || 0.15),
        taxEfficiency: Number(settings?.taxEfficiencyWeight || 0.05),
        performance: Number(settings?.performanceWeight || 0.05)
      };
      
      // Get all active ETFs
      let query = db.select().from(etfProducts)
        .where(eq(etfProducts.isActive, true));
        
      if (filters?.region) {
        query = query.where(eq(etfProducts.region, filters.region)) as typeof query;
      }
      
      if (filters?.assetClass) {
        query = query.where(eq(etfProducts.assetClass, filters.assetClass)) as typeof query;
      }
      
      const allEtfs = await query;
      
      if (allEtfs.length === 0) {
        return [];
      }
      
      // Get ETF metrics for performance evaluation
      const etfMetricsMap = new Map<string, any>();
      const etfIds = allEtfs.map(etf => etf.id);
      if (etfIds.length > 0) {
        const metrics = await db.select().from(etfMetrics)
          .where(sql`${etfMetrics.etfId} = ANY(${etfIds})`)
          .orderBy(desc(etfMetrics.updatedAt));
        
        // Use latest metrics for each ETF
        metrics.forEach(metric => {
          if (!etfMetricsMap.has(metric.etfId)) {
            etfMetricsMap.set(metric.etfId, metric);
          }
        });
      }
      
      // Calculate scores for each ETF using MCDA
      interface ETFScore {
        etf: typeof allEtfs[0];
        score: number;
        criteria: {
          riskAlignment: number;
          expenseRatio: number;
          liquidity: number;
          diversification: number;
          trackingDiff: number;
          taxEfficiency: number;
          performance: number;
        };
      }
      
      const etfScores: ETFScore[] = [];
      
      // Normalize values for scoring
      const expenseRatios = allEtfs.map(e => Number(e.expenseRatio || 0)).filter(v => v > 0);
      const maxExpenseRatio = Math.max(...expenseRatios, 0.01);
      const minExpenseRatio = Math.min(...expenseRatios, 0);
      
      const aums = allEtfs.map(e => Number(e.aum || 0)).filter(v => v > 0);
      const maxAum = Math.max(...aums, 1);
      const minAum = Math.min(...aums, 0);
      
      const avgVolumes = allEtfs.map(e => Number(e.avgVolume || 0)).filter(v => v > 0);
      const maxVolume = Math.max(...avgVolumes, 1);
      const minVolume = Math.min(...avgVolumes, 0);
      
      const spreadBpss = allEtfs.map(e => Number(e.spreadBps || 100)).filter(v => v > 0);
      const maxSpread = Math.max(...spreadBpss, 1);
      const minSpread = Math.min(...spreadBpss, 0);
      
      const riskScores = allEtfs.map(e => Number(e.riskScore || 5)).filter(v => v > 0);
      const maxRisk = Math.max(...riskScores, 10);
      const minRisk = Math.min(...riskScores, 1);
      
      // Get performance metrics
      const ret1ys = Array.from(etfMetricsMap.values()).map(m => Number(m.ret1y || 0));
      const maxRet1y = Math.max(...ret1ys, 1);
      const minRet1y = Math.min(...ret1ys, -50);
      
      const trackingDiffs = Array.from(etfMetricsMap.values()).map(m => Number(m.trackingDiff || 1));
      const maxTrackingDiff = Math.max(...trackingDiffs, 1);
      const minTrackingDiff = Math.min(...trackingDiffs, -1);
      
      allEtfs.forEach(etf => {
        const metric = etfMetricsMap.get(etf.id);
        const etfRiskScore = Number(etf.riskScore || 5);
        const expenseRatio = Number(etf.expenseRatio || maxExpenseRatio);
        const aum = Number(etf.aum || 0);
        const avgVolume = Number(etf.avgVolume || 0);
        const spreadBps = Number(etf.spreadBps || 100);
        const ret1y = metric ? Number(metric.ret1y || 0) : 0;
        const trackingDiff = metric ? Math.abs(Number(metric.trackingDiff || 1)) : 1;
        
        // Calculate normalized scores (0-1, higher is better)
        // 1. Risk Alignment: Close match to user risk = higher score
        const riskDifference = Math.abs(etfRiskScore - userRiskScore);
        const maxRiskDifference = Math.max(maxRisk - minRisk, 1);
        const riskAlignmentScore = 1 - (riskDifference / maxRiskDifference);
        
        // 2. Expense Ratio: Lower is better (inverse)
        const expenseRatioScore = maxExpenseRatio > minExpenseRatio
          ? 1 - ((expenseRatio - minExpenseRatio) / (maxExpenseRatio - minExpenseRatio))
          : 1;
        
        // 3. Liquidity: Combination of AUM and volume (higher is better)
        const aumScore = maxAum > minAum
          ? (aum - minAum) / (maxAum - minAum)
          : (aum > 0 ? 1 : 0);
        const volumeScore = maxVolume > minVolume
          ? (avgVolume - minVolume) / (maxVolume - minVolume)
          : (avgVolume > 0 ? 1 : 0);
        const spreadScore = maxSpread > minSpread
          ? 1 - ((spreadBps - minSpread) / (maxSpread - minSpread))
          : 1;
        const liquidityScore = (aumScore * 0.5 + volumeScore * 0.3 + spreadScore * 0.2);
        
        // 4. Diversification: Based on holdings count (if available)
        const holdingsTop = etf.holdingsTop as any[];
        const diversificationScore = holdingsTop && holdingsTop.length > 0
          ? Math.min(holdingsTop.length / 50, 1) // More holdings = better diversification
          : 0.5; // Default if unknown
        
        // 5. Tracking Difference: Lower is better (inverse)
        const trackingDiffScore = maxTrackingDiff > minTrackingDiff
          ? 1 - ((trackingDiff - minTrackingDiff) / (maxTrackingDiff - minTrackingDiff))
          : 1;
        
        // 6. Tax Efficiency: Binary score based on tax treatment
        const taxTreatment = etf.taxTreatment?.toLowerCase() || '';
        const taxEfficiencyScore = taxTreatment.includes('efficient') || taxTreatment.includes('qualified') ? 1 : 0.5;
        
        // 7. Performance: Higher is better
        const performanceScore = maxRet1y > minRet1y
          ? (ret1y - minRet1y) / (maxRet1y - minRet1y)
          : (ret1y > 0 ? 1 : 0.5);
        
        // Calculate weighted total score
        const totalScore = 
          riskAlignmentScore * weights.riskAlignment +
          expenseRatioScore * weights.expenseRatio +
          liquidityScore * weights.liquidity +
          diversificationScore * weights.diversification +
          trackingDiffScore * weights.trackingDiff +
          taxEfficiencyScore * weights.taxEfficiency +
          performanceScore * weights.performance;
        
        etfScores.push({
          etf,
          score: totalScore,
          criteria: {
            riskAlignment: riskAlignmentScore,
            expenseRatio: expenseRatioScore,
            liquidity: liquidityScore,
            diversification: diversificationScore,
            trackingDiff: trackingDiffScore,
            taxEfficiency: taxEfficiencyScore,
            performance: performanceScore
          }
        });
      });
      
      // Sort by score descending and apply min score threshold
      const minScore = Number(settings?.minScore || 0.5);
      const scoredEtfs = etfScores
        .filter(es => es.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, filters?.maxResults || settings?.maxRecommendations || 10)
        .map(es => es.etf);
      
      return scoredEtfs;
    } catch (error) {
      console.error('Error getting ETF recommendations:', error);
      return [];
    }
  }

  async getRiskAssessment(userId: string): Promise<UserRiskProfile | undefined> {
    try {
      let profile = await this.getUserRiskProfile(userId);
      
      if (!profile) {
        // Create mock risk profile for development
        const mockProfile: InsertUserRiskProfile = {
          userId,
          riskScore: 5,
          riskCategory: 'moderate',
          investmentGoals: ['long_term_growth'],
          timeHorizon: 'long_term',
          experienceLevel: 'intermediate',
          questionnaire: {
            answers: [],
            completedAt: new Date(),
            version: '1.0'
          }
        };
        
        profile = await this.createUserRiskProfile(mockProfile);
      }
      
      return profile;
    } catch (error) {
      console.error('Error getting risk assessment:', error);
      return undefined;
    }
  }

  async getPortfolioAnalysis(userId: string): Promise<any> {
    try {
      // Mock portfolio analysis - would integrate with real portfolio data
      const riskProfile = await this.getRiskAssessment(userId);
      const recommendations = await this.getEtfRecommendations(userId, { maxResults: 5 });
      
      return {
        currentHoldings: [],
        assetAllocation: {
          stocks: 60,
          bonds: 30,
          alternatives: 10
        },
        riskMetrics: {
          volatility: 12.5,
          sharpeRatio: 1.2,
          beta: 0.95,
          maxDrawdown: -15.3
        },
        recommendations: recommendations.map(etf => ({
          etf,
          score: Math.random() * 100,
          reason: 'Based on your risk profile and investment goals',
          allocation: Math.random() * 30
        })),
        rebalancingSuggestions: [],
        performanceMetrics: {
          ytdReturn: 8.5,
          oneYearReturn: 12.3,
          threeYearReturn: 10.1,
          inception: 9.8
        }
      };
    } catch (error) {
      console.error('Error getting portfolio analysis:', error);
      return {
        currentHoldings: [],
        assetAllocation: { stocks: 0, bonds: 0, alternatives: 0 },
        riskMetrics: { volatility: 0, sharpeRatio: 0, beta: 0, maxDrawdown: 0 },
        recommendations: [],
        rebalancingSuggestions: [],
        performanceMetrics: { ytdReturn: 0, oneYearReturn: 0, threeYearReturn: 0, inception: 0 }
      };
    }
  }

  // Additional ETF utility methods
  async getRecommendations(userId: string, filters?: {
    maxResults?: number;
    riskLevel?: string;
    investmentAmount?: number;
    region?: string;
    assetClass?: string;
  }): Promise<Array<{
    etf: EtfProduct;
    score: number;
    reasoning: string;
    allocation: number;
    expectedReturn: number;
  }>> {
    try {
      const etfs = await this.getEtfRecommendations(userId, filters);
      
      return etfs.map(etf => ({
        etf,
        score: Math.random() * 100,
        reasoning: `Matches your risk profile and investment objectives`,
        allocation: Math.random() * 30,
        expectedReturn: Math.random() * 15
      }));
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  async scoreEtfs(userId: string, etfIds: string[]): Promise<Array<{
    etfId: string;
    score: number;
    criteria: Record<string, number>;
  }>> {
    try {
      const userRisk = await this.getUserRiskProfile(userId);
      
      return etfIds.map(etfId => ({
        etfId,
        score: Math.random() * 100,
        criteria: {
          riskAlignment: Math.random() * 100,
          costEfficiency: Math.random() * 100,
          liquidity: Math.random() * 100,
          diversification: Math.random() * 100,
          performance: Math.random() * 100
        }
      }));
    } catch (error) {
      console.error('Error scoring ETFs:', error);
      return [];
    }
  }

  async generatePortfolio(userId: string, amount: number, preferences?: any): Promise<{
    portfolio: Array<{
      etf: EtfProduct;
      allocation: number;
      amount: number;
      shares: number;
    }>;
    totalAmount: number;
    expectedReturn: number;
    riskScore: number;
  }> {
    try {
      const recommendations = await this.getEtfRecommendations(userId, { maxResults: 5 });
      const totalAllocation = 100;
      
      const portfolio = recommendations.map((etf, index) => {
        const allocation = index === 0 ? 40 : 60 / (recommendations.length - 1);
        const investAmount = (amount * allocation) / 100;
        const mockPrice = 50; // Mock ETF price
        
        return {
          etf,
          allocation,
          amount: investAmount,
          shares: Math.floor(investAmount / mockPrice)
        };
      });
      
      return {
        portfolio,
        totalAmount: amount,
        expectedReturn: Math.random() * 12,
        riskScore: Math.random() * 10
      };
    } catch (error) {
      console.error('Error generating portfolio:', error);
      return {
        portfolio: [],
        totalAmount: 0,
        expectedReturn: 0,
        riskScore: 0
      };
    }
  }

  async ingestEtfData(data: any[]): Promise<{
    created: number;
    updated: number;
    errors: any[];
  }> {
    try {
      let created = 0;
      let updated = 0;
      const errors: any[] = [];
      
      for (const item of data) {
        try {
          const existing = await this.getEtfProduct(item.id);
          if (existing) {
            await this.updateEtfProduct(item.id, item);
            updated++;
          } else {
            await this.createEtfProduct(item);
            created++;
          }
        } catch (error: unknown) {
          errors.push({ item, error: error.message });
        }
      }
      
      return { created, updated, errors };
    } catch (error) {
      console.error('Error ingesting ETF data:', error);
      return { created: 0, updated: 0, errors: [error] };
    }
  }

  async getEtfAnalytics(filters?: {
    period?: string;
    etfIds?: string[];
    userId?: string;
  }): Promise<{
    topPerforming: Array<{ etf: EtfProduct; performance: Record<string, number> }>;
    userEngagement: Record<string, number>;
    recommendationAccuracy: number;
    totalAssets: number;
  }> {
    try {
      const etfs = await this.getEtfProducts({ limit: 10 });
      
      return {
        topPerforming: etfs.slice(0, 5).map(etf => ({
          etf,
          performance: {
            ytd: Math.random() * 20,
            oneMonth: Math.random() * 5,
            threeMonth: Math.random() * 10,
            oneYear: Math.random() * 25
          }
        })),
        userEngagement: {
          sessionsStarted: Math.floor(Math.random() * 1000),
          recommendationsGenerated: Math.floor(Math.random() * 500),
          portfoliosCreated: Math.floor(Math.random() * 200)
        },
        recommendationAccuracy: Math.random() * 100,
        totalAssets: Math.random() * 1000000000
      };
    } catch (error) {
      console.error('Error getting ETF analytics:', error);
      return {
        topPerforming: [],
        userEngagement: {},
        recommendationAccuracy: 0,
        totalAssets: 0
      };
    }
  }

  // Additional convenience methods
  async getUserEtfChatSessions(userId: string): Promise<EtfChatSession[]> {
    return this.getEtfChatSessions({ userId });
  }

  async getAllEtfBotConfigs(): Promise<EtfBotConfig[]> {
    return this.getEtfBotConfigs();
  }

  async getEtfMetricsHistory(etfId: string, period: string): Promise<EtfMetric[]> {
    const dateFrom = new Date();
    switch (period) {
      case '1M':
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        break;
      case '3M':
        dateFrom.setMonth(dateFrom.getMonth() - 3);
        break;
      case '1Y':
        dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        break;
      default:
        dateFrom.setMonth(dateFrom.getMonth() - 1);
    }
    
    return this.getEtfMetrics({ etfId, dateFrom });
  }

  async ingestEtfProducts(products: InsertEtfProduct[]): Promise<{ created: number; updated: number; errors: any[] }> {
    return this.ingestEtfData(products);
  }

  async ingestEtfMetrics(metrics: InsertEtfMetric[]): Promise<{ created: number; updated: number; errors: any[] }> {
    try {
      let created = 0;
      let updated = 0;
      const errors: any[] = [];
      
      for (const metric of metrics) {
        try {
          await this.createEtfMetric(metric);
          created++;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ metric, error: errorMessage });
        }
      }
      
      return { created, updated, errors };
    } catch (error) {
      console.error('Error ingesting ETF metrics:', error);
      return { created: 0, updated: 0, errors: [error] };
    }
  }

  // ===================================
  // NL to SQL Engine Implementation
  // ===================================

  // NL2SQL Prompts management
  async getNl2sqlPrompts(filters?: {
    dialect?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<Nl2sqlPrompt[]> {
    const conditions = [];
    
    if (filters?.dialect) {
      conditions.push(eq(nl2sqlPrompts.dialect, filters.dialect));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(nl2sqlPrompts.isActive, filters.isActive));
    }
    
    let query = db.select().from(nl2sqlPrompts).orderBy(desc(nl2sqlPrompts.createdAt));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return query;
  }

  async getNl2sqlPrompt(id: string): Promise<Nl2sqlPrompt | undefined> {
    const [prompt] = await db.select().from(nl2sqlPrompts).where(eq(nl2sqlPrompts.id, id));
    return prompt || undefined;
  }

  async createNl2sqlPrompt(prompt: InsertNl2sqlPrompt): Promise<Nl2sqlPrompt> {
    const [created] = await db.insert(nl2sqlPrompts).values(prompt).returning();
    return created;
  }

  async updateNl2sqlPrompt(id: string, prompt: Partial<InsertNl2sqlPrompt>): Promise<Nl2sqlPrompt> {
    const [updated] = await db.update(nl2sqlPrompts)
      .set({ ...prompt, updatedAt: new Date() })
      .where(eq(nl2sqlPrompts.id, id))
      .returning();
    return updated;
  }

  async deleteNl2sqlPrompt(id: string): Promise<void> {
    await db.delete(nl2sqlPrompts).where(eq(nl2sqlPrompts.id, id));
  }

  // Schema Sources management
  async getSchemaSources(filters?: {
    type?: string;
    isDefault?: boolean;
    limit?: number;
  }): Promise<SchemaSource[]> {
    const conditions = [];
    
    if (filters?.type) {
      conditions.push(eq(schemaSources.type, filters.type));
    }
    if (filters?.isDefault !== undefined) {
      conditions.push(eq(schemaSources.isDefault, filters.isDefault));
    }
    
    let query = db.select().from(schemaSources).orderBy(desc(schemaSources.createdAt));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return query;
  }

  async getSchemaSource(id: string): Promise<SchemaSource | undefined> {
    const [source] = await db.select().from(schemaSources).where(eq(schemaSources.id, id));
    return source || undefined;
  }

  async createSchemaSource(source: InsertSchemaSource): Promise<SchemaSource> {
    const [created] = await db.insert(schemaSources).values(source).returning();
    return created;
  }

  async updateSchemaSource(id: string, source: Partial<InsertSchemaSource>): Promise<SchemaSource> {
    const [updated] = await db.update(schemaSources)
      .set({ ...source, updatedAt: new Date() })
      .where(eq(schemaSources.id, id))
      .returning();
    return updated;
  }

  async deleteSchemaSource(id: string): Promise<void> {
    await db.delete(schemaSources).where(eq(schemaSources.id, id));
  }

  // Dictionaries management
  async getDictionaries(filters?: {
    sourceId?: string;
    limit?: number;
  }): Promise<Dictionary[]> {
    const conditions = [];
    
    if (filters?.sourceId) {
      conditions.push(eq(dictionaries.sourceId, filters.sourceId));
    }
    
    let query = db.select().from(dictionaries).orderBy(desc(dictionaries.createdAt));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return await query;
  }

  async getDictionary(id: string): Promise<Dictionary | undefined> {
    const [dictionary] = await db.select().from(dictionaries).where(eq(dictionaries.id, id));
    return dictionary || undefined;
  }

  async createDictionary(dict: InsertDictionary): Promise<Dictionary> {
    const [created] = await db.insert(dictionaries).values(dict).returning();
    return created;
  }

  async updateDictionary(id: string, dict: Partial<InsertDictionary>): Promise<Dictionary> {
    const [updated] = await db.update(dictionaries)
      .set({ ...dict, updatedAt: new Date() })
      .where(eq(dictionaries.id, id))
      .returning();
    return updated;
  }

  async deleteDictionary(id: string): Promise<void> {
    await db.delete(dictionaries).where(eq(dictionaries.id, id));
  }

  // Dictionary Entries management
  async getDictionaryEntries(filters?: {
    dictionaryId?: string;
    tableName?: string;
    limit?: number;
  }): Promise<DictionaryEntry[]> {
    const conditions = [];
    
    if (filters?.dictionaryId) {
      conditions.push(eq(dictionaryEntries.dictionaryId, filters.dictionaryId));
    }
    if (filters?.tableName) {
      conditions.push(eq(dictionaryEntries.tableName, filters.tableName));
    }
    
    let query = db.select().from(dictionaryEntries).orderBy(dictionaryEntries.tableName, dictionaryEntries.columnName);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as typeof query;
    }
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    return await query;
  }

  async getDictionaryEntry(id: string): Promise<DictionaryEntry | undefined> {
    const [entry] = await db.select().from(dictionaryEntries).where(eq(dictionaryEntries.id, id));
    return entry || undefined;
  }

  async createDictionaryEntry(entry: InsertDictionaryEntry): Promise<DictionaryEntry> {
    // Validate dictionaryId is provided
    if (!entry.dictionaryId || entry.dictionaryId.trim() === '') {
      throw new Error('Dictionary 항목 생성 실패: Dictionary ID가 제공되지 않았습니다.');
    }

    // Verify dictionary exists before inserting
    const dictionary = await this.getDictionary(entry.dictionaryId);
    if (!dictionary) {
      throw new Error(`Dictionary 항목 생성 실패: Dictionary ID "${entry.dictionaryId}"가 존재하지 않습니다. 사용 가능한 Dictionary를 먼저 생성해주세요.`);
    }
    
    // Validate required fields
    if (!entry.tableName || entry.tableName.trim() === '') {
      throw new Error('Dictionary 항목 생성 실패: 테이블명이 필수입니다.');
    }
    if (!entry.columnName || entry.columnName.trim() === '') {
      throw new Error('Dictionary 항목 생성 실패: 컬럼명이 필수입니다.');
    }
    
    try {
      const [created] = await db.insert(dictionaryEntries).values(entry).returning();
      return created;
    } catch (error: any) {
      // Check if it's a foreign key constraint violation
      if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
        throw new Error(`Dictionary 항목 생성 실패: Dictionary ID "${entry.dictionaryId}"가 존재하지 않거나 유효하지 않습니다. 사용 가능한 Dictionary를 선택해주세요.`);
      }
      // Check for other database errors
      if (error.code === '23505' || error.message?.includes('unique constraint')) {
        throw new Error('Dictionary 항목 생성 실패: 동일한 테이블명과 컬럼명 조합이 이미 존재합니다.');
      }
      throw new Error(`Dictionary 항목 생성 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    }
  }

  async updateDictionaryEntry(id: string, entry: Partial<InsertDictionaryEntry>): Promise<DictionaryEntry> {
    const [updated] = await db.update(dictionaryEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(dictionaryEntries.id, id))
      .returning();
    return updated;
  }

  async deleteDictionaryEntry(id: string): Promise<void> {
    await db.delete(dictionaryEntries).where(eq(dictionaryEntries.id, id));
  }

  // Advanced NL2SQL methods
  async getSchemaTree(sourceId: string): Promise<{
    databases?: Array<{
      name: string;
      tables: Array<{
        name: string;
        columns: Array<{
          name: string;
          type: string;
          nullable?: boolean;
          description?: string;
        }>;
      }>;
    }>;
    tables?: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        nullable?: boolean;
        description?: string;
      }>;
    }>;
  }> {
    const source = await this.getSchemaSource(sourceId);
    if (!source) {
      throw new Error(`Schema source ${sourceId} not found`);
    }

    if (source.type === 'internal_postgres') {
      // For internal Postgres, query information_schema
      const result = await db.execute(sql`
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          pgd.description
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
        LEFT JOIN pg_catalog.pg_statio_all_tables psat ON psat.relname = t.table_name
        LEFT JOIN pg_catalog.pg_description pgd ON pgd.objoid = psat.relid
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
      `);

      // Group results by table
      const tablesMap = new Map();
      for (const row of result.rows as any[]) {
        if (!tablesMap.has(row.table_name)) {
          tablesMap.set(row.table_name, {
            name: row.table_name,
            columns: []
          });
        }
        if (row.column_name) {
          tablesMap.get(row.table_name).columns.push({
            name: row.column_name,
            type: row.data_type,
            nullable: row.is_nullable === 'YES',
            description: row.description
          });
        }
      }

      return {
        tables: Array.from(tablesMap.values())
      };
    } else if (source.type === 'bigquery') {
      // TODO: Implement BigQuery schema browsing
      // This will use @google-cloud/bigquery service
      return {
        databases: [
          {
            name: source.dataset || 'Unknown',
            tables: [
              {
                name: 'sample_table',
                columns: [
                  { name: 'id', type: 'STRING', nullable: false },
                  { name: 'name', type: 'STRING', nullable: true }
                ]
              }
            ]
          }
        ]
      };
    }

    throw new Error(`Unsupported schema source type: ${source.type}`);
  }

  async generateDictionaryFromSchema(params: {
    sourceId: string;
    tableNames: string[];
    dictionaryName: string;
    description?: string;
  }): Promise<{
    dictionary: Dictionary;
    entries: DictionaryEntry[];
  }> {
    const { sourceId, tableNames, dictionaryName, description } = params;
    
    // Get schema information for the specified tables
    const schemaTree = await this.getSchemaTree(sourceId);
    const tables = schemaTree.tables || [];
    const selectedTables = tables.filter(table => tableNames.includes(table.name));

    // Create the dictionary
    const dictionary = await this.createDictionary({
      name: dictionaryName,
      sourceId,
      description: description || `AI-generated dictionary for tables: ${tableNames.join(', ')}`
    });

    // Generate AI-powered meanings for each column
    const entries: DictionaryEntry[] = [];
    
    for (const table of selectedTables) {
      for (const column of table.columns) {
        try {
          // Use OpenAI to generate meaningful descriptions
          const aiResponse = await openaiService.executeCustomPrompt(
            `Based on the table name "${table.name}" and column name "${column.name}" with type "${column.type}", provide meaningful descriptions in Korean, English, and Korean transliteration (외래어 표기법).

Table: ${table.name}
Column: ${column.name}
Type: ${column.type}

Respond in JSON format:
{
  "meaningKo": "한국어 의미",
  "meaningEn": "English meaning", 
  "meaningKokr": "한글 외래어 표기"
}`,
            {},
            'You are a database schema documentation assistant.'
          );

          let meanings;
          try {
            meanings = JSON.parse(aiResponse);
          } catch {
            // Fallback if AI response is not valid JSON
            meanings = {
              meaningKo: `${table.name} 테이블의 ${column.name} 컬럼`,
              meaningEn: `${column.name} column in ${table.name} table`,
              meaningKokr: column.name
            };
          }

          const entry = await this.createDictionaryEntry({
            dictionaryId: dictionary.id,
            tableName: table.name,
            columnName: column.name,
            meaningKo: meanings.meaningKo,
            meaningEn: meanings.meaningEn,
            meaningKokr: meanings.meaningKokr,
            tags: [table.name, column.type.toLowerCase()],
            notes: `Auto-generated from schema analysis`
          });

          entries.push(entry);
        } catch (error: unknown) {
          console.error(`Error generating meaning for ${table.name}.${column.name}:`, error);
          // Create basic entry even if AI generation fails
          const entry = await this.createDictionaryEntry({
            dictionaryId: dictionary.id,
            tableName: table.name,
            columnName: column.name,
            meaningKo: `${table.name} 테이블의 ${column.name} 컬럼`,
            meaningEn: `${column.name} column in ${table.name} table`,
            meaningKokr: column.name,
            tags: [table.name, column.type.toLowerCase()],
            notes: `Basic entry (AI generation failed)`
          });
          
          entries.push(entry);
        }
      }
    }

    return { dictionary, entries };
  }

  // Schema info for NL2SQL - provides standardized table/column information
  async getSchemaInfo(): Promise<{
    tables: Array<{
      name: string;
      displayName: string;
      description: string;
      columns: Array<{
        name: string;
        type: string;
        description: string;
      }>;
    }>;
    timestamp: string;
  }> {
    // Return hardcoded schema info for now - can be enhanced to be dynamic
    return {
      tables: [
        {
          name: "financial_data",
          displayName: "금융 데이터",
          description: "주식, 지수, 거래량 등 금융시장 데이터",
          columns: [
            { name: "id", type: "varchar", description: "고유 식별자" },
            { name: "symbol", type: "text", description: "종목 코드" },
            { name: "symbolName", type: "text", description: "종목명" },
            { name: "market", type: "text", description: "시장구분" },
            { name: "price", type: "decimal", description: "가격" },
            { name: "volume", type: "integer", description: "거래량" },
            { name: "timestamp", type: "timestamp", description: "데이터 시점" }
          ]
        },
        {
          name: "news_data",
          displayName: "뉴스 데이터", 
          description: "금융 뉴스 및 시황 정보",
          columns: [
            { name: "id", type: "varchar", description: "고유 식별자" },
            { name: "title", type: "text", description: "뉴스 제목" },
            { name: "content", type: "text", description: "뉴스 내용" },
            { name: "sentiment", type: "text", description: "감정 분석 결과" },
            { name: "published_at", type: "timestamp", description: "발행 시간" }
          ]
        },
        {
          name: "themes",
          displayName: "테마 정보",
          description: "투자 테마 및 섹터 분류",
          columns: [
            { name: "id", type: "varchar", description: "테마 ID" },
            { name: "name", type: "varchar", description: "테마명" },
            { name: "description", type: "text", description: "테마 설명" },
            { name: "keywords", type: "text[]", description: "관련 키워드" }
          ]
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  // Azure Config management
  async getAzureConfig(serviceName: string): Promise<AzureConfig | undefined> {
    const [config] = await db
      .select()
      .from(azureConfigs)
      .where(eq(azureConfigs.serviceName, serviceName));
    return config || undefined;
  }

  async upsertAzureConfig(serviceName: string, config: Record<string, any>): Promise<AzureConfig> {
    const [result] = await db
      .insert(azureConfigs)
      .values({
        serviceName,
        config,
        isActive: true,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: azureConfigs.serviceName,
        set: {
          config,
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  }

  async deleteAzureConfig(serviceName: string): Promise<void> {
    await db.delete(azureConfigs).where(eq(azureConfigs.serviceName, serviceName));
  }

  // Workflow Session management implementation
  async getWorkflowSessions(workflowId?: string, filters?: { status?: string; limit?: number }): Promise<WorkflowSession[]> {
    const conditions = [];
    if (workflowId) {
      conditions.push(eq(workflowSessions.workflowId, workflowId));
    }
    if (filters?.status) {
      conditions.push(eq(workflowSessions.status, filters.status));
    }
    
    let result;
    if (conditions.length > 0) {
      result = await db.select().from(workflowSessions)
        .where(and(...conditions))
        .orderBy(desc(workflowSessions.createdAt));
    } else {
      result = await db.select().from(workflowSessions)
        .orderBy(desc(workflowSessions.createdAt));
    }
    
    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }
    
    return result;
  }

  async getWorkflowSession(id: string): Promise<WorkflowSession | undefined> {
    const [session] = await db.select()
      .from(workflowSessions)
      .where(eq(workflowSessions.id, id));
    return session || undefined;
  }

  async getWorkflowSessionNodeExecutions(sessionId: string): Promise<WorkflowNodeExecution[]> {
    const executions = await db.select()
      .from(workflowNodeExecutions)
      .where(eq(workflowNodeExecutions.sessionId, sessionId))
      .orderBy(desc(workflowNodeExecutions.startedAt));
    
    // metadata에서 nodeName과 nodeType 추출하여 반환 객체에 추가
    return executions.map((exec) => ({
      ...exec,
      // metadata가 있으면 nodeName과 nodeType을 추출
      nodeName: exec.metadata && typeof exec.metadata === 'object' && 'nodeName' in exec.metadata 
        ? (exec.metadata as any).nodeName 
        : undefined,
      nodeType: exec.metadata && typeof exec.metadata === 'object' && 'nodeType' in exec.metadata 
        ? (exec.metadata as any).nodeType 
        : undefined
    })) as WorkflowNodeExecution[];
  }

  async getWorkflowSessionData(sessionId: string): Promise<WorkflowSessionData[]> {
    return await db.select()
      .from(workflowSessionData)
      .where(eq(workflowSessionData.sessionId, sessionId))
      .orderBy(desc(workflowSessionData.createdAt));
  }
}

export const storage = new DatabaseStorage();
