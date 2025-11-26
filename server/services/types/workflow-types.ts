/**
 * Workflow Execution Engine Type Definitions
 * 
 * 이 파일은 워크플로우 실행 엔진에서 사용하는 타입 정의를 포함합니다.
 * any 타입을 제거하고 구체적인 타입을 정의하여 타입 안전성을 향상시킵니다.
 */

/**
 * 노드 설정 타입 정의
 */
export interface NodeConfiguration {
  // 공통 필드
  type: string;
  label?: string;
  description?: string;
  
  // Prompt 노드 설정
  promptId?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  maxTokens?: number;
  temperature?: number;
  executionType?: 'text' | 'json';
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  
  // API 호출 노드 설정
  apiCallId?: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  parameterTemplate?: string;
  
  // SQL 쿼리 노드 설정
  sqlQueryId?: string;
  query?: string;
  dataSourceId?: string;
  source?: 'databricks' | 'postgresql' | 'api';
  outputKey?: string;
  parameters?: Array<{ name: string; value?: unknown }> | Record<string, unknown>;
  maxRows?: number;
  
  // Python 스크립트 노드 설정
  pythonScriptId?: string;
  pythonScript?: string;
  pythonRequirements?: string;
  pythonTimeout?: number;
  pythonEnvironment?: string;
  pythonInputFormat?: 'json' | 'csv' | 'text';
  pythonOutputFormat?: 'json' | 'csv' | 'text';
  pythonWorkingDirectory?: string;
  pythonMemoryLimit?: number;
  pythonCpuLimit?: number;
  
  // 데이터 소스 노드 설정
  dataSourceType?: string;
  
  // 조건 노드 설정
  conditionExpression?: string;
  conditionType?: 'expression' | 'comparison';
  
  // 기타 설정
  [key: string]: unknown;
}

/**
 * 노드 실행 결과 타입
 */
export interface NodeExecutionResult {
  success: boolean;
  input?: unknown;
  output?: unknown;
  error?: string;
  executionTime?: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * 워크플로우 실행 결과 타입
 */
export interface WorkflowExecutionResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  executionTime?: number;
  nodeResults?: Record<string, NodeExecutionResult>;
}

/**
 * 세션 데이터 타입
 */
export type SessionDataValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];

/**
 * 노드 입력 데이터 타입
 */
export type NodeInputData = Record<string, SessionDataValue> | SessionDataValue[] | SessionDataValue;

/**
 * 노드 출력 데이터 타입
 */
export type NodeOutputData = Record<string, SessionDataValue> | SessionDataValue[] | SessionDataValue;

/**
 * SQL 쿼리 파라미터 타입
 */
export interface SqlQueryParameter {
  name: string;
  value?: unknown;
  type?: string;
  required?: boolean;
}

/**
 * 데이터 소스 쿼리 결과 타입
 */
export interface DataSourceQueryResult {
  data: unknown[];
  rowCount: number;
  executionTime: number;
  schema?: Array<{
    name: string;
    type: string | number;
  }>;
}

