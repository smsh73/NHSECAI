import Database from 'better-sqlite3';

// SQLite 데이터베이스 연결
const dbPath = './data/local.db';
const db = new Database(dbPath);

console.log(`✅ SQLite 데이터베이스 연결: ${dbPath}`);

// prompts 테이블 구조 수정
const alterPromptsTable = [
  // 기존 테이블 삭제
  `DROP TABLE IF EXISTS prompts`,
  
  // 새로운 구조로 테이블 생성
  `CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT,
    parameters TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    input_schema TEXT,
    output_schema TEXT,
    execution_type TEXT DEFAULT 'text',
    azure_openai_config TEXT
  )`
];

// 테이블 수정
alterPromptsTable.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ prompts 테이블 수정 ${index + 1} 완료`);
  } catch (error) {
    console.error(`❌ prompts 테이블 수정 ${index + 1} 실패:`, error.message);
  }
});

// 기본 프롬프트 데이터 삽입
const insertDefaultPrompts = [
  `INSERT INTO prompts (id, name, description, system_prompt, user_prompt_template, category, execution_type) VALUES 
    ('prompt-1', '뉴스 감정 분석', '뉴스 기사의 감정을 분석하는 프롬프트', '당신은 금융 뉴스의 감정을 분석하는 전문가입니다.', '다음 뉴스의 감정을 분석해주세요: {{news_content}}', '뉴스분석', 'text'),
    ('prompt-2', '주식 추천', '주식 추천을 위한 프롬프트', '당신은 주식 분석 전문가입니다.', '다음 조건에 맞는 주식을 추천해주세요: {{criteria}}', '정량분석', 'text'),
    ('prompt-3', '시장 분석', '시장 상황을 분석하는 프롬프트', '당신은 시장 분석 전문가입니다.', '현재 시장 상황을 분석해주세요: {{market_data}}', '테마분석', 'text')`
];

insertDefaultPrompts.forEach((sql, index) => {
  try {
    db.exec(sql);
    console.log(`✅ 기본 프롬프트 ${index + 1} 삽입 완료`);
  } catch (error) {
    console.error(`❌ 기본 프롬프트 ${index + 1} 삽입 실패:`, error.message);
  }
});

db.close();
console.log('✅ prompts 테이블 구조 수정 완료');
