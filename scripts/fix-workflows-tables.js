import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// SQLite 데이터베이스 연결
const dbPath = './data/local.db';
const db = new Database(dbPath);

console.log(`✅ SQLite 데이터베이스 연결: ${dbPath}`);

// workflows 테이블 수정
const fixWorkflowsTable = [
  `DROP TABLE IF EXISTS workflows`,
  
  `CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    definition TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

fixWorkflowsTable.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ workflows 테이블 수정 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ workflows 테이블 수정 ${index + 1} 실패:`, error.message);
  }
});

// workflow_sessions 테이블 수정
const fixWorkflowSessionsTable = [
  `DROP TABLE IF EXISTS workflow_sessions`,
  
  `CREATE TABLE workflow_sessions (
    id TEXT PRIMARY KEY,
    session_name TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    created_by TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

fixWorkflowSessionsTable.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ workflow_sessions 테이블 수정 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ workflow_sessions 테이블 수정 ${index + 1} 실패:`, error.message);
  }
});

// workflow_nodes 테이블 수정
const fixWorkflowNodesTable = [
  `DROP TABLE IF EXISTS workflow_nodes`,
  
  `CREATE TABLE workflow_nodes (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    node_name TEXT NOT NULL,
    node_type TEXT NOT NULL,
    node_order INTEGER NOT NULL,
    configuration TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

fixWorkflowNodesTable.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ workflow_nodes 테이블 수정 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ workflow_nodes 테이블 수정 ${index + 1} 실패:`, error.message);
  }
});

// 샘플 워크플로우 데이터 삽입
const insertSampleWorkflows = [
  `INSERT INTO workflows (id, name, description, definition, is_active) VALUES 
    ('${randomUUID()}', '뉴스 분석 워크플로우', '뉴스 데이터를 수집하고 분석하는 워크플로우', '{"nodes": [{"id": "news-collect", "type": "data_source", "name": "뉴스 수집"}], "connections": []}', 1),
    ('${randomUUID()}', '시장 분석 워크플로우', '시장 데이터를 분석하는 워크플로우', '{"nodes": [{"id": "market-data", "type": "data_source", "name": "시장 데이터 수집"}], "connections": []}', 1),
    ('${randomUUID()}', 'AI 분석 워크플로우', 'AI를 활용한 종합 분석 워크플로우', '{"nodes": [{"id": "ai-analysis", "type": "prompt", "name": "AI 분석"}], "connections": []}', 1)`
];

insertSampleWorkflows.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 샘플 워크플로우 ${index + 1} 삽입 완료`);
  } catch (error) {
    console.error(`❌ 샘플 워크플로우 ${index + 1} 삽입 실패:`, error.message);
  }
});

db.close();
console.log('✅ 워크플로우 테이블 수정 완료');
