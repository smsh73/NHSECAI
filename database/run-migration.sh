#!/bin/bash
# 마이그레이션 실행 스크립트: success_code 필드 추가
# 날짜: 2025-11-03

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}success_code 필드 추가 마이그레이션${NC}"
echo -e "${BLUE}================================================${NC}"

# 환경 변수 확인
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL 환경 변수가 설정되지 않았습니다.${NC}"
    echo -e "${YELLOW}다음 중 하나의 방법으로 설정해주세요:${NC}"
    echo -e "${YELLOW}1. .env 파일에 DATABASE_URL 추가${NC}"
    echo -e "${YELLOW}2. export DATABASE_URL='postgresql://user:pass@host:port/db'${NC}"
    echo -e "${YELLOW}3. 또는 직접 연결 정보를 입력하세요${NC}"
    echo ""
    read -p "데이터베이스 연결 정보를 입력하세요 (또는 Enter로 종료): " DB_URL
    
    if [ -z "$DB_URL" ]; then
        echo -e "${RED}✗ 마이그레이션이 취소되었습니다.${NC}"
        exit 1
    fi
    
    export DATABASE_URL="$DB_URL"
fi

echo -e "${GREEN}데이터베이스 URL: ${DATABASE_URL}${NC}"

# 마이그레이션 파일 확인
MIGRATION_FILE="database/migration-add-success-code.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}✗ 마이그레이션 파일을 찾을 수 없습니다: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}마이그레이션 파일: $MIGRATION_FILE${NC}"

# 데이터베이스 연결 테스트
echo -e "\n${YELLOW}[1/3] 데이터베이스 연결 테스트 중...${NC}"
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 데이터베이스 연결 성공${NC}"
else
    echo -e "${RED}✗ 데이터베이스 연결 실패${NC}"
    echo -e "${RED}연결 정보를 확인해주세요: $DATABASE_URL${NC}"
    exit 1
fi

# application_logs 테이블 존재 확인
echo -e "\n${YELLOW}[2/3] application_logs 테이블 확인 중...${NC}"
if psql "$DATABASE_URL" -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'application_logs'" | grep -q "1"; then
    echo -e "${GREEN}✓ application_logs 테이블 확인됨${NC}"
else
    echo -e "${RED}✗ application_logs 테이블이 존재하지 않습니다.${NC}"
    echo -e "${YELLOW}먼저 기본 스키마를 생성해야 합니다:${NC}"
    echo -e "${YELLOW}  ./database/init-database.sh${NC}"
    exit 1
fi

# success_code 컬럼 존재 여부 확인
echo -e "\n${YELLOW}[3/3] success_code 컬럼 확인 중...${NC}"
if psql "$DATABASE_URL" -c "SELECT 1 FROM information_schema.columns WHERE table_name = 'application_logs' AND column_name = 'success_code'" | grep -q "1"; then
    echo -e "${YELLOW}⚠️  success_code 컬럼이 이미 존재합니다.${NC}"
    read -p "마이그레이션을 계속 진행하시겠습니까? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        echo -e "${YELLOW}마이그레이션이 취소되었습니다.${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✓ success_code 컬럼이 없습니다. 마이그레이션 진행합니다.${NC}"
fi

# 마이그레이션 실행
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}마이그레이션 실행 중...${NC}"
echo -e "${BLUE}================================================${NC}"

if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
    echo -e "\n${GREEN}================================================${NC}"
    echo -e "${GREEN}✓ 마이그레이션 완료${NC}"
    echo -e "${GREEN}================================================${NC}"
    
    # 마이그레이션 결과 확인
    echo -e "\n${BLUE}마이그레이션 결과 확인:${NC}"
    psql "$DATABASE_URL" -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'application_logs' AND column_name = 'success_code';"
    
    echo -e "\n${GREEN}다음 단계:${NC}"
    echo -e "${GREEN}1. 애플리케이션을 재시작하여 변경된 로깅 로직이 적용되도록 합니다${NC}"
    echo -e "${GREEN}2. 새로운 로그를 생성하여 success_code가 저장되는지 확인합니다${NC}"
    echo -e "${GREEN}3. 로그 뷰어에서 success_code가 표시되는지 확인합니다${NC}"
else
    echo -e "\n${RED}================================================${NC}"
    echo -e "${RED}✗ 마이그레이션 실패${NC}"
    echo -e "${RED}================================================${NC}"
    exit 1
fi

