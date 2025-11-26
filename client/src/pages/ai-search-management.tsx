import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  RefreshCw,
  Database,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SearchIndex {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    searchable?: boolean;
    filterable?: boolean;
    sortable?: boolean;
    facetable?: boolean;
    retrievable?: boolean;
    key?: boolean;
    dimensions?: number;
    vectorSearchProfile?: string;
  }>;
  fieldCount?: number;
  vectorFields?: any[];
  searchable?: any[];
}

export default function AISearchManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIndex, setSelectedIndex] = useState<SearchIndex | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newIndexName, setNewIndexName] = useState("");
  const [newIndexFields, setNewIndexFields] = useState("");

  // Fetch indexes
  const { data: indexesData, isLoading, refetch } = useQuery<{ success: boolean; indexes: SearchIndex[] }>({
    queryKey: ['/api/azure/ai-search/indexes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/azure/ai-search/indexes');
      if (!response.ok) {
        throw new Error('Failed to fetch indexes');
      }
      return await response.json();
    },
  });

  const indexes = indexesData?.indexes || [];

  // Create index mutation
  const createIndexMutation = useMutation({
    mutationFn: async (data: { name: string; fields: any[] }) => {
      const response = await apiRequest('POST', '/api/azure/ai-search/indexes', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to create index');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "인덱스 생성 완료",
        description: "AI Search 인덱스가 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/azure/ai-search/indexes'] });
      setIsCreateDialogOpen(false);
      setNewIndexName("");
      setNewIndexFields("");
    },
    onError: (error: any) => {
      toast({
        title: "인덱스 생성 실패",
        description: error.message || "인덱스 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Update index mutation
  const updateIndexMutation = useMutation({
    mutationFn: async (data: { name: string; fields: any[] }) => {
      const response = await apiRequest('PUT', `/api/azure/ai-search/indexes/${data.name}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to update index');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "인덱스 수정 완료",
        description: "AI Search 인덱스가 성공적으로 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/azure/ai-search/indexes'] });
      setIsEditDialogOpen(false);
      setSelectedIndex(null);
    },
    onError: (error: any) => {
      toast({
        title: "인덱스 수정 실패",
        description: error.message || "인덱스 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete index mutation
  const deleteIndexMutation = useMutation({
    mutationFn: async (indexName: string) => {
      const response = await apiRequest('DELETE', `/api/azure/ai-search/indexes/${indexName}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to delete index');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "인덱스 삭제 완료",
        description: "AI Search 인덱스가 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/azure/ai-search/indexes'] });
      setIsDeleteDialogOpen(false);
      setSelectedIndex(null);
    },
    onError: (error: any) => {
      toast({
        title: "인덱스 삭제 실패",
        description: error.message || "인덱스 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleCreateIndex = () => {
    try {
      const fields = JSON.parse(newIndexFields || "[]");
      if (!Array.isArray(fields)) {
        throw new Error("Fields must be an array");
      }
      createIndexMutation.mutate({
        name: newIndexName,
        fields,
      });
    } catch (error: any) {
      toast({
        title: "유효하지 않은 필드 형식",
        description: error.message || "필드는 유효한 JSON 배열이어야 합니다.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateIndex = () => {
    if (!selectedIndex) return;
    try {
      const fields = JSON.parse(newIndexFields || "[]");
      if (!Array.isArray(fields)) {
        throw new Error("Fields must be an array");
      }
      updateIndexMutation.mutate({
        name: selectedIndex.name,
        fields,
      });
    } catch (error: any) {
      toast({
        title: "유효하지 않은 필드 형식",
        description: error.message || "필드는 유효한 JSON 배열이어야 합니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteIndex = () => {
    if (!selectedIndex) return;
    deleteIndexMutation.mutate(selectedIndex.name);
  };

  const openEditDialog = (index: SearchIndex) => {
    setSelectedIndex(index);
    setNewIndexName(index.name);
    setNewIndexFields(JSON.stringify(index.fields, null, 2));
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (index: SearchIndex) => {
    setSelectedIndex(index);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Search 관리</h1>
          <p className="text-muted-foreground mt-2">
            Azure AI Search 인덱스, 인덱서, 데이터소스를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <Button
            onClick={() => {
              setNewIndexName("");
              setNewIndexFields("[]");
              setIsCreateDialogOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            인덱스 생성
          </Button>
        </div>
      </div>

      <Tabs defaultValue="indexes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="indexes">인덱스</TabsTrigger>
          <TabsTrigger value="indexers">인덱서</TabsTrigger>
          <TabsTrigger value="data-sources">데이터소스</TabsTrigger>
        </TabsList>

        <TabsContent value="indexes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                검색 인덱스 목록
              </CardTitle>
              <CardDescription>
                Azure AI Search 인덱스를 관리합니다. 인덱스는 검색 가능한 데이터의 구조를 정의합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : indexes.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    등록된 인덱스가 없습니다. 인덱스를 생성해주세요.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>필드 수</TableHead>
                        <TableHead>벡터 필드</TableHead>
                        <TableHead>검색 가능 필드</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {indexes.map((index) => (
                        <TableRow key={index.name}>
                          <TableCell className="font-medium">{index.name}</TableCell>
                          <TableCell>{index.fieldCount || index.fields?.length || 0}</TableCell>
                          <TableCell>
                            {index.vectorFields && index.vectorFields.length > 0 ? (
                              <Badge variant="secondary">{index.vectorFields.length}</Badge>
                            ) : (
                              <span className="text-muted-foreground">없음</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {index.searchable && index.searchable.length > 0 ? (
                              <Badge variant="outline">{index.searchable.length}</Badge>
                            ) : (
                              <span className="text-muted-foreground">없음</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(index)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indexers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>인덱서 관리</CardTitle>
              <CardDescription>
                인덱서 관리는 곧 제공될 예정입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  인덱서 관리 기능은 현재 개발 중입니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>데이터소스 관리</CardTitle>
              <CardDescription>
                데이터소스 관리는 곧 제공될 예정입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  데이터소스 관리 기능은 현재 개발 중입니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Index Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>인덱스 생성</DialogTitle>
            <DialogDescription>
              새로운 Azure AI Search 인덱스를 생성합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="index-name">인덱스 이름</Label>
              <Input
                id="index-name"
                value={newIndexName}
                onChange={(e) => setNewIndexName(e.target.value)}
                placeholder="예: news-index"
              />
            </div>
            <div>
              <Label htmlFor="index-fields">필드 정의 (JSON)</Label>
              <Textarea
                id="index-fields"
                value={newIndexFields}
                onChange={(e) => setNewIndexFields(e.target.value)}
                placeholder='[{"name": "id", "type": "Edm.String", "key": true}, {"name": "title", "type": "Edm.String", "searchable": true}]'
                rows={15}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                필드는 JSON 배열 형식으로 정의해야 합니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleCreateIndex}
              disabled={createIndexMutation.isPending || !newIndexName || !newIndexFields}
            >
              {createIndexMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  생성 중...
                </>
              ) : (
                "생성"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Index Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>인덱스 수정</DialogTitle>
            <DialogDescription>
              Azure AI Search 인덱스를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-index-name">인덱스 이름</Label>
              <Input
                id="edit-index-name"
                value={newIndexName}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="edit-index-fields">필드 정의 (JSON)</Label>
              <Textarea
                id="edit-index-fields"
                value={newIndexFields}
                onChange={(e) => setNewIndexFields(e.target.value)}
                rows={15}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                필드는 JSON 배열 형식으로 정의해야 합니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleUpdateIndex}
              disabled={updateIndexMutation.isPending || !newIndexFields}
            >
              {updateIndexMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  수정 중...
                </>
              ) : (
                "수정"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Index Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>인덱스 삭제</DialogTitle>
            <DialogDescription>
              정말로 인덱스 "{selectedIndex?.name}"를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteIndex}
              disabled={deleteIndexMutation.isPending}
            >
              {deleteIndexMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

