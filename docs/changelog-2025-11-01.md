# 소스코드 변경사항 이력 - 2025-11-01

## 개요

이 문서는 2025년 11월 1일부터 수정되는 모든 소스코드, 스키마, 스크립트 등의 변경사항을 기록합니다.

**문서 시작 일시**: 2025-11-01
**마지막 업데이트**: 2025-11-01 (v1.2.3 - Python 실행 엔진 검증 완료)

---

## 변경사항 기록 형식

각 변경사항은 다음 형식으로 기록됩니다:

- **수정 일시**: YYYY-MM-DD HH:MM
- **수정된 파일**: 파일 경로 및 이름
- **해당 메뉴**: 메뉴명 및 경로
- **기능**: 변경된 기능 설명
- **스키마 변경**: 관련 스키마 변경사항 (있는 경우)
- **변경 내용**: 상세 변경 내용

---

## 2025-11-01 변경사항

### 변경사항 기록 시작

**수정 일시**: 2025-11-01
**수정된 파일**: `docs/changelog-2025-11-01.md` (신규 생성)
**해당 메뉴**: 전체 (문서화)
**기능**: 변경사항 추적 문서 생성
**스키마 변경**: 없음
**변경 내용**: 
- 소스코드, 스키마, 스크립트 변경사항 추적을 위한 문서 생성
- 앞으로 모든 변경사항을 이 문서에 기록하기 시작

---

## 변경사항 로그

### 1. 대시보드 Azure 서비스 연결상태 카드 폭 수정

