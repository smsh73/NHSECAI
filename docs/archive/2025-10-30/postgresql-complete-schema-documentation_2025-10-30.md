# PostgreSQL 전체 데이터베이스 스키마 설명서

## 개요

AITradeConsole의 PostgreSQL 데이터베이스 스키마는 Azure 환경 전용으로 구성되었으며, 금융보안원 감사 기준을 충족하는 감사 로깅 시스템과 함께 AI 기반 금융 분석 플랫폼의 핵심 데이터를 관리합니다.

## 주요 변경사항 (최신 버전)

- **SQLite 완전 제거**: 모든 SQLite 관련 코드 제거, PostgreSQL 전용
- **Azure 환경 전용**: 로컬 개발 환경 코드 제거, Azure App Service 환경변수 사용
- **환경변수 기반**: `.env` 파일 로드 제거, Azure App Service Application Settings 사용
- **샘플 데이터 생성**: 배포 시 자동 샘플 데이터 생성 지원 (`INIT_SAMPLE_DATA=true`)

## 스키마 구조

### 전체 테이블 목록 (72개)

데이터베이스는 다음과 같이 분류됩니다:
1. **사용자 및 인증** (1개)
2. **금융 데이터** (3개)
3. **AI 시스템 관리** (7개)
4. **워크플로우 관리** (8개)
5. **분석 및 리포팅** (7개)
6. **개인화 서비스** (7개)
7. **ETF 관리** (8개)
8. **품질 관리** (4개)
9. **NL2SQL 엔진** (4개)
10. **Azure 설정** (1개)
11. **시스템 설정** (1개)
12. **기타 운영 관리** (21개)

---

## 1. 사용자 및 인증 (1개 테이블)

### 1.1 users
**목적**: 시스템 사용자 관리

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | varchar(36) | PK, UUID |
| username | text | 사용자명 (UNIQUE) |
| password | text | 해시된 비밀번호 |
| role | text | 사용자 역할 (user, analyst, ops, admin) |
| created_at | timestamp | 생성일시 |

**인덱스**: username

**참고**: 
- 세션 관리는 애플리케이션 레벨에서 처리
- 사용자 태그 및 잔액 관리는 개인화 서비스 섹션 참조

---

## 2. 금융 데이터 (3개 테이블)

### 2.1 audit_logs
**목적**: 시스템 전반의 감사 이벤트 기록

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | varchar(36) | PK, UUID |
| event_type | varchar(50) | 이벤트 타입 (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, EXECUTE, VIEW, EXPORT, IMPORT, CONFIG_CHANGE, SECURITY_EVENT) |
| event_category | varchar(50) | 이벤트 카테고리 (AUTHENTICATION, AUTHORIZATION, DATA_ACCESS, DATA_MODIFICATION, SYSTEM_CONFIG, SECURITY, COMPLIANCE) |
| severity | varchar(20) | 심각도 (CRITICAL, HIGH, MEDIUM, LOW, INFO) |
| action | varchar(100) | 상세 액션 명 |
| resource_type | varchar(50) | 리소스 타입 (USER, SERVICE, PROMPT, API, WORKFLOW, CONFIG) |
| resource_id | varchar(100) | 리소스 ID |
| user_id | varchar(36) | 사용자 ID |
| username | varchar(100) | 사용자명 |
| user_role | varchar(50) | 사용자 역할 |
| user_ip | varchar(50) | IP 주소 |
| success | boolean | 성공 여부 |
| execution_time_ms | integer | 실행 시간 (ms) |
| request_data | jsonb | 요청 데이터 |
| response_data | jsonb | 응답 데이터 |
| metadata | jsonb | 추가 메타데이터 |
| tags | varchar(100)[] | 검색용 태그 |
| created_at | timestamp | 생성일시 |
| audit_trail | text | 전체 감사 추적 경로 |
| compliance_flag | boolean | 컴플라이언스 체크 필요 여부 |
| retention_period | integer | 보관 기간 (일) |

**제약조건**: 
- CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'))
- CHECK (event_type IN ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'VIEW', 'EXPORT', 'IMPORT', 'CONFIG_CHANGE', 'SECURITY_EVENT'))
- CHECK (retention_period >= 0 AND retention_period <= 3650)

**인덱스**: user_id, username, event_type, severity, created_at, resource_type, resource_id, success, session_id, tags (GIN), metadata (GIN)

