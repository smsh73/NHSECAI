-- ============================================
-- 금융보안원 감사 기준 로깅 시스템
-- PostgreSQL Audit Logging Schema
-- ============================================

-- 감사 로그 테이블 (시스템 전체 감사)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 감사 이벤트 기본 정보
    event_type VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, CREATE, UPDATE, DELETE, EXECUTE, VIEW, EXPORT, IMPORT, CONFIG_CHANGE, SECURITY_EVENT
    event_category VARCHAR(50) NOT NULL, -- AUTHENTICATION, AUTHORIZATION, DATA_ACCESS, DATA_MODIFICATION, SYSTEM_CONFIG, SECURITY, COMPLIANCE
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO', -- CRITICAL, HIGH, MEDIUM, LOW, INFO
    
    -- 액션 정보
    action VARCHAR(100) NOT NULL, -- 상세 액션 명
    action_description TEXT, -- 액션 설명
    resource_type VARCHAR(50), -- USER, SERVICE, PROMPT, API, WORKFLOW, CONFIG, etc.
    resource_id VARCHAR(100), -- 리소스 ID
    
    -- 사용자 정보
    user_id VARCHAR(36),
    username VARCHAR(100),
    user_role VARCHAR(50),
    user_ip VARCHAR(50),
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- 결과 정보
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_code VARCHAR(50),
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- 요청/응답 정보
    request_data JSONB,
    response_data JSONB,
    
    -- 추가 컨텍스트
    metadata JSONB, -- 추가 메타데이터
    tags VARCHAR(100)[], -- 검색용 태그
    
    -- 타임스탬프
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- 감사 추적 필수 항목
    audit_trail TEXT, -- 전체 감사 추적 경로
    compliance_flag BOOLEAN DEFAULT FALSE, -- 컴플라이언스 체크 필요 여부
    retention_period INTEGER DEFAULT 2555 VERIFY (retention_period >= 0 AND retention_period <= 3650), -- 보관 기간 (일)
    
    -- 인덱스
    CONSTRAINT audit_logs_check_severity CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    CONSTRAINT audit_logs_check_event_type CHECK (event_type IN ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'VIEW', 'EXPORT', 'IMPORT', 'CONFIG_CHANGE', 'SECURITY_EVENT'))
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_category ON audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tags ON audit_logs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING GIN(metadata);

-- 감사 로그 아카이브 테이블 (오래된 로그 저장)
CREATE TABLE IF NOT EXISTS audit_logs_archive (
    LIKE audit_logs INCLUDING ALL
);

-- 데이터 액세스 로그 (민감 정보 접근 추적)
CREATE TABLE IF NOT EXISTS data_access_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 액세스 정보
    access_type VARCHAR(50) NOT NULL, -- READ, WRITE, UPDATE, DELETE, EXPORT
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    
    -- 데이터 민감도
    data_classification VARCHAR(20) NOT NULL DEFAULT 'PUBLIC', -- PUBLIC, INTERNAL, CONFIDENTIAL, SECRET, TOP_SECRET
    pii_included BOOLEAN DEFAULT FALSE, -- 개인정보 포함 여부
    financial_data_included BOOLEAN DEFAULT FALSE, -- 금융 데이터 포함 여부
    
    -- 사용자 정보
    user_id VARCHAR(36) NOT NULL,
    username VARCHAR(100) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    user_ip VARCHAR(50) NOT NULL,
    
    -- 액세스 결과
    success BOOLEAN NOT NULL DEFAULT TRUE,
    record_count INTEGER,
    query_executed TEXT,
    query_parameters JSONB,
    
    -- 위치 정보 (선택적)
    location_info JSONB, -- 지리적 위치 정보
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT data_access_logs_check_access_type CHECK (access_type IN ('READ', 'WRITE', 'UPDATE', 'DELETE', 'EXPORT')),
    CONSTRAINT data_access_logs_check_classification CHECK (data_classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'))
);

CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_table_name ON data_access_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_data_classification ON data_access_logs(data_classification);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_pii_included ON data_access_logs(pii_included);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at);

-- 보안 이벤트 로그
CREATE TABLE IF NOT EXISTS security_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 이벤트 정보
    event_type VARCHAR(50) NOT NULL, -- BREACH_ATTEMPT, UNAUTHORIZED_ACCESS, AUTHENTICATION_FAILURE, SUSPICIOUS_ACTIVITY, PRIVILEGE_ESCALATION
    threat_level VARCHAR(20) NOT NULL DEFAULT 'LOW', -- CRITICAL, HIGH, MEDIUM, LOW
    
    -- 사용자 정보
    user_id VARCHAR(36),
    username VARCHAR(100),
    user_ip VARCHAR(50) NOT NULL,
    user_agent TEXT,
    
    -- 이벤트 상세
    description TEXT NOT NULL,
    source VARCHAR(100), -- 시스템/서비스 이름
    affected_resource VARCHAR(100),
    
    -- 대응 정보
    mitigation_action VARCHAR(100), -- BLOCKED, ALLOWED, PENDING_REVIEW
    auto_remediated BOOLEAN DEFAULT FALSE,
    
    -- 추가 정보
    details JSONB,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT security_events_check_event_type CHECK (event_type IN ('BREACH_ATTEMPT', 'UNAUTHORIZED_ACCESS', 'AUTHENTICATION_FAILURE', 'SUSPICIOUS_ACTIVITY', 'PRIVILEGE_ESCALATION')),
    CONSTRAINT security_events_check_threat_level CHECK (threat_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT security_events_check_mitigation CHECK (mitigation_action IN ('BLOCKED', 'ALLOWED', 'PENDING_REVIEW'))
);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_threat_level ON security_events(threat_level);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

-- 감사 보고서
CREATE TABLE IF NOT EXISTS audit_reports (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    report_type VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, AD_HOC
    report_name VARCHAR(200) NOT NULL,
    report_period_start TIMESTAMP NOT NULL,
    report_period_end TIMESTAMP NOT NULL,
    
    generated_by VARCHAR(36),
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- 보고서 내용
    summary JSONB, -- 요약 통계
    findings JSONB, -- 발견 사항
    recommendations TEXT, -- 권고 사항
    
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, FINAL, ARCHIVED
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT audit_reports_check_report_type CHECK (report_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'AD_HOC')),
    CONSTRAINT audit_reports_check_status CHECK (status IN ('DRAFT', 'FINAL', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_audit_reports_report_type ON audit_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_audit_reports_generated_by ON audit_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_audit_reports_generated_at ON audit_reports(generated_at);
