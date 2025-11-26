# 로그 시스템 가이드

NH Investment & Securities AI 플랫폼의 로그 기록 시스템에 대한 종합 가이드입니다.

## 목차
1. [로그 시스템 개요](#로그-시스템-개요)
2. [Activity Logger](#activity-logger)
3. [Error Logger](#error-logger)
4. [HTTP Request Logger](#http-request-logger)
5. [Frontend Error Logger](#frontend-error-logger)
6. [로그 파일 구조](#로그-파일-구조)
7. [로그 조회 방법](#로그-조회-방법)

---

## 로그 시스템 개요

플랫폼은 다음 4가지 로깅 시스템을 사용합니다:

| 로깅 시스템 | 목적 | 파일 위치 | 로그 저장 위치 |
|------------|------|----------|-------------|
| **Activity Logger** | 사용자 활동 및 시스템 이벤트 추적 | `server/services/activity-logger.ts` | `logs/activity.log` |
| **Error Logger** | 에러 발생 추적 및 디버깅 | `server/services/error-logger.ts` | `logs/error-YYYY-MM-DD.log` |
| **HTTP Request Logger** | API 요청/응답 모니터링 | `server/index.ts` | 콘솔 출력 |
| **Frontend Error Logger** | 클라이언트 측 에러 추적 | `client/src/lib/error-logger.ts` | 백엔드 전송 |

---

## Activity Logger

### 개요
사용자 활동, 시스템 이벤트, 설정 확인 등을 기록하는 핵심 로깅 시스템입니다.

### 주요 기능
- **중복 제거**: 1초 이내 동일한 로그는 자동 필터링
- **민감 정보 마스킹**: 키, 토큰, 비밀번호 등 자동 마스킹 (앞 4자 + ... + 뒤 4자)
- **구조화된 로그**: JSON 형식으로 저장하여 파싱 용이

### 로그 타입

```typescript
type ActivityType = 
  | 'env_var'           // 환경 변수 확인
  | 'workflow'          // 워크플로우 실행
  | 'api'               // API 호출
  | 'api_call'          // API 요청
  | 'prompt'            // 프롬프트 실행
  | 'init'              // 서비스 초기화
  | 'page_load'         // 페이지 로딩
  | 'menu_click'        // 메뉴 클릭
  | 'button_click'      // 버튼 클릭
  | 'config_check'      // 설정 확인
  | 'form_submit'       // 폼 제출
  | 'search'            // 검색 실행
  | 'tab_change'        // 탭 변경
  | 'frontend_event';   // 프론트엔드 이벤트
```

### 사용 예시

#### 1. 환경 변수 확인 로깅
**시점**: Azure 서비스 설정 로딩 시
```typescript
// server/services/azure-config.ts
activityLogger.logConfigCheck(
  'Databricks',                    // 서비스 이름
  'DATABRICKS_SERVER_HOSTNAME',    // 설정 키
  !!serverHostname,                // 존재 여부
  serverHostname                   // 값 (자동 마스킹)
);
```

**로그 포맷**:
```json
{
  "timestamp": "2025-10-30T12:34:56.789Z",
  "type": "config_check",
  "action": "Databricks_DATABRICKS_SERVER_HOSTNAME",
  "details": {
    "serviceName": "Databricks",
    "configKey": "DATABRICKS_SERVER_HOSTNAME",
    "envVarExists": true,
    "envVarValue": "adb-1234...5678.azuredatabricks.net"
  }
}
```

#### 2. API 호출 로깅
**시점**: REST API 요청 처리 시
```typescript
// server/routes.ts
activityLogger.logApiCall(
  'generate-ai-analysis',    // 엔드포인트 이름
  'POST',                    // HTTP 메서드
  200,                       // 상태 코드 (선택)
  1234,                      // 실행 시간(ms) (선택)
  { rowCount: 100 }          // 메타데이터 (선택)
);
```

**로그 포맷**:
```json
{
  "timestamp": "2025-10-30T12:35:00.123Z",
  "type": "api",
  "action": "POST generate-ai-analysis",
  "details": {
    "endpoint": "generate-ai-analysis",
    "method": "POST",
    "statusCode": 200,
    "duration": 1234,
    "metadata": { "rowCount": 100 }
  }
}
```

#### 3. 워크플로우 실행 로깅
**시점**: 워크플로우 시작/완료/실패 시
```typescript
// server/services/workflow-execution-engine.ts
activityLogger.logWorkflow(
  'start',              // 액션 (start/complete/fail)
  workflow.id,          // 워크플로우 ID
  workflow.name,        // 워크플로우 이름
  {
    executionId: execId,
    status: 'running'
  }
);
```

**로그 포맷**:
```json
{
  "timestamp": "2025-10-30T12:40:00.000Z",
  "type": "workflow",
  "action": "start",
  "details": {
    "workflowId": "wf-123",
    "workflowName": "Daily Market Analysis",
    "executionId": "exec-456",
    "status": "running"
  }
}
```

#### 4. 사용자 이벤트 로깅
**시점**: 사용자가 페이지 로드, 메뉴 클릭 시
```typescript
// 페이지 로드
activityLogger.logPageLoad('/dashboard', { userId: 'user123' });

// 메뉴 클릭
activityLogger.logMenuClick('workflow-editor', 'main-sidebar');

// 버튼 클릭
activityLogger.logButtonClick('execute-workflow', { workflowId: 'wf-123' });
```

### 활용 메서드

| 메서드 | 설명 | 파라미터 |
|--------|------|----------|
| `logConfigCheck()` | Azure 서비스 설정 확인 | serviceName, configKey, exists, value |
| `logApiCall()` | API 호출 기록 | endpoint, method, statusCode?, duration?, metadata? |
| `logWorkflow()` | 워크플로우 이벤트 | action, workflowId, workflowName, details? |
| `logEnvVar()` | 환경 변수 확인 | varName, exists, value? |
| `logPrompt()` | 프롬프트 실행 | action, promptId, promptName, details? |
| `logInit()` | 서비스 초기화 | serviceName, success, error? |
| `logPageLoad()` | 페이지 로딩 | pageName, metadata? |
| `logMenuClick()` | 메뉴 클릭 | menuItem, section? |
| `logButtonClick()` | 버튼 클릭 | buttonId, details? |

---

## Error Logger

### 개요
시스템 에러를 파일로 기록하고 로그 로테이션을 자동 관리하는 시스템입니다.

### 주요 기능
- **일별 로그 파일**: `error-YYYY-MM-DD.log` 형식
- **자동 로그 로테이션**: 10MB 초과 시 자동 백업 (최대 5개 파일 보관)
- **컨텍스트 기반 분류**: 메뉴, 페이지, API, 워크플로우 등으로 분류

### 로그 컨텍스트

```typescript
interface ErrorContext {
  menu?: string;         // 메뉴 이름
  page?: string;         // 페이지 경로
  button?: string;       // 버튼 ID
  workflow?: string;     // 워크플로우 이름
  api?: string;          // API 이름
  endpoint?: string;     // API 엔드포인트
  prompt?: string;       // 프롬프트 이름
  metadata?: Record<string, any>;  // 추가 정보
}
```

### 사용 예시

#### 1. API 에러 로깅
**시점**: API 요청 실패 시
```typescript
// server/services/error-logger.ts 사용
await errorLogger.logApiError({
  api: 'Azure Databricks',
  endpoint: '/api/databricks/query',
  method: 'POST',
  statusCode: 500,
  error: error,
  metadata: { sql: 'SELECT * FROM...' }
});
```

**로그 포맷**:
```
[2025-10-30T12:45:00.000Z] ERROR | API: Azure Databricks > Endpoint: /api/databricks/query > Method: POST > Status: 500
Error: Connection timeout
Stack: Error: Connection timeout
    at DatabricksService.executeQuery (azure-databricks.ts:123:15)
    ...
Metadata: {"sql":"SELECT * FROM..."}
---
```

#### 2. 워크플로우 에러 로깅
**시점**: 워크플로우 실행 중 에러 발생 시
```typescript
await errorLogger.logWorkflowError({
  workflow: 'Daily Analysis',
  error: error,
  metadata: {
    nodeId: 'node-123',
    nodeType: 'dataSource'
  }
});
```

#### 3. 프롬프트 에러 로깅
**시점**: OpenAI API 호출 실패 시
```typescript
await errorLogger.logPromptError({
  prompt: 'Market Analysis Template',
  error: error,
  metadata: {
    model: 'gpt-4',
    tokenCount: 2500
  }
});
```

#### 4. UI 에러 로깅
**시점**: 프론트엔드 컴포넌트 에러 발생 시
```typescript
await errorLogger.logUIError({
  menu: 'Dashboard',
  page: '/dashboard',
  button: 'refresh-data',
  error: error,
  metadata: { userId: 'user123' }
});
```

---

## HTTP Request Logger

### 개요
모든 HTTP API 요청/응답을 실시간 모니터링하는 Express 미들웨어입니다.

### 구현 위치
`server/index.ts` - Express 미들웨어로 구현

### 로그 시점
- **요청 시작**: 각 API 요청이 들어올 때
- **응답 완료**: 응답이 클라이언트에게 전송될 때 (`res.on('finish')`)

### 로그 포맷
```
9:24:58 PM [express] GET /api/system/status 200 in 2ms :: {"system":"normal","ragEngine":"active"...
```

**포맷 구조**:
```
[시간] [express] [메서드] [경로] [상태코드] in [실행시간] :: [응답 JSON (80자 제한)]
```

### 사용 코드
```typescript
// server/index.ts
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});
```

---

## Frontend Error Logger

### 개요
클라이언트 측에서 발생하는 에러를 백엔드로 전송하여 중앙 집중식 로그 관리를 지원합니다.

### 구현 위치
`client/src/lib/error-logger.ts`

### 주요 기능
- **전역 에러 핸들러**: window 에러 및 unhandled promise rejection 자동 캡처
- **컨텍스트 정보 자동 수집**: URL, 타임스탬프, 파일명, 라인 번호
- **백엔드 전송**: `/api/logs/error` 엔드포인트로 전송

### 사용 예시

#### 1. 수동 에러 로깅
```typescript
import { frontendErrorLogger } from '@/lib/error-logger';

// UI 에러
await frontendErrorLogger.logUIError({
  page: '/workflow-editor',
  button: 'save-workflow',
  error: new Error('Failed to save workflow'),
  metadata: { workflowId: 'wf-123' }
});

// API 에러
await frontendErrorLogger.logApiError({
  api: 'OpenAI',
  endpoint: '/api/openai/chat',
  method: 'POST',
  statusCode: 429,
  error: new Error('Rate limit exceeded')
});

// 워크플로우 에러
await frontendErrorLogger.logWorkflowError({
  workflow: 'Daily Market Analysis',
  nodeId: 'node-5',
  nodeType: 'apiCall',
  error: new Error('API call failed')
});
```

#### 2. 전역 에러 핸들러 설정
```typescript
// client/src/main.tsx 또는 client/src/App.tsx
import { setupGlobalErrorHandler } from '@/lib/error-logger';

setupGlobalErrorHandler();
```

**전역 에러 핸들러 동작**:
- `window.addEventListener('error')`: JavaScript 실행 에러 캡처
- `window.addEventListener('unhandledrejection')`: Promise rejection 캡처

---

## 로그 파일 구조

### 디렉토리 구조
```
logs/
├── activity.log              # Activity 로그 (JSON Lines 형식)
├── error-2025-10-30.log     # 에러 로그 (일별)
├── error-2025-10-30.log     # 이전 날짜 에러 로그
├── error-2025-10-30.log.1   # 로테이션된 백업 (10MB 초과 시)
└── error-2025-10-30.log.2   # 추가 백업 (최대 5개)
```

### 로그 파일 형식

#### Activity Log (JSON Lines)
```json
{"timestamp":"2025-10-30T12:34:56.789Z","type":"api","action":"POST /api/workflows/execute","details":{"endpoint":"/api/workflows/execute","method":"POST","statusCode":200}}
{"timestamp":"2025-10-30T12:35:00.123Z","type":"workflow","action":"start","details":{"workflowId":"wf-123","workflowName":"Daily Analysis","status":"running"}}
```

#### Error Log (텍스트 형식)
```
[2025-10-30T12:45:00.000Z] ERROR | Workflow: Daily Analysis > Page: /workflow-editor
Error: Node execution failed
Stack: Error: Node execution failed
    at WorkflowEngine.executeNode (workflow-execution-engine.ts:234:15)
    at WorkflowEngine.execute (workflow-execution-engine.ts:123:20)
Metadata: {"nodeId":"node-123","nodeType":"dataSource"}
---
```

---

## 로그 조회 방법

### 1. 웹 인터페이스
**경로**: `/logs`

**기능**:
- 실시간 로그 조회
- 로그 타입별 필터링 (env_var, workflow, api, prompt, config_check 등)
- 시간 범위 필터링
- 로그 검색
- 로그 새로고침 (10초 간격 자동)

### 2. API 엔드포인트

```typescript
// 최근 로그 조회
GET /api/logs/activity?limit=100

// 특정 로그 파일 다운로드
GET /api/logs/file/:filename

// 에러 로그 전송 (프론트엔드)
POST /api/logs/error
```

### 3. 직접 파일 접근

```bash
# Activity 로그 조회
cat logs/activity.log | tail -n 50

# 특정 타입만 필터링
cat logs/activity.log | grep '"type":"workflow"'

# 오늘의 에러 로그
cat logs/error-$(date +%Y-%m-%d).log

# 실시간 로그 모니터링
tail -f logs/activity.log
```

---

## 보안 및 개인정보 보호

### 민감 정보 자동 마스킹
Activity Logger는 다음 패턴을 포함한 환경 변수 값을 자동으로 마스킹합니다:
- `key`
- `token`
- `password`
- `secret`
- `credential`

**마스킹 방식**:
```
원본: sk-1234567890abcdefghijklmnopqrstuvwxyz
마스킹: sk-1...xyz
```

### 로그 보관 정책
- **Activity Log**: 무제한 (수동 삭제 필요)
- **Error Log**: 로테이션으로 최대 5개 백업 파일 보관
- **파일 크기 제한**: 각 로그 파일 최대 10MB

---

## 문제 해결

### 로그가 기록되지 않는 경우
1. `logs/` 디렉토리 권한 확인
2. 디스크 공간 확인
3. 콘솔에 "Failed to write activity log" 에러 확인

### 로그 파일이 너무 큰 경우
```bash
# 오래된 로그 삭제
rm logs/error-2025-09-*.log

# Activity 로그 압축 및 백업
gzip logs/activity.log
mv logs/activity.log.gz logs/backup/activity-$(date +%Y%m%d).log.gz
touch logs/activity.log
```

### 로그 분석
```bash
# API 호출 통계
cat logs/activity.log | grep '"type":"api"' | wc -l

# 가장 많이 호출된 API
cat logs/activity.log | grep '"type":"api"' | jq -r '.details.endpoint' | sort | uniq -c | sort -rn

# 워크플로우 실행 이력
cat logs/activity.log | grep '"type":"workflow"' | jq '.details.workflowName' | sort | uniq -c
```

---

## 요약

| 로그 타입 | 용도 | 저장 위치 | 조회 방법 |
|----------|------|----------|----------|
| Activity | 사용자 활동, 시스템 이벤트 | `logs/activity.log` | `/logs` 페이지, API |
| Error | 에러 추적 | `logs/error-YYYY-MM-DD.log` | 직접 파일 접근 |
| HTTP Request | API 모니터링 | 콘솔 출력 | 콘솔, `/tmp/logs` |
| Frontend Error | 클라이언트 에러 | 백엔드 전송 → Error Log | Error Log와 동일 |
