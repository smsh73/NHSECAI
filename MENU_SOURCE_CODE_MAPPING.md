# 메뉴별 소스코드 매핑 문서

## 개요
이 문서는 애플리케이션의 메뉴별로 관련 소스코드 파일, 스키마, 데이터 소스, 제공 기능을 정리한 것입니다.

---

## 1. 홈 & 대시보드

### 1.1 시장 현황 (Home)
- **페이지 파일**: `client/src/pages/home.tsx`
- **라우트**: `/`
- **API 엔드포인트**: 
  - `/api/market-analysis` - 시장 분석 데이터
  - `/api/system/status` - 시스템 상태
- **관련 스키마**: `marketAnalysis`, `financialData`, `newsData`, `themes`
- **데이터 소스**: 
  - PostgreSQL: `market_analysis`, `financial_data`, `news_data`, `themes`
- **제공 기능**:
  - 실시간 시장 현황 대시보드
  - 주요 지표 및 지수 표시
  - 뉴스 및 시황 요약

### 1.2 통합 대시보드 (Dashboard)
- **페이지 파일**: `client/src/pages/dashboard.tsx`
- **라우트**: `/dashboard`
- **API 엔드포인트**: 
  - `/api/market-analysis` - 시장 분석
  - `/api/system/status` - 시스템 상태
  - `/api/workflows/stats` - 워크플로우 통계
  - `/api/alerts/stats` - 알림 통계
  - `/api/search` - 통합 검색
- **관련 스키마**: `marketAnalysis`, `workflows`, `workflowExecutions`, `financialData`
- **데이터 소스**: 
  - PostgreSQL: `market_analysis`, `workflows`, `workflow_executions`, `financial_data`
- **제공 기능**:
  - 통합 대시보드
  - 워크플로우 실행 통계
  - 시스템 모니터링
  - 빠른 검색

---

## 2. 워크플로우 관리

### 2.1 워크플로우 편집기
- **페이지 파일**: `client/src/pages/workflow-editor.tsx`
- **라우트**: `/workflow-editor/:id?`
- **API 엔드포인트**: 
  - `/api/workflows` - 워크플로우 CRUD
  - `/api/workflows/:id` - 워크플로우 상세
  - `/api/prompts` - 프롬프트 목록
  - `/api/api-calls` - API 호출 목록
- **서버 파일**: 
  - `server/routes/workflow.ts`
  - `server/services/workflow-engine.ts`
  - `server/services/workflow-execution-engine.ts`
- **관련 스키마**: `workflows`, `workflowNodes`, `prompts`, `apiCalls`
- **데이터 소스**: 
  - PostgreSQL: `workflows`, `workflow_nodes`, `prompts`, `api_calls`
- **제공 기능**:
  - 드래그 앤 드롭 워크플로우 편집
  - 노드 연결 및 구성
  - 워크플로우 저장 및 실행
  - 프롬프트 및 API 호출 통합

### 2.2 실행 스케줄러
- **페이지 파일**: `client/src/pages/scheduler.tsx`
- **라우트**: `/scheduler`
- **API 엔드포인트**: 
  - `/api/schedules` - 스케줄 CRUD
  - `/api/schedules/:id/execute` - 스케줄 실행
- **서버 파일**: 
  - `server/services/scheduler.ts`
- **관련 스키마**: `schedules`, `workflows`
- **데이터 소스**: 
  - PostgreSQL: `schedules`, `workflows`
- **제공 기능**:
  - Cron 표현식 기반 스케줄 설정
  - 워크플로우 자동 실행
  - 스케줄 상태 모니터링

### 2.3 워크플로우 모니터
- **페이지 파일**: `client/src/pages/workflow-monitor.tsx`
- **라우트**: `/workflow-monitor`
- **API 엔드포인트**: 
  - `/api/workflows/executions` - 실행 이력
  - `/api/workflows/:id/executions` - 특정 워크플로우 실행 이력
- **서버 파일**: 
  - `server/routes/workflow.ts`
  - `server/services/workflow-engine.ts`
- **관련 스키마**: `workflowExecutions`, `workflowNodeResults`, `workflows`
- **데이터 소스**: 
  - PostgreSQL: `workflow_executions`, `workflow_node_results`, `workflows`
- **제공 기능**:
  - 워크플로우 실행 상태 실시간 모니터링
  - 실행 이력 조회
  - 노드별 실행 결과 확인
  - 에러 로그 확인

---

## 3. 데이터 관리

