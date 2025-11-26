#!/usr/bin/env node

/**
 * Python 노드 통합 테스트 스크립트
 * 
 * 이 스크립트는 Python 실행 엔진의 기본 기능을 테스트합니다.
 * - Python 환경 검증
 * - 간단한 Python 스크립트 실행
 * - 에러 처리 테스트
 * - 워크플로우 엔진 통합 테스트
 */

import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

class PythonNodeIntegrationTest {
  constructor() {
    this.results = [];
    this.tempDir = path.join(os.tmpdir(), 'python-node-test');
  }

  async runAllTests() {
    console.log('🚀 Python 노드 통합 테스트 시작...\n');

    await this.ensureTempDirectory();

    // 테스트 실행
    await this.testPythonEnvironment();
    await this.testBasicPythonExecution();
    await this.testPythonWithRequirements();
    await this.testErrorHandling();
    await this.testJsonInputOutput();
    await this.testTimeoutHandling();

    // 결과 출력
    this.printResults();
  }

  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('❌ 임시 디렉토리 생성 실패:', error);
    }
  }

  async testPythonEnvironment() {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Python 환경 검증 테스트...');
      
      const result = await this.executeCommand('python3', ['--version']);
      
      if (result.success && result.stdout.includes('Python 3')) {
        this.results.push({
          name: 'Python 환경 검증',
          success: true,
          duration: Date.now() - startTime,
          details: { version: result.stdout.trim() }
        });
        console.log('✅ Python 환경 검증 성공');
      } else {
        throw new Error('Python 3가 설치되지 않았거나 접근할 수 없습니다');
      }
    } catch (error) {
      this.results.push({
        name: 'Python 환경 검증',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log('❌ Python 환경 검증 실패:', error);
    }
  }

  async testBasicPythonExecution() {
    const startTime = Date.now();
    
    try {
      console.log('🐍 기본 Python 실행 테스트...');
      
      const script = `
import json
import sys

# 간단한 계산 수행
data = {'numbers': [1, 2, 3, 4, 5]}
result = {
    'sum': sum(data['numbers']),
    'average': sum(data['numbers']) / len(data['numbers']),
    'count': len(data['numbers'])
}

print(json.dumps(result))
`;

      const result = await this.executePythonScript(script);
      
      if (result.success && result.output) {
        const parsed = result.output;
        if (typeof parsed === 'object' && parsed.sum === 15 && parsed.average === 3 && parsed.count === 5) {
          this.results.push({
            name: '기본 Python 실행',
            success: true,
            duration: Date.now() - startTime,
            details: { output: parsed }
          });
          console.log('✅ 기본 Python 실행 성공');
        } else {
          throw new Error('예상된 결과와 다릅니다');
        }
      } else {
        throw new Error(result.error || 'Python 실행 실패');
      }
    } catch (error) {
      this.results.push({
        name: '기본 Python 실행',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log('❌ 기본 Python 실행 실패:', error);
    }
  }

  async testPythonWithRequirements() {
    const startTime = Date.now();
    
    try {
      console.log('📦 Python 패키지 요구사항 테스트...');
      
      const script = `
import json
import math

# math 모듈 사용
result = {
    'pi': math.pi,
    'sqrt_16': math.sqrt(16),
    'sin_pi_2': math.sin(math.pi / 2)
}

print(json.dumps(result))
`;

      const result = await this.executePythonScript(script);
      
      if (result.success && result.output) {
        const parsed = result.output;
        if (typeof parsed === 'object' && parsed.sqrt_16 === 4 && parsed.sin_pi_2 === 1) {
          this.results.push({
            name: 'Python 패키지 요구사항',
            success: true,
            duration: Date.now() - startTime,
            details: { output: parsed }
          });
          console.log('✅ Python 패키지 요구사항 성공');
        } else {
          throw new Error('예상된 결과와 다릅니다');
        }
      } else {
        throw new Error(result.error || 'Python 실행 실패');
      }
    } catch (error) {
      this.results.push({
        name: 'Python 패키지 요구사항',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log('❌ Python 패키지 요구사항 실패:', error);
    }
  }

  async testErrorHandling() {
    const startTime = Date.now();
    
    try {
      console.log('⚠️ 에러 처리 테스트...');
      
      const script = `
import json

# 의도적으로 에러 발생
undefined_variable = some_undefined_variable + 1
`;

      const result = await this.executePythonScript(script);
      
      if (!result.success && result.error) {
        this.results.push({
          name: '에러 처리',
          success: true,
          duration: Date.now() - startTime,
          details: { error: result.error }
        });
        console.log('✅ 에러 처리 성공');
      } else {
        throw new Error('에러가 제대로 처리되지 않았습니다');
      }
    } catch (error) {
      this.results.push({
        name: '에러 처리',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log('❌ 에러 처리 실패:', error);
    }
  }

  async testJsonInputOutput() {
    const startTime = Date.now();
    
    try {
      console.log('📄 JSON 입출력 테스트...');
      
      const inputData = {
        sessionId: 'test-session',
        nodeId: 'test-node',
        data: { items: [1, 2, 3, 4, 5], multiplier: 2 },
        timestamp: new Date().toISOString()
      };

      const script = `
import json
import sys

# 입력 데이터 로드
with open('input.json', 'r', encoding='utf-8') as f:
    input_data = json.load(f)

# 데이터 처리
data = input_data['data']
processed_items = [item * data['multiplier'] for item in data['items']]

result = {
    'success': True,
    'processed_items': processed_items,
    'total': sum(processed_items),
    'count': len(processed_items)
}

print(json.dumps(result, ensure_ascii=False, indent=2))
`;

      const result = await this.executePythonScriptWithInput(script, inputData);
      
      if (result.success && result.output) {
        const parsed = result.output;
        console.log('JSON 입출력 테스트 결과:', parsed);
        if (parsed && parsed.success === true && parsed.total === 30 && parsed.count === 5) {
          this.results.push({
            name: 'JSON 입출력',
            success: true,
            duration: Date.now() - startTime,
            details: { output: parsed }
          });
          console.log('✅ JSON 입출력 성공');
        } else {
          throw new Error('예상된 결과와 다릅니다');
        }
      } else {
        throw new Error(result.error || 'Python 실행 실패');
      }
    } catch (error) {
      this.results.push({
        name: 'JSON 입출력',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log('❌ JSON 입출력 실패:', error);
    }
  }

  async testTimeoutHandling() {
    const startTime = Date.now();
    
    try {
      console.log('⏰ 타임아웃 처리 테스트...');
      
      const script = `
import json
import time

# 5초 대기 (타임아웃 테스트용)
time.sleep(5)

result = {'message': 'This should timeout'}
print(json.dumps(result))
`;

      const result = await this.executePythonScript(script, 2); // 2초 타임아웃
      
      if (!result.success && result.error && result.error.includes('timeout')) {
        this.results.push({
          name: '타임아웃 처리',
          success: true,
          duration: Date.now() - startTime,
          details: { error: result.error }
        });
        console.log('✅ 타임아웃 처리 성공');
      } else {
        throw new Error('타임아웃이 제대로 처리되지 않았습니다');
      }
    } catch (error) {
      this.results.push({
        name: '타임아웃 처리',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log('❌ 타임아웃 처리 실패:', error);
    }
  }

  async executePythonScript(script, timeout = 10) {
    const executionId = randomUUID();
    const executionDir = path.join(this.tempDir, executionId);
    
    try {
      await fs.mkdir(executionDir, { recursive: true });
      
      // 스크립트 파일 생성
      const scriptFile = path.join(executionDir, 'script.py');
      await fs.writeFile(scriptFile, script, 'utf-8');
      
      // Python 실행
      const result = await this.executeCommand('python3', [scriptFile], executionDir, timeout);
      
      // 결과 처리
      let output = null;
      if (result.success && result.stdout) {
        try {
          const lines = result.stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          // JSON 파싱 시도
          if (lastLine && lastLine.startsWith('{') && lastLine.endsWith('}')) {
            output = JSON.parse(lastLine);
          } else {
            output = result.stdout;
          }
        } catch {
          output = result.stdout;
        }
      }
      
      return {
        success: result.success,
        output,
        error: result.error,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      // 정리
      try {
        await fs.rm(executionDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('임시 디렉토리 정리 실패:', error);
      }
    }
  }

  async executePythonScriptWithInput(script, inputData, timeout = 10) {
    const executionId = randomUUID();
    const executionDir = path.join(this.tempDir, executionId);
    
    try {
      await fs.mkdir(executionDir, { recursive: true });
      
      // 입력 데이터 파일 생성
      const inputFile = path.join(executionDir, 'input.json');
      await fs.writeFile(inputFile, JSON.stringify(inputData, null, 2), 'utf-8');
      
      // 스크립트 파일 생성
      const scriptFile = path.join(executionDir, 'script.py');
      await fs.writeFile(scriptFile, script, 'utf-8');
      
      // Python 실행
      const result = await this.executeCommand('python3', [scriptFile], executionDir, timeout);
      
      // 결과 처리
      let output = null;
      if (result.success && result.stdout) {
        try {
          // 전체 stdout을 JSON으로 파싱 시도
          const trimmedStdout = result.stdout.trim();
          if (trimmedStdout && (trimmedStdout.startsWith('{') || trimmedStdout.startsWith('['))) {
            output = JSON.parse(trimmedStdout);
          } else {
            output = result.stdout;
          }
        } catch (parseError) {
          output = result.stdout;
        }
      }
      
      return {
        success: result.success,
        output,
        error: result.error,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      // 정리
      try {
        await fs.rm(executionDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('임시 디렉토리 정리 실패:', error);
      }
    }
  }

  async executeCommand(command, args, cwd, timeout = 10) {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: `Command timeout after ${timeout} seconds`,
          stdout,
          stderr,
          exitCode: null
        });
      }, timeout * 1000);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: code === 0,
          error: code !== 0 ? `Command failed with exit code ${code}` : null,
          stdout,
          stderr,
          exitCode: code
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: error.message,
          stdout,
          stderr,
          exitCode: null
        });
      });
    });
  }

  printResults() {
    console.log('\n📊 테스트 결과 요약:');
    console.log('='.repeat(50));
    
    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    
    console.log(`총 테스트: ${totalCount}`);
    console.log(`성공: ${successCount}`);
    console.log(`실패: ${totalCount - successCount}`);
    console.log(`성공률: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    console.log('\n📋 상세 결과:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${index + 1}. ${status} ${result.name} (${duration})`);
      
      if (!result.success && result.error) {
        console.log(`   에러: ${result.error}`);
      }
      
      if (result.details) {
        console.log(`   상세: ${JSON.stringify(result.details, null, 2)}`);
      }
    });
    
    console.log('\n' + '='.repeat(50));
    
    if (successCount === totalCount) {
      console.log('🎉 모든 테스트가 성공했습니다!');
    } else {
      console.log('⚠️ 일부 테스트가 실패했습니다.');
    }
  }
}

// 테스트 실행
const test = new PythonNodeIntegrationTest();
test.runAllTests().catch(console.error);

export { PythonNodeIntegrationTest };
