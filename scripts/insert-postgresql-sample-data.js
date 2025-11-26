import { Pool } from 'pg';
import { randomUUID } from 'crypto';

// PostgreSQL 연결
const pool = new Pool({
  connectionString: 'postgresql://localhost:5432/aitradeconsole_local'
});

console.log('✅ PostgreSQL 데이터베이스 연결');

async function insertSampleData() {
  const client = await pool.connect();
  
  try {
    // 먼저 시스템 사용자 생성
    await client.query(`
      INSERT INTO users (id, username, password, role, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [
      'system',
      'system',
      'system_password',
      'admin',
      new Date()
    ]);
    console.log('✅ 시스템 사용자 생성 완료');

    // 프롬프트 샘플 데이터 삽입
    const promptId = randomUUID();
    await client.query(`
      INSERT INTO prompts (
        id, name, system_prompt, user_prompt_template, parameters, 
        category, is_active, created_by, input_schema, output_schema, execution_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      promptId,
      '감정 분석 프롬프트',
      '당신은 금융 뉴스의 감정을 분석하는 전문가입니다.',
      '다음 뉴스의 감정을 분석해주세요: {{news_content}}',
      JSON.stringify({ news_content: 'string' }),
      'sentiment_analysis',
      true,
      'system',
      JSON.stringify({
        type: 'object',
        properties: {
          news_content: { type: 'string', description: '분석할 뉴스 내용' }
        },
        required: ['news_content']
      }),
      JSON.stringify({
        type: 'object',
        properties: {
          sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
          score: { type: 'number', minimum: 0, maximum: 1 },
          confidence: { type: 'number', minimum: 0, maximum: 1 }
        }
      }),
      'json'
    ]);
    console.log('✅ 프롬프트 샘플 데이터 삽입 완료');

    // API 호출 샘플 데이터 삽입
    const apiCallId = randomUUID();
    await client.query(`
      INSERT INTO api_calls (
        id, name, display_name, description, url, method, provider_id, category_id,
        auth_type, secret_key, headers, request_schema, response_schema, 
        parameter_template, execution_type, timeout, retry_count, retry_delay,
        is_active, is_verified, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      apiCallId,
      'stock-price-api',
      '주식 가격 조회 API',
      '주식 가격 정보를 조회하는 API입니다.',
      'https://api.example.com/stock/price',
      'GET',
      null,
      null,
      'api_key',
      'STOCK_API_KEY',
      JSON.stringify({ 'Content-Type': 'application/json' }),
      JSON.stringify({
        type: 'object',
        properties: {
          symbol: { type: 'string', description: '주식 심볼' }
        },
        required: ['symbol']
      }),
      JSON.stringify({
        type: 'object',
        properties: {
          price: { type: 'number' },
          change: { type: 'number' },
          changePercent: { type: 'number' }
        }
      }),
      '{"symbol": "{{symbol}}"}',
      'json',
      30000,
      3,
      1000,
      true,
      true,
      'system'
    ]);
    console.log('✅ API 호출 샘플 데이터 삽입 완료');

    // 워크플로우 샘플 데이터 삽입
    const workflowId = randomUUID();
    await client.query(`
      INSERT INTO workflows (
        id, name, description, definition, created_by
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      workflowId,
      '뉴스 분석 워크플로우',
      '뉴스를 수집하고 감정을 분석하는 워크플로우입니다.',
      JSON.stringify({
        nodes: [
          {
            id: 'node-1',
            name: '뉴스 수집',
            type: 'data_source',
            order: 1,
            configuration: {
              dataSourceType: 'api',
              query: 'https://api.example.com/news'
            }
          },
          {
            id: 'node-2',
            name: '감정 분석',
            type: 'prompt',
            order: 2,
            configuration: {
              promptId: promptId,
              inputMapping: {
                news_content: '$node-1.content'
              }
            }
          }
        ],
        connections: [
          { from: 'node-1', to: 'node-2' }
        ]
      }),
      'system'
    ]);
    console.log('✅ 워크플로우 샘플 데이터 삽입 완료');

    // 사전 항목 샘플 데이터 삽입
    const dictionaryId = randomUUID();
    await client.query(`
      INSERT INTO dictionaries (
        id, name, description, source_id, created_by
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      dictionaryId,
      'default',
      '기본 Dictionary - 데이터베이스 스키마 사전',
      'default',
      'system'
    ]);

    const entryId = randomUUID();
    await client.query(`
      INSERT INTO dictionary_entries (
        id, dictionary_id, table_name, column_name, key, value, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      entryId,
      dictionaryId,
      'prompts',
      'name',
      '프롬프트명',
      '프롬프트의 이름을 나타냅니다',
      '프롬프트 테이블의 이름 컬럼 설명'
    ]);
    console.log('✅ 사전 샘플 데이터 삽입 완료');

  } catch (error) {
    console.error('❌ 샘플 데이터 삽입 실패:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

insertSampleData().catch(console.error);
