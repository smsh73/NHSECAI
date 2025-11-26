# AITradeConsole 메뉴별 기능 및 데이터소스 분석 문서

## 개요
이 문서는 AITradeConsole 애플리케이션의 좌측 메뉴 구성에 따른 각 기능별 소스코드, 데이터소스, Azure 서비스 사용 현황을 분석한 결과입니다.

## 주요 변경사항 (최신 버전 - 2025-01)

- **Azure 환경 전용**: SQLite 완전 제거, PostgreSQL 전용
- **환경변수 기반**: Azure App Service Application Settings 사용
- **메뉴 확장**: 34개 메뉴로 확장 (분석 & 리포팅, AI 시스템 관리 메뉴 추가)
- **테이블 수**: 72개 테이블 (실제 구현)

---

## 홈 & 대시보드

### 1. 시장 현황 (`/`)
**기능**: 실시간 시장 데이터 및 뉴스 모니터링

**소스코드**:
- `client/src/pages/home.tsx` - 시장 현황 표시

**데이터소스**:
- ✅ **PostgreSQL**: 뉴스 데이터, 시장 데이터
- ✅ **Databricks**: 시장 데이터 분석 (스케줄러를 통해)
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `GET /api/market-analysis` - 시장 분석 데이터
- `GET /api/system/status` - 시스템 상태

**접근 권한**: user, analyst, ops, admin

### 2. 통합 대시보드 (`/dashboard`)
**기능**: 전체 시스템 현황 및 주요 지표 모니터링

**소스코드**:
- `client/src/pages/dashboard.tsx` - 메인 대시보드 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 시스템 상태, 사용자 데이터, 설정 정보
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `GET /api/system/status` - 시스템 상태 조회
- `GET /api/prompts` - 프롬프트 목록
- `GET /api/api-calls` - API 호출 목록
- `GET /api/workflows` - 워크플로우 목록
- `GET /api/workflows/stats` - 워크플로우 통계

**접근 권한**: user, analyst, ops, admin

---

## 워크플로우 관리

### 1. 워크플로우 편집기 (`/workflow-editor/:id?`)
**기능**: 워크플로우 생성, 편집, 시각화

**소스코드**:
- `client/src/pages/workflow-editor.tsx` - 워크플로우 편집기 페이지
- `client/src/components/workflow/workflow-canvas.tsx` - 워크플로우 캔버스
- `server/services/workflow-engine.ts` - 워크플로우 실행 엔진
- `server/services/workflow-execution-engine.ts` - 워크플로우 실행 서비스

**데이터소스**:
- ✅ **PostgreSQL**: 워크플로우 정의, 세션 데이터, 실행 이력
- ✅ **Databricks**: SQL 실행 노드에서 사용
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 프롬프트 노드에서 사용

**API 엔드포인트**:
- `GET /api/workflows` - 워크플로우 목록
- `GET /api/workflows/:id` - 워크플로우 상세
- `POST /api/workflows` - 워크플로우 생성/수정
- `PUT /api/workflows/:id` - 워크플로우 수정
- `DELETE /api/workflows/:id` - 워크플로우 삭제
- `POST /api/workflows/:id/execute` - 워크플로우 실행
- `GET /api/workflow/status` - 워크플로우 실행 상태

**접근 권한**: analyst, ops, admin

### 2. 실행 스케줄러 (`/scheduler`)
**기능**: 워크플로우 자동 실행 스케줄 관리

**소스코드**:
- `client/src/pages/scheduler.tsx` - 스케줄러 관리 페이지
- `server/services/scheduler.ts` - 스케줄러 서비스

**데이터소스**:
- ✅ **PostgreSQL**: 스케줄 정보, 실행 이력
- ✅ **Databricks**: 정기 데이터 수집 작업
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `GET /api/schedules` - 스케줄 목록
- `POST /api/schedules` - 스케줄 생성
- `GET /api/executions` - 실행 이력

**접근 권한**: ops, admin

### 3. 워크플로우 모니터 (`/workflow-monitor`)
**기능**: 워크플로우 실행 상태 모니터링

