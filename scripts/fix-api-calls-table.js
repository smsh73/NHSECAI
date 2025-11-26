import Database from 'better-sqlite3';

// SQLite 데이터베이스 연결
const dbPath = './data/local.db';
const db = new Database(dbPath);

console.log(`✅ SQLite 데이터베이스 연결: ${dbPath}`);

// api_calls 테이블 구조 수정
const alterApiCallsTable = [
  // 기존 테이블 삭제
  `DROP TABLE IF EXISTS api_calls`,
  
  // 새로운 구조로 테이블 생성
  `CREATE TABLE api_calls (
    id TEXT PRIMARY KEY,
    provider_id TEXT,
    category_id TEXT,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    url TEXT NOT NULL,
    method TEXT DEFAULT 'POST',
    auth_type TEXT DEFAULT 'bearer',
    headers TEXT,
    api_key TEXT,
    secret_key TEXT,
    request_schema TEXT,
    response_schema TEXT,
    parameter_template TEXT,
    execution_type TEXT DEFAULT 'json',
    timeout INTEGER DEFAULT 30000,
    retry_count INTEGER DEFAULT 3,
    retry_delay INTEGER DEFAULT 1000,
    avg_response_time INTEGER,
    preprocess_prompt TEXT,
    postprocess_prompt TEXT,
    is_active BOOLEAN,
    is_verified BOOLEAN,
    last_tested DATETIME,
    test_status TEXT,
    error_count INTEGER,
    success_count INTEGER,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

// 테이블 수정
alterApiCallsTable.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ api_calls 테이블 수정 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ api_calls 테이블 수정 ${index + 1} 실패:`, error.message);
  }
});

// 기본 API 호출 데이터 삽입
const insertDefaultApiCalls = [
  `INSERT INTO api_calls (id, name, display_name, description, url, method, auth_type, execution_type, is_active) VALUES 
    ('api-1', 'OpenAI GPT-4', 'OpenAI GPT-4 API', 'OpenAI GPT-4 모델을 사용한 텍스트 생성 API', 'https://api.openai.com/v1/chat/completions', 'POST', 'bearer', 'json', 1),
    ('api-2', 'Azure OpenAI', 'Azure OpenAI API', 'Azure OpenAI 서비스를 사용한 텍스트 생성 API', 'https://your-resource.openai.azure.com/openai/deployments/gpt-4/chat/completions', 'POST', 'bearer', 'json', 1),
    ('api-3', 'Financial Data API', '금융 데이터 API', '금융 시장 데이터를 조회하는 API', 'https://api.financial-data.com/v1/market', 'GET', 'api_key', 'json', 1)`
];

insertDefaultApiCalls.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 기본 API 호출 ${index + 1} 삽입 완료`);
  } catch (error) {
    console.error(`❌ 기본 API 호출 ${index + 1} 삽입 실패:`, error.message);
  }
});

db.close();
console.log('✅ api_calls 테이블 구조 수정 완료');
