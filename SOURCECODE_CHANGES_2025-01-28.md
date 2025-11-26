# 소스코드 변경사항 상세 분석

**작성일**: 2025-01-28  
**기준**: `ai_trade_console-dev(old)` → 현재 소스코드  
**해결된 주요 오류**: 3건 (TypeScript 오류, AI 챗봇 connection error, Databricks 뉴스기사 검색 오류)

---

## 1. 해결된 오류 요약

### 1.1 TypeScript 오류 해결
- **파일**: `server/services/ai-api.ts`
- **문제**: Azure OpenAI 호출 메서드 누락으로 인한 타입 불일치
- **해결**: `callAzureOpenAIChat` 메서드 추가 및 타입 정의 완성

### 1.2 AI 챗봇 Connection Error 해결
- **파일**: `server/routes/ai-chat.ts`
- **문제**: Azure OpenAI 설정 확인 없이 직접 OpenAI API 호출 시도
- **해결**: Azure 설정 확인 후 적절한 서비스 선택 로직 추가

### 1.3 Databricks 뉴스기사 검색 오류 해결
- **파일**: `server/services/azure-databricks.ts`
- **문제**: 잘못된 테이블 컬럼명 사용 (`published_at`, `title`, `content` 대신 원본 컬럼명 필요)
- **해결**: 원본 컬럼명(`N_DATE`, `N_TIME`, `N_TITLE`, `N_CONTENT` 등) 사용 및 쿼리 재작성

---

## 2. 파일별 상세 변경사항

### 2.1 `server/services/ai-api.ts`

#### 변경사항 1: `callAzureOpenAIChat` 메서드 추가

**이전 코드** (old 버전에서는 이 메서드가 없음):
- 파일에 `callAzureOpenAIChat` 메서드가 존재하지 않음
- OpenAI, Claude, Gemini, Perplexity 메서드만 존재

**변경 후**:
```39:119:server/services/ai-api.ts
  static async callAzureOpenAIChat(request: AIApiTestRequest): Promise<AIApiResponse> {
    const startTime = Date.now();
    try {
      const cfg = AzureConfigService.getOpenAIPTUConfig();
      if (!cfg.endpoint || !cfg.apiKey || !cfg.deploymentName || !cfg.apiVersion) {
        return {
          success: false,
          error: "Azure OpenAI PTU configuration is incomplete",
          responseTime: Date.now() - startTime,
          provider: "AzureOpenAI"
        };
      }

      // Inject current KST date/time into system prompt by default
      const kstNow = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).format(new Date());
      const dateLine = `오늘 날짜와 시간(KST): ${kstNow}`;
      const systemWithDate = request.systemPrompt
        ? `${request.systemPrompt}\n\n${dateLine}`
        : `당신은 도움이 되는 어시스턴트입니다.\n${dateLine}`;

      // Build messages
      const messages: any[] = [];
      messages.push({ role: "system", content: systemWithDate });
      messages.push({ role: "user", content: request.prompt });

      // Endpoint format: {endpoint}/deployments/{deployment}/chat/completions?api-version=...
      const url = `${cfg.endpoint.replace(/\/$/, "")}/deployments/${cfg.deploymentName}/chat/completions?api-version=${cfg.apiVersion}`;

      const body = {
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000,
        // model param is ignored by Azure; deployment governs the model
      } as any;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": cfg.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          success: false,
          error: text || `Azure OpenAI request failed: ${res.status}`,
          responseTime: Date.now() - startTime,
          provider: "AzureOpenAI",
        };
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      return {
        success: true,
        data: { content, model: cfg.modelName || cfg.deploymentName, finishReason: data?.choices?.[0]?.finish_reason },
        usage: {
          promptTokens: data?.usage?.prompt_tokens,
          completionTokens: data?.usage?.completion_tokens,
          totalTokens: data?.usage?.total_tokens,
        },
        model: cfg.modelName || cfg.deploymentName,
        provider: "AzureOpenAI",
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Azure OpenAI call failed",
        responseTime: Date.now() - startTime,
        provider: "AzureOpenAI",
      };
    }
  }
```

**변경 내용**:
1. Azure OpenAI API 호출을 위한 완전한 메서드 추가
2. Azure Config Service를 통한 설정 확인
3. KST 시간 자동 주입 기능
4. 적절한 에러 처리 및 응답 포맷

**영향**:
- TypeScript 타입 오류 해결 (존재하지 않는 메서드 호출 방지)
- Azure OpenAI 사용 시 connection error 해결

---

#### 변경사항 2: Import 문 추가

**변경 전**:
```typescript
import OpenAI from "openai";
```

**변경 후**:
```1:3:server/services/ai-api.ts
import OpenAI from "openai";
import { AzureConfigService } from "./azure-config.js";
import fetch from "node-fetch";
```

**설명**: Azure Config Service와 fetch 모듈 import 추가

---

### 2.2 `server/routes/ai-chat.ts`

