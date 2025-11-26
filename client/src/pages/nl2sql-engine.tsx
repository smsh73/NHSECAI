import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Code2, Database, Play, BookOpen, Settings, CheckCircle2 } from "lucide-react";

export default function NL2SQLEngine() {
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("");
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [selectedDictionaryId, setSelectedDictionaryId] = useState<string>("");
  const [useDictionary, setUseDictionary] = useState(true);
  const { toast } = useToast();

  // Fetch available dictionaries
  const { data: dictionariesData } = useQuery({
    queryKey: ['/api/dictionaries'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/dictionaries');
      return res.json();
    }
  });

  // Initialize selected dictionary ID when dictionaries are loaded
  useEffect(() => {
    if (dictionariesData?.dictionaries && dictionariesData.dictionaries.length > 0 && !selectedDictionaryId) {
      setSelectedDictionaryId(dictionariesData.dictionaries[0].id);
    }
  }, [dictionariesData, selectedDictionaryId]);

  // Mutation for generating SQL
  const generateSQLMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest('POST', "/api/nl2sql/generate", { 
        naturalLanguageQuery: query,
        dictionaryId: useDictionary ? selectedDictionaryId : undefined
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedSQL(data.generatedSQL);
      toast({
        title: "SQL 생성 완료",
        description: data.explanation || "자연어가 SQL로 성공적으로 변환되었습니다."
      });
    },
    onError: (error: any) => {
      toast({
        title: "SQL 생성 실패",
        description: error.details || "SQL 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Mutation for executing SQL
  const executeSQLMutation = useMutation({
    mutationFn: async (sql: string) => {
      const res = await apiRequest('POST', "/api/nl2sql/execute", { sql, limit: 100 });
      return res.json();
    },
    onSuccess: (data) => {
      setQueryResults(data.results);
      toast({
        title: "쿼리 실행 완료",
        description: `${data.rowCount}개의 결과를 가져왔습니다.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "쿼리 실행 실패",
        description: error.details || "SQL 실행 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleGenerateSQL = () => {
    if (!naturalLanguageQuery.trim()) {
      toast({
        title: "입력 필요",
        description: "자연어 쿼리를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    if (useDictionary && !selectedDictionaryId) {
      toast({
        title: "Dictionary 선택 필요",
        description: "Dictionary를 선택하거나 Dictionary 사용을 끄세요.",
        variant: "destructive"
      });
      return;
    }
    
    generateSQLMutation.mutate(naturalLanguageQuery);
  };

  const handleExecuteSQL = () => {
    if (!generatedSQL.trim()) {
      toast({
        title: "SQL 필요",
        description: "먼저 SQL을 생성해주세요.",
        variant: "destructive"
      });
      return;
    }
    executeSQLMutation.mutate(generatedSQL);
  };

  const isProcessing = generateSQLMutation.isPending || executeSQLMutation.isPending;

  return (
    <div className="w-full px-6 py-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">NL to SQL 엔진</h1>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground mt-2">
            자연어로 데이터베이스 쿼리를 생성하고 실행하세요
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/schema-browser">
            <Button variant="outline" size="sm" data-testid="button-schema-browser">
              <Database className="w-4 h-4 mr-2" />
              스키마 브라우저
            </Button>
          </Link>
          <Link href="/dictionary-manager">
            <Button variant="outline" size="sm" data-testid="button-dictionary-editor">
              <BookOpen className="w-4 h-4 mr-2" />
              Dictionary 에디터
            </Button>
          </Link>
          <Button variant="outline" size="sm" data-testid="button-settings" disabled>
            <Settings className="w-4 h-4 mr-2" />
            설정
          </Button>
        </div>
      </div>

      {/* Dictionary 설정 섹션 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Dictionary 설정
            </div>
            {useDictionary && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                활성화됨
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="use-dictionary"
                checked={useDictionary}
                onCheckedChange={setUseDictionary}
                data-testid="switch-use-dictionary"
              />
              <Label htmlFor="use-dictionary" className="cursor-pointer">
                Dictionary 활용하기
              </Label>
            </div>
            {useDictionary && (
              <div className="space-y-2">
                <Label htmlFor="dictionary-select">Dictionary 선택</Label>
                <Select value={selectedDictionaryId} onValueChange={setSelectedDictionaryId}>
                  <SelectTrigger id="dictionary-select" data-testid="select-dictionary">
                    <SelectValue placeholder="Dictionary를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {dictionariesData?.dictionaries?.map((dict: any) => (
                      <SelectItem key={dict.id} value={dict.id}>
                        {dict.name} {dict.description && `- ${dict.description}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dictionariesData?.dictionaries?.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    등록된 Dictionary가 없습니다. 
                    <Link href="/schema-mapper" className="text-primary hover:underline ml-1">
                      스키마 매핑
                    </Link>
                    에서 생성하세요.
                  </p>
                )}
              </div>
            )}
          </div>
          {useDictionary && (
            <p className="text-sm text-muted-foreground mt-4">
              Dictionary를 활용하면 한국어 용어를 정확한 데이터베이스 컬럼명으로 자동 매핑하여 더 정확한 SQL을 생성합니다.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 자연어 입력 패널 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code2 className="w-5 h-5 mr-2" />
              자연어 쿼리 입력
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="예: 애플 주식의 최근 10일 가격 데이터를 보여주세요"
              value={naturalLanguageQuery}
              onChange={(e) => setNaturalLanguageQuery(e.target.value)}
              className="min-h-[120px]"
              data-testid="textarea-nl-query"
            />
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {naturalLanguageQuery.length}/500 characters
              </div>
              <Button 
                onClick={handleGenerateSQL}
                disabled={!naturalLanguageQuery.trim() || isProcessing}
                data-testid="button-generate-sql"
              >
                {isProcessing ? "생성 중..." : "SQL 생성"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SQL 결과 패널 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              생성된 SQL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="생성된 SQL이 여기에 나타납니다..."
              value={generatedSQL}
              onChange={(e) => setGeneratedSQL(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
              data-testid="textarea-generated-sql"
            />
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Badge variant="secondary">PostgreSQL</Badge>
                <Badge variant="outline">읽기 전용</Badge>
              </div>
              <Button 
                onClick={handleExecuteSQL}
                disabled={!generatedSQL.trim() || isProcessing}
                variant="default"
                data-testid="button-execute-sql"
              >
                <Play className="w-4 h-4 mr-2" />
                {isProcessing ? "실행 중..." : "SQL 실행"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 쿼리 결과 */}
      {queryResults && (
        <Card>
          <CardHeader>
            <CardTitle>쿼리 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-left">ID</th>
                    <th className="border border-border p-2 text-left">Symbol</th>
                    <th className="border border-border p-2 text-left">Price</th>
                    <th className="border border-border p-2 text-left">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {queryResults?.map((row: any, index: number) => (
                    <tr key={index} data-testid={`row-result-${index}`}>
                      <td className="border border-border p-2">{row.id}</td>
                      <td className="border border-border p-2">{row.symbol}</td>
                      <td className="border border-border p-2">{row.price}</td>
                      <td className="border border-border p-2">{row.volume}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 기능 안내 */}
      <Card>
        <CardHeader>
          <CardTitle>기능 안내</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Code2 className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold mb-2">자연어 처리</h3>
            <p className="text-sm text-muted-foreground">
              일상 언어로 복잡한 SQL 쿼리를 쉽게 생성
            </p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Database className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold mb-2">스키마 인식</h3>
            <p className="text-sm text-muted-foreground">
              데이터베이스 구조를 자동으로 파악하여 정확한 쿼리 생성
            </p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold mb-2">Dictionary 관리</h3>
            <p className="text-sm text-muted-foreground">
              비즈니스 용어와 데이터베이스 컬럼을 매핑하여 정확도 향상
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}