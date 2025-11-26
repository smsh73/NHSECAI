/**
 * 로컬 테스트용 AI 시황 생성 API 라우트
 */

import { Router, Request, Response } from 'express';
import { localAIMarketAnalysisService } from '../services/ai-market-analysis-local.js';
import { log } from '../vite.js';

const router = Router();

// 전체 워크플로우 실행
router.post('/execute-workflow', async (req: Request, res: Response) => {
  try {
    log('로컬 테스트: AI 시황 생성 워크플로우 실행 요청');
    const result = await localAIMarketAnalysisService.executeFullWorkflow();
    
    res.json({
      success: true,
      data: result,
      message: 'AI 시황 생성 워크플로우가 성공적으로 실행되었습니다. (로컬 테스트)'
    });
  } catch (error) {
    log(`로컬 테스트: 워크플로우 실행 오류 - ${error}`);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'AI 시황 생성 워크플로우 실행 중 오류가 발생했습니다.'
    });
  }
});

// 뉴스 데이터 수집
router.post('/collect-news', async (req: Request, res: Response) => {
  try {
    log('로컬 테스트: 뉴스 데이터 수집 요청');
    const newsData = await localAIMarketAnalysisService.collectNewsData();
    
    res.json({
      success: true,
      data: newsData,
      message: '뉴스 데이터 수집이 완료되었습니다. (로컬 테스트)'
    });
  } catch (error) {
    log(`로컬 테스트: 뉴스 데이터 수집 오류 - ${error}`);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '뉴스 데이터 수집 중 오류가 발생했습니다.'
    });
  }
});

// 주요이벤트 추출
router.post('/extract-events', async (req: Request, res: Response) => {
  try {
    const { newsData } = req.body;
    
    if (!newsData) {
      return res.status(400).json({
        success: false,
        message: '뉴스 데이터가 필요합니다.'
      });
    }
    
    log('로컬 테스트: 주요이벤트 추출 요청');
    const events = await localAIMarketAnalysisService.extractMarketEvents(newsData);
    
    res.json({
      success: true,
      data: events,
      message: '주요이벤트 추출이 완료되었습니다. (로컬 테스트)'
    });
  } catch (error) {
    log(`로컬 테스트: 주요이벤트 추출 오류 - ${error}`);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '주요이벤트 추출 중 오류가 발생했습니다.'
    });
  }
});

// 테마 시황 생성
router.post('/generate-themes', async (req: Request, res: Response) => {
  try {
    log('로컬 테스트: 테마 시황 생성 요청');
    const themes = await localAIMarketAnalysisService.generateThemeMarket();
    
    res.json({
      success: true,
      data: themes,
      message: '테마 시황 생성이 완료되었습니다. (로컬 테스트)'
    });
  } catch (error) {
    log(`로컬 테스트: 테마 시황 생성 오류 - ${error}`);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '테마 시황 생성 중 오류가 발생했습니다.'
    });
  }
});

// 매크로 시황 생성
router.post('/generate-macro', async (req: Request, res: Response) => {
  try {
    log('로컬 테스트: 매크로 시황 생성 요청');
    const macro = await localAIMarketAnalysisService.generateMacroMarket();
    
    res.json({
      success: true,
      data: macro,
      message: '매크로 시황 생성이 완료되었습니다. (로컬 테스트)'
    });
  } catch (error) {
    log(`로컬 테스트: 매크로 시황 생성 오류 - ${error}`);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '매크로 시황 생성 중 오류가 발생했습니다.'
    });
  }
});

// 워크플로우 상태 조회
router.get('/workflow-status', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ready',
      lastExecution: null,
      nextExecution: null,
      mode: 'local-test'
    },
    message: '워크플로우 상태를 조회했습니다. (로컬 테스트 모드)'
  });
});

export default router;
