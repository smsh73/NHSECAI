import cron, { type ScheduledTask } from 'node-cron';
import { storage } from '../storage';
import { websocketService } from './websocket';
import { workflowExecutionEngine } from './workflow-execution-engine';
import * as openaiService from './openai';
import type { NewsData, ThemeSummary, SchedulerJob as BaseSchedulerJob, SchedulerStats as BaseSchedulerStats } from '@shared/schema';

// Extended internal interface with task function
export interface SchedulerJob extends Omit<BaseSchedulerJob, 'lastRun' | 'nextRun'> {
  task: () => Promise<void>;
  job?: ScheduledTask;
  lastRun?: Date;  // Using Date internally
  nextRun?: Date;  // Using Date internally
}

// Extended internal interface with Date
export interface SchedulerStats extends Omit<BaseSchedulerStats, 'lastUpdate' | 'jobs'> {
  lastUpdate: Date;  // Using Date internally
  jobs: SchedulerJob[];
}

export interface SafeSchedulerJob extends Omit<BaseSchedulerJob, 'lastRun' | 'nextRun'> {
  lastRun?: Date;
  nextRun?: Date;
  // Note: job property excluded to avoid circular references
}

export interface SafeSchedulerStats extends Omit<BaseSchedulerStats, 'lastUpdate' | 'jobs'> {
  lastUpdate: Date;
  jobs: SafeSchedulerJob[];
}

class SchedulerService {
  private jobs: Map<string, SchedulerJob> = new Map();
  private isActive: boolean = false;
  private stats: SchedulerStats = {
    totalJobs: 0,
    runningJobs: 0,
    errorCount: 0,
    lastUpdate: new Date(),
    jobs: []
  };
  
  // Theme classification and summary throttling
  private themeSummaryThrottles: Map<string, number> = new Map();
  
  // Theme keyword mappings
  private themeKeywords: Record<string, string[]> = {
    'tech-innovation': ['ai', '인공지능', '반도체', '소프트웨어', 'gpu', 'cpu', '클라우드', 'it', '데이터'],
    'green-energy': ['배터리', '전기차', '태양광', '풍력', '수소', '친환경', '탄소중립', '신재생', 'ev'],
    'bio-health': ['제약', '바이오', '의료', '신약', '헬스케어', 'mrna', '진단', '백신', '치료'],
    'finance': ['은행', '보험', '증권', '금리', '대출', '예금', '투자', '핀테크', '금융'],
    'consumer': ['유통', '백화점', '마트', '식음료', '화장품', '패션', '브랜드', '소비재', '리테일'],
    'manufacturing': ['자동차', '기계', '철강', '조선', '화학', '정유', '석유', '제조업', '산업'],
    'entertainment': ['엔터', '게임', '미디어', '콘텐츠', '방송', '영화', 'ott', 'k-pop', '드라마'],
    'real-estate': ['부동산', '건설', '아파트', '분양', '재개발', '인프라', '토목', '주택', 'reit'],
    'defense-space': ['방산', '우주', '항공', '위성', '로켓', '국방', '무기', '군사', '안보'],
    'materials': ['소재', '화학', '에너지', '원자재', '광물', '희토류', '신소재', '금속', '자원']
  };

  constructor() {
    this.initializeJobs();
  }

