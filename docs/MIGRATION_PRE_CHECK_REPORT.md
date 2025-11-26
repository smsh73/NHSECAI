# 마이그레이션 실행 전 확인 보고서

**생성 일자**: 2025-11-03  
**마이그레이션**: success_code 필드 추가 (`application_logs` 테이블)

---

## ✅ 확인 완료 항목

### 1. 마이그레이션 파일 확인

- ✅ **마이그레이션 SQL 파일**: `database/migration-add-success-code.sql` 존재
- ✅ **Bash 실행 스크립트**: `database/run-migration.sh` 존재 및 실행 권한 확인
- ✅ **Node.js 실행 스크립트**: `database/run-migration.mjs` 존재
- ✅ **마이그레이션 가이드**: `docs/MIGRATION_GUIDE_SUCCESS_CODE.md` 존재
- ✅ **빠른 실행 가이드**: `README_MIGRATION.md` 존재

### 2. 소스 코드 변경사항 확인

#### 스키마 정의
- ✅ `shared/schema.ts`: `successCode` 필드가 `applicationLogs` 테이블 정의에 추가됨

#### 로깅 서비스
- ✅ `server/services/logger.ts`: 
  - `LogEntry` 인터페이스에 `successCode` 필드 추가
  - `writeLog()` 메서드에서 `successCode` 저장 지원
  - `logApiResponse()` 메서드에서 `responseData`에서 `successCode` 추출 로직 추가
  - `logWorkflowExecution()` 메서드에서 `outputData`에서 `successCode` 추출 로직 추가
  - `logDatabaseOperation()` 메서드에서 `resultData`에서 `successCode` 추출 로직 추가

#### 로깅 미들웨어
- ✅ `server/routes.ts`: `loggingMiddleware`에서 `responseData`의 에러/성공 정보 추출 로직 개선

#### 로그 뷰어
- ✅ `client/src/pages/log-viewer.tsx`: 
  - `LogEntry` 인터페이스에 `errorCode`, `successCode` 필드 추가
  - 로그 상세 화면에 `errorCode`, `successCode` 배지 표시 추가
  - 성공 상세 섹션 추가 (성공 코드 및 메시지 표시)
  - 검색 필터에 `errorCode`, `successCode` 포함

### 3. 마이그레이션 SQL 내용 확인

```sql
ALTER TABLE application_logs 
ADD COLUMN IF NOT EXISTS success_code VARCHAR(50);
```

**안전성**:
- ✅ `IF NOT EXISTS` 사용으로 중복 실행 안전
- ✅ 기존 데이터에 영향 없음 (NULL 허용 컬럼)
- ✅ 롤백 가능 (DROP COLUMN 사용)

---

## ⚠️ 실행 전 필요한 확인사항

### 1. 데이터베이스 연결 정보

**필요한 환경 변수**:
- `DATABASE_URL` (우선)
- 또는 `POSTGRES_URL`
- 또는 `POSTGRES_CONNECTION_STRING`

**확인 방법**:
```bash
# .env 파일 확인
cat .env | grep DATABASE_URL

# 또는 환경 변수 확인
echo $DATABASE_URL
```

**설정이 필요한 경우**:
```bash
# .env 파일에 추가
echo "DATABASE_URL=postgresql://user:password@host:port/database" >> .env

# 또는 직접 export
export DATABASE_URL="postgresql://user:password@host:port/database"
```

### 2. application_logs 테이블 존재 확인

**확인 방법** (데이터베이스 연결 후):
```sql
-- 테이블 존재 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'application_logs'
);
```

**테이블이 없는 경우**:
```bash
# 기본 스키마 생성
./database/init-database.sh

# 또는 Drizzle 마이그레이션
npm run db:push
```

### 3. 현재 success_code 컬럼 존재 여부

**확인 방법** (데이터베이스 연결 후):
```sql
-- 컬럼 존재 확인
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_name = 'application_logs' 
    AND column_name = 'success_code'
);
```

