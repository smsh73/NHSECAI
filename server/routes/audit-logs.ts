import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { sql, eq, and, gte, lte, ilike, desc } from 'drizzle-orm';

const router = Router();

// 감사 로그 테이블 (스키마에 추가 예정)
const auditLogs = {
  table: 'audit_logs',
  columns: {
    id: 'id',
    event_type: 'event_type',
    event_category: 'event_category',
    severity: 'severity',
    action: 'action',
    resource_type: 'resource_type',
    resource_id: 'resource_id',
    user_id: 'user_id',
    username: 'username',
    user_ip: 'user_ip',
    success: 'success',
    error_message: 'error_message',
    execution_time_ms: 'execution_time_ms',
    created_at: 'created_at',
    metadata: 'metadata'
  }
};

const securityEvents = {
  table: 'security_events',
  columns: {
    id: 'id',
    event_type: 'event_type',
    threat_level: 'threat_level',
    user_id: 'user_id',
    username: 'username',
    user_ip: 'user_ip',
    description: 'description',
    source: 'source',
    affected_resource: 'affected_resource',
    mitigation_action: 'mitigation_action',
    created_at: 'created_at'
  }
};

const dataAccessLogs = {
  table: 'data_access_logs',
  columns: {
    id: 'id',
    access_type: 'access_type',
    table_name: 'table_name',
    record_id: 'record_id',
    data_classification: 'data_classification',
    user_id: 'user_id',
    username: 'username',
    success: 'success',
    record_count: 'record_count',
    created_at: 'created_at'
  }
};

/**
 * 감사 로그 조회 API
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      event_type,
      severity,
      username,
      success,
      start_date,
      end_date,
      limit = '50'
    } = req.query;

    const conditions: any[] = [];

    if (event_type) conditions.push(sql`${sql.identifier(auditLogs.table)}.${sql.identifier(auditLogs.columns.event_type)} = ${event_type}`);
    if (severity) conditions.push(sql`${sql.identifier(auditLogs.table)}.${sql.identifier(auditLogs.columns.severity)} = ${severity}`);
    if (username) conditions.push(sql`${sql.identifier(auditLogs.table)}.${sql.identifier(auditLogs.columns.username)} ILIKE ${`%${username}%`}`);
    if (success !== undefined) conditions.push(sql`${sql.identifier(auditLogs.table)}.${sql.identifier(auditLogs.columns.success)} = ${success === 'true'}`);
    if (start_date) conditions.push(sql`${sql.identifier(auditLogs.table)}.${sql.identifier(auditLogs.columns.created_at)} >= ${start_date}`);
    if (end_date) conditions.push(sql`${sql.identifier(auditLogs.table)}.${sql.identifier(auditLogs.columns.created_at)} <= ${end_date}`);

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    const limitClause = sql`LIMIT ${parseInt(limit as string)}`;

    const query = sql`
      SELECT 
        ${sql.identifier(auditLogs.columns.id)},
        ${sql.identifier(auditLogs.columns.event_type)},
        ${sql.identifier(auditLogs.columns.event_category)},
        ${sql.identifier(auditLogs.columns.severity)},
        ${sql.identifier(auditLogs.columns.action)},
        ${sql.identifier(auditLogs.columns.resource_type)},
        ${sql.identifier(auditLogs.columns.resource_id)},
        ${sql.identifier(auditLogs.columns.user_id)},
        ${sql.identifier(auditLogs.columns.username)},
        ${sql.identifier(auditLogs.columns.user_ip)},
        ${sql.identifier(auditLogs.columns.success)},
        ${sql.identifier(auditLogs.columns.error_message)},
        ${sql.identifier(auditLogs.columns.execution_time_ms)},
        ${sql.identifier(auditLogs.columns.created_at)},
        ${sql.identifier(auditLogs.columns.metadata)}
      FROM ${sql.identifier(auditLogs.table)}
      ${whereClause}
      ORDER BY ${sql.identifier(auditLogs.columns.created_at)} DESC
      ${limitClause}
    `;

    const result = await db.execute(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('감사 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '감사 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 보안 이벤트 조회 API
 */