**수정 일시**: 2025-11-01
**수정된 파일**: `client/src/components/common/live-status-banner.tsx`
**해당 메뉴**: 대시보드 (`/dashboard`)
**기능**: Azure 서비스 연결 상태 카드의 폭을 다른 카드와 동일하게 수정
**스키마 변경**: 없음
**변경 내용**:
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`를 `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4`로 수정
- xl 브레이크포인트에서도 grid-cols-4를 명시적으로 설정하여 카드 폭 일관성 확보

---

### 2. Azure Databricks 에러 메시지 [object Object] 수정

**수정 일시**: 2025-11-01
**수정된 파일**: 
- `server/services/azure-databricks.ts`
- `server/routes.ts` (라인 10150-10198)
**해당 메뉴**: 대시보드 (`/dashboard`) - Azure 서비스 연결 상태
**기능**: Databricks 쿼리 실행 실패 시 에러 객체를 적절한 문자열로 변환하여 표시
**스키마 변경**: 없음
**변경 내용**:
- `azure-databricks.ts`의 `executeQuery` 함수에서 에러 처리 개선
- 에러 객체를 적절히 파싱하여 `error.message`, `error.error`, 또는 JSON 문자열로 변환
- `routes.ts`의 `/api/azure/databricks/query` 엔드포인트에서도 동일한 에러 처리 로직 적용
- 에러 객체가 문자열로 변환되지 않아 "[object Object]"가 표시되던 문제 해결

---

### 3. AI 지능형검색 카드 추천 검색어 개선

**수정 일시**: 2025-11-01
**수정된 파일**: `server/services/prompt-inference.ts`
**해당 메뉴**: 대시보드 (`/dashboard`) - AI 지능형검색 카드
**기능**: 검색어 입력 시 입력한 단어와 관련된 추천 프롬프트가 표시되도록 개선
**스키마 변경**: 없음
**변경 내용**:
- `generateRealTimeSuggestions` 함수 개선:
  1. 입력 키워드와 프롬프트 템플릿의 패턴 매칭 강화
  2. 텍스트 포함 여부 기반 매칭 추가 (입력 단어가 프롬프트 텍스트에 포함되는지 확인)
  3. 스마트 완성 기능 추가 (입력 단어가 트리거 단어와 일치하면 관련 프롬프트 표시)
  4. 자동 완성 기능 강화
  5. 중복 제거 및 신뢰도 기반 정렬 개선
  6. 최대 제안 수를 4개에서 8개로 증가
- 입력한 검색어와 관련된 프롬프트가 더 정확하게 표시되도록 개선

---

### 4. AI 지능형검색 검색 결과 0 문제 수정

**수정 일시**: 2025-11-01
**수정된 파일**: `server/routes.ts` (라인 2491-2534)
**해당 메뉴**: 대시보드 (`/dashboard`) - AI 지능형검색 카드
**기능**: 검색 API 응답에 `combined` 필드 추가하여 프론트엔드와 호환성 확보
**스키마 변경**: 없음
**변경 내용**:
- `/api/search` 엔드포인트 응답에 `combined` 필드 추가
- 프론트엔드에서 `data.combined`를 사용하는데 API 응답에 `results`만 있어서 발생하던 문제 해결
- 기존 `results` 필드는 유지하여 하위 호환성 보장
- 검색 결과가 정상적으로 표시되도록 수정

**참고사항**:
- 검색 결과가 실제로 0인 경우는 데이터베이스에 데이터가 없거나 임베딩이 생성되지 않은 경우일 수 있음
- 검색 기능 자체는 정상 작동하며, 결과는 데이터 존재 여부에 따라 달라짐
- 키워드 기반 검색(`keywordOnlySearch`)도 함께 지원하여 임베딩 생성 실패 시에도 검색 가능

---

### 5. Azure 설정 페이지 Databricks 테스트 에러 메시지 개선

**수정 일시**: 2025-11-01
**수정된 파일**: 
- `server/routes.ts` (라인 11426-11511)
- `server/services/azure-databricks.ts` (라인 144-173)
**해당 메뉴**: Azure 서비스 설정 (`/azure-config`)
**기능**: Databricks 연결 테스트 시 발생하는 에러 메시지 "[object Object]" 문제 해결
**스키마 변경**: 없음
**변경 내용**:
- `/api/azure/test/databricks` 엔드포인트의 에러 처리 로직 개선
  - 에러 객체를 적절한 문자열로 변환하는 로직 추가
  - Error 객체, 문자열, 일반 객체 등 다양한 에러 형식 처리
  - `error.message`, `error.error`, `error.detail` 등의 속성을 우선적으로 확인
  - 객체인 경우 JSON.stringify로 변환하여 의미 있는 정보 제공
- `azure-databricks.ts`의 `initialize()` 메서드 에러 처리 개선
  - 에러 메시지를 추출하는 로직을 `executeQuery()`와 동일하게 개선
  - 연결 실패 시 구체적인 에러 메시지 제공
- 에러 발생 시 "[object Object]" 대신 실제 에러 메시지가 표시되도록 수정
- 다양한 Databricks 에러 형식에 대응하여 사용자에게 명확한 정보 제공

**참고사항**:
- Databricks 연결 테스트는 실제 연결을 시도하므로 설정이 올바르지 않으면 에러가 발생할 수 있음
- 에러 메시지가 구체적으로 표시되어 연결 문제를 더 쉽게 진단 가능
- 환경변수 설정(DATABRICKS_SERVER_HOSTNAME, DATABRICKS_HTTP_PATH, DATABRICKS_TOKEN)이 올바른지 확인 필요

---

### 6. 홈페이지 AI 어시스턴트 예시 프롬프트 UI 개선 및 메시지 전송 오류 수정

**수정 일시**: 2025-11-01
**수정된 파일**: 
- `client/src/components/chat/ai-chat-interface.tsx`
**해당 메뉴**: 홈페이지 (`/`)
**기능**: 
1. 예시 프롬프트를 카드 형태에서 심플한 텍스트 형태로 변경
2. 메시지 전송 시 발생하는 "메시지 전송에 실패했습니다." 오류 수정
**스키마 변경**: 없음
**변경 내용**:
- **예시 프롬프트 UI 개선**:
  - 카드 형태의 복잡한 디자인을 심플한 텍스트 버튼으로 변경
  - 아이콘, 그라디언트 배경, 글로우 효과 등 장식 요소 제거
  - `flex flex-wrap` 레이아웃으로 변경하여 반응형 텍스트 버튼 표시
  - 호버 시 배경색과 테두리 색상만 변경하는 간단한 스타일 적용
- **메시지 전송 오류 수정**:
  - `sendMessageMutation`의 `mutationFn`에서 응답의 `success` 필드를 확인하도록 수정
  - `response.json()` 호출 후 `data.success`가 `false`인 경우 에러를 throw하도록 변경
  - 에러 처리 개선: `error.message`를 우선적으로 표시하도록 수정
  - 사용하지 않는 아이콘 import 제거 (`MoreHorizontal`, `Zap`, `TrendingUp`, `Database`, `Workflow`, `FileText`, `Search`, `ArrowRight`)
- **ExamplePrompt 인터페이스 간소화**:
  - `icon`, `category`, `gradient` 속성 제거
  - `title`, `prompt` 속성만 유지

**참고사항**:
- 예시 프롬프트 클릭 시 여전히 입력창에 자동 입력되고, 전송 버튼 클릭 시 정상적으로 메시지가 전송됨
- 에러 발생 시 더 구체적인 에러 메시지가 표시됨
- UI가 더 심플하고 깔끔해져 사용성이 개선됨

---

### 7. 홈페이지 뉴스&알림 및 분석 결과 섹션 Databricks 연동 및 OpenAI 분석 기능 구현

**수정 일시**: 2025-11-01
**수정된 파일**: 
- `server/services/azure-databricks.ts` (라인 827-1135)
- `server/routes.ts` (라인 2983-3117, 3619-3733, 3041-3117)
- `client/src/components/common/news-alerts.tsx` (라인 266-343)
- `client/src/components/common/recent-analysis.tsx` (전체 파일 재구성)
- `client/src/pages/news.tsx` (신규 생성)
- `client/src/App.tsx` (라인 15, 107-111)
**해당 메뉴**: 홈페이지 (`/`), 뉴스 페이지 (`/news`)
**기능**: 
1. 뉴스&알림 섹션에서 Databricks에서 실제 뉴스 데이터 조회
2. 모든뉴스보기 페이지 구현 (Databricks 기반 전체 뉴스 목록 조회)
3. 최신 분석 결과 섹션에 OpenAI 호출을 통한 시장 분석 생성 기능
4. 분석 결과 클릭 시 뉴스 원본 데이터 팝업 표시 기능
**스키마 변경**: 없음 (기존 market_analysis 테이블의 dataSourceIds 필드 활용)
**변경 내용**:
- **Databricks 뉴스 데이터 조회 기능 추가**:
  - `azure-databricks.ts`에 `getRecentNews()` 메서드 추가
    - 최근 뉴스 데이터를 Databricks에서 조회
    - 날짜, 카테고리, 감정, 품질 필터 지원
    - 여러 테이블 위치 자동 시도 (news_data, default.news_data, main.news_data 등)
  - `azure-databricks.ts`에 `getAllNews()` 메서드 추가
    - 페이지네이션을 지원하는 전체 뉴스 조회
    - 검색 쿼리, 필터링, 정렬 기능
    - 총 개수와 hasMore 정보 제공
- **뉴스 API 개선**:
  - `/api/news-data` 엔드포인트를 Databricks 우선 조회로 수정
    - Databricks에서 먼저 조회 시도
    - 실패 시 PostgreSQL로 폴백
    - 날짜 기준 최신 데이터 조회 보장
  - `/api/news` 엔드포인트 추가 (신규)
    - 전체 뉴스 목록 조회 (페이지네이션 지원)
    - 검색, 필터링, 정렬 기능
    - Databricks 우선, PostgreSQL 폴백 구조
- **뉴스 페이지 구현** (`/news`):
  - 전체 뉴스 목록 표시 페이지 생성
  - 검색, 카테고리 필터, 감정 필터 기능
  - 페이지네이션 지원
  - 반응형 그리드 레이아웃
  - 뉴스 카드에 제목, 요약, 출처, 날짜, 키워드 등 표시
- **뉴스&알림 섹션 개선**:
  - 알림 탭에서 실제 뉴스 데이터를 기반으로 긴급 공시 정보 표시
    - 중요도 점수 80 이상 또는 고품질 뉴스만 알림으로 변환
    - 최근 24시간 이내 뉴스만 필터링
    - 감정 및 중요도에 따른 알림 타입 및 우선순위 자동 설정
  - 뉴스 탭과 알림 탭 모두 실제 Databricks 데이터 사용
  - Mock 데이터 제거
- **최신 분석 결과 섹션 개선**:
  - "분석 생성" 버튼 추가
    - 최근 10개 뉴스를 선택하여 OpenAI로 시장 분석 보고서 생성
    - OpenAI API 호출을 통한 전문가 수준의 심층 분석 보고서 생성
    - 분석 타입 선택 지원 (market, sector, macro)
  - 분석 결과에 뉴스 원본 데이터 팝업 표시 기능 추가
    - "원본 뉴스" 버튼 클릭 시 해당 분석에 사용된 뉴스 데이터 표시
    - 뉴스 제목, 내용, 출처, 날짜, 키워드 등 상세 정보 표시
  - 분석 결과 데이터 변환 로직 개선
    - dataSourceIds에서 newsIds 추출
    - confidence 점수를 accuracy로 변환
    - generatedAt 날짜 사용
- **OpenAI 분석 생성 API 추가**:
  - `/api/market-analysis/generate` 엔드포인트 추가
    - 뉴스 ID 배열을 받아 Databricks에서 뉴스 데이터 조회
    - OpenAI API를 호출하여 시장 분석 보고서 생성
    - market_analysis 테이블에 분석 결과 저장
    - dataSourceIds 필드에 뉴스 ID 저장
    - 다양한 분석 타입 지원 (market, sector, macro)
    - 실패 시 PostgreSQL 폴백 지원

**참고사항**:
- Databricks에서 뉴스 데이터를 조회할 때 여러 테이블 위치를 자동으로 시도하여 유연성 확보
- Databricks 조회 실패 시 PostgreSQL로 자동 폴백하여 안정성 확보
- 뉴스 데이터는 published_at 기준으로 최신 데이터를 우선 조회
- 분석 생성 시 최근 10개 뉴스를 자동으로 선택하여 분석
- 분석 결과는 dataSourceIds 필드에 뉴스 ID를 저장하여 추적 가능
- 알림 탭은 중요도 점수와 품질 기준으로 자동 필터링하여 긴급 공시 정보 표시

---

### 8. 스케줄러 페이지 상태 표시 레이아웃 수정 및 워크플로우 실행 엔진 연동 개선

**수정 일시**: 2025-11-01
**수정된 파일**: 
- `client/src/components/common/status-indicator.tsx` (라인 50-97)
- `client/src/pages/scheduler.tsx` (라인 343-456)
- `server/services/scheduler.ts` (라인 1-1204)
- `server/routes.ts` (라인 5265-5278, 12867-12878)
- `server/services/workflow-execution-engine.ts` (라인 99-105)
**해당 메뉴**: 스케줄러 (`/scheduler`)
**기능**: 
1. 스케줄러 제어판 및 Job Schedule 카드의 상태 표시 아이콘 레이아웃 수정
2. 워크플로우 스케줄 실행 시 실제 워크플로우 실행 엔진 연동
3. 워크플로우 실행 엔진에서 Databricks 데이터 조회 지원 확인
**스키마 변경**: 없음
**변경 내용**:
- **StatusIndicator 컴포넌트 개선**:
  - 아이콘과 레이블 겹침 문제 해결
  - 아이콘 전용 모드 추가 (className에 w- 포함 시 아이콘만 표시)
  - 레이블이 있을 때 아이콘과 레이블을 세로 배치하여 겹침 방지
  - 아이콘과 레이블을 flex-col로 배치하여 가독성 향상
- **스케줄러 페이지 레이아웃 개선**:
  - 스케줄러 제어판 카드: StatusIndicator를 아이콘 전용 모드로 사용하여 CardTitle과 겹침 방지
  - Job Schedule 카드: StatusIndicator를 세로 배치하여 텍스트 레이블과 겹침 방지
  - 상태 표시 텍스트 추가 (실행 중, 오류, 대기 등)
  - 상태 표시 영역을 flex-col로 변경하여 가독성 향상
- **워크플로우 실행 엔진 연동 개선**:
  - 스케줄러에서 워크플로우 실행 시 올바른 메서드 시그니처 사용
    - `executeWorkflow(sessionId: string)` 메서드 사용
    - `createWorkflowSession()` 메서드로 세션 생성 후 실행
  - 워크플로우 정의 파싱 로직 개선
    - JSON 문자열과 객체 모두 지원
    - 타입 안정성 향상
  - 워크플로우 스케줄 실행 시 PostgreSQL에서 워크플로우 정의 로드
  - 워크플로우 실행 완료 후 스케줄 lastRun, nextRun 업데이트
- **워크플로우 실행 API 개선**:
  - `/api/scheduler/workflows/:id/run` 엔드포인트 수정
    - 워크플로우 실행 레코드 생성
    - `executeWorkflowAsync` 함수 호출로 비동기 실행
    - 실행 ID 반환
  - `executeWorkflowAsync` 함수 개선
    - 워크플로우 세션 생성 로직 추가
    - 올바른 `executeWorkflow(sessionId)` 메서드 호출
- **Databricks 데이터 조회 연동 확인**:
  - 워크플로우 실행 엔진의 `executeDataSourceNode` 메서드에서 Databricks 지원 확인
    - `source === 'databricks'`일 때 Databricks 서비스 사용
    - `getAzureDatabricksService().executeQuery()` 메서드 호출
    - 쿼리 결과를 노드 출력으로 반환
  - PostgreSQL 폴백 지원 확인
    - `source === 'postgresql'`일 때 PostgreSQL 쿼리 실행
  - 데이터 소스 노드 설정 확인
    - `node.configuration.source` 또는 `node.data.dataSourceType` 필드 지원
    - 쿼리 파라미터 바인딩 지원
- **워크플로우 스케줄 관리 개선**:
  - `registerWorkflowSchedule` 메서드 개선
    - 워크플로우 실행 엔진과 올바르게 연동
    - 워크플로우 세션 생성 및 실행 로직 추가
    - 실행 결과 처리 및 스케줄 업데이트
  - `loadWorkflowSchedules` 메서드 확인
    - PostgreSQL에서 활성 스케줄 로드
    - 각 스케줄을 스케줄러에 등록
  - `calculateNextRun` 메서드 추가
    - cron 표현식 기반 다음 실행 시간 계산

**참고사항**:
- StatusIndicator 컴포넌트는 이제 아이콘 전용 모드와 레이블 모드를 모두 지원
- 워크플로우 스케줄은 PostgreSQL의 schedules 테이블에서 관리
- 워크플로우 실행은 PostgreSQL의 workflows, workflow_sessions, workflow_node_executions 테이블에 기록
- Databricks 데이터 조회는 워크플로우의 data_source 노드 타입에서 지원
- 워크플로우 실행 엔진은 프롬프트 노드, API 호출 노드, SQL 실행 노드, JSON 처리 노드, 데이터 변환 노드, 데이터 소스 노드, Python 스크립트 노드를 지원
- 각 노드의 실행 결과는 세션 데이터로 저장되어 다음 노드에서 참조 가능

---

### 9. 워크플로우 모니터 페이지 완전 재구성

**수정 일시**: 2025-11-01
**수정된 파일**: 
- `client/src/pages/workflow-monitor.tsx` (전체 재작성)
- `server/storage.ts` (라인 2-3, 24-28, 231-235, 8287-8331)
- `server/routes.ts` (라인 1653-1704)
**해당 메뉴**: 워크플로우 모니터 (`/workflow-monitor`)
**기능**: 
1. 워크플로우 실행 엔진과 연동된 실시간 모니터링
2. 워크플로우 세션 및 노드 실행 결과 표시
3. 워크플로우 스케줄러 연동 정보 표시
4. 세션별 상세 정보 및 데이터 조회
**스키마 변경**: 없음 (기존 스키마 활용)
**변경 내용**:
- **기존 페이지 문제점 분석**:
  - 4단계 파이프라인(A, B, C, D) 모니터링만 수행
  - 워크플로우 실행 엔진과 연동되지 않음
  - 워크플로우 세션, 노드 실행 결과 미표시
  - 워크플로우 스케줄러와 연동되지 않음
- **새로운 페이지 기능**:
  - 워크플로우 세션 목록 조회 및 필터링
    - 상태별 필터링 (대기, 실행 중, 완료, 실패, 취소됨)
    - 워크플로우별 필터링
    - 검색 기능 (세션명, 워크플로우명)
  - 세션별 상세 정보 표시
    - 세션 기본 정보 (ID, 이름, 워크플로우, 상태, 시간)
    - 워크플로우 정보
    - 메타데이터
  - 노드 실행 결과 표시
    - 노드별 실행 상태
    - 실행 시간 및 재시도 횟수
    - 입력/출력 데이터 조회
    - 오류 메시지 표시
  - 세션 데이터 조회
    - 노드 간 공유 데이터 확인
    - 데이터 타입 및 상태 정보
  - 실시간 상태 업데이트
    - WebSocket 연결 상태 표시
    - 실행 중인 세션 자동 갱신 (2초 간격)
    - 전체 세션 목록 자동 갱신 (5초 간격)
- **API 엔드포인트 추가**:
  - `GET /api/workflow-sessions`: 워크플로우 세션 목록 조회
    - 쿼리 파라미터: `workflowId`, `status`, `limit`
  - `GET /api/workflow-sessions/:sessionId`: 세션 상세 정보 조회
  - `GET /api/workflow-sessions/:sessionId/node-executions`: 세션의 노드 실행 결과 조회
  - `GET /api/workflow-sessions/:sessionId/session-data`: 세션 데이터 조회
- **Storage 메서드 추가**:
  - `getWorkflowSessions(workflowId?, filters?)`: 워크플로우 세션 목록 조회
    - `workflowId`로 필터링
    - `status`로 필터링
    - `limit`으로 개수 제한
  - `getWorkflowSession(id)`: 세션 상세 정보 조회
  - `getWorkflowSessionNodeExecutions(sessionId)`: 노드 실행 결과 조회
  - `getWorkflowSessionData(sessionId)`: 세션 데이터 조회
- **UI/UX 개선**:
  - 통계 카드: 전체, 실행 중, 완료, 실패, 대기 세션 수
  - 필터링 UI: 검색, 상태 필터, 워크플로우 필터
  - 세션 목록: 카드 형식, 선택 시 하이라이트
  - 세션 상세: 탭 구조 (개요, 노드 실행, 세션 데이터)
  - 노드 실행 결과: 아이콘, 상태 배지, 실행 시간, 입력/출력 데이터 다이얼로그
  - 세션 데이터: 데이터 키, 타입, 상태 정보, 데이터 조회 다이얼로그
- **워크플로우 스케줄러 연동**:
  - 스케줄된 워크플로우 표시
  - 스케줄 정보와 세션 정보 연결

**참고사항**:
- 기존 페이지는 `workflow-monitor.tsx.backup`으로 백업됨
- 워크플로우 세션은 PostgreSQL의 `workflow_sessions` 테이블에서 관리
- 노드 실행 결과는 PostgreSQL의 `workflow_node_executions` 테이블에 기록
- 세션 데이터는 PostgreSQL의 `workflow_session_data` 테이블에 저장
- 워크플로우 스케줄 정보는 PostgreSQL의 `schedules` 테이블에서 조회
- 실시간 업데이트는 WebSocket을 통해 이루어짐
- 실행 중인 세션은 2초 간격, 전체 목록은 5초 간격으로 자동 갱신

---

### 10. 스키마 브라우저 SQL 쿼리 에디터 자동 완성 및 드래그앤드롭 기능 구현

**수정 일시**: 2025-11-01
**수정된 파일**: 
- `client/src/pages/schema-browser.tsx` (라인 1-456, 1118-1182, 1285-1330)
- `server/routes.ts` (라인 10856-10955)
**해당 메뉴**: 스키마 브라우저 (`/schema-browser`)
**기능**: 
1. SQL 쿼리 에디터에 컬럼 자동 완성 기능 추가
2. 컬럼 드래그앤드롭 기능 추가
3. SELECT/DELETE/UPDATE 쿼리 타입 지원 확인 및 개선
4. 프롬프트 추천 기능 개선 (DELETE/UPDATE 지원)
**스키마 변경**: 없음
**변경 내용**:
- **SQL 쿼리 에디터 자동 완성 기능**:
  - 컬럼 자동 완성 트리거 패턴 구현:
    1. `table.` 입력 시 컬럼 목록 표시
    2. SQL 키워드 뒤 공백 입력 시 컬럼 목록 표시 (SELECT, FROM, WHERE, UPDATE, SET, INSERT INTO, VALUES 등)
    3. SELECT의 콤마 뒤 컬럼 목록 표시
  - 키보드 네비게이션 지원:
    - ArrowUp/Down: 자동 완성 목록 이동
    - Enter/Tab: 선택된 컬럼 삽입
    - Escape: 자동 완성 팝업 닫기
  - 마우스 호버 및 클릭으로 컬럼 선택
  - 커서 위치 기반 정확한 팝업 위치 계산
    - 텍스트 영역의 실제 폰트 크기 및 라인 높이 측정
    - 커서가 있는 줄의 정확한 위치 계산
  - 자동 완성 팝업에 컬럼명과 데이터 타입 표시
- **컬럼 드래그앤드롭 기능**:
  - 컬럼 테이블의 각 행을 드래그 가능하게 설정
  - SQL 쿼리 에디터에 드롭하여 컬럼명 삽입
  - 커서 위치에 자동으로 컬럼명 삽입
  - 드래그 시 커서 변경 (cursor-move)
  - 드롭 시 에디터에 포커스 자동 설정
- **SELECT/DELETE/UPDATE 쿼리 타입 지원**:
  - 쿼리 실행 API는 이미 SELECT, DELETE, UPDATE 모두 지원
  - SQL 에디터 레이블에 "SELECT/DELETE/UPDATE 지원" 명시
  - 프롬프트 추천에 UPDATE, DELETE 템플릿 추가
  - 쿼리 타입별 프롬프트 추천 제공
- **프롬프트 추천 기능 개선**:
  - 6가지 프롬프트 유형 제공:
    1. 시황 요약 분석 (SELECT)
    2. 주요 지표 추이 분석 (SELECT)
    3. 상위/하위 랭킹 분석 (SELECT)
    4. 데이터 업데이트 (UPDATE)
    5. 데이터 삭제 (DELETE)
    6. 통계 집계 분석 (SELECT)
  - 스키마 기반 컬럼 패턴 자동 감지:
    - timestamp/date 컬럼 감지
    - price/value 컬럼 감지
    - volume/amount 컬럼 감지
    - change/rate 컬럼 감지
    - Primary Key 컬럼 감지
  - 감지된 패턴에 따라 적절한 SQL 템플릿 자동 생성
  - 쿼리 타입별 배지 표시 (SELECT: 파랑, UPDATE: 노랑, DELETE: 빨강)
  - 프롬프트 추천 UI에 쿼리 타입 표시
- **자동 완성 상태 관리**:
  - `showAutocomplete`: 자동 완성 팝업 표시 여부
  - `autocompletePosition`: 팝업 위치 (top, left)
  - `autocompleteQuery`: 현재 입력 중인 컬럼명 부분
  - `selectedAutocompleteIndex`: 선택된 컬럼 인덱스
  - `cursorPosition`: 커서 위치
  - `sqlTextareaRef`: Textarea 참조
- **자동 완성 위치 계산 로직**:
  - `calculateCursorPosition` 함수 구현
  - 텍스트 영역의 실제 폰트 크기 및 라인 높이 측정
  - 임시 span 요소를 생성하여 텍스트 너비 측정
  - 텍스트 영역의 실제 위치와 스크롤 위치를 고려한 정확한 위치 계산
  - fixed position으로 팝업 위치 설정
- **자동 완성 선택 로직**:
  - `handleAutocompleteSelect` 함수 구현
  - 커서 앞의 텍스트에서 패턴 매칭
  - 패턴에 따라 적절한 위치에 컬럼명 삽입
  - 커서 위치 자동 업데이트
- **드래그앤드롭 핸들러**:
  - `handleColumnDragStart`: 드래그 시작 시 컬럼명 저장
  - `handleColumnDragEnd`: 드래그 종료 처리
  - `handleSqlEditorDragOver`: 드롭 가능 영역 표시
  - `handleSqlEditorDrop`: 드롭 시 컬럼명 삽입
- **UI 개선**:
  - 자동 완성 팝업 스타일링 (z-index, shadow, border)
  - 컬럼 테이블 행에 드래그 가능 표시 (cursor-move, title)
  - SQL 에디터에 사용 팁 표시

**참고사항**:
- 자동 완성은 텍스트 영역의 실제 폰트 크기와 라인 높이를 측정하여 정확한 위치 계산
- 자동 완성 팝업은 fixed position으로 설정되어 스크롤에 영향받지 않음
- 드래그앤드롭은 HTML5 Drag and Drop API 사용
- 프롬프트 추천은 스키마를 분석하여 컬럼 패턴을 자동 감지하고 적절한 SQL 템플릿 생성
- UPDATE/DELETE 쿼리는 주의해서 사용해야 하므로 프롬프트 추천에서 명확히 구분 표시
- 쿼리 실행 API는 SELECT, DELETE, UPDATE 모두 지원하므로 타입 제한 없음

---

### 49. 시스템 통합 테스트 및 단위 테스트 페이지 삭제

**수정 일시**: 2025-11-01
**수정된 파일**: 
- `client/src/App.tsx` (라인 41-42, 150-160)
- `client/src/config/menu-config.ts` (라인 225-240)
**해당 메뉴**: 시스템 통합 테스트 (`/system-test`), 단위 테스트 (`/unit-testing`)
**기능**: 불필요한 테스트 페이지 제거
**스키마 변경**: 없음
**변경 내용**:
- `SystemTestDashboard`, `UnitTesting` import 제거
- `/system-test`, `/unit-testing` Route 제거
- "시스템 통합 테스트", "단위 테스트" 메뉴 항목 삭제
- 실제 페이지 파일은 백업 목적으로 유지

---

### 50. Python 실행 엔진 실질적인 검증 테스트 구현

**수정 일시**: 2025-11-01
**수정된 파일**: 
- `server/__tests__/python-execution-engine.test.ts` (신규 생성)
- `scripts/verify-python-execution.mjs` (신규 생성)
- `scripts/test-python-comprehensive.mjs` (신규 생성)
- `scripts/test-python-api.sh` (신규 생성)
- `scripts/test-python-direct.js` (신규 생성)
- `docs/python-execution-verification.md` (신규 생성)
**해당 메뉴**: Python 스크립트 관리 (`/python-management`)
**기능**: Python 실행 엔진이 실제로 작동하는지 검증
**스키마 변경**: 없음
**변경 내용**:
- **Python 환경 검증**: Python 3.13.3 설치 확인
- **실제 실행 검증**: 7가지 시나리오 테스트 (모두 통과)
  1. 기본 계산: `10 + 20 = 30` 정확히 계산
  2. 리스트 처리: 입력 데이터 `[1,2,3,4,5]` 합계 `15` 정확히 계산
  3. 딕셔너리 집계: 복잡한 데이터 구조 처리 및 집계
  4. 날짜/시간 처리: `datetime` 모듈 사용하여 시간 계산
  5. 문자열 처리: 단어 수, 문자 수, 대문자 변환
  6. 조건부 처리: 점수 기반 등급 판정 (A/B/C)
  7. 반복문 처리: 짝수/홀수 필터링 및 합계
- **검증 스크립트**:
  - `verify-python-execution.mjs`: 기본 실행 검증
  - `test-python-comprehensive.mjs`: 포괄적 검증 (7가지 테스트)
  - `test-python-api.sh`: API 테스트 (서버 실행 시)
  - `test-python-direct.js`: 직접 실행 테스트
- **Jest 테스트 파일**: `python-execution-engine.test.ts` 생성
- **검증 문서**: `python-execution-verification.md` 작성
- **검증 결과**: Python 실행 엔진이 정상적으로 작동함을 확인
  - 임시 디렉토리 생성 및 파일 생성 정상
  - Python 프로세스 실행 정상
  - 입력 데이터 처리 정상
  - 계산 결과 정확성 확인
  - JSON 출력 정상
  - 임시 파일 정리 정상

---

### 51. 전체 진행률 문서 업데이트 (v1.2.3)

**수정 일시**: 2025-11-01
**수정된 파일**: `docs/FUNCTION_LIST_AND_COMPLETION_RATE.md`
**해당 메뉴**: 전체 (문서화)
**기능**: 오늘 작업 내용 반영하여 진행률 업데이트
**스키마 변경**: 없음
**변경 내용**:
- **v1.2.3 주요 개선사항** 섹션 추가:
  1. Python 스크립트 관리 시스템 구현 (새 기능)
  2. 프롬프트/API 관리 개선
  3. 불필요한 기능 제거 (분석 리포팅, 품질 평가, 시스템 테스트)
- **전체 기능 현황 요약** 업데이트:
  - 페이지 수: 36개 → 29개
  - AI 시스템 관리: 10개 → 11개 페이지
  - 워크플로우 관리 평균 완성도: 85% → 88% (+3%p)
  - AI 시스템 관리 평균 완성도: 78% → 80% (+2%p)
  - 전체 평균 완성도: 68% → 70% (+2%p)
- **상세 기능 목록** 업데이트:
  - Python 스크립트 관리 기능 추가 (CRUD, 워크플로우 통합, 설정 관리)
  - 프롬프트/API 관리 기능 완성도 향상
  - 워크플로우 편집기 등록된 리소스 통합 기능 추가
- **백엔드 서비스 완성도** 업데이트:
  - Workflow Engine: 등록된 리소스 통합 추가
  - Python Execution Engine 추가 (85%)
- **통계 요약** 업데이트:
  - 전체 페이지 수: 29개
  - 전체 기능 수: 115개+
  - 완성도 90% 이상: 20개 (17%)
  - 완성도 80% 이상: 42개 (37%)
  - 완성도 70% 이상: 55개 (48%)
  - 완성도 60% 이하: 35개 (30%)
- **업데이트 내역** 섹션에 v1.2.3 추가

---

