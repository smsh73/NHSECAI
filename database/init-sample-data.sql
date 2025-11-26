-- 샘플 데이터 초기화 SQL 스크립트
-- PostgreSQL 전용 - Docker 이미지에 포함되어 배포 시 자동 실행 가능

-- 관리자 사용자 생성 (비밀번호: admin123)
INSERT INTO users (id, username, password, role, created_at)
SELECT 
    gen_random_uuid(),
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eBmMhBwE2.6e', -- bcrypt hash of 'admin123'
    'admin',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
ON CONFLICT (username) DO NOTHING;

-- AI 서비스 프로바이더
INSERT INTO ai_service_providers (id, name, display_name, description, created_at)
VALUES
    (gen_random_uuid(), 'openai', 'OpenAI', 'OpenAI GPT 모델', NOW()),
    (gen_random_uuid(), 'azure-openai', 'Azure OpenAI', 'Azure OpenAI Service', NOW()),
    (gen_random_uuid(), 'anthropic', 'Anthropic', 'Anthropic Claude', NOW())
ON CONFLICT (name) DO NOTHING;

-- API 카테고리
INSERT INTO api_categories (id, name, display_name, description, created_at)
VALUES
    (gen_random_uuid(), 'ai-completion', 'AI 완성', 'AI 텍스트 완성 API', NOW()),
    (gen_random_uuid(), 'ai-embedding', 'AI 임베딩', 'AI 텍스트 임베딩 API', NOW()),
    (gen_random_uuid(), 'ai-analysis', 'AI 분석', 'AI 데이터 분석 API', NOW()),
    (gen_random_uuid(), 'data-collection', '데이터 수집', '데이터 수집 API', NOW())
ON CONFLICT (name) DO NOTHING;

-- 테마
INSERT INTO themes (id, name, description, color, theme_type, created_at, updated_at)
VALUES
    ('tech-innovation', '기술혁신', '기술 혁신 관련 테마', '#3B82F6', 'stock', NOW(), NOW()),
    ('green-energy', '친환경 에너지', '친환경 에너지 관련 테마', '#10B981', 'stock', NOW(), NOW()),
    ('bio-healthcare', '바이오 헬스케어', '바이오 헬스케어 관련 테마', '#8B5CF6', 'stock', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 프롬프트
INSERT INTO prompts (
    id, name, description, system_prompt, user_prompt_template,
    category, input_schema, output_schema, execution_type, azure_openai_config,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),
    '시장 분석 프롬프트',
    '금융 시장 데이터를 분석하는 프롬프트',
    'You are a financial analyst. Analyze the given market data and provide insights.',
    'Analyze the following market data: {data}',
    'analysis',
    '{"type":"object","properties":{"data":{"type":"string"}}}'::jsonb,
    '{"type":"object","properties":{"insights":{"type":"array"}}}'::jsonb,
    'json',
    '{"deploymentName":"gpt-4","temperature":0.7}'::jsonb,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM prompts WHERE name = '시장 분석 프롬프트');

-- API 호출
INSERT INTO api_calls (
    id, name, display_name, description, url, method, auth_type,
    headers, request_schema, response_schema, execution_type, timeout,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),
    '금융 데이터 API',
    'Financial Data API',
    '금융 시장 데이터를 가져오는 API',
    'https://api.example.com/financial/data',
    'GET',
    'bearer',
    '{"Content-Type":"application/json"}'::jsonb,
    '{"type":"object","properties":{"symbol":{"type":"string"}}}'::jsonb,
    '{"type":"object","properties":{"price":{"type":"number"}}}'::jsonb,
    'json',
    30000,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM api_calls WHERE name = '금융 데이터 API');

-- 워크플로우
INSERT INTO workflows (
    id, name, description, definition, is_active, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    '시장 분석 워크플로우',
    '시장 데이터를 수집하고 분석하는 워크플로우',
    '{"nodes":[{"id":"node1","type":"prompt","position":{"x":100,"y":100},"data":{"label":"데이터 수집"}}],"edges":[]}'::jsonb,
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM workflows WHERE name = '시장 분석 워크플로우');

-- 금융 데이터 (샘플)
INSERT INTO financial_data (
    id, symbol, symbol_name, market, country, data_type,
    price, previous_price, change_amount, change_rate, volume, trading_value,
    timestamp, created_at
)
SELECT
    gen_random_uuid(),
    symbol,
    symbol_name,
    market,
    country,
    data_type,
    price,
    previous_price,
    change_amount,
    change_rate,
    volume,
    trading_value,
    timestamp,
    NOW()
FROM (VALUES
    ('005930', '삼성전자', 'KOSPI', 'KOREA', '국내증권시세', 75000.00, 74500.00, 500.00, 0.67, 1000000, 75000000000.00, NOW()),
    ('000660', 'SK하이닉스', 'KOSPI', 'KOREA', '국내증권시세', 145000.00, 143000.00, 2000.00, 1.40, 500000, 72500000000.00, NOW()),
    ('KRW=X', 'USD/KRW', 'FOREX', 'KOREA', '국내지수', 1350.00, 1348.00, 2.00, 0.15, 0, 0, NOW())
) AS data(symbol, symbol_name, market, country, data_type, price, previous_price, change_amount, change_rate, volume, trading_value, timestamp)
WHERE NOT EXISTS (SELECT 1 FROM financial_data WHERE symbol = data.symbol AND timestamp > NOW() - INTERVAL '1 hour')
LIMIT 3;

-- 뉴스 데이터 (샘플)
INSERT INTO news_data (
    id, title, content, source, category, published_at, crawled_at
)
SELECT
    gen_random_uuid(),
    title,
    content,
    source,
    category,
    published_at,
    NOW()
FROM (VALUES
    ('삼성전자 실적 발표', '삼성전자가 분기 실적을 발표했습니다. 매출이 전년 대비 증가했습니다.', '연합뉴스', '경제', NOW() - INTERVAL '1 day'),
    ('코스피 지수 상승', '코스피 지수가 전 거래일 대비 상승했습니다. 기술주가 강세를 보였습니다.', '매일경제', '경제', NOW() - INTERVAL '2 days')
) AS data(title, content, source, category, published_at)
WHERE NOT EXISTS (SELECT 1 FROM news_data WHERE title = data.title)
LIMIT 2;

