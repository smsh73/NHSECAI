import { sql, relations } from "drizzle-orm";
import { 
  pgTable,
  uuid, 
  text, 
  varchar, 
  timestamp, 
  jsonb, 
  boolean, 
  integer, 
  decimal,
  doublePrecision,
  index,
  date,
  uniqueIndex,
  check
} from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  username: text("username").notNull().unique(),
  hashedPassword: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced Financial data tables for real market data processing
export const financialData = pgTable("financial_data", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  symbol: text("symbol").notNull(),
  symbolName: text("symbol_name"), // 종목명/지수명
  market: text("market").notNull(), // KOSPI, KOSDAQ, NYSE, NASDAQ 등
  country: text("country").notNull(),
  dataType: text("data_type").notNull(), // 국내증권시세, 해외증권시세, 국내지수, 해외지수, 수급량정보
  
  // Enhanced price and volume data
  price: decimal("price", { precision: 15, scale: 4 }),
  previousPrice: decimal("previous_price", { precision: 15, scale: 4 }),
  changeAmount: decimal("change_amount", { precision: 15, scale: 4 }),
  changeRate: decimal("change_rate", { precision: 6, scale: 2 }), // 변동률
  
  volume: integer("volume"),
  tradingValue: decimal("trading_value", { precision: 20, scale: 2 }), // 거래대금
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }), // 시가총액
  
  // Market structure data
  sectorCode: text("sector_code"), // 업종코드
  sectorName: text("sector_name"), // 업종명
  themeCode: text("theme_code"), // 테마코드
  themeName: text("theme_name"), // 테마명
  
  // Technical indicators
  ma20: decimal("ma20", { precision: 15, scale: 4 }), // 20일 이동평균
  stdDev20: decimal("std_dev_20", { precision: 15, scale: 6 }), // 20일 표준편차
  zScore: decimal("z_score", { precision: 8, scale: 4 }), // z-score
  anomalyLevel: text("anomaly_level"), // 이상정도: high, medium, low
  
  // Enhanced structured metadata for efficient indexing
  metadata: jsonb("metadata"), // {
    // source: string, // 데이터 소스
    // collectionType: string, // 수집 타입
    // eventKeywords: string[], // 이벤트 키워드 
    // marketCondition: string, // 시장상황
    // foreignActivity: { buy: number, sell: number, net: number }, // 외국인 활동
    // institutionalActivity: { buy: number, sell: number, net: number }, // 기관 활동
    // individualActivity: { buy: number, sell: number, net: number }, // 개인 활동
    // technicalSignals: { rsi: number, macd: string, bollinger: string }, // 기술적 신호
    // fundamentals: { per: number, pbr: number, roe: number }, // 펀더멘털 정보
    // correlatedSymbols: string[], // 연관 종목
    // importance: number, // 중요도 점수 (0-1)
    // confidence: number, // 신뢰도 점수 (0-1)
    // newsCount: number, // 관련 뉴스 수
    // socialSentiment: string, // 소셜 감정
    // analystRecommendation: string, // 애널리스트 추천
    // searchKeywords: string[] // 검색용 키워드 배열
  // }
  
  timestamp: timestamp("timestamp").notNull(),
  embeddings: text("embeddings"), // Vector embeddings as JSON string
  embeddingModel: text("embedding_model").default("text-embedding-ada-002"), // 임베딩 모델
  processedAt: timestamp("processed_at").defaultNow(), // 처리 시간
  createdAt: timestamp("created_at").defaultNow(), // 생성 시간 (init-sample-data.sql 호환)
}, (table) => ({
  symbolIdx: index("symbol_idx").on(table.symbol),
  symbolNameIdx: index("symbol_name_idx").on(table.symbolName),
  marketIdx: index("market_idx").on(table.market),
  dataTypeIdx: index("data_type_idx").on(table.dataType),
  timestampIdx: index("timestamp_idx").on(table.timestamp),
  sectorIdx: index("sector_idx").on(table.sectorCode),
  themeIdx: index("theme_idx").on(table.themeCode),
  anomalyIdx: index("anomaly_idx").on(table.anomalyLevel),
  processedAtIdx: index("processed_at_idx").on(table.processedAt),
  // JSONB GIN indexes for efficient metadata search
  metadataGinIdx: index("metadata_gin_idx").using("gin", sql`metadata`),
  // Composite indexes for common query patterns
  marketTypeIdx: index("market_type_idx").on(table.market, table.dataType),
  symbolTimestampIdx: index("symbol_timestamp_idx").on(table.symbol, table.timestamp),
}));

// Themes table for news clustering
export const themes = pgTable("themes", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).notNull(), // HEX color
  icon: varchar("icon", { length: 50 }), // lucide-react icon name
  themeType: varchar("theme_type", { length: 50 }).notNull().default("news"), // news, stock, sector, industry, custom
  keywords: text("keywords").array(), // 키워드 배열
  isActive: boolean("is_active").notNull().default(true), // 활성 상태
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  orderIdx: index("themes_order_idx").on(table.order),
  themeTypeIdx: index("themes_type_idx").on(table.themeType),
}));

// Enhanced News data for financial news processing and analysis
export const newsData = pgTable("news_data", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  nid: text("nid"), // 뉴스 고유 ID
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"), // AI 생성 요약
  
  // Theme clustering
  themeClusterId: varchar("theme_cluster_id", { length: 50 }).references(() => themes.id),
  
  // Source and publication info
  source: text("source"), // 언론사명
  reporter: text("reporter"), // 기자명
  category: text("category"), // 카테고리
  subcategory: text("subcategory"), // 세부 카테고리
  
  // Analysis results with enhanced scoring
  sentiment: text("sentiment"), // positive, negative, neutral, mixed
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }), // 감정 점수
  economicScore: decimal("economic_score", { precision: 3, scale: 2 }), // 경제 점수 (>80 for filtering)
  marketScore: decimal("market_score", { precision: 3, scale: 2 }), // 증시 점수 (>80 for filtering)
  advertisementScore: decimal("advertisement_score", { precision: 3, scale: 2 }), // 광고 점수 (=100 to filter out)
  duplicateScore: decimal("duplicate_score", { precision: 3, scale: 2 }), // 유사도 점수
  importanceScore: decimal("importance_score", { precision: 3, scale: 2 }), // 중요도 점수
  credibilityScore: decimal("credibility_score", { precision: 3, scale: 2 }), // 신뢰도 점수
  
  // Market impact analysis
  relevantSymbols: text("relevant_symbols").array(), // 연관 종목
  relevantIndices: text("relevant_indices").array(), // 연관 지수
  relevantThemes: text("relevant_themes").array(), // 연관 테마
  
  // Content analysis with enhanced extraction
  keywords: text("keywords").array(), // 키워드
  entities: text("entities").array(), // 개체명 (회사명, 인명 등)
  marketEvents: text("market_events").array(), // 증시이벤트 1~4
  eventCategories: text("event_categories").array(), // 이벤트 카테고리
  
  // Enhanced structured metadata for news processing
  metadata: jsonb("metadata"), // {
    // originalUrl: string, // 원문 URL
    // imageUrls: string[], // 이미지 URL들
    // tags: string[], // 태그
    // relatedNewsIds: string[], // 관련 뉴스 ID
    // marketImpactLevel: string, // 시장 영향도 (high/medium/low)
    // urgency: string, // 긴급도 (urgent/normal/low)
    // readCount: number, // 조회수
    // shareCount: number, // 공유수
    // location: string, // 지역
    // stockPriceImpact: { expected: string, direction: string }, // 주가 영향 예측
    // sectorImpact: string[], // 영향받는 섹터
    // timeRelevance: string, // 시간적 관련성
    // marketTiming: string, // 시장 타이밍 (pre-market/trading/after-hours)
    // searchKeywords: string[] // 검색용 키워드 배열
  // }
  
  publishedAt: timestamp("published_at").notNull(),
  crawledAt: timestamp("crawled_at").defaultNow(), // 수집 시간
  processedAt: timestamp("processed_at"), // AI 처리 시간
  
  embeddings: text("embeddings"), // Vector embeddings as JSON string
  embeddingModel: text("embedding_model").default("text-embedding-ada-002"),
  
  // Quality control and processing flags
  isProcessed: boolean("is_processed").default(false),
  isFiltered: boolean("is_filtered").default(false), // 필터링 여부 (광고, 낮은 점수 등)
  isAdvertisement: boolean("is_advertisement").default(false), // 광고 여부
  isDuplicate: boolean("is_duplicate").default(false), // 중복 여부
  isHighQuality: boolean("is_high_quality").default(false), // 고품질 뉴스 여부
  needsReview: boolean("needs_review").default(false), // 검토 필요 여부
}, (table) => ({
  themeClusterIdx: index("theme_cluster_idx").on(table.themeClusterId),
  nidIdx: index("nid_idx").on(table.nid),
  categoryIdx: index("category_idx").on(table.category),
  publishedAtIdx: index("published_at_idx").on(table.publishedAt),
  sentimentIdx: index("sentiment_idx").on(table.sentiment),
  economicScoreIdx: index("economic_score_idx").on(table.economicScore),
  marketScoreIdx: index("market_score_idx").on(table.marketScore),
  importanceScoreIdx: index("importance_score_idx").on(table.importanceScore),
  processedIdx: index("processed_idx").on(table.isProcessed),
  filteredIdx: index("filtered_idx").on(table.isFiltered),
  highQualityIdx: index("high_quality_idx").on(table.isHighQuality),
  // Array indexes for efficient array searches
  relevantSymbolsIdx: index("relevant_symbols_idx").using("gin", sql`relevant_symbols`),
  keywordsIdx: index("keywords_idx").using("gin", sql`keywords`),
  marketEventsIdx: index("market_events_idx").using("gin", sql`market_events`),
  entitiesIdx: index("entities_idx").using("gin", sql`entities`),
  // JSONB GIN indexes for efficient metadata search
  newsMetadataGinIdx: index("news_metadata_gin_idx").using("gin", sql`metadata`),
  // Composite indexes for common filtering patterns
  qualityFilterIdx: index("quality_filter_idx").on(table.economicScore, table.marketScore, table.isFiltered),
  timeProcessingIdx: index("time_processing_idx").on(table.publishedAt, table.isProcessed),
}));

// Prompts
export const prompts = pgTable("prompts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template"),
  parameters: jsonb("parameters"), // Template parameters
  category: text("category"), // 뉴스분석, 테마분석, 정량분석 등
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // JSON 기반 프롬프트 실행을 위한 필드들
  inputSchema: jsonb("input_schema"), // JSON 입력 스키마 정의
  outputSchema: jsonb("output_schema"), // JSON 출력 스키마 정의
  executionType: text("execution_type").default("text"), // text, json
  azureOpenAIConfig: jsonb("azure_openai_config"), // Azure OpenAI PTU 설정
});

// Python Scripts for workflow nodes
export const pythonScripts = pgTable("python_scripts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  description: text("description"),
  pythonScript: text("python_script").notNull(), // Python 코드
  pythonRequirements: text("python_requirements"), // requirements.txt 형식
  pythonTimeout: integer("python_timeout").default(30), // 실행 타임아웃 (초)
  pythonEnvironment: text("python_environment").default("python3"), // python3, python3.11 등
  pythonInputFormat: text("python_input_format").default("json"), // json, text 등
  pythonOutputFormat: text("python_output_format").default("json"), // json, text 등
  pythonWorkingDirectory: text("python_working_directory"), // 작업 디렉토리
  pythonMemoryLimit: integer("python_memory_limit"), // 메모리 제한 (MB)
  pythonCpuLimit: integer("python_cpu_limit"), // CPU 제한 (%)
  category: text("category"), // 데이터처리, 분석, 변환 등
  tags: text("tags").array().default(sql`'{}'::text[]`), // 태그 배열
  exampleInput: jsonb("example_input"), // 예제 입력 데이터
  exampleOutput: jsonb("example_output"), // 예제 출력 데이터
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("python_scripts_name_idx").on(table.name),
  categoryIdx: index("python_scripts_category_idx").on(table.category),
  activeIdx: index("python_scripts_active_idx").on(table.isActive),
}));

// AI Service Providers (OpenAI, Claude, Gemini, etc.)
export const aiServiceProviders = pgTable("ai_service_providers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // OpenAI, Anthropic, Google, etc.
  displayName: text("display_name").notNull(), // User-friendly name
  apiBaseUrl: text("api_base_url"), // Base API URL
  authType: text("auth_type").notNull().default("bearer"), // bearer, api_key, oauth
  documentationUrl: text("documentation_url"), // Link to API docs
  websiteUrl: text("website_url"), // Provider website
  logoUrl: text("logo_url"), // Logo URL or icon name
  status: text("status").notNull().default("active"), // active, deprecated, experimental
  tier: text("tier").notNull().default("standard"), // free, standard, premium, enterprise
  monthlyQuotaFree: integer("monthly_quota_free").default(0), // Free tier monthly quota
  rateLimits: jsonb("rate_limits"), // Rate limiting information
  supportedFeatures: text("supported_features").array(), // ['chat', 'embedding', 'tts', 'stt', 'vision']
  pricingModel: text("pricing_model").default("per_token"), // per_token, per_request, subscription, custom
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("provider_name_idx").on(table.name),
  statusIdx: index("provider_status_idx").on(table.status),
  tierIdx: index("provider_tier_idx").on(table.tier),
  featuresIdx: index("provider_features_idx").using("gin", sql`supported_features`),
}));

// API Categories for classification
export const apiCategories = pgTable("api_categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // LLM, TTS, STT, Vision, Embedding, Translation, etc.
  displayName: text("display_name").notNull(),
  description: text("description"),
  icon: text("icon"), // Lucide icon name
  color: text("color").default("#3b82f6"), // HEX color for UI
  orderIndex: integer("order_index").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nameIdx: index("category_name_idx").on(table.name),
  orderIdx: index("category_order_idx").on(table.orderIndex),
}));

// Enhanced API calls configuration with AI-specific features
export const apiCalls = pgTable("api_calls", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  providerId: varchar("provider_id").references(() => aiServiceProviders.id),
  categoryId: varchar("category_id").references(() => apiCategories.id),
  
  name: text("name").notNull(),
  displayName: text("display_name"), // User-friendly name
  description: text("description"),
  url: text("url").notNull(),
  method: text("method").notNull().default("POST"),
  
  // Authentication and security
  authType: text("auth_type").default("bearer"), // bearer, api_key, oauth, none
  headers: jsonb("headers"),
  apiKey: text("api_key"), // Deprecated - use secretKey instead
  secretKey: text("secret_key"), // References Replit Secret key name
  
  // JSON 기반 API 파라미터 및 결과값 관리
  requestSchema: jsonb("request_schema"), // JSON 스키마 for 파라미터 검증
  responseSchema: jsonb("response_schema"), // JSON 스키마 for 응답 검증
  parameterTemplate: text("parameter_template"), // 파라미터 템플릿 ({{변수명}} 형태)
  executionType: text("execution_type").default("json"), // json, text, binary
  
  // API 호출 설정
  timeout: integer("timeout").default(30000), // 타임아웃 (ms)
  retryCount: integer("retry_count").default(3), // 재시도 횟수
  retryDelay: integer("retry_delay").default(1000), // 재시도 지연 (ms)
  // defaultParams: jsonb("default_params"), // Default parameters
  
  // AI-specific configurations - columns don't exist in DB
  // modelName: text("model_name"), // GPT-4, Claude-3.5-Sonnet, etc.
  // maxTokens: integer("max_tokens"), // Token limits
  // supportsStreaming: boolean("supports_streaming").default(false),
  // supportsBatch: boolean("supports_batch").default(false),
  // inputTypes: text("input_types").array(), // ['text', 'image', 'audio', 'video']
  // outputTypes: text("output_types").array(), // ['text', 'image', 'audio', 'json']
  
  // Cost and performance - columns don't exist in DB
  // inputCost: decimal("input_cost", { precision: 10, scale: 8 }), // Cost per input token/unit
  // outputCost: decimal("output_cost", { precision: 10, scale: 8 }), // Cost per output token/unit
  // costUnit: text("cost_unit").default("token"), // token, request, minute, character
  avgResponseTime: integer("avg_response_time"), // Average response time in milliseconds (exists in DB)
  
  // Processing prompts (exist in DB)
  preprocessPrompt: text("preprocess_prompt"), // 파라미터 생성용 전처리 프롬프트
  postprocessPrompt: text("postprocess_prompt"), // 결과 포매팅용 후처리 프롬프트
  // systemPrompt: text("system_prompt"), // Default system prompt for LLMs - doesn't exist in DB
  
  // Operational settings (some exist in DB)
  // timeout, retryCount are already defined above (lines 298-300)
  // enableCaching: boolean("enable_caching").default(false), // doesn't exist in DB
  // cacheExpiration: integer("cache_expiration").default(3600), // seconds - doesn't exist in DB
  
  // Status and metadata (some exist in DB)
  isActive: boolean("is_active"),
  isVerified: boolean("is_verified"), // Tested and working
  lastTested: timestamp("last_tested"),
  testStatus: text("test_status"), // success, failed, pending, not_tested
  errorCount: integer("error_count"),
  successCount: integer("success_count"),
  
  // Usage tracking - columns don't exist in DB
  // totalCalls: integer("total_calls").default(0),
  // totalCost: decimal("total_cost", { precision: 15, scale: 4 }).default("0"),
  // lastUsed: timestamp("last_used"),
  
  // Version and compatibility - columns don't exist in DB
  // apiVersion: text("api_version"), // v1, v2, etc.
  // sdkVersion: text("sdk_version"), // Compatible SDK version
  // deprecated: boolean("deprecated").default(false),
  // deprecationDate: timestamp("deprecation_date"),
  // replacementApiId: varchar("replacement_api_id"),
  
  // User management
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  providerIdx: index("api_provider_idx").on(table.providerId),
  categoryIdx: index("api_category_idx").on(table.categoryId),
  nameIdx: index("api_name_idx").on(table.name),
  statusIdx: index("api_status_idx").on(table.isActive, table.testStatus),
  // costIdx: index("api_cost_idx").on(table.inputCost, table.outputCost), // Columns don't exist
  // usageIdx: index("api_usage_idx").on(table.totalCalls, table.lastUsed), // Columns don't exist
  // modelIdx: index("api_model_idx").on(table.modelName), // Column doesn't exist
  // inputTypesIdx: index("api_input_types_idx").using("gin", sql`input_types`), // Column doesn't exist
  // outputTypesIdx: index("api_output_types_idx").using("gin", sql`output_types`), // Column doesn't exist
}));

// API Test Results for tracking API health and performance
export const apiTestResults = pgTable("api_test_results", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  apiCallId: varchar("api_call_id").references(() => apiCalls.id).notNull(),
  
  // Test configuration
  testType: text("test_type").notNull(), // manual, automated, health_check, integration
  testPayload: jsonb("test_payload"), // Test input data
  expectedResponse: jsonb("expected_response"), // Expected output for validation
  
  // Test execution
  status: text("status").notNull(), // success, failed, timeout, error
  responseTime: integer("response_time"), // ms
  responseSize: integer("response_size"), // bytes
  actualResponse: jsonb("actual_response"), // Actual API response
  
  // Error details
  errorType: text("error_type"), // authentication, rate_limit, server_error, timeout, validation
  errorMessage: text("error_message"),
  httpStatusCode: integer("http_status_code"),
  
  // Cost tracking
  tokensUsed: integer("tokens_used"),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 6 }),
  
  // Test metadata
  environment: text("environment").default("production"), // development, staging, production
  clientInfo: jsonb("client_info"), // User agent, IP, etc.
  
  testedBy: varchar("tested_by").references(() => users.id),
  testedAt: timestamp("tested_at").defaultNow(),
}, (table) => ({
  apiCallIdx: index("test_api_call_idx").on(table.apiCallId),
  statusIdx: index("test_status_idx").on(table.status),
  testTypeIdx: index("test_type_idx").on(table.testType),
  testedAtIdx: index("tested_at_idx").on(table.testedAt),
  responseTimeIdx: index("response_time_idx").on(table.responseTime),
}));

// API Usage Analytics for cost and performance monitoring
export const apiUsageAnalytics = pgTable("api_usage_analytics", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  apiCallId: varchar("api_call_id").references(() => apiCalls.id).notNull(),
  
  // Time buckets for analytics
  date: timestamp("date").notNull(), // Daily aggregation
  hour: integer("hour"), // Hour of day (0-23) for hourly aggregation
  
  // Usage metrics
  requestCount: integer("request_count").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  
  // Performance metrics
  avgResponseTime: integer("avg_response_time"), // ms
  minResponseTime: integer("min_response_time"), // ms
  maxResponseTime: integer("max_response_time"), // ms
  p95ResponseTime: integer("p95_response_time"), // ms
  
  // Cost metrics
  totalTokensUsed: integer("total_tokens_used").default(0),
  totalCost: decimal("total_cost", { precision: 15, scale: 4 }).default("0"),
  avgCostPerRequest: decimal("avg_cost_per_request", { precision: 10, scale: 6 }),
  
  // Usage patterns
  peakHour: integer("peak_hour"), // Hour with most requests
  errorRate: decimal("error_rate", { precision: 5, scale: 2 }), // Percentage
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  apiCallIdx: index("analytics_api_call_idx").on(table.apiCallId),
  dateIdx: index("analytics_date_idx").on(table.date),
  hourIdx: index("analytics_hour_idx").on(table.hour),
  costIdx: index("analytics_cost_idx").on(table.totalCost),
  usageIdx: index("analytics_usage_idx").on(table.requestCount),
  // Composite index for time-series queries
  dateHourIdx: index("analytics_date_hour_idx").on(table.date, table.hour),
}));

// API Templates for common use cases and quick setup
export const apiTemplates = pgTable("api_templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: varchar("name").notNull(),
  displayName: varchar("display_name"),
  description: text("description"),
  categoryId: varchar("category_id").references(() => apiCategories.id),
  providerId: varchar("provider_id"),
  
  // Template configuration (matching actual database columns)
  templateConfig: jsonb("template_config"), // Complete API call configuration  
  exampleInput: jsonb("example_input"), // Example input data
  exampleOutput: jsonb("example_output"), // Example output data
  
  // Additional template fields (actual database columns)
  template: jsonb("template"), // Template content
  variables: jsonb("variables"), // Template variables for customization
  examples: jsonb("examples"), // Usage examples and sample data
  
  // Template metadata (matching actual database columns)
  useCase: text("use_case"), // 사용 사례 설명
  useCases: text("use_cases").array(), // Multiple use cases array
  difficulty: text("difficulty").default("beginner"), // beginner, intermediate, advanced
  difficultyLevel: text("difficulty_level"), // Alternative difficulty field
  estimatedCost: text("estimated_cost"), // "저비용", "중비용", "고비용"
  estimatedCostPerCall: decimal("estimated_cost_per_call", { precision: 10, scale: 4 }), // Numeric cost
  tags: text("tags").array(), // ['chatbot', 'analysis', 'automation']
  
  // Usage tracking
  usageCount: integer("usage_count").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }), // User rating 0-5
  
  isPublic: boolean("is_public").default(true),
  isFeatured: boolean("is_featured").default(false),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("template_category_idx").on(table.categoryId),
  publicIdx: index("template_public_idx").on(table.isPublic),
  featuredIdx: index("template_featured_idx").on(table.isFeatured),
  tagsIdx: index("template_tags_idx").using("gin", sql`tags`),
  usageIdx: index("template_usage_idx").on(table.usageCount),
  ratingIdx: index("template_rating_idx").on(table.rating),
}));

// Workflow Folders
const workflowFoldersTable = pgTable("workflow_folders", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  parentId: varchar("parent_id", { length: 36 }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  parentIdIdx: index("workflow_folders_parent_id_idx").on(table.parentId),
}));
export const workflowFolders = workflowFoldersTable;

// Workflows
export const workflows = pgTable("workflows", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  description: text("description"),
  definition: jsonb("definition").notNull(), // Workflow graph definition
  isActive: boolean("is_active").default(true),
  folderId: varchar("folder_id", { length: 36 }),
  folderPath: text("folder_path"), // 계층 구조 경로 (예: "folder1/subfolder1")
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  folderIdIdx: index("workflows_folder_id_idx").on(table.folderId),
}));

// Workflow executions
export const workflowExecutions = pgTable("workflow_executions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  workflowId: varchar("workflow_id").references(() => workflows.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  input: jsonb("input"),
  output: jsonb("output"),
  logs: text("logs").array(),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  executionTime: integer("execution_time"), // in milliseconds
}, (table) => ({
  workflowIdIdx: index("workflow_id_idx").on(table.workflowId),
  statusIdx: index("status_idx").on(table.status),
  startedAtIdx: index("started_at_idx").on(table.startedAt),
}));

// Schedules
export const schedules = pgTable("schedules", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  workflowId: varchar("workflow_id").references(() => workflows.id).notNull(),
  cronExpression: text("cron_expression").notNull(),
  timezone: text("timezone").default("Asia/Seoul"),
  isActive: boolean("is_active").default(true),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Generated market analysis
export const marketAnalysis = pgTable("market_analysis", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  title: text("title").notNull(),
  type: text("type").notNull(), // macro, news, theme, quantitative
  content: text("content").notNull(),
  summary: text("summary"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  dataSourceIds: text("data_source_ids").array(),
  workflowExecutionId: varchar("workflow_execution_id").references(() => workflowExecutions.id),
  generatedAt: timestamp("generated_at").defaultNow(),
  validUntil: timestamp("valid_until"),
}, (table) => ({
  typeIdx: index("type_idx").on(table.type),
  generatedAtIdx: index("generated_at_idx").on(table.generatedAt),
}));

// Integrated macro analysis combining multiple streams
export const macroAnalysis = pgTable("macro_analysis", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  title: text("title").notNull(),
  
  // Individual stream analysis results
  newsAnalysis: text("news_analysis"), // 뉴스기반시황 분석 결과
  themeAnalysis: text("theme_analysis"), // 테마/산업시황 분석 결과  
  quantitativeAnalysis: text("quantitative_analysis"), // 정량적 시장/시세 분석 결과
  
  // Integrated analysis
  integratedSummary: text("integrated_summary").notNull(), // 통합 분석 요약
  integratedContent: text("integrated_content").notNull(), // 통합 분석 상세 내용
  
  // AI importance scoring
  overallImportance: decimal("overall_importance", { precision: 3, scale: 2 }), // 전체 중요도 (0-1)
  newsImportance: decimal("news_importance", { precision: 3, scale: 2 }), // 뉴스 중요도
  themeImportance: decimal("theme_importance", { precision: 3, scale: 2 }), // 테마 중요도
  quantImportance: decimal("quant_importance", { precision: 3, scale: 2 }), // 정량 중요도
  
  // Market impact assessment
  marketImpact: text("market_impact"), // positive, negative, neutral
  affectedSectors: text("affected_sectors").array(), // 영향받는 섹터들
  keyFactors: text("key_factors").array(), // 주요 요인들
  
  // Data sources
  sourceAnalysisIds: text("source_analysis_ids").array(), // 참조된 개별 분석 ID들
  dataSourceCount: integer("data_source_count"), // 사용된 데이터 소스 수
  
  // Workflow association
  workflowExecutionIds: text("workflow_execution_ids").array(), // 워크플로우 실행 ID들
  
  // Metadata
  generatedBy: varchar("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow(),
  validUntil: timestamp("valid_until"),
  status: text("status").default("active"), // active, archived, expired
}, (table) => ({
  generatedAtIdx: index("macro_generated_at_idx").on(table.generatedAt),
  statusIdx: index("macro_status_idx").on(table.status),
  importanceIdx: index("macro_importance_idx").on(table.overallImportance),
}));

// Macro Workflow Templates for each analysis type
export const macroWorkflowTemplates = pgTable("macro_workflow_templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  analysisType: text("analysis_type").notNull().unique(), // news, theme, quantitative
  workflowId: varchar("workflow_id").references(() => workflows.id), // Reference to actual workflow
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"), // Lucide icon name
  color: text("color"), // Color code for UI
  defaultConfig: jsonb("default_config"), // Default configuration for the workflow
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  analysisTypeIdx: index("macro_wf_template_type_idx").on(table.analysisType),
  activeIdx: index("macro_wf_template_active_idx").on(table.isActive),
}));

// ========== ETF Investment Guide Chatbot Tables ==========

