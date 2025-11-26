# Azure 서비스 환경 변수 가이드

NH Investment & Securities AI 플랫폼의 Azure 서비스 연동을 위한 환경 변수 설정 가이드입니다.

## 🚀 최신 변경사항 (2025-10-30)

- **Azure App Service 전용**: `.env` 파일 로드 제거, Application Settings 사용
- **PostgreSQL 전용**: SQLite 완전 제거
- **환경변수 필수**: 모든 설정은 Azure App Service Application Settings에서 관리

**🔍 벡터 검색 및 RAG 통합**
- 모든 임베딩 생성: Azure OpenAI Embedding 배포 사용
- 모든 벡터 검색: Azure AI Search (HNSW 알고리즘)
- 문서 저장소: Azure AI Search 인덱스
- Azure 미설정 시 Standard OpenAI로 자동 폴백

## 목차
1. [환경 변수 관리 시스템](#환경-변수-관리-시스템)
2. [Azure Databricks](#azure-databricks)
3. [Azure PostgreSQL](#azure-postgresql)
4. [Azure CosmosDB](#azure-cosmosdb)
5. [Azure OpenAI (PTU)](#azure-openai-ptu)
6. [Azure OpenAI Embedding](#azure-openai-embedding)
7. [Azure AI Search](#azure-ai-search)
8. [환경 변수 검증](#환경-변수-검증)
9. [Private Endpoint 설정](#private-endpoint-설정)
10. [문제 해결](#문제-해결)

---

## 환경 변수 관리 시스템

### 중앙 집중식 설정 관리
모든 Azure 서비스 설정은 `AzureConfigService` 클래스에서 관리됩니다.

**파일 위치**: `server/services/azure-config.ts`

### 설정 확인 로깅
모든 환경 변수 로딩 시 자동으로 Activity Logger에 기록됩니다:
```typescript
activityLogger.logConfigCheck(
  'Databricks',                    // 서비스 이름
  'DATABRICKS_SERVER_HOSTNAME',    // 설정 키
  !!serverHostname,                // 존재 여부
  serverHostname                   // 값 (민감 정보는 자동 마스킹)
);
```

---

## Azure Databricks

### 개요
Azure Databricks SQL Warehouse에 연결하여 데이터 쿼리를 실행합니다.

### 환경 변수

| 변수 이름 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `DATABRICKS_SERVER_HOSTNAME` | ✅ | - | Databricks 워크스페이스 호스트명 |
| `DATABRICKS_HTTP_PATH` | ✅ | - | SQL Warehouse HTTP 경로 |
| `DATABRICKS_TOKEN` | ✅ | - | Personal Access Token |
| `AZURE_DATABRICKS_USE_PRIVATE_ENDPOINT` | ❌ | `false` | Private Endpoint 사용 여부 |
| `AZURE_DATABRICKS_PRIVATE_ENDPOINT_URL` | ❌ | - | Private Endpoint URL |

**대체 변수명** (Azure 특화):
- `AZURE_DATABRICKS_HOST` → `DATABRICKS_SERVER_HOSTNAME`
- `AZURE_DATABRICKS_HTTP_PATH` → `DATABRICKS_HTTP_PATH`
- `AZURE_DATABRICKS_TOKEN` → `DATABRICKS_TOKEN`

### 설정 예시

```bash
# .env 파일
DATABRICKS_SERVER_HOSTNAME=adb-1234567890123456.7.azuredatabricks.net
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/abc123def456
DATABRICKS_TOKEN=dapi1234567890abcdefghijklmnopqrstuv

# Private Endpoint 사용 시
AZURE_DATABRICKS_USE_PRIVATE_ENDPOINT=true
AZURE_DATABRICKS_PRIVATE_ENDPOINT_URL=https://adb-internal.privatelink.azuredatabricks.net
```

### 사용 코드

#### 1. 설정 로딩
**파일**: `server/services/azure-config.ts`
```typescript
static getDatabricksConfig(): AzureDatabricksConfig {
  const serverHostname = process.env.DATABRICKS_SERVER_HOSTNAME || 
                         process.env.AZURE_DATABRICKS_HOST || '';
  const httpPath = process.env.DATABRICKS_HTTP_PATH || 
                   process.env.AZURE_DATABRICKS_HTTP_PATH || '';
  const authToken = process.env.DATABRICKS_TOKEN || 
                    process.env.AZURE_DATABRICKS_TOKEN;
  const usePrivateEndpoint = process.env.AZURE_DATABRICKS_USE_PRIVATE_ENDPOINT === 'true';
  const privateEndpointUrl = process.env.AZURE_DATABRICKS_PRIVATE_ENDPOINT_URL;

  // 설정 확인 로깅
  activityLogger.logConfigCheck('Databricks', 'DATABRICKS_SERVER_HOSTNAME', !!serverHostname, serverHostname);
  activityLogger.logConfigCheck('Databricks', 'DATABRICKS_HTTP_PATH', !!httpPath, httpPath);
  activityLogger.logConfigCheck('Databricks', 'DATABRICKS_TOKEN', !!authToken, authToken);
  
  return {
    serverHostname,
    httpPath,
    authToken,
    usePrivateEndpoint,
    privateEndpointUrl,
  };
}
```

#### 2. Databricks SQL 쿼리 실행
**파일**: `server/services/azure-databricks.ts`
```typescript
import { DBSQLClient } from '@databricks/sql';
import { AzureConfigService } from './azure-config.js';

class AzureDatabricksService {
  private client: DBSQLClient | null = null;

  async executeQuery(sql: string, parameters: Record<string, any> = {}, options?: QueryOptions) {
    const config = AzureConfigService.getDatabricksConfig();
    
    // 클라이언트 생성
    this.client = new DBSQLClient();
    
    const connection = await this.client.connect({
      host: config.serverHostname,
      path: config.httpPath,
      token: config.authToken,
    });

    const session = await connection.openSession();
    
    // SQL 쿼리 실행
    const queryOperation = await session.executeStatement(sql, {
      maxRows: options?.maxRows || 1000,
      namedParameters: parameters,
    });

    const result = await queryOperation.fetchAll();
    await queryOperation.close();
    
    return {
      data: result,
      rowCount: result.length,
      executionTime: Date.now() - startTime,
    };
  }
}
```

#### 3. 워크플로우에서 Databricks 사용
**파일**: `server/services/workflow-execution-engine.ts`
```typescript
import { getAzureDatabricksService } from './azure-databricks.js';

// dataSource 노드 실행
case 'dataSource': {
  const { sql, parameters } = node.data;
  const databricksService = getAzureDatabricksService();
  
  // SQL 쿼리 실행
  const queryResult = await databricksService.executeQuery(sql, parameters);
  
  nodeResults.set(node.id, queryResult.data);
  break;
}
```

#### 4. API 엔드포인트에서 Databricks 사용
**파일**: `server/routes.ts`
```typescript
// AI 분석 생성 API
app.post('/api/databricks/generate-ai-analysis', async (req, res) => {
  const { sql, prompt, maxRows } = req.body;
  
  // Activity 로깅
  activityLogger.logApiCall('generate-ai-analysis', 'POST', {
    userId: req.user.id,
    sqlLength: sql.length
  });

  // Databricks 쿼리 실행
  const databricksService = getAzureDatabricksService();
  const queryResult = await databricksService.executeQuery(sql, {}, { maxRows });
  
  res.json({
    success: true,
    data: queryResult.data,
    rowCount: queryResult.rowCount
  });
});
```

---

## Azure PostgreSQL

### 개요
관리 데이터(사용자, 워크플로우, 프롬프트 등)를 저장하는 PostgreSQL 데이터베이스입니다.

### 환경 변수

| 변수 이름 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `PGHOST` | ✅ | `localhost` | PostgreSQL 서버 호스트 |
| `PGPORT` | ❌ | `5432` | PostgreSQL 서버 포트 |
| `PGDATABASE` | ✅ | `postgres` | 데이터베이스 이름 |
| `PGUSER` | ✅ | `postgres` | 사용자 이름 |
| `PGPASSWORD` | ✅ | - | 비밀번호 |
| `AZURE_POSTGRES_SSL` | ❌ | `false` | SSL 연결 사용 여부 |
| `AZURE_POSTGRES_PRIVATE_ENDPOINT_URL` | ❌ | - | Private Endpoint URL |

**대체 변수명** (Azure 특화):
- `AZURE_POSTGRES_HOST` → `PGHOST`
- `AZURE_POSTGRES_PORT` → `PGPORT`
- `AZURE_POSTGRES_DATABASE` → `PGDATABASE`
- `AZURE_POSTGRES_USERNAME` → `PGUSER`
- `AZURE_POSTGRES_PASSWORD` → `PGPASSWORD`

### 설정 예시

```bash
# Replit 내장 PostgreSQL (개발 환경)
DATABASE_URL=postgresql://user:password@host:5432/database

# Azure PostgreSQL (프로덕션)
PGHOST=nh-investment-db.postgres.database.azure.com
PGPORT=5432
PGDATABASE=nh_market_analysis
PGUSER=dbadmin@nh-investment-db
PGPASSWORD=your-secure-password
AZURE_POSTGRES_SSL=true
```

### 사용 코드

#### 1. 설정 로딩
**파일**: `server/services/azure-config.ts`
```typescript
static getPostgreSQLConfig(): AzurePostgreSQLConfig {
  const host = process.env.AZURE_POSTGRES_HOST || process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.AZURE_POSTGRES_PORT || process.env.PGPORT || '5432');
  const database = process.env.AZURE_POSTGRES_DATABASE || process.env.PGDATABASE || 'postgres';
  const username = process.env.AZURE_POSTGRES_USERNAME || process.env.PGUSER || 'postgres';
  const password = process.env.AZURE_POSTGRES_PASSWORD || process.env.PGPASSWORD || '';
  const ssl = process.env.AZURE_POSTGRES_SSL === 'true';
  const privateEndpointUrl = process.env.AZURE_POSTGRES_PRIVATE_ENDPOINT_URL;

  activityLogger.logConfigCheck('PostgreSQL', 'PGHOST', !!host, host);
  activityLogger.logConfigCheck('PostgreSQL', 'PGDATABASE', !!database, database);
  activityLogger.logConfigCheck('PostgreSQL', 'PGUSER', !!username, username);
  activityLogger.logConfigCheck('PostgreSQL', 'PGPASSWORD', !!password, password);
  
  return { host, port, database, username, password, ssl, privateEndpointUrl };
}
```

#### 2. Drizzle ORM 연결
**파일**: `server/db.ts`
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
```

---

## Azure CosmosDB

### 개요
RAG 데이터(벡터 임베딩, 문서 등)를 저장하는 NoSQL 데이터베이스입니다.

### 환경 변수

| 변수 이름 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `AZURE_COSMOS_ENDPOINT` | ✅ | - | CosmosDB 계정 URI |
| `AZURE_COSMOS_KEY` | ✅ | - | Primary 또는 Secondary Key |
| `AZURE_COSMOS_DATABASE_ID` | ❌ | `nh-investment` | 데이터베이스 ID |
| `AZURE_COSMOS_PRIVATE_ENDPOINT_URL` | ❌ | - | Private Endpoint URL |

### 설정 예시

```bash
AZURE_COSMOS_ENDPOINT=https://nh-investment-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx==
AZURE_COSMOS_DATABASE_ID=nh-investment
```

### 사용 코드

#### 1. 설정 로딩
**파일**: `server/services/azure-config.ts`
```typescript
static getCosmosDBConfig(): AzureCosmosDBConfig {
  const endpoint = process.env.AZURE_COSMOS_ENDPOINT || '';
  const key = process.env.AZURE_COSMOS_KEY || '';
  const databaseId = process.env.AZURE_COSMOS_DATABASE_ID || 'nh-investment';
  const privateEndpointUrl = process.env.AZURE_COSMOS_PRIVATE_ENDPOINT_URL;

  activityLogger.logConfigCheck('CosmosDB', 'AZURE_COSMOS_ENDPOINT', !!endpoint, endpoint);
  activityLogger.logConfigCheck('CosmosDB', 'AZURE_COSMOS_KEY', !!key, key);
  activityLogger.logConfigCheck('CosmosDB', 'AZURE_COSMOS_DATABASE_ID', !!databaseId, databaseId);
  
  return { endpoint, key, databaseId, privateEndpointUrl };
}
```

#### 2. CosmosDB 클라이언트 생성
```typescript
import { CosmosClient } from '@azure/cosmos';
import { AzureConfigService } from './azure-config.js';

const config = AzureConfigService.getCosmosDBConfig();
const cosmosClient = new CosmosClient({
  endpoint: config.endpoint,
  key: config.key,
});

const database = cosmosClient.database(config.databaseId);
const container = database.container('documents');
```

---

## Azure OpenAI (PTU)

### 개요
GPT-4/GPT-5를 사용한 AI 분석 생성을 위한 Azure OpenAI PTU (Provisioned Throughput Unit) 서비스입니다.

### 환경 변수

| 변수 이름 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `AZURE_OPENAI_PTU_ENDPOINT` | ✅ | - | Azure OpenAI 리소스 URL |
| `AZURE_OPENAI_PTU_KEY` | ✅ | - | API 키 |
| `AZURE_OPENAI_PTU_DEPLOYMENT` | ✅ | `gpt-4` | 배포 이름 |
| `AZURE_OPENAI_PTU_MODEL` | ❌ | `gpt-4.1` | 모델 이름 |
| `AZURE_OPENAI_PTU_API_VERSION` | ❌ | `2024-10-21` | API 버전 |
| `AZURE_OPENAI_PTU_USE_PRIVATE_ENDPOINT` | ❌ | `false` | Private Endpoint 사용 여부 |
| `AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL` | ❌ | - | Private Endpoint URL |

### Fallback: Standard OpenAI
Azure OpenAI PTU가 설정되지 않은 경우 자동으로 Standard OpenAI로 전환됩니다:
- `OPENAI_API_KEY`

### 설정 예시

```bash
# Azure OpenAI PTU (우선순위)
AZURE_OPENAI_PTU_ENDPOINT=https://nh-investment-openai.openai.azure.com/
AZURE_OPENAI_PTU_KEY=1234567890abcdefghijklmnopqrstuv
AZURE_OPENAI_PTU_DEPLOYMENT=gpt-4-turbo
AZURE_OPENAI_PTU_MODEL=gpt-4.1
AZURE_OPENAI_PTU_API_VERSION=2024-10-21

# Standard OpenAI (Fallback)
OPENAI_API_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz
```

### 사용 코드

#### 1. 설정 로딩
**파일**: `server/services/azure-config.ts`
```typescript
static getOpenAIPTUConfig(): AzureOpenAIConfig {
  const usePrivateEndpoint = process.env.AZURE_OPENAI_PTU_USE_PRIVATE_ENDPOINT === 'true';
  const endpoint = usePrivateEndpoint && process.env.AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL
      ? process.env.AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL
      : process.env.AZURE_OPENAI_PTU_ENDPOINT || '';
  const apiKey = process.env.AZURE_OPENAI_PTU_KEY || '';
  const deploymentName = process.env.AZURE_OPENAI_PTU_DEPLOYMENT || 'gpt-4';
  const modelName = process.env.AZURE_OPENAI_PTU_MODEL || 'gpt-4.1';
  const apiVersion = process.env.AZURE_OPENAI_PTU_API_VERSION || '2024-10-21';
  const privateEndpointUrl = process.env.AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL;

  activityLogger.logConfigCheck('OpenAI-PTU', 'AZURE_OPENAI_PTU_ENDPOINT', !!endpoint, endpoint);
  activityLogger.logConfigCheck('OpenAI-PTU', 'AZURE_OPENAI_PTU_KEY', !!apiKey, apiKey);
  activityLogger.logConfigCheck('OpenAI-PTU', 'AZURE_OPENAI_PTU_DEPLOYMENT', !!deploymentName, deploymentName);
  
  return {
    endpoint,
    apiKey,
    deploymentName,
    modelName,
    apiVersion,
    isPTU: true,
    privateEndpointUrl,
  };
}
```

#### 2. Azure OpenAI 클라이언트 생성
**파일**: `server/services/azure-openai.ts`
```typescript
import { AzureOpenAI } from 'openai';
import { AzureConfigService } from './azure-config.js';

let azureOpenAIClient: AzureOpenAI | null = null;

export function getAzureOpenAIClient(): AzureOpenAI {
  if (azureOpenAIClient) return azureOpenAIClient;

  const config = AzureConfigService.getOpenAIPTUConfig();
  
  if (!config.endpoint || !config.apiKey) {
    throw new Error('Azure OpenAI PTU configuration is incomplete');
  }

  azureOpenAIClient = new AzureOpenAI({
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    apiVersion: config.apiVersion,
    deployment: config.deploymentName,
  });

  return azureOpenAIClient;
}
```

#### 3. Chat Completion 호출
**파일**: `server/services/openai.ts`
```typescript
import { getAzureOpenAIClient } from './azure-openai.js';

async function generateAnalysis(prompt: string, data: any[]) {
  const client = getAzureOpenAIClient();
  
  const response = await client.chat.completions.create({
    model: 'gpt-4',  // deployment name
    messages: [
      { role: 'system', content: '전문 금융 애널리스트' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return response.choices[0].message.content;
}
```

---

## Azure OpenAI Embedding

### 개요
텍스트를 벡터 임베딩으로 변환하는 별도의 Azure OpenAI Embedding 서비스입니다.

### 환경 변수

| 변수 이름 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `AZURE_OPENAI_EMBEDDING_ENDPOINT` | ✅ | - | Azure OpenAI Embedding 리소스 URL |
| `AZURE_OPENAI_EMBEDDING_KEY` | ✅ | - | API 키 |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | ✅ | `text-embedding-ada-002` | 배포 이름 |
| `AZURE_OPENAI_EMBEDDING_MODEL` | ❌ | `text-embedding-3-large` | 모델 이름 |
| `AZURE_OPENAI_EMBEDDING_API_VERSION` | ❌ | `2024-10-21` | API 버전 |
| `AZURE_OPENAI_EMBEDDING_USE_PRIVATE_ENDPOINT` | ❌ | `false` | Private Endpoint 사용 여부 |
| `AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL` | ❌ | - | Private Endpoint URL |

### 설정 예시

```bash
AZURE_OPENAI_EMBEDDING_ENDPOINT=https://nh-investment-embedding.openai.azure.com/
AZURE_OPENAI_EMBEDDING_KEY=9876543210zyxwvutsrqponmlkjihgfed
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_EMBEDDING_MODEL=text-embedding-3-large
AZURE_OPENAI_EMBEDDING_API_VERSION=2024-10-21
```

### 사용 코드

#### 1. 설정 로딩
**파일**: `server/services/azure-config.ts`
```typescript
static getEmbeddingConfig(): AzureEmbeddingConfig {
  const usePrivateEndpoint = process.env.AZURE_OPENAI_EMBEDDING_USE_PRIVATE_ENDPOINT === 'true';
  const endpoint = usePrivateEndpoint && process.env.AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL
      ? process.env.AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL
      : process.env.AZURE_OPENAI_EMBEDDING_ENDPOINT || '';
  const apiKey = process.env.AZURE_OPENAI_EMBEDDING_KEY || '';
  const deploymentName = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002';
  const modelName = process.env.AZURE_OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002';
  const apiVersion = process.env.AZURE_OPENAI_EMBEDDING_API_VERSION || '2024-10-21';
  const privateEndpointUrl = process.env.AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL;

  activityLogger.logConfigCheck('OpenAI-Embedding', 'AZURE_OPENAI_EMBEDDING_ENDPOINT', !!endpoint, endpoint);
  activityLogger.logConfigCheck('OpenAI-Embedding', 'AZURE_OPENAI_EMBEDDING_KEY', !!apiKey, apiKey);
  
  return {
    endpoint,
    apiKey,
    deploymentName,
    modelName,
    apiVersion,
    privateEndpointUrl,
  };
}
```

#### 2. Embedding 생성
**파일**: `server/services/rag.ts`
```typescript
import { AzureOpenAI } from 'openai';
import { AzureConfigService } from './azure-config.js';

async function generateEmbedding(text: string): Promise<number[]> {
  const config = AzureConfigService.getEmbeddingConfig();
  
  const embeddingClient = new AzureOpenAI({
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    apiVersion: config.apiVersion,
    deployment: config.deploymentName,
  });

  const response = await embeddingClient.embeddings.create({
    model: config.deploymentName,
    input: text,
  });

  return response.data[0].embedding;
}
```

---

## Azure AI Search

### 개요
벡터 검색 및 하이브리드 검색을 위한 Azure AI Search 서비스입니다.

**🔍 벡터 검색 통합 완료**
- `ragService.ts`: 모든 임베딩 생성 및 하이브리드 검색에 사용
- `rag.ts`: 금융 데이터 및 뉴스 데이터 벡터 검색에 사용
- `azure-search.ts`: HNSW 알고리즘 기반 벡터 인덱스 관리
- Azure Embedding + Azure AI Search 조합으로 완전한 Azure 네이티브 RAG 구현

### 환경 변수

| 변수 이름 | 필수 | 기본값 | 설명 |
|----------|------|--------|------|
| `AZURE_SEARCH_ENDPOINT` | ✅ | - | Azure AI Search 엔드포인트 |
| `AZURE_SEARCH_KEY` | ✅ | - | Admin API 키 |
| `AZURE_SEARCH_INDEX_NAME` | ❌ | `nh-financial-index` | 인덱스 이름 |
| `AZURE_SEARCH_USE_PRIVATE_ENDPOINT` | ❌ | `false` | Private Endpoint 사용 여부 |
| `AZURE_SEARCH_PRIVATE_ENDPOINT_URL` | ❌ | - | Private Endpoint URL |

### 설정 예시

```bash
AZURE_SEARCH_ENDPOINT=https://nh-investment-search.search.windows.net
AZURE_SEARCH_KEY=ABC123DEF456GHI789JKL012MNO345PQR678
AZURE_SEARCH_INDEX_NAME=financial-documents
```

### 사용 코드

#### 1. 설정 로딩
**파일**: `server/services/azure-config.ts`
```typescript
static getAISearchConfig(): AzureAISearchConfig {
  const usePrivateEndpoint = process.env.AZURE_SEARCH_USE_PRIVATE_ENDPOINT === 'true';
  
  return {
    endpoint: usePrivateEndpoint && process.env.AZURE_SEARCH_PRIVATE_ENDPOINT_URL
      ? process.env.AZURE_SEARCH_PRIVATE_ENDPOINT_URL
      : process.env.AZURE_SEARCH_ENDPOINT || '',
    apiKey: process.env.AZURE_SEARCH_KEY,
    indexName: process.env.AZURE_SEARCH_INDEX_NAME || 'nh-financial-index',
    usePrivateEndpoint,
    privateEndpointUrl: process.env.AZURE_SEARCH_PRIVATE_ENDPOINT_URL,
  };
}
```

#### 2. AI Search 클라이언트 생성
```typescript
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { AzureConfigService } from './azure-config.js';

const config = AzureConfigService.getAISearchConfig();

const searchClient = new SearchClient(
  config.endpoint,
  config.indexName!,
  new AzureKeyCredential(config.apiKey!)
);
```

---

## 환경 변수 검증

### API 엔드포인트
**경로**: `/api/azure/config/validate`

```typescript
// server/routes.ts
app.get('/api/azure/config/validate', (req, res) => {
  const validation = AzureConfigService.validateConfigurations();
  
  res.json({
    success: true,
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
  });
});
```

### 검증 결과 예시
```json
{
  "success": true,
  "isValid": false,
  "errors": [
    "DATABRICKS_SERVER_HOSTNAME or AZURE_DATABRICKS_HOST is required",
    "DATABRICKS_HTTP_PATH or AZURE_DATABRICKS_HTTP_PATH is required"
  ],
  "warnings": [
    "AZURE_COSMOS_ENDPOINT is not set",
    "AZURE_OPENAI_PTU_ENDPOINT is not set"
  ]
}
```

### 설정 요약 조회
**경로**: `/api/azure/config/summary`

```typescript
app.get('/api/azure/config/summary', (req, res) => {
  const summary = AzureConfigService.getConfigurationSummary();
  res.json({ success: true, configuration: summary });
});
```

---

## Private Endpoint 설정

### 개요
Azure 서비스에 Private Endpoint를 통해 안전하게 접속할 수 있습니다.

### 지원 서비스
- Databricks
- OpenAI PTU
- OpenAI Embedding
- PostgreSQL
- CosmosDB
- AI Search

### 설정 방법

각 서비스별 Private Endpoint 설정:
```bash
# Databricks
AZURE_DATABRICKS_USE_PRIVATE_ENDPOINT=true
AZURE_DATABRICKS_PRIVATE_ENDPOINT_URL=https://adb-internal.privatelink.azuredatabricks.net

# OpenAI PTU
AZURE_OPENAI_PTU_USE_PRIVATE_ENDPOINT=true
AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL=https://openai-internal.privatelink.openai.azure.com

# OpenAI Embedding
AZURE_OPENAI_EMBEDDING_USE_PRIVATE_ENDPOINT=true
AZURE_OPENAI_EMBEDDING_PRIVATE_ENDPOINT_URL=https://embedding-internal.privatelink.openai.azure.com

# AI Search
AZURE_SEARCH_USE_PRIVATE_ENDPOINT=true
AZURE_SEARCH_PRIVATE_ENDPOINT_URL=https://search-internal.privatelink.search.windows.net
```

### Private Endpoint 우선순위
코드에서 Private Endpoint가 설정되어 있고 활성화된 경우 자동으로 Private URL을 사용합니다:

```typescript
const endpoint = usePrivateEndpoint && process.env.AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL
    ? process.env.AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL
    : process.env.AZURE_OPENAI_PTU_ENDPOINT || '';
```

---

## 문제 해결

### 1. 환경 변수가 로딩되지 않는 경우

**증상**: 서비스 연결 실패, "Configuration is incomplete" 에러

**해결 방법**:
```bash
# 1. .env 파일 확인
cat .env

# 2. 환경 변수 확인
echo $DATABRICKS_SERVER_HOSTNAME

# 3. Activity 로그 확인 (설정 로딩 기록)
cat logs/activity.log | grep '"type":"config_check"'
```

### 2. Databricks 연결 실패

**증상**: "Failed to connect to Databricks" 에러

**확인 사항**:
1. `DATABRICKS_SERVER_HOSTNAME` 형식: `adb-xxx.azuredatabricks.net` (https:// 제외)
2. `DATABRICKS_HTTP_PATH` 형식: `/sql/1.0/warehouses/xxx`
3. `DATABRICKS_TOKEN` 유효성: Personal Access Token 만료 여부 확인

```bash
# Databricks 설정 검증
curl -X GET "https://$DATABRICKS_SERVER_HOSTNAME/api/2.0/clusters/list" \
  -H "Authorization: Bearer $DATABRICKS_TOKEN"
```

### 3. Azure OpenAI API 호출 실패

**증상**: "Unauthorized" 또는 "Deployment not found" 에러

**확인 사항**:
1. `AZURE_OPENAI_PTU_ENDPOINT` 형식: `https://xxx.openai.azure.com/`
2. `AZURE_OPENAI_PTU_DEPLOYMENT`: Azure Portal에서 확인한 배포 이름과 일치하는지 확인
3. API 키 유효성 확인

```bash
# Azure OpenAI 연결 테스트
curl "https://$AZURE_OPENAI_PTU_ENDPOINT/openai/deployments/$AZURE_OPENAI_PTU_DEPLOYMENT/chat/completions?api-version=$AZURE_OPENAI_PTU_API_VERSION" \
  -H "api-key: $AZURE_OPENAI_PTU_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### 4. 로그를 통한 디버깅

```bash
# 특정 서비스 설정 확인 로그
cat logs/activity.log | grep '"serviceName":"Databricks"'

# API 호출 실패 로그
cat logs/error-$(date +%Y-%m-%d).log | grep "Databricks"

# 실시간 로그 모니터링
tail -f logs/activity.log | grep config_check
```

---

## 환경 변수 체크리스트

### 필수 설정 (최소 동작)
- [x] `DATABRICKS_SERVER_HOSTNAME`
- [x] `DATABRICKS_HTTP_PATH`
- [x] `DATABRICKS_TOKEN`
- [x] `DATABASE_URL` (PostgreSQL)

### 권장 설정 (AI 기능)
- [ ] `AZURE_OPENAI_PTU_ENDPOINT`
- [ ] `AZURE_OPENAI_PTU_KEY`
- [ ] `AZURE_OPENAI_PTU_DEPLOYMENT`
- [ ] `AZURE_OPENAI_EMBEDDING_ENDPOINT`
- [ ] `AZURE_OPENAI_EMBEDDING_KEY`
- [ ] `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`

또는

- [ ] `OPENAI_API_KEY` (Standard OpenAI Fallback)

### 선택 설정 (고급 기능)
- [ ] `AZURE_COSMOS_ENDPOINT`
- [ ] `AZURE_COSMOS_KEY`
- [ ] `AZURE_SEARCH_ENDPOINT`
- [ ] `AZURE_SEARCH_KEY`

### Private Endpoint (엔터프라이즈)
- [ ] `AZURE_DATABRICKS_USE_PRIVATE_ENDPOINT`
- [ ] `AZURE_DATABRICKS_PRIVATE_ENDPOINT_URL`
- [ ] `AZURE_OPENAI_PTU_USE_PRIVATE_ENDPOINT`
- [ ] `AZURE_OPENAI_PTU_PRIVATE_ENDPOINT_URL`

---

## 요약

| Azure 서비스 | 필수 환경 변수 | 용도 | 사용 위치 |
|-------------|--------------|------|----------|
| **Databricks** | `DATABRICKS_SERVER_HOSTNAME`<br>`DATABRICKS_HTTP_PATH`<br>`DATABRICKS_TOKEN` | SQL 데이터 쿼리 | Workflow Engine, API Management |
| **PostgreSQL** | `PGHOST`<br>`PGDATABASE`<br>`PGUSER`<br>`PGPASSWORD` | 관리 데이터 저장 | 모든 CRUD 작업 |
| **CosmosDB** | `AZURE_COSMOS_ENDPOINT`<br>`AZURE_COSMOS_KEY` | RAG 벡터 데이터 | RAG 서비스 |
| **OpenAI PTU** | `AZURE_OPENAI_PTU_ENDPOINT`<br>`AZURE_OPENAI_PTU_KEY`<br>`AZURE_OPENAI_PTU_DEPLOYMENT` | AI 분석 생성 | Prompt Builder, Workflow |
| **OpenAI Embedding** | `AZURE_OPENAI_EMBEDDING_ENDPOINT`<br>`AZURE_OPENAI_EMBEDDING_KEY`<br>`AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | 벡터 임베딩 | RAG 서비스, 검색 |
| **AI Search** | `AZURE_SEARCH_ENDPOINT`<br>`AZURE_SEARCH_KEY` | 하이브리드 검색 | RAG 서비스 |
