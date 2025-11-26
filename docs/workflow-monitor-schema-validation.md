# 워크플로우 모니터 페이지 스키마 검증 보고서

## 검증 일시
2025-11-01

## 검증 범위
1. PostgreSQL 스키마 검증 (workflow_sessions, workflow_node_executions, workflow_session_data)
2. Databricks 스키마 검증 (데이터 소스 노드에서 사용하는 테이블)
3. API 코드와 스키마 일치성 검증
4. 프론트엔드 코드와 스키마 일치성 검증

## 1. PostgreSQL 스키마 검증

### 1.1 workflow_sessions 테이블
**스키마 정의**: `shared/schema.ts` 라인 4815-4830
```typescript
export const workflowSessions = pgTable("workflow_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionName: text("session_name").notNull(),
  workflowId: varchar("workflow_id").notNull(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**검증 결과**: ✅ 통과
- 모든 필드가 올바르게 정의됨
- Storage 메서드와 일치함
- API 엔드포인트와 일치함

### 1.2 workflow_node_executions 테이블
**스키마 정의**: `shared/schema.ts` 라인 4850-4868
```typescript
export const workflowNodeExecutions = pgTable("workflow_node_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id").notNull().references(() => workflowSessions.id),
  nodeId: varchar("node_id").notNull(), // 외래키 제약 제거됨
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  errorMessage: text("error_message"),
  executionTime: integer("execution_time"),
  retryCount: integer("retry_count").notNull().default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**검증 결과**: ⚠️ 수정됨
- **문제점**: `nodeId`가 `workflowNodes.id`를 외래키로 참조하도록 정의되어 있었으나, 실제로는 `workflow.definition.nodes`의 id를 사용함
- **수정사항**: 외래키 제약조건 제거 (`references(() => workflowNodes.id)` 삭제)
- **이유**: `workflow.definition.nodes`의 id는 `workflow_nodes` 테이블의 id와 일치하지 않을 수 있음
- **해결책**: `metadata` 필드에 `nodeName`, `nodeType`, `nodeDefinitionId` 저장

### 1.3 workflow_session_data 테이블
**스키마 정의**: `shared/schema.ts` 라인 4871-4892
```typescript
export const workflowSessionData = pgTable("workflow_session_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id").notNull().references(() => workflowSessions.id),
  dataKey: text("data_key").notNull(),
  dataValue: jsonb("data_value").notNull(),
  dataType: text("data_type").notNull(),
  createdBy: varchar("created_by").references(() => workflowNodes.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  promptId: varchar("prompt_id").references(() => prompts.id),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  executionStatus: text("execution_status").default("success"),
  errorMessage: text("error_message"),
});
```

**검증 결과**: ✅ 통과
- 모든 필드가 올바르게 정의됨
- Storage 메서드와 일치함
- API 엔드포인트와 일치함

## 2. Databricks 스키마 검증

### 2.1 news_data 테이블
**사용 위치**: `server/services/azure-databricks.ts` (라인 827-1135)

**검증 결과**: ✅ 통과
- 여러 테이블 위치에서 찾을 수 있도록 구현됨:
  - `news_data`
  - `default.news_data`
  - `main.news_data`
  - `hive_metastore.default.news_data`
  - `hive_metastore.main.news_data`
- 필드 매핑이 올바르게 구현됨 (대소문자 구분 없이 처리)
- 워크플로우 데이터 소스 노드에서 사용 가능

**스키마 필드**:
- id, nid, title, content, summary, source, reporter
- category, subcategory, sentiment, sentiment_score
- economic_score, market_score, importance_score
- relevant_symbols, relevant_indices, relevant_themes
- keywords, entities, market_events, event_categories
- published_at, crawled_at, processed_at
- is_processed, is_filtered, is_high_quality

### 2.2 기타 Databricks 테이블
**워크플로우 데이터 소스 노드**에서 동적 SQL 쿼리를 사용하므로 특정 테이블 제약이 없음.

**검증 결과**: ✅ 통과
- `executeDataSourceNode` 메서드에서 `databricks`, `postgresql`, `api` 소스 타입 지원
- SQL 쿼리는 워크플로우 정의에 따라 동적으로 생성됨

## 3. API 코드와 스키마 일치성 검증

### 3.1 GET /api/workflow-sessions
**코드 위치**: `server/routes.ts` 라인 1654-1666
**Storage 메서드**: `storage.getWorkflowSessions()`

**검증 결과**: ✅ 통과
- 쿼리 파라미터: `workflowId`, `status`, `limit`
- 반환 타입: `WorkflowSession[]`
- 스키마와 일치함

### 3.2 GET /api/workflow-sessions/:sessionId
**코드 위치**: `server/routes.ts` 라인 1668-1682
**Storage 메서드**: `storage.getWorkflowSession()`

**검증 결과**: ✅ 통과
- 반환 타입: `WorkflowSession`
- 스키마와 일치함

### 3.3 GET /api/workflow-sessions/:sessionId/node-executions
**코드 위치**: `server/routes.ts` 라인 1684-1693
**Storage 메서드**: `storage.getWorkflowSessionNodeExecutions()`

