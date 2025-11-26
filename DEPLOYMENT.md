# 배포 가이드

NH Investment & Securities AI Platform의 배포 방법을 설명합니다.

## 배포 타겟

이 애플리케이션은 **Azure App Service + Azure Container Registry (ACR)**로 배포됩니다.

> **참고**: Kubernetes (AKS) 배포가 필요한 경우, k8s 디렉토리의 매니페스트 파일들을 참조하세요.

## 배포 옵션

### 옵션 1: 자동 배포 스크립트 (권장) ⚡

가장 빠르고 간편한 방법입니다.

```bash
# 환경변수 설정
export ACR_NAME="your-acr-name"
export RESOURCE_GROUP="nh-financial-rg"
export APP_SERVICE_NAME="nh-financial-app"
export LOCATION="koreacentral"

# 배포 실행 (ACR + App Service 모두 자동 설정)
./deploy-to-app-service.sh
```

### 옵션 2: ACR만 빌드 후 수동 배포

```bash
# 1. ACR에 이미지 푸시
./deploy-to-acr.sh

# 2. Azure Portal에서 App Service 설정
#    - Container Registry에서 이미지 선택
#    - 환경변수 설정
#    - 배포 실행
```

### 옵션 3: 완전 수동 배포

상세한 단계별 가이드는 [AZURE_APP_SERVICE_DEPLOYMENT.md](./AZURE_APP_SERVICE_DEPLOYMENT.md)를 참조하세요.

## 필수 환경변수

배포 후 다음 환경변수를 Azure App Service의 **Application Settings**에 설정해야 합니다:

### 데이터베이스
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

### Azure Databricks
```bash
AZURE_DATABRICKS_HOST=adb-xxxxx.azuredatabricks.net
AZURE_DATABRICKS_TOKEN=dapi...
AZURE_DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/xxxxx
```

### Azure OpenAI (Primary - PTU)
```bash
AZURE_OPENAI_PTU_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_PTU_KEY=your-key
AZURE_OPENAI_PTU_DEPLOYMENT=gpt-4
```

### Azure OpenAI (Embedding)
```bash
AZURE_OPENAI_EMBEDDING_ENDPOINT=https://your-embedding.openai.azure.com/
AZURE_OPENAI_EMBEDDING_KEY=your-embedding-key
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
```

### Azure CosmosDB
```bash
AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-key
```

### Azure AI Search
```bash
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_KEY=your-search-key
```

### OpenAI Fallback (Optional)
```bash
OPENAI_API_KEY=sk-...
```

### Azure CLI로 환경변수 설정

```bash
az webapp config appsettings set \
  --resource-group nh-financial-rg \
  --name nh-financial-app \
  --settings \
    DATABASE_URL="postgresql://..." \
    AZURE_DATABRICKS_HOST="adb-xxxxx.azuredatabricks.net" \
    AZURE_DATABRICKS_TOKEN="dapi..." \
    AZURE_DATABRICKS_HTTP_PATH="/sql/1.0/warehouses/xxxxx" \
    AZURE_OPENAI_PTU_ENDPOINT="https://xxx.openai.azure.com/" \
    AZURE_OPENAI_PTU_KEY="your-key" \
    AZURE_OPENAI_PTU_DEPLOYMENT="gpt-4" \
    AZURE_OPENAI_EMBEDDING_ENDPOINT="https://xxx.openai.azure.com/" \
    AZURE_OPENAI_EMBEDDING_KEY="your-key" \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-large" \
    AZURE_COSMOS_ENDPOINT="https://xxx.documents.azure.com/" \
    AZURE_COSMOS_KEY="your-key" \
    AZURE_SEARCH_ENDPOINT="https://xxx.search.windows.net" \
    AZURE_SEARCH_KEY="your-key" \
    OPENAI_API_KEY="sk-..." \
    NODE_ENV="production"
```

## 배포 아키텍처

