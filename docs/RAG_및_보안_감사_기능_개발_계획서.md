# RAG 및 금융보안원 감사 대응 기능 개발 계획서

## 개요

본 문서는 AI Trade Console에 RAG(Retrieval-Augmented Generation) 기능 구현 및 금융보안원 감사 대응 기능 개발을 위한 전체 작업 계획을 정리한 것입니다.

## 목차

1. [RAG 기능 구현](#1-rag-기능-구현)
2. [금융보안원 감사 대응 기능](#2-금융보안원-감사-대응-기능)
3. [구현 우선순위](#3-구현-우선순위)
4. [기술 스택 및 아키텍처](#4-기술-스택-및-아키텍처)
5. [데이터베이스 스키마 확장](#5-데이터베이스-스키마-확장)
6. [API 엔드포인트 설계](#6-api-엔드포인트-설계)
7. [프론트엔드 페이지 설계](#7-프론트엔드-페이지-설계)

---

## 1. RAG 기능 구현

### 1.1 AI Search 연결 관리자

#### 목표
- 현재 설정된 환경변수 및 필요한 키를 활용하여 AI Search 연결 상태를 확인하고 관리

#### 구현 내용
- **서버 측 (Backend)**
  - `server/services/rag-connection-manager.ts` 생성
    - 환경변수 검증 (AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_KEY 등)
    - 연결 상태 확인
    - 인덱스 목록 조회
    - 연결 테스트 기능
  
  - `server/routes/rag-management.ts` 생성
    - `GET /api/rag/connection/status` - 연결 상태 조회
    - `GET /api/rag/connection/test` - 연결 테스트
    - `GET /api/rag/connection/config` - 현재 설정 조회

- **프론트엔드 측 (Frontend)**
  - `client/src/pages/rag-management.tsx` 생성 또는 확장
    - AI Search 연결 상태 표시
    - 환경변수 설정 확인 UI
    - 연결 테스트 버튼
    - 필요한 키 목록 표시

#### 기대 효과
- AI Search 연결 상태를 실시간으로 모니터링 가능
- 설정 오류를 빠르게 발견하고 수정 가능

---

### 1.2 AI Search Vector 임베딩 관리자

#### 목표
- Databricks에 쌓여있는 데이터들의 증분식 벡터 임베딩 및 인덱싱 관리

#### 구현 내용
- **데이터베이스 스키마 확장**
  - `rag_embedding_schemas` 테이블 추가
    - 스키마 ID, 이름, 설명
    - Databricks 테이블/뷰 경로
    - 임베딩 설정 (모델, 차원 등)
    - 활성화 여부
  
  - `rag_embedding_jobs` 테이블 추가
    - 작업 ID, 스키마 ID
    - 작업 타입 (INCREMENTAL_NEW, INCREMENTAL_HISTORICAL, FULL)
    - 작업 상태 (PENDING, RUNNING, COMPLETED, FAILED)
    - 진행률 (전체 데이터, 처리된 데이터, 남은 데이터)
    - 시작/종료 시간
    - 에러 메시지
  
  - `rag_embedding_status` 테이블 추가
    - 스키마별 임베딩 상태
    - 최신 데이터 임베딩 완료 시점
    - 과거 데이터 임베딩 진행 상황
    - 전체 데이터량, 임베딩 완료량, 남은 데이터량

- **서버 측 (Backend)**
  - `server/services/rag-embedding-manager.ts` 생성
    - 스키마 관리 (추가, 삭제, 수정)
    - 증분식 임베딩 작업 관리
    - 백그라운드 작업 스케줄러
    - 진행률 추적
  
  - `server/services/rag-embedding-worker.ts` 생성
    - Databricks에서 데이터 조회
    - 벡터 임베딩 생성 (Azure OpenAI Embedding)
    - AI Search에 문서 업로드
    - 메타데이터 추출 및 저장
  
  - `server/routes/rag-management.ts` 확장
    - `GET /api/rag/embedding/schemas` - 스키마 목록 조회
    - `POST /api/rag/embedding/schemas` - 스키마 추가
    - `PUT /api/rag/embedding/schemas/:id` - 스키마 수정
    - `DELETE /api/rag/embedding/schemas/:id` - 스키마 삭제
    - `GET /api/rag/embedding/schemas/:id/status` - 스키마별 임베딩 상태
    - `POST /api/rag/embedding/schemas/:id/embed` - 수동 임베딩 실행
    - `GET /api/rag/embedding/jobs` - 작업 목록 조회
    - `GET /api/rag/embedding/jobs/:id` - 작업 상세 조회

- **프론트엔드 측 (Frontend)**
  - `client/src/pages/rag-management.tsx` 확장
    - 스키마 관리 탭
      - 스키마 목록 표시
      - 스키마 추가/수정/삭제 다이얼로그
      - 스키마별 임베딩 상태 표시
    - 임베딩 작업 탭
      - 작업 목록 표시
      - 실시간 진행률 표시
      - 수동 임베딩 실행 버튼

#### 증분식 임베딩 로직
1. **새 데이터 임베딩 (최신 → 과거)**
   - 최신 데이터부터 시작하여 과거로 진행
   - 배치 단위로 처리 (예: 1000건씩)
   - 진행률 실시간 업데이트

2. **과거 데이터 임베딩 (과거 → 현재)**
   - 가장 오래된 데이터부터 시작하여 최신으로 진행
   - 백그라운드에서 지속적으로 실행
   - 새 데이터가 추가되면 새 데이터 임베딩 우선 처리

3. **수동 증분 임베딩**
   - 사용자가 특정 스키마의 델타 데이터만 임베딩 실행
   - 마지막 임베딩 시점 이후의 데이터만 처리

#### 기대 효과
- 대용량 데이터를 효율적으로 벡터 임베딩
- 실시간으로 임베딩 진행 상황 모니터링 가능
- 스키마별로 독립적인 임베딩 관리

---

### 1.3 메타데이터 추출 및 CosmosDB 저장

#### 목표
- 시황정보들의 메타데이터를 추출하여 CosmosDB에 저장
- 벡터 검색, 키워드 검색 시 필터로 활용

#### 구현 내용
- **데이터베이스 스키마 확장**
  - `rag_metadata` 테이블 추가 (PostgreSQL)
    - 문서 ID, 스키마 ID
    - 추출된 메타데이터 (JSONB)
    - CosmosDB 문서 ID
    - 생성/수정 시간
  
  - CosmosDB 컨테이너: `rag-metadata`
    - 문서 구조:
      ```json
      {
        "id": "doc-id",
        "schemaId": "schema-id",
        "metadata": {
          "symbol": "005930",
          "date": "2025-01-15",
          "category": "financial",
          "source": "databricks",
          "tags": ["삼성전자", "주가", "거래량"]
        },
        "createdAt": "2025-01-15T10:00:00Z"
      }
      ```

- **서버 측 (Backend)**
  - `server/services/rag-metadata-extractor.ts` 생성
    - 시황정보에서 메타데이터 추출
      - 종목 코드, 날짜, 카테고리
      - 키워드, 태그
      - 데이터 소스 정보
    - CosmosDB에 메타데이터 저장
    - 메타데이터 검색 기능
  
  - `server/services/rag-metadata-filter.ts` 생성
    - 벡터 검색 시 메타데이터 필터링
    - 키워드 검색 시 메타데이터 활용
  
  - `server/routes/rag-management.ts` 확장
    - `GET /api/rag/metadata` - 메타데이터 검색
    - `POST /api/rag/metadata/extract` - 메타데이터 추출 실행

- **프론트엔드 측 (Frontend)**
  - 메타데이터 필터 UI 추가
    - 종목 코드 필터
    - 날짜 범위 필터
    - 카테고리 필터
    - 태그 필터

#### 기대 효과
- 검색 정확도 향상
- 필터링을 통한 검색 결과 품질 개선
- 메타데이터 기반 분석 가능

---

### 1.4 RAG 검색 및 AI 챗봇

#### 목표
- 백엔드 API로 RAG 검색 구현
- RAG 관리자 페이지에서 프롬프트로 RAG 검색 후 OpenAI로 답변 생성

#### 구현 내용
- **서버 측 (Backend)**
  - `server/services/rag-search-service.ts` 생성
    - 하이브리드 검색 (벡터 + 키워드)
    - 메타데이터 필터링
    - 검색 결과 랭킹
  
  - `server/services/rag-chat-service.ts` 생성
    - 사용자 프롬프트 처리
    - RAG 검색 실행
    - OpenAI로 답변 생성
    - 컨텍스트 관리
  
  - `server/routes/rag-management.ts` 확장
    - `POST /api/rag/search` - RAG 검색
    - `POST /api/rag/chat` - 챗봇 대화
    - `GET /api/rag/chat/history` - 대화 이력 조회

- **프론트엔드 측 (Frontend)**
  - `client/src/pages/rag-management.tsx` 확장
    - RAG 챗봇 탭 추가
      - 대화 인터페이스
      - 검색 결과 표시
      - 답변 표시
      - 대화 이력

#### 사용 예시
- 사용자: "삼성전자의 최근 거래량을 날짜별로 보여줘"
- 시스템:
  1. RAG 검색으로 삼성전자 관련 데이터 검색
  2. 검색 결과를 컨텍스트로 OpenAI에 전달
  3. 날짜별 거래량 정리된 답변 생성
  4. 대화창에 결과 표시

#### 기대 효과
- 자연어로 시황정보 검색 및 분석 가능
- 정확한 데이터 기반 답변 제공

---

### 1.5 인덱스 증분 생성 및 엔드포인트 배포

#### 목표
- AI Search 인덱스의 증분 생성 관리
- 필요 시 엔드포인트 배포

#### 구현 내용
- **서버 측 (Backend)**
  - `server/services/rag-index-manager.ts` 생성
    - 인덱스 스키마 관리
    - 증분 인덱스 생성
    - 인덱스 배포 관리
  
  - `server/routes/rag-management.ts` 확장
    - `POST /api/rag/index/create` - 인덱스 생성
    - `POST /api/rag/index/deploy` - 인덱스 배포
    - `GET /api/rag/index/status` - 인덱스 상태 조회

- **프론트엔드 측 (Frontend)**
  - 인덱스 관리 UI 추가
    - 인덱스 목록
    - 인덱스 생성/배포 버튼
    - 인덱스 상태 표시

#### 기대 효과
- 인덱스 생명주기 관리
- 효율적인 검색 성능 유지

---

## 2. 금융보안원 감사 대응 기능

### 2.1 RAG 참조데이터 형상관리 및 위변조 방지

#### 목표
- RAG 참조데이터에 대한 형상관리
- 위변조 방지 조치
- 이상치 데이터 탐지

#### 구현 내용
- **데이터베이스 스키마 확장**
  - `rag_data_version_control` 테이블 추가
    - 문서 ID, 버전 번호
    - 데이터 해시 (SHA-256)
    - 변경 이력
    - 변경자 정보
  
  - `rag_data_tampering_detection` 테이블 추가
    - 탐지 ID, 문서 ID
    - 탐지 시점
    - 탐지 유형 (HASH_MISMATCH, UNEXPECTED_CHANGE 등)
    - 탐지 상세 정보
  
  - `rag_data_anomaly_detection` 테이블 추가
    - 이상치 ID, 문서 ID
    - 이상치 유형
    - 이상치 점수
    - 탐지 시점

- **서버 측 (Backend)**
  - `server/services/rag-version-control.ts` 생성
    - 데이터 버전 관리
    - 해시 기반 무결성 검증
    - 변경 이력 추적
  
  - `server/services/rag-tampering-detector.ts` 생성
    - 위변조 탐지
    - 해시 불일치 감지
    - 예상치 못한 변경 감지
  
  - `server/services/rag-anomaly-detector.ts` 생성
    - 이상치 데이터 탐지
    - 통계적 이상치 탐지
    - 패턴 기반 이상치 탐지
  
  - `server/routes/rag-management.ts` 확장
    - `GET /api/rag/version-control/history` - 버전 이력 조회
    - `GET /api/rag/tampering-detection/list` - 위변조 탐지 목록
    - `GET /api/rag/anomaly-detection/list` - 이상치 탐지 목록
    - `POST /api/rag/data-processing/log` - 데이터 가공 처리 로그 기록

- **프론트엔드 측 (Frontend)**
  - 형상관리 탭 추가
    - 버전 이력 표시
    - 위변조 탐지 목록
    - 이상치 탐지 목록
    - 데이터 가공 처리 로그

#### 기대 효과
- 데이터 무결성 보장
- 위변조 조기 발견
- 감사 추적 가능

---

### 2.2 출력 프롬프트 가드레일

#### 목표
- 출력 프롬프트에서 중요 정보나 AI 모델 정보 노출 방지
- 시스템 프롬프트 내 제한사항 확인

#### 구현 내용
- **서버 측 (Backend)**
  - `server/services/rag-output-guardrails.ts` 생성
    - 출력 프롬프트 검증
    - 중요 정보 마스킹
    - AI 모델 정보 제거
    - 금융 규정 위반 응답 차단
  
  - 기존 `server/services/guardrails.ts` 확장
    - 출력 프롬프트 가드레일 통합
    - Azure AI Foundry Safety Filter 적용
  
  - `server/routes/rag-management.ts` 확장
    - `POST /api/rag/output/validate` - 출력 프롬프트 검증
    - `GET /api/rag/guardrails/policies` - 가드레일 정책 조회

- **프론트엔드 측 (Frontend)**
  - 가드레일 설정 UI 추가
    - 출력 프롬프트 제한사항 설정
    - 정책 관리

#### 가드레일 규칙
- 시스템 정보, API 키, 내부 로직 노출 방지
- 개인정보 노출 방지
- 금융 규정 위반 응답 차단
- 참조 문서의 지시문은 단순 정보로만 취급

#### 기대 효과
- 중요 정보 노출 방지
- 규정 준수 보장

---

### 2.3 입력 프롬프트 가드레일

#### 목표
- 사용자가 직접 입력하지 않더라도 들어가는 정보에 대한 개인정보 및 중요정보 검증
- 감사용 로그 기록

#### 구현 내용
- **서버 측 (Backend)**
  - `server/services/rag-input-guardrails.ts` 생성
    - 입력 프롬프트 검증
    - 개인정보 탐지
    - 중요정보 탐지
    - 프롬프트 인젝션 공격 탐지
  
  - 기존 `server/services/guardrails.ts` 확장
    - 입력 프롬프트 가드레일 통합
  
  - `server/routes/rag-management.ts` 확장
    - `POST /api/rag/input/validate` - 입력 프롬프트 검증
    - `GET /api/rag/input/logs` - 입력 프롬프트 로그 조회

- **프론트엔드 측 (Frontend)**
  - 입력 가드레일 로그 UI 추가
    - 검증 이력 표시
    - 탐지된 위험 항목 표시

#### 기대 효과
- 프롬프트 인젝션 공격 방지
- 개인정보 보호
- 감사 추적 가능

---

### 2.4 적대적 공격 모니터링

#### 목표
- 프롬프트 인젝션 공격 예방
- 적대적 공격 탐지 및 대응

#### 구현 내용
- **서버 측 (Backend)**
  - `server/services/rag-adversarial-monitor.ts` 생성
    - 프롬프트 인젝션 탐지
    - Jailbreak 탐지
    - 적대적 공격 패턴 분석
    - 실시간 모니터링
  
  - Azure AI Foundry 통합
    - Prompt Shield 활성화
    - Safety Filter 적용
    - Guardrails 규칙 설정
  
  - `server/routes/rag-management.ts` 확장
    - `GET /api/rag/adversarial/events` - 적대적 공격 이벤트 조회
    - `POST /api/rag/adversarial/test` - 벤치마크 테스트 실행

- **프론트엔드 측 (Frontend)**
  - 적대적 공격 모니터링 대시보드
    - 공격 이벤트 목록
    - 공격 패턴 분석
    - 벤치마크 테스트 결과

#### 기대 효과
- 보안 위협 조기 발견
- 자동 대응 가능

---

### 2.5 정책 문서 및 매뉴얼

#### 목표
- 프롬프트, Azure 보안 서비스 구축 등에 대한 매뉴얼 작성

#### 구현 내용
- **문서 작성**
  - `docs/security/RAG_SECURITY_POLICY.md` 생성
    - 시스템 프롬프트 제한사항
    - 가드레일 정책
    - 보안 절차
  
  - `docs/security/AZURE_SECURITY_MANUAL.md` 생성
    - Azure AI Foundry 설정
    - Prompt Shield 설정
    - Safety Filter 설정
  
  - `docs/security/ADVERSARIAL_ATTACK_RESPONSE.md` 생성
    - 적대적 공격 대응 방안
    - 정책 문서

#### 기대 효과
- 감사 대응 문서 준비
- 운영 매뉴얼 제공

---

### 2.6 벤치마크 테스트

#### 목표
- 적대적 벤치마크 테스트 결과 생성
- JSON 파일로 제출 가능한 형식

#### 구현 내용
- **서버 측 (Backend)**
  - `server/services/rag-benchmark-tester.ts` 생성
    - 벤치마크 테스트 실행
    - 테스트 결과 수집
    - JSON 형식으로 결과 저장
  
  - `server/routes/rag-management.ts` 확장
    - `POST /api/rag/benchmark/run` - 벤치마크 테스트 실행
    - `GET /api/rag/benchmark/results` - 테스트 결과 조회
    - `GET /api/rag/benchmark/export` - 테스트 결과 내보내기

- **프론트엔드 측 (Frontend)**
  - 벤치마크 테스트 UI
    - 테스트 실행 버튼
    - 결과 표시
    - JSON 다운로드

#### 기대 효과
- 감사 제출 자료 준비
- 보안 수준 검증

---

### 2.7 킬스위치 기능

#### 목표
- 심각한 문제 발생 시 즉각 서비스 중단
- 감사 로깅 조회 및 분석

#### 구현 내용
- **데이터베이스 스키마 확장**
  - `system_killswitch` 테이블 추가
    - 활성화 여부
    - 활성화 사유
    - 활성화 시점
    - 활성화자 정보

- **서버 측 (Backend)**
  - `server/services/killswitch-manager.ts` 생성
    - 킬스위치 활성화/비활성화
    - 서비스 중단 처리
    - 로깅
  
  - `server/routes/system.ts` 생성 또는 확장
    - `POST /api/system/killswitch/activate` - 킬스위치 활성화
    - `POST /api/system/killswitch/deactivate` - 킬스위치 비활성화
    - `GET /api/system/killswitch/status` - 킬스위치 상태 조회

- **프론트엔드 측 (Frontend)**
  - 킬스위치 UI 추가
    - 즉각 서비스 중단 버튼
    - 상태 표시
    - 활성화 이력

#### 기대 효과
- 긴급 상황 대응 가능
- 서비스 안정성 향상

---

### 2.8 로깅 개선

#### 목표
- 사용자별 구분 가능한 로깅
- 가드레일 탐지 로깅 구분
- 1년 이상 로그 저장

#### 구현 내용
- **데이터베이스 스키마 확장**
  - 기존 `audit_logs` 테이블 활용
    - `user_identifier` 필드 추가 (사용자 구분자)
    - `guardrail_detected` 필드 추가 (가드레일 탐지 여부)
    - `guardrail_type` 필드 추가 (가드레일 유형)
  
  - `audit_logs_archive` 테이블 활용
    - 1년 이상 된 로그 자동 아카이브
    - 아카이브 정책 설정

- **서버 측 (Backend)**
  - `server/services/enhanced-audit-logger.ts` 생성
    - 사용자별 구분 로깅
    - 가드레일 탐지 로깅
    - 자동 아카이브 스케줄러
  
  - `server/routes/audit-logs.ts` 확장
    - `GET /api/audit-logs` - 필터링된 로그 조회
      - 사용자별 필터
      - 가드레일 탐지 필터
      - 기간 필터

- **프론트엔드 측 (Frontend)**
  - 감사 로그 UI 개선
    - 사용자별 필터
    - 가드레일 탐지 필터
    - 로그 보관 기간 표시

#### 기대 효과
- 상세한 감사 추적
- 감사 요구사항 충족

---

## 3. 구현 우선순위

### Phase 1: RAG 핵심 기능 (1-2주)
1. AI Search 연결 관리자
2. RAG 검색 및 AI 챗봇 (기본)
3. 메타데이터 추출 및 CosmosDB 저장 (기본)

### Phase 2: 벡터 임베딩 관리 (2-3주)
1. AI Search Vector 임베딩 관리자
2. 증분식 임베딩 로직
3. 백그라운드 작업 스케줄러

### Phase 3: 보안 기능 (2-3주)
1. 입력/출력 프롬프트 가드레일
2. 적대적 공격 모니터링
3. RAG 참조데이터 형상관리

### Phase 4: 감사 대응 (1-2주)
1. 로깅 개선
2. 킬스위치 기능
3. 벤치마크 테스트
4. 정책 문서 작성

---

## 4. 기술 스택 및 아키텍처

### 백엔드
- **언어**: TypeScript/Node.js
- **프레임워크**: Express
- **데이터베이스**: 
  - PostgreSQL (메타데이터, 로그)
  - CosmosDB (메타데이터 저장)
  - Azure AI Search (벡터 검색)
- **서비스**:
  - Azure OpenAI (임베딩, 챗봇)
  - Azure Databricks (데이터 소스)
  - Azure AI Foundry (Safety Filter)

### 프론트엔드
- **언어**: TypeScript/React
- **프레임워크**: React + Vite
- **UI 라이브러리**: shadcn/ui
- **상태 관리**: TanStack Query

---

## 5. 데이터베이스 스키마 확장

### 새로 추가할 테이블

1. **rag_embedding_schemas**
   - 스키마 관리

2. **rag_embedding_jobs**
   - 임베딩 작업 관리

3. **rag_embedding_status**
   - 임베딩 상태 추적

4. **rag_metadata**
   - 메타데이터 저장 (PostgreSQL)

5. **rag_data_version_control**
   - 버전 관리

6. **rag_data_tampering_detection**
   - 위변조 탐지

7. **rag_data_anomaly_detection**
   - 이상치 탐지

8. **system_killswitch**
   - 킬스위치 관리

### 기존 테이블 확장

1. **audit_logs**
   - `user_identifier` 필드 추가
   - `guardrail_detected` 필드 추가
   - `guardrail_type` 필드 추가

---

## 6. API 엔드포인트 설계

### RAG 관리 API

```
GET    /api/rag/connection/status
GET    /api/rag/connection/test
GET    /api/rag/connection/config

GET    /api/rag/embedding/schemas
POST   /api/rag/embedding/schemas
PUT    /api/rag/embedding/schemas/:id
DELETE /api/rag/embedding/schemas/:id
GET    /api/rag/embedding/schemas/:id/status
POST   /api/rag/embedding/schemas/:id/embed
GET    /api/rag/embedding/jobs
GET    /api/rag/embedding/jobs/:id

GET    /api/rag/metadata
POST   /api/rag/metadata/extract

POST   /api/rag/search
POST   /api/rag/chat
GET    /api/rag/chat/history

POST   /api/rag/index/create
POST   /api/rag/index/deploy
GET    /api/rag/index/status
```

### 보안 및 감사 API

```
GET    /api/rag/version-control/history
GET    /api/rag/tampering-detection/list
GET    /api/rag/anomaly-detection/list
POST   /api/rag/data-processing/log

POST   /api/rag/output/validate
GET    /api/rag/guardrails/policies

POST   /api/rag/input/validate
GET    /api/rag/input/logs

GET    /api/rag/adversarial/events
POST   /api/rag/adversarial/test

POST   /api/rag/benchmark/run
GET    /api/rag/benchmark/results
GET    /api/rag/benchmark/export

POST   /api/system/killswitch/activate
POST   /api/system/killswitch/deactivate
GET    /api/system/killswitch/status
```

---

## 7. 프론트엔드 페이지 설계

### RAG 관리자 페이지 (`/rag-management`)

#### 탭 구성
1. **연결 관리**
   - AI Search 연결 상태
   - 환경변수 확인
   - 연결 테스트

2. **스키마 관리**
   - 스키마 목록
   - 스키마 추가/수정/삭제
   - 스키마별 임베딩 상태

3. **임베딩 작업**
   - 작업 목록
   - 실시간 진행률
   - 수동 임베딩 실행

4. **RAG 챗봇**
   - 대화 인터페이스
   - 검색 결과 표시
   - 답변 표시

5. **형상관리**
   - 버전 이력
   - 위변조 탐지 목록
   - 이상치 탐지 목록

6. **보안 설정**
   - 입력/출력 가드레일 설정
   - 적대적 공격 모니터링
   - 벤치마크 테스트

7. **시스템 관리**
   - 킬스위치
   - 감사 로그 조회

---

## 다음 단계

1. 이 계획서 검토 및 승인
2. 데이터베이스 스키마 설계 상세화
3. API 명세서 작성
4. 개발 환경 설정
5. 단계별 구현 시작

---

## 참고 사항

- 모든 기능은 기존 코드베이스와의 호환성을 유지해야 합니다
- 보안 기능은 우선순위가 높으므로 신중하게 구현해야 합니다
- 감사 로그는 1년 이상 보관해야 하므로 아카이브 전략이 필요합니다
- 벡터 임베딩은 대용량 데이터를 처리하므로 성능 최적화가 중요합니다

