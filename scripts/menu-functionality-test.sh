#!/bin/bash

# AITradeConsole 메뉴별 기능 테스트 스크립트
# 각 메뉴의 소스코드, 데이터소스, 환경변수, API 엔드포인트를 검증합니다.

echo "🧪 AITradeConsole 메뉴별 기능 테스트 시작..."
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 테스트 결과 카운터
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 테스트 함수
test_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local test_name=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "  테스트: $test_name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ 통과${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 실패 (HTTP $response)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 환경변수 검증 함수
check_env_var() {
    local var_name=$1
    local required=$2
    
    if [ -n "${!var_name}" ]; then
        echo -e "    ${GREEN}✅ $var_name: 설정됨${NC}"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "    ${RED}❌ $var_name: 필수 환경변수 누락${NC}"
            return 1
        else
            echo -e "    ${YELLOW}⚠️  $var_name: 선택적 환경변수 누락${NC}"
            return 0
        fi
    fi
}

# 소스코드 파일 존재 검증 함수
check_source_file() {
    local file_path=$1
    local file_type=$2
    
    if [ -f "$file_path" ]; then
        echo -e "    ${GREEN}✅ $file_type: $file_path${NC}"
        return 0
    else
        echo -e "    ${RED}❌ $file_type: $file_path (파일 없음)${NC}"
        return 1
    fi
}

echo ""
echo "🏠 홈 & 대시보드 테스트"
echo "======================="

echo "📋 통합 대시보드 (/dashboard) 테스트:"
check_source_file "client/src/pages/home.tsx" "메인 대시보드 페이지"
check_source_file "client/src/components/common/hero-section.tsx" "히어로 섹션"
check_source_file "client/src/components/common/primary-actions.tsx" "주요 액션 카드"
check_source_file "client/src/components/common/recent-analysis.tsx" "최근 분석 결과"
check_source_file "client/src/components/common/news-alerts.tsx" "뉴스 및 알림"

echo "  환경변수 검증:"
check_env_var "DATABASE_URL" "true"
check_env_var "NODE_ENV" "false"
check_env_var "PORT" "false"

echo "  API 엔드포인트 테스트:"
test_endpoint "/api/system/status" "200" "시스템 상태 조회"
test_endpoint "/api/prompts" "200" "프롬프트 목록"
test_endpoint "/api/api-calls" "200" "API 호출 목록"
test_endpoint "/api/workflows" "200" "워크플로우 목록"

echo ""
echo "🔄 워크플로우 관리 테스트"
echo "========================"

echo "📋 워크플로우 편집기 (/workflow-editor) 테스트:"
check_source_file "client/src/pages/workflow-editor.tsx" "워크플로우 편집기 페이지"
check_source_file "client/src/components/workflow/WorkflowCanvas.tsx" "워크플로우 캔버스"
check_source_file "client/src/components/workflow/NodePalette.tsx" "노드 팔레트"
check_source_file "client/src/components/workflow/NodeEditor.tsx" "노드 편집기"
check_source_file "server/services/workflow-engine.ts" "워크플로우 실행 엔진"
check_source_file "server/services/workflow-execution-engine.ts" "워크플로우 실행 서비스"

echo "  환경변수 검증:"
check_env_var "DATABASE_URL" "true"
check_env_var "DATABRICKS_HOST" "false"
check_env_var "DATABRICKS_TOKEN" "false"
check_env_var "DATABRICKS_HTTP_PATH" "false"
check_env_var "AZURE_OPENAI_API_KEY" "false"
check_env_var "AZURE_OPENAI_ENDPOINT" "false"
check_env_var "AZURE_OPENAI_DEPLOYMENT_NAME" "false"
check_env_var "AZURE_OPENAI_API_VERSION" "false"

echo "  API 엔드포인트 테스트:"
test_endpoint "/api/workflows" "200" "워크플로우 목록"
test_endpoint "/api/workflows/sessions" "405" "워크플로우 세션 생성 (POST 필요)"

echo "📋 실행 스케줄러 (/scheduler) 테스트:"
check_source_file "client/src/pages/scheduler.tsx" "스케줄러 관리 페이지"
check_source_file "server/services/scheduler.ts" "스케줄러 서비스"

