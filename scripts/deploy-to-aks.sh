#!/bin/bash
set -e

# AKS 배포 자동화 스크립트
# 사용법: ./scripts/deploy-to-aks.sh [IMAGE_TAG]

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 환경 변수 확인
if [ -z "$RESOURCE_GROUP" ] || [ -z "$ACR_NAME" ] || [ -z "$AKS_CLUSTER_NAME" ]; then
    echo -e "${RED}Error: 필수 환경 변수가 설정되지 않았습니다.${NC}"
    echo "다음 환경 변수를 설정해주세요:"
    echo "  export RESOURCE_GROUP=\"your-resource-group\""
    echo "  export ACR_NAME=\"yourregistryname\""
    echo "  export AKS_CLUSTER_NAME=\"your-aks-cluster\""
    exit 1
fi

# 이미지 태그 설정
IMAGE_TAG=${1:-$(date +%Y%m%d-%H%M%S)}
IMAGE_NAME="$ACR_NAME.azurecr.io/financial-analysis:$IMAGE_TAG"
IMAGE_LATEST="$ACR_NAME.azurecr.io/financial-analysis:latest"

echo -e "${GREEN}=== AKS 배포 시작 ===${NC}"
echo "Resource Group: $RESOURCE_GROUP"
echo "ACR Name: $ACR_NAME"
echo "AKS Cluster: $AKS_CLUSTER_NAME"
echo "Image Tag: $IMAGE_TAG"
echo ""

# 1. ACR 로그인
echo -e "${YELLOW}[1/6] ACR 로그인 중...${NC}"
az acr login --name $ACR_NAME

# 2. Docker 이미지 빌드
echo -e "${YELLOW}[2/6] Docker 이미지 빌드 중...${NC}"
docker build -t $IMAGE_NAME -t $IMAGE_LATEST .

# 3. ACR에 이미지 푸시
echo -e "${YELLOW}[3/6] ACR에 이미지 푸시 중...${NC}"
docker push $IMAGE_NAME
docker push $IMAGE_LATEST

# 4. AKS 자격 증명 가져오기
echo -e "${YELLOW}[4/6] AKS 자격 증명 가져오기...${NC}"
az aks get-credentials \
    --resource-group $RESOURCE_GROUP \
    --name $AKS_CLUSTER_NAME \
    --overwrite-existing

# 5. Kubernetes 리소스 배포
echo -e "${YELLOW}[5/6] Kubernetes 리소스 배포 중...${NC}"

# ConfigMap 배포 (이미 존재하면 업데이트)
kubectl apply -f k8s/configmap.yaml

# Deployment의 이미지 업데이트
kubectl set image deployment/financial-analysis-app \
    app=$IMAGE_LATEST \
    --record || kubectl apply -f k8s/deployment.yaml

# Service 배포 (이미 존재하면 변경 없음)
kubectl apply -f k8s/service.yaml

# HPA 배포
kubectl apply -f k8s/hpa.yaml

# 6. 배포 상태 확인
echo -e "${YELLOW}[6/6] 배포 상태 확인 중...${NC}"
kubectl rollout status deployment/financial-analysis-app --timeout=5m

# 배포 정보 출력
echo ""
echo -e "${GREEN}=== 배포 완료 ===${NC}"
echo ""
echo "배포된 이미지: $IMAGE_NAME"
echo ""
echo "Pod 상태:"
kubectl get pods -l app=financial-analysis
echo ""
echo "Service 정보:"
kubectl get service financial-analysis-service
echo ""
echo "HPA 상태:"
kubectl get hpa financial-analysis-hpa
echo ""

# External IP 확인
EXTERNAL_IP=$(kubectl get service financial-analysis-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$EXTERNAL_IP" ]; then
    echo -e "${YELLOW}External IP가 아직 할당되지 않았습니다. 잠시 후 다시 확인해주세요.${NC}"
    echo "확인 명령어: kubectl get service financial-analysis-service"
else
    echo -e "${GREEN}애플리케이션 URL: http://$EXTERNAL_IP${NC}"
    echo ""
    echo "Health check:"
    curl -f http://$EXTERNAL_IP/api/system/status || echo -e "${RED}Health check 실패${NC}"
fi

echo ""
echo -e "${GREEN}배포가 성공적으로 완료되었습니다!${NC}"
