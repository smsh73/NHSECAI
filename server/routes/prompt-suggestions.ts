import { Router, Request, Response } from 'express';
import { PromptInferenceService } from '../services/prompt-inference.js';

const router = Router();

// POST /api/prompt-suggestions - Get intelligent prompt suggestions
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      currentInput, 
      conversationHistory = [], 
      userPreferences = {},
      availableData = [],
      currentPage = ''
    } = req.body;

    // Validate input
    if (!currentInput || typeof currentInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'currentInput is required and must be a string'
      });
    }

    if (currentInput.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'currentInput too long (max 500 characters)'
      });
    }

    // Build inference context
    const context = {
      currentInput: currentInput.trim(),
      conversationHistory: Array.isArray(conversationHistory) 
        ? conversationHistory.slice(-10) // Keep last 10 messages
        : [],
      userPreferences,
      availableData: Array.isArray(availableData) ? availableData : [],
      currentPage
    };

    // Generate suggestions using the inference service
    const suggestions = PromptInferenceService.analyzeInput(context);

    // Extract intent for additional context
    const intent = PromptInferenceService.extractIntent(currentInput);

    // Generate real-time suggestions if input is partial
    const realtimeSuggestions = currentInput.length >= 2 
      ? PromptInferenceService.generateRealTimeSuggestions(currentInput, context)
      : [];

    // Combine and deduplicate suggestions
    const allSuggestions = [...suggestions, ...realtimeSuggestions];
    const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.text === suggestion.text)
    );

    // Limit results based on user preferences
    const maxSuggestions = userPreferences.maxSuggestions || 6;
    const finalSuggestions = uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);

    res.json({
      success: true,
      suggestions: finalSuggestions,
      metadata: {
        intent: intent.intent,
        entities: intent.entities,
        confidence: intent.confidence,
        totalSuggestions: allSuggestions.length,
        filteredSuggestions: finalSuggestions.length,
        processingTime: Date.now()
      }
    });

  } catch (error: any) {
    console.error('Prompt suggestions API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/prompt-suggestions/templates - Get available prompt templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, tags } = req.query;

    // This would typically fetch from a database
    // For now, return static templates based on the inference service
    const templates = [
      {
        id: 'market-analysis',
        name: '시장 분석',
        description: '최신 시장 동향과 분석 제공',
        category: 'analysis',
        template: '최근 {{timeframe}}의 {{market}} 시장 동향을 분석해주세요.',
        variables: [
          { name: 'timeframe', type: 'string', description: '분석 기간', required: true },
          { name: 'market', type: 'string', description: '시장 유형', required: true }
        ]
      },
      {
        id: 'etf-recommendation',
        name: 'ETF 추천',
        description: '맞춤형 ETF 투자 추천',
        category: 'recommendation',
        template: '{{riskLevel}} 투자자를 위한 {{sector}} 섹터 ETF를 추천해주세요.',
        variables: [
          { name: 'riskLevel', type: 'string', description: '위험 선호도', required: true },
          { name: 'sector', type: 'string', description: '관심 섹터', required: false }
        ]
      },
      {
        id: 'portfolio-analysis',
        name: '포트폴리오 분석',
        description: '포트폴리오 최적화 방안 제시',
        category: 'analysis',
        template: '현재 포트폴리오를 분석하고 {{goal}} 목표에 맞는 최적화 방안을 제시해주세요.',
        variables: [
          { name: 'goal', type: 'string', description: '투자 목표', required: true }
        ]
      }
    ];

    // Filter templates based on query parameters
    let filteredTemplates = templates;

    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }

    res.json({
      success: true,
      templates: filteredTemplates,
      metadata: {
        total: filteredTemplates.length,
        categories: [...new Set(templates.map(t => t.category))]
      }
    });

  } catch (error: any) {
    console.error('Prompt templates API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/prompt-suggestions/intent - Extract intent from user input
router.post('/intent', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'input is required and must be a string'
      });
    }

    const intent = PromptInferenceService.extractIntent(input);

    res.json({
      success: true,
      intent
    });

  } catch (error: any) {
    console.error('Intent extraction API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;