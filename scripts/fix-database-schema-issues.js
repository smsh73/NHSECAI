import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// SQLite 데이터베이스 연결
const dbPath = './data/local.db';
const db = new Database(dbPath);

console.log(`✅ SQLite 데이터베이스 연결: ${dbPath}`);

// SQLite에 UUID 함수 추가
db.exec(`
  CREATE TEMP TRIGGER IF NOT EXISTS uuid_trigger 
  AFTER INSERT ON financial_data 
  FOR EACH ROW 
  WHEN NEW.id IS NULL 
  BEGIN 
    UPDATE financial_data SET id = '${randomUUID()}' WHERE rowid = NEW.rowid;
  END;
`);

// gen_random_uuid 함수를 SQLite에 추가
db.exec(`
  CREATE TEMP FUNCTION gen_random_uuid() 
  RETURNS TEXT 
  AS '${randomUUID()}';
`);

// financial_data 테이블 재생성 (UUID 문제 해결)
const recreateFinancialDataTable = [
  `DROP TABLE IF EXISTS financial_data`,
  
  `CREATE TABLE financial_data (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
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
  )`
];

recreateFinancialDataTable.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ financial_data 테이블 재생성 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ financial_data 테이블 재생성 ${index + 1} 실패:`, error.message);
  }
});

// news_data 테이블 수정 (nid 컬럼 추가)
const fixNewsDataTable = [
  `DROP TABLE IF EXISTS news_data`,
  
  `CREATE TABLE news_data (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    nid TEXT UNIQUE,
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
  )`
];

fixNewsDataTable.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ news_data 테이블 수정 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ news_data 테이블 수정 ${index + 1} 실패:`, error.message);
  }
});

// 인덱스 재생성
const createIndexes = [
  `CREATE INDEX IF NOT EXISTS idx_financial_data_symbol ON financial_data(symbol)`,
  `CREATE INDEX IF NOT EXISTS idx_financial_data_market ON financial_data(market)`,
  `CREATE INDEX IF NOT EXISTS idx_financial_data_timestamp ON financial_data(timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_news_data_nid ON news_data(nid)`,
  `CREATE INDEX IF NOT EXISTS idx_news_data_symbol ON news_data(symbol)`,
  `CREATE INDEX IF NOT EXISTS idx_news_data_published_at ON news_data(published_at)`
];

createIndexes.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 인덱스 ${index + 1} 재생성 완료`);
  } catch (error) {
    console.error(`❌ 인덱스 ${index + 1} 재생성 실패:`, error.message);
  }
});

db.close();
console.log('✅ 데이터베이스 스키마 문제 해결 완료');
