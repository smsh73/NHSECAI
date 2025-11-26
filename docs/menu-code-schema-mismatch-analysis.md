# 메뉴별 소스코드 및 DB 스키마 불일치 분석 보고서

## 개요

이 문서는 화면의 메뉴 이름과 관련 소스코드, DB 스키마, 함수, 변수들 간의 불일치 및 누락 부분을 체계적으로 분석한 보고서입니다.

**분석 기준:**
- 메뉴 구조: `client/src/config/menu-config.ts`
- 페이지 컴포넌트: `client/src/pages/*.tsx`
- API 엔드포인트: `server/routes.ts`
- 서비스 함수: `server/storage.ts`, `server/services/*.ts`
- DB 스키마: `shared/schema.ts`

---

## 분석 방법론

1. **메뉴 구조 파악**: menu-config.ts에서 실제 메뉴 구조 확인
2. **페이지 컴포넌트 확인**: App.tsx에서 라우팅 확인
3. **API 엔드포인트 확인**: routes.ts에서 실제 API 확인
4. **서비스 함수 확인**: storage.ts 및 services에서 실제 함수 확인
5. **DB 스키마 확인**: schema.ts에서 테이블 정의 확인
6. **불일치 도출**: 누락, 불일치, 미구현 부분 식별

---

## 1. 홈 & 대시보드

### 1.1 시장 현황 (Home)

**메뉴 정보:**
- 경로: `/`
- 라벨: "시장 현황"
- 페이지: `client/src/pages/home.tsx`

**프론트엔드 API 호출:**
- `/api/market-analysis` ✅ (라인 22)
- `/api/news-data` ✅ (라인 28)

**백엔드 API 엔드포인트:**
- `/api/market-analysis` ✅ (routes.ts 라인 3571)
- `/api/news-data` ✅ (routes.ts 라인 2982)

**서비스 함수 (storage.ts):**
- `getMarketAnalysis()` ✅ (라인 1711)
- `searchNewsData()` ✅ (라인 1768)

**DB 스키마 (shared/schema.ts):**
- `marketAnalysis` ✅ (라인 537)
- `newsData` ✅ (라인 121)

**상태**: ✅ 일치

---

### 1.2 통합 대시보드 (Dashboard)

**메뉴 정보:**
- 경로: `/dashboard`
- 라벨: "통합 대시보드"
- 페이지: `client/src/pages/dashboard.tsx`

**프론트엔드 API 호출:**
- `/api/market-analysis` ✅ (라인 56)
- `/api/system/status` ✅ (라인 66)
- `/api/workflows/stats` ✅ (라인 78)
- `/api/alerts/stats` ✅ (라인 89)
- `/api/prompt-suggestions` ✅ (라인 118)

**백엔드 API 엔드포인트:**
- `/api/market-analysis` ✅ (routes.ts 라인 3571)
- `/api/system/status` ✅ (routes.ts 라인 4892)
- `/api/workflows/stats` ✅ (routes.ts 라인 286)
- `/api/alerts/stats` ✅ (routes.ts 라인 3517)
- `/api/prompt-suggestions` ✅ (routes.ts 라인 469, 별도 라우터)

**서비스 함수 (storage.ts):**
- `getMarketAnalysis()` ✅ (라인 1711)
- `getWorkflows()` ✅ (라인 1546)
- `getWorkflowExecutions()` ✅ (라인 1647)

**DB 스키마 (shared/schema.ts):**
- `marketAnalysis` ✅ (라인 537)
- `workflows` ✅ (라인 493)
- `workflowExecutions` ✅ (라인 505)

**상태**: ✅ 일치

---

## 2. 워크플로우 관리

### 2.1 워크플로우 편집기

**메뉴 정보:**
- 경로: `/workflow-editor/:id?`
- 라벨: "워크플로우 편집기"
- 페이지: `client/src/pages/workflow-editor.tsx`

**프론트엔드 API 호출:**
- `/api/workflows` ✅ (라인 93)
- `/api/workflows/:id` ✅ (PUT/POST, 라인 99-100)
- `/api/workflows/:id/execute` ✅ (확인 필요)

**백엔드 API 엔드포인트:**
- `/api/workflows` ✅ (routes.ts 라인 276)
- `/api/workflows/:id` ✅ (routes.ts 라인 316)
- `/api/workflows/:id/execute` ✅ (routes.ts 라인 1740)
- `/api/workflow/*` ✅ (workflow.ts 라우터 사용)

**서비스 함수 (storage.ts):**
- `getWorkflows()` ✅ (라인 1546)
- `getWorkflow()` ✅ (라인 1550)
- `createWorkflow()` ✅ (라인 1555)
- `updateWorkflow()` ✅ (라인 1560)
- `deleteWorkflow()` ✅ (라인 1569)

