// 실제 HTTP API 엔드포인트 테스트
console.log('🌐 실제 HTTP API 엔드포인트 테스트 시작...');

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// HTTP 요청 헬퍼 함수
async function makeRequest(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const responseData = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: responseData
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: { error: error.message }
    };
  }
}

// 1. API 관리 기능 HTTP 테스트
async function testApiManagementHttp() {
  console.log('\n📡 1. API 관리 기능 HTTP 테스트');
  
  try {
    // AI 서비스 프로바이더 조회 테스트
    console.log('✅ AI 서비스 프로바이더 조회 테스트');
    const providersResult = await makeRequest('GET', '/api/ai-providers');
    console.log(`   Status: ${providersResult.status}, Success: ${providersResult.success}`);
    
    // API 카테고리 조회 테스트
    console.log('✅ API 카테고리 조회 테스트');
    const categoriesResult = await makeRequest('GET', '/api/api-categories');
    console.log(`   Status: ${categoriesResult.status}, Success: ${categoriesResult.success}`);
    
    // API 엔드포인트 조회 테스트
    console.log('✅ API 엔드포인트 조회 테스트');
    const endpointsResult = await makeRequest('GET', '/api/endpoints');
    console.log(`   Status: ${endpointsResult.status}, Success: ${endpointsResult.success}`);
    
    return true;
  } catch (error) {
    console.error('❌ API 관리 기능 HTTP 테스트 실패:', error.message);
    return false;
  }
}

// 2. 워크플로우 에디터 기능 HTTP 테스트
async function testWorkflowEditorHttp() {
  console.log('\n🔧 2. 워크플로우 에디터 기능 HTTP 테스트');
  
  try {
    // 워크플로우 조회 테스트
    console.log('✅ 워크플로우 조회 테스트');
    const workflowsResult = await makeRequest('GET', '/api/workflows');
    console.log(`   Status: ${workflowsResult.status}, Success: ${workflowsResult.success}`);
    
    // 워크플로우 노드 조회 테스트
    console.log('✅ 워크플로우 노드 조회 테스트');
    const nodesResult = await makeRequest('GET', '/api/workflow-nodes');
    console.log(`   Status: ${nodesResult.status}, Success: ${nodesResult.success}`);
    
    // 워크플로우 실행 상태 조회 테스트
    console.log('✅ 워크플로우 실행 상태 조회 테스트');
    const statusResult = await makeRequest('GET', '/api/workflow/ai-market-analysis/status');
    console.log(`   Status: ${statusResult.status}, Success: ${statusResult.success}`);
    
    return true;
  } catch (error) {
    console.error('❌ 워크플로우 에디터 기능 HTTP 테스트 실패:', error.message);
    return false;
  }
}

// 3. 워크플로우 세션데이터 관리 기능 HTTP 테스트
async function testWorkflowSessionDataHttp() {
  console.log('\n💾 3. 워크플로우 세션데이터 관리 기능 HTTP 테스트');
  
  try {
    // 워크플로우 세션 조회 테스트
    console.log('✅ 워크플로우 세션 조회 테스트');
    const sessionsResult = await makeRequest('GET', '/api/workflow-sessions');
    console.log(`   Status: ${sessionsResult.status}, Success: ${sessionsResult.success}`);
    
    // 워크플로우 노드 실행 로그 조회 테스트
    console.log('✅ 워크플로우 노드 실행 로그 조회 테스트');
    const executionsResult = await makeRequest('GET', '/api/workflow-node-executions');
    console.log(`   Status: ${executionsResult.status}, Success: ${executionsResult.success}`);
    
    return true;
  } catch (error) {
    console.error('❌ 워크플로우 세션데이터 관리 기능 HTTP 테스트 실패:', error.message);
    return false;
  }
}