### 3.1 스키마 브라우저
- **페이지 파일**: `client/src/pages/schema-browser.tsx`
- **라우트**: `/schema-browser`
 anti-**API 엔드포인트**: 
  - `/api/schema` - 스키마 정보
  - `/api/schema/:table` - 테이블 상세 정보
- **서버 파일**: 
  - `server/services/azure-postgresql.ts`
- **관련 스키마**: 모든 PostgreSQL 테이블
- **데이터 소스**: 
  - PostgreSQL: `information_schema` 조회
- **제공 기능**:
  - 데이터베이스 스키마 탐색
  - 테이블 구조 확인
  - 컬럼 정보 조회

### 3.2 RAG 검색엔진
- **페이지 파일**: `client/src/pages/schema-browser.tsx` (동일)
- **라우트**: `/` (검색 기능)
- **API 엔드포인트**: 
  - `/api/search` - 하이브리드 검색
  - `/api/rag/search` - RAG 검색
- **서버 파일**: 
  - `server/services/rag.ts`
  - `server/services/ragService.ts`
  - `server/services/azure-search.ts`
- **관련 스키마**: `newsData`, `financialData`
- **데이터 소스**: 
  - Azure AI Search: 벡터 인덱스
  - PostgreSQL: `news_data`, `financial_data`
- **제공 기능**:
  - 하이브리드 벡터 검색
  - 키워드 및 시맨틱 검색
  - 관련 문서 추천

### 3.3 NL to SQL 엔진
- **페이지 파일**: `client/src/pages/nl2sql-engine.tsx`
- **라우트**: `/nl2sql-engine`
- **API 엔드포인트**: 
  - `/api/nl2sql/generate` - SQL 생성
  - `/api/nl2sql/prompts` - 프롬프트 관리
- **서버 파일**: 
  - `server/services/storage.ts` (NL2SQL 관련)
- **관련 스키마**: `nl2sqlPrompts`, `schemaSources`, `dictionaries`
- **데이터 소스**: 
  - PostgreSQL: `nl2sql_prompts`, `schema_sources`, `dictionaries`
  - Azure OpenAI: SQL 생성
- **제공 기능**:
  - 자연어를 SQL로 변환
  - 스키마 기반 SQL 생성
  - 프롬프트 관리

### 3.4 스키마 의미 매핑
- **페이지 파일**: `client/src/pages/schema-mapper.tsx`
- **라우트**: `/schema-mapper`
- **API 엔드포인트**: 
  - `/api/schema/mapping` - 매핑 CRUD
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `schemaSources`, `dictionaryEntries`
- **데이터 소스**: 
  - PostgreSQL: `schema_sources`, `dictionary_entries`
- **제공 기능**:
  - 테이블/컬럼 의미 매핑
  - 사전 기반 매핑 관리

### 3.5 Dictionary 관리
- **페이지 파일**: `client/src/pages/dictionary-manager.tsx`
- **라우트**: `/dictionary-manager`
- **API 엔드포인트**: 
  - `/api/dictionaries` - 사전 CRUD
  - `/api/dictionaries/:id/entries` " - 항목 CRUD
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `dictionaries`, `dictionaryEntries`
- **데이터 소스**: 
  - PostgreSQL: `dictionaries`, `dictionary_entries`
- **제공 기능**:
  - 사전 생성 및 관리
  - 항목 추가/수정/삭제
  - 사전 기반 매핑

### 3.6 테마 클러스터 관리
- **페이지 파일**: `client/src/pages/theme-cluster-management.tsx`
- **라우트**: `/theme-cluster-management`
- **API 엔드포인트**: 
  - `/api/themes` - 테마 CRUD
  - `/api/themes/:id/clusters` - 클러스터 관리
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `themes`, `newsData`
- **데이터 소스**: 
  - PostgreSQL: `themes`, `news_data`
- **제공 기능**:
  - 테마 생성 및 관리
  - 뉴스 클러스터링
  - 테마별 뉴스 분류

---

## 4. AI 시스템 관리

### 4.1 프롬프트 관리
- **페이지 파일**: `client/src/pages/prompt-management.tsx`
- **라우트**: `/prompt-management`
- **API 엔드포인트**: 
  - `/api/prompts` - 프롬프트 CRUD
  - `/api/prompts/:id/test` - 프롬프트 테스트
- **서버 파일**: 
  - `server/services/storage.ts`
  - `server/services/openai.ts`
