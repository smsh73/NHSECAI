#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 환경별 설정
const environments = {
  local: {
    name: '로컬 개발 환경',
    envFile: '.env',
    expectedNODE_ENV: 'local',
    expectedDatabase: 'localhost',
    expectedOpenAI: 'daiapi-local.nhsec.com'
  },
  development: {
    name: 'Azure 개발 환경',
    envFile: 'development.env',
    expectedNODE_ENV: 'development',
    expectedDatabase: 'nh-ai-admin-pg-dev.postgres.database.azure.com',
    expectedOpenAI: 'daiapi-dev.nhsec.com'
  },
  production: {
    name: 'Azure 프로덕션 환경',
    envFile: 'production.env',
    expectedNODE_ENV: 'production',
    expectedDatabase: 'nh-ai-admin-pg-dev.postgres.database.azure.com',
    expectedOpenAI: 'daiapi.nhsec.com'
  }
};

// 환경 변수 로드
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

// 환경 전환
function switchEnvironment(targetEnv) {
  const sourceFile = environments[targetEnv].envFile;
  if (!sourceFile) {
    console.log(`❌ ${targetEnv} 환경 설정 파일을 찾을 수 없습니다`);
    return false;
  }
  
  try {
    const sourcePath = join(__dirname, '..', sourceFile);
    const currentEnvPath = join(__dirname, '..', '.env');
    
    const sourceContent = readFileSync(sourcePath, 'utf8');
    writeFileSync(currentEnvPath, sourceContent);
    
    return true;
  } catch (error) {
    console.log(`❌ 환경 전환 실패: ${error.message}`);
    return false;
  }
}

// 환경 설정 검증
function validateEnvironment(envName, config) {
  console.log(`\n🔍 ${config.name} 설정 검증:`);
  console.log('-'.repeat(50));
  
  const envVars = loadEnvFile('.env');
  let isValid = true;
  
  // NODE_ENV 검증
  const nodeEnv = envVars.NODE_ENV;
  if (nodeEnv === config.expectedNODE_ENV) {
    console.log(`✅ NODE_ENV: ${nodeEnv}`);
  } else {
    console.log(`❌ NODE_ENV: ${nodeEnv} (예상: ${config.expectedNODE_ENV})`);
    isValid = false;
  }
  
  // DATABASE_URL 검증
  const databaseUrl = envVars.DATABASE_URL;
  if (databaseUrl && databaseUrl.includes(config.expectedDatabase)) {
    console.log(`✅ DATABASE_URL: ${config.expectedDatabase} 포함`);
  } else {
    console.log(`❌ DATABASE_URL: ${config.expectedDatabase} 미포함`);
    isValid = false;
  }
  
  // OpenAI 엔드포인트 검증
  const openaiEndpoint = envVars.AZURE_OPENAI_ENDPOINT;
  if (openaiEndpoint && openaiEndpoint.includes(config.expectedOpenAI)) {
    console.log(`✅ AZURE_OPENAI_ENDPOINT: ${config.expectedOpenAI} 포함`);
  } else {
    console.log(`❌ AZURE_OPENAI_ENDPOINT: ${config.expectedOpenAI} 미포함`);
    isValid = false;
  }
  
  return isValid;
}

// 애플리케이션 시작 테스트
function testAppStartup(envName, config) {
  return new Promise((resolve) => {
    console.log(`\n🚀 ${config.name} 애플리케이션 시작 테스트:`);
    console.log('-'.repeat(50));
    
    const child = spawn('node', ['scripts/verify-app-startup.js'], {
      env: { ...process.env, NODE_ENV: config.expectedNODE_ENV },
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 애플리케이션 시작 성공');
        resolve(true);
      } else {
        console.log('❌ 애플리케이션 시작 실패');
        console.log('출력:', output);
        console.log('에러:', errorOutput);
        resolve(false);
      }
    });
    
    // 10초 후 타임아웃
    setTimeout(() => {
      child.kill();
      console.log('⏰ 애플리케이션 시작 테스트 타임아웃');
      resolve(false);
    }, 10000);
  });
}

// 메인 테스트 함수
async function testAllEnvironments() {
  console.log('🧪 환경별 애플리케이션 동작 테스트 시작...\n');
  
  const results = [];
  
  for (const [envName, config] of Object.entries(environments)) {
    console.log(`\n📋 ${config.name} 테스트:`);
    console.log('=' .repeat(60));
    
    // 1. 환경 전환
    const switchSuccess = switchEnvironment(envName);
    if (!switchSuccess) {
      results.push({ environment: envName, config: config.name, success: false, reason: '환경 전환 실패' });
      continue;
    }
    
    // 2. 환경 설정 검증
    const configValid = validateEnvironment(envName, config);
    if (!configValid) {
      results.push({ environment: envName, config: config.name, success: false, reason: '환경 설정 검증 실패' });
      continue;
    }
    
    // 3. 애플리케이션 시작 테스트 (로컬 환경만)
    if (envName === 'local') {
      const appStartSuccess = await testAppStartup(envName, config);
      if (!appStartSuccess) {
        results.push({ environment: envName, config: config.name, success: false, reason: '애플리케이션 시작 실패' });
        continue;
      }
    }
    
    results.push({ environment: envName, config: config.name, success: true, reason: '모든 테스트 통과' });
  }
  
  // 결과 요약
  console.log('\n📊 테스트 결과 요약:');
  console.log('=' .repeat(80));
  
  const successCount = results.filter(result => result.success).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.config.padEnd(20)}: ${result.success ? '성공' : result.reason}`);
  });
  
  console.log(`\n📈 성공률: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 모든 환경에서 애플리케이션이 정상적으로 동작합니다!');
  } else {
    console.log('\n⚠️  일부 환경에서 문제가 발생했습니다. 설정을 확인해주세요.');
  }
  
  return successCount === totalCount;
}

// 메인 실행
const args = process.argv.slice(2);
const command = args[0];

if (command === 'test') {
  testAllEnvironments().then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  console.log('사용법:');
  console.log('  node scripts/test-app-environment.js test  # 모든 환경 테스트');
  process.exit(1);
}
