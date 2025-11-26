/**
 * NH 뉴스 품질 점수 생성 워크플로우 템플릿
 * Production 20_news_silver_aoai.py 복제
 */

const newsWorkflowDefinition = {
  nodes: [
    {
      id: "node-1",
      type: "dataSource",
      position: { x: 100, y: 100 },
      data: {
        label: "뉴스 베이스 데이터 조회",
        description: "N_NEWS_MM_SILVER_BASE에서 오늘 뉴스 조회 (N_SOURCE=3, N_FGUBUN LIKE F%, N_CODE 숫자만)",
        query: `SELECT 
          N_ID, 
          N_TITLE, 
          N_CONTENT, 
          N_SOURCE, 
          N_FGUBUN, 
          N_KIND, 
          N_DATE, 
          N_TIME, 
          N_SENDID, 
          N_SEQNO, 
          N_CODE 
        FROM nh_ai.silver.N_NEWS_MM_SILVER_BASE 
        WHERE N_SOURCE = '3' 
          AND N_FGUBUN LIKE 'F%' 
          AND N_CODE REGEXP '^[0-9]+$' 
          AND N_DATE = date_format(current_date(), 'yyyyMMdd') 
        LIMIT 100`,
        outputKey: "news_data"
      }
    },
    {
      id: "node-2",
      type: "template",
      position: { x: 100, y: 280 },
      data: {
        label: "현재 시각 생성",
        description: "PY_NOW_TIME_TEXT 변수 생성 (KST)",
        templateText: "현재시각",
        variables: {},
        outputKey: "PY_NOW_TIME_TEXT",
        placeholderFormat: "single"
      }
    },
    {
      id: "node-3",
      type: "transform",
      position: { x: 100, y: 460 },
      data: {
        label: "뉴스 JSON 배열 생성",
        description: "뉴스 아이템을 JSON 배열로 변환 (id, title, content)",
        transformType: "custom",
        inputKey: "news_data",
        customCode: `
          // 뉴스 데이터를 배치 처리용 JSON 배열로 변환
          const items = input.map(item => ({
            id: item.N_ID,
            title: (item.N_TITLE || '').substring(0, 300),
            content: (item.N_CONTENT || '').substring(0, 2000)
          }));
          return JSON.stringify(items);
        `,
        outputKey: "ITEMS_JSON"
      }
    },
    {
      id: "node-4",
      type: "prompt",
      position: { x: 100, y: 640 },
      data: {
        label: "뉴스 품질 점수 AI 분석",
        description: "GPT-4.1로 뉴스 품질 점수 4가지 생성 (광고성, 경제관련성, 시장영향도, 콘텐츠품질)",
        promptId: "news-quality-scoring",
        maxTokens: 1200,
        temperature: 0.2,
        outputKey: "response"
      }
    },
    {
      id: "node-5",
      type: "transform",
      position: { x: 100, y: 820 },
      data: {
        label: "응답 JSON 파싱",
        description: "AI 응답에서 results 배열 추출",
        transformType: "json_parse",
        inputKey: "response",
        outputKey: "parsed_response"
      }
    },
    {
      id: "node-6",
      type: "transform",
      position: { x: 100, y: 1000 },
      data: {
        label: "결과 배열 추출",
        description: "parsed_response.results 또는 배열 직접 사용",
        transformType: "custom",
        inputKey: "parsed_response",
        customCode: `
          // results 필드가 있으면 사용, 없으면 전체를 배열로 간주
          if (input && input.results && Array.isArray(input.results)) {
            return input.results;
          } else if (Array.isArray(input)) {
            return input;
          } else {
            return [];
          }
        `,
        outputKey: "score_results"
      }
    },
    {
      id: "node-7",
      type: "transform",
      position: { x: 100, y: 1180 },
      data: {
        label: "광고 점수 70 이상 처리",
        description: "광고 점수 70 이상이면 나머지 점수 0으로 설정",
        transformType: "custom",
        inputKey: "score_results",
        customCode: `
          // 광고 점수가 70 이상이면 나머지 점수를 0으로 설정
          return input.map(item => {
            const ad_score = parseInt(item.gpt01_ad_post_score || 0);
            return {
              id: item.id,
              gpt01_ad_post_score: ad_score,
              gpt02_eco_post_score: ad_score >= 70 ? 0 : parseInt(item.gpt02_eco_post_score || 0),
              gpt03_market_post_score: ad_score >= 70 ? 0 : parseInt(item.gpt03_market_post_score || 0),
              gpt04_content_quality_score: ad_score >= 70 ? 0 : parseInt(item.gpt04_content_quality_score || 0)
            };
          });
        `,
        outputKey: "final_scores"
      }
    },
    {
      id: "node-8",
      type: "output",
      position: { x: 100, y: 1360 },
      data: {
        label: "결과 출력 (JSON)",
        description: "뉴스 품질 점수 결과 출력",
        format: "json",
        inputKey: "final_scores"
      }
    }
  ],
  edges: [
    { id: "edge-1", source: "node-1", target: "node-2" },
    { id: "edge-2", source: "node-2", target: "node-3" },
    { id: "edge-3", source: "node-3", target: "node-4" },
    { id: "edge-4", source: "node-4", target: "node-5" },
    { id: "edge-5", source: "node-5", target: "node-6" },
    { id: "edge-6", source: "node-6", target: "node-7" },
    { id: "edge-7", source: "node-7", target: "node-8" }
  ]
};

const workflow = {
  id: "nh-news-quality-scoring",
  name: "NH 뉴스 품질 점수 생성",
  description: "Production 20_news_silver_aoai.py 복제 - 뉴스 데이터를 분석하여 4가지 품질 점수(광고성, 경제관련성, 시장영향도, 콘텐츠품질) 생성하고 N_NEWS_MM_SILVER 테이블에 저장",
  definition: newsWorkflowDefinition,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

console.log("=== NH 뉴스 품질 점수 생성 워크플로우 ===");
console.log(JSON.stringify(workflow, null, 2));

export default workflow;
