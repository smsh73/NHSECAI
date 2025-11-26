import { SearchClient, SearchIndexClient, AzureKeyCredential } from "@azure/search-documents";
import { azureConfigService } from "./azure-config.js";

/**
 * Azure AI Search Service with Zero Trust Authentication
 * 
 * Features:
 * - Zero Trust authentication via Managed Identity or Service Principal
 * - Vector search with HNSW algorithm
 * - Hybrid search (vector + keyword)
 * - Automatic indexing and schema management
 * - Real-time search with optimized performance
 */

export interface SearchIndexConfig {
  name: string;
  fields: SearchField[];
  vectorSearch?: VectorSearchConfig;
  semanticSearch?: SemanticSearchConfig;
}

export interface SearchField {
  name: string;
  type: "Edm.String" | "Edm.Int32" | "Edm.Double" | "Edm.Boolean" | "Edm.DateTimeOffset" | "Collection(Edm.Single)";
  key?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  facetable?: boolean;
  retrievable?: boolean;
  dimensions?: number; // For vector fields
  vectorSearchProfile?: string;
}

export interface VectorSearchConfig {
  algorithms: VectorSearchAlgorithm[];
  profiles: VectorSearchProfile[];
}

export interface VectorSearchAlgorithm {
  name: string;
  kind: "hnsw" | "exhaustiveKnn";
  parameters?: {
    m?: number;
    efConstruction?: number;
    efSearch?: number;
    metric?: "cosine" | "euclidean" | "dotProduct";
  };
}

export interface VectorSearchProfile {
  name: string;
  algorithm: string;
  vectorizer?: string;
}

export interface SemanticSearchConfig {
  configurations: Array<{
    name: string;
    prioritizedFields: {
      titleField?: string;
      prioritizedContentFields?: string[];
      prioritizedKeywordsFields?: string[];
    };
  }>;
}

export interface SearchRequest {
  searchText?: string;
  vectorQueries?: VectorQuery[];
  filter?: string;
  orderBy?: string[];
  facets?: string[];
  top?: number;
  skip?: number;
  includeTotalCount?: boolean;
  searchMode?: "any" | "all";
  queryType?: "simple" | "full" | "semantic";
  semanticConfiguration?: string;
}

export interface VectorQuery {
  vector: number[];
  fields: string;
  k: number;
  exhaustive?: boolean;
}

export interface SearchResponse<T = any> {
  results: SearchResult<T>[];
  count?: number;
  facets?: Record<string, any>;
  coverage?: number;
  semanticSearchResults?: any;
}

export interface SearchResult<T = any> {
  document: T;
  score: number;
  highlights?: Record<string, string[]>;
  captions?: Array<{
    text: string;
    highlights: string;
  }>;
}

export class AzureSearchService {
  private searchClient: SearchClient<any> | null = null;
  private indexClient: SearchIndexClient | null = null;
  private initialized = false;
  private indexName: string;

  constructor(indexName: string) {
    this.indexName = indexName;
  }