```
┌─────────────┐
│  Developer  │
└──────┬──────┘
       │ docker build & push
       ▼
┌────────────────────────┐
│ Azure Container        │
│ Registry (ACR)         │
│                        │
│ nh-financial-analysis  │
│ :latest                │
└──────┬─────────────────┘
       │ pull image
       ▼
┌────────────────────────┐
│ Azure App Service      │
│ (Web App for           │
│  Containers)           │
│                        │
│ Port: 5000             │
│ Health Check: /api/    │
│   system/status        │
└────────────────────────┘
```

## 빠른 시작

### 1단계: 사전 준비

```bash
# Azure CLI 설치 확인
az --version

# Docker 설치 확인
docker --version

# Azure 로그인
az login
```

### 2단계: 환경변수 설정

```bash
export ACR_NAME="nhfinancialacr"           # ACR 이름 (전역 고유)
export RESOURCE_GROUP="nh-financial-rg"     # 리소스 그룹
export APP_SERVICE_NAME="nh-financial-app" # App Service 이름 (전역 고유)
export APP_SERVICE_PLAN="nh-financial-plan"
export LOCATION="koreacentral"              # 한국 중부
export SKU="B1"                             # B1, S1, P1V2 등
```

### 3단계: 배포 실행

```bash
./deploy-to-app-service.sh
```

### 4단계: 환경변수 설정

Azure Portal 또는 CLI를 통해 Application Settings 설정 (위 참조)

### 5단계: 배포 확인

```bash
# 앱 URL 가져오기
APP_URL=$(az webapp show --name nh-financial-app --resource-group nh-financial-rg --query defaultHostName -o tsv)

# Health Check
curl https://$APP_URL/api/system/status

# 브라우저에서 열기
az webapp browse --name nh-financial-app --resource-group nh-financial-rg
```

## 배포 후 확인

### Health Check

```bash
curl https://your-app-name.azurewebsites.net/api/system/status
```

예상 응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-24T12:00:00.000Z",
  "uptime": 3600
}
```

### 로그 확인

```bash
# 실시간 로그 스트리밍
az webapp log tail --name nh-financial-app --resource-group nh-financial-rg

# 로그 다운로드
az webapp log download --name nh-financial-app --resource-group nh-financial-rg
```

### 브라우저 접속

```bash
az webapp browse --name nh-financial-app --resource-group nh-financial-rg
```

## 스케일링

### 수직 스케일링 (Scale Up - 더 강력한 인스턴스)

```bash
# Basic → Premium
az appservice plan update \
  --name nh-financial-plan \
  --resource-group nh-financial-rg \
  --sku P1V2
```

### 수평 스케일링 (Scale Out - 인스턴스 수 증가)

```bash
# 인스턴스 3개로 확장
az appservice plan update \
  --name nh-financial-plan \
  --resource-group nh-financial-rg \
  --number-of-workers 3
```

### 자동 스케일링

```bash
# CPU 기반 자동 스케일링 (Standard 이상 필요)
az monitor autoscale create \
  --resource-group nh-financial-rg \
  --resource nh-financial-plan \
  --resource-type Microsoft.Web/serverfarms \
  --name autoscale-cpu \
  --min-count 2 \
  --max-count 5 \
  --count 2

az monitor autoscale rule create \
  --resource-group nh-financial-rg \
  --autoscale-name autoscale-cpu \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1
```

## 가격 계층 (SKU)

| SKU  | vCPU | RAM    | 디스크 | 용도                    | 월 예상 비용 |
|------|------|--------|--------|-------------------------|--------------|
| B1   | 1    | 1.75GB | 10GB   | 개발/테스트             | ~$13         |
| S1   | 1    | 1.75GB | 50GB   | 소규모 프로덕션         | ~$70         |
| P1V2 | 1    | 3.5GB  | 250GB  | 프로덕션 (권장)         | ~$80         |
| P2V2 | 2    | 7GB    | 250GB  | 중규모 프로덕션         | ~$160        |
| P3V2 | 4    | 14GB   | 250GB  | 대규모 프로덕션         | ~$320        |

**권장 설정**: 프로덕션 환경에는 **P1V2 이상** 사용

## CI/CD 연동

### GitHub Actions 예시

`.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure App Service

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
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
          
          az webapp restart \
            --name ${{ secrets.APP_SERVICE_NAME }} \
            --resource-group ${{ secrets.RESOURCE_GROUP }}
