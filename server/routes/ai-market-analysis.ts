import { Router, Request, Response } from 'express';
import { aiMarketAnalysisService } from '../services/ai-market-analysis.js';
import { storage } from '../storage.js';

const router = Router();

// In-memory execution history (for now - can be moved to database later)
const executionHistory: Array<{
  id: string;
  timestamp: string;
  status: string;
  data: any;
  executionTime?: number;
}> = [];

/**
 * AI 시황 생성 워크플로우 실행
 */
router.post('/execute-workflow', async (req: Request, res: Response) => {
  const startTime = Date.now();
  let executionId: string | null = null;
  
  try {
    const result = await aiMarketAnalysisService.executeFullWorkflow();
    const executionTime = Date.now() - startTime;
    executionId = `exec-${Date.now()}`;
    
    // Save to execution history
    const historyEntry = {
      id: executionId,
      timestamp: new Date().toISOString(),
      status: 'completed',
      data: result,
      executionTime,
    };
    executionHistory.push(historyEntry);
    
    // Keep only last 100 entries
    if (executionHistory.length > 100) {
      executionHistory.shift();
    }
    
    res.json({
      success: true,
      data: result,
      executionId,
      executionTime,
      message: 'AI 시황 생성 워크플로우가 성공적으로 실행되었습니다.'
    });
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    executionId = executionId || `exec-${Date.now()}`;
    
    // Save failed execution to history
    const historyEntry = {
      id: executionId,
      timestamp: new Date().toISOString(),
      status: 'failed',
      data: null,
      executionTime,
      error: error.message,
    };
    executionHistory.push(historyEntry);
    
    // Keep only last 100 entries
    if (executionHistory.length > 100) {
      executionHistory.shift();
    }
    
    console.error('AI 시황 생성 워크플로우 실행 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      executionId,
      executionTime,
      message: 'AI 시황 생성 워크플로우 실행 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 뉴스 데이터 수집
 */
router.post('/collect-news', async (req: Request, res: Response) => {
  try {
    const { enableEmbedding = true } = req.body;
    const newsData = await aiMarketAnalysisService.collectNewsData(enableEmbedding);
    
    res.json({
      success: true,
      data: newsData,
      count: newsData?.length || 0,
      totalCount: newsData?.length || 0,
      collectedCount: newsData?.length || 0,
      progress: 100,
      message: `${newsData?.length || 0}건의 뉴스 데이터 수집이 완료되었습니다.`
    });
  } catch (error: any) {
    console.error('뉴스 데이터 수집 오류:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
      message: '뉴스 데이터 수집 중 오류가 발생했습니다.',
      data: [],
      count: 0,
      totalCount: 0,
      collectedCount: 0,
      progress: 0
    });
  }
});

/**
 * 주요이벤트 추출
 */
router.post('/extract-events', async (req: Request, res: Response) => {
  try {
    const { newsData } = req.body;
    
    if (!newsData) {
      return res.status(400).json({
        success: false,
        message: '뉴스 데이터가 필요합니다.'
      });
    }
    
    const events = await aiMarketAnalysisService.extractMarketEvents(newsData);
    
    res.json({
      success: true,
      data: events,
      message: '주요이벤트 추출이 완료되었습니다.'
    });
  } catch (error) {
    console.error('주요이벤트 추출 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '주요이벤트 추출 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 테마 시황 생성
 */
router.post('/generate-themes', async (req: Request, res: Response) => {
  try {
    const themes = await aiMarketAnalysisService.generateThemeMarket();
    
    res.json({
      success: true,
      data: themes,
      message: '테마 시황 생성이 완료되었습니다.'
    });
  } catch (error) {
    console.error('테마 시황 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '테마 시황 생성 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 매크로 시황 생성
 */
router.post('/generate-macro', async (req: Request, res: Response) => {
  try {
    const macroMarket = await aiMarketAnalysisService.generateMacroMarket();
    
    res.json({
      success: true,
      data: macroMarket,
      message: '매크로 시황 생성이 완료되었습니다.'
    });
  } catch (error) {
    console.error('매크로 시황 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '매크로 시황 생성 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 워크플로우 상태 조회
 */
router.get('/workflow-status', async (req: Request, res: Response) => {
  try {
    // 워크플로우 실행 상태 조회 로직
    const lastExecution = executionHistory.length > 0 ? executionHistory[executionHistory.length - 1] : null;
    
    res.json({
      success: true,
      data: {
        status: 'ready',
        lastExecution: lastExecution ? {
          id: lastExecution.id,
          timestamp: lastExecution.timestamp,
          status: lastExecution.status,
          executionTime: lastExecution.executionTime,
        } : null,
        nextExecution: null
      },
      message: '워크플로우 상태를 조회했습니다.'
    });
  } catch (error: any) {
    console.error('워크플로우 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '워크플로우 상태 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 실행 히스토리 조회
 */
router.get('/execution-history', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 100;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    
    const history = executionHistory
      .slice(offsetNum, offsetNum + limitNum)
      .map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        status: item.status,
        data: item.data,
        executionTime: item.executionTime,
      }));
    
    res.json({
      success: true,
      executions: history,
      history,
      total: executionHistory.length,
      limit: limitNum,
      offset: offsetNum,
      message: '실행 히스토리를 조회했습니다.'
    });
  } catch (error: any) {
    console.error('실행 히스토리 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '실행 히스토리 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 실행 히스토리 저장
 */
router.post('/execution-history', async (req: Request, res: Response) => {
  try {
    const { id, timestamp, status, data, executionTime } = req.body;
    
    if (!id || !timestamp || !status) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다: id, timestamp, status'
      });
    }
    
    const historyEntry = {
      id,
      timestamp,
      status,
      data: data || null,
      executionTime: executionTime || null,
    };
    
    // Check if entry already exists
    const existingIndex = executionHistory.findIndex(h => h.id === id);
    if (existingIndex >= 0) {
      executionHistory[existingIndex] = historyEntry;
    } else {
      executionHistory.push(historyEntry);
    }
    
    // Keep only last 100 entries
    if (executionHistory.length > 100) {
      executionHistory.shift();
    }
    
    res.json({
      success: true,
      execution: historyEntry,
      message: '실행 히스토리가 저장되었습니다.'
    });
  } catch (error: any) {
    console.error('실행 히스토리 저장 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '실행 히스토리 저장 중 오류가 발생했습니다.'
    });
  }
});

export default router;