**소스코드**:
- `client/src/pages/workflow-monitor.tsx` - 모니터링 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 실행 상태, 로그 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: ops, admin

---

## 데이터 관리

### 1. 스키마 브라우저 (`/schema-browser`)
**기능**: 데이터베이스 스키마 탐색 및 관리

**소스코드**:
- `client/src/pages/schema-browser.tsx` - 스키마 브라우저 페이지
- `server/services/databricks-schema.ts` - Databricks 스키마 서비스

**데이터소스**:
- ✅ **PostgreSQL**: 스키마 정보 조회
- ✅ **Databricks**: Databricks 스키마 정보 조회
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: admin

### 2. NL to SQL 엔진 (`/nl2sql-engine`)
**기능**: 자연어를 SQL로 변환

**소스코드**:
- `client/src/pages/nl2sql-engine.tsx` - NL2SQL 엔진 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 스키마 정보, 쿼리 결과
- ✅ **Databricks**: SQL 실행
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 자연어 처리 및 SQL 생성

**접근 권한**: analyst, ops, admin

### 3. 스키마 의미 매핑 (`/schema-mapper`)
**기능**: 데이터베이스 스키마의 의미적 매핑

**소스코드**:
- `client/src/pages/schema-mapper.tsx` - 스키마 매핑 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 스키마 메타데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: analyst, ops, admin

### 4. Dictionary 관리 (`/dictionary-manager`)
**기능**: 데이터베이스 용어 사전 관리

**소스코드**:
- `client/src/pages/dictionary-manager.tsx` - Dictionary 관리 페이지
- `server/routes.ts` - Dictionary API

**데이터소스**:
- ✅ **PostgreSQL**: Dictionary 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `GET /api/dictionaries` - Dictionary 목록
- `GET /api/dictionaries/default/entries` - Dictionary 항목 조회
- `POST /api/dictionaries/default/entries` - Dictionary 항목 생성
- `PUT /api/dictionaries/entries/:entryId` - Dictionary 항목 수정
- `DELETE /api/dictionaries/entries/:entryId` - Dictionary 항목 삭제
- `GET /api/schema-info` - 스키마 정보 조회

**접근 권한**: analyst, ops, admin

### 5. 테마 클러스터 관리 (`/theme-cluster-management`)
**기능**: 뉴스 테마 클러스터링 관리

**소스코드**:
- `client/src/pages/theme-cluster-management.tsx` - 테마 클러스터 관리 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 테마 클러스터 데이터
- ✅ **Databricks**: 클러스터링 분석
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 텍스트 분석 및 클러스터링

**API 엔드포인트**:
- `GET /api/themes` - 테마 목록
- `POST /api/themes` - 테마 생성
- `GET /api/themes/:themeId` - 테마 상세
- `GET /api/themes/:themeId/news` - 테마별 뉴스

**접근 권한**: analyst, ops, admin

### 6. 프롬프트 빌더 (`/prompt-builder`)
**기능**: AI 프롬프트 시각적 빌더

**소스코드**:
- `client/src/pages/prompt-builder.tsx` - 프롬프트 빌더 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 프롬프트 정의
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 프롬프트 실행

**API 엔드포인트**:
- `GET /api/prompt-builder/schema-sources` - 스키마 소스 목록
- `GET /api/prompts` - 프롬프트 목록
- `POST /api/prompts` - 프롬프트 생성
- `POST /api/prompts/test` - 프롬프트 테스트

**접근 권한**: analyst, ops, admin

### 7. 금융 챗봇 (`/financial-chatbot`)
**기능**: RAG 기반 금융 정보 챗봇

**소스코드**:
- `client/src/pages/financial-chatbot.tsx` - 금융 챗봇 페이지
- `server/services/rag.ts` - RAG 서비스
- `server/services/ragService.ts` - RAG 서비스 구현

**데이터소스**:
- ✅ **PostgreSQL**: 문서 데이터 저장
- ✅ **Databricks**: 데이터 분석 및 처리
- ❌ **CosmosDB**: 직접 사용하지 않음
- ✅ **Azure AI Search**: 벡터 검색
- ✅ **OpenAI**: 임베딩 생성 및 답변 생성

