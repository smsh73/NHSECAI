/**
 * 워크플로우 리소스 초기화 스크립트
 * 
 * 이 스크립트는 다음을 생성합니다:
 * 1. AI Service Provider 기본 데이터
 * 2. API Category 기본 데이터
 * 
 * python_scripts 테이블은 db:push로 생성됩니다.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

// PostgreSQL 연결
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING || 'postgresql://user:password@localhost:5432/dbname';

if (!connectionString || connectionString === 'postgresql://user:password@localhost:5432/dbname') {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const client = postgres(connectionString);

// Schema 동적 import
let schema;
try {
  schema = await import('../shared/schema.ts');
} catch (error) {
  try {
    schema = await import('../shared/schema.js');
  } catch (e) {
    console.error('❌ Schema import 실패:', error.message || e.message);
    process.exit(1);
  }
}

const db = drizzle(client, { schema: schema.default || schema });

/**
 * AI Service Provider 초기화
 */
async function initializeAIServiceProviders() {
  console.log('\n=== AI Service Provider 초기화 ===\n');
  
  try {
    // 기존 Provider 확인
    const existingProviders = await db.select().from(schema.aiServiceProviders);
    
    if (existingProviders.length > 0) {
      console.log(`✅ AI Service Provider가 이미 ${existingProviders.length}개 존재합니다.`);
      return existingProviders[0]; // 첫 번째 provider 반환
    }
    
    // shared/schema.ts의 DEFAULT_AI_SERVICE_PROVIDERS 사용
    try {
      const { DEFAULT_AI_SERVICE_PROVIDERS } = await import('../shared/schema.ts');
      if (DEFAULT_AI_SERVICE_PROVIDERS && DEFAULT_AI_SERVICE_PROVIDERS.length > 0) {
        for (const providerData of DEFAULT_AI_SERVICE_PROVIDERS) {
          // 이미 존재하는지 확인
          const existing = await db.select().from(schema.aiServiceProviders)
            .where(eq(schema.aiServiceProviders.id, providerData.id));
          
          if (existing.length === 0) {
            await db.insert(schema.aiServiceProviders).values(providerData);
            console.log(`✅ AI Service Provider 생성: ${providerData.displayName}`);
          }
        }
        // 생성 후 첫 번째 provider 반환
        const providers = await db.select().from(schema.aiServiceProviders).limit(1);
        return providers[0];
      }
    } catch (importError) {
      console.warn('⚠️  DEFAULT_AI_SERVICE_PROVIDERS를 import할 수 없습니다. 기본 Provider를 생성합니다.');
    }
    
    // 기본 Provider 생성 (fallback)
    const defaultProviders = [
      {
        id: randomUUID(),
        name: 'openai',
        displayName: 'OpenAI',
        apiBaseUrl: 'https://api.openai.com/v1',
        authType: 'bearer',
        status: 'active',
        tier: 'standard',
        supportedFeatures: ['chat', 'embedding', 'tts', 'stt', 'vision'],
        pricingModel: 'per_token'
      },
      {
        id: randomUUID(),
        name: 'anthropic',
        displayName: 'Anthropic (Claude)',
        apiBaseUrl: 'https://api.anthropic.com/v1',
        authType: 'bearer',
        status: 'active',
        tier: 'standard',
        supportedFeatures: ['chat', 'embedding'],
        pricingModel: 'per_token'
      },
      {
        id: randomUUID(),
        name: 'google',
        displayName: 'Google (Gemini)',
        apiBaseUrl: 'https://generativelanguage.googleapis.com/v1',
        authType: 'bearer',
        status: 'active',
        tier: 'standard',
        supportedFeatures: ['chat', 'embedding', 'vision'],
        pricingModel: 'per_token'
      }
    ];
    
    for (const provider of defaultProviders) {
      await db.insert(schema.aiServiceProviders).values(provider);
      console.log(`✅ AI Service Provider 생성: ${provider.displayName}`);
    }
    
    return defaultProviders[0];
  } catch (error) {
    console.error('❌ AI Service Provider 초기화 실패:', error.message);
    throw error;
  }
}

/**
 * API Category 초기화
 */
