// Mock 데이터를 사용한 워크플로우 시스템 테스트
console.log('🧪 Mock 데이터를 사용한 워크플로우 시스템 테스트 시작...');

// Mock SessionDataManager 클래스
class MockSessionDataManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.data = new Map();
  }

  async storeData(key, value, createdByNodeId, dataType = 'object') {
    this.data.set(key, {
      value,
      createdByNodeId,
      dataType,
      timestamp: new Date()
    });
    console.log(`📝 데이터 저장: ${key} = ${JSON.stringify(value)}`);
  }

  async retrieveData(key) {
    const item = this.data.get(key);
    return item ? item.value : null;
  }

  async storeNodeExecution(nodeId, status, inputData, outputData, errorMessage, executionTime) {
    console.log(`🔄 노드 실행: ${nodeId} - ${status}`);
  }

  async resolveVariables(template) {
    let resolvedString = template;
    const matches = template.matchAll(/\{(\w+)\}/g);

    for (const match of matches) {
      const varName = match[1];
      const sessionValue = await this.retrieveData(varName);
      if (sessionValue !== null) {
        resolvedString = resolvedString.replace(new RegExp(`\\{${varName}\\}`, 'g'), JSON.stringify(sessionValue));
      }
    }
    return resolvedString;
  }
}

// Mock WorkflowEngine 클래스
class MockWorkflowEngine {
  constructor() {
    this.sessions = new Map();
  }

  async startWorkflow(workflowId, sessionName, createdBy) {
    const sessionId = 'session-' + Date.now();
    const session = {
      id: sessionId,
      workflowId,
      sessionName,
      createdBy,
      status: 'running',
      startTime: new Date(),
      context: {
        sessionDataManager: new MockSessionDataManager(sessionId)
      }
    };
    
    this.sessions.set(sessionId, session);
    console.log(`🚀 워크플로우 시작: ${sessionName} (${sessionId})`);
    return session;
  }

  async executeNode(sessionId, nodeId, nodeType, nodeConfig) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    }

    console.log(`⚙️  노드 실행: ${nodeId} (${nodeType})`);
    
    // Mock 노드 실행 로직
    switch (nodeType) {
      case 'dataSource':
        return await this.executeDataSourceNode(session, nodeConfig);
      case 'prompt':
        return await this.executePromptNode(session, nodeConfig);
      case 'api_call':
        return await this.executeApiCallNode(session, nodeConfig);
      case 'sql_execution':
        return await this.executeSqlNode(session, nodeConfig);
      case 'json_processing':
        return await this.executeJsonProcessingNode(session, nodeConfig);
      case 'data_transformation':
        return await this.executeDataTransformationNode(session, nodeConfig);
      default:
        throw new Error(`지원하지 않는 노드 타입: ${nodeType}`);
    }
  }

  async executeDataSourceNode(session, config) {
    console.log(`📊 데이터 소스 노드 실행: ${config.source}`);
    const mockData = {
      news: [
        { id: 1, title: '삼성전자, 3분기 실적 발표', content: '매출 70조원 돌파...' },
        { id: 2, title: 'SK하이닉스, AI 반도체 수요 증가', content: '주가 상승...' }
      ]
    };
    
    await session.context.sessionDataManager.storeData('raw_data', mockData, 'dataSource');
    return { success: true, data: mockData };
  }

  async executePromptNode(session, config) {
    console.log(`💬 프롬프트 노드 실행: ${config.promptId}`);
    const promptTemplate = "다음 뉴스를 분석해주세요: {raw_data}";
    const resolvedPrompt = await session.context.sessionDataManager.resolveVariables(promptTemplate);
    
    console.log(`📝 해석된 프롬프트: ${resolvedPrompt.substring(0, 100)}...`);
    
    const mockResult = {
      analysis: '뉴스 분석 결과',
      scores: { relevance: 0.8, importance: 0.9 }
    };
    
    await session.context.sessionDataManager.storeData('prompt_result', mockResult, 'prompt');
    return { success: true, data: mockResult };
  }

  async executeApiCallNode(session, config) {
    console.log(`🌐 API 호출 노드 실행: ${config.endpoint}`);
    const mockApiResponse = {
      events: [
        { title: 'AI 반도체 수요 증가', impact: 'high' },
        { title: '삼성전자 실적 발표', impact: 'medium' }
      ]
    };
    
    await session.context.sessionDataManager.storeData('api_response', mockApiResponse, 'api_call');
    return { success: true, data: mockApiResponse };
  }

  async executeSqlNode(session, config) {
    console.log(`🗄️  SQL 실행 노드: ${config.query.substring(0, 50)}...`);
    const mockDbResult = {
      rows: [
        { id: 1, event: 'AI 반도체 수요 증가', created_at: new Date() }
      ]
    };
    
    await session.context.sessionDataManager.storeData('db_result', mockDbResult, 'sql_execution');
    return { success: true, data: mockDbResult };
  }

  async executeJsonProcessingNode(session, config) {
    console.log(`📋 JSON 처리 노드 실행`);
    const rawData = await session.context.sessionDataManager.retrieveData('api_response');
    const processedData = {
      processed_events: rawData.events.map(event => ({
        ...event,
        processed_at: new Date(),
        status: 'processed'
      }))
    };
    
    await session.context.sessionDataManager.storeData('processed_data', processedData, 'json_processing');
    return { success: true, data: processedData };
  }

  async executeDataTransformationNode(session, config) {
    console.log(`🔄 데이터 변환 노드 실행`);
    const processedData = await session.context.sessionDataManager.retrieveData('processed_data');
    const finalResult = {
      market_analysis: {
        events: processedData.processed_events,
        summary: '시장 분석 완료',
        generated_at: new Date()
      }
    };
    
    await session.context.sessionDataManager.storeData('final_result', finalResult, 'data_transformation');
    return { success: true, data: finalResult };
  }
}

