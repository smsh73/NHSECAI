# AI 시황생성 데이터처리 워크플로우

이 문서는 AI 시황생성 데이터처리 개발코드를 워크플로우 형태로 변환한 시스템에 대한 설명입니다.

## 개요

기존의 Databricks 노트북과 프롬프트 파일들을 워크플로우 에디터에서 관리할 수 있는 구조로 변환했습니다. 각 워크플로우는 순차적 실행, 병렬 처리, 조건 분기 등을 지원하며, 세션 데이터베이스를 통해 노드 간 데이터를 공유합니다.

## 워크플로우 구성

### 1. 뉴스 데이터 처리 워크플로우
- **목적**: 뉴스 데이터를 수집하고 AOAI로 분석하여 시장 이벤트를 추출
- **노드 구성**:
  - `dataSource`: 뉴스 데이터 수집
  - `transform`: HTML 태그 제거 및 내용 정규화
  - `prompt`: 뉴스 분석 프롬프트 실행
  - `api_call`: Azure OpenAI API 호출
  - `json_processing`: 응답 데이터 JSON 파싱
  - `data_transformation`: 결과 데이터 변환
  - `sql_execution`: 데이터베이스 저장

### 2. 테마 시황 생성 워크플로우
- **목적**: 테마별 뉴스와 시세 데이터를 분석하여 테마 시황을 생성
- **노드 구성**:
  - `dataSource`: 테마-종목 매핑 데이터 수집
  - `transform`: 테마별 종목 데이터 변환
  - `prompt`: 테마 분석 프롬프트 실행
  - `api_call`: Azure OpenAI API 호출
  - `json_processing`: 응답 데이터 JSON 파싱
  - `data_transformation`: 결과 데이터 변환
  - `sql_execution`: 데이터베이스 저장

### 3. 매크로 시황 생성 워크플로우
- **목적**: 주요 이벤트, 테마 시황, 지수 데이터를 종합하여 매크로 시황을 생성
- **노드 구성**:
  - `dataSource`: 시장 이벤트, 테마 시황, 지수 데이터 수집
  - `transform`: 데이터 통합 및 변환
  - `prompt`: 매크로 분석 프롬프트 실행
  - `api_call`: Azure OpenAI API 호출
  - `json_processing`: 응답 데이터 JSON 파싱
  - `data_transformation`: 결과 데이터 변환
  - `sql_execution`: 데이터베이스 저장

## 프롬프트 카탈로그

다음 프롬프트들이 데이터베이스에 등록됩니다:

1. **news_aoai_prompt**: 뉴스 분석 및 점수화
2. **news_market_event_prompt**: 시장 이벤트 추출
3. **news_market_event_content_prompt**: 시장 이벤트 상세 내용 생성
4. **theme_market_analysis_prompt**: 테마 시황 분석
5. **macro_market_analysis_prompt**: 매크로 시황 분석

## 세션 데이터 관리

각 워크플로우 실행 시 세션 데이터베이스에 다음 정보가 저장됩니다:

- **워크플로우 세션**: 실행 세션 정보
- **워크플로우 노드**: 노드 정의 및 설정
- **노드 실행 로그**: 각 노드의 실행 상태 및 결과
- **세션 데이터**: 노드 간 공유되는 데이터

## 환경 설정

### 로컬 개발 환경
```bash
# 환경 변수 설정
cp local-test-config.env .env

# 워크플로우 설정
npm run setup:workflows

# 개발 서버 실행
npm run dev
```

### Azure 개발 환경
```bash
# 환경 변수 설정
cp development.env .env

# 워크플로우 설정
npm run setup:workflows

# 개발 서버 실행
npm run dev
```

### Azure 배포 환경
```bash
# 환경 변수 설정
cp production.env .env

# 워크플로우 설정
npm run setup:workflows

# 프로덕션 서버 실행
npm run start
```

## 사용 방법

### 1. 워크플로우 설정
```bash
# 기본 설정
npm run setup:workflows

# 테스트 포함 설정
npm run setup:workflows:test

# 설정 롤백
npm run setup:workflows:rollback
```

### 2. 워크플로우 실행
1. 워크플로우 에디터에서 원하는 워크플로우 선택
2. 세션 생성 및 실행
3. 실행 결과 확인

### 3. 프롬프트 관리
1. 프롬프트 등록 화면에서 프롬프트 확인
2. 필요시 프롬프트 수정
3. 워크플로우에서 수정된 프롬프트 사용

## 데이터 정합성 검증

시스템은 다음 항목들의 데이터 정합성을 자동으로 검증합니다:

- 워크플로우 에디터의 워크플로우 목록
- API 등록 화면의 API 설정
- 프롬프트 등록 화면의 프롬프트 목록
- 환경별 설정 검증

## 문제 해결

### 일반적인 문제
1. **환경 변수 오류**: `.env` 파일의 설정을 확인하세요
2. **데이터베이스 연결 오류**: PostgreSQL 연결 설정을 확인하세요
3. **Azure 서비스 연결 오류**: Azure 인증 정보를 확인하세요

### 로그 확인
```bash
# 애플리케이션 로그
tail -f logs/activity.log

# 오류 로그
tail -f logs/error-$(date +%Y-%m-%d).log
```

## 기술 스택

- **백엔드**: Node.js, Express, TypeScript
- **데이터베이스**: PostgreSQL (Drizzle ORM)
- **AI 서비스**: Azure OpenAI (APIM)
- **데이터 처리**: Azure Databricks
- **프론트엔드**: React, TypeScript, Tailwind CSS

## 개발자 가이드

### 새로운 워크플로우 추가
1. `scripts/` 폴더에 워크플로우 생성 스크립트 작성
2. `setup-data-processing-workflows.js`에 워크플로우 등록
3. 프롬프트 카탈로그에 필요한 프롬프트 추가
4. 테스트 및 검증

### 프롬프트 수정
1. `data-processing-dev 2/prompts/` 폴더의 프롬프트 파일 수정
2. `npm run setup:workflows` 실행하여 데이터베이스 업데이트
3. 워크플로우에서 수정된 프롬프트 사용

## 라이선스

MIT License
