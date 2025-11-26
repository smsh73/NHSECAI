import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Azure 환경에서는 환경변수를 직접 사용 (Docker/App Service에서 설정)
// .env 파일 로드는 제거 - Azure App Service는 환경변수를 직접 제공

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. This should be configured in Azure App Service Application Settings.",
  );
}

// PostgreSQL 전용 - Azure PostgreSQL만 지원
const connectionString = process.env.DATABASE_URL;

// PostgreSQL 연결 설정 - SSL 모드는 환경 변수로 제어 가능
const sslMode = process.env.PGSSLMODE || process.env.POSTGRES_SSL_MODE || 'require';
const useSSL = process.env.POSTGRES_SSL !== 'false' && sslMode !== 'disable';

// SSL 설정 (환경에 따라 선택적)
const sslConfig = useSSL ? {
  rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false'
} : false;

const pool = new Pool({ 
  connectionString,
  ssl: sslConfig,
  // 연결 풀 설정
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '30000', 10), // 기본 30초, 최대 30초
});

const db = drizzle(pool, { schema });

console.log(`✅ Azure PostgreSQL 연결 완료`);

export { db, pool };
