# 워크플로우 노드 타입 및 속성 가이드

## 실행 엔진 동작 원리

워크플로우 엔진은 다음과 같이 노드를 실행합니다:

1. **노드 순서 결정**: Edges를 기반으로 topological sort 수행
2. **노드별 순차 실행**: 각 노드의 type에 따라 해당 실행 함수 호출
3. **입력 해결**: resolveNodeInputs()로 이전 노드의 출력 수집
4. **변수 대체**: 프롬프트/템플릿에서 {VAR} 형식 변수를 실제 값으로 대체
5. **출력 저장**: storeNodeOutputs()로 노드 출력을 context에 저장
6. **다음 노드로 전파**: 저장된 출력이 다음 노드의 입력으로 사용됨

## 지원되는 노드 타입

### 1. dataSource (데이터 조회)
**용도**: Databricks, PostgreSQL, API에서 데이터 조회

**필수 속성**:
```typescript
{
  type: "dataSource",
  data: {
    query: string,        // SQL 쿼리 (필수)
    source: string,       // 'databricks' | 'postgresql' | 'api' (권장)
    outputKey?: string,   // 출력 키 이름 (선택)
    label: string,        // 노드 표시 이름
    description?: string  // 노드 설명
  }
}
```

**출력 키**: `data`, `rowCount`, `executionTime`, `schema`

**예시**:
```json
{
  "id": "load-events",
  "type": "dataSource",
  "data": {
    "label": "주요 이벤트 조회",
    "description": "당일 이벤트 데이터 조회",
    "source": "databricks",
    "query": "SELECT * FROM events WHERE date = current_date()",
    "outputKey": "events_data"
  }
}
```

---

### 2. transform (데이터 변환)
**용도**: JSON 파싱, 배열 변환, 필드 추출 등

**필수 속성**:
```typescript
{
  type: "transform",
  data: {
    transformType: string,  // 변환 타입 (필수)
    inputKey: string,       // 입력 변수 이름 (필수)
    outputKey: string,      // 출력 변수 이름 (필수)
    label: string,
    description?: string
  }
}
```

**transformType 종류**:
- `json_parse`: JSON 문자열 → 객체
- `json_stringify`: 객체 → JSON 문자열
- `extract_fields`: 특정 필드만 추출 (fields 배열 필요)
- `map_array`: 배열 매핑 (mapExpression 필요)
- `filter_array`: 배열 필터링 (filterExpression 필요)
- `aggregate`: 배열 집계 (count, sum, avg)

**출력 키**: `[outputKey]` (설정한 outputKey 이름)

**예시**:
```json
{
  "id": "transform-events",
  "type": "transform",
  "data": {
    "label": "이벤트 JSON 변환",
    "transformType": "json_stringify",
    "inputKey": "events_data",
    "outputKey": "A_EVENTS_JSON"
  }
}
```

---

### 3. prompt (AI 프롬프트)
**용도**: OpenAI GPT를 사용한 AI 분석 생성

**필수 속성**:
```typescript
{
  type: "prompt",
  data: {
    // Option 1: 인라인 프롬프트 (권장)
    systemPrompt: string,        // 시스템 프롬프트 (선택)
    userPromptTemplate: string,  // 사용자 프롬프트 템플릿 (필수)
    maxTokens?: number,          // 최대 토큰 (기본 1500, 범위 100-4000)
    temperature?: number,        // 온도 (기본 0.7, 범위 0.0-2.0)
    
    // Option 2: DB 참조 프롬프트
    promptId: string,            // DB 저장 프롬프트 ID
    
    outputKey?: string,          // 출력 키 (선택)
    label: string,
    description?: string
  }
}
```

**변수 대체**: `{VAR}` 또는 `{{VAR}}` 형식으로 변수 사용 가능
- 예: `{DATE}`, `{A_EVENTS_JSON}`, `{PREV_TITLE}`

**출력 키**: `response`, `promptId`, `replacedVariables`, `maxTokens`, `temperature`

**예시**:
```json
{
  "id": "generate-analysis",
  "type": "prompt",
  "data": {
    "label": "AI 시황 생성",
    "systemPrompt": "당신은 전문 시장 애널리스트입니다.",
    "userPromptTemplate": "날짜: {DATE}\n이벤트: {A_EVENTS_JSON}\n\n시황 분석을 작성하세요.",
    "maxTokens": 1500,
    "temperature": 0.2,
    "outputKey": "response"
  }
}
```

---

### 4. output (결과 출력)
**용도**: 워크플로우 최종 결과 포맷팅

**필수 속성**:
```typescript
{
  type: "output",
  data: {
    format?: string,      // 'json' | 'table' | 'markdown' (기본 'json')
    inputKey?: string,    // 입력 변수 이름 (선택)
    label: string,
    description?: string
  }
}
```

**출력 키**: `result`, `rawData`, `format`

