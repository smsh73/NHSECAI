/**
 * Schema Validation Test
 * 
 * 이 테스트는 모든 스키마가 올바르게 정의되고 createInsertSchema가
 * 정상적으로 작동하는지 검증합니다.
 * 
 * 이 테스트는 배포 전에 반드시 실행되어야 합니다.
 */

import { describe, it, expect } from '@jest/globals';

// 모든 스키마를 import하여 실제로 로드되는지 확인
describe('Schema Validation', () => {
  it('should load all schemas without errors', async () => {
    // 동적 import를 사용하여 실제 모듈 로딩을 강제
    const schemaModule = await import('@shared/schema');
    
    // 모든 주요 테이블이 정의되어 있는지 확인
    expect(schemaModule.users).toBeDefined();
    expect(schemaModule.financialData).toBeDefined();
    expect(schemaModule.ragEmbeddingSchemas).toBeDefined();
    expect(schemaModule.ragDataVersionControl).toBeDefined();
    expect(schemaModule.ragDataTamperingDetection).toBeDefined();
    expect(schemaModule.ragDataAnomalyDetection).toBeDefined();
    expect(schemaModule.ragDataProcessingLogs).toBeDefined();
    expect(schemaModule.systemKillswitch).toBeDefined();
    expect(schemaModule.adversarialAttackEvents).toBeDefined();
    expect(schemaModule.benchmarkTestResults).toBeDefined();
  });

  it('should have all insert schemas defined', async () => {
    const schemaModule = await import('@shared/schema');
    
    // 모든 insert schema가 정의되어 있는지 확인
    expect(schemaModule.insertUserSchema).toBeDefined();
    expect(schemaModule.insertFinancialDataSchema).toBeDefined();
    expect(schemaModule.insertRagEmbeddingSchemaSchema).toBeDefined();
    expect(schemaModule.insertRagDataVersionControlSchema).toBeDefined();
    expect(schemaModule.insertRagDataTamperingDetectionSchema).toBeDefined();
    expect(schemaModule.insertRagDataAnomalyDetectionSchema).toBeDefined();
    expect(schemaModule.insertRagDataProcessingLogSchema).toBeDefined();
    expect(schemaModule.insertSystemKillswitchSchema).toBeDefined();
    expect(schemaModule.insertAdversarialAttackEventSchema).toBeDefined();
    expect(schemaModule.insertBenchmarkTestResultSchema).toBeDefined();
  });

  it('should validate schema creation order', async () => {
    // 이 테스트는 스키마가 올바른 순서로 로드되는지 확인합니다
    // 테이블 정의가 createInsertSchema 호출 전에 완료되어야 합니다
    
    let error: Error | null = null;
    
    try {
      // 모듈을 로드하면 모든 top-level 코드가 실행됩니다
      await import('@shared/schema');
    } catch (e) {
      error = e as Error;
    }
    
    // 에러가 발생하면 실패
    expect(error).toBeNull();
    
    if (error) {
      console.error('Schema loading error:', error.message);
      console.error('Stack:', error.stack);
    }
  });

  it('should validate all insert schemas are valid Zod schemas', async () => {
    const schemaModule = await import('@shared/schema');
    const { z } = await import('zod');
    
    // Insert schema들이 실제로 Zod schema인지 확인
    const insertSchemas = [
      schemaModule.insertUserSchema,
      schemaModule.insertFinancialDataSchema,
      schemaModule.insertRagEmbeddingSchemaSchema,
      schemaModule.insertRagDataVersionControlSchema,
      schemaModule.insertRagDataTamperingDetectionSchema,
      schemaModule.insertRagDataAnomalyDetectionSchema,
      schemaModule.insertRagDataProcessingLogSchema,
      schemaModule.insertSystemKillswitchSchema,
      schemaModule.insertAdversarialAttackEventSchema,
      schemaModule.insertBenchmarkTestResultSchema
    ];
    
    for (const schema of insertSchemas) {
      expect(schema).toBeDefined();
      // Zod schema는 _def 속성을 가지고 있습니다
      expect(schema).toHaveProperty('_def');
      expect(schema).toBeInstanceOf(z.ZodObject);
    }
  });
});