- **관련 스키마**: `prompts`
- **데이터 소스**: 
  - PostgreSQL: `prompts`
  - Azure OpenAI: 프롬프트 실행
- **제공 기능**:
  - 프롬프트 생성/수정/삭제
  - JSON 기반 입출력 스키마 정의
  - 프롬프트 테스트 및 실행
  - Azure OpenAI PTU 연동

### 4.2 API 호출 관리
- **페이지 파일**: `client/src/pages/api-management.tsx`
- **라우트**: `/api-management`
- **API 엔드포인트**: 
  - `/api/api-calls` - API 호출 CRUD
  - `/api/api-calls/:id/test` - API 테스트
  - `/api/api-calls/templates` - 템플릿 조회
- **서버 파일**: 
  - `server/services/storage.ts`
  - `server/services/ai-api.ts`
- **관련 스키마**: `apiCalls`, `aiServiceProviders`, `apiCategories`, `apiTemplates`
- **데이터 소스**: 
  - PostgreSQL: `api_calls`, `ai_service_providers`, `api_categories`, `api_templates`
- **제공 기능**:
  - API 호출 설정 생성/관리
  - 요청/응답 스키마 정의
  - API 테스트 및 검증
  - 템플릿 기반 빠른 설정

### 4.3 프롬프트 빌더
- **페이지 파일**: `client/src/pages/prompt-builder.tsx`
- **라우트**: `/prompt-builder`
- **API 엔드포인트**: 
  - `/api/prompts` - 프롬프트 저장
  - `/api/prompt-suggestions` - 자동 완성
- **서버 파일**: 
  - `server/routes/prompt-suggestions.ts`
- **관련 스키마**: `prompts`
- **데이터 소스**: 
  - PostgreSQL: `prompts`
  - Azure OpenAI: 자동 완성
- **제공 기능**:
  - 시각적 프롬프트 편집
  - 변수 및 템플릿 관리
  - 자동 완성 지원

### 4.4 금융 AI 어시스턴트
- **페이지 파일**: `client/src/pages/financial-chatbot.tsx`
- **라우트**: `/financial-chatbot`
- **API 엔드포인트**: 
  - `/api/chat` - 채팅 메시지
- **서버 파일**: 
  - `server/routes/ai-chat.ts`
- **관련 스키마**: `users`, `newsData`, `financialData`
- **데이터 소스**: 
  - PostgreSQL: `users`
  - Azure OpenAI: 채팅
  - RAG: 컨텍스트 검색
- **제공 기능**:
  - 금융 상담 챗봇
  - RAG 기반 컨텍스트 제공
  - 대화 이력 관리

### 4.5 로그 분석
- **페이지 파일**: `client/src/pages/logs-viewer.tsx`
- **라우트**: `/logs`
- **API 엔드포인트**: 
  - `/api/logs` - 로그 조회
- **서버 파일**: 
  - `server/routes/error-logs.ts`
- **관련 스키마**: 파일 시스템 로그
- **데이터 소스**: 
  - 파일 시스템: `logs/*.log`
- **제공 기능**:
  - 애플리케이션 로그 조회
  - 필터링 및 검색
  - 로그 레벨별 필터

### 4.6 감사 로그 관리
- **페이지 파일**: `client/src/pages/audit-log-management.tsx`
- **라우트**: `/audit-log-management`
- **API 엔드포인트**: 
  - `/api/aud农历-logs` - 감사 로그 조회
  - `/api/security-events` - 보안 이벤트
  - `/api/data-access-logs` - 데이터 접근 로그
- **서버 파일**: 
  - `server/routes/audit-logs.ts`
  - `server/routes/audit-logs-simple.ts`
- **관련 스키마**: `auditLogs` (예정), `securityEvents`, `dataAccessLogs`
- **데이터 소스**: 
  - PostgreSQL: 감사 로그 테이블
- **제공 기능**:
  - 사용자 활동 감사
  - 보안 이벤트 모니터링
  - 데이터 접근 이력 추적

### 4.7 Azure 서비스 설정
- **페이지 파일**: `client/src/pages/azure-config.tsx`
- **라우트**: `/azure-config`
- **API 엔드포인트**: 
  - `/api/azure-config` - 설정 CRUD
  - `/api/azure-config/test` - 연결 테스트
- **서버 파일**: 
  - `server/services/azure-config.ts`
  - `server/services/azure-postgresql.ts`
  - `server/services/azure-search.ts`
  - `server/services/azure-cosmosdb-gremlin.ts`
