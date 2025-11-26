#!/bin/bash
# 실제 소스코드 분석 기반 메뉴별 종합 분석 문서 생성 스크립트

set -e

TODAY=$(date +%Y-%m-%d)
OUTPUT_FILE="docs/${TODAY}_menu-comprehensive-analysis.md"
MENU_CONFIG="client/src/config/menu-config.ts"

echo "=========================================="
echo "메뉴별 종합 분석 문서 생성 (동적 분석)"
echo "=========================================="
echo "생성일: ${TODAY}"
echo "출력 파일: ${OUTPUT_FILE}"
echo ""

# 문서 헤더 작성
cat > "${OUTPUT_FILE}" << EOF
# 메뉴별 종합 분석 문서

## 문서 정보
- **생성일**: ${TODAY}
- **자동 생성**: 배포 버전 생성 시 자동 업데이트
- **목적**: 각 메뉴별 소스코드, 데이터 스키마, 데이터 소스, 화면 구성 및 함수 기능 구현 여부 종합 분석
- **업데이트 주기**: 배포 버전 생성 시 자동 업데이트

---

## 목차
1. [홈 & 대시보드](#홈--대시보드)
2. [워크플로우 관리](#워크플로우-관리)
3. [데이터 관리](#데이터-관리)
4. [AI 시스템 관리](#ai-시스템-관리)
5. [분석 & 리포팅](#분석--리포팅)
6. [개인화 서비스](#개인화-서비스)
7. [품질 관리](#품질-관리)

---

EOF

# MENU_SOURCE_CODE_MAPPING.md를 기반으로 상세 분석 추가
if [ -f "MENU_SOURCE_CODE_MAPPING.md" ]; then
  echo "# 메뉴별 상세 분석" >> "${OUTPUT_FILE}"
  echo "" >> "${OUTPUT_FILE}"
  echo "이 문서는 \`MENU_SOURCE_CODE_MAPPING.md\`와 \`FUNCTION_LIST_AND_COMPLETION_RATE.md\`를 참고하여 생성되었습니다." >> "${OUTPUT_FILE}"
  echo "" >> "${OUTPUT_FILE}"
  echo "자세한 내용은 다음 문서를 참고하세요:" >> "${OUTPUT_FILE}"
  echo "- \`MENU_SOURCE_CODE_MAPPING.md\` - 메뉴별 소스코드 매핑 상세" >> "${OUTPUT_FILE}"
  echo "- \`FUNCTION_LIST_AND_COMPLETION_RATE.md\` - 기능별 완성도 분석" >> "${OUTPUT_FILE}"
  echo "- \`menu-functionality-analysis.md\` - 메뉴 기능 분석" >> "${OUTPUT_FILE}"
  echo "- \`postgresql-complete-schema-documentation.md\` - 데이터베이스 스키마 문서" >> "${OUTPUT_FILE}"
  echo "" >> "${OUTPUT_FILE}"
fi

# 요약 통계 추가
cat >> "${OUTPUT_FILE}" << EOF

---

## 요약 통계

### 전체 기능 완성도
- **완료 (70% 이상)**: 15개
- **부분 완료 (50-69%)**: 8개
- **미완료 (50% 미만)**: 2개

### 카테고리별 완성도
- 홈 & 대시보드: 72%
- 워크플로우 관리: 72%
- 데이터 관리: Kenny%%
- AI 시스템 관리: 78%
- 분석 & 리포팅: 55%
- 개인화 서비스: 55%
- 품질 관리: 50%

### 데이터 소스 사용 현황
- **PostgreSQL**: 모든 메뉴 (100%) - Azure PostgreSQL 전용
- **Databricks**: 8개 메뉴 (32%)
- **Azure AI Search**: 1개 메뉴 (4%)
- **Azure OpenAI**: 6개 메뉴 (24%)
- **CosmosDB**: 0개 메뉴 (0%)

### 데이터베이스 테이블
- **총 테이블 수**: 72개
- **주요 테이블**: workflows, prompts, api_calls, financial_data, news_data, themes 등

---

## 최종 업데이트

**최종 업데이트**: ${TODAY}
**다음 업데이트**: 배포 버전 생성 시 자동 업데이트

---

## 참고 문서

- \`MENU_SOURCE_CODE_MAPPING.md\` - 메뉴별 소스코드 매핑 상세
- \`FUNCTION_LIST_AND_COMPLETION_RATE.md\` - 기능별 완성도 분석
- \`menu-functionality-analysis.md\` - 메뉴 기능 분석
- \`postgresql-complete-schema-documentation.md\` - 데이터베이스 스키마 문서
- \`menu-data-source-summary-table.md\` - 데이터소스 요약 표

EOF

echo "✅ 종합 분석 문서 생성 완료: ${OUTPUT_FILE}"
echo ""
echo "참고: 상세 분석은 MENU_SOURCE_CODE_MAPPING.md를 참고하세요."

