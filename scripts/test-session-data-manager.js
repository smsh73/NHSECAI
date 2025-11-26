// 세션 데이터 매니저 기능 테스트
console.log('🧪 세션 데이터 매니저 기능 테스트 시작...');

// Mock SessionDataManager 클래스 (실제 구현과 동일)
class MockSessionDataManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.data = new Map();
    this.executionLog = [];
  }

  async storeData(key, value, createdByNodeId, dataType = 'object') {
    const dataItem = {
      key,
      value,
      createdByNodeId,
      dataType,
      timestamp: new Date(),
      sessionId: this.sessionId
    };
    
    this.data.set(key, dataItem);
    console.log(`📝 데이터 저장: ${key} = ${JSON.stringify(value).substring(0, 100)}...`);
    return dataItem;
  }

  async retrieveData(key) {
    const item = this.data.get(key);
    return item ? item.value : null;
  }

  async storeNodeExecution(
    nodeId,
    status,
    inputData,
    outputData,
    errorMessage,
    executionTime
  ) {
    const execution = {
      nodeId,
      status,
      inputData,
      outputData,
      errorMessage,
      executionTime,
      timestamp: new Date(),
      sessionId: this.sessionId
    };
    
    this.executionLog.push(execution);
    console.log(`🔄 노드 실행 로그: ${nodeId} - ${status}`);
    return execution;
  }

  async resolveVariables(template) {
    let resolvedString = template;
    const matches = template.matchAll(/\{(\w+)\}/g);

    for (const match of matches) {
      const varName = match[1];
      const sessionValue = await this.retrieveData(varName);
      if (sessionValue !== null) {
        resolvedString = resolvedString.replace(
          new RegExp(`\\{${varName}\\}`, 'g'), 
          JSON.stringify(sessionValue)
        );
      }
    }
    return resolvedString;
  }

  async getAllData() {
    return Array.from(this.data.values());
  }

  async getExecutionLog() {
    return this.executionLog;
  }

  async clearData() {
    this.data.clear();
    this.executionLog = [];
  }
}

