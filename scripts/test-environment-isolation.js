#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 환경별 설정 파일들
const environments = {
  local: '.env',
  development: 'development.env',
  production: 'production.env'
};

// 환경 변수 로드 함수
function loadEnvFile(envFile) {
  try {
    const envPath = join(__dirname, '..', envFile);
    const envContent = readFileSync(envPath, 'utf8');
    
    const envVars = {};
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      if (line.trim() === '' || line.startsWith('#')) {
        return;
      }
      
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim();
        const cleanValue = value.replace(/^["']|["']$/g, '');
        envVars[key] = cleanValue;
      }
    });
    
    return envVars;
  } catch (error) {
    console.log(`❌ ${envFile} 파일을 읽을 수 없습니다: ${error.message}`);
    return {};
  }
}

// 환경별 격리 테스트
function testEnvironmentIsolation() {
  console.log('🔍 환경별 격리 테스트 시작...\n');
  
  const envConfigs = {};
  
  // 각 환경별 설정 로드
  for (const [envName, envFile] of Object.entries(environments)) {
    console.log(`📁 ${envName} 환경 설정 로드 중...`);
    envConfigs[envName] = loadEnvFile(envFile);
  }
  
  // 핵심 환경 변수들
  const criticalVars = [
    'DATABASE_URL',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_PTU_ENDPOINT',
    'AZURE_OPENAI_EMBEDDING_ENDPOINT',
    'AZURE_DATABRICKS_HOST',
    'AZURE_COSMOS_ENDPOINT',
    'AZURE_SEARCH_ENDPOINT',
    'NODE_ENV'
  ];
  
  console.log('\n📊 환경별 설정 비교:');
  console.log('=' .repeat(80));
  
  for (const varName of criticalVars) {
    console.log(`\n🔑 ${varName}:`);
    console.log('-'.repeat(40));
    
    for (const [envName, config] of Object.entries(envConfigs)) {
      const value = config[varName];
      if (value) {
        // 민감한 정보 마스킹
        const maskedValue = varName.includes('KEY') || varName.includes('PASSWORD') || varName.includes('TOKEN')
          ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
          : value;
        console.log(`  ${envName.padEnd(12)}: ${maskedValue}`);
      } else {
        console.log(`  ${envName.padEnd(12)}: ❌ 설정되지 않음`);
      }
    }
  }
  
  // 격리 검증
  console.log('\n🔒 환경별 격리 검증:');
  console.log('=' .repeat(80));
  
  const isolationIssues = [];
  
  // 1. 데이터베이스 URL 격리 검증
  const dbUrls = Object.values(envConfigs).map(config => config.DATABASE_URL).filter(Boolean);
  const uniqueDbUrls = new Set(dbUrls);
  if (uniqueDbUrls.size < dbUrls.length) {
    isolationIssues.push('❌ 데이터베이스 URL이 중복됩니다 - 환경별로 다른 데이터베이스를 사용해야 합니다');
  } else {
    console.log('✅ 데이터베이스 URL이 환경별로 격리되어 있습니다');
  }
  
  // 2. OpenAI 엔드포인트 격리 검증
  const openaiEndpoints = Object.values(envConfigs).map(config => config.AZURE_OPENAI_ENDPOINT).filter(Boolean);
  const uniqueOpenaiEndpoints = new Set(openaiEndpoints);
  if (uniqueOpenaiEndpoints.size < openaiEndpoints.length) {
    isolationIssues.push('❌ OpenAI 엔드포인트가 중복됩니다 - 환경별로 다른 엔드포인트를 사용해야 합니다');
  } else {
    console.log('✅ OpenAI 엔드포인트가 환경별로 격리되어 있습니다');
  }
  
  // 3. NODE_ENV 검증
  const nodeEnvs = Object.values(envConfigs).map(config => config.NODE_ENV).filter(Boolean);
  const uniqueNodeEnvs = new Set(nodeEnvs);
  if (uniqueNodeEnvs.size < nodeEnvs.length) {
    isolationIssues.push('❌ NODE_ENV가 중복됩니다 - 환경별로 다른 NODE_ENV를 사용해야 합니다');
  } else {
    console.log('✅ NODE_ENV가 환경별로 격리되어 있습니다');
  }
  
  // 결과 출력
  console.log('\n📋 격리 검증 결과:');
  console.log('=' .repeat(80));
  
  if (isolationIssues.length === 0) {
    console.log('✅ 모든 환경이 올바르게 격리되어 있습니다');
  } else {
    console.log('❌ 격리 문제 발견:');
    isolationIssues.forEach(issue => console.log(`  ${issue}`));
  }
  
  // 환경별 권장사항
  console.log('\n💡 환경별 권장사항:');
  console.log('=' .repeat(80));
  console.log('🏠 로컬 환경:');
  console.log('  - DATABASE_URL: localhost PostgreSQL 사용');
  console.log('  - NODE_ENV: development');
  console.log('  - 외부 서비스: Mock 또는 테스트용 엔드포인트 사용');
  
  console.log('\n🔧 개발 환경:');
  console.log('  - DATABASE_URL: 개발용 Azure PostgreSQL 사용');
  console.log('  - NODE_ENV: development');
  console.log('  - 외부 서비스: 개발용 Azure 서비스 사용');
  
  console.log('\n🚀 프로덕션 환경:');
  console.log('  - DATABASE_URL: 프로덕션용 Azure PostgreSQL 사용');
  console.log('  - NODE_ENV: production');
  console.log('  - 외부 서비스: 프로덕션용 Azure 서비스 사용');
  
  return isolationIssues.length === 0;
}

// 테스트 실행
const isIsolated = testEnvironmentIsolation();
process.exit(isIsolated ? 0 : 1);
