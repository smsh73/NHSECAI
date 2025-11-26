# 데이터베이스 스키마 불일치 분석 보고서

## 개요

이 문서는 `database/create-complete-schema.sql`(스키마 생성용), `database/init-sample-data.sql`(샘플데이터 생성용), 그리고 실제 소스코드에서 사용하는 Drizzle ORM 스키마(`shared/schema.ts`) 간의 불일치점을 분석한 보고서입니다.

## 분석 대상 파일

1. **database/create-complete-schema.sql**: 스키마 생성용 SQL 파일
2. **database/init-sample-data.sql**: 샘플 데이터 생성용 SQL 파일
3. **shared/schema.ts**: Drizzle ORM 스키마 정의 (실제 소스코드에서 사용)
4. **database/schema-service-management.sql**: 서비스 관리 스키마 (참고용)

---

## 1. 테이블 정의 현황

### 1.1 create-complete-schema.sql에 정의된 테이블 (14개)

감사 로그 및 서비스 관리 관련 테이블만 포함:

1. `audit_logs` - 감사 로그
2. `data_access_logs` - 데이터 액세스 로그
3. `security_events` - 보안 이벤트
4. `audit_reports` - 감사 보고서
5. `services` - 서비스 카탈로그
6. `service_dependencies` - 서비스 의존성
7. `api_call_logs` - API 호출 기록
8. `user_sessions` - 사용자 세션
9. `azure_configurations` - Azure 설정
10. `environment_variables` - 환경 변수
11. `backup_records` - 백업 기록
12. `system_metrics` - 시스템 메트릭
13. `system_notifications` - 시스템 알림
14. `audit_logs_archive` - 감사 로그 아카이브

### 1.2 init-sample-data.sql에서 사용하는 테이블 (9개)

샘플 데이터 삽입 시도하는 테이블:

1. `users` ❌ **create-complete-schema.sql에 없음**
2. `ai_service_providers` ❌ **create-complete-schema.sql에 없음**
3. `api_categories` ❌ **create-complete-schema.sql에 없음**
4. `themes` ❌ **create-complete-schema.sql에 없음**
5. `prompts` ❌ **create-complete-schema.sql에 없음**
6. `api_calls` ❌ **create-complete-schema.sql에 없음**
7. `workflows` ❌ **create-complete-schema.sql에 없음**
8. `financial_data` ❌ **create-complete-schema.sql에 없음**
9. `news_data` ❌ **create-complete-schema.sql에 없음**

### 1.3 shared/schema.ts에 정의된 테이블 (72개)

Drizzle ORM으로 정의된 전체 테이블 목록:

**핵심 테이블 (init-sample-data.sql에서 사용):**
- users, ai_service_providers, api_categories, themes, prompts, api_calls, workflows, financial_data, news_data

**워크플로우 관련:**
- workflows, workflow_executions, workflow_nodes, workflow_node_executions, workflow_sessions, workflow_session_data, workflow_node_dependencies, workflow_templates, workflow_node_results

**AI 및 API 관리:**
- prompts, ai_service_providers, api_categories, api_calls, api_test_results, api_usage_analytics, api_templates

**금융 데이터:**
- financial_data, news_data, themes, market_analysis, macro_analysis, macro_workflow_templates

**개인화 서비스:**
- user_balances, balance_insights, user_tags, user_watchlist, user_trades, trade_insights, attribute_definitions, segments, rule_conditions, rules, rule_sets, content_policies, recommendation_strategies, notification_rules, dashboard_templates, experiments, analytics_events, metric_snapshots

**ETF 관리:**
- etf_products, etf_metrics, user_risk_profile, etf_chat_sessions, etf_chat_messages, guardrail_policies, etf_bot_configs, etf_recommendation_settings

**품질 관리:**
- report_quality_metrics, feedback_log, quality_improvements, ab_testing_experiments

