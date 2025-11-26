/**
 * 로컬 테스트용 Mock 서비스들
 */

import { log } from '../vite';

// Mock Databricks 서비스
export class MockDatabricksService {
  async executeQuery(query: string, params?: any[]): Promise<any[]> {
    log(`[MOCK] Databricks Query: ${query}`);
    
    // 뉴스 데이터 Mock
    if (query.includes('N_NEWS_MM_SILVER')) {
      return this.getMockNewsData();
    }
    
    // 테마 데이터 Mock
    if (query.includes('IFS_TMA')) {
      return this.getMockThemeData();
    }
    
    // 기본 Mock 데이터
    return [];
  }

  private getMockNewsData(): any[] {
    return [
      {
        N_ID: 'news_001',
        N_TITLE: '삼성전자, 3분기 실적 발표... 매출 70조원 돌파',
        N_CONTENT: '삼성전자가 3분기 실적을 발표하며 매출 70조원을 돌파했다고 발표했다...',
        N_CODE: '005930',
        N_DATE: '20250101',
        N_TIME: '090000',
        GPT01_AD_POST_SCORE: 45,
        GPT04_CONTENT_QUALITY_SCORE: 85,
        GPT02_ECO_POST_SCORE: 80,
        GPT03_MARKET_POST_SCORE: 75
      },
      {
        N_ID: 'news_002',
        N_TITLE: 'SK하이닉스, AI 반도체 수요 증가로 주가 상승',
        N_CONTENT: 'SK하이닉스가 AI 반도체 수요 증가로 인해 주가가 상승하고 있다...',
        N_CODE: '000660',
        N_DATE: '20250101',
        N_TIME: '091500',
        GPT01_AD_POST_SCORE: 30,
        GPT04_CONTENT_QUALITY_SCORE: 90,
        GPT02_ECO_POST_SCORE: 85,
        GPT03_MARKET_POST_SCORE: 80
      },
      {
        N_ID: 'news_003',
        N_TITLE: '네이버, 클라우드 사업 확장 발표',
        N_CONTENT: '네이버가 클라우드 사업 확장을 발표하며 새로운 성장 동력을 확보했다...',
        N_CODE: '035420',
        N_DATE: '20250101',
        N_TIME: '100000',
        GPT01_AD_POST_SCORE: 25,
        GPT04_CONTENT_QUALITY_SCORE: 88,
        GPT02_ECO_POST_SCORE: 70,
        GPT03_MARKET_POST_SCORE: 75
      }
    ];
  }

  private getMockThemeData(): any[] {
    return [
      {
        IFS_TMA_CD: 'T001',
        IFS_TMA_NM: '반도체',
        IFS_TMA_DESC: '반도체 관련 테마'
      },
      {
        IFS_TMA_CD: 'T002',
        IFS_TMA_NM: 'AI',
        IFS_TMA_DESC: '인공지능 관련 테마'
      },
      {
        IFS_TMA_CD: 'T003',
        IFS_TMA_NM: '클라우드',
        IFS_TMA_DESC: '클라우드 관련 테마'
      }
    ];
  }
}

// Mock OpenAI 서비스
export class MockOpenAIService {
  async getChatCompletion(prompt: string, maxTokens: number = 1000): Promise<string> {
    log(`[MOCK] OpenAI Request: ${prompt.substring(0, 100)}...`);
    
    // 프롬프트 타입에 따른 Mock 응답
    if (prompt.includes('주요이벤트') || prompt.includes('market_event')) {
      return this.getMockMarketEventsResponse();
    }
    
    if (prompt.includes('테마') || prompt.includes('theme')) {
      return this.getMockThemeResponse();
    }
    
    if (prompt.includes('매크로') || prompt.includes('macro')) {
      return this.getMockMacroResponse();
    }
    
    return JSON.stringify({ message: 'Mock AI response' });
  }

  private getMockMarketEventsResponse(): string {
    return JSON.stringify({
      events: [
        {
          event_id: 'ME-20250101-001',
          event_title: '반도체 업계 실적 발표',
          event_detail: '삼성전자, SK하이닉스 등 주요 반도체 기업들의 3분기 실적이 시장 기대치를 상회하며 반도체 업계 전반에 긍정적 영향을 미치고 있습니다.',
          news_ids: ['news_001', 'news_002'],
          news_titles: ['삼성전자, 3분기 실적 발표...', 'SK하이닉스, AI 반도체 수요 증가...'],
          news_codes: ['005930', '000660']
        }
      ]
    });
  }

  private getMockThemeResponse(): string {
    return JSON.stringify({
      themes: [
        {
          theme_code: 'T001',
          theme_title: '반도체',
          content: 'AI 반도체 수요 증가로 인한 반도체 업계 전반의 상승세가 지속되고 있습니다. 특히 메모리 반도체와 시스템 반도체 분야에서 강세를 보이고 있습니다.',
          direction: 'UP',
          fluctuation_rate: 3.5,
          bubble_scale: 4
        }
      ]
    });
  }

  private getMockMacroResponse(): string {
    return JSON.stringify({
      trend_id: 'MM-20250101-001',
      base_date: '20250101',
      base_time: '100000',
      title: '글로벌 기술주 중심 상승세 지속',
      content: '미국 기술 기업들의 실적 발표가 긍정적으로 예상되며 글로벌 증시가 전반적으로 상승세를 보이고 있습니다. 특히 AI 관련 기술주들이 시장을 견인하고 있으며, 투자 심리가 개선되고 있습니다. 한국 증시도 이러한 글로벌 트렌드에 힘입어 기술주 중심의 상승세를 보이고 있습니다.'
    });
  }
}

// Mock Activity Logger
export class MockActivityLogger {
  logActivity(category: string, action: string, status: string, details?: any): void {
    log(`[MOCK] Activity Log - ${category}:${action}:${status}`, details);
  }
}

// Mock 서비스 인스턴스들
export const mockDatabricksService = new MockDatabricksService();
export const mockOpenAIService = new MockOpenAIService();
export const mockActivityLogger = new MockActivityLogger();
