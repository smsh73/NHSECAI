import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// SQLite 데이터베이스 연결
const dbPath = './data/local.db';
const db = new Database(dbPath);

console.log(`✅ SQLite 데이터베이스 연결: ${dbPath}`);

// dictionary_entries 테이블 수정
const fixDictionaryEntriesTable = [
  `DROP TABLE IF EXISTS dictionary_entries`,
  
  `CREATE TABLE dictionary_entries (
    id TEXT PRIMARY KEY,
    dictionary_id TEXT NOT NULL,
    table_name TEXT,
    column_name TEXT,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

fixDictionaryEntriesTable.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ dictionary_entries 테이블 수정 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ dictionary_entries 테이블 수정 ${index + 1} 실패:`, error.message);
  }
});

// 기본 사전 데이터 삽입
const insertSampleDictionaryEntries = [
  `INSERT INTO dictionary_entries (id, dictionary_id, table_name, column_name, key, value, description) VALUES 
    ('${randomUUID()}', 'default', 'prompts', 'name', '프롬프트명', '프롬프트의 이름을 나타냅니다', '프롬프트 테이블의 이름 컬럼 설명'),
    ('${randomUUID()}', 'default', 'prompts', 'content', '프롬프트 내용', '실제 프롬프트 텍스트를 저장합니다', '프롬프트 테이블의 내용 컬럼 설명'),
    ('${randomUUID()}', 'default', 'api_calls', 'name', 'API 호출명', 'API 호출의 이름을 나타냅니다', 'API 호출 테이블의 이름 컬럼 설명'),
    ('${randomUUID()}', 'default', 'api_calls', 'url', 'API URL', '호출할 API의 URL 주소입니다', 'API 호출 테이블의 URL 컬럼 설명'),
    ('${randomUUID()}', 'default', 'workflows', 'name', '워크플로우명', '워크플로우의 이름을 나타냅니다', '워크플로우 테이블의 이름 컬럼 설명'),
    ('${randomUUID()}', 'default', 'workflows', 'definition', '워크플로우 정의', '워크플로우의 구조와 설정을 JSON으로 저장합니다', '워크플로우 테이블의 정의 컬럼 설명')`
];

insertSampleDictionaryEntries.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 기본 사전 데이터 ${index + 1} 삽입 완료`);
  } catch (error) {
    console.error(`❌ 기본 사전 데이터 ${index + 1} 삽입 실패:`, error.message);
  }
});

db.close();
console.log('✅ 사전 관리 API 오류 해결 완료');