  /**
   * Initialize Azure AI Search with API Key authentication
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const searchConfig = azureConfigService.getAISearchConfig();

      if (!searchConfig.endpoint || !searchConfig.apiKey) {
        throw new Error("Azure AI Search endpoint and API key must be configured. Set AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY environment variables.");
      }

      console.log("🔒 Initializing Azure AI Search with API Key authentication");

      // Create credential from API key
      const credential = new AzureKeyCredential(searchConfig.apiKey);

      // Create clients with API key authentication
      this.indexClient = new SearchIndexClient(
        searchConfig.endpoint,
        credential
      );

      this.searchClient = new SearchClient<any>(
        searchConfig.endpoint,
        this.indexName,
        credential
      );

      this.initialized = true;
      console.log("✅ Azure AI Search service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Azure AI Search:", error);
      throw new Error(`Azure Search initialization failed: ${error}`);
    }
  }

  /**
   * Create or update search index with vector search capabilities
   */
  async createOrUpdateIndex(config: SearchIndexConfig): Promise<void> {
    await this.initialize();

    if (!this.indexClient) {
      throw new Error("Index client not initialized");
    }

    try {
      console.log(`🔄 Creating/updating search index: ${config.name}`);

      const indexDefinition = {
        name: config.name,
        fields: config.fields.map(field => ({
          name: field.name,
          type: field.type,
          key: field.key || false,
          searchable: field.searchable,
          filterable: field.filterable,
          sortable: field.sortable,
          facetable: field.facetable,
          retrievable: field.retrievable !== false,
          ...(field.dimensions && { dimensions: field.dimensions }),
          ...(field.vectorSearchProfile && { vectorSearchProfile: field.vectorSearchProfile }),
        })),
        ...(config.vectorSearch && { vectorSearch: config.vectorSearch }),
        ...(config.semanticSearch && { semantic: config.semanticSearch }),
      };

      const result = await this.indexClient.createOrUpdateIndex(indexDefinition);
      
      console.log(`✅ Index ${config.name} created/updated successfully`);
    } catch (error) {
      console.error(`❌ Failed to create/update index ${config.name}:`, error);
      throw new Error(`Index creation failed: ${error}`);
    }
  }

  /**
   * Delete search index
   */
  async deleteIndex(indexName: string): Promise<void> {
    await this.initialize();

    if (!this.indexClient) {
      throw new Error("Index client not initialized");
    }

    try {
      console.log(`🔄 Deleting search index: ${indexName}`);
      await this.indexClient.deleteIndex(indexName);
      console.log(`✅ Index ${indexName} deleted successfully`);
    } catch (error) {
      console.error(`❌ Failed to delete index ${indexName}:`, error);
      throw new Error(`Index deletion failed: ${error}`);
    }
  }