**분석 및 리포트:**
- market_analysis, macro_analysis, morning_briefing, causal_analysis, major_events, major_events_related_news, quantitative_metrics, info_stock_themes, info_stock_theme_stocks, industry_theme_conditions, industry_theme_related_news, macro_market_conditions, processed_news_data

**시스템 관리:**
- azure_configs, system_configurations, dictionaries, dictionary_entries, nl2sql_prompts, schema_sources, schedules, layout_templates

**감사 로그 (create-complete-schema.sql에만 있음):**
- audit_logs, data_access_logs, security_events, audit_reports ❌ **shared/schema.ts에 없음**

**서비스 관리 (create-complete-schema.sql에만 있음):**
- services, service_dependencies, api_call_logs, user_sessions, azure_configurations, environment_variables, backup_records, system_metrics, system_notifications ❌ **shared/schema.ts에 없음**

---

## 2. 주요 불일치점

### 2.1 심각한 불일치: 핵심 테이블 누락

**문제**: `create-complete-schema.sql`에는 애플리케이션의 핵심 기능을 위한 테이블이 전혀 정의되어 있지 않습니다.

**누락된 핵심 테이블 (9개):**
1. `users` - 사용자 관리 (init-sample-data.sql에서 사용, 실제 코드에서 사용)
2. `ai_service_providers` - AI 서비스 프로바이더 (init-sample-data.sql에서 사용)
3. `api_categories` - API 카테고리 (init-sample-data.sql에서 사용)
4. `themes` - 테마 관리 (init-sample-data.sql에서 사용)
5. `prompts` - 프롬프트 관리 (init-sample-data.sql에서 사용, 실제 코드에서 사용)
6. `api_calls` - API 호출 관리 (init-sample-data.sql에서 사용, 실제 코드에서 사용)
7. `workflows` - 워크플로우 관리 (init-sample-data.sql에서 사용, 실제 코드에서 사용)
8. `financial_data` - 금융 데이터 (init-sample-data.sql에서 사용, 실제 코드에서 사용)
9. `news_data` - 뉴스 데이터 (init-sample-data.sql에서 사용, 실제 코드에서 사용)

**영향:**
- `init-sample-data.sql` 실행 시 모든 INSERT 문이 실패함
- 애플리케이션 핵심 기능이 동작하지 않음
- Drizzle ORM 마이그레이션 없이는 데이터베이스 초기화 불가능

### 2.2 필드명 불일치

#### 2.2.1 users 테이블

**create-complete-schema.sql**: 없음 (ALTER TABLE로만 보안 필드 추가 시도)

**schema-service-management.sql**:
```sql
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- 컬럼명: password
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    email VARCHAR(200),
    full_name VARCHAR(200),
    department VARCHAR(100),
    position VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    password_changed_at TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**shared/schema.ts**:
```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  hashedPassword: text("password").notNull(),  // 코드상: hashedPassword, DB: password
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**불일치점:**
- `schema-service-management.sql`: `password`, `email`, `full_name`, `department`, `position`, `status`, `last_login`, `failed_login_attempts`, `password_changed_at`, `mfa_enabled`, `updated_at` 등 많은 필드 존재
- `shared/schema.ts`: 기본 필드만 존재 (id, username, hashedPassword, role, createdAt)

#### 2.2.2 prompts 테이블

**create-complete-schema.sql**: 없음

