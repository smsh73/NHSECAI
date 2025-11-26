# 로그 필드 누락 분석 보고서

**분석 일자**: 2025-11-03  
**분석 대상**: 로그 작성 기능 및 로그 분석 페이지

---

## 📋 분석 결과 요약

### 1. 스키마 상태 확인

#### `application_logs` 테이블 필드 현황:

| 필드명 | 타입 | 상태 | 비고 |
|--------|------|------|------|
| `error_message` | TEXT | ✅ 있음 | 에러 메시지 저장 가능 |
| `error_code` | VARCHAR(50) | ✅ 있음 | 에러 코드 저장 가능 |
| `success_message` | TEXT | ✅ 있음 | 성공 메시지 저장 가능 |
| `success_code` | - | ❌ **없음** | 스키마에 정의되지 않음 |

**결론**: `successCode` 필드는 스키마에 존재하지 않습니다. 나머지 3개 필드는 모두 존재합니다.

---

### 2. 로그 작성 기능 분석

#### 2.1 `Logger.writeLog()` 메서드

**위치**: `server/services/logger.ts` (라인 70-132)

**상태**: ✅ 모든 필드를 지원
```typescript
const logData: InsertApplicationLog = {
  // ... 다른 필드들 ...
  errorMessage: entry.errorMessage || null,      // ✅ 지원
  errorCode: entry.errorCode || null,            // ✅ 지원
  successMessage: entry.successMessage || null,  // ✅ 지원
  // successCode는 스키마에 없어서 지원 불가
};
```

#### 2.2 `Logger.logApiResponse()` 메서드

**위치**: `server/services/logger.ts` (라인 176-220)

**문제점 분석**:

1. **errorCode 처리**:
   ```typescript
   errorCode: error?.code || null,  // ❌ error 객체에 code 속성이 있는 경우만 저장
   ```
   - 문제: 대부분의 JavaScript Error 객체에는 `code` 속성이 없음
   - 결과: 대부분의 경우 `errorCode`가 `null`로 저장됨
   - 실제 사용 사례: 매우 적음

2. **successMessage 처리**:
   ```typescript
   successMessage: !error && status === "success" ? "Request completed successfully" : null,
   ```
   - 문제: 하드코딩된 문자열만 사용
   - 문제: `responseData`에서 실제 성공 메시지를 추출하지 않음
   - 결과: 모든 성공 응답에 동일한 메시지 저장

3. **errorMessage 처리**:
   ```typescript
   errorMessage: error?.message || (error ? String(error) : null),
   ```
   - 상태: ✅ 정상 작동
   - 다만, `responseData.error` 또는 `responseData.message`는 확인하지 않음

**결론**: 
- ✅ `errorMessage`는 정상 작동
- ⚠️ `errorCode`는 거의 항상 `null` (error?.code가 없는 경우가 많음)
- ⚠️ `successMessage`는 하드코딩된 값만 사용 (실제 메시지 미추출)

#### 2.3 `Logger.logError()` 메서드

**위치**: `server/services/logger.ts` (라인 225-261)

**문제점 분석**:
```typescript
errorCode: error?.code || null,  // ❌ 동일한 문제
successMessage: 사용하지 않음  // ❌ 에러 로그이므로 당연함
```

#### 2.4 `Logger.logWorkflowExecution()` 메서드

**위치**: `server/services/logger.ts` (라인 266-296)

**문제점 분석**:
```typescript
successMessage: !error && status === "success" ? "Node executed successfully" : null,
```
- 문제: 하드코딩된 "Node executed successfully"만 사용
- 문제: `outputData`에서 실제 성공 메시지를 추출하지 않음

#### 2.5 `loggingMiddleware` 분석

**위치**: `server/routes.ts` (라인 8951-8996)

**문제점 분석**:
```typescript
logger.logApiResponse(req as any, res as any, endpoint, method, responseData, status)
```
- 문제: `responseData`를 전달하지만, `error` 파라미터를 전달하지 않음
- 결과: `responseData.error` 또는 `responseData.message`를 확인하지 않음
- 결과: 실제 에러/성공 메시지를 추출하지 못함

---

### 3. 로그 분석 페이지 분석

#### 3.1 `log-viewer.tsx` 분석

**위치**: `client/src/pages/log-viewer.tsx`

#### 3.1.1 데이터 변환 로직 (라인 272-283)

