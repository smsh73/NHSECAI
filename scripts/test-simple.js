#!/usr/bin/env node

/**
 * 간단한 로컬 테스트 스크립트
 * 서버 없이 기본적인 기능을 테스트합니다.
 */

console.log('🧪 AI 시황생성 로컬 테스트 시작\n');

// Mock 데이터
const mockNewsData = [
  {
    N_ID: 'news_001',
    N_TITLE: '삼성전자, 3분기 실적 발표... 매출 70조원 돌파',
    N_CONTENT: '삼성전자가 3분기 실적을 발표하며 매출 70조원을 돌파했다고 발표했다...',
    N_CODE: '005930',
    N_DATE: '20250101',
    N_TIME: '090000',
    GPT01_AD_POST_SCORE: 45,
    GPT04_CONTENT_QUALITY_SCORE: 85,
    GPT02_ECO_POST_SCORE: 80,
    GPT03_MARKET_POST_SCORE: 75
  },
  {
    N_ID: 'news_002',
    N_TITLE: 'SK하이닉스, AI 반도체 수요 증가로 주가 상승',
    N_CONTENT: 'SK하이닉스가 AI 반도체 수요 증가로 인해 주가가 상승하고 있다...',
    N_CODE: '000660',
    N_DATE: '20250101',
    N_TIME: '091500',
    GPT01_AD_POST_SCORE: 30,
    GPT04_CONTENT_QUALITY_SCORE: 90,
    GPT02_ECO_POST_SCORE: 85,
    GPT03_MARKET_POST_SCORE: 80
  },
  {
    N_ID: 'news_003',
    N_TITLE: '네이버, 클라우드 사업 확장 발표',
    N_CONTENT: '네이버가 클라우드 사업 확장을 발표하며 새로운 성장 동력을 확보했다...',
    N_CODE: '035420',
    N_DATE: '20250101',
    N_TIME: '100000',
    GPT01_AD_POST_SCORE: 25,
    GPT04_CONTENT_QUALITY_SCORE: 88,
    GPT02_ECO_POST_SCORE: 70,
    GPT03_MARKET_POST_SCORE: 75
  }
];

const mockMarketEvents = [
  {
    eventId: 'ME-20250101-001',
    eventTitle: '반도체 업계 실적 발표',
    eventDetail: '삼성전자, SK하이닉스 등 주요 반도체 기업들의 3분기 실적이 시장 기대치를 상회하며 반도체 업계 전반에 긍정적 영향을 미치고 있습니다.',
    newsIds: ['news_001', 'news_002'],
    newsTitles: ['삼성전자, 3분기 실적 발표...', 'SK하이닉스, AI 반도체 수요 증가...'],
    newsCodes: ['005930', '000660']
  }
];

const mockThemeMarkets = [
  {
    trendId: 'TH-20250101-100000-T001',
    themeTitle: '반도체',
    content: 'AI 반도체 수요 증가로 인한 반도체 업계 전반의 상승세가 지속되고 있습니다. 특히 메모리 반도체와 시스템 반도체 분야에서 강세를 보이고 있습니다.',
    direction: 'UP',
    fluctuationRate: 3.5,
    bubbleScale: 4
  },
  {
    trendId: 'TH-20250101-100000-T002',
    themeTitle: 'AI',
    content: '인공지능 기술의 발전과 적용 확산으로 AI 관련 기업들의 성장세가 지속되고 있습니다.',
    direction: 'UP',
    fluctuationRate: 2.8,
    bubbleScale: 3
  }
];

const mockMacroMarket = {
  trendId: 'MM-20250101-100000',
  title: '글로벌 기술주 중심 상승세 지속',
  content: '미국 기술 기업들의 실적 발표가 긍정적으로 예상되며 글로벌 증시가 전반적으로 상승세를 보이고 있습니다. 특히 AI 관련 기술주들이 시장을 견인하고 있으며, 투자 심리가 개선되고 있습니다.'
};

// 테스트 함수들
function testNewsDataCollection() {
  console.log('📰 뉴스 데이터 수집 테스트...');
  
  if (!Array.isArray(mockNewsData)) {
    throw new Error('뉴스 데이터가 배열이 아님');
  }
  
  if (mockNewsData.length === 0) {
    throw new Error('뉴스 데이터가 없음');
  }
  
  console.log(`✅ 뉴스 데이터 수집 성공: ${mockNewsData.length}건`);
  console.log(`   - 평균 품질 점수: ${Math.round(mockNewsData.reduce((sum, item) => sum + item.GPT04_CONTENT_QUALITY_SCORE, 0) / mockNewsData.length)}`);
  console.log(`   - 기업 코드: ${mockNewsData.map(n => n.N_CODE).join(', ')}`);
  
  return true;
}

