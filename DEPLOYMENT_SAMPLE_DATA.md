# 배포 시 샘플 데이터 생성 가이드

## 개요

애플리케이션 배포 시 테스트 및 데모를 위한 샘플 데이터를 자동으로 생성할 수 있습니다.

## 방법 1: 환경변수로 자동 초기화

### Azure App Service 설정

Application Settings에 다음 환경변수를 추가:

```
INIT_SAMPLE_DATA=true
```

애플리케이션 시작 시 자동으로 샘플 데이터가 생성됩니다.

### 생성되는 샘플 데이터

- **사용자**: admin (비밀번호: admin123)
- **AI 서비스 프로바이더**: OpenAI, Azure OpenAI, Anthropic
- **API 카테고리**: AI 완성, AI 임베딩, AI 분석, 데이터 수집
- **테마**: 기술혁신, 친환경 에너지, 바이오 헬스케어
- **프롬프트**: 시장 분석 프롬프트
- **API 호출**: 금융 데이터 API
- **워크플로우**: 시장 분석 워크플로우
- **금융 데이터**: 삼성전자, SK하이닉스, USD/KRW
- **뉴스 데이터**: 샘플 뉴스 2건

## 방법 2: 수동 실행

### Docker 컨테이너 내에서 실행

```bash
docker exec -it <container-name> node scripts/deploy-init-sample-data.js
```

또는:

```bash
docker exec -it <container-name> node scripts/create-comprehensive-sample-data.js
```

### 로컬에서 실행

```bash
node scripts/deploy-init-sample-data.js
```

또는:

```bash
node scripts/create-comprehensive-sample-regret.js
```

## 방법 3: SQL 스크립트 직접 실행

```bash
psql $DATABASE_URL -f database/init-sample-data.sql
```

## 스크립트 파일

### 1. `database/init-sample-data.sql`
- SQL 직접 실행 방식
- 빠르고 간단한 초기 데이터 생성
- 필수 테이블만 포함

### 2. `scripts/deploy-init-sample-data.js`
- Node.js 스크립트로 SQL 파일 실행
- 배포 환경에서 사용
- 에러 처리 포함

### 3. `scripts/create-comprehensive-sample-data.js`
- 포괄적인 샘플 데이터 생성
- 더 많은 테이블에 데이터 생성
- 개발/테스트 환경에 적합

### 4. `scripts/init-sample-data.js`
- 최소 필수 데이터만 생성
- 빠른 초기화
- 애플리케이rentice션 시작 시 옵션으로 실행

## 주의사항

1. **중복 방지**: 모든 스크립트는 중복 삽입을 방지하는 로직이 포함되어 있습니다.
2. **기존 데이터 보존**: 기존 데이터는 삭제하지 않습니다.
3. **권한 필요**: PostgreSQL 연결 권한이 필요합니다.
4. **환경변수**: `DATABASE_URL`이 올바르게 설정되어 있어야 합니다.

## Docker 이미지에 포함

샘플 데이터 생성 스크립트는 Docker 이미지에 포함되어 있습니다:

- `scripts/deploy-init-sample-data.js`
- `scripts/create-comprehensive-sample-data.js`
- `database/init-sample-data.sql`

이 파일들은 이미지 빌드 시 자동으로 포함됩니다.

## Azure App Service 배포 시 권장 설정

```bash
# Application Settings
INIT_SAMPLE_DATA=true
DATABASE_URL=postgresql://...
```

이렇게 설정하면 애플리케이션 시작 시 자동으로 샘플 데이터가 생성됩니다.