echo "📋 워크플로우 모니터 (/workflow-monitor) 테스트:"
check_source_file "client/src/pages/workflow-monitor.tsx" "모니터링 페이지"
check_source_file "client/src/hooks/useWorkflowStatus.ts" "워크플로우 상태 훅"

echo ""
echo "🗄️ 데이터 관리 테스트"
echo "===================="

echo "📋 스키마 브라우저 (/schema-browser) 테스트:"
check_source_file "client/src/pages/schema-browser.tsx" "스키마 브라우저 페이지"

echo "📋 RAG 검색엔진 테스트:"
check_source_file "client/src/pages/rag-search.tsx" "RAG 검색 페이지"
check_source_file "server/services/rag.ts" "RAG 서비스"
check_source_file "server/services/ragService.ts" "RAG 서비스 구현"

echo "  환경변수 검증:"
check_env_var "DATABASE_URL" "true"
check_env_var "DATABRICKS_HOST" "false"
check_env_var "DATABRICKS_TOKEN" "false"
check_env_var "DATABRICKS_HTTP_PATH" "false"
check_env_var "AZURE_SEARCH_ENDPOINT" "false"
check_env_var "AZURE_SEARCH_API_KEY" "false"
check_env_var "AZURE_SEARCH_INDEX_NAME" "false"
check_env_var "AZURE_OPENAI_API_KEY" "false"
check_env_var "AZURE_OPENAI_ENDPOINT" "false"
check_env_var "AZURE_OPENAI_DEPLOYMENT_NAME" "false"
check_env_var "AZURE_OPENAI_API_VERSION" "false"

echo "📋 NL to SQL 엔진 (/nl2sql-engine) 테스트:"
check_source_file "client/src/pages/nl2sql-engine.tsx" "NL2SQL 엔진 페이지"
check_source_file "server/services/nl2sql.ts" "NL2SQL 서비스"

echo "📋 스키마 의미 매핑 (/schema-mapper) 테스트:"
check_source_file "client/src/pages/schema-mapper.tsx" "스키마 매핑 페이지"

echo "📋 Dictionary 관리 (/dictionary-manager) 테스트:"
check_source_file "client/src/pages/dictionary-manager.tsx" "Dictionary 관리 페이지"

echo "  API 엔드포인트 테스트:"
test_endpoint "/api/dictionaries/default/entries" "200" "Dictionary 항목 조회"

echo "📋 테마 클러스터 관리 (/theme-cluster-management) 테스트:"
check_source_file "client/src/pages/theme-cluster-management.tsx" "테마 클러스터 관리 페이지"

echo ""
echo "🤖 AI 시스템 관리 테스트"
echo "======================="

echo "📋 프롬프트 관리 (/prompt-management) 테스트:"
check_source_file "client/src/pages/prompt-management.tsx" "프롬프트 관리 페이지"
check_source_file "server/services/json-prompt-execution-engine.ts" "JSON 프롬프트 실행 엔진"

echo "  환경변수 검증:"
check_env_var "DATABASE_URL" "true"
check_env_var "AZURE_OPENAI_API_KEY" "false"
check_env_var "AZURE_OPENAI_ENDPOINT" "false"
check_env_var "AZURE_OPENAI_DEPLOYMENT_NAME" "false"
check_env_var "AZURE_OPENAI_API_VERSION" "false"

echo "  API 엔드포인트 테스트:"
test_endpoint "/api/prompts" "200" "프롬프트 목록"
test_endpoint "/api/prompts/test" "405" "프롬프트 테스트 (POST 필요)"

echo "📋 API 관리 (/api-management) 테스트:"
check_source_file "client/src/pages/api-management.tsx" "API 관리 페이지"
check_source_file "server/services/api-call-engine.ts" "API 호출 엔진"

echo "  API 엔드포인트 테스트:"
test_endpoint "/api/api-calls" "200" "API 목록"
test_endpoint "/api/api-calls/test" "405" "API 테스트 (POST 필요)"

echo "📋 Azure 설정 (/azure-config) 테스트:"
check_source_file "client/src/pages/azure-config.tsx" "Azure 설정 페이지"
check_source_file "server/services/azure-config.ts" "Azure 설정 서비스"
check_source_file "server/services/azure-environment-validator.ts" "Azure 환경 검증"

