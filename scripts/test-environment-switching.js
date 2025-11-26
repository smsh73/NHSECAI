#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
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

// 환경 전환 함수
function switchEnvironment(targetEnv) {
  console.log(`🔄 ${targetEnv} 환경으로 전환 중...`);
  
  const sourceFile = environments[targetEnv];
  if (!sourceFile) {
    console.log(`❌ ${targetEnv} 환경 설정 파일을 찾을 수 없습니다`);
    return false;
  }
  
  try {
    // 현재 .env 파일 백업
    const currentEnvPath = join(__dirname, '..', '.env');
    const backupPath = join(__dirname, '..', '.env.backup');
    
    try {
      const currentEnv = readFileSync(currentEnvPath, 'utf8');
      writeFileSync(backupPath, currentEnv);
      console.log(`📁 현재 .env 파일을 .env.backup으로 백업했습니다`);
    } catch (error) {
      console.log(`⚠️  현재 .env 파일 백업 실패: ${error.message}`);
    }
    
    // 대상 환경 설정을 .env로 복사
    const sourcePath = join(__dirname, '..', sourceFile);
    const sourceContent = readFileSync(sourcePath, 'utf8');
    writeFileSync(currentEnvPath, sourceContent);
    
    console.log(`✅ ${targetEnv} 환경으로 전환 완료`);
    return true;
  } catch (error) {
    console.log(`❌ 환경 전환 실패: ${error.message}`);
    return false;
  }
}

// 환경 전환 테스트
function testEnvironmentSwitching() {
  console.log('🔄 환경 전환 테스트 시작...\n');
  
  const testResults = [];
  
  // 각 환경으로 전환 테스트
  for (const envName of Object.keys(environments)) {
    console.log(`\n📋 ${envName} 환경 전환 테스트:`);
    console.log('-'.repeat(50));
    
    const success = switchEnvironment(envName);
    testResults.push({ environment: envName, success });
    
    if (success) {
      // 전환된 환경 설정 확인
      const currentConfig = loadEnvFile('.env');
      console.log(`  NODE_ENV: ${currentConfig.NODE_ENV || '❌ 설정되지 않음'}`);
      console.log(`  DATABASE_URL: ${currentConfig.DATABASE_URL ? '✅ 설정됨' : '❌ 설정되지 않음'}`);
      console.log(`  AZURE_OPENAI_ENDPOINT: ${currentConfig.AZURE_OPENAI_ENDPOINT || '❌ 설정되지 않음'}`);
    }
  }
  
  // 테스트 결과 요약
  console.log('\n📊 환경 전환 테스트 결과:');
  console.log('=' .repeat(60));
  
  const successCount = testResults.filter(result => result.success).length;
  const totalCount = testResults.length;
  
  testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.environment.padEnd(12)}: ${result.success ? '성공' : '실패'}`);
  });
  
  console.log(`\n📈 성공률: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 모든 환경 전환이 성공적으로 완료되었습니다!');
  } else {
    console.log('\n⚠️  일부 환경 전환에 실패했습니다. 설정을 확인해주세요.');
  }
  
  return successCount === totalCount;
}

// 환경 복원 함수
function restoreEnvironment() {
  console.log('\n🔄 원래 환경으로 복원 중...');
  
  try {
    const backupPath = join(__dirname, '..', '.env.backup');
    const currentEnvPath = join(__dirname, '..', '.env');
    
    const backupContent = readFileSync(backupPath, 'utf8');
    writeFileSync(currentEnvPath, backupContent);
    
    console.log('✅ 원래 환경으로 복원 완료');
    return true;
  } catch (error) {
    console.log(`❌ 환경 복원 실패: ${error.message}`);
    return false;
  }
}

// 메인 실행
const args = process.argv.slice(2);
const command = args[0];

if (command === 'test') {
  const success = testEnvironmentSwitching();
  process.exit(success ? 0 : 1);
} else if (command === 'switch') {
  const targetEnv = args[1];
  if (!targetEnv) {
    console.log('❌ 전환할 환경을 지정해주세요. (local, development, production)');
    process.exit(1);
  }
  
  const success = switchEnvironment(targetEnv);
  process.exit(success ? 0 : 1);
} else if (command === 'restore') {
  const success = restoreEnvironment();
  process.exit(success ? 0 : 1);
} else {
  console.log('사용법:');
  console.log('  node scripts/test-environment-switching.js test        # 환경 전환 테스트');
  console.log('  node scripts/test-environment-switching.js switch <env> # 특정 환경으로 전환');
  console.log('  node scripts/test-environment-switching.js restore    # 원래 환경으로 복원');
  process.exit(1);
}
