# 배포 전 체크리스트

**작성일**: 2025-01-XX  
**버전**: 워크플로우 폴더 기능 추가

---

## ✅ 사전 준비

- [ ] 데이터베이스 백업 완료
- [ ] DATABASE_URL 환경 변수 설정 확인
- [ ] 기존 테이블 존재 확인 (`workflows`, `users`)

## ✅ 마이그레이션 실행

- [ ] 마이그레이션 파일 확인 (`migrations/001_add_workflow_folders.sql`)
- [ ] 마이그레이션 스크립트 실행
  - [ ] 방법 1: `./database/run-workflow-folders-migration.sh`
  - [ ] 방법 2: `node database/run-workflow-folders-migration.mjs`
  - [ ] 방법 3: `psql $DATABASE_URL -f migrations/001_add_workflow_folders.sql`

## ✅ 마이그레이션 검증

- [ ] `workflow_folders` 테이블 생성 확인
- [ ] `workflows.folder_id` 컬럼 추가 확인
- [ ] `workflows.folder_path` 컬럼 추가 확인
- [ ] 인덱스 생성 확인
- [ ] 외래 키 제약 조건 확인

## ✅ 애플리케이션 배포

- [ ] 소스코드 빌드 (`npm run build`)
- [ ] 환경 변수 설정 확인
- [ ] 애플리케이션 시작 테스트
- [ ] 워크플로우 편집기 접근 확인
- [ ] 워크플로우 선택 드롭다운 작동 확인

## ✅ 기능 테스트

- [ ] 워크플로우 선택 드롭다운 표시 확인
- [ ] "새 워크플로우" 옵션 표시 확인
- [ ] 기존 워크플로우 목록 표시 확인
- [ ] 폴더 기능 (향후 구현 시 테스트)

## ✅ 롤백 준비 (필요시)

- [ ] 롤백 SQL 스크립트 확인
- [ ] 롤백 절차 문서화 확인

---

## 주요 변경 파일

### 프론트엔드
- `client/src/components/ui/select.tsx` - 다크테마 배경 수정
- `client/src/pages/data-source-management.tsx` - 스키마 조회 기능
- `client/src/components/workflow/node-palette.tsx` - 검색 기능
- `client/src/components/workflow/properties-panel.tsx` - 리프레시 문제 해결
- `client/src/components/workflow/workflow-node.tsx` - 데이터 축약 표현
- `client/src/pages/workflow-editor.tsx` - 워크플로우 선택 UI

### 백엔드
- `server/routes.ts` - 스키마 조회 및 폴더 관리 API
- `server/storage.ts` - 워크플로우 폴더 관리 메서드

### 스키마
- `shared/schema.ts` - `workflow_folders` 테이블 및 관계 추가

### 마이그레이션
- `migrations/001_add_workflow_folders.sql` - 마이그레이션 SQL
- `database/run-workflow-folders-migration.sh` - 실행 스크립트 (Bash)
- `database/run-workflow-folders-migration.mjs` - 실행 스크립트 (Node.js)

---

## 참고 문서

- **배포 마이그레이션 가이드**: `docs/DEPLOYMENT_MIGRATION_GUIDE.md`
- **상세 마이그레이션 가이드**: `docs/MIGRATION_WORKFLOW_FOLDERS.md`
- **작업 계획서**: `docs/test-improvement-plan.md`
