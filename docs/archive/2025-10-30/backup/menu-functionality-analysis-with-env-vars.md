# AITradeConsole 메뉴별 기능, 데이터소스, 환경변수 및 테스트 분석 문서

## 📋 개요
이 문서는 AITradeConsole 애플리케이션의 좌측 메뉴 구성에 따른 각 기능별 소스코드, 데이터소스, Azure 서비스 사용 현황, 환경변수, 그리고 각 메뉴별 테스트 및 검증 결과를 분석한 결과입니다.

---

## 🏠 홈 & 대시보드

### 1. 통합 대시보드 (`/dashboard`)
**기능**: 전체 시스템 현황 및 주요 지표 모니터링

**소스코드**:
- `client/src/pages/home.tsx` - 메인 대시보드 페이지
- `client/src/components/common/hero-section.tsx` - 히어로 섹션
- `client/src/components/common/primary-actions.tsx` - 주요 액션 카드
- `client/src/components/common/recent-analysis.tsx` - 최근 분석 결과
- `client/src/components/common/news-alerts.tsx` - 뉴스 및 알림

**데이터소스**:
- ✅ **PostgreSQL**: 시스템 상태, 사용자 데이터, 설정 정보
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**환경변수** (Azure App Service Application Settings):
- `DATABASE_URL`: PostgreSQL 연결 문자열 (필수)
- `NODE_ENV`: production (Azure 환경)
- `PORT`: 서버 포트 (기본값: 5000)
- `INIT_SAMPLE_DATA`: 샘플 데이터 자동 생성 (true/false, 선택)

**API 엔드포인트**:
- `GET /api/system/status` - 시스템 상태 조회
- `GET /api/prompts` - 프롬프트 목록
- `GET /api/api-calls` - API 호출 목록
- `GET /api/workflows` - 워크플로우 목록

### 2. 시장 현황 (`/`)
**기능**: 실시간 시장 데이터 및 뉴스 모니터링

**소스코드**:
- `client/src/pages/home.tsx` - 시장 현황 표시
- `client/src/components/common/news-alerts.tsx` - 뉴스 알림

**데이터소스**:
- ✅ **PostgreSQL**: 뉴스 데이터, 시장 데이터
- ✅ **Databricks**: 시장 데이터 분석 (스케줄러를 통해)
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로

---

## 🔄 워크플로우 관리

### 1. 워크플로우 편집기 (`/workflow-editor`)
**기능**: 워크플로우 생성, 편집, 시각화

**소스코드**:
- `client/src/pages/workflow-editor.tsx` - 워크플로우 편집기 페이지
- `client/src/components/workflow/WorkflowCanvas.tsx` - 워크플로우 캔버스
- `client/src/components/workflow/NodePalette.tsx` - 노드 팔레트
- `client/src/components/workflow/NodeEditor.tsx` - 노드 편집기
- `server/services/workflow-engine.ts` - 워크플로우 실행 엔진
- `server/services/workflow-execution-engine.ts` - 워크플로우 실행 서비스

**데이터소스**:
- ✅ **PostgreSQL**: 워크플로우 정의, 세션 데이터, 실행 이력
- ✅ **Databricks**: SQL 실행 노드에서 사용
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 프롬프트 노드에서 사용

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API 키
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 엔드포인트
- `AZURE_OPENAI_DEPLOYMENT_NAME`: OpenAI 배포 이름
- `AZURE_OPENAI_API_VERSION`: OpenAI API 버전

**API 엔드포인트**:
- `GET /api/workflows` - 워크플로우 목록
- `POST /api/workflows` - 워크플로우 생성/수정
- `POST /api/workflows/sessions` - 워크플로우 세션 생성
- `POST /api/workflows/sessions/:sessionId/execute` - 워크플로우 실행

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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로

### 3. 워크플로우 모니터 (`/workflow-monitor`)
**기능**: 워크플로우 실행 상태 모니터링

**소스코드**:
- `client/src/pages/workflow-monitor.tsx` - 모니터링 페이지
- `client/src/hooks/useWorkflowStatus.ts` - 워크플로우 상태 훅

**데이터소스**:
- ✅ **PostgreSQL**: 실행 상태, 로그 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

---

## 🗄️ 데이터 관리

### 1. 스키마 브라우저 (`/schema-browser`)
**기능**: 데이터베이스 스키마 탐색 및 관리

**소스코드**:
- `client/src/pages/schema-browser.tsx` - 스키마 브라우저 페이지
- `server/routes.ts` - 스키마 관련 API

**데이터소스**:
- ✅ **PostgreSQL**: 스키마 정보 조회
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

**API 엔드포인트**:
- `GET /api/schema/tables` - 테이블 목록
- `GET /api/schema/columns/:table` - 컬럼 정보

### 2. RAG 검색엔진 (`/`)
**기능**: 검색 기반 정보 검색

**소스코드**:
- `client/src/pages/rag-search.tsx` - RAG 검색 페이지
- `server/services/rag.ts` - RAG 서비스
- `server/services/ragService.ts` - RAG 서비스 구현

