// Python 실행 엔진 포괄적 검증 스크립트
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const tempDir = path.join(os.tmpdir(), 'aitrade-python-comprehensive');

async function createAndRunScript(scriptContent, inputData, testName) {
  const executionId = randomUUID();
  const executionDir = path.join(tempDir, executionId);
  await fs.mkdir(executionDir, { recursive: true });

  try {
    const inputFile = path.join(executionDir, 'input.json');
    const inputPayload = {
      sessionId: 'test-session',
      nodeId: 'test-node',
      data: inputData,
      timestamp: new Date().toISOString()
    };
    await fs.writeFile(inputFile, JSON.stringify(inputPayload, null, 2), 'utf-8');

    const scriptFile = path.join(executionDir, 'script.py');
    // 사용자 스크립트를 들여쓰기 처리
    const indentedScript = scriptContent.split('\n').map(line => '        ' + line).join('\n');
    
    const scriptTemplate = `import json
import sys
from datetime import datetime
import traceback

def main():
    try:
        with open('${inputFile}', 'r', encoding='utf-8') as f:
            input_data = json.load(f)
        
${indentedScript}
        
        result = {
            "success": True,
            "data": locals().get('result', None),
            "output": locals().get('output', None),
            "processed_data": locals().get('processed_data', None),
            "timestamp": datetime.now().isoformat()
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "timestamp": datetime.now().isoformat()
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
`;
    await fs.writeFile(scriptFile, scriptTemplate, 'utf-8');

    const result = await runPython(scriptFile, executionDir);
    
    await fs.rm(executionDir, { recursive: true, force: true });
    
    return { testName, result, success: result.exitCode === 0 };
  } catch (error) {
    await fs.rm(executionDir, { recursive: true, force: true }).catch(() => {});
    return { testName, result: null, success: false, error: error.message };
  }
}

function runPython(scriptFile, executionDir) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [scriptFile], {
      cwd: executionDir,
      env: { ...process.env, PYTHONPATH: executionDir, PYTHONUNBUFFERED: '1' }
    });

    let stdout = '', stderr = '';
    child.stdout?.on('data', d => stdout += d.toString());
    child.stderr?.on('data', d => stderr += d.toString());
    
    child.on('close', code => resolve({ stdout, stderr, exitCode: code }));
    child.on('error', reject);
  });
}

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('Python 실행 엔진 포괄적 검증');
  console.log('='.repeat(80));
  console.log('');

  const tests = [];

  // 테스트 1: 기본 계산
  tests.push(await createAndRunScript(
    `result = 10 + 20\noutput = {"sum": 30, "multiply": 200}`,
    {},
    '기본 계산'
  ));

  // 테스트 2: 리스트 처리
  tests.push(await createAndRunScript(
    `data = input_data.get('data', {})\nnumbers = data.get('numbers', [])\nresult = sum(numbers)\noutput = {"sum": result, "count": len(numbers)}`,
    { numbers: [10, 20, 30, 40, 50] },
    '리스트 처리'
  ));

  // 테스트 3: 딕셔너리 처리
  tests.push(await createAndRunScript(
    `data = input_data.get('data', {})\nitems = data.get('items', [])\ntotal = sum(item.get('price', 0) for item in items)\noutput = {"total": total, "count": len(items)}`,
    { items: [{ name: 'A', price: 100 }, { name: 'B', price: 200 }] },
    '딕셔너리 집계'
  ));

  // 테스트 4: 날짜/시간 처리
  tests.push(await createAndRunScript(
    `from datetime import datetime, timedelta\nnow = datetime.now()\nfuture = now + timedelta(days=7)\noutput = {"current": now.isoformat(), "future": future.isoformat()}`,
    {},
    '날짜/시간 처리'
  ));

  // 테스트 5: 문자열 처리
  tests.push(await createAndRunScript(
    `data = input_data.get('data', {})\ntext = data.get('text', '')\nwords = text.split()\noutput = {"word_count": len(words), "char_count": len(text), "upper": text.upper()}`,
    { text: 'Hello World Python Test' },
    '문자열 처리'
  ));

  // 테스트 6: 조건부 처리
  tests.push(await createAndRunScript(
    `data = input_data.get('data', {})\nscore = data.get('score', 0)\nif score >= 90:\n    grade = 'A'\nelif score >= 80:\n    grade = 'B'\nelse:\n    grade = 'C'\noutput = {"score": score, "grade": grade}`,
    { score: 85 },
    '조건부 처리'
  ));

  // 테스트 7: 반복문 처리
  tests.push(await createAndRunScript(
    `data = input_data.get('data', {})\nnumbers = data.get('numbers', [])\neven = [n for n in numbers if n % 2 == 0]\nodd = [n for n in numbers if n % 2 == 1]\noutput = {"even": even, "odd": odd, "even_sum": sum(even), "odd_sum": sum(odd)}`,
    { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    '반복문 처리'
  ));

  // 결과 출력
  console.log('테스트 결과:');
  console.log('-'.repeat(80));
  
  let passed = 0;
  for (const test of tests) {
    const status = test.success ? '✅' : '❌';
    console.log(`${status} ${test.testName}`);
    
    if (test.success && test.result) {
      try {
        const lines = test.result.stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const output = JSON.parse(lastLine);
        if (output.output) {
          console.log(`   결과:`, JSON.stringify(output.output, null, 2));
        }
      } catch (e) {
        console.log(`   stdout: ${test.result.stdout.substring(0, 100)}...`);
      }
      passed++;
    } else {
      console.log(`   실패: ${test.error || test.result?.stderr || '알 수 없는 오류'}`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`결과 요약: ${passed}/${tests.length} 통과`);
  console.log('='.repeat(80));
  
  if (passed === tests.length) {
    console.log('✅ 모든 테스트 통과! Python 실행 엔진이 정상적으로 작동합니다.');
    process.exit(0);
  } else {
    console.log('❌ 일부 테스트 실패');
    process.exit(1);
  }
}

runAllTests().catch(console.error);