  private initializeJobs() {
    // 1분마다 수집 - 국내증권시세
    this.addJob({
      id: 'domestic-stock-prices',
      name: '국내증권시세 수집',
      cronExpression: '*/1 * * * *', // 매분
      task: this.collectDomesticStockPrices.bind(this),
      isRunning: false,
      errorCount: 0,
      maxRetries: 3
    });

    // 1분마다 수집 - 해외증권시세
    this.addJob({
      id: 'foreign-stock-prices',
      name: '해외증권시세 수집',
      cronExpression: '*/1 * * * *', // 매분
      task: this.collectForeignStockPrices.bind(this),
      isRunning: false,
      errorCount: 0,
      maxRetries: 3
    });

    // 1분마다 수집 - 국내지수
    this.addJob({
      id: 'domestic-indices',
      name: '국내지수 수집',
      cronExpression: '*/1 * * * *', // 매분
      task: this.collectDomesticIndices.bind(this),
      isRunning: false,
      errorCount: 0,
      maxRetries: 3
    });

    // 1분마다 수집 - 해외지수
    this.addJob({
      id: 'foreign-indices',
      name: '해외지수 수집',
      cronExpression: '*/1 * * * *', // 매분
      task: this.collectForeignIndices.bind(this),
      isRunning: false,
      errorCount: 0,
      maxRetries: 3
    });

    // 1분마다 수집 - 수급량정보
    this.addJob({
      id: 'volume-data',
      name: '수급량정보 수집',
      cronExpression: '*/1 * * * *', // 매분
      task: this.collectVolumeData.bind(this),
      isRunning: false,
      errorCount: 0,
      maxRetries: 3
    });

    // 실시간 수집 - 뉴스시황 (30초마다 체크)
    this.addJob({
      id: 'news-updates',
      name: '뉴스시황 실시간 수집',
      cronExpression: '*/30 * * * * *', // 30초마다
      task: this.collectNewsUpdates.bind(this),
      isRunning: false,
      errorCount: 0,
      maxRetries: 3
    });

    // 하루 한번 수집 - 마스터파일 정보 (오전 8시)
    this.addJob({
      id: 'master-files',
      name: '마스터파일 정보 수집',
      cronExpression: '0 8 * * *', // 매일 오전 8시
      task: this.collectMasterFiles.bind(this),
      isRunning: false,
      errorCount: 0,
      maxRetries: 3
    });

    // 하루 한번 분석 - 잔고 분석 (저녁 6시)
    this.addJob({
      id: 'daily-balance-analysis',
      name: '일일 잔고 분석',
      cronExpression: '0 18 * * *', // 매일 저녁 6시
      task: this.performDailyBalanceAnalysis.bind(this),
      isRunning: false,
      errorCount: 0,
      maxRetries: 3
    });

    // 매월 1일 분석 - 매매 분석 (오전 9시)
    this.addJob({
      id: 'monthly-trade-analysis',
      name: '월별 매매 분석',
      cronExpression: '0 9 1 * *', // 매월 1일 오전 9시
      task: this.performMonthlyTradeAnalysis.bind(this),
      isRunning: false,
      errorCount: 0,
      maxRetries: 3
    });
  }

  private addJob(jobConfig: Omit<SchedulerJob, 'job'>) {
    this.jobs.set(jobConfig.id, {
      ...jobConfig,
      nextRun: this.getNextRunDate(jobConfig.cronExpression)
    });
    this.updateStats();
  }

  private getNextRunDate(cronExpression: string): Date {
    try {
      // Simple calculation for next run - just add 1 minute for frequent jobs
      // For more complex cron expressions, we'd use a proper cron parser
      if (cronExpression.startsWith('*/1 ')) {
        return new Date(Date.now() + 60000); // 1 minute
      } else if (cronExpression.startsWith('*/30 ')) {
        return new Date(Date.now() + 30000); // 30 seconds
      } else {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day for daily jobs
      }
    } catch (error) {
      console.error('Error calculating next run date:', error);
      return new Date(Date.now() + 60000); // Default to 1 minute from now
    }
  }

  private calculateNextRun(cronExpression: string): Date {
    return this.getNextRunDate(cronExpression);
  }

  public async startScheduler(): Promise<void> {
    if (this.isActive) {
      console.log('Scheduler is already running');
      return;
    }

    // Wait for any pending stop operations to complete
    // This prevents race conditions when stopping and starting quickly
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify that scheduler is fully stopped before starting
    let retryCount = 0;
    const maxRetries = 3;
    while (retryCount < maxRetries) {
      // Check if any jobs are still running
      const hasRunningJobs = Array.from(this.jobs.values()).some(job => job.isRunning || job.job !== undefined);
      if (!hasRunningJobs && !this.isActive) {
        break; // Scheduler is fully stopped
      }
      await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
      retryCount++;
    }

    if (retryCount >= maxRetries) {
      console.warn('Scheduler may not be fully stopped, but proceeding with start');
    }

    console.log('Starting data ingestion scheduler...');
    this.isActive = true;

    // Load workflow schedules from database
    try {
      await this.loadWorkflowSchedules();
    } catch (error) {
      console.error('Failed to load workflow schedules:', error);
    }

    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      try {
        const scheduledTask = cron.schedule(job.cronExpression, async () => {
          await this.executeJob(jobId);
        }, { timezone: 'Asia/Seoul' });

        job.job = scheduledTask;
        console.log(`Started job: ${job.name} with cron: ${job.cronExpression}`);
      } catch (error) {
        console.error(`Failed to start job ${jobId}:`, error);
      }
    }