**API 엔드포인트**:
- `POST /api/search` - 검색 실행
- `POST /api/search/analysis` - 검색 결과 분석
- `POST /api/ai-chat` - 챗봇 대화

**접근 권한**: user, analyst, ops, admin

---

## AI 시스템 관리

### 1. 프롬프트 관리 (`/prompt-management`)
**기능**: AI 프롬프트 생성, 편집, 테스트

**소스코드**:
- `client/src/pages/prompt-management.tsx` - 프롬프트 관리 페이지
- `server/services/json-prompt-execution-engine.ts` - JSON 프롬프트 실행 엔진
- `server/routes.ts` - 프롬프트 API

**데이터소스**:
- ✅ **PostgreSQL**: 프롬프트 정의, 실행 이력
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 프롬프트 실행

**API 엔드포인트**:
- `GET /api/prompts` - 프롬프트 목록
- `GET /api/prompts/:id` - 프롬프트 상세
- `POST /api/prompts` - 프롬프트 생성/수정
- `PUT /api/prompts/:id` - 프롬프트 수정
- `DELETE /api/prompts/:id` - 프롬프트 삭제
- `POST /api/prompts/test` - 프롬프트 테스트
- `POST /api/prompts/process` - 프롬프트 처리
- `POST /api/prompts/validate` - 프롬프트 검증

**접근 권한**: admin

### 2. API 관리 (`/api-management`)
**기능**: 외부 API 호출 관리 및 테스트

**소스코드**:
- `client/src/pages/api-management.tsx` - API 관리 페이지
- `server/services/api-call-engine.ts` - API 호출 엔진
- `server/routes.ts` - API 관리 API

**데이터소스**:
- ✅ **PostgreSQL**: API 정의, 호출 이력
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `GET /api/api-calls` - API 목록
- `GET /api/api-calls/:id` - API 상세
- `POST /api/api-calls` - API 생성/수정
- `PUT /api/api-calls/:id` - API 수정
- `DELETE /api/api-calls/:id` - API 삭제
- `POST /api/api-calls/:id/test` - API 테스트
- `GET /api/api-calls/enhanced` - 향상된 API 목록
- `GET /api/api-analytics` - API 분석

**접근 권한**: admin

### 3. Azure 설정 (`/azure-config`)
**기능**: Azure 서비스 연결 설정 및 관리

**소스코드**:
- `client/src/pages/azure-config.tsx` - Azure 설정 페이지
- `server/services/azure-config.ts` - Azure 설정 서비스
- `server/services/azure-environment-validator.ts` - Azure 환경 검증

**데이터소스**:
- ✅ **PostgreSQL**: 설정 정보 저장
- ✅ **Databricks**: 연결 테스트
- ✅ **CosmosDB**: 연결 테스트
- ✅ **Azure AI Search**: 연결 테스트
- ✅ **OpenAI**: 연결 테스트

**API 엔드포인트**:
- `GET /api/azure/config/summary` - Azure 환경 요약
- `GET /api/azure/config/validate` - Azure 환경 검증

**접근 권한**: admin

### 4. 로그 뷰어 (`/logs`)
**기능**: 시스템 로그 조회 및 관리

**소스코드**:
- `client/src/pages/log-viewer.tsx` - 로그 뷰어 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 로그 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `GET /api/error-logs` - 에러 로그 조회

**접근 권한**: ops, admin

### 5. 감사 로그 관리 (`/audit-log-management`)
**기능**: 시스템 감사 로그 조회 및 관리

**소스코드**:
- `client/src/pages/audit-log-management.tsx` - 감사 로그 관리 페이지
- `server/routes/audit-logs.ts` - 감사 로그 API

**데이터소스**:
- ✅ **PostgreSQL**: 감사 로그 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `GET /api/audit-logs` - 감사 로그 조회

**접근 권한**: admin

### 6. 시스템 테스트 (`/system-test`)
**기능**: 시스템 통합 테스트 대시보드

**소스코드**:
- `client/src/pages/system-test-dashboard.tsx` - 시스템 테스트 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 테스트 결과 저장
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: admin

### 7. 유닛 테스트 (`/unit-testing`)
**기능**: 유닛 테스트 실행 및 관리

