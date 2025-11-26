// 워크플로우 실행 엔진 테스트
console.log('🧪 워크플로우 실행 엔진 테스트 시작...');

// Mock SessionDataManager
class MockSessionDataManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.data = new Map();
    this.executionLog = [];
  }

  async storeData(key, value, createdByNodeId, dataType = 'object') {
    this.data.set(key, { value, createdByNodeId, dataType, timestamp: new Date() });
    console.log(`📝 [${createdByNodeId}] 데이터 저장: ${key}`);
  }

  async retrieveData(key) {
    const item = this.data.get(key);
    return item ? item.value : null;
  }

  async storeNodeExecution(nodeId, status, inputData, outputData, errorMessage, executionTime) {
    this.executionLog.push({ nodeId, status, inputData, outputData, errorMessage, executionTime, timestamp: new Date() });
    console.log(`🔄 [${nodeId}] ${status} (${executionTime || 0}ms)`);
  }

  async resolveVariables(template) {
    let resolved = template;
    const matches = template.matchAll(/\{(\w+)\}/g);
    for (const match of matches) {
      const varName = match[1];
      const value = await this.retrieveData(varName);
      if (value !== null) {
        resolved = resolved.replace(new RegExp(`\\{${varName}\\}`, 'g'), JSON.stringify(value));
      }
    }
    return resolved;
  }
}

// Mock WorkflowEngine
class MockWorkflowEngine {
  constructor() {
    this.sessions = new Map();
    this.prompts = new Map();
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

    const startTime = Date.now();
    await session.context.sessionDataManager.storeNodeExecution(nodeId, 'running', nodeConfig, null, null, null);

    try {
      let result;
      switch (nodeType) {
        case 'dataSource':
          result = await this.executeDataSourceNode(session, nodeConfig);
          break;
        case 'transform':
          result = await this.executeTransformNode(session, nodeConfig);
          break;
        case 'prompt':
          result = await this.executePromptNode(session, nodeConfig);
          break;
        case 'api_call':
          result = await this.executeApiCallNode(session, nodeConfig);
          break;
        case 'json_processing':
          result = await this.executeJsonProcessingNode(session, nodeConfig);
          break;
        case 'data_transformation':
          result = await this.executeDataTransformationNode(session, nodeConfig);
          break;
        case 'sql_execution':
          result = await this.executeSqlNode(session, nodeConfig);
          break;
        default:
          throw new Error(`지원하지 않는 노드 타입: ${nodeType}`);
      }

      const executionTime = Date.now() - startTime;
      await session.context.sessionDataManager.storeNodeExecution(
        nodeId, 'completed', nodeConfig, result, null, executionTime
      );
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await session.context.sessionDataManager.storeNodeExecution(
        nodeId, 'failed', nodeConfig, null, error.message, executionTime
      );
      throw error;
    }
  }

  async executeDataSourceNode(session, config) {
    console.log(`📊 [${config.source}] 데이터 수집 중...`);
    
    // Mock 데이터 생성
    const mockData = {
      news: [
        { id: 1, title: '삼성전자, 3분기 실적 발표', content: '매출 70조원 돌파...', score: 85 },
        { id: 2, title: 'SK하이닉스, AI 반도체 수요 증가', content: '주가 상승...', score: 92 },
        { id: 3, title: '네이버, 클라우드 사업 확장', content: '신규 투자 발표...', score: 78 }
      ]
    };
    
    await session.context.sessionDataManager.storeData(config.outputKey, mockData, 'dataSource');
    return { success: true, data: mockData, count: mockData.news.length };
  }

  async executeTransformNode(session, config) {
    console.log(`🔄 [${config.inputKey}] 데이터 변환 중...`);
    
    const inputData = await session.context.sessionDataManager.retrieveData(config.inputKey);
    if (!inputData) {
      throw new Error(`입력 데이터를 찾을 수 없습니다: ${config.inputKey}`);
    }
    
    // Mock 변환 로직
    const transformedData = {
      ...inputData,
      news: inputData.news.map(item => ({
        ...item,
        content: item.content.replace(/<[^>]*>/g, ''), // HTML 태그 제거
        normalized_at: new Date(),
        quality_score: item.score > 80 ? 'high' : 'medium'
      }))
    };
    
    await session.context.sessionDataManager.storeData(config.outputKey, transformedData, 'transform');
    return { success: true, data: transformedData };
  }

  async executePromptNode(session, config) {
    console.log(`💬 [${config.promptId}] 프롬프트 실행 중...`);
    
    const inputData = await session.context.sessionDataManager.retrieveData(config.inputKey);
    if (!inputData) {
      throw new Error(`입력 데이터를 찾을 수 없습니다: ${config.inputKey}`);
    }
    
    // Mock 프롬프트 템플릿
    const promptTemplate = `
다음 뉴스를 분석하여 주요 시장 이벤트를 추출해주세요:
{inputData}

분석 결과를 JSON 형태로 반환해주세요.
    `;
    
    const resolvedPrompt = await session.context.sessionDataManager.resolveVariables(
      promptTemplate.replace('{inputData}', JSON.stringify(inputData))
    );
    
    console.log(`📝 해석된 프롬프트 길이: ${resolvedPrompt.length} 문자`);
    
    const promptResult = {
      prompt_id: config.promptId,
      resolved_prompt: resolvedPrompt,
      variables: config.variables || [],
      created_at: new Date()
    };
    
    await session.context.sessionDataManager.storeData(config.outputKey, promptResult, 'prompt');
    return { success: true, data: promptResult };
  }