```

## 문제 해결

### 502 Bad Gateway

**원인**: 앱이 올바른 포트에서 수신 대기하지 않음

**해결**:
```bash
az webapp config appsettings set \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --settings WEBSITES_PORT=5000
```

### 컨테이너 시작 실패

**원인**: 환경변수 누락

**해결**:
```bash
# 로그 확인
az webapp log tail --name nh-financial-app --resource-group nh-financial-rg

# 환경변수 확인
az webapp config appsettings list --name nh-financial-app --resource-group nh-financial-rg
```

### ACR 이미지 pull 실패

**원인**: ACR 자격증명 문제

**해결**:
```bash
# ACR admin 활성화
az acr update -n your-acr --admin-enabled true

# 자격증명 재설정
ACR_USERNAME=$(az acr credential show -n your-acr --query username -o tsv)
ACR_PASSWORD=$(az acr credential show -n your-acr --query "passwords[0].value" -o tsv)

az webapp config container set \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD
```

## 보안 강화

### Managed Identity 사용

```bash
# System-assigned managed identity 활성화
az webapp identity assign \
  --name nh-financial-app \
  --resource-group nh-financial-rg

# ACR에 AcrPull 역할 부여
PRINCIPAL_ID=$(az webapp identity show --name nh-financial-app --resource-group nh-financial-rg --query principalId -o tsv)
ACR_ID=$(az acr show --name your-acr --resource-group nh-financial-rg --query id -o tsv)

az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role AcrPull \
  --scope $ACR_ID
```

### Azure Key Vault 통합

```bash
# 환경변수를 Key Vault 참조로 변경
az webapp config appsettings set \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --settings \
    DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://your-kv.vault.azure.net/secrets/database-url/)"
```

## 모니터링

### Application Insights 설정

```bash
# Application Insights 생성
az monitor app-insights component create \
  --app nh-financial-insights \
  --location koreacentral \
  --resource-group nh-financial-rg

# Instrumentation key 연결
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app nh-financial-insights \
  --resource-group nh-financial-rg \
  --query instrumentationKey -o tsv)

az webapp config appsettings set \
  --name nh-financial-app \
  --resource-group nh-financial-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

## 유용한 명령어

```bash
# 앱 재시작
az webapp restart --name nh-financial-app --resource-group nh-financial-rg

# 앱 중지
az webapp stop --name nh-financial-app --resource-group nh-financial-rg

# 앱 시작
az webapp start --name nh-financial-app --resource-group nh-financial-rg

# 컨테이너 설정 확인
az webapp config container show --name nh-financial-app --resource-group nh-financial-rg

# 환경변수 내보내기
az webapp config appsettings list --name nh-financial-app --resource-group nh-financial-rg -o json

# 배포 히스토리 확인
az webapp deployment list --name nh-financial-app --resource-group nh-financial-rg
```

## 관련 문서

- **[상세 배포 가이드](./AZURE_APP_SERVICE_DEPLOYMENT.md)** - 전체 배포 프로세스 상세 설명
- **[환경변수 설정](./AZURE_APP_SERVICE_DEPLOYMENT.md#환경변수-설정)** - 모든 환경변수 설명
- **[문제 해결](./AZURE_APP_SERVICE_DEPLOYMENT.md#문제-해결)** - 일반적인 문제 및 해결 방법
- **[보안 강화](./AZURE_APP_SERVICE_DEPLOYMENT.md#보안-강화)** - 프로덕션 보안 설정

## 추가 리소스

- [Azure App Service 문서](https://docs.microsoft.com/azure/app-service/)
- [Azure Container Registry 문서](https://docs.microsoft.com/azure/container-registry/)
- [Docker 문서](https://docs.docker.com/)
- [Azure CLI 참조](https://docs.microsoft.com/cli/azure/)