```typescript
const transformedLogs = useMemo(() => {
  const logs = logsData || [];
  return logs.map((log: LogEntry) => ({
    ...log,
    level: log.logLevel || log.level || 'info',
    category: log.logCategory || log.category || 'unknown',
    message: log.errorMessage || log.successMessage || log.message || `${log.logType || 'log'} - ${log.endpoint || log.caller || 'unknown'}`,
    timestamp: log.timestamp,
    stack: log.errorStack || log.stack,
    error: log.errorMessage ? { message: log.errorMessage, stack: log.errorStack } : log.error,
  }));
}, [logsData]);
```

**분석 결과**:
- ✅ `errorMessage`: 표시됨 (`message` 필드에 우선 사용)
- ✅ `successMessage`: 표시됨 (`errorMessage`가 없으면 `message` 필드에 사용)
- ❌ `errorCode`: **표시되지 않음** (데이터 변환 시 포함되지 않음)
- ❌ `successCode`: 스키마에도 없고 표시도 안 됨

#### 3.1.2 로그 상세 표시 (라인 603-801)

**표시되는 필드**:
- ✅ 타임스탬프
- ✅ 사용자 ID
- ✅ IP 주소
- ✅ Caller/Callee
- ✅ 메시지 (errorMessage 또는 successMessage)
- ✅ Request/Response Data
- ✅ 실행 정보 (executionTimeMs, httpStatusCode)
- ✅ Stack Trace
- ✅ 에러 상세 (error 객체)
- ✅ 메타데이터

**표시되지 않는 필드**:
- ❌ `errorCode`: 표시되지 않음
- ❌ `successCode`: 스키마에도 없음

---

## 🔍 문제점 종합 분석

### 문제 1: errorCode가 거의 항상 null

**원인**:
1. JavaScript Error 객체에는 기본적으로 `code` 속성이 없음
2. `error?.code`로만 추출하므로 대부분의 경우 `null`
3. 실제 에러 코드는 `responseData.code` 또는 `responseData.errorCode`에 있을 수 있음

**영향**:
- 로그에서 에러 코드로 필터링/검색 불가
- 에러 분류 및 통계 분석 불가

### 문제 2: successMessage가 하드코딩됨

**원인**:
1. `Logger.logApiResponse`에서 "Request completed successfully"만 사용
2. `Logger.logWorkflowExecution`에서 "Node executed successfully"만 사용
3. 실제 응답 데이터(`responseData.message`, `responseData.successMessage`)를 확인하지 않음

**영향**:
- 모든 성공 로그에 동일한 메시지 표시
- 실제 성공 메시지가 표시되지 않음
- 로그 분석 시 의미 있는 정보 부족

### 문제 3: successCode 필드 누락

**원인**:
1. 스키마(`application_logs` 테이블)에 `successCode` 필드가 정의되지 않음

**영향**:
- 성공 코드를 저장할 수 없음
- 성공 응답을 코드별로 분류 불가

### 문제 4: 로그 뷰어에서 errorCode 미표시

**원인**:
1. `transformedLogs`에서 `errorCode`를 포함하지 않음
2. 로그 상세 화면에서 `errorCode`를 표시하지 않음

**영향**:
- 저장된 `errorCode`가 있어도 화면에 표시되지 않음
- 사용자가 에러 코드를 확인할 수 없음

### 문제 5: responseData에서 실제 메시지 미추출

**원인**:
1. `loggingMiddleware`에서 `responseData`만 전달하고 실제 메시지는 추출하지 않음
2. `Logger.logApiResponse`에서 `responseData.message`, `responseData.error` 등을 확인하지 않음

**영향**:
- API 응답에 포함된 실제 에러/성공 메시지가 로그에 저장되지 않음

---

## 📊 실제 사용 현황 분석

### Logger.writeLog 직접 호출 사례

**위치**: `server/routes.ts` (라인 11843, 11860)

```typescript
await Logger.writeLog({
  logLevel: "error",
  logCategory: "api",
  logType: "error",
  endpoint: "/api/schema-browser/generate-ai-analysis",
  method: "POST",
  httpStatusCode: 400,
  errorMessage: "Validation error",  // ✅ 명시적으로 제공
  responseData: { success: false, details: error.errors },
});
```

**분석**: 직접 호출 시에는 `errorMessage`를 제공하지만, `errorCode`와 `successMessage`는 제공하지 않음.

### loggingMiddleware를 통한 자동 로깅

**대부분의 API 호출**은 `loggingMiddleware`를 통해 자동으로 로깅됩니다.

