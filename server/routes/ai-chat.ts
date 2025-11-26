import { Router, Request, Response } from 'express';
import { AIApiService } from '../services/ai-api.js';
import { websocketService } from '../services/websocket.js';
import { nanoid } from 'nanoid';
import { storage } from '../storage.js';
import { azureConfigService } from '../services/azure-config.js';
import { ragSearchService } from '../services/rag-search-service.js';

// Get configured chat model name
function getChatModelName(): string {
  const ptuConfig = azureConfigService.getOpenAIPTUConfig();
  return ptuConfig.modelName || 'gpt-4.1';
}

const router = Router();

// Active chat sessions
const activeSessions = new Map();

// Financial chatbot tools
const chatTools = {
  async getTermDefinition(term: string) {
    try {
      const entries = await storage.getDictionaryEntries();
      const termEntry = entries.find(entry => 
        (entry.meaningKo?.toLowerCase() || '').includes(term.toLowerCase()) ||
        (entry.meaningEn?.toLowerCase() || '').includes(term.toLowerCase()) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
      );
      
      if (termEntry) {
        return {
          term: termEntry.meaningKo,
          definition: termEntry.meaningEn,
          table: termEntry.tableName,
          column: termEntry.columnName,
          notes: termEntry.notes,
          tags: termEntry.tags
        };
      }
      return { error: '해당 용어를 찾을 수 없습니다.' };
    } catch (error) {
      return { error: '용어 검색 중 오류가 발생했습니다.' };
    }
  },

  async getLatestQuote(symbol: string, limit = 10) {
    try {
      const schemaInfo = await storage.getSchemaInfo();
      // For demo purposes, return mock data structure
      return {
        symbol,
        data: `최근 ${limit}개 ${symbol} 시세 데이터`,
        note: '실제 데이터는 financial_data 테이블에서 조회됩니다.'
      };
    } catch (error) {
      return { error: '시세 조회 중 오류가 발생했습니다.' };
    }
  },

  async getLatestNews(symbol?: string, limit = 5) {
    try {
      // For demo purposes, return mock news structure
      return {
        symbol: symbol || 'general',
        count: limit,
        data: `최근 ${limit}개 ${symbol ? symbol + ' 관련' : ''} 뉴스`,
        note: '실제 데이터는 news_data 테이블에서 조회됩니다.'
      };
    } catch (error) {
      return { error: '뉴스 조회 중 오류가 발생했습니다.' };
    }
  },

  async searchDocuments(query: string, topK = 5, indexName = 'default-index') {
    try {
      // RAG 검색 서비스를 사용하여 실제 검색 수행
      const searchResult = await ragSearchService.search({
        query,
        indexName,
        topK,
        searchMode: 'hybrid', // 하이브리드 검색 (벡터 + 키워드)
      });

      if (searchResult.results && searchResult.results.length > 0) {
        return {
          query,
          results: searchResult.results.map((result: any) => ({
            id: result.id,
            content: result.content,
            score: result.score,
            metadata: result.metadata,
            highlights: result.highlights,
          })),
          totalCount: searchResult.totalCount || searchResult.results.length,
          note: 'RAG 검색 결과입니다.'
        };
      } else {
        return {
          query,
          results: [],
          totalCount: 0,
          note: '검색 결과가 없습니다.'
        };
      }
    } catch (error: any) {
      console.error('RAG 검색 오류:', error);
      // RAG 검색 실패 시 빈 결과 반환 (챗봇은 계속 동작)
      return {
        query,
        results: [],
        totalCount: 0,
        error: error.message || '문서 검색 중 오류가 발생했습니다.'
      };
    }
  }
};

