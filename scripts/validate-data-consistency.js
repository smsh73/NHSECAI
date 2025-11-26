const { storage } = require('../server/storage');

// 데이터 정합성 검증 스크립트
class DataConsistencyValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 전체 데이터 정합성 검증
   */
  async validateAll() {
    console.log('🔍 데이터 정합성 검증 시작...\n');
    
    try {
      // 1. 워크플로우 데이터 검증
      await this.validateWorkflowData();
      
      // 2. 프롬프트 데이터 검증
      await this.validatePromptData();
      
      // 3. API 설정 데이터 검증
      await this.validateApiData();
      
      // 4. 세션 데이터 검증
      await this.validateSessionData();
      
      // 5. 노드 의존성 검증
      await this.validateNodeDependencies();
      
      // 결과 출력
      this.printResults();
      
    } catch (error) {
      console.error('❌ 데이터 정합성 검증 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 워크플로우 데이터 검증
   */
  async validateWorkflowData() {
    console.log('📋 워크플로우 데이터 검증...');
    
    try {
      const workflows = await storage.getWorkflows();
      
      for (const workflow of workflows) {
        // 워크플로우 기본 정보 검증
        if (!workflow.name || workflow.name.trim() === '') {
          this.errors.push(`워크플로우 ID ${workflow.id}: 이름이 비어있습니다`);
        }
        
        if (!workflow.description || workflow.description.trim() === '') {
          this.warnings.push(`워크플로우 ID ${workflow.id}: 설명이 비어있습니다`);
        }
        
        // 워크플로우 노드 검증
        const nodes = await storage.getWorkflowNodes(workflow.id);
        if (nodes.length === 0) {
          this.errors.push(`워크플로우 ID ${workflow.id}: 노드가 없습니다`);
        }
        
        // 노드 순서 검증
        const nodeOrders = nodes.map(n => n.nodeOrder).sort((a, b) => a - b);
        for (let i = 0; i < nodeOrders.length; i++) {
          if (nodeOrders[i] !== i + 1) {
            this.errors.push(`워크플로우 ID ${workflow.id}: 노드 순서가 연속적이지 않습니다`);
            break;
          }
        }
        
        // 시작/종료 노드 검증
        const startNodes = nodes.filter(n => n.nodeType === 'start');
        const endNodes = nodes.filter(n => n.nodeType === 'end');
        
        if (startNodes.length === 0) {
          this.errors.push(`워크플로우 ID ${workflow.id}: 시작 노드가 없습니다`);
        } else if (startNodes.length > 1) {
          this.errors.push(`워크플로우 ID ${workflow.id}: 시작 노드가 여러 개입니다`);
        }
        
        if (endNodes.length === 0) {
          this.errors.push(`워크플로우 ID ${workflow.id}: 종료 노드가 없습니다`);
        } else if (endNodes.length > 1) {
          this.errors.push(`워크플로우 ID ${workflow.id}: 종료 노드가 여러 개입니다`);
        }
      }
      
      console.log(`✅ 워크플로우 데이터 검증 완료 (${workflows.length}개 워크플로우)`);
      
    } catch (error) {
      this.errors.push(`워크플로우 데이터 검증 실패: ${error.message}`);
    }
  }

  /**
   * 프롬프트 데이터 검증
   */
  async validatePromptData() {
    console.log('💬 프롬프트 데이터 검증...');
    
    try {
      const prompts = await storage.getPrompts();
      
      for (const prompt of prompts) {
        // 프롬프트 기본 정보 검증
        if (!prompt.name || prompt.name.trim() === '') {
          this.errors.push(`프롬프트 ID ${prompt.id}: 이름이 비어있습니다`);
        }
        
        if (!prompt.systemPrompt || prompt.systemPrompt.trim() === '') {
          this.errors.push(`프롬프트 ID ${prompt.id}: 시스템 프롬프트가 비어있습니다`);
        }
        
        // 프롬프트 템플릿 변수 검증
        const template = prompt.userPromptTemplate || prompt.systemPrompt;
        const variables = this.extractTemplateVariables(template);
        
        if (variables.length > 0) {
          console.log(`  - 프롬프트 "${prompt.name}": ${variables.length}개 변수 발견 (${variables.join(', ')})`);
        }
        
        // 카테고리 검증
        if (!prompt.category || prompt.category.trim() === '') {
          this.warnings.push(`프롬프트 ID ${prompt.id}: 카테고리가 설정되지 않았습니다`);
        }
      }
      
      console.log(`✅ 프롬프트 데이터 검증 완료 (${prompts.length}개 프롬프트)`);
      
    } catch (error) {
      this.errors.push(`프롬프트 데이터 검증 실패: ${error.message}`);
    }
  }

  /**
   * API 설정 데이터 검증
   */
  async validateApiData() {
    console.log('🔌 API 설정 데이터 검증...');
    
    try {
      // API 호출 설정 검증 (실제 구현에서는 API 설정 테이블 조회)
      const apiConfigs = []; // await storage.getApiConfigs();
      
      for (const config of apiConfigs) {
        if (!config.name || config.name.trim() === '') {
          this.errors.push(`API 설정 ID ${config.id}: 이름이 비어있습니다`);
        }
        
        if (!config.url || config.url.trim() === '') {
          this.errors.push(`API 설정 ID ${config.id}: URL이 비어있습니다`);
        }
        
        if (!config.method || !['GET', 'POST', 'PUT', 'DELETE'].includes(config.method)) {
          this.errors.push(`API 설정 ID ${config.id}: 유효하지 않은 HTTP 메서드입니다`);
        }
      }
      
      console.log(`✅ API 설정 데이터 검증 완료 (${apiConfigs.length}개 설정)`);
      
    } catch (error) {
      this.errors.push(`API 설정 데이터 검증 실패: ${error.message}`);
    }
  }

  /**
   * 세션 데이터 검증
   */
  async validateSessionData() {
    console.log('📊 세션 데이터 검증...');
    
    try {
      const sessions = await storage.getWorkflowSessions();
      
      for (const session of sessions) {
        // 세션 상태 검증
        const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
        if (!validStatuses.includes(session.status)) {
          this.errors.push(`세션 ID ${session.id}: 유효하지 않은 상태입니다 (${session.status})`);
        }
        
        // 세션 시간 검증
        if (session.startedAt && session.completedAt) {
          if (session.startedAt > session.completedAt) {
            this.errors.push(`세션 ID ${session.id}: 시작 시간이 완료 시간보다 늦습니다`);
          }
        }
        
        // 세션 데이터 검증
        const sessionData = await storage.getWorkflowSessionData(session.id);
        if (sessionData.length === 0 && session.status === 'completed') {
          this.warnings.push(`세션 ID ${session.id}: 완료된 세션에 데이터가 없습니다`);
        }
      }
      
      console.log(`✅ 세션 데이터 검증 완료 (${sessions.length}개 세션)`);
      
    } catch (error) {
      this.errors.push(`세션 데이터 검증 실패: ${error.message}`);
    }
  }

  /**
   * 노드 의존성 검증
   */
  async validateNodeDependencies() {
    console.log('🔗 노드 의존성 검증...');
    
    try {
      const workflows = await storage.getWorkflows();
      
      for (const workflow of workflows) {
        const nodes = await storage.getWorkflowNodes(workflow.id);
        const edges = await storage.getWorkflowEdges(workflow.id);
        
        // 노드 ID 검증
        const nodeIds = new Set(nodes.map(n => n.id));
        for (const edge of edges) {
          if (!nodeIds.has(edge.source)) {
            this.errors.push(`워크플로우 ID ${workflow.id}: 존재하지 않는 소스 노드 (${edge.source})`);
          }
          if (!nodeIds.has(edge.target)) {
            this.errors.push(`워크플로우 ID ${workflow.id}: 존재하지 않는 타겟 노드 (${edge.target})`);
          }
        }
        
        // 순환 의존성 검증
        const hasCycle = this.detectCycle(nodes, edges);
        if (hasCycle) {
          this.errors.push(`워크플로우 ID ${workflow.id}: 순환 의존성이 발견되었습니다`);
        }
        
        // 고아 노드 검증
        const connectedNodes = new Set();
        for (const edge of edges) {
          connectedNodes.add(edge.source);
          connectedNodes.add(edge.target);
        }
        
        for (const node of nodes) {
          if (!connectedNodes.has(node.id) && node.nodeType !== 'start' && node.nodeType !== 'end') {
            this.warnings.push(`워크플로우 ID ${workflow.id}: 연결되지 않은 노드 (${node.nodeName})`);
          }
        }
      }
      
      console.log(`✅ 노드 의존성 검증 완료`);
      
    } catch (error) {
      this.errors.push(`노드 의존성 검증 실패: ${error.message}`);
    }
  }

  /**
   * 템플릿 변수 추출
   */
  extractTemplateVariables(template) {
    if (!template) return [];
    
    const variablePattern = /\{([^}]+)\}/g;
    const variables = [];
    let match;
    
    while ((match = variablePattern.exec(template)) !== null) {
      variables.push(match[1]);
    }
    
    return [...new Set(variables)]; // 중복 제거
  }

  /**
   * 순환 의존성 감지
   */
  detectCycle(nodes, edges) {
    const graph = new Map();
    const visited = new Set();
    const recursionStack = new Set();
    
    // 그래프 구성
    for (const node of nodes) {
      graph.set(node.id, []);
    }
    
    for (const edge of edges) {
      graph.get(edge.source).push(edge.target);
    }
    
    // DFS로 순환 감지
    const dfs = (nodeId) => {
      if (recursionStack.has(nodeId)) {
        return true; // 순환 발견
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) {
          return true;
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 결과 출력
   */
  printResults() {
    console.log('\n📊 데이터 정합성 검증 결과');
    console.log('='.repeat(50));
    
    const errorCount = this.errors.length;
    const warningCount = this.warnings.length;
    
    console.log(`오류: ${errorCount}개`);
    console.log(`경고: ${warningCount}개`);
    
    if (errorCount > 0) {
      console.log('\n❌ 오류 목록:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (warningCount > 0) {
      console.log('\n⚠️  경고 목록:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    if (errorCount === 0 && warningCount === 0) {
      console.log('\n🎉 모든 데이터가 정상적으로 설정되었습니다!');
    } else if (errorCount === 0) {
      console.log('\n✅ 데이터 검증 완료 (경고사항 있음)');
    } else {
      console.log('\n❌ 데이터 검증 실패 (오류 수정 필요)');
    }
  }

  /**
   * 데이터 정합성 수정 제안
   */
  generateFixSuggestions() {
    const suggestions = [];
    
    if (this.errors.length > 0) {
      suggestions.push('1. 오류 수정이 필요합니다:');
      this.errors.forEach((error, index) => {
        suggestions.push(`   - ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      suggestions.push('2. 경고사항 개선을 권장합니다:');
      this.warnings.forEach((warning, index) => {
        suggestions.push(`   - ${warning}`);
      });
    }
    
    suggestions.push('3. 정기적인 데이터 정합성 검증을 권장합니다');
    suggestions.push('4. 워크플로우 실행 전 데이터 검증을 수행하세요');
    
    return suggestions;
  }
}

// 스크립트 실행
async function main() {
  const validator = new DataConsistencyValidator();
  
  try {
    await validator.validateAll();
    
    // 수정 제안 생성
    if (process.argv.includes('--suggestions')) {
      console.log('\n💡 수정 제안:');
      const suggestions = validator.generateFixSuggestions();
      suggestions.forEach(suggestion => console.log(suggestion));
    }
    
  } catch (error) {
    console.error('❌ 데이터 정합성 검증 중 오류 발생:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DataConsistencyValidator };
