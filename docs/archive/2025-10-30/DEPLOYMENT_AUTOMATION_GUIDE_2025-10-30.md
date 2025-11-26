# 배포 자동화 가이드

## 개요

배포 버전 생성 시 문서 업데이트를 자동화하는 가이드입니다.

## 스크립트 설명

### 1. `scripts/update-doc-dates.sh`
문서의 날짜를 자동으로 업데이트하고 아카이빙합니다.

**기능**:
- 모든 문서의 날짜를 오늘 날짜로 업데이트
- 문서를 날짜별로 아카이빙 (`docs/archive/YYYY-MM-DD/`)
- 백업 복사본 생성

**사용법**:
```bash
bash scripts/update-doc-dates.sh
```

### 2. `scripts/generate-menu-analysis-doc.sh`
메뉴별 종합 분석 문서를 생성합니다.

**기능**:
- 모든 메뉴의 소스코드, 스키마, 데이터 소스, 화면 구성, 함수 분석
- 구현 상태 추적
- 날짜 포함된 파일명으로 저장 (`YYYY-MM-DD_menu-comprehensive-analysis.md`)

**사용법**:
```bash
bash scripts/generate-menu-analysis-doc.sh
```

### 3. `scripts/generate-changelog.sh`
변경이력을 자동으로 업데이트합니다.

**기능**:
- `docs/CHANGELOG.md` 파일에 오늘 날짜의 변경이력 추가
- 문서 업데이트 이력 기록

**사용법**:
```bash
bash scripts/generate-changelog.sh
```

### 4. `scripts/prepare-deployment.sh`
배포 준비를 위한 통합 스크립트입니다.

**기능**:
- 모든 문서 업데이트 Calendar 실행
- 변경이력 생성
- 종합 분석 문서 생성

**사용법**:
```bash
bash scripts/prepare-deployment.sh [VERSION]
```

예시:
```bash
bash scripts/prepare-deployment.sh 20251030
```

## 배포 워크플로우

### 전체 배포 프로세스

1. **문서 업데이트**
   ```bash
   bash scripts/prepare-deployment.sh
   ```

2. **소스코드 빌드**
   ```bash
   npm run build
   ```

3. **Docker 이미지 빌드**
   ```bash
   docker build -t aitrade-console:$(date +%Y%m%d) .
   ```

4. **ACR에 푸시**
   ```bash
   docker tag aitrade-console:$(date +%Y%m%d) <acr-name>.azurecr.io/aitrade-console:$(date +%Y%m%d)
   docker push <acr-name>.azurecr.io/aitrade-console:$(date +%Y%m%d)
   ```

## 문서 아카이빙 구조

```
docs/
├── archive/
│   └── 2025-10-30/
│       ├── backup/
│       │   └── [원본 문서 백업]
│       └── [四种_YYYY-MM-DD.md (아카이빙된 문서)]
├── CHANGELOG.md
├── 2025-10-30_menu-comprehensive-analysis.md
└── [기타 문서들]
```

## 자동화 통합

### package.json에 스크립트 추가

```json
{
  "scripts": {
    "docs:update": "bash scripts/update-doc-dates.sh",
    "docs:analysis": "bash scripts/generate-menu-analysis-doc.sh",
    "docs:changelog": "bash scripts/generate-changelog.sh",
    "deploy:prepare": "bash scripts/prepare-deployment.sh"
  }
}
```

사용 예:
```bash
npm run deploy:prepare
```

## 주의사항

1. **날짜 형식**: 모든 날짜는 `YYYY-MM-DD` 형식을 사용합니다.
2. **아카이빙**: 기존 문서는 백업 후 날짜 포함 파일명으로 아카이빙됩니다.
3. **변경이력**: 매 배포마다 `CHANGELOG.md`에 변경사항이 추가됩니다.
4. **종합 분석**: 배포 시마다 최신 상태로 자동 업데이트됩니다.

---

**마지막 업데이트**: 2025-10-30

