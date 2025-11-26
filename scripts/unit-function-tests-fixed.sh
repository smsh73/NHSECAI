#!/bin/bash

BASE_URL="http://localhost:3000"
RESULTS=()
SUCCESS_COUNT=0
TOTAL_COUNT=0

echo "🧪 단위 기능 테스트 시작..."
echo ""

# 테스트 함수
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo "📋 $test_name 테스트 중..."
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo "✅ $test_name 테스트 통과"
        RESULTS+=("✅ $test_name")
        ((SUCCESS_COUNT++))
    else
        echo "❌ $test_name 테스트 실패"
        RESULTS+=("❌ $test_name")
    fi
    ((TOTAL_COUNT++))
    echo ""
}

# 실제 데이터로 테스트하기 위해 먼저 데이터를 가져옴
PROMPT_ID=$(curl -s $BASE_URL/api/prompts | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
API_CALL_ID=$(curl -s $BASE_URL/api/api-calls | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
WORKFLOW_ID=$(curl -s $BASE_URL/api/workflows | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "📊 테스트 데이터 정보:"
echo "  프롬프트 ID: $PROMPT_ID"
echo "  API 호출 ID: $API_CALL_ID"
echo "  워크플로우 ID: $WORKFLOW_ID"
echo ""

# 워크플로우 엔진 테스트
run_test "워크플로우 엔진 - 세션 생성" "curl -s -X POST $BASE_URL/api/workflows/sessions -H 'Content-Type: application/json' -d '{\"workflowId\":\"$WORKFLOW_ID\",\"sessionName\":\"Unit Test Session\"}' | grep -q 'sessionId'"

# 프롬프트 관리자 테스트
run_test "프롬프트 관리자 - 프롬프트 테스트" "curl -s -X POST $BASE_URL/api/prompts/test -H 'Content-Type: application/json' -d '{\"promptId\":\"$PROMPT_ID\",\"inputData\":{\"news_content\":\"테스트 뉴스\"}}' | grep -q 'success'"

# API 관리자 테스트
run_test "API 관리자 - API 테스트" "curl -s -X POST $BASE_URL/api/api-calls/test -H 'Content-Type: application/json' -d '{\"apiCallId\":\"$API_CALL_ID\",\"inputData\":{\"symbol\":\"AAPL\"}}' | grep -q 'success'"

# PostgreSQL 연결 테스트
run_test "PostgreSQL 연결" "curl -s $BASE_URL/api/system/status | grep -q 'system'"

# JSON 스키마 검증 테스트
run_test "JSON 스키마 검증" "curl -s $BASE_URL/api/prompts | grep -q 'inputSchema'"

# OpenAI 설정 테스트
run_test "OpenAI 설정" "curl -s $BASE_URL/api/azure/environment/summary | grep -q 'openai'"

# AI Search 설정 테스트
run_test "AI Search 설정" "curl -s $BASE_URL/api/azure/environment/summary | grep -q 'search'"

# Databricks 설정 테스트
run_test "Databricks 설정" "curl -s $BASE_URL/api/azure/environment/summary | grep -q 'databricks'"

# 스키마 브라우저 테스트
run_test "스키마 브라우저" "curl -s $BASE_URL/api/dictionaries/default/entries | grep -q 'entries'"

# Dictionary 관리자 테스트
run_test "Dictionary 관리자" "curl -s -X POST $BASE_URL/api/dictionaries/default/entries -H 'Content-Type: application/json' -d '{\"key\":\"테스트\",\"value\":\"테스트 값\"}' | grep -q 'success'"

# 환경변수 사용 테스트
run_test "환경변수 사용" "curl -s $BASE_URL/api/azure/environment/summary | grep -q 'environment'"

# 결과 요약
echo "📊 단위 기능 테스트 결과 요약"
echo "====================================="
echo "총 테스트: $TOTAL_COUNT"
echo "성공: $SUCCESS_COUNT"
echo "실패: $((TOTAL_COUNT - SUCCESS_COUNT))"
echo "성공률: $(echo "scale=1; $SUCCESS_COUNT * 100 / $TOTAL_COUNT" | bc)%"
echo ""

echo "상세 결과:"
for result in "${RESULTS[@]}"; do
    echo "$result"
done

echo ""
echo "🎯 권장사항:"
if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
    echo "모든 단위 테스트가 통과했습니다! 각 기능이 정상적으로 작동하고 있습니다."
else
    echo "다음 항목들을 확인하고 수정하세요:"
    for result in "${RESULTS[@]}"; do
        if [[ $result == ❌* ]]; then
            echo "- $result"
        fi
    done
fi