router.get('/security-events', async (req: Request, res: Response) => {
  try {
    const {
      event_type,
      threat_level,
      username,
      limit = '50'
    } = req.query;

    const conditions: any[] = [];

    if (event_type) conditions.push(sql`${sql.identifier(securityEvents.table)}.${sql.identifier(securityEvents.columns.event_type)} = ${event_type}`);
    if (threat_level) conditions.push(sql`${sql.identifier(securityEvents.table)}.${sql.identifier(securityEvents.columns.threat_level)} = ${threat_level}`);
    if (username) conditions.push(sql`${sql.identifier(securityEvents.table)}.${sql.identifier(securityEvents.columns.username)} ILIKE ${`%${username}%`}`);

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    const limitClause = sql`LIMIT ${parseInt(limit as string)}`;

    const query = sql`
      SELECT 
        ${sql.identifier(securityEvents.columns.id)},
        ${sql.identifier(securityEvents.columns.event_type)},
        ${sql.identifier(securityEvents.columns.threat_level)},
        ${sql.identifier(securityEvents.columns.user_id)},
        ${sql.identifier(securityEvents.columns.username)},
        ${sql.identifier(securityEvents.columns.user_ip)},
        ${sql.identifier(securityEvents.columns.description)},
        ${sql.identifier(securityEvents.columns.source)},
        ${sql.identifier(securityEvents.columns.affected_resource)},
        ${sql.identifier(securityEvents.columns.mitigation_action)},
        ${sql.identifier(securityEvents.columns.created_at)}
      FROM ${sql.identifier(securityEvents.table)}
      ${whereClause}
      ORDER BY ${sql.identifier(securityEvents.columns.created_at)} DESC
      ${limitClause}
    `;

    const result = await db.execute(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('보안 이벤트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '보안 이벤트 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 데이터 액세스 로그 조회 API
 */
router.get('/data-access', async (req: Request, res: Response) => {
  try {
    const {
      access_type,
      table_name,
      username,
      data_classification,
      limit = '50'
    } = req.query;

    const conditions: any[] = [];

    if (access_type) conditions.push(sql`${sql.identifier(dataAccessLogs.table)}.${sql.identifier(dataAccessLogs.columns.access_type)} = ${access_type}`);
    if (table_name) conditions.push(sql`${sql.identifier(dataAccessLogs.table)}.${sql.identifier(dataAccessLogs.columns.table_name)} = ${table_name}`);
    if (username) conditions.push(sql`${sql.identifier(dataAccessLogs.table)}.${sql.identifier(dataAccessLogs.columns.username)} ILIKE ${`%${username}%`}`);
    if (data_classification) conditions.push(sql`${sql.identifier(dataAccessLogs.table)}.${sql.identifier(dataAccessLogs.columns.data_classification)} = ${data_classification}`);

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    const limitClause = sql`LIMIT ${parseInt(limit as string)}`;

    const query = sql`
      SELECT 
        ${sql.identifier(dataAccessLogs.columns.id)},
        ${sql.identifier(dataAccessLogs.columns.access_type)},
        ${sql.identifier(dataAccessLogs.columns.table_name)},
        ${sql.identifier(dataAccessLogs.columns.record_id)},
        ${sql.identifier(dataAccessLogs.columns.data_classification)},
        ${sql.identifier(dataAccessLogs.columns.user_id)},
        ${sql.identifier(dataAccessLogs.columns.username)},
        ${sql.identifier(dataAccessLogs.columns.success)},
        ${sql.identifier(dataAccessLogs.columns.record_count)},
        ${sql.identifier(dataAccessLogs.columns.created_at)}
      FROM ${sql.identifier(dataAccessLogs.table)}
      ${whereClause}
      ORDER BY ${sql.identifier(dataAccessLogs.columns.created_at)} DESC
      ${limitClause}
    `;

    const result = await db.execute(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('데이터 액세스 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '데이터 액세스 로그 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 감사 로그 내보내기 API
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    const conditions: any[] = [];
    if (start_date) conditions.push(sql`${sql.identifier(auditLogs.columns.created_at)} >= ${start_date}`);
    if (end_date) conditions.push(sql`${sql.identifier(auditLogs.columns.created_at)} <= ${end_date}`);

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    const query = sql`
      SELECT 
        ${sql.identifier(auditLogs.columns.id)},
        ${sql.identifier(auditLogs.columns.event_type)},
        ${sql.identifier(auditLogs.columns.severity)},
        ${sql.identifier(auditLogs.columns.action)},
        ${sql.identifier(auditLogs.columns.username)},
        ${sql.identifier(auditLogs.columns.success)},
        ${sql.identifier(auditLogs.columns.created_at)}
      FROM ${sql.identifier(auditLogs.table)}
      ${whereClause}
      ORDER BY ${sql.identifier(auditLogs.columns.created_at)} DESC
    `;

    const result = await db.execute(query);
    
    // CSV 형식으로 변환
    const csvHeader = 'ID,Event Type,Severity,Action,Username,Success,Created At\n';
    const csvRows = result.rows.map((row: any) => 
      `${row.id},${row.event_type},${row.severity},${row.action},${row.username || ''},${row.success},${row.created_at}`
    ).join('\n');
    
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
