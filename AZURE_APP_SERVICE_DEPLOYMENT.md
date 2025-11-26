# Azure App Service 배포 가이드

NH Investment & Securities AI Platform을 Azure App Service와 Azure Container Registry를 통해 배포하는 완전한 가이드입니다.

## 📋 목차

1. [사전 준비사항](#사전-준비사항)
2. [빠른 배포](#빠른-배포)
3. [환경변수 설정](#환경변수-설정)
4. [수동 배포](#수동-배포)
5. [배포 후 확인](#배포-후-확인)
6. [문제 해결](#문제-해결)

---

## 사전 준비사항

### 필수 도구

- **Azure CLI**: [설치 가이드](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- **Docker**: [설치 가이드](https://docs.docker.com/get-docker/)
- **Azure 구독**: 활성화된 Azure 구독 필요

### Azure 리소스

다음 Azure 리소스들이 필요합니다:

- Azure Container Registry (ACR)
- Azure App Service Plan
- Azure App Service (Web App)

배포 스크립트가 자동으로 생성하거나, 수동으로 미리 생성할 수 있습니다.

---

## 빠른 배포

### 1단계: 환경변수 설정

```bash
export ACR_NAME="your-acr-name"              # ACR 이름 (전역 고유)
export RESOURCE_GROUP="nh-financial-rg"      # 리소스 그룹
export APP_SERVICE_NAME="nh-financial-app"   # App Service 이름 (전역 고유)
export APP_SERVICE_PLAN="nh-financial-plan"  # App Service Plan 이름
export LOCATION="koreacentral"               # 한국 중부 리전
export SKU="B1"                              # 가격 계층 (B1, S1, P1V2 등)
```

### 2단계: 배포 실행

```bash
./deploy-to-app-service.sh
```

이 스크립트는 다음 작업을 자동으로 수행합니다:

1. ✅ Azure 로그인
2. ✅ 리소스 그룹 생성
3. ✅ ACR 생성 및 로그인
4. ✅ Docker 이미지 빌드
5. ✅ ACR에 이미지 푸시
6. ✅ App Service Plan 생성
7. ✅ App Service 생성/업데이트
8. ✅ 컨테이너 배포 설정
9. ✅ 기본 설정 구성

### 3단계: 환경변수 설정

배포 후 Azure Portal 또는 CLI를 통해 환경변수를 설정해야 합니다.

---

## 환경변수 설정

### Azure Portal을 통한 설정

1. Azure Portal에 로그인
2. App Service로 이동 (`nh-financial-app`)
3. **Configuration** → **Application settings** 선택
4. **+ New application setting** 클릭하여 아래 환경변수 추가

### Azure CLI를 통한 설정

```bash
az webapp config appsettings set \
  --resource-group nh-financial-rg \
  --name nh-financial-app \
  --settings \
    DATABASE_URL="postgresql://user:password@host:5432/dbname" \
    AZURE_DATABRICKS_HOST="adb-xxxxx.azuredatabricks.net" \
    AZURE_DATABRICKS_TOKEN="dapi..." \
    AZURE_DATABRICKS_HTTP_PATH="/sql/1.0/warehouses/xxxxx" \
    AZURE_OPENAI_PTU_ENDPOINT="https://your-openai.openai.azure.com/" \
    AZURE_OPENAI_PTU_KEY="your-key" \
    AZURE_OPENAI_PTU_DEPLOYMENT="gpt-4" \
    AZURE_OPENAI_EMBEDDING_ENDPOINT="https://your-embedding.openai.azure.com/" \
    AZURE_OPENAI_EMBEDDING_KEY="your-embedding-key" \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-large" \
    AZURE_COSMOS_ENDPOINT="https://your-cosmos.documents.azure.com:443/" \
    AZURE_COSMOS_KEY="your-cosmos-key" \
    AZURE_SEARCH_ENDPOINT="https://your-search.search.windows.net" \
    AZURE_SEARCH_KEY="your-search-key" \
    OPENAI_API_KEY="sk-..." \
    NODE_ENV="production" \
    SESSION_SECRET="your-random-session-secret"
```

### 필수 환경변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql://user:pass@host:5432/db` |
| `AZURE_DATABRICKS_HOST` | Databricks 워크스페이스 호스트 | `adb-xxxxx.azuredatabricks.net` |
| `AZURE_DATABRICKS_TOKEN` | Databricks 액세스 토큰 | `dapi...` |
| `AZURE_DATABRICKS_HTTP_PATH` | SQL Warehouse HTTP Path | `/sql/1.0/warehouses/xxxxx` |
| `AZURE_OPENAI_PTU_ENDPOINT` | Azure OpenAI PTU 엔드포인트 | `https://xxx.openai.azure.com/` |
| `AZURE_OPENAI_PTU_KEY` | Azure OpenAI PTU API 키 | `your-key` |
| `AZURE_OPENAI_PTU_DEPLOYMENT` | GPT 모델 배포 이름 | `gpt-4` |
| `AZURE_OPENAI_EMBEDDING_ENDPOINT` | Embedding 엔드포인트 | `https://xxx.openai.azure.com/` |
| `AZURE_OPENAI_EMBEDDING_KEY` | Embedding API 키 | `your-key` |
| `AZURE_COSMOS_ENDPOINT` | CosmosDB 엔드포인트 | `https://xxx.documents.azure.com/` |
| `AZURE_COSMOS_KEY` | CosmosDB 마스터 키 | `your-key` |
| `AZURE_SEARCH_ENDPOINT` | AI Search 엔드포인트 | `https://xxx.search.windows.net` |
| `AZURE_SEARCH_KEY` | AI Search Admin 키 | `your-key` |

### 선택 환경변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `OPENAI_API_KEY` | OpenAI fallback API 키 | - |
| `SESSION_SECRET` | Express 세션 시크릿 | 자동 생성 |
| `NODE_ENV` | Node 환경 | `production` |

---

## 수동 배포

자동 스크립트를 사용하지 않고 수동으로 배포하려면:

### 1. ACR 생성

```bash
az acr create \
  --resource-group nh-financial-rg \
  --name yourregistryname \
  --sku Basic
```

### 2. 이미지 빌드 및 푸시

```bash
# ACR 로그인
az acr login --name yourregistryname

# 이미지 빌드
docker build -t nh-financial-analysis:latest .

# 태그 지정
docker tag nh-financial-analysis:latest \
  yourregistryname.azurecr.io/nh-financial-analysis:latest

# ACR에 푸시
docker push yourregistryname.azurecr.io/nh-financial-analysis:latest
```

### 3. App Service Plan 생성

```bash
az appservice plan create \
  --name nh-financial-plan \
  --resource-group nh-financial-rg \
  --is-linux \
  --sku B1
```

### 4. App Service 생성

```bash
# ACR 자격증명 가져오기
ACR_USERNAME=$(az acr credential show -n yourregistryname --query username -o tsv)
ACR_PASSWORD=$(az acr credential show -n yourregistryname --query "passwords[0].value" -o tsv)

# Web App 생성
az webapp create \
  --resource-group nh-financial-rg \
  --plan nh-financial-plan \
  --name nh-financial-app \
  --deployment-container-image-name yourregistryname.azurecr.io/nh-financial-analysis:latest \
  --docker-registry-server-url https://yourregistryname.azurecr.io \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD
```

### 5. 포트 및 기본 설정

```bash
# 포트 설정 (앱이 5000 포트 사용)
az webapp config appsettings set \
  --resource-group nh-financial-rg \
  --name nh-financial-app \
  --settings WEBSITES_PORT=5000

# Always On 활성화
az webapp config set \
  --resource-group nh-financial-rg \
  --name nh-financial-app \
  --always-on true
```

---

## 배포 후 확인

### 1. 앱 상태 확인

```bash
az webapp show \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --query state
```

### 2. 로그 확인

```bash
# 실시간 로그 스트리밍
az webapp log tail \
  --name nh-financial-app \
  --resource-group nh-financial-rg

# Docker 컨테이너 로그
az webapp log download \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --log-file app-logs.zip
```

### 3. Health Check

```bash
# 앱 URL 가져오기
APP_URL=$(az webapp show --name nh-financial-app --resource-group nh-financial-rg --query defaultHostName -o tsv)

# Health endpoint 확인
curl https://$APP_URL/api/system/status
```

### 4. 브라우저 접속

```bash
# 기본 URL 열기
az webapp browse --name nh-financial-app --resource-group nh-financial-rg
```

---

## 문제 해결

### 컨테이너가 시작되지 않음

**원인**: 환경변수 누락 또는 잘못된 설정

**해결**:
```bash
# 환경변수 확인
az webapp config appsettings list \
  --name nh-financial-app \
  --resource-group nh-financial-rg

# 컨테이너 로그 확인
az webapp log tail --name nh-financial-app --resource-group nh-financial-rg
```

### 502 Bad Gateway 오류

**원인**: 앱이 WEBSITES_PORT에서 수신 대기하지 않음

**해결**:
```bash
# WEBSITES_PORT 설정 확인
az webapp config appsettings set \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --settings WEBSITES_PORT=5000
```

### ACR 이미지 pull 실패

**원인**: ACR 자격증명 문제

**해결**:
```bash
# ACR admin 활성화
az acr update -n yourregistryname --admin-enabled true

# 자격증명 업데이트
ACR_USERNAME=$(az acr credential show -n yourregistryname --query username -o tsv)
ACR_PASSWORD=$(az acr credential show -n yourregistryname --query "passwords[0].value" -o tsv)

az webapp config container set \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD
```

### 데이터베이스 연결 실패

**원인**: DATABASE_URL 누락 또는 방화벽 규칙

**해결**:
```bash
# Azure App Service의 아웃바운드 IP 확인
az webapp show \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --query outboundIpAddresses

# PostgreSQL 방화벽 규칙 추가 (Azure Database for PostgreSQL 사용 시)
az postgres flexible-server firewall-rule create \
  --resource-group nh-financial-rg \
  --name your-postgres-server \
  --rule-name AllowAppService \
  --start-ip-address <app-outbound-ip> \
  --end-ip-address <app-outbound-ip>
```

---

## 성능 최적화

### 1. 스케일 업 (더 강력한 인스턴스)

```bash
az appservice plan update \
  --name nh-financial-plan \
  --resource-group nh-financial-rg \
  --sku P1V2
```

### 2. 스케일 아웃 (인스턴스 수 증가)

```bash
az appservice plan update \
  --name nh-financial-plan \
  --resource-group nh-financial-rg \
  --number-of-workers 3
```

### 3. 자동 스케일링 규칙

```bash
# CPU 기반 자동 스케일링
az monitor autoscale create \
  --resource-group nh-financial-rg \
  --resource nh-financial-plan \
  --resource-type Microsoft.Web/serverfarms \
  --name autoscale-cpu \
  --min-count 1 \
  --max-count 5 \
  --count 2

az monitor autoscale rule create \
  --resource-group nh-financial-rg \
  --autoscale-name autoscale-cpu \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1
```

---

## 보안 강화

### 1. Managed Identity 사용

```bash
# System-assigned managed identity 활성화
az webapp identity assign \
  --name nh-financial-app \
  --resource-group nh-financial-rg

# ACR에 AcrPull 역할 부여
PRINCIPAL_ID=$(az webapp identity show --name nh-financial-app --resource-group nh-financial-rg --query principalId -o tsv)
ACR_ID=$(az acr show --name yourregistryname --resource-group nh-financial-rg --query id -o tsv)

az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role AcrPull \
  --scope $ACR_ID
```

### 2. Azure Key Vault 통합

```bash
# Key Vault 참조로 환경변수 설정
az webapp config appsettings set \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --settings \
    DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://your-keyvault.vault.azure.net/secrets/database-url/)"
```

---

## 모니터링 및 로깅

### Application Insights 활성화

```bash
# Application Insights 생성
az monitor app-insights component create \
  --app nh-financial-insights \
  --location koreacentral \
  --resource-group nh-financial-rg

# Instrumentation key 가져오기
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app nh-financial-insights \
  --resource-group nh-financial-rg \
  --query instrumentationKey -o tsv)

# App Service에 설정
az webapp config appsettings set \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

---

## CI/CD 파이프라인

GitHub Actions 또는 Azure DevOps를 통한 자동 배포 설정:

### GitHub Actions 예시

`.github/workflows/azure-app-service.yml`:

```yaml
name: Deploy to Azure App Service

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Build and push to ACR
        run: |
          az acr build --registry ${{ secrets.ACR_NAME }} \
            --image nh-financial-analysis:${{ github.sha }} \
            --image nh-financial-analysis:latest .
      
      - name: Deploy to App Service
        run: |
          az webapp config container set \
            --name ${{ secrets.APP_SERVICE_NAME }} \
            --resource-group ${{ secrets.RESOURCE_GROUP }} \
            --docker-custom-image-name ${{ secrets.ACR_NAME }}.azurecr.io/nh-financial-analysis:${{ github.sha }}
```

---

## 리소스

- [Azure App Service 문서](https://docs.microsoft.com/azure/app-service/)
- [Azure Container Registry 문서](https://docs.microsoft.com/azure/container-registry/)
- [Docker 문서](https://docs.docker.com/)
- [Azure CLI 참조](https://docs.microsoft.com/cli/azure/)

---

**배포 지원**: 문제 발생 시 Azure Portal의 "Diagnose and solve problems"를 확인하거나 로그를 검토하세요.
