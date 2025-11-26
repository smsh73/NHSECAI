import { db } from '../db.js';
import { 
  workflowSessions, 
  workflowNodes, 
  workflowNodeExecutions, 
  workflowSessionData,
  workflowNodeDependencies,
  prompts,
  type WorkflowSession,
  type WorkflowNode,
  type WorkflowNodeExecution,
  type WorkflowSessionData,
  type Prompt
} from '@shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { activityLogger } from './activity-logger.js';
import SessionDataManager from './session-data-manager.js';
import { jsonPromptExecutionEngine } from './json-prompt-execution-engine.js';
import { pythonExecutionEngine } from './python-execution-engine.js';

export interface NodeExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

export interface WorkflowExecutionContext {
  sessionId: string;
  sessionData: Map<string, any>;
  currentNodeId?: string;
  sessionDataManager: SessionDataManager;
}

export class WorkflowEngine {
  private context: WorkflowExecutionContext | null = null;

  /**
   * 워크플로우 세션 생성
   */
  async createSession(workflowId: string, sessionName: string, createdBy: string): Promise<WorkflowSession> {
    try {
      const [session] = await db.insert(workflowSessions).values({
        sessionName,
        workflowId,
        createdBy,
        status: 'pending'
      }).returning();

      activityLogger.log('workflow', 'create_session', {
        workflowId,
        sessionId: session.id,
        sessionName,
        createdBy
      });

      return session;
    } catch (error) {
      activityLogger.log('workflow', 'create_session', {
        workflowId,
        sessionName,
        createdBy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 워크플로우 실행 시작
   */
  async startWorkflow(sessionId: string): Promise<void> {
    try {
      // 세션 상태 업데이트
      await db.update(workflowSessions)
        .set({ 
          status: 'running',
          startedAt: new Date()
        })
        .where(eq(workflowSessions.id, sessionId));

      // 워크플로우 노드들 조회
      const nodes = await db.select()
        .from(workflowNodes)
        .where(eq(workflowNodes.workflowId, sessionId))
        .orderBy(asc(workflowNodes.nodeOrder));

      // 컨텍스트 초기화
      this.context = {
        sessionId,
        sessionData: new Map(),
        sessionDataManager: new SessionDataManager(sessionId)
      };

      // 노드들을 순차적으로 실행
      for (const node of nodes) {
        if (!node.isActive) continue;

        await this.executeNode(node);
      }

      // 세션 완료
      await db.update(workflowSessions)
        .set({ 
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(workflowSessions.id, sessionId));

      activityLogger.log('workflow', 'workflow_completed', {
        sessionId,
        nodeCount: nodes.length
      });

    } catch (error) {
      // 세션 실패 처리
      await db.update(workflowSessions)
        .set({ 
          status: 'failed',
          completedAt: new Date()
        })
        .where(eq(workflowSessions.id, sessionId));

      activityLogger.log('workflow', 'workflow_failed', {
        sessionId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 개별 노드 실행
   */
  async executeNode(node: WorkflowNode): Promise<NodeExecutionResult> {
    if (!this.context) {
      throw new Error('Workflow context not initialized');
    }

    const startTime = Date.now();
    let result: NodeExecutionResult;

    try {
      // 노드 실행 기록 생성
      const [execution] = await db.insert(workflowNodeExecutions).values({
        sessionId: this.context.sessionId,
        nodeId: node.id,
        status: 'running',
        startedAt: new Date()
      }).returning();

      // 의존성 데이터 수집
      const inputData = await this.collectInputData(node);
      
      // 세션 데이터 매니저에 노드 실행 시작 기록
      await this.context.sessionDataManager.storeNodeExecution(
        node.id,
        'running',
        inputData
      );

      // 노드 타입별 실행
      switch (node.nodeType) {
        case 'prompt':
          result = await this.executePromptNode(node, inputData);
          break;
        case 'api_call':
          result = await this.executeApiCallNode(node, inputData);
          break;
        case 'sql_execution':
          result = await this.executeSqlNode(node, inputData);
          break;
        case 'json_processing':
          result = await this.executeJsonProcessingNode(node, inputData);
          break;
        case 'data_transformation':
          result = await this.executeDataTransformationNode(node, inputData);
          break;
        case 'python_script':
          result = await this.executePythonScriptNode(node, inputData);
          break;
        default:
          throw new Error(`Unknown node type: ${node.nodeType}`);
      }

      // 실행 결과 저장
      await db.update(workflowNodeExecutions)
        .set({
          status: result.success ? 'completed' : 'failed',
          completedAt: new Date(),
          inputData,
          outputData: result.data,
          errorMessage: result.error,
          executionTime: result.executionTime,
          retryCount: 0
        })
        .where(eq(workflowNodeExecutions.id, execution.id));

      // 세션 데이터에 결과 저장
      if (result.success && result.data) {
        await this.saveSessionData(node.id, result.data);
      }
      
      // 세션 데이터 매니저에 노드 실행 완료 기록
      await this.context.sessionDataManager.storeNodeExecution(
        node.id,
        result.success ? 'completed' : 'failed',
        inputData,
        result.data,
        result.error,
        result.executionTime
      );

      activityLogger.log('workflow', 'node_executed', {
        sessionId: this.context.sessionId,
        nodeId: node.id,
        nodeType: node.nodeType,
        success: result.success,
        executionTime: result.executionTime
      });

      return result;

    } catch (error) {
      result = {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };

      // 실행 실패 기록
      await db.update(workflowNodeExecutions)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error.message,
          executionTime: result.executionTime
        })
        .where(and(
          eq(workflowNodeExecutions.sessionId, this.context.sessionId),
          eq(workflowNodeExecutions.nodeId, node.id)
        ));

      activityLogger.log('workflow', 'node_failed', {
        sessionId: this.context.sessionId,
        nodeId: node.id,
        nodeType: node.nodeType,
        error: error.message
      });

      return result;
    }
  }

  /**
   * 프롬프트 노드 실행
   */
  private async executePromptNode(node: WorkflowNode, inputData: any): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.configuration as any;
      const promptId = config.promptId;
      
      if (!promptId) {
        throw new Error('Prompt ID is required for prompt node execution');
      }

      // 프롬프트 정보 조회
      const prompt = await this.loadPromptFromCatalog(promptId);
      if (!prompt) {
        throw new Error(`Prompt with ID ${promptId} not found`);
      }

      // JSON 프롬프트 실행 엔진 사용
      const result = await jsonPromptExecutionEngine.executePrompt(
        promptId,
        inputData,
        this.context!.sessionId,
        node.id
      );

      if (result.success) {
        // 실행 결과를 세션 데이터에 저장
        await this.context!.sessionDataManager.storeNodeExecution(
          node.id,
          'completed',
          result.data,
          result.executionTime || 0
        );

        activityLogger.log('workflow', 'prompt_node_executed', {
          nodeId: node.id,
          promptId,
          executionTime: result.executionTime || 0,
          tokenUsage: result.tokenUsage
        });

        return {
          success: true,
          data: result.data,
          executionTime: Date.now() - startTime
        };
      } else {
        throw new Error(result.error || 'Prompt execution failed');
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // 에러 상태 저장
      await this.context!.sessionDataManager.storeNodeExecution(
        node.id,
        'failed',
        null,
        executionTime,
        errorMessage
      );

      activityLogger.log('workflow', 'prompt_node_failed', {
        nodeId: node.id,
        error: errorMessage,
        executionTime
      });

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * API 호출 노드 실행
   */
  private async executeApiCallNode(node: WorkflowNode, inputData: any): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.configuration as any;
      const url = config.url;
      const method = config.method || 'GET';
      const headers = config.headers || {};
      const body = config.body;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * SQL 실행 노드
   */
  private async executeSqlNode(node: WorkflowNode, inputData: any): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.configuration as any;
      const query = config.query;
      
      // 실제 구현에서는 적절한 데이터베이스 서비스 사용
      const result = await db.execute(sql.raw(query));
      
      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * JSON 처리 노드
   */
  private async executeJsonProcessingNode(node: WorkflowNode, inputData: any): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.configuration as any;
      const operation = config.operation; // extract, transform, merge, filter 등
      
      let result;
      switch (operation) {
        case 'extract':
          result = this.extractFromJson(inputData, config.path);
          break;
        case 'transform':
          result = this.transformJson(inputData, config.transformation);
          break;
        case 'merge':
          result = this.mergeJson(inputData, config.mergeData);
          break;
        case 'filter':
          result = this.filterJson(inputData, config.filter);
          break;
        default:
          throw new Error(`Unknown JSON operation: ${operation}`);
      }
      
      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 데이터 변환 노드
   */
  private async executeDataTransformationNode(node: WorkflowNode, inputData: any): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.configuration as any;
      const transformation = config.transformation;
      
      // 데이터 변환 로직 구현
      const result = this.transformData(inputData, transformation);
      
      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 의존성 데이터 수집
   */
  private async collectInputData(node: WorkflowNode): Promise<any> {
    if (!this.context) return {};

    try {
      // 의존성 노드들에서 데이터 수집
      const dependencies = await db.select()
        .from(workflowNodeDependencies)
        .where(eq(workflowNodeDependencies.toNodeId, node.id));

      const inputData: any = {};
      
      for (const dep of dependencies) {
        const sessionData = await db.select()
          .from(workflowSessionData)
          .where(and(
            eq(workflowSessionData.sessionId, this.context.sessionId),
            eq(workflowSessionData.dataKey, dep.dataKey)
          ))
          .limit(1);

        if (sessionData.length > 0) {
          inputData[dep.dataKey] = sessionData[0].dataValue;
        }
      }

      return inputData;
    } catch (error) {
      // 의존성 조회 실패 시 빈 객체 반환
      console.warn('Failed to collect input data:', error.message);
      return {};
    }
  }

  /**
   * 세션 데이터 저장
   */
  private async saveSessionData(nodeId: string, data: any): Promise<void> {
    if (!this.context) return;

    // 데이터 키 생성 (노드별로 고유한 키 사용)
    const dataKey = `node_${nodeId}_output`;
    
    await db.insert(workflowSessionData).values({
      sessionId: this.context.sessionId,
      dataKey,
      dataValue: data,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      createdBy: nodeId
    }).onConflictDoUpdate({
      target: [workflowSessionData.sessionId, workflowSessionData.dataKey],
      set: {
        dataValue: data,
        dataType: Array.isArray(data) ? 'array' : typeof data,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 세션 데이터 조회
   */
  async getSessionData(sessionId: string, dataKey?: string): Promise<WorkflowSessionData[]> {
    let query = db.select()
      .from(workflowSessionData)
      .where(eq(workflowSessionData.sessionId, sessionId));

    if (dataKey) {
      query = query.where(eq(workflowSessionData.dataKey, dataKey)) as any;
    }

    return await query.orderBy(asc(workflowSessionData.createdAt));
  }

  /**
   * 프롬프트 카탈로그에서 프롬프트 로드
   */
  private async loadPromptFromCatalog(promptId: string): Promise<any> {
    try {
      // 프롬프트 카탈로그에서 조회
      const { prompts } = await import('@shared/schema');
      const result = await db.select()
        .from(prompts)
        .where(eq(prompts.id, promptId))
        .limit(1);

      if (result.length === 0) {
        throw new Error(`Prompt not found: ${promptId}`);
      }

      return result[0];
    } catch (error) {
      console.error(`프롬프트 로드 실패: ${promptId}`, error);
      throw error;
    }
  }

  /**
   * OpenAI API 호출
   */
  private async callOpenAI(prompt: string, maxTokens: number, model: string): Promise<string> {
    try {
      const { generateCompletion } = await import('./openai.js');
      const result = await generateCompletion({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: maxTokens || 1000,
        responseFormat: 'text'
      });
      
      if (typeof result === 'string') {
        return result;
      } else if (result && typeof result === 'object' && 'content' in result) {
        return String(result.content);
      } else {
        return JSON.stringify(result);
      }
    } catch (error) {
      console.error('OpenAI API 호출 실패:', error);
      throw new Error(`OpenAI API 호출 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * JSON 처리 헬퍼 메서드들
   */
  private extractFromJson(data: any, path: string): any {
    const keys = path.split('.');
    let result = data;
    for (const key of keys) {
      result = result?.[key];
    }
    return result;
  }

  private transformJson(data: any, transformation: any): any {
    // JSON 변환 로직 구현
    return data;
  }

  private mergeJson(data1: any, data2: any): any {
    return { ...data1, ...data2 };
  }

  /**
   * Python 스크립트 노드 실행
   */
  private async executePythonScriptNode(node: WorkflowNode, inputData: any): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const config = node.configuration;
      
      // 등록된 Python 스크립트 ID가 있으면 데이터베이스에서 조회
      let pythonScript = config.pythonScript;
      let pythonRequirements = config.pythonRequirements;
      let pythonTimeout = config.pythonTimeout || 30;
      let pythonEnvironment = config.pythonEnvironment || 'python3';
      let pythonInputFormat = config.pythonInputFormat || 'json';
      let pythonOutputFormat = config.pythonOutputFormat || 'json';
      let pythonWorkingDirectory = config.pythonWorkingDirectory;
      let pythonMemoryLimit = config.pythonMemoryLimit || 512;
      let pythonCpuLimit = config.pythonCpuLimit || 50;

      if (config.pythonScriptId) {
        // 등록된 Python 스크립트를 데이터베이스에서 조회
        const { storage } = await import('../storage.js');
        const registeredScript = await storage.getPythonScript(config.pythonScriptId);
        
        if (registeredScript) {
          pythonScript = registeredScript.pythonScript;
          pythonRequirements = registeredScript.pythonRequirements || '';
          pythonTimeout = registeredScript.pythonTimeout || 30;
          pythonEnvironment = registeredScript.pythonEnvironment || 'python3';
          pythonInputFormat = registeredScript.pythonInputFormat || 'json';
          pythonOutputFormat = registeredScript.pythonOutputFormat || 'json';
          pythonWorkingDirectory = registeredScript.pythonWorkingDirectory || undefined;
          pythonMemoryLimit = registeredScript.pythonMemoryLimit || 512;
          pythonCpuLimit = registeredScript.pythonCpuLimit || 50;
        } else {
          throw new Error(`Python script with ID ${config.pythonScriptId} not found`);
        }
      }

      if (!pythonScript) {
        throw new Error('Python script is required');
      }

      const context = {
        sessionId: this.context!.sessionId,
        nodeId: node.id,
        inputData,
        config: {
          script: pythonScript,
          requirements: pythonRequirements,
          timeout: pythonTimeout,
          environment: pythonEnvironment,
          inputFormat: pythonInputFormat,
          outputFormat: pythonOutputFormat,
          workingDirectory: pythonWorkingDirectory,
          memoryLimit: pythonMemoryLimit,
          cpuLimit: pythonCpuLimit
        }
      };

      const result = await pythonExecutionEngine.executeScript(context);
      
      if (result.success) {
        return {
          success: true,
          data: result.output,
          executionTime: Date.now() - startTime
        };
      } else {
        return {
          success: false,
          error: result.error || 'Python script execution failed',
          executionTime: Date.now() - startTime
        };
      }
    } catch (error) {
      console.error('Python script execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  private filterJson(data: any, filter: any): any {
    if (Array.isArray(data)) {
      return data.filter(item => this.evaluateFilter(item, filter));
    }
    return data;
  }

  private evaluateFilter(item: any, filter: any): boolean {
    // 필터 평가 로직 구현
    return true;
  }

  private transformData(data: any, transformation: any): any {
    // 데이터 변환 로직 구현
    return data;
  }
}

export const workflowEngine = new WorkflowEngine();
