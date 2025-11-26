# 변경이력 (Changelog)

이 파일은 AITradeConsole 프로젝트의 주요 변경사항을 기록합니다.


---

## 2025-10-31

### 버그 수정 및 기능 개선

#### Azure 설정 페이지 (`azure-config.tsx`)
- CosmosDB 환경변수 이름 수정: `AZURE_COSMOSDB_ENDPOINT` → `AZURE_COSMOS_ENDPOINT`
- CosmosDB 연결 테스트 로그에 실제 사용 엔드포인트 값 표시 추가
- 카드에 표시된 엔드포인트와 테스트 로그의 엔드포인트 값 일치하도록 수정

#### 프롬프트 관리 페이지 (`prompt-management.tsx`)
- ReferenceError 수정: 누락된 상태 변수 및 함수 추가
  - `isDialogOpen`, `setIsDialogOpen` 상태 추가
  - `editingPrompt`, `setEditingPrompt` 상태 추가
  - `deletePromptMutation` 추가
  - `handleSubmit` 함수 추가
- 오타 수정: `researchersFn` → `mutationFn`, `原来 expectBody` → 올바른 API 호출

#### 프롬프트 빌더 페이지 (`prompt-builder.tsx`)
- 데이터베이스 목록 표시 문제 수정
  - API 응답 구조에 맞게 문자열 배열/객체 배열 모두 처리하도록 개선
  - 테이블 목록 조회 로직 개선

#### OpenAI 서비스 (`openai.ts`)
- JSON 파싱 오류 수정: AI가 markdown 코드 블록 형태로 JSON을 반환하는 경우 처리
  - `parseJsonResponse` 함수 추가 및 export
  - markdown 코드 블록(```json ... ```)에서 JSON 추출
  - JSON 객체 패턴 매칭으로 안전한 파싱
- OpenAI PTU/Embedding 테스트 실패 수정
  - `defaultHeaders`에서 중복된 `api-key` 헤더 제거
  - OpenAI 클라이언트 초기화 시 헤더 중복 문제 해결

#### Azure AI Search 서비스 (`azure-search.ts`)
- 인증 방식 변경: Managed Identity → APIKey 인증
  - `ChainedTokenCredential` 인증 실패 문제 해결
  - `AzureKeyCredential`을 사용한 APIKey 기반 인증으로 전환
  - 환경변수 `AZURE_SEARCH_API_KEY` 지원 추가

#### Dashboard 페이지 (`dashboard.tsx`)
- Azure OpenAI/AI Search 연결 상태 확인 로직 수정
  - AI Search 서비스 초기화 시 인덱스 이름 필요하도록 수정
  - OpenAI 연결 테스트 시 `generateCompletion` 함수 호출 방식 수정

#### API 관리 페이지 (`api-management.tsx`)
- API 테스트 엔드포인트 수정: `/api/api-calls/test` → `/api/api-calls/:id/test`
- 요청 페이로드 구조 수정: `{ apiCallId, inputData }` → `{ testPayload: inputData }`
- ORM을 통한 API 호출 기능 확인 및 정상 동작 확인

#### JSON 프롬프트 실행 엔진 (`json-prompt-execution-engine.ts`)
- JSON 파싱 오류 처리 개선
  - `parseJsonResponse` 함수 import 및 사용
  - markdown 코드 블록 처리 지원

---

## 2025-10-30

### 문서 업데이트
- 모든 문서의 날짜를 2025-10-30로 업데이트
- 문서 아카이빙 완료 (docs/archive/2025-10-30/)

### 주요 변경사항
- SQLite 완전 제거, PostgreSQL 전용으로 전환
- Azure 환경 전용 설정 적용
- 샘플 데이터 생성 기능 추가
- Docker 배포 지원

### 문서 생성 및 자동화
- 메뉴별 종합 분석 문서 생성 (2025-10-30_menu-comprehensive-analysis.md)
- 변경이력 자동화 설정
- 문서 날짜 업데이트 및 아카이빙 스크립트 생성
- 배포 준비 통합 스크립트 생성

### 스크립트 생성
- `scripts/update-doc-dates.sh` - 문서 날짜 업데이트 및 아카이빙
- `scripts/generate-comprehensive-menu-analysis.sh` - 종합 분석 문서 생성
- `scripts/generate-changelog.sh` - 변경이력 생성 (중복 방지)
- `scripts/prepare-deployment.sh` - 배포 준비 통합 스크립트

### npm 스크립트 추가
- `npm run docs:update` - 문서 날짜 업데이트
- `npm run docs:analysis` - 종합 분석 문서 생성
- `npm run docs:changelog` - 변경이력 생성
- `npm run deploy:prepare` - 배포 준비 (모두 실행)
