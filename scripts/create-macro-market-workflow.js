const { storage } = require('../server/storage');

// 매크로 시황 생성 워크플로우 생성
async function createMacroMarketWorkflow() {
  console.log('매크로 시황 생성 워크플로우 생성 시작...');
  
  try {
    // 1. 워크플로우 생성
    const workflow = await storage.createWorkflow({
      name: '매크로 시황 생성 파이프라인',
      description: '주요 이벤트, 테마 시황, 지수 데이터를 종합하여 매크로 시황을 생성하는 워크플로우',
      isActive: true,
      createdBy: 'system'
    });
    
    console.log(`워크플로우 생성 완료: ${workflow.id}`);
    
    // 2. 워크플로우 노드들 생성
    const nodes = [
      // 시작 노드
      {
        workflowId: workflow.id,
        nodeName: '시작',
        nodeType: 'start',
        nodeOrder: 1,
        configuration: {
          label: '워크플로우 시작',
          description: '매크로 시황 생성 파이프라인 시작'
        }
      },
      
      // 주요 이벤트 조회 노드
      {
        workflowId: workflow.id,
        nodeName: '주요 이벤트 조회',
        nodeType: 'dataSource',
        nodeOrder: 2,
        configuration: {
          label: '주요 이벤트 조회',
          description: '당일 주요 시장 이벤트를 조회합니다',
          source: 'databricks',
          query: `
            SELECT 
              EVENT_ID,
              EVENT_TITLE,
              EVENT_DETAIL,
              BASE_DATE,
              BASE_TIME
            FROM nh_ai.silver.A200_MARKET_EVENTS
            WHERE BASE_DATE = current_date()
            ORDER BY BASE_TIME DESC
            LIMIT 10
          `,
          outputKey: 'market_events'
        }
      },
      
      // 테마 시황 조회 노드
      {
        workflowId: workflow.id,
        nodeName: '테마 시황 조회',
        nodeType: 'dataSource',
        nodeOrder: 3,
        configuration: {
          label: '테마 시황 조회',
          description: '당일 테마 시황 데이터를 조회합니다',
          source: 'databricks',
          query: `
            SELECT 
              TREND_ID,
              THEME_TITLE,
              FLUCTUATION_RATE,
              BUBBLE_SCALE
            FROM nh_ai.silver.A300_THEME_MARKET
            WHERE BASE_DATE = current_date()
            ORDER BY BASE_TIME DESC
            LIMIT 30
          `,
          outputKey: 'theme_market'
        }
      },
      
      // 지수 데이터 조회 노드 (국내)
      {
        workflowId: workflow.id,
        nodeName: '국내 지수 조회',
        nodeType: 'dataSource',
        nodeOrder: 4,
        configuration: {
          label: '국내 지수 조회',
          description: '국내 지수 이상치/변동 데이터를 조회합니다',
          source: 'databricks',
          query: `
            SELECT 
              BSTP_CLS_CODE,
              RETURN_RATE,
              Z_SCORE
            FROM nh_ai.silver.KRI1_SILVER
            WHERE BSOP_DATE = current_date()
            ORDER BY Z_SCORE DESC
            LIMIT 10
          `,
          outputKey: 'domestic_indices'
        }
      },
      
      // 지수 데이터 조회 노드 (해외)
      {
        workflowId: workflow.id,
        nodeName: '해외 지수 조회',
        nodeType: 'dataSource',
        nodeOrder: 5,
        configuration: {
          label: '해외 지수 조회',
          description: '해외 지수 이상치/변동 데이터를 조회합니다',
          source: 'databricks',
          query: `
            SELECT 
              COUNTRY_CODE,
              SYMBOL,
              RETURN_RATE,
              Z_SCORE
            FROM nh_ai.silver.USC1_SILVER
            WHERE TRADE_DATE = current_date()
            ORDER BY Z_SCORE DESC
            LIMIT 10
          `,
          outputKey: 'foreign_indices'
        }
      },
      
      // 이전 매크로 시황 조회 노드
      {
        workflowId: workflow.id,
        nodeName: '이전 매크로 시황 조회',
        nodeType: 'dataSource',
        nodeOrder: 6,
        configuration: {
          label: '이전 매크로 시황 조회',
          description: '직전 매크로 시황을 참고용으로 조회합니다',
          source: 'databricks',
          query: `
            SELECT 
              TITLE,
              CONTENT
            FROM nh_ai.silver.A100_MACRO_MARKET
            ORDER BY _INGEST_TS DESC
            LIMIT 1
          `,
          outputKey: 'prev_macro'
        }
      },
      
      // 데이터 JSON 변환 노드들
      {
        workflowId: workflow.id,
        nodeName: '이벤트 JSON 변환',
        nodeType: 'transform',
        nodeOrder: 7,
        configuration: {
          label: '이벤트 JSON 변환',
          description: '주요 이벤트를 JSON 형식으로 변환합니다',
          transformType: 'to_json',
          inputKey: 'market_events',
          outputKey: 'events_json'
        }
      },
      
      {
        workflowId: workflow.id,
        nodeName: '테마 JSON 변환',
        nodeType: 'transform',
        nodeOrder: 8,
        configuration: {
          label: '테마 JSON 변환',
          description: '테마 시황을 JSON 형식으로 변환합니다',
          transformType: 'to_json',
          inputKey: 'theme_market',
          outputKey: 'theme_json'
        }
      },
      
      {
        workflowId: workflow.id,
        nodeName: '지수 JSON 변환',
        nodeType: 'transform',
        nodeOrder: 9,
        configuration: {
          label: '지수 JSON 변환',
          description: '지수 데이터를 JSON 형식으로 변환합니다',
          transformType: 'merge_objects',
          inputKeys: ['domestic_indices', 'foreign_indices'],
          outputKey: 'indices_json'
        }
      },
      
      // 매크로 시황 생성 프롬프트 노드
      {
        workflowId: workflow.id,
        nodeName: '매크로 시황 생성',
        nodeType: 'prompt',
        nodeOrder: 10,
        configuration: {
          label: '매크로 시황 생성',
          description: '종합적인 매크로 시황을 생성합니다',
          promptId: 'macro_market', // 프롬프트 카탈로그에서 조회
          variables: {
            'DATE': '{DATE}',
            'TIME': '{TIME}',
            'A_EVENTS_JSON': '{events_json}',
            'B_INDEX_JSON': '{indices_json}',
            'C_THEME_JSON': '{theme_json}',
            'PREV_TITLE': '{prev_macro.TITLE}',
            'PREV_CONTENT': '{prev_macro.CONTENT}'
          },
          outputKey: 'macro_market_response'
        }
      },
      
      // 매크로 시황 JSON 파싱 노드
      {
        workflowId: workflow.id,
        nodeName: '매크로 시황 JSON 파싱',
        nodeType: 'transform',
        nodeOrder: 11,
        configuration: {
          label: '매크로 시황 JSON 파싱',
          description: 'AI 응답을 JSON으로 파싱합니다',
          transformType: 'json_parse',
          inputKey: 'macro_market_response',
          outputKey: 'parsed_macro'
        }
      },
      
      // 최종 매크로 시황 생성 노드
      {
        workflowId: workflow.id,
        nodeName: '최종 매크로 시황 생성',
        nodeType: 'transform',
        nodeOrder: 12,
        configuration: {
          label: '최종 매크로 시황 생성',
          description: '최종 매크로 시황 데이터를 생성합니다',
          transformType: 'create_macro_market',
          inputKey: 'parsed_macro',
          outputKey: 'final_macro_market'
        }
      },
      
      // 결과 저장 노드
      {
        workflowId: workflow.id,
        nodeName: '결과 저장',
        nodeType: 'output',
        nodeOrder: 13,
        configuration: {
          label: '결과 저장',
          description: '생성된 매크로 시황을 데이터베이스에 저장합니다',
          outputFormat: 'json',
          saveToDatabase: true,
          tableName: 'macro_market',
          outputKey: 'final_result'
        }
      },
      
      // 종료 노드
      {
        workflowId: workflow.id,
        nodeName: '종료',
        nodeType: 'end',
        nodeOrder: 14,
        configuration: {
          label: '워크플로우 종료',
          description: '매크로 시황 생성 완료'
        }
      }
    ];
    
    // 노드들 생성
    for (const nodeConfig of nodes) {
      await storage.createWorkflowNode(nodeConfig);
      console.log(`노드 생성 완료: ${nodeConfig.nodeName}`);
    }
    
    // 3. 워크플로우 엣지 생성 (노드 간 연결)
    const edges = [
      { source: 'start', target: '주요 이벤트 조회' },
      { source: 'start', target: '테마 시황 조회' },
      { source: 'start', target: '국내 지수 조회' },
      { source: 'start', target: '해외 지수 조회' },
      { source: 'start', target: '이전 매크로 시황 조회' },
      { source: '주요 이벤트 조회', target: '이벤트 JSON 변환' },
      { source: '테마 시황 조회', target: '테마 JSON 변환' },
      { source: '국내 지수 조회', target: '지수 JSON 변환' },
      { source: '해외 지수 조회', target: '지수 JSON 변환' },
      { source: '이벤트 JSON 변환', target: '매크로 시황 생성' },
      { source: '테마 JSON 변환', target: '매크로 시황 생성' },
      { source: '지수 JSON 변환', target: '매크로 시황 생성' },
      { source: '이전 매크로 시황 조회', target: '매크로 시황 생성' },
      { source: '매크로 시황 생성', target: '매크로 시황 JSON 파싱' },
      { source: '매크로 시황 JSON 파싱', target: '최종 매크로 시황 생성' },
      { source: '최종 매크로 시황 생성', target: '결과 저장' },
      { source: '결과 저장', target: 'end' }
    ];
    
    // 엣지들 생성
    for (const edge of edges) {
      await storage.createWorkflowEdge(workflow.id, edge);
      console.log(`엣지 생성 완료: ${edge.source} -> ${edge.target}`);
    }
    
    console.log('✅ 매크로 시황 생성 워크플로우 생성 완료');
    return workflow;
    
  } catch (error) {
    console.error('❌ 매크로 시황 생성 워크플로우 생성 실패:', error);
    throw error;
  }
}

if (require.main === module) {
  createMacroMarketWorkflow().catch(console.error);
}

module.exports = { createMacroMarketWorkflow };
