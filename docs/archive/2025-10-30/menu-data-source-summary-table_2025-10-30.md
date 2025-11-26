# AITradeConsole 메뉴별 기능 및 데이터소스 사용 현황 표

## 📊 메뉴별 데이터소스 사용 현황

| 메뉴 카테고리 | 메뉴명 | 경로 | PostgreSQL | Databricks | CosmosDB | Azure AI Search | OpenAI | 주요 기능 |
|--------------|--------|------|------------|------------|----------|-----------------|--------|-----------|
| **홈 & 대시보드** | 통합 대시보드 | `/dashboard` | ✅ | ❌ | ❌ | ❌ | ❌ | 시스템 현황 모니터링 |
| | 시장 현황 | `/` | ✅ | ✅ | ❌ | ❌ | ❌ | 실시간 시장 데이터 |
| **워크플로우 관리** | 워크플로우 편집기 | `/workflow-editor` | ✅ | ✅ | ❌ | ❌ | ✅ | 워크플로우 생성/편집 |
| | 실행 스케줄러 | `/scheduler` | ✅ | ✅ | ❌ | ❌ | ❌ | 자동 실행 스케줄 |
| | 워크플로우 모니터 | `/workflow-monitor` | ✅ | ❌ | ❌ | ❌ | ❌ | 실행 상태 모니터링 |
| **데이터 관리** | 스키마 브라우저 | `/schema-browser` | ✅ | ❌ | ❌ | ❌ | ❌ | DB 스키마 탐색 |
| | RAG 검색엔진 | `/` | ✅ | ✅ | ❌ | ✅ | ✅ | 검색 기반 정보 검색 |
| | NL to SQL 엔진 | `/nl2sql-engine` | ✅ | ✅ | ❌ | ❌ | ✅ | 자연어→SQL 변환 |
| | 스키마 의미 매핑 | `/schema-mapper` | ✅ | ❌ | ❌ | ❌ | ❌ | 스키마 의미 매핑 |
| | Dictionary 관리 | `/dictionary-manager` | ✅ | ❌ | ❌ | ❌ | ❌ | 용어 사전 관리 |
| | 테마 클러스터 관리 | `/theme-cluster-management` | ✅ | ✅ | ❌ | ❌ | ✅ | 뉴스 테마 클러스터링 |
| **AI 시스템 관리** | 프롬프트 관리 | `/prompt-management` | ✅ | ❌ | ❌ | ❌ | ✅ | AI 프롬프트 관리 |
| | API 관리 | `/api-management` | ✅ | ❌ | ❌ | ❌ | ❌ | 외부 API 관리 |
| | Azure 설정 | `/azure-config` | ✅ | ✅ | ✅ | ✅ | ✅ | Azure 서비스 설정 |
| | 감사 로그 관리 | `/audit-log-management` | ✅ | ❌ | ❌ | ❌ | ❌ | 시스템 감사 로그 |
| **분석 & 리포팅** | AI 시황 생성 | `/ai-market-analysis` | ✅ | ✅ | ❌ | ❌ | ✅ | AI 기반 시장 분석 |
| **개인화 서비스** | 개인화 대시보드 | `/personal-dashboard` | ✅ | ❌ | ❌ | ❌ | ❌ | 사용자 맞춤 대시보드 |
| | 보유종목 관리 | `/my-holdings` | ✅ | ❌ | ❌ | ❌ | ❌ | 보유 종목 관리 |
| | 매매이력 분석 | `/my-trades` | ✅ | ✅ | ❌ | ❌ | ❌ | 매매 패턴 분석 |
| | 관심종목 관리 | `/my-watchlist` | ✅ | ❌ | ❌ | ❌ | ❌ | 관심 종목 관리 |
| | 개인화 설정 | `/personalization-settings` | ✅ | ❌ | ❌ | ❌ | ❌ | 사용자 설정 관리 |
| **품질 관리** | 품질 평가 | `/quality-dashboard` | ✅ | ❌ | ❌ | ❌ | ❌ | 시스템 품질 모니터링 |
| | ETF 투자가이드 | `/etf-guide` | ✅ | ❌ | ❌ | ❌ | ❌ | ETF 투자 가이드 |

## 📈 데이터소스별 사용 통계

| 데이터소스 | 사용 메뉴 수 | 사용률 | 주요 용도 |
|-----------|-------------|--------|-----------|
| **PostgreSQL** | 22/22 | 100% | 모든 데이터 저장 및 관리 |
| **Databricks** | 8/22 | 36% | 대용량 데이터 분석, SQL 실행 |
| **CosmosDB** | 1/22 | 5% | 연결 테스트만 |
| **Azure AI Search** | 2/22 | 9% | 벡터 검색, 문서 검색 |
| **OpenAI** | 7/22 | 32% | 자연어 처리, 텍스트 생성 |