**DB 스키마 (shared/schema.ts):**
- `workflows` ✅ (라인 493)
- `workflowNodes` ✅ (라인 4832)
- `workflowExecutions` ✅ (라인 505)
- `workflowSessions` ✅ (라인 4814)
- `workflowSessionData` ✅ (라인 4870)

**상태**: ✅ 일치

---

### 2.2 실행 스케줄러

**메뉴 정보:**
- 경로: `/scheduler`
- 라벨: "실행 스케줄러"
- 페이지: `client/src/pages/scheduler.tsx`

**백엔드 API 엔드포인트:**
- `/api/schedules` ✅ (routes.ts 라인 1543)
- `/api/schedules/:id` ✅ (확인 필요)

**서비스 함수 (storage.ts):**
- `getSchedules()` ✅ (라인 1620)
- `createSchedule()` ✅ (라인 1629)
- `updateSchedule()` ✅ (라인 1634)
- `deleteSchedule()` ✅ (라인 1643)

**DB 스키마 (shared/schema.ts):**
- `schedules` ✅ (라인 523)

**추가 확인 필요:**
- scheduler.tsx에서 실제 사용하는 API 엔드포인트 확인

**상태**: ⚠️ 부분 확인 필요

---

### 2.3 워크플로우 모니터

**메뉴 정보:**
- 경로: `/workflow-monitor`
- 라벨: "워크플로우 모니터"
- 페이지: `client/src/pages/workflow-monitor.tsx`

**백엔드 API 엔드포인트:**
- `/api/workflows/executions` ✅ (확인 필요)
- `/api/workflow/status` ✅ (routes.ts 라인 2135)

**서비스 함수 (storage.ts):**
- `getWorkflowExecutions()` ✅ (라인 1647)
- `getWorkflowNodeResults()` ✅ (라인 1671)

**DB 스키마 (shared/schema.ts):**
- `workflowExecutions` ✅ (라인 505)
- `workflowNodeResults` ✅ (라인 1133)
- `workflowNodeExecutions` ✅ (라인 4849)

**추가 확인 필요:**
- workflow-monitor.tsx에서 실제 사용하는 API 엔드포인트 확인

**상태**: ⚠️ 부분 확인 필요

---

## 3. 데이터 관리

### 3.1 스키마 브라우저

**메뉴 정보:**
- 경로: `/schema-browser`
- 라벨: "스키마 브라우저"
- 페이지: `client/src/pages/schema-browser.tsx`

**프론트엔드 API 호출:**
- `/api/azure/services/status` ✅ (라인 188)
- `/api/azure/databricks/unity-catalog` ✅ (라인 196)
- `/api/azure/databricks/schema` ✅ (라인 204)
- `/api/azure/postgresql/schema` ✅ (라인 212)
- `/api/azure/cosmosdb/schema` ✅ (라인 220)
- `/api/azure/ai-search/schema` ✅ (라인 228)
- `/api/azure/databricks/query` ✅ (라인 296)
- `/api/azure/postgresql/query` ✅ (라인 296)
- `/api/azure/cosmosdb/query` ✅ (라인 307)
- `/api/azure/ai-search/query` ✅ (라인 321)

**백엔드 API 엔드포인트 확인 필요:**
- Azure 서비스 관련 엔드포인트 확인 필요 (azure-*.ts 서비스 파일)

**서비스 함수:**
- `azure-postgresql.ts`: `getTableSchema()` 등 ✅
- `azure-databricks.ts`: `getTableSchema()` 등 ✅
- `azure-cosmosdb.ts`: 스키마 조회 함수 ✅
- `azure-search.ts`: 인덱스 조회 함수 ✅

**DB 스키마 (shared/schema.ts):**
- 직접 DB 스키마 조회 기능 (information_schema 사용)

**상태**: ✅ 일치 (Azure 서비스 스키마 조회)

---

### 3.2 RAG 검색엔진

**메뉴 정보:**
- 경로: `/` (검색 기능, 별도 페이지 아님)
- 라벨: "RAG 검색엔진"
- 페이지: home.tsx 또는 별도 컴포넌트

**프론트엔드 API 호출 확인 필요:**
- RAG 검색 기능이 어느 페이지에 구현되어 있는지 확인 필요

**백엔드 API 엔드포인트:**
- `/api/search` ✅ (routes.ts 라인 2491)
- `/api/rag/search` ✅ (확인 필요)

**서비스 함수:**
- `ragService.ts`: RAG 검색 함수 ✅
- `vector-search.ts`: 벡터 검색 함수 ✅

**DB 스키마 (shared/schema.ts):**
- `newsData` ✅ (embeddings 필드 포함)
- `financialData` ✅ (embeddings 필드 포함)

**추가 확인 필요:**
- RAG 검색이 실제로 어디에 구현되어 있는지 확인

**상태**: ⚠️ 구현 위치 확인 필요

---

### 3.3 NL to SQL 엔진

**메뉴 정보:**
- 경로: `/nl2sql-engine`
- 라벨: "NL to SQL 엔진"
- 페이지: `client/src/pages/nl2sql-engine.tsx`

