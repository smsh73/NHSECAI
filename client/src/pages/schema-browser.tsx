import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  Cloud,
  Server,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Table as TableIcon,
  Columns3,
  Play,
  FileText,
  Sparkles,
  TestTube,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  BookOpen,
  Layers,
  GitBranch,
  Box,
  Grid3x3,
  FileCode,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ServiceInfo {
  status: string;
  message: string;
  isConfigured: boolean;
  lastChecked: string;
  responseTime: number;
}

interface ServiceStatus {
  services: {
    databricks: ServiceInfo;
    postgresql: ServiceInfo;
    cosmosdb: ServiceInfo;
    aiSearch: ServiceInfo;
    openai: ServiceInfo;
  };
  timestamp: string;
  totalCheckTime: number;
  summary: {
    total: number;
    connected: number;
    configured: number;
    errors: number;
  };
}

interface SelectedItem {
  service: string;
  catalog?: string;
  schema?: string;
  table?: string;
  index?: string;
  database?: string;
  container?: string;
}

interface DatabricksSchema {
  catalogs: Array<{
    name: string;
    schemas: Array<{
      name: string;
      isSystem?: boolean;
      tables: Array<{
        name: string;
        type: string;
        rowCount?: number;
        isSystem?: boolean;
      }>;
    }>;
  }>;
}

interface PostgreSQLSchema {
  schemas: Array<{
    name: string;
    isSystem?: boolean;
    tables: Array<{
      name: string;
      type: string;
      rowCount?: number;
      isSystem?: boolean;
    }>;
  }>;
}

interface CosmosDBSchema {
  databases: Array<{
    id: string;
    containers: Array<{
      id: string;
      partitionKey: string;
    }>;
  }>;
}

