#!/bin/bash

# AITradeConsole 통합 테스트 스크립트
# 메뉴별 기능, 스키마, 코드 검증을 모두 실행합니다.

echo "🚀 AITradeConsole 통합 테스트 시작..."
echo "===================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 전체 테스트 결과
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# 테스트 스위트 실행 함수
run_test_suite() {
    local suite_name=$1
    local script_path=$2
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    
    echo ""
    echo -e "${BLUE}🧪 $suite_name 실행 중...${NC}"
    echo "================================"
    
    if [ -f "$script_path" ] && [ -x "$script_path" ]; then
        if bash "$script_path"; then
            echo -e "\n${GREEN}✅ $suite_name 완료${NC}"
            PASSED_SUITES=$((PASSED_SUITES + 1))
        else
            echo -e "\n${RED}❌ $suite_name 실패${NC}"
            FAILED_SUITES=$((FAILED_SUITES + 1))
        fi
    else
        echo -e "${RED}❌ $suite_name 스크립트를 찾을 수 없거나 실행 권한이 없습니다: $script_path${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
}

# 서버 상태 확인
echo "🔍 서버 상태 확인..."
if curl -s http://localhost:3000/api/system/status >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 서버가 실행 중입니다${NC}"
else
    echo -e "${RED}❌ 서버가 실행되지 않았습니다. 먼저 서버를 시작하세요.${NC}"
    echo "   실행 명령: PORT=3000 npm run dev"
    exit 1
fi

# 데이터베이스 연결 확인
echo "🔍 데이터베이스 연결 확인..."
if /usr/local/Cellar/postgresql@15/15.14/bin/psql aitradeconsole_local -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL 데이터베이스 연결 성공${NC}"
else
    echo -e "${RED}❌ PostgreSQL 데이터베이스 연결 실패${NC}"
    echo "   데이터베이스가 실행 중인지 확인하세요."
    exit 1
fi

echo ""
echo "📋 테스트 스위트 실행 시작"
echo "========================="

# 1. 스키마 검증 테스트
run_test_suite "데이터베이스 스키마 검증" "scripts/schema-validation-test.sh"

# 2. 코드 검증 테스트
run_test_suite "소스코드 검증" "scripts/code-validation-test.sh"

# 3. 메뉴별 기능 테스트
run_test_suite "메뉴별 기능 테스트" "scripts/menu-functionality-test.sh"

# 4. 프론트엔드 통합 테스트
run_test_suite "프론트엔드 통합 테스트" "scripts/frontend-integration-test.sh"

echo ""
echo "📊 통합 테스트 결과 요약"
echo "======================="
echo "총 테스트 스위트: $TOTAL_SUITES"
echo -e "성공: ${GREEN}$PASSED_SUITES${NC}"
echo -e "실패: ${RED}$FAILED_SUITES${NC}"

echo ""
echo "📋 상세 테스트 결과"
echo "=================="

if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 테스트 스위트가 통과했습니다!${NC}"
    echo ""
    echo "✅ 데이터베이스 스키마가 정상적으로 구성되어 있습니다."
    echo "✅ 소스코드가 정상적으로 구성되어 있습니다."
    echo "✅ 모든 메뉴 기능이 정상적으로 작동합니다."
    echo "✅ 프론트엔드 통합이 정상적으로 작동합니다."
    echo ""
    echo -e "${GREEN}AITradeConsole 시스템이 프로덕션 배포 준비가 완료되었습니다!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  일부 테스트 스위트가 실패했습니다.${NC}"
    echo ""
    echo "실패한 테스트 스위트:"
    if [ $FAILED_SUITES -gt 0 ]; then
        echo "  - 위의 실행 결과를 확인하여 문제를 해결하세요."
    fi
    echo ""
    echo -e "${YELLOW}권장사항:${NC}"
    echo "  1. 실패한 테스트의 상세 로그를 확인하세요."
    echo "  2. 데이터베이스 스키마 문제가 있다면 스키마를 재생성하세요."
    echo "  3. 소스코드 문제가 있다면 해당 파일을 수정하세요."
    echo "  4. 환경변수 설정을 확인하세요."
    echo "  5. 모든 테스트가 통과할 때까지 반복하세요."
    exit 1
fi
