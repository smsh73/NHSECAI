import { storage } from '../server/storage.ts';
import { WorkflowEngine } from '../server/services/workflow-engine.ts';
import SessionDataManager from '../server/services/session-data-manager.ts';

// 워크플로우 시스템 단계별 테스트
class WorkflowSystemTester {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 워크플로우 시스템 테스트 시작...\n');
    
    try {
      // 1. 데이터베이스 연결 테스트
      await this.testDatabaseConnection();
      
      // 2. 프롬프트 시딩 테스트
      await this.testPromptSeeding();
      
      // 3. 워크플로우 생성 테스트
      await this.testWorkflowCreation();
      
      // 4. 세션 데이터 매니저 테스트
      await this.testSessionDataManager();
      
      // 5. 워크플로우 실행 엔진 테스트
      await this.testWorkflowEngine();
      
      // 6. 통합 테스트
      await this.testIntegration();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ 테스트 실행 중 오류:', error);
    }
  }

  async testDatabaseConnection() {
    console.log('1️⃣ 데이터베이스 연결 테스트...');
    
    try {
      // 워크플로우 목록 조회
      const workflows = await storage.getWorkflows();
      console.log(`✅ 데이터베이스 연결 성공 - 워크플로우 ${workflows.length}개 발견`);
      
      // 프롬프트 목록 조회
      const prompts = await storage.getPrompts();
      console.log(`✅ 프롬프트 ${prompts.length}개 발견`);
      
      this.testResults.push({ test: 'Database Connection', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ 데이터베이스 연결 실패:', error.message);
      this.testResults.push({ test: 'Database Connection', status: 'FAIL', error: error.message });
    }
  }

  async testPromptSeeding() {
    console.log('\n2️⃣ 프롬프트 시딩 테스트...');
    
    try {
      // 프롬프트 시딩 스크립트 실행
      const { seedPrompts } = await import('./seed-data-processing-prompts.js');
      await seedPrompts();
      
      // 시딩된 프롬프트 확인
      const prompts = await storage.getPrompts();
      const dataProcessingPrompts = prompts.filter(p => 
        p.name.includes('뉴스') || p.name.includes('시장') || p.name.includes('테마')
      );
      
      console.log(`✅ 프롬프트 시딩 완료 - ${dataProcessingPrompts.length}개 프롬프트 등록`);
      
      this.testResults.push({ test: 'Prompt Seeding', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ 프롬프트 시딩 실패:', error.message);
      this.testResults.push({ test: 'Prompt Seeding', status: 'FAIL', error: error.message });
    }
  }

  async testWorkflowCreation() {
    console.log('\n3️⃣ 워크플로우 생성 테스트...');
    
    try {
      // 뉴스 처리 워크플로우 생성
      const { createNewsProcessingWorkflow } = await import('./create-news-processing-workflow.js');
      const newsWorkflow = await createNewsProcessingWorkflow();
      console.log(`✅ 뉴스 처리 워크플로우 생성: ${newsWorkflow.id}`);
      
      // 테마 시황 워크플로우 생성
      const { createThemeMarketWorkflow } = await import('./create-theme-market-workflow.js');
      const themeWorkflow = await createThemeMarketWorkflow();
      console.log(`✅ 테마 시황 워크플로우 생성: ${themeWorkflow.id}`);
      
      // 매크로 시황 워크플로우 생성
      const { createMacroMarketWorkflow } = await import('./create-macro-market-workflow.js');
      const macroWorkflow = await createMacroMarketWorkflow();
      console.log(`✅ 매크로 시황 워크플로우 생성: ${macroWorkflow.id}`);
      
      this.testResults.push({ test: 'Workflow Creation', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ 워크플로우 생성 실패:', error.message);
      this.testResults.push({ test: 'Workflow Creation', status: 'FAIL', error: error.message });
    }
  }

  async testSessionDataManager() {
    console.log('\n4️⃣ 세션 데이터 매니저 테스트...');
    
    try {
      const sessionId = 'test-session-' + Date.now();
      const sessionDataManager = new SessionDataManager(sessionId);
      
      // 데이터 저장 테스트
      await sessionDataManager.storeData('test_key', { message: 'Hello World' }, 'test_node');
      console.log('✅ 데이터 저장 성공');
      
      // 데이터 조회 테스트
      const retrievedData = await sessionDataManager.retrieveData('test_key');
      console.log('✅ 데이터 조회 성공:', retrievedData);
      
      // 변수 해석 테스트
      const template = '안녕하세요 {test_key}입니다.';
      const resolved = await sessionDataManager.resolveVariables(template);
      console.log('✅ 변수 해석 성공:', resolved);
      
      this.testResults.push({ test: 'Session Data Manager', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ 세션 데이터 매니저 테스트 실패:', error.message);
      this.testResults.push({ test: 'Session Data Manager', status: 'FAIL', error: error.message });
    }
  }

  async testWorkflowEngine() {
    console.log('\n5️⃣ 워크플로우 실행 엔진 테스트...');
    
    try {
      const workflowEngine = new WorkflowEngine();
      
      // 워크플로우 목록 조회
      const workflows = await storage.getWorkflows();
      const testWorkflow = workflows.find(w => w.name.includes('뉴스'));
      
      if (!testWorkflow) {
        throw new Error('테스트용 워크플로우를 찾을 수 없습니다');
      }
      
      console.log(`✅ 워크플로우 엔진 초기화 완료 - 테스트 대상: ${testWorkflow.name}`);
      
      // 워크플로우 세션 생성
      const session = await storage.createWorkflowSession({
        workflowId: testWorkflow.id,
        sessionName: '테스트 세션',
        createdBy: 'tester'
      });
      
      console.log(`✅ 워크플로우 세션 생성: ${session.id}`);
      
      this.testResults.push({ test: 'Workflow Engine', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ 워크플로우 엔진 테스트 실패:', error.message);
      this.testResults.push({ test: 'Workflow Engine', status: 'FAIL', error: error.message });
    }
  }

  async testIntegration() {
    console.log('\n6️⃣ 통합 테스트...');
    
    try {
      // 전체 워크플로우 목록 확인
      const workflows = await storage.getWorkflows();
      const dataProcessingWorkflows = workflows.filter(w => 
        w.name.includes('뉴스') || w.name.includes('테마') || w.name.includes('매크로')
      );
      
      console.log(`✅ 통합 테스트 완료 - ${dataProcessingWorkflows.length}개 데이터처리 워크플로우 확인`);
      
      // 프롬프트 카탈로그 확인
      const prompts = await storage.getPrompts();
      const dataProcessingPrompts = prompts.filter(p => 
        p.name.includes('뉴스') || p.name.includes('시장') || p.name.includes('테마')
      );
      
      console.log(`✅ 프롬프트 카탈로그 확인 - ${dataProcessingPrompts.length}개 프롬프트 등록`);
      
      this.testResults.push({ test: 'Integration', status: 'PASS' });
      
    } catch (error) {
      console.error('❌ 통합 테스트 실패:', error.message);
      this.testResults.push({ test: 'Integration', status: 'FAIL', error: error.message });
    }
  }

  printResults() {
    console.log('\n📊 테스트 결과 요약');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.status}`);
      if (result.error) {
        console.log(`   오류: ${result.error}`);
      }
    });
    
    console.log('\n📈 전체 결과:');
    console.log(`   성공: ${passed}개`);
    console.log(`   실패: ${failed}개`);
    console.log(`   성공률: ${Math.round((passed / this.testResults.length) * 100)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 모든 테스트가 성공적으로 완료되었습니다!');
    } else {
      console.log('\n⚠️  일부 테스트가 실패했습니다. 위의 오류를 확인해주세요.');
    }
  }
}

// 테스트 실행
async function main() {
  const tester = new WorkflowSystemTester();
  await tester.runAllTests();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WorkflowSystemTester };
