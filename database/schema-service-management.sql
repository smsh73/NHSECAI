-- ============================================
-- 서비스 관리 및 운영 데이터베이스
-- Service Management & Operations Database
-- ============================================

-- 서비스 카탈로그 (모든 등록된 서비스)
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 서비스 기본 정보
    name VARCHAR(100) NOT NULL UNIQUE, -- 서비스 이름
    display_name VARCHAR(200), -- 표시 이름
    description TEXT, -- 설명
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    
    -- 서비스 분류
    category VARCHAR(50) NOT NULL, -- AI_ANALYSIS, DATA_COLLECTION, WORKFLOW, API, NOTIFICATION, etc.
    type VARCHAR(50) NOT NULL, -- INTERNAL, EXTERNAL, HYBRID
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, DEPRECATED, MAINTENANCE
    
    -- 서비스 엔드포인트
    base_url VARCHAR(500),
    health_check_url VARCHAR(500),
    
    -- 서비스 메타데이터
    tags VARCHAR(50)[],
    metadata JSONB,
    
    -- 라이프사이클
    created_by VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_health_check TIMESTAMP,
    
    CONSTRAINT services_check_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEPRECATED', 'MAINTENANCE'))
);

CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_tags ON services USING GIN(tags);

-- 서비스 의존성 (서비스 간 의존 관계)
CREATE TABLE IF NOT EXISTS service_dependencies (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    service_id VARCHAR(36) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    depends_on_service_id VARCHAR(36) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'REQUIRED', -- REQUIRED, OPTIONAL, CRITICAL
    description TEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT service_dependencies_unique UNIQUE(service_id, depends_on_service_id),
    CONSTRAINT service_dependencies_check_type CHECK (dependency_type IN ('REQUIRED', 'OPTIONAL', 'CRITICAL'))
);

-- 프롬프트 관리
CREATE TABLE IF NOT EXISTS prompts (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- 프롬프트 콘텐츠
    content TEXT NOT NULL,
    template_type VARCHAR(50) DEFAULT 'text', -- text, json
    input_schema JSONB, -- JSON 스키마 for input
    output_schema JSONB, -- JSON 스키마 for output
    
    -- 실행 설정
    execution_type VARCHAR(20) DEFAULT 'text', -- text, json
    azure_openai_config JSONB, -- Azure OpenAI PTU 설정
    
    -- 변수 관리
    variables JSONB, -- 프롬프트 변수 목록
    default_values JSONB, -- 기본값
    
    -- 상태 관리
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, DEPRECATED, TESTING
    version VARCHAR(20) DEFAULT '1.0.0',
    
    -- 통계
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 2) DEFAULT 0,
    avg_execution_time_ms INTEGER DEFAULT 0,
    
    -- 메타데이터
    tags VARCHAR(50)[],
    metadata JSONB,
    
    created_by VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT prompts_check_execution_type CHECK (execution_type IN ('text', 'json')),
    CONSTRAINT prompts_check_status CHECK (status IN ('ACTIVE', 'DEPRECATED', 'TESTING'))
);

CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompts_tags ON prompts USING GIN(tags);

