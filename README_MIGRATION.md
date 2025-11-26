# success_code 필드 추가 마이그레이션 실행 가이드

**날짜**: 2025-11-03

---

## 빠른 실행 가이드

### 방법 1: Bash 스크립트 사용 (권장)

```bash
# 실행 권한 확인 (이미 부여됨)
chmod +x database/run-migration.sh

# 마이그레이션 실행
./database/run-migration.sh
```

또는:

```bash
bash database/run-migration.sh
```

### 방법 2: Node.js 스크립트 사용

```bash
node database/run-migration.mjs
```

### 방법 3: 직접 psql 사용

```bash
# 환경 변수에서 데이터베이스 URL 확인
echo $DATABASE_URL

# 마이그레이션 실행
psql $DATABASE_URL -f database/migration-add-success-code.sql
```

---

## 실행 전 확인사항

1. **데이터베이스 연결 정보 설정**
   - `.env` 파일에 `DATABASE_URL` 환경 변수 설정
   - 또는 `export DATABASE_URL='postgresql://user:pass@host:port/db'`

2. **application_logs 테이블 존재 확인**
   - 테이블이 없다면 먼저 기본 스키마 생성 필요:
     ```bash
     ./database/init-database.sh
     ```

3. **백업 권장** (프로덕션 환경)
   ```bash
   pg_dump $DATABASE_URL > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
   ```

---

## 마이그레이션 내용

- **추가되는 필드**: `success_code` VARCHAR(50)
- **테이블**: `application_logs`
- **안전성**: `IF NOT EXISTS` 사용으로 중복 실행 가능

---

## 마이그레이션 검증

마이그레이션 실행 후:

```sql
-- 컬럼 확인
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'application_logs' 
  AND column_name = 'success_code';
```

---

## 상세 문서

- **마이그레이션 가이드**: `docs/MIGRATION_GUIDE_SUCCESS_CODE.md`
- **분석 문서**: `docs/LOG_FIELD_ANALYSIS.md`
- **마이그레이션 파일**: `database/migration-add-success-code.sql`

