-- 매크로 시황 생성 워크플로우 (실제 프롬프트 포함)
-- Production 60_macro_market.py 완전 복제

INSERT INTO workflows (id, name, description, definition, is_active, created_at, updated_at)
VALUES (
  'macro-market-complete-prompts',
  'NH 매크로 시황 생성 (프롬프트 포함)',
  'Databricks 데이터 기반 AI 매크로 시황 자동 생성 - 실제 프롬프트 내용 포함',
  '{
    "nodes": [
      {
        "id": "load-events",
        "type": "dataSource",
        "position": {"x": 100, "y": 100},
        "data": {
          "label": "주요 이벤트 데이터 조회",
          "description": "A200_MARKET_EVENTS에서 당일 주요 이벤트 조회",
          "source": "databricks",
          "query": "SELECT EVENT_ID, EVENT_TITLE, EVENT_DETAIL FROM nh_ai.silver.A200_MARKET_EVENTS WHERE BASE_DATE = date_format(current_date(), ''yyyyMMdd'') ORDER BY BASE_TIME DESC LIMIT 10",
          "outputKey": "events_data"
        }
      },
      {
        "id": "load-themes",
        "type": "dataSource",
        "position": {"x": 300, "y": 100},
        "data": {
          "label": "테마 시황 데이터 조회",
          "description": "A300_THEME_MARKET에서 당일 테마 시황 조회",
          "source": "databricks",
          "query": "SELECT TREND_ID, THEME_TITLE, FLUCTUATION_RATE, BUBBLE_SCALE FROM nh_ai.silver.A300_THEME_MARKET WHERE BASE_DATE = date_format(current_date(), ''yyyyMMdd'') ORDER BY BASE_TIME DESC LIMIT 30",
          "outputKey": "themes_data"
        }
      },
      {
        "id": "load-indices",
        "type": "dataSource",
        "position": {"x": 500, "y": 100},
        "data": {
          "label": "지수 이상치 데이터 조회",
          "description": "KRI1/USC1에서 Z-Score 상위 지수 조회",
          "source": "databricks",
          "query": "SELECT ''kri'' as source, BSTP_CLS_CODE as code, RETURN_RATE, Z_SCORE FROM nh_ai.silver.KRI1_SILVER WHERE BSOP_DATE = date_format(current_date(), ''yyyyMMdd'') ORDER BY Z_SCORE DESC LIMIT 10",
          "outputKey": "indices_data"
        }
      },
      {
        "id": "load-prev-macro",
        "type": "dataSource",
        "position": {"x": 700, "y": 100},
        "data": {
          "label": "이전 매크로 시황 조회",
          "description": "A100_MACRO_MARKET에서 직전 시황 조회",
          "source": "databricks",
          "query": "SELECT TITLE, CONTENT FROM nh_ai.silver.A100_MACRO_MARKET ORDER BY _INGEST_TS DESC LIMIT 1",
          "outputKey": "prev_macro"
        }
      },
      {
        "id": "transform-events",
        "type": "transform",
        "position": {"x": 100, "y": 300},
        "data": {
          "label": "이벤트 JSON 변환",
          "description": "이벤트 데이터를 JSON 문자열로 변환",
          "transformType": "json_stringify",
          "inputKey": "events_data",
          "outputKey": "A_EVENTS_JSON"
        }
      },
      {
        "id": "transform-themes",
        "type": "transform",
        "position": {"x": 300, "y": 300},
        "data": {
          "label": "테마 JSON 변환",
          "description": "테마 데이터를 JSON 문자열로 변환",
          "transformType": "json_stringify",
          "inputKey": "themes_data",
          "outputKey": "C_THEME_JSON"
        }
      },
      {
        "id": "transform-indices",
        "type": "transform",
        "position": {"x": 500, "y": 300},
        "data": {
          "label": "지수 JSON 변환",
          "description": "지수 데이터를 JSON 문자열로 변환",
          "transformType": "json_stringify",
          "inputKey": "indices_data",
          "outputKey": "B_INDEX_JSON"
        }
      },
      {
        "id": "generate-macro-analysis",
        "type": "prompt",
        "position": {"x": 400, "y": 500},
        "data": {
          "label": "AI 매크로 시황 생성",
          "description": "GPT-4.1을 통한 매크로 시장 시황 종합 생성",
          "promptId": "macro-market-complete",
          "systemPrompt": "당신은 NH투자증권의 전문 시장 애널리스트입니다. 주어진 시장 데이터를 바탕으로 전문적이고 통찰력 있는 매크로 시장 시황을 작성합니다.",
          "userPromptTemplate": "날짜: {DATE}\n시각: {TIME}\n\n[주요 이벤트]\n{A_EVENTS_JSON}\n\n[테마 시황]\n{C_THEME_JSON}\n\n[지수 이상치]\n{B_INDEX_JSON}\n\n[이전 시황 참고]\n제목: {PREV_TITLE}\n내용: {PREV_CONTENT}\n\n위 데이터를 종합하여 오늘의 매크로 시장 시황을 다음 JSON 형식으로 작성해주세요:\n\n{\n  \"title\": \"시황 제목 (20자 이내)\",\n  \"summary\": \"핵심 요약 (50자 이내)\",\n  \"content\": \"상세 시황 분석 (300-500자)\"\n}\n\n작성 가이드:\n1. 주요 이벤트의 시장 영향도 분석\n2. 테마별 투자 기회 및 리스크 평가\n3. 지수 이상치가 시사하는 점\n4. 전일 대비 시장 변화 및 전망\n5. 투자자 유의사항 및 전략 제시",
          "maxTokens": 1500,
          "temperature": 0.2,
          "outputKey": "response"
        }
      },
      {
        "id": "parse-response",
        "type": "transform",
        "position": {"x": 400, "y": 700},
        "data": {
          "label": "AI 응답 파싱",
          "description": "JSON 응답을 객체로 파싱",
          "transformType": "json_parse",
          "inputKey": "response",
          "outputKey": "analysis_result"
        }
      },
      {
        "id": "output",
        "type": "output",
        "position": {"x": 400, "y": 900},
        "data": {
          "label": "매크로 시황 결과",
          "description": "최종 매크로 시황 분석 결과",
          "format": "json",
          "inputKey": "analysis_result"
        }
      }
    ],
    "edges": [
      {"id": "e1", "source": "load-events", "target": "transform-events"},
      {"id": "e2", "source": "load-themes", "target": "transform-themes"},
      {"id": "e3", "source": "load-indices", "target": "transform-indices"},
      {"id": "e4", "source": "transform-events", "target": "generate-macro-analysis"},
      {"id": "e5", "source": "transform-themes", "target": "generate-macro-analysis"},
      {"id": "e6", "source": "transform-indices", "target": "generate-macro-analysis"},
      {"id": "e7", "source": "load-prev-macro", "target": "generate-macro-analysis"},
      {"id": "e8", "source": "generate-macro-analysis", "target": "parse-response"},
      {"id": "e9", "source": "parse-response", "target": "output"}
    ]
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  definition = EXCLUDED.definition,
  description = EXCLUDED.description,
  updated_at = NOW();