// ETF Products - comprehensive ETF product information
export const etfProducts = pgTable("etf_products", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // Basic ETF information
  ticker: varchar("ticker", { length: 20 }).notNull().unique(), // ETF ticker symbol
  name: text("name").notNull(), // ETF full name
  region: varchar("region", { length: 50 }).notNull(), // US, Europe, Asia, Global, etc.
  assetClass: varchar("asset_class", { length: 50 }).notNull(), // Equity, Bond, Commodity, Real Estate, etc.
  
  // Cost and tracking information
  expenseRatio: decimal("expense_ratio", { precision: 5, scale: 4 }), // Annual expense ratio (e.g., 0.0575)
  trackingIndex: text("tracking_index"), // Name of the index being tracked
  
  // Fund size and liquidity metrics
  aum: decimal("aum", { precision: 20, scale: 2 }), // Assets Under Management in USD
  spreadBps: decimal("spread_bps", { precision: 6, scale: 2 }), // Bid-ask spread in basis points
  avgVolume: integer("avg_volume"), // Average daily trading volume
  
  // Holdings and composition
  holdingsTop: jsonb("holdings_top"), // Top holdings array: [{symbol, name, weight, sector}]
  
  // Risk assessment
  riskScore: decimal("risk_score", { precision: 3, scale: 1 }), // Risk score 1-10
  
  // Tax considerations
  taxTreatment: varchar("tax_treatment", { length: 50 }), // Tax efficiency rating or type
  
  // Provider information
  issuer: varchar("issuer", { length: 100 }).notNull(), // Fund provider (Vanguard, BlackRock, etc.)
  
  // Extended metadata
  metadata: jsonb("metadata"), // {
    // inceptionDate: string,
    // domicile: string,
    // currency: string,
    // distributionFrequency: string,
    // distributionYield: number,
    // sectors: [{name: string, weight: number}],
    // geographicAllocation: [{region: string, weight: number}],
    // fundamentals: {pe: number, pb: number, dividend_yield: number},
    // esgScore: number,
    // carbonIntensity: number,
    // benchmark: string,
    // tradingCurrency: string,
    // primaryExchange: string,
    // legalStructure: string, // UCITS, ETN, etc.
    // replicationMethod: string, // Physical, Synthetic
    // dividendTreatment: string, // Accumulating, Distributing
    // securities_lending: boolean,
    // keywords: string[] // For search functionality
  // }
  
  // Status and maintenance
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // CHECK constraints
  expenseRatioCheck: check("etf_products_expense_ratio_check", sql`expense_ratio >= 0 AND expense_ratio <= 1`),
  riskScoreCheck: check("etf_products_risk_score_check", sql`risk_score >= 0 AND risk_score <= 10`),
  
  tickerIdx: index("etf_products_ticker_idx").on(table.ticker),
  nameIdx: index("etf_products_name_idx").on(table.name),
  regionIdx: index("etf_products_region_idx").on(table.region),
  assetClassIdx: index("etf_products_asset_class_idx").on(table.assetClass),
  issuerIdx: index("etf_products_issuer_idx").on(table.issuer),
  riskScoreIdx: index("etf_products_risk_score_idx").on(table.riskScore),
  expenseRatioIdx: index("etf_products_expense_ratio_idx").on(table.expenseRatio),
  aumIdx: index("etf_products_aum_idx").on(table.aum),
  activeIdx: index("etf_products_active_idx").on(table.isActive),
  lastUpdatedIdx: index("etf_products_last_updated_idx").on(table.lastUpdated),
  // JSONB indexes for efficient metadata searches
  metadataGinIdx: index("etf_products_metadata_gin_idx").using("gin", sql`metadata`),
  // Composite indexes for common query patterns
  regionAssetClassIdx: index("etf_products_region_asset_class_idx").on(table.region, table.assetClass),
  riskExpenseIdx: index("etf_products_risk_expense_idx").on(table.riskScore, table.expenseRatio),
}));

// ETF Metrics - real-time ETF performance and market data
export const etfMetrics = pgTable("etf_metrics", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // Reference to ETF product
  etfId: varchar("etf_id").references(() => etfProducts.id).notNull(), // Foreign key to etfProducts
  
  // Current valuation data
  nav: decimal("nav", { precision: 15, scale: 4 }), // Net Asset Value
  price: decimal("price", { precision: 15, scale: 4 }), // Current trading price
  premiumDiscount: decimal("premium_discount", { precision: 6, scale: 4 }), // Premium/Discount to NAV (%)
  
  // Volatility metrics
  vol30d: decimal("vol30d", { precision: 6, scale: 4 }), // 30-day volatility (%)
  
  // Performance returns
  ret1m: decimal("ret1m", { precision: 8, scale: 4 }), // 1-month return (%)
  ret3m: decimal("ret3m", { precision: 8, scale: 4 }), // 3-month return (%)
  ret1y: decimal("ret1y", { precision: 8, scale: 4 }), // 1-year return (%)
  
  // Tracking performance
  trackingDiff: decimal("tracking_diff", { precision: 8, scale: 4 }), // Tracking difference vs benchmark (%)
  
  // Timestamp for data freshness
  asOf: timestamp("as_of").notNull(), // Data point timestamp for historical tracking
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  etfIdIdx: index("etf_metrics_etf_id_idx").on(table.etfId),
  updatedAtIdx: index("etf_metrics_updated_at_idx").on(table.updatedAt),
  navIdx: index("etf_metrics_nav_idx").on(table.nav),
  priceIdx: index("etf_metrics_price_idx").on(table.price),
  premiumDiscountIdx: index("etf_metrics_premium_discount_idx").on(table.premiumDiscount),
  vol30dIdx: index("etf_metrics_vol30d_idx").on(table.vol30d),
  ret1yIdx: index("etf_metrics_ret1y_idx").on(table.ret1y),
  trackingDiffIdx: index("etf_metrics_tracking_diff_idx").on(table.trackingDiff),
  // Composite index for latest metrics by ETF
  etfIdUpdatedAtIdx: index("etf_metrics_etf_id_updated_at_idx").on(table.etfId, table.updatedAt),
  // New indexes for asOf timestamp
  etfIdAsOfUniqueIdx: uniqueIndex("etf_metrics_etf_id_as_of_unique").on(table.etfId, table.asOf),
  etfIdAsOfDescIdx: index("etf_metrics_etf_id_as_of_desc_idx").on(table.etfId, sql`as_of DESC`),
}));

// User Risk Profile - stores user investment risk preferences and constraints
export const userRiskProfile = pgTable("user_risk_profile", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // User reference
  userId: varchar("user_id").references(() => users.id).notNull(), // Foreign key to users
  
  // Risk assessment results
  riskLevel: varchar("risk_level", { length: 20 }).notNull(), // conservative, moderate, aggressive, very_aggressive
  
  // Investment parameters
  horizon: varchar("horizon", { length: 20 }).notNull(), // short_term, medium_term, long_term (e.g., <3y, 3-10y, >10y)
  
  // Investment objectives
  objectives: text("objectives").array(), // [growth, income, preservation, speculation]
  
  // Investment constraints and preferences
  constraints: jsonb("constraints"), // {
    // max_single_position: number, // Maximum % in single ETF
    // min_liquidity: number, // Minimum daily volume requirement
    // max_expense_ratio: number, // Maximum expense ratio allowed
    // preferred_regions: string[], // Geographic preferences
    // preferred_asset_classes: string[], // Asset class preferences
    // esg_required: boolean, // ESG requirement
    // ethical_screening: boolean, // Ethical investment screening
    // currency_hedging: string, // none, partial, full
    // rebalancing_frequency: string, // monthly, quarterly, semi_annual, annual
    // target_diversification: number // Number of ETFs to hold
  // }
  
  // Exclusions
  excludedTickers: text("excluded_tickers").array(), // ETF tickers to exclude from recommendations
  
  // Profile metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  userIdIdx: index("user_risk_profile_user_id_idx").on(table.userId),
  riskLevelIdx: index("user_risk_profile_risk_level_idx").on(table.riskLevel),
  horizonIdx: index("user_risk_profile_horizon_idx").on(table.horizon),
  activeIdx: index("user_risk_profile_active_idx").on(table.isActive),
  updatedAtIdx: index("user_risk_profile_updated_at_idx").on(table.updatedAt),
  // GIN indexes for efficient array searches
  objectivesIdx: index("user_risk_profile_objectives_idx").using("gin", sql`objectives`),
  excludedTickersIdx: index("user_risk_profile_excluded_tickers_idx").using("gin", sql`excluded_tickers`),
  constraintsGinIdx: index("user_risk_profile_constraints_gin_idx").using("gin", sql`constraints`),
  // Composite index for active user profiles by risk level
  userRiskActiveIdx: index("user_risk_profile_user_risk_active_idx").on(table.userId, table.riskLevel, table.isActive),
  // Unique constraint for single active profile per user
  userIdUniqueIdx: uniqueIndex("user_risk_profile_user_id_unique").on(table.userId),
}));

// ETF Chat Sessions - manages user chat sessions with the ETF investment bot
export const etfChatSessions = pgTable("etf_chat_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // User reference
  userId: varchar("user_id").references(() => users.id).notNull(), // Foreign key to users
  
  // Session configuration
  mode: varchar("mode", { length: 50 }).notNull(), // recommendation, analysis, education, portfolio_review
  configId: varchar("config_id").references(() => etfBotConfigs.id), // Reference to bot configuration
  
  // Session metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  userIdIdx: index("etf_chat_sessions_user_id_idx").on(table.userId),
  modeIdx: index("etf_chat_sessions_mode_idx").on(table.mode),
  configIdIdx: index("etf_chat_sessions_config_id_idx").on(table.configId),
  activeIdx: index("etf_chat_sessions_active_idx").on(table.isActive),
  createdAtIdx: index("etf_chat_sessions_created_at_idx").on(table.createdAt),
  // Composite index for active sessions by user
  userActiveIdx: index("etf_chat_sessions_user_active_idx").on(table.userId, table.isActive),
}));

// ETF Chat Messages - stores individual messages within chat sessions
export const etfChatMessages = pgTable("etf_chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // Session reference
  sessionId: varchar("session_id").references(() => etfChatSessions.id).notNull(), // Foreign key to etfChatSessions
  
  // Message details
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system, tool
  content: text("content").notNull(), // Message content
  
  // AI function calling
  toolCalls: jsonb("tool_calls"), // Array of tool calls made: [{id, type, function: {name, arguments}}]
  
  // Safety and moderation
  safetyFlags: jsonb("safety_flags"), // Safety check results: {flagged: boolean, categories: string[], scores: {}}
  
  // Message metadata
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sessionIdIdx: index("etf_chat_messages_session_id_idx").on(table.sessionId),
  roleIdx: index("etf_chat_messages_role_idx").on(table.role),
  createdAtIdx: index("etf_chat_messages_created_at_idx").on(table.createdAt),
  // GIN indexes for efficient JSON searches
  toolCallsGinIdx: index("etf_chat_messages_tool_calls_gin_idx").using("gin", sql`tool_calls`),
  safetyFlagsGinIdx: index("etf_chat_messages_safety_flags_gin_idx").using("gin", sql`safety_flags`),
  // Composite index for session messages chronologically
  sessionCreatedAtIdx: index("etf_chat_messages_session_created_at_idx").on(table.sessionId, table.createdAt),
}));

// Guardrail Policies - defines safety and compliance rules for the ETF chatbot
export const guardrailPolicies = pgTable("guardrail_policies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // Policy details
  name: varchar("name", { length: 100 }).notNull(), // Policy name
  description: text("description"), // Policy description
  
  // Rules definition
  rulesJson: jsonb("rules_json").notNull(), // {
    // financial_advice_disclaimer: boolean, // Require disclaimer for investment advice
    // max_portfolio_concentration: number, // Max % in single position
    // prohibited_recommendations: string[], // Restricted ETF categories
    // risk_warnings: {[riskLevel]: string[]}, // Risk-specific warnings
    // compliance_checks: string[], // Required compliance validations
    // content_filtering: {keywords: string[], actions: string[]}, // Content moderation
    // user_verification: string[], // Required user verifications
    // geographic_restrictions: string[], // Geographic limitations
    // investment_limits: {min_amount: number, max_amount: number}, // Investment constraints
    // disclosure_requirements: string[] // Required disclosures
  // }
  
  // Policy metadata
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
  isActive: boolean("is_active").default(true),
  version: varchar("version", { length: 10 }).default("1.0"),
  
  // Audit trail
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("guardrail_policies_name_idx").on(table.name),
  severityIdx: index("guardrail_policies_severity_idx").on(table.severity),
  activeIdx: index("guardrail_policies_active_idx").on(table.isActive),
  versionIdx: index("guardrail_policies_version_idx").on(table.version),
  createdByIdx: index("guardrail_policies_created_by_idx").on(table.createdBy),
  // JSONB index for efficient rules searches
  rulesJsonGinIdx: index("guardrail_policies_rules_json_gin_idx").using("gin", sql`rules_json`),
  // Composite index for active policies by severity
  activeSeverityIdx: index("guardrail_policies_active_severity_idx").on(table.isActive, table.severity),
}));

// ETF Bot Configurations - AI model and behavior configurations for the ETF chatbot
export const etfBotConfigs = pgTable("etf_bot_configs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // Configuration identification
  name: varchar("name", { length: 100 }).notNull(), // Configuration name
  description: text("description"), // Configuration description
  
  // AI Model configuration
  modelRef: varchar("model_ref", { length: 100 }).notNull(), // Reference to AI model (e.g., "gpt-4", "claude-3-sonnet")
  
  // Model parameters
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"), // Model creativity (0.0-2.0)
  topP: decimal("top_p", { precision: 3, scale: 2 }).default("1.0"), // Nucleus sampling (0.0-1.0)
  
  // RAG and retrieval settings
  retrievalK: integer("retrieval_k").default(5), // Number of documents to retrieve
  maxTokens: integer("max_tokens").default(4096), // Maximum response tokens
  
  // Provider and service configuration
  allowedProviders: text("allowed_providers").array(), // Allowed AI providers ["openai", "anthropic", "google"]
  safetyPolicyIds: text("safety_policy_ids").array(), // References to guardrail policy IDs
  
  // Configuration metadata
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // Default configuration for new sessions
  version: varchar("version", { length: 10 }).default("1.0"),
  
  // Audit trail
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("etf_bot_configs_name_idx").on(table.name),
  modelRefIdx: index("etf_bot_configs_model_ref_idx").on(table.modelRef),
  activeIdx: index("etf_bot_configs_active_idx").on(table.isActive),
  defaultIdx: index("etf_bot_configs_default_idx").on(table.isDefault),
  versionIdx: index("etf_bot_configs_version_idx").on(table.version),
  createdByIdx: index("etf_bot_configs_created_by_idx").on(table.createdBy),
  // GIN indexes for efficient array searches
  allowedProvidersIdx: index("etf_bot_configs_allowed_providers_idx").using("gin", sql`allowed_providers`),
  safetyPolicyIdsIdx: index("etf_bot_configs_safety_policy_ids_idx").using("gin", sql`safety_policy_ids`),
  // Composite index for active configurations
  activeDefaultIdx: index("etf_bot_configs_active_default_idx").on(table.isActive, table.isDefault),
}));

// ETF Recommendation Engine Settings - MCDA criteria weights and filtering preferences
export const etfRecommendationSettings = pgTable("etf_recommendation_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // Setting identification
  name: varchar("name", { length: 100 }).notNull(), // Setting profile name
  description: text("description"), // Setting profile description
  
  // MCDA Criteria Weights (must sum to 1.0)
  riskAlignmentWeight: decimal("risk_alignment_weight", { precision: 4, scale: 3 }).default("0.25"), // How well ETF risk matches user tolerance
  expenseRatioWeight: decimal("expense_ratio_weight", { precision: 4, scale: 3 }).default("0.20"), // Cost efficiency importance
  liquidityWeight: decimal("liquidity_weight", { precision: 4, scale: 3 }).default("0.15"), // Trading volume/spread importance
  diversificationWeight: decimal("diversification_weight", { precision: 4, scale: 3 }).default("0.15"), // Diversification importance
  trackingDifferenceWeight: decimal("tracking_difference_weight", { precision: 4, scale: 3 }).default("0.15"), // Index tracking importance
  taxEfficiencyWeight: decimal("tax_efficiency_weight", { precision: 4, scale: 3 }).default("0.05"), // Tax implications importance
  performanceWeight: decimal("performance_weight", { precision: 4, scale: 3 }).default("0.05"), // Historical performance importance
  
  // Recommendation Settings
  maxRecommendations: integer("max_recommendations").default(20), // Maximum number of ETFs to recommend
  minScore: decimal("min_score", { precision: 3, scale: 2 }).default("0.5"), // Minimum score threshold for recommendations
  
  // Filtering Preferences
  filteringCriteria: jsonb("filtering_criteria"), // {
    // assetClass: string[], // Asset classes to include
    // region: string[], // Geographic regions to include
    // maxExpenseRatio: number, // Maximum acceptable expense ratio
    // minAum: number, // Minimum assets under management
    // minLiquidity: number, // Minimum daily trading volume
    // excludeTickers: string[], // ETFs to exclude
    // riskRange: {min: number, max: number} // Risk score range
  // }
  
  // Setting metadata
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // Default setting for new users
  version: varchar("version", { length: 10 }).default("1.0"),
  
  // Audit trail
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: index("etf_recommendation_settings_name_idx").on(table.name),
  activeIdx: index("etf_recommendation_settings_active_idx").on(table.isActive),
  defaultIdx: index("etf_recommendation_settings_default_idx").on(table.isDefault),
  createdByIdx: index("etf_recommendation_settings_created_by_idx").on(table.createdBy),
  // GIN index for filtering criteria JSON searches
  filteringCriteriaGinIdx: index("etf_recommendation_settings_filtering_criteria_gin_idx").using("gin", sql`filtering_criteria`),
  // Composite index for active default settings
  activeDefaultIdx: index("etf_recommendation_settings_active_default_idx").on(table.isActive, table.isDefault),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  prompts: many(prompts),
  apiCalls: many(apiCalls),
  workflows: many(workflows),
  schedules: many(schedules),
}));

export const themesRelations = relations(themes, ({ many }) => ({
  newsData: many(newsData),
}));

export const newsDataRelations = relations(newsData, ({ one }) => ({
  theme: one(themes, {
    fields: [newsData.themeClusterId],
    references: [themes.id],
  }),
}));

export const promptsRelations = relations(prompts, ({ one }) => ({
  createdBy: one(users, {
    fields: [prompts.createdBy],
    references: [users.id],
  }),
}));

export const apiCallsRelations = relations(apiCalls, ({ one }) => ({
  createdBy: one(users, {
    fields: [apiCalls.createdBy],
    references: [users.id],
  }),
}));

export const workflowFoldersRelations = relations(workflowFolders, ({ one, many }) => ({
  parent: one(workflowFolders, {
    fields: [workflowFolders.parentId],
    references: [workflowFolders.id],
    relationName: "parent",
  }),
  children: many(workflowFolders, {
    relationName: "parent",
  }),
  createdBy: one(users, {
    fields: [workflowFolders.createdBy],
    references: [users.id],
  }),
  workflows: many(workflows),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [workflows.createdBy],
    references: [users.id],
  }),
  folder: one(workflowFolders, {
    fields: [workflows.folderId],
    references: [workflowFolders.id],
  }),
  executions: many(workflowExecutions),
  schedules: many(schedules),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflowExecutions.workflowId],
    references: [workflows.id],
  }),
  analysis: many(marketAnalysis),
  nodeResults: many(workflowNodeResults),
}));


export const schedulesRelations = relations(schedules, ({ one }) => ({
  workflow: one(workflows, {
    fields: [schedules.workflowId],
    references: [workflows.id],
  }),
  createdBy: one(users, {
    fields: [schedules.createdBy],
    references: [users.id],
  }),
}));

export const marketAnalysisRelations = relations(marketAnalysis, ({ one }) => ({
  workflowExecution: one(workflowExecutions, {
    fields: [marketAnalysis.workflowExecutionId],
    references: [workflowExecutions.id],
  }),
}));

export const macroAnalysisRelations = relations(macroAnalysis, ({ one }) => ({
  generatedBy: one(users, {
    fields: [macroAnalysis.generatedBy],
    references: [users.id],
  }),
}));


// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, hashedPassword: true })
  .extend({
    password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다.").optional(),
  });

export const insertFinancialDataSchema = createInsertSchema(financialData).omit({
  id: true,
});

export const insertThemeSchema = createInsertSchema(themes).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertNewsDataSchema = createInsertSchema(newsData).omit({
  id: true,
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPythonScriptSchema = createInsertSchema(pythonScripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiCallSchema = createInsertSchema(apiCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowFolderSchema = createInsertSchema(workflowFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({
  id: true,
  startedAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

export const insertMarketAnalysisSchema = createInsertSchema(marketAnalysis).omit({
  id: true,
  generatedAt: true,
});

export const insertMacroAnalysisSchema = createInsertSchema(macroAnalysis).omit({
  id: true,
  generatedAt: true,
});

export const insertMacroWorkflowTemplateSchema = createInsertSchema(macroWorkflowTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MacroWorkflowTemplate = typeof macroWorkflowTemplates.$inferSelect;
export type InsertMacroWorkflowTemplate = z.infer<typeof insertMacroWorkflowTemplateSchema>;

// Workflow node execution results for AI market analysis workflows
export const workflowNodeResults = pgTable("workflow_node_results", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  executionId: varchar("execution_id").references(() => workflowExecutions.id).notNull(),
  nodeId: varchar("node_id").notNull(), // Node ID from workflow definition
  nodeType: varchar("node_type").notNull(), // start, fetch_news, classify_theme, summarize, compute_metrics, macro_conditions, assemble_layout, end
  
  // Node execution details
  status: text("status").notNull().default("pending"), // pending, running, completed, failed, skipped
  input: jsonb("input"), // Node input data
  output: jsonb("output"), // Node output data
  outputKeys: text("output_keys").array(), // Available output keys for layout binding
  
  // Execution timing and logging
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  executionTime: integer("execution_time"), // in milliseconds
  logs: text("logs").array(),
  error: text("error"),
  
  // Node configuration at execution time
  nodeConfig: jsonb("node_config"), // Snapshot of node config when executed
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  executionNodeIdx: index("workflow_node_execution_idx").on(table.executionId, table.nodeId),
  nodeTypeIdx: index("workflow_node_type_idx").on(table.nodeType),
  statusIdx: index("workflow_node_status_idx").on(table.status),
}));

export const insertWorkflowNodeResultSchema = createInsertSchema(workflowNodeResults).omit({
  id: true,
  createdAt: true,
});

// Layout templates for AI market report formatting
export const layoutTemplates = pgTable("layout_templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // macro, news, theme, quantitative, mixed
  
  // Layout definition as JSON
  layoutDefinition: jsonb("layout_definition").notNull(), // Component layout structure
  components: jsonb("components").notNull(), // Component configurations
  dataBindings: jsonb("data_bindings"), // Data source mappings with workflow node bindings
  
  // Template properties
  isDefault: boolean("is_default").default(false), // System default templates
  isPublic: boolean("is_public").default(false), // Shared templates
  paperSize: text("paper_size").default("A4"), // A4, Letter, etc.
  orientation: text("orientation").default("portrait"), // portrait, landscape
  
  // Style configuration
  theme: text("theme").default("professional"), // professional, minimal, corporate
  colorScheme: jsonb("color_scheme"), // Custom color configurations
  fonts: jsonb("fonts"), // Font configurations
  
  // Usage tracking
  usage_count: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  
  // Metadata
  tags: text("tags").array(), // Searchable tags
  version: text("version").default("1.0"),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  typeIdx: index("layout_type_idx").on(table.type),
  createdByIdx: index("layout_created_by_idx").on(table.createdBy),
  isDefaultIdx: index("layout_is_default_idx").on(table.isDefault),
  tagsIdx: index("layout_tags_idx").on(table.tags),
}));

// Morning briefing for market opening hour analysis
export const morningBriefing = pgTable("morning_briefing", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  briefingDate: timestamp("briefing_date").notNull(), // 브리핑 대상 날짜
  marketOpenTime: timestamp("market_open_time").notNull(), // 시장 개시 시각
  summaryPeriod: text("summary_period").notNull().default("1hour"), // 요약 기간 (1hour, 2hour 등)
  
  // Market analysis sections
  keyEvents: jsonb("key_events"), // 주요 이벤트 목록 [{event, time, impact, description}]
  marketMovements: jsonb("market_movements"), // 시장 움직임 {kospi, kosdaq, sectors: [{name, change, volume}]}
  sectorHighlights: jsonb("sector_highlights"), // 섹터별 하이라이트 [{sector, performance, topStocks, reasons}]
  tradingVolumeAnalysis: jsonb("trading_volume_analysis"), // 거래량 분석 {totalVolume, compared_to_avg, unusual_volumes}
  
  // AI-generated insights
  aiInsights: text("ai_insights").notNull(), // AI 생성 인사이트 및 요약
  importanceScore: decimal("importance_score", { precision: 3, scale: 2 }), // 브리핑 중요도 (0-1)
  marketSentiment: text("market_sentiment"), // positive, negative, neutral
  
  // Data sources and metadata
  dataSourceIds: text("data_source_ids").array(), // 사용된 데이터 소스 ID들
  analysisModel: text("analysis_model").default("gpt-4"), // 사용된 AI 모델
  processingTime: integer("processing_time"), // 분석 처리 시간 (milliseconds)
  
  // Status and validation
  status: text("status").notNull().default("active"), // active, archived, draft
  isManuallyReviewed: boolean("is_manually_reviewed").default(false), // 수동 검토 여부
  reviewNotes: text("review_notes"), // 검토자 노트
  
  generatedBy: varchar("generated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  briefingDateIdx: index("morning_briefing_date_idx").on(table.briefingDate),
  statusIdx: index("morning_briefing_status_idx").on(table.status),
  importanceIdx: index("morning_briefing_importance_idx").on(table.importanceScore),
  generatedByIdx: index("morning_briefing_generated_by_idx").on(table.generatedBy),
}));

export const morningBriefingRelations = relations(morningBriefing, ({ one }) => ({
  generatedBy: one(users, {
    fields: [morningBriefing.generatedBy],
    references: [users.id],
  }),
}));

// Causal analysis for market movement reasoning (인과시황)
export const causalAnalysis = pgTable("causal_analysis", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  analysisDate: timestamp("analysis_date").notNull(), // 분석 대상 날짜/시각
  timePeriod: text("time_period").notNull(), // 분석 기간 (5min, 15min, 1hour, etc.)
  
  // Market movement detection
  marketEvent: text("market_event").notNull(), // 감지된 시장 이벤트 (price_spike, volume_surge, sector_rotation)
  priceMovement: jsonb("price_movement").notNull(), // 가격 변동 상세 {symbol, before, after, change_pct, timeframe}
  volumeSpike: jsonb("volume_spike"), // 거래량 급등 정보 {symbol, normal_volume, spike_volume, spike_ratio}
  
  // AI-identified causal factors
  identifiedCauses: jsonb("identified_causes").notNull(), // 식별된 원인들 [{type, description, importance, evidence}]
  correlationStrength: decimal("correlation_strength", { precision: 3, scale: 2 }), // 상관관계 강도 (0-1)
  
  // Multi-factor analysis
  newsFactors: jsonb("news_factors"), // 뉴스 관련 요인 [{news_id, headline, sentiment, relevance_score}]
  technicalFactors: jsonb("technical_factors"), // 기술적 요인 [{indicator, signal, strength, timeframe}]
  marketSentiment: text("market_sentiment"), // positive, negative, neutral, mixed
  
  // AI reasoning and confidence
  aiReasoning: text("ai_reasoning").notNull(), // AI의 추론 과정 설명
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).notNull(), // AI 분석 신뢰도 (0-1)
  alternativeExplanations: text("alternative_explanations").array(), // 대안 설명들
  
  // Data sources and metadata
  dataSourceIds: text("data_source_ids").array(), // 사용된 데이터 소스 ID들
  processingTime: integer("processing_time"), // 분석 처리 시간 (milliseconds)
  modelVersion: text("model_version").default("gpt-5"), // 사용된 AI 모델 버전
  
  // Validation and review
  isValidated: boolean("is_validated").default(false), // 분석 검증 여부
  validatedBy: varchar("validated_by").references(() => users.id), // 검증자
  validationNotes: text("validation_notes"), // 검증 노트
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  analysisDateIdx: index("causal_analysis_date_idx").on(table.analysisDate),
  marketEventIdx: index("causal_market_event_idx").on(table.marketEvent),
  confidenceIdx: index("causal_confidence_idx").on(table.confidenceScore),
  timePeriodIdx: index("causal_time_period_idx").on(table.timePeriod),
  createdByIdx: index("causal_created_by_idx").on(table.createdBy),
}));

export const causalAnalysisRelations = relations(causalAnalysis, ({ one }) => ({
  createdBy: one(users, {
    fields: [causalAnalysis.createdBy],
    references: [users.id],
  }),
  validatedBy: one(users, {
    fields: [causalAnalysis.validatedBy],
    references: [users.id],
  }),
}));