// POST /api/ai-chat/session - Create new chat session with streaming
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { message, sessionId: existingSessionId, userId, context = 'financial', model = getChatModelName(), stream = false } = req.body;
    
    // Use existing session or create new one
    let sessionId = existingSessionId;
    let session = existingSessionId ? activeSessions.get(existingSessionId) : null;
    
    if (!session) {
      sessionId = nanoid();
      session = {
        id: sessionId,
        userId: userId || null,
        messages: [],
        context,
        model,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      activeSessions.set(sessionId, session);
    }
    
    if (!message || typeof message !== 'string' || message.length < 1 || message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message must be 1-2000 characters'
      });
    }

    // Add user message to session
    const userMessage = { 
      id: `user-${Date.now()}`, 
      role: 'user', 
      content: message, 
      timestamp: new Date() 
    };
    session.messages.push(userMessage);
    session.updatedAt = new Date();
    
    // TODO: Save user message to database if userId provided
    // if (session.userId) {
    //   await storage.createChatMessage({
    //     sessionId: session.id,
    //     role: 'user',
    //     content: message,
    //     timestamp: new Date()
    //   });
    // }

    // Enhanced financial system prompt
    const financialSystemPrompt = `당신은 NHQV 금융 AI 어시스턴트입니다. 다음 지침을 따라주세요:

## 역할과 책임
- 금융 시장 분석, 투자 정보, 시장 용어 설명을 제공합니다
- 정확하고 객관적인 정보만 제공하며, 개인 투자 조언은 하지 않습니다
- 불확실한 정보는 명확히 표시하고, 항상 면책조항을 포함합니다

## 사용 가능한 도구들
1. getTermDefinition(term): 금융 용어 정의 검색
2. getLatestQuote(symbol): 주식 시세 조회
3. getLatestNews(symbol): 관련 뉴스 검색
4. searchDocuments(query): 문서 검색

## 응답 형식
- 한국어로 응답하되, 필요시 영어 용어도 병기
- 마크다운 형식 사용 가능
- 표와 목록으로 정보를 정리하여 제공
- 출처와 면책조항을 명시

## 면책조항
모든 투자 정보는 참고용이며, 투자 결정은 개인의 책임입니다.`;

    // Process message with tools if needed
    let enhancedMessage = message;
    let toolResults = [];
    
    // Improved tool detection: Extract terms from questions
    // Match patterns like "PER뜻은", "PER 뜻", "PER의미", "PER 정의", "PER이 뭐야", "PER은 뭐야"
    const termPattern = /([A-Z]{2,}|[가-힣]+)\s*(뜻|의미|정의|이\s*뭐|은\s*뭐|를\s*알려|에\s*대해|에\s*관해|를\s*설명)/i;
    const termMatch = message.match(termPattern);
    
    if (termMatch) {
      const term = termMatch[1].trim();
      if (term && term.length >= 2) {
        try {
          const result = await chatTools.getTermDefinition(term);
          if (result && !result.error) {
            toolResults.push({ tool: 'getTermDefinition', input: term, result });
          }
        } catch (error) {
          console.error('Error getting term definition:', error);
        }
      }
    }
    
    // Also check for common financial terms
    const commonTerms = ['PER', 'PBR', 'ROE', 'EPS', '배당', '주가', '시가총액', '거래량', '시세', '종목'];
    for (const term of commonTerms) {
      if (message.includes(term) && !toolResults.some(tr => tr.input === term)) {
        try {
          const result = await chatTools.getTermDefinition(term);
          if (result && !result.error) {
            toolResults.push({ tool: 'getTermDefinition', input: term, result });
            break; // Only use first match
          }
        } catch (error) {
          console.error('Error getting term definition:', error);
        }
      }
    }
    
    if (message.includes('시세') || message.includes('주가')) {
      const result = await chatTools.getLatestQuote('삼성전자');
      toolResults.push({ tool: 'getLatestQuote', input: '삼성전자', result });
    }
    
    if (message.includes('뉴스') || message.includes('소식')) {
      const result = await chatTools.getLatestNews();
      toolResults.push({ tool: 'getLatestNews', input: 'general', result });
    }

    // RAG 검색 수행 (활성화된 경우)
    if (enableRAG) {
      try {
        // 질문이 데이터 조회나 검색 관련인지 확인
        const searchKeywords = ['검색', '조회', '찾아', '알려', '정보', '데이터', '분석', '시황', '시세', '종목', '테마'];
        const shouldSearch = searchKeywords.some(keyword => message.includes(keyword)) || 
                            message.length > 10; // 긴 질문은 검색 수행
        
        if (shouldSearch) {
          const ragResult = await chatTools.searchDocuments(message, maxSearchResults, searchIndexName);
          if (ragResult && !ragResult.error && ragResult.results && ragResult.results.length > 0) {
            toolResults.push({ 
              tool: 'searchDocuments', 
              input: message, 
              result: ragResult,
              ragSearch: true // RAG 검색 결과임을 표시
            });
          }
        }
      } catch (error) {
        console.error('RAG 검색 오류:', error);
        // RAG 검색 실패해도 챗봇은 계속 동작
      }
    }

    // Add tool context to message in a natural format
    if (toolResults.length > 0) {
      enhancedMessage += '\n\n=== 검색된 정보 ===\n';
      toolResults.forEach(tool => {
        if (tool.tool === 'getTermDefinition' && tool.result && !tool.result.error) {
          const result = tool.result;
          enhancedMessage += `\n용어: ${result.term || tool.input}\n`;
          if (result.definition) enhancedMessage += `정의: ${result.definition}\n`;
          if (result.table) enhancedMessage += `테이블: ${result.table}\n`;
          if (result.column) enhancedMessage += `컬럼: ${result.column}\n`;
          if (result.notes) enhancedMessage += `참고: ${result.notes}\n`;
          if (result.tags && result.tags.length > 0) enhancedMessage += `태그: ${result.tags.join(', ')}\n`;
        } else if (tool.tool === 'searchDocuments' && tool.ragSearch && tool.result && tool.result.results) {
          // RAG 검색 결과 포맷팅
          enhancedMessage += `\n[RAG 검색 결과: ${tool.result.totalCount || 0}건]\n`;
          tool.result.results.forEach((result: any, index: number) => {
            enhancedMessage += `\n${index + 1}. [관련도: ${(result.score * 100).toFixed(1)}%]\n`;
            enhancedMessage += `내용: ${result.content}\n`;
            if (result.metadata) {
              const metadataStr = Object.entries(result.metadata)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
              if (metadataStr) enhancedMessage += `메타데이터: ${metadataStr}\n`;
            }
            if (result.highlights) {
              const highlights = Object.values(result.highlights).flat().join(' ... ');
              if (highlights) enhancedMessage += `하이라이트: ${highlights}\n`;
            }
          });
        } else {
          enhancedMessage += `\n${tool.tool}(${tool.input}): ${JSON.stringify(tool.result, null, 2)}\n`;
        }
      });
      enhancedMessage += '\n위 정보를 바탕으로 사용자 질문에 자연스럽게 답변해주세요. 도구 결과를 그대로 보여주지 말고, 자연스러운 한국어 문장으로 설명해주세요. RAG 검색 결과가 있으면 해당 정보를 우선적으로 참고하여 정확하고 상세한 답변을 제공해주세요.\n';
    }

    // Call Azure OpenAI when configured (APIM/PTU), fallback to OpenAI public
    const azureCfg = azureConfigService.getOpenAIPTUConfig();
    const useAzure = !!(azureCfg.endpoint && azureCfg.apiKey);
    const safeModel = model; // configured model name
    const aiResponse = useAzure
      ? await AIApiService.callAzureOpenAIChat({
          provider: 'AzureOpenAI',
          model: safeModel,
          prompt: enhancedMessage,
          systemPrompt: financialSystemPrompt,
          maxTokens: 1500,
        })
      : await AIApiService.callOpenAI({
          provider: 'OpenAI',
          model: safeModel,
          prompt: enhancedMessage,
          systemPrompt: financialSystemPrompt,
          maxTokens: 1500,
        });

    if (!aiResponse.success) {
      return res.status(500).json({
        success: false,
        error: aiResponse.error || 'AI API call failed'
      });
    }

    // Add assistant response to session
    if (session) {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse.data?.content || '',
        timestamp: new Date(),
        tools: toolResults
      };
      session.messages.push(assistantMessage);
      session.updatedAt = new Date();
      
      // TODO: Save assistant message to database if userId provided
      // if (session.userId) {
      //   await storage.createChatMessage({
      //     sessionId: session.id,
      //     role: 'assistant',
      //     content: aiResponse.data?.content || '',
      //     timestamp: new Date(),
      //     metadata: { tools: toolResults }
      //   });
      // }
    }
    
    // Broadcast user message via WebSocket
    websocketService.broadcast({
      type: 'chat_message',
      data: {
        id: userMessage.id,
        sessionId: session.id,
        role: 'user',
        content: message,
        timestamp: userMessage.timestamp
      },
      timestamp: Date.now()
    });

    // RAG 검색 결과 추출
    const ragSearchResults = toolResults
      .filter(tool => tool.ragSearch && tool.result && tool.result.results)
      .map(tool => tool.result.results)
      .flat();

    // Broadcast via WebSocket for real-time updates
    websocketService.broadcast({
      type: 'chat_message',
      data: {
        sessionId,
        role: 'assistant',
        content: aiResponse.data?.content || '',
        tools: toolResults,
        searchResults: ragSearchResults.length > 0 ? ragSearchResults : undefined
      },
      timestamp: Date.now()
    });

    res.json({
      success: true,
      sessionId: session.id,
      content: aiResponse.data?.content || '',
      model: aiResponse.model,
      usage: aiResponse.usage,
      responseTime: aiResponse.responseTime,
      tools: toolResults,
      searchResults: ragSearchResults.length > 0 ? ragSearchResults : undefined, // RAG 검색 결과 포함
      session: {
        id: session.id,
        userId: session.userId,
        context: session.context,
        model: session.model,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Financial Chat API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/ai-chat/session/:sessionId - Get chat session
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }
  
  res.json({
    success: true,
    session
  });
});