- **관련 스키마**: `azureConfigs`
- **데이터 소스**: 
  - PostgreSQL: `azure_configs`
  - Azure 서비스 연결 테스트
- **제공 기능**:
  - Azure 서비스 연결 설정
  - PostgreSQL, Databricks, AI Search, CosmosDB 설정
  - 연결 테스트 및 검증

### 4.8 OpenAI 프로바이더
- **페이지 파일**: `client/src/pages/openai-provider.tsx`
- **라우트**: `/openai-provider`
- **API 엔드포인트**: 
  - `/api/openai/config` - 설정 관리
- **서버 파일**: 
  - `server/services/openai.ts`
- **관련 스키마**: `aiServiceProviders`
- **데이터 소스**: 
  - PostgreSQL: `ai_service_providers`
  - Azure OpenAI: 연결
- **제공 기능**:
  - OpenAI 프로바이더 설정
  - 엔드포인트 및 키 관리

### 4.9 시스템 통합 테스트
- **페이지 파일**: `client/src/pages/system-test-dashboard.tsx`
- **라우트**: `/system-test`
- **API 엔드포인트**: 
  - `/api/system/status` - 시스템 상태
  - `/api/system/test` - 통합 테스트
- **서버 파일**: 
  - `server/services/azure-environment-validator.ts`
- **관련 스키마**: 없음 (시스템 정보만)
- **데이터 소스**: 
  - Azure 서비스 연결 상태
- **제공 기능**:
  - 전체 시스템 상태 확인
  - Azure 서비스 연결 테스트
  - 통합 테스트 실행

### 4.10 단위 테스트
- **페이지 파일**: `client/src/pages/unit-testing.tsx`
- **라우트**: `/unit-testing`
- **API 엔드포인트**: 
  - `/api/test/prompts` - 프롬프트 테스트
  - `/api/test/api-calls` - API 호출 테스트
- **서버 파일**: 
  - `server/services/storage.ts`
  - `server/services/ai-api.ts`
- **관련 스키마**: `prompts`, `apiCalls`
- **데이터 소스**: 
  - PostgreSQL: `prompts`, `api_calls`
- **제공 기능**:
  - 프롬프트 단위 테스트
  - API 호출 단위 테스트
  - 테스트 결과 저장

### 4.11 AI시황생성테스트
- **페이지 파일**: `client/src/pages/AIMarketAnalysis.tsx`
- **라우트**: `/ai-market-analysis`
- **API 엔드포인트**: 
  - `/api/ai-market-analysis/execute` - 시황 생성 실행 cancel
  - `/api/ai-market-analysis/status` - 실행 상태
- **서버 파일**: 
  - `server/routes/ai-market-analysis.ts`
  - `server/services/ai-market-analysis.ts`
  - `server/services/ai-market-analysis-workflow.ts`
- **관련 스키마**: `marketAnalysis`, `macroAnalysis`, `workflows`, `workflowExecutions`
- **데이터 소스**: 
  - PostgreSQL: `market_analysis`, `macro_analysis`, `workflows`, `workflow_executions`
  - Azure OpenAI: 시황 생성
- **제공 기능**:
  - AI 기반 시황 자동 생성
  - 워크플로우 기반 처리
  - 실행 상태 모니터링

---

## 5. 분석 & 리포팅

### 5.1 모닝브리핑
- **페이지 파일**: `client/src/pages/morning-briefing.tsx`
- **라우트**: `/morning-briefing`
- **API 엔드포인트**: 
  - `/api/morning-briefing` - 브리핑 조회/생성
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `morningBriefing`, `newsData`, `financialData`
- **데이터 소스**: 
  - PostgreSQL: `morning_briefing`, `news_data`, `financial_data`
- **제공 기능**:
  - 모닝 브리핑 자동 생성
  - 주요 뉴스 및 지표 요약
  - 개인화된 브리핑 الف

### 5.2 매크로시황
- **페이지 파일**: `client/src/pages/macro-analysis.tsx`
- **라우트**: `/macro-analysis`
- **API 엔드포인트**: 
  - `/api/macro-analysis` - 매크로 분석 조회/생성
- **서버 파일**: 
  - `server/services/storage.ts`
  - `server/services/ai-market-analysis-workflow.ts`
- **관련 스키마**: `macroAnalysis`, `macroWorkflowTemplates`, `marketAnalysis`
- **데이터 소스**: 
  - PostgreSQL: `macro_analysis`, `macro_workflow_templates`, `market_analysis`
