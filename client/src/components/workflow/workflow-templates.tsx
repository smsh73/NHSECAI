import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkflowDefinition } from "@/types/workflow";
import { FileText, TrendingUp, Bell, Lightbulb, Plus } from "lucide-react";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  definition: WorkflowDefinition;
}

const templates: WorkflowTemplate[] = [
  {
    id: "daily-market-report",
    name: "일일 시장 분석 리포트",
    description: "매일 아침 시장 데이터를 수집하고 분석하여 종합 리포트를 생성합니다",
    icon: <FileText className="w-5 h-5" />,
    definition: {
      nodes: [
        {
          id: "start-1",
          type: "start",
          position: { x: 100, y: 200 },
          data: {
            label: "시작",
            description: "매일 오전 8시 실행",
            config: {}
          }
        },
        {
          id: "data-1",
          type: "api",
          position: { x: 300, y: 100 },
          data: {
            label: "국내 시장 데이터 수집",
            description: "KOSPI, KOSDAQ 데이터",
            config: { endpoint: "/api/market-data/domestic" }
          }
        },
        {
          id: "data-2",
          type: "api",
          position: { x: 300, y: 300 },
          data: {
            label: "해외 시장 데이터 수집",
            description: "NYSE, NASDAQ 데이터",
            config: { endpoint: "/api/market-data/global" }
          }
        },
        {
          id: "merge-1",
          type: "data_aggregator",
          position: { x: 500, y: 200 },
          data: {
            label: "데이터 통합",
            description: "시장 데이터 병합",
            config: {}
          }
        },
        {
          id: "analysis-1",
          type: "prompt",
          position: { x: 700, y: 200 },
          data: {
            label: "AI 시장 분석",
            description: "트렌드 및 패턴 분석",
            config: { 
              type: "prompt",
              promptText: "국내외 시장 데이터를 종합하여 시장 트렌드와 패턴을 분석해주세요.\n\n# 분석 내용\n- 주요 지수의 전일 대비 변동률 및 방향성\n- 거래대금 및 외국인/기관 매매 동향\n- 글로벌 시장과의 상관관계\n- 섹터별 강약 분석\n- 주요 이슈 및 시장 심리\n\n시장의 전반적인 분위기와 단기 방향성을 명확히 제시해주세요.",
              temperature: 0.5,
              maxTokens: 1000
            }
          }
        },
        {
          id: "report-1",
          type: "prompt",
          position: { x: 900, y: 200 },
          data: {
            label: "리포트 생성",
            description: "분석 결과를 리포트로 작성",
            config: { 
              type: "prompt",
              promptText: "당신은 금융 시장 분석 전문가입니다. 제공된 시장 데이터와 AI 분석 결과를 바탕으로 일일 시장 분석 리포트를 작성해주세요.\n\n# 리포트 구성\n1. 시장 개요 (국내/해외 주요 지수 동향)\n2. 주요 이슈 및 변동 요인\n3. 섹터별 분석\n4. 향후 전망 및 투자 시사점\n\n리포트는 전문적이면서도 이해하기 쉽게 작성하고, 구체적인 수치와 근거를 포함해주세요.",
              temperature: 0.7,
              maxTokens: 2000
            }
          }
        }
      ],
      edges: [
        { id: "e1", source: "start-1", target: "data-1", type: "default" },
        { id: "e2", source: "start-1", target: "data-2", type: "default" },
        { id: "e3", source: "data-1", target: "merge-1", type: "default" },
        { id: "e4", source: "data-2", target: "merge-1", type: "default" },
        { id: "e5", source: "merge-1", target: "analysis-1", type: "default" },
        { id: "e6", source: "analysis-1", target: "report-1", type: "default" }
      ]
    }
  },
  {
    id: "theme-news-collector",
    name: "테마별 뉴스 수집 및 요약",
    description: "특정 테마의 뉴스를 수집하고 AI로 요약하여 인사이트를 제공합니다",
    icon: <TrendingUp className="w-5 h-5" />,
    definition: {
      nodes: [
        {
          id: "start-1",
          type: "start",
          position: { x: 100, y: 200 },
          data: {
            label: "시작",
            description: "1시간마다 실행",
            config: {}
          }
        },
        {
          id: "news-1",
          type: "api",
          position: { x: 300, y: 200 },
          data: {
            label: "뉴스 수집",
            description: "최신 뉴스 크롤링",
            config: { endpoint: "/api/news/latest" }
          }
        },
        {
          id: "classifier-1",
          type: "theme_classifier",
          position: { x: 500, y: 200 },
          data: {
            label: "테마 분류",
            description: "AI로 테마별 분류",
            config: {}
          }
        },
        {
          id: "loop-1",
          type: "loop",
          position: { x: 700, y: 100 },
          data: {
            label: "테마별 처리",
            description: "각 테마에 대해 반복",
            config: {}
          }
        },
        {
          id: "summary-1",
          type: "prompt",
          position: { x: 900, y: 100 },
          data: {
            label: "뉴스 요약",
            description: "AI 요약 생성",
            config: { 
              type: "prompt",
              promptText: "테마별로 분류된 뉴스 기사들을 간결하게 요약해주세요.\n\n# 요약 형식\n- 핵심 내용 3-5줄 요약\n- 주요 키워드 추출\n- 시장 영향도 평가 (상승/하락/중립)\n\n객관적이고 정확한 정보 전달에 초점을 맞추고, 투자자들이 빠르게 핵심을 파악할 수 있도록 작성해주세요.",
              temperature: 0.5,
              maxTokens: 500
            }
          }
        },
        {
          id: "store-1",
          type: "api",
          position: { x: 900, y: 300 },
          data: {
            label: "저장",
            description: "요약 결과 저장",
            config: { endpoint: "/api/summaries/save" }
          }
        }
      ],
      edges: [
        { id: "e1", source: "start-1", target: "news-1", type: "default" },
        { id: "e2", source: "news-1", target: "classifier-1", type: "default" },
        { id: "e3", source: "classifier-1", target: "loop-1", type: "default" },
        { id: "e4", source: "loop-1", target: "summary-1", type: "default" },
        { id: "e5", source: "summary-1", target: "store-1", type: "default" }
      ]
    }
  },
  {
    id: "price-monitoring",
    name: "실시간 가격 모니터링 및 알림",
    description: "주요 종목의 가격을 실시간으로 모니터링하고 조건 충족 시 알림을 발송합니다",
    icon: <Bell className="w-5 h-5" />,
    definition: {
      nodes: [
        {
          id: "start-1",
          type: "start",
          position: { x: 100, y: 200 },
          data: {
            label: "시작",
            description: "5분마다 실행",
            config: { interval: "5m" }
          }
        },
        {
          id: "prices-1",
          type: "api",
          position: { x: 300, y: 200 },
          data: {
            label: "가격 조회",
            description: "실시간 가격 데이터",
            config: { endpoint: "/api/prices/realtime" }
          }
        },
        {
          id: "condition-1",
          type: "condition",
          position: { x: 500, y: 200 },
          data: {
            label: "조건 확인",
            description: "가격 변동 체크",
            config: { rule: "price_change > 5%" }
          }
        },
        {
          id: "alert-1",
          type: "prompt",
          position: { x: 700, y: 100 },
          data: {
            label: "알림 발송",
            description: "가격 변동 알림",
            config: { 
              type: "prompt",
              promptText: "주요 종목의 가격 변동에 대한 알림 메시지를 작성해주세요.\n\n# 포함 내용\n- 종목명 및 현재가\n- 변동률 및 변동폭\n- 주요 변동 원인 (가능한 경우)\n- 간단한 투자 관점 코멘트\n\n긴급성과 중요성을 전달하되, 간결하고 명확하게 작성해주세요.",
              temperature: 0.3,
              maxTokens: 300
            }
          }
        },
        {
          id: "log-1",
          type: "api",
          position: { x: 700, y: 300 },
          data: {
            label: "로그 기록",
            description: "변동 내역 저장",
            config: { endpoint: "/api/logs/price-changes" }
          }
        }
      ],
      edges: [
        { id: "e1", source: "start-1", target: "prices-1", type: "default" },
        { id: "e2", source: "prices-1", target: "condition-1", type: "default" },
        { id: "e3", source: "condition-1", target: "alert-1", type: "default", label: "true" },
        { id: "e4", source: "condition-1", target: "log-1", type: "default", label: "false" }
      ]
    }
  },
  {
    id: "rag-insights",
    name: "RAG 기반 투자 인사이트",
    description: "RAG 엔진을 활용하여 맞춤형 투자 인사이트를 생성합니다",
    icon: <Lightbulb className="w-5 h-5" />,
    definition: {
      nodes: [
        {
          id: "start-1",
          type: "start",
          position: { x: 100, y: 200 },
          data: {
            label: "시작",
            description: "요청 시 실행",
            config: {}
          }
        },
        {
          id: "context-1",
          type: "api",
          position: { x: 300, y: 100 },
          data: {
            label: "시장 컨텍스트",
            description: "현재 시장 상황 수집",
            config: { endpoint: "/api/market-context" }
          }
        },
        {
          id: "history-1",
          type: "api",
          position: { x: 300, y: 300 },
          data: {
            label: "투자 이력",
            description: "과거 투자 데이터",
            config: { endpoint: "/api/investment-history" }
          }
        },
        {
          id: "rag-1",
          type: "rag",
          position: { x: 500, y: 200 },
          data: {
            label: "RAG 검색",
            description: "관련 정보 검색",
            config: { query: "investment opportunities" }
          }
        },
        {
          id: "branch-1",
          type: "branch",
          position: { x: 700, y: 200 },
          data: {
            label: "병렬 분석",
            description: "다각도 분석 실행",
            config: {}
          }
        },
        {
          id: "technical-1",
          type: "prompt",
          position: { x: 900, y: 100 },
          data: {
            label: "기술적 분석",
            description: "차트 패턴 분석",
            config: { 
              type: "prompt",
              promptText: "제공된 시장 데이터를 바탕으로 기술적 분석을 수행해주세요.\n\n# 분석 항목\n- 주요 이동평균선 분석 (5일, 20일, 60일, 120일)\n- RSI, MACD 등 보조지표 분석\n- 지지선/저항선 확인\n- 차트 패턴 및 추세 분석\n- 거래량 분석\n\n각 지표의 시그널을 종합하여 매수/매도/관망 의견을 제시해주세요.",
              temperature: 0.4,
              maxTokens: 800
            }
          }
        },
        {
          id: "fundamental-1",
          type: "prompt",
          position: { x: 900, y: 300 },
          data: {
            label: "펀더멘털 분석",
            description: "재무제표 분석",
            config: { 
              type: "prompt",
              promptText: "제공된 재무 데이터를 바탕으로 펀더멘털 분석을 수행해주세요.\n\n# 분석 항목\n- 주요 재무비율 (PER, PBR, ROE, ROA, 부채비율 등)\n- 매출 및 영업이익 성장률\n- 현금흐름 분석\n- 배당 정책 및 배당수익률\n- 동종업계 대비 밸류에이션\n\n정량적 지표를 바탕으로 투자 매력도를 평가하고, 적정 주가 수준을 제시해주세요.",
              temperature: 0.4,
              maxTokens: 800
            }
          }
        },
        {
          id: "merge-1",
          type: "merge",
          position: { x: 1100, y: 200 },
          data: {
            label: "인사이트 통합",
            description: "분석 결과 병합",
            config: {}
          }
        },
        {
          id: "report-1",
          type: "prompt",
          position: { x: 1300, y: 200 },
          data: {
            label: "인사이트 생성",
            description: "최종 리포트 작성",
            config: { 
              type: "prompt",
              promptText: "RAG 검색 결과와 기술적/펀더멘털 분석을 종합하여 투자 인사이트를 생성해주세요.\n\n# 인사이트 구성\n1. 투자 기회 요약\n2. 기술적 분석 결과 (차트 패턴, 지표 등)\n3. 펀더멘털 분석 결과 (재무지표, 밸류에이션 등)\n4. 리스크 요인 및 주의사항\n5. 투자 전략 제안 (진입/청산 타이밍, 목표가 등)\n\n데이터 기반의 객관적 분석과 함께 실용적인 투자 전략을 제시해주세요.",
              temperature: 0.6,
              maxTokens: 1500
            }
          }
        }
      ],
      edges: [
        { id: "e1", source: "start-1", target: "context-1", type: "default" },
        { id: "e2", source: "start-1", target: "history-1", type: "default" },
        { id: "e3", source: "context-1", target: "rag-1", type: "default" },
        { id: "e4", source: "history-1", target: "rag-1", type: "default" },
        { id: "e5", source: "rag-1", target: "branch-1", type: "default" },
        { id: "e6", source: "branch-1", target: "technical-1", type: "default" },
        { id: "e7", source: "branch-1", target: "fundamental-1", type: "default" },
        { id: "e8", source: "technical-1", target: "merge-1", type: "default" },
        { id: "e9", source: "fundamental-1", target: "merge-1", type: "default" },
        { id: "e10", source: "merge-1", target: "report-1", type: "default" }
      ]
    }
  },
  {
    id: "ai-market-analysis",
    name: "AI 시황 생성",
    description: "뉴스 데이터를 수집하고 AI로 분석하여 테마별 시황과 매크로 시황을 생성합니다",
    icon: <TrendingUp className="w-5 h-5" />,
    definition: {
      nodes: [
        {
          id: "start-1",
          type: "start",
          position: { x: 100, y: 300 },
          data: {
            label: "시작",
            description: "AI 시황 생성 워크플로우 시작",
            config: {}
          }
        },
        {
          id: "collect-news",
          type: "api",
          position: { x: 300, y: 300 },
          data: {
            label: "뉴스 데이터 수집",
            description: "최근 30분간의 뉴스 데이터를 수집하고 전처리합니다",
            config: {
              type: "api",
              url: "/api/ai-market-analysis/collect-news",
              method: "POST",
              apiCallId: undefined
            }
          }
        },
        {
          id: "extract-events",
          type: "prompt",
          position: { x: 500, y: 300 },
          data: {
            label: "주요이벤트 추출",
            description: "AI를 활용하여 시장에 영향을 미치는 주요 이벤트를 추출합니다",
            config: {
              type: "prompt",
              systemPrompt: "당신은 금융 시장 분석 전문가입니다. 제공된 뉴스 데이터에서 시장에 영향을 미치는 주요 이벤트를 추출해주세요.",
              userPromptTemplate: "다음 뉴스 데이터를 분석하여 주요 시장 이벤트를 추출해주세요:\n\n{newsData}\n\n# 추출 항목\n- 이벤트명\n- 영향도 (높음/중간/낮음)\n- 관련 종목/섹터\n- 예상 시장 영향 (상승/하락/중립)\n- 이벤트 발생 시점",
              temperature: 0.5,
              maxTokens: 1000
            }
          }
        },
        {
          id: "generate-themes",
          type: "prompt",
          position: { x: 700, y: 200 },
          data: {
            label: "테마 시황 생성",
            description: "테마별 뉴스 분석 및 시황을 생성합니다",
            config: {
              type: "prompt",
              systemPrompt: "당신은 금융 시장 테마 분석 전문가입니다. 제공된 뉴스와 이벤트 데이터를 바탕으로 테마별 시황을 생성해주세요.",
              userPromptTemplate: "다음 데이터를 바탕으로 테마별 시황을 생성해주세요:\n\n뉴스 데이터: {newsData}\n주요 이벤트: {marketEvents}\n\n# 생성 항목\n- 테마명\n- 테마 설명\n- 관련 종목 및 영향도\n- 테마 전망 (긍정/부정/중립)\n- 투자 시사점",
              temperature: 0.6,
              maxTokens: 1500
            }
          }
        },
        {
          id: "generate-macro",
          type: "prompt",
          position: { x: 700, y: 400 },
          data: {
            label: "매크로 시황 생성",
            description: "전체 시장의 종합적인 매크로 시황을 생성합니다",
            config: {
              type: "prompt",
              systemPrompt: "당신은 금융 시장 매크로 분석 전문가입니다. 제공된 모든 데이터를 종합하여 전체 시장의 매크로 시황을 생성해주세요.",
              userPromptTemplate: "다음 데이터를 종합하여 매크로 시황을 생성해주세요:\n\n뉴스 데이터: {newsData}\n주요 이벤트: {marketEvents}\n테마 시황: {themeMarkets}\n\n# 생성 항목\n- 시장 전반 동향 (상승/하락/보합)\n- 주요 변동 요인\n- 섹터별 강약 분석\n- 리스크 요인\n- 향후 전망 및 투자 전략",
              temperature: 0.7,
              maxTokens: 2000
            }
          }
        },
        {
          id: "merge-results",
          type: "data_aggregator",
          position: { x: 900, y: 300 },
          data: {
            label: "결과 통합",
            description: "모든 분석 결과를 통합합니다",
            config: {}
          }
        },
        {
          id: "save-results",
          type: "api",
          position: { x: 1100, y: 300 },
          data: {
            label: "결과 저장",
            description: "생성된 시황 데이터를 저장합니다",
            config: {
              type: "api",
              url: "/api/ai-market-analysis/save-results",
              method: "POST",
              apiCallId: undefined
            }
          }
        }
      ],
      edges: [
        { id: "e1", source: "start-1", target: "collect-news", type: "default" },
        { id: "e2", source: "collect-news", target: "extract-events", type: "default" },
        { id: "e3", source: "extract-events", target: "generate-themes", type: "default" },
        { id: "e4", source: "extract-events", target: "generate-macro", type: "default" },
        { id: "e5", source: "generate-themes", target: "merge-results", type: "default" },
        { id: "e6", source: "generate-macro", target: "merge-results", type: "default" },
        { id: "e7", source: "merge-results", target: "save-results", type: "default" }
      ]
    }
  }
];

interface WorkflowTemplatesProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WorkflowTemplates({ onSelectTemplate, open: controlledOpen, onOpenChange }: WorkflowTemplatesProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-templates">
          <Plus className="w-4 h-4" />
          템플릿에서 시작
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]" data-testid="dialog-templates">
        <DialogHeader>
          <DialogTitle>워크플로우 템플릿</DialogTitle>
          <DialogDescription>
            미리 구성된 템플릿을 선택하여 빠르게 워크플로우를 시작하세요
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full mt-4">
          <div className="grid grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSelectTemplate(template)}
                data-testid={`template-${template.id}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {template.icon}
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>노드 수: {template.definition.nodes.length}개</div>
                    <div>연결 수: {template.definition.edges.length}개</div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(template);
                    }}
                    data-testid={`button-use-template-${template.id}`}
                  >
                    이 템플릿 사용
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export { type WorkflowTemplate };