#!/usr/bin/env node
/**
 * 포괄적인 샘플 데이터 생성 스크립트
 * 모든 주요 테이블에 샘플 데이터 생성
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Azure 환경에서는 환경변수를 직접 사용 (Docker/App Service에서 설정)
// .env 파일 로드는 제거

class ComprehensiveSampleDataCreator {
  constructor() {
    this.pool = null;
    this.createdCount = {
      users: 0,
      prompts: 0,
      apiCalls: 0,
      workflows: 0,
      workflowNodes: 0,
      themes: 0
    };
    this.ids = {
      userId: null,
      promptIds: [],
      apiCallIds: [],
      workflowIds: []
    };
  }

  async initialize() {
    console.log('🚀 포괄적인 샘플 데이터 생성 시작...\n');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }

    // PostgreSQL 전용 - Azure PostgreSQL만 지원
    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false // Azure PostgreSQL SSL
        }
      });
      
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ PostgreSQL 연결 성공\n');
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL 연결 실패:', error.message);
      return false;
    }
  }

  async createSampleUsers() {
    console.log('👤 샘플 사용자 생성...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    try {
      const userId = randomUUID();
      await this.pool.query(`
        INSERT INTO users (id, username, password, role, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role
        RETURNING id
      `, [userId, 'admin', hashedPassword, 'admin']);
      
      this.ids.userId = userId;
      this.createdCount.users++;
      console.log(`✅ ${this.createdCount.users}개 사용자 생성 완료\n`);
    } catch (error) {
      console.log(`⚠️ 사용자 생성 실패: ${error.message}\n`);
    }
  }

  async createSampleThemes() {
    console.log('🏷️ 샘플 테마 생성...');
    
    const themes = [
      { id: 'tech-innovation', name: '기술혁신', description: '기술 혁신 관련 테마', color: '#3B82F6', themeType: 'stock' },
      { id: 'green-energy', name: '친환경 에너지', description: '친환경 에너지 관련 테마', color: '#10B981', themeType: 'stock' },
      { id: 'bio-healthcare', name: '바이오 헬스케어', description: '바이오 헬스케어 관련 테마', color: '#8B5CF6', themeType: 'stock' }
    ];

    for (const theme of themes) {
      try {
        await this.pool.query(`
          INSERT INTO themes (id, name, description, color, theme_type, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [theme.id, theme.name, theme.description, theme.color, theme.themeType]);
        this.createdCount.themes++;
      } catch (error) {
        console.log(`⚠️ 테마 생성 실패 (${theme.name}): ${error.message}`);
      }
    }
    console.log(`✅ ${this.createdCount.themes}개 테마 생성 완료\n`);
  }

  async createSamplePrompts() {
    console.log('📝 샘플 프롬프트 생성...');
    
    const prompts = [
      {
        name: '시장 분석 프롬프트',
        description: '금융 시장 데이터를 분석하는 프롬프트',
        systemPrompt: 'You are a financial analyst. Analyze the given market data and provide insights.',
        userPromptTemplate: 'Analyze the following market data: {data}',
        category: 'analysis',
        tags: ['market', 'analysis', 'finance'],
        inputSchema: { type: 'object', properties: { data: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { insights: { type: 'array' } } },
        executionType: 'json',
        azureOpenaiConfig: { deploymentName: 'gpt-4', temperature: 0.7 }
      },
      {
        name: '뉴스 요약 프롬프트',
        description: '뉴스 기사를 요약하는 프롬프트',
        systemPrompt: 'You are a news summarizer. Summarize news articles concisely.',
        userPromptTemplate: 'Summarize this news article: {article}',
        category: 'summarization',
        tags: ['news', 'summary'],
        inputSchema: { type: 'object', properties: { article: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { summary: { type: 'string' } } },
        executionType: 'json',
        azureOpenaiConfig: { deploymentName: 'gpt-4', temperature: 0.5 }
      },
      {
        name: '감정 분석 프롬프트',
        description: '텍스트의 감정을 분석하는 프롬프트',
        systemPrompt: 'You are a sentiment analyst. Analyze the sentiment of the given text.',
        userPromptTemplate: 'Analyze the sentiment of this text: {text}',
        category: 'sentiment',
        tags: ['sentiment', 'analysis'],
        inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { sentiment: { type: 'string' }, score: { type: 'number' } } },
        executionType: 'json',
        azureOpenaiConfig: { deploymentName: 'gpt-4', temperature: 0.3 }
      }
    ];

    for (const prompt of prompts) {
      try {
        const id = randomUUID();
        await this.pool.query(`
          INSERT INTO prompts (
            id, name, description, system_prompt, user_prompt_template,
            category, input_schema, output_schema, execution_type, azure_openai_config,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [
          id,
          prompt.name,
          prompt.description,
          prompt.systemPrompt,
          prompt.userPromptTemplate,
          prompt.category,
          JSON.stringify(prompt.inputSchema),
          JSON.stringify(prompt.outputSchema),
          prompt.executionType,
          JSON.stringify(prompt.azureOpenaiConfig)
        ]);
        this.ids.promptIds.push(id);
        this.createdCount.prompts++;
      } catch (error) {
        console.log(`⚠️ 프롬프트 생성 실패 (${prompt.name}): ${error.message}`);
      }
    }
    console.log(`✅ ${this.createdCount.prompts}개 프롬프트 생성 완료\n`);
  }

  async createSampleApiCalls() {
    console.log('🔌 샘플 API 호출 생성...');
    
    const apiCalls = [
      {
        name: '금융 데이터 API',
        displayName: 'Financial Data API',
        description: '금융 시장 데이터를 가져오는 API',
        url: 'https://api.example.com/financial/data',
        method: 'GET',
        authType: 'bearer',
        headers: { 'Content-Type': 'application/json' },
        requestSchema: { type: 'object', properties: { symbol: { type: 'string' } } },
        responseSchema: { type: 'object', properties: { price: { type: 'number' } } },
        executionType: 'json',
        timeout: 30000
      },
      {
        name: '뉴스 수집 API',
        displayName: 'News Collection API',
        description: '뉴스 기사를 수집하는 API',
        url: 'https://api.example.com/news',
        method: 'POST',
        authType: 'api-key',
        headers: { 'X-API-Key': '{{apiKey}}' },
        requestSchema: { type: 'object', properties: { query: { type: 'string' } } },
        responseSchema: { type: 'object', properties: { articles: { type: 'array' } } },
        executionType: 'json',
        timeout: 30000
      }
    ];

    for (const apiCall of apiCalls) {
      try {
        const id = randomUUID();
        await this.pool.query(`
          INSERT INTO api_calls (
            id, name, display_name, description, url, method, auth_type,
            headers, request_schema, response_schema, execution_type, timeout,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [
          id,
          apiCall.name,
          apiCall.displayName,
          apiCall.description,
          apiCall.url,
          apiCall.method,
          apiCall.authType,
          JSON.stringify(apiCall.headers),
          JSON.stringify(apiCall.requestSchema),
          JSON.stringify(apiCall.responseSchema),
          apiCall.executionType,
          apiCall.timeout
        ]);
        this.ids.apiCallIds.push(id);
        this.createdCount.apiCalls++;
      } catch (error) {
        console.log(`⚠️ API 호출 생성 실패 (${apiCall.name}): ${error.message}`);
      }
    }
    console.log(`✅ ${this.createdCount.apiCalls}개 API 호출 생성 완료\n`);
  }

  async createSampleWorkflows() {
    console.log('🔄 샘플 워크플로우 생성...');
    
    const promptId = this.ids.promptIds.length > 0 ? this.ids.promptIds[0] : null;
    const apiCallId = this.ids.apiCallIds.length > 0 ? this.ids.apiCallIds[0] : null;

    const workflows = [
      {
        name: '시장 분석 워크플로우',
        description: '시장 데이터를 수집하고 분석하는 워크플로우',
        definition: {
          nodes: [
            { id: 'node1', type: 'prompt', position: { x: 100, y: 100 }, data: { label: '데이터 수집', promptId } },
            { id: 'node2', type: 'prompt', position: { x: 300, y: 100 }, data: { label: '데이터 분석', promptId } }
          ],
          edges: [
            { id: 'edge1', source: 'node1', target: 'node2' }
          ]
        },
        isActive: true
      },
      {
        name: '뉴스 처리 워크플로우',
        description: '뉴스를 수집하고 요약하는 워크플로우',
        definition: {
          nodes: [
            { id: 'node1', type: 'api_call', position: { x: 100, y: 100 }, data: { label: '뉴스 수집', apiCallId } },
            { id: 'node2', type: 'prompt', position: { x: 300, y: 100 }, data: { label: '뉴스 요약', promptId } }
          ],
          edges: [
            { id: 'edge1', source: 'node1', target: 'node2' }
          ]
        },
        isActive: true
      },
      {
        name: '종합 분석 워크플로우',
        description: '다양한 데이터 소스를 종합하여 분석하는 워크플로우',
        definition: {
          nodes: [
            { id: 'node1', type: 'api_call', position: { x: 100, y: 100 }, data: { label: '데이터 수집', apiCallId } },
            { id: 'node2', type: 'prompt', position: { x: 300, y: 100 }, data: { label: '데이터 전처리', promptId } },
            { id: 'node3', type: 'prompt', position: { x: 500, y: 100 }, data: { label: '종합 분석', promptId } }
          ],
          edges: [
            { id: 'edge1', source: 'node1', target: 'node2' },
            { id: 'edge2', source: 'node2', target: 'node3' }
          ]
        },
        isActive: true
      }
    ];

    for (const workflow of workflows) {
      try {
        const id = randomUUID();
        await this.pool.query(`
          INSERT INTO workflows (
            id, name, description, definition, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [
          id,
          workflow.name,
          workflow.description,
          JSON.stringify(workflow.definition),
          workflow.isActive
        ]);
        this.ids.workflowIds.push(id);
        this.createdCount.workflows++;

        // 워크플로우 노드 생성
        if (workflow.definition.nodes && promptId) {
          for (let i = 0; i < workflow.definition.nodes.length; i++) {
            const node = workflow.definition.nodes[i];
            try {
              const nodeId = randomUUID();
              const config = {};
              if (node.type === 'prompt' && node.data.promptId) {
                config.promptId = node.data.promptId;
              } else if (node.type === 'api_call' && node.data.apiCallId) {
                config.apiCallId = node.data.apiCallId;
              }

              await this.pool.query(`
                INSERT INTO workflow_nodes (
                  id, workflow_id, node_name, node_type, node_order, configuration, is_active, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (id) DO NOTHING
              `, [
                nodeId,
                id,
                node.data.label || `노드 ${i + 1}`,
                node.type,
                i + 1,
                JSON.stringify(config),
                true
              ]);
              this.createdCount.workflowNodes++;
            } catch (error) {
              console.log(`⚠️ 노드 생성 실패: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ 워크플로우 생성 실패 (${workflow.name}): ${error.message}`);
      }
    }
    console.log(`✅ ${this.createdCount.workflows}개 워크플로우 생성 완료`);
    console.log(`✅ ${this.createdCount.workflowNodes}개 워크플로우 노드 생성 완료\n`);
  }

  async createSampleAiServiceProviders() {
    console.log('🤖 샘플 AI 서비스 프로바이더 생성...');
    
    const providers = [
      { name: 'openai', displayName: 'OpenAI', description: 'OpenAI GPT 모델' },
      { name: 'azure-openai', displayName: 'Azure OpenAI', description: 'Azure OpenAI Service' },
      { name: 'anthropic', displayName: 'Anthropic', description: 'Anthropic Claude' }
    ];
    
    let count = 0;
    for (const provider of providers) {
      try {
        await this.pool.query(`
          INSERT INTO ai_service_providers (id, name, display_name, description, created_at)
          VALUES (gen_random_uuid(), $1, $2, $3, NOW())
          ON CONFLICT (name) DO NOTHING
        `, [provider.name, provider.displayName, provider.description]);
        count++;
      } catch (error) {
        // 이미 존재하거나 테이블이 없으면 무시
      }
    }
    
    if (count > 0) {
      console.log(`✅ ${count}개 AI 서비스 프로바이더 생성 완료\n`);
    }
  }

  async createSampleApiCategories() {
    console.log('📂 샘플 API 카테고리 생성...');
    
    const categories = [
      { name: 'ai-completion', displayName: 'AI 완성', description: 'AI 텍스트 완성 API' },
      { name: 'ai-embedding', displayName: 'AI 임베딩', description: 'AI 텍스트 임베딩 API' },
      { name: 'ai-analysis', displayName: 'AI 분석', description: 'AI 데이터 분석 API' },
      { name: 'data-collection', displayName: '데이터 수집', description: '데이터 수집 API' }
    ];
    
    let count = 0;
    for (const category of categories) {
      try {
        await this.pool.query(`
          INSERT INTO api_categories (id, name, display_name, description, created_at)
          VALUES (gen_random_uuid(), $1, $2, $3, NOW())
          ON CONFLICT (name) DO NOTHING
        `, [category.name, category.displayName, category.description]);
        count++;
      } catch (error) {
        // 이미 존재하거나 테이블이 없으면 무시
      }
    }
    
    if (count > 0) {
      console.log(`✅ ${count}개 API 카테고리 생성 완료\n`);
    }
  }

  async createSampleFinancialData() {
    console.log('📊 샘플 금융 데이터 생성...');
    
    const symbols = ['005930', '000660', '035420', 'KRW=X', '^KS11', 'SPY', 'QQQ'];
    const markets = ['KOSPI', 'KOSDAQ', 'NYSE', 'NASDAQ'];
    const dataTypes = ['국내증권시세', '해외증권시세', '국내지수', '해외지수'];
    
    let count = 0;
    for (let i = 0; i < 20; i++) {
      const symbol = symbols[i % symbols.length];
      const market = markets[i % markets.length];
      const dataType = dataTypes[i % dataTypes.length];
      
      try {
        await this.pool.query(`
          INSERT INTO financial_data (
            id, symbol, symbol_name, market, country, data_type,
            price, previous_price, change_amount, change_rate, volume, trading_value,
            timestamp, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11,
            NOW() - INTERVAL '${i} hours', NOW()
          )
        `, [
          symbol,
          symbol === '005930' ? '삼성전자' : symbol === '000660' ? 'SK하이닉스' : symbol,
          market,
          market.includes('KOS') ? 'KOREA' : 'USA',
          dataType,
          (Math.random() * 100000 + 50000).toFixed(2),
          (Math.random() * 100000 + 50000).toFixed(2),
          (Math.random() * 1000 - 500).toFixed(2),
          (Math.random() * 10 - 5).toFixed(2),
          Math.floor(Math.random() * 1000000),
          (Math.random() * 1000000000).toFixed(2)
        ]);
        count++;
      } catch (error) {
        // 테이블이 없거나 다른 오류는 무시
      }
    }
    
    if (count > 0) {
      console.log(`✅ ${count}개 금융 데이터 생성 완료\n`);
    }
  }

  async createSampleNewsData() {
    console.log('📰 샘플 뉴스 데이터 생성...');
    
    const news = [
      { title: '삼성전자 실적 발표', content: '삼성전자가 분기 실적을 발표했습니다. 매출이 전년 대비 증가했습니다.', source: '연합뉴스' },
      { title: '코스피 지수 상승', content: '코스피 지수가 전 거래일 대비 상승했습니다. 기술주가 강세를 보였습니다.', source: '매일경제' },
      { title: '반도체 업황 개선', content: '반도체 업황이 개선되는 조짐을 보이고 있습니다. 메모리 반도체 가격이 상승세를 보이고 있습니다.', source: '한국경제' }
    ];
    
    let count = 0;
    for (const item of news) {
      try {
        await this.pool.query(`
          INSERT INTO news_data (
            id, title, content, source, category, published_at, crawled_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, NOW() - INTERVAL '${count} days', NOW()
          )
        `, [item.title, item.content, item.source, '경제']);
        count++;
      } catch (error) {
        // 테이블이 없으면 무시
      }
    }
    
    if (count > 0) {
      console.log(`✅ ${count}개 뉴스 데이터 생성 완료\n`);
    }
  }

  async printSummary() {
    console.log('\n📊 샘플 데이터 생성 요약:');
    console.log('==================================================');
    console.log(`사용자: ${this.createdCount.users}개`);
    console.log(`테마: ${this.createdCount.themes}개`);
    console.log(`프롬프트: ${this.createdCount.prompts}개`);
    console.log(`API 호출: ${this.createdCount.apiCalls}개`);
    console.log(`워크플로우: ${this.createdCount.workflows}개`);
    console.log(`워크플로우 노드: ${this.createdCount.workflowNodes}개`);
    console.log('==================================================\n');
  }

  async run() {
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('⚠️ PostgreSQL 연결이 필요합니다. 샘플 데이터 생성을 건너뜁니다.\n');
      return;
    }

    try {
      await this.createSampleUsers();
      await this.createSampleAiServiceProviders();
      await this.createSampleApiCategories();
      await this.createSampleThemes();
      await this.createSamplePrompts();
      await this.createSampleApiCalls();
      await this.createSampleWorkflows();
      await this.createSampleFinancialData();
      await this.createSampleNewsData();
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }

    await this.printSummary();
  }
}

// 실행
const creator = new ComprehensiveSampleDataCreator();
creator.run().catch(console.error);

