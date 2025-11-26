export interface WorkflowNode {
  id: string;
  type: 'prompt' | 'api' | 'rag' | 'merge' | 'condition' | 'start' | 'end' | 'workflow' | 'dataSource' | 'ai_analysis' | 'theme_classifier' | 'data_aggregator' | 'alert' | 'loop' | 'branch' | 'template' | 'transform' | 'output' | 'python_script' | 'sql_query' | 'unknown';
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config?: any;
    promptId?: string;
    apiCallId?: string;
    workflowId?: string;
    systemPrompt?: string;
    userPromptTemplate?: string;
    maxTokens?: number;
    temperature?: number;
    url?: string;
    method?: string;
    definition?: any;
    executionIndex?: string; // Hierarchical execution order (e.g., "1", "1.1", "1.2.1")
    // DataSource specific fields
    query?: string;
    source?: string;
    outputKey?: string;
    // Template specific fields
    templateText?: string;
    variables?: Record<string, any>;
    placeholderFormat?: string;
    // Transform specific fields
    expression?: string;
    inputVariable?: string;
    // Output specific fields
    format?: string;
    destination?: string;
    // Python script specific fields
    pythonScript?: string;
    pythonRequirements?: string;
    pythonTimeout?: number;
    pythonEnvironment?: string;
    pythonInputFormat?: 'json' | 'csv' | 'text';
    pythonOutputFormat?: 'json' | 'csv' | 'text';
    pythonWorkingDirectory?: string;
    pythonMemoryLimit?: number;
    pythonCpuLimit?: number;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  label?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface NodeConfig {
  timeout?: number;
  retryCount?: number;
  condition?: string;
  parallel?: boolean;
}

export interface NodeData {
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
}

export type NodeType = WorkflowNode['type'];

export interface DraggableNodeData extends NodeData {
  type: NodeType;
}