**소스코드**:
- `client/src/pages/unit-testing.tsx` - 유닛 테스트 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 테스트 결과 저장
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: admin

### 8. 서비스 테스트 (`/service-test`)
**기능**: 외부 서비스 연결 테스트

**소스코드**:
- `client/src/pages/service-test.tsx` - 서비스 테스트 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 테스트 결과 저장
- ✅ **Databricks**: 연결 테스트
- ✅ **CosmosDB**: 연결 테스트
- ✅ **Azure AI Search**: 연결 테스트
- ✅ **OpenAI**: 연결 테스트

**접근 권한**: admin

### 9. OpenAI 제공자 (`/openai-provider`)
**기능**: OpenAI 제공자 설정 및 관리

**소스코드**:
- `client/src/pages/openai-provider.tsx` - OpenAI 제공자 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 제공자 설정 저장
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 연결 테스트

**API 엔드포인트**:
- `GET /api/ai-providers` - AI 제공자 목록
- `POST /api/ai-providers` - AI 제공자 생성
- `PUT /api/ai-providers/:id` - AI 제공자 수정

**접근 권한**: admin

---

## 분석 & 리포팅

### 1. AI 시황 생성 (`/ai-market-analysis`)
**기능**: AI 기반 시장 분석 및 시황 생성

**소스코드**:
- `client/src/pages/AIMarketAnalysis.tsx` - AI 시황 분석 페이지
- `server/services/ai-market-analysis.ts` - AI 시장 분석 서비스
- `server/services/ai-market-analysis-workflow.ts` - AI 시장 분석 워크플로우

**데이터소스**:
- ✅ **PostgreSQL**: 분석 결과 저장
- ✅ **Databricks**: 데이터 분석 및 처리
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 텍스트 분석 및 시황 생성

**API 엔드포인트**:
- `POST /api/ai-market-analysis/execute` - AI 시황 생성 실행
- `GET /api/ai-market-analysis-status` - 분석 상태 조회

**접근 권한**: analyst, ops, admin

### 2. 모닝 브리핑 (`/morning-briefing`)
**기능**: 일일 모닝 브리핑 생성

**소스코드**:
- `client/src/pages/morning-briefing.tsx` - 모닝 브리핑 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 브리핑 데이터 저장
- ✅ **Databricks**: 데이터 수집 및 분석
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 브리핑 텍스트 생성

**API 엔드포인트**:
- `GET /api/morning-briefing` - 브리핑 목록
- `GET /api/morning-briefing/:id` - 브리핑 상세
- `GET /api/morning-briefing/by-date/:date` - 날짜별 브리핑
- `POST /api/morning-briefing` - 브리핑 생성
- `POST /api/morning-briefing/generate` - 브리핑 생성 실행

**접근 권한**: user, analyst, ops, admin

### 3. 거시경제 분석 (`/macro-analysis`)
**기능**: 거시경제 데이터 분석

**소스코드**:
- `client/src/pages/macro-analysis.tsx` - 거시경제 분석 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 분석 결과 저장
- ✅ **Databricks**: 거시경제 데이터 분석
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 분석 리포트 생성

**API 엔드포인트**:
- `GET /api/macro-analysis` - 분석 목록
- `GET /api/macro-analysis/:id` - 분석 상세
- `POST /api/macro-analysis` - 분석 생성
- `POST /api/macro-analysis/generate` - 분석 생성 실행

**접근 권한**: analyst, ops, admin

### 4. 인과관계 분석 (`/causal-analysis`)
**기능**: 시장 이벤트의 인과관계 분석

**소스코드**:
- `client/src/pages/causal-analysis.tsx` - 인과관계 분석 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 분석 결과 저장
- ✅ **Databricks**: 인과관계 데이터 분석
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 인과관계 분석 리포트 생성

**API 엔드포인트**:
- `GET /api/causal-analysis` - 분석 목록
- `GET /api/causal-analysis/:id` - 분석 상세
- `POST /api/causal-analysis` - 분석 생성
- `POST /api/causal-analysis/generate` - 분석 생성 실행
- `GET /api/causal-analysis/monitor` - 분석 모니터링

