import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Database, 
  Table2, 
  Columns3, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Tags, 
  FileText,
  BookOpen,
  Settings
} from "lucide-react";

// Dictionary Entry Schema
const dictionaryEntrySchema = z.object({
  tableName: z.string().min(1, "테이블명을 입력해주세요"),
  columnName: z.string().min(1, "컬럼명을 입력해주세요"),
  meaningKo: z.string().min(1, "한국어 의미를 입력해주세요"),
  meaningEn: z.string().optional(),
  meaningKokr: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional()
});

type DictionaryEntryForm = z.infer<typeof dictionaryEntrySchema>;

interface DictionaryEntry {
  id: string;
  tableName: string;
  columnName: string;
  meaningKo?: string;
  meaningEn?: string;
  meaningKokr?: string;
  tags?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SchemaTable {
  name: string;
  displayName: string;
  description: string;
  columns: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

export default function DictionaryManager() {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for creating/editing entries
  const form = useForm<DictionaryEntryForm>({
    resolver: zodResolver(dictionaryEntrySchema),
    defaultValues: {
      tableName: "",
      columnName: "",
      meaningKo: "",
      meaningEn: "",
      meaningKokr: "",
      tags: "",
      notes: ""
    }
  });

  // Fetch schema information
  const { data: schemaData, isLoading: isLoadingSchema, error: schemaError } = useQuery({
    queryKey: ['/api/schema-info'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/schema-info');
      if (!res.ok) {
        throw new Error(`스키마 정보 조회 실패: ${res.status}`);
      }
      const data = await res.json();
      if (!data.success && data.error) {
        throw new Error(data.error);
      }
      return data;
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch dictionaries
  const { data: dictionariesData, isLoading: isLoadingDictionaries, error: dictionariesError } = useQuery({
    queryKey: ['/api/dictionaries'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/dictionaries');
      if (!res.ok) {
        throw new Error(`Dictionary 목록 조회 실패: ${res.status}`);
      }
      const data = await res.json();
      return data;
    },
    retry: 2,
    retryDelay: 1000
  });

  // Fetch dictionary entries
  const { data: entriesData, isLoading: isLoadingEntries, error: entriesError } = useQuery({
    queryKey: ['/api/dictionaries', 'default', 'entries', selectedTable, selectedColumn],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTable) params.set('tableName', selectedTable);
      if (selectedColumn) params.set('columnName', selectedColumn);
      const res = await apiRequest('GET', `/api/dictionaries/default/entries?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Dictionary 항목 조회 실패: ${res.status}`);
      }
      const data = await res.json();
      return data;
    },
    enabled: true,
    retry: 2,
    retryDelay: 1000
  });

  // Show error toast when API calls fail
  useEffect(() => {
    if (schemaError) {
      toast({
        title: "스키마 정보 조회 실패",
        description: schemaError instanceof Error ? schemaError.message : "스키마 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
    if (dictionariesError) {
      toast({
        title: "Dictionary 목록 조회 실패",
        description: dictionariesError instanceof Error ? dictionariesError.message : "Dictionary 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
    if (entriesError) {
      toast({
        title: "Dictionary 항목 조회 실패",
        description: entriesError instanceof Error ? entriesError.message : "Dictionary 항목을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [schemaError, dictionariesError, entriesError, toast]);

  // Create dictionary entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: DictionaryEntryForm) => {
      const entryData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : []
      };
      const res = await apiRequest('POST', '/api/dictionaries/default/entries', entryData);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Dictionary 항목 생성 중 오류가 발생했습니다.');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Dictionary 항목 생성 완료",
        description: "새로운 Dictionary 항목이 생성되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dictionaries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dictionaries', 'default', 'entries'] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Dictionary entry creation error:', error);
      toast({
        title: "Dictionary 항목 생성 실패",
        description: error.message || error.details || "Dictionary 항목 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Update dictionary entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DictionaryEntryForm }) => {
      const entryData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : []
      };
      const res = await apiRequest('PUT', `/api/dictionaries/entries/${id}`, entryData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Dictionary 항목 업데이트 완료",
        description: "Dictionary 항목이 업데이트되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dictionaries'] });
      setEditingEntry(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Dictionary 항목 업데이트 실패",
        description: error.details || "Dictionary 항목 업데이트 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Delete dictionary entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/dictionaries/entries/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Dictionary 항목 삭제 완료",
        description: "Dictionary 항목이 삭제되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dictionaries'] });
    },
    onError: (error: any) => {
      toast({
        title: "Dictionary 항목 삭제 실패",
        description: error.details || "Dictionary 항목 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Get tables and columns from schema
  const tables: SchemaTable[] = schemaData?.tables || [];
  const selectedTableInfo = tables.find(t => t.name === selectedTable);
  const columns = selectedTableInfo?.columns || [];
  
  // Watch form tableName for Dialog columns
  const formTableName = form.watch('tableName');
  const formTableInfo = tables.find(t => t.name === formTableName);
  const dialogColumns = formTableInfo?.columns || [];

  // Filter entries based on search and selection
  const filteredEntries = (entriesData?.entries || []).filter((entry: DictionaryEntry) => {
    const matchesSearch = !searchTerm || 
      entry.meaningKo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.columnName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleCreateEntry = (data: DictionaryEntryForm) => {
    createEntryMutation.mutate(data);
  };

  const handleUpdateEntry = (data: DictionaryEntryForm) => {
    if (editingEntry) {
      updateEntryMutation.mutate({ id: editingEntry.id, data });
    }
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm("정말 이 Dictionary 항목을 삭제하시겠습니까?")) {
      deleteEntryMutation.mutate(id);
    }
  };

  const handleEditEntry = (entry: DictionaryEntry) => {
    setEditingEntry(entry);
    form.reset({
      tableName: entry.tableName,
      columnName: entry.columnName,
      meaningKo: entry.meaningKo || "",
      meaningEn: entry.meaningEn || "",
      meaningKokr: entry.meaningKokr || "",
      tags: entry.tags?.join(', ') || "",
      notes: entry.notes || ""
    });
    setIsCreateDialogOpen(true);
  };

  const isProcessing = createEntryMutation.isPending || updateEntryMutation.isPending || deleteEntryMutation.isPending;

  return (
    <div className="w-full px-6 py-6 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="title-dictionary-manager">
        <BookOpen className="w-8 h-8 text-blue-600" />
        Dictionary 관리
      </h1>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground mt-2">
            데이터베이스 스키마의 테이블과 컬럼에 대한 사전적 의미를 관리하세요
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-entry" onClick={() => setEditingEntry(null)}>
                <Plus className="w-4 h-4 mr-2" />
                새 항목 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? "Dictionary 항목 수정" : "새 Dictionary 항목 추가"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form 
                  onSubmit={form.handleSubmit(editingEntry ? handleUpdateEntry : handleCreateEntry)} 
                  className="space-y-4"
                  data-testid="form-dictionary-entry"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tableName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>테이블명</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-table-name">
                                <SelectValue placeholder="테이블을 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {tables
                                  .filter(table => table?.name && typeof table.name === 'string' && table.name.trim() !== "")
                                  .map((table) => {
                                    const safeValue = table.name?.trim() || `table-${table.name}`;
                                    return (
                                      <SelectItem key={safeValue} value={safeValue}>
                                        {table.displayName || table.name} ({table.name})
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="columnName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>컬럼명</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              disabled={!formTableName}
                            >
                              <SelectTrigger data-testid="select-column-name">
                                <SelectValue placeholder={formTableName ? "컬럼을 선택하세요" : "먼저 테이블을 선택하세요"} />
                              </SelectTrigger>
                              <SelectContent>
                                {dialogColumns
                                  .filter(column => column?.name && typeof column.name === 'string' && column.name.trim() !== "")
                                  .map((column) => {
                                    const safeValue = column.name?.trim() || `column-${column.name}`;
                                    return (
                                      <SelectItem key={safeValue} value={safeValue}>
                                        {column.name} ({column.type || 'unknown'})
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="meaningKo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>한국어 의미 *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="컬럼의 한국어 의미를 입력하세요" data-testid="input-meaning-ko" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="meaningEn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>영어 의미</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="컬럼의 영어 의미 (선택사항)" data-testid="input-meaning-en" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meaningKokr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>한글 외래어 표기</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="한글 외래어 표기 (선택사항)" data-testid="input-meaning-kokr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>태그</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="태그를 쉼표로 구분하여 입력 (예: 가격, 주식, 거래)" data-testid="input-tags" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>메모</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="추가 설명이나 메모" data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      취소
                    </Button>
                    <Button type="submit" disabled={isProcessing} data-testid="button-save">
                      {isProcessing ? "저장 중..." : (editingEntry ? "수정" : "저장")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 필터 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">테이블 선택</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger data-testid="select-filter-table">
                  <SelectValue placeholder="모든 테이블" />
                </SelectTrigger>
                <SelectContent>
                  {tables
                    .filter(table => table?.name && typeof table.name === 'string' && table.name.trim() !== "")
                    .map((table) => {
                      const safeValue = table.name?.trim() || `table-${table.name}`;
                      return (
                        <SelectItem key={safeValue} value={safeValue}>
                          {table.displayName || table.name}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">컬럼 선택</label>
              <Select value={selectedColumn} onValueChange={setSelectedColumn} disabled={!selectedTable}>
                <SelectTrigger data-testid="select-filter-column">
                  <SelectValue placeholder="모든 컬럼" />
                </SelectTrigger>
                <SelectContent>
                  {columns
                    .filter(column => column?.name && typeof column.name === 'string' && column.name.trim() !== "")
                    .map((column) => {
                      const safeValue = column.name?.trim() || `column-${column.name}`;
                      return (
                        <SelectItem key={safeValue} value={safeValue}>
                          {column.name}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">검색</label>
              <Input
                placeholder="의미나 태그로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dictionary 항목 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Dictionary 항목 ({filteredEntries.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingEntries ? (
            <div className="text-center py-8">Dictionary 항목을 불러오는 중...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Dictionary 항목이 없습니다. 새 항목을 추가해보세요.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry: DictionaryEntry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" data-testid={`badge-table-${entry.id}`}>
                        <Table2 className="w-3 h-3 mr-1" />
                        {entry.tableName}
                      </Badge>
                      <Badge variant="secondary" data-testid={`badge-column-${entry.id}`}>
                        <Columns3 className="w-3 h-3 mr-1" />
                        {entry.columnName}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEntry(entry)}
                        data-testid={`button-edit-${entry.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteEntry(entry.id)}
                        disabled={isProcessing}
                        data-testid={`button-delete-${entry.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium" data-testid={`text-meaning-${entry.id}`}>
                      {entry.meaningKo}
                    </div>
                    {entry.meaningEn && (
                      <div className="text-sm text-muted-foreground">
                        영어: {entry.meaningEn}
                      </div>
                    )}
                    {entry.meaningKokr && (
                      <div className="text-sm text-muted-foreground">
                        한글 외래어: {entry.meaningKokr}
                      </div>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Tags className="w-3 h-3" />
                        {entry.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {entry.notes && (
                      <div className="text-sm text-muted-foreground mt-2">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}