echo "  환경변수 검증:"
check_env_var "DATABASE_URL" "true"
check_env_var "DATABRICKS_HOST" "false"
check_env_var "DATABRICKS_TOKEN" "false"
check_env_var "DATABRICKS_HTTP_PATH" "false"
check_env_var "COSMOSDB_ENDPOINT" "false"
check_env_var "COSMOSDB_KEY" "false"
check_env_var "COSMOSDB_DATABASE_NAME" "false"
check_env_var "COSMOSDB_CONTAINER_NAME" "false"
check_env_var "AZURE_SEARCH_ENDPOINT" "false"
check_env_var "AZURE_SEARCH_API_KEY" "false"
check_env_var "AZURE_SEARCH_INDEX_NAME" "false"
check_env_var "AZURE_OPENAI_API_KEY" "false"
check_env_var "AZURE_OPENAI_ENDPOINT" "false"
check_env_var "AZURE_OPENAI_DEPLOYMENT_NAME" "false"
check_env_var "AZURE_OPENAI_API_VERSION" "false"

echo "  API 엔드포인트 테스트:"
test_endpoint "/api/azure/environment/summary" "200" "Azure 환경 요약"
test_endpoint "/api/azure/environment/validate" "200" "Azure 환경 검증"

echo "📋 감사 로그 관리 (/audit-log-management) 테스트:"
check_source_file "client/src/pages/audit-log-management.tsx" "감사 로그 관리 페이지"
check_source_file "server/routes/audit-logs.ts" "감사 로그 API"

echo "  API 엔드포인트 테스트:"
test_endpoint "/api/audit-logs" "200" "감사 로그 조회"
test_endpoint "/api/security-events" "200" "보안 이벤트 조회"
test_endpoint "/api/data-access-logs" "200" "데이터 접근 로그 조회"

echo ""
echo "📊 분석 & 리포팅 테스트"
echo "====================="

echo "📋 AI 시황 생성 (/ai-market-analysis) 테스트:"
check_source_file "client/src/pages/AIMarketAnalysis.tsx" "AI 시황 분석 페이지"
check_source_file "server/services/ai-market-analysis.ts" "AI 시장 분석 서비스"

echo "  환경변수 검증:"
check_env_var "DATABASE_URL" "true"
check_env_var "DATABRICKS_HOST" "false"
check_env_var "DATABRICKS_TOKEN" "false"
check_env_var "DATABRICKS_HTTP_PATH" "false"
check_env_var "AZURE_OPENAI_API_KEY" "false"
check_env_var "AZURE_OPENAI_ENDPOINT" "false"
check_env_var "AZURE_OPENAI_DEPLOYMENT_NAME" "false"
check_env_var "AZURE_OPENAI_API_VERSION" "false"

echo ""
echo "👤 개인화 서비스 테스트"
echo "====================="

echo "📋 개인화 대시보드 (/personal-dashboard) 테스트:"
check_source_file "client/src/pages/personal-dashboard.tsx" "개인화 대시보드 페이지"

echo "📋 보유종목 관리 (/my-holdings) 테스트:"
check_source_file "client/src/pages/my-holdings.tsx" "보유종목 관리 페이지"

echo "📋 매매이력 분석 (/my-trades) 테스트:"
check_source_file "client/src/pages/my-trades.tsx" "매매이력 분석 페이지"

echo "📋 관심종목 관리 (/my-watchlist) 테스트:"
check_source_file "client/src/pages/my-watchlist.tsx" "관심종목 관리 페이지"

echo "📋 개인화 설정 (/personalization-settings) 테스트:"
check_source_file "client/src/pages/personalization-settings.tsx" "개인화 설정 페이지"

echo ""
echo "🛡️ 품질 관리 테스트"
echo "=================="

echo "📋 품질 평가 (/quality-dashboard) 테스트:"
check_source_file "client/src/pages/quality-dashboard.tsx" "품질 평가 페이지"

echo "📋 ETF 투자가이드 (/etf-guide) 테스트:"
check_source_file "client/src/pages/etf-guide.tsx" "ETF 가이드 페이지"

echo ""
echo "📊 테스트 결과 요약"
echo "=================="
echo "총 테스트: $TOTAL_TESTS"
echo -e "성공: ${GREEN}$PASSED_TESTS${NC}"
echo -e "실패: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 모든 테스트가 통과했습니다!"
    exit 0
else
    echo -e "\n⚠️  일부 테스트가 실패했습니다. 위의 결과를 확인하세요."
    exit 1
fi