// POST /api/ai-chat - Send message to AI assistant (legacy endpoint)
router.post('/', async (req: Request, res: Response) => {
    try {
      // Simple validation
      const { content, context = 'general', model = getChatModelName() } = req.body;
      
      if (!content || typeof content !== 'string' || content.length < 1 || content.length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Content must be 1-2000 characters'
        });
      }
      
      if (context && typeof context !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Context must be a string'
        });
      }

      // Define system prompts based on context
      const systemPrompts = {
        home_assistant: `당신은 NHQV AI 시황생성 플랫폼의 전문 어시스턴트입니다. 
사용자의 금융 시장 분석, 데이터 조회, 워크플로우 관리 등의 요청에 도움을 드립니다.
다음 지침을 따라 응답해주세요:

1. 한국어로 정확하고 전문적인 답변을 제공하세요
2. 금융 데이터나 시장 분석 요청시 구체적이고 실용적인 정보를 제공하세요  
3. 워크플로우나 시스템 관련 질문에는 명확한 단계별 안내를 제공하세요
4. 불확실한 정보에 대해서는 정확하게 명시하세요
5. 사용자의 질문이 플랫폼 기능과 관련이 없다면 정중하게 안내하세요`,
        
        financial: `당신은 NHQV 금융 AI 어시스턴트입니다. 다음 지침을 따라주세요:

## 역할과 책임
- 금융 시장 분석, 투자 정보, 시장 용어 설명을 제공합니다
- 정확하고 객관적인 정보만 제공하며, 개인 투자 조언은 하지 않습니다
- 불확실한 정보는 명확히 표시하고, 항상 면책조항을 포함합니다

## 응답 형식
- 한국어로 응답하되, 필요시 영어 용어도 병기
- 마크다운 형식 사용 가능
- 표와 목록으로 정보를 정리하여 제공
- 출처와 면책조항을 명시

## 면책조항
모든 투자 정보는 참고용이며, 투자 결정은 개인의 책임입니다.`,
        
        general: `당신은 도움이 되는 AI 어시스턴트입니다. 정확하고 유용한 정보를 제공하세요.`
      };

      const systemPrompt = systemPrompts[context as keyof typeof systemPrompts] || systemPrompts.general;

      // Prefer Azure OpenAI (APIM/PTU) when configured, fallback to OpenAI public
      const azureCfg = azureConfigService.getOpenAIPTUConfig();
      const useAzure = !!(azureCfg.endpoint && azureCfg.apiKey);

      const aiResponse = useAzure
        ? await AIApiService.callAzureOpenAIChat({
            provider: 'AzureOpenAI',
            model,
            prompt: content,
            systemPrompt,
            maxTokens: 1500,
          })
        : await AIApiService.callOpenAI({
            provider: 'OpenAI',
            model,
            prompt: content,
            systemPrompt,
            maxTokens: 1500,
          });

      if (!aiResponse.success) {
        return res.status(500).json({
          success: false,
          error: aiResponse.error || 'AI API call failed'
        });
      }

      res.json({
        success: true,
        content: aiResponse.data?.content || '',
        model: aiResponse.model,
        usage: aiResponse.usage,
        responseTime: aiResponse.responseTime
      });

    } catch (error: any) {
      console.error('AI Chat API Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

export default router;