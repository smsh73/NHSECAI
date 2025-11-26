/**
 * AI 시황 생성 서비스
 * Databricks 기반 AI 시황 생성 워크플로우를 Node.js로 변환
 */

import { getAzureDatabricksService } from './azure-databricks';
import { azureConfigService } from './azure-config';
import { activityLogger } from './activity-logger';
import { detailedLogger } from './detailed-logger.js';

export interface MarketEvent {
  eventId: string;
  baseDate: string;
  baseTime: string;
  eventTitle: string;
  eventDetail: string;
  newsIds: string[];
  newsTitles: string[];
  newsCodes: string[];
  rawJson: string;
  displayCnt: number;
  ingestTs: Date;
}

export interface ThemeMarket {
  trendId: string;
  baseDate: string;
  baseTime: string;
  category: string;
  themeTitle: string;
  code: string;
  content: string;
  bubbleScale: number;
  direction: string;
  fluctuationRate: number;
  transactionAmt: number;
  constituents: number;
  marketCap: number;
  ingestTs: Date;
}

export interface MacroMarket {
  trendId: string;
  baseDate: string;
  baseTime: string;
  title: string;
  content: string;
  ingestTs: Date;
}

export class AIMarketAnalysisService {
  private databricksService: any;
  private openAIService: any;

  constructor() {
    this.databricksService = getAzureDatabricksService();
  }

