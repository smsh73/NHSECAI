/**
 * 로컬 테스트용 AI 시황 생성 서비스
 * Mock 서비스를 사용하여 외부 의존성 없이 테스트 가능
 */

import { mockDatabricksService, mockOpenAIService, mockActivityLogger } from './mock-services';
import { MarketEvent, ThemeMarket, MacroMarket } from './ai-market-analysis';

export class LocalAIMarketAnalysisService {
  private databricksService = mockDatabricksService;
  private openAIService = mockOpenAIService;
  private activityLogger = mockActivityLogger;

  /**
   * 1단계: 뉴스 데이터 수집 및 전처리
   */
  async collectNewsData(): Promise<any[]> {
    try {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'collect_news_data', 'START');
      
      const query = `
        SELECT 
          N_ID, N_TITLE, N_CONTENT, N_CODE, N_DATE, N_TIME,
          GPT01_AD_POST_SCORE, GPT04_CONTENT_QUALITY_SCORE,
          GPT02_ECO_POST_SCORE, GPT03_MARKET_POST_SCORE
        FROM nh_ai.silver.N_NEWS_MM_SILVER 
        WHERE _INGEST_TS >= current_timestamp() - interval 30 minutes
          AND GPT01_AD_POST_SCORE < 70
          AND GPT04_CONTENT_QUALITY_SCORE > 0
        ORDER BY (GPT02_ECO_POST_SCORE + GPT03_MARKET_POST_SCORE + GPT04_CONTENT_QUALITY_SCORE) DESC
        LIMIT 200
      `;
      
      const result = await this.databricksService.executeQuery(query);
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'collect_news_data', 'SUCCESS', { count: result.length });
      
      return result;
    } catch (error) {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'collect_news_data', 'ERROR', { error: error.message });
      throw error;
    }
  }

  /**
   * 2단계: 주요이벤트 추출
   */
  async extractMarketEvents(newsData: any[]): Promise<MarketEvent[]> {
    try {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'extract_market_events', 'START');
      
      if (!newsData || newsData.length === 0) {
        return [];
      }

      const titles = newsData.map(n => n.N_TITLE).join('\n');
      const now = new Date();
      const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
      const baseTime = now.toTimeString().slice(0, 8).replace(/:/g, '');
      
      // Mock 프롬프트 생성
      const prompt = `다음 뉴스 제목들을 분석하여 주요 시장 이벤트를 추출해주세요:\n\n${titles}\n\n날짜: ${baseDate}\n시간: ${baseTime}`;
      
      const response = await this.openAIService.getChatCompletion(prompt, 800);
      const eventsData = JSON.parse(response);
      
      const events: MarketEvent[] = eventsData.events.map((event: any, index: number) => ({
        eventId: event.event_id || `ME-${baseDate}-${String(index + 1).padStart(3, '0')}`,
        baseDate,
        baseTime,
        eventTitle: event.event_title || '주요 시장 이벤트',
        eventDetail: event.event_detail || '시장에 영향을 미치는 주요 이벤트가 발생했습니다.',
        newsIds: event.news_ids || [],
        newsTitles: event.news_titles || [],
        newsCodes: event.news_codes || [],
        rawJson: JSON.stringify(event),
        displayCnt: 1,
        ingestTs: now
      }));

      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'extract_market_events', 'SUCCESS', { count: events.length });
      return events;
    } catch (error) {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'extract_market_events', 'ERROR', { error: error.message });
      throw error;
    }
  }

  /**
   * 3단계: 테마 시황 생성
   */
  async generateThemeMarket(): Promise<ThemeMarket[]> {
    try {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'generate_theme_market', 'START');
      
      const query = `SELECT IFS_TMA_CD, IFS_TMA_NM FROM nh_ai.silver.IFS_TMA WHERE USE_YN = 'Y'`;
      const themes = await this.databricksService.executeQuery(query);
      
      const themeMarkets: ThemeMarket[] = [];
      const now = new Date();
      const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
      const baseTime = now.toTimeString().slice(0, 8).replace(/:/g, '');

      for (const theme of themes) {
        const prompt = `테마: ${theme.IFS_TMA_NM}에 대한 시황을 분석해주세요.`;
        const response = await this.openAIService.getChatCompletion(prompt, 800);
        const themeData = JSON.parse(response);
        
        const themeMarket: ThemeMarket = {
          trendId: `TH-${baseDate}-${baseTime}-${theme.IFS_TMA_CD}`,
          baseDate,
          baseTime,
          category: 'THEME',
          themeTitle: theme.IFS_TMA_NM,
          code: theme.IFS_TMA_CD,
          content: themeData.content || `${theme.IFS_TMA_NM} 테마 관련 시황 분석`,
          bubbleScale: Math.floor(Math.random() * 5) + 1,
          direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
          fluctuationRate: (Math.random() - 0.5) * 10,
          transactionAmt: Math.floor(Math.random() * 1000000) + 100000,
          constituents: Math.floor(Math.random() * 50) + 10,
          marketCap: Math.floor(Math.random() * 10000000) + 1000000,
          ingestTs: now
        };
        
        themeMarkets.push(themeMarket);
      }

      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'generate_theme_market', 'SUCCESS', { count: themeMarkets.length });
      return themeMarkets;
    } catch (error) {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'generate_theme_market', 'ERROR', { error: error.message });
      throw error;
    }
  }

  /**
   * 4단계: 매크로 시황 생성
   */
  async generateMacroMarket(): Promise<MacroMarket> {
    try {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'generate_macro_market', 'START');
      
      const now = new Date();
      const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
      const baseTime = now.toTimeString().slice(0, 8).replace(/:/g, '');
      
      const prompt = `현재 시장 상황을 종합적으로 분석하여 매크로 시황을 작성해주세요.`;
      const response = await this.openAIService.getChatCompletion(prompt, 1500);
      const macroData = JSON.parse(response);
      
      const macroMarket: MacroMarket = {
        trendId: `MM-${baseDate}-${baseTime}`,
        baseDate,
        baseTime,
        title: macroData.title || '글로벌 증시 종합 분석',
        content: macroData.content || '현재 시장 상황을 종합적으로 분석한 결과입니다.',
        ingestTs: now
      };

      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'generate_macro_market', 'SUCCESS');
      return macroMarket;
    } catch (error) {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'generate_macro_market', 'ERROR', { error: error.message });
      throw error;
    }
  }

  /**
   * 전체 워크플로우 실행
   */
  async executeFullWorkflow(): Promise<any> {
    try {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'execute_full_workflow', 'START');
      
      // 1단계: 뉴스 데이터 수집
      const newsData = await this.collectNewsData();
      
      // 2단계: 주요이벤트 추출
      const marketEvents = await this.extractMarketEvents(newsData);
      
      // 3단계: 테마 시황 생성
      const themeMarkets = await this.generateThemeMarket();
      
      // 4단계: 매크로 시황 생성
      const macroMarket = await this.generateMacroMarket();
      
      const result = {
        newsData,
        marketEvents,
        themeMarkets,
        macroMarket,
        executionTime: Date.now()
      };

      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'execute_full_workflow', 'SUCCESS');
      return result;
    } catch (error) {
      this.activityLogger.logActivity('AI_MARKET_ANALYSIS', 'execute_full_workflow', 'ERROR', { error: error.message });
      throw error;
    }
  }
}

export const localAIMarketAnalysisService = new LocalAIMarketAnalysisService();