**프론트엔드 API 호출:**
- `/api/nl2sql/generate` ✅ (라인 43)
- `/api/nl2sql/execute` ✅ (라인 68)

**백엔드 API 엔드포인트:**
- `/api/nl2sql/generate` ✅ (routes.ts 라인 8150)
- `/api/nl2sql/execute` ✅ (routes.ts 라인 8266)
- `/api/nl2sql/schema` ✅ (routes.ts 라인 8336)
- `/api/nl2sql/prompts` ✅ (routes.ts 라인 9350)
- `/api/nl2sql/generate-enhanced` ✅ (routes.ts 라인 9631)

**서비스 함수 (storage.ts):**
- `getNl2sqlPrompts()` ✅ (라인 7807)
- `getSchemaSources()` ✅ (라인 7856)
- `getDictionaries()` ✅ (라인 7927)
- `getSchemaTree()` ✅ (라인 7999)

**DB 스키마 (shared/schema.ts):**
- `nl2sqlPrompts` ✅ (라인 4662)
- `schemaSources` ✅ (라인 4681)
- `dictionaries` ✅ (라인 4701)
- `dictionaryEntries` ✅ (라인 4715)

**상태**: ✅ 일치

---

### 3.4 스키마 의미 매핑

**메뉴 정보:**
- 경로: `/schema-mapper`
- 라벨: "스키마 의미 매핑"
- 페이지: `client/src/pages/schema-mapper.tsx`

**프론트엔드 API 호출 확인 필요:**
- schema-mapper.tsx에서 실제 사용하는 API 확인 필요

**백엔드 API 엔드포인트 확인 필요:**
- `/api/schema/mapping` (확인 필요)

**서비스 함수 (storage.ts):**
- `getSchemaSources()` ✅ (확인 필요)
- `getDictionaryEntries()` ✅ (확인 필요)

**DB 스키마 (shared/schema.ts):**
- `schemaSources` ✅ (라인 4681)
- `dictionaryEntries` ✅ (라인 4715)

**상태**: ⚠️ API 엔드포인트 및 구현 확인 필요

---

### 3.5 Dictionary 관리

**메뉴 정보:**
- 경로: `/dictionary-manager`
- 라벨: "Dictionary 관리"
- 페이지: `client/src/pages/dictionary-manager.tsx`

**백엔드 API 엔드포인트:**
- `/api/dictionaries` ✅ (routes.ts 라인 8382, 9496)
- `/api/dictionaries` (POST) ✅ (routes.ts 라인 9512)
- `/api/dictionaries/:id/entries` ✅ (routes.ts 라인 8403)
- `/api/dictionaries/:id/entries` (POST) ✅ (routes.ts 라인 8484)
- `/api/dictionaries/entries/:entryId` (PUT/DELETE) ✅ (routes.ts 라인 8558, 8584)

**서비스 함수 (storage.ts):**
- `getDictionary()` ✅ (라인 7927)
- `getDictionaryEntries()` ✅ (라인 7950)
- `createDictionary()` ✅ (확인 필요)
- `createDictionaryEntry()` ✅ (확인 필요)

**DB 스키마 (shared/schema.ts):**
- `dictionaries` ✅ (라인 4701)
- `dictionaryEntries` ✅ (라인 4715)

**상태**: ✅ 일치

---

### 3.6 테마 클러스터 관리

**메뉴 정보:**
- 경로: `/theme-cluster-management`
- 라벨: "테마 클러스터 관리"
- 페이지: `client/src/pages/theme-cluster-management.tsx`

**백엔드 API 엔드포인트:**
- `/api/themes` ✅ (routes.ts 라인 1770)
- `/api/themes/:id` ✅ (routes.ts 라인 1864)
- `/api/themes/:id/clusters` (확인 필요)

**서비스 함수 (storage.ts):**
- `getThemes()` ✅ (확인 필요)
- `createTheme()` ✅ (확인 필요)
- `searchNewsData()` ✅ (라인 1768)

**DB 스키마 (shared/schema.ts):**
- `themes` ✅ (라인 103)
- `newsData` ✅ (themeClusterId 필드 포함, 라인 129)

**상태**: ✅ 일치

---

## 4. AI 시스템 관리

### 4.1 프롬프트 관리

**메뉴 정보:**
- 경로: `/prompt-management`
- 라벨: "프롬프트 관리"
- 페이지: `client/src/pages/prompt-management.tsx`

**백엔드 API 엔드포인트:**
- `/api/prompts` ✅ (routes.ts 라인 371)
- `/api/prompts/:id` ✅ (확인 필요)
- `/api/prompts/:id/test` ✅ (routes.ts 라인 571)

**서비스 함수 (storage.ts):**
- `getPrompts()` ✅ (라인 1573)
- `getPrompt()` ✅ (라인 1577)
- `createPrompt()` ✅ (라인 1582)
- `updatePrompt()` ✅ (라인 1587)
- `deletePrompt()` ✅ (라인 1596)

