# 테스트 개선 요청사항 작업 계획서

## 작업 일시
2025-01-XX (작업 완료)

## 목표
테스트 결과를 바탕으로 사용자 경험 개선 및 기능 강화

---

## 0. 추가 요청사항 (우선 처리 완료)

### 0.1 사용자 계정 생성

**요청사항**:
- 6명의 사용자 계정을 PostgreSQL에 생성
- 초기 비밀번호: `NH123456789!`

**생성 계정**:
1. 박성범 - mydream1208@nhsec.com
2. 김기태 - kimkitae@nhsec.com
3. 이재근 - jaekeun@nhsec.com
4. 정하영 - hy.jung@nhsec.com
5. 이현정 - hjlee@nhsec.com
6. 김정국 - kjg121@nhsec.com

**수정 파일**:
- `scripts/create-users.ts` (신규 생성)

**실행 방법**:
```bash
npx tsx scripts/create-users.ts
```

**스키마 변경**: 없음 (기존 users 테이블 사용)

---

### 0.2 실제 이메일/비밀번호 로그인 구현

**요청사항**:
- 실제 이메일과 비밀번호로 로그인 가능하도록 구현
- 목업 계정 로그인 차단
- 로그인 화면의 목업 로그인 정보 텍스트 제거

**수정 파일**:
- `server/routes.ts` - `/api/auth/login` 엔드포인트 추가
- `client/src/contexts/auth-context.tsx` - 실제 API 호출하도록 수정
- `client/src/pages/login.tsx` - 목업 정보 텍스트 제거

**수정 내용**:
1. `POST /api/auth/login` API 엔드포인트 추가
   - 이메일/비밀번호 검증
   - bcrypt를 사용한 비밀번호 확인
   - 목업 계정 차단 로직 (test@nhqv.com 등)
2. `auth-context.tsx`에서 실제 로그인 API 호출
3. `login.tsx`에서 목업 로그인 안내 텍스트 제거

**스키마 변경**: 없음

**예상 효과**: 실제 사용자 계정으로 안전하게 로그인 가능

---

### 0.3 텍스트 선택 범위 표시 개선

**요청사항**:
- 텍스트 에디터에서 텍스트 드래그 시 선택 범위가 명확하게 보이도록 개선

**수정 파일**:
- `client/src/index.css`

**수정 내용**:
1. `::selection` 및 `::-moz-selection` 스타일 강화
2. Input 및 Textarea 전용 선택 스타일 추가
3. 다크모드에서도 명확하게 보이도록 스타일 추가
4. 선택 배경색 투명도 조정 (0.3 → 0.4, 다크모드 0.5 → 0.6)

**스키마 변경**: 없음

**예상 효과**: 텍스트 선택 시 시각적 피드백 명확화

---

### 0.4 파이썬 스크립트 실행 오류 수정

**요청사항**:
- 워크플로우 편집기에서 파이썬 스크립트 실행 시 `Cannot read properties of undefined (reading 'pythonScript')` 오류 수정

**수정 파일**:
- `server/services/workflow-execution-engine.ts`

**수정 내용**:
- `node.configuration`이 undefined일 수 있는 경우를 처리
- `const config = node.configuration || {};`로 기본값 설정

**스키마 변경**: 없음

**예상 효과**: 파이썬 스크립트 노드가 정상적으로 실행됨

---

## 1. 데이터소스 관리 페이지 개선

### 1.1 다크테마 콤보박스 배경 문제

**문제점**:
- 다크테마에서 SQL 쿼리 추가 박스의 콤보박스를 클릭했을 때 배경이 없는 현상 발생

**수정 파일**:
- `client/src/components/ui/select.tsx`

**수정 내용**:
- `SelectContent` 컴포넌트의 다크테마 배경 스타일 강화
- `bg-popover` 클래스가 다크모드에서 제대로 적용되도록 CSS 변수 확인 및 수정
- 다크모드 전용 배경색 명시적 지정

**스키마 변경**: 없음

**예상 효과**: 다크테마에서도 콤보박스가 명확하게 보이도록 개선

---

### 1.2 테이블 스키마 조회 기능 추가

**문제점**:
- 데이터소스 관리 페이지에서 테이블 스키마를 함께 볼 수 없음

**수정 파일**:
- `client/src/pages/data-source-management.tsx`
- `server/routes.ts` (API 엔드포인트 추가)

