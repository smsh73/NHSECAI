#!/usr/bin/env node

/**
 * 환경변수 로드 및 검증 스크립트
 * .env 파일을 직접 읽어서 환경변수를 설정합니다.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드 함수
function loadEnvFile() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    
    const lines = envContent.split('\n');
    lines.forEach(line => {
      // 주석이나 빈 줄 무시
      if (line.trim() === '' || line.startsWith('#')) {
        return;
      }
      
      // KEY=VALUE 형태 파싱
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim();
        
        // 따옴표 제거
        const cleanValue = value.replace(/^["']|["']$/g, '');
        
        // 환경변수 설정
        if (!process.env[key]) {
          process.env[key] = cleanValue;
        }
      }
    });
    
    console.log('✅ .env 파일 로드 완료');
    return true;
  } catch (error) {
    console.log(`❌ .env 파일 로드 실패: ${error.message}`);
    return false;
  }
}

console.log('🔍 환경변수 검증 시작\n');

// .env 파일 로드
if (!loadEnvFile()) {
  process.exit(1);
}

// 필수 환경변수 목록
const requiredEnvVars = [
  'AZURE_CLIENT_ID',
  'AZURE_TENANT_ID',
  'AZURE_COSMOS_ENDPOINT',
  'AZURE_COSMOS_KEY',
  'AZURE_DATABRICKS_HOST',
  'AZURE_DATABRICKS_HTTP_PATH',
  'AZURE_DATABRICKS_TOKEN',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_POSTGRES_HOST',
  'AZURE_POSTGRES_DATABASE',
  'AZURE_POSTGRES_USERNAME',
  'AZURE_POSTGRES_PASSWORD',
  'DATABASE_URL',
  'NODE_ENV'
];

// 선택적 환경변수 목록
const optionalEnvVars = [
  'AZURE_CLIENT_SECRET',
  'AZURE_COSMOS_PRIVATE_ENDPOINT_URL',
  'AZURE_DATABRICKS_PRIVATE_ENDPOINT_URL',
  'AZURE_KEYVAULT_URL',
  'AZURE_OPENAI_API_VERSION',
  'AZURE_OPENAI_DEPLOYMENT',
  'AZURE_OPENAI_PRIVATE_ENDPOINT_URL',
  'AZURE_OPENAI_EMBEDDING_API_VERSION',
  'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
  'AZURE_OPENAI_EMBEDDING_ENDPOINT',
  'AZURE_OPENAI_EMBEDDING_KEY',
  'AZURE_OPENAI_EMBEDDING_MODEL',
  'AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL',
  'AZURE_OPENAI_PTU_API_VERSION',
  'AZURE_OPENAI_PTU_DEPLOYMENT',
  'AZURE_OPENAI_PTU_ENDPOINT',
  'AZURE_OPENAI_PTU_KEY',
  'AZURE_OPENAI_PTU_MODEL',
  'AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL',
  'AZURE_POSTGRES_PRIVATE_ENDPOINT_URL',
  'AZURE_SEARCH_ENDPOINT',
  'AZURE_SEARCH_INDEX_NAME',
  'AZURE_SEARCH_KEY',
  'AZURE_SEARCH_PRIVATE_ENDPOINT_URL',
  'DOCKER_REGISTRY_SERVER_URL',
  'OPENAI_API_KEY',
  'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
];

// 환경변수 검증 함수
function checkEnvironmentVariables() {
  const results = {
    required: { passed: 0, failed: 0, missing: [] },
    optional: { passed: 0, failed: 0, missing: [] },
    total: 0
  };

  console.log('📋 필수 환경변수 검증:');
  console.log('─'.repeat(50));
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value && value.trim() !== '') {
      console.log(`✅ ${envVar}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
      results.required.passed++;
    } else {
      console.log(`❌ ${envVar}: 설정되지 않음`);
      results.required.failed++;
      results.required.missing.push(envVar);
    }
    results.total++;
  });

  console.log('\n📋 선택적 환경변수 검증:');
  console.log('─'.repeat(50));
  
  optionalEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value && value.trim() !== '') {
      console.log(`✅ ${envVar}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
      results.optional.passed++;
    } else {
      console.log(`⚠️  ${envVar}: 설정되지 않음 (선택사항)`);
      results.optional.failed++;
      results.optional.missing.push(envVar);
    }
    results.total++;
  });

  return results;
}

// Azure 서비스별 환경변수 그룹 검증
function checkAzureServices() {
  console.log('\n🔧 Azure 서비스별 환경변수 검증:');
  console.log('═'.repeat(60));

  const services = {
    'Azure Identity': {
      required: ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID'],
      optional: ['AZURE_CLIENT_SECRET', 'AZURE_USE_SYSTEM_MANAGED_IDENTITY']
    },
    'Azure CosmosDB': {
      required: ['AZURE_COSMOS_ENDPOINT', 'AZURE_COSMOS_KEY', 'AZURE_COSMOS_DATABASE_ID'],
      optional: ['AZURE_COSMOS_PRIVATE_ENDPOINT_URL']
    },
    'Azure Databricks': {
      required: ['AZURE_DATABRICKS_HOST', 'AZURE_DATABRICKS_HTTP_PATH', 'AZURE_DATABRICKS_TOKEN'],
      optional: ['AZURE_DATABRICKS_PRIVATE_ENDPOINT_URL', 'AZURE_DATABRICKS_USE_PRIVATE_ENDPOINT']
    },
    'Azure OpenAI': {
      required: ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_KEY'],
      optional: ['AZURE_OPENAI_API_VERSION', 'AZURE_OPENAI_DEPLOYMENT', 'AZURE_OPENAI_PRIVATE_ENDPOINT_URL']
    },
    'Azure OpenAI Embedding': {
      required: ['AZURE_OPENAI_EMBEDDING_ENDPOINT', 'AZURE_OPENAI_EMBEDDING_KEY'],
      optional: ['AZURE_OPENAI_EMBEDDING_API_VERSION', 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'AZURE_OPENAI_EMBEDDING_MODEL', 'AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL', 'AZURE_OPENAI_EMBEDDING_USE_PRIVATE_ENDPOINT']
    },
    'Azure OpenAI PTU': {
      required: ['AZURE_OPENAI_PTU_ENDPOINT', 'AZURE_OPENAI_PTU_KEY'],
      optional: ['AZURE_OPENAI_PTU_API_VERSION', 'AZURE_OPENAI_PTU_DEPLOYMENT', 'AZURE_OPENAI_PTU_MODEL', 'AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL', 'AZURE_OPENAI_PTU_USE_PRIVATE_ENDPOINT']
    },
    'Azure PostgreSQL': {
      required: ['AZURE_POSTGRES_HOST', 'AZURE_POSTGRES_DATABASE', 'AZURE_POSTGRES_USERNAME', 'AZURE_POSTGRES_PASSWORD'],
      optional: ['AZURE_POSTGRES_PORT', 'AZURE_POSTGRES_SSL', 'AZURE_POSTGRES_PRIVATE_ENDPOINT_URL']
    },
    'Azure Search': {
      required: ['AZURE_SEARCH_ENDPOINT', 'AZURE_SEARCH_KEY'],
      optional: ['AZURE_SEARCH_INDEX_NAME', 'AZURE_SEARCH_PRIVATE_ENDPOINT_URL', 'AZURE_SEARCH_USE_PRIVATE_ENDPOINT']
    }
  };

  Object.entries(services).forEach(([serviceName, vars]) => {
    console.log(`\n📦 ${serviceName}:`);
    
    // 필수 변수 검증
    const requiredMissing = vars.required.filter(envVar => !process.env[envVar] || process.env[envVar].trim() === '');
    const optionalMissing = vars.optional.filter(envVar => !process.env[envVar] || process.env[envVar].trim() === '');
    
    if (requiredMissing.length === 0) {
      console.log(`  ✅ 필수 변수: 모두 설정됨 (${vars.required.length}개)`);
    } else {
      console.log(`  ❌ 필수 변수: ${requiredMissing.length}개 누락 - ${requiredMissing.join(', ')}`);
    }
    
    if (optionalMissing.length === 0) {
      console.log(`  ✅ 선택 변수: 모두 설정됨 (${vars.optional.length}개)`);
    } else {
      console.log(`  ⚠️  선택 변수: ${optionalMissing.length}개 누락 - ${optionalMissing.join(', ')}`);
    }
  });
}

// 메인 검증 실행
function runValidation() {
  const results = checkEnvironmentVariables();
  checkAzureServices();

  console.log('\n📊 검증 결과 요약:');
  console.log('═'.repeat(60));
  console.log(`📋 필수 환경변수: ${results.required.passed}/${results.required.passed + results.required.failed} 통과`);
  console.log(`📋 선택적 환경변수: ${results.optional.passed}/${results.optional.passed + results.optional.failed} 설정됨`);
  console.log(`📋 전체 환경변수: ${results.total}개 검사됨`);

  if (results.required.failed > 0) {
    console.log('\n❌ 누락된 필수 환경변수:');
    results.required.missing.forEach(envVar => {
      console.log(`   - ${envVar}`);
    });
    console.log('\n⚠️  애플리케이션 시작에 문제가 있을 수 있습니다.');
    return false;
  } else {
    console.log('\n🎉 모든 필수 환경변수가 설정되었습니다!');
    console.log('✅ 애플리케이션을 안전하게 시작할 수 있습니다.');
    return true;
  }
}

// 스크립트 실행
const isValid = runValidation();
process.exit(isValid ? 0 : 1);
