// 프롬프트 시딩 기능 테스트
console.log('🧪 프롬프트 시딩 기능 테스트 시작...');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프롬프트 파일 목록
const PROMPT_FILES = [
  {
    id: 'news_aoai',
    name: '뉴스 AOAI 분석',
    description: '뉴스 제목과 내용을 분석하여 광고성, 경제성, 시장성, 품질 점수를 매기는 프롬프트',
    file: 'data-processing-dev 2/prompts/news_aoai_prompt.txt',
    category: '뉴스분석'
  },
  {
    id: 'news_market_event',
    name: '뉴스 시장 이벤트 추출',
    description: '뉴스 헤드라인에서 주요 시장 이벤트를 추출하는 프롬프트',
    file: 'data-processing-dev 2/prompts/news_market_event_prompt.txt',
    category: '뉴스분석'
  },
  {
    id: 'news_market_event_content',
    name: '뉴스 시장 이벤트 상세 내용',
    description: '시장 이벤트의 상세 내용을 생성하는 프롬프트',
    file: 'data-processing-dev 2/prompts/news_market_event_content_prompt.txt',
    category: '뉴스분석'
  }
];

async function testPromptSeeding() {
  try {
    console.log('1️⃣ 프롬프트 파일 존재 여부 확인...');
    
    for (const promptConfig of PROMPT_FILES) {
      const filePath = path.join(__dirname, '..', promptConfig.file);
      
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${promptConfig.name}: 파일 존재`);
        
        // 파일 내용 확인
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`   📄 파일 크기: ${content.length} 문자`);
        console.log(`   📝 내용 미리보기: ${content.substring(0, 100)}...`);
      } else {
        console.log(`❌ ${promptConfig.name}: 파일 없음 - ${filePath}`);
      }
    }
    
    console.log('\n2️⃣ 프롬프트 템플릿 구조 분석...');
    
    for (const promptConfig of PROMPT_FILES) {
      const filePath = path.join(__dirname, '..', promptConfig.file);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 변수 패턴 분석
        const variableMatches = content.matchAll(/\{(\w+)\}/g);
        const variables = [...new Set([...variableMatches].map(match => match[1]))];
        
        console.log(`📋 ${promptConfig.name}:`);
        console.log(`   - 변수 개수: ${variables.length}`);
        if (variables.length > 0) {
          console.log(`   - 변수 목록: ${variables.join(', ')}`);
        }
        
        // 프롬프트 구조 분석
        const hasInstructions = content.includes('지시사항') || content.includes('요구사항');
        const hasExamples = content.includes('예시') || content.includes('예제');
        const hasOutputFormat = content.includes('출력') || content.includes('형식');
        
        console.log(`   - 지시사항 포함: ${hasInstructions ? '✅' : '❌'}`);
        console.log(`   - 예시 포함: ${hasExamples ? '✅' : '❌'}`);
        console.log(`   - 출력 형식 명시: ${hasOutputFormat ? '✅' : '❌'}`);
      }
    }
    
    console.log('\n3️⃣ 프롬프트 데이터베이스 등록 시뮬레이션...');
    
    // Mock 프롬프트 등록 시뮬레이션
    for (const promptConfig of PROMPT_FILES) {
      const filePath = path.join(__dirname, '..', promptConfig.file);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        const promptData = {
          id: promptConfig.id,
          name: promptConfig.name,
          description: promptConfig.description,
          systemPrompt: content,
          userPromptTemplate: '',
          parameters: {},
          category: promptConfig.category,
          isActive: true,
          createdBy: 'system'
        };
        
        console.log(`📝 ${promptConfig.name} 등록 데이터:`);
        console.log(`   - ID: ${promptData.id}`);
        console.log(`   - 카테고리: ${promptData.category}`);
        console.log(`   - 활성화: ${promptData.isActive}`);
        console.log(`   - 시스템 프롬프트 길이: ${promptData.systemPrompt.length} 문자`);
      }
    }
    
    console.log('\n4️⃣ 프롬프트 변수 해석 테스트...');
    
    // Mock SessionDataManager로 변수 해석 테스트
    class MockSessionDataManager {
      constructor() {
        this.data = new Map();
      }
      
      async storeData(key, value) {
        this.data.set(key, value);
      }
      
      async retrieveData(key) {
        return this.data.get(key) || null;
      }
      
      async resolveVariables(template) {
        let resolvedString = template;
        const matches = template.matchAll(/\{(\w+)\}/g);

        for (const match of matches) {
          const varName = match[1];
          const sessionValue = await this.retrieveData(varName);
          if (sessionValue !== null) {
            resolvedString = resolvedString.replace(new RegExp(`\\{${varName}\\}`, 'g'), JSON.stringify(sessionValue));
          }
        }
        return resolvedString;
      }
    }
    
    const sessionDataManager = new MockSessionDataManager();
    
    // 테스트 데이터 설정
    await sessionDataManager.storeData('news_data', {
      title: '삼성전자, 3분기 실적 발표',
      content: '매출 70조원 돌파...'
    });
    
    await sessionDataManager.storeData('analysis_context', {
      market_condition: '상승세',
      time_period: '3분기'
    });
    
    // 각 프롬프트의 변수 해석 테스트
    for (const promptConfig of PROMPT_FILES) {
      const filePath = path.join(__dirname, '..', promptConfig.file);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        try {
          const resolvedContent = await sessionDataManager.resolveVariables(content);
          console.log(`✅ ${promptConfig.name}: 변수 해석 성공`);
          console.log(`   - 원본 길이: ${content.length} 문자`);
          console.log(`   - 해석 후 길이: ${resolvedContent.length} 문자`);
          console.log(`   - 변수 치환 여부: ${content !== resolvedContent ? '✅' : '❌'}`);
        } catch (error) {
          console.log(`❌ ${promptConfig.name}: 변수 해석 실패 - ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 프롬프트 시딩 기능 테스트 완료!');
    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 프롬프트 파일 존재 여부 확인');
    console.log('   ✅ 프롬프트 구조 및 변수 분석');
    console.log('   ✅ 데이터베이스 등록 데이터 생성');
    console.log('   ✅ 변수 해석 기능 테스트');
    
  } catch (error) {
    console.error('❌ 프롬프트 시딩 테스트 실패:', error);
    console.error('스택 트레이스:', error.stack);
  }
}

testPromptSeeding();