export const insertLayoutTemplateSchema = createInsertSchema(layoutTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMorningBriefingSchema = createInsertSchema(morningBriefing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCausalAnalysisSchema = createInsertSchema(causalAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ETF Investment Guide Chatbot Insert Schemas
export const insertEtfProductSchema = createInsertSchema(etfProducts).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertEtfMetricSchema = createInsertSchema(etfMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRiskProfileSchema = createInsertSchema(userRiskProfile).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEtfChatSessionSchema = createInsertSchema(etfChatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEtfChatMessageSchema = createInsertSchema(etfChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertGuardrailPolicySchema = createInsertSchema(guardrailPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEtfBotConfigSchema = createInsertSchema(etfBotConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEtfRecommendationSettingsSchema = createInsertSchema(etfRecommendationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ETF Investment Guide Select Types
export type EtfProduct = typeof etfProducts.$inferSelect;
export type EtfMetric = typeof etfMetrics.$inferSelect;
export type UserRiskProfile = typeof userRiskProfile.$inferSelect;
export type EtfChatSession = typeof etfChatSessions.$inferSelect;
export type EtfChatMessage = typeof etfChatMessages.$inferSelect;
export type GuardrailPolicy = typeof guardrailPolicies.$inferSelect;
export type EtfBotConfig = typeof etfBotConfigs.$inferSelect;
export type EtfRecommendationSettings = typeof etfRecommendationSettings.$inferSelect;

// ETF Investment Guide Insert Types
export type InsertEtfProduct = z.infer<typeof insertEtfProductSchema>;
export type InsertEtfMetric = z.infer<typeof insertEtfMetricSchema>;
export type InsertUserRiskProfile = z.infer<typeof insertUserRiskProfileSchema>;
export type InsertEtfChatSession = z.infer<typeof insertEtfChatSessionSchema>;
export type InsertEtfChatMessage = z.infer<typeof insertEtfChatMessageSchema>;
export type InsertGuardrailPolicy = z.infer<typeof insertGuardrailPolicySchema>;
export type InsertEtfBotConfig = z.infer<typeof insertEtfBotConfigSchema>;
export type InsertEtfRecommendationSettings = z.infer<typeof insertEtfRecommendationSettingsSchema>;

// Enhanced Zod schemas with decimal coercion and strict validation
export const etfProductEnhancedSchema = createInsertSchema(etfProducts, {
  expenseRatio: z.coerce.number().min(0).max(1).optional(),
  riskScore: z.coerce.number().min(0).max(10).optional(),
  aum: z.coerce.number().min(0).optional(),
  spreadBps: z.coerce.number().min(0).optional(),
  holdingsTop: z.array(z.object({
    symbol: z.string(),
    name: z.string(),
    weight: z.number().min(0).max(100),
    sector: z.string().optional()
  })).optional(),
  metadata: z.object({
    inceptionDate: z.string().optional(),
    domicile: z.string().optional(),
    currency: z.string().optional(),
    distributionFrequency: z.string().optional(),
    distributionYield: z.number().optional(),
    sectors: z.array(z.object({
      name: z.string(),
      weight: z.number().min(0).max(100)
    })).optional(),
    geographicAllocation: z.array(z.object({
      region: z.string(),
      weight: z.number().min(0).max(100)
    })).optional(),
    fundamentals: z.object({
      pe: z.number().optional(),
      pb: z.number().optional(),
      dividend_yield: z.number().optional()
    }).optional(),
    esgScore: z.number().min(0).max(100).optional(),
    carbonIntensity: z.number().min(0).optional(),
    benchmark: z.string().optional(),
    tradingCurrency: z.string().optional(),
    primaryExchange: z.string().optional(),
    legalStructure: z.string().optional(),
    replicationMethod: z.string().optional(),
    dividendTreatment: z.string().optional(),
    securities_lending: z.boolean().optional(),
    keywords: z.array(z.string()).optional()
  }).optional()
}).omit({ id: true, createdAt: true, lastUpdated: true });

export const etfMetricEnhancedSchema = createInsertSchema(etfMetrics, {
  nav: z.coerce.number().min(0).optional(),
  price: z.coerce.number().min(0).optional(),
  premiumDiscount: z.coerce.number().optional(),
  vol30d: z.coerce.number().min(0).optional(),
  ret1m: z.coerce.number().optional(),
  ret3m: z.coerce.number().optional(),
  ret1y: z.coerce.number().optional(),
  trackingDiff: z.coerce.number().optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const userRiskProfileEnhancedSchema = createInsertSchema(userRiskProfile, {
  constraints: z.object({
    max_single_position: z.number().min(0).max(100).optional(),
    min_liquidity: z.number().min(0).optional(),
    max_expense_ratio: z.number().min(0).max(1).optional(),
    preferred_regions: z.array(z.string()).optional(),
    preferred_asset_classes: z.array(z.string()).optional(),
    esg_required: z.boolean().optional(),
    ethical_screening: z.boolean().optional(),
    currency_hedging: z.enum(["none", "partial", "full"]).optional(),
    rebalancing_frequency: z.enum(["monthly", "quarterly", "semi_annual", "annual"]).optional(),
    target_diversification: z.number().min(1).optional()
  }).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

export const etfChatMessageEnhancedSchema = createInsertSchema(etfChatMessages, {
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.string(),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  safetyFlags: z.object({
    flagged: z.boolean(),
    categories: z.array(z.string()),
    scores: z.record(z.number())
  }).optional()
}).omit({ id: true, createdAt: true });

export const guardrailPolicyEnhancedSchema = createInsertSchema(guardrailPolicies, {
  rulesJson: z.object({
    financial_advice_disclaimer: z.boolean().optional(),
    max_portfolio_concentration: z.number().min(0).max(100).optional(),
    prohibited_recommendations: z.array(z.string()).optional(),
    risk_warnings: z.record(z.array(z.string())).optional(),
    compliance_checks: z.array(z.string()).optional(),
    content_filtering: z.object({
      keywords: z.array(z.string()),
      actions: z.array(z.string())
    }).optional(),
    user_verification: z.array(z.string()).optional(),
    geographic_restrictions: z.array(z.string()).optional(),
    investment_limits: z.object({
      min_amount: z.number().min(0),
      max_amount: z.number().min(0)
    }).optional(),
    disclosure_requirements: z.array(z.string()).optional()
  })
}).omit({ id: true, createdAt: true, updatedAt: true });

export const etfBotConfigEnhancedSchema = createInsertSchema(etfBotConfigs, {
  temperature: z.coerce.number().min(0).max(2),
  topP: z.coerce.number().min(0).max(1)
}).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type FinancialData = typeof financialData.$inferSelect;
export type InsertFinancialData = z.infer<typeof insertFinancialDataSchema>;

export type Theme = typeof themes.$inferSelect;
export type InsertTheme = z.infer<typeof insertThemeSchema>;

export type NewsData = typeof newsData.$inferSelect;
export type InsertNewsData = z.infer<typeof insertNewsDataSchema>;

export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;

export type PythonScript = typeof pythonScripts.$inferSelect;
export type InsertPythonScript = z.infer<typeof insertPythonScriptSchema>;

export type ApiCall = typeof apiCalls.$inferSelect;
export type InsertApiCall = z.infer<typeof insertApiCallSchema>;

export type WorkflowFolder = typeof workflowFolders.$inferSelect;
export type InsertWorkflowFolder = z.infer<typeof insertWorkflowFolderSchema>;
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;

export type WorkflowNodeResult = typeof workflowNodeResults.$inferSelect;
export type InsertWorkflowNodeResult = z.infer<typeof insertWorkflowNodeResultSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type MarketAnalysis = typeof marketAnalysis.$inferSelect;
export type InsertMarketAnalysis = z.infer<typeof insertMarketAnalysisSchema>;

export type MacroAnalysis = typeof macroAnalysis.$inferSelect;
export type InsertMacroAnalysis = z.infer<typeof insertMacroAnalysisSchema>;

export type LayoutTemplate = typeof layoutTemplates.$inferSelect;
export type InsertLayoutTemplate = z.infer<typeof insertLayoutTemplateSchema>;

export type MorningBriefing = typeof morningBriefing.$inferSelect;
export type InsertMorningBriefing = z.infer<typeof insertMorningBriefingSchema>;

export type CausalAnalysis = typeof causalAnalysis.$inferSelect;
export type InsertCausalAnalysis = z.infer<typeof insertCausalAnalysisSchema>;


// Quality Evaluation Tables for Report Assessment
export const reportQualityMetrics = pgTable("report_quality_metrics", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  reportId: varchar("report_id").notNull(),
  reportType: varchar("report_type").notNull(), // news_analysis, market_report, theme_summary, morning_briefing, macro_analysis
  
  // Quality indicators (0-1 scale)
  accuracyScore: decimal("accuracy_score", { precision: 3, scale: 2 }), // 정확성 점수
  relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }), // 관련성 점수
  completenessScore: decimal("completeness_score", { precision: 3, scale: 2 }), // 완전성 점수
  timelinessScore: decimal("timeliness_score", { precision: 3, scale: 2 }), // 시의성 점수
  readabilityScore: decimal("readability_score", { precision: 3, scale: 2 }), // 가독성 점수
  overallScore: decimal("overall_score", { precision: 3, scale: 2 }), // 종합 점수
  
  // User feedback
  userRating: integer("user_rating"), // 1-5 stars
  userFeedback: text("user_feedback"),
  
  // Improvement suggestions
  improvementSuggestions: jsonb("improvement_suggestions"), // [{category, suggestion, priority}]
  identifiedIssues: jsonb("identified_issues"), // [{type, description, severity}]
  
  // Metadata
  evaluatedAt: timestamp("evaluated_at").defaultNow(),
  evaluatedBy: varchar("evaluated_by").default("system"), // system, user, ai
  evaluationModel: varchar("evaluation_model").default("gpt-4"), // 평가 모델
  processingTime: integer("processing_time"), // milliseconds
  
  // Comparison data
  benchmarkComparison: jsonb("benchmark_comparison"), // {avg_score, percentile, category_avg}
  previousScores: jsonb("previous_scores"), // Historical score tracking
  
  createdBy: varchar("created_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  reportIdIdx: index("quality_report_id_idx").on(table.reportId),
  reportTypeIdx: index("quality_report_type_idx").on(table.reportType),
  overallScoreIdx: index("quality_overall_score_idx").on(table.overallScore),
  evaluatedAtIdx: index("quality_evaluated_at_idx").on(table.evaluatedAt),
  userRatingIdx: index("quality_user_rating_idx").on(table.userRating),
}));

// Feedback log for tracking all feedback activities
export const feedbackLog = pgTable("feedback_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  entityType: varchar("entity_type").notNull(), // report, analysis, workflow, prompt
  entityId: varchar("entity_id").notNull(),
  
  // Feedback details
  feedbackType: varchar("feedback_type").notNull(), // positive, negative, neutral, suggestion
  feedbackCategory: varchar("feedback_category"), // accuracy, relevance, completeness, timeliness, readability
  feedbackText: text("feedback_text"),
  feedbackScore: integer("feedback_score"), // 1-5 for rating-based feedback
  
  // Action and response
  actionRequired: boolean("action_required").default(false),
  actionTaken: jsonb("action_taken"), // {type, description, timestamp, result}
  resolutionStatus: varchar("resolution_status").default("pending"), // pending, in_progress, resolved, dismissed
  
  // Source tracking
  submittedBy: varchar("submitted_by").references(() => users.id),
  submissionChannel: varchar("submission_channel").default("web"), // web, api, auto, email
  
  // Metadata
  priority: varchar("priority").default("medium"), // low, medium, high, critical
  tags: text("tags").array(), // Searchable tags
  relatedEntityIds: text("related_entity_ids").array(), // Other related entities
  
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  resolvedAt: timestamp("resolved_at"),
}, (table) => ({
  entityIdx: index("feedback_entity_idx").on(table.entityType, table.entityId),
  feedbackTypeIdx: index("feedback_type_idx").on(table.feedbackType),
  resolutionStatusIdx: index("feedback_resolution_idx").on(table.resolutionStatus),
  priorityIdx: index("feedback_priority_idx").on(table.priority),
  createdAtIdx: index("feedback_created_at_idx").on(table.createdAt),
  submittedByIdx: index("feedback_submitted_by_idx").on(table.submittedBy),
  tagsIdx: index("feedback_tags_idx").using("gin", sql`tags`),
}));

// Quality improvement tracking
export const qualityImprovements = pgTable("quality_improvements", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // Improvement details
  improvementType: varchar("improvement_type").notNull(), // model_update, prompt_tuning, data_enrichment, process_change
  targetEntity: varchar("target_entity").notNull(), // What is being improved
  targetEntityId: varchar("target_entity_id"),
  
  // Improvement plan
  description: text("description").notNull(),
  expectedOutcome: text("expected_outcome"),
  metrics: jsonb("metrics"), // {before, after, improvement_pct}
  
  // Implementation
  implementationStatus: varchar("implementation_status").default("planned"), // planned, in_progress, completed, cancelled
  implementationSteps: jsonb("implementation_steps"), // [{step, status, timestamp}]
  
  // Results
  actualOutcome: text("actual_outcome"),
  successMetrics: jsonb("success_metrics"), // Measured results
  lessonLearned: text("lesson_learned"),
  
  // Metadata
  priority: varchar("priority").default("medium"), // low, medium, high, critical
  effort: varchar("effort"), // low, medium, high
  impact: varchar("impact"), // low, medium, high
  
  plannedDate: timestamp("planned_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  typeIdx: index("improvement_type_idx").on(table.improvementType),
  statusIdx: index("improvement_status_idx").on(table.implementationStatus),
  priorityIdx: index("improvement_priority_idx").on(table.priority),
  plannedDateIdx: index("improvement_planned_date_idx").on(table.plannedDate),
}));

// A/B Testing for quality improvements
export const abTestingExperiments = pgTable("ab_testing_experiments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // Experiment details
  experimentName: varchar("experiment_name").notNull(),
  description: text("description"),
  hypothesis: text("hypothesis").notNull(),
  
  // Test configuration
  testType: varchar("test_type").notNull(), // prompt, model, process, ui
  controlVersion: jsonb("control_version").notNull(), // Original configuration
  testVersion: jsonb("test_version").notNull(), // Test configuration
  
  // Experiment parameters
  sampleSize: integer("sample_size"),
  confidenceLevel: decimal("confidence_level", { precision: 3, scale: 2 }).default(sql`0.95`),
  minimumDetectableEffect: decimal("minimum_detectable_effect", { precision: 5, scale: 2 }),
  
  // Results
  controlMetrics: jsonb("control_metrics"), // Performance metrics for control
  testMetrics: jsonb("test_metrics"), // Performance metrics for test
  statisticalSignificance: decimal("statistical_significance", { precision: 5, scale: 4 }),
  winner: varchar("winner"), // control, test, inconclusive
  
  // Status
  status: varchar("status").default("draft"), // draft, running, completed, cancelled
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // Metadata
  tags: text("tags").array(),
  relatedExperiments: text("related_experiments").array(),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("ab_status_idx").on(table.status),
  testTypeIdx: index("ab_test_type_idx").on(table.testType),
  startDateIdx: index("ab_start_date_idx").on(table.startDate),
  winnerIdx: index("ab_winner_idx").on(table.winner),
}));

// Quality Evaluation insert schemas
export const insertReportQualityMetricsSchema = createInsertSchema(reportQualityMetrics).omit({
  id: true,
  evaluatedAt: true,
  updatedAt: true,
});

export const insertFeedbackLogSchema = createInsertSchema(feedbackLog).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  resolvedAt: true,
});

export const insertQualityImprovementsSchema = createInsertSchema(qualityImprovements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAbTestingExperimentsSchema = createInsertSchema(abTestingExperiments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Quality Evaluation types
export type ReportQualityMetrics = typeof reportQualityMetrics.$inferSelect;
export type InsertReportQualityMetrics = z.infer<typeof insertReportQualityMetricsSchema>;

export type FeedbackLog = typeof feedbackLog.$inferSelect;
export type InsertFeedbackLog = z.infer<typeof insertFeedbackLogSchema>;

export type QualityImprovements = typeof qualityImprovements.$inferSelect;
export type InsertQualityImprovements = z.infer<typeof insertQualityImprovementsSchema>;

export type AbTestingExperiments = typeof abTestingExperiments.$inferSelect;
export type InsertAbTestingExperiments = z.infer<typeof insertAbTestingExperimentsSchema>;

// A Stage: News Issue Generation Tables
// A200_주요이벤트 (Major Events)
export const majorEvents = pgTable("major_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  eventDate: text("event_date").notNull(), // 기준일자
  eventTime: text("event_time").notNull(), // 기준시간
  situationType: text("situation_type").notNull(), // 시황구분(테마)
  majorIssueName: text("major_issue_name").notNull(), // 주요이슈명 (증시이벤트1~4)
  majorIssueContent: text("major_issue_content").notNull(), // 주요이슈 내용 (시황)
  relatedNewsCount: integer("related_news_count").default(0), // 관련뉴스수
  createdAt: timestamp("created_at").defaultNow(), // 생성일시
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventDateIdx: index("major_events_event_date_idx").on(table.eventDate),
  eventTimeIdx: index("major_events_event_time_idx").on(table.eventTime),
  issueNameIdx: index("major_events_issue_name_idx").on(table.majorIssueName),
}));

// A210_주요이벤트(연관뉴스) (Related News for Major Events)
export const majorEventsRelatedNews = pgTable("major_events_related_news", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  eventDate: text("event_date").notNull(), // 기준일자
  eventTime: text("event_time").notNull(), // 기준시간
  majorIssueName: text("major_issue_name").notNull(), // 주요이슈명
  newsTitle: text("news_title").notNull(), // 뉴스제목
  mediaCompany: text("media_company"), // 언론사명
  reportTime: timestamp("report_time"), // 보도시각
  nid: text("nid"), // news id
  createdAt: timestamp("created_at").defaultNow(), // 생성일시
}, (table) => ({
  eventDateIdx: index("major_events_news_event_date_idx").on(table.eventDate),
  issueNameIdx: index("major_events_news_issue_name_idx").on(table.majorIssueName),
  nidIdx: index("major_events_news_nid_idx").on(table.nid),
}));

// B Stage: Enhanced Quantitative Market Metrics
export const quantitativeMetrics = pgTable("quantitative_metrics", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  symbol: text("symbol").notNull(), // 지수 코드
  market: text("market").notNull(), // 국내지수, 해외지수
  metricDate: text("metric_date").notNull(), // 기준일자
  metricTime: text("metric_time").notNull(), // 기준시간
  currentPrice: decimal("current_price", { precision: 15, scale: 4 }), // 현재가
  changeRate: decimal("change_rate", { precision: 5, scale: 2 }), // 변동률
  twentyDayAverage: decimal("twenty_day_average", { precision: 15, scale: 4 }), // 20일 평균
  twentyDayStdDev: decimal("twenty_day_std_dev", { precision: 15, scale: 4 }), // 20일 표준편차
  zScore: decimal("z_score", { precision: 10, scale: 4 }), // z-score
  anomalyLevel: text("anomaly_level").notNull(), // anomaly level (고/중/저)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  symbolIdx: index("quant_metrics_symbol_idx").on(table.symbol),
  metricDateIdx: index("quant_metrics_date_idx").on(table.metricDate),
  anomalyLevelIdx: index("quant_metrics_anomaly_idx").on(table.anomalyLevel),
}));

// C Stage: Theme and Industry Analysis Tables
// InfoStock theme information
export const infoStockThemes = pgTable("infostock_themes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  themeCode: text("theme_code").notNull().unique(), // 인포스탁테마코드
  themeName: text("theme_name").notNull(), // 테마명
  changeRate: decimal("change_rate", { precision: 5, scale: 2 }), // 등락률
  tradingValue: decimal("trading_value", { precision: 20, scale: 2 }), // 거래대금
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }), // 시가총액
  changeRateScore: decimal("change_rate_score", { precision: 5, scale: 2 }), // 등락률점수
  tradingValueScore: decimal("trading_value_score", { precision: 5, scale: 2 }), // 거래대금점수
  marketCapScore: decimal("market_cap_score", { precision: 5, scale: 2 }), // 시가총액점수
  totalScore: decimal("total_score", { precision: 5, scale: 2 }), // 합산점수
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  themeCodeIdx: index("infostock_themes_code_idx").on(table.themeCode),
  totalScoreIdx: index("infostock_themes_score_idx").on(table.totalScore),
}));

// InfoStock theme stocks mapping
export const infoStockThemeStocks = pgTable("infostock_theme_stocks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  themeCode: text("theme_code").notNull(), // 테마코드
  stockCode: text("stock_code").notNull(), // 종목코드
  stockName: text("stock_name"), // 종목명
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  themeCodeIdx: index("theme_stocks_theme_idx").on(table.themeCode),
  stockCodeIdx: index("theme_stocks_stock_idx").on(table.stockCode),
}));

// A300_산업테마시황 (Industry Theme Market Conditions)
export const industryThemeConditions = pgTable("industry_theme_conditions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  situationType: text("situation_type").notNull(), // 시황구분
  themeCode: text("theme_code").notNull(), // 인포스탁테마코드
  newsDate: text("news_date").notNull(), // 뉴스 n_date
  newsTime: text("news_time").notNull(), // 뉴스 n_time
  issueTitle: text("issue_title").notNull(), // 이슈 제목
  issueContent: text("issue_content").notNull(), // 이슈 본문
  isNew: boolean("is_new").default(true), // 신규 여부
  relatedNewsTitle: text("related_news_title"), // 관련뉴스제목
  relatedNewsId: text("related_news_id").array(), // 관련뉴스ID
  changeFromPrevious: decimal("change_from_previous", { precision: 5, scale: 2 }), // 이전 대비 변화율
  riskLevel: text("risk_level"), // 위험 수준
  affectedStocks: text("affected_stocks").array(), // 영향받는 종목들
  marketImpactScore: decimal("market_impact_score", { precision: 3, scale: 2 }), // 시장 영향 점수
  createdAt: timestamp("created_at").defaultNow(), // 생성일시
}, (table) => ({
  themeCodeIdx: index("industry_theme_code_idx").on(table.themeCode),
  newsDateIdx: index("industry_theme_date_idx").on(table.newsDate),
  isNewIdx: index("industry_theme_new_idx").on(table.isNew),
}));

// A310_산업테마시황(연관뉴스) (Related News for Industry Themes)
export const industryThemeRelatedNews = pgTable("industry_theme_related_news", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  themeCode: text("theme_code").notNull(), // 테마코드
  newsDate: text("news_date").notNull(), // 뉴스 날짜
  newsTime: text("news_time").notNull(), // 뉴스 시간
  newsTitle: text("news_title").notNull(), // 뉴스 제목
  newsId: text("news_id").notNull(), // 뉴스 ID
  isRepresentative: boolean("is_representative").default(false), // 대표뉴스 여부
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  themeCodeIdx: index("industry_theme_news_theme_idx").on(table.themeCode),
  newsDateIdx: index("industry_theme_news_date_idx").on(table.newsDate),
  isRepresentativeIdx: index("industry_theme_news_rep_idx").on(table.isRepresentative),
}));

// D Stage: Macro Analysis Integration
export const macroMarketConditions = pgTable("macro_market_conditions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  analysisDate: text("analysis_date").notNull(), // 분석 기준일자
  analysisTime: text("analysis_time").notNull(), // 분석 기준시간
  summary: text("summary").notNull(), // 요약 (최대 3줄)
  majorEventsAnalysis: text("major_events_analysis"), // A단계 분석 결과
  quantitativeAnalysis: text("quantitative_analysis"), // B단계 분석 결과
  themeAnalysis: text("theme_analysis"), // C단계 분석 결과
  marketImportanceLevel: text("market_importance_level"), // 시장 중요도 (고/중/저)
  anomalySignals: text("anomaly_signals").array(), // 이상신호 리스트
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }), // 신뢰도 점수
  sourceDataIds: text("source_data_ids").array(), // 소스 데이터 ID들
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  analysisDateIdx: index("macro_conditions_date_idx").on(table.analysisDate),
  importanceLevelIdx: index("macro_conditions_importance_idx").on(table.marketImportanceLevel),
  confidenceIdx: index("macro_conditions_confidence_idx").on(table.confidenceScore),
}));

// Enhanced News Data for Stage Processing
export const processedNewsData = pgTable("processed_news_data", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  originalNewsId: varchar("original_news_id").references(() => newsData.id),
  economicScore: decimal("economic_score", { precision: 3, scale: 2 }), // 경제점수
  stockMarketScore: decimal("stock_market_score", { precision: 3, scale: 2 }), // 증시점수
  similarityScore: decimal("similarity_score", { precision: 3, scale: 2 }), // 유사도점수
  advertisementScore: decimal("advertisement_score", { precision: 3, scale: 2 }), // 광고점수
  stockEvents: text("stock_events").array(), // 증시이벤트1~4
  processedAt: timestamp("processed_at").defaultNow(),
  isFiltered: boolean("is_filtered").default(false), // 필터링 여부
}, (table) => ({
  originalNewsIdx: index("processed_news_original_idx").on(table.originalNewsId),
  economicScoreIdx: index("processed_news_economic_idx").on(table.economicScore),
  stockMarketScoreIdx: index("processed_news_stock_idx").on(table.stockMarketScore),
  processedAtIdx: index("processed_news_processed_idx").on(table.processedAt),
}));

// Insert schemas for new tables
export const insertMajorEventsSchema = createInsertSchema(majorEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMajorEventsRelatedNewsSchema = createInsertSchema(majorEventsRelatedNews).omit({
  id: true,
  createdAt: true,
});

export const insertQuantitativeMetricsSchema = createInsertSchema(quantitativeMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertInfoStockThemesSchema = createInsertSchema(infoStockThemes).omit({
  id: true,
  updatedAt: true,
});

export const insertInfoStockThemeStocksSchema = createInsertSchema(infoStockThemeStocks).omit({
  id: true,
  createdAt: true,
});

export const insertIndustryThemeConditionsSchema = createInsertSchema(industryThemeConditions).omit({
  id: true,
  createdAt: true,
});

export const insertIndustryThemeRelatedNewsSchema = createInsertSchema(industryThemeRelatedNews).omit({
  id: true,
  createdAt: true,
});

export const insertMacroMarketConditionsSchema = createInsertSchema(macroMarketConditions).omit({
  id: true,
  createdAt: true,
});

export const insertProcessedNewsDataSchema = createInsertSchema(processedNewsData).omit({
  id: true,
  processedAt: true,
});

// Types for new tables
export type MajorEvents = typeof majorEvents.$inferSelect;
export type InsertMajorEvents = z.infer<typeof insertMajorEventsSchema>;

export type MajorEventsRelatedNews = typeof majorEventsRelatedNews.$inferSelect;
export type InsertMajorEventsRelatedNews = z.infer<typeof insertMajorEventsRelatedNewsSchema>;

export type QuantitativeMetrics = typeof quantitativeMetrics.$inferSelect;
export type InsertQuantitativeMetrics = z.infer<typeof insertQuantitativeMetricsSchema>;

export type InfoStockThemes = typeof infoStockThemes.$inferSelect;
export type InsertInfoStockThemes = z.infer<typeof insertInfoStockThemesSchema>;

export type InfoStockThemeStocks = typeof infoStockThemeStocks.$inferSelect;
export type InsertInfoStockThemeStocks = z.infer<typeof insertInfoStockThemeStocksSchema>;

export type IndustryThemeConditions = typeof industryThemeConditions.$inferSelect;
export type InsertIndustryThemeConditions = z.infer<typeof insertIndustryThemeConditionsSchema>;

export type IndustryThemeRelatedNews = typeof industryThemeRelatedNews.$inferSelect;
export type InsertIndustryThemeRelatedNews = z.infer<typeof insertIndustryThemeRelatedNewsSchema>;

export type MacroMarketConditions = typeof macroMarketConditions.$inferSelect;
export type InsertMacroMarketConditions = z.infer<typeof insertMacroMarketConditionsSchema>;

export type ProcessedNewsData = typeof processedNewsData.$inferSelect;
export type InsertProcessedNewsData = z.infer<typeof insertProcessedNewsDataSchema>;

// Schema recommendation types for AI-based filter suggestions
export const schemaRecommendationRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
});