**DB 스키마 (shared/schema.ts):**
- `prompts` ✅ (라인 215)

**상태**: ✅ 일치

---

### 4.2 API 호출 관리

**메뉴 정보:**
- 경로: `/api-management`
- 라벨: "API 호출 관리"
- 페이지: `client/src/pages/api-management.tsx`

**프론트엔드 API 호출:**
- `/api/api-calls/enhanced` ✅ (라인 115)
- `/api/ai-providers` ✅ (라인 127)
- `/api/api-categories` ✅ (라인 136)
- `/api/api-templates` ✅ (라인 144)
- `/api/secrets/status` ✅ (확인 필요)
- `/api/api-calls/:id/test` ✅ (확인 필요)

**백엔드 API 엔드포인트:**
- `/api/api-calls` ✅ (routes.ts 라인 633)
- `/api/api-calls/enhanced` ✅ (routes.ts 라인 695)
- `/api/api-calls/:id/test` ✅ (routes.ts 라인 682)
- `/api/ai-providers` ✅ (routes.ts 라인 724)
- `/api/api-categories` ✅ (routes.ts 라인 802)
- `/api/api-templates` ✅ (routes.ts 라인 1170)
- `/api/secrets/status` ✅ (routes.ts 라인 1259)

**서비스 함수 (storage.ts):**
- `getApiCalls()` ✅ (라인 5141)
- `createApiCall()` ✅ (라인 1602)
- `updateApiCall()` ✅ (라인 1607)
- `deleteApiCall()` ✅ (라인 1616)
- `getAiServiceProviders()` ✅ (라인 5276)
- `getApiCategories()` ✅ (라인 5323)
- `getApiTemplates()` ✅ (확인 필요)

**DB 스키마 (shared/schema.ts):**
- `apiCalls` ✅ (라인 276)
- `aiServiceProviders` ✅ (라인 235)
- `apiCategories` ✅ (라인 260)
- `apiTemplates` ✅ (라인 446)
- `apiTestResults` ✅ (라인 366)
- `apiUsageAnalytics` ✅ (라인 405)

**상태**: ✅ 일치

---

### 4.3 프롬프트 빌더

**메뉴 정보:**
- 경로: `/prompt-builder`
- 라벨: "프롬프트 빌더"
- 페이지: `client/src/pages/prompt-builder.tsx`

**백엔드 API 엔드포인트:**
- `/api/prompts` ✅ (routes.ts 라인 371)
- `/api/prompt-suggestions` ✅ (routes.ts 라인 469)

**서비스 함수 (storage.ts):**
- `createPrompt()` ✅ (라인 1582)

**DB 스키마 (shared/schema.ts):**
- `prompts` ✅ (라인 215)

**상태**: ✅ 일치

---

### 4.4 금융 AI 어시스턴트

**메뉴 정보:**
- 경로: `/financial-chatbot`
- 라벨: "금융 AI 어시스턴트"
- 페이지: `client/src/pages/financial-chatbot.tsx`

**백엔드 API 엔드포인트:**
- `/api/ai-chat/*` ✅ (ai-chat.ts 라우터 사용)

**서비스 함수:**
- `ragService.ts`: RAG 검색 ✅
- `openai.ts`: AI 채팅 ✅

**DB 스키마 (shared/schema.ts):**
- `newsData` ✅ (RAG 검색용)
- `financialData` ✅ (RAG 검색용)

**상태**: ✅ 일치

---

### 4.5 로그 분석

**메뉴 정보:**
- 경로: `/logs`
- 라벨: "로그 분석"
- 페이지: `client/src/pages/log-viewer.tsx` 또는 `logs-viewer.tsx`

**백엔드 API 엔드포인트:**
- `/api/error-logs/*` ✅ (error-logs.ts 라우터 사용)

**서비스 함수:**
- `error-logger.ts`: 에러 로그 관리 ✅

**DB 스키마 (shared/schema.ts):**
- 파일 시스템 기반 로그 (DB 스키마 없음)

**상태**: ✅ 일치

---

### 4.6 감사 로그 관리

**메뉴 정보:**
- 경로: `/audit-log-management`
- 라벨: "감사 로그 관리"
- 페이지: `client/src/pages/audit-log-management.tsx`

**백엔드 API 엔드포인트:**
- `/api/audit-logs/*` ✅ (audit-logs-simple.ts 라우터 사용)

**서비스 함수:**
- `activity-logger.ts`: 활동 로그 기록 ✅

**DB 스키마 (shared/schema.ts):**
- ❌ **누락**: `audit_logs`, `data_access_logs`, `security_events`, `audit_reports` 테이블이 `shared/schema.ts`에 없음
- ✅ `create-complete-schema.sql`에는 정의됨

**상태**: ⚠️ **불일치 발견**