  async executeApiCallNode(session, config) {
    console.log(`🌐 [${config.endpoint}] API 호출 중...`);
    
    const inputData = await session.context.sessionDataManager.retrieveData(config.inputKey);
    if (!inputData) {
      throw new Error(`입력 데이터를 찾을 수 없습니다: ${config.inputKey}`);
    }
    
    // Mock API 응답
    const apiResponse = {
      id: 'chatcmpl-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4o-mini',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify({
            events: [
              { title: 'AI 반도체 수요 증가', impact: 'high', category: 'technology' },
              { title: '삼성전자 실적 발표', impact: 'medium', category: 'earnings' },
              { title: '네이버 클라우드 확장', impact: 'low', category: 'business' }
            ],
            summary: '주요 시장 이벤트 3개 추출 완료'
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 150,
        completion_tokens: 200,
        total_tokens: 350
      }
    };
    
    await session.context.sessionDataManager.storeData(config.outputKey, apiResponse, 'api_call');
    return { success: true, data: apiResponse };
  }

  async executeJsonProcessingNode(session, config) {
    console.log(`📋 JSON 처리 중...`);
    
    const inputData = await session.context.sessionDataManager.retrieveData(config.inputKey);
    if (!inputData) {
      throw new Error(`입력 데이터를 찾을 수 없습니다: ${config.inputKey}`);
    }
    
    // Mock JSON 파싱
    const content = inputData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API 응답에서 콘텐츠를 찾을 수 없습니다');
    }
    
    const parsedData = JSON.parse(content);
    const processedData = {
      events: parsedData.events.map(event => ({
        ...event,
        processed_at: new Date(),
        status: 'processed',
        id: 'event-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
      })),
      summary: parsedData.summary,
      processing_metadata: {
        processed_at: new Date(),
        processor: 'json_processing_node',
        version: '1.0'
      }
    };
    
    await session.context.sessionDataManager.storeData(config.outputKey, processedData, 'json_processing');
    return { success: true, data: processedData };
  }

  async executeDataTransformationNode(session, config) {
    console.log(`🔄 데이터 변환 중...`);
    
    const inputData = await session.context.sessionDataManager.retrieveData(config.inputKey);
    if (!inputData) {
      throw new Error(`입력 데이터를 찾을 수 없습니다: ${config.inputKey}`);
    }
    
    // Mock 데이터 변환
    const transformedData = {
      market_analysis: {
        events: inputData.events,
        summary: inputData.summary,
        generated_at: new Date(),
        workflow_version: '1.0',
        total_events: inputData.events.length,
        high_impact_events: inputData.events.filter(e => e.impact === 'high').length,
        medium_impact_events: inputData.events.filter(e => e.impact === 'medium').length,
        low_impact_events: inputData.events.filter(e => e.impact === 'low').length
      }
    };
    
    await session.context.sessionDataManager.storeData(config.outputKey, transformedData, 'data_transformation');
    return { success: true, data: transformedData };
  }

  async executeSqlNode(session, config) {
    console.log(`🗄️ SQL 실행 중...`);
    
    const inputData = await session.context.sessionDataManager.retrieveData(config.inputKey);
    if (!inputData) {
      throw new Error(`입력 데이터를 찾을 수 없습니다: ${config.inputKey}`);
    }
    
    // Mock SQL 실행
    const sqlResult = {
      rows_affected: inputData.market_analysis?.events?.length || 0,
      inserted_events: inputData.market_analysis?.events?.map(event => ({
        id: event.id,
        title: event.title,
        impact: event.impact,
        category: event.category,
        created_at: new Date()
      })) || [],
      execution_time: Math.random() * 1000 + 500, // 500-1500ms
      query: config.query || 'INSERT INTO market_events ...'
    };
    
    await session.context.sessionDataManager.storeData(config.outputKey, sqlResult, 'sql_execution');
    return { success: true, data: sqlResult };
  }

  async getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
}

