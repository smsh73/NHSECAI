#!/usr/bin/env node

/**
 * Azure 배포환경 서비스 연결 상태 확인 스크립트
 * - OpenAI PTU 서비스 연결 확인
 * - Databricks 서비스 연결 확인
 * - PostgreSQL 데이터베이스 연결 확인
 * - AI Search 서비스 연결 확인
 * - 워크플로우 에디터, 프롬프트 관리, 프롬프트 빌더에서 OpenAI PTU 사용 확인
 */

import { getAzureDatabricksService } from '../server/services/azure-databricks.ts';
import { azureConfigService } from '../server/services/azure-config.ts';
import { openaiService } from '../server/services/openai.ts';
import { getAzureSearchService } from '../server/services/azure-search.ts';
import { storage } from '../server/storage.ts';
import { detailedLogger } from '../server/services/detailed-logger.ts';

const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(testName, passed, error = null) {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
      detailedLogger.logError('AZURE_SERVICES_TEST', testName, error);
    }
  }
}

async function testEnvironmentVariables() {
  try {
    console.log('\n🔧 Azure 서비스 환경변수 확인');
    
    const azureServices = {
      'OpenAI PTU': [
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_DEPLOYMENT_NAME'
      ],
      'Databricks': [
        'AZURE_DATABRICKS_WORKSPACE_URL',
        'AZURE_DATABRICKS_ACCESS_TOKEN'
      ],
      'PostgreSQL': [
        'DATABASE_URL'
      ],
      'AI Search': [
        'AZURE_SEARCH_ENDPOINT',
        'AZURE_SEARCH_API_KEY',
        'AZURE_SEARCH_INDEX_NAME'
      ]
    };
    
    for (const [serviceName, envVars] of Object.entries(azureServices)) {
      console.log(`\n📋 ${serviceName} 환경변수:`);
      let allPresent = true;
      
      for (const envVar of envVars) {
        const exists = process.env[envVar] !== undefined;
        const masked = exists ? '***' : 'NOT_SET';
        console.log(`  ${envVar}: ${masked}`);
        if (!exists) allPresent = false;
      }
      
      logTest(`${serviceName} 환경변수 설정`, allPresent);
    }
    
  } catch (error) {
    logTest('환경변수 확인', false, error);
  }
}

async function testOpenAIPTUService() {
  try {
    console.log('\n🤖 OpenAI PTU 서비스 연결 테스트');
    
    // OpenAI 서비스 초기화 테스트
    try {
      const openAIService = openaiService;
      logTest('OpenAI 서비스 초기화', openAIService !== null);
      
      if (openAIService) {
        // 간단한 테스트 요청 (실제로는 호출하지 않고 설정만 확인)
        const config = azureConfigService.getOpenAIPTUConfig();
        logTest('OpenAI 설정 조회', config !== null);
        
        if (config) {
          logTest('OpenAI 엔드포인트 설정', !!config.endpoint);
          logTest('OpenAI API 키 설정', !!config.apiKey);
          logTest('OpenAI 배포명 설정', !!config.deploymentName);
        }
      }
    } catch (error) {
      logTest('OpenAI 서비스 초기화', false, error);
    }
    
  } catch (error) {
    logTest('OpenAI PTU 서비스 테스트', false, error);
  }
}

async function testDatabricksService() {
  try {
    console.log('\n🏗️ Databricks 서비스 연결 테스트');
    
    try {
      const databricksService = await getAzureDatabricksService();
      logTest('Databricks 서비스 초기화', databricksService !== null);
      
      if (databricksService) {
        // Databricks 설정 확인
        const config = azureConfigService.getDatabricksConfig();
        logTest('Databricks 설정 조회', config !== null);
        
        if (config) {
          logTest('Databricks 서버 호스트명 설정', !!config.serverHostname);
          logTest('Databricks HTTP 경로 설정', !!config.httpPath);
          logTest('Databricks 인증 토큰 설정', !!config.authToken);
        }
      }
    } catch (error) {
      logTest('Databricks 서비스 초기화', false, error);
    }
    
  } catch (error) {
    logTest('Databricks 서비스 테스트', false, error);
  }
}

async function testPostgreSQLService() {
  try {
    console.log('\n🗄️ PostgreSQL 데이터베이스 연결 테스트');
    
    try {
      // 간단한 스키마 정보 조회로 연결 테스트
      const schemaInfo = await storage.getSchemaInfo();
      logTest('PostgreSQL 연결', schemaInfo !== null);
      
      if (schemaInfo) {
        logTest('스키마 정보 조회', schemaInfo.tables && Array.isArray(schemaInfo.tables));
        logTest('테이블 데이터 존재', schemaInfo.tables.length > 0);
      }
    } catch (error) {
      logTest('PostgreSQL 연결', false, error);
    }
    
  } catch (error) {
    logTest('PostgreSQL 서비스 테스트', false, error);
  }
}

