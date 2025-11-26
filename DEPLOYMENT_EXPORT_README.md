# 배포 이미지 및 패키지 Export 가이드

## 개요

이 가이드는 Docker 이미지나 소스코드 패키지를 export하는 방법을 설명합니다.

## 방법 1: Docker 이미지 Export (권장)

### 전제 조건
- Docker 설치 필요

### 자동 스크립트 사용

```bash
./scripts/build-and-export-image.sh
```

이 스크립트는 다음을 수행합니다:
1. Docker 이미지 빌드
2. 압축된 tar.gz 파일로 export
3. 파일 크기 및 사용 방법 안내

### 수동 실행

```bash
# 이미지 빌드
docker build -t aitrade-console:latest .

# 이미지 export (압축)
docker save aitrade-console:latest | gzip > AITradeConsole-deployment-image.tar.gz
```

## 방법 2: 소스코드 패키지 Export

Docker 없이 소스코드만 패키징:

```bash
./scripts/package-for-deployment.sh
```

이 스크립트는 배포에 필요한 파일만 포함하여 압축합니다.

## Export된 파일 사용 방법

### Docker 이미지 사용

1. **이미지 로드:**
```bash
docker load < AITradeConsole-deployment-image.tar.gz
```

2. **컨테이너 실행:**
```bash
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e INIT_SAMPLE_DATA=true \
  --name aitrade-console \
  aitrade-console:latest
```

### 소스코드 패키지 사용

1. **압축 해제:**
```bash
tar -xzf AITradeConsole-source-package-*.tar.gz
cd AITradeConsole-source-package-*
```

2. **의존성 설치:**
```bash
npm ci
```

3. **빌드:**
```bash
npm run build
```

4. **실행:**
```bash
npm start
```

또는 Docker 이미지 빌드:
```bash
docker build -t aitrade-console:latest .
```

## Azure App Service 배포

### ACR에 이미지 푸시

```bash
# ACR 로그인
az acr login --name <your-acr-name>

# 이미지 태깅
docker tag aitrade-console:latest <your-acr-name>.azurecr.io/aitrade-console:latest

# 이미지 푸시
docker push <your-acr-name>.azurecr.io/aitrade-console:latest
```

### App Service 설정

1. **Application Settings**에 환경변수 설정:
   - `DATABASE_URL`: PostgreSQL 연결 문자열
   - `INIT_SAMPLE_DATA=true`: 샘플 데이터 자동 생성
   - 기타 Azure 서비스 설정

2. **Deployment Center**에서:
   - Source: Azure Container Registry
   - Registry: ACR 이름
   - Image: `aitrade-console`
   - Tag: `latest`

## 스크립트 파일

- `scripts/build-and-export-image.sh`: Docker 이미지 빌드 및 export
- `scripts/package-for-deployment.sh`: 소스코드 패키징

## 자세한 내용

- `EXPORT_DEPLOYMENT_IMAGE.md`: Docker 이미지 export 상세 가이드
- `AZURE_ACR_DEPLOYMENT_README.md`: Azure ACR 배포 가이드
- `DEPLOYMENT_SAMPLE_DATA.md`: 샘플 데이터 생성 가이드

## 문제 해결

### Docker가 설치되지 않은 경우

**macOS:**
```bash
brew install docker
# 또는
brew install --cask docker
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
```

**Windows:**
Docker Desktop 설치: https://www.docker.com/products/docker-desktop

### 이미지 빌드 실패

1. Dockerfile 확인
2. 네트워크 연결 확인
3. 디스크 공간 확인
4. 빌드 로그 확인

### Export 파일 크기

- 압축 사용 권장 (tar.gz)
- 불필요한 파일 제외 확인
- Multi-stage build 최적화 (이미 적용됨)