**schema-service-management.sql**:
```sql
CREATE TABLE IF NOT EXISTS prompts (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    content TEXT NOT NULL,  -- 필드명: content
    template_type VARCHAR(50) DEFAULT 'text',
    input_schema JSONB,
    output_schema JSONB,
    execution_type VARCHAR(20) DEFAULT 'text',
    azure_openai_config JSONB,
    variables JSONB,
    default_values JSONB,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    version VARCHAR(20) DEFAULT '1.0.0',
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 2) DEFAULT 0,
    avg_execution_time_ms INTEGER DEFAULT 0,
    tags VARCHAR(50)[],
    metadata JSONB,
    created_by VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**shared/schema.ts**:
```typescript
export const prompts = pgTable("prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),  // 필드명: system_prompt (content 아님)
  userPromptTemplate: text("user_prompt_template"),
  parameters: jsonb("parameters"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  inputSchema: jsonb("input_schema"),
  outputSchema: jsonb("output_schema"),
  executionType: text("execution_type").default("text"),
  azureOpenAIConfig: jsonb("azure_openai_config"),
});
```

**불일치점:**
- `schema-service-management.sql`: `content` 필드 사용
- `shared/schema.ts`: `system_prompt`, `user_prompt_template` 필드 사용 (content 없음)
- `init-sample-data.sql`: `system_prompt`, `user_prompt_template` 사용 (shared/schema.ts와 일치)

#### 2.2.3 api_calls 테이블

**create-complete-schema.sql**: 없음

**schema-service-management.sql**:
```sql
CREATE TABLE IF NOT EXISTS api_calls (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200),
    description TEXT,
    provider_id VARCHAR(36),
    category_id VARCHAR(36),
    url TEXT NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'POST',
    auth_type VARCHAR(20) DEFAULT 'bearer',
    headers JSONB,
    secret_key VARCHAR(100),
    request_schema JSONB,
    response_schema JSONB,
    parameter_template TEXT,
    execution_type VARCHAR(20) DEFAULT 'json',
    timeout INTEGER DEFAULT 30000,
    retry_count INTEGER DEFAULT 3,
    retry_delay INTEGER DEFAULT 1000,
    model_name VARCHAR(100),  -- 추가 필드
    max_tokens INTEGER,  -- 추가 필드
    input_cost DECIMAL(10, 4),  -- 추가 필드
    output_cost DECIMAL(10, 4),  -- 추가 필드
    system_prompt TEXT,  -- 추가 필드
    preprocess_prompt TEXT,  -- 추가 필드
    postprocess_prompt TEXT,  -- 추가 필드
    supports_streaming BOOLEAN DEFAULT FALSE,  -- 추가 필드
    input_types VARCHAR(20)[] DEFAULT ARRAY['text'],  -- 추가 필드
    output_types VARCHAR(20)[] DEFAULT ARRAY['text'],  -- 추가 필드
    status VARCHAR(20) DEFAULT 'ACTIVE',  -- 추가 필드
    version VARCHAR(20) DEFAULT '1.0.0',  -- 추가 필드
    call_count INTEGER DEFAULT 0,  -- 추가 필드
    success_count INTEGER DEFAULT 0,  -- 추가 필드
    failure_count INTEGER DEFAULT 0,  -- 추가 필드
    avg_response_time_ms INTEGER DEFAULT 0,  -- 추가 필드
    tags VARCHAR(50)[],  -- 추가 필드
    metadata JSONB,  -- 추가 필드
    created_by VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**shared/schema.ts**:
```typescript
export const apiCalls = pgTable("api_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: varchar("provider_id").references(() => aiServiceProviders.id),
  categoryId: varchar("category_id").references(() => apiCategories.id),
  name: text("name").notNull(),
  displayName: text("display_name"),
  description: text("description"),
  url: text("url").notNull(),
  method: text("method").notNull().default("POST"),
  authType: text("auth_type").default("bearer"),
  headers: jsonb("headers"),
  apiKey: text("api_key"),  // deprecated
  secretKey: text("secret_key"),
  requestSchema: jsonb("request_schema"),
  responseSchema: jsonb("response_schema"),
  parameterTemplate: text("parameter_template"),
  executionType: text("execution_type").default("json"),
  timeout: integer("timeout").default(30000),
  retryCount: integer("retry_count").default(3),
  retryDelay: integer("retry_delay").default(1000),
  avgResponseTime: integer("avg_response_time"),
  preprocessPrompt: text("preprocess_prompt"),
  postprocessPrompt: text("postprocess_prompt"),
  isActive: boolean("is_active"),
  isVerified: boolean("is_verified"),
  lastTested: timestamp("last_tested"),
  testStatus: text("test_status"),
  errorCount: integer("error_count"),
  successCount: integer("success_count"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**불일치점:**
- `schema-service-management.sql`: 많은 추가 필드 존재 (model_name, max_tokens, input_cost, output_cost, system_prompt, supports_streaming, input_types, output_types, status, version, call_count, success_count, failure_count, tags, metadata 등)
- `shared/schema.ts`: 핵심 필드만 존재

#### 2.2.4 workflows 테이블

**create-complete-schema.sql**: 없음

**schema-service-management.sql**: 없음

**shared/schema.ts**:
```typescript
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  definition: jsonb("definition").notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**init-sample-data.sql**:
```sql
INSERT INTO workflows (
    id, name, description, definition, is_active, created_at, updated_at
)
```

