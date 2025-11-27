import { Input } from "@/components/ui/input";
import { DraggableNodeData } from "@/types/workflow";
import { useQuery } from "@tanstack/react-query";
import type { Prompt, ApiCall, Workflow, PythonScript, DataSource, SqlQuery, RagEmbeddingSchema } from "@shared/schema";
import { useMemo, useState } from "react";
import { Bot, Share, GitBranch, Merge, Newspaper, BarChart3, Calculator, TrendingUp, MessageSquare, Loader2, Sparkles, Tags, Bell, Database, RefreshCw, Play, Code2, FileCode, Server, StopCircle, Search, ChevronDown, ChevronRight } from "lucide-react";

// Type for enhanced node data with database IDs
interface EnhancedDraggableNodeData extends DraggableNodeData {
  id?: string;
  promptId?: string;
  apiCallId?: string;
  workflowId?: string;
  pythonScriptId?: string;
  systemPrompt?: string;
  url?: string;
  method?: string;
  definition?: any;
          pythonScript?: string;
          pythonRequirements?: string;
          userPromptTemplate?: string;
        }

interface NodePaletteProps {
  onNodeSelect?: (nodeData: EnhancedDraggableNodeData) => void;
  onNodeDoubleClick?: (nodeData: EnhancedDraggableNodeData) => void;
}