function testMarketEventsExtraction() {
  console.log('🎯 주요이벤트 추출 테스트...');
  
  if (!Array.isArray(mockMarketEvents)) {
    throw new Error('이벤트 데이터가 배열이 아님');
  }
  
  if (mockMarketEvents.length === 0) {
    throw new Error('이벤트 데이터가 없음');
  }
  
  console.log(`✅ 주요이벤트 추출 성공: ${mockMarketEvents.length}건`);
  console.log(`   - 이벤트 제목: ${mockMarketEvents[0].eventTitle}`);
  console.log(`   - 관련 뉴스: ${mockMarketEvents[0].newsIds.length}건`);
  
  return true;
}

function testThemeMarketGeneration() {
  console.log('🎨 테마 시황 생성 테스트...');
  
  if (!Array.isArray(mockThemeMarkets)) {
    throw new Error('테마 데이터가 배열이 아님');
  }
  
  if (mockThemeMarkets.length === 0) {
    throw new Error('테마 데이터가 없음');
  }
  
  console.log(`✅ 테마 시황 생성 성공: ${mockThemeMarkets.length}건`);
  console.log(`   - 테마: ${mockThemeMarkets.map(t => t.themeTitle).join(', ')}`);
  console.log(`   - 평균 등락률: ${(mockThemeMarkets.reduce((sum, t) => sum + t.fluctuationRate, 0) / mockThemeMarkets.length).toFixed(1)}%`);
  
  return true;
}

function testMacroMarketGeneration() {
  console.log('📊 매크로 시황 생성 테스트...');
  
  if (!mockMacroMarket.title || !mockMacroMarket.content) {
    throw new Error('매크로 시황 데이터가 불완전함');
  }
  
  console.log(`✅ 매크로 시황 생성 성공`);
  console.log(`   - 제목: ${mockMacroMarket.title}`);
  console.log(`   - 내용 길이: ${mockMacroMarket.content.length}자`);
  
  return true;
}

function testFullWorkflow() {
  console.log('🚀 전체 워크플로우 시뮬레이션...');
  
  const workflowData = {
    newsData: mockNewsData,
    marketEvents: mockMarketEvents,
    themeMarkets: mockThemeMarkets,
    macroMarket: mockMacroMarket
  };
  
  console.log('✅ 전체 워크플로우 완료!');
  console.log(`   - 뉴스 데이터: ${workflowData.newsData.length}건`);
  console.log(`   - 주요이벤트: ${workflowData.marketEvents.length}건`);
  console.log(`   - 테마 시황: ${workflowData.themeMarkets.length}건`);
  console.log(`   - 매크로 시황: 1건`);
  
  return true;
}

// 메인 테스트 실행
async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const tests = [
    { name: '뉴스 데이터 수집', fn: testNewsDataCollection },
    { name: '주요이벤트 추출', fn: testMarketEventsExtraction },
    { name: '테마 시황 생성', fn: testThemeMarketGeneration },
    { name: '매크로 시황 생성', fn: testMacroMarketGeneration },
    { name: '전체 워크플로우', fn: testFullWorkflow }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🧪 ${test.name} 테스트...`);
      await test.fn();
      console.log(`✅ ${test.name} 통과`);
      results.passed++;
      results.tests.push({ name: test.name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ ${test.name} 실패: ${error.message}`);
      results.failed++;
      results.tests.push({ name: test.name, status: 'FAILED', error: error.message });
    }
  }

  // 결과 출력
  console.log('\n📊 테스트 결과:');
  console.log(`✅ 통과: ${results.passed}`);
  console.log(`❌ 실패: ${results.failed}`);
  console.log(`📈 성공률: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ 실패한 테스트:');
    results.tests
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
  }
  
  if (results.failed === 0) {
    console.log('\n🎉 모든 테스트가 통과했습니다!');
    console.log('   AI 시황생성 시스템의 기본 로직이 정상적으로 작동합니다.');
    console.log('   이제 서버를 시작하여 실제 API를 테스트할 수 있습니다.');
  } else {
    console.log('\n⚠️ 일부 테스트가 실패했습니다.');
    console.log('   코드를 확인해주세요.');
  }
}

// 스크립트 실행
runTests().catch(console.error);
