-- ============================================
-- 통합 PostgreSQL 스키마
-- 금융보안원 감사 기준 + 서비스 관리 + 기존 기능 통합
-- ============================================

-- 기존 테이블들 유지하면서 감사 로깅 및 서비스 관리 추가

-- ============================================
-- 핵심 애플리케이션 테이블
-- ============================================

-- 사용자 관리
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- hashed password (Drizzle ORM에서는 hashedPassword로 매핑)
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- AI 서비스 제공자
CREATE TABLE IF NOT EXISTS ai_service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- OpenAI, Anthropic, Google, etc.
    display_name TEXT NOT NULL, -- User-friendly name
    api_base_url TEXT, -- Base API URL
    auth_type TEXT NOT NULL DEFAULT 'bearer', -- bearer, api_key, oauth
    documentation_url TEXT, -- Link to API docs
    website_url TEXT, -- Provider website
    logo_url TEXT, -- Logo URL or icon name
    status TEXT NOT NULL DEFAULT 'active', -- active, deprecated, experimental
    tier TEXT NOT NULL DEFAULT 'standard', -- free, standard, premium, enterprise
    monthly_quota_free INTEGER DEFAULT 0, -- Free tier monthly quota
    rate_limits JSONB, -- Rate limiting information
    supported_features TEXT[], -- ['chat', 'embedding', 'tts', 'stt', 'vision']
    pricing_model TEXT DEFAULT 'per_token', -- per_token, per_request, subscription, custom
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_name ON ai_service_providers(name);
CREATE INDEX IF NOT EXISTS idx_provider_status ON ai_service_providers(status);
CREATE INDEX IF NOT EXISTS idx_provider_tier ON ai_service_providers(tier);
CREATE INDEX IF NOT EXISTS idx_provider_features ON ai_service_providers USING GIN(supported_features);

-- API 카테고리
CREATE TABLE IF NOT EXISTS api_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- LLM, TTS, STT, Vision, Embedding, Translation, etc.
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Lucide icon name
    color TEXT DEFAULT '#3b82f6', -- HEX color for UI
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_name ON api_categories(name);
CREATE INDEX IF NOT EXISTS idx_category_order ON api_categories(order_index);

-- 테마 (뉴스 클러스터링)
CREATE TABLE IF NOT EXISTS themes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL, -- HEX color
    icon VARCHAR(50), -- lucide-react icon name
    theme_type VARCHAR(50) NOT NULL DEFAULT 'news', -- news, stock, sector, industry, custom
    keywords TEXT[], -- 키워드 배열
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- 활성 상태
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_themes_order ON themes("order");
CREATE INDEX IF NOT EXISTS idx_themes_type ON themes(theme_type);

-- 프롬프트 관리
CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT,
    parameters JSONB, -- Template parameters
    category TEXT, -- 뉴스분석, 테마분석, 정량분석 등
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36), -- References users.id
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    input_schema JSONB, -- JSON 입력 스키마 정의
    output_schema JSONB, -- JSON 출력 스키마 정의
    execution_type TEXT DEFAULT 'text', -- text, json
    azure_openai_config JSONB -- Azure OpenAI PTU 설정
);

CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_is_active ON prompts(is_active);

-- API 호출 관리
CREATE TABLE IF NOT EXISTS api_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id VARCHAR(36), -- References ai_service_providers.id
    category_id VARCHAR(36), -- References api_categories.id
    name TEXT NOT NULL,
    display_name TEXT, -- User-friendly name
    description TEXT,
    url TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'POST',
    auth_type TEXT DEFAULT 'bearer', -- bearer, api_key, oauth, none
    headers JSONB,
    api_key TEXT, -- Deprecated - use secret_key instead
    secret_key TEXT, -- References Azure Environment variable key name
    request_schema JSONB, -- JSON 스키마 for 파라미터 검증
    response_schema JSONB, -- JSON 스키마 for 응답 검증
    parameter_template TEXT, -- 파라미터 템플릿 ({{변수명}} 형태)
    execution_type TEXT DEFAULT 'json', -- json, text, binary
    timeout INTEGER DEFAULT 30000, -- 타임아웃 (ms)
    retry_count INTEGER DEFAULT 3, -- 재시도 횟수
    retry_delay INTEGER DEFAULT 1000, -- 재시도 지연 (ms)
    avg_response_time INTEGER, -- Average response time in milliseconds
    preprocess_prompt TEXT, -- 파라미터 생성용 전처리 프롬프트
    postprocess_prompt TEXT, -- 결과 포매팅용 후처리 프롬프트
    is_active BOOLEAN,
    is_verified BOOLEAN, -- Tested and working
    last_tested TIMESTAMP,
    test_status TEXT, -- success, failed, pending, not_tested
    error_count INTEGER,
    success_count INTEGER,
    created_by VARCHAR(36), -- References users.id
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_provider ON api_calls(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_category ON api_calls(category_id);
CREATE INDEX IF NOT EXISTS idx_api_name ON api_calls(name);
CREATE INDEX IF NOT EXISTS idx_api_status ON api_calls(is_active, test_status);

-- 워크플로우 관리
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    definition JSONB NOT NULL, -- Workflow graph definition
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36), -- References users.id
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);

