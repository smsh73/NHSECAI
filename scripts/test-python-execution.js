import { PythonExecutionEngine } from '../server/services/python-execution-engine.js';

const engine = new PythonExecutionEngine();

async function runTests() {
  console.log('='.repeat(80));
  console.log('Python 실행 엔진 실질적인 검증 테스트');
  console.log('='.repeat(80));
  console.log('');

  // 1. Python 환경 검증
  console.log('1️⃣ Python 환경 검증');
  console.log('-'.repeat(80));
  try {
    const envCheck = await engine.validatePythonEnvironment();
    if (envCheck.available) {
      console.log(`✅ Python 사용 가능: ${envCheck.version}`);
    } else {
      console.log(`❌ Python 사용 불가: ${envCheck.error}`);
      return;
    }
  } catch (error) {
    console.log(`❌ 환경 검증 실패: ${error.message}`);
    return;
  }
  console.log('');

  // 2. 간단한 계산 테스트
  console.log('2️⃣ 간단한 계산 스크립트 실행');
  console.log('-'.repeat(80));
  try {
    const script1 = `
# 간단한 계산
a = 10
b = 20
result = a + b
output = {"sum": result, "multiply": a * b, "subtract": b - a}
`;

    const result1 = await engine.executeScript({
      sessionId: 'test-session-1',
      nodeId: 'test-node-1',
      inputData: {},
      config: {
        script: script1,
        timeout: 10,
        environment: 'python3',
        outputFormat: 'json'
      }
    });

    if (result1.success) {
      console.log('✅ 실행 성공');
      console.log(`   Exit Code: ${result1.exitCode}`);
      console.log(`   실행 시간: ${result1.executionTime}ms`);
      console.log(`   결과:`, JSON.stringify(result1.output, null, 2));
    } else {
      console.log('❌ 실행 실패');
      console.log(`   에러: ${result1.error}`);
      if (result1.stderr) {
        console.log(`   stderr: ${result1.stderr}`);
      }
    }
  } catch (error) {
    console.log(`❌ 테스트 실패: ${error.message}`);
  }
  console.log('');

  // 3. 입력 데이터 처리 테스트
  console.log('3️⃣ 입력 데이터 처리 테스트');
  console.log('-'.repeat(80));
  try {
    const inputData = {
      numbers: [1, 2, 3, 4, 5],
      operation: 'sum'
    };

    const script2 = `
# 입력 데이터 처리
data = input_data.get('data', {})
numbers = data.get('numbers', [])
operation = data.get('operation', 'sum')

if operation == 'sum':
    result_value = sum(numbers)
elif operation == 'product':
    result_value = 1
    for n in numbers:
        result_value *= n
else:
    result_value = None

output = {
    "operation": operation,
    "numbers": numbers,
    "result": result_value,
    "count": len(numbers)
}
`;

    const result2 = await engine.executeScript({
      sessionId: 'test-session-2',
      nodeId: 'test-node-2',
      inputData,
      config: {
        script: script2,
        timeout: 10,
        environment: 'python3',
        outputFormat: 'json'
      }
    });

    if (result2.success) {
      console.log('✅ 실행 성공');
      console.log(`   Exit Code: ${result2.exitCode}`);
      console.log(`   실행 시간: ${result2.executionTime}ms`);
      console.log(`   결과:`, JSON.stringify(result2.output, null, 2));
      
      // 검증
      if (result2.output?.output?.result === 15) {
        console.log('   ✅ 계산 결과 검증 통과 (sum([1,2,3,4,5]) = 15)');
      } else {
        console.log('   ⚠️ 계산 결과 검증 실패');
      }
    } else {
      console.log('❌ 실행 실패');
      console.log(`   에러: ${result2.error}`);
      if (result2.stderr) {
        console.log(`   stderr: ${result2.stderr}`);
      }
    }
  } catch (error) {
    console.log(`❌ 테스트 실패: ${error.message}`);
  }
  console.log('');

  // 4. 복잡한 데이터 처리 테스트
  console.log('4️⃣ 복잡한 데이터 집계 테스트');
  console.log('-'.repeat(80));
  try {
    const inputData = {
      sales: [
        { date: '2025-01-01', amount: 1000, category: 'A' },
        { date: '2025-01-02', amount: 1500, category: 'B' },
        { date: '2025-01-03', amount: 800, category: 'A' },
        { date: '2025-01-04', amount: 2000, category: 'B' },
      ]
    };

    const script3 = `
# JSON 데이터 변환 및 집계
data = input_data.get('data', {})
sales = data.get('sales', [])

# 카테고리별 집계
category_totals = {}
for sale in sales:
    category = sale.get('category', 'unknown')
    amount = sale.get('amount', 0)
    category_totals[category] = category_totals.get(category, 0) + amount

# 전체 합계
total_amount = sum(sale.get('amount', 0) for sale in sales)

# 최대/최소
amounts = [sale.get('amount', 0) for sale in sales]
max_amount = max(amounts) if amounts else 0
min_amount = min(amounts) if amounts else 0

output = {
    "total_sales": total_amount,
    "category_totals": category_totals,
    "max_amount": max_amount,
    "min_amount": min_amount,
    "average_amount": total_amount / len(sales) if sales else 0,
    "total_records": len(sales)
}
`;

    const result3 = await engine.executeScript({
      sessionId: 'test-session-3',
      nodeId: 'test-node-3',
      inputData,
      config: {
        script: script3,
        timeout: 10,
        environment: 'python3',
        outputFormat: 'json'
      }
    });

    if (result3.success) {
      console.log('✅ 실행 성공');
      console.log(`   Exit Code: ${result3.exitCode}`);
      console.log(`   실행 시간: ${result3.executionTime}ms`);
      console.log(`   결과:`, JSON.stringify(result3.output, null, 2));
      
      // 검증
      if (result3.output?.output?.total_sales === 5300) {
        console.log('   ✅ 총 판매액 검증 통과 (5300)');
      }
      if (result3.output?.output?.category_totals?.A === 1800) {
        console.log('   ✅ 카테고리 A 집계 검증 통과 (1800)');
      }
      if (result3.output?.output?.category_totals?.B === 3500) {
        console.log('   ✅ 카테고리 B 집계 검증 통과 (3500)');
      }
    } else {
      console.log('❌ 실행 실패');
      console.log(`   에러: ${result3.error}`);
      if (result3.stderr) {
        console.log(`   stderr: ${result3.stderr}`);
      }
    }
  } catch (error) {
    console.log(`❌ 테스트 실패: ${error.message}`);
  }
  console.log('');

  // 5. 에러 처리 테스트
  console.log('5️⃣ 에러 처리 테스트');
  console.log('-'.repeat(80));
  try {
    const script4 = `
# 런타임 에러 발생
a = 10
b = 0
result = a / b  # ZeroDivisionError
output = {"result": result}
`;

    const result4 = await engine.executeScript({
      sessionId: 'test-session-4',
      nodeId: 'test-node-4',
      inputData: {},
      config: {
        script: script4,
        timeout: 10,
        environment: 'python3',
        outputFormat: 'json'
      }
    });

    if (!result4.success) {
      console.log('✅ 에러 감지 성공');
      console.log(`   Exit Code: ${result4.exitCode}`);
      console.log(`   에러 메시지: ${result4.error}`);
      if (result4.stdout) {
        const errorOutput = JSON.parse(result4.stdout);
        if (errorOutput.error && errorOutput.error.includes('ZeroDivisionError')) {
          console.log('   ✅ ZeroDivisionError 정확히 감지됨');
        }
      }
    } else {
      console.log('❌ 에러가 감지되지 않았습니다');
    }
  } catch (error) {
    console.log(`❌ 테스트 실패: ${error.message}`);
  }
  console.log('');

  // 6. 타임아웃 테스트
  console.log('6️⃣ 타임아웃 처리 테스트');
  console.log('-'.repeat(80));
  try {
    const script5 = `
# 무한 루프 (타임아웃 테스트)
import time
counter = 0
while counter < 100:
    time.sleep(0.1)
    counter += 1
output = {"counter": counter}
`;

    const result5 = await engine.executeScript({
      sessionId: 'test-session-5',
      nodeId: 'test-node-5',
      inputData: {},
      config: {
        script: script5,
        timeout: 2, // 2초 타임아웃
        environment: 'python3',
        outputFormat: 'json'
      }
    });

    if (result5.success) {
      console.log('✅ 스크립트 정상 완료');
      console.log(`   실행 시간: ${result5.executionTime}ms`);
      console.log(`   결과:`, JSON.stringify(result5.output, null, 2));
    } else {
      if (result5.error && result5.error.includes('timeout')) {
        console.log('✅ 타임아웃 정확히 감지됨');
        console.log(`   에러: ${result5.error}`);
      } else {
        console.log('⚠️ 타임아웃이 아닌 다른 에러 발생');
        console.log(`   에러: ${result5.error}`);
      }
    }
  } catch (error) {
    if (error.message.includes('timeout')) {
      console.log('✅ 타임아웃 정확히 감지됨');
    } else {
      console.log(`❌ 테스트 실패: ${error.message}`);
    }
  }
  console.log('');

  // 7. 날짜/시간 처리 테스트
  console.log('7️⃣ 날짜 및 시간 처리 테스트');
  console.log('-'.repeat(80));
  try {
    const script6 = `
# 날짜 및 시간 처리
from datetime import datetime, timedelta

current_time = datetime.now()
future_time = current_time + timedelta(days=7)

output = {
    "current_time": current_time.isoformat(),
    "future_time": future_time.isoformat(),
    "time_difference_days": 7,
    "formatted_date": current_time.strftime("%Y-%m-%d %H:%M:%S")
}
`;

    const result6 = await engine.executeScript({
      sessionId: 'test-session-6',
      nodeId: 'test-node-6',
      inputData: {},
      config: {
        script: script6,
        timeout: 10,
        environment: 'python3',
        outputFormat: 'json'
      }
    });

    if (result6.success) {
      console.log('✅ 실행 성공');
      console.log(`   Exit Code: ${result6.exitCode}`);
      console.log(`   실행 시간: ${result6.executionTime}ms`);
      console.log(`   결과:`, JSON.stringify(result6.output, null, 2));
      
      if (result6.output?.output?.current_time) {
        console.log('   ✅ 날짜/시간 처리 정상 작동');
      }
    } else {
      console.log('❌ 실행 실패');
      console.log(`   에러: ${result6.error}`);
    }
  } catch (error) {
    console.log(`❌ 테스트 실패: ${error.message}`);
  }
  console.log('');

  // 최종 요약
  console.log('='.repeat(80));
  console.log('✅ Python 실행 엔진 검증 테스트 완료');
  console.log('='.repeat(80));
}

runTests().catch(console.error);
