# 워크플로우 정합성 검증 요약

## 완료된 작업

### 1. Properties Panel 필드 추가
- 프롬프트 노드: `inputSchema`, `outputSchema`, `parameters`, `executionType`
- API 노드: `headers`, `requestSchema`, `responseSchema`, `parameterTemplate`, `preprocessPrompt`, `postprocessPrompt`
- Python 노드: `exampleInput`, `exampleOutput`
- 모든 노드: `inputMapping`, `outputMapping` (입출력 데이터 매핑)

### 2. 워크플로우 정합성 검증 스크립트 작성
`scripts/validate-workflow-consistency.mjs` 파일을 생성하여 다음을 검증합니다:

1. **프롬프트 등록 → PostgreSQL 스키마 저장/조회 정합성**
2. **API 등록 → PostgreSQL 스키마 저장/조회 정합성**
3. **Python 스크립트 등록 → PostgreSQL 스키마 저장/조회 정합성**
4. **워크플로우 정의 JSON 형식 정합성** (nodes, edges, configuration)
5. **워크플로우 저장 → PostgreSQL 스키마 저장/조회 정합성**
6. **워크플로우 엔진 실행 준비 검증** (등록된 리소스 ID로 조회)
7. **워크플로우 세션 데이터 정합성**

## 검증 스크립트 실행 방법

### 환경 변수 설정
```bash
export DATABASE_URL="postgresql://username:password@host:port/database"
```

### 스크립트 실행
```bash
# npm 스크립트로 실행 (권장)
npm run validate:workflow

# 또는 tsx로 직접 실행
npx tsx scripts/validate-workflow-consistency.mjs
```

## 검증 항목

### 등록 관리 페이지 정합성
- 프롬프트, API, Python 스크립트가 PostgreSQL 스키마에 올바르게 저장되는지
- 모든 필드가 올바른 형식으로 저장되고 조회되는지
- JSON 스키마 필드 (`inputSchema`, `outputSchema`, `requestSchema`, `responseSchema`) 정합성

### 워크플로우 에디터 정합성
- 드래그앤드롭으로 생성된 노드가 올바른 JSON 구조를 가지는지
- 등록된 리소스 ID (`promptId`, `apiCallId`, `pythonScriptId`)가 configuration에 포함되는지
- `edges` 배열이 올바르게 저장되는지

### 워크플로우 엔진 실행 정합성
- 등록된 리소스 ID로 실제 데이터를 조회할 수 있는지
- 노드 configuration에서 리소스 ID를 사용하여 올바른 데이터를 로드하는지
- 세션 데이터가 올바르게 생성되고 저장되는지

## 검증 결과 예시

```
🚀 워크플로우 정합성 검증 시작
============================================================

=== 1단계: 프롬프트 등록 관리 → PostgreSQL 스키마 정합성 검증 ===
✅ 프롬프트 저장 성공: <uuid>
✅ 프롬프트 스키마 정합성 검증 완료

=== 2단계: API 등록 관리 → PostgreSQL 스키마 정합성 검증 ===
✅ API 저장 성공: <uuid>
✅ API 스키마 정합성 검증 완료

... (나머지 단계들)

============================================================

📊 검증 결과 요약

✅ 성공: XX개
❌ 실패: 0개
⚠️  경고: 0개
```

## 다음 단계

검증 스크립트를 실행하여 다음을 확인하세요:

1. 모든 등록 관리 페이지의 데이터 저장 정합성
2. 워크플로우 에디터의 JSON 형식 정합성
3. 워크플로우 엔진의 리소스 조회 정합성
4. PostgreSQL 스키마와 실제 데이터 구조 정합성

검증 결과를 바탕으로 필요시 추가 수정을 진행하세요.