### 2.2 data_access_logs
**목적**: 데이터베이스 접근 추적

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | varchar(36) | PK, UUID |
| access_type | varchar(50) | 액세스 타입 (READ, WRITE, UPDATE, DELETE, EXPORT) |
| table_name | varchar(100) | 테이블명 |
| record_id | varchar(100) | 레코드 ID |
| data_classification | varchar(20) | 데이터 분류 (PUBLIC, INTERNAL, CONFIDENTIAL, SECRET, TOP_SECRET) |
| pii_included | boolean | 개인정보 포함 여부 |
| financial_data_included | boolean | 금융 데이터 포함 여부 |
| user_id | varchar(36) | 사용자 ID |
| username | varchar(100) | 사용자명 |
| user_role | varchar(50) | 사용자 역할 |
| user_ip | varchar(50) | IP 주소 |
| success | boolean | 성공 여부 |
| record_count | integer | 레코드 수 |
| query_executed | text | 실행된 쿼리 |
| query_parameters | jsonb | 쿼리 파라미터 |
| location_info | jsonb | 지리적 위치 정보 |
| created_at | timestamp | 생성일시 |

**제약조건**:
- CHECK (access_type IN ('READ', 'WRITE', 'UPDATE', 'DELETE', 'EXPORT'))
- CHECK (data_classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'))

**인덱스**: user_id, table_name, data_classification, pii_included, created_at

### 2.3 security_events
**목적**: 보안 이벤트 기록

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | varchar(36) | PK, UUID |
| event_type | varchar(50) | 이벤트 타입 (BREACH_ATTEMPT, UNAUTHORIZED_ACCESS, AUTHENTICATION_FAILURE, SUSPICIOUS_ACTIVITY, PRIVILEGE_ESCALATION) |
| threat_level | varchar(20) | 위협 수준 (CRITICAL, HIGH, MEDIUM, LOW) |
| user_id | varchar(36) | 사용자 ID |
| username | varchar(100) | 사용자명 |
| user_ip | varchar(50) | IP 주소 |
| description | text | 이벤트 설명 |
| source | varchar(100) | lowered 시스템/서비스명 |
| affected_resource | varchar(100) | 영향받은 리소스 |
| mitigation_action | varchar(100) | 대응 조치 (BLOCKED, ALLOWED, PENDING_REVIEW) |
| auto_remediated | boolean | 자동 해결 여부 |
| details | jsonb | 추가 상세 정보 |
| created_at | timestamp | 생성일시 |

**인덱스**: event_type, threat_level, user_id, created_at

### 2.4 audit_logs_archive
**목적**: 오래된 감사 로그 아카이브 저장

**구조**: audit_logs와 동일

### 2.5 audit_reports
**목적**: 감사 보고서 관리

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | varchar(36) | PK, UUID |
| report_type | varchar(50) | 보고서 타입 (DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, AD_HOC) |
| report_name | varchar(200) | 보고서 이름 |
| report_period_start | timestamp | 보고서 기간 시작 |
| report_period_end | timestamp | 보고서 기간 종료 |
| generated_by | varchar(36) | 생성자 ID |
| generated_at | timestamp | 생성 일시 |
| summary | jsonb | 요약 통계 |
| findings | jsonb | 발견 사항 |
| recommendations | text | 권고 사항 |
| status | varchar(20) | 상태 (DRAFT, FINAL, ARCHIVED) |
| created_at | timestamp | 생성일시 |

**인덱스**: report_type, generated_by, generated_at

---

## 3. 서비스 관리 시스템 (8개 테이블) - 신규

### 3.1 services
**목적**: 서비스 카탈로그 관리

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | varchar(36) | PK, UUID |
| name | varchar(100) | 서비스 이름 (UNIQUE) |
| display_name | varchar(200) | 표시 이름 |
| description | text | 설명 |
| version | varchar(20) | 버전 (기본: 1.0.0) |
| category | varchar(50) | 카테고리 (AI_ANALYSIS, DATA_COLLECTION, WORKFLOW, API, NOTIFICATION 등) |
| type | varchar(50) | 타입 (INTERNAL, EXTERNAL, HYBRID) |
| status | varchar(20) | 상태 (ACTIVE, INACTIVE, DEPRECATED, MAINTENANCE) |
| base_url | varchar(500) | 베이스 URL |
| health_check_url | varchar(500) | 헬스체크 URL |
| tags | varchar(50)[] | 태그 |
| metadata | jsonb | 메타데이터 |
| created_by | varchar(36) | 생성자 ID |
| created_at | timestamp | 생성일시 |
| updated_at | timestamp | 수정일시 |
| last_health_check | timestamp | 마지막 헬스체크 일시 |

**인덱스**: name, category, status, tags (GIN)

### 3.2 service_dependencies
서비스 간 의존성 관리

### 3.3 api_call_logs
API 호출 로그 관리

### 3.4 environment_variables
환경 변수 관리

### 3.5 azure_configurations (신규)
Azure 서비스 설정 관리

### 3.6 backup_records
데이터 백업 기록

### 3.7 system_metrics
시스템 메트릭 모니터링

### 3.8 system_notifications
시스템 알림/이벤트

---

## 4. AI 시스템 관리 (8개 테이블)

### 4.1 prompts
**목적**: AI 프롬프트 관리

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | varchar(36) | PK, UUID |
| name | text | 프롬프트 이름 |
| description | text | 설명 |
| system_prompt | text | 시스템 프롬프트 |
| user_prompt_template | text | 사용자 프롬프트 템플릿 |
| parameters | jsonb | 템플릿 파라미터 |
| category | text | 카테고리 |
| is_active | boolean | 활성 여부 |
| input_schema | jsonb | JSON 입력 스키마 (신규) |
| output_schema | jsonb | JSON 출력 스키마 (신규) |
| execution_type | text | 실행 타입 (text, json) (신규) |
| azure_openai_config | jsonb | Azure OpenAI PTU 설정 (신규) |
| created_by | varchar(36) | FK → users.id |
| created_at | timestamp | 생성일시 |
| updated_at | timestamp | 수정일시 |

**인덱스**: (자동 생성)

### 4.2 aiServiceProviders
AI 서비스 프로바이더 관리

### 4.3 apiCategories
API 카테고리 관리

### 4.4 apiCalls
API 엔드포인트 관리

**신규 컬럼**:
- request_schema: jsonb - 요청 스키마
- response_schema: jsonb - 응답 스키마
- parameter_template: text - 파라미터 템플릿
- execution_type: text - 실행 타입 (json, text, binary)
- timeout: integer - 타임아웃 (ms)
- retry_count: integer - 재시도 횟수
- retry_delay: integer - 재시도 지연 (ms)

### 4.5 apiTestResults
API 테스트 결과

### 4.6 apiUsageAnalytics
API 사용 분석

### 4.7 apiTemplates
API 템플릿

### 4.8 azureConfigs
Azure 설정 (기존)

---

## 5. 워크플로우 관리 (6개 테이블)

### 5.1 workflows
워크플로우 정의

### 5.2 workflowNodes
워크플로우 노드 정의

### 5.3 workflowSessions
워크플로우 실행 세션

### 5.4 workflowNodeExecutions
노드 실행 이력

### 5.5 workflowSessionData
세션 데이터 (JSON 기반)

**신규 기능**:
- promptId, apiCallId 저장
- inputData, outputData JSON 저장
- executionStatus, errorMessage 저장

### 5.6 workflowTemplates
워크플로우 템플릿

---

## 6. 금융 데이터 (15개 테이블)

### 6.1 financialData
금융 시장 데이터

### 6.2 newsData
뉴스 데이터

### 6.3 themes
테마 클러스터

### 6.4 marketAnalysis
시장 분석

### 6.5 macroAnalysis
매크로 분석

### 6.6 majorEvents
주요 이벤트

### 6.7 ~ 6.15
기타 관련 테이블들

---

## 7. 개인화 서비스 (8개 테이블)

### 7.1 userBalances
사용자 잔액

### 7.2 userWatchlist
관심종목

### 7.3 userTrades
매매 이력

### 7.4 ~ 7.8
기타 개인화 테이블들

---

## 8. ETF 관리 (15개 테이블)

### 8.1 etfProducts
ETF 상품 정보

### 8.2 etfMetrics
ETF 메트릭

### 8.3 etfChatSessions
ETF 챗 세션

### 8.4 ~ 8.15
기타 ETF 관련 테이블들

---

## 9. 품질 관리 (6개 테이블)

### 9.1 reportQualityMetrics
리포트 품질 메트릭

### 9.2 feedbackLog
피드백 로그

### 9.3 ~ 9.6
기타 품질 관리 테이블들

---

## 10. NL2SQL 엔진 (4개 테이블)

### 10.1 nl2sqlPrompts
NL2SQL 프롬프트

### 10.2 schemaSources
스키마 소스

### 10.3 dictionaries
딕셔너리

### 10.4 dictionaryEntries
딕셔너리 엔트리

---

## 스키마 버전 관리

- **현재 버전**: v1.2.1
- **기본 스키마**: shared/schema.ts
- **통합 스키마**: database/unified-schema.sql
- **마이그레이션**: Drizzle ORM

---

## 스키마 적용 방법

```bash
# 1. Drizzle 사용 (권장)
npm run db:push

# 2. SQL 직접 실행
psql $DATABASE_URL -f database/unified-schema.sql

# 3. 초기화 스크립트
bash database/init-database.sh
```

---

---

**작성일: 2025-10-30
**최종 업데이트: 2025-10-30
**버전**: Azure 환경 전용 (PostgreSQL)
**데이터베이스**: PostgreSQL 전용 (SQLite 제거)
**ORM**: Drizzle ORM
**주요 변경**: SQLite 제거, Azure 전용, 샘플 데이터 생성 기능 추가
