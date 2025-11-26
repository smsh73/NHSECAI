const { storage } = require('../server/storage');

// 뉴스 데이터 처리 워크플로우 생성
async function createNewsProcessingWorkflow() {
  console.log('뉴스 데이터 처리 워크플로우 생성 시작...');
  
  try {
    // 1. 워크플로우 생성
    const workflow = await storage.createWorkflow({
      name: '뉴스 데이터 처리 파이프라인',
      description: '뉴스 데이터를 수집하고 AOAI로 분석하여 시장 이벤트를 추출하는 워크플로우',
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
          description: '뉴스 데이터 처리 파이프라인 시작'
        }
      },
      
      // 뉴스 데이터 조회 노드
      {
        workflowId: workflow.id,
        nodeName: '뉴스 데이터 조회',
        nodeType: 'dataSource',
        nodeOrder: 2,
        configuration: {
          label: '뉴스 데이터 조회',
          description: '최근 30분간의 뉴스 데이터를 조회합니다',
          source: 'databricks',
          query: `
            SELECT 
              N_ID, N_TITLE, N_CONTENT, N_CODE, N_DATE, N_TIME,
              GPT01_AD_POST_SCORE, GPT04_CONTENT_QUALITY_SCORE,
              GPT02_ECO_POST_SCORE, GPT03_MARKET_POST_SCORE
            FROM nh_ai.silver.N_NEWS_MM_SILVER 
            WHERE _INGEST_TS >= current_timestamp() - interval 30 minutes
              AND GPT01_AD_POST_SCORE < 70
              AND GPT04_CONTENT_QUALITY_SCORE > 0
            ORDER BY (GPT02_ECO_POST_SCORE + GPT03_MARKET_POST_SCORE + GPT04_CONTENT_QUALITY_SCORE) DESC
            LIMIT 200
          `,
          outputKey: 'news_data'
        }
      },
      
      // 뉴스 데이터 JSON 변환 노드
      {
        workflowId: workflow.id,
        nodeName: '뉴스 데이터 JSON 변환',
        nodeType: 'transform',
        nodeOrder: 3,
        configuration: {
          label: '뉴스 데이터 JSON 변환',
          description: '뉴스 데이터를 JSON 형식으로 변환합니다',
          transformType: 'to_json',
          inputKey: 'news_data',
          outputKey: 'news_json'
        }
      },
      
      // 뉴스 제목 추출 노드
      {
        workflowId: workflow.id,
        nodeName: '뉴스 제목 추출',
        nodeType: 'transform',
        nodeOrder: 4,
        configuration: {
          label: '뉴스 제목 추출',
          description: '뉴스 데이터에서 제목만 추출합니다',
          transformType: 'extract_field',
          inputKey: 'news_data',
          fieldPath: 'N_TITLE',
          outputKey: 'news_titles'
        }
      },
      
      // 시장 이벤트 추출 프롬프트 노드
      {
        workflowId: workflow.id,
        nodeName: '시장 이벤트 추출',
        nodeType: 'prompt',
        nodeOrder: 5,
        configuration: {
          label: '시장 이벤트 추출',
          description: '뉴스 헤드라인에서 주요 시장 이벤트를 추출합니다',
          promptId: 'news_market_event', // 프롬프트 카탈로그에서 조회
          variables: {
            'TITLES': '{news_titles}',
            'DATE': '{DATE}',
            'TIME': '{TIME}'
          },
          outputKey: 'market_events'
        }
      },
      
      // 시장 이벤트 JSON 파싱 노드
      {
        workflowId: workflow.id,
        nodeName: '시장 이벤트 JSON 파싱',
        nodeType: 'transform',
        nodeOrder: 6,
        configuration: {
          label: '시장 이벤트 JSON 파싱',
          description: 'AI 응답을 JSON으로 파싱합니다',
          transformType: 'json_parse',
          inputKey: 'market_events',
          outputKey: 'parsed_events'
        }
      },
      
      // 이벤트별 상세 내용 생성 노드
      {
        workflowId: workflow.id,
        nodeName: '이벤트 상세 내용 생성',
        nodeType: 'prompt',
        nodeOrder: 7,
        configuration: {
          label: '이벤트 상세 내용 생성',
          description: '각 이벤트의 상세 내용을 생성합니다',
          promptId: 'news_market_event_content',
          variables: {
            'EVENT_NAME': '{parsed_events.gpt_event_title_01}',
            'RELATED_CONTENT': '{news_json}',
            'DATE': '{DATE}',
            'TIME': '{TIME}'
          },
          outputKey: 'event_details'
        }
      },
      
      // 결과 저장 노드
      {
        workflowId: workflow.id,
        nodeName: '결과 저장',
        nodeType: 'output',
        nodeOrder: 8,
        configuration: {
          label: '결과 저장',
          description: '처리된 시장 이벤트를 데이터베이스에 저장합니다',
          outputFormat: 'json',
          saveToDatabase: true,
          tableName: 'market_events',
          outputKey: 'final_result'
        }
      },
      
      // 종료 노드
      {
        workflowId: workflow.id,
        nodeName: '종료',
        nodeType: 'end',
        nodeOrder: 9,
        configuration: {
          label: '워크플로우 종료',
          description: '뉴스 데이터 처리 완료'
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
      { source: 'start', target: '뉴스 데이터 조회' },
      { source: '뉴스 데이터 조회', target: '뉴스 데이터 JSON 변환' },
      { source: '뉴스 데이터 조회', target: '뉴스 제목 추출' },
      { source: '뉴스 제목 추출', target: '시장 이벤트 추출' },
      { source: '시장 이벤트 추출', target: '시장 이벤트 JSON 파싱' },
      { source: '시장 이벤트 JSON 파싱', target: '이벤트 상세 내용 생성' },
      { source: '뉴스 데이터 JSON 변환', target: '이벤트 상세 내용 생성' },
      { source: '이벤트 상세 내용 생성', target: '결과 저장' },
      { source: '결과 저장', target: 'end' }
    ];
    
    // 엣지들 생성
    for (const edge of edges) {
      await storage.createWorkflowEdge(workflow.id, edge);
      console.log(`엣지 생성 완료: ${edge.source} -> ${edge.target}`);
    }
    
    console.log('✅ 뉴스 데이터 처리 워크플로우 생성 완료');
    return workflow;
    
  } catch (error) {
    console.error('❌ 뉴스 데이터 처리 워크플로우 생성 실패:', error);
    throw error;
  }
}

if (require.main === module) {
  createNewsProcessingWorkflow().catch(console.error);
}

module.exports = { createNewsProcessingWorkflow };