**데이터소스**:
- ✅ **PostgreSQL**: 문서 데이터 저장
- ✅ **Databricks**: 데이터 분석 및 처리
- ❌ **CosmosDB**: 직접 사용하지 않음
- ✅ **Azure AI Search**: 벡터 검색
- ✅ **OpenAI**: 임베딩 생성 및 답변 생성

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로
- `AZURE_SEARCH_ENDPOINT`: Azure AI Search 엔드포인트
- `AZURE_SEARCH_API_KEY`: Azure AI Search API 키
- `AZURE_SEARCH_INDEX_NAME`: 검색 인덱스 이름
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API 키
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 엔드포인트
- `AZURE_OPENAI_DEPLOYMENT_NAME`: OpenAI 배포 이름
- `AZURE_OPENAI_API_VERSION`: OpenAI API 버전

### 3. NL to SQL 엔진 (`/nl2sql-engine`)
**기능**: 자연어를 SQL로 변환

**소스코드**:
- `client/src/pages/nl2sql-engine.tsx` - NL2SQL 엔진 페이지
- `server/services/nl2sql.ts` - NL2SQL 서비스

**데이터소스**:
- ✅ **PostgreSQL**: 스키마 정보, 쿼리 결과
- ✅ **Databricks**: SQL 실행
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 자연어 처리 및 SQL 생성

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API 키
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 엔드포인트
- `AZURE_OPENAI_DEPLOYMENT_NAME`: OpenAI 배포 이름
- `AZURE_OPENAI_API_VERSION`: OpenAI API 버전

### 4. 스키마 의미 매핑 (`/schema-mapper`)
**기능**: 데이터베이스 스키마의 의미적 매핑

**소스코드**:
- `client/src/pages/schema-mapper.tsx` - 스키마 매핑 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 스키마 메타데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

### 5. Dictionary 관리 (`/dictionary-manager`)
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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

**API 엔드포인트**:
- `GET /api/dictionaries/default/entries` - Dictionary 항목 조회
- `POST /api/dictionaries/default/entries` - Dictionary 항목 생성

### 6. 테마 클러스터 관리 (`/theme-cluster-management`)
**기능**: 뉴스 테마 클러스터링 관리

**소스코드**:
- `client/src/pages/theme-cluster-management.tsx` - 테마 클러스터 관리 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 테마 클러스터 데이터
- ✅ **Databricks**: 클러스터링 분석
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 텍스트 분석 및 클러스터링

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API 키
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 엔드포인트
- `AZURE_OPENAI_DEPLOYMENT_NAME`: OpenAI 배포 이름
- `AZURE_OPENAI_API_VERSION`: OpenAI API 버전

---

## 🤖 AI 시스템 관리

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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API 키
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 엔드포인트
- `AZURE_OPENAI_DEPLOYMENT_NAME`: OpenAI 배포 이름
- `AZURE_OPENAI_API_VERSION`: OpenAI API 버전

**API 엔드포인트**:
- `GET /api/prompts` - 프롬프트 목록
- `POST /api/prompts` - 프롬프트 생성/수정
- `POST /api/prompts/test` - 프롬프트 테스트

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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

**API 엔드포인트**:
- `GET /api/api-calls` - API 목록
- `POST /api/api-calls` - API 생성/수정
- `POST /api/api-calls/test` - API 테스트

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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로
- `COSMOSDB_ENDPOINT`: CosmosDB 엔드포인트
- `COSMOSDB_KEY`: CosmosDB 키
- `COSMOSDB_DATABASE_NAME`: CosmosDB 데이터베이스 이름
- `COSMOSDB_CONTAINER_NAME`: CosmosDB 컨테이너 이름
- `AZURE_SEARCH_ENDPOINT`: Azure AI Search 엔드포인트
- `AZURE_SEARCH_API_KEY`: Azure AI Search API 키
- `AZURE_SEARCH_INDEX_NAME`: 검색 인덱스 이름
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API 키
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 엔드포인트
- `AZURE_OPENAI_DEPLOYMENT_NAME`: OpenAI 배포 이름
- `AZURE_OPENAI_API_VERSION`: OpenAI API 버전

**API 엔드포인트**:
- `GET /api/azure/environment/summary` - Azure 환경 요약
- `GET /api/azure/environment/validate` - Azure 환경 검증

### 4. 감사 로그 관리 (`/audit-log-management`)
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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

**API 엔드포인트**:
- `GET /api/audit-logs` - 감사 로그 조회
- `GET /api/security-events` - 보안 이벤트 조회
- `GET /api/data-access-logs` - 데이터 접근 로그 조회

---

## 📊 분석 & 리포팅

### 1. AI 시황 생성 (`/ai-market-analysis`)
**기능**: AI 기반 시장 분석 및 시황 생성

**소스코드**:
- `client/src/pages/AIMarketAnalysis.tsx` - AI 시황 분석 페이지
- `client/src/components/ai-market-analysis/` - 시황 분석 컴포넌트들
- `server/services/ai-market-analysis.ts` - AI 시장 분석 서비스

