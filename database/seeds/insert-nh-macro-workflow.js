import pg from 'pg';
const { Client } = pg;

const workflowDefinition = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 100, y: 100 },
      data: {
        label: "시작",
        config: {}
      }
    },
    {
      id: "load-events",
      type: "dataSource",
      position: { x: 100, y: 200 },
      data: {
        label: "주요 이벤트 로드",
        description: "A200_MARKET_EVENTS에서 당일 주요 이벤트 조회",
        config: {
          source: "databricks",
          query: "SELECT EVENT_ID, EVENT_TITLE, EVENT_DETAIL FROM nh_ai.silver.A200_MARKET_EVENTS WHERE BASE_DATE = CURRENT_DATE() ORDER BY BASE_TIME DESC LIMIT 10",
          outputKey: "events_data"
        }
      }
    },
    {
      id: "load-themes",
      type: "dataSource",
      position: { x: 300, y: 200 },
      data: {
        label: "테마 시황 로드",
        description: "A300_THEME_MARKET에서 당일 테마별 시황 조회",
        config: {
          source: "databricks",
          query: "SELECT TREND_ID, THEME_TITLE, FLUCTUATION_RATE, BUBBLE_SCALE FROM nh_ai.silver.A300_THEME_MARKET WHERE BASE_DATE = CURRENT_DATE() ORDER BY BASE_TIME DESC LIMIT 30",
          outputKey: "themes_data"
        }
      }
    },
    {
      id: "load-indices",
      type: "dataSource",
      position: { x: 500, y: 200 },
      data: {
        label: "지수 이상치 로드",
        description: "KRI1/USC1에서 Z-Score 상위 지수 조회",
        config: {
          source: "databricks",
          query: "SELECT 'kri' as source, BSTP_CLS_CODE as code, RETURN_RATE, Z_SCORE FROM nh_ai.silver.KRI1_SILVER WHERE BSOP_DATE = CURRENT_DATE() ORDER BY Z_SCORE DESC LIMIT 10",
          outputKey: "indices_data"
        }
      }
    },
    {
      id: "load-prev-macro",
      type: "dataSource",
      position: { x: 700, y: 200 },
      data: {
        label: "이전 매크로 시황",
        description: "A100_MACRO_MARKET에서 직전 시황 조회 (참고용)",
        config: {
          source: "databricks",
          query: "SELECT TITLE, CONTENT FROM nh_ai.silver.A100_MACRO_MARKET ORDER BY _INGEST_TS DESC LIMIT 1",
          outputKey: "prev_macro"
        }
      }
    },
    {
      id: "transform-events",
      type: "transform",
      position: { x: 100, y: 350 },
      data: {
        label: "이벤트 JSON 변환",
        description: "이벤트 데이터를 JSON 문자열로 변환",
        config: {
          transformType: "json_stringify",
          inputKey: "events_data",
          outputKey: "A_EVENTS_JSON"
        }
      }
    },
    {
      id: "transform-themes",
      type: "transform",
      position: { x: 300, y: 350 },
      data: {
        label: "테마 JSON 변환",
        description: "테마 데이터를 JSON 문자열로 변환",
        config: {
          transformType: "json_stringify",
          inputKey: "themes_data",
          outputKey: "C_THEME_JSON"
        }
      }
    },
    {
      id: "transform-indices",
      type: "transform",
      position: { x: 500, y: 350 },
      data: {
        label: "지수 JSON 변환",
        description: "지수 데이터를 JSON 문자열로 변환",
        config: {
          transformType: "json_stringify",
          inputKey: "indices_data",
          outputKey: "B_INDEX_JSON"
        }
      }
    },
    {
      id: "extract-prev-fields",
      type: "transform",
      position: { x: 700, y: 350 },
      data: {
        label: "이전 시황 필드 추출",
        description: "TITLE, CONTENT 필드 추출",
        config: {
          transformType: "extract_fields",
          inputKey: "prev_macro",
          outputKey: "prev_fields",
          fields: ["TITLE", "CONTENT"]
        }
      }
    },
    {
      id: "generate-analysis",
      type: "prompt",
      position: { x: 400, y: 500 },
      data: {
        label: "AI 시황 분석 생성",
        description: "GPT-4.1을 통한 매크로 시장 시황 생성",
        config: {
          promptId: "macro-market-analysis",
          params: {
            maxTokens: 1500
          }
        }
      }
    },
    {
      id: "parse-response",
      type: "transform",
      position: { x: 400, y: 650 },
      data: {
        label: "JSON 응답 파싱",
        description: "AI 응답을 JSON 객체로 파싱",
        config: {
          transformType: "json_parse",
          inputKey: "response",
          outputKey: "analysis_result"
        }
      }
    },
    {
      id: "extract-result-fields",
      type: "transform",
      position: { x: 400, y: 800 },
      data: {
        label: "결과 필드 추출",
        description: "title, summary, content 추출",
        config: {
          transformType: "extract_fields",
          inputKey: "analysis_result",
          outputKey: "final_result",
          fields: ["title", "summary", "content"]
        }
      }
    },
    {
      id: "output",
      type: "output",
      position: { x: 400, y: 950 },
      data: {
        label: "결과 출력",
        description: "매크로 시황 분석 결과",
        config: {
          format: "json"
        }
      }
    },
    {
      id: "end",
      type: "end",
      position: { x: 400, y: 1100 },
      data: {
        label: "종료",
        config: {}
      }
    }
  ],
  edges: [
    { id: "e-start-events", source: "start", target: "load-events" },
    { id: "e-start-themes", source: "start", target: "load-themes" },
    { id: "e-start-indices", source: "start", target: "load-indices" },
    { id: "e-start-prev", source: "start", target: "load-prev-macro" },
    { id: "e-events-transform", source: "load-events", target: "transform-events" },
    { id: "e-themes-transform", source: "load-themes", target: "transform-themes" },
    { id: "e-indices-transform", source: "load-indices", target: "transform-indices" },
    { id: "e-prev-extract", source: "load-prev-macro", target: "extract-prev-fields" },
    { id: "e-events-prompt", source: "transform-events", target: "generate-analysis" },
    { id: "e-themes-prompt", source: "transform-themes", target: "generate-analysis" },
    { id: "e-indices-prompt", source: "transform-indices", target: "generate-analysis" },
    { id: "e-prev-prompt", source: "extract-prev-fields", target: "generate-analysis" },
    { id: "e-prompt-parse", source: "generate-analysis", target: "parse-response" },
    { id: "e-parse-extract", source: "parse-response", target: "extract-result-fields" },
    { id: "e-extract-output", source: "extract-result-fields", target: "output" },
    { id: "e-output-end", source: "output", target: "end" }
  ]
};

async function insertWorkflow() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      INSERT INTO workflows (id, name, description, definition, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        definition = EXCLUDED.definition,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING id, name
    `, [
      'nh-macro-market-analysis',
      'NH 매크로 시장 시황 생성',
      'Databricks 데이터를 활용한 AI 기반 매크로 시장 시황 자동 생성 파이프라인 (Production 60_macro_market.py 복제)',
      JSON.stringify(workflowDefinition),
      true
    ]);

    console.log('✓ Workflow created/updated:', result.rows[0]);
    
  } catch (error) {
    console.error('Error inserting workflow:', error);
    throw error;
  } finally {
    await client.end();
  }
}

insertWorkflow().catch(console.error);