- **제공 기능**:
  - 매크로 시황 자동 생성
  - 다양한 분석 스트림 통합
  - 템플릿 기반 분석

### 5.3 인과시황
- **페이지 파일**: `client/src/pages/causal-analysis.tsx`
- **라우트**: `/causal-analysis`
- **API 엔드포인트**: 
  - `/api/causal-analysis` - 인과 분석 조회/생성
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `causalAnalysis`, `majorEvents`, `majorEventsRelatedNews`
- **데이터 소스**: 
  - PostgreSQL: `causal_analysis`, `major_events`, `major_events_related_news`
- **제공 기능**:
  - 시장 움직임 인과 분석
  - 주요 이벤트 추적
  - 뉴스 기반 인과 관계 분석

### 5.4 레이아웃 편집기
- **페이지 파일**: `client/src/pages/layout-editor.tsx`
- **라우트**: `/layout-editor`
- **API 엔드포인트**: 
  - `/api/layout-templates` - 템플릿 CRUD
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `layoutTemplates`
- **데이터 소스**: 
  - PostgreSQL: `layout_templates`
- **제공 기능**:
  - 리포트 레이아웃 편집
  - 템플릿 생성 및 관리
  - 브랜드 템플릿 적용

### 5.5 MTS 테마분석
- **페이지 파일**: `client/src/pages/mts.tsx`
- **라우트**: `/mts`
- **API 엔드포인트**: 
  - `/api/mts/themes` - 테마 분석
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `themes`, `infoStockThemes`, `newsData`
- **데이터 소스**: 
  - PostgreSQL: `themes`, `infostock_themes`, `news_data`
- **제공 기능**:
  - 모바일 테마 분석
  - 테마별 종목 분석
  - 실시간 테마 추적

---

## 6. 개인화 서비스

### 6.1 개인화 대시보드
- **페이지 파일**: `client/src/pages/personal-dashboard.tsx`
- **라우트**: `/personal-dashboard`
- **API 엔드포인트**: 
  - `/api/personal/dashboard` - 개인화 데이터
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `userBalances`, `userTags`, `userWatchlist`, `userTrades`
- **데이터 소스**: 
  - PostgreSQL: `user_balances`, `user_tags`, `user_watchlist`, `user_trades`
- **제공 기능**:
  - 개인화된 대시보드
  - 사용자별 관심 정보 표시
  - 맞춤형 추천

### 6.2 보유종목 관리
- **랑지 파일**: `client/src/pages/my-holdings.tsx`
- **라우트**: `/my-holdings`
- **API 엔드포인트**: 
  - `/api/user/holdings` - 보유종목 CRUD
  - `/api/user/balances` - 잔고 조회
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `userBalances`, `balanceInsights`
- **데이터 소스**: 
  - PostgreSQL: `user_balances`, `balance_insights`
- **제공 기능**:
  - 보유종목 등록/수정/삭제
  - 잔고 관리
  - 수익률 분석

### 6.3 매매이력 분석
- **페이지 파일**: `client/src/pages/my-trades.tsx`
- **라우트**: `/my-trades`
- **API 엔드포인트**: 
  - `/api/user/trades` - 매매이력 CRUD
  - `/api/user/trade-insights` - 인사이트
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `userTrades`, `tradeInsights`
- **데이터 소스**: 
  - PostgreSQL: `user_trades`, `trade_insights`
- **제공 기능**:
  - 매매이력 입력 및 관리
  - 거래 분석 및 인사이트
  - 수익률 추적

### 6.4 관심종목 관리
- **페이지 파일**: `client/src/pages/my-watchlist.tsx`
- **라우트**: `/my-watchlist`
- **API 엔드포인트**: 
  - `/api/user/watchlist` - 관심종목 CRUD
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `userWatchlist`
- **데이터 소스**: 
  - PostgreSQL: `user_watchlist`
- **제공 기능**:
  - 관심종목 추가/삭제
  - 실시간 가격 모니터링
  - 알림 설정

### 6.5 개인화 설정
- **페이지 파일**: `client/src/pages/personalization-settings.tsx`
- **라우트**: `/personalization-settings`
- **API 엔드포인트**: 
  - `/api/user/settings` - 개인화 설정
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `userTags`, `segments`, `rules`
- **데이터 소스**: 
  - PostgreSQL: `user_tags`, `segments`, `rules`
