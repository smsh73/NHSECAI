/**
 * AI 시황생성 실시간 상태 업데이트 API
 */

import { Router, Request, Response } from 'express';
import { log } from '../vite.js';

const router = Router();

// 뉴스 수집 상태 조회
router.get('/news-collection-status', async (req: Request, res: Response) => {
  try {
    // 실제로는 데이터베이스나 캐시에서 상태를 조회
    // 여기서는 Mock 데이터 반환
    const mockStatus = {
      isCollecting: false,
      progress: 100,
      collectedCount: 3,
      totalCount: 3,
      data: [
        {
          id: 'news_001',
          title: '삼성전자, 3분기 실적 발표... 매출 70조원 돌파',
          content: '삼성전자가 3분기 실적을 발표하며 매출 70조원을 돌파했다고 발표했다...',
          code: '005930',
          date: '20250101',
          time: '090000',
          score: 85,
          quality: 90
        },
        {
          id: 'news_002',
          title: 'SK하이닉스, AI 반도체 수요 증가로 주가 상승',
          content: 'SK하이닉스가 AI 반도체 수요 증가로 인해 주가가 상승하고 있다...',
          code: '000660',
          date: '20250101',
          time: '091500',
          score: 80,
          quality: 88
        },
        {
          id: 'news_003',
          title: '네이버, 클라우드 사업 확장 발표',
          content: '네이버가 클라우드 사업 확장을 발표하며 새로운 성장 동력을 확보했다...',
          code: '035420',
          date: '20250101',
          time: '100000',
          score: 75,
          quality: 85
        }
      ],
      error: null
    };
    
    res.json(mockStatus);
  } catch (error) {
    log(`뉴스 수집 상태 조회 오류: ${error}`);
    res.status(500).json({
      isCollecting: false,
      progress: 0,
      collectedCount: 0,
      totalCount: 0,
      data: [],
      error: error.message
    });
  }
});

// 워크플로우 상태 조회
router.get('/workflow-status/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    
    // 실제로는 데이터베이스에서 워크플로우 상태를 조회
    const mockStatus = [
      {
        stepId: 'collect-news',
        status: 'completed',
        progress: 100,
        message: '뉴스 데이터 수집 완료',
        data: { count: 3 }
      },
      {
        stepId: 'extract-events',
        status: 'running',
        progress: 50,
        message: '주요이벤트 추출 중...',
        data: null
      },
      {
        stepId: 'generate-themes',
        status: 'pending',
        progress: 0,
        message: '대기 중',
        data: null
      },
      {
        stepId: 'generate-macro',
        status: 'pending',
        progress: 0,
        message: '대기 중',
        data: null
      }
    ];
    
    res.json({ status: mockStatus });
  } catch (error) {
    log(`워크플로우 상태 조회 오류: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// 뉴스 수집 시작
router.post('/start-news-collection', async (req: Request, res: Response) => {
  try {
    log('뉴스 수집 시작 요청');
    
    // 실제로는 백그라운드에서 뉴스 수집을 시작하고 상태를 업데이트
    res.json({
      success: true,
      message: '뉴스 수집을 시작했습니다.',
      workflowId: `workflow_${Date.now()}`
    });
  } catch (error) {
    log(`뉴스 수집 시작 오류: ${error}`);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '뉴스 수집 시작 중 오류가 발생했습니다.'
    });
  }
});

export default router;