**데이터소스**:
- ✅ **PostgreSQL**: 분석 결과 저장
- ✅ **Databricks**: 데이터 분석 및 처리
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ✅ **OpenAI**: 텍스트 분석 및 시황 생성

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API 키
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 엔드포인트
- `AZURE_OPENAI_DEPLOYMENT_NAME`: OpenAI 배포 이름
- `AZURE_OPENAI_API_VERSION`: OpenAI API 버전

**API 엔드포인트**:
- `POST /api/ai-market-analysis/execute` - AI 시황 생성 실행
- `GET /api/ai-market-analysis/status` - 분석 상태 조회

---

## 👤 개인화 서비스

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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로

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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

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

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

---

## 🛡️ 품질 관리

### 1. 품질 평가 (`/quality-dashboard`)
**기능**: 시스템 품질 지표 모니터링

**소스코드**:
- `client/src/pages/quality-dashboard.tsx` - 품질 평가 페이지

**데이터소스**:
- ✅ **PostgreSQL**: 품질 지표 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

### 2. ETF 투자가이드 (`/etf-guide`)
**기능**: ETF 투자 가이드 제공

**소스코드**:
- `client/src/pages/etf-guide.tsx` - ETF 가이드 페이지

**데이터소스**:
- ✅ **PostgreSQL**: ETF 데이터
- ❌ **Databricks**: 직접 사용하지 않음
- ❌ **CosmosDB**: 직접 사용하지 않음
- ❌ **Azure AI Search**: 직접 사용하지 않음
- ❌ **OpenAI**: 직접 사용하지 않음

**환경변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열

---

## 📈 환경변수 사용 현황 요약

### 필수 환경변수 (모든 메뉴에서 사용)
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `NODE_ENV`: 환경 설정 (development/production)
- `PORT`: 서버 포트 (기본값: 3000)

### Azure 서비스별 환경변수

#### PostgreSQL
- `DATABASE_URL`: PostgreSQL 연결 문자열

#### Databricks
- `DATABRICKS_HOST`: Databricks 워크스페이스 호스트
- `DATABRICKS_TOKEN`: Databricks 액세스 토큰
- `DATABRICKS_HTTP_PATH`: SQL 웨어하우스 HTTP 경로

#### Azure OpenAI
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API 키
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 엔드포인트
- `AZURE_OPENAI_DEPLOYMENT_NAME`: OpenAI 배포 이름
- `AZURE_OPENAI_API_VERSION`: OpenAI API 버전

#### Azure AI Search
- `AZURE_SEARCH_ENDPOINT`: Azure AI Search 엔드포인트
- `AZURE_SEARCH_API_KEY`: Azure AI Search API 키
- `AZURE_SEARCH_INDEX_NAME`: 검색 인덱스 이름

#### CosmosDB
- `COSMOSDB_ENDPOINT`: CosmosDB 엔드포인트
- `COSMOSDB_KEY`: CosmosDB 키
- `COSMOSDB_DATABASE_NAME`: CosmosDB 데이터베이스 이름
- `COSMOSDB_CONTAINER_NAME`: CosmosDB 컨테이너 이름

---

## 🔧 핵심 서비스 아키텍처

### 워크플로우 엔진
- **파일**: `server/services/workflow-execution-engine.ts`
- **기능**: 워크플로우 세션 관리, 노드 실행, 데이터 흐름 제어
- **데이터소스**: PostgreSQL (세션 데이터), Databricks (SQL 실행), OpenAI (프롬프트 실행)
- **환경변수**: `DATABASE_URL`, `DATABRICKS_*`, `AZURE_OPENAI_*`

### JSON 프롬프트 실행 엔진
- **파일**: `server/services/json-prompt-execution-engine.ts`
- **기능**: JSON 스키마 검증, 변수 해석, OpenAI 호출
- **데이터소스**: PostgreSQL (프롬프트 정의), OpenAI (실행)
- **환경변수**: `DATABASE_URL`, `AZURE_OPENAI_*`

### API 호출 엔진
- **파일**: `server/services/api-call-engine.ts`
- **기능**: HTTP API 호출, 파라미터 처리, 응답 검증
- **데이터소스**: PostgreSQL (API 정의)
- **환경변수**: `DATABASE_URL`

### 스케줄러 서비스
- **파일**: `server/services/scheduler.ts`
- **기능**: 정기 작업 실행, 데이터 수집
- **데이터소스**: PostgreSQL (스케줄 정보), Databricks (데이터 처리)
- **환경변수**: `DATABASE_URL`, `DATABRICKS_*`

---

## 📝 결론

AITradeConsole은 PostgreSQL을 중심으로 한 통합 데이터 플랫폼으로, 각 메뉴별로 특화된 기능을 제공하면서도 Azure의 다양한 서비스들을 유기적으로 연동하여 사용하고 있습니다. 특히 워크플로우 엔진을 통해 복잡한 데이터 처리 파이프라인을 구성하고, AI 서비스를 활용한 지능형 분석 기능을 제공하는 것이 특징입니다.

환경변수는 각 서비스별로 체계적으로 관리되며, 개발/운영 환경에 따라 적절히 설정되어야 합니다.
