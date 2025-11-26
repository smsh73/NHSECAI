# success_code 필드 추가 마이그레이션 가이드

**날짜**: 2025-11-03  
**마이그레이션 파일**: `database/migration-add-success-code.sql`

---

## 개요

`application_logs` 테이블에 `success_code` 컬럼을 추가하여 로그 분석 기능을 개선합니다.

## 마이그레이션 내용

### 추가되는 필드
- `success_code` VARCHAR(50): 성공 응답의 코드를 저장하는 필드

### 변경 사항
1. **스키마 파일**: `shared/schema.ts` - `successCode` 필드 추가됨
2. **로깅 서비스**: `server/services/logger.ts` - 성공 코드 추출 로직 추가
3. **로그 뷰어**: `client/src/pages/log-viewer.tsx` - 성공 코드 표시 추가
4. **데이터베이스**: `application_logs` 테이블에 `success_code` 컬럼 추가 필요

---

## 마이그레이션 실행 방법

### 방법 1: psql 명령줄 사용

```bash
# 환경 변수에서 데이터베이스 연결 정보 확인
echo $DATABASE_URL

# 마이그레이션 실행
psql $DATABASE_URL -f database/migration-add-success-code.sql
```

또는 직접 연결 정보 지정:

```bash
psql -h localhost -U your_username -d your_database -f database/migration-add-success-code.sql
```

### 방법 2: Node.js 스크립트 사용

`database/run-schema.mjs`를 참고하여 마이그레이션 스크립트 실행:

```bash
node database/run-schema.mjs database/migration-add-success-code.sql
```

### 방법 3: 데이터베이스 관리 도구 사용

pgAdmin, DBeaver, 또는 기타 PostgreSQL 관리 도구에서 마이그레이션 SQL 파일을 직접 실행:

```sql
-- database/migration-add-success-code.sql 파일 내용 실행
ALTER TABLE application_logs 
ADD COLUMN IF NOT EXISTS success_code VARCHAR(50);
```

---

## 마이그레이션 검증

### 1. 컬럼 추가 확인

```sql
-- application_logs 테이블 구조 확인
\d application_logs

-- 또는
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'application_logs' 
  AND column_name = 'success_code';
```

예상 결과:
```
column_name   | data_type          | character_maximum_length
--------------+--------------------+-------------------------
success_code  | character varying  | 50
```

### 2. 기존 데이터 확인

```sql
-- 기존 로그 중 success_code가 있는 응답 데이터 확인
SELECT 
  id,
  endpoint,
  status,
  http_status_code,
  response_data->>'successCode' as extracted_success_code,
  success_code
FROM application_logs
WHERE response_data IS NOT NULL
  AND response_data->>'successCode' IS NOT NULL
LIMIT 10;
```

### 3. 새 로그 저장 확인

애플리케이션을 실행하고 성공 응답을 생성한 후:

```sql
-- 최신 로그에서 success_code 확인
SELECT 
  id,
  endpoint,
  status,
  success_code,
  success_message,
  created_at
FROM application_logs
WHERE success_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## 기존 데이터 마이그레이션 (선택사항)

기존 로그 데이터에서 `response_data`의 `successCode`를 추출하여 저장하려면:

```sql
-- response_data에서 successCode 추출하여 저장
UPDATE application_logs 
SET success_code = (response_data->>'successCode')::VARCHAR(50)
WHERE response_data IS NOT NULL 
  AND response_data->>'successCode' IS NOT NULL
  AND success_code IS NULL;
```

**주의**: 이 작업은 기존 로그 데이터가 많은 경우 시간이 걸릴 수 있습니다. 프로덕션 환경에서는 비즈니스 시간 외에 실행하는 것을 권장합니다.

---

## 롤백 방법

마이그레이션을 되돌리려면:

```sql
-- success_code 컬럼 제거
ALTER TABLE application_logs 
DROP COLUMN IF EXISTS success_code;
```

**주의**: 롤백 시 `success_code`에 저장된 모든 데이터가 삭제됩니다.

---

## 영향받는 기능

### 로깅 기능 개선
- ✅ API 응답 로깅 시 `responseData.successCode` 추출
- ✅ 워크플로우 실행 로깅 시 `outputData.successCode` 추출
- ✅ 데이터베이스 작업 로깅 시 `resultData.successCode` 추출

### 로그 뷰어 개선
- ✅ 로그 목록에 성공 코드 배지 표시
- ✅ 로그 상세 화면에 성공 코드 및 메시지 섹션 추가
- ✅ 검색 필터에 성공 코드 포함

---

## 문제 해결

### 오류: "column already exists"
이미 `success_code` 컬럼이 존재하는 경우입니다. 마이그레이션은 `IF NOT EXISTS`를 사용하므로 안전하게 실행할 수 있습니다.

### 오류: "relation does not exist"
`application_logs` 테이블이 아직 생성되지 않았습니다. 먼저 기본 스키마를 생성해야 합니다:

```bash
psql $DATABASE_URL -f database/unified-schema.sql
```

또는

```bash
psql $DATABASE_URL -f database/create-complete-schema.sql
```

### 성공 코드가 표시되지 않는 경우
1. 애플리케이션이 재시작되었는지 확인
2. 새로운 로그가 생성되는지 확인 (기존 로그에는 저장되지 않음)
3. API 응답에 `successCode` 필드가 포함되어 있는지 확인

---

## 참고 자료

- **마이그레이션 파일**: `database/migration-add-success-code.sql`
- **스키마 정의**: `shared/schema.ts` (라인 5331)
- **로깅 서비스**: `server/services/logger.ts`
- **로그 뷰어**: `client/src/pages/log-viewer.tsx`
- **분석 문서**: `docs/LOG_FIELD_ANALYSIS.md`

---

## 마이그레이션 완료 확인 체크리스트

- [ ] 마이그레이션 SQL 실행 완료
- [ ] 컬럼 추가 확인 (`\d application_logs`)
- [ ] 애플리케이션 재시작
- [ ] 새 로그 생성 테스트
- [ ] 로그 뷰어에서 성공 코드 표시 확인
- [ ] 기존 데이터 마이그레이션 실행 (선택사항)

---

**마이그레이션 완료 후**: 애플리케이션을 재시작하여 변경된 로깅 로직이 적용되도록 해주세요.

