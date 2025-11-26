# Azure ACR -> App Service 배포 가이드

## 개요

이 애플 leadership리케이션은 Azure Container Registry (ACR)를 통해 Azure App Service로 배포되도록 구성되었습니다.

## 주요 변경사항

### ✅ SQLite 완전 제거
- `server/db.ts`: SQLite 연결 코드 제거, PostgreSQL 전용
- `drizzle.config.ts`: PostgreSQL 전용으로 변경
- `package.json`: `better-sqlite3` 의존성 제거
- 모든 SQLite 관련 import 및 코드 제거

### ✅ 로컬 개발 환경 코드 제거
- `.env` 파일 로드 기능 제거
- `server/index.ts`: `loadEnvFile()` 함수 제거
- `server/db.ts`: 로컬 .env 파일 로드 제거
- 모든 환경변수는 Azure App Service Application Settings에서 관리

### ✅ Azure 환경 전용 구성
- PostgreSQL 연결에 SSL 필수로 설정
- 환경변수 기본값 제거 - 모든 설정은 Azure에서 필수로 제공
- `DATABASE_URL` 또는 개별 환경변수로 PostgreSQL 연결

## Docker 이미지 빌드

### 1. ACR에 로그인

```bash
az acr login --name <your-acr-name>
```

### 2. Docker 이미지 빌드 및 태깅

```bash
# 이미지 빌드
docker build -t aitrade-console:latest .

# ACR 태그 추가
docker tag aitrade-console:latest <your-acr-name>.azurecr.io/aitrade-console:latest
docker tag aitrade-console:latest <your-acr-name>.azurecr.io/aitrade-console:v1.2.0
```

### 3. ACR에 푸시

```bash
docker push <your-acr-name>.azurecr.io/aitrade-console:latest
docker push <your-acr-name>.azurecr.io/aitrade-console:v1.2.0
```

## Azure App Service 설정

### 필수 환경변수 (Application Settings)

다음 환경변수들을 Azure App Service의 Application Settings에 설정해야 합니다:

#### 데이터베이스 연결 (선택 1: DATABASE_URL 사용)
```
DATABASE_URL=postgresql://username:password@hostname:5432/database
```

#### 데이터베이스 연결 (선택 2: 개별 환경변수 사용)
```
AZURE_POSTGRES_HOST=your-postgres-server.postgres.database.azure.com
AZURE_POSTGRES_PORT=5432
AZURE_POSTGRES_DATABASE=your-database-name
AZURE_POSTGRES_USERNAME=your-username
AZURE_POSTGRES_PASSWORD=your-password
AZURE_POSTGRES_SSL=true
```

#### 기타 필수 Azure 서비스 설정
```
PORT=5000
NODE_ENV=production

# Azure OpenAI (필요시)
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment

# Azure Databricks (필요시)
AZURE_DATABRICKS_HOST=https://your-workspace.azuredatabricks.net
AZURE_DATABRICKS_TOKEN=your-token

# Azure AI Search (필요시)
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_API_KEY=your-search-key

# Azure CosmosDB (필요시)
AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-key
```

### App Service 컨테이너 설정

Azure Portal에서:
1. App Service -> Configuration -> General settings
2. Platform: Linux 선택
3. Always On: On
4. HTTP Version: 2.0

### App Service 컨테이너 배포

1. App Service -> Deployment Center
2. Source: Azure Container Registry 선택
3. Registry: ACR 이름 선택
4. Image: `aitrade-console`
5. Tag: `latest` 또는 버전 태그
 hag6. Continuous Deployment: 활성화 (선택사항)

## 배포 확인

### Health Check

애플리케이션은 다음 엔드포인트에서 헬스 체크를 제공합니다:

```bash
curl https://your-app.azurewebsites.net/api/system/status
```

### 로그 확인

```bash
az webapp log tail --name <your-app-name> --resource-group <your-resource-group>
```

## 문제 해결

### 데이터베이스 연결 실패

1. Application Settings에서 `DATABASE_URL` 또는 PostgreSQL 환경변수가 올바르게 설정되었는지 확인
2. Azure PostgreSQL 방화벽 규칙에서 App Service IP 허용
3. SSL 설정이 활성화되어 있는지 확인 (`AZURE_POSTGRES_SSL=true`)

### 컨테이너 시작 실패

1. App Service 로그에서 에러 메시지 확인
2. 환경변수가 모두 설정되었는지 확인
3. DATABASE_URL 형식이 올바른지 확인: `postgresql://user:pass@host:port/db`

## 빌드 및 배포 체크리스트

- [x] SQLite 코드 완전 제거
- [x] .env 파일 로드 코드 제거
- [x] Azure 환경변수 전용으로 변경
- [x] PostgreSQL SSL 필수 설정
- [x] Dockerfile ACR 배포 준비 완료
- [x] 패키지 의존성 정리 (better-sqlite3 제거)

## 참고사항

- 이 애플리케이션은 **로컬 개발 환경을 지원하지 않습니다**
- 모든 환경변수는 Azure App Service Application Settings에서 관리해야 합니다
- 로컬 테스트를 위해서는 Azure PostgreSQL을 사용하거나 별도의 PostgreSQL 인스턴스를 구성해야 합니다