export function NodePalette({ onNodeSelect, onNodeDoubleClick }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Fetch data from APIs with explicit queryFn
  const { data: prompts, isLoading: promptsLoading } = useQuery<Prompt[]>({
    queryKey: ['/api/prompts'],
    queryFn: async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('GET', '/api/prompts');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      return await response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const { data: apiCalls, isLoading: apiCallsLoading } = useQuery<ApiCall[]>({
    queryKey: ['/api/api-calls'],
    queryFn: async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('GET', '/api/api-calls');
      if (!response.ok) {
        throw new Error('Failed to fetch API calls');
      }
      return await response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const { data: workflows, isLoading: workflowsLoading } = useQuery<Workflow[]>({
    queryKey: ['/api/workflows'],
    queryFn: async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('GET', '/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      return await response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const { data: pythonScripts, isLoading: pythonScriptsLoading } = useQuery<PythonScript[]>({
    queryKey: ['/api/python-scripts'],
    queryFn: async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('GET', '/api/python-scripts');
      if (!response.ok) {
        throw new Error('Failed to fetch Python scripts');
      }
      return await response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Data sources for SQL nodes
  const { data: dataSources, isLoading: dataSourcesLoading } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources', { isActive: true }],
    queryFn: async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('GET', '/api/data-sources?isActive=true');
      if (!response.ok) {
        throw new Error('Failed to fetch data sources');
      }
      return await response.json();
    },
    staleTime: 30 * 1000,
  });

  // SQL queries for SQL nodes
  const { data: sqlQueries, isLoading: sqlQueriesLoading } = useQuery<SqlQuery[]>({
    queryKey: ['/api/sql-queries', { isActive: true }],
    queryFn: async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('GET', '/api/sql-queries?isActive=true');
      if (!response.ok) {
        throw new Error('Failed to fetch SQL queries');
      }
      return await response.json();
    },
    staleTime: 30 * 1000,
  });

  // RAG Embedding Schemas for RAG nodes
  const { data: ragSchemas, isLoading: ragSchemasLoading } = useQuery<RagEmbeddingSchema[]>({
    queryKey: ['/api/rag/embedding/schemas'],
    queryFn: async () => {
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('GET', '/api/rag/embedding/schemas');
      if (!response.ok) {
        throw new Error('Failed to fetch RAG schemas');
      }
      return await response.json();
    },
    staleTime: 30 * 1000,
  });

  // Convert API data to node categories
  const nodeCategories = useMemo(() => {
    const categories = [];

    // Prompts category
    if (prompts) {
      const promptNodes: EnhancedDraggableNodeData[] = prompts
        .filter(prompt => prompt.isActive)
        .map(prompt => ({
          type: "prompt" as const,
          label: prompt.name,
          description: prompt.description || "프롬프트 실행",
          icon: getCategoryIcon(prompt.category),
          color: getCategoryColor(prompt.category),
          category: "prompt",
          id: prompt.id,
          promptId: prompt.id,
          systemPrompt: prompt.systemPrompt,
          userPromptTemplate: prompt.userPromptTemplate || undefined,
        }));

      if (promptNodes.length > 0) {
        categories.push({
          category: "프롬프트",
          nodes: promptNodes,
        });
      }
    }

    // API Calls category
    if (apiCalls) {
      const apiNodes: EnhancedDraggableNodeData[] = apiCalls
        .filter(apiCall => apiCall.isActive)
        .map(apiCall => ({
          type: "api" as const,
          label: apiCall.name,
          description: apiCall.description || "API 호출 실행",
          icon: "bot",
          color: "text-accent",
          category: "api",
          id: apiCall.id,
          apiCallId: apiCall.id,
          url: apiCall.url,
          method: apiCall.method,
        }));

      if (apiNodes.length > 0) {
        categories.push({
          category: "API 호출",
          nodes: apiNodes,
        });
      }
    }

    // Workflows category (existing workflows as sub-workflows)
    if (workflows) {
      const workflowNodes: EnhancedDraggableNodeData[] = workflows
        .filter(workflow => workflow.isActive)
        .map(workflow => ({
          type: "workflow" as const,
          label: workflow.name,
          description: workflow.description || "하위 워크플로우 실행",
          icon: "share",
          color: "text-chart-3",
          category: "workflow",
          id: workflow.id,
          workflowId: workflow.id,
          definition: workflow.definition,
        }));

      if (workflowNodes.length > 0) {
        categories.push({
          category: "워크플로우",
          nodes: workflowNodes,
        });
      }
    }

    // Flow control nodes (keep hardcoded for now)
    categories.push({
      category: "플로우 제어",
      nodes: [
        {
          type: "condition" as const,
          label: "조건 분기",
          description: "조건에 따른 실행 분기",
          icon: "git-branch",
          color: "text-orange-400",
          category: "control",
        },
        {
          type: "merge" as const,
          label: "결과 병합",
          description: "여러 결과를 하나로 결합",
          icon: "merge",
          color: "text-red-400",
          category: "control",
        },
        {
          type: "loop" as const,
          label: "반복 실행",
          description: "조건을 만족할 때까지 반복",
          icon: "refresh",
          color: "text-orange-500",
          category: "control",
        },
        {
          type: "branch" as const,
          label: "병렬 분기",
          description: "동시에 여러 작업 실행",
          icon: "git-branch",
          color: "text-cyan-500",
          category: "control",
        },
        {
          type: "end" as const,
          label: "종료",
          description: "워크플로우 종료점",
          icon: "stop-circle",
          color: "text-gray-600",
          category: "control",
        },
      ] as EnhancedDraggableNodeData[],
    });

    // AI/Analysis nodes
    categories.push({
      category: "AI 분석",
      nodes: [
        {
          type: "ai_analysis" as const,
          label: "AI 분석",
          description: "AI를 활용한 데이터 분석",
          icon: "brain",
          color: "text-purple-500",
          category: "ai",
        },
        {
          type: "theme_classifier" as const,
          label: "테마 분류",
          description: "콘텐츠를 테마별로 자동 분류",
          icon: "tags",
          color: "text-blue-600",
          category: "ai",
        },
        {
          type: "data_aggregator" as const,
          label: "데이터 집계",
          description: "여러 소스의 데이터를 통합",
          icon: "database",
          color: "text-green-500",
          category: "data",
        },
        {
          type: "alert" as const,
          label: "알림 생성",
          description: "조건 충족 시 알림 발송",
          icon: "bell",
          color: "text-red-400",
          category: "notification",
        },
      ] as EnhancedDraggableNodeData[],
    });

    // Python Scripts category
    if (pythonScripts) {
      const pythonNodes: EnhancedDraggableNodeData[] = pythonScripts
        .filter(script => script.isActive)
        .map(script => ({
          type: "python_script" as const,
          label: script.name,
          description: script.description || "Python 코드 실행",
          icon: "code2",
          color: "text-yellow-600",
          category: "python",
          id: script.id,
          pythonScriptId: script.id,
          pythonScript: script.pythonScript,
          pythonRequirements: script.pythonRequirements || undefined,
        }));

      if (pythonNodes.length > 0) {
        categories.push({
          category: "Python 스크립트",
          nodes: pythonNodes,
        });
      }
    }

    // SQL Queries category
    if (sqlQueries && dataSources) {
      const sqlQueryNodes: EnhancedDraggableNodeData[] = sqlQueries
        .filter((query: SqlQuery) => query.isActive)
        .map((query: SqlQuery) => {
          const dataSource = dataSources.find((ds: DataSource) => ds.id === query.dataSourceId);
          return {
            type: "sql_query" as const,
            label: query.displayName || query.name,
            description: query.description || `SQL 쿼리 실행 (${dataSource?.displayName || dataSource?.name || 'Unknown'})`,
            icon: "file-code",
            color: "text-emerald-600",
            category: "sql",
            id: query.id,
            sqlQueryId: query.id,
            dataSourceId: query.dataSourceId,
          } as unknown as EnhancedDraggableNodeData;
        });

      if (sqlQueryNodes.length > 0) {
        categories.push({
          category: "SQL 쿼리",
          nodes: sqlQueryNodes,
        });
      }
    }

    // RAG Schemas category
    if (ragSchemas) {
      const ragNodes: EnhancedDraggableNodeData[] = ragSchemas
        .filter((schema: RagEmbeddingSchema) => schema.isActive)
        .map((schema: RagEmbeddingSchema) => ({
          type: "rag" as const,
          label: schema.name,
          description: schema.description || `RAG 검색 실행 (${schema.searchIndexName})`,
          icon: "search",
          color: "text-violet-500",
          category: "rag",
          id: schema.id,
          ragSchemaId: schema.id,
          searchIndexName: schema.searchIndexName,
          vectorFieldName: schema.vectorFieldName || "content_vector",
          contentFieldName: schema.contentFieldName || "content",
        } as EnhancedDraggableNodeData));

      if (ragNodes.length > 0) {
        categories.push({
          category: "RAG 검색",
          nodes: ragNodes,
        });
      }
    }

    return categories;
  }, [prompts, apiCalls, workflows, pythonScripts, sqlQueries, dataSources, ragSchemas]);

  const handleDragStart = (e: React.DragEvent, nodeData: EnhancedDraggableNodeData) => {
    e.dataTransfer.setData('application/json', JSON.stringify(nodeData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const isLoading = promptsLoading || apiCallsLoading || workflowsLoading || pythonScriptsLoading || dataSourcesLoading || sqlQueriesLoading || ragSchemasLoading;

  // Filter categories and nodes based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return nodeCategories;
    }
    
    const query = searchQuery.toLowerCase();
    return nodeCategories
      .map(category => ({
        ...category,
        nodes: category.nodes.filter(node => 
          node.label.toLowerCase().includes(query) ||
          node.description?.toLowerCase().includes(query) ||
          node.type.toLowerCase().includes(query)
        )
      }))
      .filter(category => category.nodes.length > 0);
  }, [nodeCategories, searchQuery]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  // Auto-expand categories when searching
  useMemo(() => {
    if (searchQuery.trim()) {
      setExpandedCategories(new Set(filteredCategories.map(c => c.category)));
    }
  }, [searchQuery, filteredCategories]);

  // Check if we're inside a dialog (for node creation)
  const isInDialog = typeof window !== 'undefined' && document.querySelector('[role="dialog"]')?.contains(document.activeElement?.closest('[role="dialog"]') || null);

  return (
    <div className={`${isInDialog ? 'w-full' : 'w-80'} ${isInDialog ? '' : 'h-full'} bg-card ${isInDialog ? '' : 'border-r border-border'} flex flex-col`} data-testid="node-palette">
      {!isInDialog && (
        <div className="pb-4 flex-shrink-0 space-y-3 px-6 pt-6">
          <h3 className="text-lg font-medium text-foreground">구성 요소</h3>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
      )}
      {isInDialog && (
        <div className="pb-4 flex-shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="노드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
      )}
      <div className={`space-y-6 ${isInDialog ? 'p-4' : 'p-6 pt-0'} overflow-y-auto ${isInDialog ? '' : 'flex-1 min-h-0'}`}>
        {isLoading ? (
          <div className="text-center text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            데이터 로딩 중...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.category) || searchQuery.trim() !== '';
            return (
              <div key={category.category}>
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  <span>{category.category}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {isExpanded && (
                  <div className="space-y-2">
                {category.nodes.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">
                    등록된 항목이 없습니다
                  </div>
                ) : (
                  category.nodes.map((node) => (
                    <div
                      key={`${node.type}-${node.id || node.label}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, node)}
                      onClick={() => onNodeSelect?.(node)}
                      onDoubleClick={() => onNodeDoubleClick?.(node)}
                      className="p-3 bg-background border border-border rounded-lg cursor-move hover:border-primary transition-colors"
                      data-testid={`draggable-node-${node.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center">
                        <div className={`${node.color} mr-3`}>
                          {getIconComponent(node.icon || 'message-square')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {node.label}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {node.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Helper functions for icon and color mapping based on category
function getCategoryIcon(category?: string | null): string {
  switch (category?.toLowerCase()) {
    case '뉴스분석':
    case '뉴스':
      return "newspaper";
    case '테마분석':
    case '테마':
      return "bar-chart";
    case '정량분석':
    case '정량':
      return "calculator";
    case '시황분석':
      return "trending-up";
    default:
      return "message-square";
  }
}

// Function to get the icon component based on icon name
function getIconComponent(iconName: string) {
  const iconProps = { className: "w-4 h-4" };
  switch (iconName) {
    case "bot":
      return <Bot {...iconProps} />;
    case "share":
      return <Share {...iconProps} />;
    case "git-branch":
      return <GitBranch {...iconProps} />;
    case "merge":
      return <Merge {...iconProps} />;
    case "newspaper":
      return <Newspaper {...iconProps} />;
    case "bar-chart":
      return <BarChart3 {...iconProps} />;
    case "calculator":
      return <Calculator {...iconProps} />;
    case "trending-up":
      return <TrendingUp {...iconProps} />;
    case "message-square":
      return <MessageSquare {...iconProps} />;
    case "stop-circle":
      return <StopCircle {...iconProps} />;
    case "brain":
      return <Sparkles {...iconProps} />;
    case "tags":
      return <Tags {...iconProps} />;
    case "bell":
      return <Bell {...iconProps} />;
    case "database":
      return <Database {...iconProps} />;
    case "refresh":
      return <RefreshCw {...iconProps} />;
    case "play":
      return <Play {...iconProps} />;
    case "code2":
      return <Code2 {...iconProps} />;
    case "file-code":
      return <FileCode {...iconProps} />;
    case "server":
      return <Server {...iconProps} />;
    default:
      return <MessageSquare {...iconProps} />;
  }
}

function getCategoryColor(category?: string | null): string {
  switch (category?.toLowerCase()) {
    case '뉴스분석':
    case '뉴스':
      return "text-blue-400";
    case '테마분석':
    case '테마':
      return "text-green-400";
    case '정량분석':
    case '정량':
      return "text-purple-400";
    case '시황분석':
      return "text-yellow-400";
    default:
      return "text-blue-400";
  }
}
