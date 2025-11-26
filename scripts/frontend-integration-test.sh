#!/bin/bash

BASE_URL="http://localhost:3000"
RESULTS=()
SUCCESS_COUNT=0
TOTAL_COUNT=0

echo "🧪 프론트엔드 통합 테스트 시작..."
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

# 시스템 상태 확인
run_test "시스템 상태 확인" "curl -s $BASE_URL/api/system/status | grep -q 'system'"

# 프롬프트 관리 API
run_test "프롬프트 관리 API" "curl -s $BASE_URL/api/prompts | grep -q 'id'"

# API 관리 API
run_test "API 관리 API" "curl -s $BASE_URL/api/api-calls | grep -q 'id'"

# 워크플로우 관리 API
run_test "워크플로우 관리 API" "curl -s $BASE_URL/api/workflows | grep -q 'id'"

# 워크플로우 실행 API (세션 생성)
run_test "워크플로우 실행 API" "curl -s -X POST $BASE_URL/api/workflows/sessions -H 'Content-Type: application/json' -d '{\"workflowId\":\"test\",\"sessionName\":\"test\"}' | grep -q 'sessionId'"

# Azure 환경 검증 API
run_test "Azure 환경 검증 API" "curl -s $BASE_URL/api/azure/environment/summary | grep -q 'environment'"

# 사전 관리 API
run_test "사전 관리 API" "curl -s $BASE_URL/api/dictionaries/default/entries | grep -q 'entries'"

# 감사 로그 API (선택적)
run_test "감사 로그 API" "curl -s $BASE_URL/api/audit-logs | grep -q 'logs'"

# 결과 요약
echo "📊 프론트엔드 통합 테스트 결과 요약"
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
    echo "모든 테스트가 통과했습니다! 시스템이 정상적으로 작동하고 있습니다."
else
    echo "다음 항목들을 확인하고 수정하세요:"
    for result in "${RESULTS[@]}"; do
        if [[ $result == ❌* ]]; then
            echo "- $result"
        fi
    done
fi
