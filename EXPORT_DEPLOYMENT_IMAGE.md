# 배포 이미지 Export 가이드

## 개요

Docker 이미지를 빌드하고 export하여 다른 서버에 배포하는 방법입니다.

## 전제 조건

1. Docker 설치 필요
2. 이미지 빌드 권한 필요

## 방법 1: 자동 스크립트 사용

### 실행

```bash
chmod +x scripts/build-and-export-image.sh
./scripts/build-and-export-image.sh
```

### 결과

- `AITradeConsole-deployment-image-YYYYMMDD-HHMMSS.tar.gz` 파일 생성
- 이미지는 압축된 형태로 저장됨

## 방법 2: 수동 실행

### 1. Docker 이미지 빌드

```bash
docker build -t aitrade-console:latest .
```

또는 버전 태그 포함:

```bash
VERSION=$(date +%Y%m%d-%H%M%S)
docker build -t aitrade-console:latest -t aitrade-console:${VERSION} .
```

### 2. 이미지 Export (압축)

```bash
docker save aitrade-console:latest | gzip > AITradeConsole-deployment-image.tar.gz
```

또는 버전별로:

```bash
VERSION=$(date +%Y%m%d-%H%M%S)
docker save aitrade-console:${VERSION} | gzip > AITradeConsole-deployment-image-${VERSION}.tar.gz
```

### 3. 이미지 Export (압축 없음)

```bash
docker save aitrade-console:latest -o AITradeConsole-deployment-image.tar
```

## 다른 서버에서 이미지 로드

### 압축된 이미지

```bash
gunzip -c AITradeConsole-deployment-image.tar.gz | docker load
```

또는:

```bash
docker load < AITradeConsole-deployment-image.tar.gz
```

### 압축되지 않은 이미지

```bash
docker load -i AITradeConsole-deployment-image.tar
```

## 이미지 실행

### 기본 실행

```bash
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e PORT=5000 \
  -e INIT_SAMPLE_DATA=true \
  --name aitrade-console \
  aitrade-console:latest
```

### 환경변수 설정 파일 사용

환경변수를 파일로 관리:

```bash
docker run -d \
  -p 5000:5000 \
  --env-file .env.production \
  --name aitrade-console \
  aitrade-console:latest
```

### Azure App Service로 배포

1. ACR에 푸시:
```bash
az acr login --name <your-acr-name>
docker tag aitrade-console:latest <your-acr-name>.azurecr.io/aitrade-console:latest
docker push <your-acr-name>.azurecr.io/aitrade-console:latest
```

2. App Service에서 이미지 사용:
   - Deployment Center에서 ACR 이미지 선택
   - 이미지: `aitrade-console`
   - 태그: `latest`

## 이미지 정보 확인

### 로컬 이미지 목록

```bash
docker images | grep aitrade-console
```

### 이미지 상세 정보

```bash
docker inspect aitrade-console:latest
```

### 이미지 크기 확인

```bash
docker images aitrade-console:latest --format "{{.Size}}"
```

## 문제 해결

### Docker가 설치되지 않은 경우

**macOS:**
```bash
brew install docker
# 또는 Docker Desktop 설치
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

**Windows:**
- Docker Desktop 설치: https://www.docker.com/products/docker-desktop

### 이미지 빌드 실패

1. Dockerfile이 올바른지 확인
2. 네트워크 연결 확인
3. 디스크 공간 확인
4. 빌드 로그 확인: `docker build --progress=plain -t aitrade-console:latest .`

### Export 파일이 너무 큰 경우

- 압축 사용 (권장): `docker save ... | gzip > ...`
- 불필요한 레이어 제거: Dockerfile 최적화
- Multi-stage build 사용 (이미 적용됨)

## 파일 위치

- Export된 이미지: 프로젝트 루트 디렉토리
- 파일명: `AITradeConsole-deployment-image-*.tar.gz`

## 주의사항

1. **보안**: Export 파일에는 민감한 정보가 포함될 수 있으므로 안전하게 보관
2. **크기**: 이미지 파일은 몇 GB가 될 수 있으므로 충분한 디스크 공간 확보
3. **버전 관리**: 버전 태그를 사용하여 이미지 관리
4. **환경변수**: 배포 시 필수 환경변수 설정 확인

## 참고

- Docker 이미지는 이미 최적화된 Multi-stage 빌드 구조 사용
- 프로덕션 환경에서는 불필요한 파일이 제외됨
- 샘플 데이터 스크립트는 이미지에 포함됨