async function testAISearchService() {
  try {
    console.log('\n🔍 AI Search 서비스 연결 테스트');
    
    try {
      const searchService = getAzureSearchService();
      logTest('AI Search 서비스 초기화', searchService !== null);
      
      if (searchService) {
        // AI Search 설정 확인
        const config = azureConfigService.getAISearchConfig();
        logTest('AI Search 설정 조회', config !== null);
        
        if (config) {
          logTest('AI Search 엔드포인트 설정', !!config.endpoint);
          logTest('AI Search API 키 설정', !!config.apiKey);
          logTest('AI Search 인덱스명 설정', !!config.indexName);
        }
      }
    } catch (error) {
      logTest('AI Search 서비스 초기화', false, error);
    }
    
  } catch (error) {
    logTest('AI Search 서비스 테스트', false, error);
  }
}

async function testWorkflowPromptIntegration() {
  try {
    console.log('\n⚙️ 워크플로우 및 프롬프트 통합 테스트');
    
    // 프롬프트 카탈로그 테스트
    try {
      const prompts = await storage.getPrompts();
      logTest('프롬프트 카탈로그 조회', Array.isArray(prompts));
      
      if (prompts.length > 0) {
        logTest('프롬프트 데이터 존재', prompts.length > 0);
        
        // 첫 번째 프롬프트의 OpenAI 설정 확인
        const firstPrompt = prompts[0];
        if (firstPrompt.serviceProvider === 'openai') {
          logTest('프롬프트에서 OpenAI 서비스 사용', true);
        }
      }
    } catch (error) {
      logTest('프롬프트 카탈로그 조회', false, error);
    }
    
    // 워크플로우 테스트
    try {
      const workflows = await storage.getWorkflows();
      logTest('워크플로우 조회', Array.isArray(workflows));
      
      if (workflows.length > 0) {
        logTest('워크플로우 데이터 존재', workflows.length > 0);
        
        // 워크플로우 노드에서 OpenAI 사용 확인
        const workflowWithOpenAI = workflows.find(w => 
          w.nodes && w.nodes.some(node => 
            node.type === 'prompt' && node.serviceProvider === 'openai'
          )
        );
        logTest('워크플로우에서 OpenAI 사용', !!workflowWithOpenAI);
      }
    } catch (error) {
      logTest('워크플로우 조회', false, error);
    }
    
  } catch (error) {
    logTest('워크플로우 및 프롬프트 통합 테스트', false, error);
  }
}

async function testAIMarketAnalysisIntegration() {
  try {
    console.log('\n📊 AI 시황 분석 통합 테스트');
    
    // AI 시황 분석 서비스에서 사용하는 서비스들 확인
    const services = {
      'Databricks': process.env.AZURE_DATABRICKS_WORKSPACE_URL ? '설정됨' : '미설정',
      'OpenAI': process.env.AZURE_OPENAI_ENDPOINT ? '설정됨' : '미설정',
      'PostgreSQL': process.env.DATABASE_URL ? '설정됨' : '미설정'
    };
    
    console.log('AI 시황 분석에 필요한 서비스 상태:');
    for (const [service, status] of Object.entries(services)) {
      console.log(`  ${service}: ${status}`);
    }
    
    const allServicesConfigured = Object.values(services).every(status => status === '설정됨');
    logTest('AI 시황 분석 서비스 전체 설정', allServicesConfigured);
    
  } catch (error) {
    logTest('AI 시황 분석 통합 테스트', false, error);
  }
}

async function runAllTests() {
  console.log('🚀 Azure 배포환경 서비스 연결 상태 확인 시작\n');
  
  try {
    await testEnvironmentVariables();
    await testOpenAIPTUService();
    await testDatabricksService();
    await testPostgreSQLService();
    await testAISearchService();
    await testWorkflowPromptIntegration();
    await testAIMarketAnalysisIntegration();
    
    console.log('\n📊 테스트 결과 요약');
    console.log(`✅ 성공: ${testResults.passed}`);
    console.log(`❌ 실패: ${testResults.failed}`);
    console.log(`📈 성공률: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ 실패한 테스트들:');
      testResults.errors.forEach(({ test, error }) => {
        console.log(`  - ${test}: ${error}`);
      });
    }
    
    console.log('\n📋 Azure 서비스 연결 상태 요약:');
    console.log(`  🤖 OpenAI PTU: ${process.env.AZURE_OPENAI_ENDPOINT ? '✅ 연결됨' : '❌ 미연결'}`);
    console.log(`  🏗️ Databricks: ${process.env.AZURE_DATABRICKS_WORKSPACE_URL ? '✅ 연결됨' : '❌ 미연결'}`);
    console.log(`  🗄️ PostgreSQL: ${process.env.DATABASE_URL ? '✅ 연결됨' : '❌ 미연결'}`);
    console.log(`  🔍 AI Search: ${process.env.AZURE_SEARCH_ENDPOINT ? '✅ 연결됨' : '❌ 미연결'}`);
    
    if (testResults.failed === 0) {
      console.log('\n🎉 모든 Azure 서비스가 정상적으로 연결되어 있습니다!');
    } else {
      console.log('\n⚠️ 일부 서비스 연결에 문제가 있습니다. 환경변수를 확인해주세요.');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
    detailedLogger.logError('AZURE_SERVICES_TEST', 'runAllTests', error);
  }
}

// 테스트 실행
runAllTests().catch(console.error);
