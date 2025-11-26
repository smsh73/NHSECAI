const { storage } = require('../server/storage');

// 테마 시황 생성 워크플로우 생성
async function createThemeMarketWorkflow() {
  console.log('테마 시황 생성 워크플로우 생성 시작...');
  
  try {
    // 1. 워크플로우 생성
    const workflow = await storage.createWorkflow({
      name: '테마 시황 생성 파이프라인',
      description: '테마별 뉴스와 시세 데이터를 분석하여 테마 시황을 생성하는 워크플로우',
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
          description: '테마 시황 생성 파이프라인 시작'
        }
      },
      
      // 테마 정보 조회 노드
      {
        workflowId: workflow.id,
        nodeName: '테마 정보 조회',
        nodeType: 'dataSource',
        nodeOrder: 2,
        configuration: {
          label: '테마 정보 조회',
          description: '테마별 기본 정보와 시세 데이터를 조회합니다',
          source: 'databricks',
          query: `
            SELECT 
              t.IFS_TMA_CD,
              t.IFS_TMA_NM,
              t.TMA_OTL_CTS,
              t.CGR_IEM_CNT,
              t.RETUEN_RATE,
              t.VOLUME,
              t.MARKETCAP,
              t.RETURN_SCORE,
              t.VOLUME_SCORE,
              t.MARKETCAP_SCORE,
              t.TOTAL_SCORE
            FROM nh_ai.silver.INFO_THEME_SILVER t
            WHERE t.RCV_DT = current_date()
            ORDER BY t.TOTAL_SCORE DESC
          `,
          outputKey: 'theme_data'
        }
      },
      
      // 테마별 뉴스 조회 노드
      {
        workflowId: workflow.id,
        nodeName: '테마별 뉴스 조회',
        nodeType: 'dataSource',
        nodeOrder: 3,
        configuration: {
          label: '테마별 뉴스 조회',
          description: '각 테마와 관련된 뉴스를 조회합니다',
          source: 'databricks',
          query: `
            SELECT 
              s.ifs_tma_cd,
              n.N_ID,
              n.N_TITLE,
              n.N_CONTENT,
              n.N_CODE
            FROM nh_ai.silver.N_NEWS_MM_SILVER n
            JOIN nh_ai.bronze.STOCK_THEME_RAW s ON n.N_CODE = s.sen_iem_cd
            WHERE n._INGEST_TS >= current_timestamp() - interval 30 minutes
              AND n.GPT01_AD_POST_SCORE < 70
              AND n.GPT04_CONTENT_QUALITY_SCORE > 0
          `,
          outputKey: 'theme_news'
        }
      },
      
      // 테마별 뉴스 그룹화 노드
      {
        workflowId: workflow.id,
        nodeName: '테마별 뉴스 그룹화',
        nodeType: 'transform',
        nodeOrder: 4,
        configuration: {
          label: '테마별 뉴스 그룹화',
          description: '테마별로 뉴스를 그룹화합니다',
          transformType: 'group_by',
          inputKey: 'theme_news',
          groupBy: 'ifs_tma_cd',
          outputKey: 'grouped_news'
        }
      },
      
      // 테마별 뉴스 JSON 변환 노드
      {
        workflowId: workflow.id,
        nodeName: '테마별 뉴스 JSON 변환',
        nodeType: 'transform',
        nodeOrder: 5,
        configuration: {
          label: '테마별 뉴스 JSON 변환',
          description: '테마별 뉴스를 JSON 형식으로 변환합니다',
          transformType: 'to_json',
          inputKey: 'grouped_news',
          outputKey: 'theme_news_json'
        }
      },
      
      // 테마별 대표뉴스 선정 프롬프트 노드
      {
        workflowId: workflow.id,
        nodeName: '대표뉴스 선정',
        nodeType: 'prompt',
        nodeOrder: 6,
        configuration: {
          label: '대표뉴스 선정',
          description: '각 테마별로 대표 뉴스를 선정합니다',
          promptId: 'theme_rep_news_select', // 프롬프트 카탈로그에서 조회
          variables: {
            'THEME_CODE': '{theme_data.IFS_TMA_CD}',
            'THEME_TITLE': '{theme_data.IFS_TMA_NM}',
            'DATE': '{DATE}',
            'ITEMS_JSON': '{theme_news_json}'
          },
          outputKey: 'representative_news'
        }
      },
      
      // 테마별 이슈 요약 프롬프트 노드
      {
        workflowId: workflow.id,
        nodeName: '테마 이슈 요약',
        nodeType: 'prompt',
        nodeOrder: 7,
        configuration: {
          label: '테마 이슈 요약',
          description: '테마별 주요 이슈를 요약합니다',
          promptId: 'theme_issue_summarize', // 프롬프트 카탈로그에서 조회
          variables: {
            'THEME_CODE': '{theme_data.IFS_TMA_CD}',
            'THEME_TITLE': '{theme_data.IFS_TMA_NM}',
            'DATE': '{DATE}',
            'CONTENT_TEXT': '{representative_news}',
            'PREV_THEME_JSON': '{}' // 이전 테마 데이터 (향후 구현)
          },
          outputKey: 'theme_issue'
        }
      },
      
      // 테마 시황 데이터 조합 노드
      {
        workflowId: workflow.id,
        nodeName: '테마 시황 데이터 조합',
        nodeType: 'transform',
        nodeOrder: 8,
        configuration: {
          label: '테마 시황 데이터 조합',
          description: '테마 정보와 이슈를 조합하여 시황 데이터를 생성합니다',
          transformType: 'merge_objects',
          inputKeys: ['theme_data', 'theme_issue', 'representative_news'],
          outputKey: 'theme_market_data'
        }
      },
      
      // 버블 스케일 계산 노드
      {
        workflowId: workflow.id,
        nodeName: '버블 스케일 계산',
        nodeType: 'transform',
        nodeOrder: 9,
        configuration: {
          label: '버블 스케일 계산',
          description: '등락률을 기반으로 버블 스케일을 계산합니다',
          transformType: 'calculate_bubble_scale',
          inputKey: 'theme_market_data',
          fieldPath: 'RETUEN_RATE',
          outputKey: 'bubble_scale'
        }
      },
      
      // 최종 테마 시황 생성 노드
      {
        workflowId: workflow.id,
        nodeName: '최종 테마 시황 생성',
        nodeType: 'transform',
        nodeOrder: 10,
        configuration: {
          label: '최종 테마 시황 생성',
          description: '최종 테마 시황 데이터를 생성합니다',
          transformType: 'create_theme_market',
          inputKeys: ['theme_market_data', 'bubble_scale'],
          outputKey: 'final_theme_market'
        }
      },
      
      // 결과 저장 노드
      {
        workflowId: workflow.id,
        nodeName: '결과 저장',
        nodeType: 'output',
        nodeOrder: 11,
        configuration: {
          label: '결과 저장',
          description: '생성된 테마 시황을 데이터베이스에 저장합니다',
          outputFormat: 'json',
          saveToDatabase: true,
          tableName: 'theme_market',
          outputKey: 'final_result'
        }
      },
      
      // 종료 노드
      {
        workflowId: workflow.id,
        nodeName: '종료',
        nodeType: 'end',
        nodeOrder: 12,
        configuration: {
          label: '워크플로우 종료',
          description: '테마 시황 생성 완료'
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
      { source: 'start', target: '테마 정보 조회' },
      { source: 'start', target: '테마별 뉴스 조회' },
      { source: '테마별 뉴스 조회', target: '테마별 뉴스 그룹화' },
      { source: '테마별 뉴스 그룹화', target: '테마별 뉴스 JSON 변환' },
      { source: '테마별 뉴스 JSON 변환', target: '대표뉴스 선정' },
      { source: '대표뉴스 선정', target: '테마 이슈 요약' },
      { source: '테마 정보 조회', target: '테마 시황 데이터 조합' },
      { source: '테마 이슈 요약', target: '테마 시황 데이터 조합' },
      { source: '대표뉴스 선정', target: '테마 시황 데이터 조합' },
      { source: '테마 시황 데이터 조합', target: '버블 스케일 계산' },
      { source: '버블 스케일 계산', target: '최종 테마 시황 생성' },
      { source: '최종 테마 시황 생성', target: '결과 저장' },
      { source: '결과 저장', target: 'end' }
    ];
    
    // 엣지들 생성
    for (const edge of edges) {
      await storage.createWorkflowEdge(workflow.id, edge);
      console.log(`엣지 생성 완료: ${edge.source} -> ${edge.target}`);
    }
    
    console.log('✅ 테마 시황 생성 워크플로우 생성 완료');
    return workflow;
    
  } catch (error) {
    console.error('❌ 테마 시황 생성 워크플로우 생성 실패:', error);
    throw error;
  }
}

if (require.main === module) {
  createThemeMarketWorkflow().catch(console.error);
}

module.exports = { createThemeMarketWorkflow };
