import { Router, Request, Response } from 'express';
import { detailedLogger } from '../services/detailed-logger.js';

const router = Router();

/**
 * 에러 로그 조회 API
 */
router.get('/errors', async (req: Request, res: Response) => {
  try {
    const {
      service,
      operation,
      severity,
      resolved,
      limit = 50
    } = req.query;

    const filters: any = {};
    if (service) filters.service = service as string;
    if (operation) filters.operation = operation as string;
    if (severity) filters.severity = severity as string;
    if (resolved !== undefined) filters.resolved = resolved === 'true';
    if (limit) filters.limit = parseInt(limit as string);

    const errorLogs = detailedLogger.getErrorLogs(filters);

    res.json({
      success: true,
      data: errorLogs,
      count: errorLogs.length,
      filters
    });
  } catch (error) {
    console.error('에러 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '에러 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 특정 에러 로그 조회 API
 */
router.get('/errors/:errorId', async (req: Request, res: Response) => {
  try {
    const { errorId } = req.params;
    const errorLog = detailedLogger.getErrorLog(errorId);

    if (!errorLog) {
      return res.status(404).json({
        success: false,
        message: '해당 에러 로그를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: errorLog
    });
  } catch (error) {
    console.error('에러 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '에러 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 최근 에러 로그 조회 API
 */
router.get('/errors/recent/:count?', async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.params.count || '10');
    const recentErrors = detailedLogger.getRecentErrors(count);

    res.json({
      success: true,
      data: recentErrors,
      count: recentErrors.length
    });
  } catch (error) {
    console.error('최근 에러 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '최근 에러 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 심각한 에러 로그 조회 API
 */
router.get('/errors/critical', async (req: Request, res: Response) => {
  try {
    const criticalErrors = detailedLogger.getCriticalErrors();

    res.json({
      success: true,
      data: criticalErrors,
      count: criticalErrors.length
    });
  } catch (error) {
    console.error('심각한 에러 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '심각한 에러 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 해결되지 않은 에러 로그 조회 API
 */
router.get('/errors/unresolved', async (req: Request, res: Response) => {
  try {
    const unresolvedErrors = detailedLogger.getUnresolvedErrors();

    res.json({
      success: true,
      data: unresolvedErrors,
      count: unresolvedErrors.length
    });
  } catch (error) {
    console.error('해결되지 않은 에러 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '해결되지 않은 에러 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 에러 로그 통계 조회 API
 */
router.get('/errors/statistics', async (req: Request, res: Response) => {
  try {
    const statistics = detailedLogger.getLogStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('에러 로그 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '에러 로그 통계 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 에러 해결 처리 API
 */
router.post('/errors/:errorId/resolve', async (req: Request, res: Response) => {
  try {
    const { errorId } = req.params;
    const { resolvedBy } = req.body;

    if (!resolvedBy) {
      return res.status(400).json({
        success: false,
        message: '해결자 정보가 필요합니다.'
      });
    }

    const resolved = detailedLogger.resolveError(errorId, resolvedBy);

    if (!resolved) {
      return res.status(404).json({
        success: false,
        message: '해당 에러 로그를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '에러가 해결 처리되었습니다.',
      errorId,
      resolvedBy
    });
  } catch (error) {
    console.error('에러 해결 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '에러 해결 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 실시간 에러 로그 스트림 API (Server-Sent Events)
 */
router.get('/errors/stream', async (req: Request, res: Response) => {
  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 클라이언트 연결 확인
    const sendHeartbeat = () => {
      res.write('data: {"type":"heartbeat","timestamp":' + Date.now() + '}\n\n');
    };

    // 주기적으로 최근 에러 로그 전송
    const interval = setInterval(() => {
      const recentErrors = detailedLogger.getRecentErrors(5);
      if (recentErrors.length > 0) {
        res.write(`data: ${JSON.stringify({
          type: 'recent_errors',
          data: recentErrors,
          timestamp: Date.now()
        })}\n\n`);
      }
    }, 5000);

    // 하트비트 전송
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    // 클라이언트 연결 종료 처리
    req.on('close', () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    });

    // 초기 데이터 전송
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      message: '에러 로그 스트림이 시작되었습니다.',
      timestamp: Date.now()
    })}\n\n`);

  } catch (error) {
    console.error('에러 로그 스트림 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '에러 로그 스트림 중 오류가 발생했습니다.'
    });
  }
});

export default router;
