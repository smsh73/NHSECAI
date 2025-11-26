# 스키마 검증 가이드

## 개요

이 문서는 스키마 로딩 검증 시스템에 대한 설명입니다. 배포 전에 스키마가 올바르게 정의되고 로드되는지 확인하는 방법을 안내합니다.

## 문제 배경

과거에 다음과 같은 문제가 발생했습니다:

- **에러**: `TypeError: Cannot read properties of undefined (reading 'Symbol(drizzle:ViewBaseConfig)')`
- **원인**: 테이블 정의가 `createInsertSchema` 호출보다 뒤에 있어서, 스키마 생성 시점에 테이블이 정의되지 않았음
- **발견 시점**: 배포 후 런타임에서만 발견됨

이 문제는 TypeScript 컴파일 타임에는 발견되지 않았습니다. TypeScript는 타입 체크만 수행하고, 실제 모듈 로딩 순서는 확인하지 않기 때문입니다.

## 해결 방법

### 1. 스키마 검증 스크립트

`scripts/validate-schema-loading.ts` 스크립트가 모든 스키마가 올바르게 로드되는지 검증합니다.

**실행 방법:**
```bash
npm run validate:schema
```

**검증 항목:**
- 모든 필수 테이블이 정의되어 있는지 확인
- 모든 Insert Schema가 정의되어 있는지 확인
- 스키마 로딩 시 에러가 발생하지 않는지 확인

### 2. 빌드 전 자동 검증

`package.json`에 `prebuild` 훅이 설정되어 있어, 빌드 전에 자동으로 스키마 검증이 실행됩니다.

```bash
npm run build  # 자동으로 validate:schema가 먼저 실행됨
```

### 3. Jest 테스트

`server/__tests__/schema-validation.test.ts` 테스트가 스키마 로딩을 검증합니다.

**실행 방법:**
```bash
npm test schema-validation
```

**테스트 항목:**
- 모든 스키마가 에러 없이 로드되는지 확인
- 모든 Insert Schema가 정의되어 있는지 확인
- Insert Schema가 유효한 Zod schema인지 확인

## 사용 가이드

### 개발 중

개발 중에는 스키마를 수정한 후 다음 명령어로 검증하세요:

```bash
npm run validate:schema
```

### 배포 전

배포 전에는 다음을 실행하세요:

```bash
# 1. 스키마 검증
npm run validate:schema

# 2. 타입 체크
npm run check

# 3. 테스트 실행
npm test

# 4. 빌드 (자동으로 스키마 검증 포함)
npm run build
```

### CI/CD 파이프라인

CI/CD 파이프라인에서는 다음 순서로 검증하세요:

```yaml
- npm run validate:schema
- npm run check
- npm run test:ci
- npm run build
```

## 스키마 작성 규칙

스키마를 작성할 때 다음 규칙을 준수하세요:

### 1. 테이블 정의 순서

테이블 정의는 반드시 `createInsertSchema` 호출 **이전**에 완료되어야 합니다.

**올바른 예:**
```typescript
// 1. 테이블 정의
export const myTable = pgTable("my_table", {
  id: varchar("id", { length: 36 }).primaryKey(),
  // ...
});

// 2. Type exports (선택적)
export type MyTable = typeof myTable.$inferSelect;
export type InsertMyTable = typeof myTable.$inferInsert;

// 3. Insert Schema 생성
export const insertMyTableSchema = createInsertSchema(myTable);
```

**잘못된 예:**
```typescript
// ❌ 잘못된 순서: createInsertSchema가 테이블 정의 전에 호출됨
export const insertMyTableSchema = createInsertSchema(myTable);

export const myTable = pgTable("my_table", {
  // ...
});
```

### 2. 파일 구조

`shared/schema.ts` 파일의 권장 구조:

1. Import 문
2. 테이블 정의들 (모든 테이블)
3. Type exports
4. Insert Schema 생성
5. Relations 정의

### 3. 새로운 테이블 추가 시

새로운 테이블을 추가할 때:

1. 테이블 정의를 적절한 위치에 추가
2. Type exports 추가 (필요한 경우)
3. Insert Schema 생성 추가
4. `validate:schema` 스크립트 실행하여 검증
5. 테스트 실행

## 트러블슈팅

### 스키마 로딩 에러 발생 시

1. **에러 메시지 확인**
   ```bash
   npm run validate:schema
   ```

2. **테이블 정의 순서 확인**
   - 테이블이 `createInsertSchema` 호출 전에 정의되어 있는지 확인

3. **중복 정의 확인**
   - 같은 테이블이 여러 곳에 정의되어 있지 않은지 확인

4. **의존성 확인**
   - 테이블 간 참조가 올바른지 확인

### 빌드 실패 시

빌드가 실패하면:

1. 스키마 검증 스크립트를 먼저 실행
2. 에러 메시지를 확인
3. 문제를 수정한 후 다시 빌드

## 참고 자료

- [Drizzle ORM 문서](https://orm.drizzle.team/)
- [Drizzle Zod 문서](https://orm.drizzle.team/docs/zod)
- [Zod 문서](https://zod.dev/)

