# 워크플로우 폴더 기능 마이그레이션 가이드

**날짜**: 2025-01-XX  
**마이그레이션 파일**: `migrations/001_add_workflow_folders.sql`

---

## 개요

이 마이그레이션은 워크플로우를 폴더로 정리할 수 있는 기능을 추가합니다.

### 변경 사항

1. **새 테이블**: `workflow_folders`
   - 워크플로우 폴더 정보 저장
   - 계층 구조 지원 (parent_id)

2. **기존 테이블 수정**: `workflows`
   - `folder_id`: 워크플로우가 속한 폴더 ID
   - `folder_path`: 폴더 계층 구조 경로

---

## 빠른 실행 가이드

### 방법 1: Bash 스크립트 사용 (권장)

```bash
# 실행 권한 확인 (이미 부여됨)
chmod +x database/run-workflow-folders-migration.sh

# 마이그레이션 실행
./database/run-workflow-folders-migration.sh
```

### 방법 2: Node.js 스크립트 사용

```bash
node database/run-workflow-folders-migration.mjs
```

### 방법 3: 직접 psql 사용

```bash
# 환경 변수에서 데이터베이스 URL 확인
echo $DATABASE_URL

# 마이그레이션 실행
psql $DATABASE_URL -f migrations/001_add_workflow_folders.sql
```

---

## 실행 전 확인사항

1. **데이터베이스 연결 정보 설정**
   - `.env` 파일에 `DATABASE_URL` 환경 변수 설정
   - 또는 `export DATABASE_URL='postgresql://user:pass@host:port/db'`

2. **기존 테이블 존재 확인**
   - `workflows` 테이블이 존재해야 함
   - `users` 테이블이 존재해야 함 (외래 키 참조)

3. **백업 권장** (프로덕션 환경)
   ```bash
   pg_dump $DATABASE_URL > backup_before_workflow_folders_$(date +%Y%m%d_%H%M%S).sql
   ```

---

## 마이그레이션 내용

### 1. workflow_folders 테이블 생성

```sql
CREATE TABLE workflow_folders (
    id VARCHAR(36) PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id VARCHAR(36) REFERENCES workflow_folders(id),
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. workflows 테이블 컬럼 추가

```sql
ALTER TABLE workflows 
ADD COLUMN folder_id VARCHAR(36) REFERENCES workflow_folders(id),
ADD COLUMN folder_path TEXT;
```

### 3. 인덱스 생성

- `workflow_folders_parent_id_idx`: parent_id 조회 성능 향상
- `workflows_folder_id_idx`: folder_id 조회 성능 향상

---

## 마이그레이션 검증

마이그레이션 실행 후:

```sql
-- 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'workflow_folders';

-- 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workflows' 
  AND column_name IN ('folder_id', 'folder_path');

-- 인덱스 확인
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('workflow_folders', 'workflows')
  AND indexname LIKE '%folder%';
```

---

## 롤백 방법

마이그레이션을 되돌리려면:

```sql
-- workflows 테이블 컬럼 제거
ALTER TABLE workflows 
DROP COLUMN IF EXISTS folder_path,
DROP COLUMN IF EXISTS folder_id;

-- 인덱스 제거
DROP INDEX IF EXISTS workflows_folder_id_idx;
DROP INDEX IF EXISTS workflow_folders_parent_id_idx;

-- 테이블 제거
DROP TABLE IF EXISTS workflow_folders;
```

---

## 주의사항

1. **기존 데이터**: 기존 워크플로우의 `folder_id`와 `folder_path`는 `NULL`로 설정됩니다.

2. **외래 키 제약**: `folder_id`는 `workflow_folders` 테이블의 `id`를 참조합니다. 폴더를 삭제하기 전에 해당 폴더에 속한 워크플로우를 먼저 이동해야 합니다.

3. **중복 실행**: `IF NOT EXISTS` 및 `IF EXISTS` 구문을 사용하여 중복 실행 시 오류가 발생하지 않습니다.

---

## 관련 파일

- **마이그레이션 SQL**: `migrations/001_add_workflow_folders.sql`
- **실행 스크립트 (Bash)**: `database/run-workflow-folders-migration.sh`
- **실행 스크립트 (Node.js)**: `database/run-workflow-folders-migration.mjs`
- **스키마 정의**: `shared/schema.ts`