interface AISearchSchema {
  indexes: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: string;
      searchable?: boolean;
    }>;
    fieldCount: number;
    vectorFields: any[];
    searchable: any[];
  }>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SchemaBrowser() {
  const { toast } = useToast();

  // State Management
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sqlQuery, setSqlQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [promptText, setPromptText] = useState("");
  const [queryResults, setQueryResults] = useState<any>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  
  // SQL Editor Auto-complete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const sqlTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch table/item details (must be declared before hooks that reference itemDetails)
  const { data: itemDetails, isLoading: itemLoading } = useQuery({
    queryKey: ["item-details", selectedItem],
    queryFn: async () => {
      if (!selectedItem) return null;

      let url = "";
      if (
        selectedItem.service === "databricks" &&
        selectedItem.catalog &&
        selectedItem.schema &&
        selectedItem.table
      ) {
        url = `/api/azure/databricks/delta-table/${selectedItem.catalog}/${selectedItem.schema}/${selectedItem.table}`;
      } else if (
        selectedItem.service === "postgresql" &&
        selectedItem.schema &&
        selectedItem.table
      ) {
        url = `/api/azure/postgresql/schema/${selectedItem.schema}/${selectedItem.table}`;
      } else if (
        selectedItem.service === "cosmosdb" &&
        selectedItem.database &&
        selectedItem.container
      ) {
        url = `/api/azure/cosmosdb/schema/${selectedItem.database}/${selectedItem.container}`;
      }

      if (!url) return null;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch item details");
      return response.json();
    },
    enabled:
      !!selectedItem &&
      ((selectedItem.service === "databricks" &&
        !!selectedItem.catalog &&
        !!selectedItem.schema &&
        !!selectedItem.table) ||
        (selectedItem.service === "postgresql" &&
          !!selectedItem.schema &&
          !!selectedItem.table) ||
        (selectedItem.service === "cosmosdb" &&
          !!selectedItem.database &&
          !!selectedItem.container)),
    retry: 1,
  });

  // 기본 SQL 쿼리 자동 설정
  useEffect(() => {
    if (!selectedItem) return;

    let defaultQuery = "";

    if (selectedItem.service === "databricks") {
      defaultQuery = `SELECT * FROM ${selectedItem.catalog}.${selectedItem.schema}.${selectedItem.table} LIMIT 10`;
    } else if (selectedItem.service === "postgresql") {
      defaultQuery = `SELECT * FROM ${selectedItem.schema}.${selectedItem.table} LIMIT 10`;
    } else {
      defaultQuery = `SELECT * FROM c`;
    }

    // ✅ 이미 사용자가 입력 중이라면 덮어쓰지 않음
    setSqlQuery((prev) => (prev ? prev : defaultQuery));
  }, [selectedItem]);

  // Get available columns for autocomplete
  const getAvailableColumns = useCallback(() => {
    if (!itemDetails?.columns) return [];
    return itemDetails.columns.map((col: any) => col.name);
  }, [itemDetails]);

  // Calculate cursor position in textarea for autocomplete
  const calculateCursorPosition = useCallback((textarea: HTMLTextAreaElement, cursorPos: number) => {
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const lineNumber = lines.length - 1;
    const charInLine = lines[lines.length - 1].length;
    
    // Create a temporary span to measure text width
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.font = window.getComputedStyle(textarea).font;
    span.style.fontFamily = window.getComputedStyle(textarea).fontFamily;
    span.style.fontSize = window.getComputedStyle(textarea).fontSize;
    span.style.whiteSpace = 'pre';
    span.textContent = lines[lines.length - 1];
    document.body.appendChild(span);
    
    const textWidth = span.offsetWidth;
    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 24;
    
    document.body.removeChild(span);
    
    // Get textarea position
    const textareaRect = textarea.getBoundingClientRect();
    const scrollTop = textarea.scrollTop;
    
    const top = textareaRect.top + (lineNumber * lineHeight) + lineHeight - scrollTop;
    const left = textareaRect.left + textWidth;
    
    return { top, left };
  }, []);

  // Handle SQL query change with autocomplete
  const handleSqlQueryChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setSqlQuery(value);
    setCursorPosition(cursorPos);

    // Get text before cursor
    const textBeforeCursor = value.substring(0, cursorPos);
    
    // Check for column autocomplete triggers
    const columns = getAvailableColumns();
    if (columns.length === 0) {
      setShowAutocomplete(false);
      return;
    }

    // Pattern 1: After dot (table.column)
    const dotMatch = textBeforeCursor.match(/(\w+)\.(\w*)$/);
    if (dotMatch) {
      const partialColumn = dotMatch[2].toLowerCase();
      const filteredColumns = columns.filter((col: string) => 
        col.toLowerCase().startsWith(partialColumn)
      );
      
      if (filteredColumns.length > 0) {
        setAutocompleteQuery(partialColumn);
        setSelectedAutocompleteIndex(0);
        setShowAutocomplete(true);
        
        // Calculate position
        if (sqlTextareaRef.current) {
          const pos = calculateCursorPosition(sqlTextareaRef.current, cursorPos);
          setAutocompletePosition(pos);
        }
      } else {
        setShowAutocomplete(false);
      }
      return;
    }

    // Pattern 2: After SELECT, FROM, WHERE, etc. (column name directly)
    const sqlKeywordMatch = textBeforeCursor.match(/(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|UPDATE|SET|INSERT INTO|VALUES)\s+(\w*)$/i);
    if (sqlKeywordMatch) {
      const partialColumn = sqlKeywordMatch[2].toLowerCase();
      const filteredColumns = columns.filter((col: string) => 
        col.toLowerCase().startsWith(partialColumn)
      );
      
      if (filteredColumns.length > 0 && partialColumn.length >= 0) {
        setAutocompleteQuery(partialColumn);
        setSelectedAutocompleteIndex(0);
        setShowAutocomplete(true);
        
        if (sqlTextareaRef.current) {
          const pos = calculateCursorPosition(sqlTextareaRef.current, cursorPos);
          setAutocompletePosition(pos);
        }
      } else {
        setShowAutocomplete(false);
      }
      return;
    }

    // Pattern 3: After comma in SELECT (column list)
    const commaMatch = textBeforeCursor.match(/SELECT\s+.*?,\s*(\w*)$/i);
    if (commaMatch) {
      const partialColumn = commaMatch[1].toLowerCase();
      const filteredColumns = columns.filter((col: string) => 
        col.toLowerCase().startsWith(partialColumn)
      );
      
      if (filteredColumns.length > 0) {
        setAutocompleteQuery(partialColumn);
        setSelectedAutocompleteIndex(0);
        setShowAutocomplete(true);
        
        if (sqlTextareaRef.current) {
          const pos = calculateCursorPosition(sqlTextareaRef.current, cursorPos);
          setAutocompletePosition(pos);
        }
      } else {
        setShowAutocomplete(false);
      }
      return;
    }

    setShowAutocomplete(false);
  }, [getAvailableColumns, calculateCursorPosition]);

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback((columnName: string) => {
    if (!sqlTextareaRef.current) return;
    
    const textarea = sqlTextareaRef.current;
    const value = sqlQuery;
    const cursorPos = cursorPosition;
    
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    
    // Find the last match pattern and replace
    let newValue = value;
    let newCursorPos = cursorPos;
    
    // Pattern 1: After dot
    const dotMatch = textBeforeCursor.match(/(\w+)\.(\w*)$/);
    if (dotMatch) {
      const beforeDot = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf('.') + 1);
      newValue = beforeDot + columnName + textAfterCursor;
      newCursorPos = beforeDot.length + columnName.length;
    } 
    // Pattern 2: After SQL keyword
    else {
      const keywordMatch = textBeforeCursor.match(/(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|UPDATE|SET|INSERT INTO|VALUES)\s+(\w*)$/i);
      if (keywordMatch) {
        const beforeKeyword = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf(keywordMatch[2]));
        newValue = beforeKeyword + columnName + textAfterCursor;
        newCursorPos = beforeKeyword.length + columnName.length;
      }
      // Pattern 3: After comma
      else {
        const commaMatch = textBeforeCursor.match(/(.*?,\s*)(\w*)$/);
        if (commaMatch) {
          newValue = commaMatch[1] + columnName + textAfterCursor;
          newCursorPos = commaMatch[1].length + columnName.length;
        }
        // Default: just insert
        else {
          newValue = textBeforeCursor + columnName + textAfterCursor;
          newCursorPos = textBeforeCursor.length + columnName.length;
        }
      }
    }
    
    setSqlQuery(newValue);
    setShowAutocomplete(false);
    
    // Set cursor position
    setTimeout(() => {
      if (sqlTextareaRef.current) {
        sqlTextareaRef.current.focus();
        sqlTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [sqlQuery, cursorPosition]);

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete) {
      const columns = getAvailableColumns();
      const query = autocompleteQuery.toLowerCase();
      const filteredColumns = columns.filter((col: string) => 
        col.toLowerCase().startsWith(query)
      );

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) => 
          prev < filteredColumns.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) => 
          prev > 0 ? prev - 1 : filteredColumns.length - 1
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredColumns.length > 0) {
          handleAutocompleteSelect(filteredColumns[selectedAutocompleteIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowAutocomplete(false);
      }
    }
  }, [showAutocomplete, autocompleteQuery, selectedAutocompleteIndex, getAvailableColumns, handleAutocompleteSelect]);

  // Handle drag and drop for columns
  const handleColumnDragStart = useCallback((e: React.DragEvent, columnName: string) => {
    e.dataTransfer.setData("text/plain", columnName);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleColumnDragEnd = useCallback((e: React.DragEvent) => {
    // Reset drag state
  }, []);

  const handleSqlEditorDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleSqlEditorDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const columnName = e.dataTransfer.getData("text/plain");
    
    if (!sqlTextareaRef.current || !columnName) return;
    
    const textarea = sqlTextareaRef.current;
    const value = sqlQuery;
    const cursorPos = textarea.selectionStart || cursorPosition;
    
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    
    // Insert column name at cursor position
    const newValue = textBeforeCursor + columnName + textAfterCursor;
    const newCursorPos = cursorPos + columnName.length;
    
    setSqlQuery(newValue);
    
    // Set cursor position
    setTimeout(() => {
      if (sqlTextareaRef.current) {
        sqlTextareaRef.current.focus();
        sqlTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [sqlQuery, cursorPosition]);

  // Fetch Service Status with automatic polling (every 30 seconds)
  const {
    data: serviceStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery<ServiceStatus>({
    queryKey: ["/api/azure/services/status"],
    retry: false,
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false, // Stop polling when tab is not visible
  });

  // Fetch Databricks Unity Catalog
  const { data: unityCatalog, isLoading: unityCatalogLoading } = useQuery<any>({
    queryKey: ["/api/azure/databricks/unity-catalog"],
    enabled: serviceStatus?.services?.databricks?.status === "connected",
    retry: false,
  });

  // Fetch Databricks schema
  const { data: databricksSchema, isLoading: databricksLoading } =
    useQuery<DatabricksSchema>({
      queryKey: ["/api/azure/databricks/schema"],
      enabled: serviceStatus?.services?.databricks?.status === "connected",
      retry: false,
    });

  // Fetch PostgreSQL schema
  const { data: postgresqlSchema, isLoading: postgresqlLoading } =
    useQuery<PostgreSQLSchema>({
      queryKey: ["/api/azure/postgresql/schema"],
      enabled: serviceStatus?.services?.postgresql?.status === "connected",
      retry: false,
    });

  // Fetch CosmosDB schema
  const { data: cosmosdbSchema, isLoading: cosmosdbLoading } =
    useQuery<CosmosDBSchema>({
      queryKey: ["/api/azure/cosmosdb/schema"],
      enabled: serviceStatus?.services?.cosmosdb?.status === "connected",
      retry: false,
    });

  // Fetch AI Search schema
  const { data: aiSearchSchema, isLoading: aiSearchLoading } =
    useQuery<AISearchSchema>({
      queryKey: ["/api/azure/ai-search/schema"],
      enabled: serviceStatus?.services?.aiSearch?.status === "connected",
      retry: false,
    });

  // Fetch table/item details
  

  // Query execution mutation
  const queryMutation = useMutation({
    mutationFn: async (params: {
      service: string;
      sql?: string;
      database?: string;
      container?: string;
      query?: string;
      indexName?: string;
      searchText?: string;
    }) => {
      if (params.service === "databricks" || params.service === "postgresql") {
        const res = await apiRequest(
          "POST",
          `/api/azure/${params.service}/query`,
          { sql: params.sql, maxRows: 100 }
        );
        if (!res.ok) {
          const error = await res
            .json()
            .catch(() => ({ error: "Query execution failed" }));
          throw new Error(error.error || "Query execution failed");
        }
        return res.json();
      } else if (params.service === "cosmosdb") {
        const res = await apiRequest("POST", `/api/azure/cosmosdb/query`, {
          database: params.database,
          container: params.container,
          query: params.query,
          maxItems: 100,
        });
        if (!res.ok) {
          const error = await res
            .json()
            .catch(() => ({ error: "Query execution failed" }));
          throw new Error(error.error || "Query execution failed");
        }
        return res.json();
      } else if (params.service === "aiSearch") {
        const res = await apiRequest("POST", `/api/azure/ai-search/query`, {
          indexName: params.indexName,
          searchText: params.searchText,
          top: 10,
        });
        if (!res.ok) {
          const error = await res
            .json()
            .catch(() => ({ error: "Search failed" }));
          throw new Error(error.error || "Search failed");
        }
        return res.json();
      }
    },
    onSuccess: (data) => {
      setQueryResults(data);
      toast({
        title: "실행 성공",
        description: `${
          data?.data?.length || data?.results?.length || 0
        }개의 결과를 조회했습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "실행 실패",
        description: error.message || "쿼리 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Prompt recommendation mutation
  const recommendPromptMutation = useMutation({
    mutationFn: async (item: SelectedItem) => {
      const res = await apiRequest(
        "POST",
        "/api/schema-browser/recommend-prompt",
        item
      );
      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ success: false, error: "Prompt recommendation failed" }));
        throw new Error(error.error || error.message || "Prompt recommendation failed");
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Prompt recommendation failed");
      }
      return data;
    },
    onSuccess: (data) => {
      setAnalysisResults(null); // Clear previous analysis
      toast({
        title: "프롬프트 추천 완료",
        description: `${
          data.recommendations?.length || 0
        }개의 프롬프트를 생성했습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "프롬프트 추천 실패",
        description: error.message || "프롬프트 추천 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Prompt test mutation
  const testPromptMutation = useMutation({
    mutationFn: async (params: {
      service: string;
      sql: string;
      prompt: string;
    }) => {
      const res = await apiRequest(
        "POST",
        "/api/schema-browser/test-prompt",
        params
      );
      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Analysis failed" }));
        throw new Error(error.error || "Analysis failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysisResults(data);
      toast({
        title: "AI 분석 완료",
        description: "프롬프트 기반 분석이 완료되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "분석 실패",
        description: error.message || "AI 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Execute query handler
  const handleExecuteQuery = () => {
    if (!selectedItem) {
      toast({
        title: "오류",
        description: "항목을 먼저 선택하세요.",
        variant: "destructive",
      });
      return;
    }

    if (
      selectedItem.service === "databricks" ||
      selectedItem.service === "postgresql"
    ) {
      if (!sqlQuery.trim()) {
        toast({
          title: "오류",
          description: "SQL 쿼리를 입력하세요.",
          variant: "destructive",
        });
        return;
      }
      queryMutation.mutate({ service: selectedItem.service, sql: sqlQuery });
    } else if (selectedItem.service === "cosmosdb") {
      if (!sqlQuery.trim()) {
        toast({
          title: "오류",
          description: "Cosmos DB 쿼리를 입력하세요.",
          variant: "destructive",
        });
        return;
      }
      queryMutation.mutate({
        service: selectedItem.service,
        database: selectedItem.database,
        container: selectedItem.container,
        query: sqlQuery,
      });
    } else if (selectedItem.service === "aiSearch") {
      if (!searchQuery.trim()) {
        toast({
          title: "오류",
          description: "검색어를 입력하세요.",
          variant: "destructive",
        });
        return;
      }
      queryMutation.mutate({
        service: "aiSearch",
        indexName: selectedItem.index,
        searchText: searchQuery,
      });
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStatusBadge = (serviceName: string, serviceData: any) => {
    // Show loading state when status is loading
    if (statusLoading || !serviceData) {
      return (
        <div
          className="flex items-center gap-2"
          data-testid={`badge-status-${serviceName.toLowerCase()}`}
        >
          <Badge
            variant="secondary"
            className="bg-gray-500"
          >
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {serviceName}: 로딩중
          </Badge>
        </div>
      );
    }

    const isConnected = serviceData.status === "connected";
    const isError = serviceData.status === "error";
    const isConfigured = serviceData.isConfigured;

    return (
      <div
        className="flex items-center gap-2"
        data-testid={`badge-status-${serviceName.toLowerCase()}`}
      >
        <Badge
          variant={
            isConnected ? "default" : isError ? "destructive" : "secondary"
          }
          className={
            isConnected
              ? "bg-green-600"
              : isError
              ? "bg-red-600"
              : "bg-gray-500"
          }
        >
          {isConnected ? (
            <CheckCircle2 className="w-3 h-3 mr-1" />
          ) : isError ? (
            <AlertTriangle className="w-3 h-3 mr-1" />
          ) : (
            <XCircle className="w-3 h-3 mr-1" />
          )}
          {serviceName}
        </Badge>
        {isConfigured && serviceData.responseTime > 0 && (
          <span className="text-xs text-muted-foreground">
            {serviceData.responseTime}ms
          </span>
        )}
        {!isConfigured && (
          <span className="text-xs text-muted-foreground">미설정</span>
        )}
      </div>
    );
  };

  const renderDatabricksTree = () => {
    if (databricksLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      );
    }

    if (!databricksSchema?.catalogs) {
      return (
        <div className="p-4 text-sm text-muted-foreground">
          Unity Catalog 데이터를 불러올 수 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-2" data-testid="tree-databricks">
        {databricksSchema.catalogs.map((catalog) => (
          <CatalogItem
            key={catalog.name}
            catalog={catalog}
            onSelect={setSelectedItem}
          />
        ))}
      </div>
    );
  };

  const renderPostgreSQLTree = () => {
    if (postgresqlLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      );
    }

    if (!postgresqlSchema?.schemas) {
      return (
        <div className="p-4 text-sm text-muted-foreground">
          PostgreSQL 스키마를 불러올 수 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-2" data-testid="tree-postgresql">
        {postgresqlSchema.schemas.map((schema) => (
          <PostgreSQLSchemaItem
            key={schema.name}
            schema={schema}
            onSelect={setSelectedItem}
          />
        ))}
      </div>
    );
  };

  const renderCosmosDBTree = () => {
    if (cosmosdbLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      );
    }

    if (!cosmosdbSchema?.databases) {
      return (
        <div className="p-4 text-sm text-muted-foreground">
          Cosmos DB 데이터를 불러올 수 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-2" data-testid="tree-cosmosdb">
        {cosmosdbSchema.databases.map((db) => (
          <CosmosDBDatabaseItem
            key={db.id}
            database={db}
            onSelect={setSelectedItem}
          />
        ))}
      </div>
    );
  };

  const renderAISearchList = () => {
    if (aiSearchLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      );
    }

    if (!aiSearchSchema?.indexes) {
      return (
        <div className="p-4 text-sm text-muted-foreground">
          AI Search 인덱스를 불러올 수 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-2" data-testid="list-aisearch">
        {aiSearchSchema.indexes.map((index) => (
          <AISearchIndexItem
            key={index.name}
            index={index}
            onSelect={setSelectedItem}
          />
        ))}
      </div>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedItem) {
      return (
        <Alert>
          <AlertDescription className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            왼쪽에서 테이블, 컨테이너 또는 인덱스를 선택하세요.
          </AlertDescription>
        </Alert>
      );
    }

    if (itemLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Item Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {selectedItem.service === "databricks" &&
                `${selectedItem.catalog}.${selectedItem.schema}.${selectedItem.table}`}
              {selectedItem.service === "postgresql" &&
                `${selectedItem.schema}.${selectedItem.table}`}
              {selectedItem.service === "cosmosdb" &&
                `${selectedItem.database} / ${selectedItem.container}`}
              {selectedItem.service === "aiSearch" && selectedItem.index}
            </CardTitle>
            <CardDescription>
              {selectedItem.service === "databricks" &&
                "Databricks Delta Table"}
              {selectedItem.service === "postgresql" && "PostgreSQL Table"}
              {selectedItem.service === "cosmosdb" && "Cosmos DB Container"}
              {selectedItem.service === "aiSearch" && "AI Search Index"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemDetails && (
              <div className="space-y-4">
                {/* Columns/Fields - Table Format */}
                {itemDetails.columns && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      컬럼 스키마 ({itemDetails.columns.length})
                      {itemDetails.rowCount !== undefined && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          (레코드 수: {itemDetails.rowCount.toLocaleString()})
                        </span>
                      )}
                    </Label>
                    <div className="overflow-x-auto max-h-96 border rounded-md">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="border border-border p-2 text-left font-semibold">컬럼명</th>
                            <th className="border border-border p-2 text-left font-semibold">키</th>
                            <th className="border border-border p-2 text-left font-semibold">데이터타입</th>
                            <th className="border border-border p-2 text-left font-semibold">길이</th>
                            <th className="border border-border p-2 text-left font-semibold">Null 허용</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemDetails.columns.map((col: any, idx: number) => {
                            const keys = [];
                            if (col.isPrimaryKey || itemDetails.primaryKeys?.includes(col.name)) {
                              keys.push('PK');
                            }
                            if (col.isForeignKey) {
                              keys.push('FK');
                            }
                            if (col.isPartitionColumn) {
                              keys.push('PARTITION');
                            }
                            
                            const typeDisplay = col.type || '';
                            const lengthDisplay = col.maxLength 
                              ? `${col.maxLength}` 
                              : col.numericPrecision 
                                ? `${col.numericPrecision}${col.numericScale ? `,${col.numericScale}` : ''}`
                                : '-';

                            return (
                              <tr
                                key={idx}
                                className="hover:bg-muted/50 cursor-move"
                                draggable
                                onDragStart={(e) => handleColumnDragStart(e, col.name)}
                                onDragEnd={handleColumnDragEnd}
                                data-testid={`column-row-${idx}`}
                                title="컬럼명을 드래그하여 SQL 쿼리에 추가하세요"
                              >
                                <td className="border border-border p-2 font-mono">{col.name}</td>
                                <td className="border border-border p-2">
                                  {keys.length > 0 ? (
                                    <div className="flex gap-1">
                                      {keys.map((key, kIdx) => (
                                        <Badge key={kIdx} variant="secondary" className="text-xs">
                                          {key}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="border border-border p-2 font-mono text-xs">{typeDisplay}</td>
                                <td className="border border-border p-2 text-center">{lengthDisplay}</td>
                                <td className="border border-border p-2 text-center">
                                  {col.nullable !== false ? (
                                    <Badge variant="outline" className="text-xs">YES</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">NO</Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Delta Table Properties */}
                {itemDetails.deltaFormat && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Delta Table 정보
                    </Label>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">포맷: Delta</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Time Travel</Badge>
                      </div>
                      {itemDetails.properties?.partitionColumns?.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            파티션:{" "}
                          </span>
                          <span className="font-mono">
                            {itemDetails.properties.partitionColumns.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Partition Key (Cosmos DB) */}
                {itemDetails.partitionKey && (
                  <div>
                    <Label className="text-sm font-semibold">파티션 키</Label>
                    <p className="text-sm font-mono mt-1">
                      {itemDetails.partitionKey}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Query Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              {selectedItem.service === "aiSearch" ? "검색 쿼리" : "SQL 쿼리"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedItem.service === "aiSearch" ? (
              <div className="space-y-2">
                <Label>검색어</Label>
                <Input
                  placeholder="검색어를 입력하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-query"
                />
              </div>
            ) : (
              <div className="space-y-2 relative">
                <Label>SQL 쿼리 (SELECT/DELETE/UPDATE 지원)</Label>
                <div className="relative">
                  <Textarea
                    ref={sqlTextareaRef}
                    placeholder={
                      selectedItem.service === "databricks"
                        ? `SELECT * FROM ${selectedItem.catalog}.${selectedItem.schema}.${selectedItem.table} LIMIT 10`
                        : selectedItem.service === "postgresql"
                        ? `SELECT * FROM ${selectedItem.schema}.${selectedItem.table} LIMIT 10`
                        : `SELECT * FROM c`
                    }
                    value={sqlQuery}
                    onChange={handleSqlQueryChange}
                    onKeyDown={handleKeyDown}
                    onDrop={handleSqlEditorDrop}
                    onDragOver={handleSqlEditorDragOver}
                    onBlur={(e) => {
                      // Delay closing autocomplete to allow click on autocomplete items
                      setTimeout(() => setShowAutocomplete(false), 200);
                    }}
                    onFocus={(e) => {
                      // Re-check for autocomplete when focused
                      if (e.target.selectionStart !== null) {
                        const fakeEvent = {
                          target: e.target,
                          currentTarget: e.target,
                        } as React.ChangeEvent<HTMLTextAreaElement>;
                        handleSqlQueryChange(fakeEvent);
                      }
                    }}
                    className="font-mono text-sm min-h-[100px]"
                    data-testid="textarea-sql-query"
                  />
                  {/* Autocomplete Popup */}
                  {showAutocomplete && itemDetails?.columns && (
                    <div
                      className="absolute z-50 w-64 max-h-60 overflow-auto bg-popover border rounded-md shadow-lg"
                      style={{
                        top: `${autocompletePosition.top}px`,
                        left: `${autocompletePosition.left}px`,
                        position: 'fixed',
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <ScrollArea className="max-h-60">
                        <div className="p-1">
                          {getAvailableColumns()
                            .filter((col: string) => 
                              col.toLowerCase().startsWith(autocompleteQuery.toLowerCase())
                            )
                            .map((col: string, idx: number) => (
                              <div
                                key={col}
                                className={`p-2 cursor-pointer rounded hover:bg-muted ${
                                  idx === selectedAutocompleteIndex ? "bg-muted" : ""
                                }`}
                                onClick={() => handleAutocompleteSelect(col)}
                                onMouseEnter={() => setSelectedAutocompleteIndex(idx)}
                              >
                                <div className="flex items-center gap-2">
                                  <Columns3 className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-mono text-sm">{col}</span>
                                  {itemDetails.columns.find((c: any) => c.name === col) && (
                                    <Badge variant="outline" className="text-xs ml-auto">
                                      {itemDetails.columns.find((c: any) => c.name === col).type}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 팁: 컬럼명을 드래그하여 쿼리에 추가하거나, "." 또는 " " 입력 시 자동 완성이 표시됩니다.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleExecuteQuery}
                disabled={queryMutation.isPending}
                data-testid="button-execute-query"
              >
                {queryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 실행 중...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> 쿼리 실행
                  </>
                )}
              </Button>
              {selectedItem.service !== "aiSearch" && (
                <Button
                  variant="outline"
                  onClick={() => recommendPromptMutation.mutate(selectedItem)}
                  disabled={recommendPromptMutation.isPending}
                  data-testid="button-recommend-prompt"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  프롬프트 추천
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Query Results */}
        {queryResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                쿼리 결과
                <Badge variant="secondary">
                  {queryResults.data?.length ||
                    queryResults.results?.length ||
                    0}{" "}
                  rows
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {queryResults.data?.length > 0 && (
                  <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                    <table className="w-full border-collapse border border-border text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          {Object.keys(queryResults.data[0]).map((key) => (
                            <th
                              key={key}
                              className="border border-border p-2 text-left font-semibold"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResults.data.map((row: any, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-muted/50"
                            data-testid={`row-result-${idx}`}
                          >
                            {Object.values(row).map((val: any, i: number) => (
                              <td key={i} className="border border-border p-2">
                                {typeof val === "object"
                                  ? JSON.stringify(val)
                                  : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {queryResults.results && (
                  <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                    <pre className="bg-muted p-4 rounded-md text-xs">
                      {JSON.stringify(queryResults.results, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prompt Recommendations */}
        {recommendPromptMutation.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                추천 프롬프트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendPromptMutation.data.recommendations?.map(
                  (rec: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg space-y-2"
                      data-testid={`prompt-${idx}`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{rec.name}</h4>
                        <div className="flex gap-1">
                          {rec.queryType && (
                            <Badge 
                              variant={rec.queryType === "SELECT" ? "default" : rec.queryType === "UPDATE" ? "secondary" : "destructive"}
                              className={
                                rec.queryType === "SELECT" ? "bg-blue-600" :
                                rec.queryType === "UPDATE" ? "bg-yellow-600" :
                                "bg-red-600"
                              }
                            >
                              {rec.queryType}
                            </Badge>
                          )}
                          <Badge variant="outline">{rec.category}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rec.description}
                      </p>
                      <div className="space-y-2">
                        <Label className="text-xs">프롬프트</Label>
                        <Textarea
                          value={rec.prompt}
                          readOnly
                          className="text-xs font-mono"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">SQL 템플릿</Label>
                        <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                          {rec.sqlTemplate}
                        </pre>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSqlQuery(rec.sqlTemplate);
                          setPromptText(rec.prompt);
                        }}
                        data-testid={`button-use-prompt-${idx}`}
                      >
                        사용하기
                      </Button>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis Panel */}
        {promptText && sqlQuery && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                AI 분석 실행
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>분석 프롬프트</Label>
                <Textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="textarea-prompt"
                />
              </div>
              <Button
                onClick={() =>
                  testPromptMutation.mutate({
                    service: selectedItem.service,
                    sql: sqlQuery,
                    prompt: promptText,
                  })
                }
                disabled={testPromptMutation.isPending}
                data-testid="button-test-prompt"
              >
                {testPromptMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> AI 분석 실행
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysisResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                AI 분석 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm">
                  {analysisResults.analysis ||
                    analysisResults.result ||
                    JSON.stringify(analysisResults, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div
      className="container mx-auto p-6 space-y-6"
      data-testid="page-schema-browser"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="w-8 h-8" />
          통합 스키마 브라우저
        </h1>
        <p className="text-muted-foreground mt-2">
          Databricks Unity Catalog, PostgreSQL, Cosmos DB, AI Search를 한 곳에서
          탐색하고 분석합니다.
        </p>
      </div>

      {/* Service Status Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5" />
              서비스 상태
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              disabled={statusLoading}
              data-testid="button-refresh-status"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  statusLoading ? "animate-spin" : ""
                }`}
              />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {serviceStatus?.services && (
                <>
                  {renderStatusBadge(
                    "Databricks",
                    serviceStatus.services.databricks
                  )}
                  {renderStatusBadge(
                    "PostgreSQL",
                    serviceStatus.services.postgresql
                  )}
                  {renderStatusBadge(
                    "Cosmos DB",
                    serviceStatus.services.cosmosdb
                  )}
                  {renderStatusBadge(
                    "AI Search",
                    serviceStatus.services.aiSearch
                  )}
                  {renderStatusBadge("OpenAI", serviceStatus.services.openai)}
                </>
              )}
            </div>
            {statusLoading && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                서비스 상태 확인 중...
              </div>
            )}
            {serviceStatus && !statusLoading && (
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span>
                  마지막 확인:{" "}
                  {new Date(serviceStatus.timestamp).toLocaleTimeString(
                    "ko-KR"
                  )}
                </span>
                <span>·</span>
                <span>확인 시간: {serviceStatus.totalCheckTime}ms</span>
                <span>·</span>
                <span className="text-green-600 font-semibold">
                  {serviceStatus.summary?.connected || 0}/
                  {serviceStatus.summary?.total || 0} 연결됨
                </span>
                {serviceStatus.summary?.errors > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-red-600 font-semibold">
                      {serviceStatus.summary.errors} 오류
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Grid3x3 className="w-4 h-4 mr-2" />
            개요
          </TabsTrigger>
          <TabsTrigger
            value="databricks"
            disabled={
              serviceStatus?.services?.databricks?.status !== "connected"
            }
            data-testid="tab-databricks"
          >
            <Layers className="w-4 h-4 mr-2" />
            Databricks
          </TabsTrigger>
          <TabsTrigger
            value="postgresql"
            disabled={
              serviceStatus?.services?.postgresql?.status !== "connected"
            }
            data-testid="tab-postgresql"
          >
            <Database className="w-4 h-4 mr-2" />
            PostgreSQL
          </TabsTrigger>
          <TabsTrigger
            value="cosmosdb"
            disabled={serviceStatus?.services?.cosmosdb?.status !== "connected"}
            data-testid="tab-cosmosdb"
          >
            <Cloud className="w-4 h-4 mr-2" />
            Cosmos DB
          </TabsTrigger>
          <TabsTrigger
            value="aisearch"
            disabled={serviceStatus?.services?.aiSearch?.status !== "connected"}
            data-testid="tab-aisearch"
          >
            <Search className="w-4 h-4 mr-2" />
            AI Search
          </TabsTrigger>
          <TabsTrigger value="unified" data-testid="tab-unified">
            <Box className="w-4 h-4 mr-2" />
            통합 뷰
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* 실시간 서비스 상태 테스트 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  실시간 서비스 연결 상태
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchStatus()}
                  disabled={statusLoading}
                  data-testid="button-test-all-services"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      statusLoading ? "animate-spin" : ""
                    }`}
                  />
                  모든 서비스 테스트
                </Button>
              </div>
              <CardDescription>
                기능, 함수, 스키마, 데이터소스, OpenAI, AI Search, Databricks, PostgreSQL, CosmosDB 연결 및 동작 상태
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Databricks */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Databricks
                      </CardTitle>
                      {serviceStatus?.services?.databricks?.status === "connected" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : serviceStatus?.services?.databricks?.status === "error" ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">상태: </span>
                      <Badge
                        variant={
                          serviceStatus?.services?.databricks?.status === "connected"
                            ? "default"
                            : "destructive"
                        }
                        className={
                          statusLoading
                            ? "bg-gray-500"
                            : serviceStatus?.services?.databricks?.status === "connected"
                            ? "bg-green-600"
                            : serviceStatus?.services?.databricks?.status === "error"
                            ? "bg-red-600"
                            : "bg-gray-500"
                        }
                      >
                        {statusLoading
                          ? "로딩중"
                          : serviceStatus?.services?.databricks?.status === "connected"
                          ? "연결됨"
                          : serviceStatus?.services?.databricks?.status === "error"
                          ? "오류"
                          : "미연결"}
                      </Badge>
                    </div>
                    {serviceStatus?.services?.databricks?.isConfigured && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          응답 시간: {serviceStatus?.services?.databricks?.responseTime || 0}ms
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Catalogs: {databricksSchema?.catalogs?.length || 0}
                        </div>
                        {serviceStatus?.services?.databricks?.message && (
                          <div className="text-xs text-muted-foreground">
                            {serviceStatus?.services?.databricks?.message}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* PostgreSQL */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        PostgreSQL
                      </CardTitle>
                      {serviceStatus?.services?.postgresql?.status === "connected" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : serviceStatus?.services?.postgresql?.status === "error" ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">상태: </span>
                      <Badge
                        variant={
                          serviceStatus?.services?.postgresql?.status === "connected"
                            ? "default"
                            : "destructive"
                        }
                        className={
                          statusLoading
                            ? "bg-gray-500"
                            : serviceStatus?.services?.postgresql?.status === "connected"
                            ? "bg-green-600"
                            : serviceStatus?.services?.postgresql?.status === "error"
                            ? "bg-red-600"
                            : "bg-gray-500"
                        }
                      >
                        {statusLoading
                          ? "로딩중"
                          : serviceStatus?.services?.postgresql?.status === "connected"
                          ? "연결됨"
                          : serviceStatus?.services?.postgresql?.status === "error"
                          ? "오류"
                          : "미연결"}
                      </Badge>
                    </div>
                    {serviceStatus?.services?.postgresql?.isConfigured && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          응답 시간: {serviceStatus?.services?.postgresql?.responseTime || 0}ms
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tables: {postgresqlSchema?.schemas?.reduce((acc, s) => acc + s.tables.length, 0) || 0}
                        </div>
                        {serviceStatus?.services?.postgresql?.message && (
                          <div className="text-xs text-muted-foreground">
                            {serviceStatus?.services?.postgresql?.message}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* CosmosDB */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Cloud className="w-4 h-4" />
                        Cosmos DB
                      </CardTitle>
                      {serviceStatus?.services?.cosmosdb?.status === "connected" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : serviceStatus?.services?.cosmosdb?.status === "error" ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">상태: </span>
                      <Badge
                        variant={
                          serviceStatus?.services?.cosmosdb?.status === "connected"
                            ? "default"
                            : "destructive"
                        }
                        className={
                          statusLoading
                            ? "bg-gray-500"
                            : serviceStatus?.services?.cosmosdb?.status === "connected"
                            ? "bg-green-600"
                            : serviceStatus?.services?.cosmosdb?.status === "error"
                            ? "bg-red-600"
                            : "bg-gray-500"
                        }
                      >
                        {statusLoading
                          ? "로딩중"
                          : serviceStatus?.services?.cosmosdb?.status === "connected"
                          ? "연결됨"
                          : serviceStatus?.services?.cosmosdb?.status === "error"
                          ? "오류"
                          : "미연결"}
                      </Badge>
                    </div>
                    {serviceStatus?.services?.cosmosdb?.isConfigured && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          응답 시간: {serviceStatus?.services?.cosmosdb?.responseTime || 0}ms
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Containers: {cosmosdbSchema?.databases?.reduce((acc, db) => acc + db.containers.length, 0) || 0}
                        </div>
                        {serviceStatus?.services?.cosmosdb?.message && (
                          <div className="text-xs text-muted-foreground">
                            {serviceStatus?.services?.cosmosdb?.message}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* AI Search */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        AI Search
                      </CardTitle>
                      {serviceStatus?.services?.aiSearch?.status === "connected" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : serviceStatus?.services?.aiSearch?.status === "error" ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">상태: </span>
                      <Badge
                        variant={
                          serviceStatus?.services?.aiSearch?.status === "connected"
                            ? "default"
                            : "destructive"
                        }
                        className={
                          statusLoading
                            ? "bg-gray-500"
                            : serviceStatus?.services?.aiSearch?.status === "connected"
                            ? "bg-green-600"
                            : serviceStatus?.services?.aiSearch?.status === "error"
                            ? "bg-red-600"
                            : "bg-gray-500"
                        }
                      >
                        {statusLoading
                          ? "로딩중"
                          : serviceStatus?.services?.aiSearch?.status === "connected"
                          ? "연결됨"
                          : serviceStatus?.services?.aiSearch?.status === "error"
                          ? "오류"
                          : "미연결"}
                      </Badge>
                    </div>
                    {serviceStatus?.services?.aiSearch?.isConfigured && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          응답 시간: {serviceStatus?.services?.aiSearch?.responseTime || 0}ms
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Indexes: {aiSearchSchema?.indexes?.length || 0}
                        </div>
                        {serviceStatus?.services?.aiSearch?.message && (
                          <div className="text-xs text-muted-foreground">
                            {serviceStatus?.services?.aiSearch?.message}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* OpenAI */}
                <Card className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        OpenAI
                      </CardTitle>
                      {serviceStatus?.services?.openai?.status === "connected" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : serviceStatus?.services?.openai?.status === "error" ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">상태: </span>
                      <Badge
                        variant={
                          serviceStatus?.services?.openai?.status === "connected"
                            ? "default"
                            : "destructive"
                        }
                        className={
                          statusLoading
                            ? "bg-gray-500"
                            : serviceStatus?.services?.openai?.status === "connected"
                            ? "bg-green-600"
                            : serviceStatus?.services?.openai?.status === "error"
                            ? "bg-red-600"
                            : "bg-gray-500"
                        }
                      >
                        {statusLoading
                          ? "로딩중"
                          : serviceStatus?.services?.openai?.status === "connected"
                          ? "연결됨"
                          : serviceStatus?.services?.openai?.status === "error"
                          ? "오류"
                          : "미연결"}
                      </Badge>
                    </div>
                    {serviceStatus?.services?.openai?.isConfigured && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          응답 시간: {serviceStatus?.services?.openai?.responseTime || 0}ms
                        </div>
                        {serviceStatus?.services?.openai?.message && (
                          <div className="text-xs text-muted-foreground">
                            {serviceStatus?.services?.openai?.message}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Unity Catalog
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {databricksSchema?.catalogs?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Catalogs</p>
                  {unityCatalog?.unityCatalog?.features && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        Delta Sharing
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Data Lineage
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  PostgreSQL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {postgresqlSchema?.schemas?.reduce(
                      (acc, s) => acc + s.tables.length,
                      0
                    ) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Tables</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  Cosmos DB
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {cosmosdbSchema?.databases?.reduce(
                      (acc, db) => acc + db.containers.length,
                      0
                    ) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Containers</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  AI Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {aiSearchSchema?.indexes?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Indexes</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>기능 안내</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Unity Catalog 지원</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Databricks Unity Catalog의 Catalog → Schema → Table 계층
                  구조를 완벽 지원합니다.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Delta Table 분석</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Delta Lake 테이블의 파티션, Time Travel, 최적화 정보를
                  상세하게 확인할 수 있습니다.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">AI 프롬프트 생성</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  선택한 테이블 구조를 기반으로 시장 분석 프롬프트를 자동
                  생성하고 테스트할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Databricks Tab */}
        <TabsContent value="databricks" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Unity Catalog 계층 구조
                </CardTitle>
                <CardDescription>Catalog → Schema → Table</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {renderDatabricksTree()}
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="space-y-4">{renderDetailPanel()}</div>
          </div>
        </TabsContent>

        {/* PostgreSQL Tab */}
        <TabsContent value="postgresql" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  PostgreSQL 스키마
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {renderPostgreSQLTree()}
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="space-y-4">{renderDetailPanel()}</div>
          </div>
        </TabsContent>

        {/* Cosmos DB Tab */}
        <TabsContent value="cosmosdb" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  Cosmos DB 구조
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {renderCosmosDBTree()}
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="space-y-4">{renderDetailPanel()}</div>
          </div>
        </TabsContent>

        {/* AI Search Tab */}
        <TabsContent value="aisearch" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  AI Search 인덱스
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {renderAISearchList()}
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="space-y-4">{renderDetailPanel()}</div>
          </div>
        </TabsContent>

        {/* Unified Tab */}
        <TabsContent value="unified" className="space-y-4">
          <Alert>
            <AlertDescription className="flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              통합 뷰는 모든 데이터 소스를 한눈에 비교하고 통합 분석할 수 있는
              기능입니다.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceStatus?.services?.databricks?.status === "connected" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Databricks Unity Catalog
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {databricksSchema?.catalogs?.length || 0} Catalogs
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("databricks")}
                    data-testid="button-goto-databricks"
                  >
                    탐색하기
                  </Button>
                </CardContent>
              </Card>
            )}

            {serviceStatus?.services?.postgresql?.status === "connected" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">PostgreSQL</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {postgresqlSchema?.schemas?.length || 0} Schemas
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("postgresql")}
                    data-testid="button-goto-postgresql"
                  >
                    탐색하기
                  </Button>
                </CardContent>
              </Card>
            )}

            {serviceStatus?.services?.cosmosdb?.status === "connected" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cosmos DB</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {cosmosdbSchema?.databases?.length || 0} Databases
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("cosmosdb")}
                    data-testid="button-goto-cosmosdb"
                  >
                    탐색하기
                  </Button>
                </CardContent>
              </Card>
            )}

            {serviceStatus?.services?.aiSearch?.status === "connected" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {aiSearchSchema?.indexes?.length || 0} Indexes
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("aisearch")}
                    data-testid="button-goto-aisearch"
                  >
                    탐색하기
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// TREE ITEM COMPONENTS
// ============================================================================

function CatalogItem({ catalog, onSelect }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded w-full text-left"
        data-testid={`catalog-${catalog.name}`}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <GitBranch className="w-4 h-4 text-blue-500" />
        <span className="font-semibold">{catalog.name}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {catalog.schemas?.length || 0}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 space-y-1 mt-1">
        {catalog.schemas?.map((schema: any) => (
          <SchemaItem
            key={schema.name}
            catalogName={catalog.name}
            schema={schema}
            onSelect={onSelect}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SchemaItem({ catalogName, schema, onSelect }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded w-full text-left"
        data-testid={`schema-${catalogName}-${schema.name}`}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Layers className={`w-4 h-4 ${schema.isSystem ? 'text-muted-foreground' : 'text-purple-500'}`} />
        <span className={schema.isSystem ? 'text-muted-foreground' : ''}>{schema.name}</span>
        {schema.isSystem && (
          <Badge variant="outline" className="text-xs">시스템</Badge>
        )}
        <Badge variant="outline" className="ml-auto text-xs">
          {schema.tables?.length || 0}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 space-y-1 mt-1">
        {schema.tables?.map((table: any) => (
          <button
            key={table.name}
            onClick={() =>
              onSelect({
                service: "databricks",
                catalog: catalogName,
                schema: schema.name,
                table: table.name,
              })
            }
            className={`flex items-center gap-2 p-2 hover:bg-muted rounded w-full text-left text-sm ${table.isSystem ? 'opacity-75' : ''}`}
            data-testid={`table-${catalogName}-${schema.name}-${table.name}`}
          >
            <TableIcon className={`w-3 h-3 ${table.isSystem ? 'text-muted-foreground' : 'text-green-500'}`} />
            <span className={table.isSystem ? 'text-muted-foreground' : ''}>{table.name}</span>
            {table.isSystem && (
              <Badge variant="outline" className="text-xs">시스템</Badge>
            )}
            {table.rowCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                ({table.rowCount.toLocaleString()})
              </span>
            )}
            <Badge variant="secondary" className="ml-auto text-xs">
              {table.type || "DELTA"}
            </Badge>
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function PostgreSQLSchemaItem({ schema, onSelect }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded w-full text-left"
        data-testid={`pg-schema-${schema.name}`}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Database className={`w-4 h-4 ${schema.isSystem ? 'text-muted-foreground' : 'text-blue-500'}`} />
        <span className={`font-semibold ${schema.isSystem ? 'text-muted-foreground' : ''}`}>{schema.name}</span>
        {schema.isSystem && (
          <Badge variant="outline" className="text-xs">시스템</Badge>
        )}
        <Badge variant="secondary" className="ml-auto text-xs">
          {schema.tables?.length || 0}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 space-y-1 mt-1">
        {schema.tables?.map((table: any) => (
          <button
            key={table.name}
            onClick={() =>
              onSelect({
                service: "postgresql",
                schema: schema.name,
                table: table.name,
              })
            }
            className={`flex items-center gap-2 p-2 hover:bg-muted rounded w-full text-left text-sm ${table.isSystem ? 'opacity-75' : ''}`}
            data-testid={`pg-table-${schema.name}-${table.name}`}
          >
            <TableIcon className={`w-3 h-3 ${table.isSystem ? 'text-muted-foreground' : 'text-green-500'}`} />
            <span className={table.isSystem ? 'text-muted-foreground' : ''}>{table.name}</span>
            {table.isSystem && (
              <Badge variant="outline" className="text-xs">시스템</Badge>
            )}
            {table.rowCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                ({table.rowCount.toLocaleString()})
              </span>
            )}
            <Badge variant="outline" className="ml-auto text-xs">
              {table.type}
            </Badge>
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function CosmosDBDatabaseItem({ database, onSelect }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded w-full text-left"
        data-testid={`cosmos-db-${database.id}`}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Cloud className="w-4 h-4 text-blue-500" />
        <span className="font-semibold">{database.id}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {database.containers?.length || 0}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 space-y-1 mt-1">
        {database.containers?.map((container: any) => (
          <button
            key={container.id}
            onClick={() =>
              onSelect({
                service: "cosmosdb",
                database: database.id,
                container: container.id,
              })
            }
            className="flex items-center gap-2 p-2 hover:bg-muted rounded w-full text-left text-sm"
            data-testid={`cosmos-container-${database.id}-${container.id}`}
          >
            <Box className="w-3 h-3 text-purple-500" />
            <span>{container.id}</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {container.partitionKey}
            </Badge>
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function AISearchIndexItem({ index, onSelect }: any) {
  return (
    <button
      onClick={() => onSelect({ service: "aiSearch", index: index.name })}
      className="flex items-center gap-2 p-3 hover:bg-muted rounded w-full text-left border"
      data-testid={`aisearch-index-${index.name}`}
    >
      <Search className="w-4 h-4 text-blue-500" />
      <div className="flex-1">
        <div className="font-semibold">{index.name}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {index.fieldCount} fields · {index.vectorFields?.length || 0} vector
          fields
        </div>
      </div>
      <Badge variant="secondary">{index.fieldCount}</Badge>
    </button>
  );
}
