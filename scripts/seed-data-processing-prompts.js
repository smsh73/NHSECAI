import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프롬프트 파일들을 데이터베이스에 등록하는 스크립트
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

async function seedPrompts() {
  const { storage } = await import('../server/storage.js');
  
  console.log('프롬프트 시딩 시작...');
  
  for (const promptConfig of PROMPT_FILES) {
    try {
      const filePath = path.join(__dirname, '..', promptConfig.file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`파일을 찾을 수 없습니다: ${filePath}`);
        continue;
      }
      
      const promptText = fs.readFileSync(filePath, 'utf8');
      
      // 기존 프롬프트가 있는지 확인
      const existingPrompts = await storage.getPrompts();
      const existingPrompt = existingPrompts.find(p => p.name === promptConfig.name);
      
      if (existingPrompt) {
        console.log(`프롬프트 업데이트: ${promptConfig.name}`);
        await storage.updatePrompt(existingPrompt.id, {
          name: promptConfig.name,
          description: promptConfig.description,
          systemPrompt: promptText,
          userPromptTemplate: '',
          parameters: {},
          category: promptConfig.category,
          isActive: true
        });
      } else {
        console.log(`프롬프트 생성: ${promptConfig.name}`);
        await storage.createPrompt({
          name: promptConfig.name,
          description: promptConfig.description,
          systemPrompt: promptText,
          userPromptTemplate: '',
          parameters: {},
          category: promptConfig.category,
          isActive: true,
          createdBy: 'system'
        });
      }
      
      console.log(`✅ ${promptConfig.name} 처리 완료`);
    } catch (error) {
      console.error(`❌ ${promptConfig.name} 처리 실패:`, error.message);
    }
  }
  
  console.log('프롬프트 시딩 완료');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedPrompts().catch(console.error);
}

export { seedPrompts };