**현재 로직**:
1. Request: `logApiRequest()` 호출 (메시지 없음)
2. Response: `logApiResponse(req, res, endpoint, method, responseData, status)` 호출
3. `logApiResponse` 내부에서:
   - `errorMessage`: `error?.message` 또는 `String(error)` (하지만 `error` 파라미터가 전달되지 않음)
   - `errorCode`: `error?.code` (하지만 `error` 파라미터가 전달되지 않음)
   - `successMessage`: 하드코딩된 "Request completed successfully"

**결과**: 대부분의 로그에서 `errorCode`와 실제 `successMessage`가 없음.

---

## 🎯 해결 방안

### 방안 1: errorCode 추출 개선

**수정 위치**: `server/services/logger.ts` - `logApiResponse` 메서드

**현재 코드**:
```typescript
errorCode: error?.code || null,
```

**개선 코드**:
```typescript
errorCode: error?.code || 
           responseData?.code || 
           responseData?.errorCode || 
           responseData?.error?.code ||
           null,
```

### 방안 2: successMessage 추출 개선

**수정 위치**: `server/services/logger.ts` - `logApiResponse` 메서드

**현재 코드**:
```typescript
successMessage: !error && status === "success" ? "Request completed successfully" : null,
```

**개선 코드**:
```typescript
successMessage: !error && status === "success" 
  ? (responseData?.message || 
     responseData?.successMessage || 
     responseData?.msg || 
     "Request completed successfully")
  : null,
```

### 방안 3: successCode 필드 추가 (선택사항)

**필요 시 작업**:
1. 데이터베이스 마이그레이션: `application_logs` 테이블에 `success_code` 컬럼 추가
2. 스키마 업데이트: `shared/schema.ts`에 `successCode` 필드 추가
3. 로깅 로직 업데이트: `Logger.writeLog`에 `successCode` 지원 추가

### 방안 4: 로그 뷰어에 errorCode 표시 추가

**수정 위치**: `client/src/pages/log-viewer.tsx`

**추가할 코드**:
```typescript
// transformedLogs에 errorCode 추가
errorCode: log.errorCode || null,

// 로그 상세 화면에 errorCode 표시 섹션 추가
{log.errorCode && (
  <div>
    <span className="font-semibold">에러 코드:</span>
    <Badge variant="destructive">{log.errorCode}</Badge>
  </div>
)}
```

### 방안 5: loggingMiddleware 개선

**수정 위치**: `server/routes.ts` - `loggingMiddleware`

**개선 코드**:
```typescript
res.json = function (body: any) {
  const responseData = body;
  const status = res.statusCode >= 200 && res.statusCode < 300 ? "success" : 
                 res.statusCode >= 400 && res.statusCode < 500 ? "failed" : "error";
  
  // responseData에서 실제 에러 추출
  const error = responseData?.error || (res.statusCode >= 400 ? responseData : null);
  
  logger.logApiResponse(req as any, res as any, endpoint, method, responseData, status, error)
    .catch(err => {
      console.error("Failed to log API response:", err);
    });
  
  return originalSend(body);
};
```

---

## 📝 권장 작업 우선순위

1. **높음**: 로그 뷰어에 `errorCode` 표시 추가
2. **높음**: `logApiResponse`에서 `responseData`에서 실제 메시지 추출
3. **중간**: `errorCode` 추출 로직 개선 (responseData에서도 확인)
4. **중간**: `successMessage` 추출 로직 개선 (responseData에서 실제 메시지 확인)
5. **낮음**: `successCode` 필드 추가 (필요 시)

---

## ✅ 결론

### 현재 상태

1. **스키마**: `errorMessage`, `errorCode`, `successMessage`는 있음. `successCode`는 없음.
2. **로그 작성**: 필드는 지원하지만, 실제 값 추출이 불완전함
   - `errorCode`: 거의 항상 `null` (error?.code가 없음)
   - `successMessage`: 하드코딩된 값만 사용
   - `responseData`에서 실제 메시지를 추출하지 않음
3. **로그 뷰어**: `errorMessage`와 `successMessage`는 표시되지만, `errorCode`는 표시되지 않음

### 문제 원인

1. **데이터 누락**: 스키마는 정확하지만, 실제 데이터가 제대로 추출되지 않음
2. **표시 누락**: `errorCode`는 데이터는 있지만 화면에 표시되지 않음
3. **로직 불완전**: `responseData`에서 실제 메시지를 추출하지 않음

### 해결 필요 사항

1. ✅ `responseData`에서 실제 에러/성공 메시지 추출
2. ✅ `errorCode` 추출 로직 개선
3. ✅ 로그 뷰어에 `errorCode` 표시 추가
4. ⚠️ `successCode` 필드는 필요 시에만 추가

