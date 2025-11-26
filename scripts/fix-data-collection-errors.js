import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// SQLite 데이터베이스 연결
const dbPath = './data/local.db';
const db = new Database(dbPath);

console.log(`✅ SQLite 데이터베이스 연결: ${dbPath}`);

// news_data 테이블에 summary 컬럼 추가
const fixNewsDataTable = [
  `ALTER TABLE news_data ADD COLUMN summary TEXT`
];

fixNewsDataTable.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ news_data 테이블 수정 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ news_data 테이블 수정 ${index + 1} 실패:`, error.message);
  }
});

// SQLite에 UUID 생성 함수 추가 (더 안정적인 방법)
db.exec(`
  CREATE TEMP VIEW IF NOT EXISTS uuid_generator AS 
  SELECT lower(hex(randomblob(4))) || '-' || 
         lower(hex(randomblob(2))) || '-4' || 
         substr(lower(hex(randomblob(2))),2) || '-' || 
         substr('89ab',abs(random()) % 4 + 1, 1) || 
         substr(lower(hex(randomblob(2))),2) || '-' || 
         lower(hex(randomblob(6))) as uuid;
`);

// 모든 테이블의 기본값을 수동 UUID 생성으로 변경
const updateTableDefaults = [
  // financial_data 테이블 재생성 (UUID 기본값 제거)
  `DROP TABLE IF EXISTS financial_data`,
  `CREATE TABLE financial_data (
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

  // news_data 테이블 재생성 (summary 컬럼 포함)
  `DROP TABLE IF EXISTS news_data`,
  `CREATE TABLE news_data (
    id TEXT PRIMARY KEY,
    nid TEXT UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
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

updateTableDefaults.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 테이블 재생성 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ 테이블 재생성 ${index + 1} 실패:`, error.message);
  }
});

// 샘플 데이터 삽입 (수동 UUID 생성)
const insertSampleData = [
  `INSERT INTO financial_data (id, symbol, symbol_name, market, country, data_type, price, volume, timestamp) VALUES 
    ('${randomUUID()}', '005930', '삼성전자', 'KOSPI', 'KR', '국내증권시세', 75000, 1000000, '2025-10-28 21:00:00'),
    ('${randomUUID()}', '000660', 'SK하이닉스', 'KOSPI', 'KR', '국내증권시세', 120000, 500000, '2025-10-28 21:00:00'),
    ('${randomUUID()}', 'KOSPI', '코스피', 'KOSPI', 'KR', '국내지수', 2500, NULL, '2025-10-28 21:00:00')`,
    
  `INSERT INTO news_data (id, nid, title, content, summary, source, published_at, symbol, market) VALUES 
    ('${randomUUID()}', 'news-001', '삼성전자 주가 상승', '삼성전자가 실적 발표로 주가가 상승했습니다.', '삼성전자 실적 호조로 주가 상승', '한국경제', '2025-10-28 21:00:00', '005930', 'KOSPI'),
    ('${randomUUID()}', 'news-002', 'SK하이닉스 반도체 호황', 'SK하이닉스가 메모리 반도체 호황으로 실적이 개선되었습니다.', 'SK하이닉스 메모리 반도체 호황', '매일경제', '2025-10-28 21:00:00', '000660', 'KOSPI')`
];

insertSampleData.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 샘플 데이터 ${index + 1} 삽입 완료`);
  } catch (error) {
    console.error(`❌ 샘플 데이터 ${index + 1} 삽입 실패:`, error.message);
  }
});

db.close();
console.log('✅ 데이터 수집 작업 오류 해결 완료');
