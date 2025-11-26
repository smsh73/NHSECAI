import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { db } from '../db.js';
import { workflowSessionData } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

export interface PythonExecutionConfig {
  script: string;
  requirements?: string;
  timeout?: number;
  environment?: string;
  inputFormat?: 'json' | 'csv' | 'text';
  outputFormat?: 'json' | 'csv' | 'text';
  workingDirectory?: string;
  memoryLimit?: number;
  cpuLimit?: number;
}

export interface PythonExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export interface PythonExecutionContext {
  sessionId: string;
  nodeId: string;
  inputData: any;
  config: PythonExecutionConfig;
}

export class PythonExecutionEngine {
  private tempDir: string;
  private activeProcesses: Map<string, ChildProcess> = new Map();

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'aitrade-python-executions');
    this.ensureTempDirectory();
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Python 스크립트 실행
   */
  async executeScript(context: PythonExecutionContext): Promise<PythonExecutionResult> {
    const startTime = Date.now();
    const executionId = randomUUID();
    
    try {
      // 1. 임시 디렉토리 생성
      const executionDir = path.join(this.tempDir, executionId);
      await fs.mkdir(executionDir, { recursive: true });

      // 2. 입력 데이터 준비
      const inputFile = await this.prepareInputData(context, executionDir);

      // 3. Python 스크립트 파일 생성
      const scriptFile = await this.createScriptFile(context, executionDir, inputFile);

      // 4. requirements.txt 생성 (있는 경우)
      if (context.config.requirements) {
        await this.createRequirementsFile(context, executionDir);
      }

      // 5. Python 스크립트 실행
      const result = await this.runPythonScript(scriptFile, executionDir, context);

      // 6. 결과 처리
      const output = await this.processOutput(result.stdout, context.config.outputFormat || 'json');

      // 7. 세션 데이터 저장
      await this.saveSessionData(context, {
        success: true,
        output,
        executionTime: Date.now() - startTime,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      });

      // 8. 임시 파일 정리
      await this.cleanup(executionDir);

      return {
        success: true,
        output,
        executionTime: Date.now() - startTime,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // 에러 발생 시 세션 데이터 저장
      await this.saveSessionData(context, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      };
    }
  }

  /**
   * 입력 데이터 준비
   */
  private async prepareInputData(context: PythonExecutionContext, executionDir: string): Promise<string> {
    const inputFile = path.join(executionDir, 'input.json');
    
    // JSON 형태로 입력 데이터 저장
    const inputData = {
      sessionId: context.sessionId,
      nodeId: context.nodeId,
      data: context.inputData,
      timestamp: new Date().toISOString()
    };

    await fs.writeFile(inputFile, JSON.stringify(inputData, null, 2), 'utf-8');
    return inputFile;
  }

  /**
   * Python 스크립트 파일 생성
   */
  private async createScriptFile(
    context: PythonExecutionContext, 
    executionDir: string, 
    inputFile: string
  ): Promise<string> {
    const scriptFile = path.join(executionDir, 'script.py');
    
    // 기본 Python 스크립트 템플릿
    const scriptTemplate = `
import json
import sys
import os
from datetime import datetime
import traceback

def main():
    try:
        # 입력 데이터 로드
        with open('${inputFile}', 'r', encoding='utf-8') as f:
            input_data = json.load(f)
        
        # 사용자 정의 스크립트 실행
        ${context.config.script}
        
        # 결과 출력 (JSON 형태)
        result = {
            "success": True,
            "data": locals().get('result', None),
            "output": locals().get('output', None),
            "processed_data": locals().get('processed_data', None),
            "timestamp": datetime.now().isoformat()
        }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "timestamp": datetime.now().isoformat()
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
`;

    await fs.writeFile(scriptFile, scriptTemplate, 'utf-8');
    return scriptFile;
  }

  /**
   * requirements.txt 파일 생성
   */
  private async createRequirementsFile(context: PythonExecutionContext, executionDir: string): Promise<void> {
    const requirementsFile = path.join(executionDir, 'requirements.txt');
    await fs.writeFile(requirementsFile, context.config.requirements || '', 'utf-8');
  }

  /**
   * Python 스크립트 실행
   */
  private async runPythonScript(
    scriptFile: string, 
    executionDir: string, 
    context: PythonExecutionContext
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
      const timeout = context.config.timeout || 30;
      const pythonCmd = context.config.environment || 'python3';
      
      const args = [scriptFile];
      const options = {
        cwd: executionDir,
        env: {
          ...process.env,
          PYTHONPATH: executionDir,
          PYTHONUNBUFFERED: '1'
        }
      };

      const child = spawn(pythonCmd, args, options);
      const processId = randomUUID();
      this.activeProcesses.set(processId, child);

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        this.activeProcesses.delete(processId);
        reject(new Error(`Python script execution timeout after ${timeout} seconds`));
      }, timeout * 1000);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        this.activeProcesses.delete(processId);
        resolve({
          stdout,
          stderr,
          exitCode: code
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        this.activeProcesses.delete(processId);
        reject(error);
      });
    });
  }

  /**
   * 출력 데이터 처리
   */
  private async processOutput(stdout: string, outputFormat: string): Promise<any> {
    try {
      // JSON 출력 파싱 시도
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      
      try {
        const result = JSON.parse(lastLine);
        return result;
      } catch {
        // JSON 파싱 실패 시 텍스트로 반환
        return {
          success: true,
          output: stdout,
          format: 'text'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process output',
        raw_output: stdout
      };
    }
  }

  /**
   * 세션 데이터 저장
   */
  private async saveSessionData(context: PythonExecutionContext, result: any): Promise<void> {
    try {
      const dataKey = `${context.nodeId}_output`;
      const dataType = this.getDataType(result.output || result);
      const outputData = result.output || result;
      
      // upsert 방식으로 저장
      const existing = await db.select()
        .from(workflowSessionData)
        .where(
          and(
            eq(workflowSessionData.sessionId, context.sessionId),
            eq(workflowSessionData.dataKey, dataKey)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 업데이트
        await db.update(workflowSessionData)
          .set({
            dataValue: outputData,
            dataType,
            outputData: outputData,
            executionStatus: result.success ? 'success' : 'error',
            errorMessage: result.error || null,
            updatedAt: new Date()
          })
          .where(eq(workflowSessionData.id, existing[0].id));
      } else {
        // 새로 생성
        await db.insert(workflowSessionData).values({
          sessionId: context.sessionId,
          dataKey,
          dataValue: outputData,
          dataType,
          outputData: outputData,
          executionStatus: result.success ? 'success' : 'error',
          errorMessage: result.error || null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  }

  /**
   * 데이터 타입 결정
   */
  private getDataType(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  /**
   * 임시 파일 정리
   */
  private async cleanup(executionDir: string): Promise<void> {
    try {
      await fs.rm(executionDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup temp directory:', error);
    }
  }

  /**
   * 실행 중인 프로세스 종료
   */
  async terminateExecution(processId: string): Promise<void> {
    const process = this.activeProcesses.get(processId);
    if (process) {
      process.kill('SIGTERM');
      this.activeProcesses.delete(processId);
    }
  }

  /**
   * 모든 실행 중인 프로세스 종료
   */
  async terminateAllExecutions(): Promise<void> {
    for (const [processId, process] of this.activeProcesses) {
      process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
  }

  /**
   * Python 환경 검증
   */
  async validatePythonEnvironment(): Promise<{ available: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      const child = spawn('python3', ['--version'], { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            available: true,
            version: stdout.trim()
          });
        } else {
          resolve({
            available: false,
            error: stderr || 'Python3 not found'
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          available: false,
          error: error.message
        });
      });
    });
  }

  /**
   * Python 패키지 설치
   */
  async installRequirements(requirements: string, executionDir: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('pip3', ['install', '-r', 'requirements.txt'], {
        cwd: executionDir,
        stdio: 'pipe'
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }
}

// 싱글톤 인스턴스
export const pythonExecutionEngine = new PythonExecutionEngine();
