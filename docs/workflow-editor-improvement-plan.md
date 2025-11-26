# 워크플로우 에디터 개선 작업 계획서

## 작업 일시
2025-11-01

## 목표
워크플로우 에디터의 핵심 기능을 강화하여 모든 워크플로우 기능이 이 에디터 중심으로 원활하게 동작하도록 개선

## 작업 항목 분석

### 1. 워크플로우 편집기 배경 그리드 형태 수정 및 규칙 검증 강화

**현재 상태**:
- Background 컴포넌트가 있지만 opacity가 낮아 캔바스 느낌이 약함
- validateConnection에 일부 규칙이 있지만 첫 노드 추가 시 규칙 위배 메시지가 잘못 표시됨
- 순환 연결 금지는 구현되어 있음
- 플로우 제어 노드의 구체적인 규칙이 부족함

**필요한 작업**:
- 배경 그리드 스타일 강화 (캔바스 느낌)
- 노드 추가 시 규칙 검증 로직 추가 (첫 노드 추가 시 start 노드 필요, 순환 연결 금지)
- 플로우 제어 노드 규칙 추가:
  - condition: 조건 분기 노드, True/False 분기 필요
  - merge: 병합 노드, 여러 입력을 하나로 병합
  - loop: 반복 노드, 배열 데이터와 함께 사용
  - branch: 병렬 분기 노드

**영향 범위**:
- `client/src/components/workflow/workflow-canvas.tsx`: 배경 스타일 수정
- `client/src/components/workflow/workflow-canvas.tsx`: validateConnection 함수 개선
- `client/src/utils/graph.ts`: 규칙 검증 함수 추가
- `client/src/pages/workflow-editor.tsx`: 노드 추가 시 규칙 검증 호출

### 2. 템플릿 워크플로우 노드 표시 형식 통일

**현재 상태**:
- 템플릿에서 로드된 노드는 applyTemplate에서 setNodes로 직접 설정
- 일반 노드 추가와 동일한 변환 과정을 거치지만, 타입 변환 시 문제가 있을 수 있음

**필요한 작업**:
- 템플릿 노드를 일반 노드와 동일한 형태로 변환
- 노드 타입 매핑 통일 (template definition의 type을 실제 노드 type으로 변환)
- WorkflowNode 컴포넌트에서 일관된 표시 보장

**영향 범위**:
- `client/src/pages/workflow-editor.tsx`: applyTemplate 함수 수정
- `client/src/components/workflow/workflow-templates.tsx`: 템플릿 정의 형식 확인
- `client/src/components/workflow/workflow-node.tsx`: 노드 표시 일관성 확인

### 3. 노드 간 데이터 공유 방식 개선 (PostgreSQL 세션 기반)

**현재 상태**:
- context.sessionData (메모리 Map)로 데이터 저장
- `prepareNodeInput`에서 `context.sessionData.get()`으로 이전 노드 출력 참조
- `saveNodeExecution`으로 실행 기록만 저장
- PostgreSQL `workflow_session_data` 테이블에 실제 데이터 저장 로직 부족

**필요한 작업**:
- 노드 실행 완료 후 PostgreSQL `workflow_session_data` 테이블에 출력 데이터 저장
- 다음 노드 실행 시 PostgreSQL에서 이전 노드 출력 데이터 조회
- 세션 데이터 키 명명 규칙 통일 (`${nodeId}_output`)
- 데이터 타입 및 스키마 검증

**영향 범위**:
- `server/services/workflow-execution-engine.ts`: 
  - `executeNode` 후 세션 데이터 저장 로직 추가
  - `prepareNodeInput`에서 PostgreSQL 조회 로직 추가
- `server/storage.ts`: 세션 데이터 조회/저장 메서드 추가
- `shared/schema.ts`: 스키마 검증 (이미 적절함)

### 4. Python 노드 실행 기능 분석 및 보완

**현재 상태**:
- `python-execution-engine.ts`에 Python 실행 로직 구현됨
- 로컬 Python 실행만 지원 (spawn으로 python3 실행)
- Notebook LM 연동 없음

**필요한 작업**:
- Notebook LM 연동 검토 및 구현 (필요 시)
- Python 실행 환경 검증 개선
- requirements.txt 설치 로직 검증
- 실행 결과를 PostgreSQL에 저장하는 로직 확인

**영향 범위**:
- `server/services/python-execution-engine.ts`: Notebook LM 연동 추가 (필요 시)
- `server/services/workflow-execution-engine.ts`: Python 노드 실행 호출 확인
- 스키마: 변경 불필요 (이미 workflow_session_data에 저장됨)