#### 변경사항 1: Azure OpenAI 설정 확인 및 Fallback 로직 추가

**이전 코드** (194-202줄):
```typescript
// Call OpenAI API with fallback model
const safeModel = model; // Use configured model
const aiResponse = await AIApiService.callOpenAI({
  provider: 'OpenAI',
  model: safeModel,
  prompt: enhancedMessage,
  systemPrompt: financialSystemPrompt,
  maxTokens: 1500
});
```

**변경 후**:
```194:212:server/routes/ai-chat.ts
    // Call Azure OpenAI when configured (APIM/PTU), fallback to OpenAI public
    const azureCfg = azureConfigService.getOpenAIPTUConfig();
    const useAzure = !!(azureCfg.endpoint && azureCfg.apiKey);
    const safeModel = model; // configured model name
    const aiResponse = useAzure
      ? await AIApiService.callAzureOpenAIChat({
          provider: 'AzureOpenAI',
          model: safeModel,
          prompt: enhancedMessage,
          systemPrompt: financialSystemPrompt,
          maxTokens: 1500,
        })
      : await AIApiService.callOpenAI({
          provider: 'OpenAI',
          model: safeModel,
          prompt: enhancedMessage,
          systemPrompt: financialSystemPrompt,
          maxTokens: 1500,
        });
```

**변경 내용**:
1. Azure OpenAI 설정 확인 로직 추가 (`getOpenAIPTUConfig()`)
2. 설정이 완료된 경우 Azure OpenAI 사용, 그렇지 않으면 OpenAI 공개 API 사용
3. 조건부 서비스 선택 로직 구현

**영향**:
- AI 챗봇에서 프롬프트 전송 시 connection error 해결
- Azure 환경에서 올바른 서비스 선택
- Fallback 메커니즘으로 안정성 향상

---

#### 변경사항 2: Legacy 엔드포인트에도 동일한 로직 적용

**이전 코드** (359-366줄):
```typescript
// Call OpenAI API
const aiResponse = await AIApiService.callOpenAI({
  provider: 'OpenAI',
  model,
  prompt: content,
  systemPrompt,
  maxTokens: 1500
});
```

**변경 후**:
```369:387:server/routes/ai-chat.ts
      // Prefer Azure OpenAI (APIM/PTU) when configured, fallback to OpenAI public
      const azureCfg = azureConfigService.getOpenAIPTUConfig();
      const useAzure = !!(azureCfg.endpoint && azureCfg.apiKey);

      const aiResponse = useAzure
        ? await AIApiService.callAzureOpenAIChat({
            provider: 'AzureOpenAI',
            model,
            prompt: content,
            systemPrompt,
            maxTokens: 1500,
          })
        : await AIApiService.callOpenAI({
            provider: 'OpenAI',
            model,
            prompt: content,
            systemPrompt,
            maxTokens: 1500,
          });
```

**설명**: POST `/api/ai-chat` 엔드포인트에도 동일한 Azure/OpenAI 선택 로직 적용

---

### 2.3 `server/services/azure-databricks.ts`

#### 변경사항 1: `getAllNews` 메서드 - 쿼리 및 컬럼명 수정

**이전 코드** (1093-1174줄):
- 잘못된 컬럼명 사용 (`published_at`, `title`, `content`, `category`, `sentiment` 등)
- 여러 테이블 위치 시도하는 복잡한 로직
- 존재하지 않는 컬럼 조회 시도

**주요 변경 부분**:

1. **WHERE 조건 수정**:
```typescript
// 이전 (1093-1098줄)
if (options.startDate) {
  conditions.push(`published_at >= '${options.startDate.toISOString()}'`);
}
if (options.endDate) {
  conditions.push(`published_at <= '${options.endDate.toISOString()}'`);
}
```

