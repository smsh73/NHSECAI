import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DataSource, SqlQuery } from "@shared/schema";
import { Plus, Edit, Trash2, Database, Search, X, FileCode, Table } from "lucide-react";

export default function DataSourceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDataSourceDialogOpen, setIsDataSourceDialogOpen] = useState(false);
  const [isSqlQueryDialogOpen, setIsSqlQueryDialogOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);
  const [editingSqlQuery, setEditingSqlQuery] = useState<SqlQuery | null>(null);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [schemaDataSourceId, setSchemaDataSourceId] = useState<string | null>(null);
  
  const [dataSourceFormData, setDataSourceFormData] = useState({
    name: '',
    displayName: '',
    type: 'databricks' as 'databricks' | 'postgresql' | 'cosmosdb' | 'jdbc' | 'ai_search',
    description: '',
    config: {} as Record<string, any>,
    host: '',
    port: undefined as number | undefined,
    database: '',
    schema: '',
    catalog: '',
    workspaceUrl: '',
    endpoint: '',
    credentialsKey: '',
    isActive: true,
    isDefault: false,
    tags: [] as string[],
  });

  const [sqlQueryFormData, setSqlQueryFormData] = useState({
    dataSourceId: '',
    name: '',
    displayName: '',
    description: '',
    query: '',
    queryType: 'select' as 'select' | 'insert' | 'update' | 'delete' | 'custom',
    parameters: null as any,
    resultSchema: null as any,
    timeout: 30000,
    maxRows: undefined as number | undefined,
    isActive: true,
    category: '',
    tags: [] as string[],
  });

  // Fetch data sources
  const { data: dataSources, isLoading: dataSourcesLoading } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/data-sources');
      if (!response.ok) {
        throw new Error('Failed to fetch data sources');
      }
      return await response.json();
    },
    retry: 2,
    staleTime: 30 * 1000,
  });

  // Fetch SQL queries
  const { data: sqlQueries, isLoading: sqlQueriesLoading } = useQuery<SqlQuery[]>({
    queryKey: ['/api/sql-queries', selectedDataSourceId],
    queryFn: async () => {
      const url = selectedDataSourceId 
        ? `/api/sql-queries?dataSourceId=${selectedDataSourceId}`
        : '/api/sql-queries';
      const response = await apiRequest('GET', url);
      if (!response.ok) {
        throw new Error('Failed to fetch SQL queries');
      }
      return await response.json();
    },
    enabled: true,
    retry: 2,
    staleTime: 30 * 1000,
  });

  // Create/Update Data Source mutation
  const dataSourceMutation = useMutation({
    mutationFn: async (data: Partial<DataSource>) => {
      const url = editingDataSource ? `/api/data-sources/${editingDataSource.id}` : '/api/data-sources';
      const method = editingDataSource ? 'PUT' : 'POST';
      const response = await apiRequest(method, url, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save data source');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      setIsDataSourceDialogOpen(false);
      setEditingDataSource(null);
      resetDataSourceForm();
      toast({
        title: "성공",
        description: editingDataSource ? "데이터소스가 업데이트되었습니다." : "데이터소스가 생성되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "데이터소스 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete Data Source mutation
  const deleteDataSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/data-sources/${id}`);
      if (!response.ok) {
        throw new Error('Failed to delete data source');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      toast({
        title: "성공",
        description: "데이터소스가 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "데이터소스 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Create/Update SQL Query mutation
  const sqlQueryMutation = useMutation({
    mutationFn: async (data: Partial<SqlQuery>) => {
      const url = editingSqlQuery ? `/api/sql-queries/${editingSqlQuery.id}` : '/api/sql-queries';
      const method = editingSqlQuery ? 'PUT' : 'POST';
      const response = await apiRequest(method, url, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save SQL query');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sql-queries'] });
      setIsSqlQueryDialogOpen(false);
      setEditingSqlQuery(null);
      resetSqlQueryForm();
      toast({
        title: "성공",
        description: editingSqlQuery ? "SQL 쿼리가 업데이트되었습니다." : "SQL 쿼리가 생성되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "SQL 쿼리 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete SQL Query mutation
  const deleteSqlQueryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/sql-queries/${id}`);
      if (!response.ok) {
        throw new Error('Failed to delete SQL query');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sql-queries'] });
      toast({
        title: "성공",
        description: "SQL 쿼리가 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "SQL 쿼리 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Filter data sources
  const filteredDataSources = React.useMemo(() => {
    if (!dataSources) return [];
    
    let filtered = dataSources;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ds => 
        ds.name.toLowerCase().includes(query) ||
        (ds.displayName && ds.displayName.toLowerCase().includes(query)) ||
        (ds.description && ds.description.toLowerCase().includes(query))
      );
    }
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(ds => ds.type === selectedType);
    }
    
    return filtered.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [dataSources, searchQuery, selectedType]);

  const resetDataSourceForm = () => {
    setDataSourceFormData({
      name: '',
      displayName: '',
      type: 'databricks',
      description: '',
      config: {},
      host: '',
      port: undefined,
      database: '',
      schema: '',
      catalog: '',
      workspaceUrl: '',
      endpoint: '',
      credentialsKey: '',
      isActive: true,
      isDefault: false,
      tags: [],
    });
  };

  const resetSqlQueryForm = () => {
    setSqlQueryFormData({
      dataSourceId: selectedDataSourceId || '',
      name: '',
      displayName: '',
      description: '',
      query: '',
      queryType: 'select',
      parameters: null,
      resultSchema: null,
      timeout: 30000,
      maxRows: undefined,
      isActive: true,
      category: '',
      tags: [],
    });
  };

  const handleOpenDataSourceDialog = (dataSource?: DataSource) => {
    if (dataSource) {
      setEditingDataSource(dataSource);
      setDataSourceFormData({
        name: dataSource.name || '',
        displayName: dataSource.displayName || '',
        type: dataSource.type as any,
        description: dataSource.description || '',
        config: (dataSource.config as Record<string, any>) || {},
        host: dataSource.host || '',
        port: dataSource.port || undefined,
        database: dataSource.database || '',
        schema: dataSource.schema || '',
        catalog: dataSource.catalog || '',
        workspaceUrl: dataSource.workspaceUrl || '',
        endpoint: dataSource.endpoint || '',
        credentialsKey: dataSource.credentialsKey || '',
        isActive: dataSource.isActive ?? true,
        isDefault: dataSource.isDefault ?? false,
        tags: dataSource.tags || [],
      });
    } else {
      setEditingDataSource(null);
      resetDataSourceForm();
    }
    setIsDataSourceDialogOpen(true);
  };

  const handleOpenSqlQueryDialog = (sqlQuery?: SqlQuery) => {
    if (sqlQuery) {
      setEditingSqlQuery(sqlQuery);
      setSqlQueryFormData({
        dataSourceId: sqlQuery.dataSourceId,
        name: sqlQuery.name || '',
        displayName: sqlQuery.displayName || '',
        description: sqlQuery.description || '',
        query: sqlQuery.query || '',
        queryType: (sqlQuery.queryType as any) || 'select',
        parameters: sqlQuery.parameters,
        resultSchema: sqlQuery.resultSchema,
        timeout: sqlQuery.timeout || 30000,
        maxRows: sqlQuery.maxRows || undefined,
        isActive: sqlQuery.isActive ?? true,
        category: sqlQuery.category || '',
        tags: sqlQuery.tags || [],
      });
    } else {
      setEditingSqlQuery(null);
      resetSqlQueryForm();
    }
    setIsSqlQueryDialogOpen(true);
  };

  const handleSaveDataSource = () => {
    if (!dataSourceFormData.name.trim()) {
      toast({
        title: "오류",
        description: "이름은 필수입니다.",
        variant: "destructive",
      });
      return;
    }

    dataSourceMutation.mutate(dataSourceFormData);
  };

  const handleSaveSqlQuery = () => {
    if (!sqlQueryFormData.name.trim()) {
      toast({
        title: "오류",
        description: "이름은 필수입니다.",
        variant: "destructive",
      });
      return;
    }

    if (!sqlQueryFormData.query.trim()) {
      toast({
        title: "오류",
        description: "SQL 쿼리는 필수입니다.",
        variant: "destructive",
      });
      return;
    }

    if (!sqlQueryFormData.dataSourceId) {
      toast({
        title: "오류",
        description: "데이터소스를 선택해야 합니다.",
        variant: "destructive",
      });
      return;
    }

    sqlQueryMutation.mutate(sqlQueryFormData);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      databricks: 'Databricks',
      postgresql: 'PostgreSQL',
      cosmosdb: 'CosmosDB',
      jdbc: 'JDBC',
      ai_search: 'AI Search (RAG)',
    };
    return labels[type] || type;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">데이터소스 관리</h1>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenSqlQueryDialog()}>
            <FileCode className="mr-2 h-4 w-4" />
            SQL 쿼리 추가
          </Button>
          <Button onClick={() => handleOpenDataSourceDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            데이터소스 추가
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="타입 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="databricks">Databricks</SelectItem>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="cosmosdb">CosmosDB</SelectItem>
                <SelectItem value="jdbc">JDBC</SelectItem>
                <SelectItem value="ai_search">AI Search</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dataSourcesLoading ? (
          <div className="col-span-full text-center py-8">로딩 중...</div>
        ) : filteredDataSources.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            데이터소스가 없습니다.
          </div>
        ) : (
          filteredDataSources.map((dataSource) => (
            <Card key={dataSource.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{dataSource.displayName || dataSource.name}</CardTitle>
                    <Badge variant="outline" className="mt-2">
                      {getTypeLabel(dataSource.type)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDataSourceId(dataSource.id);
                        handleOpenSqlQueryDialog();
                      }}
                      title="SQL 쿼리 추가"
                    >
                      <FileCode className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDataSourceDialog(dataSource)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('정말 삭제하시겠습니까?')) {
                          deleteDataSourceMutation.mutate(dataSource.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dataSource.description && (
                  <p className="text-sm text-muted-foreground mb-4">{dataSource.description}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {dataSource.isDefault && (
                    <Badge variant="secondary">기본</Badge>
                  )}
                  {!dataSource.isActive && (
                    <Badge variant="destructive">비활성</Badge>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedDataSourceId(dataSource.id)}
                  >
                    SQL 쿼리 보기 ({sqlQueries?.filter(q => q.dataSourceId === dataSource.id).length || 0})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSchemaDataSourceId(dataSource.id);
                      setSchemaDialogOpen(true);
                    }}
                  >
                    <Table className="mr-2 h-4 w-4" />
                    스키마 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* SQL Queries List (when data source is selected) */}
      {selectedDataSourceId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                SQL 쿼리 - {dataSources?.find(ds => ds.id === selectedDataSourceId)?.displayName || selectedDataSourceId}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedDataSourceId(null)}>
                  <X className="mr-2 h-4 w-4" />
                  닫기
                </Button>
                <Button onClick={() => handleOpenSqlQueryDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  SQL 쿼리 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sqlQueriesLoading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : sqlQueries?.filter(q => q.dataSourceId === selectedDataSourceId).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                SQL 쿼리가 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {sqlQueries?.filter(q => q.dataSourceId === selectedDataSourceId).map((sqlQuery) => (
                  <Card key={sqlQuery.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{sqlQuery.displayName || sqlQuery.name}</CardTitle>
                          <Badge variant="outline" className="mt-2">
                            {sqlQuery.queryType || 'select'}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenSqlQueryDialog(sqlQuery)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('정말 삭제하시겠습니까?')) {
                                deleteSqlQueryMutation.mutate(sqlQuery.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sqlQuery.description && (
                        <p className="text-sm text-muted-foreground mb-2">{sqlQuery.description}</p>
                      )}
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {sqlQuery.query}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Source Dialog */}
      <Dialog open={isDataSourceDialogOpen} onOpenChange={setIsDataSourceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDataSource ? '데이터소스 수정' : '데이터소스 추가'}
            </DialogTitle>
            <DialogDescription>
              데이터소스 연결 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={dataSourceFormData.name}
                  onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="displayName">표시 이름</Label>
                <Input
                  id="displayName"
                  value={dataSourceFormData.displayName}
                  onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, displayName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type">타입 *</Label>
              <Select
                value={dataSourceFormData.type}
                onValueChange={(value) => setDataSourceFormData({ ...dataSourceFormData, type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="databricks">Databricks</SelectItem>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="cosmosdb">CosmosDB</SelectItem>
                  <SelectItem value="jdbc">JDBC</SelectItem>
                  <SelectItem value="ai_search">AI Search (RAG)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={dataSourceFormData.description}
                onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, description: e.target.value })}
              />
            </div>
            
            {/* Type-specific fields */}
            {(dataSourceFormData.type === 'postgresql' || dataSourceFormData.type === 'jdbc') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="host">호스트</Label>
                    <Input
                      id="host"
                      value={dataSourceFormData.host}
                      onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, host: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">포트</Label>
                    <Input
                      id="port"
                      type="number"
                      value={dataSourceFormData.port || ''}
                      onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, port: e.target.value ? parseInt(e.target.value) : undefined })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="database">데이터베이스</Label>
                    <Input
                      id="database"
                      value={dataSourceFormData.database}
                      onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, database: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="schema">스키마</Label>
                    <Input
                      id="schema"
                      value={dataSourceFormData.schema}
                      onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, schema: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {dataSourceFormData.type === 'databricks' && (
              <>
                <div>
                  <Label htmlFor="workspaceUrl">Workspace URL</Label>
                  <Input
                    id="workspaceUrl"
                    value={dataSourceFormData.workspaceUrl}
                    onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, workspaceUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="catalog">카탈로그</Label>
                  <Input
                    id="catalog"
                    value={dataSourceFormData.catalog}
                    onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, catalog: e.target.value })}
                  />
                </div>
              </>
            )}

            {(dataSourceFormData.type === 'cosmosdb' || dataSourceFormData.type === 'ai_search') && (
              <div>
                <Label htmlFor="endpoint">엔드포인트</Label>
                <Input
                  id="endpoint"
                  value={dataSourceFormData.endpoint}
                  onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, endpoint: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="credentialsKey">자격 증명 키 (시스템 설정 참조)</Label>
              <Input
                id="credentialsKey"
                value={dataSourceFormData.credentialsKey}
                onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, credentialsKey: e.target.value })}
                placeholder="system_configurations.key 참조"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={dataSourceFormData.isActive}
                  onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive">활성</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={dataSourceFormData.isDefault}
                  onChange={(e) => setDataSourceFormData({ ...dataSourceFormData, isDefault: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isDefault">기본</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDataSourceDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveDataSource} disabled={dataSourceMutation.isPending}>
                {dataSourceMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SQL Query Dialog */}
      <Dialog open={isSqlQueryDialogOpen} onOpenChange={setIsSqlQueryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSqlQuery ? 'SQL 쿼리 수정' : 'SQL 쿼리 추가'}
            </DialogTitle>
            <DialogDescription>
              SQL 쿼리 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sqlDataSourceId">데이터소스 *</Label>
              <Select
                value={sqlQueryFormData.dataSourceId}
                onValueChange={(value) => setSqlQueryFormData({ ...sqlQueryFormData, dataSourceId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="데이터소스 선택" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources?.filter(ds => ds.isActive).map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.displayName || ds.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sqlName">이름 *</Label>
                <Input
                  id="sqlName"
                  value={sqlQueryFormData.name}
                  onChange={(e) => setSqlQueryFormData({ ...sqlQueryFormData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sqlDisplayName">표시 이름</Label>
                <Input
                  id="sqlDisplayName"
                  value={sqlQueryFormData.displayName}
                  onChange={(e) => setSqlQueryFormData({ ...sqlQueryFormData, displayName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sqlQueryType">쿼리 타입</Label>
              <Select
                value={sqlQueryFormData.queryType}
                onValueChange={(value) => setSqlQueryFormData({ ...sqlQueryFormData, queryType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">SELECT</SelectItem>
                  <SelectItem value="insert">INSERT</SelectItem>
                  <SelectItem value="update">UPDATE</SelectItem>
                  <SelectItem value="delete">DELETE</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sqlDescription">설명</Label>
              <Textarea
                id="sqlDescription"
                value={sqlQueryFormData.description}
                onChange={(e) => setSqlQueryFormData({ ...sqlQueryFormData, description: e.target.value })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="sqlQuery">SQL 쿼리 *</Label>
                {sqlQueryFormData.dataSourceId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSchemaDataSourceId(sqlQueryFormData.dataSourceId);
                      setSchemaDialogOpen(true);
                    }}
                  >
                    <Table className="mr-2 h-4 w-4" />
                    스키마 조회
                  </Button>
                )}
              </div>
              <Textarea
                id="sqlQuery"
                value={sqlQueryFormData.query}
                onChange={(e) => setSqlQueryFormData({ ...sqlQueryFormData, query: e.target.value })}
                className="font-mono text-sm"
                rows={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sqlTimeout">타임아웃 (ms)</Label>
                <Input
                  id="sqlTimeout"
                  type="number"
                  value={sqlQueryFormData.timeout}
                  onChange={(e) => setSqlQueryFormData({ ...sqlQueryFormData, timeout: parseInt(e.target.value) || 30000 })}
                />
              </div>
              <div>
                <Label htmlFor="sqlMaxRows">최대 행 수</Label>
                <Input
                  id="sqlMaxRows"
                  type="number"
                  value={sqlQueryFormData.maxRows || ''}
                  onChange={(e) => setSqlQueryFormData({ ...sqlQueryFormData, maxRows: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sqlCategory">카테고리</Label>
              <Input
                id="sqlCategory"
                value={sqlQueryFormData.category}
                onChange={(e) => setSqlQueryFormData({ ...sqlQueryFormData, category: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sqlIsActive"
                checked={sqlQueryFormData.isActive}
                onChange={(e) => setSqlQueryFormData({ ...sqlQueryFormData, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="sqlIsActive">활성</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsSqlQueryDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveSqlQuery} disabled={sqlQueryMutation.isPending}>
                {sqlQueryMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schema Dialog */}
      <Dialog open={schemaDialogOpen} onOpenChange={setSchemaDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>테이블 스키마</DialogTitle>
            <DialogDescription>
              {schemaDataSourceId && dataSources?.find(ds => ds.id === schemaDataSourceId)?.displayName || '데이터소스'}의 테이블 스키마 정보
            </DialogDescription>
          </DialogHeader>
          <SchemaViewer 
            dataSourceId={schemaDataSourceId}
            onTableSelect={(tableName) => {
              // SQL 쿼리에 테이블명 추가
              if (isSqlQueryDialogOpen && sqlQueryFormData.query) {
                setSqlQueryFormData({
                  ...sqlQueryFormData,
                  query: sqlQueryFormData.query + (sqlQueryFormData.query.trim().endsWith(';') ? '\n' : ' ') + tableName
                });
              }
            }}
            onColumnSelect={(columnName) => {
              // SQL 쿼리에 컬럼명 추가
              if (isSqlQueryDialogOpen && sqlQueryFormData.query) {
                setSqlQueryFormData({
                  ...sqlQueryFormData,
                  query: sqlQueryFormData.query + (sqlQueryFormData.query.trim().endsWith(';') ? '\n' : ', ') + columnName
                });
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Schema Viewer Component
function SchemaViewer({ 
  dataSourceId, 
  onTableSelect, 
  onColumnSelect 
}: { 
  dataSourceId: string | null;
  onTableSelect?: (tableName: string) => void;
  onColumnSelect?: (columnName: string) => void;
}) {
  const { toast } = useToast();
  
  const { data: schemaData, isLoading, error } = useQuery({
    queryKey: ['/api/data-sources', dataSourceId, 'schema'],
    queryFn: async () => {
      if (!dataSourceId) return null;
      const response = await apiRequest('GET', `/api/data-sources/${dataSourceId}/schema`);
      if (!response.ok) {
        throw new Error('스키마 조회 실패');
      }
      return await response.json();
    },
    enabled: !!dataSourceId,
    staleTime: 60 * 1000,
  });

  if (!dataSourceId) {
    return <div className="text-center py-8 text-muted-foreground">데이터소스를 선택해주세요.</div>;
  }

  if (isLoading) {
    return <div className="text-center py-8">스키마 정보를 불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        스키마 정보를 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

  if (!schemaData?.success || !schemaData?.schema) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        스키마 정보를 사용할 수 없습니다.
      </div>
    );
  }

  const schema = schemaData.schema;

  // Databricks schema format
  if (schema.catalogs) {
    return (
      <div className="space-y-4">
        {schema.catalogs.map((catalog: any, catalogIdx: number) => (
          <Card key={catalogIdx}>
            <CardHeader>
              <CardTitle className="text-lg">카탈로그: {catalog.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {catalog.schemas && catalog.schemas.length > 0 ? (
                <div className="space-y-4">
                  {catalog.schemas.map((schemaItem: any, schemaIdx: number) => (
                    <div key={schemaIdx} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">스키마: {schemaItem.name}</h4>
                      {schemaItem.tables && schemaItem.tables.length > 0 ? (
                        <div className="space-y-2">
                          {schemaItem.tables.map((table: any, tableIdx: number) => (
                            <div key={tableIdx} className="border-b pb-2 last:border-b-0">
                              <div className="font-medium">{table.name}</div>
                              <div className="text-sm text-muted-foreground">
                                타입: {table.type || 'TABLE'} | 행 수: {table.rowCount || 'N/A'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">테이블이 없습니다.</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">스키마가 없습니다.</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // PostgreSQL schema format
  if (schema.databases) {
    return (
      <div className="space-y-4">
        {schema.databases.map((database: any, dbIdx: number) => (
          <Card key={dbIdx}>
            <CardHeader>
              <CardTitle className="text-lg">데이터베이스: {database.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {database.tables && database.tables.length > 0 ? (
                <div className="space-y-2">
                  {database.tables.map((table: any, tableIdx: number) => (
                    <div key={tableIdx} className="border rounded-lg p-3">
                      <div 
                        className="font-medium mb-2 cursor-pointer hover:text-primary"
                        onClick={() => {
                          const fullTableName = `${database.name}.${table.name}`;
                          onTableSelect?.(fullTableName);
                          navigator.clipboard.writeText(fullTableName);
                          toast({
                            title: "테이블 추가됨",
                            description: `${fullTableName}이(가) 클립보드에 복사되었습니다.`,
                          });
                        }}
                        title="클릭하여 테이블명 복사"
                      >
                        {table.name}
                      </div>
                      {table.columns && table.columns.length > 0 && (
                        <div className="text-sm space-y-1">
                          <div className="font-semibold mb-1">컬럼:</div>
                          <div className="flex flex-wrap gap-1">
                            {table.columns.map((col: any, colIdx: number) => (
                              <Badge
                                key={colIdx}
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => {
                                  onColumnSelect?.(col.name);
                                  navigator.clipboard.writeText(col.name);
                                  toast({
                                    title: "컬럼 추가됨",
                                    description: `${col.name}이(가) 클립보드에 복사되었습니다.`,
                                  });
                                }}
                                title="클릭하여 컬럼명 복사"
                              >
                                {col.name} ({col.type})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">테이블이 없습니다.</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // CosmosDB or other formats
  return (
    <div className="space-y-4">
      <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}

