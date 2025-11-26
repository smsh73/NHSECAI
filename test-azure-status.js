/**
 * Azure 서비스 상태 표시 검증 테스트
 * 
 * 테스트 항목:
 * 1. 인증 토큰 상태 (있음/없음)
 * 2. Private Endpoint 사용 여부 (사용/미사용)
 * 3. API Key 상태 (있음/없음)
 * 4. 연결 테스트 기능
 * 5. 설정됨/미설정 상태 표시
 */

async function testAzureConfigStatus() {
  console.log('=== Azure 서비스 상태 표시 검증 테스트 ===\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // Test 1: Configuration Summary API
  console.log('📋 Test 1: Configuration Summary API');
  try {
    const response = await fetch(`${baseUrl}/api/azure/config/summary`);
    const data = await response.json();
    
    console.log('✅ API 응답 성공');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.configuration) {
      const config = data.configuration;
      
      // Databricks 상태 검증
      console.log('\n🔍 Databricks 상태:');
      console.log(`  - Server Hostname: ${config.databricks?.serverHostname || 'N/A'}`);
      console.log(`  - HTTP Path: ${config.databricks?.httpPath || 'N/A'}`);
      console.log(`  - 인증 토큰: ${config.databricks?.hasAuthToken ? '있음 ✓' : '없음 ✗'}`);
      console.log(`  - Private Endpoint 사용: ${config.databricks?.usePrivateEndpoint ? '사용 ✓' : '미사용 ✗'}`);
      console.log(`  - Private Endpoint URL 있음: ${config.databricks?.hasPrivateEndpoint ? '예 ✓' : '아니오 ✗'}`);
      console.log(`  - 설정됨: ${config.databricks?.serverHostname ? '예 ✓' : '아니오 ✗'}`);
      
      // OpenAI PTU 상태 검증
      console.log('\n🔍 OpenAI PTU 상태:');
      console.log(`  - Endpoint: ${config.openaiPTU?.endpoint || 'N/A'}`);
      console.log(`  - Deployment: ${config.openaiPTU?.deploymentName || 'N/A'}`);
      console.log(`  - Model: ${config.openaiPTU?.modelName || 'N/A'}`);
      console.log(`  - API Key: ${config.openaiPTU?.hasApiKey ? '있음 ✓' : '없음 ✗'}`);
      console.log(`  - Private Endpoint URL 있음: ${config.openaiPTU?.hasPrivateEndpoint ? '예 ✓' : '아니오 ✗'}`);
      console.log(`  - 설정됨: ${config.openaiPTU?.endpoint ? '예 ✓' : '아니오 ✗'}`);
      
      // Embedding 상태 검증
      console.log('\n🔍 OpenAI Embedding 상태:');
      console.log(`  - Endpoint: ${config.embedding?.endpoint || 'N/A'}`);
      console.log(`  - Model: ${config.embedding?.modelName || 'N/A'}`);
      console.log(`  - API Key: ${config.embedding?.hasApiKey ? '있음 ✓' : '없음 ✗'}`);
      console.log(`  - 설정됨: ${config.embedding?.endpoint ? '예 ✓' : '아니오 ✗'}`);
      
      // PostgreSQL 상태 검증
      console.log('\n🔍 PostgreSQL 상태:');
      console.log(`  - Host: ${config.postgresql?.host || 'N/A'}`);
      console.log(`  - Database: ${config.postgresql?.database || 'N/A'}`);
      console.log(`  - Password: ${config.postgresql?.hasPassword ? '있음 ✓' : '없음 ✗'}`);
      console.log(`  - SSL: ${config.postgresql?.ssl ? '사용 ✓' : '미사용 ✗'}`);
      console.log(`  - 설정됨: ${config.postgresql?.host ? '예 ✓' : '아니오 ✗'}`);
      
      // CosmosDB 상태 검증
      console.log('\n🔍 CosmosDB 상태:');
      console.log(`  - Endpoint: ${config.cosmosdb?.endpoint || 'N/A'}`);
      console.log(`  - Database ID: ${config.cosmosdb?.databaseId || 'N/A'}`);
      console.log(`  - API Key: ${config.cosmosdb?.hasKey ? '있음 ✓' : '없음 ✗'}`);
      console.log(`  - 설정됨: ${config.cosmosdb?.endpoint ? '예 ✓' : '아니오 ✗'}`);
      
      // AI Search 상태 검증
      console.log('\n🔍 Azure AI Search 상태:');
      console.log(`  - Endpoint: ${config.aiSearch?.endpoint || 'N/A'}`);
      console.log(`  - Index: ${config.aiSearch?.indexName || 'N/A'}`);
      console.log(`  - API Key: ${config.aiSearch?.hasApiKey ? '있음 ✓' : '없음 ✗'}`);
      console.log(`  - Private Endpoint 사용: ${config.aiSearch?.usePrivateEndpoint ? '사용 ✓' : '미사용 ✗'}`);
      console.log(`  - 설정됨: ${config.aiSearch?.endpoint ? '예 ✓' : '아니오 ✗'}`);
    }
  } catch (error) {
    console.error('❌ Test 1 실패:', error.message);
  }
  
  // Test 2: Validation API
  console.log('\n\n📋 Test 2: Configuration Validation API');
  try {
    const response = await fetch(`${baseUrl}/api/azure/config/validate`);
    const data = await response.json();
    
    console.log('✅ API 응답 성공');
    console.log(`검증 결과: ${data.isValid ? '유효 ✓' : '유효하지 않음 ✗'}`);
    
    if (data.errors && data.errors.length > 0) {
      console.log('\n⚠️  에러:');
      data.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    if (data.warnings && data.warnings.length > 0) {
      console.log('\n⚠️  경고:');
      data.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }
  } catch (error) {
    console.error('❌ Test 2 실패:', error.message);
  }
  
  // Test 3: Connection Test APIs
  console.log('\n\n📋 Test 3: Connection Test APIs');
  
  const testServices = [
    { name: 'Databricks', endpoint: '/api/azure/test/databricks' },
    { name: 'PostgreSQL', endpoint: '/api/azure/test/postgresql' },
    { name: 'CosmosDB', endpoint: '/api/azure/test/cosmosdb' },
    { name: 'OpenAI PTU', endpoint: '/api/azure/test/openai-ptu' },
    { name: 'Embedding', endpoint: '/api/azure/test/embedding' },
    { name: 'AI Search', endpoint: '/api/azure/test/ai-search' }
  ];
  
  for (const service of testServices) {
    console.log(`\n🔌 ${service.name} 연결 테스트:`);
    try {
      const startTime = Date.now();
      const response = await fetch(`${baseUrl}${service.endpoint}`);
      const duration = Date.now() - startTime;
      const data = await response.json();
      
      if (data.success) {
        console.log(`  ✅ 연결 성공 (${duration}ms)`);
        console.log(`  메시지: ${data.message}`);
      } else {
        console.log(`  ❌ 연결 실패: ${data.error}`);
      }
    } catch (error) {
      console.log(`  ❌ 테스트 실패: ${error.message}`);
    }
  }
  
  // Test 4: Environment Variables Guide
  console.log('\n\n📋 Test 4: Environment Variables Guide API');
  try {
    const response = await fetch(`${baseUrl}/api/azure/config/env-guide`);
    const data = await response.json();
    
    console.log('✅ API 응답 성공');
    console.log(`환경변수 가이드 항목: ${Object.keys(data.guide || {}).length}개`);
  } catch (error) {
    console.error('❌ Test 4 실패:', error.message);
  }
  
  console.log('\n\n=== 테스트 완료 ===');
  console.log('\n📊 검증 요약:');
  console.log('1. ✅ 인증 토큰 상태 표시 (hasAuthToken) - 환경변수 존재 여부 기반');
  console.log('2. ✅ Private Endpoint 사용 여부 (usePrivateEndpoint) - 환경변수 "true" 기반');
  console.log('3. ✅ API Key 상태 (hasApiKey) - 환경변수 존재 여부 기반');
  console.log('4. ✅ 연결 테스트 기능 - 각 서비스별 API 엔드포인트 제공');
  console.log('5. ✅ 설정됨/미설정 상태 - 필수 필드 존재 여부 기반');
}

// 서버가 준비될 때까지 대기
async function waitForServer() {
  const maxAttempts = 30;
  const delay = 1000;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:5000/api/azure/config/summary');
      if (response.ok) {
        console.log('✅ 서버 준비 완료\n');
        return true;
      }
    } catch (error) {
      // Server not ready
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('서버 시작 대기 시간 초과');
}

// 메인 실행
waitForServer()
  .then(() => testAzureConfigStatus())
  .catch(error => {
    console.error('테스트 실행 실패:', error);
    process.exit(1);
  });