-- API 관리
CREATE TABLE IF NOT EXISTS api_calls (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200),
    description TEXT,
    
    -- API 엔드포인트
    provider_id VARCHAR(36),
    category_id VARCHAR(36),
    url TEXT NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'POST',
    
    -- 인증 설정
    auth_type VARCHAR(20) DEFAULT 'bearer', -- bearer, api_key, oauth, none
    headers JSONB,
    secret_key VARCHAR(100), -- 환경 변수 키 이름
    
    -- 요청/응답 스키마
    request_schema JSONB,
    response_schema JSONB,
    parameter_template TEXT,
    
    -- 실행 설정
    execution_type VARCHAR(20) DEFAULT 'json', -- json, text, binary
    timeout INTEGER DEFAULT 30000,
    retry_count INTEGER DEFAULT 3,
    retry_delay INTEGER DEFAULT 1000,
    
    -- AI 관련 설정
    model_name VARCHAR(100),
    max_tokens INTEGER,
    input_cost DECIMAL(10, 4),
    output_cost DECIMAL(10, 4),
    system_prompt TEXT,
    preprocess_prompt TEXT,
    postprocess_prompt TEXT,
    supports_streaming BOOLEAN DEFAULT FALSE,
    
    -- 입출력 타입
    input_types VARCHAR(20)[] DEFAULT ARRAY['text'],
    output_types VARCHAR(20)[] DEFAULT ARRAY['text'],
    
    -- 상태 관리
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, DEPRECATED, TESTING
    version VARCHAR(20) DEFAULT '1.0.0',
    
    -- 통계
    call_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    
    -- 메타데이터
    tags VARCHAR(50)[],
    metadata JSONB,
    
    created_by VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT api_calls_check_method CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    CONSTRAINT api_calls_check_auth_type CHECK (auth_type IN ('bearer', 'api_key', 'oauth', 'none')),
    CONSTRAINT api_calls_check_execution_type CHECK (execution_type IN ('json', 'text', 'binary')),
    CONSTRAINT api_calls_check_status CHECK (status IN ('ACTIVE', 'DEPRECATED', 'TESTING'))
);

CREATE INDEX IF NOT EXISTS idx_api_calls_name ON api_calls(name);
CREATE INDEX IF NOT EXISTS idx_api_calls_provider_id ON api_calls(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_calls_category_id ON api_calls(category_id);
CREATE INDEX IF NOT EXISTS idx_api_calls_status ON api_calls(status);
CREATE INDEX IF NOT EXISTS idx_api_calls_tags ON api_calls USING GIN(tags);

-- API 호출 기록
CREATE TABLE IF NOT EXISTS api_call_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    api_call_id VARCHAR(36) REFERENCES api_calls(id),
    user_id VARCHAR(36),
    
    -- 요청 정보
    request_url TEXT NOT NULL,
    request_method VARCHAR(10) NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    
    -- 응답 정보
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    error_message TEXT,
    
    -- 성능 측정
    execution_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    -- 결과
    success BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_api_call_id ON api_call_logs(api_call_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_id ON api_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_created_at ON api_call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_success ON api_call_logs(success);

-- 사용자 관리
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- hashed
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    
    -- 프로필 정보
    email VARCHAR(200),
    full_name VARCHAR(200),
    department VARCHAR(100),
    position VARCHAR(100),
    
    -- 상태
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED, DELETED
    last_login TIMESTAMP,
    
    -- 보안
    failed_login_attempts INTEGER DEFAULT 0,
    password_changed_at TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT users_check_role CHECK (role IN ('admin', 'user', 'auditor', 'viewer')),
    CONSTRAINT users_check_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 사용자 세션
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    
    -- 세션 정보
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_info VARCHAR(200),
    
    -- 시간 정보
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW(),
    
    stamps varchar(200) -- 엘릭서 액세스
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Azure 서비스 설정
CREATE TABLE IF NOT EXISTS azure_configurations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 환경
    environment VARCHAR(20) NOT NULL DEFAULT 'production', -- development, staging, production
    
    -- OpenAI PTU 설정
    openai_ptu_endpoint VARCHAR(500),
    openai_ptu_api_key VARCHAR(255), -- encrypted
    openai_ptu_deployment VARCHAR(100),
    openai_ptu_api_version VARCHAR(20),
    
    -- OpenAI Embedding 설정
    openai_embedding_endpoint VARCHAR(500),
    openai_embedding_key VARCHAR(255), -- encrypted
    openai_embedding_deployment VARCHAR(100),
    
    -- Databricks 설정
    databricks_host VARCHAR(500),
    databricks_token VARCHAR(255), -- encrypted
    databricks_cluster_id VARCHAR(100),
    
    -- PostgreSQL 설정
    postgresql_host VARCHAR(500),
    postgresql_database VARCHAR(100),
    postgresql_user VARCHAR(100),
    postgresql_password VARCHAR(255), -- encrypted
    
    -- AI Search 설정
    ai_search_endpoint VARCHAR(500),
    ai_search_key VARCHAR(255), -- encrypted
    ai_search_index_name VARCHAR(100),
    
    -- 상태
    is_active BOOLEAN DEFAULT FALSE,
    description TEXT,
    
    created_by VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT azure_configurations_check_environment CHECK (environment IN ('development', 'staging', 'production'))
);

CREATE INDEX IF NOT EXISTS idx_azure_configurations_environment ON azure_configurations(environment);
CREATE INDEX IF NOT EXISTS idx_azure_configurations_is_active ON azure_configurations(is_active);

-- 환경 변수 관리
CREATE TABLE IF NOT EXISTS environment_variables (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    key VARCHAR(200) NOT NULL,
    value TEXT NOT NULL, -- encrypted
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    
    description TEXT,
    is_secret BOOLEAN DEFAULT TRUE,
    
    created_by VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT environment_variables_unique UNIQUE(key, environment),
    CONSTRAINT environment_variables_check_environment CHECK (environment IN ('development', 'staging', 'production'))
);

CREATE INDEX IF NOT EXISTS idx_environment_variables_key ON environment_variables(key);
CREATE INDEX IF NOT EXISTS idx_environment_variables_environment ON environment_variables(environment);

-- 워크플로우 실행 기록
CREATE TABLE IF NOT EXISTS workflow_executions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    workflow_id VARCHAR(36),
    workflow_name VARCHAR(200),
    
    user_id VARCHAR(36),
    session_id VARCHAR(100),
    
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED, CANCELLED
    
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    
    metadata JSONB,
    
    CONSTRAINT workflow_executions_check_status CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_session_id ON workflow_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at);