-- 금융 데이터
CREATE TABLE IF NOT EXISTS financial_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    symbol_name TEXT, -- 종목명/지수명
    market TEXT NOT NULL, -- KOSPI, KOSDAQ, NYSE, NASDAQ 등
    country TEXT NOT NULL,
    data_type TEXT NOT NULL, -- 국내증권시세, 해외증권시세, 국내지수, 해외지수, 수급량정보
    price DECIMAL(15, 4),
    previous_price DECIMAL(15, 4),
    change_amount DECIMAL(15, 4),
    change_rate DECIMAL(6, 2), -- 변동률
    volume INTEGER,
    trading_value DECIMAL(20, 2), -- 거래대금
    market_cap DECIMAL(20, 2), -- 시가총액
    sector_code TEXT, -- 업종코드
    sector_name TEXT, -- 업종명
    theme_code TEXT, -- 테마코드
    theme_name TEXT, -- 테마명
    ma20 DECIMAL(15, 4), -- 20일 이동평균
    std_dev_20 DECIMAL(15, 6), -- 20일 표준편차
    z_score DECIMAL(8, 4), -- z-score
    anomaly_level TEXT, -- 이상정도: high, medium, low
    metadata JSONB, -- Enhanced structured metadata for efficient indexing
    timestamp TIMESTAMP NOT NULL,
    embeddings TEXT, -- Vector embeddings as JSON string
    embedding_model TEXT DEFAULT 'text-embedding-ada-002', -- 임베딩 모델
    processed_at TIMESTAMP DEFAULT NOW(), -- 처리 시간
    created_at TIMESTAMP DEFAULT NOW() -- 생성 시간 (init-sample-data.sql 호환을 위해 추가)
);

CREATE INDEX IF NOT EXISTS idx_symbol ON financial_data(symbol);
CREATE INDEX IF NOT EXISTS idx_symbol_name ON financial_data(symbol_name);
CREATE INDEX IF NOT EXISTS idx_market ON financial_data(market);
CREATE INDEX IF NOT EXISTS idx_data_type ON financial_data(data_type);
CREATE INDEX IF NOT EXISTS idx_timestamp ON financial_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_sector_code ON financial_data(sector_code);
CREATE INDEX IF NOT EXISTS idx_theme_code ON financial_data(theme_code);
CREATE INDEX IF NOT EXISTS idx_anomaly_level ON financial_data(anomaly_level);
CREATE INDEX IF NOT EXISTS idx_processed_at ON financial_data(processed_at);
CREATE INDEX IF NOT EXISTS idx_created_at ON financial_data(created_at);
CREATE INDEX IF NOT EXISTS idx_metadata_gin ON financial_data USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_market_type ON financial_data(market, data_type);
CREATE INDEX IF NOT EXISTS idx_symbol_timestamp ON financial_data(symbol, timestamp);