    // Broadcast scheduler start
    websocketService.broadcast({
      type: 'scheduler_status',
      data: { status: 'started', jobs: this.getStats() },
      timestamp: Date.now()
    });
  }

  public async stopScheduler(): Promise<void> {
    if (!this.isActive) {
      console.log('Scheduler is not running');
      return;
    }

    console.log('Stopping data ingestion scheduler...');
    this.isActive = false;

    // Stop all jobs and wait for them to complete
    const stopPromises: Promise<void>[] = [];
    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      if (job.job) {
        try {
          job.job.stop();
          job.job = undefined;
          job.isRunning = false;
          console.log(`Stopped job: ${job.name}`);
        } catch (error) {
          console.error(`Error stopping job ${jobId}:`, error);
        }
      }
    }

    // Wait for all stop operations to complete
    await Promise.all(stopPromises);
    
    // Additional wait to ensure all async operations are complete
    await new Promise(resolve => setTimeout(resolve, 200));

    this.updateStats();

    // Broadcast scheduler stop
    websocketService.broadcast({
      type: 'scheduler_status',
      data: { status: 'stopped', jobs: this.getStats() },
      timestamp: Date.now()
    });
  }

  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    if (job.isRunning) {
      console.log(`Job ${jobId} is already running, skipping...`);
      return;
    }

    job.isRunning = true;
    job.lastRun = new Date();
    
    try {
      console.log(`Executing job: ${job.name}`);
      await job.task();
      
      job.errorCount = 0; // Reset error count on success
      job.nextRun = this.getNextRunDate(job.cronExpression);
      
      console.log(`Job ${job.name} completed successfully`);
      
      // Broadcast job success
      websocketService.broadcast({
        type: 'job_completed',
        data: { jobId, jobName: job.name, status: 'success', timestamp: Date.now() },
        timestamp: Date.now()
      });
      
    } catch (error) {
      job.errorCount++;
      console.error(`Job ${job.name} failed (${job.errorCount}/${job.maxRetries}):`, error);
      
      if (job.errorCount >= job.maxRetries) {
        console.error(`Job ${job.name} exceeded max retries, stopping job`);
        if (job.job) {
          job.job.stop();
          job.job = undefined;
        }
      }
      
      // Broadcast job error
      websocketService.broadcast({
        type: 'job_failed',
        data: { 
          jobId, 
          jobName: job.name, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCount: job.errorCount,
          maxRetries: job.maxRetries,
          timestamp: Date.now() 
        },
        timestamp: Date.now()
      });
      
    } finally {
      job.isRunning = false;
      // Update stats synchronously to ensure state consistency
      this.updateStats();
    }
  }

  private updateStats(): void {
    const jobsArray = Array.from(this.jobs.values());
    this.stats = {
      totalJobs: jobsArray.length,
      runningJobs: jobsArray.filter(job => job.isRunning).length,
      errorCount: jobsArray.reduce((sum, job) => sum + job.errorCount, 0),
      lastUpdate: new Date(),
      jobs: jobsArray
    };
  }

  public getStats(): SchedulerStats {
    this.updateStats();
    return this.stats;
  }

  public getSafeStats(): SafeSchedulerStats {
    this.updateStats();
    
    // Create safe version without circular references
    const safeJobs: SafeSchedulerJob[] = Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      name: job.name,
      cronExpression: job.cronExpression,
      isRunning: job.isRunning,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      errorCount: job.errorCount,
      maxRetries: job.maxRetries
      // Exclude job property to avoid circular references
    }));

    return {
      totalJobs: this.stats.totalJobs,
      runningJobs: this.stats.runningJobs,
      errorCount: this.stats.errorCount,
      lastUpdate: this.stats.lastUpdate,
      jobs: safeJobs
    };
  }

  public isSchedulerActive(): boolean {
    return this.isActive;
  }

  // Data Collection Methods

  private async collectDomesticStockPrices(): Promise<void> {
    try {
      // 시뮬레이션 데이터 생성 (실제 구현에서는 외부 API 호출)
      const mockStockData = [
        { symbol: 'SAMSUNG', price: 65000, volume: 1500000, market: 'KOSPI' },
        { symbol: 'LG', price: 85000, volume: 850000, market: 'KOSPI' },
        { symbol: 'NAVER', price: 210000, volume: 650000, market: 'KOSDAQ' }
      ];

      for (const stock of mockStockData) {
        // 벡터 임베딩 생성
        // const embeddings = await this.generateEmbeddings(`${stock.symbol} 국내증권시세 ${stock.price}원 거래량 ${stock.volume}주`);
        
        await storage.createFinancialData({
          symbol: stock.symbol,
          market: stock.market,
          country: '대한민국',
          dataType: '국내증권시세',
          price: stock.price.toString(),
          volume: stock.volume,
          timestamp: new Date(),
          embeddings: JSON.stringify([]),
          metadata: {
            source: 'scheduler',
            collectionType: 'domestic_stock_prices',
            lastUpdate: new Date().toISOString()
          }
        });
      }

      console.log(`국내증권시세 데이터 ${mockStockData.length}건 수집 완료`);
    } catch (error) {
      console.error('국내증권시세 수집 실패:', error);
      throw error;
    }
  }

  private async collectForeignStockPrices(): Promise<void> {
    try {
      const mockStockData = [
        { symbol: 'AAPL', price: 175.50, volume: 45000000, market: 'NASDAQ' },
        { symbol: 'GOOGL', price: 2850.00, volume: 1200000, market: 'NASDAQ' },
        { symbol: 'TSLA', price: 245.75, volume: 95000000, market: 'NASDAQ' }
      ];

      for (const stock of mockStockData) {
        // const embeddings = await this.generateEmbeddings(`${stock.symbol} 해외증권시세 $${stock.price} volume ${stock.volume}`);
        
        await storage.createFinancialData({
          symbol: stock.symbol,
          market: stock.market,
          country: '미국',
          dataType: '해외증권시세',
          price: stock.price.toString(),
          volume: stock.volume,
          timestamp: new Date(),
          embeddings: JSON.stringify([]),
          metadata: {
            source: 'scheduler',
            collectionType: 'foreign_stock_prices',
            lastUpdate: new Date().toISOString()
          }
        });
      }

      console.log(`해외증권시세 데이터 ${mockStockData.length}건 수집 완료`);
    } catch (error) {
      console.error('해외증권시세 수집 실패:', error);
      throw error;
    }
  }

  private async collectDomesticIndices(): Promise<void> {
    try {
      const mockIndicesData = [
        { symbol: 'KOSPI', price: 2456.78, volume: 0, market: '한국거래소' },
        { symbol: 'KOSDAQ', price: 745.23, volume: 0, market: '한국거래소' },
        { symbol: 'KRX100', price: 5234.12, volume: 0, market: '한국거래소' }
      ];

      for (const index of mockIndicesData) {
        // const embeddings = await this.generateEmbeddings(`${index.symbol} 국내지수 ${index.price} 포인트`);
        
        await storage.createFinancialData({
          symbol: index.symbol,
          market: index.market,
          country: '대한민국',
          dataType: '국내지수',
          price: index.price.toString(),
          volume: index.volume,
          timestamp: new Date(),
          embeddings: JSON.stringify([]),
          metadata: {
            source: 'scheduler',
            collectionType: 'domestic_indices',
            lastUpdate: new Date().toISOString()
          }
        });
      }

      console.log(`국내지수 데이터 ${mockIndicesData.length}건 수집 완료`);
    } catch (error) {
      console.error('국내지수 수집 실패:', error);
      throw error;
    }
  }

  private async collectForeignIndices(): Promise<void> {
    try {
      const mockIndicesData = [
        { symbol: 'S&P500', price: 4567.89, volume: 0, market: 'NYSE' },
        { symbol: 'NASDAQ', price: 14235.67, volume: 0, market: 'NASDAQ' },
        { symbol: 'DOW', price: 34567.12, volume: 0, market: 'NYSE' }
      ];

      for (const index of mockIndicesData) {
        // const embeddings = await this.generateEmbeddings(`${index.symbol} 해외지수 ${index.price} points`);
        
        await storage.createFinancialData({
          symbol: index.symbol,
          market: index.market,
          country: '미국',
          dataType: '해외지수',
          price: index.price.toString(),
          volume: index.volume,
          timestamp: new Date(),
          embeddings: JSON.stringify([]),
          metadata: {
            source: 'scheduler',
            collectionType: 'foreign_indices',
            lastUpdate: new Date().toISOString()
          }
        });
      }

      console.log(`해외지수 데이터 ${mockIndicesData.length}건 수집 완료`);
    } catch (error) {
      console.error('해외지수 수집 실패:', error);
      throw error;
    }
  }

  private async collectVolumeData(): Promise<void> {
    try {
      const mockVolumeData = [
        { symbol: 'TOTAL_KOSPI', volume: 450000000, dataType: '코스피거래량' },
        { symbol: 'TOTAL_KOSDAQ', volume: 125000000, dataType: '코스닥거래량' },
        { symbol: 'FOREIGN_BUY', volume: 85000000, dataType: '외국인매수량' },
        { symbol: 'INSTITUTION_BUY', volume: 95000000, dataType: '기관매수량' }
      ];

      for (const volumeInfo of mockVolumeData) {
        // const embeddings = await this.generateEmbeddings(`${volumeInfo.symbol} ${volumeInfo.dataType} ${volumeInfo.volume}주`);
        
        await storage.createFinancialData({
          symbol: volumeInfo.symbol,
          market: '한국거래소',
          country: '대한민국',
          dataType: '수급량정보',
          price: '0',
          volume: volumeInfo.volume,
          timestamp: new Date(),
          embeddings: JSON.stringify([]),
          metadata: {
            source: 'scheduler',
            collectionType: 'volume_data',
            volumeType: volumeInfo.dataType,
            lastUpdate: new Date().toISOString()
          }
        });
      }

      console.log(`수급량정보 데이터 ${mockVolumeData.length}건 수집 완료`);
    } catch (error) {
      console.error('수급량정보 수집 실패:', error);
      throw error;
    }
  }

  private async collectNewsUpdates(): Promise<void> {
    try {
      const mockNewsData = [
        {
          title: '삼성전자, 반도체 업황 개선으로 실적 호조 전망',
          content: '삼성전자가 메모리 반도체 업황 개선으로 다음 분기 실적 개선이 예상된다고 발표했습니다.',
          category: '기업',
          sentiment: 'positive',
          relevantSymbols: ['SAMSUNG', 'SK하이닉스'],
          relevantThemes: ['반도체', 'IT'],
          keywords: ['반도체', '실적', '호조']
        },
        {
          title: '코스피, 외국인 매수세에 상승 출발',
          content: '코스피 지수가 외국인 매수세에 힘입어 상승 출발했습니다.',
          category: '시장',
          sentiment: 'positive',
          relevantSymbols: ['KOSPI'],
          relevantThemes: ['시장', '투자'],
          keywords: ['코스피', '외국인', '매수', '상승']
        }
      ];

      for (const news of mockNewsData) {
        const embeddings = await this.generateEmbeddings(`${news.title} ${news.content}`);
        
        // Save news data
        const savedNews = await storage.createNewsData({
          title: news.title,
          content: news.content,
          category: news.category,
          sentiment: news.sentiment,
          relevantSymbols: news.relevantSymbols,
          relevantThemes: news.relevantThemes,
          keywords: news.keywords,
          source: 'scheduler_news_feed',
          publishedAt: new Date(),
          embeddings: JSON.stringify(embeddings)
        });
        
        // Classify news to theme
        const themeId = await this.classifyNewsToTheme(savedNews);
        await storage.setNewsTheme(savedNews.id, themeId);
        
        // Broadcast theme news event
        websocketService.broadcast({
          type: 'theme_news',
          data: {
            newsId: savedNews.id,
            themeId: themeId,
            title: savedNews.title,
            category: savedNews.category
          },
          timestamp: Date.now()
        });
        
        // Update theme summary with throttling (60 seconds)
        const lastUpdate = this.themeSummaryThrottles.get(themeId);
        if (!lastUpdate || Date.now() - lastUpdate > 60000) {
          await this.updateThemeSummary(themeId);
          this.themeSummaryThrottles.set(themeId, Date.now());
        }
      }

      console.log(`뉴스시황 데이터 ${mockNewsData.length}건 수집 및 분류 완료`);
    } catch (error) {
      console.error('뉴스시황 수집 실패:', error);
      throw error;
    }
  }

  private async collectMasterFiles(): Promise<void> {
    try {
      const mockMasterData = [
        {
          eventType: '신규상장',
          symbol: 'NEW001',
          companyName: '신규테크',
          effectiveDate: new Date(),
          description: '코스닥 신규상장'
        },
        {
          eventType: '거래정지',
          symbol: 'HALT001',
          companyName: '정지회사',
          effectiveDate: new Date(),
          description: '사업보고서 미제출로 인한 거래정지'
        }
      ];

      for (const masterInfo of mockMasterData) {
        const embeddings = await this.generateEmbeddings(`${masterInfo.eventType} ${masterInfo.symbol} ${masterInfo.companyName} ${masterInfo.description}`);
        
        await storage.createFinancialData({
          symbol: masterInfo.symbol,
          market: masterInfo.eventType.includes('코스피') ? 'KOSPI' : 'KOSDAQ',
          country: '대한민국',
          dataType: '마스터파일정보',
          price: '0',
          volume: 0,
          timestamp: new Date(),
          embeddings: JSON.stringify(embeddings),
          metadata: {
            source: 'scheduler',
            collectionType: 'master_files',
            eventType: masterInfo.eventType,
            companyName: masterInfo.companyName,
            effectiveDate: masterInfo.effectiveDate.toISOString(),
            description: masterInfo.description,
            lastUpdate: new Date().toISOString()
          }
        });
      }

      console.log(`마스터파일 정보 ${mockMasterData.length}건 수집 완료`);
    } catch (error) {
      console.error('마스터파일 정보 수집 실패:', error);
      throw error;
    }
  }

  private async performDailyBalanceAnalysis(): Promise<void> {
    try {
      console.log('Starting daily balance analysis...');
      
      // Get all users who have balance data for today
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Discover actual users with balance data for today
      const userIds = await storage.getDistinctUserIdsWithBalances(today);
      
      if (userIds.length === 0) {
        console.log(`No users found with balance data for ${todayStr}`);
        
        // Broadcast no users found
        websocketService.broadcast({
          type: 'daily_balance_analysis_complete',
          data: {
            date: todayStr,
            processedUsers: 0,
            totalUsers: 0,
            status: 'no_users_found'
          },
          timestamp: Date.now()
        });
        return;
      }
      
      console.log(`Found ${userIds.length} users with balance data for ${todayStr}: ${userIds.join(', ')}`);
      
      let processedUsers = 0;
      let errorCount = 0;
      
      for (const userId of userIds) {
        try {
          // Check if user has balance data for today
          const balances = await storage.getUserBalances(userId, { 
            date: today,
            limit: 100 
          });
          
          if (balances.length === 0) {
            console.log(`No balance data found for user ${userId} on ${todayStr}`);
            continue;
          }
          
          // Check if insights already exist for today
          const existingInsights = await storage.getBalanceInsight(userId, today);
          if (existingInsights) {
            console.log(`Balance insights already exist for user ${userId} on ${todayStr}`);
            continue;
          }
          
          // Generate balance analysis for the user
          await storage.generateBalanceAnalysis(userId, today);
          processedUsers++;
          
          console.log(`Generated balance analysis for user ${userId}`);
          
          // Broadcast progress update
          websocketService.broadcast({
            type: 'balance_analysis_progress',
            data: {
              userId,
              date: todayStr,
              status: 'completed'
            },
            timestamp: Date.now()
          });
          
        } catch (userError) {
          errorCount++;
          console.error(`Failed to process balance analysis for user ${userId}:`, userError);
          
          // Broadcast error update
          websocketService.broadcast({
            type: 'balance_analysis_error',
            data: {
              userId,
              date: todayStr,
              error: userError instanceof Error ? userError.message : 'Unknown error',
              errorCount,
              attempt: 1 // Future: implement retry logic
            },
            timestamp: Date.now()
          });
          
          // Continue processing other users despite individual failures
          console.log(`Continuing with remaining ${userIds.length - userIds.indexOf(userId) - 1} users...`);
        }
      }
      
      const successRate = userIds.length > 0 ? (processedUsers / userIds.length) * 100 : 0;
      console.log(`Daily balance analysis completed. Processed ${processedUsers}/${userIds.length} users (${successRate.toFixed(1)}% success rate). Errors: ${errorCount}`);
      
      // Broadcast completion
      websocketService.broadcast({
        type: 'daily_balance_analysis_complete',
        data: {
          date: todayStr,
          processedUsers,
          totalUsers: userIds.length,
          errorCount,
          successRate,
          timestamp: new Date().toISOString()
        },
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Daily balance analysis failed:', error);
      
      // Broadcast error
      websocketService.broadcast({
        type: 'daily_balance_analysis_error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  private async classifyNewsToTheme(news: NewsData): Promise<string> {
    try {
      // 1. Check relevantThemes field first
      if (news.relevantThemes && news.relevantThemes.length > 0) {
        const firstTheme = news.relevantThemes[0].toLowerCase();
        
        // Theme mapping based on relevantThemes - only use existing theme IDs
        if (firstTheme.includes('ai') || firstTheme.includes('인공지능') || firstTheme.includes('반도체') || 
            firstTheme.includes('기술') || firstTheme.includes('혁신') || firstTheme.includes('테크')) {
          return 'tech-innovation';
        }
        if (firstTheme.includes('소재') || firstTheme.includes('재료') || firstTheme.includes('화학') ||
            firstTheme.includes('배터리') || firstTheme.includes('전기차') || firstTheme.includes('친환경')) {
          return 'materials';
        }
      }
      
      // 2. Analyze title and content keywords
      const text = `${news.title} ${news.content}`.toLowerCase();
      
      // Check each theme's keywords - only use existing theme IDs
      for (const [themeId, keywords] of Object.entries(this.themeKeywords)) {
        // Only check existing themes
        if (themeId === 'tech-innovation' || themeId === 'materials') {
          for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
              return themeId;
            }
          }
        }
      }
      
      // 3. Check keywords array if available
      if (news.keywords && news.keywords.length > 0) {
        const keywordText = news.keywords.join(' ').toLowerCase();
        
        // Check for tech-innovation keywords
        if (keywordText.includes('ai') || keywordText.includes('인공지능') || keywordText.includes('반도체') ||
            keywordText.includes('기술') || keywordText.includes('혁신') || keywordText.includes('테크')) {
          return 'tech-innovation';
        }
        
        // Check for materials keywords
        if (keywordText.includes('소재') || keywordText.includes('재료') || keywordText.includes('화학') ||
            keywordText.includes('배터리') || keywordText.includes('전기차') || keywordText.includes('친환경')) {
          return 'materials';
        }
      }
      
      // 4. Default fallback - return tech-innovation as default
      return 'tech-innovation';
    } catch (error) {
      console.error('뉴스 테마 분류 실패:', error);
      return 'tech-innovation'; // Default fallback
    }
  }
  
  private async updateThemeSummary(themeId: string): Promise<void> {
    try {
      // Fetch recent news for the theme (last 1 hour)
      const recentNews = await storage.getThemeNews(themeId, {
        since: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        limit: 20
      });
      
      if (recentNews.length === 0) {
        console.log(`No news found for theme ${themeId}, skipping summary update`);
        return;
      }
      
      // Generate summary using OpenAI
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
      if (!apiKey || apiKey === 'default_key') {
        console.warn('OpenAI API key not configured, skipping summary generation');
        return;
      }
      
      const newsForAnalysis = recentNews.map(n => ({
        title: n.title,
        content: n.content,
        category: n.category,
        sentiment: n.sentiment
      }));
      
      const analysisResult = await openaiService.analyzeNews(
        newsForAnalysis,
        '다음 뉴스들을 테마별로 요약해주세요. 주요 이벤트와 시장에 미치는 영향을 중심으로 분석해주세요.'
      );
      
      // Extract top entities from news
      const topEntities = this.extractTopEntities(recentNews);
      
      // Create theme summary
      const themeSummary: ThemeSummary = {
        themeId,
        summary: analysisResult.summary,
        keyPoints: analysisResult.key_points,
        topEntities,
        sentiment: analysisResult.sentiment,
        newsCount: recentNews.length,
        lastUpdated: new Date()
      };
      
      // Store summary in memory
      await storage.setThemeSummary(themeId, themeSummary);
      
      // Broadcast theme summary update
      websocketService.broadcast({
        type: 'theme_summary',
        data: {
          themeId,
          summary: themeSummary
        },
        timestamp: Date.now()
      });
      
      console.log(`테마 ${themeId} 요약 업데이트 완료 (${recentNews.length}건 뉴스 분석)`);
      
    } catch (error) {
      console.error(`테마 ${themeId} 요약 업데이트 실패:`, error);
    }
  }
  
  private extractTopEntities(newsItems: NewsData[]): string[] {
    const entityCount = new Map<string, number>();
    
    // Count entities from relevantSymbols
    for (const news of newsItems) {
      if (news.relevantSymbols) {
        for (const symbol of news.relevantSymbols) {
          entityCount.set(symbol, (entityCount.get(symbol) || 0) + 1);
        }
      }
      
      // Also count from entities field if available
      if (news.entities) {
        for (const entity of news.entities) {
          entityCount.set(entity, (entityCount.get(entity) || 0) + 1);
        }
      }
    }
    
    // Sort by count and return top 10
    return Array.from(entityCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([entity]) => entity);
  }

  private async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Check if OpenAI API key is available and valid
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
      if (!apiKey || apiKey === 'default_key') {
        console.warn('OpenAI API key not configured, skipping embedding generation');
        return [];
      }

      // Use openaiService functions if available
      if (openaiService && typeof openaiService.generateEmbedding === 'function') {
        const embedding = await openaiService.generateEmbedding(text);
        return embedding || [];
      }
      console.warn('OpenAI embedding service not available, returning empty array');
      return [];
    } catch (error) {
      console.warn('임베딩 생성 실패, 빈 배열 반환:', error instanceof Error ? error.message : 'Unknown error');
      // Return empty array on error to continue data collection
      return [];
    }
  }

  private async performMonthlyTradeAnalysis(): Promise<void> {
    try {
      console.log('Starting monthly trade analysis...');
      
      // Get the previous month
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const month = lastMonth.toISOString().slice(0, 7); // YYYY-MM format
      
      console.log(`Analyzing trades for month: ${month}`);
      
      // Get all users who have trading data for the previous month
      const userIds = await storage.getUsersWithTradesInMonth(month);
      
      if (userIds.length === 0) {
        console.log(`No users found with trading data for ${month}`);
        
        // Broadcast no users found
        websocketService.broadcast({
          type: 'monthly_trade_analysis_complete',
          data: {
            month,
            processedUsers: 0,
            totalUsers: 0,
            status: 'no_users_found'
          },
          timestamp: Date.now()
        });
        return;
      }
      
      console.log(`Found ${userIds.length} users with trading data for ${month}: ${userIds.join(', ')}`);
      
      let processedUsers = 0;
      let errorCount = 0;
      
      // Broadcast analysis start
      websocketService.broadcast({
        type: 'monthly_trade_analysis_start',
        data: {
          month,
          totalUsers: userIds.length,
          startTime: new Date().toISOString()
        },
        timestamp: Date.now()
      });
      
      for (const userId of userIds) {
        try {
          // Check if user has trading data for the month
          const startDate = new Date(`${month}-01`);
          const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          
          const trades = await storage.getUserTrades(userId, { 
            startDate, 
            endDate,
            limit: 1000 
          });
          
          if (trades.length === 0) {
            console.log(`No trading data found for user ${userId} in ${month}`);
            continue;
          }
          
          // Check if insights already exist for this month
          const existingInsights = await storage.getTradeInsight(userId, month);
          if (existingInsights) {
            console.log(`Trade insights already exist for user ${userId} for month ${month}`);
            continue;
          }
          
          // Generate trading insights for the user
          await storage.generateTradingInsights(userId, month);
          processedUsers++;
          
          console.log(`Generated trading insights for user ${userId} for month ${month}`);
          
          // Broadcast progress update
          websocketService.broadcast({
            type: 'trade_analysis_progress',
            data: {
              userId,
              month,
              processedUsers,
              totalUsers: userIds.length,
              status: 'completed'
            },
            timestamp: Date.now()
          });
          
        } catch (userError) {
          errorCount++;
          console.error(`Failed to analyze trades for user ${userId}:`, userError);
          
          // Broadcast user error
          websocketService.broadcast({
            type: 'trade_analysis_error',
            data: {
              userId,
              month,
              error: userError instanceof Error ? userError.message : 'Unknown error',
              timestamp: new Date().toISOString()
            },
            timestamp: Date.now()
          });
        }
      }
      
      console.log(`Monthly trade analysis completed. Processed: ${processedUsers}, Errors: ${errorCount}`);
      
      // Broadcast analysis completion
      websocketService.broadcast({
        type: 'monthly_trade_analysis_complete',
        data: {
          month,
          processedUsers,
          totalUsers: userIds.length,
          errorCount,
          status: 'completed',
          completedAt: new Date().toISOString()
        },
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Monthly trade analysis failed:', error);
      
      // Broadcast global error
      websocketService.broadcast({
        type: 'monthly_trade_analysis_error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  // Workflow Schedule Management
  public async registerWorkflowSchedule(schedule: any): Promise<void> {
    try {
      const jobId = `workflow-${schedule.id}`;
      
      // Import workflow execution engine dynamically to avoid circular dependency
      const { workflowExecutionEngine } = await import('./workflow-execution-engine');
      
      // Create a job for this workflow schedule
      const job: Omit<SchedulerJob, 'job'> = {
        id: jobId,
        name: schedule.name || `Workflow ${schedule.workflowId}`,
        cronExpression: schedule.cronExpression,
        task: async () => {
          try {
            console.log(`Executing scheduled workflow: ${schedule.workflowId}`);
            
            // Get workflow from database
            const workflow = await storage.getWorkflow(schedule.workflowId);
            if (!workflow) {
              throw new Error(`Workflow ${schedule.workflowId} not found`);
            }
            
            // Create workflow session
            const sessionId = await workflowExecutionEngine.createWorkflowSession(
              schedule.workflowId,
              `Scheduled: ${schedule.name}`,
              undefined
            );
            
            // Execute workflow asynchronously
            const executionResult = await workflowExecutionEngine.executeWorkflow(sessionId);
            
            if (!executionResult.success) {
              throw new Error(executionResult.error || 'Workflow execution failed');
            }
            
            // Update last run time and calculate next run
            await storage.updateSchedule(schedule.id, {
              lastRun: new Date(),
              nextRun: this.calculateNextRun(schedule.cronExpression)
            });
            
            console.log(`Scheduled workflow ${schedule.workflowId} completed successfully`);
          } catch (error) {
            console.error(`Failed to execute workflow ${schedule.workflowId}:`, error);
            // Update last run time even on error
            await storage.updateSchedule(schedule.id, {
              lastRun: new Date()
            });
            throw error;
          }
        },
        isRunning: false,
        errorCount: 0,
        maxRetries: 3
      };
      
      // Add job to the job map
      this.jobs.set(jobId, {
        ...job,
        nextRun: this.getNextRunDate(job.cronExpression)
      });
      
      // If scheduler is active, start this job
      if (this.isActive) {
        const scheduledTask = cron.schedule(job.cronExpression, async () => {
          await this.executeJob(jobId);
        }, { 
          timezone: schedule.timezone || 'Asia/Seoul'
        });
        
        const registeredJob = this.jobs.get(jobId);
        if (registeredJob) {
          registeredJob.job = scheduledTask;
        }
        
        console.log(`Registered workflow schedule: ${schedule.name}`);
      }
      
      this.updateStats();
    } catch (error) {
      console.error('Failed to register workflow schedule:', error);
      throw error;
    }
  }
  
  public async unregisterWorkflowSchedule(scheduleId: string): Promise<void> {
    try {
      const jobId = `workflow-${scheduleId}`;
      const job = this.jobs.get(jobId);
      
      if (job && job.job) {
        job.job.stop();
      }
      
      this.jobs.delete(jobId);
      this.updateStats();
      
      console.log(`Unregistered workflow schedule: ${scheduleId}`);
    } catch (error) {
      console.error('Failed to unregister workflow schedule:', error);
      throw error;
    }
  }
  
  public async loadWorkflowSchedules(): Promise<void> {
    try {
      const schedules = await storage.getSchedules();
      
      for (const schedule of schedules) {
        if (schedule.isActive) {
          await this.registerWorkflowSchedule(schedule);
        }
      }
      
      console.log(`Loaded ${schedules.filter(s => s.isActive).length} active workflow schedules`);
    } catch (error) {
      console.error('Failed to load workflow schedules:', error);
      throw error;
    }
  }
}

export const schedulerService = new SchedulerService();