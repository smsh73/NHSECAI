import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SQLite 데이터베이스 연결
const dbPath = './data/local.db';
const db = new Database(dbPath);

console.log(`✅ SQLite 데이터베이스 연결: ${dbPath}`);

// 누락된 테이블들 생성
const createMissingTables = [
  // Financial Data 테이블
  `CREATE TABLE IF NOT EXISTS financial_data (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    symbol_name TEXT,
    market TEXT NOT NULL,
    country TEXT NOT NULL,
    data_type TEXT NOT NULL,
    price DECIMAL(15,4),
    previous_price DECIMAL(15,4),
    change_amount DECIMAL(15,4),
    change_rate DECIMAL(6,2),
    volume INTEGER,
    trading_value DECIMAL(20,2),
    market_cap DECIMAL(20,2),
    sector_code TEXT,
    sector_name TEXT,
    theme_code TEXT,
    theme_name TEXT,
    ma20 DECIMAL(15,4),
    std_dev_20 DECIMAL(15,6),
    z_score DECIMAL(8,4),
    anomaly_level TEXT,
    metadata TEXT,
    timestamp DATETIME NOT NULL,
    embeddings TEXT,
    embedding_model TEXT DEFAULT 'text-embedding-ada-002',
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // News Data 테이블
  `CREATE TABLE IF NOT EXISTS news_data (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    source TEXT,
    url TEXT,
    published_at DATETIME,
    symbol TEXT,
    market TEXT,
    category TEXT,
    sentiment TEXT,
    importance_score DECIMAL(3,2),
    embedding TEXT,
    embedding_model TEXT DEFAULT 'text-embedding-ada-002',
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
  )`,

  // Market Analysis 테이블
  `CREATE TABLE IF NOT EXISTS market_analysis (
    id TEXT PRIMARY KEY,
    analysis_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    symbols TEXT,
    market TEXT,
    sentiment TEXT,
    confidence_score DECIMAL(3,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
  )`,

  // Workflow Executions 테이블
  `CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    result TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Workflow Node Results 테이블
  `CREATE TABLE IF NOT EXISTS workflow_node_results (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    input_data TEXT,
    output_data TEXT,
    error_message TEXT,
    execution_time INTEGER,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )`,

  // System Configuration 테이블
  `CREATE TABLE IF NOT EXISTS system_configurations (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_encrypted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Audit Logs 테이블
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Security Events 테이블
  `CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    user_id TEXT,
    ip_address TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Data Access Logs 테이블
  `CREATE TABLE IF NOT EXISTS data_access_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    record_id TEXT,
    query TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

// 테이블 생성
createMissingTables.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 테이블 ${index + 1} 생성 완료`);
  } catch (error) {
    console.error(`❌ 테이블 ${index + 1} 생성 실패:`, error.message);
  }
});

// 인덱스 생성
const createIndexes = [
  `CREATE INDEX IF NOT EXISTS idx_financial_data_symbol ON financial_data(symbol)`,
  `CREATE INDEX IF NOT EXISTS idx_financial_data_market ON financial_data(market)`,
  `CREATE INDEX IF NOT EXISTS idx_financial_data_timestamp ON financial_data(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_news_data_symbol ON news_data(symbol)`,
  `CREATE INDEX IF NOT EXISTS idx_news_data_published_at ON news_data(published_at)`,
  `CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id)`,
  `CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`
];

createIndexes.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 인덱스 ${index + 1} 생성 완료`);
  } catch (error) {
    console.error(`❌ 인덱스 ${index + 1} 생성 실패:`, error.message);
  }
});

db.close();
console.log('✅ 누락된 테이블 및 인덱스 생성 완료');
