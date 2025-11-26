import OpenAI from "openai";
import { AzureConfigService } from "./azure-config.js";
import fetch from "node-fetch";

// Interface for AI API responses
export interface AIApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  model?: string;
  provider?: string;
  responseTime?: number;
}

// Interface for AI API test request
export interface AIApiTestRequest {
  provider: string;
  model?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  apiKey?: string;
  apiUrl?: string;
  systemPrompt?: string;
  preprocessPrompt?: string;
  postprocessPrompt?: string;
}

export class AIApiService {
  /**
   * Azure OpenAI (via APIM or direct endpoint) - Chat Completions
   * Uses envs provided through Azure App Service (PTU)
   */
  static async callAzureOpenAIChat(request: AIApiTestRequest): Promise<AIApiResponse> {
    const startTime = Date.now();
    try {
      const cfg = AzureConfigService.getOpenAIPTUConfig();
      if (!cfg.endpoint || !cfg.apiKey || !cfg.deploymentName || !cfg.apiVersion) {
        return {
          success: false,
          error: "Azure OpenAI PTU configuration is incomplete",
          responseTime: Date.now() - startTime,
          provider: "AzureOpenAI"
        };
      }

      // Inject current KST date/time into system prompt by default
      const kstNow = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).format(new Date());
      const dateLine = `오늘 날짜와 시간(KST): ${kstNow}`;
      const systemWithDate = request.systemPrompt
        ? `${request.systemPrompt}\n\n${dateLine}`
        : `당신은 도움이 되는 어시스턴트입니다.\n${dateLine}`;

      // Build messages
      const messages: any[] = [];
      messages.push({ role: "system", content: systemWithDate });
      messages.push({ role: "user", content: request.prompt });

      // Endpoint format: {endpoint}/deployments/{deployment}/chat/completions?api-version=...
      const url = `${cfg.endpoint.replace(/\/$/, "")}/deployments/${cfg.deploymentName}/chat/completions?api-version=${cfg.apiVersion}`;

      const body = {
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000,
        // model param is ignored by Azure; deployment governs the model
      } as any;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": cfg.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          success: false,
          error: text || `Azure OpenAI request failed: ${res.status}`,
          responseTime: Date.now() - startTime,
          provider: "AzureOpenAI",
        };
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      return {
        success: true,
        data: { content, model: cfg.modelName || cfg.deploymentName, finishReason: data?.choices?.[0]?.finish_reason },
        usage: {
          promptTokens: data?.usage?.prompt_tokens,
          completionTokens: data?.usage?.completion_tokens,
          totalTokens: data?.usage?.total_tokens,
        },
        model: cfg.modelName || cfg.deploymentName,
        provider: "AzureOpenAI",
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Azure OpenAI call failed",
        responseTime: Date.now() - startTime,
        provider: "AzureOpenAI",
      };
    }
  }
  
  // OpenAI API call
  static async callOpenAI(request: AIApiTestRequest): Promise<AIApiResponse> {
    const startTime = Date.now();
    
    try {
      const apiKey = request.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'default_key') {
        return {
          success: false,
          error: 'OpenAI API key not found or invalid',
          responseTime: Date.now() - startTime
        };
      }

      const openai = new OpenAI({ apiKey });
      
      // Apply preprocessing if provided
      let processedPrompt = request.prompt;
      if (request.preprocessPrompt) {
        processedPrompt = request.preprocessPrompt.replace('{{input}}', processedPrompt);
      }

      const messages: any[] = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: processedPrompt });

      const completionParams: any = {
        model: request.model || 'gpt-3.5-turbo',
        messages,
      };
      
      // Use appropriate token parameter based on model
      if (request.model === 'gpt-5') {
        completionParams.max_completion_tokens = request.maxTokens || 1000;
        // gpt-5 doesn't support temperature parameter
      } else {
        completionParams.max_tokens = request.maxTokens || 1000;
        completionParams.temperature = request.temperature || 0.7;
      }

      const response = await openai.chat.completions.create(completionParams);

      let content = response.choices[0].message.content || '';
      
      // Apply postprocessing if provided
      if (request.postprocessPrompt && content) {
        const postprocessMessages = [
          { role: 'system', content: 'You are a helpful assistant that formats responses according to instructions.' },
          { role: 'user', content: request.postprocessPrompt.replace('{{output}}', content) }
        ];
        
        const postprocessResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: postprocessMessages,
          max_tokens: request.maxTokens || 1000,
          temperature: 0.7,
        });
        
        content = postprocessResponse.choices[0].message.content || content;
      }

      return {
        success: true,
        data: {
          content,
          model: response.model,
          finishReason: response.choices[0].finish_reason
        },
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens
        },
        model: response.model,
        provider: 'OpenAI',
        responseTime: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'OpenAI API call failed',
        responseTime: Date.now() - startTime,
        provider: 'OpenAI'
      };
    }
  }

  // Anthropic Claude API call
  static async callClaude(request: AIApiTestRequest): Promise<AIApiResponse> {
    const startTime = Date.now();
    
    try {
      const apiKey = request.apiKey || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
      if (!apiKey || apiKey === 'default_key') {
        return {
          success: false,
          error: 'Claude API key not found or invalid',
          responseTime: Date.now() - startTime
        };
      }

      // Apply preprocessing if provided
      let processedPrompt = request.prompt;
      if (request.preprocessPrompt) {
        processedPrompt = request.preprocessPrompt.replace('{{input}}', processedPrompt);
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };

      const body = {
        model: request.model || 'claude-3-haiku-20240307',
        max_tokens: request.maxTokens || 1000,
        messages: [
          {
            role: 'user',
            content: processedPrompt
          }
        ]
      };

      if (request.systemPrompt) {
        body['system'] = request.systemPrompt;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `Claude API error: ${errorData.error?.message || response.statusText}`,
          responseTime: Date.now() - startTime,
          provider: 'Anthropic'
        };
      }

      const data = await response.json();
      let content = data.content[0].text || '';

      // Apply postprocessing if provided
      if (request.postprocessPrompt && content) {
        const postprocessBody = {
          model: 'claude-3-haiku-20240307',
          max_tokens: request.maxTokens || 1000,
          messages: [
            {
              role: 'user',
              content: request.postprocessPrompt.replace('{{output}}', content)
            }
          ]
        };

        const postprocessResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify(postprocessBody)
        });

        if (postprocessResponse.ok) {
          const postprocessData = await postprocessResponse.json();
          content = postprocessData.content[0].text || content;
        }
      }

      return {
        success: true,
        data: {
          content,
          model: data.model,
          stopReason: data.stop_reason
        },
        usage: {
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        model: data.model,
        provider: 'Anthropic',
        responseTime: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Claude API call failed',
        responseTime: Date.now() - startTime,
        provider: 'Anthropic'
      };
    }
  }

  // Google Gemini API call
  static async callGemini(request: AIApiTestRequest): Promise<AIApiResponse> {
    const startTime = Date.now();
    
    try {
      const apiKey = request.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'default_key') {
        return {
          success: false,
          error: 'Gemini API key not found or invalid',
          responseTime: Date.now() - startTime
        };
      }

      // Apply preprocessing if provided
      let processedPrompt = request.prompt;
      if (request.preprocessPrompt) {
        processedPrompt = request.preprocessPrompt.replace('{{input}}', processedPrompt);
      }

      const model = request.model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const body = {
        contents: [
          {
            parts: [
              {
                text: request.systemPrompt 
                  ? `${request.systemPrompt}\n\nUser: ${processedPrompt}` 
                  : processedPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 1000,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `Gemini API error: ${errorData.error?.message || response.statusText}`,
          responseTime: Date.now() - startTime,
          provider: 'Google'
        };
      }

      const data = await response.json();
      let content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Apply postprocessing if provided
      if (request.postprocessPrompt && content) {
        const postprocessBody = {
          contents: [
            {
              parts: [
                {
                  text: request.postprocessPrompt.replace('{{output}}', content)
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: request.maxTokens || 1000,
          }
        };

        const postprocessResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postprocessBody)
        });

        if (postprocessResponse.ok) {
          const postprocessData = await postprocessResponse.json();
          content = postprocessData.candidates?.[0]?.content?.parts?.[0]?.text || content;
        }
      }

      return {
        success: true,
        data: {
          content,
          finishReason: data.candidates?.[0]?.finishReason
        },
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount,
          completionTokens: data.usageMetadata?.candidatesTokenCount,
          totalTokens: data.usageMetadata?.totalTokenCount
        },
        model: model,
        provider: 'Google',
        responseTime: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Gemini API call failed',
        responseTime: Date.now() - startTime,
        provider: 'Google'
      };
    }
  }

  // Perplexity API call
  static async callPerplexity(request: AIApiTestRequest): Promise<AIApiResponse> {
    const startTime = Date.now();
    
    try {
      const apiKey = request.apiKey || process.env.PERPLEXITY_API_KEY;
      if (!apiKey || apiKey === 'default_key') {
        return {
          success: false,
          error: 'Perplexity API key not found or invalid',
          responseTime: Date.now() - startTime
        };
      }

      // Apply preprocessing if provided
      let processedPrompt = request.prompt;
      if (request.preprocessPrompt) {
        processedPrompt = request.preprocessPrompt.replace('{{input}}', processedPrompt);
      }

      const messages: any[] = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: processedPrompt });

      const body = {
        model: request.model || 'llama-3.1-sonar-small-128k-online',
        messages,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        stream: false
      };

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `Perplexity API error: ${errorData.error?.message || response.statusText}`,
          responseTime: Date.now() - startTime,
          provider: 'Perplexity'
        };
      }

      const data = await response.json();
      let content = data.choices[0].message.content || '';

      // Apply postprocessing if provided (simplified for Perplexity)
      if (request.postprocessPrompt && content) {
        // For postprocessing, we'll just do simple string replacement for now
        content = request.postprocessPrompt.replace('{{output}}', content);
      }

      return {
        success: true,
        data: {
          content,
          model: data.model,
          finishReason: data.choices[0].finish_reason
        },
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens
        },
        model: data.model,
        provider: 'Perplexity',
        responseTime: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Perplexity API call failed',
        responseTime: Date.now() - startTime,
        provider: 'Perplexity'
      };
    }
  }

  // Generic API caller - routes to appropriate service
  static async callAI(request: AIApiTestRequest): Promise<AIApiResponse> {
    const provider = request.provider.toLowerCase();
    
    try {
      if (provider.includes('openai') || provider.includes('gpt')) {
        return await this.callOpenAI(request);
      } else if (provider.includes('claude') || provider.includes('anthropic')) {
        return await this.callClaude(request);
      } else if (provider.includes('gemini') || provider.includes('google')) {
        return await this.callGemini(request);
      } else if (provider.includes('perplexity')) {
        return await this.callPerplexity(request);
      } else {
        return {
          success: false,
          error: `Unsupported AI provider: ${request.provider}`,
          provider: request.provider,
          responseTime: 0
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'AI API call failed',
        provider: request.provider,
        responseTime: 0
      };
    }
  }

  // Calculate estimated cost based on usage and pricing
  static calculateCost(response: AIApiResponse, inputCostPer1K: number = 0.001, outputCostPer1K: number = 0.002): number {
    if (!response.usage) return 0;
    
    const inputCost = (response.usage.promptTokens || 0) / 1000 * inputCostPer1K;
    const outputCost = (response.usage.completionTokens || 0) / 1000 * outputCostPer1K;
    
    return inputCost + outputCost;
  }

  // Validate API configuration
  static validateApiConfig(provider: string, apiKey?: string): { isValid: boolean; message: string } {
    if (!apiKey) {
      return { isValid: false, message: `API key required for ${provider}` };
    }
    
    const providerLower = provider.toLowerCase();
    
    if (providerLower.includes('openai') || providerLower.includes('gpt')) {
      if (!apiKey.startsWith('sk-')) {
        return { isValid: false, message: 'OpenAI API key should start with "sk-"' };
      }
    } else if (providerLower.includes('claude') || providerLower.includes('anthropic')) {
      if (apiKey.length < 20) {
        return { isValid: false, message: 'Anthropic API key appears too short' };
      }
    }
    
    return { isValid: true, message: 'API configuration looks valid' };
  }
}

export default AIApiService;