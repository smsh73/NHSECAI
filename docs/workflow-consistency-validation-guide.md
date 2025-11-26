# 워크플로우 정합성 검증 가이드

## 개요

이 문서는 프롬프트, API, Python 스크립트, 워크플로우의 등록 관리 페이지부터 워크플로우 에디터, 엔진 실행까지의 전체 파이프라인 정합성을 검증하는 방법을 설명합니다.

## 검증 스크립트 실행 방법

### 1. 환경 변수 설정

PostgreSQL 데이터베이스 연결을 위한 환경 변수를 설정합니다:

```bash
export DATABASE_URL="postgresql://username:password@host:port/database"
```

또는 `.env` 파일에서 읽어올 수 있습니다:

```bash
# .env 파일
DATABASE_URL=postgresql://username:password@host:port/database
```

### 2. 스크립트 실행

```bash
node scripts/validate-workflow-consistency.mjs
```

### 3. TypeScript로 실행 (권장)

프로젝트가 TypeScript로 작성되어 있다면, ts-node를 사용하여 실행할 수 있습니다:

```bash
npx ts-node scripts/validate-workflow-consistency.ts
```

## 검증 단계

스크립트는 다음 7단계를 순차적으로 검증합니다:

### 1단계: 프롬프트 등록 관리 → PostgreSQL 스키마 정합성 검증

- 샘플 프롬프트 생성 및 PostgreSQL 저장
- 저장된 프롬프트 조회 및 필드별 검증
- `inputSchema`, `outputSchema`, `parameters`, `executionType` 필드 검증

### 2단계: API 등록 관리 → PostgreSQL 스키마 정합성 검증

- 샘플 API 생성 및 PostgreSQL 저장
- 저장된 API 조회 및 필드별 검증
- `requestSchema`, `responseSchema`, `parameterTemplate`, `headers` 필드 검증

### 3단계: Python 스크립트 등록 관리 → PostgreSQL 스키마 정합성 검증

- 샘플 Python 스크립트 생성 및 PostgreSQL 저장
- 저장된 Python 스크립트 조회 및 필드별 검증
- `exampleInput`, `exampleOutput`, `pythonRequirements` 필드 검증

### 4단계: 워크플로우 정의 JSON 형식 정합성 검증

- 워크플로우 에디터에서 생성될 것으로 예상되는 JSON 형식 검증
- `nodes`, `edges`, `configuration` 구조 검증
- 등록된 리소스 ID (`promptId`, `apiCallId`, `pythonScriptId`) 포함 여부 검증

### 5단계: 워크플로우 저장 → PostgreSQL 스키마 정합성 검증

- 워크플로우 정의를 PostgreSQL에 저장
- 저장된 워크플로우 조회 및 definition 파싱 검증
- 노드별 configuration의 리소스 ID 검증

### 6단계: 워크플로우 엔진 실행 준비 검증

- 워크플로우 엔진에서 등록된 리소스 조회 검증
- 각 노드의 configuration에서 리소스 ID로 실제 데이터 조회 검증
- 프롬프트, API, Python 스크립트 조회 정합성 검증

### 7단계: 워크플로우 세션 데이터 정합성 검증

- 워크플로우 세션 생성 및 PostgreSQL 저장 검증
- 세션 데이터 조회 및 스키마 정합성 검증

## 검증 결과

스크립트 실행 후 다음 정보가 출력됩니다:

- ✅ **성공**: 검증 통과 항목 수
- ❌ **실패**: 검증 실패 항목 수 및 상세 오류 메시지
- ⚠️ **경고**: 주의가 필요한 사항

## 문제 해결

### 모듈을 찾을 수 없는 오류

스크립트 실행 시 `Cannot find package` 오류가 발생하면:

1. 의존성 설치 확인:
```bash
npm install
```

2. TypeScript 컴파일 확인:
```bash
npm run build
```

3. 환경 변수 확인:
```bash
echo $DATABASE_URL
```

### 데이터베이스 연결 오류

PostgreSQL 연결이 실패하면:

1. 데이터베이스 서버 실행 확인
2. 연결 문자열 형식 확인 (`postgresql://user:password@host:port/dbname`)
3. 방화벽 및 네트워크 설정 확인

## 검증 범위

이 스크립트는 다음 정합성을 검증합니다:

1. **등록 관리 페이지 → PostgreSQL 스키마**: 등록된 리소스가 올바른 스키마 형식으로 저장되는지
2. **워크플로우 에디터 → JSON 형식**: 드래그앤드롭으로 생성된 노드가 올바른 JSON 구조를 가지는지
3. **워크플로우 저장 → PostgreSQL**: 워크플로우 정의가 올바르게 저장되고 조회되는지
4. **워크플로우 엔진 → 리소스 조회**: 등록된 리소스 ID로 실제 데이터를 조회할 수 있는지
5. **세션 데이터 → PostgreSQL**: 워크플로우 실행 세션이 올바르게 생성되는지

## 추가 검증 항목

필요에 따라 다음 항목도 추가 검증할 수 있습니다:

- 노드 간 데이터 전달 (inputMapping, outputMapping)
- 워크플로우 실행 결과 저장
- 노드 실행 순서 (topological sort)
- 에러 처리 및 로깅

