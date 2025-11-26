import { db } from '../db.js';
import { 
  workflowSessions, 
  workflowNodes, 
  workflowNodeDependencies,
  workflowTemplates,
  users,
  type WorkflowSession,
  type WorkflowNode
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { workflowEngine } from './workflow-engine.js';
import { activityLogger } from './activity-logger.js';

export class AIMarketAnalysisWorkflow {
  private workflowId = 'ai-market-analysis-v1';

  /**
   * AI Market Analysis 워크플로우 템플릿 생성
   */
  async createWorkflowTemplate(createdBy: string): Promise<void> {
    try {
      // 워크플로우 템플릿 생성
      const templateData = {
        workflowId: this.workflowId,
        name: 'AI Market Analysis Workflow',
        description: 'AI를 활용한 시장 분석 워크플로우',
        nodes: [
          {
            id: 'collect-news',
            name: '뉴스 데이터 수집',
            type: 'sql_execution',
            order: 1,
            configuration: {
              query: `
                SELECT 
                  N_ID, N_TITLE, N_CONTENT, N_CODE, N_DATE, N_TIME,
                  GPT01_AD_POST_SCORE, GPT04_CONTENT_QUALITY_SCORE,
                  GPT02_ECO_POST_SCORE, GPT03_MARKET_POST_SCORE
                FROM nh_ai.silver.A200_NEWS_DATA
                WHERE N_DATE >= CURRENT_DATE - INTERVAL '1 day'
                ORDER BY (GPT02_ECO_POST_SCORE + GPT03_MARKET_POST_SCORE + GPT04_CONTENT_QUALITY_SCORE) DESC
                LIMIT 200
              `
            }
          },
          {
            id: 'extract-events',
            name: '주요이벤트 추출',
            type: 'prompt',
            order: 2,
            configuration: {
              prompt: `다음 뉴스 제목들을 분석하여 시장에 영향을 미치는 주요 이벤트를 추출해주세요:

{news_titles}

다음 JSON 형식으로 결과를 제공해주세요:
{
  "events": [
    {
      "eventId": "EVENT_001",
      "eventTitle": "이벤트 제목",
      "eventDetail": "이벤트 상세 설명",
      "impactLevel": "high|medium|low",
      "affectedSectors": ["섹터1", "섹터2"],
      "keywords": ["키워드1", "키워드2"]
    }
  ]
}`,
              model: 'gpt-4',
              maxTokens: 1000
            }
          },
          {
            id: 'generate-themes',
            name: '테마 시황 생성',
            type: 'prompt',
            order: 3,
            configuration: {
              prompt: `다음 이벤트들을 바탕으로 테마별 시황을 생성해주세요:

{market_events}

다음 JSON 형식으로 결과를 제공해주세요:
{
  "themes": [
    {
      "themeId": "THEME_001",
      "themeName": "테마명",
      "analysis": "테마 분석",
      "trend": "상승|하락|보합",
      "confidence": 0.85,
      "relatedEvents": ["EVENT_001", "EVENT_002"]
    }
  ]
}`,
              model: 'gpt-4',
              maxTokens: 1500
            }
          },
          {
            id: 'generate-macro',
            name: '매크로 시황 생성',
            type: 'prompt',
            order: 4,
            configuration: {
              prompt: `다음 테마 시황들을 종합하여 전체 시장의 매크로 시황을 생성해주세요:

{theme_analysis}

다음 JSON 형식으로 결과를 제공해주세요:
{
  "macroAnalysis": {
    "overallTrend": "상승|하락|보합",
    "marketSentiment": "긍정적|부정적|중립",
    "keyDrivers": ["주요 동인1", "주요 동인2"],
    "riskFactors": ["위험 요소1", "위험 요소2"],
    "outlook": "시장 전망",
    "confidence": 0.8
  }
}`,
              model: 'gpt-4',
              maxTokens: 2000
            }
          }
        ]
      };

      // 사용자 존재 여부 확인
      if (createdBy) {
        const { users } = await import('@shared/schema');
        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, createdBy))
          .limit(1);

        if (!user) {
          activityLogger.log('workflow', 'template_creation_failed', {
            templateName: 'AI Market Analysis',
            createdBy,
            error: `User with ID ${createdBy} does not exist`
          });
          throw new Error(`사용자를 찾을 수 없습니다: ${createdBy}`);
        }
      }

      await db.insert(workflowTemplates).values({
        templateName: 'AI Market Analysis',
        description: 'AI를 활용한 시장 분석 워크플로우',
        category: 'ai_analysis',
        templateData,
        isPublic: true,
        createdBy: createdBy || null, // null 허용
        version: '1.0.0'
      });

      activityLogger.log('workflow', 'template_created', {
        templateName: 'AI Market Analysis',
        createdBy
      });

    } catch (error) {
      activityLogger.log('workflow', 'template_creation_failed', {
        templateName: 'AI Market Analysis',
        createdBy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * AI Market Analysis 워크플로우 실행
   */
  async executeWorkflow(sessionName: string, createdBy: string): Promise<WorkflowSession> {
    try {
      // 1. 워크플로우 노드들 생성
      await this.createWorkflowNodes();

      // 2. 워크플로우 의존성 설정 (노드 생성 후 호출)
      await this.createWorkflowDependencies();

      // 3. 세션 생성
      const session = await workflowEngine.createSession(this.workflowId, sessionName, createdBy);

      // 4. 워크플로우 실행 (비동기로 실행하여 즉시 응답)
      workflowEngine.startWorkflow(session.id).catch(error => {
        activityLogger.log('workflow', 'ai_market_analysis_execution_failed', {
          sessionId: session.id,
          error: error.message
        });
      });

      activityLogger.log('workflow', 'ai_market_analysis_executed', {
        sessionId: session.id,
        sessionName,
        createdBy
      });

      return session;

    } catch (error) {
      activityLogger.log('workflow', 'ai_market_analysis_failed', {
        sessionName,
        createdBy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 워크플로우 노드들 생성
   */
  private async createWorkflowNodes(): Promise<void> {
    const nodes = [
      {
        workflowId: this.workflowId,
        nodeName: '뉴스 데이터 수집',
        nodeType: 'sql_execution',
        nodeOrder: 1,
        configuration: {
          query: `
            SELECT 
              N_ID, N_TITLE, N_CONTENT, N_CODE, N_DATE, N_TIME,
              GPT01_AD_POST_SCORE, GPT04_CONTENT_QUALITY_SCORE,
              GPT02_ECO_POST_SCORE, GPT03_MARKET_POST_SCORE
            FROM nh_ai.silver.A200_NEWS_DATA
            WHERE N_DATE >= CURRENT_DATE - INTERVAL '1 day'
            ORDER BY (GPT02_ECO_POST_SCORE + GPT03_MARKET_POST_SCORE + GPT04_CONTENT_QUALITY_SCORE) DESC
            LIMIT 200
          `
        }
      },
      {
        workflowId: this.workflowId,
        nodeName: '주요이벤트 추출',
        nodeType: 'prompt',
        nodeOrder: 2,
        configuration: {
          prompt: `다음 뉴스 제목들을 분석하여 시장에 영향을 미치는 주요 이벤트를 추출해주세요:

{news_titles}

다음 JSON 형식으로 결과를 제공해주세요:
{
  "events": [
    {
      "eventId": "EVENT_001",
      "eventTitle": "이벤트 제목",
      "eventDetail": "이벤트 상세 설명",
      "impactLevel": "high|medium|low",
      "affectedSectors": ["섹터1", "섹터2"],
      "keywords": ["키워드1", "키워드2"]
    }
  ]
}`,
          model: 'gpt-4',
          maxTokens: 1000
        }
      },
      {
        workflowId: this.workflowId,
        nodeName: '테마 시황 생성',
        nodeType: 'prompt',
        nodeOrder: 3,
        configuration: {
          prompt: `다음 이벤트들을 바탕으로 테마별 시황을 생성해주세요:

{market_events}

다음 JSON 형식으로 결과를 제공해주세요:
{
  "themes": [
    {
      "themeId": "THEME_001",
      "themeName": "테마명",
      "analysis": "테마 분석",
      "trend": "상승|하락|보합",
      "confidence": 0.85,
      "relatedEvents": ["EVENT_001", "EVENT_002"]
    }
  ]
}`,
          model: 'gpt-4',
          maxTokens: 1500
        }
      },
      {
        workflowId: this.workflowId,
        nodeName: '매크로 시황 생성',
        nodeType: 'prompt',
        nodeOrder: 4,
        configuration: {
          prompt: `다음 테마 시황들을 종합하여 전체 시장의 매크로 시황을 생성해주세요:

{theme_analysis}

다음 JSON 형식으로 결과를 제공해주세요:
{
  "macroAnalysis": {
    "overallTrend": "상승|하락|보합",
    "marketSentiment": "긍정적|부정적|중립",
    "keyDrivers": ["주요 동인1", "주요 동인2"],
    "riskFactors": ["위험 요소1", "위험 요소2"],
    "outlook": "시장 전망",
    "confidence": 0.8
  }
}`,
          model: 'gpt-4',
          maxTokens: 2000
        }
      }
    ];

    for (const node of nodes) {
      await db.insert(workflowNodes).values(node).onConflictDoNothing();
    }
  }

  /**
   * 워크플로우 의존성 설정
   * 노드 생성 후 호출되어야 함 (외래키 제약 위반 방지)
   */
  private async createWorkflowDependencies(): Promise<void> {
    try {
      // 먼저 모든 노드가 생성되었는지 확인
      const existingNodes = await db.select()
        .from(workflowNodes)
        .where(eq(workflowNodes.workflowId, this.workflowId));

      if (existingNodes.length === 0) {
        console.warn('No nodes found for workflow. Skipping dependencies creation.');
        return;
      }

      // 노드 ID 맵 생성 (노드 이름으로 매핑)
      const nodeMap = new Map<string, string>();
      existingNodes.forEach(node => {
        // 노드 이름을 기반으로 ID 매핑 (예: '뉴스 데이터 수집' -> node.id)
        nodeMap.set(node.nodeName, node.id);
      });

      // 의존성 관계 정의
      const dependencies = [
        { from: '뉴스 데이터 수집', to: '주요이벤트 추출', dataKey: 'news_data' },
        { from: '주요이벤트 추출', to: '테마 시황 생성', dataKey: 'market_events' },
        { from: '테마 시황 생성', to: '매크로 시황 생성', dataKey: 'theme_analysis' }
      ];

      // 의존성 삽입 (노드 존재 확인 후)
      for (const dep of dependencies) {
        const fromNodeId = nodeMap.get(dep.from);
        const toNodeId = nodeMap.get(dep.to);

        if (!fromNodeId || !toNodeId) {
          console.warn(`Node dependency skipped: ${dep.from} -> ${dep.to} (nodes not found)`);
          continue;
        }

        // 노드 존재 여부 재확인
        const fromNodeExists = existingNodes.some(n => n.id === fromNodeId);
        const toNodeExists = existingNodes.some(n => n.id === toNodeId);

        if (!fromNodeExists || !toNodeExists) {
          console.warn(`Node dependency skipped: ${fromNodeId} -> ${toNodeId} (nodes do not exist)`);
          continue;
        }

        await db.insert(workflowNodeDependencies).values({
          workflowId: this.workflowId,
          fromNodeId,
          toNodeId,
          dataKey: dep.dataKey,
          isRequired: true
        }).onConflictDoNothing();
      }

      activityLogger.log('workflow', 'dependencies_created', {
        workflowId: this.workflowId,
        dependencyCount: dependencies.length
      });

    } catch (error: any) {
      // 외래키 제약 위반 에러 처리
      if (error?.code === '23503' || error?.message?.includes('foreign key constraint')) {
        activityLogger.log('workflow', 'dependencies_creation_failed', {
          workflowId: this.workflowId,
          error: 'Foreign key constraint violation - nodes may not exist'
        });
        console.warn('Failed to create workflow dependencies:', error.message);
      } else {
        throw error;
      }
    }
  }

  /**
   * 워크플로우 실행 상태 조회
   */
  async getWorkflowStatus(sessionId: string): Promise<any> {
    try {
      const session = await db.select()
        .from(workflowSessions)
        .where(eq(workflowSessions.id, sessionId))
        .limit(1);

      if (session.length === 0) {
        throw new Error('Session not found');
      }

      const nodeExecutions = await db.select()
        .from(workflowNodeExecutions)
        .where(eq(workflowNodeExecutions.sessionId, sessionId))
        .orderBy(workflowNodeExecutions.startedAt);

      const sessionData = await workflowEngine.getSessionData(sessionId);

      return {
        session: session[0],
        nodeExecutions,
        sessionData
      };

    } catch (error) {
      activityLogger.log('workflow', 'status_check_failed', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }
}

export const aiMarketAnalysisWorkflow = new AIMarketAnalysisWorkflow();