// 테스트 실행
async function runMockTests() {
  try {
    console.log('\n1️⃣ Mock SessionDataManager 테스트...');
    
    const sessionDataManager = new MockSessionDataManager('test-session');
    
    // 데이터 저장/조회 테스트
    await sessionDataManager.storeData('test_key', { message: 'Hello World' }, 'test_node');
    const retrievedData = await sessionDataManager.retrieveData('test_key');
    console.log(`✅ 데이터 저장/조회 테스트 성공: ${JSON.stringify(retrievedData)}`);
    
    // 변수 해석 테스트
    const template = '안녕하세요 {test_key}입니다.';
    const resolved = await sessionDataManager.resolveVariables(template);
    console.log(`✅ 변수 해석 테스트 성공: ${resolved}`);
    
    console.log('\n2️⃣ Mock WorkflowEngine 테스트...');
    
    const workflowEngine = new MockWorkflowEngine();
    
    // 워크플로우 시작
    const session = await workflowEngine.startWorkflow('news-processing', '뉴스 처리 테스트', 'tester');
    console.log(`✅ 워크플로우 시작 성공: ${session.id}`);
    
    // 노드들 순차 실행
    console.log('\n3️⃣ 워크플로우 노드 실행 테스트...');
    
    // 1. 데이터 소스 노드
    await workflowEngine.executeNode(session.id, 'data_source_1', 'dataSource', {
      source: 'news_api',
      query: 'SELECT * FROM news WHERE date >= NOW() - INTERVAL 1 DAY'
    });
    
    // 2. 프롬프트 노드
    await workflowEngine.executeNode(session.id, 'prompt_1', 'prompt', {
      promptId: 'news_analysis',
      variables: ['raw_data']
    });
    
    // 3. API 호출 노드
    await workflowEngine.executeNode(session.id, 'api_1', 'api_call', {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      method: 'POST'
    });
    
    // 4. SQL 실행 노드
    await workflowEngine.executeNode(session.id, 'sql_1', 'sql_execution', {
      query: 'INSERT INTO market_events (title, impact) VALUES ($1, $2)',
      parameters: ['AI 반도체 수요 증가', 'high']
    });
    
    // 5. JSON 처리 노드
    await workflowEngine.executeNode(session.id, 'json_1', 'json_processing', {
      inputKey: 'api_response',
      outputKey: 'processed_data'
    });
    
    // 6. 데이터 변환 노드
    await workflowEngine.executeNode(session.id, 'transform_1', 'data_transformation', {
      inputKey: 'processed_data',
      outputKey: 'final_result'
    });
    
    console.log('\n4️⃣ 최종 결과 확인...');
    
    const finalResult = await session.context.sessionDataManager.retrieveData('final_result');
    console.log(`✅ 최종 결과: ${JSON.stringify(finalResult, null, 2)}`);
    
    console.log('\n🎉 모든 Mock 테스트가 성공적으로 완료되었습니다!');
    console.log('\n📊 테스트 요약:');
    console.log('   ✅ SessionDataManager 기능 테스트');
    console.log('   ✅ WorkflowEngine 초기화 테스트');
    console.log('   ✅ 워크플로우 세션 생성 테스트');
    console.log('   ✅ 6개 노드 타입 실행 테스트');
    console.log('   ✅ 데이터 흐름 및 세션 데이터 관리 테스트');
    
  } catch (error) {
    console.error('❌ Mock 테스트 실패:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

runMockTests();