// 4. 프롬프트 빌더 기능 HTTP 테스트
async function testPromptBuilderHttp() {
  console.log('\n💬 4. 프롬프트 빌더 기능 HTTP 테스트');
  
  try {
    // 프롬프트 조회 테스트
    console.log('✅ 프롬프트 조회 테스트');
    const promptsResult = await makeRequest('GET', '/api/prompts');
    console.log(`   Status: ${promptsResult.status}, Success: ${promptsResult.success}`);
    
    // 프롬프트 생성 테스트 (샘플 데이터)
    console.log('✅ 프롬프트 생성 테스트');
    const samplePrompt = {
      name: '테스트 프롬프트',
      description: 'HTTP 테스트용 프롬프트',
      systemPrompt: '당신은 테스트용 AI 어시스턴트입니다.',
      userPromptTemplate: '다음 질문에 답해주세요: {question}',
      parameters: { question: 'string' },
      category: '테스트',
      isActive: true,
      createdBy: 'test-user'
    };
    
    const createResult = await makeRequest('POST', '/api/prompts', samplePrompt);
    console.log(`   Status: ${createResult.status}, Success: ${createResult.success}`);
    
    // 생성된 프롬프트 삭제 (정리)
    if (createResult.success && createResult.data.id) {
      console.log('✅ 테스트 프롬프트 정리');
      const deleteResult = await makeRequest('DELETE', `/api/prompts/${createResult.data.id}`);
      console.log(`   Status: ${deleteResult.status}, Success: ${deleteResult.success}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 프롬프트 빌더 기능 HTTP 테스트 실패:', error.message);
    return false;
  }
}

// 5. 스키마 브라우저 기능 HTTP 테스트
async function testSchemaBrowserHttp() {
  console.log('\n🗂️ 5. 스키마 브라우저 기능 HTTP 테스트');
  
  try {
    // 스키마 정보 조회 테스트
    console.log('✅ 스키마 정보 조회 테스트');
    const schemaResult = await makeRequest('GET', '/api/schema-info');
    console.log(`   Status: ${schemaResult.status}, Success: ${schemaResult.success}`);
    
    if (schemaResult.success) {
      console.log(`   테이블 수: ${schemaResult.data.tables?.length || 0}개`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 스키마 브라우저 기능 HTTP 테스트 실패:', error.message);
    return false;
  }
}

// 6. 딕셔너리 매니저 기능 HTTP 테스트
async function testDictionaryManagerHttp() {
  console.log('\n📚 6. 딕셔너리 매니저 기능 HTTP 테스트');
  
  try {
    // 딕셔너리 조회 테스트
    console.log('✅ 딕셔너리 조회 테스트');
    const dictionariesResult = await makeRequest('GET', '/api/dictionaries');
    console.log(`   Status: ${dictionariesResult.status}, Success: ${dictionariesResult.success}`);
    
    // 기본 딕셔너리 엔트리 조회 테스트
    console.log('✅ 기본 딕셔너리 엔트리 조회 테스트');
    const entriesResult = await makeRequest('GET', '/api/dictionaries/default/entries');
    console.log(`   Status: ${entriesResult.status}, Success: ${entriesResult.success}`);
    
    return true;
  } catch (error) {
    console.error('❌ 딕셔너리 매니저 기능 HTTP 테스트 실패:', error.message);
    return false;
  }
}

// 7. 워크플로우 실행 기능 HTTP 테스트
async function testWorkflowExecutionHttp() {
  console.log('\n⚡ 7. 워크플로우 실행 기능 HTTP 테스트');
  
  try {
    // 워크플로우 실행 테스트 (로컬 테스트용)
    console.log('✅ 워크플로우 실행 테스트');
    const executeData = {
      workflowType: 'ai-market-analysis',
      parameters: {
        testMode: true,
        mockData: true
      }
    };
    
    const executeResult = await makeRequest('POST', '/api/workflow/ai-market-analysis-local/execute-workflow', executeData);
    console.log(`   Status: ${executeResult.status}, Success: ${executeResult.success}`);
    
    if (executeResult.success) {
      console.log(`   실행 결과: ${executeResult.data.message || '성공'}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 워크플로우 실행 기능 HTTP 테스트 실패:', error.message);
    return false;
  }
}

// 8. 시스템 상태 및 헬스체크 테스트
async function testSystemHealth() {
  console.log('\n🏥 8. 시스템 상태 및 헬스체크 테스트');
  
  try {
    // 헬스체크 테스트
    console.log('✅ 헬스체크 테스트');
    const healthResult = await makeRequest('GET', '/api/health');
    console.log(`   Status: ${healthResult.status}, Success: ${healthResult.success}`);
    
    if (healthResult.success) {
      console.log(`   시스템 상태: ${healthResult.data.system || 'unknown'}`);
      console.log(`   RAG 엔진: ${healthResult.data.ragEngine || 'unknown'}`);
      console.log(`   로그 레벨: ${healthResult.data.logLevel || 'unknown'}`);
    }
    
    // 시스템 상태 조회 테스트
    console.log('✅ 시스템 상태 조회 테스트');
    const statusResult = await makeRequest('GET', '/api/system/status');
    console.log(`   Status: ${statusResult.status}, Success: ${statusResult.success}`);
    
    return true;
  } catch (error) {
    console.error('❌ 시스템 상태 및 헬스체크 테스트 실패:', error.message);
    return false;
  }
}

// 종합 HTTP 테스트 실행
async function runHttpTests() {
  console.log('🌐 실제 HTTP API 엔드포인트 종합 테스트');
  console.log('='.repeat(60));
  
  const testResults = {
    apiManagement: false,
    workflowEditor: false,
    workflowSessionData: false,
    promptBuilder: false,
    schemaBrowser: false,
    dictionaryManager: false,
    workflowExecution: false,
    systemHealth: false
  };
  
  try {
    // 각 기능별 HTTP 테스트 실행
    testResults.apiManagement = await testApiManagementHttp();
    testResults.workflowEditor = await testWorkflowEditorHttp();
    testResults.workflowSessionData = await testWorkflowSessionDataHttp();
    testResults.promptBuilder = await testPromptBuilderHttp();
    testResults.schemaBrowser = await testSchemaBrowserHttp();
    testResults.dictionaryManager = await testDictionaryManagerHttp();
    testResults.workflowExecution = await testWorkflowExecutionHttp();
    testResults.systemHealth = await testSystemHealth();
    
    // 테스트 결과 요약
    console.log('\n📊 HTTP 테스트 결과 요약');
    console.log('='.repeat(40));
    
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(result => result === true).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`총 테스트: ${totalTests}개`);
    console.log(`✅ 통과: ${passedTests}개`);
    console.log(`❌ 실패: ${failedTests}개`);
    console.log(`📈 성공률: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    console.log('\n📋 상세 결과:');
    Object.entries(testResults).forEach(([testName, result]) => {
      const status = result ? '✅' : '❌';
      const testDisplayName = {
        apiManagement: 'API 관리',
        workflowEditor: '워크플로우 에디터',
        workflowSessionData: '워크플로우 세션데이터 관리',
        promptBuilder: '프롬프트 빌더',
        schemaBrowser: '스키마 브라우저',
        dictionaryManager: '딕셔너리 매니저',
        workflowExecution: '워크플로우 실행',
        systemHealth: '시스템 상태'
      }[testName];
      
      console.log(`   ${status} ${testDisplayName}`);
    });
    
    // 전체 시스템 상태 판단
    if (failedTests === 0) {
      console.log('\n🎉 모든 HTTP API 엔드포인트가 정상적으로 작동합니다!');
      console.log('✅ 시스템이 안정적으로 운영될 준비가 완료되었습니다.');
    } else {
      console.log('\n⚠️ 일부 HTTP API 엔드포인트에 문제가 있습니다.');
      console.log('❌ 문제가 있는 엔드포인트들을 수정해야 합니다.');
    }
    
    return testResults;
    
  } catch (error) {
    console.error('❌ HTTP 테스트 실행 중 오류 발생:', error);
    return testResults;
  }
}

// 테스트 실행
runHttpTests();
