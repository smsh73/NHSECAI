// 간단한 워크플로우 시스템 테스트
console.log('🧪 워크플로우 시스템 간단 테스트 시작...');

async function testBasicFunctionality() {
  try {
    console.log('1️⃣ 기본 모듈 import 테스트...');
    
    // storage 모듈 import
    const { storage } = await import('../server/storage.ts');
    console.log('✅ storage 모듈 import 성공');
    
    // WorkflowEngine 모듈 import
    const { WorkflowEngine } = await import('../server/services/workflow-engine.ts');
    console.log('✅ WorkflowEngine 모듈 import 성공');
    
    // SessionDataManager 모듈 import
    const SessionDataManager = (await import('../server/services/session-data-manager.ts')).default;
    console.log('✅ SessionDataManager 모듈 import 성공');
    
    console.log('\n2️⃣ 데이터베이스 연결 테스트...');
    
    // 워크플로우 목록 조회
    const workflows = await storage.getWorkflows();
    console.log(`✅ 워크플로우 ${workflows.length}개 조회 성공`);
    
    // 프롬프트 목록 조회
    const prompts = await storage.getPrompts();
    console.log(`✅ 프롬프트 ${prompts.length}개 조회 성공`);
    
    console.log('\n3️⃣ 세션 데이터 매니저 테스트...');
    
    const sessionId = 'test-session-' + Date.now();
    const sessionDataManager = new SessionDataManager(sessionId);
    
    // 데이터 저장
    await sessionDataManager.storeData('test_key', { message: 'Hello World' }, 'test_node');
    console.log('✅ 데이터 저장 성공');
    
    // 데이터 조회
    const retrievedData = await sessionDataManager.retrieveData('test_key');
    console.log('✅ 데이터 조회 성공:', retrievedData);
    
    console.log('\n4️⃣ 워크플로우 엔진 테스트...');
    
    const workflowEngine = new WorkflowEngine();
    console.log('✅ 워크플로우 엔진 초기화 성공');
    
    // 워크플로우 세션 생성
    const session = await storage.createWorkflowSession({
      workflowId: workflows[0]?.id || 'test-workflow',
      sessionName: '테스트 세션',
      createdBy: 'tester'
    });
    console.log(`✅ 워크플로우 세션 생성 성공: ${session.id}`);
    
    console.log('\n🎉 모든 기본 테스트가 성공적으로 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

testBasicFunctionality();
