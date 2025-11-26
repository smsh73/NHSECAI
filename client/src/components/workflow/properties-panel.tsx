import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkflowNode } from "@/types/workflow";
import { useState, useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Prompt, ApiCall, PythonScript, SqlQuery, DataSource } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Play, Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PropertiesPanelProps {
  selectedNode: WorkflowNode | null;
  onNodeUpdate: (nodeId: string, updates: Partial<WorkflowNode['data']>) => void;
  onClose?: () => void;
  isVisible?: boolean;
  allNodes?: Array<{ id: string; data: any }>;
  allEdges?: Array<{ source: string; target: string }>;
  nodeExecutionResults?: Record<string, { input?: any; output?: any; error?: string; executionTime?: number; status?: string }>;
}

export function PropertiesPanel({ selectedNode, onNodeUpdate, onClose, isVisible = true, allNodes = [], allEdges = [], nodeExecutionResults = {} }: PropertiesPanelProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    label: '',
    description: '',
    timeout: 300,
    retryCount: 3,
    condition: 'previous_completed',
    systemPrompt: '',
    userPromptTemplate: '',
    maxTokens: 1000,
    temperature: 0.7,
    // Prompt specific fields
    inputSchema: null as any,
    outputSchema: null as any,
    parameters: null as any,
    executionType: 'text' as string,
    // API specific fields
    url: '',
    method: 'POST',
    headers: null as any,
    requestSchema: null as any,
    responseSchema: null as any,
    parameterTemplate: '',
    preprocessPrompt: '',
    postprocessPrompt: '',
    // RAG specific fields
    searchType: 'hybrid',
    topK: 10,
    threshold: 0.7,
    // Workflow specific fields
    workflowDescription: '',
    // DataSource specific fields
    query: '',
    source: 'databricks',
    outputKey: '',
    // SQL Query specific fields
    sqlQueryId: '',
    dataSourceId: '',
    // Branch/Condition specific fields
    conditionExpression: '',
    trueBranch: '',
    falseBranch: '',
    conditionType: 'expression',
    // Python script specific fields
    pythonScript: '',
    pythonRequirements: '',
    pythonTimeout: 30,
    pythonEnvironment: 'python3',
    pythonInputFormat: 'json',
    pythonOutputFormat: 'json',
    pythonWorkingDirectory: '',
    pythonMemoryLimit: 512,
    pythonCpuLimit: 50,
    pythonScriptId: '',
    exampleInput: null as any,
    exampleOutput: null as any,
    // Node data mapping fields
    inputMapping: null as any,
    outputMapping: null as any,
    // Prompt ID for ai_analysis nodes
    promptId: '',
  });

  // SQL query execution state
  const [sqlTestResult, setSqlTestResult] = useState<{
    data?: Array<Record<string, unknown>>;
    rowCount?: number;
    executionTime?: number;
    error?: string;
  } | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);

  // Fetch registered resources when node has IDs
  const promptId = selectedNode?.data?.promptId || selectedNode?.data?.config?.promptId;
  const apiCallId = selectedNode?.data?.apiCallId || selectedNode?.data?.config?.apiCallId;
  const pythonScriptId = (selectedNode?.data as any)?.pythonScriptId || selectedNode?.data?.config?.pythonScriptId;

  const { data: registeredPrompt } = useQuery<Prompt>({
    queryKey: ['/api/prompts', promptId],
    queryFn: async () => {
      if (!promptId) return null;
      const response = await apiRequest('GET', `/api/prompts/${promptId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!promptId,
    staleTime: 60 * 1000,
  });

  const { data: registeredApiCall } = useQuery<ApiCall>({
    queryKey: ['/api/api-calls', apiCallId],
    queryFn: async () => {
      if (!apiCallId) return null;
      const response = await apiRequest('GET', `/api/api-calls/${apiCallId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!apiCallId,
    staleTime: 60 * 1000,
  });

  const { data: registeredPythonScript } = useQuery<PythonScript>({
    queryKey: ['/api/python-scripts', pythonScriptId],
    queryFn: async () => {
      if (!pythonScriptId) return null;
      const response = await apiRequest('GET', `/api/python-scripts/${pythonScriptId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!pythonScriptId,
    staleTime: 60 * 1000,
  });

  const sqlQueryId = (selectedNode?.data as any)?.sqlQueryId || selectedNode?.data?.config?.sqlQueryId;
  const { data: registeredSqlQuery } = useQuery<SqlQuery>({
    queryKey: ['/api/sql-queries', sqlQueryId],
    queryFn: async () => {
      if (!sqlQueryId) return null;
      const response = await apiRequest('GET', `/api/sql-queries/${sqlQueryId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!sqlQueryId,
    staleTime: 60 * 1000,
  });

  // Fetch SQL queries list for dropdown
  const { data: sqlQueriesList } = useQuery<SqlQuery[]>({
    queryKey: ['/api/sql-queries'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sql-queries?isActive=true');
      if (!response.ok) return [];
      return await response.json();
    },
    staleTime: 30 * 1000,
  });

  // Fetch data sources list for dropdown
  const { data: dataSourcesList } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/data-sources?isActive=true');
      if (!response.ok) return [];
      return await response.json();
    },
    staleTime: 30 * 1000,
  });

  // Track previous node ID to prevent unnecessary resets
  const previousNodeIdRef = useRef<string | null>(null);
  
  // Memoize node data to prevent unnecessary recalculations
  const nodeDataMemo = useMemo(() => {
    if (!selectedNode) return null;
    return {
      id: selectedNode.id,
      data: selectedNode.data,
      type: selectedNode.type,
    };
  }, [selectedNode?.id, selectedNode?.data?.label, selectedNode?.type]);

  useEffect(() => {
    // Only reset form data when node actually changes
    const currentNodeId = selectedNode?.id || null;
    if (previousNodeIdRef.current === currentNodeId) {
      return; // Same node, don't reset
    }
    previousNodeIdRef.current = currentNodeId;

    if (selectedNode) {
      try {
        // Load all data from selectedNode, prioritizing top-level then config then defaults
        const data = selectedNode.data as any;
        const nodeType = data.config?.type || selectedNode.type || 'unknown'; // Get actual node type from config
        
        // Load input/output mapping
        const inputMapping = data.inputMapping || data.config?.inputMapping || null;
        const outputMapping = data.outputMapping || data.config?.outputMapping || null;
        
        // 종료 노드나 시작 노드는 최소한의 설정만 표시
        if (nodeType === 'end' || nodeType === 'start') {
          setFormData(prev => ({
            ...prev,
            label: data.label || '',
            description: data.description || '',
            timeout: data.timeout || data.config?.timeout || 300,
            retryCount: data.retryCount || data.config?.retryCount || 3,
            condition: data.condition || data.config?.condition || 'previous_completed',
            inputMapping,
            outputMapping,
          }));
          return;
        }
      
      // For prompt nodes and ai_analysis nodes: prioritize registered prompt data over node data
      let systemPrompt = data.systemPrompt || data.config?.systemPrompt || '';
      let userPromptTemplate = data.userPromptTemplate || data.config?.userPromptTemplate || '';
      let inputSchema = data.inputSchema || data.config?.inputSchema || null;
      let outputSchema = data.outputSchema || data.config?.outputSchema || null;
      let parameters = data.parameters || data.config?.parameters || null;
      let executionType = data.executionType || data.config?.executionType || 'text';
      if ((nodeType === 'prompt' || nodeType === 'ai_analysis') && registeredPrompt) {
        systemPrompt = registeredPrompt.systemPrompt || systemPrompt;
        userPromptTemplate = registeredPrompt.userPromptTemplate || userPromptTemplate;
        inputSchema = registeredPrompt.inputSchema || inputSchema;
        outputSchema = registeredPrompt.outputSchema || outputSchema;
        parameters = registeredPrompt.parameters || parameters;
        executionType = registeredPrompt.executionType || executionType;
      }
      
      // For API nodes: prioritize registered API data over node data
      let url = data.url || data.config?.url || '';
      let method = data.method || data.config?.method || 'POST';
      let headers = data.headers || data.config?.headers || null;
      let requestSchema = data.requestSchema || data.config?.requestSchema || null;
      let responseSchema = data.responseSchema || data.config?.responseSchema || null;
      let parameterTemplate = data.parameterTemplate || data.config?.parameterTemplate || '';
      let preprocessPrompt = data.preprocessPrompt || data.config?.preprocessPrompt || '';
      let postprocessPrompt = data.postprocessPrompt || data.config?.postprocessPrompt || '';
      if (nodeType === 'api' && registeredApiCall) {
        url = registeredApiCall.url || url;
        method = registeredApiCall.method || method;
        headers = registeredApiCall.headers || headers;
        requestSchema = registeredApiCall.requestSchema || requestSchema;
        responseSchema = registeredApiCall.responseSchema || responseSchema;
        parameterTemplate = registeredApiCall.parameterTemplate || parameterTemplate;
        preprocessPrompt = registeredApiCall.preprocessPrompt || preprocessPrompt;
        postprocessPrompt = registeredApiCall.postprocessPrompt || postprocessPrompt;
      }
      
      // For Python script nodes: prioritize registered Python script data over node data
      let pythonScript = data.pythonScript || data.config?.pythonScript || '';
      let pythonRequirements = data.pythonRequirements || data.config?.pythonRequirements || '';
      let exampleInput = data.exampleInput || data.config?.exampleInput || null;
      let exampleOutput = data.exampleOutput || data.config?.exampleOutput || null;
      if (nodeType === 'python_script' && registeredPythonScript) {
        pythonScript = registeredPythonScript.pythonScript || pythonScript;
        pythonRequirements = registeredPythonScript.pythonRequirements || pythonRequirements;
        exampleInput = registeredPythonScript.exampleInput || exampleInput;
        exampleOutput = registeredPythonScript.exampleOutput || exampleOutput;
      }
      
      // For SQL query nodes: prioritize registered SQL query data over node data
      let sqlQuery = data.query || data.config?.query || '';
      let sqlDataSourceId = data.dataSourceId || data.config?.dataSourceId || '';
      let sqlQueryId = data.sqlQueryId || data.config?.sqlQueryId || '';
      let sqlParameters = data.parameters || data.config?.parameters || null;
      if (nodeType === 'sql_query' && registeredSqlQuery) {
        sqlQuery = registeredSqlQuery.query || sqlQuery;
        sqlDataSourceId = registeredSqlQuery.dataSourceId || sqlDataSourceId;
        sqlQueryId = registeredSqlQuery.id || sqlQueryId;
        sqlParameters = registeredSqlQuery.parameters || sqlParameters;
      }
      
      setFormData({
        label: data.label || '',
        description: data.description || '',
        timeout: data.timeout || data.config?.timeout || 300,
        retryCount: data.retryCount || data.config?.retryCount || 3,
        condition: data.condition || data.config?.condition || 'previous_completed',
        systemPrompt,
        userPromptTemplate,
        maxTokens: data.maxTokens || data.config?.maxTokens || 1000,
        temperature: data.temperature || data.config?.temperature || 0.7,
        // Prompt specific fields
        inputSchema,
        outputSchema,
        parameters: sqlParameters || parameters || data.parameters || data.config?.parameters || null,
        executionType,
        // API specific fields
        url,
        method,
        headers,
        requestSchema,
        responseSchema,
        parameterTemplate,
        preprocessPrompt,
        postprocessPrompt,
        // RAG specific fields  
        searchType: data.searchType || data.config?.searchType || 'hybrid',
        topK: data.topK || data.config?.topK || 10,
        threshold: data.threshold || data.config?.threshold || 0.7,
        // Workflow specific fields
        workflowDescription: data.workflowDescription || data.config?.definition?.description || (data.config?.definition ? JSON.stringify(data.config.definition, null, 2) : ''),
        // DataSource specific fields
        query: sqlQuery || data.query || data.config?.query || '',
        source: data.source || data.config?.source || 'databricks',
        outputKey: data.outputKey || data.config?.outputKey || '',
        // SQL Query specific fields
        sqlQueryId: sqlQueryId || (data as any).sqlQueryId || data.config?.sqlQueryId || '',
        dataSourceId: sqlDataSourceId || (data as any).dataSourceId || data.config?.dataSourceId || '',
        // Branch/Condition specific fields
        conditionExpression: data.conditionExpression || data.config?.conditionExpression || '',
        trueBranch: data.trueBranch || data.config?.trueBranch || '',
        falseBranch: data.falseBranch || data.config?.falseBranch || '',
        conditionType: data.conditionType || data.config?.conditionType || 'expression',
        // Python script specific fields
        pythonScript,
        pythonRequirements,
        pythonTimeout: data.pythonTimeout || data.config?.pythonTimeout || 30,
        pythonEnvironment: data.pythonEnvironment || data.config?.pythonEnvironment || 'python3',
        pythonInputFormat: data.pythonInputFormat || data.config?.pythonInputFormat || 'json',
        pythonOutputFormat: data.pythonOutputFormat || data.config?.pythonOutputFormat || 'json',
        pythonWorkingDirectory: data.pythonWorkingDirectory || data.config?.pythonWorkingDirectory || '',
        pythonMemoryLimit: data.pythonMemoryLimit || data.config?.pythonMemoryLimit || 512,
        pythonCpuLimit: data.pythonCpuLimit || data.config?.pythonCpuLimit || 50,
        pythonScriptId: data.pythonScriptId || data.config?.pythonScriptId || '',
        exampleInput,
        exampleOutput,
        // Node data mapping fields
        inputMapping: data.inputMapping || data.config?.inputMapping || null,
        outputMapping: data.outputMapping || data.config?.outputMapping || null,
        // Prompt ID for ai_analysis nodes
        promptId: data.promptId || data.config?.promptId || '',
      });
      } catch (error) {
        console.error('Error loading node data:', error);
        // 에러 발생 시 최소한의 데이터만 설정
        const data = selectedNode.data as any;
        setFormData(prev => ({
          ...prev,
          label: data?.label || '',
          description: data?.description || '',
        }));
      }
    } else {
      // Clear form when no node is selected
      previousNodeIdRef.current = null;
    }
  }, [nodeDataMemo?.id, registeredPrompt, registeredApiCall, registeredPythonScript, registeredSqlQuery]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // SQL query execution handler
  const handleExecuteSqlTest = async () => {
    if (!formData.query?.trim()) {
      toast({
        title: "오류",
        description: "SQL 쿼리를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsExecutingSql(true);
    setSqlTestResult(null);

    try {
      const source = formData.source || 'databricks';
      const endpoint = source === 'databricks' 
        ? '/api/azure/databricks/query'
        : '/api/sql-query/execute';

      const response = await apiRequest('POST', endpoint, {
        query: formData.query,
        dataSourceId: formData.dataSourceId || undefined,
        parameters: formData.parameters || {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Query execution failed');
      }

      const result = await response.json();
      setSqlTestResult({
        data: result.data || [],
        rowCount: result.rowCount || 0,
        executionTime: result.executionTime || 0,
      });

      toast({
        title: "성공",
        description: `쿼리가 성공적으로 실행되었습니다. (${result.rowCount || 0}행)`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSqlTestResult({
        error: errorMessage,
      });
      toast({
        title: "오류",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExecutingSql(false);
    }
  };

  const handleSave = () => {
    if (!selectedNode) return;
    
    // Create updated config based on node type
    const updatedConfig = {
      ...selectedNode.data.config,
      timeout: formData.timeout,
      retryCount: formData.retryCount,
      condition: formData.condition,
    };

    // Build updates object
    const updates: any = {
      label: formData.label,
      description: formData.description,
      config: updatedConfig
    };

    // Add input/output mapping for all node types
    updatedConfig.inputMapping = formData.inputMapping;
    updatedConfig.outputMapping = formData.outputMapping;
    updates.inputMapping = formData.inputMapping;
    updates.outputMapping = formData.outputMapping;

    // Add type-specific configurations
    const nodeType = selectedNode.data?.config?.type || selectedNode.type;
    switch (nodeType) {
      case 'prompt':
        // Store in both config (for backward compatibility) and top-level data (for execution engine)
        updatedConfig.systemPrompt = formData.systemPrompt;
        updatedConfig.userPromptTemplate = formData.userPromptTemplate;
        updatedConfig.maxTokens = formData.maxTokens;
        updatedConfig.temperature = formData.temperature;
        
        // Also set at top level for execution engine
        updates.systemPrompt = formData.systemPrompt;
        updates.userPromptTemplate = formData.userPromptTemplate;
        updates.maxTokens = formData.maxTokens;
        updates.temperature = formData.temperature;
        // Also store in config for backward compatibility
        updatedConfig.prompt = formData.systemPrompt; // Fallback for config.prompt
        break;
      case 'api':
        updatedConfig.systemPrompt = formData.systemPrompt;
        updatedConfig.url = formData.url;
        updatedConfig.method = formData.method;
        updatedConfig.headers = formData.headers;
        updatedConfig.requestSchema = formData.requestSchema;
        updatedConfig.responseSchema = formData.responseSchema;
        updatedConfig.parameterTemplate = formData.parameterTemplate;
        updatedConfig.preprocessPrompt = formData.preprocessPrompt;
        updatedConfig.postprocessPrompt = formData.postprocessPrompt;
        
        // Also set at top level for execution engine
        updates.url = formData.url;
        updates.method = formData.method;
        updates.headers = formData.headers;
        updates.requestSchema = formData.requestSchema;
        updates.responseSchema = formData.responseSchema;
        updates.parameterTemplate = formData.parameterTemplate;
        updates.preprocessPrompt = formData.preprocessPrompt;
        updates.postprocessPrompt = formData.postprocessPrompt;
        break;
      case 'rag':
        updatedConfig.searchType = formData.searchType;
        updatedConfig.topK = formData.topK;
        updatedConfig.threshold = formData.threshold;
        break;
      case 'dataSource':
        // Store in both config and top-level for execution engine
        updatedConfig.query = formData.query;
        updatedConfig.source = formData.source;
        updatedConfig.outputKey = formData.outputKey;
        
        updates.query = formData.query;
        updates.source = formData.source;
        updates.outputKey = formData.outputKey;
        break;
      case 'sql_query':
        // Store SQL query node configuration
        updatedConfig.sqlQueryId = formData.sqlQueryId;
        updatedConfig.dataSourceId = formData.dataSourceId;
        updatedConfig.parameters = formData.parameters;
        updatedConfig.query = formData.query;
        updatedConfig.source = formData.source;
        updatedConfig.outputKey = formData.outputKey;
        
        updates.sqlQueryId = formData.sqlQueryId;
        updates.dataSourceId = formData.dataSourceId;
        updates.query = formData.query;
        updates.source = formData.source;
        updates.outputKey = formData.outputKey;
        // Also store query from registered query if available
        if (registeredSqlQuery) {
          updatedConfig.query = registeredSqlQuery.query;
        } else {
          updatedConfig.query = formData.query;
        }
        
        // Also set at top level for execution engine
        updates.sqlQueryId = formData.sqlQueryId;
        updates.dataSourceId = formData.dataSourceId;
        updates.parameters = formData.parameters;
        if (registeredSqlQuery) {
          updates.query = registeredSqlQuery.query;
        } else {
          updates.query = formData.query;
        }
        break;
      case 'branch':
      case 'condition':
        // Store in both config and top-level for execution engine
        updatedConfig.conditionExpression = formData.conditionExpression;
        updatedConfig.trueBranch = formData.trueBranch;
        updatedConfig.falseBranch = formData.falseBranch;
        updatedConfig.conditionType = formData.conditionType;
        
        updates.conditionExpression = formData.conditionExpression;
        updates.trueBranch = formData.trueBranch;
        updates.falseBranch = formData.falseBranch;
        updates.conditionType = formData.conditionType;
        break;
      case 'workflow':
        // Workflow configurations are mostly read-only from definition
        break;
      case 'python_script':
        // Store Python script configurations
        updatedConfig.pythonScript = formData.pythonScript;
        updatedConfig.pythonRequirements = formData.pythonRequirements;
        updatedConfig.pythonTimeout = formData.pythonTimeout;
        updatedConfig.pythonEnvironment = formData.pythonEnvironment;
        updatedConfig.pythonInputFormat = formData.pythonInputFormat;
        updatedConfig.pythonOutputFormat = formData.pythonOutputFormat;
        updatedConfig.pythonWorkingDirectory = formData.pythonWorkingDirectory;
        updatedConfig.pythonMemoryLimit = formData.pythonMemoryLimit;
        updatedConfig.pythonCpuLimit = formData.pythonCpuLimit;
        updatedConfig.exampleInput = formData.exampleInput;
        updatedConfig.exampleOutput = formData.exampleOutput;
        
        // Also set at top level for execution engine
        updates.pythonScript = formData.pythonScript;
        updates.pythonRequirements = formData.pythonRequirements;
        updates.pythonTimeout = formData.pythonTimeout;
        updates.pythonEnvironment = formData.pythonEnvironment;
        updates.pythonInputFormat = formData.pythonInputFormat;
        updates.pythonOutputFormat = formData.pythonOutputFormat;
        updates.pythonWorkingDirectory = formData.pythonWorkingDirectory;
        updates.pythonMemoryLimit = formData.pythonMemoryLimit;
        updates.pythonCpuLimit = formData.pythonCpuLimit;
        updates.exampleInput = formData.exampleInput;
        updates.exampleOutput = formData.exampleOutput;
        break;
      case 'ai_analysis':
        // AI 분석 노드 설정 저장
        updatedConfig.systemPrompt = formData.systemPrompt;
        updatedConfig.userPromptTemplate = formData.userPromptTemplate;
        updatedConfig.maxTokens = formData.maxTokens;
        updatedConfig.temperature = formData.temperature;
        // promptId가 있으면 저장
        if (formData.promptId || selectedNode?.data?.promptId || selectedNode?.data?.config?.promptId) {
          updatedConfig.promptId = formData.promptId || selectedNode?.data?.promptId || selectedNode?.data?.config?.promptId;
          updates.promptId = updatedConfig.promptId;
        }
        
        // 실행 엔진을 위해 최상위 레벨에도 저장
        updates.systemPrompt = formData.systemPrompt;
        updates.userPromptTemplate = formData.userPromptTemplate;
        updates.maxTokens = formData.maxTokens;
        updates.temperature = formData.temperature;
        // Also store in config for backward compatibility
        updatedConfig.prompt = formData.systemPrompt; // Fallback for config.prompt
        updates.prompt = formData.systemPrompt; // config.prompt 체크를 위한 폴백
        break;
      case 'end':
      case 'start':
        // 종료/시작 노드는 최소한의 설정만 저장
        break;
      default:
        // 알 수 없는 노드 타입은 기본 설정만 저장
        break;
    }
    
    onNodeUpdate(selectedNode.id, updates);
    
    // Show success toast
    toast({
      title: "노드 설정 저장 완료",
      description: `${selectedNode.data.label || '노드'} 설정이 저장되었습니다.`,
    });
  };

  const handleReset = () => {
    if (selectedNode) {
      setFormData({
        label: selectedNode.data.label || '',
        description: selectedNode.data.description || '',
        timeout: selectedNode.data.config?.timeout || 300,
        retryCount: selectedNode.data.config?.retryCount || 3,
        condition: selectedNode.data.config?.condition || 'previous_completed',
        systemPrompt: selectedNode.data.systemPrompt || selectedNode.data.config?.systemPrompt || '',
        userPromptTemplate: selectedNode.data.userPromptTemplate || selectedNode.data.config?.userPromptTemplate || '',
        maxTokens: selectedNode.data.maxTokens || selectedNode.data.config?.maxTokens || 1000,
        temperature: selectedNode.data.temperature || selectedNode.data.config?.temperature || 0.7,
        // API specific fields
        url: selectedNode.data.config?.url || '',
        method: selectedNode.data.config?.method || 'POST',
        // RAG specific fields  
        searchType: selectedNode.data.config?.searchType || 'hybrid',
        topK: selectedNode.data.config?.topK || 10,
        threshold: selectedNode.data.config?.threshold || 0.7,
        // Workflow specific fields
        workflowDescription: selectedNode.data.config?.definition?.description || '',
        // DataSource specific fields
        query: selectedNode.data.query || selectedNode.data.config?.query || '',
        source: selectedNode.data.source || selectedNode.data.config?.source || 'databricks',
        outputKey: selectedNode.data.outputKey || selectedNode.data.config?.outputKey || '',
        // Branch/Condition specific fields
        conditionExpression: (selectedNode.data as any)?.conditionExpression || selectedNode.data.config?.conditionExpression || '',
        trueBranch: (selectedNode.data as any)?.trueBranch || selectedNode.data.config?.trueBranch || '',
        falseBranch: (selectedNode.data as any)?.falseBranch || selectedNode.data.config?.falseBranch || '',
        conditionType: (selectedNode.data as any)?.conditionType || selectedNode.data.config?.conditionType || 'expression',
        // Python script specific fields
        pythonScript: selectedNode.data.pythonScript || selectedNode.data.config?.pythonScript || '',
        pythonRequirements: selectedNode.data.pythonRequirements || selectedNode.data.config?.pythonRequirements || '',
        pythonTimeout: selectedNode.data.pythonTimeout || selectedNode.data.config?.pythonTimeout || 30,
        pythonEnvironment: selectedNode.data.pythonEnvironment || selectedNode.data.config?.pythonEnvironment || 'python3',
        pythonInputFormat: selectedNode.data.pythonInputFormat || selectedNode.data.config?.pythonInputFormat || 'json',
        pythonOutputFormat: selectedNode.data.pythonOutputFormat || selectedNode.data.config?.pythonOutputFormat || 'json',
        pythonWorkingDirectory: selectedNode.data.pythonWorkingDirectory || selectedNode.data.config?.pythonWorkingDirectory || '',
        pythonMemoryLimit: selectedNode.data.pythonMemoryLimit || selectedNode.data.config?.pythonMemoryLimit || 512,
        pythonCpuLimit: selectedNode.data.pythonCpuLimit || selectedNode.data.config?.pythonCpuLimit || 50,
        pythonScriptId: (selectedNode.data as any)?.pythonScriptId || selectedNode.data.config?.pythonScriptId || '',
        sqlQueryId: (selectedNode.data as any)?.sqlQueryId || selectedNode.data.config?.sqlQueryId || '',
        dataSourceId: (selectedNode.data as any)?.dataSourceId || selectedNode.data.config?.dataSourceId || '',
        inputSchema: selectedNode.data.config?.inputSchema || null,
        outputSchema: selectedNode.data.config?.outputSchema || null,
        executionType: selectedNode.data.config?.executionType || 'text',
        headers: selectedNode.data.config?.headers || null,
        requestSchema: selectedNode.data.config?.requestSchema || null,
        responseSchema: selectedNode.data.config?.responseSchema || null,
        parameterTemplate: selectedNode.data.config?.parameterTemplate || '',
        preprocessPrompt: selectedNode.data.config?.preprocessPrompt || '',
        postprocessPrompt: selectedNode.data.config?.postprocessPrompt || '',
        exampleInput: selectedNode.data.config?.exampleInput || null,
        exampleOutput: selectedNode.data.config?.exampleOutput || null,
        inputMapping: selectedNode.data.config?.inputMapping || null,
        outputMapping: selectedNode.data.config?.outputMapping || null,
        promptId: (selectedNode.data as any)?.promptId || selectedNode.data.config?.promptId || '',
        parameters: selectedNode.data.config?.parameters || null,
      });
    }
  };

  if (!selectedNode || !isVisible) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="properties-panel">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-foreground">속성</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedNode.data.label} 설정
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            data-testid="button-close-properties"
            title="속성 패널 닫기"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">
        <div>
          <Label htmlFor="node-name" className="text-sm font-medium text-foreground">
            노드 이름
          </Label>
          <Input
            id="node-name"
            value={formData.label}
            onChange={(e) => handleInputChange('label', e.target.value)}
            className="mt-1"
            data-testid="input-node-name"
          />
        </div>

        <div>
          <Label htmlFor="node-description" className="text-sm font-medium text-foreground">
            설명
          </Label>
          <Input
            id="node-description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="mt-1"
            data-testid="input-node-description"
          />
        </div>

        <div>
          <Label htmlFor="execution-condition" className="text-sm font-medium text-foreground">
            실행 조건
          </Label>
          <Select 
            value={formData.condition} 
            onValueChange={(value) => handleInputChange('condition', value)}
          >
            <SelectTrigger className="mt-1" data-testid="select-execution-condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous_completed">이전 단계 완료 후</SelectItem>
              <SelectItem value="parallel">병렬 실행</SelectItem>
              <SelectItem value="conditional">조건부 실행</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="timeout" className="text-sm font-medium text-foreground">
            타임아웃 (초)
          </Label>
          <Input
            id="timeout"
            type="number"
            value={formData.timeout}
            onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || 300)}
            className="mt-1"
            data-testid="input-timeout"
          />
        </div>

        <div>
          <Label htmlFor="retry-count" className="text-sm font-medium text-foreground">
            재시도 횟수
          </Label>
          <Input
            id="retry-count"
            type="number"
            value={formData.retryCount}
            onChange={(e) => handleInputChange('retryCount', parseInt(e.target.value) || 3)}
            className="mt-1"
            data-testid="input-retry-count"
          />
        </div>

        {/* Node Data Mapping - Input/Output Mapping */}
        <div className="border-t pt-4 mt-4">
          <Label className="text-sm font-semibold text-foreground mb-2 block">
            입출력 데이터 매핑
          </Label>
          
          {/* 이전 노드 출력 미리보기 */}
          {(() => {
            if (!selectedNode) return null;
            
            // 연결된 이전 노드 찾기
            const previousNodeIds = allEdges
              .filter(edge => edge.target === selectedNode.id)
              .map(edge => edge.source);
            
            const previousNodes = allNodes.filter(node => previousNodeIds.includes(node.id));
            
            if (previousNodes.length > 0) {
              return (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    📥 이전 노드 출력 미리보기
                  </Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {previousNodes.map(prevNode => {
                      const executionResult = nodeExecutionResults[prevNode.id];
                      const nodeLabel = prevNode.data?.label || prevNode.id;
                      
                      return (
                        <div key={prevNode.id} className="p-2 bg-background rounded border border-border/50">
                          <div className="text-xs font-semibold text-foreground mb-1">
                            {nodeLabel} ({prevNode.id})
                          </div>
                          {executionResult?.output ? (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-1">
                                출력 데이터 보기 ▼
                              </summary>
                              <div className="mt-1 p-2 bg-muted rounded font-mono text-xs overflow-auto max-h-32">
                                <pre className="whitespace-pre-wrap break-words">
                                  {(() => {
                                    try {
                                      return JSON.stringify(executionResult.output, null, 2);
                                    } catch (error) {
                                      return String(executionResult.output);
                                    }
                                  })()}
                                </pre>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                💡 이 데이터를 클릭하여 입력 매핑에 복사할 수 있습니다
                              </div>
                            </details>
                          ) : executionResult?.status === 'failed' ? (
                            <div className="text-xs text-red-600 dark:text-red-400">
                              ❌ 실행 실패: {executionResult.error || '알 수 없는 오류'}
                            </div>
                          ) : executionResult?.status === 'running' ? (
                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                              ⏳ 실행 중...
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              ⚠️ 아직 실행되지 않음. 시뮬레이션 모드에서 이전 노드를 먼저 실행하세요.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return (
              <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground">
                  💡 연결된 이전 노드가 없습니다. 노드 간 연결선을 추가하면 자동으로 데이터가 전달됩니다.
                </p>
              </div>
            );
          })()}
          
          <div>
            <Label htmlFor="input-mapping" className="text-sm font-medium text-foreground">
              입력 매핑 (JSON)
            </Label>
            <Textarea
              id="input-mapping"
              rows={4}
              value={formData.inputMapping ? JSON.stringify(formData.inputMapping, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                  handleInputChange('inputMapping', parsed);
                } catch (error) {
                  // Invalid JSON, keep as is for user editing
                }
              }}
              placeholder='{"previousNodeOutput": "node1_result", "variable1": "{NODE_OUTPUT}"}'
              className="mt-1 resize-none font-mono text-xs"
              data-testid="textarea-input-mapping"
            />
            <p className="text-xs text-muted-foreground mt-1">
              이전 노드의 출력을 이 노드의 입력으로 매핑합니다. 변수는 {`{NODE_OUTPUT}`} 형태로 참조합니다.
              {(() => {
                if (!selectedNode) return '';
                const previousNodeIds = allEdges
                  .filter(edge => edge.target === selectedNode.id)
                  .map(edge => edge.source);
                if (previousNodeIds.length > 0) {
                  return ` 또는 $nodeId 형태로 참조하세요 (예: $${previousNodeIds[0]})`;
                }
                return '';
              })()}
            </p>
          </div>
          <div className="mt-3">
            <Label htmlFor="output-mapping" className="text-sm font-medium text-foreground">
              출력 매핑 (JSON)
            </Label>
            <Textarea
              id="output-mapping"
              rows={4}
              value={formData.outputMapping ? JSON.stringify(formData.outputMapping, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                  handleInputChange('outputMapping', parsed);
                } catch (error) {
                  // Invalid JSON, keep as is for user editing
                }
              }}
              placeholder='{"resultKey": "processed_data", "status": "success"}'
              className="mt-1 resize-none font-mono text-xs"
              data-testid="textarea-output-mapping"
            />
            <p className="text-xs text-muted-foreground mt-1">
              이 노드의 출력을 정의된 키로 매핑하여 다음 노드에서 사용할 수 있도록 합니다.
            </p>
          </div>
        </div>

        {/* Type-specific configuration fields */}
        {(selectedNode.data?.config?.type === 'prompt' || selectedNode.type === 'prompt') && (
          <>
            <div>
              <Label htmlFor="system-prompt" className="text-sm font-medium text-foreground">
                시스템 프롬프트
              </Label>
          <Textarea
            id="system-prompt"
            rows={6}
            value={formData.systemPrompt}
            onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
            placeholder="시스템 프롬프트를 입력하세요 (예: 당신은 전문 금융 애널리스트입니다...)"
            className="mt-1 resize-none font-mono text-base"
            data-testid="textarea-system-prompt"
          />
            </div>
            
            <div>
              <Label htmlFor="user-prompt" className="text-sm font-medium text-foreground">
                사용자 프롬프트 템플릿
              </Label>
              <Textarea
                id="user-prompt"
                rows={8}
                value={formData.userPromptTemplate || ''}
                onChange={(e) => handleInputChange('userPromptTemplate', e.target.value)}
                placeholder="사용자 프롬프트 템플릿을 입력하세요 (변수: {DATE}, {TIME}, {A_EVENTS_JSON} 등)"
                className="mt-1 resize-none font-mono text-base"
                data-testid="textarea-user-prompt"
              />
              <p className="text-xs text-muted-foreground mt-1">
                변수는 중괄호로 감싸서 사용하세요. 예: {'{DATE}'}, {'{TIME}'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-tokens" className="text-sm font-medium text-foreground">
                  최대 토큰 수
                </Label>
                <Input
                  id="max-tokens"
                  type="number"
                  min="100"
                  max="4000"
                  value={formData.maxTokens || 1000}
                  onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value) || 1000)}
                  className="mt-1"
                  data-testid="input-max-tokens"
                />
              </div>

              <div>
                <Label htmlFor="temperature" className="text-sm font-medium text-foreground">
                  Temperature (0.0-2.0)
                </Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature || 0.7}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0.7)}
                  className="mt-1"
                  data-testid="input-temperature"
                />
              </div>
            </div>

            {(selectedNode.data.promptId || selectedNode.data.config?.promptId) && (
              <div className="mt-2 p-3 bg-muted rounded-md border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-foreground">
                      등록된 프롬프트 참조
                    </Label>
                    <div className="text-xs text-muted-foreground mt-1">
                      ID: {selectedNode.data.promptId || selectedNode.data.config?.promptId}
                    </div>
                    {registeredPrompt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        이름: {registeredPrompt.name}
                        {registeredPrompt.category && ` (${registeredPrompt.category})`}
                      </div>
                    )}
                  </div>
                  {registeredPrompt && (
                    <div className="text-xs text-green-600 font-medium">
                      ✓ 로드됨
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  프롬프트 관리에서 등록된 프롬프트가 자동으로 로드됩니다. 필요시 수정 가능합니다.
                </p>
              </div>
            )}
          </>
        )}

        {(selectedNode.data?.config?.type === 'api' || selectedNode.type === 'api') && (
          <>
            <div>
              <Label htmlFor="api-url" className="text-sm font-medium text-foreground">
                API URL
              </Label>
              <Input
                id="api-url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="mt-1"
                data-testid="input-api-url"
              />
            </div>

            <div>
              <Label htmlFor="api-method" className="text-sm font-medium text-foreground">
                HTTP 메서드
              </Label>
              <Select 
                value={formData.method} 
                onValueChange={(value) => handleInputChange('method', value)}
              >
                <SelectTrigger className="mt-1" data-testid="select-api-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="api-prompt" className="text-sm font-medium text-foreground">
                API 호출 프롬프트
              </Label>
              <Textarea
                id="api-prompt"
                rows={4}
                value={formData.systemPrompt}
                onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                placeholder="API 호출을 위한 프롬프트를 입력하세요..."
                className="mt-1 resize-none"
                data-testid="textarea-api-prompt"
              />
            </div>

            <div>
              <Label htmlFor="headers" className="text-sm font-medium text-foreground">
                HTTP 헤더 (JSON)
              </Label>
              <Textarea
                id="headers"
                rows={4}
                value={formData.headers ? JSON.stringify(formData.headers, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                    handleInputChange('headers', parsed);
                  } catch (error) {
                    // Invalid JSON, keep as is for user editing
                  }
                }}
                placeholder='{"Content-Type": "application/json", "Authorization": "Bearer ..."}'
                className="mt-1 resize-none font-mono text-xs"
                data-testid="textarea-headers"
              />
              <p className="text-xs text-muted-foreground mt-1">
                API 호출에 필요한 HTTP 헤더를 JSON 형식으로 정의합니다.
              </p>
            </div>

            <div>
              <Label htmlFor="parameter-template" className="text-sm font-medium text-foreground">
                파라미터 템플릿
              </Label>
              <Textarea
                id="parameter-template"
                rows={4}
                value={formData.parameterTemplate}
                onChange={(e) => handleInputChange('parameterTemplate', e.target.value)}
                placeholder='{"query": "{{USER_INPUT}}", "limit": 10}'
                className="mt-1 resize-none font-mono text-xs"
                data-testid="textarea-parameter-template"
              />
              <p className="text-xs text-muted-foreground mt-1">
                API 요청 파라미터 템플릿. 변수는 {'{{변수명}}'} 형태로 사용합니다.
              </p>
            </div>

            <div>
              <Label htmlFor="request-schema" className="text-sm font-medium text-foreground">
                요청 스키마 (JSON)
              </Label>
              <Textarea
                id="request-schema"
                rows={6}
                value={formData.requestSchema ? JSON.stringify(formData.requestSchema, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                    handleInputChange('requestSchema', parsed);
                  } catch (error) {
                    // Invalid JSON, keep as is for user editing
                  }
                }}
                placeholder='{"type": "object", "properties": {...}}'
                className="mt-1 resize-none font-mono text-xs"
                data-testid="textarea-request-schema"
              />
              <p className="text-xs text-muted-foreground mt-1">
                API 요청 파라미터의 JSON 스키마를 정의합니다.
              </p>
            </div>

            <div>
              <Label htmlFor="response-schema" className="text-sm font-medium text-foreground">
                응답 스키마 (JSON)
              </Label>
              <Textarea
                id="response-schema"
                rows={6}
                value={formData.responseSchema ? JSON.stringify(formData.responseSchema, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                    handleInputChange('responseSchema', parsed);
                  } catch (error) {
                    // Invalid JSON, keep as is for user editing
                  }
                }}
                placeholder='{"type": "object", "properties": {...}}'
                className="mt-1 resize-none font-mono text-xs"
                data-testid="textarea-response-schema"
              />
              <p className="text-xs text-muted-foreground mt-1">
                API 응답 데이터의 JSON 스키마를 정의합니다.
              </p>
            </div>

            <div>
              <Label htmlFor="preprocess-prompt" className="text-sm font-medium text-foreground">
                전처리 프롬프트
              </Label>
              <Textarea
                id="preprocess-prompt"
                rows={3}
                value={formData.preprocessPrompt}
                onChange={(e) => handleInputChange('preprocessPrompt', e.target.value)}
                placeholder="API 호출 전 파라미터를 생성하기 위한 프롬프트..."
                className="mt-1 resize-none"
                data-testid="textarea-preprocess-prompt"
              />
              <p className="text-xs text-muted-foreground mt-1">
                API 호출 전 파라미터를 생성하는 데 사용되는 프롬프트입니다.
              </p>
            </div>

            <div>
              <Label htmlFor="postprocess-prompt" className="text-sm font-medium text-foreground">
                후처리 프롬프트
              </Label>
              <Textarea
                id="postprocess-prompt"
                rows={3}
                value={formData.postprocessPrompt}
                onChange={(e) => handleInputChange('postprocessPrompt', e.target.value)}
                placeholder="API 응답을 포매팅하기 위한 프롬프트..."
                className="mt-1 resize-none"
                data-testid="textarea-postprocess-prompt"
              />
              <p className="text-xs text-muted-foreground mt-1">
                API 응답을 포매팅하는 데 사용되는 프롬프트입니다.
              </p>
            </div>

            {(selectedNode.data.apiCallId || selectedNode.data.config?.apiCallId) && (
              <div className="mt-2 p-3 bg-muted rounded-md border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-foreground">
                      등록된 API 호출 참조
                    </Label>
                    <div className="text-xs text-muted-foreground mt-1">
                      ID: {selectedNode.data.apiCallId || selectedNode.data.config?.apiCallId}
                    </div>
                    {registeredApiCall && (
                      <div className="text-xs text-muted-foreground mt-1">
                        이름: {registeredApiCall.name}
                        {registeredApiCall.categoryId && ` (카테고리: ${registeredApiCall.categoryId})`}
                      </div>
                    )}
                  </div>
                  {registeredApiCall && (
                    <div className="text-xs text-green-600 font-medium">
                      ✓ 로드됨
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  API 호출 관리에서 등록된 API가 자동으로 로드됩니다. 필요시 수정 가능합니다.
                </p>
              </div>
            )}
          </>
        )}

        {(selectedNode.data?.config?.type === 'rag' || selectedNode.type === 'rag') && (
          <>
            <div>
              <Label htmlFor="search-type" className="text-sm font-medium text-foreground">
                검색 유형
              </Label>
              <Select 
                value={formData.searchType} 
                onValueChange={(value) => handleInputChange('searchType', value)}
              >
                <SelectTrigger className="mt-1" data-testid="select-search-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">하이브리드 검색</SelectItem>
                  <SelectItem value="financial">금융 데이터 검색</SelectItem>
                  <SelectItem value="news">뉴스 데이터 검색</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="top-k" className="text-sm font-medium text-foreground">
                검색 결과 수 (Top K)
              </Label>
              <Input
                id="top-k"
                type="number"
                min="1"
                max="100"
                value={formData.topK}
                onChange={(e) => handleInputChange('topK', parseInt(e.target.value) || 10)}
                className="mt-1"
                data-testid="input-top-k"
              />
            </div>

            <div>
              <Label htmlFor="threshold" className="text-sm font-medium text-foreground">
                유사도 임계값 (0.0 - 1.0)
              </Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={formData.threshold}
                onChange={(e) => handleInputChange('threshold', parseFloat(e.target.value) || 0.7)}
                className="mt-1"
                data-testid="input-threshold"
              />
            </div>
          </>
        )}

        {((selectedNode.data?.config?.type === 'branch' || selectedNode.data?.config?.type === 'condition') || (selectedNode.type === 'branch' || selectedNode.type === 'condition')) && (
          <>
            <div>
              <Label htmlFor="condition-type" className="text-sm font-medium text-foreground">
                조건 유형
              </Label>
              <Select 
                value={formData.conditionType} 
                onValueChange={(value) => handleInputChange('conditionType', value)}
              >
                <SelectTrigger className="mt-1" data-testid="select-condition-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expression">표현식 평가</SelectItem>
                  <SelectItem value="comparison">값 비교</SelectItem>
                  <SelectItem value="exists">값 존재 여부</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="condition-expression" className="text-sm font-medium text-foreground">
                조건 표현식
              </Label>
              <Textarea
                id="condition-expression"
                rows={4}
                value={formData.conditionExpression}
                onChange={(e) => handleInputChange('conditionExpression', e.target.value)}
                placeholder="예: {PRICE} > 50000 || {VOLUME} > 1000000"
                className="mt-1 resize-none font-mono text-sm"
                data-testid="textarea-condition-expression"
              />
              <p className="text-xs text-muted-foreground mt-1">
                사용 가능한 연산자: &gt;, &lt;, ==, !=, &amp;&amp;, ||
              </p>
              <p className="text-xs text-muted-foreground">
                변수는 중괄호로 감싸세요: {'{VARIABLE_NAME}'}
              </p>
            </div>

            <div className="border rounded-lg p-3 bg-muted/30">
              <Label className="text-sm font-semibold text-foreground mb-2 block">
                분기 설정
              </Label>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium text-foreground">True 분기:</span>
                  <span>조건이 참일 때 실행될 노드</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium text-foreground">False 분기:</span>
                  <span>조건이 거짓일 때 실행될 노드</span>
                </div>
                <p className="mt-2 text-xs">
                  💡 이 노드에서 다른 노드로 연결선을 그어 분기를 설정하세요.
                  연결선을 클릭하여 True/False 설정을 변경할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                ⚠️ 주의: 조건분기 노드는 반드시 2개의 출력 연결선이 필요합니다 (True/False 각 1개)
              </p>
            </div>
          </>
        )}

        {(selectedNode.data?.config?.type === 'dataSource' || selectedNode.type === 'dataSource') && (
          <>
            <div>
              <Label htmlFor="data-source" className="text-sm font-medium text-foreground">
                데이터 소스
              </Label>
              <Select 
                value={formData.source} 
                onValueChange={(value) => handleInputChange('source', value)}
              >
                <SelectTrigger className="mt-1" data-testid="select-data-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="databricks">Azure Databricks</SelectItem>
                  <SelectItem value="postgresql">PostgreSQL (Neon)</SelectItem>
                  <SelectItem value="api">External API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sql-query" className="text-sm font-medium text-foreground">
                SQL 쿼리
              </Label>
              <Textarea
                id="sql-query"
                rows={12}
                value={formData.query}
                onChange={(e) => handleInputChange('query', e.target.value)}
                placeholder="SELECT * FROM database.schema.table_name WHERE ..."
                className="mt-1 resize-none font-mono text-sm"
                data-testid="textarea-sql-query"
              />
              <p className="text-xs text-muted-foreground mt-1">
                변수 사용 가능: {'{DATE}'}, {'{TIME}'}, 이전 노드의 출력 변수
              </p>
            </div>

            <div>
              <Label htmlFor="output-key" className="text-sm font-medium text-foreground">
                출력 변수 이름
              </Label>
              <Input
                id="output-key"
                value={formData.outputKey}
                onChange={(e) => handleInputChange('outputKey', e.target.value)}
                placeholder="예: A_EVENTS_JSON, B_THEMES_JSON"
                className="mt-1 font-mono text-sm"
                data-testid="input-output-key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                다음 노드에서 {'{' + (formData.outputKey || 'OUTPUT_KEY') + '}'}로 참조됩니다.
              </p>
            </div>
          </>
        )}

        {(selectedNode.data?.config?.type === 'sql_query' || selectedNode.type === 'sql_query') && (
          <>
            <div>
              <Label htmlFor="sql-query-select" className="text-sm font-medium text-foreground">
                등록된 SQL 쿼리 선택
              </Label>
              <Select 
                value={formData.sqlQueryId || ''} 
                onValueChange={(value) => {
                  if (value === '__manual__') {
                    handleInputChange('sqlQueryId', '');
                    return;
                  }
                  handleInputChange('sqlQueryId', value);
                  // 선택한 SQL 쿼리 정보 자동 로드
                  const selectedQuery = sqlQueriesList?.find(q => q.id === value);
                  if (selectedQuery) {
                    handleInputChange('query', selectedQuery.query);
                    handleInputChange('dataSourceId', selectedQuery.dataSourceId);
                    handleInputChange('source', selectedQuery.dataSourceId);
                  }
                }}
              >
                <SelectTrigger className="mt-1" data-testid="select-sql-query">
                  <SelectValue placeholder="SQL 쿼리를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">직접 입력</SelectItem>
                  {sqlQueriesList?.map((query) => (
                    <SelectItem key={query.id} value={query.id}>
                      {query.displayName || query.name}
                      {query.description && ` - ${query.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                등록된 SQL 쿼리를 선택하거나 직접 입력할 수 있습니다.
              </p>
            </div>

            {((selectedNode.data as any)?.sqlQueryId || selectedNode.data.config?.sqlQueryId || formData.sqlQueryId) && (
              <div className="mb-4 p-3 bg-muted rounded-md border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-foreground">
                      등록된 SQL 쿼리 참조
                    </Label>
                    <div className="text-xs text-muted-foreground mt-1">
                      ID: {formData.sqlQueryId || (selectedNode.data as any)?.sqlQueryId || selectedNode.data.config?.sqlQueryId}
                    </div>
                    {registeredSqlQuery && (
                      <div className="text-xs text-muted-foreground mt-1">
                        이름: {registeredSqlQuery.name || registeredSqlQuery.displayName}
                        {registeredSqlQuery.description && ` - ${registeredSqlQuery.description}`}
                      </div>
                    )}
                  </div>
                  {registeredSqlQuery && (
                    <div className="text-xs text-green-600 font-medium">
                      ✓ 로드됨
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  SQL 쿼리 관리에서 등록된 쿼리가 자동으로 로드됩니다. 필요시 수정 가능합니다.
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="sql-query-text" className="text-sm font-medium text-foreground">
                  SQL 쿼리
                </Label>
                <Button
                  onClick={handleExecuteSqlTest}
                  disabled={!formData.query?.trim() || isExecutingSql}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  data-testid="button-execute-sql-test"
                >
                  {isExecutingSql ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      실행 중...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      쿼리 실행
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="sql-query-text"
                rows={12}
                value={formData.query}
                onChange={(e) => handleInputChange('query', e.target.value)}
                placeholder="SELECT * FROM database.schema.table_name WHERE ..."
                className="mt-1 resize-none font-mono text-sm"
                data-testid="textarea-sql-query-text"
              />
              <p className="text-xs text-muted-foreground mt-1">
                변수 사용 가능: {'{DATE}'}, {'{TIME}'}, 이전 노드의 출력 변수
              </p>
            </div>
            
            {/* SQL Test Results */}
            {sqlTestResult && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" />
                    쿼리 실행 결과
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sqlTestResult.error ? (
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">오류:</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{sqlTestResult.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>행 수: {sqlTestResult.rowCount || sqlTestResult.data?.length || 0}</span>
                        {sqlTestResult.executionTime && (
                          <span>실행 시간: {sqlTestResult.executionTime}ms</span>
                        )}
                      </div>
                      {sqlTestResult.data && sqlTestResult.data.length > 0 && (
                        <ScrollArea className="h-64 border rounded-md">
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                              <thead className="bg-muted sticky top-0">
                                <tr>
                                  {Object.keys(sqlTestResult.data[0]).map((key) => (
                                    <th key={key} className="border border-border p-2 text-left font-semibold">
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sqlTestResult.data.slice(0, 100).map((row: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-muted/50">
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
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="sql-data-source" className="text-sm font-medium text-foreground">
                데이터 소스
              </Label>
              <Select 
                value={formData.dataSourceId || formData.source || ''} 
                onValueChange={(value) => {
                  handleInputChange('dataSourceId', value);
                  handleInputChange('source', value);
                }}
              >
                <SelectTrigger className="mt-1" data-testid="select-sql-data-source">
                  <SelectValue placeholder="데이터 소스를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {dataSourcesList && dataSourcesList.length > 0 ? (
                    dataSourcesList.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name} ({ds.type})
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="databricks">Azure Databricks</SelectItem>
                      <SelectItem value="postgresql">PostgreSQL (Neon)</SelectItem>
                      <SelectItem value="api">External API</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {dataSourcesList && dataSourcesList.length > 0 
                  ? '등록된 데이터 소스를 선택하거나 직접 입력할 수 있습니다.'
                  : '데이터 소스가 등록되지 않았습니다. 기본값을 사용하거나 직접 입력하세요.'}
              </p>
            </div>

            <div>
              <Label htmlFor="sql-output-key" className="text-sm font-medium text-foreground">
                출력 변수 이름
              </Label>
              <Input
                id="sql-output-key"
                value={formData.outputKey}
                onChange={(e) => handleInputChange('outputKey', e.target.value)}
                placeholder="예: A_EVENTS_JSON, B_THEMES_JSON"
                className="mt-1 font-mono text-sm"
                data-testid="input-sql-output-key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                다음 노드에서 {'{' + (formData.outputKey || 'OUTPUT_KEY') + '}'}로 참조됩니다.
              </p>
            </div>
          </>
        )}

        {(selectedNode.data?.config?.type === 'workflow' || selectedNode.type === 'workflow') && (
          <>
            <div>
              <Label className="text-sm font-medium text-foreground">
                하위 워크플로우 정보
              </Label>
              <div className="mt-1 p-3 bg-muted rounded-lg">
                <div className="text-sm text-foreground">
                  {selectedNode.data.label}
                </div>
                {selectedNode.data.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedNode.data.description}
                  </div>
                )}
                {selectedNode.data.workflowId && (
                  <div className="text-xs text-muted-foreground mt-2">
                    워크플로우 ID: {selectedNode.data.workflowId}
                  </div>
                )}
              </div>
            </div>

            {selectedNode.data.config?.definition && (
              <div>
                <Label className="text-sm font-medium text-foreground">
                  워크플로우 정의 (JSON)
                </Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-48">
                    {(() => {
                      try {
                        if (typeof selectedNode.data.config.definition === 'string') {
                          return selectedNode.data.config.definition;
                        }
                        return JSON.stringify(selectedNode.data.config.definition, null, 2);
                      } catch (error) {
                        return '데이터 직렬화 중 오류 발생: ' + (error instanceof Error ? error.message : String(error));
                      }
                    })()}
                  </pre>
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-foreground">
                실행 모드
              </Label>
              <div className="mt-1 text-sm text-muted-foreground">
                하위 워크플로우가 완료된 후 다음 단계로 진행됩니다.
              </div>
            </div>
          </>
        )}

        {(selectedNode.data?.config?.type === 'ai_analysis' || selectedNode.type === 'ai_analysis') && (
          <>
            <div>
              <Label className="text-sm font-medium text-foreground">
                AI 분석 노드
              </Label>
              <div className="mt-1 p-3 bg-muted rounded-lg">
                <div className="text-sm text-foreground">
                  {selectedNode.data.label}
                </div>
                {selectedNode.data.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedNode.data.description}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="ai-analysis-prompt" className="text-sm font-medium text-foreground">
                분석 프롬프트
              </Label>
              <Textarea
                id="ai-analysis-prompt"
                rows={6}
                value={formData.systemPrompt}
                onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                placeholder="AI 분석을 위한 프롬프트를 입력하세요..."
                className="mt-1 resize-none"
                data-testid="textarea-ai-analysis-prompt"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ai-max-tokens" className="text-sm font-medium text-foreground">
                  최대 토큰 수
                </Label>
                <Input
                  id="ai-max-tokens"
                  type="number"
                  min="100"
                  max="4000"
                  value={formData.maxTokens || 1000}
                  onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value) || 1000)}
                  className="mt-1"
                  data-testid="input-ai-max-tokens"
                />
              </div>

              <div>
                <Label htmlFor="ai-temperature" className="text-sm font-medium text-foreground">
                  Temperature (0.0-2.0)
                </Label>
                <Input
                  id="ai-temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature || 0.7}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0.7)}
                  className="mt-1"
                  data-testid="input-ai-temperature"
                />
              </div>
            </div>
          </>
        )}

        {/* Special handling for end/start nodes */}
        {(selectedNode.data?.config?.type === 'end' || selectedNode.type === 'end' || 
          selectedNode.data?.config?.type === 'start' || selectedNode.type === 'start') && (
          <div className="mt-4 pt-4 border-t">
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                {selectedNode.data?.config?.type === 'end' || selectedNode.type === 'end' 
                  ? '종료 노드는 워크플로우의 끝을 나타냅니다. 추가 설정이 필요하지 않습니다.'
                  : '시작 노드는 워크플로우의 시작점을 나타냅니다. 추가 설정이 필요하지 않습니다.'}
              </p>
            </div>
          </div>
        )}

        {(selectedNode.data?.config?.type === 'python_script' || selectedNode.type === 'python_script') && (
          <>
            {((selectedNode.data as any)?.pythonScriptId || selectedNode.data.config?.pythonScriptId || formData.pythonScriptId) && (
              <div className="mb-4 p-3 bg-muted rounded-md border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-foreground">
                      등록된 Python 스크립트 참조
                    </Label>
                    <div className="text-xs text-muted-foreground mt-1">
                      ID: {formData.pythonScriptId || (selectedNode.data as any)?.pythonScriptId || selectedNode.data.config?.pythonScriptId}
                    </div>
                    {registeredPythonScript && (
                      <div className="text-xs text-muted-foreground mt-1">
                        이름: {registeredPythonScript.name}
                        {registeredPythonScript.category && ` (${registeredPythonScript.category})`}
                      </div>
                    )}
                  </div>
                  {registeredPythonScript && (
                    <div className="text-xs text-green-600 font-medium">
                      ✓ 로드됨
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Python 스크립트 관리에서 등록된 스크립트가 자동으로 로드됩니다. 필요시 수정 가능합니다.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="python-script" className="text-sm font-medium text-foreground">
                Python 스크립트
              </Label>
              <Textarea
                id="python-script"
                rows={18}
                value={formData.pythonScript}
                onChange={(e) => handleInputChange('pythonScript', e.target.value)}
                placeholder="# Python 코드를 입력하세요
# 입력 데이터는 input_data 변수로 접근 가능합니다
# 결과는 result, output, 또는 processed_data 변수에 저장하세요

# 예시:
# data = input_data['data']
# result = {'processed': data, 'count': len(data) if isinstance(data, list) else 1}"
                className="mt-1 resize-none font-mono text-sm"
                data-testid="textarea-python-script"
              />
              <p className="text-xs text-muted-foreground mt-1">
                입력 데이터는 input_data 변수로 접근 가능합니다. 결과는 result, output, 또는 processed_data 변수에 저장하세요.
              </p>
            </div>

            <div>
              <Label htmlFor="python-requirements" className="text-sm font-medium text-foreground">
                Python 패키지 요구사항 (선택사항)
              </Label>
              <Textarea
                id="python-requirements"
                rows={5}
                value={formData.pythonRequirements}
                onChange={(e) => handleInputChange('pythonRequirements', e.target.value)}
                placeholder="pandas==2.0.3
numpy==1.24.3
requests==2.31.0"
                className="mt-1 resize-none font-mono text-xs"
                data-testid="textarea-python-requirements"
              />
              <p className="text-xs text-muted-foreground mt-1">
                필요한 Python 패키지를 requirements.txt 형식으로 입력하세요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="python-timeout" className="text-sm font-medium text-foreground">
                  실행 타임아웃 (초)
                </Label>
                <Input
                  id="python-timeout"
                  type="number"
                  min="1"
                  max="300"
                  value={formData.pythonTimeout}
                  onChange={(e) => handleInputChange('pythonTimeout', parseInt(e.target.value) || 30)}
                  className="mt-1"
                  data-testid="input-python-timeout"
                />
              </div>

              <div>
                <Label htmlFor="python-environment" className="text-sm font-medium text-foreground">
                  Python 환경
                </Label>
                <Select
                  value={formData.pythonEnvironment}
                  onValueChange={(value) => handleInputChange('pythonEnvironment', value)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-python-environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python3">Python 3</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="python3.11">Python 3.11</SelectItem>
                    <SelectItem value="python3.12">Python 3.12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="python-input-format" className="text-sm font-medium text-foreground">
                  입력 형식
                </Label>
                <Select
                  value={formData.pythonInputFormat}
                  onValueChange={(value) => handleInputChange('pythonInputFormat', value)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-python-input-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="python-output-format" className="text-sm font-medium text-foreground">
                  출력 형식
                </Label>
                <Select
                  value={formData.pythonOutputFormat}
                  onValueChange={(value) => handleInputChange('pythonOutputFormat', value)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-python-output-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="python-working-directory" className="text-sm font-medium text-foreground">
                작업 디렉토리 (선택사항)
              </Label>
              <Input
                id="python-working-directory"
                value={formData.pythonWorkingDirectory}
                onChange={(e) => handleInputChange('pythonWorkingDirectory', e.target.value)}
                placeholder="/tmp/python-execution"
                className="mt-1 font-mono text-sm"
                data-testid="input-python-working-directory"
              />
              <p className="text-xs text-muted-foreground mt-1">
                비워두면 시스템 임시 디렉토리를 사용합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="python-memory-limit" className="text-sm font-medium text-foreground">
                  메모리 제한 (MB)
                </Label>
                <Input
                  id="python-memory-limit"
                  type="number"
                  min="128"
                  max="2048"
                  value={formData.pythonMemoryLimit}
                  onChange={(e) => handleInputChange('pythonMemoryLimit', parseInt(e.target.value) || 512)}
                  className="mt-1"
                  data-testid="input-python-memory-limit"
                />
              </div>

              <div>
                <Label htmlFor="python-cpu-limit" className="text-sm font-medium text-foreground">
                  CPU 제한 (%)
                </Label>
                <Input
                  id="python-cpu-limit"
                  type="number"
                  min="10"
                  max="100"
                  value={formData.pythonCpuLimit}
                  onChange={(e) => handleInputChange('pythonCpuLimit', parseInt(e.target.value) || 50)}
                  className="mt-1"
                  data-testid="input-python-cpu-limit"
                />
              </div>
            </div>
          </>
        )}

        {/* Debug Section: Show all node data */}
        <div className="mt-4 pt-4 border-t">
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2 font-medium">
              🔍 모든 노드 데이터 보기 (디버그)
            </summary>
            <div className="mt-2 p-3 bg-muted/50 rounded-md max-h-96 overflow-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {(() => {
                  try {
                    return JSON.stringify(selectedNode?.data, null, 2);
                  } catch (error) {
                    return '데이터 직렬화 중 오류 발생: ' + (error instanceof Error ? error.message : String(error));
                  }
                })()}
              </pre>
            </div>
            <div className="mt-2 text-muted-foreground">
              <p className="text-xs">💡 위 JSON에 있는 모든 속성값이 자동으로 로드되어야 합니다.</p>
              <p className="text-xs mt-1">누락된 필드가 있다면 개발팀에 알려주세요.</p>
            </div>
          </details>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button 
            onClick={handleSave}
            className="flex-1"
            data-testid="button-save-properties"
          >
            적용
          </Button>
          <Button 
            variant="secondary"
            onClick={handleReset}
            data-testid="button-reset-properties"
          >
            재설정
          </Button>
        </div>
      </div>
    </div>
  );
}