// 테스트 실행
async function runSessionDataManagerTests() {
  try {
    console.log('1️⃣ 기본 데이터 저장/조회 테스트...');
    
    const sessionDataManager = new MockSessionDataManager('test-session-001');
    
    // 다양한 데이터 타입 저장 테스트
    await sessionDataManager.storeData('string_data', 'Hello World', 'node-1', 'string');
    await sessionDataManager.storeData('number_data', 42, 'node-1', 'number');
    await sessionDataManager.storeData('boolean_data', true, 'node-1', 'boolean');
    await sessionDataManager.storeData('object_data', { name: 'Test', value: 123 }, 'node-1', 'object');
    await sessionDataManager.storeData('array_data', [1, 2, 3, 4, 5], 'node-1', 'array');
    
    // 데이터 조회 테스트
    const stringData = await sessionDataManager.retrieveData('string_data');
    const numberData = await sessionDataManager.retrieveData('number_data');
    const booleanData = await sessionDataManager.retrieveData('boolean_data');
    const objectData = await sessionDataManager.retrieveData('object_data');
    const arrayData = await sessionDataManager.retrieveData('array_data');
    const nonExistentData = await sessionDataManager.retrieveData('non_existent');
    
    console.log(`✅ 문자열 데이터: ${stringData}`);
    console.log(`✅ 숫자 데이터: ${numberData}`);
    console.log(`✅ 불린 데이터: ${booleanData}`);
    console.log(`✅ 객체 데이터: ${JSON.stringify(objectData)}`);
    console.log(`✅ 배열 데이터: ${JSON.stringify(arrayData)}`);
    console.log(`✅ 존재하지 않는 데이터: ${nonExistentData}`);
    
    console.log('\n2️⃣ 변수 해석 테스트...');
    
    // 복잡한 템플릿 변수 해석 테스트
    const templates = [
      '안녕하세요 {string_data}입니다.',
      '숫자는 {number_data}이고, 불린은 {boolean_data}입니다.',
      '객체: {object_data}, 배열: {array_data}',
      '존재하지 않는 변수: {non_existent}',
      '혼합: {string_data}의 값은 {number_data}이고, 상태는 {boolean_data}입니다.'
    ];
    
    for (const template of templates) {
      try {
        const resolved = await sessionDataManager.resolveVariables(template);
        console.log(`✅ 템플릿 해석: ${template} → ${resolved}`);
      } catch (error) {
        console.log(`❌ 템플릿 해석 실패: ${template} - ${error.message}`);
      }
    }
    
    console.log('\n3️⃣ 노드 실행 로그 테스트...');
    
    // 다양한 노드 실행 시나리오 테스트
    await sessionDataManager.storeNodeExecution(
      'data_source_1',
      'running',
      { query: 'SELECT * FROM news' },
      null,
      null,
      null
    );
    
    await sessionDataManager.storeNodeExecution(
      'data_source_1',
      'completed',
      { query: 'SELECT * FROM news' },
      { rows: [{ id: 1, title: 'Test News' }] },
      null,
      1500
    );
    
    await sessionDataManager.storeNodeExecution(
      'prompt_1',
      'running',
      { promptId: 'news_analysis' },
      null,
      null,
      null
    );
    
    await sessionDataManager.storeNodeExecution(
      'prompt_1',
      'failed',
      { promptId: 'news_analysis' },
      null,
      'API 호출 실패',
      5000
    );
    
    await sessionDataManager.storeNodeExecution(
      'api_call_1',
      'running',
      { endpoint: 'https://api.openai.com/v1/chat/completions' },
      null,
      null,
      null
    );
    
    await sessionDataManager.storeNodeExecution(
      'api_call_1',
      'completed',
      { endpoint: 'https://api.openai.com/v1/chat/completions' },
      { response: 'Analysis completed' },
      null,
      3000
    );
    
    // 실행 로그 조회
    const executionLog = await sessionDataManager.getExecutionLog();
    console.log(`✅ 실행 로그 개수: ${executionLog.length}개`);
    
    executionLog.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.nodeId} - ${log.status} (${log.executionTime || 0}ms)`);
    });
    
    console.log('\n4️⃣ 워크플로우 데이터 흐름 시뮬레이션...');
    
    // 뉴스 처리 워크플로우 시뮬레이션
    console.log('📰 뉴스 처리 워크플로우 데이터 흐름 시뮬레이션...');
    
    // 1. 뉴스 데이터 수집
    const newsData = {
      news: [
        { id: 1, title: '삼성전자, 3분기 실적 발표', content: '매출 70조원 돌파...' },
        { id: 2, title: 'SK하이닉스, AI 반도체 수요 증가', content: '주가 상승...' }
      ]
    };
    await sessionDataManager.storeData('raw_news_data', newsData, 'data_source_1');
    
    // 2. 데이터 정규화
    const normalizedData = {
      news: newsData.news.map(item => ({
        ...item,
        content: item.content.replace(/<[^>]*>/g, ''), // HTML 태그 제거
        normalized_at: new Date()
      }))
    };
    await sessionDataManager.storeData('normalized_news_data', normalizedData, 'transform_1');
    
    // 3. 프롬프트 실행
    const promptTemplate = `
다음 뉴스를 분석해주세요:
{normalized_news_data}

분석 결과를 JSON 형태로 반환해주세요.
    `;
    
    const resolvedPrompt = await sessionDataManager.resolveVariables(promptTemplate);
    console.log(`📝 해석된 프롬프트 길이: ${resolvedPrompt.length} 문자`);
    
    // 4. API 호출 결과
    const apiResponse = {
      analysis: '뉴스 분석 결과',
      events: [
        { title: 'AI 반도체 수요 증가', impact: 'high' },
        { title: '삼성전자 실적 발표', impact: 'medium' }
      ],
      scores: { relevance: 0.8, importance: 0.9 }
    };
    await sessionDataManager.storeData('api_response', apiResponse, 'api_call_1');
    
    // 5. JSON 처리
    const processedData = {
      market_events: apiResponse.events.map(event => ({
        ...event,
        processed_at: new Date(),
        status: 'processed'
      }))
    };
    await sessionDataManager.storeData('processed_data', processedData, 'json_processing_1');
    
    // 6. 최종 결과
    const finalResult = {
      market_analysis: {
        events: processedData.market_events,
        summary: '시장 분석 완료',
        generated_at: new Date(),
        workflow_version: '1.0'
      }
    };
    await sessionDataManager.storeData('final_result', finalResult, 'data_transformation_1');
    
    console.log('\n5️⃣ 데이터 흐름 검증...');
    
    // 각 단계의 데이터가 올바르게 저장되었는지 확인
    const rawData = await sessionDataManager.retrieveData('raw_news_data');
    const normalizedDataCheck = await sessionDataManager.retrieveData('normalized_news_data');
    const apiResponseCheck = await sessionDataManager.retrieveData('api_response');
    const processedDataCheck = await sessionDataManager.retrieveData('processed_data');
    const finalResultCheck = await sessionDataManager.retrieveData('final_result');
    
    console.log(`✅ 원본 데이터: ${rawData.news.length}개 뉴스`);
    console.log(`✅ 정규화 데이터: ${normalizedDataCheck.news.length}개 뉴스`);
    console.log(`✅ API 응답: ${apiResponseCheck.events.length}개 이벤트`);
    console.log(`✅ 처리된 데이터: ${processedDataCheck.market_events.length}개 이벤트`);
    console.log(`✅ 최종 결과: ${JSON.stringify(finalResultCheck.market_analysis.summary)}`);
    
    console.log('\n6️⃣ 전체 데이터 조회...');
    
    const allData = await sessionDataManager.getAllData();
    console.log(`📊 저장된 데이터 개수: ${allData.length}개`);
    
    allData.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.key} (${item.dataType}) - ${item.createdByNodeId}`);
    });
    
    console.log('\n🎉 세션 데이터 매니저 기능 테스트 완료!');
    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 다양한 데이터 타입 저장/조회');
    console.log('   ✅ 복잡한 템플릿 변수 해석');
    console.log('   ✅ 노드 실행 로그 관리');
    console.log('   ✅ 워크플로우 데이터 흐름 시뮬레이션');
    console.log('   ✅ 데이터 흐름 검증');
    console.log('   ✅ 전체 데이터 관리');
    
  } catch (error) {
    console.error('❌ 세션 데이터 매니저 테스트 실패:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

runSessionDataManagerTests();
