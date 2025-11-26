const { storage } = require('../server/storage');
const { seedPrompts } = require('./seed-data-processing-prompts');
const { createNewsProcessingWorkflow } = require('./create-news-processing-workflow');
const { createThemeMarketWorkflow } = require('./create-theme-market-workflow');
const { createMacroMarketWorkflow } = require('./create-macro-market-workflow');
const { EnvironmentValidator } = require('./validate-environment-config');
const { DataConsistencyValidator } = require('./validate-data-consistency');

// 데이터 처리 워크플로우 전체 설정 스크립트
class DataProcessingWorkflowSetup {
  constructor() {
    this.workflows = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 전체 설정 실행
   */
  async setup() {
    console.log('🚀 AI 시황생성 데이터처리 워크플로우 설정 시작...\n');
    
    try {
      // 1. 환경 검증
      await this.validateEnvironment();
      
      // 2. 프롬프트 시딩
      await this.seedPrompts();
      
      // 3. 워크플로우 생성
      await this.createWorkflows();
      
      // 4. 데이터 정합성 검증
      await this.validateDataConsistency();
      
      // 5. 설정 완료 보고서
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 설정 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 환경 검증
   */
  async validateEnvironment() {
    console.log('🔍 환경 검증...');
    
    const validator = new EnvironmentValidator();
    const results = await validator.validateAllEnvironments();
    
    const invalidEnvironments = results.filter(r => !r.isValid);
    if (invalidEnvironments.length > 0) {
      console.log('❌ 일부 환경에 문제가 있습니다. 설정을 확인해주세요.');
      invalidEnvironments.forEach(env => {
        console.log(`  - ${env.environment}: ${env.errors.length}개 오류`);
      });
      throw new Error('환경 검증 실패');
    }
    
    console.log('✅ 환경 검증 완료\n');
  }

  /**
   * 프롬프트 시딩
   */
  async seedPrompts() {
    console.log('💬 프롬프트 시딩...');
    
    try {
      await seedPrompts();
      console.log('✅ 프롬프트 시딩 완료\n');
    } catch (error) {
      this.errors.push(`프롬프트 시딩 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 워크플로우 생성
   */
  async createWorkflows() {
    console.log('🔄 워크플로우 생성...');
    
    const workflowCreators = [
      {
        name: '뉴스 데이터 처리',
        creator: createNewsProcessingWorkflow,
        description: '뉴스 데이터를 수집하고 AOAI로 분석하여 시장 이벤트를 추출'
      },
      {
        name: '테마 시황 생성',
        creator: createThemeMarketWorkflow,
        description: '테마별 뉴스와 시세 데이터를 분석하여 테마 시황을 생성'
      },
      {
        name: '매크로 시황 생성',
        creator: createMacroMarketWorkflow,
        description: '주요 이벤트, 테마 시황, 지수 데이터를 종합하여 매크로 시황을 생성'
      }
    ];

    for (const workflowConfig of workflowCreators) {
      try {
        console.log(`  - ${workflowConfig.name} 생성 중...`);
        const workflow = await workflowConfig.creator();
        this.workflows.push({
          name: workflowConfig.name,
          id: workflow.id,
          description: workflowConfig.description
        });
        console.log(`    ✅ ${workflowConfig.name} 생성 완료`);
      } catch (error) {
        this.errors.push(`${workflowConfig.name} 생성 실패: ${error.message}`);
        console.log(`    ❌ ${workflowConfig.name} 생성 실패: ${error.message}`);
      }
    }
    
    console.log(`✅ 워크플로우 생성 완료 (${this.workflows.length}개)\n`);
  }

  /**
   * 데이터 정합성 검증
   */
  async validateDataConsistency() {
    console.log('🔍 데이터 정합성 검증...');
    
    try {
      const validator = new DataConsistencyValidator();
      await validator.validateAll();
      console.log('✅ 데이터 정합성 검증 완료\n');
    } catch (error) {
      this.warnings.push(`데이터 정합성 검증 실패: ${error.message}`);
      console.log(`⚠️  데이터 정합성 검증 실패: ${error.message}\n`);
    }
  }

  /**
   * 설정 완료 보고서 생성
   */
  generateReport() {
    console.log('📊 설정 완료 보고서');
    console.log('='.repeat(60));
    
    // 워크플로우 목록
    console.log('\n🔄 생성된 워크플로우:');
    this.workflows.forEach((workflow, index) => {
      console.log(`  ${index + 1}. ${workflow.name}`);
      console.log(`     ID: ${workflow.id}`);
      console.log(`     설명: ${workflow.description}`);
    });
    
    // 오류 및 경고
    if (this.errors.length > 0) {
      console.log('\n❌ 오류 목록:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  경고 목록:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    // 다음 단계 안내
    console.log('\n📋 다음 단계:');
    console.log('  1. 워크플로우 에디터에서 워크플로우 확인');
    console.log('  2. 프롬프트 등록 화면에서 프롬프트 확인');
    console.log('  3. API 등록 화면에서 API 설정 확인');
    console.log('  4. 워크플로우 실행 테스트');
    
    // 환경별 실행 가이드
    console.log('\n🌍 환경별 실행 가이드:');
    console.log('  로컬 환경: npm run dev');
    console.log('  개발 환경: npm run start:dev');
    console.log('  배포 환경: npm run start:prod');
    
    // 성공 메시지
    if (this.errors.length === 0) {
      console.log('\n🎉 AI 시황생성 데이터처리 워크플로우 설정이 완료되었습니다!');
    } else {
      console.log('\n⚠️  설정이 완료되었지만 일부 오류가 있습니다. 위의 오류를 확인해주세요.');
    }
  }

  /**
   * 워크플로우 실행 테스트
   */
  async testWorkflows() {
    console.log('\n🧪 워크플로우 실행 테스트...');
    
    for (const workflow of this.workflows) {
      try {
        console.log(`  - ${workflow.name} 테스트 중...`);
        
        // 워크플로우 세션 생성
        const session = await storage.createWorkflowSession({
          workflowId: workflow.id,
          sessionName: `테스트 세션 - ${workflow.name}`,
          createdBy: 'system'
        });
        
        console.log(`    ✅ ${workflow.name} 테스트 완료 (세션 ID: ${session.id})`);
        
      } catch (error) {
        this.warnings.push(`${workflow.name} 테스트 실패: ${error.message}`);
        console.log(`    ⚠️  ${workflow.name} 테스트 실패: ${error.message}`);
      }
    }
  }

  /**
   * 설정 롤백
   */
  async rollback() {
    console.log('🔄 설정 롤백 중...');
    
    try {
      // 생성된 워크플로우 삭제
      for (const workflow of this.workflows) {
        await storage.deleteWorkflow(workflow.id);
        console.log(`  - ${workflow.name} 삭제 완료`);
      }
      
      console.log('✅ 설정 롤백 완료');
    } catch (error) {
      console.error('❌ 설정 롤백 실패:', error);
      throw error;
    }
  }
}

// 스크립트 실행
async function main() {
  const setup = new DataProcessingWorkflowSetup();
  
  try {
    // 명령행 인수 처리
    const args = process.argv.slice(2);
    
    if (args.includes('--rollback')) {
      await setup.rollback();
    } else if (args.includes('--test')) {
      await setup.setup();
      await setup.testWorkflows();
    } else {
      await setup.setup();
    }
    
  } catch (error) {
    console.error('❌ 설정 실패:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DataProcessingWorkflowSetup };
