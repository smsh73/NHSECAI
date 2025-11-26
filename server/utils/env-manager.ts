import fs from 'fs';
import path from 'path';

const ENV_FILE_PATH = path.join(process.cwd(), '.env');

/**
 * Parse .env file content into key-value pairs
 */
function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      const value = trimmed.substring(equalIndex + 1).trim();
      env[key] = value;
    }
  }

  return env;
}

/**
 * Stringify env object back to .env format
 */
function stringifyEnv(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';
}

/**
 * Read current .env file
 */
export function readEnvFile(): Record<string, string> {
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      const content = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
      return parseEnvFile(content);
    }
    return {};
  } catch (error) {
    console.error('Error reading .env file:', error);
    return {};
  }
}

/**
 * Update environment variables in .env file
 */
export function updateEnvFile(updates: Record<string, string>): void {
  try {
    // Read current .env
    const currentEnv = readEnvFile();

    // Merge updates
    const updatedEnv = { ...currentEnv, ...updates };

    // Write back to file
    const content = stringifyEnv(updatedEnv);
    fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8');

    console.log(`Updated ${Object.keys(updates).length} environment variables in .env file`);
  } catch (error) {
    console.error('Error updating .env file:', error);
    throw new Error('Failed to update .env file');
  }
}

/**
 * Delete environment variables from .env file
 */
export function deleteEnvVars(keys: string[]): void {
  try {
    const currentEnv = readEnvFile();

    // Remove specified keys
    for (const key of keys) {
      delete currentEnv[key];
    }

    // Write back to file
    const content = stringifyEnv(currentEnv);
    fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8');

    console.log(`Deleted ${keys.length} environment variables from .env file`);
  } catch (error) {
    console.error('Error deleting env vars:', error);
    throw new Error('Failed to delete environment variables');
  }
}

/**
 * Check if .env file exists
 */
export function envFileExists(): boolean {
  return fs.existsSync(ENV_FILE_PATH);
}

/**
 * Get specific environment variable from .env file
 */
export function getEnvVar(key: string): string | undefined {
  const env = readEnvFile();
  return env[key];
}