**수정 내용**:
1. 데이터소스 카드에 "스키마 보기" 버튼 추가
2. 스키마 조회 다이얼로그 컴포넌트 생성
3. 데이터소스 타입별 스키마 조회 API 호출:
   - PostgreSQL: `/api/postgresql/schema/:dataSourceId`
   - Databricks: `/api/databricks/schema/:dataSourceId`
   - 기타 타입별 적절한 엔드포인트
4. 테이블 목록 및 컬럼 정보 표시 (테이블명, 컬럼명, 타입, NULL 허용 여부 등)

**스키마 변경**: 없음 (기존 API 활용)

**예상 효과**: 데이터소스의 테이블 구조를 미리 확인하여 SQL 쿼리 작성 시 도움

**작업 완료**: ✅
- `/api/data-sources/:id/schema` API 엔드포인트 추가
- `SchemaViewer` 컴포넌트 생성하여 Databricks, PostgreSQL, CosmosDB 스키마 표시
- 데이터소스 카드에 "스키마 보기" 버튼 추가

---

## 2. 워크플로우 편집기 개선

### 2.1 구성요소 검색 기능 추가

**문제점**:
- 구성요소가 많아질 경우 스크롤이 길어져 원하는 구성요소를 찾기 힘듦

**수정 파일**:
- `client/src/components/workflow/node-palette.tsx`

**수정 내용**:
1. 검색 입력 필드 추가 (카테고리별 필터링)
2. 검색어에 따라 노드 목록 필터링
3. 카테고리 접기/펼치기 기능 추가 (Accordion 컴포넌트 활용)
4. 자주 사용하는 노드 즐겨찾기 기능 (선택사항)

**스키마 변경**: 없음

**예상 효과**: 구성요소 검색 시간 단축, 사용 편의성 향상

**작업 완료**: ✅
- 검색 입력 필드 추가 (카테고리별 필터링)
- 카테고리 접기/펼치기 기능 추가
- 검색 시 자동으로 모든 카테고리 펼치기

---

### 2.2 워크플로우 선택 및 폴더 정리 기능

**문제점**:
- 워크플로우 선택 시 기존 생성된 워크플로우 목록이 보이지 않음
- 폴더로 워크플로우를 정리할 수 없음

**수정 파일**:
- `client/src/pages/workflow-editor.tsx`
- `shared/schema.ts` (워크플로우 폴더 스키마 추가)
- `server/routes.ts` (폴더 관련 API 추가)
- `server/storage.ts` (폴더 저장 로직 추가)

**수정 내용**:

