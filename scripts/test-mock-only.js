#!/usr/bin/env node

/**
 * Mock 데이터만으로 테스트하는 스크립트
 * 서버 없이 AI 시황생성 로직을 테스트합니다.
 */

import { mockDatabricksService, mockOpenAIService, mockActivityLogger } from '../server/services/mock-services.js';

console.log('🧪 AI 시황생성 Mock 테스트 시작\n');

// Mock 서비스 테스트
async function testMockServices() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Mock Databricks 서비스 테스트
  try {
    console.log('📊 Mock Databricks 서비스 테스트...');
    const newsData = await mockDatabricksService.executeQuery('SELECT * FROM news');
    if (Array.isArray(newsData) && newsData.length > 0) {
      console.log(`✅ Mock Databricks 성공: ${newsData.length}건의 뉴스 데이터`);
      results.passed++;
      results.tests.push({ name: 'Mock Databricks', status: 'PASSED' });
    } else {
      throw new Error('뉴스 데이터가 없음');
    }
  } catch (error) {
    console.log(`❌ Mock Databricks 실패: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Mock Databricks', status: 'FAILED', error: error.message });
  }

  // Mock OpenAI 서비스 테스트
  try {
    console.log('🤖 Mock OpenAI 서비스 테스트...');
    const response = await mockOpenAIService.getChatCompletion('테스트 프롬프트', 100);
    if (response && typeof response === 'string') {
      console.log(`✅ Mock OpenAI 성공: 응답 길이 ${response.length}자`);
      results.passed++;
      results.tests.push({ name: 'Mock OpenAI', status: 'PASSED' });
    } else {
      throw new Error('응답이 올바르지 않음');
    }
  } catch (error) {
    console.log(`❌ Mock OpenAI 실패: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Mock OpenAI', status: 'FAILED', error: error.message });
  }

  // Mock Activity Logger 테스트
  try {
    console.log('📝 Mock Activity Logger 테스트...');
    mockActivityLogger.logActivity('TEST', 'test_action', 'SUCCESS', { test: true });
    console.log('✅ Mock Activity Logger 성공: 로그 기록됨');
    results.passed++;
    results.tests.push({ name: 'Mock Activity Logger', status: 'PASSED' });
  } catch (error) {
    console.log(`❌ Mock Activity Logger 실패: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Mock Activity Logger', status: 'FAILED', error: error.message });
  }

  return results;
}

// AI 시황생성 워크플로우 시뮬레이션
async function simulateWorkflow() {
  console.log('\n🚀 AI 시황생성 워크플로우 시뮬레이션...');
  
  try {
    // 1단계: 뉴스 데이터 수집
    console.log('1️⃣ 뉴스 데이터 수집 중...');
    const newsData = await mockDatabricksService.executeQuery('SELECT * FROM news');
    console.log(`   📰 ${newsData.length}건의 뉴스 수집 완료`);

    // 2단계: 주요이벤트 추출
    console.log('2️⃣ 주요이벤트 추출 중...');
    const eventPrompt = `뉴스 분석: ${newsData.map(n => n.N_TITLE).join(', ')}`;
    const eventResponse = await mockOpenAIService.getChatCompletion(eventPrompt, 800);
    const events = JSON.parse(eventResponse);
    console.log(`   🎯 ${events.events?.length || 0}건의 이벤트 추출 완료`);

    // 3단계: 테마 시황 생성
    console.log('3️⃣ 테마 시황 생성 중...');
    const themePrompt = '테마별 시황 분석을 수행해주세요.';
    const themeResponse = await mockOpenAIService.getChatCompletion(themePrompt, 800);
    const themes = JSON.parse(themeResponse);
    console.log(`   🎨 ${themes.themes?.length || 0}건의 테마 시황 생성 완료`);

    // 4단계: 매크로 시황 생성
    console.log('4️⃣ 매크로 시황 생성 중...');
    const macroPrompt = '전체 시장 상황을 종합적으로 분석해주세요.';
    const macroResponse = await mockOpenAIService.getChatCompletion(macroPrompt, 1500);
    const macro = JSON.parse(macroResponse);
    console.log(`   📊 매크로 시황 생성 완료: ${macro.title}`);

    console.log('\n✅ 전체 워크플로우 시뮬레이션 완료!');
    return true;
  } catch (error) {
    console.log(`❌ 워크플로우 시뮬레이션 실패: ${error.message}`);
    return false;
  }
}

// 메인 테스트 실행
async function runTests() {
  console.log('🔧 Mock 서비스 테스트 시작...\n');
  
  const serviceResults = await testMockServices();
  
  console.log('\n📊 Mock 서비스 테스트 결과:');
  console.log(`✅ 통과: ${serviceResults.passed}`);
  console.log(`❌ 실패: ${serviceResults.failed}`);
  
  if (serviceResults.failed > 0) {
    console.log('\n❌ 실패한 테스트:');
    serviceResults.tests
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
  }

  console.log('\n🎭 워크플로우 시뮬레이션 시작...');
  const workflowSuccess = await simulateWorkflow();
  
  console.log('\n📈 최종 결과:');
  console.log(`📊 Mock 서비스: ${serviceResults.passed}/${serviceResults.passed + serviceResults.failed} 통과`);
  console.log(`🚀 워크플로우: ${workflowSuccess ? '성공' : '실패'}`);
  
  if (serviceResults.failed === 0 && workflowSuccess) {
    console.log('\n🎉 모든 테스트가 성공했습니다!');
    console.log('   AI 시황생성 시스템이 정상적으로 작동할 준비가 되었습니다.');
  } else {
    console.log('\n⚠️ 일부 테스트가 실패했습니다.');
    console.log('   서버 설정을 확인해주세요.');
  }
}

// 스크립트 실행
runTests().catch(console.error);
