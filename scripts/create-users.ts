import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const initialPassword = 'NH123456789!';

const userAccounts = [
  { name: '박성범', email: 'mydream1208@nhsec.com' },
  { name: '김기태', email: 'kimkitae@nhsec.com' },
  { name: '이재근', email: 'jaekeun@nhsec.com' },
  { name: '정하영', email: 'hy.jung@nhsec.com' },
  { name: '이현정', email: 'hjlee@nhsec.com' },
  { name: '김정국', email: 'kjg121@nhsec.com' },
  { name: '김윤철', email: 'kyc672@nhsec.com' },
  { name: '김태훈', email: 'kth3276@nhsec.com' },
  { name: '위승종', email: 'dnltmdwhd@nhsec.com' },
  { name: '백우현', email: '64622@nhsec.com' },
  { name: '관리자', email: 'admin@nhsec.com' },
];

async function createUsers() {
  console.log('사용자 계정 생성 시작...');
  
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(initialPassword, saltRounds);
  
  for (const account of userAccounts) {
    try {
      // 기존 사용자 확인
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.username, account.email));
      
      if (existingUsers.length > 0) {
        console.log(`✓ ${account.name} (${account.email}) - 이미 존재하는 계정입니다.`);
        continue;
      }
      
      // 새 사용자 생성
      await db.insert(users).values({
        username: account.email,
        hashedPassword: hashedPassword,
        role: 'admin', // 기본 역할을 admin으로 설정
      });
      
      console.log(`✓ ${account.name} (${account.email}) - 계정이 생성되었습니다.`);
    } catch (error: any) {
      console.error(`✗ ${account.name} (${account.email}) - 생성 실패:`, error.message);
    }
  }
  
  console.log('\n사용자 계정 생성 완료!');
  console.log(`초기 비밀번호: ${initialPassword}`);
  console.log('모든 사용자는 이메일 주소로 로그인할 수 있습니다.');
  
  process.exit(0);
}

createUsers().catch((error) => {
  console.error('오류 발생:', error);
  process.exit(1);
});