**불일치점:**
- `create-complete-schema.sql`에는 감사 로그 테이블 4개가 정의되어 있으나
- `shared/schema.ts`에는 Drizzle ORM 정의가 없음
- 애플리케이션 코드에서 Drizzle ORM을 통해 감사 로그를 조회/생성할 수 없음

---

### 4.7 Azure 서비스 설정

**메뉴 정보:**
- 경로: `/azure-config`
- 라벨: "Azure 서비스 설정"
- 페이지: `client/src/pages/azure-config.tsx`

**백엔드 API 엔드포인트 확인 필요:**
- `/api/azure-config` (확인 필요)

**서비스 함수:**
- `azure-config.ts`: Azure 설정 관리 ✅

**DB 스키마 (shared/schema.ts):**
- `azureConfigs` ✅ (라인 4790)

**상태**: ⚠️ API 엔드포인트 확인 필요

---

### 4.8 OpenAI 프로바이더

**메뉴 정보:**
- 경로: `/openai-provider`
- 라벨: "OpenAI 프로바이더"
- 페이지: `client/src/pages/openai-provider.tsx`

**백엔드 API 엔드포인트 확인 필요:**
- `/api/openai/config` (확인 필요)

**서비스 함수:**
- `openai.ts`: OpenAI 서비스 ✅
- `azure-openai.ts`: Azure OpenAI 서비스 ✅

**DB 스키마 (shared/schema.ts):**
- `aiServiceProviders` ✅ (라인 235)

**상태**: ⚠️ API 엔드포인트 확인 필요

---

### 4.9 시스템 통합 테스트

**메뉴 정보:**
- 경로: `/system-test`
- 라벨: "시스템 통합 테스트"
- 페이지: `client/src/pages/system-test-dashboard.tsx`

**백엔드 API 엔드포인트:**
- `/api/system/status` ✅ (routes.ts 라인 4892)
- `/api/azure/services/status` ✅ (확인 필요)

**서비스 함수:**
- `azure-environment-validator.ts`: 환경 검증 ✅

**DB 스키마 (shared/schema.ts):**
- 시스템 정보만 사용 (DB 스키마 불필요)

**상태**: ✅ 일치

---

### 4.10 단위 테스트

**메뉴 정보:**
- 경로: `/unit-testing`
- 라벨: "단위 테스트"
- 페이지: `client/src/pages/unit-testing.tsx`

**백엔드 API 엔드포인트 확인 필요:**
- `/api/test/prompts` (확인 필요)
- `/api/test/api-calls` (확인 필요)

**서비스 함수 (storage.ts):**
- `testApiCall()` ✅ (라인 154)

**DB 스키마 (shared/schema.ts):**
- `apiTestResults` ✅ (라인 366)

**상태**: ⚠️ API 엔드포인트 확인 필요

---

### 4.11 AI시황생성테스트

**메뉴 정보:**
- 경로: `/ai-market-analysis`
- 라벨: "AI시황생성테스트"
- 페이지: `client/src/pages/AIMarketAnalysis.tsx`

**백엔드 API 엔드포인트:**
- `/api/ai-market-analysis/execute` ✅ (ai-market-analysis.ts 라우터)
- `/api/ai-market-analysis/status` ✅ (ai-market-analysis-status.ts 라우터)

**서비스 함수:**
- `ai-market-analysis.ts`: 시황 생성 ✅
- `ai-market-analysis-workflow.ts`: 워크플로우 실행 ✅

**DB 스키마 (shared/schema.ts):**
- `marketAnalysis` ✅ (라인 537)
- `workflows` ✅ (라인 493)
- `workflowExecutions` ✅ (라인 505)

**상태**: ✅ 일치

---

## 5. 분석 & 리포팅

### 5.1 모닝브리핑

**메뉴 정보:**
- 경로: `/morning-briefing`
- 라벨: "모닝브리핑"
- 페이지: `client/src/pages/morning-briefing.tsx`

**백엔드 API 엔드포인트:**
- `/api/morning-briefing` ✅ (routes.ts 라인 3711)
- `/api/morning-briefing/generate` ✅ (routes.ts 라인 3786)

**서비스 함수 (storage.ts):**
- `getMorningBriefings()` ✅ (라인 2296)
- `createMorningBriefing()` ✅ (라인 2358)

**DB 스키마 (shared/schema.ts):**
- `morningBriefing` ✅ (라인 1209)

**상태**: ✅ 일치

---

### 5.2 매크로시황

**메뉴 정보:**
- 경로: `/macro-analysis`
- 라벨: "매크로시황"
- 페이지: `client/src/pages/macro-analysis.tsx`

**백엔드 API 엔드포인트:**
- `/api/macro-analysis` ✅ (routes.ts 라인 3604)
- `/api/macro-analysis/generate` ✅ (routes.ts 라인 3681)

**서비스 함수 (storage.ts):**
- `getMacroAnalysisList()` ✅ (라인 1983)
- `createMacroAnalysis()` ✅ (라인 1995)

