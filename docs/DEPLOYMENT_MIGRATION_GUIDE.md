# 배포 전 마이그레이션 가이드

**작성일**: 2025-01-XX  
**버전**: 워크플로우 폴더 기능 추가

---

## 개요

이 문서는 배포팀이 소스코드를 배포하기 전에 실행해야 하는 데이터베이스 마이그레이션 가이드입니다.

### 변경 사항 요약

1. **새 테이블**: `workflow_folders` - 워크플로우 폴더 관리
2. **테이블 수정**: `workflows` - `folder_id`, `folder_path` 컬럼 추가

---

## 사전 준비사항

### 1. 환경 변수 확인

```bash
# DATABASE_URL 환경 변수 확인
echo $DATABASE_URL

# 또는 .env 파일 확인
cat .env | grep DATABASE_URL
```

### 2. 데이터베이스 백업 (프로덕션 환경 필수)

```bash
# 백업 파일 생성
pg_dump $DATABASE_URL > backup_before_workflow_folders_$(date +%Y%m%d_%H%M%S).sql

# 백업 파일 크기 확인
ls -lh backup_before_workflow_folders_*.sql
```

### 3. 기존 테이블 확인

```bash
# workflows 테이블 존재 확인
psql $DATABASE_URL -c "SELECT COUNT(*) FROM workflows;"

# users 테이블 존재 확인 (외래 키 참조)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

---

## 마이그레이션 실행 방법

### 방법 1: Bash 스크립트 사용 (권장)

```bash
# 실행 권한 확인
chmod +x database/run-workflow-folders-migration.sh

# 마이그레이션 실행
./database/run-workflow-folders-migration.sh
```

### 방법 2: Node.js 스크립트 사용

```bash
# 실행 권한 확인
chmod +x database/run-workflow-folders-migration.mjs

# 마이그레이션 실행
node database/run-workflow-folders-migration.mjs
```

### 방법 3: 직접 psql 사용

```bash
# 마이그레이션 실행
psql $DATABASE_URL -f migrations/001_add_workflow_folders.sql
```

---

## 마이그레이션 검증

마이그레이션 실행 후 다음 명령어로 검증하세요:

```sql
-- 1. workflow_folders 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'workflow_folders';

-- 2. workflows 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'workflows' 
  AND column_name IN ('folder_id', 'folder_path');

-- 3. 인덱스 확인
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('workflow_folders', 'workflows')
  AND indexname LIKE '%folder%';

-- 4. 외래 키 확인
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'workflow_folders' OR tc.table_name = 'workflows')
  AND (kcu.column_name LIKE '%folder%' OR kcu.column_name = 'parent_id');
```

---

## 롤백 방법

문제가 발생하여 마이그레이션을 되돌려야 하는 경우:

```sql
-- 1. workflows 테이블 컬럼 제거
ALTER TABLE workflows 
DROP COLUMN IF EXISTS folder_path,
DROP COLUMN IF EXISTS folder_id;

-- 2. 인덱스 제거
DROP INDEX IF EXISTS workflows_folder_id_idx;
DROP INDEX IF EXISTS workflow_folders_parent_id_idx;

-- 3. 테이블 제거 (주의: 데이터 손실)
DROP TABLE IF EXISTS workflow_folders CASCADE;
```

**주의**: 롤백 시 `workflow_folders` 테이블의 모든 데이터가 삭제됩니다. 필요시 먼저 백업하세요.

---

## 문제 해결

### 오류 1: "relation 'workflows' does not exist"

**원인**: `workflows` 테이블이 존재하지 않음

**해결**: 먼저 기본 스키마를 생성하세요
```bash
./database/init-database.sh
```

### 오류 2: "relation 'users' does not exist"

**원인**: `users` 테이블이 존재하지 않음 (외래 키 참조)

**해결**: 먼저 기본 스키마를 생성하세요
```bash
./database/init-database.sh
```

### 오류 3: "column 'folder_id' of relation 'workflows' already exists"

**원인**: 마이그레이션이 이미 실행됨

**해결**: 이 오류는 무시해도 됩니다. `IF NOT EXISTS` 구문으로 안전하게 처리됩니다.

---

## 배포 후 확인사항

마이그레이션 완료 후 다음을 확인하세요:

1. **애플리케이션 시작 확인**
   ```bash
   npm run dev
   # 또는
   npm start
   ```

2. **워크플로우 편집기 접근 확인**
   - 워크플로우 선택 드롭다운이 정상 작동하는지 확인
   - "새 워크플로우" 옵션이 맨 위에 표시되는지 확인

3. **API 엔드포인트 확인**
   ```bash
   # 워크플로우 폴더 목록 조회
   curl http://localhost:3000/api/workflow-folders
   ```

---

## 관련 문서

- **상세 마이그레이션 가이드**: `docs/MIGRATION_WORKFLOW_FOLDERS.md`
- **작업 계획서**: `docs/test-improvement-plan.md`
- **마이그레이션 SQL**: `migrations/001_add_workflow_folders.sql`

---

## 문의

마이그레이션 중 문제가 발생하면 다음 정보와 함께 문의하세요:

1. 실행한 명령어
2. 전체 오류 메시지
3. 데이터베이스 버전 (`psql --version`)
4. PostgreSQL 버전 (`psql $DATABASE_URL -c "SELECT version();"`)

