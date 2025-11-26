import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PythonExecutionEngine } from '../services/python-execution-engine.js';

describe('Python Execution Engine - 실제 실행 검증', () => {
  let engine: PythonExecutionEngine;

  beforeAll(() => {
    engine = new PythonExecutionEngine();
  });

  afterAll(async () => {
    await engine.terminateAllExecutions();
  });

  describe('Python 환경 검증', () => {
    it('Python3가 설치되어 있어야 함', async () => {
      const result = await engine.validatePythonEnvironment();
      expect(result.available).toBe(true);
      expect(result.version).toBeDefined();
      expect(result.version).toContain('Python');
      console.log('✅ Python 버전:', result.version);
    });
  });

  describe('기본 실행 테스트', () => {
    it('간단한 계산 스크립트 실행', async () => {
      const script = `
# 간단한 계산
a = 10
b = 20
result = a + b
output = {"sum": result, "multiply": a * b}
`;

      const result = await engine.executeScript({
        sessionId: 'test-session-1',
        nodeId: 'test-node-1',
        inputData: {},
        config: {
          script,
          timeout: 10,
          environment: 'python3',
          outputFormat: 'json'
        }
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBeDefined();
      expect(result.output.success).toBe(true);
      expect(result.output.data?.sum).toBe(30);
      expect(result.output.data?.multiply).toBe(200);
      
      console.log('✅ 계산 결과:', JSON.stringify(result.output, null, 2));
    });

    it('입력 데이터 처리 스크립트 실행', async () => {
      const inputData = {
        numbers: [1, 2, 3, 4, 5],
        operation: 'sum'
      };

      const script = `
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
    "result": result_value
}
`;

      const result = await engine.executeScript({
        sessionId: 'test-session-2',
        nodeId: 'test-node-2',
        inputData,
        config: {
          script,
          timeout: 10,
          environment: 'python3',
          outputFormat: 'json'
        }
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBeDefined();
      expect(result.output.success).toBe(true);
      expect(result.output.output?.operation).toBe('sum');
      expect(result.output.output?.numbers).toEqual([1, 2, 3, 4, 5]);
      expect(result.output.output?.result).toBe(15);
      
      console.log('✅ 입력 데이터 처리 결과:', JSON.stringify(result.output, null, 2));
    });

    it('리스트 처리 및 변환 스크립트', async () => {
      const inputData = {
        items: [
          { name: 'Apple', price: 1000 },
          { name: 'Banana', price: 500 },
          { name: 'Cherry', price: 1500 }
        ]
      };

      const script = `
# 리스트 처리 및 변환
data = input_data.get('data', {})
items = data.get('items', [])

# 가격이 1000 이상인 항목 필터링
filtered_items = [item for item in items if item.get('price', 0) >= 1000]

# 총합 계산
total_price = sum(item.get('price', 0) for item in items)

# 결과 생성
output = {
    "total_items": len(items),
    "filtered_items": filtered_items,
    "total_price": total_price,
    "average_price": total_price / len(items) if items else 0
}
`;

      const result = await engine.executeScript({
        sessionId: 'test-session-3',
        nodeId: 'test-node-3',
        inputData,
        config: {
          script,
          timeout: 10,
          environment: 'python3',
          outputFormat: 'json'
        }
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBeDefined();
      expect(result.output.success).toBe(true);
      expect(result.output.output?.total_items).toBe(3);
      expect(result.output.output?.filtered_items.length).toBe(2);
      expect(result.output.output?.total_price).toBe(3000);
      expect(result.output.output?.average_price).toBe(1000);
      
      console.log('✅ 리스트 처리 결과:', JSON.stringify(result.output, null, 2));
    });
  });

  describe('에러 처리 테스트', () => {
    it('Python 구문 에러 처리', async () => {
      const script = `
# 구문 에러가 있는 스크립트
a = 10
b = 20
result = a + b  # 닫히지 않은 문자열
invalid = "error
output = {"result": result}
`;

      const result = await engine.executeScript({
        sessionId: 'test-session-4',
        nodeId: 'test-node-4',
        inputData: {},
        config: {
          script,
          timeout: 10,
          environment: 'python3',
          outputFormat: 'json'
        }
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.error).toBeDefined();
      expect(result.stderr).toBeDefined();
      
      console.log('✅ 구문 에러 감지:', result.error);
    });

    it('런타임 에러 처리', async () => {
      const script = `
# 런타임 에러가 발생하는 스크립트
a = 10
b = 0
result = a / b  # ZeroDivisionError
output = {"result": result}
`;

      const result = await engine.executeScript({
        sessionId: 'test-session-5',
        nodeId: 'test-node-5',
        inputData: {},
        config: {
          script,
          timeout: 10,
          environment: 'python3',
          outputFormat: 'json'
        }
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.error).toBeDefined();
      expect(result.stdout).toContain('ZeroDivisionError');
      
      console.log('✅ 런타임 에러 감지:', result.error);
    });
  });

  describe('타임아웃 테스트', () => {
    it('무한 루프 타임아웃 처리', async () => {
      const script = `
# 무한 루프 (타임아웃 테스트)
import time
while True:
    time.sleep(1)
output = {"result": "never reached"}
`;

      const result = await engine.executeScript({
        sessionId: 'test-session-6',
        nodeId: 'test-node-6',
        inputData: {},
        config: {
          script,
          timeout: 2, // 2초 타임아웃
          environment: 'python3',
          outputFormat: 'json'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      
      console.log('✅ 타임아웃 처리:', result.error);
    }, 10000); // 10초 최대 실행 시간
  });

  describe('복잡한 데이터 처리', () => {
    it('JSON 데이터 변환 및 집계', async () => {
      const inputData = {
        sales: [
          { date: '2025-01-01', amount: 1000, category: 'A' },
          { date: '2025-01-02', amount: 1500, category: 'B' },
          { date: '2025-01-03', amount: 800, category: 'A' },
          { date: '2025-01-04', amount: 2000, category: 'B' },
        ]
      };

      const script = `
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

      const result = await engine.executeScript({
        sessionId: 'test-session-7',
        nodeId: 'test-node-7',
        inputData,
        config: {
          script,
          timeout: 10,
          environment: 'python3',
          outputFormat: 'json'
        }
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBeDefined();
      expect(result.output.success).toBe(true);
      expect(result.output.output?.total_sales).toBe(5300);
      expect(result.output.output?.category_totals?.A).toBe(1800);
      expect(result.output.output?.category_totals?.B).toBe(3500);
      expect(result.output.output?.max_amount).toBe(2000);
      expect(result.output.output?.min_amount).toBe(800);
      expect(result.output.output?.average_amount).toBe(1325);
      
      console.log('✅ 데이터 집계 결과:', JSON.stringify(result.output, null, 2));
    });

    it('날짜 및 시간 처리', async () => {
      const script = `
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

      const result = await engine.executeScript({
        sessionId: 'test-session-8',
        nodeId: 'test-node-8',
        inputData: {},
        config: {
          script,
          timeout: 10,
          environment: 'python3',
          outputFormat: 'json'
        }
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBeDefined();
      expect(result.output.success).toBe(true);
      expect(result.output.output?.current_time).toBeDefined();
      expect(result.output.output?.future_time).toBeDefined();
      expect(result.output.output?.time_difference_days).toBe(7);
      
      console.log('✅ 날짜 처리 결과:', JSON.stringify(result.output, null, 2));
    });
  });

  describe('실행 성능 테스트', () => {
    it('대량 데이터 처리', async () => {
      const inputData = {
        numbers: Array.from({ length: 1000 }, (_, i) => i + 1)
      };

      const script = `
# 대량 데이터 처리
data = input_data.get('data', {})
numbers = data.get('numbers', [])

# 통계 계산
total = sum(numbers)
count = len(numbers)
average = total / count if count > 0 else 0
max_val = max(numbers) if numbers else 0
min_val = min(numbers) if numbers else 0

output = {
    "total": total,
    "count": count,
    "average": average,
    "max": max_val,
    "min": min_val
}
`;

      const startTime = Date.now();
      const result = await engine.executeScript({
        sessionId: 'test-session-9',
        nodeId: 'test-node-9',
        inputData,
        config: {
          script,
          timeout: 30,
          environment: 'python3',
          outputFormat: 'json'
        }
      });
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBeDefined();
      expect(result.output.output?.total).toBe(500500); // 1+2+...+1000
      expect(result.output.output?.count).toBe(1000);
      expect(result.output.output?.max).toBe(1000);
      expect(result.output.output?.min).toBe(1);
      
      console.log(`✅ 대량 데이터 처리 완료 (${executionTime}ms)`);
      console.log('결과:', JSON.stringify(result.output, null, 2));
    });
  });
});
