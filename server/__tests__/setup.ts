import { jest } from '@jest/globals';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.AZURE_DATABRICKS_HOST = 'test-host';
process.env.AZURE_DATABRICKS_TOKEN = 'test-token';
process.env.AZURE_DATABRICKS_HTTP_PATH = 'test-path';

// Mock external dependencies
jest.mock('../services/azure-databricks', () => ({
  getAzureDatabricksService: jest.fn(() => ({
    executeQuery: jest.fn(),
  })),
}));

jest.mock('../services/activity-logger', () => ({
  activityLogger: {
    logActivity: jest.fn(),
  },
}));

// Set test timeout
jest.setTimeout(10000);
