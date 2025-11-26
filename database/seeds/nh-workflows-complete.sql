-- NH Investment 워크플로우 템플릿 세트
-- Production 코드(20_news_silver_aoai.py, 60_macro_market.py)를 정확히 복제

-- 1. 뉴스 품질 점수 생성 워크플로우 (파란색 - #3B82F6)
INSERT INTO workflows (id, name, description, definition, is_active, created_at, updated_at)
VALUES (
  'nh-news-quality-scoring',
  'NH 뉴스 품질 점수 생성',
  'Production 20_news_silver_aoai.py 복제 - 뉴스 데이터를 분석하여 4가지 품질 점수(광고성, 경제관련성, 시장영향도, 콘텐츠품질) 생성하고 N_NEWS_MM_SILVER 테이블에 저장',
  '{
    "nodes": [
      {
        "id": "node-1",
        "type": "dataSource",
        "position": {"x": 100, "y": 100},
        "data": {
          "label": "뉴스 베이스 데이터 조회",
          "description": "N_NEWS_MM_SILVER_BASE에서 오늘 뉴스 조회",
          "query": "SELECT N_ID, N_TITLE, N_CONTENT FROM nh_ai.silver.N_NEWS_MM_SILVER_BASE WHERE N_SOURCE = ''3'' AND N_FGUBUN LIKE ''F%'' AND N_CODE REGEXP ''^[0-9]+$'' AND N_DATE = date_format(current_date(), ''yyyyMMdd'') LIMIT 100",
          "outputKey": "news_data",
          "color": "#3B82F6"
        }
      },
      {
        "id": "node-2",
        "type": "template",
        "position": {"x": 100, "y": 280},
        "data": {
          "label": "현재 시각 생성",
          "description": "PY_NOW_TIME_TEXT 변수 생성",
          "templateText": "{{datetime}}",
          "variables": {},
          "outputKey": "PY_NOW_TIME_TEXT",
          "placeholderFormat": "double",
          "color": "#3B82F6"
        }
      },
      {
        "id": "node-3",
        "type": "prompt",
        "position": {"x": 100, "y": 460},
        "data": {
          "label": "뉴스 품질 점수 AI 분석",
          "description": "GPT-4.1로 품질 점수 생성",
          "promptId": "news-quality-scoring",
          "maxTokens": 1200,
          "temperature": 0.2,
          "outputKey": "response",
          "color": "#3B82F6"
        }
      },
      {
        "id": "node-4",
        "type": "transform",
        "position": {"x": 100, "y": 640},
        "data": {
          "label": "응답 JSON 파싱",
          "description": "AI 응답 파싱",
          "transformType": "json_parse",
          "inputKey": "response",
          "outputKey": "parsed_response",
          "color": "#3B82F6"
        }
      },
      {
        "id": "node-5",
        "type": "output",
        "position": {"x": 100, "y": 820},
        "data": {
          "label": "결과 출력",
          "description": "뉴스 품질 점수 결과",
          "format": "json",
          "inputKey": "parsed_response",
          "color": "#3B82F6"
        }
      }
    ],
    "edges": [
      {"id": "edge-1", "source": "node-1", "target": "node-2"},
      {"id": "edge-2", "source": "node-2", "target": "node-3"},
      {"id": "edge-3", "source": "node-3", "target": "node-4"},
      {"id": "edge-4", "source": "node-4", "target": "node-5"}
    ]
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  definition = EXCLUDED.definition,
  updated_at = NOW();

-- 2. 매크로 시장 시황 종합 생성 워크플로우 (초록색 - #22C55E)
INSERT INTO workflows (id, name, description, definition, is_active, created_at, updated_at)
VALUES (
  'nh-macro-complete',
  'NH 매크로 시장 시황 종합 생성',
  'Production 60_macro_market.py 복제 - A200 이벤트, A300 테마, KRI1/USC1 지수, A100 직전시황을 종합하여 매크로 시장 시황 생성 및 A100_MACRO_MARKET 테이블에 저장',
  '{
    "nodes": [
      {
        "id": "node-1",
        "type": "dataSource",
        "position": {"x": 100, "y": 100},
        "data": {
          "label": "A. 주요 시장 이벤트",
          "description": "A200_MARKET_EVENTS 조회",
          "query": "SELECT EVENT_ID, EVENT_TITLE, EVENT_DETAIL FROM nh_ai.silver.A200_MARKET_EVENTS WHERE BASE_DATE = date_format(current_date(), ''yyyyMMdd'') ORDER BY BASE_TIME DESC LIMIT 10",
          "outputKey": "a200_events",
          "color": "#22C55E"
        }
      },
      {
        "id": "node-2",
        "type": "dataSource",
        "position": {"x": 350, "y": 100},
        "data": {
          "label": "C. 테마별 시황",
          "description": "A300_THEME_MARKET 조회",
          "query": "SELECT COALESCE(TREND_ID, ''UNKNOWN'') as ANY_ID, THEME_TITLE, FLUCTUATION_RATE, BUBBLE_SCALE FROM nh_ai.silver.A300_THEME_MARKET WHERE BASE_DATE = date_format(current_date(), ''yyyyMMdd'') ORDER BY BASE_TIME DESC LIMIT 30",
          "outputKey": "a300_themes",
          "color": "#22C55E"
        }
      },
      {
        "id": "node-3",
        "type": "dataSource",
        "position": {"x": 600, "y": 100},
        "data": {
          "label": "B1. 국내 지수",
          "description": "KRI1_SILVER 조회",
          "query": "SELECT BSTP_CLS_CODE, RETURN_RATE, Z_SCORE FROM nh_ai.silver.KRI1_SILVER WHERE BSOP_DATE = date_format(current_date(), ''yyyyMMdd'') ORDER BY Z_SCORE DESC LIMIT 10",
          "outputKey": "kri_data",
          "color": "#22C55E"
        }
      },
      {
        "id": "node-4",
        "type": "dataSource",
        "position": {"x": 600, "y": 250},
        "data": {
          "label": "B2. 해외 지수",
          "description": "USC1_SILVER 조회",
          "query": "SELECT COUNTRY_CODE, SYMBOL, RETURN_RATE, Z_SCORE FROM nh_ai.silver.USC1_SILVER WHERE TRADE_DATE = date_format(current_date(), ''yyyyMMdd'') ORDER BY Z_SCORE DESC LIMIT 10",
          "outputKey": "usc_data",
          "color": "#22C55E"
        }
      },
      {
        "id": "node-5",
        "type": "dataSource",
        "position": {"x": 850, "y": 100},
        "data": {
          "label": "D. 직전 매크로 시황",
          "description": "A100_MACRO_MARKET 조회",
          "query": "SELECT TITLE, CONTENT FROM nh_ai.silver.A100_MACRO_MARKET ORDER BY _INGEST_TS DESC LIMIT 1",
          "outputKey": "prev_macro",
          "color": "#22C55E"
        }
      },
      {
        "id": "node-6",
        "type": "template",
        "position": {"x": 350, "y": 400},
        "data": {
          "label": "날짜/시각 변수",
          "description": "DATE/TIME 생성",
          "templateText": "{{datetime}}",
          "variables": {},
          "outputKey": "date_time",
          "placeholderFormat": "double",
          "color": "#22C55E"
        }
      },
      {
        "id": "node-7",
        "type": "prompt",
        "position": {"x": 350, "y": 550},
        "data": {
          "label": "매크로 시황 AI 분석",
          "description": "GPT-4.1로 시황 생성",
          "promptId": "macro-market-complete",
          "maxTokens": 1500,
          "temperature": 0.2,
          "outputKey": "response",
          "color": "#22C55E"
        }
      },
      {
        "id": "node-8",
        "type": "transform",
        "position": {"x": 350, "y": 700},
        "data": {
          "label": "응답 JSON 파싱",
          "description": "AI 응답 파싱",
          "transformType": "json_parse",
          "inputKey": "response",
          "outputKey": "macro_result",
          "color": "#22C55E"
        }
      },
      {
        "id": "node-9",
        "type": "output",
        "position": {"x": 350, "y": 850},
        "data": {
          "label": "매크로 시황 출력",
          "description": "A100_MACRO_MARKET 저장용",
          "format": "json",
          "inputKey": "macro_result",
          "color": "#22C55E"
        }
      }
    ],
    "edges": [
      {"id": "edge-1", "source": "node-1", "target": "node-7"},
      {"id": "edge-2", "source": "node-2", "target": "node-7"},
      {"id": "edge-3", "source": "node-3", "target": "node-7"},
      {"id": "edge-4", "source": "node-4", "target": "node-7"},
      {"id": "edge-5", "source": "node-5", "target": "node-7"},
      {"id": "edge-6", "source": "node-6", "target": "node-7"},
      {"id": "edge-7", "source": "node-7", "target": "node-8"},
      {"id": "edge-8", "source": "node-8", "target": "node-9"}
    ]
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  definition = EXCLUDED.definition,
  updated_at = NOW();

-- 결과 확인
SELECT 
  id,
  name,
  description,
  jsonb_array_length(definition->'nodes') as node_count,
  jsonb_array_length(definition->'edges') as edge_count,
  is_active,
  created_at
FROM workflows
WHERE id IN ('nh-news-quality-scoring', 'nh-macro-complete')
ORDER BY id;
