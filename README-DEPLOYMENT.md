# Azure Kubernetes Service (AKS) 배포 가이드

이 문서는 Financial Market Analysis Platform을 Azure Kubernetes Service (AKS)에 배포하는 방법을 설명합니다.

## 목차
- [사전 준비](#사전-준비)
- [1. Docker 이미지 빌드 및 ACR 푸시](#1-docker-이미지-빌드-및-acr-푸시)
- [2. AKS 클러스터 설정](#2-aks-클러스터-설정)
- [3. Kubernetes 리소스 배포](#3-kubernetes-리소스-배포)
- [4. 배포 확인](#4-배포-확인)
- [5. 모니터링 및 로깅](#5-모니터링-및-로깅)
- [트러블슈팅](#트러블슈팅)

## 사전 준비

### 필수 도구 설치
```bash
# Azure CLI 설치
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# kubectl 설치
az aks install-cli

# Docker 설치 (이미 설치되어 있지 않은 경우)
sudo apt-get update
sudo apt-get install docker.io
```

### Azure 로그인
```bash
az login
az account set --subscription <your-subscription-id>
```

### 환경 변수 설정
```bash
# Azure 리소스 정보
export RESOURCE_GROUP="your-resource-group"
export ACR_NAME="yourregistryname"
export AKS_CLUSTER_NAME="your-aks-cluster"
export LOCATION="koreacentral"
export IMAGE_TAG="v1.0.0"
```

## 1. Docker 이미지 빌드 및 ACR 푸시

### 1.1 Azure Container Registry (ACR) 생성
```bash
# ACR 생성
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Standard \
  --location $LOCATION

# ACR 로그인
az acr login --name $ACR_NAME
```

### 1.2 Docker 이미지 빌드
```bash
# 이미지 빌드
docker build -t $ACR_NAME.azurecr.io/financial-analysis:$IMAGE_TAG .

# 이미지를 latest 태그로도 지정
docker tag $ACR_NAME.azurecr.io/financial-analysis:$IMAGE_TAG \
  $ACR_NAME.azurecr.io/financial-analysis:latest
```

### 1.3 ACR에 이미지 푸시
```bash
# 이미지 푸시
docker push $ACR_NAME.azurecr.io/financial-analysis:$IMAGE_TAG
docker push $ACR_NAME.azurecr.io/financial-analysis:latest

# 푸시된 이미지 확인
az acr repository list --name $ACR_NAME --output table
```

## 2. AKS 클러스터 설정

### 2.1 AKS 클러스터 생성 (신규 생성 시)
```bash
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --location $LOCATION \
  --attach-acr $ACR_NAME \
  --enable-managed-identity \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --network-plugin azure \
  --enable-addons monitoring,azure-keyvault-secrets-provider \
  --generate-ssh-keys
```

### 2.2 기존 AKS 클러스터에 ACR 연결
```bash
az aks update \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --attach-acr $ACR_NAME
```

### 2.3 kubectl 설정
```bash
# AKS 자격 증명 가져오기
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --overwrite-existing

# 클러스터 연결 확인
kubectl cluster-info
kubectl get nodes
```

## 3. Kubernetes 리소스 배포

### 3.1 ConfigMap 생성
`k8s/configmap.yaml` 파일을 편집하여 환경에 맞는 값을 설정합니다:

```bash
# ConfigMap 편집
vi k8s/configmap.yaml

# ConfigMap 적용
kubectl apply -f k8s/configmap.yaml
```

### 3.2 Secret 생성

**방법 1: kubectl 명령어 사용 (권장)**
```bash
kubectl create secret generic financial-analysis-secrets \
  --from-literal=DATABASE_URL="postgresql://user:password@hostname:5432/database?sslmode=require" \
  --from-literal=AZURE_DATABRICKS_TOKEN="your-databricks-token" \
  --from-literal=AZURE_POSTGRES_PASSWORD="your-postgres-password" \
  --from-literal=AZURE_COSMOS_KEY="your-cosmos-key" \
  --from-literal=AZURE_OPENAI_API_KEY="your-openai-key" \
  --from-literal=AZURE_OPENAI_EMBEDDING_KEY="your-embedding-key" \
  --namespace=default
```

**방법 2: Azure Key Vault 연동 (프로덕션 권장)**
```bash
# Key Vault CSI Driver는 AKS 생성 시 이미 활성화됨
# SecretProviderClass 생성
kubectl apply -f k8s/azure-keyvault-secret-provider.yaml
```

### 3.3 Deployment 배포
```bash
# deployment.yaml에서 ACR 이미지 이름 업데이트
sed -i "s|<your-acr-name>|$ACR_NAME|g" k8s/deployment.yaml

# Deployment 적용
kubectl apply -f k8s/deployment.yaml

# 배포 상태 확인
kubectl rollout status deployment/financial-analysis-app
```

### 3.4 Service 배포
```bash
kubectl apply -f k8s/service.yaml

# Service 확인 (External IP가 할당될 때까지 대기)
kubectl get service financial-analysis-service --watch
```

### 3.5 HPA (자동 확장) 배포
```bash
kubectl apply -f k8s/hpa.yaml

# HPA 상태 확인
kubectl get hpa financial-analysis-hpa
```

### 3.6 Ingress 배포 (선택사항)
```bash
# NGINX Ingress Controller 설치 (아직 설치되지 않은 경우)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Ingress 설정 편집 (도메인 설정)
vi k8s/ingress.yaml

# Ingress 적용
kubectl apply -f k8s/ingress.yaml
```

## 4. 배포 확인

### 4.1 Pod 상태 확인
```bash
# Pod 목록 확인
kubectl get pods -l app=financial-analysis

# Pod 상세 정보
kubectl describe pod <pod-name>

# Pod 로그 확인
kubectl logs -l app=financial-analysis --tail=100 -f
```

### 4.2 서비스 접속 확인
```bash
# External IP 확인
EXTERNAL_IP=$(kubectl get service financial-analysis-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Application URL: http://$EXTERNAL_IP"

# Health check
curl http://$EXTERNAL_IP/api/system/status
```

### 4.3 WebSocket 연결 확인
```bash
# WebSocket 테스트 (wscat 설치 필요)
npm install -g wscat
wscat -c ws://$EXTERNAL_IP/ws
```

## 5. 모니터링 및 로깅

### 5.1 Azure Monitor 연동
```bash
# Azure Monitor 메트릭 확인
az monitor metrics list \
  --resource "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerService/managedClusters/$AKS_CLUSTER_NAME" \
  --metric "node_cpu_usage_percentage"
```

### 5.2 로그 확인
```bash
# 모든 Pod의 로그 확인
kubectl logs -l app=financial-analysis --all-containers=true

# 특정 Pod의 로그 스트리밍
kubectl logs -f deployment/financial-analysis-app

# 이전 컨테이너의 로그 확인 (crash 발생 시)
kubectl logs <pod-name> --previous
```

### 5.3 리소스 사용량 확인
```bash
# Pod 리소스 사용량
kubectl top pods -l app=financial-analysis

# Node 리소스 사용량
kubectl top nodes
```

## 배포 업데이트

### 새 버전 배포
```bash
# 새 이미지 빌드 및 푸시
export NEW_VERSION="v1.1.0"
docker build -t $ACR_NAME.azurecr.io/financial-analysis:$NEW_VERSION .
docker push $ACR_NAME.azurecr.io/financial-analysis:$NEW_VERSION

# Deployment 이미지 업데이트
kubectl set image deployment/financial-analysis-app \
  app=$ACR_NAME.azurecr.io/financial-analysis:$NEW_VERSION

# 롤아웃 상태 확인
kubectl rollout status deployment/financial-analysis-app
```

### 롤백
```bash
# 이전 버전으로 롤백
kubectl rollout undo deployment/financial-analysis-app

# 특정 리비전으로 롤백
kubectl rollout undo deployment/financial-analysis-app --to-revision=2

# 롤아웃 히스토리 확인
kubectl rollout history deployment/financial-analysis-app
```

## 환경 변수 관리

### ConfigMap 업데이트
```bash
# ConfigMap 편집
kubectl edit configmap financial-analysis-config

# 또는 파일에서 재적용
kubectl apply -f k8s/configmap.yaml

# Pod 재시작 (새 ConfigMap 적용)
kubectl rollout restart deployment/financial-analysis-app
```

### Secret 업데이트
```bash
# Secret 업데이트
kubectl create secret generic financial-analysis-secrets \
  --from-literal=DATABASE_URL="new-connection-string" \
  --dry-run=client -o yaml | kubectl apply -f -

# Pod 재시작
kubectl rollout restart deployment/financial-analysis-app
```

## 트러블슈팅

### Pod가 시작되지 않는 경우
```bash
# Pod 이벤트 확인
kubectl describe pod <pod-name>

# Pod 로그 확인
kubectl logs <pod-name>

# 이미지 pull 문제 확인
kubectl get events --sort-by=.metadata.creationTimestamp
```

### ACR 인증 문제
```bash
# AKS에서 ACR 접근 권한 확인
az aks check-acr \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --acr $ACR_NAME.azurecr.io
```

### 데이터베이스 연결 문제
```bash
# Pod에서 직접 연결 테스트
kubectl exec -it <pod-name> -- sh
# 컨테이너 내에서
node -e "console.log(process.env.DATABASE_URL)"
```

### WebSocket 연결 문제
```bash
# Service의 sessionAffinity 확인
kubectl describe service financial-analysis-service

# Ingress 설정 확인 (사용 중인 경우)
kubectl describe ingress financial-analysis-ingress
```

### 리소스 부족
```bash
# 클러스터 오토스케일러 상태 확인
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml

# Node 추가
az aks scale \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --node-count 5
```

## 보안 권장사항

1. **Managed Identity 사용**: Service Principal 대신 Managed Identity 사용
2. **Network Policies**: Pod 간 네트워크 격리 설정
3. **Azure Key Vault**: 민감한 정보는 Key Vault에 저장
4. **Private Endpoints**: Azure 서비스 연결 시 Private Endpoint 사용
5. **RBAC**: Kubernetes RBAC으로 접근 제어
6. **Pod Security Standards**: 보안 컨텍스트 설정 유지
7. **이미지 스캔**: ACR에서 자동 이미지 취약점 스캔 활성화

```bash
# ACR 이미지 스캔 활성화
az acr update --name $ACR_NAME --resource-group $RESOURCE_GROUP --sku Premium
```

## 비용 최적화

1. **Cluster Autoscaler**: 부하에 따라 자동으로 Node 조정
2. **HPA**: Pod 수를 자동으로 조정
3. **Spot Instances**: 개발/테스트 환경에서 Spot VM 사용
4. **Right-sizing**: 적절한 리소스 request/limit 설정

## 참고 자료

- [AKS 공식 문서](https://docs.microsoft.com/azure/aks/)
- [ACR 공식 문서](https://docs.microsoft.com/azure/container-registry/)
- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [Azure Key Vault CSI Driver](https://docs.microsoft.com/azure/aks/csi-secrets-store-driver)