export const schemaRecommendationResponseSchema = z.object({
  financialFilters: z.object({
    symbol: z.string().optional(),
    market: z.string().optional(),
    country: z.string().optional(),
    dataType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
  newsFilters: z.object({
    category: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
  rationale: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type SchemaRecommendationRequest = z.infer<typeof schemaRecommendationRequestSchema>;
export type SchemaRecommendationResponse = z.infer<typeof schemaRecommendationResponseSchema>;

// Morning Briefing Analysis Types
export interface MarketMovementData {
  kospi?: FinancialData;
  kosdaq?: FinancialData;
  sectors: SectorMovement[];
}

export interface SectorMovement {
  sector: string;
  avgPrice: number;
  volume: number;
  topStocks: StockSummary[];
  changeRate?: number;
  performance?: number;
}

export interface StockSummary {
  symbol: string;
  price: string | null;
  volume: number | null;
  changeAmount?: number;
  changeRate?: number;
}

export interface TradingVolumeAnalysis {
  totalVolume: number;
  compared_to_avg: 'above_average' | 'below_average' | 'normal';
  avgVolume?: number;
  volumeRatio?: number;
  unusual_volumes: FinancialData[];
  historicalComparison?: {
    period: string;
    percentile: number;
    standardDeviations: number;
  };
}

export interface MarketEvent {
  event: string;
  time: Date | string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  importance?: number;
  relatedSymbols?: string[];
}

export interface SectorHighlight {
  sector: string;
  performance: number;
  topStocks: StockSummary[];
  reasons: string[];
  newsCount?: number;
  changeRate?: number;
  marketCap?: number;
}

export interface AIInsightsResult {
  summary: string;
  keyInsights: string[];
  marketOutlook: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  riskFactors?: string[];
  opportunities?: string[];
  recommendations?: string[];
}

export interface AnalysisContext {
  marketMovements: MarketMovementData;
  keyEvents: KeyEvent[];
  sectorHighlights: SectorHighlight[];
  tradingVolumeAnalysis: TradingVolumeAnalysis;
  timeframe: {
    start: Date;
    end: Date;
    duration: string;
  };
}

// Causal Analysis Types
export interface CauseIdentification {
  type: 'significant_price_movement' | 'news_driven' | 'technical_indicator' | 'volume_spike' | 'sector_rotation';
  description: string;
  importance: number;
  evidence: any;
  timeRelevance: number;
  marketImpact: 'high' | 'medium' | 'low';
}

export interface NewsFactor {
  news_id: string;
  headline: string;
  sentiment: string;
  relevance_score: number;
  publishedAt: Date | string;
  marketImpactLevel?: 'high' | 'medium' | 'low';
}

export interface TechnicalFactor {
  indicator: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  timeframe: number | Date;
  reliability: number;
}

export interface VolumeSpike {
  symbol: string;
  normal_volume: number;
  spike_volume: number;
  spike_ratio: number;
  timeDetected: Date;
  significance: 'high' | 'medium' | 'low';
}

// Enhanced error handling interfaces
export interface AnalysisError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  source: 'data_fetch' | 'analysis' | 'ai_service' | 'validation';
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: AnalysisError;
  metadata: {
    processingTime: number;
    dataQuality: 'high' | 'medium' | 'low';
    confidence: number;
  };
}

// Theme summary data structure for in-memory storage
export interface ThemeSummary {
  themeId: string;
  summary: string;
  keyPoints: string[];
  topEntities: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  newsCount: number;
  lastUpdated: Date;
}

// Predefined themes for the stock market
export const PREDEFINED_THEMES: Omit<InsertTheme, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'tech-innovation',
    name: '기술혁신',
    description: 'AI, 반도체, 소프트웨어 등 첨단 기술 관련',
    color: '#3B82F6',
    icon: 'cpu',
    order: 1
  },
  {
    id: 'green-energy',
    name: '친환경 에너지',
    description: '신재생 에너지, 배터리, 전기차 관련',
    color: '#10B981',
    icon: 'battery',
    order: 2
  },
  {
    id: 'bio-health',
    name: '바이오헬스',
    description: '제약, 의료기기, 헬스케어 관련',
    color: '#EC4899',
    icon: 'heart',
    order: 3
  },
  {
    id: 'finance',
    name: '금융',
    description: '은행, 보험, 증권 관련',
    color: '#8B5CF6',
    icon: 'banknote',
    order: 4
  },
  {
    id: 'consumer',
    name: '소비재',
    description: '유통, 식음료, 화장품 관련',
    color: '#F59E0B',
    icon: 'shopping-cart',
    order: 5
  },
  {
    id: 'manufacturing',
    name: '제조업',
    description: '자동차, 기계, 철강 관련',
    color: '#6B7280',
    icon: 'factory',
    order: 6
  },
  {
    id: 'entertainment',
    name: '엔터테인먼트',
    description: '미디어, 게임, 콘텐츠 관련',
    color: '#F97316',
    icon: 'gamepad-2',
    order: 7
  },
  {
    id: 'real-estate',
    name: '부동산/건설',
    description: '건설, 부동산, 인프라 관련',
    color: '#84CC16',
    icon: 'building-2',
    order: 8
  },
  {
    id: 'defense-space',
    name: '방산/우주',
    description: '방위산업, 항공우주 관련',
    color: '#0EA5E9',
    icon: 'rocket',
    order: 9
  },
  {
    id: 'materials',
    name: '소재/화학',
    description: '화학, 소재, 에너지 관련',
    color: '#A855F7',
    icon: 'flask',
    order: 10
  }
];

// Insert schemas for AI API management tables
export const insertAiServiceProviderSchema = createInsertSchema(aiServiceProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiCategorySchema = createInsertSchema(apiCategories).omit({
  id: true,
  createdAt: true,
});

export const insertApiTestResultSchema = createInsertSchema(apiTestResults).omit({
  id: true,
  testedAt: true,
});

export const insertApiUsageAnalyticsSchema = createInsertSchema(apiUsageAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiTemplateSchema = createInsertSchema(apiTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for AI API management tables
export type AiServiceProvider = typeof aiServiceProviders.$inferSelect;
export type InsertAiServiceProvider = z.infer<typeof insertAiServiceProviderSchema>;

export type ApiCategory = typeof apiCategories.$inferSelect;
export type InsertApiCategory = z.infer<typeof insertApiCategorySchema>;

export type ApiTestResult = typeof apiTestResults.$inferSelect;
export type InsertApiTestResult = z.infer<typeof insertApiTestResultSchema>;

export type ApiUsageAnalytics = typeof apiUsageAnalytics.$inferSelect;
export type InsertApiUsageAnalytics = z.infer<typeof insertApiUsageAnalyticsSchema>;

export type ApiTemplate = typeof apiTemplates.$inferSelect;
export type InsertApiTemplate = z.infer<typeof insertApiTemplateSchema>;

// Pre-defined API Categories for system initialization
export const DEFAULT_API_CATEGORIES = [
  {
    id: 'llm',
    name: 'LLM',
    displayName: '대화형 AI',
    description: 'ChatGPT, Claude 등 대화형 언어 모델',
    icon: 'message-circle',
    color: '#3b82f6',
    order: 1
  },
  {
    id: 'embedding',
    name: 'Embedding',
    displayName: '임베딩',
    description: '텍스트를 벡터로 변환하는 임베딩 모델',
    icon: 'vector',
    color: '#8b5cf6',
    order: 2
  },
  {
    id: 'tts',
    name: 'TTS',
    displayName: '음성 합성',
    description: '텍스트를 음성으로 변환',
    icon: 'volume-2',
    color: '#10b981',
    order: 3
  },
  {
    id: 'stt',
    name: 'STT',
    displayName: '음성 인식',
    description: '음성을 텍스트로 변환',
    icon: 'mic',
    color: '#f59e0b',
    order: 4
  },
  {
    id: 'vision',
    name: 'Vision',
    displayName: '이미지 분석',
    description: '이미지 인식 및 분석',
    icon: 'eye',
    color: '#06b6d4',
    order: 5
  },
  {
    id: 'image-generation',
    name: 'ImageGen',
    displayName: '이미지 생성',
    description: 'AI 이미지 생성',
    icon: 'image',
    color: '#ec4899',
    order: 6
  },
  {
    id: 'translation',
    name: 'Translation',
    displayName: '번역',
    description: '다국어 번역 서비스',
    icon: 'languages',
    color: '#84cc16',
    order: 7
  },
  {
    id: 'ocr',
    name: 'OCR',
    displayName: '문자 인식',
    description: '이미지에서 텍스트 추출',
    icon: 'scan-text',
    color: '#f97316',
    order: 8
  },
  {
    id: 'analysis',
    name: 'Analysis',
    displayName: '분석',
    description: '감정 분석, 텍스트 분석 등',
    icon: 'bar-chart',
    color: '#6366f1',
    order: 9
  },
  {
    id: 'search',
    name: 'Search',
    displayName: '검색',
    description: '의미 검색 및 정보 검색',
    icon: 'search',
    color: '#14b8a6',
    order: 10
  },
  {
    id: 'rag',
    name: 'RAG',
    displayName: 'RAG',
    description: 'Retrieval Augmented Generation',
    icon: 'database',
    color: '#8b5a3c',
    order: 11
  },
  {
    id: 'document-ai',
    name: 'DocumentAI',
    displayName: '문서 AI',
    description: '문서 처리 및 분석',
    icon: 'file-text',
    color: '#dc2626',
    order: 12
  },
  {
    id: 'generation',
    name: 'Generation',
    displayName: '생성',
    description: '콘텐츠 생성 (음악, 비디오 등)',
    icon: 'sparkles',
    color: '#7c3aed',
    order: 13
  }
];

// Pre-defined AI Service Providers for system initialization
export const DEFAULT_AI_SERVICE_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authType: 'bearer',
    documentation: 'https://platform.openai.com/docs',
    website: 'https://openai.com',
    logo: 'openai',
    status: 'active',
    tier: 'premium',
    monthlyQuotaFree: 5000,
    supportedFeatures: ['chat', 'embedding', 'tts', 'stt', 'vision', 'image-generation', 'rag'],
    pricingModel: 'per_token',
    rateLimits: { rpm: 10000, tpm: 300000, rps: 200 }
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    displayName: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    authType: 'api_key',
    documentation: 'https://docs.anthropic.com',
    website: 'https://anthropic.com',
    logo: 'claude',
    status: 'active',
    tier: 'premium',
    monthlyQuotaFree: 0,
    supportedFeatures: ['chat', 'vision', 'document-ai'],
    pricingModel: 'per_token',
    rateLimits: { rpm: 5000, tpm: 400000, rps: 50 }
  },
  {
    id: 'google',
    name: 'Google',
    displayName: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    authType: 'api_key',
    documentation: 'https://ai.google.dev/docs',
    website: 'https://ai.google.dev',
    logo: 'google',
    status: 'active',
    tier: 'standard',
    monthlyQuotaFree: 15000,
    supportedFeatures: ['chat', 'embedding', 'vision', 'document-ai'],
    pricingModel: 'per_token',
    rateLimits: { rpm: 15, tpm: 32000, rps: 1 }
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    displayName: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    authType: 'bearer',
    documentation: 'https://docs.perplexity.ai',
    website: 'https://perplexity.ai',
    logo: 'perplexity',
    status: 'active',
    tier: 'standard',
    monthlyQuotaFree: 0,
    supportedFeatures: ['chat', 'search', 'rag'],
    pricingModel: 'per_token',
    rateLimits: { rpm: 50, tpm: 10000, rps: 1 }
  },
  {
    id: 'luxiacloud',
    name: 'LuxiaCloud',
    displayName: 'Luxia Cloud',
    baseUrl: 'https://platform.luxiacloud.com/api',
    authType: 'api_key',
    documentation: 'https://platform.luxiacloud.com/docs',
    website: 'https://luxiacloud.com',
    logo: 'luxia',
    status: 'active',
    tier: 'standard',
    monthlyQuotaFree: 1000,
    supportedFeatures: ['chat', 'embedding', 'tts', 'stt', 'analysis', 'search', 'rag', 'document-ai', 'generation'],
    pricingModel: 'per_request',
    rateLimits: { rpm: 1000, rps: 10 }
  },
  {
    id: 'together',
    name: 'Together AI',
    displayName: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    authType: 'bearer',
    documentation: 'https://docs.together.ai',
    website: 'https://together.ai',
    logo: 'together',
    status: 'active',
    tier: 'standard',
    monthlyQuotaFree: 5000,
    supportedFeatures: ['chat', 'embedding', 'image-generation'],
    pricingModel: 'per_token',
    rateLimits: { rpm: 600, tpm: 600000, rps: 20 }
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    displayName: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    authType: 'bearer',
    documentation: 'https://readme.fireworks.ai',
    website: 'https://fireworks.ai',
    logo: 'fireworks',
    status: 'active',
    tier: 'standard',
    monthlyQuotaFree: 1000,
    supportedFeatures: ['chat', 'embedding', 'image-generation'],
    pricingModel: 'per_token',
    rateLimits: { rpm: 1000, tpm: 1000000, rps: 20 }
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    displayName: 'Hugging Face',
    baseUrl: 'https://api-inference.huggingface.co',
    authType: 'bearer',
    documentation: 'https://huggingface.co/docs/api-inference',
    website: 'https://huggingface.co',
    logo: 'huggingface',
    status: 'active',
    tier: 'free',
    monthlyQuotaFree: 30000,
    supportedFeatures: ['chat', 'embedding', 'tts', 'stt', 'vision', 'image-generation', 'analysis'],
    pricingModel: 'per_request',
    rateLimits: { rpm: 1000, rps: 10 }
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    displayName: 'ElevenLabs',
    baseUrl: 'https://api.elevenlabs.io/v1',
    authType: 'api_key',
    documentation: 'https://docs.elevenlabs.io',
    website: 'https://elevenlabs.io',
    logo: 'elevenlabs',
    status: 'active',
    tier: 'standard',
    monthlyQuotaFree: 10000,
    supportedFeatures: ['tts'],
    pricingModel: 'per_character',
    rateLimits: { rpm: 20, rps: 2 }
  },
  {
    id: 'assemblyai',
    name: 'AssemblyAI',
    displayName: 'AssemblyAI',
    baseUrl: 'https://api.assemblyai.com/v2',
    authType: 'api_key',
    documentation: 'https://www.assemblyai.com/docs',
    website: 'https://www.assemblyai.com',
    logo: 'assemblyai',
    status: 'active',
    tier: 'standard',
    monthlyQuotaFree: 5,
    supportedFeatures: ['stt', 'analysis'],
    pricingModel: 'per_hour',
    rateLimits: { rpm: 100, rps: 5 }
  },
  {
    id: 'cohere',
    name: 'Cohere',
    displayName: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v1',
    authType: 'bearer',
    documentation: 'https://docs.cohere.com',
    website: 'https://cohere.com',
    logo: 'cohere',
    status: 'active',
    tier: 'standard',
    monthlyQuotaFree: 5000,
    supportedFeatures: ['chat', 'embedding', 'rag', 'search'],
    pricingModel: 'per_token',
    rateLimits: { rpm: 1000, tpm: 1000000, rps: 10 }
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    displayName: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    authType: 'bearer',
    documentation: 'https://docs.mistral.ai',
    website: 'https://mistral.ai',
    logo: 'mistral',
    status: 'active',
    tier: 'standard',
    monthlyQuotaFree: 0,
    supportedFeatures: ['chat', 'embedding'],
    pricingModel: 'per_token',
    rateLimits: { rpm: 1000, tpm: 1000000, rps: 5 }
  }
];

// LuxiaCloud API Configurations - Based on research
export const LUXIACLOUD_APIS = [
  {
    name: 'Luxia Chat 3',
    description: 'Advanced conversational AI model',
    url: '/chat',
    method: 'POST',
    categoryId: 'llm',
    modelName: 'luxia-3',
    inputTypes: ['text'],
    outputTypes: ['text', 'json'],
    supportsStreaming: true,
    inputCost: 0.002,
    outputCost: 0.006,
    costUnit: 'token'
  },
  {
    name: 'Embedding',
    description: 'Text embedding for semantic search',
    url: '/embedding',
    method: 'POST',
    categoryId: 'embedding',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.0001,
    costUnit: 'token'
  },
  {
    name: 'Parse Document',
    description: 'Extract structured data from documents',
    url: '/parse',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text', 'image'],
    outputTypes: ['json'],
    inputCost: 0.01,
    costUnit: 'request'
  },
  {
    name: 'Document AI',
    description: 'Intelligent document processing',
    url: '/document-ai',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['image', 'text'],
    outputTypes: ['json'],
    inputCost: 0.02,
    costUnit: 'request'
  },
  {
    name: 'Text Chunking',
    description: 'Split text into semantic chunks',
    url: '/chunk',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.001,
    costUnit: 'request'
  },
  {
    name: 'Rerank',
    description: 'Rerank search results for relevance',
    url: '/rerank',
    method: 'POST',
    categoryId: 'search',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.001,
    costUnit: 'request'
  },
  {
    name: 'Query Expansion',
    description: 'Expand search queries for better results',
    url: '/query-expansion',
    method: 'POST',
    categoryId: 'search',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.005,
    costUnit: 'request'
  },
  {
    name: 'Triple Extraction',
    description: 'Extract knowledge triples from text',
    url: '/triple-extraction',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.01,
    costUnit: 'request'
  },
  {
    name: 'Text to Speech',
    description: 'Convert text to natural speech',
    url: '/tts',
    method: 'POST',
    categoryId: 'tts',
    inputTypes: ['text'],
    outputTypes: ['audio'],
    inputCost: 0.0001,
    costUnit: 'character'
  },
  {
    name: 'Speech to Text',
    description: 'Convert speech to text',
    url: '/stt',
    method: 'POST',
    categoryId: 'stt',
    inputTypes: ['audio'],
    outputTypes: ['text', 'json'],
    inputCost: 0.01,
    costUnit: 'minute'
  },
  {
    name: 'Semantic Search',
    description: 'Semantic search with vector similarity',
    url: '/semantic-search',
    method: 'POST',
    categoryId: 'search',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.001,
    costUnit: 'request'
  },
  {
    name: 'Hybrid Search',
    description: 'Combined semantic and keyword search',
    url: '/hybrid-search',
    method: 'POST',
    categoryId: 'search',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.002,
    costUnit: 'request'
  },
  {
    name: 'Web Scraper',
    description: 'Extract content from web pages',
    url: '/scrape',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.005,
    costUnit: 'request'
  },
  {
    name: 'Create Report',
    description: 'Generate structured reports from data',
    url: '/create-report',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text', 'json'],
    outputTypes: ['text', 'json'],
    inputCost: 0.02,
    costUnit: 'request'
  },
  {
    name: 'Create Summary',
    description: 'Generate summaries from text',
    url: '/create-summary',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['text'],
    inputCost: 0.01,
    costUnit: 'request'
  },
  {
    name: 'Music Generation',
    description: 'AI-powered music generation',
    url: '/music',
    method: 'POST',
    categoryId: 'generation',
    inputTypes: ['text'],
    outputTypes: ['audio'],
    inputCost: 0.1,
    costUnit: 'request'
  },
  {
    name: 'Video Generation',
    description: 'AI-powered video generation',
    url: '/video',
    method: 'POST',
    categoryId: 'generation',
    inputTypes: ['text', 'image'],
    outputTypes: ['video'],
    inputCost: 0.5,
    costUnit: 'request'
  },
  // Enhanced RAG Pipeline APIs
  {
    name: 'RAG Pipeline',
    description: 'Complete RAG pipeline with vector storage',
    url: '/rag-pipeline',
    method: 'POST',
    categoryId: 'rag',
    inputTypes: ['text', 'json'],
    outputTypes: ['json'],
    supportsStreaming: true,
    inputCost: 0.02,
    costUnit: 'request'
  },
  {
    name: 'Vector Store',
    description: 'Store and retrieve vectors',
    url: '/vector-store',
    method: 'POST',
    categoryId: 'rag',
    inputTypes: ['json'],
    outputTypes: ['json'],
    inputCost: 0.001,
    costUnit: 'vector'
  },
  {
    name: 'Document Loader',
    description: 'Load and process various document formats',
    url: '/document-loader',
    method: 'POST',
    categoryId: 'document-ai',
    inputTypes: ['text', 'image', 'audio'],
    outputTypes: ['json'],
    inputCost: 0.01,
    costUnit: 'document'
  },
  {
    name: 'PDF Parser',
    description: 'Extract text and structure from PDF files',
    url: '/pdf-parser',
    method: 'POST',
    categoryId: 'document-ai',
    inputTypes: ['image'],
    outputTypes: ['json'],
    inputCost: 0.005,
    costUnit: 'page'
  },
  {
    name: 'OCR Engine',
    description: 'Optical character recognition',
    url: '/ocr',
    method: 'POST',
    categoryId: 'ocr',
    inputTypes: ['image'],
    outputTypes: ['text', 'json'],
    inputCost: 0.002,
    costUnit: 'image'
  },
  {
    name: 'Form Recognition',
    description: 'Recognize and extract form data',
    url: '/form-recognition',
    method: 'POST',
    categoryId: 'document-ai',
    inputTypes: ['image'],
    outputTypes: ['json'],
    inputCost: 0.01,
    costUnit: 'form'
  },
  {
    name: 'Table Extraction',
    description: 'Extract tables from documents',
    url: '/table-extraction',
    method: 'POST',
    categoryId: 'document-ai',
    inputTypes: ['image', 'text'],
    outputTypes: ['json'],
    inputCost: 0.008,
    costUnit: 'table'
  },
  {
    name: 'Sentiment Analysis',
    description: 'Analyze text sentiment and emotions',
    url: '/sentiment',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.001,
    costUnit: 'text'
  },
  {
    name: 'Keyword Extraction',
    description: 'Extract keywords and key phrases',
    url: '/keywords',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.001,
    costUnit: 'text'
  },
  {
    name: 'Entity Recognition',
    description: 'Named entity recognition and extraction',
    url: '/entities',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.002,
    costUnit: 'text'
  },
  {
    name: 'Language Detection',
    description: 'Detect language of input text',
    url: '/language-detect',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.0005,
    costUnit: 'text'
  },
  {
    name: 'Text Classification',
    description: 'Classify text into categories',
    url: '/classify',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.002,
    costUnit: 'text'
  },
  {
    name: 'Text Similarity',
    description: 'Calculate similarity between texts',
    url: '/similarity',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.001,
    costUnit: 'comparison'
  },
  {
    name: 'Voice Cloning',
    description: 'Clone and synthesize custom voices',
    url: '/voice-clone',
    method: 'POST',
    categoryId: 'tts',
    inputTypes: ['text', 'audio'],
    outputTypes: ['audio'],
    inputCost: 0.05,
    costUnit: 'voice_sample'
  },
  {
    name: 'Audio Enhancement',
    description: 'Enhance audio quality and clarity',
    url: '/audio-enhance',
    method: 'POST',
    categoryId: 'stt',
    inputTypes: ['audio'],
    outputTypes: ['audio'],
    inputCost: 0.02,
    costUnit: 'minute'
  },
  {
    name: 'Speaker Diarization',
    description: 'Identify different speakers in audio',
    url: '/speaker-diarization',
    method: 'POST',
    categoryId: 'stt',
    inputTypes: ['audio'],
    outputTypes: ['json'],
    inputCost: 0.015,
    costUnit: 'minute'
  },
  {
    name: 'Translation Engine',
    description: 'Multi-language translation service',
    url: '/translate',
    method: 'POST',
    categoryId: 'translation',
    inputTypes: ['text'],
    outputTypes: ['text'],
    inputCost: 0.001,
    costUnit: 'character'
  },
  {
    name: 'Image Captioning',
    description: 'Generate captions for images',
    url: '/image-caption',
    method: 'POST',
    categoryId: 'vision',
    inputTypes: ['image'],
    outputTypes: ['text'],
    inputCost: 0.005,
    costUnit: 'image'
  },
  {
    name: 'Object Detection',
    description: 'Detect and identify objects in images',
    url: '/object-detection',
    method: 'POST',
    categoryId: 'vision',
    inputTypes: ['image'],
    outputTypes: ['json'],
    inputCost: 0.008,
    costUnit: 'image'
  },
  {
    name: 'Face Recognition',
    description: 'Recognize and analyze faces',
    url: '/face-recognition',
    method: 'POST',
    categoryId: 'vision',
    inputTypes: ['image'],
    outputTypes: ['json'],
    inputCost: 0.01,
    costUnit: 'image'
  },
  {
    name: 'Image Search',
    description: 'Search similar images by visual content',
    url: '/image-search',
    method: 'POST',
    categoryId: 'search',
    inputTypes: ['image'],
    outputTypes: ['json'],
    inputCost: 0.005,
    costUnit: 'search'
  },
  {
    name: 'Code Generation',
    description: 'Generate code from natural language',
    url: '/code-generation',
    method: 'POST',
    categoryId: 'llm',
    inputTypes: ['text'],
    outputTypes: ['text'],
    supportsStreaming: true,
    inputCost: 0.003,
    outputCost: 0.009,
    costUnit: 'token'
  },
  {
    name: 'Code Review',
    description: 'Automated code review and analysis',
    url: '/code-review',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.005,
    costUnit: 'request'
  },
  {
    name: 'API Documentation',
    description: 'Generate API documentation from code',
    url: '/api-docs',
    method: 'POST',
    categoryId: 'analysis',
    inputTypes: ['text'],
    outputTypes: ['text'],
    inputCost: 0.01,
    costUnit: 'request'
  },
  {
    name: 'Data Visualization',
    description: 'Create charts and graphs from data',
    url: '/data-viz',
    method: 'POST',
    categoryId: 'generation',
    inputTypes: ['json'],
    outputTypes: ['image', 'json'],
    inputCost: 0.02,
    costUnit: 'chart'
  },
  {
    name: 'Excel Processing',
    description: 'Process and analyze Excel spreadsheets',
    url: '/excel-process',
    method: 'POST',
    categoryId: 'document-ai',
    inputTypes: ['text'],
    outputTypes: ['json'],
    inputCost: 0.01,
    costUnit: 'file'
  },
  {
    name: 'Email Composer',
    description: 'Generate professional emails',
    url: '/email-compose',
    method: 'POST',
    categoryId: 'llm',
    inputTypes: ['text'],
    outputTypes: ['text'],
    inputCost: 0.002,
    costUnit: 'request'
  },
  {
    name: 'Meeting Transcription',
    description: 'Transcribe and summarize meetings',
    url: '/meeting-transcript',
    method: 'POST',
    categoryId: 'stt',
    inputTypes: ['audio'],
    outputTypes: ['text', 'json'],
    inputCost: 0.02,
    costUnit: 'minute'
  },
  {
    name: 'Chatbot Builder',
    description: 'Build custom chatbots with training',
    url: '/chatbot-builder',
    method: 'POST',
    categoryId: 'llm',
    inputTypes: ['text', 'json'],
    outputTypes: ['json'],
    supportsStreaming: true,
    inputCost: 0.01,
    costUnit: 'request'
  },
  {
    name: 'Knowledge Graph',
    description: 'Build and query knowledge graphs',
    url: '/knowledge-graph',
    method: 'POST',
    categoryId: 'rag',
    inputTypes: ['text', 'json'],
    outputTypes: ['json'],
    inputCost: 0.015,
    costUnit: 'query'
  }
];

// Comprehensive API Templates for common use cases
export const DEFAULT_API_TEMPLATES = [
  // Market Analysis Templates
  {
    id: 'nh-market-summary',
    name: 'NH투자증권 시황 분석',
    description: '금융 데이터와 뉴스를 기반으로 한 전문적인 시장 시황 분석 생성',
    categoryId: 'llm',
    useCase: '일일 시황 분석, 투자 리포트, 시장 동향 분석',
    difficulty: 'intermediate',
    estimatedCost: '중비용',
    tags: ['market-analysis', 'finance', 'nh-securities'],
    template: {
      apiCall: 'openai-gpt-4o',
      systemPrompt: `당신은 NH투자증권의 전문 시장 분석가입니다. 다음 지침에 따라 정확하고 전문적인 시장 분석을 제공하세요:

1. 데이터 분석
   - 주요 지수(코스피, 코스닥, S&P500, 나스닥) 변동률 및 거래대금 분석
   - 업종별 강/약세 판단 및 수급 동향 파악
   - 외국인/기관 매매 동향 분석

2. 시장 진단
   - 전일 대비 시장 흐름 및 특징 요약
   - 주요 이슈 및 테마 분석
   - 리스크 요인 및 모멘텀 진단

3. 투자 전략
   - 단기 관심 종목 및 섹터 제시
   - 투자자 유의사항 안내
   - 향후 전망 및 대응 전략 제시

4. 작성 원칙
   - 객관적 데이터 기반 분석
   - 명확하고 간결한 문장 사용
   - 전문 용어는 이해하기 쉽게 설명
   - 리스크 요인 반드시 명시`,
      parameters: {
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.5
      }
    },
    variables: {
      market_date: 'string',
      indices_data: 'object',
      sector_performance: 'array',
      major_news: 'array'
    },
    examples: [
      {
        input: 'KOSPI 2,650pt (+1.2%), 외국인 매수세 지속, 반도체/2차전지 강세',
        output: '【시장 개요】\n코스피지수는 외국인의 매수세에 힘입어 2,650선에서 1.2% 상승 마감했습니다. 반도체와 2차전지 업종이 시장을 주도하며 전일 대비 강세를 보였습니다.\n\n【업종 분석】\n반도체: +2.5% (삼성전자 AI칩 수주 기대감)\n2차전지: +1.8% (북미 전기차 판매 증가)\n화학: -0.8% (원자재 가격 상승 부담)\n\n【투자 전략】\nAI 관련주와 2차전지 밸류체인 종목 관심 필요. 단, 고평가 종목 선별 매수 권고.'
      }
    ]
  },
  {
    id: 'telegram-stock-crawler',
    name: '텔레그램 주식방 크롤링',
    description: '텔레그램 주식 커뮤니티의 실시간 정보 및 테마 수집',
    categoryId: 'data-collection',
    useCase: '실시간 테마 발굴, 투자 심리 분석, 이슈 모니터링',
    difficulty: 'advanced',
    estimatedCost: '중비용',
    tags: ['telegram', 'crawling', 'stock-community', 'real-time'],
    template: {
      apiCall: 'telegram-api',
      systemPrompt: '텔레그램 주식방의 메시지를 분석하여 언급 빈도가 높은 종목, 테마, 이슈를 추출합니다.',
      parameters: {
        channel_ids: ['stockinfo_korea', 'nh_investment', 'korean_stocks'],
        message_limit: 100,
        time_range: '1h',
        extract_tickers: true,
        sentiment_analysis: true
      }
    },
    variables: {
      target_channels: 'array',
      keywords: 'array',
      min_mentions: 'number'
    },
    examples: [
      {
        input: '최근 1시간 주식방 메시지 분석',
        output: '【급등 테마】\n삼성전자: 15회 언급 (AI칩 관련)\nLG에너지솔루션: 12회 (북미 수주)\n\n【투자 심리】\n긍정: 65%, 부정: 20%, 중립: 15%\n\n【주요 이슈】\n"미국 빅테크 실적 호조로 국내 IT 수혜 예상"'
      }
    ]
  },
  {
    id: 'naver-stock-api',
    name: '네이버 금융 종목 정보',
    description: '네이버 금융에서 실시간 주가, 뉴스, 재무정보 크롤링',
    categoryId: 'data-collection',
    useCase: '주가 모니터링, 종목 뉴스 수집, 재무제표 분석',
    difficulty: 'intermediate',
    estimatedCost: '무료',
    tags: ['naver', 'stock-price', 'financial-data', 'crawling'],
    template: {
      apiCall: 'naver-finance-api',
      systemPrompt: '네이버 금융 데이터를 크롤링하여 주가, 뉴스, 재무정보를 수집합니다.',
      parameters: {
        ticker_code: '005930',
        data_types: ['price', 'news', 'financial_statements'],
        period: '1d'
      }
    },
    variables: {
      stock_codes: 'array',
      include_news: 'boolean',
      include_financials: 'boolean'
    },
    examples: [
      {
        input: '삼성전자(005930) 정보 조회',
        output: '【현재가】\n71,500원 (+1.5%)\n거래량: 12,458,920주\n\n【주요 뉴스】\n1. 삼성전자, AI칩 HBM3E 양산 시작\n2. 북미 반도체 수주 증가 전망\n\n【재무 요약】\nPER: 18.5, PBR: 1.2, ROE: 8.5%'
      }
    ]
  },
  {
    id: 'krx-market-data',
    name: '한국거래소(KRX) 시장데이터',
    description: '한국거래소 공식 API를 통한 시장 지수, 거래 정보 수집',
    categoryId: 'data-collection',
    useCase: '시장 지수 모니터링, 거래대금 분석, 프로그램 매매 현황',
    difficulty: 'advanced',
    estimatedCost: '무료',
    tags: ['krx', 'market-data', 'official-api', 'real-time'],
    template: {
      apiCall: 'krx-openapi',
      systemPrompt: 'KRX OPEN API를 통해 공식 시장 데이터를 수집합니다.',
      parameters: {
        market_type: 'KOSPI',
        data_type: 'index',
        include_sector: true,
        include_investor: true
      }
    },
    variables: {
      target_index: 'string',
      time_interval: 'string'
    },
    examples: [
      {
        input: 'KOSPI 지수 및 투자자별 동향',
        output: '【KOSPI】\n2,650.25 (+1.2%, +31.25)\n거래대금: 12.5조원\n\n【투자자별】\n외국인: +2,500억 (순매수)\n기관: -1,800억 (순매도)\n개인: -700억 (순매도)\n\n【업종별】\n전기전자 +2.1%, 화학 -0.8%'
      }
    ]
  },
  {
    id: 'dart-disclosure-api',
    name: '금융감독원 공시정보',
    description: 'DART(전자공시시스템) API를 통한 기업 공시 정보 수집',
    categoryId: 'data-collection',
    useCase: '공시 모니터링, 실적 분석, 중요 사항 알림',
    difficulty: 'intermediate',
    estimatedCost: '무료',
    tags: ['dart', 'disclosure', 'official-api', 'corporate'],
    template: {
      apiCall: 'dart-openapi',
      systemPrompt: 'DART OPEN API를 통해 상장사 공시 정보를 조회합니다.',
      parameters: {
        corp_code: '',
        report_type: ['정기공시', '주요사항보고', '발행공시'],
        date_from: '20250101',
        date_to: '20251231'
      }
    },
    variables: {
      company_codes: 'array',
      disclosure_types: 'array',
      keywords: 'array'
    },
    examples: [
      {
        input: '삼성전자 최근 공시 조회',
        output: '【최근 공시】\n1. [2025.01.15] 주요사항보고서 - 대규模 투자 결정\n2. [2025.01.10] 정기공시 - 2024년 4분기 실적\n3. [2025.01.05] 발행공시 - 무보증사채 발행\n\n【핵심 내용】\n4분기 영업이익 전년 대비 15% 증가'
      }
    ]
  },
  {
    id: 'sns-sentiment-crawler',
    name: 'SNS 투자 심리 분석',
    description: '트위터, 네이버 카페, 주식 커뮤니티의 종목 언급 및 심리 분석',
    categoryId: 'data-collection',
    useCase: '투자 심리 파악, 테마 발굴, 급등주 포착',
    difficulty: 'advanced',
    estimatedCost: '중비용',
    tags: ['sns', 'sentiment', 'community', 'social-listening'],
    template: {
      apiCall: 'sns-crawler-api',
      systemPrompt: 'SNS와 커뮤니티에서 주식 관련 게시글을 크롤링하여 언급 빈도와 감성을 분석합니다.',
      parameters: {
        sources: ['twitter', 'naver_cafe', '38comm', 'stock_gallery'],
        keywords: [],
        sentiment_model: 'finbert-kr',
        time_range: '24h'
      }
    },
    variables: {
      target_stocks: 'array',
      source_platforms: 'array',
      min_mentions: 'number'
    },
    examples: [
      {
        input: '2차전지 관련 종목 SNS 분석',
        output: '【급등 테마】\nLG에너지솔루션: 287건 언급 (긍정 72%)\n삼성SDI: 195건 (긍정 68%)\n\n【주요 키워드】\n#북미수주 #전기차배터리 #실적호조\n\n【투자 심리】\n매수 의견 65%, 관망 25%, 매도 10%'
      }
    ]
  },
  {
    id: 'economic-indicator-api',
    name: '한국은행 경제지표',
    description: '한국은행 ECOS API를 통한 주요 경제지표 및 금리 정보',
    categoryId: 'data-collection',
    useCase: '거시경제 분석, 금리 동향, 통화정책 모니터링',
    difficulty: 'intermediate',
    estimatedCost: '무료',
    tags: ['bok', 'economic-indicators', 'interest-rate', 'official-api'],
    template: {
      apiCall: 'bok-ecos-api',
      systemPrompt: '한국은행 경제통계시스템(ECOS)에서 주요 경제지표를 수집합니다.',
      parameters: {
        stat_codes: ['722Y001', '901Y009', '902Y013'],
        frequency: 'M',
        start_date: '202401',
        end_date: '202412'
      }
    },
    variables: {
      indicator_types: 'array',
      comparison_period: 'string'
    },
    examples: [
      {
        input: '최근 기준금리 및 CPI 동향',
        output: '【기준금리】\n3.50% (동결, 2025.01 기준)\n\n【소비자물가】\nCPI: +2.3% (전년 동월 대비)\n근원물가: +2.1%\n\n【시사점】\n물가 안정세 지속, 금리 인하 가능성 제기'
      }
    ]
  }
];

// =========================================
// Domain Type Definitions - 통합 도메인 타입 정의
// =========================================

// === Theme Domain Types ===
export interface ThemeInfo extends Omit<typeof themes.$inferSelect, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export interface ThemeStats {
  themeId: string;
  name: string;
  color: string;
  icon?: string | null;
  newsCount: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  lastUpdated: string | null;
}

export interface ThemeSummaryInfo {
  themeId: string;
  summary: string;
  keyPoints: string[];
  topEntities: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  newsCount: number;
  lastUpdated: string;
}

export interface NewsItem {
  id: string;
  nid?: string | null;
  title: string;
  content: string;
  source?: string | null;
  category?: string | null;
  sentiment?: string | null;
  publishedAt: string;
  themeClusterId?: string | null;
  summary?: string | null;
  economicScore?: number | null;
  marketScore?: number | null;
  importanceScore?: number | null;
}

// === Scheduler Domain Types ===
export interface SchedulerJob {
  id: string;
  name: string;
  cronExpression: string;
  isRunning: boolean;
  lastRun?: string;
  nextRun?: string;
  errorCount: number;
  maxRetries: number;
}

export interface SchedulerStats {
  totalJobs: number;
  runningJobs: number;
  errorCount: number;
  lastUpdate: string;
  jobs: SchedulerJob[];
}

export interface SchedulerStatus {
  isActive: boolean;
  stats: SchedulerStats;
  timestamp: string;
}

export interface FinancialDataStats {
  totalRecords: number;
  todayRecords: number;
  domesticStocks: number;
  foreignStocks: number;
  indices: number;
  volumeData: number;
}

export interface NewsDataStats {
  totalNews: number;
  todayNews: number;
  positiveNews: number;
  negativeNews: number;
  neutralNews: number;
  masterFiles: number;
}

// === API Management Domain Types ===
export interface ApiFormData {
  name: string;
  displayName: string;
  description: string;
  url: string;
  method: string;
  providerId: string;
  categoryId: string;
  modelName: string;
  authType: string;
  secretKey: string;
  maxTokens: number;
  inputCost: number;
  outputCost: number;
  preprocessPrompt: string;
  postprocessPrompt: string;
  systemPrompt: string;
  timeout: number;
  retryCount: number;
  supportsStreaming: boolean;
  inputTypes: string[];
  outputTypes: string[];
}


export interface SecretInfo {
  key: string;
  exists: boolean;
  isValid?: boolean;
  lastTested?: string;
}

export interface PromptTemplateInfo {
  id: string;
  name: string;
  template: string;
  variables: any[];
  category: string;
  description?: string;
}

// === Analysis Domain Types ===
export interface AnalysisStream {
  id: string;
  type: 'news' | 'theme' | 'quantitative';
  title: string;
  data: MarketAnalysis[];
  isLoading: boolean;
  importance: number;
}

export interface AnalysisResult {
  summary: string;
  key_points: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  recommendations?: string[];
}

export interface CausalAnalysisResult {
  identified_causes: Array<{
    type: string;
    description: string;
    importance: number;
    evidence: any;
  }>;
  correlation_strength: number;
  ai_reasoning: string;
  confidence_score: number;
  alternative_explanations: string[];
  market_sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  time_relevance: number;
}

export interface MarketEventAnalysis {
  event_type: string;
  affected_sectors: string[];
  expected_duration: string;
  impact_level: 'high' | 'medium' | 'low';
  related_events: any[];
}

// === Morning Briefing Domain Types ===
export interface MarketMovementData {
  index: string;
  indexName: string;
  value: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

export interface KeyEvent {
  event: string;
  time: Date;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  importance: number;
  relatedSymbols: string[];
}

export interface SectorHighlight {
  sector: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  changePercent: number;
  topGainer?: { symbol: string; change: number };
  topLoser?: { symbol: string; change: number };
  summary?: string;
}

export interface TradingVolumeAnalysis {
  symbol: string;
  name?: string;
  volume: number;
  changePercent: number;
  category: 'individual' | 'foreign' | 'institutional';
  netFlow: 'buy' | 'sell';
  amount: number;
}

// === Search & RAG Domain Types ===
export interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  similarity: number;
  source?: string;
  timestamp?: string;
}

export interface RAGQuery {
  query: string;
  filters?: {
    symbol?: string;
    market?: string;
    country?: string;
    dataType?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  };
  topK?: number;
  threshold?: number;
  searchType?: 'vector' | 'keyword' | 'hybrid';
}

export interface AnalysisSearchQuery extends RAGQuery {
  analysisType?: 'causal' | 'correlation' | 'trend' | 'sentiment';
  includeRelated?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

// === Quality Dashboard Domain Types ===
export interface QualityMetrics {
  accuracy: number;
  relevance: number;
  timeliness: number;
  completeness: number;
  consistency: number;
  overallScore: number;
  timestamp: string;
  metadata?: {
    sampleSize: number;
    evaluatedBy: string;
    notes?: string;
  };
}

// === AI Market Workflow Node Types ===
export type AIWorkflowNodeType = 
  | 'start'
  | 'fetch_news'
  | 'classify_theme'
  | 'summarize'
  | 'compute_metrics'
  | 'macro_conditions'
  | 'assemble_layout'
  | 'prompt'
  | 'api'
  | 'rag'
  | 'condition'
  | 'merge'
  | 'dataSource'
  | 'sql_query'    // SQL query node (uses registered SQL queries)
  | 'output'
  | 'transform'    // Data transformation (JSON parse/stringify, field extraction, mapping)
  | 'loop'         // Array iteration
  | 'template'     // Template variable substitution
  | 'end';

export interface AIWorkflowNodeConfig {
  // Reference IDs for node execution
  promptId?: string;
  apiCallId?: string;
  workflowId?: string; // For sub-workflow execution
  layoutTemplateId?: string;
  
  // Node-specific parameters
  params?: Record<string, any>;
  timeout?: number;
  retryCount?: number;
  condition?: 'previous_completed' | 'all_completed' | 'any_completed';
  
  // Prompt node configuration (inline prompts)
  systemPrompt?: string; // System prompt for AI
  userPromptTemplate?: string; // User prompt template with {VAR} placeholders
  maxTokens?: number; // Maximum tokens for AI response (100-4000)
  temperature?: number; // Temperature for AI response (0.0-2.0)
  
  // Data source configuration (for dataSource nodes)
  query?: string; // SQL query for Databricks
  source?: 'databricks' | 'postgresql' | 'api'; // Data source type
  format?: string; // Output format
  
  // SQL Query node configuration (for sql_query nodes)
  sqlQueryId?: string; // Reference to registered SQL query
  dataSourceId?: string; // Reference to data source (if not using registered query)
  parameters?: Record<string, any>; // Parameters for parameterized queries
  
  // Output configuration
  outputKeys?: string[]; // Keys available for layout binding
  maxCharacters?: number; // For text output limiting
  
  // Transform node configuration
  transformType?: 'json_parse' | 'json_stringify' | 'extract_fields' | 'map_array' | 'filter_array' | 'aggregate' | 'custom';
  transformScript?: string; // JavaScript expression for custom transforms
  inputKey?: string; // Input variable key to transform
  outputKey?: string; // Output variable key to store result
  fields?: string[]; // Fields to extract (for extract_fields)
  mapExpression?: string; // Mapping expression (for map_array)
  filterExpression?: string; // Filter condition (for filter_array)
  
  // Loop node configuration
  arrayKey?: string; // Variable containing array to iterate
  itemKey?: string; // Variable name for current item in loop
  indexKey?: string; // Variable name for current index in loop
  
  // Template node configuration
  template?: string; // Template string with {VAR} or {{VAR}} placeholders
  variables?: Record<string, string>; // Variable mappings (key -> context variable name)
  placeholderFormat?: 'single' | 'double' | 'both'; // Support {VAR}, {{VAR}}, or both
  
  // Merge node configuration
  mergeKeys?: string[]; // Keys to merge from predecessor nodes
  
  // UI display properties
  label?: string; // Node display label
  description?: string; // Node description
}

export interface AIWorkflowDefinition {
  nodes: Array<{
    id: string;
    type: AIWorkflowNodeType;
    position: { x: number; y: number };
    data: {
      label: string;
      description?: string;
      config: AIWorkflowNodeConfig;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

// === Layout Editor Domain Types ===
export interface DataPart {
  type: string;
  content: string;
  metadata?: any;
  // Workflow node binding for dynamic content
  nodeId?: string; // Reference to workflow node
  outputKey?: string; // Specific output key from node result
  workflowId?: string; // Reference to source workflow
}

export interface AILayoutDefinition {
  type: 'grid' | 'flex' | 'stack' | 'tabs' | 'split';
  config: any;
  children?: AILayoutDefinition[];
  dataBindings?: Record<string, any>;
  styles?: Record<string, any>;
  // Enhanced with workflow data binding
  workflowBindings?: Array<{
    placeholder: string; // e.g., "{{market_summary}}"
    workflowId: string;
    nodeId: string;
    outputKey: string;
    maxCharacters?: number;
    fallbackText?: string;
  }>;
}

// === WebSocket Message Types ===
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
  channel?: string;
}

export interface SystemStatus {
  system: 'normal' | 'warning' | 'error';
  ragEngine: 'active' | 'inactive' | 'error';
  llmConnections: 'connected' | 'disconnected' | 'error';
  dataCollection: 'running' | 'stopped' | 'error';
  timestamp: string;
}

// ========== BALANCE ANALYSIS TABLES ==========

// 사용자 잔고 데이터
export const userBalances = pgTable("user_balances", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").notNull(), // 해시태그 형태
  date: date("date").notNull(),
  symbol: varchar("symbol").notNull(), // 종목 코드
  symbolName: text("symbol_name"), // 종목명
  market: text("market"), // 시장 구분
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  avgCost: decimal("avg_cost", { precision: 15, scale: 4 }).notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 4 }),
  marketValue: decimal("market_value", { precision: 15, scale: 4 }),
  pnl: decimal("pnl", { precision: 15, scale: 4 }),
  pnlPercent: decimal("pnl_percent", { precision: 6, scale: 2 }),
  
  // Portfolio allocation
  portfolioWeight: decimal("portfolio_weight", { precision: 5, scale: 2 }), // 포트폴리오 내 비중
  sectorCode: text("sector_code"), // 업종 코드
  sectorName: text("sector_name"), // 업종명
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userDateSymbolIdx: uniqueIndex("user_balance_unique").on(table.userId, table.date, table.symbol),
  userIdDateIdx: index("user_balance_user_date_idx").on(table.userId, table.date),
  symbolIdx: index("user_balance_symbol_idx").on(table.symbol),
  userIdIdx: index("user_balance_user_idx").on(table.userId),
  dateIdx: index("user_balance_date_idx").on(table.date),
}));

// 잔고 분석 결과
export const balanceInsights = pgTable("balance_insights", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  
  // Portfolio overview
  totalValue: decimal("total_value", { precision: 20, scale: 2 }),
  totalPnl: decimal("total_pnl", { precision: 20, scale: 2 }),
  totalPnlPercent: decimal("total_pnl_percent", { precision: 6, scale: 2 }),
  
  // Top holdings (종목별 비중 상위)
  topHoldings: jsonb("top_holdings"), // [{ symbol, name, weight, value, pnl }]
  
  // Portfolio metrics
  portfolioMetrics: jsonb("portfolio_metrics"), // { 
    // diversificationRatio: number,
    // concentrationRisk: number,
    // sectorAllocation: { [sector]: weight },
    // marketAllocation: { [market]: weight },
    // averageHoldingPeriod: number
  // }
  
  // Risk metrics
  riskMetrics: jsonb("risk_metrics"), // {
    // portfolioVolatility: number,
    // sharpeRatio: number,
    // maxDrawdown: number,
    // beta: number,
    // valueAtRisk: number
  // }
  
  // Performance metrics
  performanceMetrics: jsonb("performance_metrics"), // {
    // dailyReturn: number,
    // weeklyReturn: number,
    // monthlyReturn: number,
    // ytdReturn: number,
    // annualizedReturn: number
  // }
  
  // Market comparison
  marketComparison: jsonb("market_comparison"), // {
    // vsKospi: number,
    // vsKosdaq: number,
    // vsSP500: number,
    // vsNasdaq: number
  // }
  
  // AI Generated insights
  summary: text("summary"), // AI 생성 종합 요약
  recommendations: text("recommendations").array(), // AI 추천사항들
  warnings: text("warnings").array(), // 위험 요소들
  opportunities: text("opportunities").array(), // 기회 요소들
  
  // Analysis metadata
  analysisVersion: varchar("analysis_version").default("1.0"),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  
  // Embeddings for similarity search
  embeddings: text("embeddings"), // 벡터 임베딩
  embeddingModel: varchar("embedding_model").default("text-embedding-3-large"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateIdx: uniqueIndex("balance_insights_unique").on(table.userId, table.date),
  userIdIdx: index("balance_insights_user_idx").on(table.userId),
  dateIdx: index("balance_insights_date_idx").on(table.date),
  totalValueIdx: index("balance_insights_value_idx").on(table.totalValue),
}));

// 사용자 태그 (개인화)
export const userTags = pgTable("user_tags", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").notNull(),
  tag: varchar("tag").notNull(), // 투자 성향, 관심 테마 등
  category: varchar("category"), // 'investment_style', 'risk_preference', 'theme', 'sector'
  value: text("value"), // 태그 값 (선택사항)
  weight: decimal("weight", { precision: 3, scale: 2 }).default("1.0"), // 가중치 (0-1)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userTagIdx: uniqueIndex("user_tag_unique").on(table.userId, table.tag),
  userIdIdx: index("user_tags_user_idx").on(table.userId),
  categoryIdx: index("user_tags_category_idx").on(table.category),
}));