**예시**:
```json
{
  "id": "output",
  "type": "output",
  "data": {
    "label": "최종 결과",
    "format": "json",
    "inputKey": "analysis_result"
  }
}
```

---

### 5. loop (반복 실행)
**용도**: 배열의 각 항목에 대해 반복 실행

**필수 속성**:
```typescript
{
  type: "loop",
  data: {
    arrayKey?: string,   // 반복할 배열 변수 이름 (기본 'items')
    itemKey?: string,    // 현재 항목 변수 이름 (기본 'item')
    indexKey?: string,   // 인덱스 변수 이름 (기본 'index')
    label: string,
    description?: string
  }
}
```

**제한사항**: 최대 1000회 반복

**출력 키**: `iterations`, `results`, `items`, `successCount`, `errorCount`, `errors`

---

### 6. template (템플릿 치환)
**용도**: 템플릿 문자열에 변수 치환

**필수 속성**:
```typescript
{
  type: "template",
  data: {
    template: string,              // 템플릿 문자열 (필수)
    placeholderFormat?: string,    // 'single' | 'double' | 'both' (기본 'both')
    variables?: Record<string, string>,  // 변수 매핑 (선택)
    label: string,
    description?: string
  }
}
```

**출력 키**: `result`, `replacedCount`, `availableVariables`

---

### 7. merge (데이터 병합)
**용도**: 여러 노드의 출력 병합

**필수 속성**:
```typescript
{
  type: "merge",
  data: {
    mergeKeys?: string[],  // 병합할 키 목록 (선택, 없으면 모두)
    label: string,
    description?: string
  }
}
```

**출력 키**: `mergedData`

---

### 8. api (API 호출)
**용도**: 외부 API 호출

**필수 속성**:
```typescript
{
  type: "api",
  data: {
    apiCallId: string,   // DB 저장된 API 호출 설정 ID (필수)
    label: string,
    description?: string
  }
}
```

**출력 키**: `apiResult`, `apiCallId`

---

### 9. rag (RAG 검색)
**용도**: 벡터 DB에서 관련 문서 검색

**필수 속성**:
```typescript
{
  type: "rag",
  data: {
    query?: string,      // 검색 쿼리 (입력에서 받을 수도 있음)
    label: string,
    description?: string
  }
}
```

**출력 키**: `ragResults`, `query`

---

### 10. condition (조건 분기)
**용도**: 조건부 실행

**필수 속성**:
```typescript
{
  type: "condition",
  data: {
    condition?: string,  // 조건식 (입력에서 받을 수도 있음)
    label: string,
    description?: string
  }
}
```

**출력 키**: `result`, `condition`

---

## 엣지 (Edge) 정의

```typescript
{
  id: string,           // 고유 ID
  source: string,       // 소스 노드 ID
  target: string,       // 타겟 노드 ID
  sourceOutput?: string,    // 소스 노드의 특정 출력 키
  targetInput?: string      // 타겟 노드의 특정 입력 키
}
```

**데이터 흐름**:
- sourceOutput/targetInput이 지정되지 않으면 → 소스 노드의 모든 출력이 타겟 노드로 전달
- sourceOutput/targetInput이 지정되면 → 특정 출력만 특정 입력으로 매핑

---

## 실행 순서 예시

```
[dataSource] → [transform] → [prompt] → [transform] → [output]
     ↓              ↓             ↓           ↓            ↓
  data=rows    A_JSON=str    response   result=obj   final JSON
```

1. **dataSource**: SQL 쿼리 실행 → `data` 출력
2. **transform**: `data`를 JSON으로 변환 → `A_JSON` 출력
3. **prompt**: `{A_JSON}` 변수 사용해 AI 분석 → `response` 출력
4. **transform**: `response` JSON 파싱 → `result` 출력
5. **output**: `result`를 JSON 형식으로 포맷팅 → 최종 결과

---

## 변수 사용 가이드

### 자동 생성 변수
- `DATE`: 현재 날짜 (YYYYMMDD)
- `TIME`: 현재 시각 (HHmmss)
- 각 노드의 outputKey로 지정한 값들

### 변수 참조 방법
1. **프롬프트에서**: `{VAR}` 또는 `{{VAR}}`
2. **템플릿에서**: `{VAR}` 또는 `{{VAR}}`
3. **코드에서**: `context.variables.get('VAR')`

### 변수 스코프
- **Global**: context.variables에 저장된 모든 변수
- **Node**: 각 노드의 입력으로 전달된 변수
- **Output**: 각 노드가 생성한 outputKey 변수들

---

## 보안 고려사항

1. **SQL Injection 방지**: Databricks는 parameterized query 사용
2. **코드 실행 제한**: custom transform, eval 등은 비활성화
3. **반복 횟수 제한**: Loop는 최대 1000회
4. **토큰 제한**: Prompt는 최대 4000 토큰
5. **표현식 검증**: map/filter expression은 정규식으로 안전성 검증