## 🔧 핵심 서비스별 소스코드 매핑

| 서비스명 | 소스코드 파일 | 사용 메뉴 | 주요 기능 |
|----------|---------------|-----------|-----------|
| **워크플로우 엔진** | `server/services/workflow-execution-engine.ts` | 워크플로우 편집기, 실행 스케줄러, 워크플로우 모니터 | 세션 관리, 노드 실행, 데이터 흐름 제어 |
| **JSON 프롬프트 엔진** | `server/services/json-prompt-execution-engine.ts` | 프롬프트 관리, 워크플로우 편집기 | JSON 스키마 검증, 변수 해석, OpenAI 호출 |
| **API 호출 엔진** | `server/services/api-call-engine.ts` | API 관리, 워크플로우 편집기 | HTTP API 호출, 파라미터 처리, 응답 검증 |
| **스케줄러 서비스** | `server/services/scheduler.ts` | 실행 스케줄러, 시장 현황 | 정기 작업 실행, 데이터 수집 |
| **RAG 서비스** | `server/services/rag.ts` | RAG 검색엔진 | 문서 검색, 벡터 검색 |
| **AI 시장 분석** | `server/services/ai-market-analysis.ts` | AI 시황 생성 | 시장 데이터 분석, 시황 생성 |
| **Azure 설정** | `server/services/azure-config.ts` | Azure 설정 | Azure 서비스 연결 관리 |
| **감사 로그** | `server/routes/audit-logs.ts` | 감사 로그 관리 | 로그 조회, 보안 이벤트 관리 |

## 🎯 메뉴별 주요 API 엔드포인트

| 메뉴명 | 주요 API 엔드포인트 | 설명 |
|--------|-------------------|------|
| **통합 대시보드** | `GET /api/system/status` | 시스템 상태 조회 |
| **워크플로우 편집기** | `POST /api/workflows/sessions` | 워크플로우 세션 생성 |
| | `POST /api/workflows/sessions/:id/execute` | 워크플로우 실행 |
| **프롬프트 관리** | `GET /api/prompts` | 프롬프트 목록 |
| | `POST /api/prompts/test` | 프롬프트 테스트 |
| **API 관리** | `GET /api/api-calls` | API 목록 |
| | `POST /api/api-calls/test` | API 테스트 |
| **Dictionary 관리** | `GET /api/dictionaries/default/entries` | Dictionary 항목 조회 |
| | `POST /api/dictionaries/default/entries` | Dictionary 항목 생성 |
| **Azure 설정** | `GET /api/azure/environment/summary` | Azure 환경 요약 |
| | `GET /api/azure/environment/validate` | Azure 환경 검증 |
| **감사 로그 관리** | `GET /api/audit-logs` | 감사 로그 조회 |
| | `GET /api/security-events` | 보안 이벤트 조회 |
| **AI 시황 생성** | `POST /api/ai-market-analysis/execute` | AI 시황 생성 실행 |

## 🔄 데이터 흐름 다이어그램

```
사용자 인터페이스 (React)
    ↓
API 서버 (Express.js)
    ↓
서비스 레이어
    ↓
데이터소스 레이어
    ├── PostgreSQL (메인 데이터베이스)
    ├── Databricks (데이터 분석)
    ├── CosmosDB (문서 저장)
    ├── Azure AI Search (벡터 검색)
    └── OpenAI (AI 서비스)
```

## 📋 권장사항

### 1. 데이터소스 최적화
- **PostgreSQL**: 모든 메뉴에서 사용 중으로 적절함
- **Databricks**: 데이터 분석이 필요한 메뉴에서만 사용하여 비용 최적화
- **CosmosDB**: 현재 사용률이 낮으므로 필요성 재검토
- **Azure AI Search**: RAG 기능 확장 시 활용도 증가 예상
- **OpenAI**: AI 기능이 필요한 메뉴에서 적절히 사용 중

### 2. 서비스 아키텍처 개선
- 워크플로우 엔진을 통한 서비스 간 연동 강화
- 공통 서비스 레이어 구축으로 코드 재사용성 향상
- API 엔드포인트 표준화 및 문서화

### 3. 모니터링 및 로깅
- 모든 메뉴에서 감사 로그 시스템 활용
- 데이터소스별 성능 모니터링 강화
- 사용자 행동 분석을 통한 UX 개선