// 관심종목
export const userWatchlist = pgTable("user_watchlist", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").notNull(),
  symbol: varchar("symbol").notNull(),
  symbolName: text("symbol_name"), // 종목명
  market: text("market"), // 시장 구분
  reason: text("reason"), // 관심 등록 이유
  targetPrice: decimal("target_price", { precision: 15, scale: 4 }), // 목표가
  alertEnabled: boolean("alert_enabled").default(false), // 알림 설정
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => ({
  userSymbolIdx: uniqueIndex("user_watchlist_unique").on(table.userId, table.symbol),
  userIdIdx: index("user_watchlist_user_idx").on(table.userId),
  symbolIdx: index("user_watchlist_symbol_idx").on(table.symbol),
}));

// Balance Analysis Types
export type UserBalance = typeof userBalances.$inferSelect;
export type InsertUserBalance = typeof userBalances.$inferInsert;
export type BalanceInsights = typeof balanceInsights.$inferSelect;
export type InsertBalanceInsights = typeof balanceInsights.$inferInsert;
export type UserTag = typeof userTags.$inferSelect;
export type InsertUserTag = typeof userTags.$inferInsert;
export type UserWatchlist = typeof userWatchlist.$inferSelect;
export type InsertUserWatchlist = typeof userWatchlist.$inferInsert;

// Insert schemas for validation
export const insertUserBalanceSchema = createInsertSchema(userBalances);
export const insertBalanceInsightsSchema = createInsertSchema(balanceInsights);
export const insertUserTagSchema = createInsertSchema(userTags);
export const insertUserWatchlistSchema = createInsertSchema(userWatchlist);

// ========== TRADING ANALYSIS TABLES ==========

// 사용자 매매 데이터
export const userTrades = pgTable("user_trades", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").notNull(), // 해시태그 형태
  tradeDate: date("trade_date").notNull(),
  symbol: varchar("symbol").notNull(), // 종목 코드
  symbolName: text("symbol_name"), // 종목명
  market: text("market"), // 시장 구분 (KOSPI, KOSDAQ, NYSE, NASDAQ)
  side: varchar("side").notNull(), // 'buy' | 'sell'
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  price: decimal("price", { precision: 15, scale: 4 }).notNull(),
  tradeValue: decimal("trade_value", { precision: 15, scale: 4 }).notNull(),
  commission: decimal("commission", { precision: 15, scale: 4 }).default("0"),
  
  // Enhanced trading info
  orderType: varchar("order_type"), // 'market', 'limit', 'stop_loss' etc
  sectorCode: text("sector_code"), // 업종 코드
  sectorName: text("sector_name"), // 업종명
  tradeReason: text("trade_reason"), // 매매 사유
  
  // Timing and context
  tradeHour: integer("trade_hour"), // 매매 시간 (0-23)
  marketSession: varchar("market_session"), // 'pre_market', 'regular', 'after_hours'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userTradeIdx: index("user_trade_idx").on(table.userId, table.tradeDate),
  userSymbolIdx: index("user_trade_symbol_idx").on(table.userId, table.symbol),
  symbolIdx: index("trade_symbol_idx").on(table.symbol),
  dateIdx: index("trade_date_idx").on(table.tradeDate),
  sideIdx: index("trade_side_idx").on(table.side),
  userDateSymbolIdx: index("user_trade_date_symbol_idx").on(table.userId, table.tradeDate, table.symbol),
}));

// 매매 분석 결과 (월별)
export const tradeInsights = pgTable("trade_insights", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").notNull(),
  month: varchar("month").notNull(), // YYYY-MM format
  
  // Trading pattern metrics
  tradingMetrics: jsonb("trading_metrics"), // {
    // totalTrades: number,
    // buyTrades: number,
    // sellTrades: number,
    // winRate: number, // 승률 (%)
    // avgHoldingPeriod: number, // 평균 보유기간 (일)
    // buyToSellRatio: number, // 매수/매도 비율
    // avgTradeSize: number, // 평균 거래금액
    // tradingFrequency: number, // 월간 거래 빈도
    // preferredTradingHours: number[], // 선호 거래시간
    // marketSessionActivity: { regular: number, pre: number, after: number },
    // sectorConcentration: { [sector]: { trades: number, value: number } },
    // avgCommissionRate: number // 평균 수수료율
  // }
  
  // Performance metrics  
  performanceMetrics: jsonb("performance_metrics"), // {
    // monthlyReturn: number, // 월간 수익률 (%)
    // realizedPnl: number, // 실현손익
    // totalTradeValue: number, // 총 거래대금
    // avgReturnPerTrade: number, // 거래당 평균 수익률
    // bestTrade: { symbol: string, return: number, date: string },
    // worstTrade: { symbol: string, return: number, date: string },
    // consecutiveWins: number, // 연속 수익 거래
    // consecutiveLosses: number, // 연속 손실 거래
    // profitFactor: number, // 총수익/총손실 비율
    // returnDistribution: { [range]: number } // 수익률 분포
  // }
  
  // Risk metrics
  riskMetrics: jsonb("risk_metrics"), // {
    // volatility: number, // 변동성
    // sharpeRatio: number, // 샤프 비율
    // maxDrawdown: number, // 최대 손실률 (%)
    // calmarRatio: number, // 칼마 비율
    // valueAtRisk: number, // VaR (95%)
    // averageLossPerTrade: number, // 거래당 평균 손실
    // riskRewardRatio: number, // 위험 대비 수익 비율
    // diversificationScore: number, // 분산투자 점수 (0-1)
    // marketCorrelation: number // 시장 상관관계
  // }
  
  // Benchmark comparison
  benchmarkComparison: jsonb("benchmark_comparison"), // {
    // vsKospi: { return: number, outperformance: number },
    // vsKosdaq: { return: number, outperformance: number },
    // vsSP500: { return: number, outperformance: number },
    // vsNasdaq: { return: number, outperformance: number },
    // marketBeta: number, // 시장 베타
    // relativeVolatility: number, // 시장 대비 상대 변동성
    // informationRatio: number, // 정보비율
    // trackingError: number // 추적오차
  // }
  
  // AI Generated insights
  summary: text("summary"), // AI 생성 종합 요약
  recommendations: text("recommendations").array(), // AI 추천사항들
  warnings: text("warnings").array(), // 위험 요소들
  opportunities: text("opportunities").array(), // 개선 기회
  patterns: text("patterns").array(), // 발견된 매매 패턴들
  
  // Analysis metadata
  analysisVersion: varchar("analysis_version").default("1.0"),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  dataQualityScore: decimal("data_quality_score", { precision: 3, scale: 2 }),
  
  // Embeddings for similarity search
  embeddings: text("embeddings"), // 벡터 임베딩
  embeddingModel: varchar("embedding_model").default("text-embedding-3-large"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userMonthIdx: uniqueIndex("trade_insights_unique").on(table.userId, table.month),
  userIdIdx: index("trade_insights_user_idx").on(table.userId),
  monthIdx: index("trade_insights_month_idx").on(table.month),
  confidenceIdx: index("trade_insights_confidence_idx").on(table.confidenceScore),
}));

// Trading Analysis Types
export type UserTrade = typeof userTrades.$inferSelect;
export type InsertUserTrade = typeof userTrades.$inferInsert;
export type TradeInsights = typeof tradeInsights.$inferSelect;
export type InsertTradeInsights = typeof tradeInsights.$inferInsert;

// Insert schemas for validation
export const insertUserTradeSchema = createInsertSchema(userTrades);
export const insertTradeInsightsSchema = createInsertSchema(tradeInsights);

// Trading Metrics Interfaces
export interface TradingMetrics {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  winRate: number; // 승률 (%)
  avgHoldingPeriod: number; // 평균 보유기간 (일)
  buyToSellRatio: number; // 매수/매도 비율
  avgTradeSize: number; // 평균 거래금액
  tradingFrequency: number; // 월간 거래 빈도
  preferredTradingHours: number[]; // 선호 거래시간
  marketSessionActivity: { regular: number; pre: number; after: number };
  sectorConcentration: Record<string, { trades: number; value: number }>;
  avgCommissionRate: number; // 평균 수수료율
}

