import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// SQLite 또는 PostgreSQL 자동 감지
const isSQLite = process.env.DATABASE_URL.startsWith('sqlite:');

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: isSQLite ? "sqlite" : "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
