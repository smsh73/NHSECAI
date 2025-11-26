import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  Table, 
  Sparkles, 
  Play, 
  Save,
  Loader2,
  ChevronRight,
  TrendingUp,
  BarChart3,
  FileText,
  Wand2,
  Edit,
  Copy,
  History,
  TestTube2,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface DatabricksDatabase {
  name: string;
  description?: string;
}

interface DatabricksTable {
  name: string;
  type: string;
  description?: string;
}

interface TableColumn {
  name: string;
  type: string;
  comment?: string;
}

interface ExamplePrompt {
  title: string;
  description: string;
  prompt: string;
  expectedSql?: string;
  analysisType: 'trend' | 'comparison' | 'ranking' | 'summary';
}

export default function PromptBuilder() {
  const { toast } = useToast();

  // Databricks schema selection state
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);

  // Generated prompts and SQL
  const [examplePrompts, setExamplePrompts] = useState<ExamplePrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<ExamplePrompt | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [generatedSQL, setGeneratedSQL] = useState<string>("");
  const [queryResults, setQueryResults] = useState<any>(null);
  const [testHistory, setTestHistory] = useState<Array<{prompt: string; sql: string; results: any; timestamp: Date}>>([]);
  const [batchPrompts, setBatchPrompts] = useState<string[]>([]);
  const [batchResults, setBatchResults] = useState<Array<{prompt: string; success: boolean; sql?: string; error?: string}>>([]);
  const [isBatchTesting, setIsBatchTesting] = useState(false);

  // Fetch Databricks databases
  const { data: databasesData, isLoading: databasesLoading } = useQuery({
    queryKey: ['/api/databricks/databases'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/databricks/databases');
      const data = await response.json();
      // Handle both string array and object array responses
      if (data.success && data.databases) {
        // Convert string array to object array if needed
        return data.databases.map((db: string | DatabricksDatabase) => 
          typeof db === 'string' ? { name: db } : db
        );
      }
      return [];
    }
  });

  // Fetch tables for selected database
  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ['/api/databricks/tables', selectedDatabase],
    enabled: !!selectedDatabase,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/databricks/tables/${selectedDatabase}`);
      const data = await response.json();
      // Handle both object array responses
      if (data.success && data.tables) {
        return data.tables.map((table: string | DatabricksTable) => 
          typeof table === 'string' ? { name: table, type: 'TABLE' } : table
        );
      }
      return [];
    }
  });


  // Convert natural language to SQL
  const convertToSQLMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest('POST', '/api/nl-to-sql/convert', {
        prompt,
        database: selectedDatabase,
        table: selectedTable,
        columns: tableColumns
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || `SQL 변환 실패: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.sql && !data.success) {
        throw new Error(data.error || data.message || 'SQL 변환 결과가 없습니다.');
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (data.sql) {
        setGeneratedSQL(data.sql);
        toast({
          title: "SQL 변환 완료",
          description: "자연어 프롬프트가 SQL로 변환되었습니다.",
        });
      } else if (data.error) {
        toast({
          variant: "destructive",
          title: "SQL 변환 실패",
          description: data.error || "SQL 변환 중 오류가 발생했습니다.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "SQL 변환 실패",
        description: error?.message || error?.error || "SQL 변환 중 오류가 발생했습니다.",
      });
    }
  });

  // Execute SQL on Databricks
  const executeSQLMutation = useMutation({
    mutationFn: async (sql: string) => {
      const response = await apiRequest('POST', '/api/databricks/execute', {
        sql,
        maxRows: 100
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `쿼리 실행 실패: ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '쿼리 실행 중 오류가 발생했습니다.');
      }
      return data;
    },
    onSuccess: (data) => {
      setQueryResults(data);
      toast({
        title: "쿼리 실행 완료",
        description: `${data.rowCount || 0}건의 데이터를 조회했습니다.`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "쿼리 실행 중 오류가 발생했습니다.";
      toast({
        variant: "destructive",
        title: "쿼리 실행 실패",
        description: errorMessage,
      });
      setQueryResults(null);
    }
  });

  // Fetch table schema when table is selected
  useEffect(() => {
    if (selectedDatabase && selectedTable) {
      const fetchTableSchema = async () => {
        try {
          const response = await apiRequest('GET', `/api/databricks/table-schema/${selectedDatabase}/${selectedTable}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || errorData.details || '테이블 스키마를 가져오는 중 오류가 발생했습니다.');
          }
          const data = await response.json();
          if (data.success && data.columns && data.columns.length > 0) {
            setTableColumns(data.columns);
          } else {
            throw new Error(data.error || '테이블 스키마를 찾을 수 없습니다.');
          }
        } catch (error: any) {
          console.error('Failed to fetch table schema:', error);
          toast({
            title: "테이블 스키마 조회 실패",
            description: error.message || '테이블을 찾을 수 없습니다. 테이블명과 스키마명을 확인해주세요.',
            variant: "destructive",
          });
          setTableColumns([]);
        }
      };
      fetchTableSchema();
    } else {
      setTableColumns([]);
    }
  }, [selectedDatabase, selectedTable, toast]);

  // Auto-generate prompts when table and columns are loaded
  useEffect(() => {
    if (selectedTable && tableColumns.length > 0) {
      generateStockMarketPrompts();
      toast({
        title: "예시 프롬프트 생성 완료",
        description: "선택한 테이블 기반으로 AI 주식 시황 프롬프트가 자동 생성되었습니다.",
      });
    } else {
      setExamplePrompts([]);
    }
  }, [selectedTable, tableColumns]);

  const generateStockMarketPrompts = () => {
    if (!selectedTable || tableColumns.length === 0) return;

    const tableName = selectedTable.toLowerCase();
    const hasPrice = tableColumns.some(col => col.name.toLowerCase().includes('price'));
    const hasVolume = tableColumns.some(col => col.name.toLowerCase().includes('volume'));
    const hasSymbol = tableColumns.some(col => col.name.toLowerCase().includes('symbol') || col.name.toLowerCase().includes('ticker'));
    const hasDate = tableColumns.some(col => col.name.toLowerCase().includes('date') || col.name.toLowerCase().includes('time'));

    const prompts: ExamplePrompt[] = [];

    // Trend analysis prompts
    if (hasPrice && hasDate) {
      prompts.push({
        title: "최근 시장 추세 분석",
        description: "최근 시장 데이터를 기반으로 가격 추세와 변동성을 분석합니다",
        prompt: `${selectedTable} 테이블에서 최근 30일간의 가격 추세를 분석하여 상승/하락 패턴과 주요 변동 시점을 파악해주세요`,
        analysisType: 'trend'
      });
    }

    // Volume & Trading activity
    if (hasVolume && hasDate) {
      prompts.push({
        title: "거래량 급증 종목 분석",
        description: "평균 대비 거래량이 크게 증가한 종목들을 식별합니다",
        prompt: `${selectedTable} 테이블에서 최근 거래량이 평균 대비 2배 이상 증가한 종목을 찾아 시장 관심도가 높아진 이유를 분석해주세요`,
        analysisType: 'ranking'
      });
    }

    // Price ranking
    if (hasPrice && hasSymbol) {
      prompts.push({
        title: "수익률 상위 종목 분석",
        description: "가격 상승률이 높은 종목들의 특징을 분석합니다",
        prompt: `${selectedTable} 테이블에서 최근 수익률 상위 20개 종목을 조회하고, 이들 종목의 공통 특징과 시장 시사점을 분석해주세요`,
        analysisType: 'ranking'
      });
    }

    // Market summary
    prompts.push({
      title: "전체 시장 현황 요약",
      description: "전체 시장의 주요 지표와 현황을 종합적으로 분석합니다",
      prompt: `${selectedTable} 테이블의 전체 데이터를 기반으로 현재 시장 상황, 주요 섹터별 동향, 투자자들이 주목해야 할 포인트를 요약해주세요`,
      analysisType: 'summary'
    });

    // Comparison analysis
    if (hasSymbol) {
      prompts.push({
        title: "섹터별 비교 분석",
        description: "다양한 섹터 간의 성과를 비교 분석합니다",
        prompt: `${selectedTable} 테이블에서 주요 섹터별로 성과를 비교하고, 상대적으로 강세/약세를 보이는 섹터와 그 원인을 분석해주세요`,
        analysisType: 'comparison'
      });
    }

    // Volatility analysis
    if (hasPrice) {
      prompts.push({
        title: "변동성 분석",
        description: "가격 변동성이 큰 종목들을 분석합니다",
        prompt: `${selectedTable} 테이블에서 최근 가격 변동성이 가장 큰 종목들을 찾아내고, 높은 변동성의 원인과 투자 시 주의사항을 분석해주세요`,
        analysisType: 'trend'
      });
    }

    setExamplePrompts(prompts);
  };

  const handlePromptSelect = (prompt: ExamplePrompt) => {
    setSelectedPrompt(prompt);
    setCustomPrompt(prompt.prompt);
    convertToSQLMutation.mutate(prompt.prompt);
  };

  const handleCustomPromptConvert = () => {
    if (!customPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "프롬프트 입력 필요",
        description: "프롬프트를 입력해주세요.",
      });
      return;
    }
    convertToSQLMutation.mutate(customPrompt);
  };

  const handleExecuteSQL = () => {
    if (!generatedSQL) return;
    executeSQLMutation.mutate(generatedSQL);
  };

  const handleSavePrompt = () => {
    if (!customPrompt.trim() || !generatedSQL) {
      toast({
        variant: "destructive",
        title: "저장 불가",
        description: "프롬프트와 SQL이 모두 필요합니다.",
      });
      return;
    }
    
    const promptData = {
      name: selectedPrompt?.title || `프롬프트 ${Date.now()}`,
      description: selectedPrompt?.description || customPrompt.substring(0, 100),
      category: 'custom',
      systemPrompt: "당신은 SQL 쿼리 생성 전문가입니다.",
      userPromptTemplate: customPrompt,
      executionType: 'text',
    };
    
    // Save to prompts API
    apiRequest('POST', '/api/prompts', promptData)
      .then(response => response.json())
      .then(() => {
        toast({
          title: "저장 완료",
          description: "프롬프트가 저장되었습니다.",
        });
      })
      .catch((error: any) => {
        toast({
          variant: "destructive",
          title: "저장 실패",
          description: error.message || "프롬프트 저장 중 오류가 발생했습니다.",
        });
      });
  };

  const handleBatchTest = async () => {
    if (batchPrompts.length === 0) {
      toast({
        variant: "destructive",
        title: "배치 프롬프트 필요",
        description: "테스트할 프롬프트를 입력해주세요.",
      });
      return;
    }
    
    setIsBatchTesting(true);
    const results: Array<{prompt: string; success: boolean; sql?: string; error?: string}> = [];
    
    for (const prompt of batchPrompts.filter(p => p.trim())) {
      try {
        const response = await apiRequest('POST', '/api/nl-to-sql/convert', {
          prompt,
          database: selectedDatabase,
          table: selectedTable,
          columns: tableColumns
        });
        const data = await response.json();
        
        if (data.sql) {
          results.push({ prompt, success: true, sql: data.sql });
        } else {
          results.push({ prompt, success: false, error: data.error || 'SQL 생성 실패' });
        }
      } catch (error: any) {
        results.push({ prompt, success: false, error: error.message || 'Unknown error' });
      }
    }
    
    setBatchResults(results);
    setIsBatchTesting(false);
    toast({
      title: "배치 테스트 완료",
      description: `${results.filter(r => r.success).length}/${results.length}개 성공`,
    });
  };

  // Save to test history when SQL is executed
  React.useEffect(() => {
    if (queryResults && generatedSQL && selectedPrompt) {
      const historyItem = {
        prompt: customPrompt || selectedPrompt.prompt,
        sql: generatedSQL,
        results: queryResults,
        timestamp: new Date(),
      };
      setTestHistory(prev => [historyItem, ...prev].slice(0, 10)); // Keep last 10
    }
  }, [queryResults, generatedSQL, selectedPrompt, customPrompt]);

  const getAnalysisTypeIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="w-4 h-4" />;
      case 'ranking': return <BarChart3 className="w-4 h-4" />;
      case 'comparison': return <FileText className="w-4 h-4" />;
      case 'summary': return <Sparkles className="w-4 h-4" />;
      default: return <Wand2 className="w-4 h-4" />;
    }
  };

  const getAnalysisTypeColor = (type: string) => {
    switch (type) {
      case 'trend': return 'bg-blue-500';
      case 'ranking': return 'bg-green-500';
      case 'comparison': return 'bg-purple-500';
      case 'summary': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wand2 className="h-8 w-8" />
            AI 주식 시황 프롬프트 빌더
          </h1>
          <p className="text-muted-foreground mt-2">
            Databricks 데이터를 기반으로 AI 주식 시황 생성 프롬프트를 만들어보세요
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schema Selection Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Databricks 스키마 선택
              </CardTitle>
              <CardDescription>
                분석할 데이터베이스와 테이블을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Database Selection */}
              <div>
                <Label htmlFor="database-select">데이터베이스</Label>
                <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                  <SelectTrigger id="database-select" data-testid="select-database">
                    <SelectValue placeholder="데이터베이스 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {databasesLoading ? (
                      <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                    ) : (
                      databasesData?.map((db: DatabricksDatabase) => (
                        <SelectItem key={db.name} value={db.name}>
                          {db.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Table Selection */}
              {selectedDatabase && (
                <div>
                  <Label htmlFor="table-select">테이블</Label>
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger id="table-select" data-testid="select-table">
                      <SelectValue placeholder="테이블 선택..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tablesLoading ? (
                        <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                      ) : (
                        tablesData?.map((table: DatabricksTable) => (
                          <SelectItem key={table.name} value={table.name}>
                            <div className="flex items-center gap-2">
                              <Table className="w-3 h-3" />
                              {table.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Table Schema Info */}
              {tableColumns.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">테이블 컬럼 ({tableColumns.length}개)</Label>
                  <div className="bg-muted p-3 rounded-lg max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {tableColumns.map((col) => (
                        <div key={col.name} className="text-xs flex items-start gap-2">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {col.type}
                          </Badge>
                          <span className="font-mono">{col.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Panel */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="prompts" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="prompts" data-testid="tab-prompts">
                예시 프롬프트
              </TabsTrigger>
              <TabsTrigger value="custom" data-testid="tab-custom">
                커스텀 프롬프트
              </TabsTrigger>
              <TabsTrigger value="sql" data-testid="tab-sql">
                생성된 SQL
              </TabsTrigger>
              <TabsTrigger value="results" data-testid="tab-results">
                실행 결과
              </TabsTrigger>
              <TabsTrigger value="batch" data-testid="tab-batch">
                배치 테스트
              </TabsTrigger>
            </TabsList>

            {/* Example Prompts Tab */}
            <TabsContent value="prompts" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI 주식 시황 예시 프롬프트
                    </CardTitle>
                    {examplePrompts.length > 0 && (
                      <Badge variant="outline">
                        {examplePrompts.length}개 생성됨
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    선택한 테이블 기반으로 자동 생성된 AI 주식 시황 프롬프트
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedTable ? (
                    <div className="text-center py-12">
                      <Database className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-lg font-medium mb-2">테이블을 선택하세요</h3>
                      <p className="text-sm text-muted-foreground">
                        데이터베이스와 테이블을 선택하면 자동으로 AI 주식 시황 프롬프트가 생성됩니다
                      </p>
                    </div>
                  ) : examplePrompts.length === 0 ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-16 h-16 text-muted-foreground mb-4 mx-auto animate-spin" />
                      <h3 className="text-lg font-medium mb-2">프롬프트 생성 중...</h3>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {examplePrompts.map((prompt, index) => (
                        <Card
                          key={index}
                          className={`cursor-pointer transition-all ${
                            selectedPrompt?.title === prompt.title
                              ? 'ring-2 ring-primary shadow-lg'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => handlePromptSelect(prompt)}
                          data-testid={`card-prompt-${index}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${getAnalysisTypeColor(prompt.analysisType)} text-white shrink-0`}>
                                {getAnalysisTypeIcon(prompt.analysisType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold mb-1">{prompt.title}</h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {prompt.description}
                                </p>
                                <div className="bg-muted p-2 rounded text-xs">
                                  <span className="font-semibold">프롬프트: </span>
                                  {prompt.prompt}
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Custom Prompt Tab */}
            <TabsContent value="custom" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="w-5 h-5" />
                      커스텀 프롬프트 편집
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedPrompt) {
                            setCustomPrompt(selectedPrompt.prompt);
                          }
                        }}
                        disabled={!selectedPrompt}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        예시에서 가져오기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSavePrompt}
                        disabled={!customPrompt.trim() || !generatedSQL}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    직접 프롬프트를 작성하고 SQL로 변환하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="custom-prompt">프롬프트 입력</Label>
                    <Textarea
                      id="custom-prompt"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="예: 삼성전자의 최근 30일간 종가 추이를 분석하여 주요 변동 시점을 파악해주세요"
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      자연어로 질문을 입력하면 SQL로 자동 변환됩니다. 변수는 {`{{변수명}}`} 형식으로 사용할 수 있습니다.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCustomPromptConvert}
                      disabled={!customPrompt.trim() || convertToSQLMutation.isPending || !selectedTable || !selectedDatabase}
                      data-testid="button-convert-sql"
                    >
                      {convertToSQLMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          변환 중...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          SQL 변환
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCustomPrompt('')}
                    >
                      초기화
                    </Button>
                  </div>

                  {/* Prompt Variables */}
                  {customPrompt && (() => {
                    const variables = customPrompt.match(/\{\{([^}]+)\}\}/g);
                    return variables && variables.length > 0 ? (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Label className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 block">
                          감지된 변수 ({variables.length}개):
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {variables.map((varName, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {varName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Test History */}
                  {testHistory.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <History className="w-4 h-4" />
                        최근 테스트 히스토리 ({testHistory.length}개)
                      </Label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {testHistory.map((item, idx) => (
                          <Card key={idx} className="p-3 cursor-pointer hover:bg-muted/50" 
                                onClick={() => {
                                  setCustomPrompt(item.prompt);
                                  setGeneratedSQL(item.sql);
                                  setQueryResults(item.results);
                                }}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono truncate">{item.prompt.substring(0, 60)}...</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.timestamp.toLocaleString('ko-KR')}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs ml-2">
                                {item.results?.rowCount || 0}건
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* SQL Tab */}
            <TabsContent value="sql" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      생성된 SQL 쿼리
                    </CardTitle>
                    <Button
                      onClick={handleExecuteSQL}
                      disabled={!generatedSQL || executeSQLMutation.isPending}
                      data-testid="button-execute-sql"
                    >
                      {executeSQLMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          실행 중...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          실행
                        </>
                      )}
                    </Button>
                  </div>
                  <CardDescription>
                    프롬프트로부터 자동 생성된 SQL 쿼리
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!generatedSQL ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-lg font-medium mb-2">SQL이 생성되지 않았습니다</h3>
                      <p className="text-sm text-muted-foreground">
                        예시 프롬프트를 선택하면 자동으로 SQL이 생성됩니다
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {convertToSQLMutation.isPending && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          SQL 변환 중...
                        </div>
                      )}
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                          <code>{generatedSQL}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedSQL);
                            toast({
                              title: "복사 완료",
                              description: "SQL이 클립보드에 복사되었습니다.",
                            });
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      {selectedPrompt && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm font-semibold mb-1">원본 프롬프트:</p>
                          <p className="text-sm text-muted-foreground">{selectedPrompt.prompt}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    쿼리 실행 결과
                  </CardTitle>
                  <CardDescription>
                    Databricks에서 실행된 SQL 쿼리 결과
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!queryResults ? (
                    <div className="text-center py-12">
                      <BarChart3 className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-lg font-medium mb-2">실행 결과 없음</h3>
                      <p className="text-sm text-muted-foreground">
                        SQL 탭에서 쿼리를 실행하면 결과가 여기에 표시됩니다
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {queryResults.rowCount || 0}건
                        </Badge>
                        {queryResults.executionTime && (
                          <Badge variant="outline">
                            {queryResults.executionTime}ms
                          </Badge>
                        )}
                      </div>

                      {queryResults.data && queryResults.data.length > 0 && (
                        <div className="border rounded-lg overflow-auto max-h-96">
                          <table className="w-full text-sm">
                            <thead className="bg-muted sticky top-0">
                              <tr>
                                {Object.keys(queryResults.data[0]).map((key) => (
                                  <th key={key} className="px-4 py-2 text-left font-medium border-r">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResults.data.map((row: any, rowIndex: number) => (
                                <tr
                                  key={rowIndex}
                                  className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                                >
                                  {Object.values(row).map((cell: any, cellIndex: number) => (
                                    <td key={cellIndex} className="px-4 py-2 border-r">
                                      {cell !== null && cell !== undefined ? String(cell) : ''}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Batch Test Tab */}
            <TabsContent value="batch" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube2 className="w-5 h-5" />
                    배치 테스트
                  </CardTitle>
                  <CardDescription>
                    여러 프롬프트를 한 번에 테스트하여 성능을 비교하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="batch-prompts">프롬프트 목록 (한 줄에 하나씩)</Label>
                    <Textarea
                      id="batch-prompts"
                      value={batchPrompts.join('\n')}
                      onChange={(e) => setBatchPrompts(e.target.value.split('\n').filter(p => p.trim()))}
                      placeholder={`삼성전자의 최근 30일간 종가 추이 분석
LG전자의 거래량 급증 시점 파악
SK하이닉스의 주가 변동성 분석`}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      각 프롬프트를 한 줄에 하나씩 입력하세요. 총 {batchPrompts.filter(p => p.trim()).length}개 프롬프트
                    </p>
                  </div>

                  <Button
                    onClick={handleBatchTest}
                    disabled={batchPrompts.length === 0 || isBatchTesting || !selectedTable}
                    className="w-full"
                  >
                    {isBatchTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        배치 테스트 실행 중...
                      </>
                    ) : (
                      <>
                        <TestTube2 className="w-4 h-4 mr-2" />
                        배치 테스트 실행
                      </>
                    )}
                  </Button>

                  {/* Batch Results */}
                  {batchResults.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">테스트 결과</Label>
                        <div className="flex gap-2 text-xs">
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            성공: {batchResults.filter(r => r.success).length}
                          </Badge>
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            실패: {batchResults.filter(r => !r.success).length}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {batchResults.map((result, idx) => (
                          <Card key={idx} className={`p-3 ${result.success ? 'border-green-500' : 'border-red-500'}`}>
                            <div className="flex items-start gap-3">
                              {result.success ? (
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0 space-y-2">
                                <p className="text-sm font-medium">{result.prompt}</p>
                                {result.success && result.sql ? (
                                  <div className="bg-slate-900 text-slate-100 p-2 rounded text-xs font-mono overflow-x-auto">
                                    {result.sql}
                                  </div>
                                ) : (
                                  <p className="text-sm text-red-600">{result.error}</p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Statistics */}
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <Card className="p-3">
                          <div className="text-xs text-muted-foreground">총 테스트</div>
                          <div className="text-2xl font-bold">{batchResults.length}</div>
                        </Card>
                        <Card className="p-3">
                          <div className="text-xs text-muted-foreground">성공률</div>
                          <div className="text-2xl font-bold text-green-600">
                            {batchResults.length > 0 
                              ? ((batchResults.filter(r => r.success).length / batchResults.length) * 100).toFixed(1)
                              : 0}%
                          </div>
                        </Card>
                        <Card className="p-3">
                          <div className="text-xs text-muted-foreground">평균 응답시간</div>
                          <div className="text-2xl font-bold">-</div>
                        </Card>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