export interface PerformanceMetrics {
  monthlyReturn: number; // 월간 수익률 (%)
  realizedPnl: number; // 실현손익
  totalTradeValue: number; // 총 거래대금
  avgReturnPerTrade: number; // 거래당 평균 수익률
  bestTrade: { symbol: string; return: number; date: string };
  worstTrade: { symbol: string; return: number; date: string };
  consecutiveWins: number; // 연속 수익 거래
  consecutiveLosses: number; // 연속 손실 거래
  profitFactor: number; // 총수익/총손실 비율
  returnDistribution: Record<string, number>; // 수익률 분포
}

export interface RiskMetrics {
  volatility: number; // 변동성
  sharpeRatio: number; // 샤프 비율
  maxDrawdown: number; // 최대 손실률 (%)
  calmarRatio: number; // 칼마 비율
  valueAtRisk: number; // VaR (95%)
  averageLossPerTrade: number; // 거래당 평균 손실
  riskRewardRatio: number; // 위험 대비 수익 비율
  diversificationScore: number; // 분산투자 점수 (0-1)
  marketCorrelation: number; // 시장 상관관계
}

export interface BenchmarkComparison {
  vsKospi: { return: number; outperformance: number };
  vsKosdaq: { return: number; outperformance: number };
  vsSP500: { return: number; outperformance: number };
  vsNasdaq: { return: number; outperformance: number };
  marketBeta: number; // 시장 베타
  relativeVolatility: number; // 시장 대비 상대 변동성
  informationRatio: number; // 정보비율
  trackingError: number; // 추적오차
}

// ========== PERSONALIZATION MANAGEMENT TABLES ==========
// NH투자증권 고객 개인화 서비스 관리 시스템

// 고객 속성 정의
export const attributeDefinitions = pgTable("attribute_definitions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // 속성명 (예: 'age', 'investment_experience', 'risk_preference')
  displayName: text("display_name").notNull(), // 화면 표시명
  description: text("description"), // 속성 설명
  dataType: varchar("data_type").notNull(), // 'string', 'number', 'boolean', 'array', 'object'
  category: varchar("category").notNull(), // 'demographic', 'behavioral', 'preference', 'financial'
  
  // 값 제약 조건
  validationRules: jsonb("validation_rules"), // { min, max, enum, pattern, required }
  defaultValue: text("default_value"), // 기본값
  
  // 메타데이터
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // 중요도 (높을수록 중요)
  tags: text("tags").array(), // 태그 배열
  
  // 버전 관리
  version: varchar("version").default("1.0"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("attribute_def_name_unique").on(table.name),
  categoryIdx: index("attribute_def_category_idx").on(table.category),
  activeIdx: index("attribute_def_active_idx").on(table.isActive),
}));

// 고객 세그먼트 정의
export const segments = pgTable("segments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // 세그먼트명
  displayName: text("display_name").notNull(), // 화면 표시명
  description: text("description"), // 세그먼트 설명
  
  // 세그먼트 규칙 (JSON 조건)
  criteria: jsonb("criteria").notNull(), // 세그먼트 조건 정의
  estimatedSize: integer("estimated_size"), // 예상 고객 수
  
  // 메타데이터
  color: varchar("color").default("#3B82F6"), // UI 표시용 색상
  icon: varchar("icon"), // 아이콘 이름
  tags: text("tags").array(), // 태그 배열
  
  // 상태 관리
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0),
  
  // 버전 관리
  version: varchar("version").default("1.0"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("segment_name_unique").on(table.name),
  activeIdx: index("segment_active_idx").on(table.isActive),
  priorityIdx: index("segment_priority_idx").on(table.priority),
}));

// 규칙 조건
export const ruleConditions = pgTable("rule_conditions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  ruleId: varchar("rule_id").notNull(),
  
  // 조건 정의
  attributeName: text("attribute_name").notNull(), // 속성명
  operator: varchar("operator").notNull(), // 'equals', 'not_equals', 'in', 'not_in', 'greater_than', 'less_than', 'between', 'contains', 'not_contains'
  value: jsonb("value").notNull(), // 비교 값 (다양한 타입 지원)
  
  // 논리 연산
  logicOperator: varchar("logic_operator").default("AND"), // 'AND', 'OR'
  groupId: varchar("group_id"), // 조건 그룹화
  order: integer("order").default(0), // 조건 순서
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  ruleIdx: index("rule_condition_rule_idx").on(table.ruleId),
  attributeIdx: index("rule_condition_attr_idx").on(table.attributeName),
  groupIdx: index("rule_condition_group_idx").on(table.groupId),
}));

// 개인화 규칙
export const rules = pgTable("rules", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  ruleSetId: varchar("rule_set_id").notNull(),
  
  name: text("name").notNull(), // 규칙명
  description: text("description"), // 규칙 설명
  
  // 대상 설정
  targetSegments: text("target_segments").array(), // 대상 세그먼트 ID 배열
  excludeSegments: text("exclude_segments").array(), // 제외 세그먼트 ID 배열
  
  // 액션 정의
  actionType: varchar("action_type").notNull(), // 'recommend_content', 'show_notification', 'customize_layout', 'filter_data'
  actionConfig: jsonb("action_config").notNull(), // 액션별 설정
  
  // 우선순위 및 제어
  priority: integer("priority").default(0), // 높을수록 우선
  weight: decimal("weight", { precision: 3, scale: 2 }).default("1.0"), // 가중치
  
  // 제약 조건
  maxApplicationsPerUser: integer("max_applications_per_user"), // 사용자당 최대 적용 횟수
  startDate: timestamp("start_date"), // 시작일
  endDate: timestamp("end_date"), // 종료일
  
  // 상태 관리
  isActive: boolean("is_active").default(true),
  isTestMode: boolean("is_test_mode").default(false), // 테스트 모드
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ruleSetIdx: index("rule_rule_set_idx").on(table.ruleSetId),
  actionTypeIdx: index("rule_action_type_idx").on(table.actionType),
  activeIdx: index("rule_active_idx").on(table.isActive),
  priorityIdx: index("rule_priority_idx").on(table.priority),
  dateRangeIdx: index("rule_date_range_idx").on(table.startDate, table.endDate),
}));

// 규칙 세트 (규칙들의 집합)
export const ruleSets = pgTable("rule_sets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // 규칙 세트명
  description: text("description"), // 설명
  
  // 적용 범위
  scope: varchar("scope").notNull(), // 'dashboard', 'recommendations', 'notifications', 'content_filtering'
  
  // 실행 설정
  executionMode: varchar("execution_mode").default("sequential"), // 'sequential', 'parallel', 'priority_based'
  conflictResolution: varchar("conflict_resolution").default("priority"), // 'priority', 'first_match', 'last_match', 'merge'
  
  // 상태 관리
  isActive: boolean("is_active").default(true),
  
  // 버전 관리
  version: varchar("version").default("1.0"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("rule_set_name_unique").on(table.name),
  scopeIdx: index("rule_set_scope_idx").on(table.scope),
  activeIdx: index("rule_set_active_idx").on(table.isActive),
}));

// 콘텐츠 개인화 정책
export const contentPolicies = pgTable("content_policies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // 정책명
  description: text("description"), // 정책 설명
  
  // 콘텐츠 타입
  contentType: varchar("content_type").notNull(), // 'news', 'analysis', 'recommendations', 'alerts'
  
  // 개인화 설정
  personalizationLevel: varchar("personalization_level").default("medium"), // 'low', 'medium', 'high'
  filterCriteria: jsonb("filter_criteria"), // 필터링 기준
  rankingFactors: jsonb("ranking_factors"), // 랭킹 요소들과 가중치
  
  // 콘텐츠 제한
  maxItemsPerUser: integer("max_items_per_user").default(50), // 사용자당 최대 아이템 수
  minQualityScore: decimal("min_quality_score", { precision: 3, scale: 2 }).default("0.5"), // 최소 품질 점수
  
  // 다양성 설정
  diversitySettings: jsonb("diversity_settings"), // 다양성 보장 설정
  
  // 상태 관리
  isActive: boolean("is_active").default(true),
  
  // 버전 관리
  version: varchar("version").default("1.0"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("content_policy_name_unique").on(table.name),
  contentTypeIdx: index("content_policy_type_idx").on(table.contentType),
  activeIdx: index("content_policy_active_idx").on(table.isActive),
}));

// 추천 전략
export const recommendationStrategies = pgTable("recommendation_strategies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // 전략명
  description: text("description"), // 전략 설명
  
  // 추천 타입
  recommendationType: varchar("recommendation_type").notNull(), // 'stock', 'theme', 'news', 'analysis'
  
  // 알고리즘 설정
  algorithm: varchar("algorithm").notNull(), // 'collaborative_filtering', 'content_based', 'hybrid', 'trend_based'
  algorithmConfig: jsonb("algorithm_config"), // 알고리즘별 설정
  
  // 가중치 설정
  factorWeights: jsonb("factor_weights"), // { price_momentum: 0.3, volume: 0.2, news_sentiment: 0.25, technical: 0.25 }
  
  // 필터링 설정
  filters: jsonb("filters"), // 추천 대상 필터
  blacklist: text("blacklist").array(), // 제외 항목 리스트
  
  // 성과 설정
  performanceMetrics: jsonb("performance_metrics"), // 성과 측정 지표
  targetAccuracy: decimal("target_accuracy", { precision: 3, scale: 2 }).default("0.7"), // 목표 정확도
  
  // 상태 관리
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // 기본 전략 여부
  
  // 버전 관리
  version: varchar("version").default("1.0"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("recommendation_strategy_name_unique").on(table.name),
  typeIdx: index("recommendation_strategy_type_idx").on(table.recommendationType),
  algorithmIdx: index("recommendation_strategy_algo_idx").on(table.algorithm),
  activeIdx: index("recommendation_strategy_active_idx").on(table.isActive),
}));

// 알림 규칙
export const notificationRules = pgTable("notification_rules", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // 규칙명
  description: text("description"), // 규칙 설명
  
  // 트리거 조건
  triggerType: varchar("trigger_type").notNull(), // 'price_change', 'news_alert', 'portfolio_update', 'market_event'
  triggerConditions: jsonb("trigger_conditions").notNull(), // 트리거 조건
  
  // 대상 설정
  targetSegments: text("target_segments").array(), // 대상 세그먼트
  excludeSegments: text("exclude_segments").array(), // 제외 세그먼트
  
  // 알림 설정
  notificationType: varchar("notification_type").notNull(), // 'push', 'email', 'sms', 'in_app'
  messageTemplate: text("message_template").notNull(), // 메시지 템플릿
  priority: varchar("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  
  // 제한 설정
  cooldownPeriod: integer("cooldown_period").default(3600), // 쿨다운 시간 (초)
  maxPerDay: integer("max_per_day").default(5), // 일일 최대 발송 수
  
  // 개인화 설정
  personalizationLevel: varchar("personalization_level").default("medium"), // 'low', 'medium', 'high'
  
  // 상태 관리
  isActive: boolean("is_active").default(true),
  
  // 버전 관리
  version: varchar("version").default("1.0"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("notification_rule_name_unique").on(table.name),
  triggerTypeIdx: index("notification_rule_trigger_idx").on(table.triggerType),
  typeIdx: index("notification_rule_type_idx").on(table.notificationType),
  activeIdx: index("notification_rule_active_idx").on(table.isActive),
}));

// 대시보드 템플릿
export const dashboardTemplates = pgTable("dashboard_templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // 템플릿명
  description: text("description"), // 템플릿 설명
  
  // 레이아웃 설정
  layout: jsonb("layout").notNull(), // 레이아웃 구성 (위젯 배치 등)
  widgets: jsonb("widgets").notNull(), // 위젯 설정
  
  // 대상 설정
  targetSegments: text("target_segments").array(), // 대상 세그먼트
  deviceType: varchar("device_type").default("all"), // 'mobile', 'tablet', 'desktop', 'all'
  
  // 개인화 설정
  personalizationRules: jsonb("personalization_rules"), // 개인화 규칙
  adaptiveLayout: boolean("adaptive_layout").default(true), // 적응형 레이아웃 여부
  
  // 메타데이터
  previewImage: text("preview_image"), // 미리보기 이미지 URL
  tags: text("tags").array(), // 태그 배열
  
  // 상태 관리
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // 기본 템플릿 여부
  
  // 버전 관리
  version: varchar("version").default("1.0"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("dashboard_template_name_unique").on(table.name),
  deviceTypeIdx: index("dashboard_template_device_idx").on(table.deviceType),
  activeIdx: index("dashboard_template_active_idx").on(table.isActive),
}));

// A/B 테스트 실험
export const experiments = pgTable("experiments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(), // 실험명
  description: text("description"), // 실험 설명
  hypothesis: text("hypothesis"), // 가설
  
  // 실험 설정
  experimentType: varchar("experiment_type").notNull(), // 'recommendation', 'layout', 'content', 'notification'
  
  // 변형 설정
  variants: jsonb("variants").notNull(), // 실험 변형들 (A, B, C 등)
  trafficAllocation: jsonb("traffic_allocation").notNull(), // 트래픽 배분 (%)
  
  // 대상 설정
  targetSegments: text("target_segments").array(), // 대상 세그먼트
  sampleSize: integer("sample_size"), // 샘플 크기
  
  // 성공 지표
  primaryMetric: varchar("primary_metric").notNull(), // 주요 성공 지표
  secondaryMetrics: text("secondary_metrics").array(), // 부차 지표들
  
  // 실험 기간
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // 통계 설정
  significanceLevel: decimal("significance_level", { precision: 3, scale: 2 }).default("0.05"), // 유의수준
  minimumDetectableEffect: decimal("minimum_detectable_effect", { precision: 3, scale: 2 }).default("0.05"), // 최소 감지 효과
  
  // 상태 관리
  status: varchar("status").default("draft"), // 'draft', 'running', 'paused', 'completed', 'cancelled'
  
  // 결과 데이터
  results: jsonb("results"), // 실험 결과
  conclusion: text("conclusion"), // 결론
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex("experiment_name_unique").on(table.name),
  typeIdx: index("experiment_type_idx").on(table.experimentType),
  statusIdx: index("experiment_status_idx").on(table.status),
  dateRangeIdx: index("experiment_date_range_idx").on(table.startDate, table.endDate),
}));

// 분석 이벤트 (추적용)
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // 이벤트 기본 정보
  eventType: varchar("event_type").notNull(), // 'rule_applied', 'recommendation_shown', 'notification_sent', 'content_viewed'
  eventCategory: varchar("event_category").notNull(), // 'personalization', 'recommendation', 'notification', 'engagement'
  
  // 대상 정보
  userId: varchar("user_id"), // 고객 ID (해시된 형태)
  sessionId: varchar("session_id"), // 세션 ID
  
  // 개인화 관련 정보
  ruleId: varchar("rule_id"), // 적용된 규칙 ID
  segmentId: varchar("segment_id"), // 세그먼트 ID
  experimentId: varchar("experiment_id"), // 실험 ID (A/B 테스트)
  variantId: varchar("variant_id"), // 변형 ID
  
  // 이벤트 상세 정보
  properties: jsonb("properties"), // 이벤트별 속성들
  metadata: jsonb("metadata"), // 추가 메타데이터
  
  // 성과 지표
  value: decimal("value", { precision: 15, scale: 4 }), // 이벤트 값 (클릭, 조회 등)
  revenue: decimal("revenue", { precision: 15, scale: 2 }), // 매출 기여도
  
  // 디바이스/환경 정보
  deviceType: varchar("device_type"), // 'mobile', 'tablet', 'desktop'
  platform: varchar("platform"), // 'ios', 'android', 'web'
  
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => ({
  eventTypeIdx: index("analytics_event_type_idx").on(table.eventType),
  userIdIdx: index("analytics_user_id_idx").on(table.userId),
  ruleIdx: index("analytics_rule_idx").on(table.ruleId),
  segmentIdx: index("analytics_segment_idx").on(table.segmentId),
  experimentIdx: index("analytics_experiment_idx").on(table.experimentId),
  timestampIdx: index("analytics_timestamp_idx").on(table.timestamp),
}));

// 성과 지표 스냅샷 (집계 데이터)
export const metricSnapshots = pgTable("metric_snapshots", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // 시간 정보
  date: date("date").notNull(), // 집계 날짜
  period: varchar("period").notNull(), // 'daily', 'weekly', 'monthly'
  
  // 대상 정보
  entityType: varchar("entity_type").notNull(), // 'rule', 'segment', 'experiment', 'strategy'
  entityId: varchar("entity_id").notNull(), // 엔티티 ID
  
  // 성과 지표
  metrics: jsonb("metrics").notNull(), // 성과 지표들
  // 예시: {
  //   impressions: 1000,
  //   clicks: 50,
  //   ctr: 0.05,
  //   conversions: 10,
  //   conversionRate: 0.2,
  //   revenue: 5000,
  //   avgOrderValue: 500
  // }
  
  // 비교 데이터
  previousPeriodMetrics: jsonb("previous_period_metrics"), // 이전 기간 지표
  baselineMetrics: jsonb("baseline_metrics"), // 베이스라인 지표
  
  // 계산된 지표
  improvementPercent: decimal("improvement_percent", { precision: 5, scale: 2 }), // 개선률
  statisticalSignificance: decimal("statistical_significance", { precision: 3, scale: 2 }), // 통계적 유의성
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  dateEntityIdx: uniqueIndex("metric_snapshot_date_entity_unique").on(table.date, table.entityType, table.entityId),
  entityIdx: index("metric_snapshot_entity_idx").on(table.entityType, table.entityId),
  dateIdx: index("metric_snapshot_date_idx").on(table.date),
  periodIdx: index("metric_snapshot_period_idx").on(table.period),
}));

// Relations
export const ruleConditionsRelations = relations(ruleConditions, ({ one }) => ({
  rule: one(rules, {
    fields: [ruleConditions.ruleId],
    references: [rules.id],
  }),
}));

export const rulesRelations = relations(rules, ({ one, many }) => ({
  ruleSet: one(ruleSets, {
    fields: [rules.ruleSetId],
    references: [ruleSets.id],
  }),
  conditions: many(ruleConditions),
}));

export const ruleSetsRelations = relations(ruleSets, ({ many }) => ({
  rules: many(rules),
}));

// Types
export type AttributeDefinition = typeof attributeDefinitions.$inferSelect;
export type InsertAttributeDefinition = typeof attributeDefinitions.$inferInsert;
export type Segment = typeof segments.$inferSelect;
export type InsertSegment = typeof segments.$inferInsert;
export type RuleCondition = typeof ruleConditions.$inferSelect;
export type InsertRuleCondition = typeof ruleConditions.$inferInsert;
export type Rule = typeof rules.$inferSelect;
export type InsertRule = typeof rules.$inferInsert;
export type RuleSet = typeof ruleSets.$inferSelect;
export type InsertRuleSet = typeof ruleSets.$inferInsert;
export type ContentPolicy = typeof contentPolicies.$inferSelect;
export type InsertContentPolicy = typeof contentPolicies.$inferInsert;
export type RecommendationStrategy = typeof recommendationStrategies.$inferSelect;
export type InsertRecommendationStrategy = typeof recommendationStrategies.$inferInsert;
export type NotificationRule = typeof notificationRules.$inferSelect;
export type InsertNotificationRule = typeof notificationRules.$inferInsert;
export type DashboardTemplate = typeof dashboardTemplates.$inferSelect;
export type InsertDashboardTemplate = typeof dashboardTemplates.$inferInsert;
export type Experiment = typeof experiments.$inferSelect;
export type InsertExperiment = typeof experiments.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type MetricSnapshot = typeof metricSnapshots.$inferSelect;
export type InsertMetricSnapshot = typeof metricSnapshots.$inferInsert;

// System Configuration for Global AI API Management
export const systemConfigurations = pgTable("system_configurations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  key: text("key").notNull(), // 설정 키 (예: 'OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT')
  value: text("value").notNull(), // 설정 값
  category: text("category").notNull().default('system'), // 'ai', 'azure', 'database', 'system'
  displayName: text("display_name"), // UI 표시용 이름
  description: text("description"), // 설정 설명
  
  // Security and visibility
  isSecret: boolean("is_secret").default(false), // 비밀 정보인지 여부 (UI 마스킹)
  isActive: boolean("is_active").default(true), // 활성화 여부
  isReadonly: boolean("is_readonly").default(false), // 읽기 전용
  
  // Validation
  validationRules: jsonb("validation_rules"), // 값 검증 규칙
  
  // 관리 정보
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  keyIdx: uniqueIndex("system_config_key_unique").on(table.key),
  categoryIdx: index("system_config_category_idx").on(table.category),
  activeIdx: index("system_config_active_idx").on(table.isActive),
}));

// System Configuration Types
export type SystemConfiguration = typeof systemConfigurations.$inferSelect;
export type InsertSystemConfiguration = typeof systemConfigurations.$inferInsert;

// Insert schemas for validation
export const insertSystemConfigurationSchema = createInsertSchema(systemConfigurations);
export const insertAttributeDefinitionSchema = createInsertSchema(attributeDefinitions);
export const insertSegmentSchema = createInsertSchema(segments);
export const insertRuleConditionSchema = createInsertSchema(ruleConditions);
export const insertRuleSchema = createInsertSchema(rules);
export const insertRuleSetSchema = createInsertSchema(ruleSets);
export const insertContentPolicySchema = createInsertSchema(contentPolicies);
export const insertRecommendationStrategySchema = createInsertSchema(recommendationStrategies);
export const insertNotificationRuleSchema = createInsertSchema(notificationRules);
export const insertDashboardTemplateSchema = createInsertSchema(dashboardTemplates);
export const insertExperimentSchema = createInsertSchema(experiments);
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents);
export const insertMetricSnapshotSchema = createInsertSchema(metricSnapshots);

// ===================================
// NL to SQL Engine Tables
// ===================================

// NL to SQL Prompts table
export const nl2sqlPrompts = pgTable("nl2sql_prompts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  description: text("description"),
  dialect: text("dialect").notNull().default('postgres'), // 'postgres', 'bigquery', 'ansi'
  systemPrompt: text("system_prompt").notNull(),
  userTemplate: text("user_template").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => ({
  nameIdx: index("nl2sql_prompts_name_idx").on(table.name),
  dialectIdx: index("nl2sql_prompts_dialect_idx").on(table.dialect),
  activeIdx: index("nl2sql_prompts_active_idx").on(table.isActive),
}));

// Schema Sources table (internal postgres, BigQuery, etc.)
export const schemaSources = pgTable("schema_sources", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'internal_postgres', 'bigquery'
  projectId: text("project_id"), // For BigQuery
  dataset: text("dataset"), // For BigQuery dataset
  location: text("location"), // For BigQuery location (US, EU, etc.)
  isDefault: boolean("is_default").default(false),
  credentialsKey: text("credentials_key"), // References systemConfigurations.key for secrets
  config: jsonb("config"), // Additional configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => ({
  nameIdx: index("schema_sources_name_idx").on(table.name),
  typeIdx: index("schema_sources_type_idx").on(table.type),
  defaultIdx: index("schema_sources_default_idx").on(table.isDefault),
}));

// Dictionaries table
export const dictionaries = pgTable("dictionaries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  sourceId: varchar("source_id").references(() => schemaSources.id).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => ({
  nameIdx: index("dictionaries_name_idx").on(table.name),
  sourceIdx: index("dictionaries_source_idx").on(table.sourceId),
}));

// Dictionary Entries table
export const dictionaryEntries = pgTable("dictionary_entries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  dictionaryId: varchar("dictionary_id").references(() => dictionaries.id).notNull(),
  tableName: text("table_name").notNull(),
  columnName: text("column_name").notNull(),
  meaningKo: text("meaning_ko"), // 한국어 의미
  meaningEn: text("meaning_en"), // 영어 의미
  meaningKokr: text("meaning_kokr"), // 한글 외래어 표기
  tags: text("tags").array().default(sql`'{}'::text[]`),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  dictionaryIdx: index("dictionary_entries_dict_idx").on(table.dictionaryId),
  tableIdx: index("dictionary_entries_table_idx").on(table.tableName),
  columnIdx: index("dictionary_entries_column_idx").on(table.columnName),
  compoundIdx: index("dictionary_entries_compound_idx").on(table.dictionaryId, table.tableName, table.columnName),
}));

// Relations
export const nl2sqlPromptsRelations = relations(nl2sqlPrompts, ({ one }) => ({
  creator: one(users, {
    fields: [nl2sqlPrompts.createdBy],
    references: [users.id],
  }),
}));

export const schemaSourcesRelations = relations(schemaSources, ({ one, many }) => ({
  creator: one(users, {
    fields: [schemaSources.createdBy],
    references: [users.id],
  }),
  dictionaries: many(dictionaries),
}));

export const dictionariesRelations = relations(dictionaries, ({ one, many }) => ({
  source: one(schemaSources, {
    fields: [dictionaries.sourceId],
    references: [schemaSources.id],
  }),
  creator: one(users, {
    fields: [dictionaries.createdBy],
    references: [users.id],
  }),
  entries: many(dictionaryEntries),
}));

export const dictionaryEntriesRelations = relations(dictionaryEntries, ({ one }) => ({
  dictionary: one(dictionaries, {
    fields: [dictionaryEntries.dictionaryId],
    references: [dictionaries.id],
  }),
}));

// Type exports for NL to SQL
export type Nl2sqlPrompt = typeof nl2sqlPrompts.$inferSelect;
export type InsertNl2sqlPrompt = typeof nl2sqlPrompts.$inferInsert;
export type SchemaSource = typeof schemaSources.$inferSelect;
export type InsertSchemaSource = typeof schemaSources.$inferInsert;
export type Dictionary = typeof dictionaries.$inferSelect;
export type InsertDictionary = typeof dictionaries.$inferInsert;
export type DictionaryEntry = typeof dictionaryEntries.$inferSelect;
export type InsertDictionaryEntry = typeof dictionaryEntries.$inferInsert;

// Insert schemas for validation
export const insertNl2sqlPromptSchema = createInsertSchema(nl2sqlPrompts);
export const insertSchemaSourceSchema = createInsertSchema(schemaSources);
export const insertDictionarySchema = createInsertSchema(dictionaries);
export const insertDictionaryEntrySchema = createInsertSchema(dictionaryEntries);

// ===================================
// Azure Service Configurations Table
// ===================================

// Azure service configurations table for storing Azure service settings
export const azureConfigs = pgTable("azure_configs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  serviceName: varchar("service_name", { length: 50 }).notNull().unique(),
  config: jsonb("config").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  serviceNameIdx: index("azure_configs_service_name_idx").on(table.serviceName),
  isActiveIdx: index("azure_configs_is_active_idx").on(table.isActive),
}));

// Azure Config Types
export type AzureConfig = typeof azureConfigs.$inferSelect;
export type InsertAzureConfig = typeof azureConfigs.$inferInsert;

// Insert schema for validation
export const insertAzureConfigSchema = createInsertSchema(azureConfigs);

// ===================================
// Workflow Execution System Tables
// ===================================

// Workflow execution sessions
export const workflowSessions = pgTable("workflow_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  sessionName: text("session_name").notNull(),
  workflowId: varchar("workflow_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed, cancelled
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  workflowIdIdx: index("workflow_sessions_workflow_id_idx").on(table.workflowId),
  statusIdx: index("workflow_sessions_status_idx").on(table.status),
  createdByIdx: index("workflow_sessions_created_by_idx").on(table.createdBy),
}));

// Workflow node definitions
export const workflowNodes = pgTable("workflow_nodes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  workflowId: varchar("workflow_id").notNull(),
  nodeName: text("node_name").notNull(),
  nodeType: text("node_type").notNull(), // prompt, api_call, sql_execution, json_processing, data_transformation
  nodeOrder: integer("node_order").notNull(),
  configuration: jsonb("configuration").notNull(), // 노드별 설정 정보
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  workflowIdIdx: index("workflow_nodes_workflow_id_idx").on(table.workflowId),
  nodeTypeIdx: index("workflow_nodes_node_type_idx").on(table.nodeType),
  nodeOrderIdx: index("workflow_nodes_node_order_idx").on(table.nodeOrder),
}));

// Workflow node executions (세션별 노드 실행 기록)
// nodeId는 workflow.definition.nodes의 id를 저장하므로 workflow_nodes.id와는 다를 수 있음
// 외래키 제약조건을 제거하여 동적 노드 ID를 지원
export const workflowNodeExecutions = pgTable("workflow_node_executions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  sessionId: varchar("session_id").notNull().references(() => workflowSessions.id),
  nodeId: varchar("node_id").notNull(), // workflow.definition.nodes의 id (외래키 제약 없음)
  status: text("status").notNull().default("pending"), // pending, running, completed, failed, skipped
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  inputData: jsonb("input_data"), // 입력 데이터
  outputData: jsonb("output_data"), // 출력 데이터
  errorMessage: text("error_message"),
  executionTime: integer("execution_time"), // 실행 시간 (밀리초)
  retryCount: integer("retry_count").notNull().default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sessionIdIdx: index("workflow_node_executions_session_id_idx").on(table.sessionId),
  nodeIdIdx: index("workflow_node_executions_node_id_idx").on(table.nodeId),
  statusIdx: index("workflow_node_executions_status_idx").on(table.status),
}));