-- 뉴스 데이터
CREATE TABLE IF NOT EXISTS news_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nid TEXT, -- 뉴스 고유 ID
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT, -- AI 생성 요약
    theme_cluster_id VARCHAR(50), -- References themes.id
    source TEXT, -- 언론사명
    reporter TEXT, -- 기자명
    category TEXT, -- 카테고리
    subcategory TEXT, -- 세부 카테고리
    sentiment TEXT, -- positive, negative, neutral, mixed
    sentiment_score DECIMAL(3, 2), -- 감정 점수
    economic_score DECIMAL(3, 2), -- 경제 점수 (>80 for filtering)
    market_score DECIMAL(3, 2), -- 증시 점수 (>80 for filtering)
    advertisement_score DECIMAL(3, 2), -- 광고 점수 (=100 to filter out)
    duplicate_score DECIMAL(3, 2), -- 유사도 점수
    importance_score DECIMAL(3, 2), -- 중요도 점수
    credibility_score DECIMAL(3, 2), -- 신뢰도 점수
    relevant_symbols TEXT[], -- 연관 종목
    relevant_indices TEXT[], -- 연관 지수
    relevant_themes TEXT[], -- 연관 테마
    keywords TEXT[], -- 키워드
    entities TEXT[], -- 개체명 (회사명, 인명 등)
    market_events TEXT[], -- 증시이벤트 1~4
    event_categories TEXT[], -- 이벤트 카테고리
    metadata JSONB, -- Enhanced structured metadata for news processing
    published_at TIMESTAMP NOT NULL,
    crawled_at TIMESTAMP DEFAULT NOW(), -- 수집 시간
    processed_at TIMESTAMP, -- AI 처리 시간
    embeddings TEXT, -- Vector embeddings as JSON string
    embedding_model TEXT DEFAULT 'text-embedding-ada-002',
    is_processed BOOLEAN DEFAULT FALSE,
    is_filtered BOOLEAN DEFAULT FALSE, -- 필터링 여부 (광고, 낮은 점수 등)
    is_advertisement BOOLEAN DEFAULT FALSE, -- 광고 여부
    is_duplicate BOOLEAN DEFAULT FALSE, -- 중복 여부
    is_high_quality BOOLEAN DEFAULT FALSE, -- 고품질 뉴스 여부
    needs_review BOOLEAN DEFAULT FALSE -- 검토 필요 여부
);

CREATE INDEX IF NOT EXISTS idx_theme_cluster ON news_data(theme_cluster_id);
CREATE INDEX IF NOT EXISTS idx_nid ON news_data(nid);
CREATE INDEX IF NOT EXISTS idx_category ON news_data(category);
CREATE INDEX IF NOT EXISTS idx_published_at ON news_data(published_at);
CREATE INDEX IF NOT EXISTS idx_sentiment ON news_data(sentiment);
CREATE INDEX IF NOT EXISTS idx_economic_score ON news_data(economic_score);
CREATE INDEX IF NOT EXISTS idx_market_score ON news_data(market_score);
CREATE INDEX IF NOT EXISTS idx_importance_score ON news_data(importance_score);
CREATE INDEX IF NOT EXISTS idx_processed ON news_data(is_processed);
CREATE INDEX IF NOT EXISTS idx_filtered ON news_data(is_filtered);
CREATE INDEX IF NOT EXISTS idx_high_quality ON news_data(is_high_quality);
CREATE INDEX IF NOT EXISTS idx_relevant_symbols_gin ON news_data USING GIN(relevant_symbols);
CREATE INDEX IF NOT EXISTS idx_keywords_gin ON news_data USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_market_events_gin ON news_data USING GIN(market_events);
CREATE INDEX IF NOT EXISTS idx_entities_gin ON news_data USING GIN(entities);
CREATE INDEX IF NOT EXISTS idx_news_metadata_gin ON news_data USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_quality_filter ON news_data(economic_score, market_score, is_filtered);
CREATE INDEX IF NOT EXISTS idx_time_processing ON news_data(published_at, is_processed);

-- ============================================
-- 감사 로깅 시스템 (금융보안원 기준)
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
    retention_period INTEGER DEFAULT 2555 CHECK (retention_period >= 0 AND retention_period <= 3650), -- 보관 기간 (일)
    
    -- 제약 조건
    CONSTRAINT audit_logs_check_severity CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    CONSTRAINT audit_logs_check_event_type CHECK (event_type IN ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'VIEW', 'EXPORT', 'IMPORT', 'CONFIG_CHANGE', 'SECURITY_EVENT'))
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

-- ============================================
-- 서비스 관리 시스템
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

-- API 호출 기록 (기존 apiCalls 테이블과 연동)
CREATE TABLE IF NOT EXISTS api_call_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    api_call_id VARCHAR(36), -- 기존 apiCalls 테이블 참조
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

