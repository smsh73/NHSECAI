import { WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { AIWorkflowNodeConfig, AIWorkflowNodeType } from '@shared/schema';
import { z } from 'zod';

/**
 * Node configuration schema validator
 * Validates node configuration against expected schema based on node type
 */

// Schema definitions for each node type
const nodeTypeSchemas: Record<string, z.ZodSchema> = {
  start: z.object({
    type: z.literal('start'),
  }),
  
  prompt: z.object({
    type: z.literal('prompt'),
    promptId: z.string().optional(),
    systemPrompt: z.string().optional(),
    userPromptTemplate: z.string().optional(),
    maxTokens: z.number().int().min(100).max(4000).optional(),
    temperature: z.number().min(0).max(2).optional(),
    executionType: z.enum(['text', 'json']).optional(),
    inputSchema: z.any().optional(),
    outputSchema: z.any().optional(),
  }),
  
  api: z.object({
    type: z.literal('api'),
    apiCallId: z.string().optional(),
    url: z.string().url().optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
    headers: z.record(z.string()).optional(),
    requestSchema: z.any().optional(),
    responseSchema: z.any().optional(),
    parameterTemplate: z.string().optional(),
  }),
  
  dataSource: z.object({
    type: z.literal('dataSource'),
    source: z.enum(['databricks', 'postgresql', 'api']).optional(),
    query: z.string().optional(),
    outputKey: z.string().optional(),
  }),
  
  python_script: z.object({
    type: z.literal('python_script'),
    pythonScriptId: z.string().optional(),
    pythonScript: z.string().optional(),
    pythonRequirements: z.string().optional(),
    pythonTimeout: z.number().int().min(1).max(300).optional(),
    pythonEnvironment: z.string().optional(),
    pythonInputFormat: z.enum(['json', 'csv', 'text']).optional(),
    pythonOutputFormat: z.enum(['json', 'csv', 'text']).optional(),
  }),
  
  condition: z.object({
    type: z.literal('condition'),
    conditionExpression: z.string().optional(),
    conditionType: z.enum(['expression', 'value']).optional(),
  }),
  
  transform: z.object({
    type: z.literal('transform'),
    expression: z.string().optional(),
    inputVariable: z.string().optional(),
  }),
  
  output: z.object({
    type: z.literal('output'),
    format: z.string().optional(),
    destination: z.string().optional(),
  }),
};

/**
 * Validate node configuration against schema
 */
export interface NodeSchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateNodeSchema(
  nodeType: string,
  config: any
): NodeSchemaValidationResult {
  const result: NodeSchemaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Get schema for node type
  const schema = nodeTypeSchemas[nodeType];
  
  if (!schema) {
    result.warnings.push(`Unknown node type: ${nodeType}. Skipping schema validation.`);
    return result;
  }

  try {
    // Validate configuration against schema
    const parsed = schema.parse(config);
    
    // Additional business logic validations
    if (nodeType === 'prompt') {
      if (!config.promptId && !config.systemPrompt) {
        result.errors.push('프롬프트 노드는 promptId 또는 systemPrompt가 필요합니다.');
        result.isValid = false;
      }
      if (config.maxTokens && (config.maxTokens < 100 || config.maxTokens > 4000)) {
        result.errors.push('maxTokens는 100-4000 사이의 값이어야 합니다.');
        result.isValid = false;
      }
      if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
        result.errors.push('temperature는 0-2 사이의 값이어야 합니다.');
        result.isValid = false;
      }
    }
    
    if (nodeType === 'api') {
      if (!config.apiCallId && !config.url) {
        result.errors.push('API 노드는 apiCallId 또는 url이 필요합니다.');
        result.isValid = false;
      }
      if (config.url && !config.url.match(/^https?:\/\//)) {
        result.errors.push('url은 유효한 HTTP/HTTPS URL이어야 합니다.');
        result.isValid = false;
      }
    }
    
    if (nodeType === 'python_script') {
      if (!config.pythonScriptId && !config.pythonScript) {
        result.errors.push('Python 스크립트 노드는 pythonScriptId 또는 pythonScript가 필요합니다.');
        result.isValid = false;
      }
      if (config.pythonTimeout && (config.pythonTimeout < 1 || config.pythonTimeout > 300)) {
        result.errors.push('pythonTimeout은 1-300 초 사이의 값이어야 합니다.');
        result.isValid = false;
      }
    }
    
    if (nodeType === 'dataSource') {
      if (!config.source) {
        result.errors.push('데이터 소스 노드는 source 필드가 필요합니다.');
        result.isValid = false;
      }
      if (config.source === 'databricks' || config.source === 'postgresql') {
        if (!config.query) {
          result.warnings.push('SQL 쿼리가 제공되지 않았습니다.');
        }
      }
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.isValid = false;
      result.errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    } else {
      result.isValid = false;
      result.errors.push(`스키마 검증 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}

/**
 * Validate node before adding to workflow
 */
export function validateNodeBeforeAdd(
  node: WorkflowNode,
  existingNodes: WorkflowNode[],
  existingEdges: WorkflowEdge[]
): NodeSchemaValidationResult {
  const result: NodeSchemaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validate node schema
  const nodeType = node.data?.config?.type || node.type;
  const config = node.data?.config || {};
  
  const schemaResult = validateNodeSchema(nodeType, config);
  result.isValid = schemaResult.isValid;
  result.errors.push(...schemaResult.errors);
  result.warnings.push(...schemaResult.warnings);

  // Additional workflow-specific validations
  if (nodeType === 'start' && existingNodes.some(n => (n.data?.config?.type || n.type) === 'start')) {
    result.errors.push('워크플로우는 하나의 시작 노드만 가질 수 있습니다.');
    result.isValid = false;
  }

  return result;
}