// Session data sharing (노드 간 데이터 공유)
export const workflowSessionData = pgTable("workflow_session_data", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  sessionId: varchar("session_id").notNull().references(() => workflowSessions.id),
  dataKey: text("data_key").notNull(), // 데이터 키 (예: "news_data", "market_events", "theme_analysis")
  dataValue: jsonb("data_value").notNull(), // 실제 데이터
  dataType: text("data_type").notNull(), // string, number, object, array
  createdBy: varchar("created_by").references(() => workflowNodes.id), // 어떤 노드가 생성했는지
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // 프롬프트 실행 결과를 위한 추가 필드들
  promptId: varchar("prompt_id").references(() => prompts.id), // 실행된 프롬프트 ID
  inputData: jsonb("input_data"), // 프롬프트 입력 데이터
  outputData: jsonb("output_data"), // 프롬프트 출력 데이터
  executionStatus: text("execution_status").default("success"), // success, error, partial
  errorMessage: text("error_message"), // 에러 메시지
}, (table) => ({
  sessionIdIdx: index("workflow_session_data_session_id_idx").on(table.sessionId),
  dataKeyIdx: index("workflow_session_data_data_key_idx").on(table.dataKey),
  createdByIdx: index("workflow_session_data_created_by_idx").on(table.createdBy),
  promptIdIdx: index("workflow_session_data_prompt_id_idx").on(table.promptId),
  sessionDataKeyIdx: uniqueIndex("workflow_session_data_session_key_idx").on(table.sessionId, table.dataKey),
}));

// Workflow node dependencies (노드 간 의존성)
export const workflowNodeDependencies = pgTable("workflow_node_dependencies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  workflowId: varchar("workflow_id").notNull(),
  fromNodeId: varchar("from_node_id").notNull().references(() => workflowNodes.id),
  toNodeId: varchar("to_node_id").notNull().references(() => workflowNodes.id),
  dataKey: text("data_key").notNull(), // 전달할 데이터 키
  isRequired: boolean("is_required").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  workflowIdIdx: index("workflow_node_dependencies_workflow_id_idx").on(table.workflowId),
  fromNodeIdIdx: index("workflow_node_dependencies_from_node_id_idx").on(table.fromNodeId),
  toNodeIdIdx: index("workflow_node_dependencies_to_node_id_idx").on(table.toNodeId),
}));

// Workflow Templates (워크플로우 템플릿)
export const workflowTemplates = pgTable("workflow_templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  templateName: text("template_name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // ai_analysis, data_processing, reporting 등
  templateData: jsonb("template_data").notNull(), // 워크플로우 정의 JSON
  isPublic: boolean("is_public").notNull().default(false),
  createdBy: varchar("created_by").references(() => users.id),
  version: text("version").notNull().default("1.0.0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  templateNameIdx: index("workflow_templates_template_name_idx").on(table.templateName),
  categoryIdx: index("workflow_templates_category_idx").on(table.category),
  createdByIdx: index("workflow_templates_created_by_idx").on(table.createdBy),
}));

// Type exports for Workflow System
export type WorkflowSession = typeof workflowSessions.$inferSelect;
export type InsertWorkflowSession = typeof workflowSessions.$inferInsert;
export type WorkflowNode = typeof workflowNodes.$inferSelect;
export type InsertWorkflowNode = typeof workflowNodes.$inferInsert;
export type WorkflowNodeExecution = typeof workflowNodeExecutions.$inferSelect;
export type InsertWorkflowNodeExecution = typeof workflowNodeExecutions.$inferInsert;
export type WorkflowSessionData = typeof workflowSessionData.$inferSelect;
export type InsertWorkflowSessionData = typeof workflowSessionData.$inferInsert;
export type WorkflowNodeDependency = typeof workflowNodeDependencies.$inferSelect;
export type InsertWorkflowNodeDependency = typeof workflowNodeDependencies.$inferInsert;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = typeof workflowTemplates.$inferInsert;

// Insert schemas for validation
export const insertWorkflowSessionSchema = createInsertSchema(workflowSessions);
export const insertWorkflowNodeSchema = createInsertSchema(workflowNodes);
export const insertWorkflowNodeExecutionSchema = createInsertSchema(workflowNodeExecutions);
export const insertWorkflowSessionDataSchema = createInsertSchema(workflowSessionData);
export const insertWorkflowNodeDependencySchema = createInsertSchema(workflowNodeDependencies);
export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates);

// Relations for Workflow System
export const workflowSessionsRelations = relations(workflowSessions, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [workflowSessions.createdBy],
    references: [users.id],
  }),
  nodeExecutions: many(workflowNodeExecutions),
  sessionData: many(workflowSessionData),
}));

export const workflowNodesRelations = relations(workflowNodes, ({ many }) => ({
  executions: many(workflowNodeExecutions),
  sessionData: many(workflowSessionData),
  fromDependencies: many(workflowNodeDependencies, { relationName: "fromNode" }),
  toDependencies: many(workflowNodeDependencies, { relationName: "toNode" }),
}));

export const workflowNodeExecutionsRelations = relations(workflowNodeExecutions, ({ one }) => ({
  session: one(workflowSessions, {
    fields: [workflowNodeExecutions.sessionId],
    references: [workflowSessions.id],
  }),
  node: one(workflowNodes, {
    fields: [workflowNodeExecutions.nodeId],
    references: [workflowNodes.id],
  }),
}));

export const workflowSessionDataRelations = relations(workflowSessionData, ({ one }) => ({
  session: one(workflowSessions, {
    fields: [workflowSessionData.sessionId],
    references: [workflowSessions.id],
  }),
  createdBy: one(workflowNodes, {
    fields: [workflowSessionData.createdBy],
    references: [workflowNodes.id],
  }),
}));

export const workflowNodeDependenciesRelations = relations(workflowNodeDependencies, ({ one }) => ({
  fromNode: one(workflowNodes, {
    fields: [workflowNodeDependencies.fromNodeId],
    references: [workflowNodes.id],
    relationName: "fromNode",
  }),
  toNode: one(workflowNodes, {
    fields: [workflowNodeDependencies.toNodeId],
    references: [workflowNodes.id],
    relationName: "toNode",
  }),
}));

export const workflowTemplatesRelations = relations(workflowTemplates, ({ one }) => ({
  createdBy: one(users, {
    fields: [workflowTemplates.createdBy],
    references: [users.id],
  }),
}));

// ===================================
// Audit Logging System Tables
// ===================================

// Audit logs table (시스템 전체 감사)
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // 감사 이벤트 기본 정보
  eventType: varchar("event_type", { length: 50 }).notNull(), // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, EXECUTE, VIEW, EXPORT, IMPORT, CONFIG_CHANGE, SECURITY_EVENT
  eventCategory: varchar("event_category", { length: 50 }).notNull(), // AUTHENTICATION, AUTHORIZATION, DATA_ACCESS, DATA_MODIFICATION, SYSTEM_CONFIG, SECURITY, COMPLIANCE
  severity: varchar("severity", { length: 20 }).notNull().default("INFO"), // CRITICAL, HIGH, MEDIUM, LOW, INFO
  
  // 액션 정보
  action: varchar("action", { length: 100 }).notNull(), // 상세 액션 명
  actionDescription: text("action_description"), // 액션 설명
  resourceType: varchar("resource_type", { length: 50 }), // USER, SERVICE, PROMPT, API, WORKFLOW, CONFIG, etc.
  resourceId: varchar("resource_id", { length: 100 }), // 리소스 ID
  
  // 사용자 정보
  userId: varchar("user_id", { length: 36 }),
  username: varchar("username", { length: 100 }),
  userRole: varchar("user_role", { length: 50 }),
  userIp: varchar("user_ip", { length: 50 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  userIdentifier: varchar("user_identifier", { length: 255 }), // 사용자 구분자 (추가)
  
  // 가드레일 탐지 정보
  guardrailDetected: boolean("guardrail_detected").default(false), // 가드레일 탐지 여부
  guardrailType: varchar("guardrail_type", { length: 50 }), // INPUT_GUARDRAIL, OUTPUT_GUARDRAIL, PROMPT_INJECTION 등
  
  // 결과 정보
  success: boolean("success").notNull().default(true),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms"),
  
  // 요청/응답 정보
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  
  // 추가 컨텍스트
  metadata: jsonb("metadata"), // 추가 메타데이터
  tags: varchar("tags", { length: 100 }).array(), // 검색용 태그
  
  // 타임스탬프
  createdAt: timestamp("created_at").notNull().defaultNow(),
  
  // 감사 추적 필수 항목
  auditTrail: text("audit_trail"), // 전체 감사 추적 경로
  complianceFlag: boolean("compliance_flag").default(false), // 컴플라이언스 체크 필요 여부
  retentionPeriod: integer("retention_period").default(2555), // 보관 기간 (일) - CHECK 제약은 애플리케이션 레벨에서 처리
}, (table) => ({
  userIdIdx: index("idx_audit_logs_user_id").on(table.userId),
  usernameIdx: index("idx_audit_logs_username").on(table.username),
  eventTypeIdx: index("idx_audit_logs_event_type").on(table.eventType),
  eventCategoryIdx: index("idx_audit_logs_event_category").on(table.eventCategory),
  severityIdx: index("idx_audit_logs_severity").on(table.severity),
  createdAtIdx: index("idx_audit_logs_created_at").on(table.createdAt),
  resourceTypeIdx: index("idx_audit_logs_resource_type").on(table.resourceType),
  resourceIdIdx: index("idx_audit_logs_resource_id").on(table.resourceId),
  successIdx: index("idx_audit_logs_success").on(table.success),
  sessionIdIdx: index("idx_audit_logs_session_id").on(table.sessionId),
  userIdentifierIdx: index("idx_audit_logs_user_identifier").on(table.userIdentifier),
  guardrailDetectedIdx: index("idx_audit_logs_guardrail_detected").on(table.guardrailDetected),
  guardrailTypeIdx: index("idx_audit_logs_guardrail_type").on(table.guardrailType),
  tagsGinIdx: index("idx_audit_logs_tags").using("gin", sql`tags`),
  metadataGinIdx: index("idx_audit_logs_metadata").using("gin", sql`metadata`),
}));

// Data access logs table (민감 정보 접근 추적)
export const dataAccessLogs = pgTable("data_access_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // 액세스 정보
  accessType: varchar("access_type", { length: 50 }).notNull(), // READ, WRITE, UPDATE, DELETE, EXPORT
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: varchar("record_id", { length: 100 }),
  
  // 데이터 민감도
  dataClassification: varchar("data_classification", { length: 20 }).notNull().default("PUBLIC"), // PUBLIC, INTERNAL, CONFIDENTIAL, SECRET, TOP_SECRET
  piiIncluded: boolean("pii_included").default(false), // 개인정보 포함 여부
  financialDataIncluded: boolean("financial_data_included").default(false), // 금융 데이터 포함 여부
  
  // 사용자 정보
  userId: varchar("user_id", { length: 36 }).notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  userIp: varchar("user_ip", { length: 50 }).notNull(),
  
  // 액세스 결과
  success: boolean("success").notNull().default(true),
  recordCount: integer("record_count"),
  queryExecuted: text("query_executed"),
  queryParameters: jsonb("query_parameters"),
  
  // 위치 정보 (선택적)
  locationInfo: jsonb("location_info"), // 지리적 위치 정보
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_data_access_logs_user_id").on(table.userId),
  tableNameIdx: index("idx_data_access_logs_table_name").on(table.tableName),
  dataClassificationIdx: index("idx_data_access_logs_data_classification").on(table.dataClassification),
  piiIncludedIdx: index("idx_data_access_logs_pii_included").on(table.piiIncluded),
  createdAtIdx: index("idx_data_access_logs_created_at").on(table.createdAt),
}));

// Security events table (보안 이벤트 로그)
export const securityEvents = pgTable("security_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // 이벤트 정보
  eventType: varchar("event_type", { length: 50 }).notNull(), // BREACH_ATTEMPT, UNAUTHORIZED_ACCESS, AUTHENTICATION_FAILURE, SUSPICIOUS_ACTIVITY, PRIVILEGE_ESCALATION
  threatLevel: varchar("threat_level", { length: 20 }).notNull().default("LOW"), // CRITICAL, HIGH, MEDIUM, LOW
  
  // 사용자 정보
  userId: varchar("user_id", { length: 36 }),
  username: varchar("username", { length: 100 }),
  userIp: varchar("user_ip", { length: 50 }).notNull(),
  userAgent: text("user_agent"),
  
  // 이벤트 상세
  description: text("description").notNull(),
  source: varchar("source", { length: 100 }), // 시스템/서비스 이름
  affectedResource: varchar("affected_resource", { length: 100 }),
  
  // 대응 정보
  mitigationAction: varchar("mitigation_action", { length: 100 }), // BLOCKED, ALLOWED, PENDING_REVIEW
  autoRemediated: boolean("auto_remediated").default(false),
  
  // 추가 정보
  details: jsonb("details"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  eventTypeIdx: index("idx_security_events_event_type").on(table.eventType),
  threatLevelIdx: index("idx_security_events_threat_level").on(table.threatLevel),
  userIdIdx: index("idx_security_events_user_id").on(table.userId),
  createdAtIdx: index("idx_security_events_created_at").on(table.createdAt),
}));

// Audit reports table (감사 보고서)
export const auditReports = pgTable("audit_reports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  reportType: varchar("report_type", { length: 50 }).notNull(), // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, AD_HOC
  reportName: varchar("report_name", { length: 200 }).notNull(),
  reportPeriodStart: timestamp("report_period_start").notNull(),
  reportPeriodEnd: timestamp("report_period_end").notNull(),
  
  generatedBy: varchar("generated_by", { length: 36 }),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  
  // 보고서 내용
  summary: jsonb("summary"), // 요약 통계
  findings: jsonb("findings"), // 발견 사항
  recommendations: text("recommendations"), // 권고 사항
  
  status: varchar("status", { length: 20 }).default("DRAFT"), // DRAFT, FINAL, ARCHIVED
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  reportTypeIdx: index("idx_audit_reports_report_type").on(table.reportType),
  generatedByIdx: index("idx_audit_reports_generated_by").on(table.generatedBy),
  generatedAtIdx: index("idx_audit_reports_generated_at").on(table.generatedAt),
}));

// Audit logs archive table (오래된 로그 저장)
export const auditLogsArchive = pgTable("audit_logs_archive", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventCategory: varchar("event_category", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("INFO"),
  action: varchar("action", { length: 100 }).notNull(),
  actionDescription: text("action_description"),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 100 }),
  userId: varchar("user_id", { length: 36 }),
  username: varchar("username", { length: 100 }),
  userRole: varchar("user_role", { length: 50 }),
  userIp: varchar("user_ip", { length: 50 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  success: boolean("success").notNull().default(true),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms"),
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  metadata: jsonb("metadata"),
  tags: varchar("tags", { length: 100 }).array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  auditTrail: text("audit_trail"),
  complianceFlag: boolean("compliance_flag").default(false),
  retentionPeriod: integer("retention_period").default(2555),
}, (table) => ({
  createdAtIdx: index("idx_audit_logs_archive_created_at").on(table.createdAt),
  userIdIdx: index("idx_audit_logs_archive_user_id").on(table.userId),
  eventTypeIdx: index("idx_audit_logs_archive_event_type").on(table.eventType),
}));

// Type exports for Audit Logging System
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type DataAccessLog = typeof dataAccessLogs.$inferSelect;
export type InsertDataAccessLog = typeof dataAccessLogs.$inferInsert;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;
export type AuditReport = typeof auditReports.$inferSelect;
export type InsertAuditReport = typeof auditReports.$inferInsert;
export type AuditLogArchive = typeof auditLogsArchive.$inferSelect;
export type InsertAuditLogArchive = typeof auditLogsArchive.$inferInsert;

// Insert schemas for validation
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertDataAccessLogSchema = createInsertSchema(dataAccessLogs);
export const insertSecurityEventSchema = createInsertSchema(securityEvents);
export const insertAuditReportSchema = createInsertSchema(auditReports);
export const insertAuditLogArchiveSchema = createInsertSchema(auditLogsArchive);

// Relations for Audit Logging System
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const dataAccessLogsRelations = relations(dataAccessLogs, ({ one }) => ({
  user: one(users, {
    fields: [dataAccessLogs.userId],
    references: [users.id],
  }),
}));

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  user: one(users, {
    fields: [securityEvents.userId],
    references: [users.id],
  }),
}));

export const auditReportsRelations = relations(auditReports, ({ one }) => ({
  generatedByUser: one(users, {
    fields: [auditReports.generatedBy],
    references: [users.id],
  }),
}));

// Application Logs table for comprehensive logging
export const applicationLogs = pgTable("application_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // Log identification
  logLevel: varchar("log_level", { length: 20 }).notNull().default("info"), // info, warn, error, debug
  logCategory: varchar("log_category", { length: 100 }), // api, workflow, database, frontend, etc.
  logType: varchar("log_type", { length: 50 }), // request, response, error, success, execution
  
  // Caller and Callee information
  caller: varchar("caller", { length: 200 }), // Function, component, or API endpoint that initiated the call
  callee: varchar("callee", { length: 200 }), // Function, component, or API endpoint that was called
  callerFile: text("caller_file"), // Source file path
  calleeFile: text("callee_file"), // Target file path
  
  // API/Function details
  endpoint: text("endpoint"), // API endpoint (e.g., /api/prompts)
  method: varchar("method", { length: 10 }), // HTTP method (GET, POST, etc.)
  apiName: varchar("api_name", { length: 200 }), // API name or function name
  
  // Request/Response data
  requestData: jsonb("request_data"), // Request payload
  responseData: jsonb("response_data"), // Response payload
  requestHeaders: jsonb("request_headers"), // Request headers
  responseHeaders: jsonb("response_headers"), // Response headers
  
  // Status and timing
  status: varchar("status", { length: 20 }), // success, failed, error, timeout
  httpStatusCode: integer("http_status_code"), // HTTP status code
  executionTimeMs: integer("execution_time_ms"), // Execution time in milliseconds
  responseSize: integer("response_size"), // Response size in bytes
  
  // Error information
  errorType: varchar("error_type", { length: 100 }), // Error type classification
  errorMessage: text("error_message"), // Error message
  errorStack: text("error_stack"), // Error stack trace
  errorCode: varchar("error_code", { length: 50 }), // Error code
  
  // Success information
  successMessage: text("success_message"), // Success message
  successCode: varchar("success_code", { length: 50 }), // Success code
  
  // User and session context
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  username: varchar("username", { length: 100 }),
  userRole: varchar("user_role", { length: 50 }),
  sessionId: varchar("session_id", { length: 100 }),
  userIp: varchar("user_ip", { length: 50 }),
  userAgent: text("user_agent"),
  
  // Workflow context
  workflowId: varchar("workflow_id").references(() => workflows.id),
  workflowExecutionId: varchar("workflow_execution_id").references(() => workflowExecutions.id),
  nodeId: varchar("node_id", { length: 100 }),
  
  // Resource context
  resourceType: varchar("resource_type", { length: 50 }), // prompt, api, workflow, python_script, etc.
  resourceId: varchar("resource_id", { length: 100 }), // Resource ID
  
  // Additional metadata
  metadata: jsonb("metadata"), // Additional context data
  tags: varchar("tags", { length: 100 }).array(), // Tags for categorization
  
  // Timestamp
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  logLevelIdx: index("app_logs_level_idx").on(table.logLevel),
  logCategoryIdx: index("app_logs_category_idx").on(table.logCategory),
  logTypeIdx: index("app_logs_type_idx").on(table.logType),
  callerIdx: index("app_logs_caller_idx").on(table.caller),
  calleeIdx: index("app_logs_callee_idx").on(table.callee),
  endpointIdx: index("app_logs_endpoint_idx").on(table.endpoint),
  statusIdx: index("app_logs_status_idx").on(table.status),
  httpStatusCodeIdx: index("app_logs_http_status_idx").on(table.httpStatusCode),
  userIdIdx: index("app_logs_user_id_idx").on(table.userId),
  sessionIdIdx: index("app_logs_session_id_idx").on(table.sessionId),
  workflowIdIdx: index("app_logs_workflow_id_idx").on(table.workflowId),
  workflowExecutionIdIdx: index("app_logs_workflow_execution_id_idx").on(table.workflowExecutionId),
  timestampIdx: index("app_logs_timestamp_idx").on(table.timestamp),
  createdAtIdx: index("app_logs_created_at_idx").on(table.createdAt),
  // Composite indexes for common query patterns
  levelCategoryIdx: index("app_logs_level_category_idx").on(table.logLevel, table.logCategory),
  userTimestampIdx: index("app_logs_user_timestamp_idx").on(table.userId, table.timestamp),
  endpointTimestampIdx: index("app_logs_endpoint_timestamp_idx").on(table.endpoint, table.timestamp),
  // JSONB GIN indexes for efficient metadata search
  metadataGinIdx: index("app_logs_metadata_gin_idx").using("gin", sql`metadata`),
}));

// Logging Settings table for enabling/disabling logging
export const loggingSettings = pgTable("logging_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(), // e.g., "enable_logging", "enable_api_logging"
  settingValue: jsonb("setting_value").notNull(), // Setting value (boolean, object, etc.)
  description: text("description"), // Setting description
  category: varchar("category", { length: 50 }), // Setting category
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  settingKeyIdx: index("logging_settings_key_idx").on(table.settingKey),
  categoryIdx: index("logging_settings_category_idx").on(table.category),
  activeIdx: index("logging_settings_active_idx").on(table.isActive),
}));

// Data Sources table (Databricks, PostgreSQL, CosmosDB, JDBC, AI Search/RAG)
export const dataSources = pgTable("data_sources", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: varchar("name", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  type: varchar("type", { length: 50 }).notNull(), // 'databricks', 'postgresql', 'cosmosdb', 'jdbc', 'ai_search'
  description: text("description"),
  // Connection configuration (type-specific)
  config: jsonb("config").notNull(), // Connection details, credentials, etc.
  // Type-specific fields
  host: text("host"), // For JDBC, PostgreSQL
  port: integer("port"), // For JDBC, PostgreSQL
  database: text("database"), // For PostgreSQL, CosmosDB
  schema: text("schema"), // For PostgreSQL
  catalog: text("catalog"), // For Databricks
  workspaceUrl: text("workspace_url"), // For Databricks
  endpoint: text("endpoint"), // For CosmosDB, AI Search
  // Credentials (encrypted or key reference)
  credentialsKey: text("credentials_key"), // References systemConfigurations.key for secrets
  // Status
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").default(false),
  // Metadata
  tags: varchar("tags", { length: 100 }).array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
}, (table) => ({
  nameIdx: index("data_sources_name_idx").on(table.name),
  typeIdx: index("data_sources_type_idx").on(table.type),
  activeIdx: index("data_sources_active_idx").on(table.isActive),
  defaultIdx: index("data_sources_default_idx").on(table.isDefault),
}));

// SQL Queries table (stored queries for data sources)
export const sqlQueries = pgTable("sql_queries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  dataSourceId: varchar("data_source_id", { length: 36 }).notNull().references(() => dataSources.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  description: text("description"),
  query: text("query").notNull(), // SQL query text
  queryType: varchar("query_type", { length: 50 }).default("select"), // 'select', 'insert', 'update', 'delete', 'custom'
  // Parameters/variables in query
  parameters: jsonb("parameters"), // Array of parameter definitions
  // Expected result schema
  resultSchema: jsonb("result_schema"), // Expected column structure
  // Validation
  timeout: integer("timeout").default(30000), // Query timeout in ms
  maxRows: integer("max_rows"), // Maximum rows to return
  // Status
  isActive: boolean("is_active").notNull().default(true),
  // Metadata
  tags: varchar("tags", { length: 100 }).array(),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
}, (table) => ({
  dataSourceIdIdx: index("sql_queries_data_source_id_idx").on(table.dataSourceId),
  nameIdx: index("sql_queries_name_idx").on(table.name),
  activeIdx: index("sql_queries_active_idx").on(table.isActive),
  categoryIdx: index("sql_queries_category_idx").on(table.category),
}));

// Type exports for Application Logging System
export type ApplicationLog = typeof applicationLogs.$inferSelect;
export type InsertApplicationLog = typeof applicationLogs.$inferInsert;
export type LoggingSetting = typeof loggingSettings.$inferSelect;
export type InsertLoggingSetting = typeof loggingSettings.$inferInsert;

// ===================================
// RAG (Retrieval-Augmented Generation) System Tables
// ===================================

// RAG Embedding Schemas table (벡터 임베딩 대상 스키마 관리)
export const ragEmbeddingSchemas = pgTable("rag_embedding_schemas", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Databricks 연결 정보
  databricksCatalog: varchar("databricks_catalog", { length: 100 }),
  databricksSchema: varchar("databricks_schema", { length: 100 }),
  databricksTable: varchar("databricks_table", { length: 255 }).notNull(),
  databricksQuery: text("databricks_query"), // 커스텀 쿼리 (선택적)
  
  // 임베딩 설정
  embeddingModel: varchar("embedding_model", { length: 100 }).default("text-embedding-3-large"),
  embeddingDimensions: integer("embedding_dimensions").default(3072),
  embeddingField: varchar("embedding_field", { length: 255 }), // 임베딩할 필드명
  
  // AI Search 인덱스 설정
  searchIndexName: varchar("search_index_name", { length: 255 }).notNull(),
  vectorFieldName: varchar("vector_field_name", { length: 100 }).default("content_vector"),
  contentFieldName: varchar("content_field_name", { length: 100 }).default("content"),
  
  // 필터링 필드 (메타데이터)
  metadataFields: jsonb("metadata_fields"), // JSON 배열: ["symbol", "date", "category"]
  
  // 상태
  isActive: boolean("is_active").notNull().default(true),
  
  // 타임스탬프
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
}, (table) => ({
  nameIdx: index("rag_embedding_schemas_name_idx").on(table.name),
  activeIdx: index("rag_embedding_schemas_active_idx").on(table.isActive),
  tableIdx: index("rag_embedding_schemas_table_idx").on(table.databricksTable),
}));

// RAG Embedding Jobs table (임베딩 작업 관리)
export const ragEmbeddingJobs = pgTable("rag_embedding_jobs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  schemaId: varchar("schema_id", { length: 36 }).notNull().references(() => ragEmbeddingSchemas.id),
  
  // 작업 정보
  jobType: varchar("job_type", { length: 50 }).notNull(), // INCREMENTAL_NEW, INCREMENTAL_HISTORICAL, FULL, MANUAL
  jobStatus: varchar("job_status", { length: 50 }).notNull().default("PENDING"), // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
  
  // 진행률
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  failedRecords: integer("failed_records").default(0),
  progressPercentage: integer("progress_percentage").default(0),
  
  // 시간 정보
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  estimatedCompletionTime: timestamp("estimated_completion_time"),
  
  // 에러 정보
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  
  // 작업 설정
  batchSize: integer("batch_size").default(1000),
  startDate: timestamp("start_date"), // 과거 데이터 임베딩 시작 날짜
  endDate: timestamp("end_date"), // 과거 데이터 임베딩 종료 날짜
  
  // 메타데이터
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
}, (table) => ({
  schemaIdIdx: index("rag_embedding_jobs_schema_id_idx").on(table.schemaId),
  statusIdx: index("rag_embedding_jobs_status_idx").on(table.jobStatus),
  createdAtIdx: index("rag_embedding_jobs_created_at_idx").on(table.createdAt),
}));

// RAG Embedding Status table (스키마별 임베딩 상태 추적)
export const ragEmbeddingStatus = pgTable("rag_embedding_status", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  schemaId: varchar("schema_id", { length: 36 }).notNull().references(() => ragEmbeddingSchemas.id).unique(),
  
  // 최신 데이터 임베딩 상태
  latestDataEmbeddedAt: timestamp("latest_data_embedded_at"), // 최신 데이터 임베딩 완료 시점
  latestDataEmbeddedCount: integer("latest_data_embedded_count").default(0),
  
  // 과거 데이터 임베딩 상태
  historicalDataEmbeddingStatus: varchar("historical_data_embedding_status", { length: 50 }).default("NOT_STARTED"), // NOT_STARTED, IN_PROGRESS, COMPLETED
  historicalDataStartDate: timestamp("historical_data_start_date"), // 과거 데이터 시작 날짜
  historicalDataEndDate: timestamp("historical_data_end_date"), // 과거 데이터 종료 날짜
  historicalDataTotalRecords: integer("historical_data_total_records").default(0),
  historicalDataEmbeddedRecords: integer("historical_data_embedded_records").default(0),
  historicalDataProgressPercentage: integer("historical_data_progress_percentage").default(0),
  
  // 전체 통계
  totalRecordsInSource: integer("total_records_in_source").default(0),
  totalEmbeddedRecords: integer("total_embedded_records").default(0),
  totalFailedRecords: integer("total_failed_records").default(0),
  
  // 마지막 업데이트
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
  
  // 현재 실행 중인 작업
  currentJobId: varchar("current_job_id", { length: 36 }).references(() => ragEmbeddingJobs.id),
}, (table) => ({
  schemaIdIdx: index("rag_embedding_status_schema_id_idx").on(table.schemaId),
  lastUpdatedAtIdx: index("rag_embedding_status_last_updated_at_idx").on(table.lastUpdatedAt),
}));

