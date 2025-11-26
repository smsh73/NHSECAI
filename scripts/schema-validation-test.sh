#!/bin/bash

# AITradeConsole 데이터베이스 스키마 검증 스크립트
# PostgreSQL 스키마의 무결성과 외래키 제약조건을 검증합니다.

echo "🔍 AITradeConsole 데이터베이스 스키마 검증 시작..."
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PostgreSQL 연결 정보
DB_NAME="aitradeconsole_local"
PSQL_CMD="/usr/local/Cellar/postgresql@15/15.14/bin/psql $DB_NAME"

# 테스트 결과 카운터
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 테스트 함수
test_schema() {
    local test_name=$1
    local sql_query=$2
    local expected_result=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "  테스트: $test_name... "
    
    result=$(echo "$sql_query" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
    
    if [ "$result" = "$expected_result" ]; then
        echo -e "${GREEN}✅ 통과${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 실패 (결과: $result)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 테이블 존재 검증 함수
check_table_exists() {
    local table_name=$1
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "  테이블: $table_name... "
    
    result=$(echo "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table_name');" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
    
    if [ "$result" = "t" ]; then
        echo -e "${GREEN}✅ 존재${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 없음${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 외래키 제약조건 검증 함수
check_foreign_key() {
    local constraint_name=$1
    local description=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "  외래키: $constraint_name... "
    
    result=$(echo "SELECT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = '$constraint_name' AND constraint_type = 'FOREIGN KEY');" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
    
    if [ "$result" = "t" ]; then
        echo -e "${GREEN}✅ 존재${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 없음${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo ""
echo "📋 핵심 테이블 존재 검증"
echo "======================="

check_table_exists "prompts"
check_table_exists "api_calls"
check_table_exists "workflows"
check_table_exists "workflow_sessions"
check_table_exists "workflow_nodes"
check_table_exists "workflow_node_executions"
check_table_exists "workflow_session_data"
check_table_exists "schedules"
check_table_exists "news_data"
check_table_exists "financial_data"
check_table_exists "themes"
check_table_exists "audit_logs"
check_table_exists "security_events"
check_table_exists "data_access_logs"
check_table_exists "dictionary_entries"

echo ""
echo "🔗 외래키 제약조건 검증"
echo "======================"

check_foreign_key "news_data_theme_cluster_id_themes_id_fk" "뉴스 데이터 → 테마"
check_foreign_key "workflow_session_data_session_id_workflow_sessions_id_fk" "워크플로우 세션 데이터 → 워크플로우 세션"
check_foreign_key "workflow_nodes_workflow_id_workflows_id_fk" "워크플로우 노드 → 워크플로우"
check_foreign_key "workflow_node_executions_session_id_workflow_sessions_id_fk" "워크플로우 노드 실행 → 워크플로우 세션"
check_foreign_key "workflow_node_executions_node_id_workflow_nodes_id_fk" "워크플로우 노드 실행 → 워크플로우 노드"

echo ""
echo "📊 데이터 무결성 검증"
echo "===================="

echo "📋 필수 참조 데이터 검증:"

# themes 테이블에 필수 데이터 확인
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "  테마 데이터 (tech-innovation)... "
result=$(echo "SELECT COUNT(*) FROM themes WHERE id = 'tech-innovation';" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
if [ "$result" = "1" ]; then
    echo -e "${GREEN}✅ 존재${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 없음${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "  테마 데이터 (materials)... "
result=$(echo "SELECT COUNT(*) FROM themes WHERE id = 'materials';" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
if [ "$result" = "1" ]; then
    echo -e "${GREEN}✅ 존재${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 없음${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "🔍 스키마 구조 검증"
echo "=================="

# prompts 테이블 구조 검증
echo "📋 prompts 테이블 구조:"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "  컬럼: id... "
result=$(echo "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'id');" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
if [ "$result" = "t" ]; then
    echo -e "${GREEN}✅ 존재${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 없음${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "  컬럼: inputSchema... "
result=$(echo "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'inputSchema');" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
if [ "$result" = "t" ]; then
    echo -e "${GREEN}✅ 존재${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 없음${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "  컬럼: outputSchema... "
result=$(echo "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'prompts' AND column_name = 'outputSchema');" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
if [ "$result" = "t" ]; then
    echo -e "${GREEN}✅ 존재${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 없음${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# api_calls 테이블 구조 검증
echo "📋 api_calls 테이블 구조:"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "  컬럼: requestSchema... "
result=$(echo "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_calls' AND column_name = 'requestSchema');" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
if [ "$result" = "t" ]; then
    echo -e "${GREEN}✅ 존재${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 없음${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "  컬럼: responseSchema... "
result=$(echo "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'api_calls' AND column_name = 'responseSchema');" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
if [ "$result" = "t" ]; then
    echo -e "${GREEN}✅ 존재${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ 없음${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "🧪 데이터 삽입 테스트"
echo "===================="

# 워크플로우 세션 생성 테스트
echo "📋 워크플로우 세션 생성 테스트:"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "  테스트 세션 생성... "
result=$(echo "INSERT INTO workflow_sessions (id, sessionName, workflowId, status) VALUES ('test-session-schema', 'Schema Test Session', 'test-workflow', 'pending') RETURNING id;" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
if [ "$result" = "test-session-schema" ]; then
    echo -e "${GREEN}✅ 성공${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    # 테스트 데이터 정리
    echo "DELETE FROM workflow_sessions WHERE id = 'test-session-schema';" | $PSQL_CMD -c >/dev/null 2>&1
else
    echo -e "${RED}❌ 실패${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 프롬프트 생성 테스트
echo "📋 프롬프트 생성 테스트:"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "  테스트 프롬프트 생성... "
result=$(echo "INSERT INTO prompts (id, name, systemPrompt, userPromptTemplate, executionType) VALUES ('test-prompt-schema', 'Schema Test Prompt', 'Test system prompt', 'Test user prompt', 'json') RETURNING id;" | $PSQL_CMD -t -c 2>/dev/null | tr -d ' \n')
if [ "$result" = "test-prompt-schema" ]; then
    echo -e "${GREEN}✅ 성공${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    # 테스트 데이터 정리
    echo "DELETE FROM prompts WHERE id = 'test-prompt-schema';" | $PSQL_CMD -c >/dev/null 2>&1
else
    echo -e "${RED}❌ 실패${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "📊 스키마 검증 결과 요약"
echo "======================"
echo "총 테스트: $TOTAL_TESTS"
echo -e "성공: ${GREEN}$PASSED_TESTS${NC}"
echo -e "실패: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 모든 스키마 검증이 통과했습니다!"
    echo -e "${GREEN}데이터베이스 스키마가 정상적으로 구성되어 있습니다.${NC}"
    exit 0
else
    echo -e "\n⚠️  일부 스키마 검증이 실패했습니다. 위의 결과를 확인하세요."
    echo -e "${RED}데이터베이스 스키마에 문제가 있을 수 있습니다.${NC}"
    exit 1
fi
