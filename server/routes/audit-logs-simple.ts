import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// 간단한 감사 로그 API (실제 테이블이 없으므로 mock 데이터 반환)
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      event_type,
      severity,
      username,
      success,
      start_date,
      end_date
    } = req.query;

    // Mock 감사 로그 데이터
    let mockAuditLogs = [
      {
        id: 'audit-001',
        event_type: 'LOGIN',
        event_category: 'AUTHENTICATION',
        severity: 'INFO',
        action: '사용자 로그인',
        resource_type: 'USER',
        resource_id: 'user-001',
        user_id: 'user-001',
        username: 'admin',
        user_ip: '192.168.1.100',
        success: true,
        error_message: null,
        execution_time_ms: 150,
        created_at: new Date().toISOString(),
        metadata: { browser: 'Chrome', os: 'Windows' }
      },
      {
        id: 'audit-002',
        event_type: 'DATA_ACCESS',
        event_category: 'DATA_OPERATION',
        severity: 'INFO',
        action: '데이터 조회',
        resource_type: 'TABLE',
        resource_id: 'prompts',
        user_id: 'user-001',
        username: 'admin',
        user_ip: '192.168.1.100',
        success: true,
        error_message: null,
        execution_time_ms: 200,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        metadata: { query: 'SELECT * FROM prompts' }
      },
      {
        id: 'audit-003',
        event_type: 'WORKFLOW_EXECUTION',
        event_category: 'PROCESSING',
        severity: 'INFO',
        action: '워크플로우 실행',
        resource_type: 'WORKFLOW',
        resource_id: 'workflow-001',
        user_id: 'user-001',
        username: 'admin',
        user_ip: '192.168.1.100',
        success: true,
        error_message: null,
        execution_time_ms: 5000,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        metadata: { workflowName: '뉴스 분석 워크플로우' }
      }
    ];

    // Apply filters
    if (event_type && event_type !== 'all') {
      mockAuditLogs = mockAuditLogs.filter(log => log.event_type === event_type);
    }

    if (severity && severity !== 'all') {
      mockAuditLogs = mockAuditLogs.filter(log => log.severity === severity);
    }

    if (username) {
      const usernameLower = String(username).toLowerCase();
      mockAuditLogs = mockAuditLogs.filter(log => 
        log.username?.toLowerCase().includes(usernameLower)
      );
    }

    if (success !== undefined && success !== 'all' && success !== '') {
      const successBool = success === 'true';
      mockAuditLogs = mockAuditLogs.filter(log => log.success === successBool);
    }

    // Apply date filters
    if (start_date) {
      const startDate = new Date(start_date as string);
      mockAuditLogs = mockAuditLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= startDate;
      });
    }

    if (end_date) {
      const endDate = new Date(end_date as string);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
      mockAuditLogs = mockAuditLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate <= endDate;
      });
    }

    res.json({
      success: true,
      logs: mockAuditLogs,
      total: mockAuditLogs.length,
      message: '감사 로그가 성공적으로 조회되었습니다'
    });
  } catch (error: any) {
    console.error('감사 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '감사 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

// 보안 이벤트 조회 API
router.get('/security-events', async (req: Request, res: Response) => {
  try {
    const {
      event_type,
      severity,
      username,
      start_date,
      end_date
    } = req.query;

    // Mock 보안 이벤트 데이터
    let mockSecurityEvents = [
      {
        id: 'security-001',
        event_type: 'FAILED_LOGIN',
        threat_level: 'MEDIUM',
        user_id: 'user-002',
        username: 'unknown',
        user_ip: '192.168.1.200',
        description: '잘못된 비밀번호로 로그인 시도',
        source: 'AUTHENTICATION_SYSTEM',
        affected_resource: 'USER_ACCOUNT',
        mitigation_action: 'ACCOUNT_LOCKED',
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    // Apply filters
    if (event_type && event_type !== 'all') {
      mockSecurityEvents = mockSecurityEvents.filter(event => event.event_type === event_type);
    }

    if (severity && severity !== 'all') {
      mockSecurityEvents = mockSecurityEvents.filter(event => event.threat_level === severity);
    }

    if (username) {
      const usernameLower = String(username).toLowerCase();
      mockSecurityEvents = mockSecurityEvents.filter(event => 
        event.username?.toLowerCase().includes(usernameLower)
      );
    }

    // Apply date filters
    if (start_date) {
      const startDate = new Date(start_date as string);
      mockSecurityEvents = mockSecurityEvents.filter(event => {
        const eventDate = new Date(event.created_at);
        return eventDate >= startDate;
      });
    }

    if (end_date) {
      const endDate = new Date(end_date as string);
      endDate.setHours(23, 59, 59, 999);
      mockSecurityEvents = mockSecurityEvents.filter(event => {
        const eventDate = new Date(event.created_at);
        return eventDate <= endDate;
      });
    }

    res.json({
      success: true,
      events: mockSecurityEvents,
      total: mockSecurityEvents.length,
      message: '보안 이벤트가 성공적으로 조회되었습니다'
    });
  } catch (error: any) {
    console.error('보안 이벤트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '보안 이벤트 조회 중 오류가 발생했습니다.'
    });
  }
});

// 데이터 접근 로그 조회 API
router.get('/data-access', async (req: Request, res: Response) => {
  try {
    const {
      access_type,
      username,
      start_date,
      end_date
    } = req.query;

    // Mock 데이터 접근 로그
    let mockDataAccessLogs = [
      {
        id: 'data-access-001',
        access_type: 'SELECT',
        table_name: 'prompts',
        record_id: 'prompt-001',
        data_classification: 'PUBLIC',
        user_id: 'user-001',
        username: 'admin',
        success: true,
        created_at: new Date(Date.now() - 900000).toISOString()
      }
    ];

    // Apply filters
    if (access_type && access_type !== 'all') {
      mockDataAccessLogs = mockDataAccessLogs.filter(log => log.access_type === access_type);
    }

    if (username) {
      const usernameLower = String(username).toLowerCase();
      mockDataAccessLogs = mockDataAccessLogs.filter(log => 
        log.username?.toLowerCase().includes(usernameLower)
      );
    }

    // Apply date filters
    if (start_date) {
      const startDate = new Date(start_date as string);
      mockDataAccessLogs = mockDataAccessLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= startDate;
      });
    }

    if (end_date) {
      const endDate = new Date(end_date as string);
      endDate.setHours(23, 59, 59, 999);
      mockDataAccessLogs = mockDataAccessLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate <= endDate;
      });
    }

    res.json({
      success: true,
      logs: mockDataAccessLogs,
      total: mockDataAccessLogs.length,
      message: '데이터 접근 로그가 성공적으로 조회되었습니다'
    });
  } catch (error: any) {
    console.error('데이터 접근 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '데이터 접근 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

// 감사 로그 내보내기 API
router.get('/export', async (req: Request, res: Response) => {
  try {
    // Mock CSV 데이터
    const csvHeader = 'ID,Event Type,Severity,Action,Username,Success,Created At\n';
    const csvRows = [
      'audit-001,LOGIN,INFO,사용자 로그인,admin,true,2025-10-28T21:00:00.000Z',
      'audit-002,DATA_ACCESS,INFO,데이터 조회,admin,true,2025-10-28T20:00:00.000Z',
      'audit-003,WORKFLOW_EXECUTION,INFO,워크플로우 실행,admin,true,2025-10-28T19:00:00.000Z'
    ].join('\n');
    
    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  } catch (error: any) {
    console.error('감사 로그 내보내기 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '감사 로그 내보내기 중 오류가 발생했습니다.'
    });
  }
});

export default router;
