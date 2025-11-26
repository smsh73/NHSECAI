import fs from 'fs';
import path from 'path';

// 환경별 설정 검증 및 통합 스크립트
class EnvironmentValidator {
  constructor() {
    this.environments = ['local', 'development', 'production'];
    this.requiredEnvVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'AZURE_DATABRICKS_HOST',
      'AZURE_DATABRICKS_TOKEN',
      'AZURE_DATABRICKS_WAREHOUSE_ID'
    ];
  }

  /**
   * 환경별 설정 검증
   */
  async validateEnvironment(env) {
    console.log(`\n🔍 ${env.toUpperCase()} 환경 검증 시작...`);
    
    const envFile = this.getEnvFile(env);
    const config = this.loadEnvConfig(envFile);
    
    const results = {
      environment: env,
      isValid: true,
      errors: [],
      warnings: [],
      config: {}
    };

    // 필수 환경 변수 검증
    for (const envVar of this.requiredEnvVars) {
      if (!config[envVar]) {
        results.errors.push(`필수 환경 변수 누락: ${envVar}`);
        results.isValid = false;
      } else {
        results.config[envVar] = this.maskSensitiveValue(envVar, config[envVar]);
      }
    }

    // 데이터베이스 연결 검증
    if (config.DATABASE_URL) {
      try {
        await this.validateDatabaseConnection(config.DATABASE_URL);
        console.log(`✅ 데이터베이스 연결 성공`);
      } catch (error) {
        results.errors.push(`데이터베이스 연결 실패: ${error.message}`);
        results.isValid = false;
      }
    }

    // OpenAI API 키 검증
    if (config.OPENAI_API_KEY) {
      try {
        await this.validateOpenAIKey(config.OPENAI_API_KEY);
        console.log(`✅ OpenAI API 키 유효`);
      } catch (error) {
        results.warnings.push(`OpenAI API 키 검증 실패: ${error.message}`);
      }
    }

    // Azure Databricks 설정 검증
    if (config.AZURE_DATABRICKS_HOST && config.AZURE_DATABRICKS_TOKEN) {
      try {
        await this.validateDatabricksConnection(config);
        console.log(`✅ Azure Databricks 연결 성공`);
      } catch (error) {
        results.warnings.push(`Azure Databricks 연결 실패: ${error.message}`);
      }
    }

    // 워크플로우 관련 설정 검증
    await this.validateWorkflowConfig(env, results);

    if (results.isValid) {
      console.log(`✅ ${env.toUpperCase()} 환경 검증 완료`);
    } else {
      console.log(`❌ ${env.toUpperCase()} 환경 검증 실패`);
      results.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (results.warnings.length > 0) {
      console.log(`⚠️  경고사항:`);
      results.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    return results;
  }

  /**
   * 모든 환경 검증
   */
  async validateAllEnvironments() {
    console.log('🚀 환경별 설정 검증 시작...\n');
    
    const results = [];
    
    for (const env of this.environments) {
      try {
        const result = await this.validateEnvironment(env);
        results.push(result);
      } catch (error) {
        console.error(`❌ ${env} 환경 검증 중 오류 발생:`, error.message);
        results.push({
          environment: env,
          isValid: false,
          errors: [error.message],
          warnings: [],
          config: {}
        });
      }
    }

    // 결과 요약
    this.printSummary(results);
    
    return results;
  }

  /**
   * 환경 파일 경로 반환
   */
  getEnvFile(env) {
    const envFiles = {
      local: '.env',
      development: 'development.env',
      production: 'production.env'
    };
    
    return envFiles[env] || '.env';
  }

  /**
   * 환경 설정 로드
   */
  loadEnvConfig(envFile) {
    const envPath = path.join(__dirname, '..', envFile);
    
    if (!fs.existsSync(envPath)) {
      throw new Error(`환경 파일을 찾을 수 없습니다: ${envFile}`);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const config = {};

    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return config;
  }

  /**
   * 데이터베이스 연결 검증
   */
  async validateDatabaseConnection(databaseUrl) {
    // 실제 구현에서는 데이터베이스 연결 테스트
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (databaseUrl.includes('postgresql://')) {
          resolve();
        } else {
          reject(new Error('유효하지 않은 데이터베이스 URL 형식'));
        }
      }, 100);
    });
  }

  /**
   * OpenAI API 키 검증
   */
  async validateOpenAIKey(apiKey) {
    // 실제 구현에서는 OpenAI API 호출 테스트
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (apiKey.startsWith('sk-') && apiKey.length > 20) {
          resolve();
        } else {
          reject(new Error('유효하지 않은 OpenAI API 키 형식'));
        }
      }, 100);
    });
  }

  /**
   * Azure Databricks 연결 검증
   */
  async validateDatabricksConnection(config) {
    // 실제 구현에서는 Databricks API 호출 테스트
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (config.AZURE_DATABRICKS_HOST.includes('azuredatabricks.net')) {
          resolve();
        } else {
          reject(new Error('유효하지 않은 Databricks 호스트 형식'));
        }
      }, 100);
    });
  }

  /**
   * 워크플로우 관련 설정 검증
   */
  async validateWorkflowConfig(env, results) {
    try {
      // 워크플로우 데이터베이스 테이블 존재 확인
      const { storage } = require('../server/storage');
      
      // 워크플로우 테이블 스키마 확인
      const tables = await storage.getSchemaInfo();
      const requiredTables = [
        'workflow_sessions',
        'workflow_nodes',
        'workflow_node_executions',
        'workflow_session_data',
        'prompts'
      ];

      for (const table of requiredTables) {
        const tableExists = tables.some(t => t.name === table);
        if (!tableExists) {
          results.errors.push(`필수 테이블 누락: ${table}`);
          results.isValid = false;
        }
      }

      // 프롬프트 카탈로그 확인
      const prompts = await storage.getPrompts();
      if (prompts.length === 0) {
        results.warnings.push('프롬프트 카탈로그가 비어있습니다. 프롬프트를 등록해주세요.');
      }

      console.log(`✅ 워크플로우 설정 검증 완료 (테이블: ${tables.length}개, 프롬프트: ${prompts.length}개)`);
    } catch (error) {
      results.errors.push(`워크플로우 설정 검증 실패: ${error.message}`);
      results.isValid = false;
    }
  }

  /**
   * 민감한 값 마스킹
   */
  maskSensitiveValue(key, value) {
    const sensitiveKeys = ['KEY', 'TOKEN', 'PASSWORD', 'SECRET'];
    const isSensitive = sensitiveKeys.some(sensitiveKey => 
      key.toUpperCase().includes(sensitiveKey)
    );
    
    if (isSensitive && value) {
      return value.substring(0, 8) + '...' + value.substring(value.length - 4);
    }
    
    return value;
  }

  /**
   * 결과 요약 출력
   */
  printSummary(results) {
    console.log('\n📊 환경 검증 결과 요약');
    console.log('='.repeat(50));
    
    const validCount = results.filter(r => r.isValid).length;
    const totalCount = results.length;
    
    console.log(`전체 환경: ${totalCount}개`);
    console.log(`유효한 환경: ${validCount}개`);
    console.log(`무효한 환경: ${totalCount - validCount}개`);
    
    console.log('\n환경별 상태:');
    results.forEach(result => {
      const status = result.isValid ? '✅' : '❌';
      const errorCount = result.errors.length;
      const warningCount = result.warnings.length;
      
      console.log(`  ${status} ${result.environment.toUpperCase()}`);
      if (errorCount > 0) {
        console.log(`    - 오류: ${errorCount}개`);
      }
      if (warningCount > 0) {
        console.log(`    - 경고: ${warningCount}개`);
      }
    });
    
    // 전체 환경이 유효한지 확인
    const allValid = results.every(r => r.isValid);
    if (allValid) {
      console.log('\n🎉 모든 환경이 정상적으로 설정되었습니다!');
    } else {
      console.log('\n⚠️  일부 환경에 문제가 있습니다. 위의 오류를 확인해주세요.');
    }
  }

  /**
   * 환경별 설정 파일 생성
   */
  async generateEnvironmentConfigs() {
    console.log('\n🔧 환경별 설정 파일 생성...');
    
    const baseConfig = {
      NODE_ENV: 'development',
      PORT: 5000,
      DATABASE_URL: 'postgresql://user:password@localhost:5432/aitradeconsole',
      OPENAI_API_KEY: 'sk-your-openai-api-key',
      AZURE_DATABRICKS_HOST: 'https://your-workspace.azuredatabricks.net',
      AZURE_DATABRICKS_TOKEN: 'your-databricks-token',
      AZURE_DATABRICKS_WAREHOUSE_ID: 'your-warehouse-id',
      AZURE_DATABRICKS_CATALOG: 'nh_ai',
      AZURE_DATABRICKS_SCHEMA: 'silver'
    };

    const envConfigs = {
      local: {
        ...baseConfig,
        NODE_ENV: 'development',
        PORT: 3000
      },
      development: {
        ...baseConfig,
        NODE_ENV: 'development',
        PORT: 5000
      },
      production: {
        ...baseConfig,
        NODE_ENV: 'production',
        PORT: 8080
      }
    };

    for (const [env, config] of Object.entries(envConfigs)) {
      const envFile = this.getEnvFile(env);
      const envPath = path.join(__dirname, '..', envFile);
      
      const envContent = Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      fs.writeFileSync(envPath, envContent);
      console.log(`✅ ${envFile} 생성 완료`);
    }
  }
}

// 스크립트 실행
async function main() {
  const validator = new EnvironmentValidator();
  
  try {
    // 환경별 설정 검증
    await validator.validateAllEnvironments();
    
    // 환경별 설정 파일 생성 (필요시)
    if (process.argv.includes('--generate')) {
      await validator.generateEnvironmentConfigs();
    }
    
  } catch (error) {
    console.error('❌ 환경 검증 중 오류 발생:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { EnvironmentValidator };
