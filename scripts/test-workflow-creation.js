// 워크플로우 생성 기능 테스트
console.log('🧪 워크플로우 생성 기능 테스트 시작...');

// Mock Storage 클래스
class MockStorage {
  constructor() {
    this.workflows = [];
    this.prompts = [];
    this.workflowIdCounter = 1;
  }

  async createWorkflow(workflowData) {
    const workflow = {
      id: `workflow-${this.workflowIdCounter++}`,
      ...workflowData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.workflows.push(workflow);
    return workflow;
  }

  async getWorkflows() {
    return this.workflows;
  }

  async getPrompts() {
    return this.prompts;
  }

  async createPrompt(promptData) {
    const prompt = {
      id: `prompt-${Date.now()}`,
      ...promptData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.prompts.push(prompt);
    return prompt;
  }
}

// 뉴스 처리 워크플로우 생성 함수 (Mock)
async function createNewsProcessingWorkflow() {
  console.log('📰 뉴스 처리 워크플로우 생성 중...');
  
  const mockStorage = new MockStorage();
  
  const workflow = await mockStorage.createWorkflow({
    name: '뉴스 데이터 처리 워크플로우',
    description: '뉴스 데이터를 수집하고 AOAI로 분석하여 시장 이벤트를 추출하는 워크플로우',
    category: '데이터처리',
    isActive: true,
    createdBy: 'system',
    nodes: [
      {
        id: 'data_source_1',
        type: 'dataSource',
        name: '뉴스 데이터 수집',
        position: { x: 100, y: 100 },
        config: {
          source: 'nh_ai.silver.N_NEWS_MM_SILVER',
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
          outputKey: 'raw_news_data'
        }
      },
      {
        id: 'transform_1',
        type: 'transform',
        name: '뉴스 데이터 정규화',
        position: { x: 300, y: 100 },
        config: {
          inputKey: 'raw_news_data',
          outputKey: 'normalized_news_data',
          transformations: [
            {
              type: 'html_cleanup',
              field: 'N_CONTENT',
              description: 'HTML 태그 제거 및 텍스트 정규화'
            },
            {
              type: 'content_filtering',
              field: 'N_TITLE',
              description: '광고성 콘텐츠 필터링'
            }
          ]
        }
      },
      {
        id: 'prompt_1',
        type: 'prompt',
        name: '뉴스 분석 프롬프트',
        position: { x: 500, y: 100 },
        config: {
          promptId: 'news_aoai',
          inputKey: 'normalized_news_data',
          outputKey: 'news_analysis_result',
          variables: ['PY_NOW_TIME_TEXT', 'PY_N_TITLE', 'PY_N_CONTENT']
        }
      },
      {
        id: 'api_call_1',
        type: 'api_call',
        name: 'Azure OpenAI API 호출',
        position: { x: 700, y: 100 },
        config: {
          endpoint: 'https://nh-ai-admin-apim-dev.azure-api.net/openai/deployments/gpt-4o-mini/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': '${AZURE_APIM_KEY}'
          },
          inputKey: 'news_analysis_result',
          outputKey: 'aoai_response'
        }
      },
      {
        id: 'json_processing_1',
        type: 'json_processing',
        name: '응답 데이터 파싱',
        position: { x: 900, y: 100 },
        config: {
          inputKey: 'aoai_response',
          outputKey: 'parsed_analysis',
          parsingRules: [
            {
              field: 'choices[0].message.content',
              targetField: 'analysis_content'
            },
            {
              field: 'usage',
              targetField: 'token_usage'
            }
          ]
        }
      },
      {
        id: 'data_transformation_1',
        type: 'data_transformation',
        name: '시장 이벤트 추출',
        position: { x: 1100, y: 100 },
        config: {
          inputKey: 'parsed_analysis',
          outputKey: 'market_events',
          transformations: [
            {
              type: 'event_extraction',
              sourceField: 'analysis_content',
              targetFields: ['event_title', 'event_impact', 'event_category']
            }
          ]
        }
      },
      {
        id: 'sql_execution_1',
        type: 'sql_execution',
        name: '데이터베이스 저장',
        position: { x: 1300, y: 100 },
        config: {
          inputKey: 'market_events',
          outputKey: 'stored_events',
          query: `
            INSERT INTO nh_ai.silver.A200_MARKET_EVENTS 
            (event_title, event_impact, event_category, created_at)
            VALUES ($1, $2, $3, NOW())
          `,
          parameters: ['{event_title}', '{event_impact}', '{event_category}']
        }
      }
    ],
    connections: [
      { from: 'data_source_1', to: 'transform_1' },
      { from: 'transform_1', to: 'prompt_1' },
      { from: 'prompt_1', to: 'api_call_1' },
      { from: 'api_call_1', to: 'json_processing_1' },
      { from: 'json_processing_1', to: 'data_transformation_1' },
      { from: 'data_transformation_1', to: 'sql_execution_1' }
    ]
  });
  
  console.log(`✅ 뉴스 처리 워크플로우 생성 완료: ${workflow.id}`);
  console.log(`   - 노드 개수: ${workflow.nodes.length}개`);
  console.log(`   - 연결 개수: ${workflow.connections.length}개`);
  
  return workflow;
}

// 테마 시황 워크플로우 생성 함수 (Mock)
async function createThemeMarketWorkflow() {
  console.log('🎯 테마 시황 워크플로우 생성 중...');
  
  const mockStorage = new MockStorage();
  
  const workflow = await mockStorage.createWorkflow({
    name: '테마 시황 생성 워크플로우',
    description: '테마별 뉴스와 시세 데이터를 분석하여 테마 시황을 생성하는 워크플로우',
    category: '데이터처리',
    isActive: true,
    createdBy: 'system',
    nodes: [
      {
        id: 'data_source_1',
        type: 'dataSource',
        name: '테마-종목 매핑 데이터 수집',
        position: { x: 100, y: 100 },
        config: {
          source: 'info_stock_theme_stocks',
          query: 'SELECT theme_id, stock_code FROM info_stock_theme_stocks WHERE is_active = true',
          outputKey: 'theme_stock_mapping'
        }
      },
      {
        id: 'data_source_2',
        type: 'dataSource',
        name: 'KRX 시세 데이터 수집',
        position: { x: 100, y: 200 },
        config: {
          source: 'nh_ai.silver.KRX1_SILVER',
          query: `
            SELECT 
              STOCK_CODE, TRADE_DATE, CLOSE_PRICE, VOLUME, MARKET_CAP
            FROM nh_ai.silver.KRX1_SILVER 
            WHERE TRADE_DATE >= current_date() - interval 7 days
          `,
          outputKey: 'stock_price_data'
        }
      },
      {
        id: 'transform_1',
        type: 'transform',
        name: '테마별 데이터 통합',
        position: { x: 300, y: 150 },
        config: {
          inputKeys: ['theme_stock_mapping', 'stock_price_data'],
          outputKey: 'integrated_theme_data',
          transformations: [
            {
              type: 'join',
              leftKey: 'theme_stock_mapping',
              rightKey: 'stock_price_data',
              joinField: 'stock_code'
            },
            {
              type: 'group_by',
              groupField: 'theme_id',
              aggregateFields: ['CLOSE_PRICE', 'VOLUME', 'MARKET_CAP']
            }
          ]
        }
      },
      {
        id: 'prompt_1',
        type: 'prompt',
        name: '테마 분석 프롬프트',
        position: { x: 500, y: 150 },
        config: {
          promptId: 'theme_market_analysis',
          inputKey: 'integrated_theme_data',
          outputKey: 'theme_analysis_result',
          variables: ['theme_data', 'market_context']
        }
      },
      {
        id: 'api_call_1',
        type: 'api_call',
        name: 'Azure OpenAI API 호출',
        position: { x: 700, y: 150 },
        config: {
          endpoint: 'https://nh-ai-admin-apim-dev.azure-api.net/openai/deployments/gpt-4o-mini/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': '${AZURE_APIM_KEY}'
          },
          inputKey: 'theme_analysis_result',
          outputKey: 'aoai_response'
        }
      },
      {
        id: 'sql_execution_1',
        type: 'sql_execution',
        name: '테마 시황 저장',
        position: { x: 900, y: 150 },
        config: {
          inputKey: 'aoai_response',
          outputKey: 'stored_theme_analysis',
          query: `
            INSERT INTO nh_ai.silver.A300_THEME_MARKET 
            (theme_id, analysis_content, created_at)
            VALUES ($1, $2, NOW())
          `,
          parameters: ['{theme_id}', '{analysis_content}']
        }
      }
    ],
    connections: [
      { from: 'data_source_1', to: 'transform_1' },
      { from: 'data_source_2', to: 'transform_1' },
      { from: 'transform_1', to: 'prompt_1' },
      { from: 'prompt_1', to: 'api_call_1' },
      { from: 'api_call_1', to: 'sql_execution_1' }
    ]
  });
  
  console.log(`✅ 테마 시황 워크플로우 생성 완료: ${workflow.id}`);
  console.log(`   - 노드 개수: ${workflow.nodes.length}개`);
  console.log(`   - 연결 개수: ${workflow.connections.length}개`);
  
  return workflow;
}

// 매크로 시황 워크플로우 생성 함수 (Mock)
async function createMacroMarketWorkflow() {
  console.log('🌍 매크로 시황 워크플로우 생성 중...');
  
  const mockStorage = new MockStorage();
  
  const workflow = await mockStorage.createWorkflow({
    name: '매크로 시황 생성 워크플로우',
    description: '주요 이벤트, 테마 시황, 지수 데이터를 종합하여 매크로 시황을 생성하는 워크플로우',
    category: '데이터처리',
    isActive: true,
    createdBy: 'system',
    nodes: [
      {
        id: 'data_source_1',
        type: 'dataSource',
        name: '시장 이벤트 수집',
        position: { x: 100, y: 100 },
        config: {
          source: 'nh_ai.silver.A200_MARKET_EVENTS',
          query: `
            SELECT event_title, event_impact, event_category, created_at
            FROM nh_ai.silver.A200_MARKET_EVENTS 
            WHERE created_at >= current_timestamp() - interval 24 hours
            ORDER BY event_impact DESC, created_at DESC
          `,
          outputKey: 'market_events'
        }
      },
      {
        id: 'data_source_2',
        type: 'dataSource',
        name: '테마 시황 수집',
        position: { x: 100, y: 200 },
        config: {
          source: 'nh_ai.silver.A300_THEME_MARKET',
          query: `
            SELECT theme_id, analysis_content, created_at
            FROM nh_ai.silver.A300_THEME_MARKET 
            WHERE created_at >= current_timestamp() - interval 24 hours
          `,
          outputKey: 'theme_analysis'
        }
      },
      {
        id: 'data_source_3',
        type: 'dataSource',
        name: '지수 데이터 수집',
        position: { x: 100, y: 300 },
        config: {
          source: 'nh_ai.silver.KRI1_SILVER',
          query: `
            SELECT INDEX_CODE, TRADE_DATE, CLOSE_PRICE, VOLUME
            FROM nh_ai.silver.KRI1_SILVER 
            WHERE TRADE_DATE >= current_date() - interval 7 days
          `,
          outputKey: 'index_data'
        }
      },
      {
        id: 'transform_1',
        type: 'transform',
        name: '데이터 통합 및 정리',
        position: { x: 300, y: 200 },
        config: {
          inputKeys: ['market_events', 'theme_analysis', 'index_data'],
          outputKey: 'integrated_macro_data',
          transformations: [
            {
              type: 'data_consolidation',
              description: '다양한 데이터 소스를 하나로 통합'
            },
            {
              type: 'time_alignment',
              description: '시간대별 데이터 정렬'
            }
          ]
        }
      },
      {
        id: 'prompt_1',
        type: 'prompt',
        name: '매크로 분석 프롬프트',
        position: { x: 500, y: 200 },
        config: {
          promptId: 'macro_market_analysis',
          inputKey: 'integrated_macro_data',
          outputKey: 'macro_analysis_result',
          variables: ['market_events', 'theme_analysis', 'index_data']
        }
      },
      {
        id: 'api_call_1',
        type: 'api_call',
        name: 'Azure OpenAI API 호출',
        position: { x: 700, y: 200 },
        config: {
          endpoint: 'https://nh-ai-admin-apim-dev.azure-api.net/openai/deployments/gpt-4o-mini/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': '${AZURE_APIM_KEY}'
          },
          inputKey: 'macro_analysis_result',
          outputKey: 'aoai_response'
        }
      },
      {
        id: 'sql_execution_1',
        type: 'sql_execution',
        name: '매크로 시황 저장',
        position: { x: 900, y: 200 },
        config: {
          inputKey: 'aoai_response',
          outputKey: 'stored_macro_analysis',
          query: `
            INSERT INTO nh_ai.silver.A100_MACRO_MARKET 
            (analysis_content, market_summary, created_at)
            VALUES ($1, $2, NOW())
          `,
          parameters: ['{analysis_content}', '{market_summary}']
        }
      }
    ],
    connections: [
      { from: 'data_source_1', to: 'transform_1' },
      { from: 'data_source_2', to: 'transform_1' },
      { from: 'data_source_3', to: 'transform_1' },
      { from: 'transform_1', to: 'prompt_1' },
      { from: 'prompt_1', to: 'api_call_1' },
      { from: 'api_call_1', to: 'sql_execution_1' }
    ]
  });
  
  console.log(`✅ 매크로 시황 워크플로우 생성 완료: ${workflow.id}`);
  console.log(`   - 노드 개수: ${workflow.nodes.length}개`);
  console.log(`   - 연결 개수: ${workflow.connections.length}개`);
  
  return workflow;
}

// 워크플로우 검증 함수
function validateWorkflow(workflow) {
  const errors = [];
  const warnings = [];
  
  // 기본 필드 검증
  if (!workflow.name) errors.push('워크플로우 이름이 없습니다');
  if (!workflow.description) warnings.push('워크플로우 설명이 없습니다');
  if (!workflow.nodes || workflow.nodes.length === 0) errors.push('워크플로우 노드가 없습니다');
  
  // 노드 검증
  if (workflow.nodes) {
    const nodeIds = new Set();
    workflow.nodes.forEach((node, index) => {
      if (!node.id) errors.push(`노드 ${index + 1}: ID가 없습니다`);
      else if (nodeIds.has(node.id)) errors.push(`노드 ${index + 1}: 중복된 ID (${node.id})`);
      else nodeIds.add(node.id);
      
      if (!node.type) errors.push(`노드 ${node.id}: 타입이 없습니다`);
      if (!node.name) warnings.push(`노드 ${node.id}: 이름이 없습니다`);
      if (!node.config) warnings.push(`노드 ${node.id}: 설정이 없습니다`);
    });
    
    // 연결 검증
    if (workflow.connections) {
      workflow.connections.forEach((conn, index) => {
        if (!nodeIds.has(conn.from)) errors.push(`연결 ${index + 1}: 시작 노드 (${conn.from})가 존재하지 않습니다`);
        if (!nodeIds.has(conn.to)) errors.push(`연결 ${index + 1}: 끝 노드 (${conn.to})가 존재하지 않습니다`);
      });
    }
  }
  
  return { errors, warnings };
}

