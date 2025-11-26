/**
 * API 호출 엔진
 * JSON 형태의 파라미터로 API를 호출하고 결과를 JSON으로 반환합니다.
 */

import { db } from '../db.js';
import { apiCalls, workflowSessionData } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface ApiCallResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  httpStatusCode?: number;
  responseSize?: number;
}

export interface ApiTestResult extends ApiCallResult {
  inputData?: any;
  apiCall?: any;
}

export class ApiCallEngine {
  /**
   * API 호출 실행
   */
  async executeApiCall(
    apiCallId: string,
    inputData: any,
    sessionId: string,
    nodeId: string
  ): Promise<ApiCallResult> {
    const startTime = Date.now();
    
    try {
      // API 정보 조회
      const apiCall = await this.getApiCall(apiCallId);
      if (!apiCall) {
        throw new Error(`API를 찾을 수 없습니다: ${apiCallId}`);
      }

      // 입력 데이터 검증
      if (apiCall.requestSchema) {
        this.validateInputData(inputData, apiCall.requestSchema);
      }

      // 파라미터 템플릿 처리
      const processedParams = this.processParameterTemplate(apiCall, inputData);

      // API 호출
      const response = await this.callApi(apiCall, processedParams);

      // 응답 파싱 및 검증
      const parsedResponse = this.parseAndValidateResponse(response, apiCall);

      // 세션 데이터 저장
      await this.saveSessionData(sessionId, nodeId, apiCallId, inputData, parsedResponse, startTime, response.status);

      return {
        success: true,
        data: parsedResponse,
        executionTime: Date.now() - startTime,
        httpStatusCode: response.status,
        responseSize: JSON.stringify(parsedResponse).length
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // 에러 상태 저장
      await this.saveSessionData(sessionId, nodeId, apiCallId, inputData, null, startTime, 500, errorMessage);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        httpStatusCode: 500
      };
    }
  }

  /**
   * API 테스트
   */
  async testApiCall(apiCallId: string, inputData: any): Promise<ApiTestResult> {
    const result = await this.executeApiCall(apiCallId, inputData, 'test-session', 'test-node');
    
    return {
      ...result,
      inputData,
      apiCall: await this.getApiCall(apiCallId)
    };
  }

  /**
   * API 정보 조회
   */
  private async getApiCall(apiCallId: string): Promise<any> {
    try {
      const [apiCall] = await db.select().from(apiCalls).where(eq(apiCalls.id, apiCallId));
      return apiCall;
    } catch (error) {
      console.error('API 조회 실패:', error);
      return null;
    }
  }

  /**
   * 입력 데이터 검증
   */
  private validateInputData(inputData: any, requestSchema: any): void {
    if (!requestSchema || !requestSchema.properties) {
      return;
    }

    const requiredFields = requestSchema.required || [];
    const missingFields = requiredFields.filter(field => !inputData.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      throw new Error(`필수 필드가 누락되었습니다: ${missingFields.join(', ')}`);
    }

    // 타입 검증
    Object.keys(requestSchema.properties).forEach(field => {
      if (inputData.hasOwnProperty(field)) {
        const expectedType = requestSchema.properties[field].type;
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
   * 파라미터 템플릿 처리
   */
  private processParameterTemplate(apiCall: any, inputData: any): any {
    if (!apiCall.parameterTemplate) {
      return inputData;
    }

    let processedTemplate = apiCall.parameterTemplate;
    
    // {{변수명}} 형태로 변수 치환
    Object.keys(inputData).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, JSON.stringify(inputData[key]));
    });

    try {
      return JSON.parse(processedTemplate);
    } catch (error) {
      // JSON 파싱 실패 시 원본 데이터 반환
      return inputData;
    }
  }

  /**
   * API 호출
   */
  private async callApi(apiCall: any, params: any): Promise<Response> {
    let url = apiCall.url;
    const method = apiCall.method.toUpperCase();
    
    // 헤더 설정
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(apiCall.headers || {})
    };

    // 인증 헤더 추가
    if (apiCall.authType === 'bearer' && apiCall.secretKey) {
      const secretKey = apiCall.secretKey.startsWith('process.env.')
        ? process.env[apiCall.secretKey.replace('process.env.', '')] || apiCall.secretKey
        : apiCall.secretKey;
      headers['Authorization'] = `Bearer ${secretKey}`;
    } else if (apiCall.authType === 'api_key' && apiCall.secretKey) {
      const secretKey = apiCall.secretKey.startsWith('process.env.')
        ? process.env[apiCall.secretKey.replace('process.env.', '')] || apiCall.secretKey
        : apiCall.secretKey;
      headers['X-API-Key'] = secretKey;
    }

    // Body 설정 (GET이 아닌 경우)
    let requestBody: string | undefined;
    if (method !== 'GET' && params) {
      requestBody = JSON.stringify(params);
    } else if (method === 'GET' && params) {
      // GET 요청의 경우 쿼리 파라미터로 추가
      const urlParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          urlParams.append(key, String(params[key]));
        }
      });
      // url += (url.includes('?') ? '&' : '?') + urlParams.toString();

      const qs = urlParams.toString();
      if (qs) {
        url = `${url}${url.includes('?') ? '&' : '?'}${qs}`;
      }
    }

    // 요청 옵션 설정
    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (requestBody) {
      requestOptions.body = requestBody;
    }

    // 재시도 로직
    let lastError: Error | null = null;
    const maxRetries = apiCall.retryCount || 3;
    const retryDelay = apiCall.retryDelay || 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          console.warn(`API 호출 실패 (시도 ${attempt + 1}/${maxRetries + 1}):`, error);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError || new Error('API 호출 실패');
  }

  /**
   * 응답 파싱 및 검증
   */
  private async parseAndValidateResponse(response: Response, apiCall: any): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    
    let parsedResponse;
    
    if (contentType.includes('application/json')) {
      parsedResponse = await response.json();
    } else if (contentType.includes('text/')) {
      const text = await response.text();
      try {
        parsedResponse = JSON.parse(text);
      } catch {
        parsedResponse = { text };
      }
    } else {
      parsedResponse = { data: 'Binary data' };
    }

    // 응답 스키마 검증
    if (apiCall.responseSchema && apiCall.responseSchema.properties) {
      const requiredFields = apiCall.responseSchema.required || [];
      const missingFields = requiredFields.filter(field => !parsedResponse.hasOwnProperty(field));
      
      if (missingFields.length > 0) {
        console.warn(`응답에서 필수 필드가 누락되었습니다: ${missingFields.join(', ')}`);
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
    apiCallId: string,
    inputData: any,
    outputData: any,
    startTime: number,
    httpStatusCode: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const executionTime = Date.now() - startTime;
      const executionStatus = outputData ? 'success' : 'failed';

      await db.insert(workflowSessionData).values({
        sessionId,
        dataKey: `${nodeId}_${apiCallId}`,
        dataValue: outputData || { error: errorMessage },
        dataType: 'object',
        createdBy: nodeId,
        promptId: apiCallId, // API 호출도 프롬프트와 유사한 구조로 저장
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

export const apiCallEngine = new ApiCallEngine();