  /**
   * 1단계: 뉴스 데이터 수집 및 전처리
   */
  async collectNewsData(enableEmbedding: boolean = true): Promise<any[]> {
    const requestId = `news_collect_${Date.now()}`;
    
    try {
      // Ensure databricks service is initialized
      if (!this.databricksService) {
        this.databricksService = getAzureDatabricksService();
      }
      
      await this.databricksService.initialize();
      
      activityLogger.log('api', 'collect_news_data', { serviceName: 'AI_MARKET_ANALYSIS', status: 'START' });
      
      console.log(`🔍 [${requestId}] 뉴스 데이터 수집 시작`);
      
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
      
      console.log(`📊 [${requestId}] Databricks 쿼리 실행: ${query.substring(0, 100)}...`);
      
      const result = await this.databricksService.executeQuery(query);
      
      if (!result || !result.data || result.data.length === 0) {
        console.warn(`⚠️ [${requestId}] 뉴스 데이터가 없습니다. 조건을 완화하여 재시도합니다.`);
        
        // Fallback: 조건 완화된 쿼리
        const fallbackQuery = `
          SELECT 
            N_ID, N_TITLE, N_CONTENT, N_CODE, N_DATE, N_TIME,
            GPT01_AD_POST_SCORE, GPT04_CONTENT_QUALITY_SCORE,
            GPT02_ECO_POST_SCORE, GPT03_MARKET_POST_SCORE
          FROM nh_ai.silver.N_NEWS_MM_SILVER 
          WHERE _INGEST_TS >= current_timestamp() - interval 2 hours
            AND GPT04_CONTENT_QUALITY_SCORE > 0
          ORDER BY _INGEST_TS DESC
          LIMIT 100
        `;
        
        const fallbackResult = await this.databricksService.executeQuery(fallbackQuery);
        
        if (!fallbackResult || !fallbackResult.data || fallbackResult.data.length === 0) {
          console.warn(`⚠️ [${requestId}] Fallback 쿼리에서도 데이터가 없습니다.`);
          return [];
        }
        
        console.log(`✅ [${requestId}] Fallback 쿼리로 뉴스 데이터 수집 완료: ${fallbackResult.data.length}건`);
        activityLogger.log('api', 'collect_news_data', { serviceName: 'AI_MARKET_ANALYSIS', status: 'SUCCESS', result: { count: fallbackResult.data.length, fallback: true } });
        
        return fallbackResult.data || [];
      }
      
      console.log(`✅ [${requestId}] 뉴스 데이터 수집 완료: ${result.data.length}건`);
      
      activityLogger.log('api', 'collect_news_data', { serviceName: 'AI_MARKET_ANALYSIS', status: 'SUCCESS', result: { count: result.data.length } });
      
      return result.data || [];
    } catch (error: any) {
      console.error(`❌ [${requestId}] 뉴스 데이터 수집 실패:`, error.message || error);
      
      // 상세 에러 로그 기록
      detailedLogger.logError(
        'AI_MARKET_ANALYSIS',
        'collect_news_data',
        error,
        {
          requestId,
          databricksService: this.databricksService ? 'available' : 'unavailable',
          errorMessage: error?.message || String(error)
        },
        'HIGH'
      );
      
      activityLogger.log('api', 'collect_news_data', { serviceName: 'AI_MARKET_ANALYSIS', status: 'ERROR', error: error?.message || String(error) });
      throw new Error(`뉴스 데이터 수집 실패: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * 2단계: 주요이벤트 추출
   */
  async extractMarketEvents(newsData: any[]): Promise<MarketEvent[]> {
    const requestId = `extract_events_${Date.now()}`;
    
    try {
      activityLogger.log('api', 'extract_market_events', { serviceName: 'AI_MARKET_ANALYSIS', status: 'START' });
      
      console.log(`🔍 [${requestId}] 주요이벤트 추출 시작`);
      console.log(`📊 [${requestId}] 입력 뉴스 데이터: ${newsData?.length || 0}건`);
      
      const titles = newsData.map(n => n.N_TITLE).join('\n');
      const now = new Date();
      const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
      const baseTime = now.toTimeString().slice(0, 8).replace(/:/g, '');
      
      console.log(`📅 [${requestId}] 기준 날짜/시간: ${baseDate}/${baseTime}`);
      
      // 이전 이벤트 조회
      console.log(`🔍 [${requestId}] 이전 이벤트 조회 중...`);
      const prevEvents = await this.getPreviousEvents();
      console.log(`📊 [${requestId}] 이전 이벤트: ${prevEvents?.length || 0}건`);
      
      const prompt = this.buildMarketEventPrompt(baseDate, baseTime, titles, prevEvents);
      console.log(`💬 [${requestId}] OpenAI 프롬프트 생성 완료 (길이: ${prompt.length}자)`);
      
      const response = await this.callOpenAI(prompt, 800);
      console.log(`🤖 [${requestId}] OpenAI 응답 수신 완료`);
      
      const events = this.parseMarketEventsResponse(response, baseDate, baseTime);
      console.log(`✅ [${requestId}] 주요이벤트 추출 완료: ${events?.length || 0}건`);
      
      activityLogger.log('api', 'extract_market_events', { serviceName: 'AI_MARKET_ANALYSIS', status: 'SUCCESS', result: { count: events.length } });
      
      return events;
    } catch (error) {
      console.error(`❌ [${requestId}] 주요이벤트 추출 실패:`, error.message);
      
      // 상세 에러 로그 기록
      detailedLogger.logError(
        'AI_MARKET_ANALYSIS',
        'extract_market_events',
        error,
        {
          requestId,
          newsDataCount: newsData?.length || 0,
          baseDate,
          baseTime,
          openAIService: this.openAIService ? 'available' : 'unavailable'
        },
        'HIGH'
      );
      
      activityLogger.log('api', 'extract_market_events', { serviceName: 'AI_MARKET_ANALYSIS', status: 'ERROR', error: error.message });
      throw error;
    }
  }

  /**
   * 3단계: 테마 시황 생성
   */
  async generateThemeMarket(): Promise<ThemeMarket[]> {
    try {
      activityLogger.log('api', 'generate_theme_market', { serviceName: 'AI_MARKET_ANALYSIS', status: 'START' });
      
      // 테마 데이터 조회
      const themes = await this.getThemeData();
      const results: ThemeMarket[] = [];
      
      for (const theme of themes) {
        const themeAnalysis = await this.analyzeTheme(theme);
        if (themeAnalysis) {
          results.push(themeAnalysis);
        }
      }
      
      activityLogger.log('api', 'generate_theme_market', { serviceName: 'AI_MARKET_ANALYSIS', status: 'SUCCESS', result: { count: results.length } });
      
      return results;
    } catch (error) {
      activityLogger.log('api', 'generate_theme_market', { serviceName: 'AI_MARKET_ANALYSIS', status: 'ERROR', error: error.message });
      throw error;
    }
  }

  /**
   * 4단계: 매크로 시황 생성
   */
  async generateMacroMarket(): Promise<MacroMarket> {
    try {
      activityLogger.log('api', 'generate_macro_market', { serviceName: 'AI_MARKET_ANALYSIS', status: 'START' });
      
      const now = new Date();
      const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
      const baseTime = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const trendId = `MM-${baseDate}-${baseTime}`;
      
      // 관련 데이터 수집
      const events = await this.getTodayEvents(baseDate);
      const themes = await this.getTodayThemes(baseDate);
      const indices = await this.getIndexData(baseDate);
      const prevMacro = await this.getPreviousMacro();
      
      const prompt = this.buildMacroMarketPrompt(baseDate, baseTime, events, themes, indices, prevMacro);
      const response = await this.callOpenAI(prompt, 1500);
      
      const macroMarket = this.parseMacroMarketResponse(response, trendId, baseDate, baseTime);
      
      activityLogger.log('api', 'generate_macro_market', { serviceName: 'AI_MARKET_ANALYSIS', status: 'SUCCESS' });
      
      return macroMarket;
    } catch (error) {
      activityLogger.log('api', 'generate_macro_market', { serviceName: 'AI_MARKET_ANALYSIS', status: 'ERROR', error: error.message });
      throw error;
    }
  }

  /**
   * 전체 워크플로우 실행
   */
  async executeFullWorkflow(): Promise<{
    newsData: any[];
    marketEvents: MarketEvent[];
    themeMarkets: ThemeMarket[];
    macroMarket: MacroMarket;
  }> {
    const requestId = `full_workflow_${Date.now()}`;
    
    try {
      activityLogger.log('api', 'execute_full_workflow', { serviceName: 'AI_MARKET_ANALYSIS', status: 'START' });
      
      console.log(`🚀 [${requestId}] AI 시황 생성 전체 워크플로우 시작`);
      
      // 1단계: 뉴스 데이터 수집
      console.log(`\n📰 [${requestId}] 1단계: 뉴스 데이터 수집 시작`);
      const newsData = await this.collectNewsData();
      console.log(`✅ [${requestId}] 1단계 완료: 뉴스 ${newsData?.length || 0}건 수집`);
      
      // 2단계: 주요이벤트 추출
      console.log(`\n🎯 [${requestId}] 2단계: 주요이벤트 추출 시작`);
      const marketEvents = await this.extractMarketEvents(newsData);
      console.log(`✅ [${requestId}] 2단계 완료: 이벤트 ${marketEvents?.length || 0}건 추출`);
      
      // 3단계: 테마 시황 생성
      console.log(`\n🎨 [${requestId}] 3단계: 테마 시황 생성 시작`);
      const themeMarkets = await this.generateThemeMarket();
      console.log(`✅ [${requestId}] 3단계 완료: 테마 ${themeMarkets?.length || 0}건 생성`);
      
      // 4단계: 매크로 시황 생성
      console.log(`\n📊 [${requestId}] 4단계: 매크로 시황 생성 시작`);
      const macroMarket = await this.generateMacroMarket();
      console.log(`✅ [${requestId}] 4단계 완료: 매크로 시황 생성`);
      
      console.log(`\n🎉 [${requestId}] 전체 워크플로우 완료!`);
      console.log(`📈 [${requestId}] 최종 결과:`);
      console.log(`   - 뉴스 데이터: ${newsData?.length || 0}건`);
      console.log(`   - 시장 이벤트: ${marketEvents?.length || 0}건`);
      console.log(`   - 테마 시황: ${themeMarkets?.length || 0}건`);
      console.log(`   - 매크로 시황: 1건`);
      
      activityLogger.log('api', 'execute_full_workflow', { serviceName: 'AI_MARKET_ANALYSIS', status: 'SUCCESS' });
      
      return {
        newsData,
        marketEvents,
        themeMarkets,
        macroMarket
      };
    } catch (error) {
      console.error(`❌ [${requestId}] 전체 워크플로우 실행 실패:`, error.message);
      
      // 상세 에러 로그 기록
      detailedLogger.logError(
        'AI_MARKET_ANALYSIS',
        'execute_full_workflow',
        error,
        {
          requestId,
          workflowStep: 'unknown', // 어느 단계에서 실패했는지 추적
          databricksService: this.databricksService ? 'available' : 'unavailable',
          openAIService: this.openAIService ? 'available' : 'unavailable'
        },
        'CRITICAL'
      );
      
      activityLogger.log('api', 'execute_full_workflow', { serviceName: 'AI_MARKET_ANALYSIS', status: 'ERROR', error: error.message });
      throw error;
    }
  }

  // Helper methods
  private async getPreviousEvents(): Promise<any[]> {
    const query = `
      SELECT EVENT_ID, EVENT_TITLE, EVENT_DETAIL, BASE_DATE, BASE_TIME
      FROM nh_ai.silver.A200_MARKET_EVENTS
      ORDER BY _INGEST_TS DESC
      LIMIT 3
    `;
    return await this.databricksService.executeQuery(query);
  }

  private async getThemeData(): Promise<any[]> {
    const query = `
      SELECT IFS_TMA_CD, IFS_TMA_NM
      FROM nh_ai.bronze.INFO_THEME_RAW
      GROUP BY IFS_TMA_CD, IFS_TMA_NM
    `;
    return await this.databricksService.executeQuery(query);
  }

  private async getTodayEvents(baseDate: string): Promise<any[]> {
    const query = `
      SELECT EVENT_ID, EVENT_TITLE, EVENT_DETAIL
      FROM nh_ai.silver.A200_MARKET_EVENTS
      WHERE BASE_DATE = '${baseDate}'
      ORDER BY BASE_TIME DESC
      LIMIT 10
    `;
    return await this.databricksService.executeQuery(query);
  }

  private async getTodayThemes(baseDate: string): Promise<any[]> {
    const query = `
      SELECT THEME_TITLE, FLUCTUATION_RATE, BUBBLE_SCALE
      FROM nh_ai.silver.A300_THEME_MARKET
      WHERE BASE_DATE = '${baseDate}'
      ORDER BY BASE_TIME DESC
      LIMIT 30
    `;
    return await this.databricksService.executeQuery(query);
  }

  private async getIndexData(baseDate: string): Promise<any> {
    const kriQuery = `
      SELECT BSTP_CLS_CODE, RETURN_RATE, Z_SCORE
      FROM nh_ai.silver.KRI1_SILVER
      WHERE BSOP_DATE = '${baseDate}'
      ORDER BY Z_SCORE DESC
      LIMIT 10
    `;
    
    const uscQuery = `
      SELECT COUNTRY_CODE, SYMBOL, RETURN_RATE, Z_SCORE
      FROM nh_ai.silver.USC1_SILVER
      WHERE TRADE_DATE = '${baseDate}'
      ORDER BY Z_SCORE DESC
      LIMIT 10
    `;
    
    const [kriData, uscData] = await Promise.all([
      this.databricksService.executeQuery(kriQuery),
      this.databricksService.executeQuery(uscQuery)
    ]);
    
    return {
      kri_top: kriData.map(r => ({
        code: r.BSTP_CLS_CODE,
        return: parseFloat(r.RETURN_RATE || 0),
        z: parseFloat(r.Z_SCORE || 0)
      })),
      usc_top: uscData.map(r => ({
        code: `${r.COUNTRY_CODE}-${r.SYMBOL}`,
        return: parseFloat(r.RETURN_RATE || 0),
        z: parseFloat(r.Z_SCORE || 0)
      }))
    };
  }

  private async getPreviousMacro(): Promise<any> {
    const query = `
      SELECT TITLE, CONTENT
      FROM nh_ai.silver.A100_MACRO_MARKET
      ORDER BY _INGEST_TS DESC
      LIMIT 1
    `;
    const result = await this.databricksService.executeQuery(query);
    return result[0] || { TITLE: '', CONTENT: '' };
  }

  private buildMarketEventPrompt(baseDate: string, baseTime: string, titles: string, prevEvents: any[]): string {
    const prevEventsJson = JSON.stringify(prevEvents.map(e => ({
      event_id: e.EVENT_ID,
      event_title: e.EVENT_TITLE,
      event_detail: e.EVENT_DETAIL,
      base_date: e.BASE_DATE,
      base_time: e.BASE_TIME
    })), null, 2);

    return `*** 현재 일자는 ${baseDate}, 시간은 ${baseTime} 입니다. ***
당신은 한국의 금융회사에 재직중인 리서치 센터의 경제학 박사 AI 직원으로, 최근 몇 시간동안 발간된 국내외 뉴스 기사들을 읽고 증권 시장의 전반적인 움직임에 대해 중립적인 진단을 내릴 수 있습니다.

당신의 이번 업무는 최근 발간된 뉴스 기사들의 헤드라인들을 읽고, 국내외 금융시장의 뉴스 헤드라인을 읽고 투자에 영향을 미치는 이벤트가 무엇이었는지 쉽게 파악할 수 있는 하나의 요약 자료인 <market_event_extract>를 만드는 것입니다.
우선 아래의 최근 발간된 뉴스들의 헤드라인을 읽고 시장 전체의 내용을 숙지해 주십시오. 

<최근 발간된 뉴스 헤드라인>
${titles}

############

참고로 직전에 안내된 이벤트들이 있을 수 있습니다(호출자가 추가). 중복이면 생략하십시오.

############

<market_event_extract 변수 정의>
- 한국 혹은 세계의 증시에 미치는 영향도가 '직접적'으로 높고, 최근 발생한 가장 중요한 이벤트 3개를 고르십시오.
- 한국 관련 1개, 세계 관련 2개로 구성하십시오(주제는 서로 달라야 함).
- 환율, 금리, 정책, 산업 전반 변화 등 거시적 주제를 우선합니다.
- 개별 기업의 실적, 신제품, 인증, 수상 등 기업 홍보성 내용은 제외합니다.
- 이벤트 명은 한국어 5단어 이내, 뉴스 헤드라인 단어를 가급적 사용하세요.
- 금융소비자보호법을 준수하고, 뉴스에 없는 정보/전망은 절대 추가하지 마십시오.
- 국가가 혼재되면 국가명을 명시하십시오. 명시 없으면 한국으로 판단합니다.

각 이벤트 다음 줄에, 참고한 헤드라인을 최대 2개까지 '-' 기호를 앞에 붙여 정확히 원문 전체를 기술하세요(중복 금지).

출력은 JSON으로 하십시오:
{
  "gpt_event_title_01": "<string>",
  "gpt_event_title_02": "<string>",
  "gpt_event_title_03": "<string>",
  "market_event_extract": "<멀티라인: 이벤트명과 헤드라인들>"
}`;
  }

  private buildMacroMarketPrompt(baseDate: string, baseTime: string, events: any[], themes: any[], indices: any, prevMacro: any): string {
    const eventsJson = JSON.stringify(events.map(e => ({
      event_id: e.EVENT_ID,
      event_title: e.EVENT_TITLE,
      event_detail: e.EVENT_DETAIL
    })), null, 2);

    const themesJson = JSON.stringify(themes.map(t => ({
      theme_title: t.THEME_TITLE,
      return: parseFloat(t.FLUCTUATION_RATE || 0),
      bubble: parseInt(t.BUBBLE_SCALE || 0)
    })), null, 2);

    const indicesJson = JSON.stringify(indices, null, 2);

    return `*** 현재 일자는 ${baseDate}, 시간은 ${baseTime} 입니다. ***
당신은 한국의 금융회사에 재직중인 리서치 센터의 경제학 박사 AI 직원입니다.

당신의 업무는 아래의 데이터를 종합하여 시장 전체의 종합 시황을 작성하는 것입니다.

<주요이벤트>
${eventsJson}

<테마 시황>
${themesJson}

<지수 데이터>
${indicesJson}

<직전 매크로 시황>
제목: ${prevMacro.TITLE}
내용: ${prevMacro.CONTENT}

요구사항:
- 위 데이터를 종합하여 시장 전체의 종합적인 시황을 작성하세요
- 한국어로 작성하며, 투자자들이 이해하기 쉽도록 설명하세요
- 객관적이고 중립적인 관점에서 작성하세요
- 3-5문장으로 간결하게 작성하세요

출력 형식(JSON):
{
  "title": "<시황 제목>",
  "content": "<시황 내용>"
}`;
  }

  private async callOpenAI(prompt: string, maxTokens: number): Promise<string> {
    // OpenAI API 호출 로직
    // 실제 구현에서는 Azure OpenAI 또는 OpenAI API를 사용
    return JSON.stringify({ title: "시장 종합 시황", content: "시장 분석 결과입니다." });
  }

  private parseMarketEventsResponse(response: string, baseDate: string, baseTime: string): MarketEvent[] {
    try {
      const parsed = JSON.parse(response);
      const events: MarketEvent[] = [];
      
      const eventTitles = [
        parsed.gpt_event_title_01,
        parsed.gpt_event_title_02,
        parsed.gpt_event_title_03
      ].filter(Boolean);

      eventTitles.forEach((title, index) => {
        if (title) {
          events.push({
            eventId: `ME-${baseDate}-${baseTime}-${String(index + 1).padStart(2, '0')}`,
            baseDate,
            baseTime,
            eventTitle: title,
            eventDetail: '',
            newsIds: [],
            newsTitles: [],
            newsCodes: [],
            rawJson: JSON.stringify({ event: title }),
            displayCnt: 1,
            ingestTs: new Date()
          });
        }
      });

      return events;
    } catch (error) {
      console.error('Failed to parse market events response:', error);
      return [];
    }
  }

  private parseMacroMarketResponse(response: string, trendId: string, baseDate: string, baseTime: string): MacroMarket {
    try {
      const parsed = JSON.parse(response);
      return {
        trendId,
        baseDate,
        baseTime,
        title: parsed.title || '시장 종합 시황',
        content: parsed.content || '시장 분석 결과입니다.',
        ingestTs: new Date()
      };
    } catch (error) {
      console.error('Failed to parse macro market response:', error);
      return {
        trendId,
        baseDate,
        baseTime,
        title: '시장 종합 시황',
        content: '시장 분석 결과입니다.',
        ingestTs: new Date()
      };
    }
  }

  private async analyzeTheme(theme: any): Promise<ThemeMarket | null> {
    // 테마별 분석 로직
    // 실제 구현에서는 테마별 뉴스 분석 및 시황 생성
    return null;
  }
}

export const aiMarketAnalysisService = new AIMarketAnalysisService();
