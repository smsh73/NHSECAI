/**
 * Workflow Execution Engine Type Safety Tests
 * 
 * 이 테스트는 타입 안전성 개선을 검증합니다.
 */

import { describe, it, expect } from '@jest/globals';
import type {
  NodeConfiguration,
  NodeExecutionResult,
  WorkflowExecutionResult,
  NodeInputData,
  NodeOutputData,
  SqlQueryParameter,
  DataSourceQueryResult
} from '../services/types/workflow-types.js';

describe('Workflow Types', () => {
  describe('NodeConfiguration', () => {
    it('should accept valid prompt node configuration', () => {
      const config: NodeConfiguration = {
        type: 'prompt',
        promptId: 'test-prompt-id',
        systemPrompt: 'Test system prompt',
        maxTokens: 1000,
        temperature: 0.7
      };
      
      expect(config.type).toBe('prompt');
      expect(config.promptId).toBe('test-prompt-id');
    });

    it('should accept valid SQL query node configuration', () => {
      const config: NodeConfiguration = {
        type: 'sql_execution',
        sqlQueryId: 'test-sql-id',
        dataSourceId: 'test-datasource-id',
        maxRows: 100
      };
      
      expect(config.type).toBe('sql_execution');
      expect(config.sqlQueryId).toBe('test-sql-id');
    });
  });

  describe('NodeExecutionResult', () => {
    it('should create valid success result', () => {
      const result: NodeExecutionResult = {
        success: true,
        output: { data: 'test' },
        executionTime: 100
      };
      
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ data: 'test' });
    });

    it('should create valid error result', () => {
      const result: NodeExecutionResult = {
        success: false,
        error: 'Test error',
        executionTime: 50
      };
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });
  });

  describe('NodeInputData and NodeOutputData', () => {
    it('should accept object input', () => {
      const input: NodeInputData = { key: 'value' };
      expect(typeof input).toBe('object');
    });

    it('should accept array input', () => {
      const input: NodeInputData = [1, 2, 3];
      expect(Array.isArray(input)).toBe(true);
    });

    it('should accept primitive input', () => {
      const input: NodeInputData = 'test';
      expect(typeof input).toBe('string');
    });
  });

  describe('SqlQueryParameter', () => {
    it('should accept valid parameter', () => {
      const param: SqlQueryParameter = {
        name: 'testParam',
        value: 'testValue',
        type: 'string',
        required: true
      };
      
      expect(param.name).toBe('testParam');
      expect(param.value).toBe('testValue');
    });
  });

  describe('DataSourceQueryResult', () => {
    it('should create valid query result', () => {
      const result: DataSourceQueryResult = {
        data: [{ id: 1, name: 'test' }],
        rowCount: 1,
        executionTime: 100,
        schema: [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'string' }
        ]
      };
      
      expect(result.rowCount).toBe(1);
      expect(result.data.length).toBe(1);
      expect(result.schema?.length).toBe(2);
    });
  });
});

