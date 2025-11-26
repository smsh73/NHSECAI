#!/usr/bin/env node

/**
 * 애플리케이션 시작 검증 스크립트
 * 환경변수 로드 및 서버 시작을 확인합니다.
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 애플리케이션 시작 검증 시작\n');

// 환경변수 로드
function loadEnvFile() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf8');
    
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

// 서버 시작 테스트
function testServerStartup() {
  return new Promise((resolve) => {
    console.log('\n🔧 서버 시작 테스트...');
    
    const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
      cwd: join(__dirname, '..'),
      env: { ...process.env, PORT: '5002', NODE_ENV: 'development' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let serverStarted = false;
    let serverOutput = '';

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      if (output.includes('serving on port') && !serverStarted) {
        console.log('✅ 서버가 성공적으로 시작되었습니다');
        serverStarted = true;
        
        // 서버가 시작되면 프로세스 종료
        setTimeout(() => {
          serverProcess.kill();
          resolve(true);
        }, 2000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      if (output.includes('Error:') || output.includes('ENOTSUP')) {
        console.log('❌ 서버 시작 실패');
        console.log('오류:', output);
        serverProcess.kill();
        resolve(false);
      }
    });

    // 10초 후 타임아웃
    setTimeout(() => {
      if (!serverStarted) {
        console.log('❌ 서버 시작 타임아웃');
        console.log('서버 출력:', serverOutput);
        serverProcess.kill();
        resolve(false);
      }
    }, 10000);
  });
}

// API 엔드포인트 테스트
async function testApiEndpoints() {
  console.log('\n🌐 API 엔드포인트 테스트...');
  
  try {
    const response = await fetch('http://localhost:5002/api/system/status');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API 엔드포인트 응답 성공:', data);
      return true;
    } else {
      console.log('❌ API 엔드포인트 응답 실패:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ API 엔드포인트 연결 실패:', error.message);
    return false;
  }
}

// 메인 검증 실행
async function runVerification() {
  console.log('📋 1단계: 환경변수 로드');
  if (!loadEnvFile()) {
    console.log('\n❌ 환경변수 로드 실패');
    return false;
  }

  console.log('\n📋 2단계: 서버 시작 테스트');
  const serverStarted = await testServerStartup();
  if (!serverStarted) {
    console.log('\n❌ 서버 시작 실패');
    return false;
  }

  console.log('\n📋 3단계: API 엔드포인트 테스트');
  const apiWorking = await testApiEndpoints();
  if (!apiWorking) {
    console.log('\n❌ API 엔드포인트 테스트 실패');
    return false;
  }

  console.log('\n🎉 모든 검증이 완료되었습니다!');
  console.log('✅ 환경변수가 정상적으로 로드되었습니다');
  console.log('✅ 서버가 정상적으로 시작되었습니다');
  console.log('✅ API 엔드포인트가 정상적으로 작동합니다');
  console.log('\n🚀 애플리케이션을 안전하게 사용할 수 있습니다!');
  
  return true;
}

// 스크립트 실행
runVerification().then(success => {
  process.exit(success ? 0 : 1);
});
