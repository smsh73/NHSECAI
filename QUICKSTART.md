# Quick Start Guide - AKS Deployment

빠른 배포를 위한 가이드입니다. 5분 안에 애플리케이션을 AKS에 배포할 수 있습니다.

## 사전 준비 체크리스트

- [ ] Azure CLI 설치됨
- [ ] kubectl 설치됨
- [ ] Docker 설치됨
- [ ] Azure 계정 및 구독 보유

## Step 1: 환경 변수 설정

```bash
# 배포 스크립트용 환경 변수 설정
export ACR_NAME="nhfinancialacr"              # ACR 이름
export AKS_CLUSTER_NAME="nh-financial-aks"    # AKS 클러스터 이름
export RESOURCE_GROUP="nh-financial-rg"       # 리소스 그룹
export IMAGE_TAG="v1.0.0"                     # 이미지 태그
```

## Step 2: Azure 리소스 생성 (최초 1회)

```bash
# 리소스 그룹
az group create --name $RESOURCE_GROUP --location koreacentral

# ACR
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Standard

# AKS (ACR 연동 포함)
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-managed-identity \
  --attach-acr $ACR_NAME
```

## Step 3: ConfigMap 설정

`k8s/configmap.yaml` 파일을 편집하여 Azure 서비스 엔드포인트를 입력합니다:

```yaml
data:
  AZURE_DATABRICKS_HOST: "your-workspace.azuredatabricks.net"
  AZURE_POSTGRES_HOST: "your-server.postgres.database.azure.com"
  AZURE_OPENAI_ENDPOINT: "https://your-openai.openai.azure.com/"
  # ... 기타 설정
```

## Step 4: Secret 생성

```bash
kubectl create secret generic financial-analysis-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" \
  --from-literal=AZURE_DATABRICKS_TOKEN="dapi..." \
  --from-literal=AZURE_POSTGRES_PASSWORD="..." \
  --from-literal=AZURE_COSMOS_KEY="..." \
  --from-literal=AZURE_OPENAI_API_KEY="..." \
  --from-literal=AZURE_OPENAI_EMBEDDING_KEY="..." \
  --namespace=default
```

## Step 5: ACR에 이미지 배포

```bash
# 배포 스크립트 실행 권한 부여
chmod +x deploy-to-acr.sh deploy-to-aks.sh

# ACR에 이미지 빌드 및 푸시
./deploy-to-acr.sh
```

## Step 6: Deployment YAML 업데이트

`k8s/deployment.yaml`에서 이미지 이름을 업데이트:

```yaml
containers:
- name: app
  image: nhfinancialacr.azurecr.io/nh-financial-analysis:v1.0.0
```

## Step 7: AKS에 배포

```bash
# AKS에 애플리케이션 배포
./deploy-to-aks.sh
```

## Step 8: 배포 확인

```bash
# Pod 상태 확인
kubectl get pods -l app=financial-analysis

# 서비스 확인
kubectl get svc financial-analysis-service

# 외부 IP 확인 (LoadBalancer)
kubectl get svc financial-analysis-service -w
```

## Step 9: 애플리케이션 접속

LoadBalancer의 외부 IP가 할당되면:

```
http://<EXTERNAL-IP>
```

---

## 트러블슈팅

### Pod가 Pending 상태인 경우
```bash
kubectl describe pod <pod-name>
```

### ImagePullBackOff 에러
```bash
# ACR 연결 확인
az aks check-acr --name $AKS_CLUSTER_NAME --resource-group $RESOURCE_GROUP --acr ${ACR_NAME}.azurecr.io
```

### Secret 오류
```bash
# Secret 존재 확인
kubectl get secret financial-analysis-secrets
```

---

## 유용한 명령어

```bash
# 로그 확인
kubectl logs -f deployment/financial-analysis-app

# Port Forward (로컬에서 테스트)
kubectl port-forward svc/financial-analysis-service 8080:80

# 스케일 조정
kubectl scale deployment financial-analysis-app --replicas=5

# 이미지 업데이트
kubectl set image deployment/financial-analysis-app \
  app=${ACR_NAME}.azurecr.io/nh-financial-analysis:v1.1.0

# 롤백
kubectl rollout undo deployment/financial-analysis-app
```

---

## 다음 단계

1. **모니터링 설정**: Azure Monitor, Prometheus, Grafana 통합
2. **CI/CD 파이프라인**: GitHub Actions 또는 Azure DevOps 설정
3. **보안 강화**: Network Policy, Pod Security Policy 적용
4. **백업 전략**: 데이터베이스 백업 자동화

자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.
