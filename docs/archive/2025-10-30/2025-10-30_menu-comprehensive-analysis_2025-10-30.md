# 메뉴별 종합 분석 문서

## 문서 정보
- **생성일**: 2025-10-30
- **자동 생성**: 배포 버전 생성 시 자동 업데이트
- **목적**: 각 메뉴별 소스코드, 데이터 스키마, 데이터 소스, 화면 구성 및 함수 기능 구현 여부 종합 분석
- **데이터 소스**: `MENU_SOURCE_CODE_MAPPING.md`, `FUNCTION_LIST_AND_COMPLETION_RATE.md`, 실제 소스코드 분석

---

## 개요

이 문서는 AITradeConsole 애플리케이션의 모든 메뉴에 대해 다음 정보를 종합적으로 분석합니다:
- 소스코드 위치 및 파일명
- API 엔드포인트
- 데이터베이스 스키마
- 데이터 소스 Scopus (PostgreSQL, Databricks, Azure 서비스 등)
- 화면 구성 요소
- 주요 함수 및 구현 상태
- 기능 완성도

**참고**: 이 문서는 `MENU_SOURCE_CODE_MAPPING.md`와 `FUNCTION_LIST_AND_COMPLETION_RATE.md`를 기반?'으로 생성되었습니다.
더 자세한 내용은 해당 문서를 참고하세요.

---

## 목차
1. [홈 & 대시보드](#홈--대시보드)
2. [워크플로우 관리](#워크플로우-관리)
3. [데이터 관리](#데이터-관리)
4. [AI 시스템 관리](#ai-시스템-관리)
5. [분석 & 리포팅](#분석--리포팅)
6. [개인화 서비스](#개인화-서비스)
7. [품질 관리](#품질-관리)
8. [요약 통계](#요약-통계)

---

이 문서는 `MENU_SOURCE_CODE_MAPPING.md`의 상세 내용을 기반으로 생성되었습니다.
전체 내용은 `MENU_SOURCE_CODE_MAPPING.md` 파일을 참고하세요.

---

## 요약 통계

### 전체 기능 완성도
- **완료 (70% 이상)**: 15개
- **부분 완료 (50-69%)**: 8개
- **미완료 (50% 미만)**: 2개

### 카테고리별 완성도
- 홈 & 대시보드: 72%
- 워크플로우 관리: 72%
- 데이터 관리: 75%
- AI 시스템 관리: 78%
- 분석 & 리포팅: 55%
- 개인화 서비스: 55%
- 품질 관리: 50%

### 데이터 소스 사용 현황
- **PostgreSQL**: 모든 메뉴 (100%) - Azure PostgreSQL 전용
- **Databricks**: 8개 메뉴 (32%)
- **Azure AI Search**: 1개 메뉴 (4%)
- **Azure OpenAI**: 6개 메뉴 (24%)
- **CosmosDB**: 0개 메뉴 (0%)

### 데이터베이스 테이블
- **총 테이블 수**: 72개
- **주요 테이블**:
  - 워크플로우: workflows, workflow_nodes, workflow_executions, workflow_node_results, workflow_sessions
  - AI 관리: prompts, api_calls, ai_service_providers, api_categories
  - 시장 데이터: financial_data, news_data, themes, market_analysis, macro_analysis
  - 개인화: user_balances, user_trades, user_watchlist, user_tags
  - ETF: etf_products, etf_metrics, user_risk_profile, etf_chat_sessions
  - 시스템: users, azure_configs, dictionaries, system_configurations

---

## 기술 스택

### 프론트엔드
- React, TypeScript, Vite
- TanStack Query (데이터 페칭)
- Shadcn UI (컴포넌트)
- React Flow (워크플로우 편집)

### 백엔드
- Express.js, TypeScript
- Drizzle ORM (데이터베이스 접근)
- WebSocket (실시간 업데이트)

### 데이터베이스
- **PostgreSQL 전용** (Azure PostgreSQL)
- SQLite 완전 제거

### Azure 서비스
- Azure PostgreSQL (메인 데이터베이스)
- Azure OpenAI (AI 서비스)
- Azure Databricks (데이터 분석)
- Azure AI Search (벡터 검색)
- Azure CosmosDB (그래프 데이터)

---

## 배포 환경

- **플랫폼**: Azure App Service
- **컨테이너**: Docker (Azure Container Registry)
- **환경변수**: Azure App Service Application Settings
- **샘플 데이터**: 자동 생성 (`INIT_SAMPLE_DATA=true`)

---

## 최종 업데이트

**최종 업데이트: 2025-10-30
**다음 업데이트**: 배포 버전 생성 시 자동 업데이트

---

## 참고 문서

- `MENU_SOURCE_CODE_MAPPING.md` - 메뉴별 소스코드 매핑 상세
- `FUNCTION_LIST_AND_COMPLETION_RATE.md` - 기능별 완성도 분석
- `menu-functionality-analysis.md` - 메뉴 기능 분석
- `postgresql-complete-schema-documentation.md` - 데이터베이스 스키마 문서
- `menu-data-source-summary-table.md` - 데이터소스 요약 표
- `CHANGELOG.md` - 변경이력

