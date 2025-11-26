# Docker 이미지 빌드 및 배포 가이드

## 빌드 완료 상태

✅ **Vite 프론트엔드 빌드 완료**
- 빌드 결과물 위치: `dist/public/`
- 빌드된 파일:
  - `index.html` (3.47 kB)
  - `assets/index-DdfqpQQX.css` (169.54 kB)
  - `assets/index-Cv8qqWAc.js` (2,171.82 kB)

## Docker 이미지 빌드

### 전제 조건

1. Docker가 설치되어 있어야 합니다.
   - macOS: `brew install docker` 또는 Docker Desktop 설치
   - Linux: `apt-get install docker.io` 또는 해당 배포판의 패키지 관리자 사용
   - Windows: Docker Desktop 설치

2. Docker 실행 확인:
   ```bash
   docker --version
   ```

### 빌드 명령어

#### 1. 로컬에서 Docker 이미지 빌드

```bash
docker build -t aitrade-console:latest .
```

#### 2. 특정 태그와 함께 빌드

```bash
docker build -t aitrade-console:v1.2.0 -t aitrade-console:latest .
```

#### 3. 빌드 캐시 없이 완전히 새로 빌드

```bash
docker build --no-cache -t aitrade-console:latest .
```

### Docker 이미지 확인

빌드 후 이미지가 생성되었는지 확인:

```bash
docker images | grep aitrade-console
```

### Docker 컨테이너 실행

#### 로컬 테스트 실행

```bash
docker run -d \
  --name aitrade-console \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e AZURE_POSTGRES_HOST=your-postgres-host \
  -e AZURE_POSTGRES_PORT=5432 \
  -e AZURE_POSTGRES_DATABASE=your-database \
  -e AZURE_POSTGRES_USERNAME=your-username \
  -e AZURE_POSTGRES_PASSWORD=your-password \
  aitrade-console:latest
```

#### 환경 변수 파일 사용

`.env` 파일을 사용하여 실행:

```bash
docker run -d \
  --name aitrade-console \
  -p 5000:5000 \
  --env-file .env \
  aitrade-console:latest
```

### 로그 확인

```bash
docker logs -f aitrade-console
```

### 컨테이너 중지 및 제거

```bash
docker stop aitrade-console
docker rm aitrade-console
```

## Azure Container Registry (ACR)에 푸시

### 1. ACR 로그인

```bash
az acr login --name <your-acr-name>
```

### 2. 이미지 태깅

```bash
docker tag aitrade-console:latest <your-acr-name>.azurecr.io/aitrade-console:latest
docker tag aitrade-console:latest <your-acr-name>.azurecr.io/aitrade-console:v1.2.0
```

### 3. 이미지 푸시

```bash
docker push <your-acr-name>.azurecr.io/aitrade-console:latest
docker push <your-acr-name>.azurecr.io/aitrade-console:v1.2.0
```

## Azure App Service 배포

### Azure CLI를 사용한 배포

```bash
az webapp config container set \
  --name <your-app-name> \
  --resource-group <your-resource-group> \
  --docker-custom-image-name <your-acr-name>.azurecr.io/aitrade-console:latest \
  --docker-registry-server-url https://<your-acr-name>.azurecr.io
```

## 빌드 최적화

현재 빌드 결과물이 큰 편이므로 (약 2.2MB), 다음을 고려할 수 있습니다:

1. **코드 스플리팅**: 큰 번들을 여러 청크로 분할
2. **트리 쉐이킹**: 사용하지 않는 코드 제거
3. **압축**: Gzip 압축 적용 (이미 적용됨)

## 주의사항

⚠️ **TypeScript 컴파일 에러**: `scheduler.ts` 파일에 타입 에러가 있습니다. 프로덕션 배포 전에 수정이 필요합니다.

빌드 명령어:
```bash
npm run build
```

이 명령어는 `vite build && tsc --project tsconfig.build.json`을 실행하므로, 타입 에러를 해결해야 전체 빌드가 완료됩니다.

## 배포 패키지 생성

소스 코드 전체를 압축하여 배포 패키지 생성:

```bash
tar -czf aitrade-console-source-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='*.log' \
  .
```

또는:

```bash
zip -r aitrade-console-source-$(date +%Y%m%d).zip . \
  -x 'node_modules/*' \
  -x 'dist/*' \
  -x '.git/*' \
  -x '*.log'
```