async function initializeAPICategories() {
  console.log('\n=== API Category 초기화 ===\n');
  
  try {
    // 기존 Category 확인
    const existingCategories = await db.select().from(schema.apiCategories);
    
    if (existingCategories.length > 0) {
      console.log(`✅ API Category가 이미 ${existingCategories.length}개 존재합니다.`);
      return existingCategories[0]; // 첫 번째 category 반환
    }
    
    // shared/schema.ts의 DEFAULT_API_CATEGORIES 사용
    try {
      const { DEFAULT_API_CATEGORIES } = await import('../shared/schema.ts');
      if (DEFAULT_API_CATEGORIES && DEFAULT_API_CATEGORIES.length > 0) {
        for (const categoryData of DEFAULT_API_CATEGORIES) {
          // 이미 존재하는지 확인 (id 또는 name으로)
          const existing = await db.select().from(schema.apiCategories)
            .where(eq(schema.apiCategories.name, categoryData.name));
          
          if (existing.length === 0) {
            // id가 문자열인 경우 UUID로 변환
            const categoryToInsert = {
              ...categoryData,
              id: categoryData.id && categoryData.id.length === 36 ? categoryData.id : randomUUID(),
              orderIndex: categoryData.order || categoryData.orderIndex || 0
            };
            await db.insert(schema.apiCategories).values(categoryToInsert);
            console.log(`✅ API Category 생성: ${categoryData.displayName}`);
          }
        }
        // 생성 후 첫 번째 category 반환
        const categories = await db.select().from(schema.apiCategories).limit(1);
        return categories[0];
      }
    } catch (importError) {
      console.warn('⚠️  DEFAULT_API_CATEGORIES를 import할 수 없습니다. 기본 Category를 생성합니다.');
    }
    
    // 기본 Category 생성 (fallback)
    const defaultCategories = [
      {
        id: randomUUID(),
        name: 'llm',
        displayName: 'LLM (Large Language Model)',
        description: '대규모 언어 모델 API',
        icon: 'brain',
        color: '#3b82f6',
        orderIndex: 1
      },
      {
        id: randomUUID(),
        name: 'embedding',
        displayName: 'Embedding',
        description: '텍스트 임베딩 API',
        icon: 'layers',
        color: '#8b5cf6',
        orderIndex: 2
      },
      {
        id: randomUUID(),
        name: 'tts',
        displayName: 'Text-to-Speech',
        description: '음성 합성 API',
        icon: 'volume-2',
        color: '#10b981',
        orderIndex: 3
      },
      {
        id: randomUUID(),
        name: 'stt',
        displayName: 'Speech-to-Text',
        description: '음성 인식 API',
        icon: 'mic',
        color: '#f59e0b',
        orderIndex: 4
      },
      {
        id: randomUUID(),
        name: 'vision',
        displayName: 'Vision',
        description: '이미지 분석 API',
        icon: 'eye',
        color: '#ef4444',
        orderIndex: 5
      },
      {
        id: randomUUID(),
        name: 'translation',
        displayName: 'Translation',
        description: '번역 API',
        icon: 'languages',
        color: '#06b6d4',
        orderIndex: 6
      }
    ];
    
    for (const category of defaultCategories) {
      await db.insert(schema.apiCategories).values(category);
      console.log(`✅ API Category 생성: ${category.displayName}`);
    }
    
    return defaultCategories[0];
  } catch (error) {
    console.error('❌ API Category 초기화 실패:', error.message);
    throw error;
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('🚀 워크플로우 리소스 초기화 시작\n');
  console.log('='.repeat(60));
  
  try {
    // AI Service Provider 초기화
    const provider = await initializeAIServiceProviders();
    
    // API Category 초기화
    const category = await initializeAPICategories();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ 워크플로우 리소스 초기화 완료\n');
    console.log(`📋 생성된 리소스:`);
    console.log(`  - AI Service Provider: ${provider.displayName}`);
    console.log(`  - API Category: ${category.displayName}`);
    console.log('\n💡 이제 검증 스크립트를 다시 실행하면 경고가 사라질 것입니다.');
    
  } catch (error) {
    console.error('\n💥 초기화 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 실행
main();

