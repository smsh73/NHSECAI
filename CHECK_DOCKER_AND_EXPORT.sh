#!/bin/bash

# Check Docker and Run All Exports
# Docker 설치 후 모든 export를 실행하는 스크립트

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}=== Docker 확인 및 모든 Export 실행 ===${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if Docker is installed
echo -e "\n${YELLOW}1. Docker 설치 확인...${NC}"
if command -v docker >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker 설치됨: $(docker --version)${NC}"
else
    echo -e "${RED}❌ Docker가 설치되지 않았습니다${NC}"
    echo -e "\n${YELLOW}Docker Desktop 설치 방법:${NC}"
    echo -e "  1. https://www.docker.com/products/docker-desktop/ 방문"
    echo -e "  2. Docker Desktop 다운로드 및 설치"
    echo -e "  3. Docker Desktop 실행"
    echo -e "  4. 이 스크립트를 다시 실행하세요"
    exit 1
fi

# Check if Docker is running
echo -e "\n${YELLOW}2. Docker 실행 상태 확인...${NC}"
if docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker 실행 중${NC}"
else
    echo -e "${YELLOW}⚠️  Docker가 실행되지 않습니다${NC}"
    echo -e "${YELLOW}Docker Desktop을 시작하는 중...${NC}"
    
    # Try to start Docker Desktop
    open -a "Docker" 2>/dev/null || open -a "Docker Desktop" 2>/dev/null || {
        echo -e "${RED}❌ Docker Desktop을 자동으로 시작할 수 없습니다${NC}"
        echo -e "${YELLOW}수동으로 Docker Desktop을 실행하고 다시 시도하세요${NC}"
        exit 1
    }
    
    echo -e "${YELLOW}Docker Desktop이 시작될 때까지 대기 중...${NC}"
    for i in {1..30}; do
        sleep 2
        if docker info >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Docker 실행됨${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Docker 시작 시간 초과${NC}"
            echo -e "${YELLOW}Docker Desktop이 완전히 시작될 때까지 기다린 후 다시 시도하세요${NC}"
            exit 1
        fi
    done
fi

# Run all exports
echo -e "\n${YELLOW}3. 모든 Export 실행...${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
./export-all.sh

echo -e "\n${GREEN}=== 모든 작업 완료 ===${NC}"
