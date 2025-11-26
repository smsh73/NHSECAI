import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Database, 
  Table2, 
  Sparkles, 
  Plus, 
  Check,
  Loader2,
  BookOpen,
  Settings
} from "lucide-react";

interface SchemaSource {
  id: string;
  name: string;
  type: string;
  connectionString?: string;
  description?: string;
  isDefault?: boolean;
}

interface SchemaTable {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    description?: string;
  }>;
}

interface SchemaTree {
  tables?: SchemaTable[];
  databases?: Array<{
    name: string;
    tables: SchemaTable[];
  }>;
}

export default function SchemaMapper() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [dictionaryName, setDictionaryName] = useState("");
  const [dictionaryDescription, setDictionaryDescription] = useState("");
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  // Fetch schema sources
  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['/api/schema-sources'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/schema-sources');
      if (!res.ok) {
        throw new Error('Failed to fetch schema sources');
      }
      const data = await res.json();
      // Handle both { success: true, sources: [...] } and direct array response
      return data.success ? data.sources || data : data;
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch schema tree when source is selected
  const { data: schemaTreeData, isLoading: treeLoading, error: treeError } = useQuery({
    queryKey: ['/api/schema-sources', selectedSource, 'tree'],
    queryFn: async () => {
      if (!selectedSource) return null;
      const res = await apiRequest('GET', `/api/schema-sources/${selectedSource}/tree`);
      if (!res.ok) {
        throw new Error(`Failed to fetch schema tree: ${res.status}`);
      }
      const data = await res.json();
      // Handle both { success: true, schemaTree: {...} } and direct object response
      return data.success ? data.schemaTree || data : data;
    },
    enabled: !!selectedSource,
    retry: 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Generate dictionary mutation
  const generateDictionaryMutation = useMutation({
    mutationFn: async (data: { tableNames: string[]; dictionaryName: string; description?: string }) => {
      const res = await apiRequest('POST', `/api/schema-sources/${selectedSource}/generate-dictionary`, data);
      return res.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Dictionary 생성 완료",
        description: response.message || `${response.entries?.length || 0}개의 항목이 생성되었습니다.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dictionaries'] });
      setIsGenerateDialogOpen(false);
      setSelectedTables([]);
      setDictionaryName("");
      setDictionaryDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Dictionary 생성 실패",
        description: error.message || "Dictionary 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Extract sources from response (handle both array and object responses)
  const sources: SchemaSource[] = Array.isArray(sourcesData) 
    ? sourcesData 
    : sourcesData?.sources || [];
  
  // Extract schema tree from response (handle both object and nested responses)
  const schemaTree: SchemaTree = schemaTreeData?.schemaTree 
    ? schemaTreeData.schemaTree 
    : schemaTreeData || {};
  
  // Handle both flat table structure and nested database/schema structure
  let tables: SchemaTable[] = [];
  if (schemaTree.tables && schemaTree.tables.length > 0) {
    tables = schemaTree.tables;
  } else if (schemaTree.databases && schemaTree.databases.length > 0) {
    // Flatten tables from all databases
    tables = schemaTree.databases.flatMap(db => db.tables || []);
  }

  const handleTableToggle = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const handleGenerateDictionary = () => {
    if (selectedTables.length === 0) {
      toast({
        title: "테이블 선택 필요",
        description: "최소 1개 이상의 테이블을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!dictionaryName.trim()) {
      toast({
        title: "Dictionary 이름 필요",
        description: "Dictionary 이름을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    generateDictionaryMutation.mutate({
      tableNames: selectedTables,
      dictionaryName: dictionaryName.trim(),
      description: dictionaryDescription.trim() || undefined
    });
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <h1 className="text-3xl font-bold">스키마 의미 매핑</h1>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground mt-2">
            데이터베이스 스키마에서 AI 기반 Dictionary를 자동 생성하고 관리합니다
          </p>
        </div>
        <Link href="/dictionary-manager">
          <Button
            variant="outline"
            data-testid="button-manage-dictionaries"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Dictionary 관리
          </Button>
        </Link>
      </div>

      {/* Schema Source Selection */}
      <Card data-testid="card-source-selection">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>스키마 소스 선택</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="schema-source">데이터베이스 소스</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger data-testid="select-schema-source">
                  <SelectValue placeholder="스키마 소스를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((source: SchemaSource) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name} ({source.type})
                      {source.isDefault && <Badge className="ml-2" variant="secondary">기본</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sourcesLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!treeLoading && treeError && (
              <div className="text-center py-8 text-destructive">
                <p>스키마 트리를 불러오는 중 오류가 발생했습니다.</p>
                <p className="text-sm mt-2">{treeError instanceof Error ? treeError.message : 'Unknown error'}</p>
              </div>
            )}

            {sources.length === 0 && !sourcesLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <p>등록된 스키마 소스가 없습니다.</p>
                <p className="text-sm mt-2">관리자에게 스키마 소스 등록을 요청하세요.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schema Tables Selection */}
      {selectedSource && (
        <Card data-testid="card-tables-selection">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Table2 className="w-5 h-5 text-primary" />
                <span>테이블 선택</span>
              </div>
              <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={selectedTables.length === 0}
                    data-testid="button-generate-dictionary"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Dictionary 생성
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dictionary 생성</DialogTitle>
                    <DialogDescription>
                      선택한 {selectedTables.length}개 테이블에서 AI 기반 Dictionary를 생성합니다
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="dict-name">Dictionary 이름 *</Label>
                      <Input
                        id="dict-name"
                        value={dictionaryName}
                        onChange={(e) => setDictionaryName(e.target.value)}
                        placeholder="예: 금융데이터 Dictionary"
                        data-testid="input-dictionary-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dict-desc">설명 (선택사항)</Label>
                      <Textarea
                        id="dict-desc"
                        value={dictionaryDescription}
                        onChange={(e) => setDictionaryDescription(e.target.value)}
                        placeholder="Dictionary 설명을 입력하세요"
                        rows={3}
                        data-testid="input-dictionary-description"
                      />
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">선택된 테이블:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTables.map(table => (
                          <Badge key={table} variant="secondary">{table}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsGenerateDialogOpen(false)}
                      data-testid="button-cancel-generate"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleGenerateDictionary}
                      disabled={generateDictionaryMutation.isPending}
                      data-testid="button-confirm-generate"
                    >
                      {generateDictionaryMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          생성
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {treeLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!treeLoading && tables.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>스키마 정보를 가져올 수 없습니다.</p>
              </div>
            )}

            {!treeLoading && tables.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    총 {tables.length}개 테이블 (선택: {selectedTables.length}개)
                  </p>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTables(tables.map(t => t.name))}
                      data-testid="button-select-all"
                    >
                      전체 선택
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTables([])}
                      data-testid="button-deselect-all"
                    >
                      선택 해제
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tables.map((table) => (
                    <Card
                      key={table.name}
                      className={`cursor-pointer transition-all ${
                        selectedTables.includes(table.name)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleTableToggle(table.name)}
                      data-testid={`card-table-${table.name}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedTables.includes(table.name)}
                                onCheckedChange={() => handleTableToggle(table.name)}
                                data-testid={`checkbox-table-${table.name}`}
                              />
                              <h4 className="font-medium">{table.name}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {table.columns.length}개 컬럼
                            </p>
                          </div>
                          {selectedTables.includes(table.name) && (
                            <Check className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card data-testid="card-info">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <span>사용 안내</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. 스키마 소스를 선택하여 데이터베이스 구조를 확인하세요</p>
          <p>2. Dictionary를 생성할 테이블들을 선택하세요</p>
          <p>3. AI가 자동으로 테이블과 컬럼의 의미를 분석하여 Dictionary를 생성합니다</p>
          <p>4. 생성된 Dictionary는 "Dictionary 관리" 메뉴에서 수정할 수 있습니다</p>
          <p>5. NL to SQL 엔진에서 Dictionary를 활용하여 더 정확한 SQL을 생성할 수 있습니다</p>
        </CardContent>
      </Card>
    </div>
  );
}
