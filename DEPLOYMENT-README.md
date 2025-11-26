# AKS 배포 구성 파일 안내

NH Investment & Securities 금융 분석 플랫폼을 Azure Kubernetes Service (AKS)에 배포하기 위한 완전한 구성 파일 세트입니다.

## 📁 파일 구조

```
.
├── Dockerfile                          # 멀티 스테이지 Docker 빌드 파일
├── .dockerignore                       # Docker 빌드 제외 파일 목록
├── deploy-to-acr.sh                    # ACR 이미지 배포 스크립트
├── deploy-to-aks.sh                    # AKS 애플리케이션 배포 스크립트
├── .env.production.example             # 프로덕션 환경 변수 예제
├── DEPLOYMENT.md                       # 상세 배포 가이드
├── QUICKSTART.md                       # 빠른 시작 가이드
└── k8s/                                # Kubernetes 매니페스트
    ├── deployment.yaml                 # 애플리케이션 배포 정의
    ├── service.yaml                    # 서비스 및 로드밸런서 설정
    ├── configmap.yaml                  # 환경 변수 설정
    ├── secret.yaml.template            # 시크릿 템플릿
    ├── acr-secret.yaml.template        # ACR 인증 시크릿 템플릿
    ├── ingress.yaml                    # Ingress 설정 (선택)
    ├── hpa.yaml                        # 자동 스케일링 설정
    ├── namespace.yaml                  # 네임스페이스 정의
    └── azure-keyvault-secret-provider.yaml  # Key Vault 통합
```

## 🚀 빠른 시작

### 1. 필수 도구 설치
```bash
# Azure CLI
brew install azure-cli

# kubectl
az aks install-cli

# Docker Desktop
# https://docs.docker.com/get-docker/
```

### 2. 환경 변수 설정
```bash
export ACR_NAME="nhfinancialacr"
export AKS_CLUSTER_NAME="nh-financial-aks"
export RESOURCE_GROUP="nh-financial-rg"
```

### 3. 배포 실행
```bash
# ACR에 이미지 푸시
./deploy-to-acr.sh

# AKS에 배포
./deploy-to-aks.sh
```

**자세한 내용은 [QUICKSTART.md](./QUICKSTART.md)를 참고하세요.**

## 📋 주요 구성 요소

### Docker 이미지
- **Multi-stage 빌드**: 프론트엔드 빌드 + 백엔드 번들링
- **최적화**: 프로덕션 의존성만 포함
- **보안**: Non-root 사용자로 실행
- **Health Check**: 내장된 헬스체크 엔드포인트

### Kubernetes 리소스

#### Deployment
- **Replicas**: 3개 (고가용성)
- **Rolling Update**: 무중단 배포
- **Resource Limits**: CPU/메모리 제한 설정
- **Probes**: Liveness, Readiness, Startup 프로브 구성

#### Service
- **LoadBalancer**: 외부 접근용
- **ClusterIP**: 내부 통신용
- **Session Affinity**: WebSocket 지원을 위한 세션 유지

#### ConfigMap
- Azure 서비스 엔드포인트
- 애플리케이션 설정
- 비민감 환경 변수

#### Secret
- 데이터베이스 연결 문자열
- API 키 및 토큰
- 인증 정보

#### HPA (Horizontal Pod Autoscaler)
- CPU 기반 자동 스케일링
- Min: 3, Max: 10 pods

#### Ingress (선택사항)
- HTTPS 종료
- 도메인 라우팅
- SSL/TLS 인증서 관리

## 🔐 보안 설정

### 1. ACR 인증
```bash
# 방법 1: AKS-ACR 통합 (권장)
az aks update -n $AKS_CLUSTER_NAME -g $RESOURCE_GROUP --attach-acr $ACR_NAME

# 방법 2: Service Principal
kubectl create secret docker-registry acr-secret \
  --docker-server=${ACR_NAME}.azurecr.io \
  --docker-username=<SP_ID> \
  --docker-password=<SP_PASSWORD>
```

### 2. 시크릿 관리

**옵션 A: kubectl로 직접 생성 (간단)**
```bash
kubectl create secret generic financial-analysis-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=AZURE_OPENAI_API_KEY="..."
```