**DB 스키마 (shared/schema.ts):**
- `macroAnalysis` ✅ (라인 554)
- `macroWorkflowTemplates` ✅ (라인 597)

**상태**: ✅ 일치

---

### 5.3 인과시황

**메뉴 정보:**
- 경로: `/causal-analysis`
- 라벨: "인과시황"
- 페이지: `client/src/pages/causal-analysis.tsx`

**백엔드 API 엔드포인트:**
- `/api/causal-analysis` ✅ (routes.ts 라인 4111)
- `/api/causal-analysis/generate` ✅ (routes.ts 라인 4202)

**서비스 함수 (storage.ts):**
- `getCausalAnalyses()` ✅ (라인 3202)
- `createCausalAnalysis()` ✅ (라인 3249)

**DB 스키마 (shared/schema.ts):**
- `causalAnalysis` ✅ (라인 1254)
- `majorEvents` ✅ (라인 1762)
- `majorEventsRelatedNews` ✅ (라인 1779)

**상태**: ✅ 일치

---

### 5.4 레이아웃 편집기

**메뉴 정보:**
- 경로: `/layout-editor`
- 라벨: "레이아웃 편집기"
- 페이지: `client/src/pages/layout-editor.tsx`

**백엔드 API 엔드포인트:**
- `/api/layout-templates` ✅ (routes.ts 라인 3312)

**서비스 함수 (storage.ts):**
- `getLayoutTemplates()` ✅ (라인 2217)
- `createLayoutTemplate()` ✅ (라인 2239)

**DB 스키마 (shared/schema.ts):**
- `layoutTemplates` ✅ (라인 1168)

**상태**: ✅ 일치

---

### 5.5 MTS 테마분석

**메뉴 정보:**
- 경로: `/mts`
- 라벨: "MTS 테마분석"
- 페이지: `client/src/pages/mts.tsx`

**백엔드 API 엔드포인트:**
- `/api/infostock-themes` ✅ (routes.ts 라인 4391)
- `/api/infostock-themes` (POST) ✅ (routes.ts 라인 4411)

**서비스 함수 (storage.ts):**
- `getInfoStockThemes()` ✅ (확인 필요)
- `createInfoStockTheme()` ✅ (확인 필요)

**DB 스키마 (shared/schema.ts):**
- `infoStockThemes` ✅ (라인 1817)
- `infoStockThemeStocks` ✅ (라인 1835)

**상태**: ✅ 일치

---

## 6. 개인화 서비스

### 6.1 개인화 대시보드

**메뉴 정보:**
- 경로: `/personal-dashboard`
- 라벨: "개인화 대시보드"
- 페이지: `client/src/pages/personal-dashboard.tsx`

**백엔드 API 엔드포인트:**
- `/api/personalization/:userId/portfolio` ✅ (routes.ts 라인 6497)
- `/api/personalization/:userId/holdings` ✅ (routes.ts 라인 6520)
- `/api/personalization/:userId/news` ✅ (routes.ts 라인 6545)
- `/api/personalization/:userId/recommendations` ✅ (routes.ts 라인 6616)
- `/api/personalization/:userId/performance` ✅ (routes.ts 라인 6643)

**서비스 함수 (storage.ts):**
- `getPersonalizedPortfolio()` ✅ (라인 6514)
- `getPersonalizedNews()` ✅ (라인 6609)
- `getPersonalizedRecommendations()` ✅ (라인 6678)

**DB 스키마 (shared/schema.ts):**
- `userBalances` ✅ (라인 3788)
- `userTags` ✅ (라인 3889)
- `userWatchlist` ✅ (라인 3904)
- `userTrades` ✅ (라인 3939)

**상태**: ✅ 일치

---

### 6.2 보유종목 관리

**메뉴 정보:**
- 경로: `/my-holdings`
- 라벨: "보유종목 관리"
- 페이지: `client/src/pages/my-holdings.tsx`

**프론트엔드 API 호출:**
- `/api/personalization/:userId/portfolio` ✅ (라인 61)
- `/api/balances/:userId` ✅ (라인 67)

**백엔드 API 엔드포인트:**
- `/api/personalization/:userId/portfolio` ✅ (routes.ts 라인 6497)
- `/api/personalization/:userId/holdings` ✅ (routes.ts 라인 6520)
- `/api/balances/:userId` ✅ (routes.ts 라인 5771)
- `/api/balances/:userId/insights` ✅ (routes.ts 라인 5832)

**서비스 함수 (storage.ts):**
- `getUserBalances()` ✅ (라인 5618)
- `getPersonalizedPortfolio()` ✅ (라인 6514)
- `bulkCreateUserBalances()` ✅ (확인 필요)

**DB 스키마 (shared/schema.ts):**
- `userBalances` ✅ (라인 3788)
- `balanceInsights` ✅ (라인 3818)

