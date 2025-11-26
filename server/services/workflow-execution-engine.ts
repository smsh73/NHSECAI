import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { workflows, workflowSessions, workflowNodes, workflowNodeExecutions, workflowSessionData } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { jsonPromptExecutionEngine } from './json-prompt-execution-engine.js';
import { apiCallEngine } from './api-call-engine.js';
import { pythonExecutionEngine } from './python-execution-engine.js';
import { detailedLogger } from './detailed-logger.js';
import type {
  NodeConfiguration,
  NodeExecutionResult,
  WorkflowExecutionResult,
  NodeInputData,
  NodeOutputData,
  SqlQueryParameter,
  DataSourceQueryResult
} from './types/workflow-types.js';

export interface WorkflowNode {
  id: string;
  name: string;
  type: 'prompt' | 'api_call' | 'sql_execution' | 'json_processing' | 'data_transformation' | 'data_source' | 'python_script' | 'start' | 'end' | 'api' | 'merge' | 'data_aggregator' | 'rag' | 'ai_analysis' | 'theme_classifier' | 'alert' | 'condition' | 'loop' | 'branch' | 'transform' | 'output' | 'workflow' | 'template';
  configuration: NodeConfiguration;
  // order 필드는 사용되지 않음 (실행 순서는 edges 기반 위상 정렬로 결정됨)
  // 노드 생성 순서와 무관하게 edges의 연결 관계만으로 실행 순서가 결정됩니다.
  order?: number; // Deprecated: 실행 순서는 edges 기반 위상 정렬로 결정됨
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges?: Array<{ id: string; source: string; target: string }>;
  connections?: Array<{ from: string; to: string }>;
}

export interface WorkflowExecutionContext {
  sessionId: string;
  workflowId: string;
  currentNodeId?: string;
  sessionData: Map<string, unknown>;
  metadata?: {
    edges?: Array<{ id: string; source: string; target: string }>;
    [key: string]: unknown;
  };
  executionHistory: Array<{
    nodeId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    input?: NodeInputData;
    output?: NodeOutputData;
    error?: string;
  }>;
}

export class WorkflowExecutionEngine {
  private activeSessions: Map<string, WorkflowExecutionContext> = new Map();