**상태**: `shared/schema.ts`와 `init-sample-data.sql`은 일치함

#### 2.2.5 financial_data 테이블

**create-complete-schema.sql**: 없음

**shared/schema.ts**: 매우 상세한 필드 정의 (약 40개 필드)
- symbol, symbolName, market, country, dataType
- price, previousPrice, changeAmount, changeRate, volume, tradingValue, marketCap
- sectorCode, sectorName, themeCode, themeName
- ma20, stdDev20, zScore, anomalyLevel
- metadata (JSONB)
- timestamp, embeddings, embeddingModel, processedAt
- 인덱스 다수

**init-sample-data.sql**:
```sql
INSERT INTO financial_data (
    id, symbol, symbol_name, market, country, data_type,
    price, previous_price, change_amount, change_rate, volume, trading_value,
    timestamp, created_at
)
```

**불일치점:**
- `shared/schema.ts`: `created_at` 필드 없음 (processed_at만 있음)
- `init-sample-data.sql`: `created_at` 사용 시도

#### 2.2.6 news_data 테이블

**create-complete-schema.sql**: 없음

**shared/schema.ts**: 매우 상세한 필드 정의 (약 30개 필드)
- nid, title, content, summary
- themeClusterId
- source, reporter, category, subcategory
- sentiment, sentimentScore, economicScore, marketScore, advertisementScore, duplicateScore, importanceScore, credibilityScore
- relevantSymbols, relevantIndices, relevantThemes (배열)
- keywords, entities, marketEvents, eventCategories (배열)
- metadata (JSONB)
- publishedAt, crawledAt, processedAt
- embeddings, embeddingModel
- isProcessed, isFiltered, isAdvertisement, isDuplicate, isHighQuality, needsReview

**init-sample-data.sql**:
```sql
INSERT INTO news_data (
    id, title, content, source, category, published_at, crawled_at
)
```

**상태**: `init-sample-data.sql`은 최소 필드만 사용하므로 일치함 (나머지는 optional)

### 2.3 감사 로그 테이블 불일치

**create-complete-schema.sql**: 
- `audit_logs`, `data_access_logs`, `security_events`, `audit_reports` 정의됨

**shared/schema.ts**: 
- 감사 로그 관련 테이블이 **전혀 없음**

**영향:**
- 애플리케이션 코드에서 감사 로그 테이블을 사용할 수 없음
- 금융보안원 감사 기준을 충족하려면 이 테이블들이 필요하지만, Drizzle ORM 스키마에 없음

### 2.4 서비스 관리 테이블 불일치

**create-complete-schema.sql**:
- `services`, `service_dependencies`, `api_call_logs`, `user_sessions`, `azure_configurations`, `environment_variables`, `backup_records`, `system_metrics`, `system_notifications` 정의됨

**shared/schema.ts**:
- `azure_configs` (다른 구조)는 있음
- 나머지 서비스 관리 테이블은 **없음**

**불일치점:**
- `create-complete-schema.sql`: `azure_configurations` (단수형)
- `shared/schema.ts`: `azure_configs` (다른 구조)

---

## 3. init-sample-data.sql 필드명 분석

### 3.1 users 테이블 INSERT

**init-sample-data.sql**:
```sql
INSERT INTO users (id, username, password, role, created_at)
```

