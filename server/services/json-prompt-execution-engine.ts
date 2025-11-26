/**
 * JSON 기반 프롬프트 실행 엔진
 * Azure OpenAI PTU 서비스를 사용하여 JSON 형태의 프롬프트를 실행합니다.
 */

import { db } from '../db.js';
import { prompts, workflowSessionData } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { AzureConfigService } from './azure-config.js';
import { parseJsonResponse } from './openai.js';

export interface PromptExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PromptTestResult extends PromptExecutionResult {
  inputData?: any;
  prompt?: any;
}

export class JsonPromptExecutionEngine {
  private openAIConfig: any = null;

  constructor() {
    this.initializeConfig();
  }

  private async initializeConfig() {
    try {
      this.openAIConfig = AzureConfigService.getOpenAIPTUConfig();
    } catch (error) {
      console.warn('Azure OpenAI PTU 설정을 가져올 수 없습니다:', error);
    }
  }

  /**
   * 프롬프트 실행
   */
  async executePrompt(
    promptId: string,
    inputData: any,
    sessionId: string,
    nodeId: string
  ): Promise<PromptExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 프롬프트 정보 조회
      const prompt = await this.getPrompt(promptId);
      if (!prompt) {
        throw new Error(`프롬프트를 찾을 수 없습니다: ${promptId}`);
      }

      // 입력 데이터 검증
      if (prompt.inputSchema) {
        this.validateInputData(inputData, prompt.inputSchema);
      }

      // 프롬프트 템플릿 처리
      const processedPrompt = this.processPromptTemplate(prompt, inputData);

      // Azure OpenAI API 호출
      const response = await this.callAzureOpenAI(processedPrompt, prompt);

      // 응답 파싱 및 검증
      const parsedResponse = this.parseAndValidateResponse(response, prompt);

      // 세션 데이터 저장
      await this.saveSessionData(sessionId, nodeId, promptId, inputData, parsedResponse, startTime);

      return {
        success: true,
        data: parsedResponse,
        executionTime: Date.now() - startTime,
        tokenUsage: response.usage
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // 에러 상태 저장
      await this.saveSessionData(sessionId, nodeId, promptId, inputData, null, startTime, errorMessage);

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * 프롬프트 테스트
   */
  async testPrompt(promptId: string, inputData: any): Promise<PromptTestResult> {
    const result = await this.executePrompt(promptId, inputData, 'test-session', 'test-node');
    
    return {
      ...result,
      inputData,
      prompt: await this.getPrompt(promptId)
    };
  }

  /**
   * 프롬프트 정보 조회
   */
  private async getPrompt(promptId: string): Promise<any> {
    try {
      const [prompt] = await db.select().from(prompts).where(eq(prompts.id, promptId));
      return prompt;
    } catch (error) {
      console.error('프롬프트 조회 실패:', error);
      return null;
    }
  }

  /**
   * 입력 데이터 검증
   */
  private validateInputData(inputData: any, inputSchema: any): void {
    if (!inputSchema || !inputSchema.properties) {
      return;
    }

    const requiredFields = inputSchema.required || [];
    const missingFields = requiredFields.filter(field => !inputData.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      throw new Error(`필수 필드가 누락되었습니다: ${missingFields.join(', ')}`);
    }

    // 타입 검증 (기본적인 검증)
    Object.keys(inputSchema.properties).forEach(field => {
      if (inputData.hasOwnProperty(field)) {
        const expectedType = inputSchema.properties[field].type;
        const actualType = typeof inputData[field];
        
        if (expectedType === 'string' && actualType !== 'string') {
          throw new Error(`필드 '${field}'는 문자열이어야 합니다.`);
        }
        if (expectedType === 'number' && actualType !== 'number') {
          throw new Error(`필드 '${field}'는 숫자여야 합니다.`);
        }
        if (expectedType === 'boolean' && actualType !== 'boolean') {
          throw new Error(`필드 '${field}'는 불린 값이어야 합니다.`);
        }
      }
    });
  }

  /**
   * 프롬프트 템플릿 처리
   */
  private processPromptTemplate(prompt: any, inputData: any): string {
    let processedPrompt = prompt.userPromptTemplate || '';
    
    // {{변수명}} 형태로 변수 치환
    Object.keys(inputData).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedPrompt = processedPrompt.replace(regex, inputData[key]);
    });

    return processedPrompt;
  }

  /**
   * Azure OpenAI API 호출
   */
  private async callAzureOpenAI(processedPrompt: string, prompt: any): Promise<any> {
    if (!this.openAIConfig) {
      throw new Error('Azure OpenAI 설정이 초기화되지 않았습니다.');
    }

    const config = prompt.azureOpenAIConfig || this.openAIConfig;
    
    const requestBody = {
      model: config.model || 'gpt-4.1',
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: processedPrompt }
      ],
      temperature: config.temperature || 0.1,
      max_tokens: config.maxTokens || 1000,
      response_format: prompt.executionType === 'json' ? { type: 'json_object' } : undefined
    };

    const response = await fetch(`${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
        'x-ms-useragent': 'AITradeConsole/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API 호출 실패: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 응답 파싱 및 검증
   */
  private parseAndValidateResponse(response: any, prompt: any): any {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    // Use shared JSON parsing function that handles markdown code blocks
    const parsedResponse = parseJsonResponse(content);

    // 출력 스키마 검증
    if (prompt.outputSchema && prompt.outputSchema.properties) {
      const requiredFields = prompt.outputSchema.required || [];
      const missingFields = requiredFields.filter(field => !parsedResponse.hasOwnProperty(field));
      
      if (missingFields.length > 0) {
        throw new Error(`필수 출력 필드가 누락되었습니다: ${missingFields.join(', ')}`);
      }
    }

    return parsedResponse;
  }

  /**
   * 세션 데이터 저장
   */
  private async saveSessionData(
    sessionId: string,
    nodeId: string,
    promptId: string,
    inputData: any,
    outputData: any,
    startTime: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const executionTime = Date.now() - startTime;
      const executionStatus = outputData ? 'success' : 'failed';

      await db.insert(workflowSessionData).values({
        sessionId,
        dataKey: `${nodeId}_${promptId}`,
        dataValue: outputData || { error: errorMessage },
        dataType: 'object',
        createdBy: nodeId,
        promptId,
        inputData,
        outputData,
        executionStatus,
        errorMessage,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('세션 데이터 저장 실패:', error);
    }
  }
}

export const jsonPromptExecutionEngine = new JsonPromptExecutionEngine();