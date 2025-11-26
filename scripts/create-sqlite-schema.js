import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SQLite 데이터베이스 생성
const dbPath = './data/local.db';
const db = new Database(dbPath);

console.log(`✅ SQLite 데이터베이스 생성: ${dbPath}`);

// 기본 테이블들 생성
const createTables = [
  // 기본 시스템 테이블
  `CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cron_expression TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT,
    input_schema TEXT,
    output_schema TEXT,
    execution_type TEXT DEFAULT 'text',
    azure_openai_config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS api_calls (
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
    secret_key TEXT,
    request_schema TEXT,
    response_schema TEXT,
    parameter_template TEXT,
    execution_type TEXT DEFAULT 'json',
    timeout INTEGER DEFAULT 30000,
    retry_count INTEGER DEFAULT 3,
    retry_delay INTEGER DEFAULT 1000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    nodes TEXT NOT NULL,
    connections TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS workflow_sessions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS workflow_session_data (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    node_id TEXT,
    prompt_id TEXT,
    input_data TEXT,
    output_data TEXT,
    execution_status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS ai_service_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    api_base_url TEXT,
    auth_type TEXT DEFAULT 'bearer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS api_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS dictionaries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS dictionary_entries (
    id TEXT PRIMARY KEY,
    dictionary_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

// 테이블 생성
createTables.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 테이블 ${index + 1} 생성 완료`);
  } catch (error) {
    console.error(`❌ 테이블 ${index + 1} 생성 실패:`, error.message);
  }
});

// 기본 데이터 삽입
const insertDefaultData = [
  `INSERT OR IGNORE INTO schedules (id, name, description, cron_expression) VALUES 
    ('schedule-1', '국내증권시세 수집', '국내 증권시세 데이터 수집', '*/1 * * * *'),
    ('schedule-2', '해외증권시세 수집', '해외 증권시세 데이터 수집', '*/1 * * * *'),
    ('schedule-3', '뉴스시황 실시간 수집', '뉴스 및 시황 데이터 실시간 수집', '*/30 * * * * *')`,

  `INSERT OR IGNORE INTO ai_service_providers (id, name, display_name, description) VALUES 
    ('provider-1', 'openai', 'OpenAI', 'OpenAI API 서비스'),
    ('provider-2', 'azure-openai', 'Azure OpenAI', 'Azure OpenAI 서비스'),
    ('provider-3', 'anthropic', 'Anthropic', 'Anthropic Claude API')`,

  `INSERT OR IGNORE INTO api_categories (id, name, display_name, description) VALUES 
    ('category-1', 'ai-completion', 'AI 완성', 'AI 텍스트 완성 API'),
    ('category-2', 'ai-embedding', 'AI 임베딩', 'AI 텍스트 임베딩 API'),
    ('category-3', 'ai-analysis', 'AI 분석', 'AI 데이터 분석 API')`,

  `INSERT OR IGNORE INTO dictionaries (id, name, description) VALUES 
    ('dict-1', 'default', '기본 사전')`
];

insertDefaultData.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 기본 데이터 ${index + 1} 삽입 완료`);
  } catch (error) {
    console.error(`❌ 기본 데이터 ${index + 1} 삽입 실패:`, error.message);
  }
});

db.close();
console.log('✅ SQLite 스키마 생성 완료');