**변경 후**:
```1068:1078:server/services/azure-databricks.ts
      // Build WHERE conditions based on source columns
      if (options.startDate) {
        conditions.push(`to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss') >= '${options.startDate.toISOString()}'`);
      }
      if (options.endDate) {
        conditions.push(`to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss') <= '${options.endDate.toISOString()}'`);
      }
      if (options.searchQuery) {
        const escapedQuery = options.searchQuery.replace(/'/g, "''");
        conditions.push(`(N_TITLE LIKE '%${escapedQuery}%' OR N_CONTENT LIKE '%${escapedQuery}%')`);
      }
```

2. **테이블명 단순화**:
```typescript
// 이전 (1114-1124줄)
const tableLocations = [
  'news_data',
  'default.news_data',
  'main.news_data',
  'hive_metastore.default.news_data',
  'hive_metastore.main.news_data'
];

let query = '';
let lastError: Error | null = null;

for (const tableName of tableLocations) {
  try {
    // ... 복잡한 로직
  } catch (error: any) {
    // ... 에러 처리
  }
}
```

**변경 후**:
```1080:1081:server/services/azure-databricks.ts
      // Fully-qualified table name (configurable via env var)
      const tableName = process.env.DATABRICKS_NEWS_TABLE || 'nh_ai.silver.n_news_mm_silver';
```

3. **SELECT 쿼리 수정**:
```typescript
// 이전 (1140-1168줄)
SELECT 
  id,
  nid,
  title,
  content,
  summary,
  ...
FROM ${tableName}
```

**변경 후**:
```1094:1129:server/services/azure-databricks.ts
      // Get data page
      const dataQuery = `
        SELECT 
          N_ID                                     AS nid,
          N_TITLE                                  AS title,
          N_CONTENT                                AS content,
          N_SOURCE                                 AS source,
          N_CODE                                   AS symbol,
          to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss') AS published_at,
          GPT02_ECO_POST_SCORE                     AS economic_score,
          GPT03_MARKET_POST_SCORE                  AS market_score,
          GPT01_AD_POST_SCORE                      AS advertisement_score,
          GPT04_CONTENT_QUALITY_SCORE              AS content_quality_score,
          _INGEST_TS                               AS crawled_at,
          _INGEST_TS                               AS processed_at,
          array(N_CODE)                            AS relevant_symbols,
          array()                                  AS relevant_indices,
          array()                                  AS relevant_themes,
          array()                                  AS keywords,
          array()                                  AS entities,
          array()                                  AS market_events,
          array()                                  AS event_categories,
          CAST(NULL AS STRING)                     AS reporter,
          CAST(NULL AS STRING)                     AS category,
          CAST(NULL AS STRING)                     AS subcategory,
          CAST(NULL AS STRING)                     AS sentiment,
          CAST(NULL AS DOUBLE)                     AS sentiment_score,
          FALSE                                    AS is_processed,
          FALSE                                    AS is_filtered,
          FALSE                                    AS is_high_quality
        FROM ${tableName}
        ${whereClause}
        ORDER BY published_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
```

**변경 내용 요약**:
1. 원본 컬럼명 사용 (`N_DATE`, `N_TIME`, `N_TITLE`, `N_CONTENT` 등)
2. 날짜/시간 변환 함수 사용 (`to_timestamp(concat(N_DATE, N_TIME), 'yyyyMMddHHmmss'))`)
3. 테이블명 단순화 및 환경변수 지원
4. 여러 테이블 위치 시도 로직 제거

**영향**:
- Databricks 뉴스기사 검색 오류 해결
- 올바른 컬럼명으로 쿼리 성공
- 코드 단순화 및 유지보수성 향상

---

### 2.4 기타 변경된 파일

#### `server/routes.ts`
- 변경사항 없음 (이번 수정과 무관한 동일 파일)

#### `shared/schema.ts`
- 변경사항 미확인 (상세 비교 필요)

#### 클라이언트 페이지 파일들
- `api-management.tsx`, `audit-log-management.tsx`, `azure-config.tsx`, `schema-browser.tsx`
- 이번 3가지 오류 해결과는 무관할 것으로 예상 (추가 검증 필요)

---

## 3. 변경사항 통계

| 항목 | 수량 |
|------|------|
| 수정된 파일 수 | 3개 (주요) |
| 추가된 메서드 | 1개 (`callAzureOpenAIChat`) |
| 수정된 메서드 | 2개 (`getAllNews`, `POST /session`, `POST /`) |
| 해결된 오류 수 | 3개 |

---

## 4. 코드 품질 개선 사항

### 4.1 에러 처리 강화
- Azure OpenAI 설정 확인 로직 추가
- Fallback 메커니즘 구현
- 적절한 에러 메시지 반환

### 4.2 타입 안전성 향상
- `callAzureOpenAIChat` 메서드 추가로 타입 불일치 해결
- 명확한 타입 정의 유지

### 4.3 코드 단순화
- Databricks 쿼리 로직 단순화
- 불필요한 반복 시도 로직 제거
- 환경변수를 통한 설정 관리

---

## 5. 테스트 권장사항

### 5.1 AI 챗봇 테스트
- [ ] Azure OpenAI 설정이 있는 경우 정상 작동 확인
- [ ] Azure OpenAI 설정이 없는 경우 OpenAI 공개 API fallback 확인
- [ ] Connection error 발생하지 않는지 확인

### 5.2 Databricks 뉴스 검색 테스트
- [ ] 뉴스 검색 API 정상 응답 확인
- [ ] 날짜 범위 필터링 정상 작동 확인
- [ ] 검색어 필터링 정상 작동 확인
- [ ] 페이지네이션 정상 작동 확인

### 5.3 TypeScript 컴파일 테스트
- [ ] `npm run build` 성공 확인
- [ ] 타입 에러 없음 확인

---

## 6. 후속 작업 제안

1. **테스트 코드 작성**: 수정된 메서드에 대한 단위 테스트 추가
2. **에러 로깅 개선**: 더 상세한 에러 로깅 추가
3. **문서화**: Azure OpenAI 설정 방법 문서화
4. **모니터링**: 실제 운영 환경에서 모니터링 및 로그 확인

