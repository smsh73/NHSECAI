# 로컬 테스트 가이드

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# 로컬 테스트 환경 설정
npm run test:local:setup

# 의존성 설치
npm install
```

### 2. 서버 시작
```bash
# 개발 서버 시작
npm run dev
```

### 3. 로컬 테스트 실행
```bash
# 자동화된 테스트 실행
npm run test:local
```

## 📋 테스트 구성

### Mock 서비스
- **Mock Databricks**: 실제 Databricks 호출 없이 Mock 데이터 반환
- **Mock OpenAI**: 실제 OpenAI API 호출 없이 Mock 응답 반환
- **Mock Activity Logger**: 로그 출력만 수행

### 테스트 API 엔드포인트
- `GET /api/ai-market-analysis-local/workflow-status` - 워크플로우 상태 조회
- `POST /api/ai-market-analysis-local/collect-news` - 뉴스 데이터 수집
- `POST /api/ai-market-analysis-local/extract-events` - 주요이벤트 추출
- `POST /api/ai-market-analysis-local/generate-themes` - 테마 시황 생성
- `POST /api/ai-market-analysis-local/generate-macro` - 매크로 시황 생성
- `POST /api/ai-market-analysis-local/execute-workflow` - 전체 워크플로우 실행

## 🧪 테스트 시나리오

### 1. 개별 단계 테스트
```bash
# 뉴스 데이터 수집 테스트
curl -X POST http://localhost:5000/api/ai-market-analysis-local/collect-news

# 주요이벤트 추출 테스트
curl -X POST http://localhost:5000/api/ai-market-analysis-local/extract-events \
  -H "Content-Type: application/json" \
  -d '{"newsData": [{"N_TITLE": "테스트 뉴스"}]}'
```

### 2. 전체 워크플로우 테스트
```bash
# 전체 워크플로우 실행
curl -X POST http://localhost:5000/api/ai-market-analysis-local/execute-workflow
```

### 3. 프론트엔드 테스트
1. 브라우저에서 `http://localhost:5000` 접속
2. "AI시황생성테스트" 메뉴 클릭
3. "전체 워크플로우 실행" 버튼 클릭
4. 워크플로우 진행 상황 확인

## 📊 Mock 데이터

### 뉴스 데이터
```json
{
  "N_ID": "news_001",
  "N_TITLE": "삼성전자, 3분기 실적 발표... 매출 70조원 돌파",
  "N_CONTENT": "삼성전자가 3분기 실적을 발표하며...",
  "N_CODE": "005930",
  "N_DATE": "20250101",
  "N_TIME": "090000",
  "GPT01_AD_POST_SCORE": 45,
  "GPT04_CONTENT_QUALITY_SCORE": 85,
  "GPT02_ECO_POST_SCORE": 80,
  "GPT03_MARKET_POST_SCORE": 75
}
```

### 주요이벤트 데이터
```json
{
  "eventId": "ME-20250101-001",
  "eventTitle": "반도체 업계 실적 발표",
  "eventDetail": "삼성전자, SK하이닉스 등 주요 반도체 기업들의 3분기 실적이...",
  "newsIds": ["news_001", "news_002"],
  "newsTitles": ["삼성전자, 3분기 실적 발표...", "SK하이닉스, AI 반도체 수요 증가..."],
  "newsCodes": ["005930", "000660"]
}
```

### 테마 시황 데이터
```json
{
  "trendId": "TH-20250101-100000-T001",
  "themeTitle": "반도체",
  "content": "AI 반도체 수요 증가로 인한 반도체 업계 전반의 상승세...",
  "direction": "UP",
  "fluctuationRate": 3.5,
  "bubbleScale": 4
}
```

### 매크로 시황 데이터
```json
{
  "trendId": "MM-20250101-100000",
  "title": "글로벌 기술주 중심 상승세 지속",
  "content": "미국 기술 기업들의 실적 발표가 긍정적으로 예상되며..."
}
```

## 🔧 문제 해결

### 서버 연결 오류
```bash
# 서버 상태 확인
curl http://localhost:5000/api/system/status

# 포트 확인
lsof -i :5000
```

### 환경 변수 오류
```bash
# 환경 변수 확인
cat .env

# 환경 변수 다시 설정
npm run test:local:setup
```

### Mock 서비스 오류
- Mock 서비스는 메모리에서 동작하므로 서버 재시작 시 초기화됩니다
- 로그를 확인하여 Mock 서비스 호출 여부를 확인할 수 있습니다

## 📈 성능 테스트

### 응답 시간 측정
```bash
# 개별 API 응답 시간 측정
time curl -X POST http://localhost:5000/api/ai-market-analysis-local/collect-news

# 전체 워크플로우 응답 시간 측정
time curl -X POST http://localhost:5000/api/ai-market-analysis-local/execute-workflow
```

### 메모리 사용량 확인
```bash
# Node.js 프로세스 메모리 사용량 확인
ps aux | grep node
```

## 🎯 테스트 목표

1. **기능 검증**: 모든 워크플로우 단계가 정상 동작하는지 확인
2. **데이터 검증**: Mock 데이터가 올바른 형식으로 반환되는지 확인
3. **에러 처리**: 예외 상황에서 적절한 에러 메시지가 반환되는지 확인
4. **성능 검증**: 각 단계별 응답 시간이 적절한지 확인

## 📝 테스트 결과 해석

### 성공적인 테스트 결과
```
🧪 AI 시황생성 로컬 테스트 시작

✅ 서버가 실행 중입니다.

🧪 워크플로우 상태 조회 실행 중...
✅ 워크플로우 상태 조회 통과

🧪 뉴스 데이터 수집 실행 중...
📰 뉴스 데이터 3건 수집됨
✅ 뉴스 데이터 수집 통과

📊 테스트 결과:
✅ 통과: 6
❌ 실패: 0
📈 성공률: 100.0%

🎉 테스트 완료!
```

### 실패한 테스트 결과
```
❌ 뉴스 데이터 수집 실패: 예상 상태 코드: 200, 실제: 500
❌ 주요이벤트 추출 실패: 응답이 성공하지 않음
```

이 가이드를 따라하면 외부 의존성 없이 AI 시황생성 기능을 완전히 테스트할 수 있습니다.