// RAG Metadata table (메타데이터 저장 - PostgreSQL)
export const ragMetadata = pgTable("rag_metadata", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  schemaId: varchar("schema_id", { length: 36 }).notNull().references(() => ragEmbeddingSchemas.id),
  
  // 문서 정보
  documentId: varchar("document_id", { length: 255 }).notNull(), // AI Search 문서 ID
  sourceRecordId: varchar("source_record_id", { length: 255 }), // Databricks 원본 레코드 ID
  
  // 추출된 메타데이터
  metadata: jsonb("metadata").notNull(), // { symbol, date, category, tags, etc. }
  
  // CosmosDB 정보
  cosmosDbDocumentId: varchar("cosmos_db_document_id", { length: 255 }),
  cosmosDbContainerId: varchar("cosmos_db_container_id", { length: 100 }).default("rag-metadata"),
  
  // 타임스탬프
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  schemaIdIdx: index("rag_metadata_schema_id_idx").on(table.schemaId),
  documentIdIdx: index("rag_metadata_document_id_idx").on(table.documentId),
  sourceRecordIdIdx: index("rag_metadata_source_record_id_idx").on(table.sourceRecordId),
  cosmosDbDocumentIdIdx: index("rag_metadata_cosmos_db_document_id_idx").on(table.cosmosDbDocumentId),
  metadataGinIdx: index("rag_metadata_metadata_idx").using("gin", sql`metadata`),
}));

// RAG Chat Sessions table (챗봇 대화 세션)
export const ragChatSessions = pgTable("rag_chat_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  
  // 세션 정보
  title: varchar("title", { length: 255 }),
  sessionType: varchar("session_type", { length: 50 }).default("RAG_CHAT"), // RAG_CHAT, GENERAL
  
  // 설정
  searchIndexName: varchar("search_index_name", { length: 255 }),
  maxSearchResults: integer("max_search_results").default(5),
  temperature: doublePrecision("temperature").default(0.7),
  
  // 통계
  messageCount: integer("message_count").default(0),
  
  // 타임스탬프
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("rag_chat_sessions_user_id_idx").on(table.userId),
  createdAtIdx: index("rag_chat_sessions_created_at_idx").on(table.createdAt),
}));

// RAG Chat Messages table (챗봇 대화 메시지)
export const ragChatMessages = pgTable("rag_chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  sessionId: varchar("session_id", { length: 36 }).notNull().references(() => ragChatSessions.id),
  
  // 메시지 정보
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  
  // RAG 검색 결과
  searchResults: jsonb("search_results"), // 검색된 문서들
  searchQuery: text("search_query"), // 검색 쿼리
  
  // 메타데이터
  metadata: jsonb("metadata"),
  
  // 타임스탬프
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index("rag_chat_messages_session_id_idx").on(table.sessionId),
  createdAtIdx: index("rag_chat_messages_created_at_idx").on(table.createdAt),
}));

// ===================================
// RAG 보안 및 형상관리 테이블
// ===================================

// RAG 데이터 버전 관리 테이블
export const ragDataVersionControl = pgTable("rag_data_version_control", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  documentId: varchar("document_id", { length: 255 }).notNull(),
  schemaId: varchar("schema_id", { length: 36 }).references(() => ragEmbeddingSchemas.id),
  
  // 버전 정보
  versionNumber: integer("version_number").notNull().default(1),
  previousVersionId: varchar("previous_version_id", { length: 36 }),
  
  // 데이터 해시 (무결성 검증)
  dataHash: varchar("data_hash", { length: 64 }).notNull(), // SHA-256
  previousDataHash: varchar("previous_data_hash", { length: 64 }),
  
  // 변경 정보
  changeType: varchar("change_type", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE
  changeDescription: text("change_description"),
  changedFields: jsonb("changed_fields"), // 변경된 필드 목록
  
  // 변경자 정보
  changedBy: varchar("changed_by", { length: 36 }).references(() => users.id),
  changedByUsername: varchar("changed_by_username", { length: 100 }),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  
  // 데이터 스냅샷 (선택적)
  dataSnapshot: jsonb("data_snapshot"), // 변경 시점의 데이터 스냅샷
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index("rag_data_version_control_document_id_idx").on(table.documentId),
  schemaIdIdx: index("rag_data_version_control_schema_id_idx").on(table.schemaId),
  versionNumberIdx: index("rag_data_version_control_version_number_idx").on(table.versionNumber),
  changedAtIdx: index("rag_data_version_control_changed_at_idx").on(table.changedAt),
}));

// RAG 데이터 위변조 탐지 테이블
export const ragDataTamperingDetection = pgTable("rag_data_tampering_detection", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  documentId: varchar("document_id", { length: 255 }).notNull(),
  schemaId: varchar("schema_id", { length: 36 }).references(() => ragEmbeddingSchemas.id),
  
  // 탐지 정보
  detectionType: varchar("detection_type", { length: 50 }).notNull(), // HASH_MISMATCH, UNEXPECTED_CHANGE, UNAUTHORIZED_MODIFICATION
  detectionSeverity: varchar("detection_severity", { length: 20 }).notNull().default("MEDIUM"), // CRITICAL, HIGH, MEDIUM, LOW
  detectionDetails: jsonb("detection_details").notNull(), // 탐지 상세 정보
  
  // 해시 정보
  expectedHash: varchar("expected_hash", { length: 64 }),
  actualHash: varchar("actual_hash", { length: 64 }),
  
  // 탐지 시점
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  detectedBy: varchar("detected_by", { length: 100 }), // 시스템 또는 사용자
  
  // 대응 정보
  mitigationAction: varchar("mitigation_action", { length: 100 }), // ROLLBACK, ALERT, BLOCK, INVESTIGATE
  mitigationStatus: varchar("mitigation_status", { length: 50 }).default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, FAILED
  mitigatedAt: timestamp("mitigated_at"),
  mitigatedBy: varchar("mitigated_by", { length: 36 }).references(() => users.id),
  
  // 추가 정보
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index("rag_data_tampering_detection_document_id_idx").on(table.documentId),
  schemaIdIdx: index("rag_data_tampering_detection_schema_id_idx").on(table.schemaId),
  detectionTypeIdx: index("rag_data_tampering_detection_detection_type_idx").on(table.detectionType),
  detectedAtIdx: index("rag_data_tampering_detection_detected_at_idx").on(table.detectedAt),
  mitigationStatusIdx: index("rag_data_tampering_detection_mitigation_status_idx").on(table.mitigationStatus),
}));

// RAG 데이터 이상치 탐지 테이블
export const ragDataAnomalyDetection = pgTable("rag_data_anomaly_detection", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  documentId: varchar("document_id", { length: 255 }).notNull(),
  schemaId: varchar("schema_id", { length: 36 }).references(() => ragEmbeddingSchemas.id),
  
  // 이상치 정보
  anomalyType: varchar("anomaly_type", { length: 50 }).notNull(), // STATISTICAL_OUTLIER, PATTERN_ANOMALY, CONTENT_ANOMALY, STRUCTURE_ANOMALY
  anomalyScore: doublePrecision("anomaly_score").notNull(), // 0-1 사이의 이상치 점수
  anomalyDescription: text("anomaly_description"),
  anomalyDetails: jsonb("anomaly_details"), // 이상치 상세 정보
  
  // 탐지 방법
  detectionMethod: varchar("detection_method", { length: 50 }), // STATISTICAL, ML_MODEL, RULE_BASED, PATTERN_MATCHING
  
  // 탐지 시점
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  detectedBy: varchar("detected_by", { length: 100 }), // 시스템 또는 사용자
  
  // 검증 정보
  verified: boolean("verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by", { length: 36 }).references(() => users.id),
  verificationNotes: text("verification_notes"),
  
  // 추가 정보
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index("rag_data_anomaly_detection_document_id_idx").on(table.documentId),
  schemaIdIdx: index("rag_data_anomaly_detection_schema_id_idx").on(table.schemaId),
  anomalyTypeIdx: index("rag_data_anomaly_detection_anomaly_type_idx").on(table.anomalyType),
  detectedAtIdx: index("rag_data_anomaly_detection_detected_at_idx").on(table.detectedAt),
  verifiedIdx: index("rag_data_anomaly_detection_verified_idx").on(table.verified),
}));

// 데이터 가공 처리 로그 테이블
export const ragDataProcessingLogs = pgTable("rag_data_processing_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  schemaId: varchar("schema_id", { length: 36 }).references(() => ragEmbeddingSchemas.id),
  documentId: varchar("document_id", { length: 255 }),
  
  // 처리 정보
  processingType: varchar("processing_type", { length: 50 }).notNull(), // EXTRACTION, TRANSFORMATION, VALIDATION, EMBEDDING, INDEXING
  processingStep: varchar("processing_step", { length: 100 }), // 상세 처리 단계
  processingStatus: varchar("processing_status", { length: 50 }).notNull().default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, FAILED
  
  // 입력/출력 데이터 해시
  inputDataHash: varchar("input_data_hash", { length: 64 }),
  outputDataHash: varchar("output_data_hash", { length: 64 }),
  
  // 처리 전/후 데이터 스냅샷
  inputDataSnapshot: jsonb("input_data_snapshot"),
  outputDataSnapshot: jsonb("output_data_snapshot"),
  
  // 처리 결과
  processingResult: jsonb("processing_result"),
  errorMessage: text("error_message"),
  
  // 처리자 정보
  processedBy: varchar("processed_by", { length: 100 }), // 시스템 또는 사용자
  processedAt: timestamp("processed_at").notNull().defaultNow(),
  
  // 추가 정보
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  schemaIdIdx: index("rag_data_processing_logs_schema_id_idx").on(table.schemaId),
  documentIdIdx: index("rag_data_processing_logs_document_id_idx").on(table.documentId),
  processingTypeIdx: index("rag_data_processing_logs_processing_type_idx").on(table.processingType),
  processedAtIdx: index("rag_data_processing_logs_processed_at_idx").on(table.processedAt),
}));

// 시스템 킬스위치 테이블
export const systemKillswitch = pgTable("system_killswitch", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // 활성화 정보
  isActive: boolean("is_active").notNull().default(false),
  activationReason: text("activation_reason").notNull(), // 활성화 사유
  activationDetails: jsonb("activation_details"), // 활성화 상세 정보
  
  // 활성화자 정보
  activatedBy: varchar("activated_by", { length: 36 }).references(() => users.id),
  activatedByUsername: varchar("activated_by_username", { length: 100 }),
  activatedAt: timestamp("activated_at"),
  
  // 비활성화 정보
  deactivatedBy: varchar("deactivated_by", { length: 36 }).references(() => users.id),
  deactivatedByUsername: varchar("deactivated_by_username", { length: 100 }),
  deactivatedAt: timestamp("deactivated_at"),
  deactivationReason: text("deactivation_reason"),
  
  // 영향 범위
  affectedServices: varchar("affected_services", { length: 500 }).array(), // 영향받는 서비스 목록
  affectedEndpoints: varchar("affected_endpoints", { length: 500 }).array(), // 영향받는 엔드포인트 목록
  
  // 추가 정보
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  isActiveIdx: index("system_killswitch_is_active_idx").on(table.isActive),
  activatedAtIdx: index("system_killswitch_activated_at_idx").on(table.activatedAt),
}));

// 적대적 공격 이벤트 테이블
export const adversarialAttackEvents = pgTable("adversarial_attack_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // 공격 정보
  attackType: varchar("attack_type", { length: 50 }).notNull(), // PROMPT_INJECTION, JAILBREAK, DATA_POISONING, MODEL_EVASION
  attackSeverity: varchar("attack_severity", { length: 20 }).notNull().default("MEDIUM"), // CRITICAL, HIGH, MEDIUM, LOW
  attackPattern: text("attack_pattern"), // 공격 패턴
  
  // 탐지 정보
  detectionMethod: varchar("detection_method", { length: 50 }), // PROMPT_SHIELD, SAFETY_FILTER, RULE_BASED, ML_MODEL
  detectionConfidence: doublePrecision("detection_confidence"), // 0-1 사이의 탐지 신뢰도
  
  // 공격 시도 정보
  attemptedPrompt: text("attempted_prompt"), // 시도된 프롬프트
  attemptedInput: jsonb("attempted_input"), // 시도된 입력 데이터
  originalPrompt: text("original_prompt"), // 원본 프롬프트 (공격 전)
  
  // 사용자 정보
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  username: varchar("username", { length: 100 }),
  userIp: varchar("user_ip", { length: 50 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  
  // 대응 정보
  mitigationAction: varchar("mitigation_action", { length: 100 }), // BLOCKED, ALLOWED, MODIFIED, ALERT
  mitigationStatus: varchar("mitigation_status", { length: 50 }).default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, FAILED
  mitigatedAt: timestamp("mitigated_at"),
  
  // 추가 정보
  metadata: jsonb("metadata"),
  
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  attackTypeIdx: index("adversarial_attack_events_attack_type_idx").on(table.attackType),
  attackSeverityIdx: index("adversarial_attack_events_attack_severity_idx").on(table.attackSeverity),
  userIdIdx: index("adversarial_attack_events_user_id_idx").on(table.userId),
  detectedAtIdx: index("adversarial_attack_events_detected_at_idx").on(table.detectedAt),
  mitigationStatusIdx: index("adversarial_attack_events_mitigation_status_idx").on(table.mitigationStatus),
}));

// 벤치마크 테스트 결과 테이블
export const benchmarkTestResults = pgTable("benchmark_test_results", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  
  // 테스트 정보
  testId: varchar("test_id", { length: 100 }), // 개별 테스트 ID
  testName: varchar("test_name", { length: 255 }).notNull(),
  testType: varchar("test_type", { length: 50 }), // ADVERSARIAL, SECURITY, PERFORMANCE, ACCURACY
  testCategory: varchar("test_category", { length: 100 }), // PROMPT_INJECTION, JAILBREAK, etc.
  testSuite: varchar("test_suite", { length: 255 }), // 테스트 스위트 이름
  testDescription: text("test_description"),
  
  // 테스트 입력
  prompt: text("prompt"), // 테스트 프롬프트
  expectedBlock: boolean("expected_block").default(false), // 예상 차단 여부
  actualBlock: boolean("actual_block").default(false), // 실제 차단 여부
  passed: boolean("passed").default(false), // 테스트 통과 여부
  
  // 탐지 정보
  detectionType: varchar("detection_type", { length: 100 }), // 탐지 유형
  detectionConfidence: doublePrecision("detection_confidence"), // 탐지 신뢰도 (0-1)
  
  // 테스트 결과
  testResults: jsonb("test_results"), // 전체 테스트 결과 JSON (스위트 레벨)
  testDetails: jsonb("test_details"), // 개별 테스트 상세 정보
  totalTests: integer("total_tests"), // 전체 테스트 수 (스위트 레벨)
  passedTests: integer("passed_tests").default(0), // 통과한 테스트 수
  failedTests: integer("failed_tests").default(0), // 실패한 테스트 수
  passRate: doublePrecision("pass_rate"), // 통과율 (0-1)
  
  // 테스트 실행 정보
  executedBy: varchar("executed_by", { length: 36 }).references(() => users.id),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
  executionTime: integer("execution_time_ms"), // 실행 시간 (밀리초) - 스위트 레벨
  executionTimeMs: integer("execution_time_ms_individual"), // 개별 테스트 실행 시간
  
  // 추가 정보
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  testIdIdx: index("benchmark_test_results_test_id_idx").on(table.testId),
  testNameIdx: index("benchmark_test_results_test_name_idx").on(table.testName),
  testTypeIdx: index("benchmark_test_results_test_type_idx").on(table.testType),
  testCategoryIdx: index("benchmark_test_results_test_category_idx").on(table.testCategory),
  testSuiteIdx: index("benchmark_test_results_test_suite_idx").on(table.testSuite),
  executedAtIdx: index("benchmark_test_results_executed_at_idx").on(table.executedAt),
}));

// 알림(Alerts) 테이블
export const alerts = pgTable("alerts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  
  // 알림 정보
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // info, warning, error, success
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // low, normal, high, urgent
  
  // 알림 카테고리
  category: varchar("category", { length: 100 }), // market, portfolio, news, system, etc.
  
  // 관련 리소스
  relatedResourceType: varchar("related_resource_type", { length: 50 }), // news, trade, analysis, etc.
  relatedResourceId: varchar("related_resource_id", { length: 36 }),
  
  // 읽음 상태
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  
  // 액션 정보
  actionUrl: text("action_url"), // 클릭 시 이동할 URL
  actionLabel: varchar("action_label", { length: 100 }), // 액션 버튼 라벨
  
  // 추가 정보
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // 만료 시간 (선택사항)
}, (table) => ({
  userIdIdx: index("alerts_user_id_idx").on(table.userId),
  isReadIdx: index("alerts_is_read_idx").on(table.isRead),
  typeIdx: index("alerts_type_idx").on(table.type),
  categoryIdx: index("alerts_category_idx").on(table.category),
  createdAtIdx: index("alerts_created_at_idx").on(table.createdAt),
  userIdIsReadIdx: index("alerts_user_id_is_read_idx").on(table.userId, table.isRead),
}));

// 북마크(Bookmarks) 테이블
export const bookmarks = pgTable("bookmarks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  
  // 북마크 정보
  contentType: varchar("content_type", { length: 50 }).notNull(), // news, analysis, recommendation, etc.
  contentId: varchar("content_id", { length: 36 }).notNull(),
  
  // 북마크 메타데이터
  title: varchar("title", { length: 255 }), // 북마크 제목 (캐시용)
  notes: text("notes"), // 사용자 메모
  
  // 태그
  tags: text("tags").array(), // 북마크 태그
  
  // 추가 정보
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("bookmarks_user_id_idx").on(table.userId),
  contentTypeIdx: index("bookmarks_content_type_idx").on(table.contentType),
  contentIdIdx: index("bookmarks_content_id_idx").on(table.contentId),
  userIdContentTypeIdx: index("bookmarks_user_id_content_type_idx").on(table.userId, table.contentType),
  uniqueUserContentIdx: uniqueIndex("bookmarks_user_content_unique_idx").on(table.userId, table.contentType, table.contentId),
}));

// AI 챗 메시지 테이블 (기존 etfChatMessages와 별도로 일반 AI 챗용)
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  
  // 메시지 정보
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  
  // 도구 사용 정보
  tools: jsonb("tools"), // 사용된 도구 목록
  toolResults: jsonb("tool_results"), // 도구 실행 결과
  
  // 메타데이터
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index("ai_chat_messages_session_id_idx").on(table.sessionId),
  userIdIdx: index("ai_chat_messages_user_id_idx").on(table.userId),
  createdAtIdx: index("ai_chat_messages_created_at_idx").on(table.createdAt),
  sessionIdCreatedAtIdx: index("ai_chat_messages_session_created_idx").on(table.sessionId, table.createdAt),
}));

// Type exports for Data Sources
export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = typeof dataSources.$inferInsert;
export type SqlQuery = typeof sqlQueries.$inferSelect;
export type InsertSqlQuery = typeof sqlQueries.$inferInsert;

// Type exports for RAG System
export type RagEmbeddingSchema = typeof ragEmbeddingSchemas.$inferSelect;
export type InsertRagEmbeddingSchema = typeof ragEmbeddingSchemas.$inferInsert;
export type RagEmbeddingJob = typeof ragEmbeddingJobs.$inferSelect;
export type InsertRagEmbeddingJob = typeof ragEmbeddingJobs.$inferInsert;
export type RagEmbeddingStatus = typeof ragEmbeddingStatus.$inferSelect;
export type InsertRagEmbeddingStatus = typeof ragEmbeddingStatus.$inferInsert;
export type RagMetadata = typeof ragMetadata.$inferSelect;
export type InsertRagMetadata = typeof ragMetadata.$inferInsert;
export type RagChatSession = typeof ragChatSessions.$inferSelect;
export type InsertRagChatSession = typeof ragChatSessions.$inferInsert;
export type RagChatMessage = typeof ragChatMessages.$inferSelect;
export type InsertRagChatMessage = typeof ragChatMessages.$inferInsert;

// Type exports for RAG Security System
export type RagDataVersionControl = typeof ragDataVersionControl.$inferSelect;
export type InsertRagDataVersionControl = typeof ragDataVersionControl.$inferInsert;
export type RagDataTamperingDetection = typeof ragDataTamperingDetection.$inferSelect;
export type InsertRagDataTamperingDetection = typeof ragDataTamperingDetection.$inferInsert;
export type RagDataAnomalyDetection = typeof ragDataAnomalyDetection.$inferSelect;
export type InsertRagDataAnomalyDetection = typeof ragDataAnomalyDetection.$inferInsert;
export type RagDataProcessingLog = typeof ragDataProcessingLogs.$inferSelect;
export type InsertRagDataProcessingLog = typeof ragDataProcessingLogs.$inferInsert;
export type SystemKillswitch = typeof systemKillswitch.$inferSelect;
export type InsertSystemKillswitch = typeof systemKillswitch.$inferInsert;
export type AdversarialAttackEvent = typeof adversarialAttackEvents.$inferSelect;
export type InsertAdversarialAttackEvent = typeof adversarialAttackEvents.$inferInsert;
export type BenchmarkTestResult = typeof benchmarkTestResults.$inferSelect;
export type InsertBenchmarkTestResult = typeof benchmarkTestResults.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = typeof bookmarks.$inferInsert;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = typeof aiChatMessages.$inferInsert;

// Insert schemas for validation
export const insertApplicationLogSchema = createInsertSchema(applicationLogs);
export const insertLoggingSettingSchema = createInsertSchema(loggingSettings);
export const insertDataSourceSchema = createInsertSchema(dataSources);
export const insertSqlQuerySchema = createInsertSchema(sqlQueries);
export const insertRagEmbeddingSchemaSchema = createInsertSchema(ragEmbeddingSchemas);
export const insertRagEmbeddingJobSchema = createInsertSchema(ragEmbeddingJobs);
export const insertRagEmbeddingStatusSchema = createInsertSchema(ragEmbeddingStatus);
export const insertRagMetadataSchema = createInsertSchema(ragMetadata);
export const insertRagChatSessionSchema = createInsertSchema(ragChatSessions);
export const insertRagChatMessageSchema = createInsertSchema(ragChatMessages);
export const insertRagDataVersionControlSchema = createInsertSchema(ragDataVersionControl);
export const insertRagDataTamperingDetectionSchema = createInsertSchema(ragDataTamperingDetection);
export const insertRagDataAnomalyDetectionSchema = createInsertSchema(ragDataAnomalyDetection);
export const insertRagDataProcessingLogSchema = createInsertSchema(ragDataProcessingLogs);
export const insertSystemKillswitchSchema = createInsertSchema(systemKillswitch);
export const insertAdversarialAttackEventSchema = createInsertSchema(adversarialAttackEvents);
export const insertBenchmarkTestResultSchema = createInsertSchema(benchmarkTestResults);
export const insertAlertSchema = createInsertSchema(alerts);
export const insertBookmarkSchema = createInsertSchema(bookmarks);
export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages);

// Relations for Data Sources
export const dataSourcesRelations = relations(dataSources, ({ one, many }) => ({
  creator: one(users, {
    fields: [dataSources.createdBy],
    references: [users.id],
  }),
  sqlQueries: many(sqlQueries),
}));

export const sqlQueriesRelations = relations(sqlQueries, ({ one }) => ({
  dataSource: one(dataSources, {
    fields: [sqlQueries.dataSourceId],
    references: [dataSources.id],
  }),
  creator: one(users, {
    fields: [sqlQueries.createdBy],
    references: [users.id],
  }),
}));

// Relations for Application Logging System
export const applicationLogsRelations = relations(applicationLogs, ({ one }) => ({
  user: one(users, {
    fields: [applicationLogs.userId],
    references: [users.id],
  }),
  workflow: one(workflows, {
    fields: [applicationLogs.workflowId],
    references: [workflows.id],
  }),
  workflowExecution: one(workflowExecutions, {
    fields: [applicationLogs.workflowExecutionId],
    references: [workflowExecutions.id],
  }),
}));

export const loggingSettingsRelations = relations(loggingSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [loggingSettings.updatedBy],
    references: [users.id],
  }),
}));

// Relations for RAG System
export const ragEmbeddingSchemasRelations = relations(ragEmbeddingSchemas, ({ one, many }) => ({
  creator: one(users, {
    fields: [ragEmbeddingSchemas.createdBy],
    references: [users.id],
  }),
  embeddingStatus: one(ragEmbeddingStatus, {
    fields: [ragEmbeddingSchemas.id],
    references: [ragEmbeddingStatus.schemaId],
  }),
  embeddingJobs: many(ragEmbeddingJobs),
  metadata: many(ragMetadata),
}));

export const ragEmbeddingJobsRelations = relations(ragEmbeddingJobs, ({ one }) => ({
  schema: one(ragEmbeddingSchemas, {
    fields: [ragEmbeddingJobs.schemaId],
    references: [ragEmbeddingSchemas.id],
  }),
  creator: one(users, {
    fields: [ragEmbeddingJobs.createdBy],
    references: [users.id],
  }),
}));

export const ragEmbeddingStatusRelations = relations(ragEmbeddingStatus, ({ one }) => ({
  schema: one(ragEmbeddingSchemas, {
    fields: [ragEmbeddingStatus.schemaId],
    references: [ragEmbeddingSchemas.id],
  }),
  currentJob: one(ragEmbeddingJobs, {
    fields: [ragEmbeddingStatus.currentJobId],
    references: [ragEmbeddingJobs.id],
  }),
}));

export const ragMetadataRelations = relations(ragMetadata, ({ one }) => ({
  schema: one(ragEmbeddingSchemas, {
    fields: [ragMetadata.schemaId],
    references: [ragEmbeddingSchemas.id],
  }),
}));

export const ragChatSessionsRelations = relations(ragChatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [ragChatSessions.userId],
    references: [users.id],
  }),
  messages: many(ragChatMessages),
}));

export const ragChatMessagesRelations = relations(ragChatMessages, ({ one }) => ({
  session: one(ragChatSessions, {
    fields: [ragChatMessages.sessionId],
    references: [ragChatSessions.id],
  }),
}));

// Relations for RAG Security System
export const ragDataVersionControlRelations = relations(ragDataVersionControl, ({ one }) => ({
  schema: one(ragEmbeddingSchemas, {
    fields: [ragDataVersionControl.schemaId],
    references: [ragEmbeddingSchemas.id],
  }),
  changedByUser: one(users, {
    fields: [ragDataVersionControl.changedBy],
    references: [users.id],
  }),
}));

export const ragDataTamperingDetectionRelations = relations(ragDataTamperingDetection, ({ one }) => ({
  schema: one(ragEmbeddingSchemas, {
    fields: [ragDataTamperingDetection.schemaId],
    references: [ragEmbeddingSchemas.id],
  }),
  mitigatedByUser: one(users, {
    fields: [ragDataTamperingDetection.mitigatedBy],
    references: [users.id],
  }),
}));

export const ragDataAnomalyDetectionRelations = relations(ragDataAnomalyDetection, ({ one }) => ({
  schema: one(ragEmbeddingSchemas, {
    fields: [ragDataAnomalyDetection.schemaId],
    references: [ragEmbeddingSchemas.id],
  }),
  verifiedByUser: one(users, {
    fields: [ragDataAnomalyDetection.verifiedBy],
    references: [users.id],
  }),
}));

export const ragDataProcessingLogsRelations = relations(ragDataProcessingLogs, ({ one }) => ({
  schema: one(ragEmbeddingSchemas, {
    fields: [ragDataProcessingLogs.schemaId],
    references: [ragEmbeddingSchemas.id],
  }),
}));

export const systemKillswitchRelations = relations(systemKillswitch, ({ one }) => ({
  activatedByUser: one(users, {
    fields: [systemKillswitch.activatedBy],
    references: [users.id],
  }),
  deactivatedByUser: one(users, {
    fields: [systemKillswitch.deactivatedBy],
    references: [users.id],
  }),
}));

export const adversarialAttackEventsRelations = relations(adversarialAttackEvents, ({ one }) => ({
  user: one(users, {
    fields: [adversarialAttackEvents.userId],
    references: [users.id],
  }),
}));

export const benchmarkTestResultsRelations = relations(benchmarkTestResults, ({ one }) => ({
  executedByUser: one(users, {
    fields: [benchmarkTestResults.executedBy],
    references: [users.id],
  }),
}));

// === Additional Type Helpers ===
// The main type exports are already defined above (lines 861-892)
// These are kept for backward compatibility and clarity