  async createWorkflowSession(workflowId: string, sessionName: string, createdBy?: string): Promise<string> {
    const sessionId = randomUUID();
    
    try {
      // 워크플로우 세션 생성
      await db.insert(workflowSessions).values({
        id: sessionId,
        sessionName,
        workflowId,
        status: 'pending',
        createdBy: createdBy || null,
        metadata: {}
      });

      // 실행 컨텍스트 초기화
      const context: WorkflowExecutionContext = {
        sessionId,
        workflowId,
        sessionData: new Map(),
        metadata: {},
        executionHistory: []
      };

      this.activeSessions.set(sessionId, context);

      detailedLogger.info({
        service: 'WorkflowExecutionEngine',
        task: 'createWorkflowSession',
        message: `워크플로우 세션 생성: ${sessionName}`,
        metadata: { sessionId, workflowId }
      });

      return sessionId;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'createWorkflowSession',
        message: `워크플로우 세션 생성 실패: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage),
        severity: 'HIGH'
      });
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * 단일 노드 실행 (시뮬레이션용)
   */
  async executeSingleNode(
    sessionId: string,
    nodeId: string,
    workflowDefinition: WorkflowDefinition
  ): Promise<NodeExecutionResult> {
    try {
      const context = this.activeSessions.get(sessionId);
      if (!context) {
        throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
      }

      // 워크플로우 정의에서 노드 찾기
      const node = workflowDefinition.nodes.find(n => n.id === nodeId);
      if (!node) {
        throw new Error(`노드를 찾을 수 없습니다: ${nodeId}`);
      }

      // edges 정보를 context에 저장
      context.metadata = context.metadata || {};
      context.metadata.edges = workflowDefinition.edges || [];

      const nodeStartTime = Date.now();
      
      // 노드 실행 시작 기록
      await this.saveNodeExecution(
        sessionId,
        nodeId,
        (node as any).name || nodeId,
        (node as any).type || 'unknown',
        'running',
        null,
        null,
        undefined,
        undefined,
        new Date(),
        undefined
      );

      // 노드 실행
      const result = await this.executeNode(context, node as WorkflowNode);
      const nodeEndTime = Date.now();
      const executionTime = nodeEndTime - nodeStartTime;

      // 실행 결과를 메모리 세션 데이터에 저장
      context.sessionData.set(nodeId, result);

      // PostgreSQL에 노드 출력 데이터 저장
      await this.saveNodeOutputToSession(sessionId, nodeId, result.output, workflowDefinition.workflowId);

      // 실행 기록 업데이트
      await this.saveNodeExecution(
        sessionId,
        nodeId,
        (node as any).name || nodeId,
        (node as any).type || 'unknown',
        'completed',
        result.input,
        result.output,
        undefined,
        executionTime,
        new Date(nodeStartTime),
        new Date(nodeEndTime)
      );

      detailedLogger.info({
        service: 'WorkflowExecutionEngine',
        task: 'executeSingleNode',
        message: `노드 실행 완료: ${nodeId}`,
        metadata: { sessionId, nodeId }
      });

      return {
        success: true,
        input: result.input,
        output: result.output,
        executionTime
      };
    } catch (error) {
      const nodeEndTime = Date.now();
      const executionTime = nodeEndTime - Date.now();
      const errMsg = error instanceof Error ? error.message : String(error);

      try {
        // 에러 정보를 PostgreSQL에 저장
        await this.saveNodeOutputToSession(sessionId, nodeId, { error: errorMessage }, workflowDefinition.workflowId);

        // 실행 기록 저장 (실패)
        await this.saveNodeExecution(
          sessionId,
          nodeId,
          nodeId,
          'unknown',
          'failed',
          null,
          null,
          errorMessage,
          executionTime,
          new Date(),
          new Date(nodeEndTime)
        );
      } catch (saveError) {
        detailedLogger.error({
          service: 'WorkflowExecutionEngine',
          task: 'executeSingleNode',
          message: `노드 실행 실패 후 저장 중 오류: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
          error: saveError,
          severity: 'HIGH',
          metadata: { sessionId, nodeId }
        });
      }

      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'executeSingleNode',
        message: `노드 실행 실패: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage),
        severity: 'HIGH',
        metadata: { sessionId, nodeId }
      });

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  async executeWorkflow(sessionId: string): Promise<WorkflowExecutionResult> {
    try {
      const context = this.activeSessions.get(sessionId);
      if (!context) {
        throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
      }

      // 워크플로우 정의 로드
      const [workflow] = await db.select().from(workflows).where(eq(workflows.id, context.workflowId));
      if (!workflow) {
        throw new Error(`워크플로우를 찾을 수 없습니다: ${context.workflowId}`);
      }

      // Parse workflow definition - handle both JSON string and object
      let workflowDefinition: WorkflowDefinition;
      if (typeof workflow.definition === 'string') {
        workflowDefinition = JSON.parse(workflow.definition);
      } else {
        workflowDefinition = workflow.definition as WorkflowDefinition;
      }

      // edges 정보를 context에 저장 (이전 노드 찾기용)
      context.metadata = context.metadata || {};
      context.metadata.edges = workflowDefinition.edges || 
        (workflowDefinition.connections?.map(conn => ({ 
          id: `${conn.from}_${conn.to}`, 
          source: conn.from, 
          target: conn.to 
        })) || []);

      // 세션 상태 업데이트
      await db.update(workflowSessions)
        .set({ status: 'running', startedAt: new Date() })
        .where(eq(workflowSessions.id, sessionId));

      detailedLogger.info({
        service: 'WorkflowExecutionEngine',
        task: 'executeWorkflow',
        message: `워크플로우 실행 시작: ${workflow.name}`,
        metadata: { sessionId, workflowId: context.workflowId, nodeCount: workflowDefinition.nodes.length }
      });

      // 노드들을 순서대로 실행 (edges를 기반으로 topological sort)
      const sortedNodes = await this.sortNodesTopologically(workflowDefinition.nodes, context.metadata.edges || [], context.workflowId, sessionId);
      
      // 트레이스 로그: 노드 정렬 결과
      await detailedLogger.trace({
        service: 'WorkflowExecutionEngine',
        task: 'executeWorkflow',
        message: `노드 실행 순서 결정 완료 (총 ${sortedNodes.length}개 노드)`,
        metadata: {
          totalNodes: workflowDefinition.nodes.length,
          sortedNodeIds: sortedNodes.map(n => n.id),
          sortedNodeNames: sortedNodes.map(n => n.name || n.id),
          edges: context.metadata.edges || []
        },
        workflowId: context.workflowId,
        sessionId: sessionId
      });
      
      for (const node of sortedNodes) {
        const nodeStartTime = new Date();
        try {
          // 디버그 로그: 노드 실행 시작
          await detailedLogger.debug({
            service: 'WorkflowExecutionEngine',
            task: 'executeNode',
            message: `노드 실행 시작: ${node.name || node.id} (타입: ${node.type})`,
            metadata: {
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.type,
              executionOrder: sortedNodes.indexOf(node) + 1,
              totalNodes: sortedNodes.length
            },
            workflowId: context.workflowId,
            nodeId: node.id,
            sessionId: sessionId,
            caller: 'executeWorkflow',
            callee: `executeNode:${node.id}`
          });

          // 노드 실행 시작 기록
          await this.saveNodeExecution(
            sessionId, 
            node.id, 
            node.name,
            node.type,
            'running', 
            null, 
            null,
            undefined,
            undefined,
            nodeStartTime,
            undefined
          );
          
          const result = await this.executeNode(context, node);
          const nodeEndTime = new Date();
          const executionTime = nodeEndTime.getTime() - nodeStartTime.getTime();
          
          // 트레이스 로그: 노드 실행 결과
          await detailedLogger.trace({
            service: 'WorkflowExecutionEngine',
            task: 'executeNode',
            message: `노드 실행 완료: ${node.name || node.id}`,
            metadata: {
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.type,
              executionTime: executionTime,
              inputKeys: result.input ? Object.keys(result.input) : [],
              outputKeys: result.output ? Object.keys(result.output) : [],
              outputSize: result.output ? JSON.stringify(result.output).length : 0
            },
            workflowId: context.workflowId,
            nodeId: node.id,
            sessionId: sessionId,
            requestData: result.input,
            responseData: result.output,
            caller: 'executeWorkflow',
            callee: `executeNode:${node.id}`
          });
          
          // 실행 결과를 메모리 세션 데이터에 저장 (빠른 접근용)
          context.sessionData.set(node.id, result);
          
          // PostgreSQL에 노드 출력 데이터 저장 (다른 노드에서 참조 가능하도록)
          await this.saveNodeOutputToSession(sessionId, node.id, result.output, context.workflowId);
          
          // 실행 기록 저장 (기존 running 기록 업데이트)
          await this.saveNodeExecution(
            sessionId, 
            node.id, 
            node.name,
            node.type,
            'completed', 
            result.input, 
            result.output,
            undefined,
            executionTime,
            nodeStartTime,
            nodeEndTime
          );
          
          detailedLogger.info({
            service: 'WorkflowExecutionEngine',
            task: 'executeNode',
            message: `노드 실행 완료: ${node.name}`,
            metadata: { sessionId, nodeId: node.id, nodeType: node.type }
          });
          
        } catch (error) {
          const nodeEndTime = new Date();
          const executionTime = nodeEndTime.getTime() - nodeStartTime.getTime();
          const errMsg = error instanceof Error ? error.message : String(error);
          
          try {
            // 에러 정보를 PostgreSQL에 저장
            await this.saveNodeOutputToSession(sessionId, node.id, { error: errorMessage }, context.workflowId);
            
            // 실행 기록 저장 (실패)
            await this.saveNodeExecution(
              sessionId, 
              node.id, 
              node.name,
              node.type,
              'failed', 
              null, 
              null, 
              errorMessage,
              executionTime,
              nodeStartTime,
              nodeEndTime
            );
          } catch (saveError) {
            detailedLogger.error({
              service: 'WorkflowExecutionEngine',
              task: 'executeNode',
              message: `노드 실행 실패 후 저장 중 오류: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
              error: saveError,
              severity: 'HIGH',
              metadata: { sessionId, nodeId: node.id }
            });
          }
          
          detailedLogger.error({
            service: 'WorkflowExecutionEngine',
            task: 'executeNode',
            message: `노드 실행 실패: ${node.name}`,
            error: error instanceof Error ? error : new Error(errorMessage),
            severity: 'HIGH',
            metadata: { sessionId, nodeId: node.id, nodeType: node.type }
          });
          
          try {
            // 워크플로우 실행 중단
            await db.update(workflowSessions)
              .set({ status: 'failed', completedAt: new Date() })
              .where(eq(workflowSessions.id, sessionId));
          } catch (updateError) {
            detailedLogger.error({
              service: 'WorkflowExecutionEngine',
              task: 'executeNode',
              message: `워크플로우 상태 업데이트 실패: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
              error: updateError,
              severity: 'HIGH',
              metadata: { sessionId }
            });
          }
          
          return { success: false, error: errorMessage };
        }
      }

      // 워크플로우 실행 완료
      await db.update(workflowSessions)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(workflowSessions.id, sessionId));

      const finalResult = this.collectWorkflowResult(context);

      detailedLogger.info({
        service: 'WorkflowExecutionEngine',
        task: 'executeWorkflow',
        message: `워크플로우 실행 완료: ${workflow.name}`,
        metadata: { sessionId, workflowId: context.workflowId, resultKeys: Object.keys(finalResult) }
      });

      return { success: true, result: finalResult };

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'executeWorkflow',
        message: `워크플로우 실행 실패: ${errMsg}`,
        error: error instanceof Error ? error : new Error(errMsg),
        severity: 'HIGH',
        metadata: { sessionId }
      });

      // 세션 상태 업데이트 (실패)
      await db.update(workflowSessions)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(workflowSessions.id, sessionId));

      return { success: false, error: errMsg };
    }
  }

  private async executeNode(context: WorkflowExecutionContext, node: WorkflowNode): Promise<{ input: NodeInputData; output: NodeOutputData }> {
    // 트레이스 로그: 노드 실행 시작
    await detailedLogger.trace({
      service: 'WorkflowExecutionEngine',
      task: 'executeNode',
      message: `노드 실행 시작: ${node.name || node.id} (타입: ${node.type})`,
      metadata: {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type
      },
      workflowId: context.workflowId,
      nodeId: node.id,
      sessionId: context.sessionId,
      caller: 'executeWorkflow',
      callee: `executeNode:${node.id}`
    });

    const input = await this.prepareNodeInput(context, node);
    
    // 트레이스 로그: 입력 데이터 준비 완료
    await detailedLogger.trace({
      service: 'WorkflowExecutionEngine',
      task: 'executeNode',
      message: `노드 입력 데이터 준비 완료: ${Object.keys(input).length}개 키`,
      metadata: {
        nodeId: node.id,
        inputKeys: Object.keys(input),
        inputSize: JSON.stringify(input).length
      },
      workflowId: context.workflowId,
      nodeId: node.id,
      sessionId: context.sessionId,
      requestData: input
    });
    
    let output: any;
    
    switch ((node as any).type) {
      case 'start':
        // 시작 노드는 입력을 그대로 전달
        output = input || {};
        break;
      case 'end': {
        // 종료 노드는 입력을 그대로 전달하고 워크플로우 종료를 표시
        output = { ...(input || {}), workflowEnd: true, completedAt: new Date().toISOString() };
        
        // 종료 노드 설정에서 Databricks 저장 옵션 확인
        const config = node.configuration || (node as any).data?.config || (node as any).data || {};
        if (config.saveToDatabricks !== false) {
          // Databricks gold 스키마에 결과 저장 (비동기로 실행, 실패해도 워크플로우는 완료 처리)
          this.saveWorkflowResultToDatabricks(context, output).catch((error) => {
            detailedLogger.error({
              service: 'WorkflowExecutionEngine',
              task: 'saveWorkflowResultToDatabricks',
              message: `Databricks 저장 실패: ${error instanceof Error ? error.message : String(error)}`,
              error: error,
              severity: 'MEDIUM',
              metadata: { sessionId: context.sessionId, workflowId: context.workflowId }
            });
          });
        }
        break;
      }
      case 'prompt':
        output = await this.executePromptNode(node, input, context);
        break;
      // 에디터 템플릿 호환: API 노드(1) endpoint/url 직접 호출, (2) apiCallId 템플릿 실행
      case 'api': {
        const raw: any = (node as any).configuration || (node as any).data?.config || (node as any).data || {};
        const apiCallId = raw.apiCallId || raw.api_call_id || raw.templateId;
        const url = raw.endpoint || raw.url;
        if (apiCallId) {
          const res = await apiCallEngine.executeApiCall(apiCallId, input, context.sessionId, node.id);
          if (!res.success) throw new Error(res.error || 'API 템플릿 실행 실패');
          output = res.data;
        } else if (url) {
          output = await this.fetchFromApi(url, input);
        } else {
          throw new Error('API 노드에 endpoint/url 또는 apiCallId 설정이 필요합니다');
        }
        break;
      }
      case 'api_call':
        output = await this.executeApiCallNode(node, input, context);
        break;
      case 'sql_execution':
        output = await this.executeSqlNode(node, input);
        break;
      case 'sql_query': {
        // SQL 쿼리 노드 실행 (등록된 SQL 쿼리 사용)
        output = await this.executeSqlQueryNode(node, input, context);
        break;
      }
      case 'json_processing':
        output = await this.executeJsonProcessingNode(node, input);
        break;
      case 'data_transformation':
        output = await this.executeDataTransformationNode(node, input);
        break;
      case 'data_source':
        output = await this.executeDataSourceNode(node, input);
        break;
      // 에디터 템플릿 호환: 병합/집계 노드 단순 통과
      case 'merge':
      case 'data_aggregator':
        output = input || {};
        break;
      // 에디터 템플릿 호환: 간단 RAG 자리표시자
      case 'rag': {
        const cfg: any = (node as any).configuration || (node as any).data || {};
        output = { query: cfg.query || '', input };
        break;
      }
      case 'python_script':
        output = await this.executePythonScriptNode(node, input, context);
        break;
      case 'ai_analysis': {
        // AI 분석 노드 실행
        output = await this.executeAiAnalysisNode(node, input, context);
        break;
      }
      case 'theme_classifier': {
        // 테마 분류 노드 실행
        output = await this.executeThemeClassifierNode(node, input, context);
        break;
      }
      case 'alert': {
        // 알림 생성 노드 실행
        output = await this.executeAlertNode(node, input, context);
        break;
      }
      case 'condition': {
        // 조건 분기 노드 실행
        output = await this.executeConditionNode(node, input, context);
        break;
      }
      case 'loop': {
        // 반복 노드 실행
        output = await this.executeLoopNode(node, input, context);
        break;
      }
      case 'branch': {
        // 다중 분기 노드 실행
        output = await this.executeBranchNode(node, input, context);
        break;
      }
      case 'transform': {
        // 변환 노드 실행
        output = await this.executeTransformNode(node, input, context);
        break;
      }
      case 'output': {
        // 출력 노드 실행
        output = await this.executeOutputNode(node, input, context);
        break;
      }
      case 'workflow': {
        // 하위 워크플로우 노드 실행
        output = await this.executeWorkflowNode(node, input, context);
        break;
      }
      case 'template': {
        // 템플릿 노드 실행
        output = await this.executeTemplateNode(node, input, context);
        break;
      }
      case 'unknown': {
        // 알 수 없는 노드 타입
        output = { ...input, nodeType: node.type, message: `노드 타입 "${node.type}"은 알 수 없는 타입입니다.` };
        break;
      }
      default: {
        const nodeType = node.type || 'unknown';
        throw new Error(`지원하지 않는 노드 타입: ${nodeType}. 지원되는 타입: start, end, prompt, api, api_call, sql_execution, sql_query, json_processing, data_transformation, data_source, merge, data_aggregator, rag, python_script, ai_analysis, theme_classifier, alert, condition, loop, branch, transform, output, workflow, template`);
      }
    }

    // 트레이스 로그: 노드 실행 완료
    await detailedLogger.trace({
      service: 'WorkflowExecutionEngine',
      task: 'executeNode',
      message: `노드 실행 완료: ${node.name || node.id}`,
      metadata: {
        nodeId: node.id,
        nodeType: node.type,
        outputKeys: output ? Object.keys(output) : [],
        outputSize: output ? JSON.stringify(output).length : 0
      },
      workflowId: context.workflowId,
      nodeId: node.id,
      sessionId: context.sessionId,
      responseData: output
    });

    return { input, output };
  }

  private async executePromptNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    const { promptId } = node.configuration;
    if (!promptId) {
      throw new Error('프롬프트 ID가 설정되지 않았습니다');
    }

    // sessionId와 nodeId를 전달하여 PostgreSQL에 자동 저장되도록 함
    const result = await jsonPromptExecutionEngine.executePrompt(
      promptId, 
      input, 
      context.sessionId, 
      node.id
    );
    
      if (!(result as any).success) {
        throw new Error((result as any).error || '프롬프트 실행 실패');
    }
      // @ts-ignore - execution engine accepts either shape
      return result as any;
  }

  private async executeApiCallNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    const { apiCallId } = node.configuration;
    if (!apiCallId) {
      throw new Error('API 호출 ID가 설정되지 않았습니다');
    }

    // sessionId와 nodeId를 전달하여 PostgreSQL에 자동 저장되도록 함
    const result = await apiCallEngine.executeApiCall(apiCallId, input, context.sessionId, node.id);
    
    if (!result.success) {
      throw new Error(result.error || 'API 호출 실패');
    }

    return result.data;
  }

  private async executeAiAnalysisNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    const config = node.configuration || (node as any).data?.config || (node as any).data || {};
    const model = config.model || 'gpt-4.1';
    const systemPrompt = config.systemPrompt || config.prompt || '';
    const userPromptTemplate = config.userPromptTemplate || '';
    const maxTokens = config.maxTokens || 1000;
    const temperature = config.temperature || 0.7;
    
    if (!systemPrompt && !userPromptTemplate) {
      throw new Error('AI 분석 노드에 프롬프트가 설정되지 않았습니다');
    }

    // 입력 데이터를 프롬프트 템플릿에 적용
    let finalPrompt = systemPrompt;
    if (userPromptTemplate) {
      // 변수 치환 {VAR} 형식 - 객체/배열은 JSON 문자열로 안전하게 치환
      finalPrompt = userPromptTemplate.replace(/\{(\w+)\}/g, (match: string, key: string) => {
        const value = input?.[key];
        if (value === undefined) return match;
        try {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        } catch {
          return String(value);
        }
      });
    }

    // 유저 메시지에 입력 JSON 전문을 함께 첨부하여 모델이 실제 데이터를 참고할 수 있도록 함
    let userContent = finalPrompt;
    try {
      if (input && typeof input === 'object') {
        if (Object.prototype.hasOwnProperty.call(input, 'data')) {
          userContent += `\n\n[INPUT_DATA_JSON]\n${JSON.stringify((input as any).data)}`;
        } else {
          userContent += `\n\n[INPUT_JSON]\n${JSON.stringify(input)}`;
        }
      }
    } catch {
      // JSON 직렬화 실패 시 추가 본문 없이 진행
    }

    // AI API 호출 (APIM 경유)
    try {
      // Import AIApiService dynamically
      let AIApiService;
      try {
        const aiApiModule = await import('./ai-api.js');
        AIApiService = aiApiModule.AIApiService || aiApiModule.default;
        
        if (!AIApiService) {
          throw new Error('AIApiService를 찾을 수 없습니다. ai-api.js 모듈을 확인해주세요.');
        }
        
        // Verify callAzureOpenAIChat method exists
        if (typeof AIApiService.callAzureOpenAIChat !== 'function') {
          throw new Error('AIApiService.callAzureOpenAIChat 메서드를 찾을 수 없습니다.');
        }
      } catch (importError) {
        const errorMessage = importError instanceof Error ? importError.message : String(importError);
        console.error('AIApiService import 오류:', importError);
        throw new Error(`AIApiService 로드 실패: ${errorMessage || '알 수 없는 오류'}`);
      }
      
      const result = await AIApiService.callAzureOpenAIChat({
        provider: 'AzureOpenAI',
        model: model,
        prompt: userContent,
        systemPrompt: systemPrompt,
        maxTokens: maxTokens || 1500,
      });

      if (!result || !result.success) {
        throw new Error(result?.error || 'AI API 호출이 실패했습니다.');
      }

      return {
        analysis: result?.data?.content || '',
        input: input,
        metadata: {
          model: result.model || model,
          tokensUsed: result.usage?.totalTokens || 0,
        }
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('AI 분석 실행 오류:', error);
      
      // Provide more specific error messages
      if (errorMessage.includes('is not a function')) {
        throw new Error(`AI 분석 실행 실패: AIApiService 메서드를 찾을 수 없습니다. ${errorMessage}`);
      }
      if (errorMessage.includes('AIApiService')) {
        throw new Error(`AI 분석 실행 실패: ${errorMessage}`);
      }
      
      throw new Error(`AI 분석 실행 실패: ${errorMessage}`);
    }
  }

  private async executeThemeClassifierNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    const config = node.configuration || (node as any).data?.config || (node as any).data || {};
    const systemPrompt = config.systemPrompt || config.prompt || '주어진 뉴스 데이터를 분석하여 적절한 테마로 분류해주세요.';
    const userPromptTemplate = config.userPromptTemplate || '';
    
    // 입력 데이터를 프롬프트 템플릿에 적용
    let finalPrompt = systemPrompt;
    if (userPromptTemplate) {
      // 변수 치환 {VAR} 형식
      finalPrompt = userPromptTemplate.replace(/\{(\w+)\}/g, (match: string, key: string) => {
        return input[key] !== undefined ? String(input[key]) : match;
      });
    }

    // AI API 호출
    try {
      const { AIApiService } = await import('./ai-api.js');
      
      const result = await AIApiService.callAzureOpenAIChat({
        provider: 'AzureOpenAI',
        model: config.model || 'gpt-4.1',
        prompt: finalPrompt,
        systemPrompt: systemPrompt,
        maxTokens: config.maxTokens || 1000,
      });

      return {
        theme: result?.data?.content || '',
        classified: true,
        input: input,
        metadata: {
          model: result.model || 'gpt-4.1',
          tokensUsed: result.usage?.totalTokens || 0,
        }
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('테마 분류 실행 오류:', error);
      throw new Error(`테마 분류 실행 실패: ${errorMessage || 'Unknown error'}`);
    }
  }

  private async executeAlertNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    const config = node.configuration || (node as any).data?.config || (node as any).data || {};
    const alertType = config.alertType || 'info';
    const message = config.message || '';
    const condition = config.condition || '';
    
    // 조건 확인
    if (condition) {
      try {
        // 조건 평가 (간단한 JavaScript 표현식)
        const conditionMet = eval(condition);
        if (!conditionMet) {
          return {
            alert: null,
            skipped: true,
            reason: '조건이 충족되지 않았습니다.',
            input: input
          };
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn('알림 조건 평가 오류:', errorMessage);
      }
    }

    // 알림 생성
    const alert = {
      type: alertType,
      message: message || JSON.stringify(input),
      timestamp: new Date().toISOString(),
      workflowId: context.workflowId,
      sessionId: context.sessionId,
      nodeId: node.id,
      data: input
    };

    // WebSocket을 통해 알림 브로드캐스트 (가능한 경우)
    try {
      const { websocketService } = await import('../index.js');
      if (websocketService && typeof websocketService.broadcast === 'function') {
        websocketService.broadcast({
          type: 'workflow_alert',
          data: alert,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn('WebSocket 브로드캐스트 실패:', error);
    }

    return {
      alert,
      input: input
    };
  }

  private async executeSqlNode(node: WorkflowNode, input: any): Promise<any> {
    const { sqlQuery, parameters } = node.configuration;
    if (!sqlQuery) {
      throw new Error('SQL 쿼리가 설정되지 않았습니다');
    }

    try {
      // SQL 쿼리 실행 (실제 구현에서는 Databricks 연결 필요)
      // Delegate to shared helper for portability
      return await this.queryDatabase(sqlQuery, parameters || []);
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`SQL 실행 실패: ${errorMessage}`);
    }
  }

  private async executeJsonProcessingNode(node: WorkflowNode, input: any): Promise<any> {
    const { operation, schema } = node.configuration;
    
    switch (operation) {
      case 'validate':
        // JSON 스키마 검증
        return this.validateJsonSchema(input, schema);
      case 'transform':
        // JSON 변환
        return this.transformJson(input, node.configuration.transformRules);
      case 'merge':
        // JSON 병합
        return this.mergeJson(input, node.configuration.mergeData);
      default:
        throw new Error(`지원하지 않는 JSON 처리 작업: ${operation}`);
    }
  }

  private async executeDataTransformationNode(node: WorkflowNode, input: any): Promise<any> {
    const { transformationType, rules } = node.configuration;
    
    switch (transformationType) {
      case 'filter':
        return this.filterData(input, rules);
      case 'aggregate':
        return this.aggregateData(input, rules);
      case 'format':
        return this.formatData(input, rules);
      default:
        throw new Error(`지원하지 않는 데이터 변환 타입: ${transformationType}`);
    }
  }

  /**
   * SQL 쿼리 노드 실행 (등록된 SQL 쿼리 사용)
   */
  private async executeSqlQueryNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<DataSourceQueryResult> {
    const config = node.configuration || (node as any).data?.config || (node as any).data || {};
    // sqlQueryId를 여러 위치에서 확인
    let sqlQueryId = config.sqlQueryId || (node as any).data?.sqlQueryId || (node as any).sqlQueryId;
    
    if (!sqlQueryId) {
      // 노드 데이터에서도 확인
      const nodeData = (node as any).data || {};
      sqlQueryId = nodeData.sqlQueryId || nodeData.id;
      
      if (!sqlQueryId) {
        throw new Error('SQL 쿼리 ID가 설정되지 않았습니다. SQL 쿼리 노드를 더블클릭하여 설정을 완료해주세요.');
      }
    }

    try {
      // 등록된 SQL 쿼리 조회
      const { storage } = await import('../storage.js');
      const sqlQuery = await storage.getSqlQuery(sqlQueryId);
      
      if (!sqlQuery) {
        throw new Error(`SQL 쿼리를 찾을 수 없습니다: ${sqlQueryId}`);
      }

      // 데이터소스 조회
      const dataSource = await storage.getDataSource(sqlQuery.dataSourceId);
      if (!dataSource) {
        throw new Error(`데이터소스를 찾을 수 없습니다: ${sqlQuery.dataSourceId}`);
      }

      // 쿼리 템플릿에 파라미터 적용
      let finalQuery = sqlQuery.query;
      if (sqlQuery.parameters && Array.isArray(sqlQuery.parameters)) {
        const params = config.parameters || input || {};
        const paramArray = Array.isArray(sqlQuery.parameters) 
          ? sqlQuery.parameters 
          : Object.entries(sqlQuery.parameters || {}).map(([name, value]) => ({ name, value }));
        
        paramArray.forEach((param: SqlQueryParameter | string) => {
          const paramObj = typeof param === 'string' ? { name: param } : param;
          const paramName = paramObj.name;
          const paramValue = params[paramName];
          if (paramValue !== undefined) {
            // 간단한 파라미터 치환 (실제 구현에서는 prepared statement 사용 권장)
            finalQuery = finalQuery.replace(new RegExp(`\\{${paramName}\\}`, 'g'), String(paramValue));
          }
        });
      }

      // 데이터소스 타입에 따라 쿼리 실행
      if (dataSource.type === 'databricks') {
        const { getAzureDatabricksService } = await import('./azure-databricks.js');
        const databricksService = getAzureDatabricksService();
        const result = await databricksService.executeQuery(finalQuery, input, {
          maxRows: sqlQuery.maxRows || 10000,
          trackCost: false
        });
        return {
          data: result.data || [],
          rowCount: result.rowCount || 0,
          executionTime: result.executionTime || 0,
          schema: result.schema
        };
      } else if (dataSource.type === 'postgresql') {
        const { db } = await import('../db.js');
        const { sql } = await import('drizzle-orm');
        const result = await db.execute(sql.raw(finalQuery));
        return {
          data: result.rows || [],
          rowCount: result.rows?.length || 0,
          executionTime: 0,
          schema: result.fields?.map((f: { name: string; dataTypeID: number }) => ({ 
            name: f.name, 
            type: f.dataTypeID 
          })) || []
        };
      } else {
        throw new Error(`지원하지 않는 데이터소스 타입: ${dataSource.type}`);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'executeSqlQueryNode',
        message: `SQL 쿼리 노드 실행 실패: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage),
        severity: 'HIGH',
        metadata: { sqlQueryId }
      });
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  private async executeDataSourceNode(node: WorkflowNode, input: NodeInputData): Promise<DataSourceQueryResult> {
    // Support both node.configuration and node.data structures
    const config = node.configuration || (node as any).data || {};
    const source = config.source || config.dataSourceType || 'databricks';
    const query = config.query;
    
    if (!query) {
      throw new Error('SQL query is required for dataSource node');
    }

    // Build parameters from input and context variables
    const parameters: Record<string, unknown> = typeof input === 'object' && input !== null && !Array.isArray(input)
      ? { ...input as Record<string, unknown> }
      : {};
    
    try {
      let queryResult: any;

      if (source === 'databricks') {
        const { getAzureDatabricksService } = await import('./azure-databricks.js');
        const databricksService = getAzureDatabricksService();
        
        const result = await databricksService.executeQuery(query, parameters, {
          maxRows: 10000,
          trackCost: false
        });
        
        queryResult = {
          data: result.data || [],
          rowCount: typeof result.rowCount === 'number' ? result.rowCount : (Array.isArray(result.data) ? result.data.length : 0),
          executionTime: result.executionTime || 0,
          schema: result.schema
        };
      } else if (source === 'postgresql') {
        const { db } = await import('../db.js');
        const { sql } = await import('drizzle-orm');
        
        // Use raw SQL query for PostgreSQL
        const result = await db.execute(sql.raw(query));
        queryResult = {
          data: result.rows || [],
          rowCount: result.rows?.length || 0,
          executionTime: 0,
          schema: result.fields?.map((f: { name: string; dataTypeID: number }) => ({ name: f.name, type: f.dataTypeID })) || []
        };
      } else if (source === 'api') {
        return await this.fetchFromApi(query, parameters);
      } else if (source === 'file' || source === 'database') {
        return await this.readFromFile(query, parameters);
      } else {
        throw new Error(`Unsupported data source: ${source}`);
      }

      return queryResult;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'executeDataSourceNode',
        message: `데이터 소스 노드 실행 실패: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage),
        severity: 'HIGH',
        metadata: { source, query: query.substring(0, 100) }
      });
      throw error;
    }
  }

  private async prepareNodeInput(context: WorkflowExecutionContext, node: WorkflowNode): Promise<any> {
    // 이전 노드들의 출력을 기반으로 입력 데이터 준비
    const inputData: any = {};
    
    // 트레이스 로그: 입력 데이터 준비 시작
    await detailedLogger.trace({
      service: 'WorkflowExecutionEngine',
      task: 'prepareNodeInput',
      message: `노드 입력 데이터 준비 시작: ${node.name || node.id}`,
      metadata: {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type
      },
      workflowId: context.workflowId,
      nodeId: node.id,
      sessionId: context.sessionId,
      caller: 'executeNode',
      callee: 'prepareNodeInput'
    });
    
    // 노드 설정에서 입력 매핑 정보 추출 (호환: configuration / data / data.config)
    const inputMapping = (node as any)?.configuration?.inputMapping
      ?? (node as any)?.data?.inputMapping
      ?? (node as any)?.data?.config?.inputMapping
      ?? null;

    if (inputMapping && typeof inputMapping === 'object') {
      // 디버그 로그: 수동 입력 매핑 사용
      await detailedLogger.debug({
        service: 'WorkflowExecutionEngine',
        task: 'prepareNodeInput',
        message: `수동 입력 매핑 사용: ${Object.keys(inputMapping).length}개 키`,
        metadata: {
          nodeId: node.id,
          inputMappingKeys: Object.keys(inputMapping),
          mappingType: 'manual'
        },
        workflowId: context.workflowId,
        nodeId: node.id,
        sessionId: context.sessionId
      });

      for (const [key, source] of Object.entries(inputMapping)) {
        if (typeof source === 'string' && source.startsWith('$')) {
          // 다른 노드의 출력 참조
          const sourceNodeId = source.substring(1);
          
          // 트레이스 로그: 이전 노드 출력 조회
          await detailedLogger.trace({
            service: 'WorkflowExecutionEngine',
            task: 'prepareNodeInput',
            message: `이전 노드 출력 조회: ${sourceNodeId} -> ${key}`,
            metadata: {
              nodeId: node.id,
              sourceNodeId: sourceNodeId,
              targetKey: key,
              lookupMethod: 'memory_first'
            },
            workflowId: context.workflowId,
            nodeId: node.id,
            sessionId: context.sessionId
          });
          
          // 먼저 메모리에서 조회
          let nodeOutput = context.sessionData.get(sourceNodeId)?.output;
          
          // 메모리에 없으면 PostgreSQL에서 조회
          if (!nodeOutput) {
            // 트레이스 로그: PostgreSQL에서 조회
            await detailedLogger.trace({
              service: 'WorkflowExecutionEngine',
              task: 'prepareNodeInput',
              message: `PostgreSQL에서 이전 노드 출력 조회: ${sourceNodeId}`,
              metadata: {
                nodeId: node.id,
                sourceNodeId: sourceNodeId,
                lookupMethod: 'database'
              },
              workflowId: context.workflowId,
              nodeId: node.id,
              sessionId: context.sessionId
            });
            
            nodeOutput = await this.getNodeOutputFromSession(context.sessionId, sourceNodeId);
            // 조회한 데이터를 메모리에 캐시
            if (nodeOutput) {
              context.sessionData.set(sourceNodeId, { output: nodeOutput });
            }
          } else {
            // 트레이스 로그: 메모리에서 조회 성공
            await detailedLogger.trace({
              service: 'WorkflowExecutionEngine',
              task: 'prepareNodeInput',
              message: `메모리에서 이전 노드 출력 조회 성공: ${sourceNodeId}`,
              metadata: {
                nodeId: node.id,
                sourceNodeId: sourceNodeId,
                lookupMethod: 'memory',
                outputSize: JSON.stringify(nodeOutput).length
              },
              workflowId: context.workflowId,
              nodeId: node.id,
              sessionId: context.sessionId
            });
          }
          
          inputData[key] = nodeOutput;
        } else {
          // 직접 값
          inputData[key] = source;
        }
      }
    } else {
      // inputMapping이 없으면, 이전 노드들의 출력을 자동으로 가져옴
      // edges를 통해 이전 노드들을 찾아서 출력 데이터를 자동으로 전달
      const edges = context.metadata?.edges || [];
      
      // 디버그 로그: 자동 입력 매핑 사용
      await detailedLogger.debug({
        service: 'WorkflowExecutionEngine',
        task: 'prepareNodeInput',
        message: `자동 입력 매핑 사용 (edges 기반): ${edges.length}개 연결선`,
        metadata: {
          nodeId: node.id,
          edgesCount: edges.length,
          mappingType: 'automatic'
        },
        workflowId: context.workflowId,
        nodeId: node.id,
        sessionId: context.sessionId
      });
      
      const previousNodeOutputs = await this.getPreviousNodeOutputs(context.sessionId, node.id, edges, context.workflowId);
      if (previousNodeOutputs && Object.keys(previousNodeOutputs).length > 0) {
        // 트레이스 로그: 이전 노드 출력 조회 결과
        await detailedLogger.trace({
          service: 'WorkflowExecutionEngine',
          task: 'prepareNodeInput',
          message: `이전 노드 출력 조회 완료: ${Object.keys(previousNodeOutputs).length}개 노드`,
          metadata: {
            nodeId: node.id,
            previousNodeIds: Object.keys(previousNodeOutputs),
            outputKeys: Object.keys(previousNodeOutputs).map(id => {
              const output = previousNodeOutputs[id];
              return output ? Object.keys(output) : [];
            }).flat()
          },
          workflowId: context.workflowId,
          nodeId: node.id,
          sessionId: context.sessionId,
          requestData: previousNodeOutputs
        });
        
        // 이전 노드가 하나면 직접 할당, 여러 개면 객체로 할당
        const previousNodeIds = Object.keys(previousNodeOutputs);
        if (previousNodeIds.length === 1) {
          Object.assign(inputData, previousNodeOutputs[previousNodeIds[0]] || previousNodeOutputs);
        } else {
          // 여러 이전 노드가 있으면 각 노드 ID를 키로 사용
          previousNodeIds.forEach(prevNodeId => {
            inputData[prevNodeId] = previousNodeOutputs[prevNodeId];
          });
        }
      } else {
        // 디버그 로그: 이전 노드 없음
        await detailedLogger.debug({
          service: 'WorkflowExecutionEngine',
          task: 'prepareNodeInput',
          message: `이전 노드 없음 (시작 노드 또는 연결되지 않은 노드)`,
          metadata: {
            nodeId: node.id,
            edgesCount: edges.length,
            previousNodesCount: 0
          },
          workflowId: context.workflowId,
          nodeId: node.id,
          sessionId: context.sessionId
        });
      }
    }
    
    // 트레이스 로그: 입력 데이터 준비 완료
    await detailedLogger.trace({
      service: 'WorkflowExecutionEngine',
      task: 'prepareNodeInput',
      message: `노드 입력 데이터 준비 완료: ${Object.keys(inputData).length}개 키`,
      metadata: {
        nodeId: node.id,
        inputKeys: Object.keys(inputData),
        inputSize: JSON.stringify(inputData).length
      },
      workflowId: context.workflowId,
      nodeId: node.id,
      sessionId: context.sessionId,
      responseData: inputData
    });
    
    return inputData;
  }

  private collectWorkflowResult(context: WorkflowExecutionContext): any {
    const result: any = {};
    
    for (const [nodeId, data] of context.sessionData.entries()) {
      result[nodeId] = data;
    }
    
    return result;
  }

  private async saveNodeExecution(
    sessionId: string, 
    nodeId: string, 
    nodeName: string,
    nodeType: string,
    status: string, 
    input?: any, 
    output?: any, 
    error?: string,
    executionTime?: number,
    startedAt?: Date,
    completedAt?: Date
  ): Promise<void> {
    try {
      const now = new Date();
      const actualStartedAt = startedAt || now;
      const actualCompletedAt = completedAt || (status === 'completed' || status === 'failed' ? now : null);
      
      // nodeId가 workflow_nodes 테이블의 id를 참조하지 않을 수 있으므로
      // metadata에 node 정보를 저장하고, nodeId는 정의의 node.id를 그대로 사용
      // (외래키 제약조건을 피하기 위해 nodeId를 UUID로 변환하거나, 외래키를 nullable로 변경 필요)
      await db.insert(workflowNodeExecutions).values({
        id: randomUUID(),
        sessionId,
        nodeId: nodeId, // workflow.definition.nodes의 id를 그대로 사용 (외래키 문제 가능)
        status,
        inputData: input, // jsonb는 직접 객체로 저장
        outputData: output, // jsonb는 직접 객체로 저장
        errorMessage: error || null,
        executionTime: executionTime || null,
        startedAt: actualStartedAt,
        completedAt: actualCompletedAt,
        metadata: {
          nodeName,
          nodeType,
          nodeDefinitionId: nodeId // workflow.definition.nodes의 id 보존
        }
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'saveNodeExecution',
        message: `노드 실행 기록 저장 실패: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage),
        severity: 'MEDIUM'
      });
    }
  }

  /**
   * 노드 출력 데이터를 PostgreSQL에 저장
   */
  private async saveNodeOutputToSession(sessionId: string, nodeId: string, output: any, workflowId?: string): Promise<void> {
    try {
      const dataKey = `${nodeId}_output`;
      const dataType = this.getDataType(output);
      
      // 트레이스 로그: 노드 출력 저장 시작
      await detailedLogger.trace({
        service: 'WorkflowExecutionEngine',
        task: 'saveNodeOutputToSession',
        message: `노드 출력 데이터 저장 시작: ${nodeId}`,
        metadata: {
          sessionId,
          nodeId,
          dataKey,
          dataType,
          outputSize: JSON.stringify(output).length
        },
        workflowId: workflowId,
        nodeId: nodeId,
        sessionId: sessionId,
        responseData: output,
        caller: 'executeNode',
        callee: 'saveNodeOutputToSession'
      });
      
      // upsert 방식으로 저장 (같은 dataKey가 있으면 업데이트)
      const existing = await db.select()
        .from(workflowSessionData)
        .where(
          and(
            eq(workflowSessionData.sessionId, sessionId),
            eq(workflowSessionData.dataKey, dataKey)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 업데이트
        await db.update(workflowSessionData)
          .set({
            dataValue: output,
            dataType,
            outputData: output,
            executionStatus: 'success',
            updatedAt: new Date()
          })
          .where(eq(workflowSessionData.id, existing[0].id));
        
        // 디버그 로그: 업데이트
        await detailedLogger.debug({
          service: 'WorkflowExecutionEngine',
          task: 'saveNodeOutputToSession',
          message: `노드 출력 데이터 업데이트: ${nodeId}`,
          metadata: {
            sessionId,
            nodeId,
            dataKey,
            operation: 'update'
          },
          workflowId: workflowId,
          nodeId: nodeId,
          sessionId: sessionId
        });
      } else {
        // 새로 생성
        await db.insert(workflowSessionData).values({
          sessionId,
          dataKey,
          dataValue: output,
          dataType,
          outputData: output,
          executionStatus: 'success',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // 디버그 로그: 생성
        await detailedLogger.debug({
          service: 'WorkflowExecutionEngine',
          task: 'saveNodeOutputToSession',
          message: `노드 출력 데이터 생성: ${nodeId}`,
          metadata: {
            sessionId,
            nodeId,
            dataKey,
            operation: 'insert'
          },
          workflowId: workflowId,
          nodeId: nodeId,
          sessionId: sessionId
        });
      }

      detailedLogger.info({
        service: 'WorkflowExecutionEngine',
        task: 'saveNodeOutputToSession',
        message: `노드 출력 데이터 저장 완료: ${nodeId}`,
        metadata: { sessionId, nodeId, dataKey }
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'saveNodeOutputToSession',
        message: `노드 출력 데이터 저장 실패: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage),
        severity: 'MEDIUM',
        metadata: { sessionId, nodeId }
      });
    }
  }

  /**
   * PostgreSQL에서 노드 출력 데이터 조회
   */
  private async getNodeOutputFromSession(sessionId: string, nodeId: string): Promise<any> {
    try {
      const dataKey = `${nodeId}_output`;
      const [result] = await db.select()
        .from(workflowSessionData)
        .where(
          and(
            eq(workflowSessionData.sessionId, sessionId),
            eq(workflowSessionData.dataKey, dataKey)
          )
        )
        .limit(1);

      return result?.outputData || result?.dataValue || null;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'getNodeOutputFromSession',
        message: `노드 출력 데이터 조회 실패: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage),
        severity: 'MEDIUM',
        metadata: { sessionId, nodeId }
      });
      return null;
    }
  }

  /**
   * 이전 노드들의 출력 데이터 조회 (edges를 기반으로)
   */
  private async getPreviousNodeOutputs(sessionId: string, nodeId: string, edges?: Array<{ source: string; target: string }>): Promise<any> {
    try {
      if (!edges || edges.length === 0) {
        return {};
      }

      // 이전 노드 찾기
      const previousNodeIds = edges
        .filter(edge => edge.target === nodeId)
        .map(edge => edge.source);

      if (previousNodeIds.length === 0) {
        return {};
      }

      // 이전 노드들의 출력 데이터 조회
      const outputs: Record<string, NodeOutputData> = {};
      for (const prevNodeId of previousNodeIds) {
        const output = await this.getNodeOutputFromSession(sessionId, prevNodeId);
        if (output) {
          outputs[prevNodeId] = output;
        }
      }

      return outputs;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'getPreviousNodeOutputs',
        message: `이전 노드 출력 데이터 조회 실패: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage),
        severity: 'MEDIUM',
        metadata: { sessionId, nodeId }
      });
      return {};
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
   * Topological sort for nodes based on edges
   */
  private sortNodesTopologically(nodes: WorkflowNode[], edges: Array<{ source: string; target: string }>): WorkflowNode[] {
    // Build adjacency list and in-degree count
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    nodes.forEach(node => {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    edges.forEach(edge => {
      if (!adjacencyList.has(edge.source) || !adjacencyList.has(edge.target)) {
        return; // Skip invalid edges
      }
      adjacencyList.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    nodes.forEach(node => {
      if ((inDegree.get(node.id) || 0) === 0) {
        queue.push(node.id);
      }
    });

    const sorted: WorkflowNode[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        sorted.push(node);
      }

      const neighbors = adjacencyList.get(nodeId) || [];
      neighbors.forEach(neighborId => {
        const degree = (inDegree.get(neighborId) || 0) - 1;
        inDegree.set(neighborId, degree);
        if (degree === 0) {
          queue.push(neighborId);
        }
      });
    }

    // If there are cycles or nodes not in edges, add remaining nodes
    const sortedIds = new Set(sorted.map(n => n.id));
    const isolatedNodes = nodes.filter(node => !sortedIds.has(node.id));
    
    if (isolatedNodes.length > 0) {
      detailedLogger.warn({
        service: 'WorkflowExecutionEngine',
        task: 'sortNodesTopologically',
        message: `연결되지 않은 노드 발견 (edges에 연결되지 않은 노드들): ${isolatedNodes.map(n => n.id).join(', ')}`,
        metadata: { 
          isolatedNodeIds: isolatedNodes.map(n => n.id),
          isolatedNodeNames: isolatedNodes.map(n => n.name || n.id)
        }
      });
      // 연결되지 않은 노드들을 정렬 결과에 추가 (노드 생성 순서와 무관하게 처리)
      isolatedNodes.forEach(node => {
        sorted.push(node);
      });
    }

    return sorted;
  }

  // 유틸리티 메서드들
  private validateJsonSchema(data: any, schema: any): any {
    // 간단한 JSON 스키마 검증 (실제로는 ajv 등 사용)
    return { valid: true, data };
  }

  private transformJson(data: any, rules: any): any {
    // JSON 변환 로직
    return data;
  }

  private mergeJson(data: any, mergeData: any): any {
    return { ...data, ...mergeData };
  }

  private filterData(data: any, rules: any): any {
    // 데이터 필터링 로직
    return data;
  }

  private aggregateData(data: any, rules: any): any {
    // 데이터 집계 로직
    return data;
  }

  private async executePythonScriptNode(node: WorkflowNode, input: any, context: WorkflowExecutionContext): Promise<any> {
    try {
      const config = node.configuration || {};
      
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

      const pythonContext = {
        sessionId: context.sessionId,
        nodeId: node.id,
        inputData: input,
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

      const result = await pythonExecutionEngine.executeScript(pythonContext);
      
      if (!result.success) {
        throw new Error(result.error || 'Python script execution failed');
      }

      // Python 실행 결과도 PostgreSQL에 저장되도록 함 (python-execution-engine.ts에서 처리)
      return result.output;
    } catch (error: any) {
      console.error('Python script execution error:', error);
      throw error;
    }
  }

  private formatData(data: any, rules: any): any {
    // 데이터 포맷팅 로직
    return data;
  }

  private async queryDatabase(query: string, parameters: any): Promise<any> {
    // This method is deprecated - use executeDataSourceNode with source='postgresql' instead
    const { db } = await import('../db.js');
    const { sql } = await import('drizzle-orm');
    
    // Execute raw SQL query for PostgreSQL
    const result = await db.execute(sql.raw(query));
    return {
      data: result.rows || [],
      rowCount: result.rows?.length || 0,
      executionTime: 0
    };
  }

  private async fetchFromApi(url: string, parameters: any): Promise<any> {
    // API 호출 (상대경로 지원)
    const axios = (await import('axios')).default;
    let targetUrl = url;
    if (typeof url === 'string' && url.startsWith('/')) {
      const base = process.env.INTERNAL_API_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
      targetUrl = base.replace(/\/$/, '') + url;
    }
    const response = await axios.get(targetUrl, { params: parameters });
    return response.data;
  }

  private async readFromFile(filePath: string, parameters: any): Promise<any> {
    // 파일 읽기
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  async getWorkflowSession(sessionId: string): Promise<any> {
    const [session] = await db.select()
      .from(workflowSessions)
      .where(eq(workflowSessions.id, sessionId));
    
    return session;
  }

  async getWorkflowSessionExecutions(sessionId: string): Promise<any[]> {
    const executions = await db.select()
      .from(workflowNodeExecutions)
      .where(eq(workflowNodeExecutions.sessionId, sessionId))
      .orderBy(desc(workflowNodeExecutions.startedAt));
    
    return executions;
  }

  async cancelWorkflowSession(sessionId: string): Promise<void> {
    await db.update(workflowSessions)
      .set({ status: 'cancelled', completedAt: new Date() })
      .where(eq(workflowSessions.id, sessionId));
    
    this.activeSessions.delete(sessionId);
  }

  /**
   * 워크플로우 결과를 Databricks gold 스키마에 저장
   */
  private async saveWorkflowResultToDatabricks(context: WorkflowExecutionContext, resultData: any): Promise<void> {
    try {
      // 워크플로우 정보 조회
      const [workflow] = await db.select().from(workflows).where(eq(workflows.id, context.workflowId));
      if (!workflow) {
        throw new Error('워크플로우를 찾을 수 없습니다');
      }

      // 결과 데이터 스키마 추출
      const schema = this.extractSchemaFromData(resultData);
      
      // Databricks 서비스 가져오기
      const { getAzureDatabricksService } = await import('./azure-databricks.js');
      const databricksService = getAzureDatabricksService();
      
      // 테이블명: nh_ai.gold.{workflowId}
      const tableName = `nh_ai.gold.${context.workflowId.replace(/-/g, '_')}`;
      const description = `${workflow.name} - ${workflow.description || ''}`.trim();
      
      // CREATE TABLE 쿼리 생성
      const columns = schema.map(col => `${col.name} ${col.type}`).join(', ');
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          ${columns}
        )
        USING DELTA
        COMMENT '${description.replace(/'/g, "''")}'
      `;
      
      // 테이블 생성 또는 업데이트 (스키마 변경 시)
      try {
        await databricksService.executeQuery(createTableQuery, {}, { maxRows: 1 });
      } catch (createError) {
        // 테이블이 이미 존재하는 경우 스키마 변경 시도
        if (createError.message?.includes('already exists') || createError.message?.includes('Table') && createError.message?.includes('already exists')) {
          // 스키마 변경은 복잡하므로 로그만 남기고 진행
          detailedLogger.warn({
            service: 'WorkflowExecutionEngine',
            task: 'saveWorkflowResultToDatabricks',
            message: `테이블이 이미 존재합니다: ${tableName}. 기존 테이블에 데이터를 삽입합니다.`,
            metadata: { sessionId: context.sessionId, workflowId: context.workflowId, tableName }
          });
        } else {
          throw createError;
        }
      }
      
      // 데이터 삽입 (배열인 경우 여러 행 삽입)
      if (Array.isArray(resultData) && resultData.length > 0) {
        // 배열의 경우 배치 처리 (한 번에 최대 1000행)
        const batchSize = 1000;
        for (let i = 0; i < resultData.length; i += batchSize) {
          const batch = resultData.slice(i, i + batchSize);
          const values = batch.map(row => {
            const rowValues = schema.map(col => {
              const value = row[col.name];
              if (value === null || value === undefined) {
                return 'NULL';
              }
              if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`;
              }
              if (typeof value === 'object') {
                return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
              }
              return String(value);
            }).join(', ');
            return `(${rowValues})`;
          }).join(', ');
          
          const insertQuery = `INSERT INTO ${tableName} (${schema.map(col => col.name).join(', ')}) VALUES ${values}`;
          await databricksService.executeQuery(insertQuery, {}, { maxRows: 1 });
        }
      } else if (resultData && typeof resultData === 'object') {
        // 단일 객체인 경우, workflowEnd 같은 메타데이터 필드 제외
        const dataToInsert = { ...resultData };
        delete dataToInsert.workflowEnd;
        delete dataToInsert.completedAt;
        
        const values = schema.map(col => {
          const value = dataToInsert[col.name];
          if (value === null || value === undefined) {
            return 'NULL';
          }
          if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
          }
          if (typeof value === 'object') {
            return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          }
          return String(value);
        }).join(', ');
        
        const insertQuery = `INSERT INTO ${tableName} (${schema.map(col => col.name).join(', ')}) VALUES (${values})`;
        await databricksService.executeQuery(insertQuery, {}, { maxRows: 1 });
      }
      
      detailedLogger.info({
        service: 'WorkflowExecutionEngine',
        task: 'saveWorkflowResultToDatabricks',
        message: `워크플로우 결과가 Databricks에 저장되었습니다: ${tableName}`,
        metadata: { sessionId: context.sessionId, workflowId: context.workflowId, tableName }
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Databricks 저장 실패: ${errorMessage}`);
    }
  }

  /**
   * 데이터에서 스키마 추출
   */
  private extractSchemaFromData(data: any): Array<{ name: string; type: string }> {
    const schema: Array<{ name: string; type: string }> = [];
    
    if (Array.isArray(data) && data.length > 0) {
      // 배열의 첫 번째 요소에서 스키마 추출
      const firstItem = data[0];
      if (firstItem && typeof firstItem === 'object') {
        for (const [key, value] of Object.entries(firstItem)) {
          schema.push({
            name: key,
            type: this.inferDataType(value)
          });
        }
      }
    } else if (data && typeof data === 'object' && !Array.isArray(data)) {
      // 객체에서 스키마 추출
      for (const [key, value] of Object.entries(data)) {
        // workflowEnd, completedAt 같은 메타데이터는 제외
        if (key !== 'workflowEnd' && key !== 'completedAt') {
          schema.push({
            name: key,
            type: this.inferDataType(value)
          });
        }
      }
    }
    
    return schema;
  }

  /**
   * 조건 분기 노드 실행
   */
  private async executeConditionNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    try {
      const config = node.configuration || (node as any).data?.config || (node as any).data || {};
      const conditionExpression = config.conditionExpression || config.condition || '';
      const conditionType = config.conditionType || 'expression';

      if (!conditionExpression) {
        throw new Error('조건식이 설정되지 않았습니다');
      }

      let result: boolean;

      if (conditionType === 'comparison') {
        // 비교 연산자 기반 조건 평가
        const { field, operator, value } = config;
        if (!field || !operator) {
          throw new Error('비교 조건에 field와 operator가 필요합니다');
        }

        const fieldValue = this.getNestedValue(input, field);
        result = this.evaluateComparison(fieldValue, operator, value);
      } else {
        // JavaScript 표현식 기반 조건 평가
        result = this.evaluateExpression(conditionExpression, input);
      }

      // 조건 결과를 출력에 포함
      return {
        condition: conditionExpression,
        result,
        input,
        output: result ? (config.trueOutput || input) : (config.falseOutput || {}),
        metadata: {
          conditionType,
          evaluatedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`조건 노드 실행 실패: ${errMsg}`);
    }
  }

  /**
   * 반복 노드 실행
   */
  private async executeLoopNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    try {
      const config = node.configuration || (node as any).data?.config || (node as any).data || {};
      const loopType = config.loopType || 'foreach'; // foreach, while, for
      const maxIterations = config.maxIterations || 1000; // 무한 루프 방지

      let results: any[] = [];
      let iterationCount = 0;

      if (loopType === 'foreach') {
        // 배열 반복
        const arrayField = config.arrayField || 'data';
        const array = this.getNestedValue(input, arrayField);

        if (!Array.isArray(array)) {
          throw new Error(`반복할 배열이 없습니다. 필드 "${arrayField}"가 배열이 아닙니다.`);
        }

        for (let i = 0; i < array.length && i < maxIterations; i++) {
          iterationCount++;
          const item = array[i];
          const itemInput = { ...input, item, index: i, iteration: iterationCount };

          // 루프 내부 노드 실행 (설정된 경우)
          if (config.loopNodeId) {
            // 하위 노드 실행은 워크플로우 실행 엔진에서 처리
            results.push(itemInput);
          } else {
            results.push(itemInput);
          }
        }
      } else if (loopType === 'while') {
        // 조건 반복
        const conditionExpression = config.conditionExpression || config.condition || 'true';
        let conditionResult = true;

        while (conditionResult && iterationCount < maxIterations) {
          iterationCount++;
          const loopInput = { ...input, iteration: iterationCount };

          conditionResult = this.evaluateExpression(conditionExpression, loopInput);
          if (conditionResult) {
            results.push(loopInput);
          }
        }

        if (iterationCount >= maxIterations) {
          detailedLogger.warn({
            service: 'WorkflowExecutionEngine',
            task: 'executeLoopNode',
            message: `반복 횟수 제한에 도달했습니다: ${maxIterations}`,
            metadata: { nodeId: node.id, loopType, maxIterations }
          });
        }
      } else if (loopType === 'for') {
        // 횟수 기반 반복
        const count = config.count || 1;
        const actualCount = Math.min(count, maxIterations);

        for (let i = 0; i < actualCount; i++) {
          iterationCount++;
          const loopInput = { ...input, iteration: iterationCount, index: i };
          results.push(loopInput);
        }
      }

      return {
        input,
        output: {
          results,
          iterationCount,
          loopType,
          completed: iterationCount < maxIterations
        },
        metadata: {
          loopType,
          iterationCount,
          maxIterations
        }
      };
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`반복 노드 실행 실패: ${errMsg}`);
    }
  }

  /**
   * 다중 분기 노드 실행
   */
  private async executeBranchNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    try {
      const config = node.configuration || (node as any).data?.config || (node as any).data || {};
      const branches = config.branches || [];

      if (!Array.isArray(branches) || branches.length === 0) {
        throw new Error('분기 조건이 설정되지 않았습니다');
      }

      let matchedBranch: any = null;
      let matchedOutput: any = null;

      // 각 분기 조건을 순서대로 평가
      for (const branch of branches) {
        const condition = branch.condition || branch.conditionExpression || '';
        if (!condition) {
          // 조건이 없으면 기본 분기로 처리
          matchedBranch = branch;
          matchedOutput = branch.output || input;
          break;
        }

        const conditionResult = this.evaluateExpression(condition, input);
        if (conditionResult) {
          matchedBranch = branch;
          matchedOutput = branch.output || input;
          break;
        }
      }

      // 매칭된 분기가 없으면 기본 출력 사용
      if (!matchedBranch) {
        matchedOutput = config.defaultOutput || input;
      }

      return {
        input,
        output: matchedOutput,
        branch: matchedBranch?.label || matchedBranch?.id || 'default',
        metadata: {
          branchCount: branches.length,
          matchedBranch: matchedBranch?.label || matchedBranch?.id || 'default',
          evaluatedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`분기 노드 실행 실패: ${errMsg}`);
    }
  }

  /**
   * 변환 노드 실행
   */
  private async executeTransformNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    try {
      const config = node.configuration || (node as any).data?.config || (node as any).data || {};
      const expression = config.expression || config.transformExpression || '';

      if (!expression) {
        // 표현식이 없으면 입력을 그대로 반환
        return input;
      }

      // JavaScript 표현식으로 변환 수행
      const transformed = this.evaluateExpression(expression, input);

      return {
        input,
        output: transformed,
        metadata: {
          expression,
          transformedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`변환 노드 실행 실패: ${errMsg}`);
    }
  }

  /**
   * 출력 노드 실행
   */
  private async executeOutputNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    try {
      const config = node.configuration || (node as any).data?.config || (node as any).data || {};
      const format = config.format || 'json'; // json, text, csv, table
      const destination = config.destination || 'session'; // session, file, api, database
      const outputField = config.outputField || 'output';

      let formattedOutput: any;

      switch (format) {
        case 'json':
          formattedOutput = JSON.stringify(input, null, 2);
          break;
        case 'text':
          formattedOutput = this.formatAsText(input);
          break;
        case 'csv':
          formattedOutput = this.formatAsCsv(input);
          break;
        case 'table':
          formattedOutput = this.formatAsTable(input);
          break;
        default:
          formattedOutput = input;
      }

      // 출력을 세션 데이터에 저장
      if (destination === 'session') {
        await this.saveNodeOutputToSession(context.sessionId, node.id, formattedOutput, context.workflowId);
      } else if (destination === 'file') {
        // 파일 저장은 향후 구현
        detailedLogger.info({
          service: 'WorkflowExecutionEngine',
          task: 'executeOutputNode',
          message: `파일 출력은 아직 구현되지 않았습니다. 세션에 저장합니다.`,
          metadata: { nodeId: node.id, format, destination }
        });
        await this.saveNodeOutputToSession(context.sessionId, node.id, formattedOutput, context.workflowId);
      }

      return {
        input,
        output: {
          [outputField]: formattedOutput,
          format,
          destination,
          size: typeof formattedOutput === 'string' ? formattedOutput.length : JSON.stringify(formattedOutput).length
        },
        metadata: {
          format,
          destination,
          outputAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`출력 노드 실행 실패: ${errMsg}`);
    }
  }

  /**
   * 하위 워크플로우 노드 실행
   */
  private async executeWorkflowNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    try {
      const config = node.configuration || (node as any).data?.config || (node as any).data || {};
      const workflowId = config.workflowId || (node as any).data?.workflowId;

      if (!workflowId) {
        throw new Error('하위 워크플로우 ID가 설정되지 않았습니다');
      }

      // 하위 워크플로우 세션 생성
      const subSessionId = await this.createWorkflowSession(
        workflowId,
        `Sub-workflow from ${context.workflowId}`,
        context.userId
      );

      // 하위 워크플로우의 초기 입력 데이터 설정
      const subContext = this.activeSessions.get(subSessionId);
      if (subContext) {
        // 입력 데이터를 하위 워크플로우의 시작 노드에 전달
        subContext.sessionData.set('__input__', { output: input });
        await this.saveNodeOutputToSession(subSessionId, '__input__', input, workflowId);
      }

      // 하위 워크플로우 실행
      const subResult = await this.executeWorkflow(subSessionId);

      // 하위 워크플로우의 최종 결과 추출
      const subContextAfter = this.activeSessions.get(subSessionId);
      const finalOutput = subContextAfter?.sessionData.get('__final__')?.output || subResult.result || {};

      return {
        input,
        output: finalOutput,
        subWorkflowId: workflowId,
        subSessionId,
        metadata: {
          subWorkflowId: workflowId,
          subSessionId,
          executedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`하위 워크플로우 노드 실행 실패: ${errMsg}`);
    }
  }

  /**
   * 템플릿 노드 실행
   */
  private async executeTemplateNode(node: WorkflowNode, input: NodeInputData, context: WorkflowExecutionContext): Promise<NodeOutputData> {
    try {
      const config = node.configuration || (node as any).data?.config || (node as any).data || {};
      const templateText = config.templateText || config.template || '';
      const placeholderFormat = config.placeholderFormat || '{{}}'; // {{}}, ${}, {VAR}

      if (!templateText) {
        throw new Error('템플릿 텍스트가 설정되지 않았습니다');
      }

      let result = templateText;

      // 플레이스홀더 형식에 따라 변수 치환
      if (placeholderFormat === '{{}}') {
        // {{variable}} 형식
        result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          const value = this.getNestedValue(input, key);
          return value !== undefined ? String(value) : match;
        });
      } else if (placeholderFormat === '${}') {
        // ${variable} 형식
        result = result.replace(/\$\{(\w+)\}/g, (match, key) => {
          const value = this.getNestedValue(input, key);
          return value !== undefined ? String(value) : match;
        });
      } else if (placeholderFormat === '{VAR}') {
        // {VAR} 형식
        result = result.replace(/\{(\w+)\}/g, (match, key) => {
          const value = this.getNestedValue(input, key);
          return value !== undefined ? String(value) : match;
        });
      } else {
        // 기본적으로 {{}} 형식 사용
        result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          const value = this.getNestedValue(input, key);
          return value !== undefined ? String(value) : match;
        });
      }

      return {
        input,
        output: {
          template: templateText,
          result,
          variables: this.extractVariables(input)
        },
        metadata: {
          placeholderFormat,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`템플릿 노드 실행 실패: ${errMsg}`);
    }
  }

  /**
   * 중첩된 객체에서 값 가져오기 (예: "user.name" -> input.user.name)
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) return obj;
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }
    return value;
  }

  /**
   * JavaScript 표현식 평가 (안전한 평가)
   */
  private evaluateExpression(expression: string, context: any): any {
    try {
      // 안전한 표현식 평가를 위해 Function 생성자 사용
      // 주의: 실제 프로덕션에서는 더 안전한 방법 사용 권장
      const func = new Function('input', 'data', 'context', `
        try {
          return ${expression};
        } catch (e) {
          return false;
        }
      `);
      return func(context, context, context);
    } catch (error) {
      detailedLogger.error({
        service: 'WorkflowExecutionEngine',
        task: 'evaluateExpression',
        message: `표현식 평가 실패: ${expression}`,
        error: error instanceof Error ? error : new Error(String(error)),
        severity: 'MEDIUM',
        metadata: { expression }
      });
      return false;
    }
  }

  /**
   * 비교 연산자 평가
   */
  private evaluateComparison(value: any, operator: string, compareValue: any): boolean {
    switch (operator) {
      case '==':
      case '===':
        return value === compareValue;
      case '!=':
      case '!==':
        return value !== compareValue;
      case '>':
        return value > compareValue;
      case '>=':
        return value >= compareValue;
      case '<':
        return value < compareValue;
      case '<=':
        return value <= compareValue;
      case 'contains':
        return String(value).includes(String(compareValue));
      case 'startsWith':
        return String(value).startsWith(String(compareValue));
      case 'endsWith':
        return String(value).endsWith(String(compareValue));
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(value);
      default:
        return false;
    }
  }

  /**
   * 텍스트 형식으로 포맷팅
   */
  private formatAsText(data: any): string {
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
    return String(data);
  }

  /**
   * CSV 형식으로 포맷팅
   */
  private formatAsCsv(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const rows = data.map(row => headers.map(h => String(row[h] || '')).join(','));
      return [headers.join(','), ...rows].join('\n');
    }
    if (typeof data === 'object') {
      const entries = Object.entries(data);
      return entries.map(([key, value]) => `${key},${value}`).join('\n');
    }
    return String(data);
  }

  /**
   * 테이블 형식으로 포맷팅
   */
  private formatAsTable(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const headerRow = '| ' + headers.join(' | ') + ' |';
      const separatorRow = '|' + headers.map(() => '---').join('|') + '|';
      const dataRows = data.map(row => '| ' + headers.map(h => String(row[h] || '')).join(' | ') + ' |');
      return [headerRow, separatorRow, ...dataRows].join('\n');
    }
    return this.formatAsText(data);
  }

  /**
   * 변수 추출
   */
  private extractVariables(data: any): Record<string, any> {
    if (typeof data === 'object' && data !== null) {
      return data;
    }
    return { value: data };
  }

  /**
   * 값에서 데이터 타입 추론
   */
  private inferDataType(value: any): string {
    if (value === null || value === undefined) {
      return 'STRING';
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'BIGINT' : 'DOUBLE';
    }
    if (typeof value === 'boolean') {
      return 'BOOLEAN';
    }
    if (typeof value === 'string') {
      return 'STRING';
    }
    if (Array.isArray(value)) {
      return 'STRING'; // 배열은 JSON 문자열로 저장
    }
    if (typeof value === 'object') {
      return 'STRING'; // JSON은 문자열로 저장
    }
    return 'STRING';
  }
}

export const workflowExecutionEngine = new WorkflowExecutionEngine();