-- 데이터 백업 및 복원 기록
CREATE TABLE IF NOT EXISTS backup_records (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    backup_type VARCHAR(50) NOT NULL, -- FULL, INCREMENTAL, DIFFERENTIAL
    scope VARCHAR(100) NOT NULL, -- DATABASE, TABLE, FILES
    
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED, FAILED
    
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    created_by VARCHAR(36),
    
    CONSTRAINT backup_records_check_backup_type CHECK (backup_type IN ('FULL', 'INCREMENTAL', 'DIFFERENTIAL')),
    CONSTRAINT backup_records_check_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_backup_records_backup_type ON backup_records(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_records_started_at ON backup_records(started_at);

-- 시스템 메트릭 모니터링
CREATE TABLE IF NOT EXISTS system_metrics (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- COUNTER, GAUGE, HISTOGRAM, SUMMARY
    metric_value NUMERIC NOT NULL,
    
    service_name VARCHAR(100),
    node_name VARCHAR(100),
    
    collected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT system_metrics_check_type CHECK (metric_type IN ('COUNTER', 'GAUGE', 'HISTOGRAM', 'SUMMARY'))
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service ON system_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_collected_at ON system_metrics(collected_at);

-- 시스템 알림/이벤트
CREATE TABLE IF NOT EXISTS system_notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    notification_type VARCHAR(50) NOT NULL, -- ALERT, WARNING, INFO, SUCCESS, ERROR
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- CRITICAL, HIGH, MEDIUM, LOW
    
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- 대상
    target_user_id VARCHAR(36),
    target_role VARCHAR(50),
    broadcast BOOLEAN DEFAULT FALSE,
    
    -- 상태
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- 액션
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    
    CONSTRAINT system_notifications_check_type CHECK (notification_type IN ('ALERT', 'WARNING', 'INFO', 'SUCCESS', 'ERROR')),
    CONSTRAINT system_notifications_check_priority CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'))
);

CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_priority ON system_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_system_notifications_target_user ON system_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_read ON system_notifications(read);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at);