**문제:**
- `schema-service-management.sql`의 users 테이블과 일치 (password 필드 사용)
- 하지만 `shared/schema.ts`의 users는 `password` 필드가 없고 `hashedPassword` (코드상)로 매핑됨
- 실제 DB 컬럼명은 `password`이므로 INSERT는 동작할 수 있음

### 3.2 prompts 테이블 INSERT

**init-sample-data.sql**:
```sql
INSERT INTO prompts (
    id, name, description, system_prompt, user_prompt_template,
    category, input_schema, output_schema, execution_type, azure_openai_config,
    created_at, updated_at
)
```

**상태**: `shared/schema.ts`와 일치함 ✅

### 3.3 api_calls 테이블 INSERT

**init-sample-data.sql**:
```sql
INSERT INTO api_calls (
    id, name, display_name, description, url, method, auth_type,
    headers, request_schema, response_schema, execution_type, timeout,
    created_at, updated_at
)
```

**상태**: `shared/schema.ts`의 기본 필드와 일치함 ✅

### 3.4 workflows 테이블 INSERT

**init-sample-data.sql**:
```sql
INSERT INTO workflows (
    id, name, description, definition, is_active, created_at, updated_at
)
```

**상태**: `shared/schema.ts`와 일치함 ✅

### 3.5 financial_data 테이블 INSERT

**init-sample-data.sql**:
```sql
INSERT INTO financial_data (
    id, symbol, symbol_name, market, country, data_type,
    price, previous_price, change_amount, change_rate, volume, trading_value,
    timestamp, created_at
)
```

**문제:**
- `shared/schema.ts`에는 `created_at` 필드가 없고 `processed_at`만 있음
- `init-sample-data.sql`의 `created_at`은 존재하지 않는 필드

### 3.6 news_data 테이블 INSERT

**init-sample-data.sql**:
```sql
INSERT INTO news_data (
    id, title, content, source, category, published_at, crawled_at
)
```

**상태**: `shared/schema.ts`의 필수 필드와 일치함 ✅

---

## 4. 종합 분석 결과

### 4.1 심각도 높음 (Critical)

1. **핵심 테이블 누락**
   - `create-complete-schema.sql`에 애플리케이션 핵심 테이블 9개가 전혀 없음
   - 이로 인해 `init-sample-data.sql` 실행 불가능
   - 애플리케이션 기본 기능 동작 불가

2. **financial_data.created_at 필드 불일치**
   - `init-sample-data.sql`: `created_at` 사용
   - `shared/schema.ts`: `created_at` 없음 (`processed_at`만 있음)
   - INSERT 실패 발생

### 4.2 심각도 중간 (High)

1. **users 테이블 필드 불일치**
   - `schema-service-management.sql`: 많은 추가 필드
   - `shared/schema.ts`: 기본 필드만
   - 기능적으로는 문제 없을 수 있지만, 확장성 제약

2. **prompts 테이블 필드명 불일치**
   - `schema-service-management.sql`: `content` 사용
   - `shared/schema.ts`: `system_prompt`, `user_prompt_template` 사용
   - 다행히 `init-sample-data.sql`은 올바른 필드명 사용

3. **api_calls 테이블 필드 불일치**
   - `schema-service-management.sql`: 많은 추가 필드
   - `shared/schema.ts`: 핵심 필드만
   - 기능적으로는 문제 없을 수 있음

### 4.3 심각도 낮음 (Low)

1. **감사 로그 테이블 누락**
   - `create-complete-schema.sql`에만 있고 `shared/schema.ts`에 없음
   - 코드에서 사용하지 않는다면 문제 없음
   - 하지만 금융보안원 감사 기준을 위해서는 필요

2. **서비스 관리 테이블 누락**
   - `create-complete-schema.sql`에만 있고 `shared/schema.ts`에 없음
   - 코드에서 사용하지 않는다면 문제 없음

---

## 5. 권장 수정 사항

### 5.1 즉시 수정 필요 (Critical)

