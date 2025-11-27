# 화면 라우팅 주소 목록

NH Investment & Securities AI Platform의 모든 화면 라우팅 주소를 정리한 문서입니다.

**기본 URL**: `https://your-domain.com`

---

## 📋 목차

1. [홈 & 대시보드](#홈--대시보드)
2. [워크플로우 관리](#워크플로우-관리)
3. [AI 시스템 관리](#ai-시스템-관리)
4. [데이터 관리](#데이터-관리)
5. [개인화 서비스](#개인화-서비스)
6. [AI 분석 도구](#ai-분석-도구)

---

## 홈 & 대시보드

모든 사용자(user, analyst, ops, admin) 접근 가능

| 경로 | 화면 이름 | 설명 |
|------|----------|------|
| `/` | 홈 | 메인 홈 화면 |
| `/dashboard` | 대시보드 | 시스템 대시보드 |
| `/news` | 뉴스 | 뉴스 조회 화면 |

---

## 워크플로우 관리

### 분석가 이상 접근 가능 (analyst, ops, admin)

| 경로 | 화면 이름 | 설명 |
|------|----------|------|
| `/workflow-editor/:id?` | 워크플로우 에디터 | 워크플로우 생성 및 편집 (ID는 선택사항) |
| `/workflow-monitor` | 워크플로우 모니터 | 워크플로우 실행 모니터링 (ops, admin만) |
| `/scheduler` | 스케줄러 | 작업 스케줄 관리 (ops, admin만) |

---

## AI 시스템 관리

### 관리자 전용 (admin)

| 경로 | 화면 이름 | 설명 |
|------|----------|------|
| `/prompt-management` | 프롬프트 관리 | AI 프롬프트 관리 |
| `/api-management` | API 관리 | API 호출 설정 관리 |
| `/python-management` | Python 관리 | Python 스크립트 관리 |
| `/data-source-management` | 데이터 소스 관리 | 데이터 소스 설정 관리 |
| `/logs` | 로그 뷰어 | 시스템 로그 조회 (ops, admin) |
| `/azure-config` | Azure 설정 | Azure 서비스 설정 |
| `/ai-search-management` | AI Search 관리 | Azure AI Search 설정 |
| `/rag-management` | RAG 관리 | RAG 시스템 관리 |
| `/rag-security-management` | RAG 보안 관리 | RAG 보안 설정 및 모니터링 |
| `/openai-provider` | OpenAI Provider | OpenAI 설정 관리 |
| `/service-test` | 서비스 테스트 | 서비스 연결 테스트 |
| `/audit-log-management` | 감사 로그 관리 | 시스템 감사 로그 관리 |
| `/schema-browser` | 스키마 브라우저 | 데이터베이스 스키마 조회 |

---

## 데이터 관리

### 분석가 이상 접근 가능 (analyst, ops, admin)

| 경로 | 화면 이름 | 설명 |
|------|----------|------|
| `/schema-browser` | 스키마 브라우저 | 데이터베이스 스키마 조회 (admin만) |
| `/theme-cluster-management` | 테마 클러스터 관리 | 테마 클러스터링 관리 |
| `/nl2sql-engine` | NL2SQL 엔진 | 자연어를 SQL로 변환 |
| `/schema-mapper` | 스키마 매퍼 | 스키마 매핑 관리 |
| `/dictionary-manager` | 사전 관리 | 용어 사전 관리 |
| `/prompt-builder` | 프롬프트 빌더 | 프롬프트 작성 도구 |
| `/data-query-ai-market` | AI 시황 결과 데이터 쿼리 | AI 시황 생성 결과 데이터 조회 및 분석 |
| `/data-query-holdings` | 잔고 분석 결과 데이터 쿼리 | 잔고 분석 결과 데이터 조회 및 분석 |

---

## 개인화 서비스

### 모든 사용자 접근 가능 (user, analyst, ops, admin)

| 경로 | 화면 이름 | 설명 |
|------|----------|------|
| `/personal-dashboard` | 개인 대시보드 | 개인화된 대시보드 |
| `/my-holdings` | 내 보유종목 | 보유 종목 조회 |
| `/my-trades` | 내 거래내역 | 거래 내역 조회 |
| `/my-watchlist` | 내 관심종목 | 관심 종목 관리 |
| `/personalization-settings` | 개인화 설정 | 개인화 옵션 설정 |
| `/etf-guide` | ETF 가이드 | ETF 정보 및 가이드 |
| `/etf-admin-settings` | ETF 관리 설정 | ETF 관리자 설정 (admin만) |

---

## AI 분석 도구

### 분석가 이상 접근 가능 (analyst, ops, admin)

| 경로 | 화면 이름 | 설명 |
|------|----------|------|
| `/ai-market-analysis` | AI 시장 분석 | AI 기반 시장 분석 |
| `/financial-chatbot` | 금융 챗봇 | AI 금융 상담 챗봇 (모든 사용자) |

---

## 접근 권한 레벨

- **user**: 일반 사용자
- **analyst**: 분석가
- **ops**: 운영자
- **admin**: 관리자

---

## 동적 라우팅

다음 경로는 동적 파라미터를 지원합니다:

- `/workflow-editor/:id?` - 워크플로우 ID가 선택적으로 포함될 수 있습니다.
  - 예: `/workflow-editor` (새 워크플로우 생성)
  - 예: `/workflow-editor/123` (ID 123 워크플로우 편집)

---

## 인증되지 않은 사용자

인증되지 않은 사용자는 자동으로 `/login` 페이지로 리다이렉트됩니다.

---

## 404 페이지

등록되지 않은 경로로 접근 시 `NotFound` 컴포넌트가 표시됩니다.

---

## 참고사항

- 모든 경로는 인증이 필요합니다 (로그인 필수)
- 각 경로는 역할 기반 접근 제어(RBAC)가 적용됩니다
- 관리자 전용 화면은 `admin` 역할이 필요합니다
- 일부 화면은 여러 역할에서 접근 가능하며, 역할에 따라 기능이 제한될 수 있습니다

---

**문서 생성일**: 2025-01-28  
**마지막 업데이트**: 2025-01-28