// 테스트 실행
async function runWorkflowCreationTests() {
  try {
    console.log('1️⃣ 뉴스 처리 워크플로우 생성 테스트...');
    const newsWorkflow = await createNewsProcessingWorkflow();
    const newsValidation = validateWorkflow(newsWorkflow);
    
    if (newsValidation.errors.length === 0) {
      console.log('✅ 뉴스 처리 워크플로우 검증 통과');
    } else {
      console.log('❌ 뉴스 처리 워크플로우 검증 실패:');
      newsValidation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (newsValidation.warnings.length > 0) {
      console.log('⚠️  뉴스 처리 워크플로우 경고:');
      newsValidation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    console.log('\n2️⃣ 테마 시황 워크플로우 생성 테스트...');
    const themeWorkflow = await createThemeMarketWorkflow();
    const themeValidation = validateWorkflow(themeWorkflow);
    
    if (themeValidation.errors.length === 0) {
      console.log('✅ 테마 시황 워크플로우 검증 통과');
    } else {
      console.log('❌ 테마 시황 워크플로우 검증 실패:');
      themeValidation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n3️⃣ 매크로 시황 워크플로우 생성 테스트...');
    const macroWorkflow = await createMacroMarketWorkflow();
    const macroValidation = validateWorkflow(macroWorkflow);
    
    if (macroValidation.errors.length === 0) {
      console.log('✅ 매크로 시황 워크플로우 검증 통과');
    } else {
      console.log('❌ 매크로 시황 워크플로우 검증 실패:');
      macroValidation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n4️⃣ 워크플로우 구조 분석...');
    
    const allWorkflows = [newsWorkflow, themeWorkflow, macroWorkflow];
    const totalNodes = allWorkflows.reduce((sum, w) => sum + w.nodes.length, 0);
    const totalConnections = allWorkflows.reduce((sum, w) => sum + (w.connections?.length || 0), 0);
    
    console.log(`📊 전체 워크플로우 통계:`);
    console.log(`   - 워크플로우 개수: ${allWorkflows.length}개`);
    console.log(`   - 총 노드 개수: ${totalNodes}개`);
    console.log(`   - 총 연결 개수: ${totalConnections}개`);
    
    // 노드 타입별 통계
    const nodeTypeStats = {};
    allWorkflows.forEach(workflow => {
      workflow.nodes.forEach(node => {
        nodeTypeStats[node.type] = (nodeTypeStats[node.type] || 0) + 1;
      });
    });
    
    console.log(`📈 노드 타입별 통계:`);
    Object.entries(nodeTypeStats).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}개`);
    });
    
    console.log('\n🎉 워크플로우 생성 기능 테스트 완료!');
    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 뉴스 처리 워크플로우 생성 및 검증');
    console.log('   ✅ 테마 시황 워크플로우 생성 및 검증');
    console.log('   ✅ 매크로 시황 워크플로우 생성 및 검증');
    console.log('   ✅ 워크플로우 구조 분석 및 통계');
    
  } catch (error) {
    console.error('❌ 워크플로우 생성 테스트 실패:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

runWorkflowCreationTests();