**접근 권한**: analyst, ops, admin

### 5. 레이아웃 에디터 (`/layout-editor`)
**기능**: 리포트 레이아웃 편집

**소스코드**:
- `client/src/pages/layout-editor.tsx` - 레이아웃 에디터 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 레이아웃 템플릿 저장
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `GET /api/layout-templates` - 레이아웃 템플릿 목록
- `GET /api/layout-templates/:id` - 레이아웃 템플릿 상세
- `POST /api/layout-templates` - 레이아웃 템플릿 생성
- `PUT /api/layout-templates/:id` - 레이아웃 템플릿 수정
- `DELETE /api/layout-templates/:id` - 레이아웃 템플릿 삭제

**접근 권한**: analyst, ops, admin

### 6. MTS (`/mts`)
**기능**: Market Timing System

**소스코드**:
- `client/src/pages/mts.tsx` - MTS 페이지

**데이터소스**:
- ✅ **PostgreSQL**: MTS 데이터 저장
- ✅ **Databricks**: 시장 타이밍 분석
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: user, analyst, ops, admin

---

## 개인화 서비스

### 1. 개인화 대시보드 (`/personal-dashboard`)
**기능**: 사용자별 맞춤 대시보드

**소스코드**:
- `client/src/pages/personal-dashboard.tsx` - 개인화 대시보드 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 사용자 설정, 개인화 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: user, analyst, ops, admin

### 2. 보유종목 관리 (`/my-holdings`)
**기능**: 사용자 보유 종목 관리

**소스코드**:
- `client/src/pages/my-holdings.tsx` - 보유종목 관리 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 보유종목 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: user, analyst, ops, admin

### 3. 매매이력 분석 (`/my-trades`)
**기능**: 사용자 매매 이력 분석

**소스코드**:
- `client/src/pages/my-trades.tsx` - 매매이력 분석 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 매매 이력 데이터
- ✅ **Databricks**: 매매 패턴 분석
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: user, analyst, ops, admin

### 4. 관심종목 관리 (`/my-watchlist`)
**기능**: 사용자 관심 종목 관리

**소스코드**:
- `client/src/pages/my-watchlist.tsx` - 관심종목 관리 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 관심종목 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: user, analyst, ops, admin

### 5. 개인화 설정 (`/personalization-settings`)
**기능**: 사용자 개인화 설정 관리

**소스코드**:
- `client/src/pages/personalization-settings.tsx` - 개인화 설정 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 사용자 설정 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: user, analyst, ops, admin

### 6. ETF 투자가이드 (`/etf-guide`)
**기능**: ETF 투자 가이드 제공

**소스코드**:
- `client/src/pages/etf-guide.tsx` - ETF 가이드 페이지

**데이터소스**:
- ✅ **PostgreSQL**: ETF 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**접근 권한**: user, analyst, ops, admin

### 7. ETF 관리 설정 (`/etf-admin-settings`)
**기능**: ETF 관리자 설정

**소스코드**:
- `client/src/pages/etf-admin-settings.tsx` - ETF 관리 설정 페이지

**데이터소스**:
- ✅ **PostgreSQL**: ETF 관리 설정
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `GET /api/etf-admin/bot-config` - ETF 봇 설정 조회
- `PUT /api/etf-admin/bot-config/:configId` - ETF 봇 설정 수정

**접근 권한**: admin

---

## 품질 관리

### 1. 품질 평가 (`/quality-dashboard`)
**기능**: 시스템 품질 지표 모니터링

**소스코드**:
- `client/src/pages/quality-dashboard.tsx` - 품질 평가 페이지
- `server/services/quality-evaluator.ts` - 품질 평가 서비스

**데이터소스**:
- ✅ **PostgreSQL**: 품질 지표 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**API 엔드포인트**:
- `POST /api/quality/evaluate` - 품질 평가 실행
- `GET /api/quality/metrics/:reportId` - 리포트별 품질 지표
- `GET /api/quality/metrics` - 전체 품질 지표

**접근 권한**: ops, admin

---

## 데이터소스 사용 현황 요약

