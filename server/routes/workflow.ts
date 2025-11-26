import { Router, Request, Response } from 'express';
import { aiMarketAnalysisWorkflow } from '../services/ai-market-analysis-workflow.js';
import { workflowEngine } from '../services/workflow-engine.js';
import { activityLogger } from '../services/activity-logger.js';

const router = Router();

/**
 * AI Market Analysis 워크플로우 실행
 */
router.post('/ai-market-analysis/execute', async (req: Request, res: Response) => {
  try {
    const { sessionName, createdBy } = req.body;
    
    if (!sessionName || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'sessionName and createdBy are required'
      });
    }

    const session = await aiMarketAnalysisWorkflow.executeWorkflow(sessionName, createdBy);
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionName: session.sessionName,
        status: session.status,
        startedAt: session.startedAt
      },
      message: 'AI Market Analysis 워크플로우가 성공적으로 시작되었습니다.'
    });

  } catch (error) {
    activityLogger.log('api', 'workflow_execution_failed', {
      endpoint: '/api/workflow/ai-market-analysis/execute',
      method: 'POST',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message,
      message: '워크플로우 실행 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 워크플로우 상태 조회
 */
router.get('/status/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const status = await aiMarketAnalysisWorkflow.getWorkflowStatus(sessionId);
    
    res.json({
      success: true,
      data: status,
      message: '워크플로우 상태를 성공적으로 조회했습니다.'
    });

  } catch (error) {
    activityLogger.log('api', 'workflow_status_failed', {
      endpoint: `/api/workflow/status/${req.params.sessionId}`,
      method: 'GET',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message,
      message: '워크플로우 상태 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 세션 데이터 조회
 */
router.get('/session/:sessionId/data', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { dataKey } = req.query;
    
    const sessionData = await workflowEngine.getSessionData(sessionId, dataKey as string);
    
    res.json({
      success: true,
      data: sessionData,
      message: '세션 데이터를 성공적으로 조회했습니다.'
    });

  } catch (error) {
    activityLogger.log('api', 'session_data_failed', {
      endpoint: `/api/workflow/session/${req.params.sessionId}/data`,
      method: 'GET',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message,
      message: '세션 데이터 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 워크플로우 템플릿 생성
 */
router.post('/templates/create', async (req: Request, res: Response) => {
  try {
    const { createdBy } = req.body;
    
    if (!createdBy) {
      return res.status(400).json({
        success: false,
        error: 'createdBy is required'
      });
    }

    await aiMarketAnalysisWorkflow.createWorkflowTemplate(createdBy);
    
    res.json({
      success: true,
      message: '워크플로우 템플릿이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    activityLogger.log('api', 'template_creation_failed', {
      endpoint: '/api/workflow/templates/create',
      method: 'POST',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message,
      message: '워크플로우 템플릿 생성 중 오류가 발생했습니다.'
    });
  }
});

export default router;
