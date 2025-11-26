/**
 * NH 매크로 시장 시황 종합 생성 워크플로우 템플릿
 * Production 60_macro_market.py 복제
 */

const macroWorkflowDefinition = {
  nodes: [
    // A: 주요 시장 이벤트 조회
    {
      id: "node-1",
      type: "dataSource",
      position: { x: 100, y: 100 },
      data: {
        label: "A. 주요 시장 이벤트 조회",
        description: "A200_MARKET_EVENTS에서 오늘의 주요 이벤트 10건 조회",
        query: `SELECT 
          EVENT_ID,
          EVENT_TITLE,
          EVENT_DETAIL
        FROM nh_ai.silver.A200_MARKET_EVENTS
        WHERE BASE_DATE = date_format(current_date(), 'yyyyMMdd')
        ORDER BY BASE_TIME DESC
        LIMIT 10`,
        outputKey: "a200_events"
      }
    },
    {
      id: "node-2",
      type: "transform",
      position: { x: 100, y: 250 },
      data: {
        label: "A. 이벤트 JSON 변환",
        description: "이벤트 데이터를 JSON 문자열로 변환",
        transformType: "custom",
        inputKey: "a200_events",
        customCode: `
          const events = input.map(r => ({
            event_id: r.EVENT_ID,
            event_title: r.EVENT_TITLE,
            event_detail: r.EVENT_DETAIL
          }));
          return JSON.stringify(events, null, 2);
        `,
        outputKey: "A_EVENTS_JSON"
      }
    },
    
    // C: 테마별 시황 조회
    {
      id: "node-3",
      type: "dataSource",
      position: { x: 350, y: 100 },
      data: {
        label: "C. 테마별 시황 조회",
        description: "A300_THEME_MARKET에서 오늘의 테마 시황 30건 조회",
        query: `SELECT 
          COALESCE(TREND_ID, 'UNKNOWN') as ANY_ID,
          THEME_TITLE,
          FLUCTUATION_RATE,
          BUBBLE_SCALE
        FROM nh_ai.silver.A300_THEME_MARKET
        WHERE BASE_DATE = date_format(current_date(), 'yyyyMMdd')
        ORDER BY BASE_TIME DESC
        LIMIT 30`,
        outputKey: "a300_themes"
      }
    },
    {
      id: "node-4",
      type: "transform",
      position: { x: 350, y: 250 },
      data: {
        label: "C. 테마 JSON 변환",
        description: "테마 데이터를 JSON 문자열로 변환",
        transformType: "custom",
        inputKey: "a300_themes",
        customCode: `
          const themes = input.map(r => ({
            event_id: r.ANY_ID,
            theme_title: r.THEME_TITLE,
            return: parseFloat(r.FLUCTUATION_RATE || 0),
            bubble: parseInt(r.BUBBLE_SCALE || 0)
          }));
          return JSON.stringify(themes, null, 2);
        `,
        outputKey: "C_THEME_JSON"
      }
    },
    
    // B: 국내 지수 이상치 조회
    {
      id: "node-5",
      type: "dataSource",
      position: { x: 600, y: 100 },
      data: {
        label: "B. 국내 지수 이상치 조회",
        description: "KRI1_SILVER에서 오늘의 지수 이상치 10건 조회",
        query: `SELECT 
          BSTP_CLS_CODE,
          RETURN_RATE,
          Z_SCORE
        FROM nh_ai.silver.KRI1_SILVER
        WHERE BSOP_DATE = date_format(current_date(), 'yyyyMMdd')
        ORDER BY Z_SCORE DESC
        LIMIT 10`,
        outputKey: "kri_data"
      }
    },
    {
      id: "node-6",
      type: "dataSource",
      position: { x: 600, y: 250 },
      data: {
        label: "B. 해외 지수 이상치 조회",
        description: "USC1_SILVER에서 오늘의 지수 이상치 10건 조회",
        query: `SELECT 
          COUNTRY_CODE,
          SYMBOL,
          RETURN_RATE,
          Z_SCORE
        FROM nh_ai.silver.USC1_SILVER
        WHERE TRADE_DATE = date_format(current_date(), 'yyyyMMdd')
        ORDER BY Z_SCORE DESC
        LIMIT 10`,
        outputKey: "usc_data"
      }
    },
    {
      id: "node-7",
      type: "transform",
      position: { x: 600, y: 400 },
      data: {
        label: "B. 지수 JSON 변환",
        description: "국내/해외 지수 데이터를 JSON 문자열로 변환",
        transformType: "custom",
        inputKey: "kri_data",
        customCode: `
          const kri = context.kri_data.map(r => ({
            code: r.BSTP_CLS_CODE,
            return: parseFloat(r.RETURN_RATE || 0),
            z: parseFloat(r.Z_SCORE || 0)
          }));
          
          const usc = context.usc_data.map(r => ({
            code: r.COUNTRY_CODE + '-' + r.SYMBOL,
            return: parseFloat(r.RETURN_RATE || 0),
            z: parseFloat(r.Z_SCORE || 0)
          }));
          
          return JSON.stringify({
            kri_top: kri,
            usc_top: usc
          }, null, 2);
        `,
        outputKey: "B_INDEX_JSON"
      }
    },
    
    // D: 직전 매크로 시황 조회
    {
      id: "node-8",
      type: "dataSource",
      position: { x: 850, y: 100 },
      data: {
        label: "D. 직전 매크로 시황 조회",
        description: "A100_MACRO_MARKET에서 직전 시황 1건 조회",
        query: `SELECT 
          TITLE,
          CONTENT
        FROM nh_ai.silver.A100_MACRO_MARKET
        ORDER BY _INGEST_TS DESC
        LIMIT 1`,
        outputKey: "prev_macro"
      }
    },
    {
      id: "node-9",
      type: "transform",
      position: { x: 850, y: 250 },
      data: {
        label: "D. 직전 시황 필드 추출",
        description: "TITLE과 CONTENT 추출",
        transformType: "custom",
        inputKey: "prev_macro",
        customCode: `
          if (input && input.length > 0) {
            return {
              PREV_TITLE: input[0].TITLE || '',
              PREV_CONTENT: input[0].CONTENT || ''
            };
          } else {
            return {
              PREV_TITLE: '',
              PREV_CONTENT: ''
            };
          }
        `,
        outputKey: "prev_fields"
      }
    },
    
    // 날짜/시각 생성
    {
      id: "node-10",
      type: "template",
      position: { x: 350, y: 550 },
      data: {
        label: "날짜/시각 변수 생성",
        description: "DATE와 TIME 변수 생성 (KST)",
        templateText: "datetime",
        variables: {},
        outputKey: "datetime_vars",
        placeholderFormat: "single"
      }
    },
    {
      id: "node-11",
      type: "transform",
      position: { x: 350, y: 700 },
      data: {
        label: "날짜/시각 분리",
        description: "DATE와 TIME으로 분리",
        transformType: "custom",
        inputKey: "datetime_vars",
        customCode: `
          const now = new Date();
          const kstOffset = 9 * 60; // KST is UTC+9
          const kstDate = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
          
          const year = kstDate.getFullYear();
          const month = String(kstDate.getMonth() + 1).padStart(2, '0');
          const day = String(kstDate.getDate()).padStart(2, '0');
          const hour = String(kstDate.getHours()).padStart(2, '0');
          const min = String(kstDate.getMinutes()).padStart(2, '0');
          const sec = String(kstDate.getSeconds()).padStart(2, '0');
          
          return {
            DATE: year + month + day,
            TIME: hour + min + sec
          };
        `,
        outputKey: "date_time"
      }
    },
    
    // AI 프롬프트 실행
    {
      id: "node-12",
      type: "prompt",
      position: { x: 350, y: 850 },
      data: {
        label: "매크로 시황 AI 분석",
        description: "GPT-4.1로 매크로 시장 시황 종합 분석 생성",
        promptId: "macro-market-complete",
        maxTokens: 1500,
        temperature: 0.2,
        outputKey: "response"
      }
    },
    
    // JSON 파싱
    {
      id: "node-13",
      type: "transform",
      position: { x: 350, y: 1000 },
      data: {
        label: "응답 JSON 파싱",
        description: "AI 응답에서 title, summary, content 추출",
        transformType: "custom",
        inputKey: "response",
        customCode: `
          try {
            // 먼저 JSON 파싱 시도
            const parsed = JSON.parse(input);
            return {
              title: parsed.title || parsed.summary || '시장 종합 시황',
              summary: parsed.summary || '',
              content: parsed.content || parsed.summary || ''
            };
          } catch (e) {
            // JSON 파싱 실패 시 정규표현식으로 추출
            const match = input.match(/\\{[\\s\\S]*\\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]);
                return {
                  title: parsed.title || parsed.summary || '시장 종합 시황',
                  summary: parsed.summary || '',
                  content: parsed.content || parsed.summary || ''
                };
              } catch (e2) {
                return {
                  title: '시장 종합 시황',
                  summary: '',
                  content: ''
                };
              }
            } else {
              return {
                title: '시장 종합 시황',
                summary: '',
                content: ''
              };
            }
          }
        `,
        outputKey: "macro_result"
      }
    },
    
    // 결과 출력
    {
      id: "node-14",
      type: "output",
      position: { x: 350, y: 1150 },
      data: {
        label: "매크로 시황 결과 출력",
        description: "A100_MACRO_MARKET 저장용 JSON 출력",
        format: "json",
        inputKey: "macro_result"
      }
    }
  ],
  edges: [
    // A 이벤트 플로우
    { id: "edge-1", source: "node-1", target: "node-2" },
    // C 테마 플로우
    { id: "edge-2", source: "node-3", target: "node-4" },
    // B 지수 플로우 (KRI)
    { id: "edge-3", source: "node-5", target: "node-7" },
    // B 지수 플로우 (USC)
    { id: "edge-4", source: "node-6", target: "node-7" },
    // D 직전 시황 플로우
    { id: "edge-5", source: "node-8", target: "node-9" },
    // 날짜/시각 플로우
    { id: "edge-6", source: "node-10", target: "node-11" },
    // 모든 데이터가 준비되면 프롬프트 실행
    { id: "edge-7", source: "node-2", target: "node-12" },
    { id: "edge-8", source: "node-4", target: "node-12" },
    { id: "edge-9", source: "node-7", target: "node-12" },
    { id: "edge-10", source: "node-9", target: "node-12" },
    { id: "edge-11", source: "node-11", target: "node-12" },
    // 프롬프트 -> 파싱 -> 출력
    { id: "edge-12", source: "node-12", target: "node-13" },
    { id: "edge-13", source: "node-13", target: "node-14" }
  ]
};

const workflow = {
  id: "nh-macro-complete",
  name: "NH 매크로 시장 시황 종합 생성",
  description: "Production 60_macro_market.py 복제 - A200 이벤트, A300 테마, KRI1/USC1 지수, A100 직전시황을 종합하여 매크로 시장 시황 생성 및 A100_MACRO_MARKET 테이블에 저장",
  definition: macroWorkflowDefinition,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

console.log("=== NH 매크로 시장 시황 종합 생성 워크플로우 ===");
console.log(JSON.stringify(workflow, null, 2));

export default workflow;
