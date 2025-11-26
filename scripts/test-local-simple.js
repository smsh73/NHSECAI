#!/usr/bin/env node

/**
 * 간단한 로컬 테스트 스크립트
 */

import http from 'http';

// 환경 변수 설정
process.env.NODE_ENV = 'development';
process.env.TEST_MODE = 'true';
process.env.MOCK_EXTERNAL_SERVICES = 'true';

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/ai-market-analysis-local`;

console.log('🧪 AI 시황생성 로컬 테스트 시작\n');

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

// 서버 상태 확인
async function checkServerStatus() {
  try {
    console.log('🔍 서버 상태 확인 중...');
    const response = await makeRequest(`${BASE_URL}/api/system/status`);
    if (response.status === 200) {
      console.log('✅ 서버가 실행 중입니다.');
      return true;
    } else {
      console.log(`❌ 서버 응답 오류: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ 서버에 연결할 수 없습니다.');
    console.log('   서버를 먼저 시작해주세요: npm run dev');
    console.log(`   오류: ${error.message}`);
    return false;
  }
}

// 뉴스 데이터 수집 테스트
async function testCollectNews() {
  try {
    console.log('\n📰 뉴스 데이터 수집 테스트...');
    const response = await makeRequest(`${API_BASE}/collect-news`, {
      method: 'POST'
    });
    
    if (response.status === 200) {
      console.log(`✅ 뉴스 데이터 수집 성공: ${response.data.data?.length || 0}건`);
      return true;
    } else {
      console.log(`❌ 뉴스 데이터 수집 실패: ${response.status}`);
      console.log(`   응답: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 뉴스 데이터 수집 오류: ${error.message}`);
    return false;
  }
}

// 전체 워크플로우 테스트
async function testFullWorkflow() {
  try {
    console.log('\n🚀 전체 워크플로우 테스트...');
    const response = await makeRequest(`${API_BASE}/execute-workflow`, {
      method: 'POST'
    });
    
    if (response.status === 200) {
      console.log('✅ 전체 워크플로우 성공');
      const data = response.data.data;
      console.log(`   - 뉴스 데이터: ${data.newsData?.length || 0}건`);
      console.log(`   - 주요이벤트: ${data.marketEvents?.length || 0}건`);
      console.log(`   - 테마 시황: ${data.themeMarkets?.length || 0}건`);
      console.log(`   - 매크로 시황: ${data.macroMarket ? '1건' : '0건'}`);
      return true;
    } else {
      console.log(`❌ 전체 워크플로우 실패: ${response.status}`);
      console.log(`   응답: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 전체 워크플로우 오류: ${error.message}`);
    return false;
  }
}

// 메인 테스트 실행
async function runTests() {
  const results = {
    passed: 0,
    failed: 0
  };

  // 서버 상태 확인
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('\n❌ 서버가 실행되지 않았습니다. 테스트를 중단합니다.');
    process.exit(1);
  }

  // 뉴스 데이터 수집 테스트
  const newsTest = await testCollectNews();
  if (newsTest) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 전체 워크플로우 테스트
  const workflowTest = await testFullWorkflow();
  if (workflowTest) {
    results.passed++;
  } else {
    results.failed++;
  }

  // 결과 출력
  console.log('\n📊 테스트 결과:');
  console.log(`✅ 통과: ${results.passed}`);
  console.log(`❌ 실패: ${results.failed}`);
  console.log(`📈 성공률: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 모든 테스트가 통과했습니다!');
  } else {
    console.log('\n⚠️ 일부 테스트가 실패했습니다.');
  }
}

// 스크립트 실행
runTests().catch(console.error);