**검증 결과**: ✅ 통과
- 반환 타입: `WorkflowNodeExecution[]`
- `metadata`에서 `nodeName`과 `nodeType` 추출하여 반환
- 스키마와 일치함

### 3.4 GET /api/workflow-sessions/:sessionId/session-data
**코드 위치**: `server/routes.ts` 라인 1695-1704
**Storage 메서드**: `storage.getWorkflowSessionData()`

**검증 결과**: ✅ 통과
- 반환 타입: `WorkflowSessionData[]`
- 스키마와 일치함

## 4. 프론트엔드 코드와 스키마 일치성 검증

### 4.1 WorkflowSession 타입
**코드 위치**: `client/src/pages/workflow-monitor.tsx` 라인 34
**스키마 타입**: `shared/schema.ts` `WorkflowSession`

**검증 결과**: ✅ 통과
- 모든 필드가 일치함
- `WorkflowSessionWithWorkflow` 인터페이스로 확장하여 `workflow` 정보 추가

### 4.2 WorkflowNodeExecution 타입
**코드 위치**: `client/src/pages/workflow-monitor.tsx` 라인 41-44
**스키마 타입**: `shared/schema.ts` `WorkflowNodeExecution`

**검증 결과**: ✅ 통과
- `WorkflowNodeExecutionWithDetails` 인터페이스로 확장하여 `nodeName`, `nodeType` 추가
- Storage 메서드에서 `metadata`에서 추출하여 반환하므로 일치함

### 4.3 WorkflowSessionData 타입
**코드 위치**: `client/src/pages/workflow-monitor.tsx` 라인 34
**스키마 타입**: `shared/schema.ts` `WorkflowSessionData`

**검증 결과**: ✅ 통과
- 모든 필드가 일치함

## 5. 발견된 문제 및 수정사항

### 5.1 workflow_node_executions.nodeId 외래키 제약조건 문제
**문제**: 
- `nodeId`가 `workflowNodes.id`를 외래키로 참조하도록 정의되어 있었음
- 실제로는 `workflow.definition.nodes`의 id를 사용하는데, 이것이 `workflow_nodes` 테이블의 id와 일치하지 않을 수 있음

**수정**:
- `shared/schema.ts`에서 외래키 제약조건 제거
- `metadata` 필드에 `nodeName`, `nodeType`, `nodeDefinitionId` 저장
- Storage 메서드에서 `metadata`에서 `nodeName`과 `nodeType` 추출하여 반환

**파일**:
- `shared/schema.ts` (라인 4853): 외래키 제약조건 제거
- `server/services/workflow-execution-engine.ts` (라인 417-463): `saveNodeExecution` 메서드 수정
- `server/storage.ts` (라인 8319-8336): `getWorkflowSessionNodeExecutions` 메서드 수정

### 5.2 inputData/outputData 저장 방식 문제
**문제**:
- `saveNodeExecution`에서 `JSON.stringify()`로 저장하려고 했으나, 스키마는 `jsonb` 타입임

**수정**:
- Drizzle ORM이 자동으로 객체를 jsonb로 변환하므로 `JSON.stringify()` 제거
- 직접 객체를 저장하도록 수정

**파일**:
- `server/services/workflow-execution-engine.ts` (라인 442-443): `JSON.stringify()` 제거

### 5.3 노드 실행 시작/완료 시간 기록 개선
**문제**:
- 노드 실행 시작 시간과 완료 시간이 정확하게 기록되지 않음

**수정**:
- `running` 상태로 시작 시간 기록
- `completed` 또는 `failed` 상태로 완료 시간 기록 및 기존 running 기록 업데이트

**파일**:
- `server/services/workflow-execution-engine.ts` (라인 122-156): 노드 실행 시작/완료 기록 로직 개선

## 6. 최종 검증 결과

### 6.1 PostgreSQL 스키마
✅ **모든 스키마 검증 통과**
- `workflow_sessions`: 통과
- `workflow_node_executions`: 수정 후 통과
- `workflow_session_data`: 통과

### 6.2 Databricks 스키마
✅ **검증 통과**
- `news_data` 테이블: 다중 위치 검색 구현됨
- 동적 SQL 쿼리 지원: 데이터 소스 노드에서 모든 테이블 조회 가능

### 6.3 API 코드
✅ **모든 API 엔드포인트 검증 통과**
- `/api/workflow-sessions`: 통과
- `/api/workflow-sessions/:sessionId`: 통과
- `/api/workflow-sessions/:sessionId/node-executions`: 통과
- `/api/workflow-sessions/:sessionId/session-data`: 통과

### 6.4 프론트엔드 코드
✅ **모든 타입 검증 통과**
- `WorkflowSession`: 통과
- `WorkflowNodeExecution`: 통과
- `WorkflowSessionData`: 통과

## 7. 결론

모든 스키마 검증을 완료했으며, 발견된 문제점들을 수정했습니다. 특히 `workflow_node_executions.nodeId`의 외래키 제약조건 문제를 해결하여 동적 노드 ID를 지원하도록 개선했습니다. 이제 워크플로우 모니터 페이지는 모든 스키마와 일치하며 정상적으로 동작할 것입니다.