#### 2.2.1 스키마 변경
```typescript
// shared/schema.ts의 workflows 테이블에 추가
folderId: varchar("folder_id", { length: 36 }).references(() => workflowFolders.id),
folderPath: text("folder_path"), // 계층 구조 경로 (예: "folder1/subfolder1")

// 새로운 workflowFolders 테이블 추가
export const workflowFolders = pgTable("workflow_folders", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  parentId: varchar("parent_id", { length: 36 }).references(() => workflowFolders.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### 2.2.2 프론트엔드 수정
1. 워크플로우 편집기 상단에 워크플로우 선택 드롭다운 추가
2. 워크플로우 목록 표시 (트리 구조로 폴더 포함)
3. "새 워크플로우" 옵션을 맨 위에 배치
4. 폴더 생성/이름 변경/삭제 기능
5. 워크플로우를 폴더로 드래그 앤 드롭 이동 기능

#### 2.2.3 백엔드 수정
1. `GET /api/workflows` - 폴더 정보 포함하여 반환
2. `POST /api/workflow-folders` - 폴더 생성
3. `PUT /api/workflow-folders/:id` - 폴더 수정
4. `DELETE /api/workflow-folders/:id` - 폴더 삭제
5. `PUT /api/workflows/:id/folder` - 워크플로우 폴더 이동

**스키마 변경**: 
- `workflows` 테이블에 `folderId`, `folderPath` 컬럼 추가
- `workflow_folders` 테이블 신규 생성

**예상 효과**: 워크플로우 관리 효율성 향상, 대량의 워크플로우도 체계적으로 관리 가능

**작업 완료**: ✅
- `workflow_folders` 테이블 스키마 추가
- `workflows` 테이블에 `folderId`, `folderPath` 컬럼 추가
- 워크플로우 폴더 CRUD API 엔드포인트 추가
- 워크플로우 편집기 상단에 워크플로우 선택 드롭다운 추가
- 폴더 구조를 포함한 워크플로우 트리 표시
- "새 워크플로우" 옵션을 맨 위에 배치

---

### 2.3 속성패널 리프레시 문제 해결

**문제점**:
- SQL 노드 등 속성패널에서 SQL문이나 출력변수 이름 등을 수정하는데 중간에 자꾸 리프레시 되면서 적용사항이 사라짐

**수정 파일**:
- `client/src/components/workflow/properties-panel.tsx`
- `client/src/pages/workflow-editor.tsx`

**수정 내용**:
1. `useEffect` 의존성 배열 최적화 - 불필요한 리렌더링 방지
2. `formData` 상태 업데이트 시 debounce 적용
3. 노드 선택 변경 시에만 폼 데이터 리셋하도록 수정
4. 입력 중인 경우 자동 저장 방지 (사용자가 명시적으로 저장 버튼 클릭 시에만 저장)
5. `useMemo`를 활용하여 계산된 값 캐싱

**스키마 변경**: 없음

**예상 효과**: 속성패널에서 입력 중 데이터가 사라지는 문제 해결, 사용자 경험 개선

**작업 완료**: ✅
- `useRef`를 사용하여 이전 노드 ID 추적
- 노드가 실제로 변경될 때만 폼 데이터 리셋
- `useMemo`를 활용하여 노드 데이터 메모이제이션
- 불필요한 리렌더링 방지

---

### 2.4 노드 데이터 축약 표현

**문제점**:
- 노드 데이터가 많아질수록 노드 사이즈가 길어져서 보기 힘듦

**수정 파일**:
- `client/src/components/workflow/workflow-node.tsx`

**수정 내용**:
1. 노드 내부 데이터 표시 제한 (최대 3-5개 항목만 표시)
2. 나머지 데이터는 "..." 또는 "+N more" 형태로 표시
3. 노드 호버 시 툴팁으로 전체 데이터 표시
4. `config` 객체의 깊은 중첩 데이터는 최상위 레벨만 표시
5. 긴 문자열은 자동으로 truncate 처리

**스키마 변경**: 없음

**예상 효과**: 노드 크기 일정하게 유지, 워크플로우 전체 구조 파악 용이

**작업 완료**: ✅
- 노드 내부 데이터 표시 제한 (최대 3개 항목만 표시)
- 나머지 데이터는 "+N more" 형태로 표시
- 긴 문자열은 자동으로 truncate 처리 (30자 제한)
- 호버 시 툴팁으로 전체 데이터 표시 (title 속성 활용)

---

## 3. 전체 공통 개선

### 3.1 텍스트 선택 범위 표시 문제

**문제점**:
- 텍스트 인풋박스에서 텍스트 다중 선택 시 (드래그) 선택 범위가 보이지 않음

**수정 파일**:
- `client/src/components/ui/input.tsx`
- `client/src/components/ui/textarea.tsx`
- `client/src/index.css` (전역 스타일)

**수정 내용**:
1. `::selection` CSS 의사 요소 스타일 강화
2. 다크모드/라이트모드별 선택 범위 색상 명시적 지정
3. `user-select: text` 속성 확인 및 필요시 추가
4. 브라우저 호환성을 위한 vendor prefix 추가 (`-webkit-`, `-moz-`)

**스키마 변경**: 없음

**예상 효과**: 텍스트 선택 시 시각적 피드백 명확화, 사용자 편의성 향상

---

## 작업 우선순위

### 높음 (즉시 수정)
1. 텍스트 선택 범위 표시 문제 (3.1)
2. 다크테마 콤보박스 배경 문제 (1.1)
3. 속성패널 리프레시 문제 (2.3)

### 중간 (단기)
4. 구성요소 검색 기능 (2.1)
5. 노드 데이터 축약 표현 (2.4)
6. 테이블 스키마 조회 기능 (1.2)

### 낮음 (중기)
7. 워크플로우 선택 및 폴더 정리 기능 (2.2) - 스키마 변경 필요

---

## 예상 작업 시간

- 높음 우선순위: 4-6시간
- 중간 우선순위: 8-12시간
- 낮음 우선순위: 16-20시간

**총 예상 시간**: 28-38시간

---

## 참고사항

1. 스키마 변경이 필요한 작업(2.2)은 마이그레이션 스크립트 작성 필요
2. 다크테마 관련 수정은 실제 다크모드에서 테스트 필수
3. 속성패널 리프레시 문제는 다양한 노드 타입에서 테스트 필요
4. 폴더 기능은 기존 워크플로우와의 호환성 고려 필요
