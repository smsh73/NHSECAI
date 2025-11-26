import { AzureOpenAI } from "openai";
import { getBearerTokenProvider } from "@azure/identity";
import { getAzureAuthService } from "./azure-auth.js";

/**
 * Azure OpenAI Service with Zero Trust Authentication
 *
 * Features:
 * - Zero Trust authentication via Managed Identity or Service Principal
 * - Support for latest embedding models (text-embedding-3-large, text-embedding-3-small)
 * - Automatic token management and rotation
 * - Cost optimization with batch processing
 * - Error handling and retry logic
 */

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey?: string;
  apiVersion?: string;
  isPTU?: boolean;
  isEmbedding?: boolean;

  deploymentName: string;
  embeddingDeploymentName: string;
  maxRetries?: number;
  requestTimeout?: number;
  batchSize?: number;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  dimensions?: number; // For embedding-3 models
  user?: string;
}

export interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ChatRequest {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  user?: string;
}

export class AzureOpenAIService {
  private client: AzureOpenAI | null = null;
  private config: AzureOpenAIConfig;
  private initialized = false;

  constructor(config: AzureOpenAIConfig) {
    this.config = {
      maxRetries: 3,
      requestTimeout: 60000,
      batchSize: 100,
      ...config,
    };
  }

  /**
   * Initialize the Azure OpenAI client with Zero Trust authentication
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.config.isPTU || this.config.isEmbedding) {
        console.log("🔒 Initializing Azure OpenAI PTU mode");

        this.client = new AzureOpenAI({
          apiKey: this.config.apiKey!,
          baseURL: this.config.endpoint,
          deployment: this.config.deploymentName,
          apiVersion: this.config.apiVersion,
        });

        this.initialized = true;
        console.log("✅ Azure OpenAI PTU service initialized successfully");
        return;
      }

      console.log(
        "🔒 Initializing Azure OpenAI with Zero Trust authentication"
      );

      // Create Azure AD token provider for Zero Trust authentication
      const authService = getAzureAuthService();
      const azureConfig = await authService.getAzureOpenAIConfig();
      const scope = "https://cognitiveservices.azure.com/.default";
      const azureADTokenProvider = getBearerTokenProvider(
        azureConfig.credential,
        scope
      );

      this.client = new AzureOpenAI({
        azureADTokenProvider,
        baseURL: azureConfig.endpoint,
        deployment: this.config.deploymentName,
        apiVersion: azureConfig.apiVersion,
      });

      this.initialized = true;
      console.log(
        "✅ Azure OpenAI service with Zero Trust initialized successfully"
      );
    } catch (error) {
      console.error("❌ Failed to initialize Azure OpenAI service:", error);
      throw new Error(`Azure OpenAI initialization failed: ${error}`);
    }
  }

  /**
   * Generate embeddings for text using Azure OpenAI
   * Supports both single text and batch processing
   */
  async generateEmbeddings(
    input: string | string[],
    options: {
      model?: string;
      dimensions?: number;
      batchSize?: number;
    } = {}
  ): Promise<number[][]> {
    await this.initialize();

    const {
      model = this.config.embeddingDeploymentName,
      dimensions,
      batchSize = this.config.batchSize,
    } = options;

    try {
      const inputs = Array.isArray(input) ? input : [input];
      const results: number[][] = [];

      // Process in batches to handle rate limits and large inputs
      for (let i = 0; i < inputs.length; i += batchSize!) {
        const batch = inputs.slice(i, i + batchSize!);

        console.log(
          `🔄 Processing embedding batch ${
            Math.floor(i / batchSize!) + 1
          }/${Math.ceil(inputs.length / batchSize!)} (${batch.length} items)`
        );

        const request: EmbeddingRequest = {
          input: batch,
          model,
          ...(dimensions && { dimensions }),
        };

        const response = await this.retryOperation(async () => {
          return await this.client!.embeddings.create({
            input: batch,
            model,
            ...(dimensions && { dimensions }),
          });
        });

        // Extract embeddings from response
        const batchEmbeddings = response.data
          .sort((a: any, b: any) => a.index - b.index)
          .map((item: any) => item.embedding);

        results.push(...batchEmbeddings);

        // Log usage for cost tracking
        console.log(
          `📊 Batch usage: ${
            response.usage.prompt_tokens
          } tokens, estimated cost: $${this.estimateCost(
            response.usage.prompt_tokens,
            model
          )}`
        );

        // Add delay between batches to respect rate limits
        if (i + batchSize! < inputs.length) {
          await this.delay(100);
        }
      }

      console.log(`✅ Generated ${results.length} embeddings successfully`);
      return results;
    } catch (error) {
      console.error("❌ Failed to generate embeddings:", error);
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate chat completion using Azure OpenAI
   */
  async generateChatCompletion(request: ChatRequest): Promise<any> {
    await this.initialize();

    try {
      const response = await this.retryOperation(async () => {
        return await this.client!.chat.completions.create({
          model: request.model || this.config.deploymentName,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          top_p: request.top_p,
          frequency_penalty: request.frequency_penalty,
          presence_penalty: request.presence_penalty,
          stop: request.stop,
          user: request.user,
        });
      });

      return response;
    } catch (error) {
      console.error("❌ Failed to generate chat completion:", error);
      throw new Error(`Chat completion failed: ${error}`);
    }
  }

  /**
   * Stream chat completion for real-time responses
   */
  async streamChatCompletion(
    request: ChatRequest
  ): Promise<AsyncIterable<any>> {
    await this.initialize();

    try {
      const stream = await this.client!.chat.completions.create({
        model: request.model || this.config.deploymentName,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        user: request.user,
        stream: true,
      });

      return stream;
    } catch (error) {
      console.error("❌ Failed to stream chat completion:", error);
      throw new Error(`Chat streaming failed: ${error}`);
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        const isRetryable = this.isRetryableError(error);
        if (!isRetryable) {
          throw lastError;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.warn(
          `⚠️ Attempt ${attempt} failed, retrying in ${delay}ms:`,
          error
        );
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is retryable (rate limit, temporary server error, etc.)
   */
  private isRetryableError(error: any): boolean {
    if (error?.status) {
      // Rate limit, server errors, timeout
      return [429, 500, 502, 503, 504].includes(error.status);
    }

    // Network errors
    return error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT";
  }

  /**
   * Estimate cost based on tokens and model
   */
  private estimateCost(tokens: number, model: string): string {
    const costPer1kTokens: Record<string, number> = {
      "text-embedding-3-large": 0.00013,
      // "text-embedding-3-small": 0.00002,
      // "text-embedding-ada-002": 0.0001,
    };

    const modelKey = Object.keys(costPer1kTokens).find((key) =>
      model.includes(key)
    );
    const rate = modelKey ? costPer1kTokens[modelKey] : 0.0001; // Default rate

    return ((tokens / 1000) * rate).toFixed(6);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get service health and configuration status
   */
  async getServiceHealth(): Promise<{
    status: "healthy" | "unhealthy";
    initialized: boolean;
    config: Partial<AzureOpenAIConfig>;
    lastError?: string;
  }> {
    try {
      await this.initialize();

      return {
        status: "healthy",
        initialized: this.initialized,
        config: {
          deploymentName: this.config.deploymentName,
          embeddingDeploymentName: this.config.embeddingDeploymentName,
          batchSize: this.config.batchSize,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        initialized: false,
        config: {},
        lastError: (error as Error).message,
      };
    }
  }
}

// Factory function with environment-based configuration
export function createAzureOpenAIService(): AzureOpenAIService {
  const config: AzureOpenAIConfig = {
    deploymentName: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4",
    embeddingDeploymentName:
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-large",
    maxRetries: parseInt(process.env.AZURE_OPENAI_MAX_RETRIES || "3"),
    requestTimeout: parseInt(process.env.AZURE_OPENAI_TIMEOUT || "60000"),
    batchSize: parseInt(process.env.AZURE_OPENAI_BATCH_SIZE || "100"),
  };

  return new AzureOpenAIService(config);
}

// Singleton instance
let azureOpenAIInstance: AzureOpenAIService | null = null;

export function getAzureOpenAIService(): AzureOpenAIService {
  if (!azureOpenAIInstance) {
    azureOpenAIInstance = createAzureOpenAIService();
  }
  return azureOpenAIInstance;
}
