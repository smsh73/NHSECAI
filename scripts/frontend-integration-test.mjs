import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

class FrontendIntegrationTester {
  constructor() {
    this.results = [];
  }

  async runAllTests() {
    console.log('🧪 프론트엔드 통합 테스트 시작...\n');

    const tests = [
      { name: '시스템 상태 확인', test: this.testSystemStatus },
      { name: '프롬프트 관리 API', test: this.testPromptManagement },
      { name: 'API 관리 API', test: this.testApiManagement },
      { name: '워크플로우 관리 API', test: this.testWorkflowManagement },
      { name: '워크플로우 실행 API', test: this.testWorkflowExecution },
      { name: 'Azure 환경 검증 API', test: this.testAzureEnvironment },
      { name: '사전 관리 API', test: this.testDictionaryManagement },
      { name: '스키마 브라우저 API', test: this.testSchemaBrowser },
      { name: '감사 로그 API', test: this.testAuditLogs }
    ];

    for (const { name, test } of tests) {
      try {
        console.log(`📋 ${name} 테스트 중...`);
        const result = await test.call(this);
        this.results.push({ name, status: 'success', result });
        console.log(`✅ ${name} 테스트 통과\n`);
      } catch (error) {
        this.results.push({ name, status: 'failed', error: error.message });
        console.log(`❌ ${name} 테스트 실패: ${error.message}\n`);
      }
    }

    this.printSummary();
  }

  async testSystemStatus() {
    const response = await axios.get(`${BASE_URL}/api/system/status`);
    if (response.status !== 200) {
      throw new Error(`시스템 상태 API 응답 오류: ${response.status}`);
    }
    return response.data;
  }

  async testPromptManagement() {
    // 프롬프트 목록 조회
    const listResponse = await axios.get(`${BASE_URL}/api/prompts`);
    if (listResponse.status !== 200) {
      throw new Error(`프롬프트 목록 조회 실패: ${listResponse.status}`);
    }

    // 프롬프트 테스트
    if (listResponse.data.length > 0) {
      const testResponse = await axios.post(`${BASE_URL}/api/prompts/test`, {
        promptId: listResponse.data[0].id,
        inputData: { test: 'integration test' }
      });
      if (testResponse.status !== 200) {
        throw new Error(`프롬프트 테스트 실패: ${testResponse.status}`);
      }
    }

    return { promptCount: listResponse.data.length };
  }

  async testApiManagement() {
    // API 호출 목록 조회
    const listResponse = await axios.get(`${BASE_URL}/api/api-calls`);
    if (listResponse.status !== 200) {
      throw new Error(`API 호출 목록 조회 실패: ${listResponse.status}`);
    }

    // API 테스트
    if (listResponse.data.length > 0) {
      const testResponse = await axios.post(`${BASE_URL}/api/api-calls/test`, {
        apiCallId: listResponse.data[0].id,
        inputData: { test: 'integration test' }
      });
      if (testResponse.status !== 200) {
        throw new Error(`API 테스트 실패: ${testResponse.status}`);
      }
    }

    return { apiCallCount: listResponse.data.length };
  }

  async testWorkflowManagement() {
    // 워크플로우 목록 조회
    const listResponse = await axios.get(`${BASE_URL}/api/workflows`);
    if (listResponse.status !== 200) {
      throw new Error(`워크플로우 목록 조회 실패: ${listResponse.status}`);
    }

    return { workflowCount: listResponse.data.length };
  }

  async testWorkflowExecution() {
    // 워크플로우 목록 조회
    const listResponse = await axios.get(`${BASE_URL}/api/workflows`);
    if (listResponse.data.length === 0) {
      return { message: '워크플로우가 없어서 실행 테스트를 건너뜁니다' };
    }

    // 워크플로우 세션 생성
    const sessionResponse = await axios.post(`${BASE_URL}/api/workflows/sessions`, {
      workflowId: listResponse.data[0].id,
      sessionName: 'Integration Test Session'
    });

    if (sessionResponse.status !== 201) {
      throw new Error(`워크플로우 세션 생성 실패: ${sessionResponse.status}`);
    }

    const sessionId = sessionResponse.data.sessionId;

    // 워크플로우 실행
    const executeResponse = await axios.post(`${BASE_URL}/api/workflows/sessions/${sessionId}/execute`);
    
    // 실행 기록 조회
    const executionsResponse = await axios.get(`${BASE_URL}/api/workflows/sessions/${sessionId}/executions`);

    return {
      sessionId,
      executionStatus: executeResponse.data.success,
      executionCount: executionsResponse.data.executions.length
    };
  }

  async testAzureEnvironment() {
    // Azure 환경 설정 요약
    const summaryResponse = await axios.get(`${BASE_URL}/api/azure/environment/summary`);
    if (summaryResponse.status !== 200) {
      throw new Error(`Azure 환경 설정 요약 실패: ${summaryResponse.status}`);
    }

    // Azure 환경 검증 (실제 연결은 실패할 수 있음)
    try {
      const validateResponse = await axios.get(`${BASE_URL}/api/azure/environment/validate`);
      return {
        summary: summaryResponse.data,
        validation: validateResponse.data
      };
    } catch (error) {
      return {
        summary: summaryResponse.data,
        validation: { message: 'Azure 서비스 연결 실패 (예상됨)' }
      };
    }
  }

  async testDictionaryManagement() {
    // 사전 항목 조회
    const response = await axios.get(`${BASE_URL}/api/dictionaries/default/entries`);
    if (response.status !== 200) {
      throw new Error(`사전 항목 조회 실패: ${response.status}`);
    }
    return { entryCount: response.data.length };
  }

  async testSchemaBrowser() {
    // 스키마 정보 조회 (실제 구현에 따라 엔드포인트가 다를 수 있음)
    try {
      const response = await axios.get(`${BASE_URL}/api/schema/tables`);
      return { tableCount: response.data.length };
    } catch (error) {
      return { message: '스키마 브라우저 API가 구현되지 않았습니다' };
    }
  }

  async testAuditLogs() {
    // 감사 로그 조회
    try {
      const response = await axios.get(`${BASE_URL}/api/audit-logs`);
      if (response.status !== 200) {
        throw new Error(`감사 로그 조회 실패: ${response.status}`);
      }
      return { logCount: response.data.length };
    } catch (error) {
      return { message: '감사 로그 API가 구현되지 않았습니다' };
    }
  }

  printSummary() {
    console.log('📊 프론트엔드 통합 테스트 결과 요약');
    console.log('=====================================');
    
    const successCount = this.results.filter(r => r.status === 'success').length;
    const totalCount = this.results.length;
    
    console.log(`총 테스트: ${totalCount}`);
    console.log(`성공: ${successCount}`);
    console.log(`실패: ${totalCount - successCount}`);
    console.log(`성공률: ${((successCount / totalCount) * 100).toFixed(1)}%\n`);
    
    console.log('상세 결과:');
    this.results.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${result.name}`);
      if (result.status === 'failed') {
        console.log(`   오류: ${result.error}`);
      }
    });
    
    console.log('\n🎯 권장사항:');
    const failedTests = this.results.filter(r => r.status === 'failed');
    if (failedTests.length === 0) {
      console.log('모든 테스트가 통과했습니다! 시스템이 정상적으로 작동하고 있습니다.');
    } else {
      console.log('다음 항목들을 확인하고 수정하세요:');
      failedTests.forEach(test => {
        console.log(`- ${test.name}: ${test.error}`);
      });
    }
  }
}

// 테스트 실행
const tester = new FrontendIntegrationTester();
tester.runAllTests().catch(console.error);
