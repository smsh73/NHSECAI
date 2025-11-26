# Docker 설치 및 Export 가이드

## 현재 상태

✅ **소스코드 Export**: 완료
- 위치: `exports/source-code/aitradeconsole-source-*.tar.gz`
- 소스코드는 이미 export되었습니다.

⚠️ **Docker 이미지 Export**: Docker 설치 필요

---

## Docker 설치 방법 (macOS)

### 방법 1: Docker Desktop 다운로드 및 설치 (권장)

1. **Docker Desktop 다운로드**
   - 공식 사이트: https://www.docker.com/products/docker-desktop/
   - 또는 직접 다운로드: https://desktop.docker.com/mac/main/arm64/Docker.dmg

2. **설치**
   ```bash
   # 다운로드한 .dmg 파일 실행
   # Docker.app을 Applications 폴더로 드래그
   ```

3. **Docker Desktop 실행**
   - Applications 폴더에서 Docker.app 실행
   - 처음 실행 시 약간의 시간이 걸릴 수 있습니다
   - 메뉴바에 Docker 아이콘이 나타나면 실행 완료

4. **설치 확인**
   ```bash
   docker --version
   docker info
   ```

### 방법 2: Homebrew로 설치

```bash
# Homebrew가 설치되어 있어야 합니다
brew install --cask docker

# 설치 후 Docker Desktop 실행
open -a Docker
```

---

## Docker 설치 후 Export 실행

### 1단계: Docker 실행 확인

```bash
# Docker가 실행 중인지 확인
docker info

# 정상적으로 실행되면 Docker 정보가 출력됩니다
```

### 2단계: 모든 Export 실행

```bash
# 모든 export를 한 번에 실행 (소스코드 + Docker 이미지)
./export-all.sh
```

또는 개별 실행:

```bash
# Docker 이미지만 빌드 및 export
./build-and-export-image.sh

# 소스코드만 export (이미 완료됨)
./export-source-code.sh
```

---

## Export 결과물

모든 export가 완료되면 다음 파일들이 생성됩니다:

```
exports/
├── source-code/
│   └── aitradeconsole-source-*.tar.gz      ✅ 완료
└── docker-images/
    └── nh-financial-analysis-*.tar        ⏳ Docker 필요
```

---

## 문제 해결

### Docker가 실행되지 않는 경우

1. **Docker Desktop이 실행 중인지 확인**
   ```bash
   # macOS에서 실행 중인 프로세스 확인
   ps aux | grep -i docker
   ```

2. **Docker Desktop 재시작**
   - 메뉴바의 Docker 아이콘 클릭
   - "Restart Docker Desktop" 선택

3. **권한 확인**
   - Docker Desktop이 필요한 권한을 요청할 수 있습니다
   - 시스템 환경설정에서 권한 허용

### Docker 명령어가 작동하지 않는 경우

```bash
# PATH 확인
which docker

# Docker Desktop 재설치
# Applications에서 Docker 제거 후 다시 설치
```

---

## 빠른 참조

### Docker 설치 확인
```bash
docker --version
docker info
```

### Export 실행
```bash
# 모든 export (소스코드 + 이미지)
./export-all.sh

# 이미지만
./build-and-export-image.sh

# 소스코드만
./export-source-code.sh
```

### Export 파일 확인
```bash
# 소스코드
ls -lh exports/source-code/

# Docker 이미지
ls -lh exports/docker-images/
```

---

## 다음 단계

1. ✅ Docker Desktop 설치 및 실행
2. ✅ `./export-all.sh` 실행
3. ✅ Export 파일 확인