**이미 존재하는 경우**:
- ✅ 마이그레이션은 `IF NOT EXISTS`를 사용하므로 안전하게 실행 가능
- 중복 실행해도 오류 발생하지 않음

### 4. 백업 권장 (프로덕션 환경)

**백업 실행**:
```bash
# 전체 데이터베이스 백업
pg_dump $DATABASE_URL > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# 또는 application_logs 테이블만 백업
pg_dump $DATABASE_URL -t application_logs > backup_application_logs_$(date +%Y%m%d_%H%M%S).sql
```

---

## 📋 실행 전 체크리스트

### 필수 확인사항
- [ ] 데이터베이스 연결 정보 설정 (`DATABASE_URL` 환경 변수)
- [ ] 데이터베이스 연결 테스트 성공
- [ ] `application_logs` 테이블 존재 확인
- [ ] 마이그레이션 파일 존재 확인 (`database/migration-add-success-code.sql`)

### 권장 확인사항
- [ ] 현재 `success_code` 컬럼 존재 여부 확인 (선택사항)
- [ ] 데이터베이스 백업 (프로덕션 환경 권장)
- [ ] 애플리케이션 중지 또는 다운타임 계획 (선택사항)

### 실행 후 확인사항
- [ ] 마이그레이션 실행 성공 확인
- [ ] `success_code` 컬럼 추가 확인
- [ ] 애플리케이션 재시작
- [ ] 새로운 로그 생성 테스트
- [ ] 로그 뷰어에서 `success_code` 표시 확인

---

## 🔍 실행 전 자동 확인 스크립트

### Bash 스크립트 실행
```bash
./database/run-migration.sh
```

스크립트가 자동으로 다음을 확인합니다:
1. ✅ DATABASE_URL 환경 변수 설정 확인
2. ✅ 데이터베이스 연결 테스트
3. ✅ `application_logs` 테이블 존재 확인
4. ✅ `success_code` 컬럼 존재 여부 확인
5. ✅ 마이그레이션 실행
6. ✅ 마이그레이션 결과 확인

### Node.js 스크립트 실행
```bash
node database/run-migration.mjs
```

---

## ⚠️ 주의사항

1. **데이터베이스 접근 권한**: 마이그레이션 실행을 위해 `ALTER TABLE` 권한이 필요합니다.

2. **기존 데이터**: 기존 로그 데이터에는 `success_code`가 NULL로 저장됩니다. 필요한 경우 후속 마이그레이션으로 `response_data`에서 추출할 수 있습니다.

3. **애플리케이션 재시작**: 마이그레이션 완료 후 애플리케이션을 재시작하여 변경된 로깅 로직이 적용되도록 해야 합니다.

4. **로깅 활성화**: 로그 뷰어에서 새로운 필드를 확인하려면 로깅이 활성화되어 있어야 합니다.

---

## 🚀 실행 준비 완료

모든 소스 코드 변경사항이 반영되었고, 마이그레이션 파일이 준비되었습니다.

**다음 단계**:
1. 데이터베이스 연결 정보 확인
2. 마이그레이션 실행 스크립트 실행
3. 마이그레이션 결과 확인
4. 애플리케이션 재시작

---

## 📞 문제 발생 시

### 오류: "DATABASE_URL 환경 변수가 설정되지 않았습니다"
- `.env` 파일에 `DATABASE_URL` 추가
- 또는 환경 변수로 직접 설정

### 오류: "application_logs 테이블이 존재하지 않습니다"
- 먼저 기본 스키마 생성: `./database/init-database.sh`
- 또는 Drizzle 마이그레이션: `npm run db:push`

### 오류: "데이터베이스 연결 실패"
- 데이터베이스 연결 정보 확인
- 네트워크 연결 확인
- 방화벽 규칙 확인

---

**문서 작성일**: 2025-11-03  
**마이그레이션 버전**: v1.0.0

