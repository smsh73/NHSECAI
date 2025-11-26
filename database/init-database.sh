#!/bin/bash
# Database Initialization Script
# 금융보안원 감사 기준 로깅 시스템 및 서비스 관리 데이터베이스 초기화

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}데이터베이스 초기화 시작${NC}"
echo -e "${GREEN}================================================${NC}"

# 환경 변수 확인
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}DATABASE_URL이 설정되지 않았습니다. .env 파일을 확인하세요.${NC}"
    exit 1
fi

echo -e "${GREEN}데이터베이스 URL: ${DATABASE_URL}${NC}"

# 데이터베이스 이름 추출
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
echo -e "${GREEN}데이터베이스 이름: ${DB_NAME}${NC}"

# 1. 감사 로깅 스키마 생성
echo -e "\n${YELLOW}[1/3] 감사 로깅 스키마 생성 중...${NC}"
psql $DATABASE_URL -f database/schema-audit-logging.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 감사 로깅 스키마 생성 완료${NC}"
else
    echo -e "${RED}✗ 감사 로깅 스키마 생성 실패${NC}"
    exit 1
fi

# 2. 서비스 관리 스키마 생성
echo -e "\n${YELLOW}[2/3] 서비스 관리 스키마 생성 중...${NC}"
psql $DATABASE_URL -f database/schema-service-management.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 서비스 관리 스키마 생성 완료${NC}"
else
    echo -e "${RED}✗ 서비스 관리 스키마 생성 실패${NC}"
    exit 1
fi

# 3. Drizzle 마이그레이션 실행
echo -e "\n${YELLOW}[3/3] Drizzle 마이그레이션 실행 중...${NC}"
npm run db:push
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Drizzle 마이그레이션 완료${NC}"
else
    echo -e "${RED}✗ Drizzle 마이그레이션 실패${NC}"
    exit 1
fi

# 완료 메시지
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}데이터베이스 초기화 완료${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}생성된 테이블:${NC}"
echo -e "${GREEN}- audit_logs${NC}"
echo -e "${GREEN}- data_access_logs${NC}"
echo -e "${GREEN}- security_events${NC}"
echo -e "${GREEN}- audit_reports${NC}"
echo -e "${GREEN}- services${NC}"
echo -e "${GREEN}- prompts${NC}"
echo -e "${GREEN}- api_calls${NC}"
echo -e "${GREEN}- users${NC}"
echo -e "${GREEN}- azure_configurations${NC}"
echo -e "${GREEN}- workflow_executions${NC}"
echo -e "${NC}"
