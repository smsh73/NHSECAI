#!/usr/bin/env node

/**
 * 로컬 테스트 스크립트
 * 외부 의존성 없이 AI 시황생성 기능을 테스트할 수 있습니다.
 */

import http from 'http';
import https from 'https';

// 환경 변수 설정
process.env.NODE_ENV = 'development';
process.env.TEST_MODE = 'true';
process.env.MOCK_EXTERNAL_SERVICES = 'true';

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/ai-market-analysis-local`;

// 테스트 결과 저장
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// HTTP 요청 헬퍼
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// 테스트 실행 함수
async function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 ${testName} 실행 중...`);
    await testFn();
    console.log(`✅ ${testName} 통과`);
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'PASSED' });
  } catch (error) {
    console.log(`❌ ${testName} 실패: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
  }
}

// 테스트 케이스들
async function testWorkflowStatus() {
  const response = await makeRequest(`${API_BASE}/workflow-status`);
  
  if (response.status !== 200) {
    throw new Error(`예상 상태 코드: 200, 실제: ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('응답이 성공하지 않음');
  }
  
  if (response.data.data.mode !== 'local-test') {
    throw new Error('로컬 테스트 모드가 아님');
  }
}

async function testCollectNews() {
  const response = await makeRequest(`${API_BASE}/collect-news`, {
    method: 'POST'
  });
  
  if (response.status !== 200) {
    throw new Error(`예상 상태 코드: 200, 실제: ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('뉴스 데이터 수집 실패');
  }
  
  if (!Array.isArray(response.data.data)) {
    throw new Error('뉴스 데이터가 배열이 아님');
  }
  
  console.log(`📰 뉴스 데이터 ${response.data.data.length}건 수집됨`);
}

async function testExtractEvents() {
  const mockNewsData = [
    { N_TITLE: '테스트 뉴스 1', N_CONTENT: '테스트 내용 1' },
    { N_TITLE: '테스트 뉴스 2', N_CONTENT: '테스트 내용 2' }
  ];
  
  const response = await makeRequest(`${API_BASE}/extract-events`, {
    method: 'POST',
    body: { newsData: mockNewsData }
  });
  
  if (response.status !== 200) {
    throw new Error(`예상 상태 코드: 200, 실제: ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('주요이벤트 추출 실패');
  }
  
  if (!Array.isArray(response.data.data)) {
    throw new Error('이벤트 데이터가 배열이 아님');
  }
  
  console.log(`🎯 주요이벤트 ${response.data.data.length}건 추출됨`);
}

async function testGenerateThemes() {
  const response = await makeRequest(`${API_BASE}/generate-themes`, {
    method: 'POST'
  });
  
  if (response.status !== 200) {
    throw new Error(`예상 상태 코드: 200, 실제: ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('테마 시황 생성 실패');
  }
  
  if (!Array.isArray(response.data.data)) {
    throw new Error('테마 데이터가 배열이 아님');
  }
  
  console.log(`🎨 테마 시황 ${response.data.data.length}건 생성됨`);
}

async function testGenerateMacro() {
  const response = await makeRequest(`${API_BASE}/generate-macro`, {
    method: 'POST'
  });
  
  if (response.status !== 200) {
    throw new Error(`예상 상태 코드: 200, 실제: ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('매크로 시황 생성 실패');
  }
  
  if (!response.data.data.title || !response.data.data.content) {
    throw new Error('매크로 시황 데이터가 올바르지 않음');
  }
  
  console.log(`📊 매크로 시황 생성됨: ${response.data.data.title}`);
}

async function testFullWorkflow() {
  const response = await makeRequest(`${API_BASE}/execute-workflow`, {
    method: 'POST'
  });
  
  if (response.status !== 200) {
    throw new Error(`예상 상태 코드: 200, 실제: ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('전체 워크플로우 실행 실패');
  }
  
  const data = response.data.data;
  if (!data.newsData || !data.marketEvents || !data.themeMarkets || !data.macroMarket) {
    throw new Error('워크플로우 결과 데이터가 불완전함');
  }
  
  console.log(`🚀 전체 워크플로우 완료:`);
  console.log(`   - 뉴스 데이터: ${data.newsData.length}건`);
  console.log(`   - 주요이벤트: ${data.marketEvents.length}건`);
  console.log(`   - 테마 시황: ${data.themeMarkets.length}건`);
  console.log(`   - 매크로 시황: 1건`);
}

// 서버 상태 확인
async function checkServerStatus() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/system/status`);
    if (response.status === 200) {
      console.log('✅ 서버가 실행 중입니다.');
      return true;
    }
  } catch (error) {
    console.log('❌ 서버에 연결할 수 없습니다. 서버를 먼저 시작해주세요.');
    console.log('   npm run dev');
    return false;
  }
}

// 메인 테스트 실행
async function runAllTests() {
  console.log('🧪 AI 시황생성 로컬 테스트 시작\n');
  
  // 서버 상태 확인
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    process.exit(1);
  }
  
  // 테스트 실행
  await runTest('워크플로우 상태 조회', testWorkflowStatus);
  await runTest('뉴스 데이터 수집', testCollectNews);
  await runTest('주요이벤트 추출', testExtractEvents);
  await runTest('테마 시황 생성', testGenerateThemes);
  await runTest('매크로 시황 생성', testGenerateMacro);
  await runTest('전체 워크플로우 실행', testFullWorkflow);
  
  // 결과 출력
  console.log('\n📊 테스트 결과:');
  console.log(`✅ 통과: ${testResults.passed}`);
  console.log(`❌ 실패: ${testResults.failed}`);
  console.log(`📈 성공률: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ 실패한 테스트:');
    testResults.tests
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
  }
  
  console.log('\n🎉 테스트 완료!');
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, makeRequest };
