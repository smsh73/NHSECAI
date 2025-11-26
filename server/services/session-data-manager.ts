import { db } from '../db';
import { workflowSessionData, workflowNodeExecutions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface SessionDataItem {
  dataKey: string;
  dataValue: any;
  dataType: 'string' | 'number' | 'object' | 'array';
  createdBy?: string;
}

export class SessionDataManager {
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * 세션 데이터 저장
   */
  async storeData(dataKey: string, dataValue: any, createdBy?: string): Promise<void> {
    try {
      const dataType = this.getDataType(dataValue);
      
      // 기존 데이터가 있으면 업데이트, 없으면 생성
      const existingData = await db.select()
        .from(workflowSessionData)
        .where(and(
          eq(workflowSessionData.sessionId, this.sessionId),
          eq(workflowSessionData.dataKey, dataKey)
        ))
        .limit(1);

      if (existingData.length > 0) {
        // 업데이트
        await db.update(workflowSessionData)
          .set({
            dataValue: dataValue,
            dataType: dataType,
            createdBy: createdBy,
            updatedAt: new Date()
          })
          .where(and(
            eq(workflowSessionData.sessionId, this.sessionId),
            eq(workflowSessionData.dataKey, dataKey)
          ));
      } else {
        // 생성
        await db.insert(workflowSessionData).values({
          sessionId: this.sessionId,
          dataKey: dataKey,
          dataValue: dataValue,
          dataType: dataType,
          createdBy: createdBy
        });
      }

      console.log(`세션 데이터 저장 완료: ${dataKey} (${dataType})`);
    } catch (error) {
      console.error(`세션 데이터 저장 실패: ${dataKey}`, error);
      throw error;
    }
  }

  /**
   * 세션 데이터 조회
   */
  async getData(dataKey: string): Promise<any> {
    try {
      const result = await db.select()
        .from(workflowSessionData)
        .where(and(
          eq(workflowSessionData.sessionId, this.sessionId),
          eq(workflowSessionData.dataKey, dataKey)
        ))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return result[0].dataValue;
    } catch (error) {
      console.error(`세션 데이터 조회 실패: ${dataKey}`, error);
      throw error;
    }
  }

  /**
   * 세션 데이터 조회 (여러 키)
   */
  async getMultipleData(dataKeys: string[]): Promise<Record<string, any>> {
    try {
      const result = await db.select()
        .from(workflowSessionData)
        .where(and(
          eq(workflowSessionData.sessionId, this.sessionId),
          // dataKey가 배열에 포함되는 경우
        ));

      const dataMap: Record<string, any> = {};
      for (const item of result) {
        if (dataKeys.includes(item.dataKey)) {
          dataMap[item.dataKey] = item.dataValue;
        }
      }

      return dataMap;
    } catch (error) {
      console.error(`세션 데이터 다중 조회 실패`, error);
      throw error;
    }
  }

  /**
   * 세션 데이터 삭제
   */
  async deleteData(dataKey: string): Promise<void> {
    try {
      await db.delete(workflowSessionData)
        .where(and(
          eq(workflowSessionData.sessionId, this.sessionId),
          eq(workflowSessionData.dataKey, dataKey)
        ));

      console.log(`세션 데이터 삭제 완료: ${dataKey}`);
    } catch (error) {
      console.error(`세션 데이터 삭제 실패: ${dataKey}`, error);
      throw error;
    }
  }

  /**
   * 세션의 모든 데이터 조회
   */
  async getAllData(): Promise<Record<string, any>> {
    try {
      const result = await db.select()
        .from(workflowSessionData)
        .where(eq(workflowSessionData.sessionId, this.sessionId));

      const dataMap: Record<string, any> = {};
      for (const item of result) {
        dataMap[item.dataKey] = item.dataValue;
      }

      return dataMap;
    } catch (error) {
      console.error(`세션 전체 데이터 조회 실패`, error);
      throw error;
    }
  }

  /**
   * 노드 실행 결과 저장
   */
  async storeNodeExecution(
    nodeId: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
    inputData?: any,
    outputData?: any,
    errorMessage?: string,
    executionTime?: number
  ): Promise<void> {
    try {
      await db.insert(workflowNodeExecutions).values({
        sessionId: this.sessionId,
        nodeId: nodeId,
        status: status,
        inputData: inputData,
        outputData: outputData,
        errorMessage: errorMessage,
        executionTime: executionTime,
        startedAt: new Date(),
        completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
      });

      console.log(`노드 실행 결과 저장 완료: ${nodeId} (${status})`);
    } catch (error) {
      console.error(`노드 실행 결과 저장 실패: ${nodeId}`, error);
      throw error;
    }
  }

  /**
   * 노드 실행 결과 조회
   */
  async getNodeExecution(nodeId: string): Promise<any> {
    try {
      const result = await db.select()
        .from(workflowNodeExecutions)
        .where(and(
          eq(workflowNodeExecutions.sessionId, this.sessionId),
          eq(workflowNodeExecutions.nodeId, nodeId)
        ))
        .orderBy(workflowNodeExecutions.createdAt)
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`노드 실행 결과 조회 실패: ${nodeId}`, error);
      throw error;
    }
  }

  /**
   * 데이터 타입 결정
   */
  private getDataType(value: any): 'string' | 'number' | 'object' | 'array' {
    if (Array.isArray(value)) {
      return 'array';
    } else if (typeof value === 'object' && value !== null) {
      return 'object';
    } else if (typeof value === 'number') {
      return 'number';
    } else {
      return 'string';
    }
  }

  /**
   * 변수 치환 (템플릿에서 {VAR} 형식 변수를 실제 값으로 치환)
   */
  async resolveVariables(template: string): Promise<string> {
    try {
      let resolved = template;
      
      // {VAR} 패턴 찾기
      const variablePattern = /\{([^}]+)\}/g;
      const matches = template.match(variablePattern);
      
      if (!matches) {
        return resolved;
      }

      // 각 변수에 대해 값 조회
      for (const match of matches) {
        const variableName = match.slice(1, -1); // { } 제거
        
        // 특수 변수들
        if (variableName === 'DATE') {
          resolved = resolved.replace(match, new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        } else if (variableName === 'TIME') {
          const now = new Date();
          const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
          resolved = resolved.replace(match, timeStr);
        } else {
          // 세션 데이터에서 조회
          const value = await this.getData(variableName);
          if (value !== null) {
            resolved = resolved.replace(match, JSON.stringify(value));
          }
        }
      }

      return resolved;
    } catch (error) {
      console.error(`변수 치환 실패`, error);
      return template;
    }
  }

  /**
   * 세션 데이터 정리 (워크플로우 완료 후)
   */
  async cleanup(): Promise<void> {
    try {
      // 세션 데이터 삭제
      await db.delete(workflowSessionData)
        .where(eq(workflowSessionData.sessionId, this.sessionId));

      console.log(`세션 데이터 정리 완료: ${this.sessionId}`);
    } catch (error) {
      console.error(`세션 데이터 정리 실패: ${this.sessionId}`, error);
      throw error;
    }
  }
}

export default SessionDataManager;
