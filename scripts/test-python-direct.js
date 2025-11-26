// Python 실행 엔진 직접 테스트 (모듈 직접 import)
// npm run dev가 실행 중이거나 또는 직접 실행

import { PythonExecutionEngine } from '../server/services/python-execution-engine.js';

const engine = new PythonExecutionEngine();

async function testSimpleCalculation() {
  console.log('\n✅ 테스트 1: 간단한 계산');
  const script = `
a = 10
b = 20
result = a + b
output = {"sum": result, "multiply": a * b}
`;
  
  const result = await engine.executeScript({
    sessionId: 'test-1',
    nodeId: 'node-1',
    inputData: {},
    config: {
      script,
      timeout: 10,
      environment: 'python3',
      outputFormat: 'json'
    }
  });
  
  console.log('결과:', JSON.stringify(result, null, 2));
  return result.success && result.output?.output?.sum === 30;
}

async function testInputData() {
  console.log('\n✅ 테스트 2: 입력 데이터 처리');
  const script = `
data = input_data.get('data', {})
numbers = data.get('numbers', [])
result_value = sum(numbers)
output = {"operation": "sum", "numbers": numbers, "result": result_value}
`;
  
  const result = await engine.executeScript({
    sessionId: 'test-2',
    nodeId: 'node-2',
    inputData: { numbers: [1, 2, 3, 4, 5] },
    config: {
      script,
      timeout: 10,
      environment: 'python3',
      outputFormat: 'json'
    }
  });
  
  console.log('결과:', JSON.stringify(result, null, 2));
  return result.success && result.output?.output?.result === 15;
}

async function testErrorHandling() {
  console.log('\n✅ 테스트 3: 에러 처리');
  const script = `
a = 10
b = 0
result = a / b  # ZeroDivisionError
output = {"result": result}
`;
  
  const result = await engine.executeScript({
    sessionId: 'test-3',
    nodeId: 'node-3',
    inputData: {},
    config: {
      script,
      timeout: 10,
      environment: 'python3',
      outputFormat: 'json'
    }
  });
  
  console.log('결과:', JSON.stringify(result, null, 2));
  return !result.success && result.error;
}

async function testComplexData() {
  console.log('\n✅ 테스트 4: 복잡한 데이터 집계');
  const script = `
data = input_data.get('data', {})
sales = data.get('sales', [])
category_totals = {}
for sale in sales:
    category = sale.get('category', 'unknown')
    amount = sale.get('amount', 0)
    category_totals[category] = category_totals.get(category, 0) + amount
total_amount = sum(sale.get('amount', 0) for sale in sales)
output = {
    "total_sales": total_amount,
    "category_totals": category_totals
}
`;
  
  const result = await engine.executeScript({
    sessionId: 'test-4',
    nodeId: 'node-4',
    inputData: {
      sales: [
        { date: '2025-01-01', amount: 1000, category: 'A' },
        { date: '2025-01-02', amount: 1500, category: 'B' },
        { date: '2025-01-03', amount: 800, category: 'A' },
        { date: '2025-01-04', amount: 2000, category: 'B' },
      ]
    },
    config: {
      script,
      timeout: 10,
      environment: 'python3',
      outputFormat: 'json'
    }
  });
  
  console.log('결과:', JSON.stringify(result, null, 2));
  return result.success && result.output?.output?.total_sales === 5300;
}

async function main() {
  console.log('='.repeat(80));
  console.log('Python 실행 엔진 직접 검증 테스트');
  console.log('='.repeat(80));
  
  // Python 환경 검증
  console.log('\n📋 Python 환경 확인 중...');
  const envCheck = await engine.validatePythonEnvironment();
  if (!envCheck.available) {
    console.error('❌ Python이 설치되어 있지 않습니다:', envCheck.error);
    process.exit(1);
  }
  console.log('✅', envCheck.version);
  
  // 테스트 실행
  const results = [];
  
  try {
    results.push(await testSimpleCalculation());
    results.push(await testInputData());
    results.push(await testErrorHandling());
    results.push(await testComplexData());
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
    process.exit(1);
  }
  
  // 결과 요약
  console.log('\n' + '='.repeat(80));
  console.log('테스트 결과 요약');
  console.log('='.repeat(80));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`통과: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('✅ 모든 테스트 통과!');
    process.exit(0);
  } else {
    console.log('❌ 일부 테스트 실패');
    process.exit(1);
  }
}

main().catch(console.error);
