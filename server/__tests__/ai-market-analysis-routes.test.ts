import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import aiMarketAnalysisRouter from '../routes/ai-market-analysis';
import { aiMarketAnalysisService } from '../services/ai-market-analysis';

// Mock the service
jest.mock('../services/ai-market-analysis');

const mockService = aiMarketAnalysisService as jest.Mocked<typeof aiMarketAnalysisService>;

describe('AI Market Analysis Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ai-market-analysis', aiMarketAnalysisRouter);
    jest.clearAllMocks();
  });

  describe('POST /execute-workflow', () => {
    it('should execute workflow successfully', async () => {
      // Arrange
      const mockResult = {
        newsData: [{ N_TITLE: 'Test News' }],
        marketEvents: [{ eventId: 'event1', eventTitle: 'Test Event' }],
        themeMarkets: [{ trendId: 'theme1', themeTitle: 'Test Theme' }],
        macroMarket: { trendId: 'macro1', title: 'Test Macro' }
      };
      
      mockService.executeFullWorkflow.mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/execute-workflow')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockResult,
        message: 'AI 시황 생성 워크플로우가 성공적으로 실행되었습니다.'
      });
      expect(mockService.executeFullWorkflow).toHaveBeenCalledTimes(1);
    });

    it('should handle workflow execution errors', async () => {
      // Arrange
      const error = new Error('Workflow execution failed');
      mockService.executeFullWorkflow.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/execute-workflow')
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Workflow execution failed',
        message: 'AI 시황 생성 워크플로우 실행 중 오류가 발생했습니다.'
      });
    });
  });

  describe('POST /collect-news', () => {
    it('should collect news data successfully', async () => {
      // Arrange
      const mockNewsData = [
        { N_TITLE: 'Test News 1' },
        { N_TITLE: 'Test News 2' }
      ];
      mockService.collectNewsData.mockResolvedValue(mockNewsData);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/collect-news')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockNewsData,
        message: '뉴스 데이터 수집이 완료되었습니다.'
      });
    });

    it('should handle news collection errors', async () => {
      // Arrange
      const error = new Error('News collection failed');
      mockService.collectNewsData.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/collect-news')
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'News collection failed',
        message: '뉴스 데이터 수집 중 오류가 발생했습니다.'
      });
    });
  });

  describe('POST /extract-events', () => {
    it('should extract events successfully', async () => {
      // Arrange
      const newsData = [{ N_TITLE: 'Test News' }];
      const mockEvents = [{ eventId: 'event1', eventTitle: 'Test Event' }];
      mockService.extractMarketEvents.mockResolvedValue(mockEvents);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/extract-events')
        .send({ newsData })
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockEvents,
        message: '주요이벤트 추출이 완료되었습니다.'
      });
      expect(mockService.extractMarketEvents).toHaveBeenCalledWith(newsData);
    });

    it('should return 400 when newsData is missing', async () => {
      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/extract-events')
        .send({})
        .expect(400);

      // Assert
      expect(response.body).toEqual({
        success: false,
        message: '뉴스 데이터가 필요합니다.'
      });
    });

    it('should handle event extraction errors', async () => {
      // Arrange
      const newsData = [{ N_TITLE: 'Test News' }];
      const error = new Error('Event extraction failed');
      mockService.extractMarketEvents.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/extract-events')
        .send({ newsData })
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Event extraction failed',
        message: '주요이벤트 추출 중 오류가 발생했습니다.'
      });
    });
  });

  describe('POST /generate-themes', () => {
    it('should generate themes successfully', async () => {
      // Arrange
      const mockThemes = [
        { trendId: 'theme1', themeTitle: 'Test Theme 1' },
        { trendId: 'theme2', themeTitle: 'Test Theme 2' }
      ];
      mockService.generateThemeMarket.mockResolvedValue(mockThemes);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/generate-themes')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockThemes,
        message: '테마 시황 생성이 완료되었습니다.'
      });
    });

    it('should handle theme generation errors', async () => {
      // Arrange
      const error = new Error('Theme generation failed');
      mockService.generateThemeMarket.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/generate-themes')
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Theme generation failed',
        message: '테마 시황 생성 중 오류가 발생했습니다.'
      });
    });
  });

  describe('POST /generate-macro', () => {
    it('should generate macro market successfully', async () => {
      // Arrange
      const mockMacro = {
        trendId: 'macro1',
        baseDate: '20250101',
        baseTime: '090000',
        title: 'Test Macro',
        content: 'Test Content',
        ingestTs: new Date()
      };
      mockService.generateMacroMarket.mockResolvedValue(mockMacro);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/generate-macro')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockMacro,
        message: '매크로 시황 생성이 완료되었습니다.'
      });
    });

    it('should handle macro generation errors', async () => {
      // Arrange
      const error = new Error('Macro generation failed');
      mockService.generateMacroMarket.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post('/api/ai-market-analysis/generate-macro')
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Macro generation failed',
        message: '매크로 시황 생성 중 오류가 발생했습니다.'
      });
    });
  });

  describe('GET /workflow-status', () => {
    it('should return workflow status', async () => {
      // Act
      const response = await request(app)
        .get('/api/ai-market-analysis/workflow-status')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'ready',
          lastExecution: null,
          nextExecution: null
        },
        message: '워크플로우 상태를 조회했습니다.'
      });
    });
  });
});
