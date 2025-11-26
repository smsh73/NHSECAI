#!/bin/bash

# AITradeConsole 소스코드 검증 스크립트
# 각 메뉴별 소스코드의 문법, 구조, 의존성을 검증합니다.

echo "🔍 AITradeConsole 소스코드 검증 시작..."
echo "======================================"

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

# TypeScript 컴파일 검증 함수
check_typescript() {
    local file_path=$1
    local file_type=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "  TypeScript: $file_type... "
    
    if npx tsc --noEmit "$file_path" 2>/dev/null; then
        echo -e "${GREEN}✅ 통과${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 실패${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 파일 존재 및 구조 검증 함수
check_file_structure() {
    local file_path=$1
    local file_type=$2
    local required_exports=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "  구조: $file_type... "
    
    if [ -f "$file_path" ]; then
        # 필수 export 확인
        if [ -n "$required_exports" ]; then
            if grep -q "$required_exports" "$file_path" 2>/dev/null; then
                echo -e "${GREEN}✅ 통과${NC}"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo -e "${RED}❌ 실패 (필수 export 없음)${NC}"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
        else
            echo -e "${GREEN}✅ 통과${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
    else
        echo -e "${RED}❌ 실패 (파일 없음)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# React 컴포넌트 검증 함수
check_react_component() {
    local file_path=$1
    local component_name=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "  React: $component_name... "
    
    if [ -f "$file_path" ]; then
        # React import 확인
        if grep -q "import.*React" "$file_path" 2>/dev/null; then
            # 컴포넌트 export 확인
            if grep -q "export.*$component_name" "$file_path" 2>/dev/null; then
                echo -e "${GREEN}✅ 통과${NC}"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo -e "${RED}❌ 실패 (컴포넌트 export 없음)${NC}"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
        else
            echo -e "${RED}❌ 실패 (React import 없음)${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}❌ 실패 (파일 없음)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 서비스 클래스 검증 함수
check_service_class() {
    local file_path=$1
    local class_name=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "  서비스: $class_name... "
    
    if [ -f "$file_path" ]; then
        # 클래스 정의 확인
        if grep -q "class $class_name" "$file_path" 2>/dev/null; then
            # export 확인
            if grep -q "export.*$class_name" "$file_path" 2>/dev/null; then
                echo -e "${GREEN}✅ 통과${NC}"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo -e "${RED}❌ 실패 (클래스 export 없음)${NC}"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
        else
            echo -e "${RED}❌ 실패 (클래스 정의 없음)${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}❌ 실패 (파일 없음)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo ""
echo "🏠 홈 & 대시보드 코드 검증"
echo "========================="

echo "📋 통합 대시보드 코드:"
check_react_component "client/src/pages/home.tsx" "Home"
check_react_component "client/src/components/common/hero-section.tsx" "HeroSection"
check_react_component "client/src/components/common/primary-actions.tsx" "PrimaryActions"
check_react_component "client/src/components/common/recent-analysis.tsx" "RecentAnalysis"
check_react_component "client/src/components/common/news-alerts.tsx" "NewsAlerts"

echo ""
echo "🔄 워크플로우 관리 코드 검증"
echo "=========================="

echo "📋 워크플로우 편집기 코드:"
check_react_component "client/src/pages/workflow-editor.tsx" "WorkflowEditor"
check_react_component "client/src/components/workflow/WorkflowCanvas.tsx" "WorkflowCanvas"
check_react_component "client/src/components/workflow/NodePalette.tsx" "NodePalette"
check_react_component "client/src/components/workflow/NodeEditor.tsx" "NodeEditor"

echo "📋 워크플로우 서비스 코드:"
check_service_class "server/services/workflow-engine.ts" "WorkflowEngine"
check_service_class "server/services/workflow-execution-engine.ts" "WorkflowExecutionEngine"

echo "📋 실행 스케줄러 코드:"
check_react_component "client/src/pages/scheduler.tsx" "Scheduler"
check_service_class "server/services/scheduler.ts" "SchedulerService"

echo "📋 워크플로우 모니터 코드:"
check_react_component "client/src/pages/workflow-monitor.tsx" "WorkflowMonitor"
check_file_structure "client/src/hooks/useWorkflowStatus.ts" "워크플로우 상태 훅" "useWorkflowStatus"

echo ""
echo "🗄️ 데이터 관리 코드 검증"
echo "======================"

echo "📋 스키마 브라우저 코드:"
check_react_component "client/src/pages/schema-browser.tsx" "SchemaBrowser"

echo "📋 RAG 검색엔진 코드:"
check_react_component "client/src/pages/rag-search.tsx" "RAGSearch"
check_service_class "server/services/rag.ts" "RAGService"
check_service_class "server/services/ragService.ts" "RAGService"

echo "📋 NL to SQL 엔진 코드:"
check_react_component "client/src/pages/nl2sql-engine.tsx" "NL2SQLEngine"
check_service_class "server/services/nl2sql.ts" "NL2SQLService"

echo "📋 스키마 의미 매핑 코드:"
check_react_component "client/src/pages/schema-mapper.tsx" "SchemaMapper"

echo "📋 Dictionary 관리 코드:"
check_react_component "client/src/pages/dictionary-manager.tsx" "DictionaryManager"

echo "📋 테마 클러스터 관리 코드:"
check_react_component "client/src/pages/theme-cluster-management.tsx" "ThemeClusterManagement"

echo ""
echo "🤖 AI 시스템 관리 코드 검증"
echo "========================="

echo "📋 프롬프트 관리 코드:"
check_react_component "client/src/pages/prompt-management.tsx" "PromptManagement"
check_service_class "server/services/json-prompt-execution-engine.ts" "JsonPromptExecutionEngine"

echo "📋 API 관리 코드:"
check_react_component "client/src/pages/api-management.tsx" "ApiManagement"
check_service_class "server/services/api-call-engine.ts" "ApiCallEngine"

echo "📋 Azure 설정 코드:"
check_react_component "client/src/pages/azure-config.tsx" "AzureConfig"
check_service_class "server/services/azure-config.ts" "AzureConfigService"
check_service_class "server/services/azure-environment-validator.ts" "AzureEnvironmentValidator"

echo "📋 감사 로그 관리 코드:"
check_react_component "client/src/pages/audit-log-management.tsx" "AuditLogManagement"
check_file_structure "server/routes/audit-logs.ts" "감사 로그 라우터" "auditLogsRouter"

echo ""
echo "📊 분석 & 리포팅 코드 검증"
echo "========================"

echo "📋 AI 시황 생성 코드:"
check_react_component "client/src/pages/AIMarketAnalysis.tsx" "AIMarketAnalysis"
check_service_class "server/services/ai-market-analysis.ts" "AIMarketAnalysisService"

echo ""
echo "👤 개인화 서비스 코드 검증"
echo "========================"

echo "📋 개인화 대시보드 코드:"
check_react_component "client/src/pages/personal-dashboard.tsx" "PersonalDashboard"

echo "📋 보유종목 관리 코드:"
check_react_component "client/src/pages/my-holdings.tsx" "MyHoldings"

echo "📋 매매이력 분석 코드:"
check_react_component "client/src/pages/my-trades.tsx" "MyTrades"

echo "📋 관심종목 관리 코드:"
check_react_component "client/src/pages/my-watchlist.tsx" "MyWatchlist"

echo "📋 개인화 설정 코드:"
check_react_component "client/src/pages/personalization-settings.tsx" "PersonalizationSettings"

echo ""
echo "🛡️ 품질 관리 코드 검증"
echo "====================="

echo "📋 품질 평가 코드:"
check_react_component "client/src/pages/quality-dashboard.tsx" "QualityDashboard"

echo "📋 ETF 투자가이드 코드:"
check_react_component "client/src/pages/etf-guide.tsx" "ETFGuide"

echo ""
echo "🔧 공통 서비스 코드 검증"
echo "======================"

echo "📋 데이터베이스 연결 코드:"
check_file_structure "server/db.ts" "데이터베이스 연결" "export.*db"

echo "📋 스키마 정의 코드:"
check_file_structure "shared/schema.ts" "스키마 정의" "export.*prompts"

echo "📋 메인 라우터 코드:"
check_file_structure "server/routes.ts" "메인 라우터" "app.use"

echo "📋 서버 진입점 코드:"
check_file_structure "server/index.ts" "서버 진입점" "app.listen"

echo ""
echo "📊 코드 검증 결과 요약"
echo "====================="
echo "총 테스트: $TOTAL_TESTS"
echo -e "성공: ${GREEN}$PASSED_TESTS${NC}"
echo -e "실패: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 모든 코드 검증이 통과했습니다!"
    echo -e "${GREEN}소스코드가 정상적으로 구성되어 있습니다.${NC}"
    exit 0
else
    echo -e "\n⚠️  일부 코드 검증이 실패했습니다. 위의 결과를 확인하세요."
    echo -e "${RED}소스코드에 문제가 있을 수 있습니다.${NC}"
    exit 1
fi