- **제공 기능**:
  - 개인화 설정 관리
  - 관심사 태그 설정
  - 알림 설정

---

## 7. 품질 관리

### 7.1 품질 평가
- **페이지 파일**: `client/src/pages/quality-dashboard.tsx`
- **라우트**: `/quality-dashboard`
- **API 엔드포인트**: 
  - `/api/quality/metrics` - 품질 메트릭
  - `/api/quality/feedback` - 피드백
- **서버 파일**: 
  - `server/services/storage.ts`
- **관련 스키마**: `reportQualityMetrics`, `feedbackLog`, `qualityImprovements`
- **데이터 소스**: 
  - PostgreSQL: `report_quality_metrics`, `feedback_log`, `quality_improvements`
- **제공 기능**:
  - 리포트 품질 평가
  - 사용자 피드백 수집
  - 품질 개선 추적

### 7.2 ETF 투자가이드
- **페이지 파일**: `client/src/pages/etf-guide.tsx`
- **라우트**: `/etf-guide`
- **API 엔드포인트**: 
  - `/api/etf/products` - ETF 상품 조회
  - `/api/etf/recommendations` - 추천
  - `/api/etf/chat` - 채팅
- **서버 파일**: 
  - `server/services/storage.ts`
  - `server/services/recommend.ts`
  - `server/services/guardrails.ts`
- **관련 스키마**: `etfProducts`, `etfMetrics`, `userRiskProfile`, `etfChatSessions`, `etfChatMessages`, `etfRecommendationSettings`
- **데이터 소스**: 
  - PostgreSQL: `etf_products`, `etf_metrics`, `user_risk_profile`, `etf_chat_sessions`, `etf_chat_messages`, `etf_recommendation_settings`
  - Azure OpenAI: ETF 상담
- **제공 기능**:
  - ETF 상품 검색 및 비교
  - 개인 위험 프로필 기반 추천
  - AI 기반 ETF 상담 챗봇
  - Guardrail 정책 기반 안전장치

---

## 데이터 소스 요약

### PostgreSQL 테이블
- **워크플로우**: `workflows`, `workflow_nodes`, `workflow_executions`, `workflow_node_results`, `schedules`
- **AI 관리**: `prompts`, `api_calls`, `ai_service_providers`, `api_categories`, `api_templates`
- **시장 데이터**: `financial_data`, `news_data`, `themes`, `market_analysis`, `macro_analysis`
- **개인화**: `user_balances`, `user_trades`, `user_watchlist`, `user_tags`, `segments`
- **ETF**: `etf_products`, `etf_metrics`, `user_risk_profile`, `etf_chat_sessions`
- **품질**: `report_quality_metrics`, `feedback_log`, `quality_improvements`
- **시스템**: `users`, `azure_configs`, `dictionaries`, `dictionary_entries`

### Azure 서비스
- **Azure PostgreSQL**: 메인 데이터베이스
- **Azure OpenAI**: AI 서비스 (프롬프트, 채팅, 분석)
- **Azure AI Search**: 벡터 검색 (RAG)
- **Azure Databricks**: 데이터 처리
- **Azure CosmosDB**: 그래프 데이터

---

## 주요 서비스 파일

### 서버 라우트
- `server/routes.ts` - 메인 라우트 등록
- `server/routes/workflow.ts` - 워크플로우 라우트
- `server/routes/ai-chat.ts` - AI 채팅 라우트
- `server/routes/ai-market-analysis.ts` - 시황 생성 라우트
- `server/routes/audit-logs.ts` - 감사 로그 라우트

### 서버 서비스
- `server/services/storage.ts` - 데이터 저장소 인터페이스
- `server/services/workflow-engine.ts` - 워크플로우 엔진
- `server/services/scheduler.ts` - 스케줄러
- `server/services/openai.ts` - OpenAI 서비스
- `server/services/rag.ts` - RAG 검색
- `server/services/azure-config.ts` - Azure 설정 관리

---

---

## 샘플 데이터 생성

배포 시 샘플 데이터를 자동으로 생성할 수 있습니다:

1. **환경변수 설정**: `INIT_SAMPLE_DATA=true`
2. **수동 실행**: `node scripts/deploy-init-sample-data.js`
3. **SQL 직접 실행**: `psql $DATABASE_URL -f database/init-sample-data.sql`

자세한 내용은 `DEPLOYMENT_SAMPLE_DATA.md` 파일을 참고하세요.

---

마지막 업데이트: 2025-10-30