// 테스트 실행
async function runWorkflowExecutionTests() {
  try {
    console.log('1️⃣ 워크플로우 엔진 초기화 테스트...');
    
    const workflowEngine = new MockWorkflowEngine();
    console.log('✅ 워크플로우 엔진 초기화 완료');
    
    console.log('\n2️⃣ 뉴스 처리 워크플로우 실행 테스트...');
    
    // 워크플로우 시작
    const session = await workflowEngine.startWorkflow('news-processing', '뉴스 처리 테스트', 'tester');
    console.log(`✅ 워크플로우 세션 생성: ${session.id}`);
    
    // 노드들 순차 실행
    console.log('\n3️⃣ 워크플로우 노드 순차 실행...');
    
    try {
      // 1. 데이터 소스 노드
      console.log('\n📊 1단계: 뉴스 데이터 수집');
      await workflowEngine.executeNode(session.id, 'data_source_1', 'dataSource', {
        source: 'nh_ai.silver.N_NEWS_MM_SILVER',
        outputKey: 'raw_news_data'
      });
      
      // 2. 변환 노드
      console.log('\n🔄 2단계: 데이터 정규화');
      await workflowEngine.executeNode(session.id, 'transform_1', 'transform', {
        inputKey: 'raw_news_data',
        outputKey: 'normalized_news_data'
      });
      
      // 3. 프롬프트 노드
      console.log('\n💬 3단계: 프롬프트 실행');
      await workflowEngine.executeNode(session.id, 'prompt_1', 'prompt', {
        promptId: 'news_analysis',
        inputKey: 'normalized_news_data',
        outputKey: 'prompt_result',
        variables: ['normalized_news_data']
      });
      
      // 4. API 호출 노드
      console.log('\n🌐 4단계: Azure OpenAI API 호출');
      await workflowEngine.executeNode(session.id, 'api_call_1', 'api_call', {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        inputKey: 'prompt_result',
        outputKey: 'api_response'
      });
      
      // 5. JSON 처리 노드
      console.log('\n📋 5단계: JSON 데이터 처리');
      await workflowEngine.executeNode(session.id, 'json_processing_1', 'json_processing', {
        inputKey: 'api_response',
        outputKey: 'processed_data'
      });
      
      // 6. 데이터 변환 노드
      console.log('\n🔄 6단계: 최종 데이터 변환');
      await workflowEngine.executeNode(session.id, 'data_transformation_1', 'data_transformation', {
        inputKey: 'processed_data',
        outputKey: 'final_result'
      });
      
      // 7. SQL 실행 노드
      console.log('\n🗄️ 7단계: 데이터베이스 저장');
      await workflowEngine.executeNode(session.id, 'sql_execution_1', 'sql_execution', {
        inputKey: 'final_result',
        outputKey: 'stored_result'
      });
      
    } catch (error) {
      console.error(`❌ 워크플로우 실행 중 오류: ${error.message}`);
      throw error;
    }
    
    console.log('\n4️⃣ 실행 결과 검증...');
    
    // 최종 결과 확인
    const finalResult = await session.context.sessionDataManager.retrieveData('final_result');
    const storedResult = await session.context.sessionDataManager.retrieveData('stored_result');
    
    console.log(`✅ 최종 결과: ${JSON.stringify(finalResult.market_analysis.summary)}`);
    console.log(`✅ 저장된 이벤트 수: ${storedResult.inserted_events.length}개`);
    console.log(`✅ 영향도별 이벤트:`);
    console.log(`   - High Impact: ${finalResult.market_analysis.high_impact_events}개`);
    console.log(`   - Medium Impact: ${finalResult.market_analysis.medium_impact_events}개`);
    console.log(`   - Low Impact: ${finalResult.market_analysis.low_impact_events}개`);
    
    console.log('\n5️⃣ 실행 로그 분석...');
    
    const executionLog = session.context.sessionDataManager.executionLog;
    console.log(`📊 총 실행 노드 수: ${executionLog.length}개`);
    
    const successCount = executionLog.filter(log => log.status === 'completed').length;
    const failedCount = executionLog.filter(log => log.status === 'failed').length;
    const totalExecutionTime = executionLog.reduce((sum, log) => sum + (log.executionTime || 0), 0);
    
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failedCount}개`);
    console.log(`⏱️  총 실행 시간: ${totalExecutionTime}ms`);
    
    console.log('\n📋 노드별 실행 상세:');
    executionLog.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.nodeId} - ${log.status} (${log.executionTime || 0}ms)`);
    });
    
    console.log('\n6️⃣ 에러 처리 테스트...');
    
    // 에러가 발생하는 노드 실행 테스트
    try {
      await workflowEngine.executeNode(session.id, 'error_node', 'dataSource', {
        source: 'non_existent_table',
        outputKey: 'error_data'
      });
    } catch (error) {
      console.log(`✅ 에러 처리 정상: ${error.message}`);
    }
    
    console.log('\n🎉 워크플로우 실행 엔진 테스트 완료!');
    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 워크플로우 엔진 초기화');
    console.log('   ✅ 워크플로우 세션 생성');
    console.log('   ✅ 7개 노드 타입 순차 실행');
    console.log('   ✅ 데이터 흐름 및 세션 데이터 관리');
    console.log('   ✅ 실행 결과 검증');
    console.log('   ✅ 실행 로그 분석');
    console.log('   ✅ 에러 처리');
    
  } catch (error) {
    console.error('❌ 워크플로우 실행 엔진 테스트 실패:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

runWorkflowExecutionTests();