-- 사용자 세션 관리 (기존 users 테이블과 연동)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id VARCHAR(36) NOT NULL, -- 기존 users 테이블 참조
    session_token VARCHAR(255) NOT NULL UNIQUE,
    
    -- 세션 정보
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_info VARCHAR(200),
    
    -- 시간 정보
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW(),
    
    stamps VARCHAR(200) -- 엘릭서 액세스
);

-- Azure 서비스 설정 (기존 azureConfigs 테이블과 연동)
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

-- ============================================
-- 인덱스 생성
-- ============================================

-- 감사 로그 인덱스
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

-- 데이터 액세스 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_table_name ON data_access_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_data_classification ON data_access_logs(data_classification);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_pii_included ON data_access_logs(pii_included);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at);

-- 보안 이벤트 인덱스
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_threat_level ON security_events(threat_level);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

-- 감사 보고서 인덱스
CREATE INDEX IF NOT EXISTS idx_audit_reports_report_type ON audit_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_audit_reports_generated_by ON audit_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_audit_reports_generated_at ON audit_reports(generated_at);

-- 서비스 관리 인덱스
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_tags ON services USING GIN(tags);

-- API 호출 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_api_call_logs_api_call_id ON api_call_logs(api_call_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_id ON api_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_created_at ON api_call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_success ON api_call_logs(success);

-- 사용자 세션 인덱스
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Azure 설정 인덱스
CREATE INDEX IF NOT EXISTS idx_azure_configurations_environment ON azure_configurations(environment);
CREATE INDEX IF NOT EXISTS idx_azure_configurations_is_active ON azure_configurations(is_active);

-- 환경 변수 인덱스
CREATE INDEX IF NOT EXISTS idx_environment_variables_key ON environment_variables(key);
CREATE INDEX IF NOT EXISTS idx_environment_variables_environment ON environment_variables(environment);

-- 백업 기록 인덱스
CREATE INDEX IF NOT EXISTS idx_backup_records_backup_type ON backup_records(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_records_started_at ON backup_records(started_at);

-- 시스템 메트릭 인덱스
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service ON system_metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_collected_at ON system_metrics(collected_at);

-- 시스템 알림 인덱스
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_priority ON system_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_system_notifications_target_user ON system_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_read ON system_notifications(read);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at);

-- ============================================
-- 기존 테이블 수정 사항
-- ============================================

-- 기존 prompts 테이블에 감사 로깅을 위한 필드 추가 (이미 있는 경우 무시)
DO $$ 
BEGIN
    -- prompts 테이블에 감사 필드 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'audit_enabled') THEN
        ALTER TABLE prompts ADD COLUMN audit_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'retention_period') THEN
        ALTER TABLE prompts ADD COLUMN retention_period INTEGER DEFAULT 2555 CHECK (retention_period >= 0 AND retention_period <= 3650);
    END IF;
END $$;

-- 기존 apiCalls 테이블에 감사 로깅을 위한 필드 추가
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_calls' AND column_name = 'audit_enabled') THEN
        ALTER TABLE api_calls ADD COLUMN audit_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_calls' AND column_name = 'retention_period') THEN
        ALTER TABLE api_calls ADD COLUMN retention_period INTEGER DEFAULT 2555 CHECK (retention_period >= 0 AND retention_period <= 3650);
    END IF;
END $$;

-- 기존 users 테이블에 보안 필드 추가
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_changed_at') THEN
        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfa_enabled') THEN
        ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
    END IF;
END $$;

-- ============================================
-- 감사 로그 아카이브 테이블 (오래된 로그 저장)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs_archive (
    LIKE audit_logs INCLUDING ALL
);

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '통합 PostgreSQL 스키마 생성 완료';
    RAISE NOTICE '감사 로깅 시스템: audit_logs, data_access_logs, security_events, audit_reports';
    RAISE NOTICE '서비스 관리 시스템: services, service_dependencies, api_call_logs, user_sessions';
    RAISE NOTICE 'Azure 설정 관리: azure_configurations, environment_variables';
    RAISE NOTICE '시스템 모니터링: backup_records, system_metrics, system_notifications';
    RAISE NOTICE '기존 테이블에 감사 필드 추가 완료';
END $$;

-- ============================================
-- 기존 스키마 재생성 종료
-- ============================================

