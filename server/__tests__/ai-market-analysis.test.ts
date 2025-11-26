import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AIMarketAnalysisService } from '../services/ai-market-analysis';
import { getAzureDatabricksService } from '../services/azure-databricks';
import { activityLogger } from '../services/activity-logger';

// Mock dependencies
jest.mock('../services/azure-databricks');
jest.mock('../services/activity-logger');

const mockDatabricksService = {
  executeQuery: jest.fn()
};

const mockActivityLogger = {
  logActivity: jest.fn()
};

describe('AIMarketAnalysisService', () => {
  let service: AIMarketAnalysisService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    (getAzureDatabricksService as jest.Mock).mockReturnValue(mockDatabricksService);
    (activityLogger.logActivity as jest.Mock).mockImplementation(mockActivityLogger.logActivity);
    
    service = new AIMarketAnalysisService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('collectNewsData', () => {
    it('should collect news data successfully', async () => {
      // Arrange
      const mockNewsData = [
        {
          N_ID: 'news1',
          N_TITLE: 'Test News 1',
          N_CONTENT: 'Test Content 1',
          N_CODE: '005930',
          N_DATE: '20250101',
          N_TIME: '090000',
          GPT01_AD_POST_SCORE: 50,
          GPT04_CONTENT_QUALITY_SCORE: 80,
          GPT02_ECO_POST_SCORE: 70,
          GPT03_MARKET_POST_SCORE: 60
        }
      ];
      
      mockDatabricksService.executeQuery.mockResolvedValue(mockNewsData);

      // Act
      const result = await service.collectNewsData();

      // Assert
      expect(result).toEqual(mockNewsData);
      expect(mockDatabricksService.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
      expect(mockActivityLogger.logActivity).toHaveBeenCalledWith(
        'AI_MARKET_ANALYSIS',
        'collect_news_data',
        'START'
      );
      expect(mockActivityLogger.logActivity).toHaveBeenCalledWith(
        'AI_MARKET_ANALYSIS',
        'collect_news_data',
        'SUCCESS',
        { count: 1 }
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockDatabricksService.executeQuery.mockRejectedValue(error);

      // Act & Assert
      await expect(service.collectNewsData()).rejects.toThrow('Database connection failed');
      expect(mockActivityLogger.logActivity).toHaveBeenCalledWith(
        'AI_MARKET_ANALYSIS',
        'collect_news_data',
        'ERROR',
        { error: 'Database connection failed' }
      );
    });
  });

  describe('extractMarketEvents', () => {
    it('should extract market events successfully', async () => {
      // Arrange
      const newsData = [
        { N_TITLE: 'Test News 1' },
        { N_TITLE: 'Test News 2' }
      ];

      // Act
      const result = await service.extractMarketEvents(newsData);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(mockActivityLogger.logActivity).toHaveBeenCalledWith(
        'AI_MARKET_ANALYSIS',
        'extract_market_events',
        'START'
      );
    });

    it('should handle empty news data', async () => {
      // Arrange
      const newsData: any[] = [];

      // Act
      const result = await service.extractMarketEvents(newsData);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('generateThemeMarket', () => {
    it('should generate theme market data', async () => {
      // Arrange
      mockDatabricksService.executeQuery.mockResolvedValue([
        { IFS_TMA_CD: 'theme1', IFS_TMA_NM: 'Test Theme' }
      ]);

      // Act
      const result = await service.generateThemeMarket();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(mockActivityLogger.logActivity).toHaveBeenCalledWith(
        'AI_MARKET_ANALYSIS',
        'generate_theme_market',
        'START'
      );
    });
  });

  describe('generateMacroMarket', () => {
    it('should generate macro market data', async () => {
      // Arrange
      mockDatabricksService.executeQuery.mockResolvedValue([]);

      // Act
      const result = await service.generateMacroMarket();

      // Assert
      expect(result).toHaveProperty('trendId');
      expect(result).toHaveProperty('baseDate');
      expect(result).toHaveProperty('baseTime');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(mockActivityLogger.logActivity).toHaveBeenCalledWith(
        'AI_MARKET_ANALYSIS',
        'generate_macro_market',
        'START'
      );
    });
  });

  describe('executeFullWorkflow', () => {
    it('should execute full workflow successfully', async () => {
      // Arrange
      const mockNewsData = [{ N_TITLE: 'Test News' }];
      const mockEvents = [{ eventId: 'event1', eventTitle: 'Test Event' }];
      const mockThemes = [{ trendId: 'theme1', themeTitle: 'Test Theme' }];
      const mockMacro = { trendId: 'macro1', title: 'Test Macro' };

      jest.spyOn(service, 'collectNewsData').mockResolvedValue(mockNewsData);
      jest.spyOn(service, 'extractMarketEvents').mockResolvedValue(mockEvents);
      jest.spyOn(service, 'generateThemeMarket').mockResolvedValue(mockThemes);
      jest.spyOn(service, 'generateMacroMarket').mockResolvedValue(mockMacro);

      // Act
      const result = await service.executeFullWorkflow();

      // Assert
      expect(result).toEqual({
        newsData: mockNewsData,
        marketEvents: mockEvents,
        themeMarkets: mockThemes,
        macroMarket: mockMacro
      });
      expect(mockActivityLogger.logActivity).toHaveBeenCalledWith(
        'AI_MARKET_ANALYSIS',
        'execute_full_workflow',
        'START'
      );
      expect(mockActivityLogger.logActivity).toHaveBeenCalledWith(
        'AI_MARKET_ANALYSIS',
        'execute_full_workflow',
        'SUCCESS'
      );
    });

    it('should handle workflow execution errors', async () => {
      // Arrange
      const error = new Error('Workflow execution failed');
      jest.spyOn(service, 'collectNewsData').mockRejectedValue(error);

      // Act & Assert
      await expect(service.executeFullWorkflow()).rejects.toThrow('Workflow execution failed');
      expect(mockActivityLogger.logActivity).toHaveBeenCalledWith(
        'AI_MARKET_ANALYSIS',
        'execute_full_workflow',
        'ERROR',
        { error: 'Workflow execution failed' }
      );
    });
  });
});