### PostgreSQL 사용 현황
- **사용 메뉴**: 모든 메뉴 (100%)
- **주요 용도**: 
  - 사용자 데이터 및 설정
  - 워크플로우 정의 및 실행 이력
  - 프롬프트 및 API 정의
  - 감사 로그 및 보안 이벤트
  - 개인화 데이터
  - 분석 결과 저장

### Databricks 사용 현황
- **사용 메뉴**: 워크플로우 편집기, 실행 스케줄러, 스키마 브라우저, NL2SQL 엔진, 테마 클러스터 관리, 금융 챗봇, AI 시황 생성, 모닝 브리핑, 거시경제 분석, 인과관계 분석, MTS, 매매이력 분석, 서비스 테스트
- **주요 용도**:
  - 대용량 데이터 분석
  - SQL 쿼리 실행
  - 머신러닝 모델 실행
  - 정기 데이터 수집 작업

### CosmosDB 사용 현황
- **사용 메뉴**: Azure 설정, 서비스 테스트 (연결 테스트만)
- **주요 용도**: 연결 테스트 및 검증

### Azure AI Search 사용 현황
- **사용 메뉴**: 금융 챗봇, Azure 설정, 서비스 테스트
- **주요 용도**:
  - 벡터 검색
  - 문서 검색
  - 하이브리드 검색
  - 연결 테스트

### OpenAI 사용 현황
- **사용 메뉴**: 워크플로우 편집기, NL2SQL 엔진, 테마 클러스터 관리, 프롬프트 빌더, 금융 챗봇, 프롬프트 관리, AI 시황 생성, 모닝 브리핑, 거시경제 분석, 인과관계 분석, Azure 설정, 서비스 테스트, OpenAI 제공자
- **주요 용도**:
  - 자연어 처리
  - 텍스트 생성
  - 임베딩 생성
  - SQL 쿼리 생성
  - 시황 분석
  - 프롬프트 실행

---

## 핵심 서비스 아키텍처

### 워크플로우 엔진
- **파일**: `server/services/workflow-execution-engine.ts`
- **기능**: 워크플로우 세션 관리, 노드 실행, 데이터 흐름 제어
- **데이터소스**: PostgreSQL (세션 데이터), Databricks (SQL 실행), OpenAI (프롬프트 실행)

### JSON 프롬프트 실행 엔진
- **파일**: `server/services/json-prompt-execution-engine.ts`
- **기능**: JSON 스키마 검증, 변수 해석, OpenAI 호출
- **데이터소스**: PostgreSQL (프롬프트 정의), OpenAI (실행)

### API 호출 엔진
- **파일**: `server/services/api-call-engine.ts`
- **기능**: HTTP API 호출, 파라미터 처리, 응답 검증
- **데이터소스**: PostgreSQL (API 정의)

### 스케줄러 서비스
- **파일**: `server/services/scheduler.ts`
- **기능**: 정기 작업 실행, 데이터 수집
- **데이터소스**: PostgreSQL (스케줄 정보), Databricks (데이터 처리)

### RAG 서비스
- **파일**: `server/services/rag.ts`, `server/services/ragService.ts`
- **기능**: 문서 임베딩 생성, 벡터 검색, 하이브리드 검색
- **데이터소스**: PostgreSQL (문서 메타데이터), Azure AI Search (벡터 검색), OpenAI (임베딩 생성)

### AI 시장 분석 서비스
- **파일**: `server/services/ai-market-analysis.ts`, `server/services/ai-market-analysis-workflow.ts`
- **기능**: 시장 데이터 분석, AI 기반 시황 생성
- **데이터소스**: PostgreSQL (분석 결과), Databricks (데이터 분석), OpenAI (시황 생성)

---

## 결론

AITradeConsole은 PostgreSQL을 중심으로 한 통합 데이터 플랫폼으로, 각 메뉴별로 특화된 기능을 제공하면서도 Azure의 다양한 서비스들을 유기적으로 연동하여 사용하고 있습니다. 특히 워크플로우 엔진을 통해 복잡한 데이터 처리 파이프라인을 구성하고, AI 서비스를 활용한 지능형 분석 기능을 제공하는 것이 특징입니다.
