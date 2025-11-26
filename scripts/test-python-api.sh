#!/bin/bash

# Python 실행 엔진 API 테스트 스크립트
# 서버가 실행 중일 때 사용

BASE_URL="${BASE_URL:-http://localhost:5000}"

echo "=================================================================================="
echo "Python 실행 엔진 API 실질적인 검증 테스트"
echo "서버 URL: $BASE_URL"
echo "=================================================================================="
echo ""

# 1. 간단한 계산 테스트
echo "1️⃣ 간단한 계산 스크립트 실행"
echo "----------------------------------------------------------------------------------"
curl -X POST "$BASE_URL/api/python/test" \
  -H "Content-Type: application/json" \
  -d '{
    "script": "# 간단한 계산\na = 10\nb = 20\nresult = a + b\noutput = {\"sum\": result, \"multiply\": a * b}",
    "timeout": 10,
    "environment": "python3",
    "inputData": {}
  }' 2>/dev/null | python3 -m json.tool
echo ""

# 2. 입력 데이터 처리 테스트
echo "2️⃣ 입력 데이터 처리 테스트"
echo "----------------------------------------------------------------------------------"
curl -X POST "$BASE_URL/api/python/test" \
  -H "Content-Type: application/json" \
  -d '{
    "script": "# 입력 데이터 처리\ndata = input_data.get(\"data\", {})\nnumbers = data.get(\"numbers\", [])\nresult_value = sum(numbers)\noutput = {\"operation\": \"sum\", \"numbers\": numbers, \"result\": result_value}",
    "timeout": 10,
    "environment": "python3",
    "inputData": {"numbers": [1, 2, 3, 4, 5], "operation": "sum"}
  }' 2>/dev/null | python3 -m json.tool
echo ""

# 3. 복잡한 데이터 집계 테스트
echo "3️⃣ 복잡한 데이터 집계 테스트"
echo "----------------------------------------------------------------------------------"
curl -X POST "$BASE_URL/api/python/test" \
  -H "Content-Type: application/json" \
  -d '{
    "script": "data = input_data.get(\"data\", {})\nsales = data.get(\"sales\", [])\ncategory_totals = {}\nfor sale in sales:\n    category = sale.get(\"category\", \"unknown\")\n    amount = sale.get(\"amount\", 0)\n    category_totals[category] = category_totals.get(category, 0) + amount\ntotal_amount = sum(sale.get(\"amount\", 0) for sale in sales)\noutput = {\"total_sales\": total_amount, \"category_totals\": category_totals}",
    "timeout": 10,
    "environment": "python3",
    "inputData": {
      "sales": [
        {"date": "2025-01-01", "amount": 1000, "category": "A"},
        {"date": "2025-01-02", "amount": 1500, "category": "B"},
        {"date": "2025-01-03", "amount": 800, "category": "A"},
        {"date": "2025-01-04", "amount": 2000, "category": "B"}
      ]
    }
  }' 2>/dev/null | python3 -m json.tool
echo ""

# 4. 에러 처리 테스트
echo "4️⃣ 에러 처리 테스트 (ZeroDivisionError)"
echo "----------------------------------------------------------------------------------"
curl -X POST "$BASE_URL/api/python/test" \
  -H "Content-Type: application/json" \
  -d '{
    "script": "# 런타임 에러 발생\na = 10\nb = 0\nresult = a / b\noutput = {\"result\": result}",
    "timeout": 10,
    "environment": "python3",
    "inputData": {}
  }' 2>/dev/null | python3 -m json.tool
echo ""

echo "=================================================================================="
echo "✅ Python 실행 엔진 API 테스트 완료"
echo "=================================================================================="