**상태**: ✅ 일치

---

### 6.3 매매이력 분석

**메뉴 정보:**
- 경로: `/my-trades`
- 라벨: "매매이력 분석"
- 페이지: `client/src/pages/my-trades.tsx`

**프론트엔드 API 호출:**
- `/api/personalization/:userId/trades` ✅ (라인 71)
- `/api/personalization/:userId/performance` ✅ (라인 77)

**백엔드 API 엔드포인트:**
- `/api/trades/:userId` ✅ (확인 필요)
- `/api/trades/:userId/metrics` ✅ (routes.ts 라인 6217)
- `/api/trades/:userId/performance` ✅ (routes.ts 라인 6245)
- `/api/personalization/:userId/performance` ✅ (routes.ts 라인 6643)

**서비스 함수 (storage.ts):**
- `getUserTrades()` ✅ (라인 6052)
- `getTradingPerformanceSummary()` ✅ (확인 필요)
- `getMonthlyTradingMetrics()` ✅ (확인 필요)

**DB 스키마 (shared/schema.ts):**
- `userTrades` ✅ (라인 3939)
- `tradeInsights` ✅ (라인 3974)

**상태**: ✅ 일치

---

### 6.4 관심종목 관리

**메뉴 정보:**
- 경로: `/my-watchlist`
- 라벨: "관심종목 관리"
- 페이지: `client/src/pages/my-watchlist.tsx`

**프론트엔드 API 호출:**
- `/api/personalization/:userId/watchlist` ✅ (라인 60)
- `/api/personalization/:userId/watchlist` (POST/DELETE) ✅ (라인 183, 198)

**백엔드 API 엔드포인트:**
- `/api/personalization/:userId/watchlist` ✅ (routes.ts 라인 6379)
- `/api/personalization/:userId/watchlist` (POST) ✅ (routes.ts 라인 6403)
- `/api/personalization/:userId/watchlist/:itemId` (DELETE) ✅ (routes.ts 라인 6461)

**서비스 함수 (storage.ts):**
- `getUserWatchlist()` ✅ (라인 5777)
- `createUserWatchlist()` ✅ (확인 필요)
- `deleteUserWatchlist()` ✅ (확인 필요)

**DB 스키마 (shared/schema.ts):**
- `userWatchlist` ✅ (라인 3904)

**상태**: ✅ 일치

---

### 6.5 개인화 설정

**메뉴 정보:**
- 경로: `/personalization-settings`
- 라벨: "개인화 설정"
- 페이지: `client/src/pages/personalization-settings.tsx`

**백엔드 API 엔드포인트 확인 필요:**
- `/api/user/settings` (확인 필요)

**서비스 함수 (storage.ts):**
- `getUserTags()` ✅ (확인 필요)
- `getSegments()` ✅ (확인 필요)
- `getRules()` ✅ (확인 필요)

**DB 스키마 (shared/schema.ts):**
- `userTags` ✅ (라인 3889)
- `segments` ✅ (라인 4155)
- `rules` ✅ (라인 4210)

**상태**: ⚠️ API 엔드포인트 확인 필요

---

## 7. 품질 관리

### 7.1 품질 평가

**메뉴 정보:**
- 경로: `/quality-dashboard`
- 라벨: "품질 평가"
- 페이지: `client/src/pages/quality-dashboard.tsx`

**프론트엔드 API 호출:**
- `/api/quality/metrics` ✅ (라인 101)
- `/api/quality/trends` ✅ (라인 121)
- `/api/quality/feedback` ✅ (라인 135)
- `/api/quality/improvements` ✅ (라인 144)

**백엔드 API 엔드포인트:**
- `/api/quality/metrics` ✅ (routes.ts 라인 4557)
- `/api/quality/trends` ✅ (routes.ts 라인 4644)
- `/api/quality/feedback` ✅ (routes.ts 라인 4618)
- `/api/quality/improvements` ✅ (routes.ts 라인 4671)

**서비스 함수 (storage.ts):**
- `getReportQualityMetrics()` ✅ (확인 필요)
- `getFeedbackLog()` ✅ (확인 필요)
- `getQualityImprovements()` ✅ (확인 필요)

**DB 스키마 (shared/schema.ts):**
- `reportQualityMetrics` ✅ (라인 1556)
- `feedbackLog` ✅ (라인 1598)
- `qualityImprovements` ✅ (라인 1637)

**상태**: ✅ 일치

---

### 7.2 ETF 투자가이드

**메뉴 정보:**
- 경로: `/etf-guide`
- 라벨: "ETF 투자가이드"
- 페이지: `client/src/pages/etf-guide.tsx`

**백엔드 API 엔드포인트:**
- `/api/etf/products` ✅ (routes.ts 라인 7432)
- `/api/etf/products/:ticker` ✅ (routes.ts 라인 7473)
- `/api/etf/metrics` ✅ (routes.ts 라인 7505)
- `/api/etf/ingest` ✅ (routes.ts 라인 7540)
- `/api/etf/metrics/refresh` ✅ (routes.ts 라인 7583)

