# 배포 가이드

**작성일**: 2025-01-XX  
**버전**: 워크플로우 폴더 기능 추가

---

## 빠른 시작

### 1. 마이그레이션 실행

```bash
# 방법 1: Bash 스크립트 (권장)
./database/run-workflow-folders-migration.sh

# 방법 2: Node.js 스크립트
node database/run-workflow-folders-migration.mjs

# 방법 3: 직접 psql
psql $DATABASE_URL -f migrations/001_add_workflow_folders.sql
```

### 2. 애플리케이션 빌드 및 실행

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# 실행
npm start
```

---

## 주요 변경 사항

### 데이터베이스 스키마 변경

1. **새 테이블**: `workflow_folders`
   - 워크플로우를 폴더로 정리할 수 있는 기능
   - 계층 구조 지원 (parent_id)

2. **테이블 수정**: `workflows`
   - `folder_id`: 워크플로우가 속한 폴더 ID
   - `folder_path`: 폴더 계층 구조 경로

### 기능 개선

1. **데이터소스 관리 페이지**
   - 다크테마 콤보박스 배경 문제 수정
   - 테이블 스키마 조회 기능 추가

2. **워크플로우 편집기**
   - 구성요소 검색 기능 추가
   - 워크플로우 선택 및 폴더 정리 기능
   - 속성패널 리프레시 문제 해결
   - 노드 데이터 축약 표현

---

## 상세 문서

- **배포 마이그레이션 가이드**: `docs/DEPLOYMENT_MIGRATION_GUIDE.md`
- **마이그레이션 가이드**: `docs/MIGRATION_WORKFLOW_FOLDERS.md`
- **배포 체크리스트**: `DEPLOYMENT_CHECKLIST.md`
- **작업 계획서**: `docs/test-improvement-plan.md`

---

## 문제 해결

마이그레이션 중 문제가 발생하면 `docs/DEPLOYMENT_MIGRATION_GUIDE.md`의 "문제 해결" 섹션을 참고하세요.