### 5. 좌측 노드 목록 수직 스크롤 수정

**현재 상태**:
- `node-palette.tsx`에 `overflow-y-auto` 클래스가 있음
- CardContent에 `overflow-y-auto` 적용됨
- 높이 제한이 명확하지 않을 수 있음

**필요한 작업**:
- 노드 팔레트 높이 명확히 지정
- 스크롤 영역 명확히 설정
- 카테고리별 스크롤 또는 전체 스크롤 결정

**영향 범위**:
- `client/src/components/workflow/node-palette.tsx`: 스크롤 스타일 수정

## 작업 순서

1. **Phase 1**: UI/UX 개선 (작업 1, 2, 5)
   - 배경 그리드 수정
   - 규칙 검증 강화
   - 템플릿 노드 표시 통일
   - 노드 팔레트 스크롤 수정

2. **Phase 2**: 데이터 공유 개선 (작업 3)
   - PostgreSQL 세션 데이터 저장 로직 구현
   - 노드 간 데이터 공유 로직 개선
   - 스키마 검증 및 테스트

3. **Phase 3**: Python 실행 개선 (작업 4)
   - Python 실행 기능 분석
   - Notebook LM 연동 검토
   - 실행 환경 검증 개선

4. **Phase 4**: 통합 테스트
   - 단위 테스트
   - 연동 테스트
   - 스키마 연결 테스트
   - 서비스 인터페이스 테스트

## 스키마 영향 분석

### PostgreSQL
- `workflow_sessions`: 변경 불필요 (이미 적절함)
- `workflow_node_executions`: 변경 불필요 (이미 적절함)
- `workflow_session_data`: 변경 불필요 (이미 적절함)
  - `dataKey`: `${nodeId}_output` 형식으로 통일 필요
  - `dataValue`: 노드 출력 데이터 저장
  - `createdBy`: 노드 ID 저장

### Databricks
- 변경 불필요 (데이터 소스 노드에서만 사용)

### OpenAI
- 변경 불필요 (프롬프트 노드에서 사용)

### AI Search
- 변경 불필요 (RAG 노드에서 사용)

### CosmosDB
- 변경 불필요 (현재 사용되지 않음)

## 서비스 인터페이스 검증

### 1. OpenAI 인터페이스
- `json-prompt-execution-engine.ts`: 프롬프트 실행
- 입력: 이전 노드 출력 데이터
- 출력: AI 생성 결과

### 2. Databricks 인터페이스
- `azure-databricks.ts`: SQL 쿼리 실행
- 입력: 쿼리 파라미터
- 출력: 쿼리 결과 데이터

### 3. PostgreSQL 인터페이스
- `workflow-execution-engine.ts`: 세션 데이터 저장/조회
- `storage.ts`: 데이터베이스 접근

### 4. API 인터페이스
- `api-call-engine.ts`: API 호출
- 입력: API 파라미터
- 출력: API 응답

### 5. Python 인터페이스
- `python-execution-engine.ts`: Python 스크립트 실행
- 입력: JSON 데이터
- 출력: JSON 데이터

## 예상 문제점 및 해결 방안

### 문제 1: 첫 노드 추가 시 규칙 위배 메시지
**해결**: 노드 추가 시 start 노드 여부 검증, start 노드가 아닌 경우 경고 메시지 표시

### 문제 2: 노드 간 데이터 공유가 메모리만 사용
**해결**: PostgreSQL `workflow_session_data` 테이블에 저장하도록 개선

### 문제 3: 템플릿 노드와 일반 노드 표시 형식 차이
**해결**: 템플릿 로드 시 노드 변환 로직 개선

### 문제 4: Python 실행 환경 검증 부족
**해결**: Python 환경 검증 로직 강화, Notebook LM 연동 검토

## 테스트 계획

### 단위 테스트
1. 규칙 검증 함수 테스트
2. 노드 추가 로직 테스트
3. 세션 데이터 저장/조회 테스트

### 연동 테스트
1. 워크플로우 실행 엔드투엔드 테스트
2. 노드 간 데이터 전달 테스트
3. 템플릿 로드 및 실행 테스트

### 스키마 연결 테스트
1. PostgreSQL 세션 데이터 저장 테스트
2. 세션 데이터 조회 테스트
3. 데이터 타입 검증 테스트

### 서비스 인터페이스 테스트
1. OpenAI 호출 테스트
2. Databricks 쿼리 테스트
3. Python 실행 테스트
4. API 호출 테스트