**서비스 함수:**
- `getEtfProducts()` ✅ (storage.ts 라인 6931)
- `getEtfMetrics()` ✅ (storage.ts 라인 7021)
- `getEtfRecommendations()` ✅ (storage.ts 라인 7467)
- `recommend.ts`: ETF 추천 ✅
- `guardrails.ts`: 가드레일 정책 ✅

**DB 스키마 (shared/schema.ts):**
- `etfProducts` ✅ (라인 617)
- `etfMetrics` ✅ (라인 696)
- `userRiskProfile` ✅ (라인 739)
- `etfChatSessions` ✅ (라인 792)
- `etfChatMessages` ✅ (라인 817)
- `etfRecommendationSettings` ✅ (라인 936)

**상태**: ✅ 일치

---

## 주요 발견 사항

### 심각한 불일치 (Critical)

#### 1. 감사 로그 테이블 누락

**문제**: `shared/schema.ts`에 감사 로그 테이블이 정의되어 있지 않음

**영향:**
- `audit-log-management.tsx` 페이지에서 감사 로그 조회 시 Drizzle ORM을 사용할 수 없음
- 애플리케이션 코드에서 감사 로그를 생성/조회하려면 raw SQL 사용 필요
- 타입 안정성 및 일관성 손실

**누락된 테이블:**
1. `audit_logs`
2. `data_access_logs`
3. `security_events`
4. `audit_reports`

**해결 방안:**
- `shared/schema.ts`에 감사 로그 테이블 4개 추가
- `create-complete-schema.sql`의 정의를 참고하여 Drizzle ORM 스키마 작성

---

### 중간 수준 불일치 (High)

#### 2. 일부 메뉴의 API 엔드포인트 미확인

다음 메뉴들의 API 엔드포인트가 routes.ts에서 확인되지 않았거나, 프론트엔드에서 호출하는 엔드포인트와 불일치 가능:

1. **스케줄러** (`/scheduler`)
   - 프론트엔드에서 호출하는 API 확인 필요

2. **워크플로우 모니터** (`/workflow-monitor`)
   - `/api/workflows/executions` 엔드포인트 확인 필요

3. **NL to SQL 엔진** (`/nl2sql-engine`)
   - `/api/nl2sql/generate` 엔드포인트 확인 필요 (routes.ts에는 `/api/nl2sql/execute`만 있음)

4. **스키마 의미 매핑** (`/schema-mapper`)
   - `/api/schema/mapping` 엔드포인트 확인 필요

5. **Dictionary 관리** (`/dictionary-manager`)
   - `/api/dictionaries` 엔드포인트 확인 필요

6. **개인화 서비스 전체**
   - `/api/personal/*`, `/api/user/*` 엔드포인트 확인 필요

7. **MTS 테마분석** (`/mts`)
   - `/api/mts/themes` 엔드포인트 확인 필요

8. **ETF 투자가이드** (`/etf-guide`)
   - `/api/etf/*` 엔드포인트 확인 필요

---

### 낮은 수준 불일치 (Low)

#### 3. RAG 검색엔진 구현 위치 불명확

- 메뉴에는 "RAG 검색엔진"이 있으나 별도 페이지가 없음
- home.tsx 또는 dashboard.tsx에 통합되어 있는 것으로 보임
- 구현 위치 명확화 필요

---

## 권장 수정 사항

### 즉시 수정 필요 (Critical)

1. **shared/schema.ts에 감사 로그 테이블 추가**
   ```typescript
   export const auditLogs = pgTable("audit_logs", {
     // create-complete-schema.sql 참고하여 정의
   });
   export const dataAccessLogs = pgTable("data_access_logs", {
     // ...
   });
   export const securityEvents = pgTable("security_events", {
     // ...
   });
   export const auditReports = pgTable("audit_reports", {
     // ...
   });
   ```

### 단기 수정 필요 (High)

1. **누락된 API 엔드포인트 구현 확인 및 추가**
   - 각 메뉴 페이지에서 호출하는 API 확인
   - routes.ts에 누락된 엔드포인트 추가

2. **storage.ts에 누락된 함수 구현 확인**
   - 각 메뉴에서 필요한 함수가 모두 구현되어 있는지 확인

### 장기 개선 (Low)

1. **메뉴 구조 문서화**
   - 각 메뉴별 완전한 매핑 문서 작성
   - API 엔드포인트, 함수, 스키마 매핑 자동화

---

## 다음 단계

1. 각 페이지 컴포넌트에서 실제로 호출하는 API 엔드포인트 전체 확인
2. routes.ts에서 누락된 엔드포인트 확인 및 추가
3. storage.ts에서 누락된 함수 확인 및 추가
4. shared/schema.ts에 감사 로그 테이블 추가
5. 전체 매핑 문서 업데이트