1. **create-complete-schema.sql에 핵심 테이블 추가**
   - users, ai_service_providers, api_categories, themes, prompts, api_calls, workflows, financial_data, news_data
   - `shared/schema.ts`의 정의를 기준으로 SQL CREATE TABLE 문 생성

2. **financial_data 테이블 수정**
   - 옵션 A: `shared/schema.ts`에 `created_at` 필드 추가
   - 옵션 B: `init-sample-data.sql`에서 `created_at` 제거하고 `processed_at` 사용
   - 권장: 옵션 A (기존 데이터와의 호환성)

### 5.2 단기 수정 필요 (High)

1. **users 테이블 확장**
   - `shared/schema.ts`에 `schema-service-management.sql`의 추가 필드 반영
   - 또는 `create-complete-schema.sql`을 `shared/schema.ts` 기준으로 단순화

2. **api_calls 테이블 정리**
   - `shared/schema.ts`와 `create-complete-schema.sql` 간 필드 일치

3. **스키마 파일 통합**
   - `create-complete-schema.sql`이 `shared/schema.ts`의 모든 테이블을 포함하도록 수정

### 5.3 장기 개선 (Low)

1. **감사 로그 테이블 통합**
   - `shared/schema.ts`에 감사 로그 테이블 추가
   - 코드에서 사용할 수 있도록 Drizzle ORM 스키마 정의

2. **서비스 관리 테이블 통합**
   - 필요 시 `shared/schema.ts`에 서비스 관리 테이블 추가

3. **스키마 동기화 자동화**
   - Drizzle ORM 마이그레이션으로 스키마 생성
   - `create-complete-schema.sql`을 자동 생성하는 스크립트 작성

---

## 6. 수정 시 고려사항

### 6.1 마이그레이션 전략

1. **기존 데이터 보존**
   - 기존 데이터베이스에 데이터가 있다면 마이그레이션 스크립트 필요
   - ALTER TABLE로 누락된 필드 추가

2. **롤백 계획**
   - 스키마 변경 시 롤백 스크립트 준비
   - 백업 후 수정 진행

### 6.2 Drizzle ORM과의 일관성

1. **shared/schema.ts를 단일 소스로 사용**
   - 모든 테이블 정의는 `shared/schema.ts`에서 관리
   - `create-complete-schema.sql`은 `shared/schema.ts`를 기반으로 생성

2. **필드명 일관성**
   - Drizzle ORM의 camelCase 필드명과 DB의 snake_case 컬럼명 매핑 확인
   - INSERT 문에서는 DB 컬럼명(snake_case) 사용

### 6.3 테스트 계획

1. **스키마 생성 테스트**
   - `create-complete-schema.sql` 실행 후 모든 테이블 생성 확인

2. **샘플 데이터 삽입 테스트**
   - `init-sample-data.sql` 실행 후 오류 없이 삽입되는지 확인

3. **애플리케이션 기능 테스트**
   - 각 메뉴별 기능이 정상 동작하는지 확인

---

## 7. 결론

현재 `create-complete-schema.sql`과 `init-sample-data.sql` 간에는 **심각한 불일치**가 있습니다. 가장 큰 문제는 `create-complete-schema.sql`에 애플리케이션의 핵심 테이블이 전혀 정의되어 있지 않다는 것입니다.

**즉시 조치가 필요한 사항:**
1. `create-complete-schema.sql`에 핵심 테이블 9개 추가
2. `financial_data` 테이블의 `created_at` 필드 처리
3. `shared/schema.ts`를 기준으로 SQL 스키마 정의 재작성

**권장 접근 방법:**
- `shared/schema.ts`를 단일 소스로 사용
- `create-complete-schema.sql`은 Drizzle ORM 스키마를 기반으로 자동 생성하거나, 수동으로 작성하되 반드시 일치시킴
- `init-sample-data.sql`은 실제 DB 스키마에 맞춰 수정

이렇게 하면 세 파일 간의 스키마 불일치 문제가 해결될 것입니다.

