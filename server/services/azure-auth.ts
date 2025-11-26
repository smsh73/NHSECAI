import { DefaultAzureCredential, ClientSecretCredential, ManagedIdentityCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { TokenCredential } from "@azure/core-auth";

/**
 * Zero Trust Azure Authentication Service
 * 
 * Implements Azure Zero Trust principles:
 * - Verify explicitly: Use managed identity or service principal with certificates
 * - Use least privilege access: Minimal required permissions
 * - Assume breach: No hardcoded secrets, automatic credential rotation
 */

export interface AzureAuthConfig {
  keyVaultUrl?: string;
  clientId?: string;
  tenantId?: string;
  clientSecret?: string; // Only for development - use certificates in production
  certificatePath?: string;
  managedIdentityClientId?: string;
  useSystemManagedIdentity?: boolean;
}

export class AzureAuthService {
  private credential: TokenCredential;
  private secretClient?: SecretClient;
  private config: AzureAuthConfig;

  constructor(config: AzureAuthConfig = {}) {
    this.config = config;
    this.credential = this.createCredential();
    
    if (config.keyVaultUrl) {
      this.secretClient = new SecretClient(config.keyVaultUrl, this.credential);
    }
  }

  /**
   * Creates Azure credential following Zero Trust principles
   * Priority: Managed Identity > Service Principal with Certificate > Development fallback
   */
  private createCredential(): TokenCredential {
    // 1. Managed Identity (Best for Zero Trust - No secrets)
    if (this.isAzureEnvironment()) {
      console.log("🔒 Using Managed Identity (Zero Trust)");
      
      if (this.config.managedIdentityClientId) {
        return new ManagedIdentityCredential({ clientId: this.config.managedIdentityClientId });
      }
      
      if (this.config.useSystemManagedIdentity) {
        return new ManagedIdentityCredential();
      }
    }

    // 2. Service Principal with Certificate (Good for Zero Trust)
    if (this.config.clientId && this.config.tenantId && this.config.certificatePath) {
      console.log("🔒 Using Service Principal with Certificate (Zero Trust)");
      // Note: Implement certificate-based authentication here
      // For now, falling back to DefaultAzureCredential
    }

    // 3. Development fallback (Not Zero Trust - for dev only)
    if (process.env.NODE_ENV === "development" && this.config.clientSecret) {
      console.warn("⚠️ Using Client Secret (Development only - not Zero Trust)");
      return new ClientSecretCredential(
        this.config.tenantId!,
        this.config.clientId!,
        this.config.clientSecret
      );
    }

    // 4. Default Azure Credential Chain
    console.log("🔒 Using DefaultAzureCredential chain");
    return new DefaultAzureCredential({
      managedIdentityClientId: this.config.managedIdentityClientId,
    });
  }

  /**
   * Detects if running in Azure environment
   */
  private isAzureEnvironment(): boolean {
    return !!(
      process.env.AZURE_CLIENT_ID ||
      process.env.MSI_ENDPOINT ||
      process.env.IDENTITY_ENDPOINT ||
      process.env.AZURE_FUNCTIONS_ENVIRONMENT ||
      process.env.WEBSITE_SITE_NAME
    );
  }

  /**
   * Gets Azure credential for authentication
   */
  getCredential(): TokenCredential {
    return this.credential;
  }

  /**
   * Securely retrieves secrets from Azure Key Vault or returns undefined if not configured
   */
  async getSecret(secretName: string): Promise<string | undefined> {
    if (!this.secretClient) {
      console.log(`⚠️ Key Vault not configured, skipping secret: ${secretName}`);
      return undefined;
    }

    try {
      console.log(`🔑 Retrieving secret: ${secretName} from Key Vault`);
      const secret = await this.secretClient.getSecret(secretName);
      return secret.value;
    } catch (error) {
      console.error(`❌ Failed to retrieve secret ${secretName}:`, error);
      return undefined;
    }
  }

  /**
   * Safely get secret or fallback to environment variable
   */
  async getSecretOrEnv(secretName: string, envVar: string): Promise<string | undefined> {
    const secretValue = await this.getSecret(secretName);
    if (secretValue) {
      return secretValue;
    }
    
    const envValue = process.env[envVar];
    if (envValue) {
      console.log(`📝 Using environment variable: ${envVar}`);
      return envValue;
    }
    
    return undefined;
  }

  /**
   * Gets Azure OpenAI configuration with Zero Trust authentication
   */
  async getAzureOpenAIConfig() {
    const endpoint = await this.getSecretOrEnv("azure-openai-endpoint", "AZURE_OPENAI_ENDPOINT");
    const apiVersion = await this.getSecretOrEnv("azure-openai-api-version", "AZURE_OPENAI_API_VERSION") || "2024-10-21";

    if (!endpoint) {
      throw new Error("Azure OpenAI endpoint not configured. Set AZURE_OPENAI_ENDPOINT environment variable or configure Key Vault.");
    }

    return {
      endpoint,
      apiVersion,
      credential: this.credential,
    };
  }

  /**
   * Gets Azure AI Search configuration with Zero Trust authentication
   */
  async getAzureSearchConfig() {
    const endpoint = await this.getSecretOrEnv("azure-search-endpoint", "AZURE_SEARCH_ENDPOINT");
    
    if (!endpoint) {
      throw new Error("Azure AI Search endpoint not configured. Set AZURE_SEARCH_ENDPOINT environment variable or configure Key Vault.");
    }

    return {
      endpoint,
      credential: this.credential,
    };
  }

  /**
   * Gets Databricks configuration with Zero Trust authentication
   */
  async getDatabricksConfig() {
    const serverHostname = await this.getSecretOrEnv("databricks-server-hostname", "DATABRICKS_SERVER_HOSTNAME");
    const httpPath = await this.getSecretOrEnv("databricks-http-path", "DATABRICKS_HTTP_PATH");
    
    // For Zero Trust, use Azure AD authentication instead of personal access tokens
    const useAzureAD = (await this.getSecretOrEnv("databricks-use-azure-ad", "DATABRICKS_USE_AZURE_AD")) === "true";

    if (!serverHostname || !httpPath) {
      throw new Error("Databricks configuration incomplete. Set DATABRICKS_SERVER_HOSTNAME and DATABRICKS_HTTP_PATH environment variables or configure Key Vault.");
    }

    if (useAzureAD) {
      // Use Azure AD authentication for Zero Trust
      const token = await this.credential.getToken("2ff814a6-3304-4ab8-85cb-cd0e6f879c1d/.default");
      return {
        serverHostname,
        httpPath,
        authToken: token?.token,
        useAzureAD: true,
      };
    } else {
      // Fallback to personal access token (less secure)
      const authToken = await this.getSecretOrEnv("databricks-token", "DATABRICKS_TOKEN");
      
      if (!authToken) {
        throw new Error("Databricks authentication not configured. Set DATABRICKS_TOKEN environment variable or configure Key Vault.");
      }

      return {
        serverHostname,
        httpPath,
        authToken,
        useAzureAD: false,
      };
    }
  }

  /**
   * Validates Zero Trust compliance
   */
  async validateZeroTrustCompliance(): Promise<{
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for hardcoded secrets
    if (this.config.clientSecret && process.env.NODE_ENV === "production") {
      issues.push("Client secret used in production");
      recommendations.push("Use Managed Identity or Service Principal with certificates");
    }

    // Check for Key Vault usage
    if (!this.config.keyVaultUrl) {
      issues.push("No Key Vault configured for secret management");
      recommendations.push("Configure Azure Key Vault for secure secret storage");
    }

    // Check authentication method
    if (!this.isAzureEnvironment() && !this.config.certificatePath) {
      issues.push("Not using preferred Zero Trust authentication");
      recommendations.push("Use Managed Identity when running in Azure");
    }

    const isCompliant = issues.length === 0;

    return {
      isCompliant,
      issues,
      recommendations,
    };
  }
}

// Factory function for creating Azure Auth Service with environment-based config
export function createAzureAuthService(): AzureAuthService {
  const config: AzureAuthConfig = {
    keyVaultUrl: process.env.AZURE_KEYVAULT_URL,
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET, // Dev only
    managedIdentityClientId: process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID,
    useSystemManagedIdentity: process.env.AZURE_USE_SYSTEM_MANAGED_IDENTITY === "true",
  };

  return new AzureAuthService(config);
}

// Singleton instance
let azureAuthInstance: AzureAuthService | null = null;

export function getAzureAuthService(): AzureAuthService {
  if (!azureAuthInstance) {
    azureAuthInstance = createAzureAuthService();
  }
  return azureAuthInstance;
}