**옵션 B: Azure Key Vault 사용 (권장)**
```bash
# CSI Driver 활성화
az aks enable-addons \
  --addons azure-keyvault-secrets-provider \
  --name $AKS_CLUSTER_NAME \
  --resource-group $RESOURCE_GROUP

# SecretProviderClass 적용
kubectl apply -f k8s/azure-keyvault-secret-provider.yaml
```

## 🌐 네트워크 구성

### Public 접근 (기본)
```yaml
# service.yaml
type: LoadBalancer
annotations:
  service.beta.kubernetes.io/azure-load-balancer-internal: "false"
```

### Private 접근 (내부 전용)
```yaml
# service.yaml
type: LoadBalancer
annotations:
  service.beta.kubernetes.io/azure-load-balancer-internal: "true"
```

### Ingress 사용 (도메인 + HTTPS)
```yaml
# ingress.yaml
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - financial.nh.com
    secretName: tls-secret
```

## 📊 모니터링

### 로그 확인
```bash
# 실시간 로그
kubectl logs -f deployment/financial-analysis-app

# 특정 Pod
kubectl logs -f <pod-name>

# 모든 Pod
kubectl logs -l app=financial-analysis --tail=100
```

### 리소스 모니터링
```bash
# Pod 리소스
kubectl top pods

# HPA 상태
kubectl get hpa

# 이벤트
kubectl get events --sort-by='.lastTimestamp'
```

### Azure Monitor 통합
```bash
az aks enable-addons \
  --addons monitoring \
  --name $AKS_CLUSTER_NAME \
  --resource-group $RESOURCE_GROUP
```

## 🔄 업데이트 및 롤백

### 새 버전 배포
```bash
# 1. 새 이미지 빌드
export IMAGE_TAG="v1.1.0"
./deploy-to-acr.sh

# 2. 이미지 업데이트
kubectl set image deployment/financial-analysis-app \
  app=${ACR_NAME}.azurecr.io/nh-financial-analysis:v1.1.0

# 3. 롤아웃 확인
kubectl rollout status deployment/financial-analysis-app
```

### 롤백
```bash
# 이전 버전으로
kubectl rollout undo deployment/financial-analysis-app

# 특정 리비전으로
kubectl rollout undo deployment/financial-analysis-app --to-revision=2

# 롤아웃 히스토리
kubectl rollout history deployment/financial-analysis-app
```

## 🛠 트러블슈팅

### ImagePullBackOff
```bash
# ACR 연결 확인
az aks check-acr --name $AKS_CLUSTER_NAME \
  --resource-group $RESOURCE_GROUP \
  --acr ${ACR_NAME}.azurecr.io
```

### CrashLoopBackOff
```bash
# Pod 상세 정보
kubectl describe pod <pod-name>

# 로그 확인
kubectl logs <pod-name>

# 이전 컨테이너 로그
kubectl logs <pod-name> --previous
```

### 데이터베이스 연결 실패
```bash
# 네트워크 테스트
kubectl run -it debug --image=busybox --rm -- sh
# nslookup <db-host>
# telnet <db-host> 5432
```

## 📚 문서

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 상세 배포 가이드
- **[QUICKSTART.md](./QUICKSTART.md)** - 5분 빠른 시작
- **.env.production.example** - 환경 변수 설정 예제

## 🔗 관련 리소스

- [Azure AKS Documentation](https://docs.microsoft.com/azure/aks/)
- [Azure ACR Documentation](https://docs.microsoft.com/azure/container-registry/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

## 💡 프로덕션 체크리스트

- [ ] Azure 리소스 생성 (ACR, AKS, PostgreSQL 등)
- [ ] ConfigMap 설정 완료
- [ ] Secret 안전하게 생성
- [ ] ACR-AKS 인증 설정
- [ ] 도메인 및 DNS 설정 (Ingress 사용시)
- [ ] SSL/TLS 인증서 발급
- [ ] 모니터링 설정 (Azure Monitor, Prometheus)
- [ ] 백업 전략 수립
- [ ] CI/CD 파이프라인 구성
- [ ] 보안 정책 적용 (Network Policy, Pod Security)

---

**문의사항이나 이슈가 있으면 관련 문서를 참고하거나 AKS 팀에 문의하세요.**