  /**
   * Upload documents to search index
   */
  async uploadDocuments<T>(
    documents: T[],
    options: {
      batchSize?: number;
      mergeOrUpload?: boolean;
    } = {}
  ): Promise<void> {
    await this.initialize();

    if (!this.searchClient) {
      throw new Error("Search client not initialized");
    }

    const {
      batchSize = 1000,
      mergeOrUpload = true,
    } = options;

    try {
      console.log(`🔄 Uploading ${documents.length} documents to index ${this.indexName}`);

      // Process documents in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        const action = mergeOrUpload ? "mergeOrUpload" : "upload";
        
        const result = await this.searchClient.mergeOrUploadDocuments(batch);

        console.log(`📊 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} completed`);

        // Add delay between batches to respect rate limits
        if (i + batchSize < documents.length) {
          await this.delay(100);
        }
      }

      console.log(`✅ Successfully uploaded ${documents.length} documents`);
    } catch (error) {
      console.error("❌ Failed to upload documents:", error);
      throw new Error(`Document upload failed: ${error}`);
    }
  }

  /**
   * Perform vector similarity search
   */
  async vectorSearch<T>(
    queryVector: number[],
    options: {
      vectorField?: string;
      k?: number;
      filter?: string;
      select?: string[];
      includeScore?: boolean;
    } = {}
  ): Promise<SearchResponse<T>> {
    await this.initialize();

    if (!this.searchClient) {
      throw new Error("Search client not initialized");
    }

    const {
      vectorField = "content_vector",
      k = 10,
      filter,
      select,
      includeScore = true,
    } = options;

    try {
      console.log(`🔍 Performing vector search with ${queryVector.length}D vector, k=${k}`);

      const searchRequest: SearchRequest = {
        vectorQueries: [{
          vector: queryVector,
          fields: vectorField,
          k,
        }],
        ...(filter && { filter }),
        ...(select && { select }),
        includeTotalCount: true,
      };

      const searchResults = await this.searchClient.search("*", {
        vectorQueries: searchRequest.vectorQueries,
        filter: searchRequest.filter,
        select: searchRequest.select,
        includeTotalCount: searchRequest.includeTotalCount,
        top: k,
      });

      const results: SearchResult<T>[] = [];
      
      for await (const result of searchResults.results) {
        results.push({
          document: result.document as T,
          score: result.score || 0,
          highlights: result.highlights,
          captions: result.captions,
        });
      }

      console.log(`✅ Vector search completed, found ${results.length} results`);

      return {
        results,
        count: searchResults.count,
        coverage: searchResults.coverage,
      };
    } catch (error) {
      console.error("❌ Vector search failed:", error);
      throw new Error(`Vector search failed: ${error}`);
    }
  }

  /**
   * Perform hybrid search (vector + keyword)
   */
  async hybridSearch<T>(
    searchText: string,
    queryVector: number[],
    options: {
      vectorField?: string;
      k?: number;
      filter?: string;
      select?: string[];
      searchMode?: "any" | "all";
      queryType?: "simple" | "full" | "semantic";
      semanticConfiguration?: string;
    } = {}
  ): Promise<SearchResponse<T>> {
    await this.initialize();

    if (!this.searchClient) {
      throw new Error("Search client not initialized");
    }

    const {
      vectorField = "content_vector",
      k = 10,
      filter,
      select,
      searchMode = "any",
      queryType = "simple",
      semanticConfiguration,
    } = options;

    try {
      console.log(`🔍 Performing hybrid search: "${searchText.substring(0, 50)}..." with vector`);

      const searchResults = await this.searchClient.search(searchText, {
        vectorQueries: [{
          vector: queryVector,
          fields: vectorField,
          k,
        }],
        filter,
        select,
        searchMode,
        queryType,
        ...(semanticConfiguration && { semanticConfiguration }),
        includeTotalCount: true,
        top: k,
      });

      const results: SearchResult<T>[] = [];
      
      for await (const result of searchResults.results) {
        results.push({
          document: result.document as T,
          score: result.score || 0,
          highlights: result.highlights,
          captions: result.captions,
        });
      }

      console.log(`✅ Hybrid search completed, found ${results.length} results`);

      return {
        results,
        count: searchResults.count,
        coverage: searchResults.coverage,
        semanticSearchResults: searchResults.semanticSearchResults,
      };
    } catch (error) {
      console.error("❌ Hybrid search failed:", error);
      throw new Error(`Hybrid search failed: ${error}`);
    }
  }

  /**
   * Perform text-only search
   */
  async textSearch<T>(
    searchText: string,
    options: {
      filter?: string;
      select?: string[];
      orderBy?: string[];
      searchMode?: "any" | "all";
      queryType?: "simple" | "full" | "semantic";
      top?: number;
      skip?: number;
    } = {}
  ): Promise<SearchResponse<T>> {
    await this.initialize();

    if (!this.searchClient) {
      throw new Error("Search client not initialized");
    }

    const {
      filter,
      select,
      orderBy,
      searchMode = "any",
      queryType = "simple",
      top = 10,
      skip = 0,
    } = options;

    try {
      console.log(`🔍 Performing text search: "${searchText.substring(0, 50)}..."`);

      const searchResults = await this.searchClient.search(searchText, {
        filter,
        select,
        orderBy,
        searchMode,
        queryType,
        top,
        skip,
        includeTotalCount: true,
      });

      const results: SearchResult<T>[] = [];
      
      for await (const result of searchResults.results) {
        results.push({
          document: result.document as T,
          score: result.score || 0,
          highlights: result.highlights,
          captions: result.captions,
        });
      }

      console.log(`✅ Text search completed, found ${results.length} results`);

      return {
        results,
        count: searchResults.count,
        coverage: searchResults.coverage,
      };
    } catch (error) {
      console.error("❌ Text search failed:", error);
      throw new Error(`Text search failed: ${error}`);
    }
  }

  /**
   * Get search suggestions
   */
  async suggest<T>(
    searchText: string,
    suggesterName: string,
    options: {
      fuzzy?: boolean;
      filter?: string;
      select?: string[];
      top?: number;
    } = {}
  ): Promise<Array<{ text: string; document: T }>> {
    await this.initialize();

    if (!this.searchClient) {
      throw new Error("Search client not initialized");
    }

    const {
      fuzzy = true,
      filter,
      select,
      top = 5,
    } = options;

    try {
      console.log(`🔍 Getting suggestions for: "${searchText}"`);

      const suggestions = await this.searchClient.suggest(searchText, suggesterName, {
        useFuzzyMatching: fuzzy,
        filter,
        select,
        top,
      });

      const results = suggestions.results.map(result => ({
        text: result.text,
        document: result.document as T,
      }));

      console.log(`✅ Found ${results.length} suggestions`);

      return results;
    } catch (error) {
      console.error("❌ Suggestion search failed:", error);
      throw new Error(`Suggestion search failed: ${error}`);
    }
  }

  /**
   * Delete documents from index
   */
  async deleteDocuments(keys: string[]): Promise<void> {
    await this.initialize();

    if (!this.searchClient) {
      throw new Error("Search client not initialized");
    }

    try {
      console.log(`🗑️ Deleting ${keys.length} documents from index`);

      const documents = keys.map(key => ({ id: key }));
      
      await this.searchClient.deleteDocuments(documents);

      console.log(`✅ Successfully deleted ${keys.length} documents`);
    } catch (error) {
      console.error("❌ Failed to delete documents:", error);
      throw new Error(`Document deletion failed: ${error}`);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStatistics(): Promise<{
    documentCount: number;
    storageSize: number;
  }> {
    await this.initialize();

    if (!this.indexClient) {
      throw new Error("Index client not initialized");
    }

    try {
      const stats = await this.indexClient.getIndexStatistics(this.indexName);
      
      return {
        documentCount: stats.documentCount,
        storageSize: stats.storageSize,
      };
    } catch (error) {
      console.error("❌ Failed to get index statistics:", error);
      throw new Error(`Statistics retrieval failed: ${error}`);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * List all search indexes
   */
  async listIndexes(): Promise<Array<{ name: string; fields: any[] }>> {
    await this.initialize();

    if (!this.indexClient) {
      throw new Error("Index client not initialized");
    }

    try {
      console.log("🔄 Listing all search indexes...");

      const indexes = await this.indexClient.listIndexes();
      const indexList = [];

      for await (const index of indexes) {
        indexList.push({
          name: index.name,
          fields: index.fields || []
        });
      }

      console.log(`✅ Found ${indexList.length} indexes`);
      return indexList;
    } catch (error) {
      console.error("❌ Failed to list indexes:", error);
      throw new Error(`Index listing failed: ${error}`);
    }
  }

  /**
   * Get service health and configuration status
   */
  async getServiceHealth(): Promise<{
    status: "healthy" | "unhealthy";
    initialized: boolean;
    indexName: string;
    indexExists?: boolean;
    documentCount?: number;
    lastError?: string;
  }> {
    try {
      await this.initialize();
      
      let indexExists = false;
      let documentCount = 0;

      try {
        const stats = await this.getIndexStatistics();
        indexExists = true;
        documentCount = stats.documentCount;
      } catch (error) {
        // Index might not exist yet
        indexExists = false;
      }

      return {
        status: "healthy",
        initialized: this.initialized,
        indexName: this.indexName,
        indexExists,
        documentCount,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        initialized: false,
        indexName: this.indexName,
        lastError: (error as Error).message,
      };
    }
  }
}

// Factory function with environment-based configuration
export function createAzureSearchService(indexName: string): AzureSearchService {
  return new AzureSearchService(indexName);
}

// Singleton instances for common indexes
const searchInstances = new Map<string, AzureSearchService>();

export function getAzureSearchService(indexName: string): AzureSearchService {
  if (!searchInstances.has(indexName)) {
    searchInstances.set(indexName, createAzureSearchService(indexName));
  }
  return searchInstances.get(indexName)!;
}