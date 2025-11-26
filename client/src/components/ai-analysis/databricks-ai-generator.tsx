import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Database, 
  Sparkles, 
  Play, 
  Loader2, 
  CheckCircle2,
  Table as TableIcon
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface DatabricksAIGeneratorProps {
  defaultSql?: string;
  defaultPrompt?: string;
  maxRows?: number;
  analysisType?: string;
  onResult?: (result: any) => void;
  onLoading?: (isLoading: boolean) => void;
  onError?: (error: Error) => void;
}

export function DatabricksAIGenerator({ 
  defaultSql = "", 
  defaultPrompt = "",
  maxRows = 100,
  analysisType = "market_analysis",
  onResult,
  onLoading,
  onError
}: DatabricksAIGeneratorProps) {
  const { toast } = useToast();
  const [sql, setSql] = useState(defaultSql);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [result, setResult] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: async (params: { sql: string; prompt: string }) => {
      const response = await apiRequest("POST", "/api/generate-ai-analysis", {
        sql: params.sql,
        prompt: params.prompt,
        maxRows,
        analysisType
      });
      return response.json();
    },
    onMutate: () => {
      if (onLoading) {
        onLoading(true);
      }
    },
    onSuccess: (data) => {
      setResult(data);
      if (onResult) {
        onResult(data);
      }
      if (onLoading) {
        onLoading(false);
      }
      toast({
        title: "AI 시황 생성 완료",
        description: `${data.rowCount}건의 데이터를 분석했습니다.`,
      });
    },
    onError: (error: any) => {
      if (onLoading) {
        onLoading(false);
      }
      if (onError) {
        onError(error);
      }
      toast({
        title: "AI 시황 생성 실패",
        description: error.message || "시황 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const handleGenerate = () => {
    if (!sql.trim()) {
      toast({
        title: "SQL 쿼리 필요",
        description: "Databricks SQL 쿼리를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "프롬프트 필요",
        description: "AI 분석을 위한 프롬프트를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({ sql, prompt });
  };

  const sampleQueries = [
    {
      name: "최근 시장 데이터",
      sql: "SELECT * FROM market_data ORDER BY timestamp DESC LIMIT 50",
      prompt: "최근 시장 데이터를 분석하여 주요 트렌드와 인사이트를 제공해주세요."
    },
    {
      name: "거래량 상위 종목",
      sql: "SELECT symbol, volume, price, change_rate FROM stock_data ORDER BY volume DESC LIMIT 20",
      prompt: "거래량 상위 20개 종목의 특징과 시장 의미를 분석해주세요."
    },
    {
      name: "급등/급락 종목",
      sql: "SELECT symbol, change_rate, volume FROM stock_data WHERE ABS(change_rate) > 5 ORDER BY change_rate DESC",
      prompt: "급등락 종목들의 패턴과 시장 심리를 분석해주세요."
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Databricks 데이터 기반 AI 시황 생성
          </CardTitle>
          <CardDescription>
            Databricks SQL 쿼리를 실행하고 OpenAI로 전문적인 시황 분석을 생성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sample Queries */}
          <div>
            <Label className="text-sm font-medium mb-2 block">샘플 쿼리</Label>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((sample, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSql(sample.sql);
                    setPrompt(sample.prompt);
                  }}
                  data-testid={`button-sample-${idx}`}
                >
                  {sample.name}
                </Button>
              ))}
            </div>
          </div>

          {/* SQL Query Input */}
          <div>
            <Label htmlFor="sql-query">Databricks SQL 쿼리</Label>
            <Textarea
              id="sql-query"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SELECT * FROM your_table LIMIT 100"
              className="mt-1 font-mono text-sm"
              rows={6}
              data-testid="textarea-sql-query"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Unity Catalog 테이블에 대한 SQL 쿼리를 입력하세요
            </p>
          </div>

          {/* Prompt Input */}
          <div>
            <Label htmlFor="analysis-prompt">분석 프롬프트</Label>
            <Textarea
              id="analysis-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="데이터를 분석하여 시장 동향과 인사이트를 제공해주세요..."
              className="mt-1"
              rows={4}
              data-testid="textarea-analysis-prompt"
            />
            <p className="text-xs text-muted-foreground mt-1">
              OpenAI에게 어떤 분석을 요청할지 설명하세요
            </p>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full"
            size="lg"
            data-testid="button-generate-analysis"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI 시황 생성 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI 시황 생성
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              분석 결과
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">
                <TableIcon className="w-3 h-3 mr-1" />
                {result.rowCount}건 데이터
              </Badge>
              <Badge variant="outline">
                {result.executionTime}ms 실행 시간
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Analysis */}
            {result.analysis && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-sm mb-2">AI 분석</h3>
                <div className="space-y-2 text-sm">
                  {result.analysis.summary && (
                    <div>
                      <p className="font-medium text-muted-foreground">요약:</p>
                      <p className="whitespace-pre-wrap">{result.analysis.summary}</p>
                    </div>
                  )}
                  {result.analysis.insights && result.analysis.insights.length > 0 && (
                    <div>
                      <p className="font-medium text-muted-foreground mt-2">주요 인사이트:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {result.analysis.insights.map((insight: string, idx: number) => (
                          <li key={idx}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data Preview */}
            {result.dataPreview && result.dataPreview.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="data-preview">
                  <AccordionTrigger>
                    데이터 미리보기 ({result.dataPreview.length}건)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(result.dataPreview, null, 2)}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Schema Info */}
            {result.schema && result.schema.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="schema-info">
                  <AccordionTrigger>
                    스키마 정보 ({result.schema.length}개 컬럼)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {result.schema.map((col: any, idx: number) => (
                        <div key={idx} className="p-2 bg-muted rounded text-xs">
                          <span className="font-medium">{col.name}</span>
                          <span className="text-muted-foreground ml-2">({col.type})</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
