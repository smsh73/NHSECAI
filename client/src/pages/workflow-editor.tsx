import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRoute } from "wouter";
import { Node, Edge } from "reactflow";
import { NodePalette } from "@/components/workflow/node-palette";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { PropertiesPanel } from "@/components/workflow/properties-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WorkflowDefinition, WorkflowNode, DraggableNodeData } from "@/types/workflow";
import type { Workflow, WorkflowFolder, DataSource, SqlQuery } from "@shared/schema";
import { detectCycles, validateWorkflowStructure, formatCycleErrors, CycleDetectionError, validateNodeAddition, wouldCreateCycle } from "@/utils/graph";
import { validateNodeSchema, validateNodeBeforeAdd } from "@/utils/node-schema-validator";
import { Edit, Plus, Loader2, Save, FlaskConical, Play, Trash2, FolderOpen, Server, X, FolderPlus, Folder } from "lucide-react";
import { WorkflowTemplates, type WorkflowTemplate } from "@/components/workflow/workflow-templates";

// Form schema for editing workflow metadata (client-only, avoid server shared schema at runtime)
const editWorkflowSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다."),
  description: z.string().optional(),
});

type EditWorkflowFormData = z.infer<typeof editWorkflowSchema>;

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

export default function WorkflowEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected, subscribe } = useWebSocket();
  const [, params] = useRoute("/workflow-editor/:id?");
  const workflowIdFromUrl = params?.id;
  
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [testExecutionResults, setTestExecutionResults] = useState<any[]>([]);
  const [isTestExecuting, setIsTestExecuting] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [testExecutionStatus, setTestExecutionStatus] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSwitchConfirmDialog, setShowSwitchConfirmDialog] = useState(false);
  const [pendingWorkflowId, setPendingWorkflowId] = useState<string | null>(null);
  const [showEditWorkflowDialog, setShowEditWorkflowDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showTemplateConfirmDialog, setShowTemplateConfirmDialog] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<WorkflowTemplate | null>(null);
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);
  const [showDeleteNodeDialog, setShowDeleteNodeDialog] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);
  const [nodeDeleteImpact, setNodeDeleteImpact] = useState<{ affectedNodes: string[]; affectedEdges: string[] } | null>(null);
  const [workflowDataSources, setWorkflowDataSources] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [showCreateNodeDialog, setShowCreateNodeDialog] = useState(false);
  const [createNodePosition, setCreateNodePosition] = useState<{ x: number; y: number } | null>(null);
  
  // Simulation state
  const [simulationSessionId, setSimulationSessionId] = useState<string | null>(null);
  const [nodeExecutionResults, setNodeExecutionResults] = useState<Record<string, { input?: any; output?: any; error?: string; executionTime?: number; status?: string }>>({});
  const [simulationMode, setSimulationMode] = useState(false);
  
  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form for editing workflow metadata
  const editWorkflowForm = useForm<EditWorkflowFormData>({
    resolver: zodResolver(editWorkflowSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Update form when currentWorkflow changes
  useEffect(() => {
    if (currentWorkflow && showEditWorkflowDialog) {
      editWorkflowForm.reset({
        name: currentWorkflow.name,
        description: currentWorkflow.description || '',
      });
    }
  }, [currentWorkflow, showEditWorkflowDialog, editWorkflowForm]);

  // Fetch workflows
  const { data: workflows, isLoading: workflowsLoading } = useQuery<Workflow[]>({
    queryKey: ['/api/workflows'],
  });

  // Fetch workflow folders
  const { data: workflowFolders } = useQuery({
    queryKey: ['/api/workflow-folders'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workflow-folders');
      if (!response.ok) return [];
      return await response.json();
    },
    staleTime: 60 * 1000,
  });

  // Fetch data sources and SQL queries for workflow integration
  const { data: allDataSources } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/data-sources?isActive=true');
      if (!response.ok) {
        throw new Error('Failed to fetch data sources');
      }
      return await response.json();
    },
    staleTime: 30 * 1000,
  });

  // Save workflow mutation
  const saveWorkflowMutation = useMutation({
    mutationFn: async (workflowData: any) => {
      const method = currentWorkflow ? 'PUT' : 'POST';
      const url = currentWorkflow ? `/api/workflows/${currentWorkflow.id}` : '/api/workflows';
      const response = await apiRequest(method, url, workflowData);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentWorkflow(data);
      setHasUnsavedChanges(false); // Clear unsaved changes flag
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({
        title: "워크플로우 저장 완료",
        description: `"${data.name || '워크플로우'}"가 성공적으로 저장되었습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "워크플로우 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Simulation session creation mutation
  const createSimulationSessionMutation = useMutation({
    mutationFn: async (workflowDefinition: WorkflowDefinition) => {
      const response = await apiRequest('POST', '/api/workflows/simulation/create-session', {
        workflowDefinition
      });
      if (!response.ok) {
        throw new Error('Failed to create simulation session');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setSimulationSessionId(data.sessionId);
      setSimulationMode(true);
      setNodeExecutionResults({});
      toast({
        title: "시뮬레이션 모드 시작",
        description: "노드를 하나씩 실행할 수 있습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "시뮬레이션 모드 시작 실패",
        description: error.message || "시뮬레이션 세션 생성에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // Execute single node mutation (simulation)
  const executeSingleNodeMutation = useMutation({
    mutationFn: async ({ nodeId, workflowDefinition }: { nodeId: string; workflowDefinition: WorkflowDefinition }) => {
      if (!simulationSessionId) {
        throw new Error('Simulation session not initialized');
      }
      const response = await apiRequest('POST', `/api/workflows/simulation/${simulationSessionId}/execute-node/${nodeId}`, {
        workflowDefinition
      });
      if (!response.ok) {
        throw new Error('Failed to execute node');
      }
      return await response.json();
    },
    onSuccess: (data, variables) => {
      setNodeExecutionResults(prev => ({
        ...prev,
        [variables.nodeId]: {
          input: data.input,
          output: data.output,
          executionTime: data.executionTime,
          status: 'completed'
        }
      }));
      toast({
        title: "노드 실행 완료",
        description: `노드가 성공적으로 실행되었습니다. (${data.executionTime}ms)`,
      });
    },
    onError: (error: any, variables) => {
      setNodeExecutionResults(prev => ({
        ...prev,
        [variables.nodeId]: {
          error: error.message,
          status: 'failed'
        }
      }));
      toast({
        title: "노드 실행 실패",
        description: error.message || "노드 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Fetch node execution results query
  const { data: nodeExecutionResultsData, refetch: refetchNodeExecutions } = useQuery({
    queryKey: ['/api/workflows/simulation', simulationSessionId, 'node-executions'],
    queryFn: async () => {
      if (!simulationSessionId) return null;
      const response = await apiRequest('GET', `/api/workflows/simulation/${simulationSessionId}/node-executions`);
      if (!response.ok) {
        throw new Error('Failed to fetch node executions');
      }
      return await response.json();
    },
    enabled: !!simulationSessionId && simulationMode,
    refetchInterval: simulationMode ? 2000 : false, // Poll every 2 seconds when in simulation mode
  });

  // Update node execution results when data is fetched
  useEffect(() => {
    if (nodeExecutionResultsData?.nodeExecutions) {
      const results: Record<string, { input?: any; output?: any; error?: string; executionTime?: number; status?: string }> = {};
      nodeExecutionResultsData.nodeExecutions.forEach((exec: any) => {
        results[exec.nodeId] = {
          input: exec.inputData,
          output: exec.outputData,
          error: exec.errorMessage,
          executionTime: exec.executionTime,
          status: exec.status
        };
      });
      setNodeExecutionResults(prev => ({ ...prev, ...results }));
    }
  }, [nodeExecutionResultsData]);

  // Execute workflow mutation
  const executeWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await apiRequest('POST', `/api/workflows/${workflowId}/execute`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "워크플로우 실행 시작",
        description: "워크플로우가 백그라운드에서 실행되고 있습니다. 실행 상태는 워크플로우 모니터에서 확인할 수 있습니다.",
      });
    },
    onError: () => {
      toast({
        title: "실행 실패",
        description: "워크플로우 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Test execute workflow mutation
  const testExecuteWorkflowMutation = useMutation({
    mutationFn: async (workflowDefinition: WorkflowDefinition) => {
      const response = await apiRequest('POST', '/api/workflows/test-execute', {
        workflowDefinition: workflowDefinition
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsTestExecuting(true);
      setTestExecutionResults([]);
      setTestExecutionStatus('테스트 실행이 시작되었습니다...');
      setShowResultsModal(true);
      toast({
        title: "테스트 실행 시작",
        description: "워크플로우 테스트가 시작되었습니다.",
      });
    },
    onError: (error: any) => {
      setIsTestExecuting(false);
      toast({
        title: "테스트 실행 실패",
        description: error.message || "워크플로우 테스트 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Update workflow metadata mutation
  const updateWorkflowMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!currentWorkflow) throw new Error('No current workflow');
      // Send full workflow object to preserve all fields
      const fullWorkflowData = {
        name: data.name,
        description: data.description,
        definition: currentWorkflow.definition,
        isActive: currentWorkflow.isActive,
      };
      const response = await apiRequest('PUT', `/api/workflows/${currentWorkflow.id}`, fullWorkflowData);
      return response.json();
    },
    onSuccess: (updatedWorkflow) => {
      setCurrentWorkflow(updatedWorkflow);
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      setShowEditWorkflowDialog(false);
      toast({
        title: "워크플로우 정보 업데이트",
        description: "워크플로우 이름과 설명이 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "업데이트 실패",
        description: "워크플로우 정보 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete workflow mutation
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      await apiRequest('DELETE', `/api/workflows/${workflowId}`);
    },
    onSuccess: () => {
      setCurrentWorkflow(null);
      setNodes(initialNodes);
      setEdges(initialEdges);
      setSelectedNode(null);
      setShowResultsModal(false);
      setIsTestExecuting(false);
      setTestExecutionResults([]);
      setTestExecutionStatus('');
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({
        title: "워크플로우 삭제 완료",
        description: "워크플로우가 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "워크플로우 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Note: Unsaved changes tracking is now handled in change handlers

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    // If there are unsaved changes, show confirmation dialog
    if (hasUnsavedChanges) {
      setPendingTemplate(template);
      setShowTemplateConfirmDialog(true);
      return;
    }
    
    // Apply template directly if no unsaved changes
    applyTemplate(template);
  };

  const applyTemplate = (template: WorkflowTemplate) => {
    // Convert template definition nodes to ReactFlow Node[] format (same as loadWorkflow)
    // Position이 없는 경우 기본값 설정
    let xOffset = 100;
    let yOffset = 100;
    const loadedNodes: Node[] = template.definition.nodes.map((wfNode, index) => {
      // Position이 없거나 유효하지 않은 경우 기본값 설정
      let nodePosition = wfNode.position;
      if (!nodePosition || typeof nodePosition.x !== 'number' || typeof nodePosition.y !== 'number') {
        nodePosition = {
          x: xOffset + (index % 3) * 300,
          y: yOffset + Math.floor(index / 3) * 150
        };
      }
      return {
        id: wfNode.id,
        type: 'workflowNode',
        position: nodePosition,
        data: {
          ...wfNode.data,
          description: wfNode.data.description || '',
          config: { ...(wfNode.data.config || {}), type: wfNode.type },
          label: wfNode.data.label || wfNode.type
        }
      };
    });
    
    // Convert template definition edges to ReactFlow Edge[] format (same as loadWorkflow)
    const loadedEdges: Edge[] = template.definition.edges.map(wfEdge => ({
      id: wfEdge.id,
      source: wfEdge.source,
      target: wfEdge.target,
      sourceHandle: wfEdge.sourceHandle,
      targetHandle: wfEdge.targetHandle
    }));

    // Load template definition into the editor
    setNodes(loadedNodes);
    setEdges(loadedEdges);
    setCurrentWorkflow(null); // Reset current workflow
    setSelectedNode(null);
    setTestExecutionResults([]);
    setTestExecutionStatus('');
    setHasUnsavedChanges(true); // Mark as having unsaved changes
    
    toast({
      title: "템플릿 적용됨",
      description: `'${template.name}' 템플릿이 적용되었습니다. 필요에 따라 수정하고 저장하세요.`,
    });
  };

  const handleConfirmTemplateApply = () => {
    if (pendingTemplate) {
      applyTemplate(pendingTemplate);
      setPendingTemplate(null);
      setShowTemplateConfirmDialog(false);
      setShowTemplateDialog(false);
    }
  };

  const handleCancelTemplateApply = () => {
    setPendingTemplate(null);
    setShowTemplateConfirmDialog(false);
  };

  // WebSocket subscription for real-time test execution updates
  useEffect(() => {
    if (!isConnected || !isTestExecuting) return;

    const unsubscribe = subscribe('test_execution_update', (evt) => {
      const msg = (evt && (evt as any).data) ? (evt as any).data : evt;
      console.log('Test execution update:', msg);
      
      if (msg?.type === 'progress') {
        setTestExecutionStatus(msg.message || '실행 중...');
      } else if (msg?.type === 'node_complete') {
        setTestExecutionResults(prev => [...prev, msg]);
      } else if (msg?.type === 'complete') {
        setIsTestExecuting(false);
        setTestExecutionStatus('테스트 실행이 완료되었습니다.');
        const nodeCount = testExecutionResults.length;
        toast({
          title: "테스트 실행 완료",
          description: `워크플로우 테스트가 성공적으로 완료되었습니다. ${nodeCount}개의 노드가 실행되었습니다.`,
        });
      } else if (msg?.type === 'error') {
        setIsTestExecuting(false);
        setTestExecutionStatus('테스트 실행 중 오류가 발생했습니다.');
        toast({
          title: "테스트 실행 오류",
          description: msg.message || "실행 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    });

    return unsubscribe;
  }, [isConnected, isTestExecuting, subscribe, toast]);

  // Auto-save function (defined early to avoid hoisting issues)
  const handleAutoSave = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (!currentWorkflow) return;
    
    const workflowDefinition: WorkflowDefinition & { dataSources?: Array<{ id: string; name: string; type: string }> } = {
      nodes: currentNodes.map(node => ({
        id: node.id,
        type: node.data.config?.type || 'unknown',
        position: node.position,
        data: node.data
      })),
      edges: currentEdges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined
      })),
      dataSources: workflowDataSources.length > 0 ? workflowDataSources : undefined
    };

    const workflowData = {
      name: currentWorkflow.name,
      description: currentWorkflow.description,
      definition: workflowDefinition,
      isActive: currentWorkflow.isActive
    };

    // Silent save (no toast notification)
    saveWorkflowMutation.mutate(workflowData);
  }, [currentWorkflow, saveWorkflowMutation, workflowDataSources]);

  const handleNodesChange = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);
    // Mark as unsaved for any user-driven changes
    setHasUnsavedChanges(true);
    
    // Trigger auto-save after 2 seconds of inactivity
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (currentWorkflow) {
        handleAutoSave(newNodes, edges);
      }
    }, 2000);
  }, [edges, currentWorkflow, handleAutoSave]);

  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges);
    // Mark as unsaved for any user-driven changes
    setHasUnsavedChanges(true);
    
    // Trigger auto-save after 2 seconds of inactivity
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (currentWorkflow) {
        handleAutoSave(nodes, newEdges);
      }
    }, 2000);
  }, [nodes, currentWorkflow, handleAutoSave]);

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node);
    if (node) {
      setIsPanelVisible(true);
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelVisible(false);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, updates: any) => {
    setNodes(prevNodes => {
      const node = prevNodes.find(n => n.id === nodeId);
      if (!node) return prevNodes;
      
      const updatedConfig = { ...node.data.config, ...(updates.config || {}) };
      const nodeType = updatedConfig.type || node.data.config?.type || 'unknown';
      
      // Validate node schema before updating
      const schemaValidation = validateNodeSchema(nodeType, updatedConfig);
      if (!schemaValidation.isValid && schemaValidation.errors.length > 0) {
        toast({
          title: "노드 속성 검증 실패",
          description: schemaValidation.errors.join(', ') || "노드 속성 정보가 올바르지 않습니다.",
          variant: "destructive"
        });
        return prevNodes;
      }
      
      const updatedNodes = prevNodes.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, ...updates, config: updatedConfig } }
          : n
      );
      
      // Trigger auto-save after node property update
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        if (currentWorkflow) {
          handleAutoSave(updatedNodes, edges);
        }
      }, 2000);
      
      return updatedNodes;
    });
    // Mark as unsaved when node properties change
    setHasUnsavedChanges(true);
  }, [edges, currentWorkflow, handleAutoSave, toast]);

  // Analyze node deletion impact
  const analyzeNodeDeletionImpact = useCallback((nodeId: string) => {
    const affectedEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
    const affectedNodeIds = new Set<string>();
    
    affectedEdges.forEach(edge => {
      if (edge.source === nodeId) {
        affectedNodeIds.add(edge.target);
      }
      if (edge.target === nodeId) {
        affectedNodeIds.add(edge.source);
      }
    });
    
    const node = nodes.find(n => n.id === nodeId);
    const nodeType = node?.data?.config?.type || node?.type || 'unknown';
    const nodeLabel = node?.data?.label || nodeId;
    
    return {
      nodeId,
      nodeLabel,
      nodeType,
      affectedNodes: Array.from(affectedNodeIds),
      affectedEdges: affectedEdges.map(e => e.id),
      downstreamNodes: affectedEdges
        .filter(e => e.source === nodeId)
        .map(e => {
          const targetNode = nodes.find(n => n.id === e.target);
          return targetNode?.data?.label || e.target;
        }),
      upstreamNodes: affectedEdges
        .filter(e => e.target === nodeId)
        .map(e => {
          const sourceNode = nodes.find(n => n.id === e.source);
          return sourceNode?.data?.label || e.source;
        })
    };
  }, [nodes, edges]);

  // Handle node delete request
  const handleNodeDeleteRequest = useCallback((node: Node) => {
    const impact = analyzeNodeDeletionImpact(node.id);
    setNodeToDelete(node);
    setNodeDeleteImpact({
      affectedNodes: impact.affectedNodes,
      affectedEdges: impact.affectedEdges
    });
    setShowDeleteNodeDialog(true);
  }, [analyzeNodeDeletionImpact]);

  // Confirm node deletion
  const handleConfirmNodeDelete = useCallback(() => {
    if (!nodeToDelete) return;
    
    try {
      const impact = analyzeNodeDeletionImpact(nodeToDelete.id);
      
      // Remove node and connected edges
      const updatedNodes = nodes.filter(n => n.id !== nodeToDelete.id);
      const updatedEdges = edges.filter(e => 
        e.source !== nodeToDelete.id && e.target !== nodeToDelete.id
      );
      
      // Clean up variable references in remaining nodes
      // Check if any remaining nodes reference the deleted node's output variables
      const deletedNodeType = nodeToDelete.data.config?.type || nodeToDelete.data.type;
      const deletedNodeId = nodeToDelete.id;
      
      // Update nodes that might reference the deleted node's output
      const cleanedNodes = updatedNodes.map(node => {
        const nodeConfig = node.data.config || {};
        const nodeData = node.data || {};
        
        // Check for variable references in prompt templates, API configurations, etc.
        let needsUpdate = false;
        const updatedConfig = { ...nodeConfig };
        const updatedData = { ...nodeData };
        
        // Check systemPrompt and userPromptTemplate for variable references
        if (nodeData.systemPrompt && typeof nodeData.systemPrompt === 'string') {
          const hasReference = nodeData.systemPrompt.includes(`{${deletedNodeId}}`) || 
                               nodeData.systemPrompt.includes(`{${deletedNodeId}.`);
          if (hasReference) {
            // Remove or replace the reference
            updatedData.systemPrompt = nodeData.systemPrompt
              .replace(new RegExp(`\\{${deletedNodeId}(\\.[^}]+)?\\}`, 'g'), '{deleted}');
            needsUpdate = true;
          }
        }
        
        if (nodeData.userPromptTemplate && typeof nodeData.userPromptTemplate === 'string') {
          const hasReference = nodeData.userPromptTemplate.includes(`{${deletedNodeId}}`) || 
                               nodeData.userPromptTemplate.includes(`{${deletedNodeId}.`);
          if (hasReference) {
            updatedData.userPromptTemplate = nodeData.userPromptTemplate
              .replace(new RegExp(`\\{${deletedNodeId}(\\.[^}]+)?\\}`, 'g'), '{deleted}');
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          return {
            ...node,
            data: {
              ...updatedData,
              config: updatedConfig
            }
          };
        }
        
        return node;
      });
      
      setNodes(cleanedNodes);
      setEdges(updatedEdges);
      setHasUnsavedChanges(true);
      
      // Clear selection if deleted node was selected
      if (selectedNode?.id === nodeToDelete.id) {
        setSelectedNode(null);
        setIsPanelVisible(false);
      }
      
      // Close dialog
      setShowDeleteNodeDialog(false);
      setNodeToDelete(null);
      setNodeDeleteImpact(null);
      
      // Show feedback
      const affectedCount = impact.downstreamNodes.length + impact.upstreamNodes.length;
      if (affectedCount > 0) {
        toast({
          title: "노드 삭제됨",
          description: `"${nodeToDelete.data.label}" 노드가 삭제되었습니다. ${affectedCount}개의 연결된 노드가 영향을 받았습니다. 관련 변수 참조가 정리되었습니다.`,
          variant: "default"
        });
      } else {
        toast({
          title: "노드 삭제됨",
          description: `"${nodeToDelete.data.label}" 노드가 삭제되었습니다.`,
        });
      }
    } catch (error: any) {
      console.error('노드 삭제 중 오류:', error);
      toast({
        title: "노드 삭제 실패",
        description: error.message || "노드 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  }, [nodeToDelete, nodes, edges, selectedNode, analyzeNodeDeletionImpact, toast]);

  // Cancel node deletion
  const handleCancelNodeDelete = useCallback(() => {
    setShowDeleteNodeDialog(false);
    setNodeToDelete(null);
    setNodeDeleteImpact(null);
  }, []);

  // Initialize workflow with start node if empty
  useEffect(() => {
    // Only add start node if there are no nodes and no current workflow (new workflow)
    if (nodes.length === 0 && !currentWorkflow && !hasLoadedFromUrl) {
      const startNode: Node = {
        id: 'start-0',
        type: 'workflowNode',
        position: { x: 100, y: 100 },
        data: {
          label: '시작',
          description: '워크플로우 시작 노드',
          config: { type: 'start' }
        }
      };
      setNodes([startNode]);
      setHasUnsavedChanges(true);
    }
  }, [nodes.length, currentWorkflow, hasLoadedFromUrl]);

  // Handle node creation from context menu or dialog
  const handleCreateNode = useCallback((nodeData: any, position?: { x: number; y: number }) => {
    // Validate node addition rules
    const workflowNodes = nodes.map(node => ({
      id: node.id,
      type: node.data.config?.type || 'unknown',
      position: node.position,
      data: node.data
    }));
    
    const workflowEdges = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined
    }));

    // Validate node addition rules
    const nodeValidation = validateNodeAddition(nodeData.type, workflowNodes, workflowEdges);
    if (!nodeValidation.isValid) {
      toast({
        title: "노드 추가 불가",
        description: nodeValidation.message || "노드를 추가할 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    // Validate node schema before adding
    const testNode: WorkflowNode = {
      id: `${nodeData.type}-${Date.now()}`,
      type: nodeData.type as any,
      position: { x: 0, y: 0 },
      data: {
        label: nodeData.label,
        description: nodeData.description || '',
        config: { type: nodeData.type, ...nodeData }
      }
    };
    
    const schemaValidation = validateNodeBeforeAdd(testNode, workflowNodes, workflowEdges);
    if (!schemaValidation.isValid) {
      toast({
        title: "노드 속성 검증 실패",
        description: schemaValidation.errors.join(', ') || "노드 속성 정보가 올바르지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    const newNodeId = `${nodeData.type}-${Date.now()}`;
    
    // Use provided position or calculate default position
    let newPosition = position || { x: 100, y: 100 };
    
    // If position not provided and there are existing nodes, find the rightmost node
    if (!position && nodes.length > 0) {
      const rightmostNode = nodes.reduce((prev, current) => 
        current.position.x > prev.position.x ? current : prev
      );
      
      newPosition = {
        x: rightmostNode.position.x + 300,
        y: rightmostNode.position.y
      };
    }
    
    // Create new node
    const newNode: Node = {
      id: newNodeId,
      type: 'workflowNode',
      position: newPosition,
      data: {
        label: nodeData.label,
        description: nodeData.description,
        config: { 
          type: nodeData.type,
          ...(nodeData.promptId && { promptId: nodeData.promptId }),
          ...(nodeData.apiCallId && { apiCallId: nodeData.apiCallId }),
          ...(nodeData.workflowId && { workflowId: nodeData.workflowId }),
          ...(nodeData.systemPrompt && { systemPrompt: nodeData.systemPrompt }),
          ...(nodeData.url && { url: nodeData.url }),
          ...(nodeData.method && { method: nodeData.method }),
          ...(nodeData.sqlQueryId && { sqlQueryId: nodeData.sqlQueryId }),
          ...(nodeData.dataSourceId && { dataSourceId: nodeData.dataSourceId }),
        }
      }
    };
    
    // Validate schema before adding
    const newNodeSchemaValidation = validateNodeSchema(nodeData.type, newNode.data.config || {});
    if (!newNodeSchemaValidation.isValid && newNodeSchemaValidation.errors.length > 0) {
      toast({
        title: "노드 속성 검증 실패",
        description: newNodeSchemaValidation.errors.join(', ') || "노드 속성 정보가 올바르지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    // If this is a SQL query node, automatically add the associated data source to workflow data sources
    if (nodeData.type === 'sql_query' && nodeData.dataSourceId && allDataSources) {
      const dataSource = allDataSources.find(ds => ds.id === nodeData.dataSourceId);
      if (dataSource) {
        setWorkflowDataSources(prev => {
          const exists = prev.some(ds => ds.id === dataSource.id);
          if (!exists) {
            return [...prev, { id: dataSource.id, name: dataSource.name, type: dataSource.type }];
          }
          return prev;
        });
      }
    }

    // Add node to canvas
    setNodes(prevNodes => [...prevNodes, newNode]);
    setHasUnsavedChanges(true);
    
    toast({
      title: "노드 추가됨",
      description: nodeData.type === 'sql_query' && nodeData.dataSourceId
        ? `"${nodeData.label}" 노드가 워크플로우에 추가되었고, 연결된 데이터소스가 전역변수로 활성화되었습니다.`
        : `"${nodeData.label}" 노드가 워크플로우에 추가되었습니다.`,
    });
    
    // Close dialog if open
    setShowCreateNodeDialog(false);
    setCreateNodePosition(null);
  }, [nodes, edges, toast, allDataSources]);

  // Handle double-click on palette node to auto-add to canvas
  const handleNodeDoubleClick = useCallback((nodeData: any) => {
    // Validate node addition rules
    const workflowNodes = nodes.map(node => ({
      id: node.id,
      type: node.data.config?.type || 'unknown',
      position: node.position,
      data: node.data
    }));
    
    const workflowEdges = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined
    }));

    // Validate node addition rules
    const nodeValidation = validateNodeAddition(nodeData.type, workflowNodes, workflowEdges);
    if (!nodeValidation.isValid) {
      toast({
        title: "노드 추가 불가",
        description: nodeValidation.message || "노드를 추가할 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    // Validate node schema before adding
    const testNode: WorkflowNode = {
      id: `${nodeData.type}-${Date.now()}`,
      type: nodeData.type as any,
      position: { x: 0, y: 0 },
      data: {
        label: nodeData.label,
        description: nodeData.description || '',
        config: { type: nodeData.type, ...nodeData }
      }
    };
    
    const schemaValidation = validateNodeBeforeAdd(testNode, workflowNodes, workflowEdges);
    if (!schemaValidation.isValid) {
      toast({
        title: "노드 속성 검증 실패",
        description: schemaValidation.errors.join(', ') || "노드 속성 정보가 올바르지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    const newNodeId = `${nodeData.type}-${Date.now()}`;
    
    let newPosition = { x: 100, y: 100 };
    let newEdge: Edge | null = null;
    
    // If there are existing nodes, find the rightmost node and position next to it
    if (nodes.length > 0) {
      const rightmostNode = nodes.reduce((prev, current) => 
        current.position.x > prev.position.x ? current : prev
      );
      
      newPosition = {
        x: rightmostNode.position.x + 300,
        y: rightmostNode.position.y
      };
      
      // Create edge from rightmost node to new node (validate connection first)
      const testConnection = { source: rightmostNode.id, target: newNodeId };
      const workflowNodesWithNew = [...workflowNodes, {
        id: newNodeId,
        type: nodeData.type,
        position: newPosition,
        data: { label: nodeData.label, description: nodeData.description, config: { type: nodeData.type } }
      }];
      
      // Only create edge if connection would be valid (not creating cycle)
      if (!wouldCreateCycle(workflowNodesWithNew, workflowEdges, testConnection)) {
        newEdge = {
          id: `edge-${rightmostNode.id}-${newNodeId}`,
          source: rightmostNode.id,
          target: newNodeId,
        };
      }
    }
    
    // Create new node
    const newNode: Node = {
      id: newNodeId,
      type: 'workflowNode',
      position: newPosition,
      data: {
        label: nodeData.label,
        description: nodeData.description,
        config: { 
          type: nodeData.type,
          ...(nodeData.promptId && { promptId: nodeData.promptId }),
          ...(nodeData.apiCallId && { apiCallId: nodeData.apiCallId }),
          ...(nodeData.workflowId && { workflowId: nodeData.workflowId }),
          ...(nodeData.systemPrompt && { systemPrompt: nodeData.systemPrompt }),
          ...(nodeData.url && { url: nodeData.url }),
          ...(nodeData.method && { method: nodeData.method }),
          ...(nodeData.sqlQueryId && { sqlQueryId: nodeData.sqlQueryId }),
          ...(nodeData.dataSourceId && { dataSourceId: nodeData.dataSourceId }),
        }
      }
    };
    
    // Validate schema before adding
    const newNodeSchemaValidation = validateNodeSchema(nodeData.type, newNode.data.config || {});
    if (!newNodeSchemaValidation.isValid && newNodeSchemaValidation.errors.length > 0) {
      toast({
        title: "노드 속성 검증 실패",
        description: newNodeSchemaValidation.errors.join(', ') || "노드 속성 정보가 올바르지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    // If this is a SQL query node, automatically add the associated data source to workflow data sources
    if (nodeData.type === 'sql_query' && nodeData.dataSourceId && allDataSources) {
      const dataSource = allDataSources.find(ds => ds.id === nodeData.dataSourceId);
      if (dataSource) {
        setWorkflowDataSources(prev => {
          const exists = prev.some(ds => ds.id === dataSource.id);
          if (!exists) {
            return [...prev, { id: dataSource.id, name: dataSource.name, type: dataSource.type }];
          }
          return prev;
        });
      }
    }

    // Add node and edge to canvas
    setNodes(prevNodes => [...prevNodes, newNode]);
    if (newEdge) {
      setEdges(prevEdges => [...prevEdges, newEdge]);
    }
    setHasUnsavedChanges(true);
    
    // Use handleCreateNode for consistency
    handleCreateNode(nodeData);
  }, [handleCreateNode]);

  const handleSave = () => {
    const workflowDefinition: WorkflowDefinition & { dataSources?: Array<{ id: string; name: string; type: string }> } = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.data.config?.type || 'unknown',
        position: node.position,
        data: node.data
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined
      })),
      dataSources: workflowDataSources.length > 0 ? workflowDataSources : undefined
    };

    const workflowData = {
      name: currentWorkflow?.name || '새 워크플로우',
      description: currentWorkflow?.description || '워크플로우 설명',
      definition: workflowDefinition,
      isActive: true
    };

    saveWorkflowMutation.mutate(workflowData);
  };

  const handleExecute = () => {
    if (!currentWorkflow) {
      toast({
        title: "워크플로우 저장 필요",
        description: "실행하기 전에 워크플로우를 먼저 저장해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Pre-execution cycle detection to prevent infinite loops
    try {
      const workflowDefinition: WorkflowDefinition = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.data.config?.type || 'unknown',
          position: node.position,
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || undefined,
          targetHandle: edge.targetHandle || undefined
        }))
      };
      
      const cycleResult = detectCycles(workflowDefinition.nodes, workflowDefinition.edges);
      
      if (cycleResult.hasCycles) {
        const cycleMessages = formatCycleErrors(cycleResult);
        
        toast({
          title: "🚫 실행 차단: 순환 감지",
          description: (
            <div className="space-y-2">
              <p className="font-semibold text-red-600">워크플로우에 순환이 감지되어 실행이 차단되었습니다.</p>
              <div className="bg-red-50 p-2 rounded text-sm">
                <p className="font-medium">감지된 순환:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  {cycleResult.cyclePaths.map((path, index) => (
                    <li key={index} className="font-mono text-xs">
                      {path.join(' → ')}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm">순환을 제거한 후 다시 시도해주세요.</p>
            </div>
          ),
          variant: "destructive",
          duration: 15000, // Show for longer duration
        });
        
        console.error('Workflow execution blocked due to cycles:', cycleResult);
        return;
      }
      
    } catch (error) {
      toast({
        title: "실행 전 검증 실패",
        description: "워크플로우 구조 검증 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error('Pre-execution validation failed:', error);
      return;
    }
    
    executeWorkflowMutation.mutate(currentWorkflow.id);
  };

  const handleTestExecute = () => {
    const workflowDefinition: WorkflowDefinition & { dataSources?: Array<{ id: string; name: string; type: string }> } = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.data.config?.type || 'unknown',
        position: node.position,
        data: node.data
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined
      })),
      dataSources: workflowDataSources.length > 0 ? workflowDataSources : undefined
    };

    // Pre-test-execution cycle detection to prevent infinite loops
    try {
      const cycleResult = detectCycles(workflowDefinition.nodes, workflowDefinition.edges);
      
      if (cycleResult.hasCycles) {
        const cycleMessages = formatCycleErrors(cycleResult);
        
        toast({
          title: "🚫 테스트 실행 차단: 순환 감지",
          description: (
            <div className="space-y-2">
              <p className="font-semibold text-red-600">워크플로우에 순환이 감지되어 테스트 실행이 차단되었습니다.</p>
              <div className="bg-red-50 p-2 rounded text-sm">
                <p className="font-medium">감지된 순환:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  {cycleResult.cyclePaths.map((path, index) => (
                    <li key={index} className="font-mono text-xs">
                      {path.join(' → ')}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm">순환을 제거한 후 다시 시도해주세요.</p>
            </div>
          ),
          variant: "destructive",
          duration: 15000, // Show for longer duration
        });
        
        console.error('Test execution blocked due to cycles:', cycleResult);
        return;
      }
      
    } catch (error) {
      toast({
        title: "테스트 실행 전 검증 실패",
        description: "워크플로우 구조 검증 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error('Pre-test-execution validation failed:', error);
      return;
    }

    testExecuteWorkflowMutation.mutate(workflowDefinition);
  };

  const handleDelete = () => {
    if (!currentWorkflow) {
      toast({
        title: "삭제할 워크플로우 없음",
        description: "삭제할 워크플로우가 선택되지 않았습니다.",
        variant: "destructive",
      });
      return;
    }
    
    // 확인 다이얼로그 대신 바로 삭제 (확인 다이얼로그는 나중에 추가)
    if (confirm(`"${currentWorkflow.name}" 워크플로우를 정말 삭제하시겠습니까?`)) {
      deleteWorkflowMutation.mutate(currentWorkflow.id);
    }
  };

  // Load workflow definition into the editor
  const loadWorkflow = useCallback((workflow: Workflow, options?: { silent?: boolean; showSuccessToast?: boolean }) => {
    try {
      const definition = workflow.definition as WorkflowDefinition & { dataSources?: Array<{ id: string; name: string; type: string }> };
      const { silent = false, showSuccessToast = false } = options || {};
      
      // Validate workflow structure and detect cycles before loading
      // Skip isolated node warnings for new workflows (they are expected during initial setup)
      const isNewWorkflow = !workflow.id;
      const validationResult = validateWorkflowStructure(definition.nodes, definition.edges, { skipForNewWorkflow: isNewWorkflow });
      
      // Convert WorkflowNode[] to ReactFlow Node[]
      // Position이 없는 경우 기본값 설정
      let xOffset = 100;
      let yOffset = 100;
      const loadedNodes: Node[] = definition.nodes.map((wfNode, index) => {
        // Position이 없거나 유효하지 않은 경우 기본값 설정
        let nodePosition = wfNode.position;
        if (!nodePosition || typeof nodePosition.x !== 'number' || typeof nodePosition.y !== 'number') {
          nodePosition = {
            x: xOffset + (index % 3) * 300,
            y: yOffset + Math.floor(index / 3) * 150
          };
        }
        return {
          id: wfNode.id,
          type: 'workflowNode',
          position: nodePosition,
          data: {
            ...wfNode.data,
            description: wfNode.data.description || '',
            config: { ...(wfNode.data.config || {}), type: wfNode.type },
            label: wfNode.data.label || wfNode.type
          }
        };
      });
      
      // Convert WorkflowEdge[] to ReactFlow Edge[]
      const loadedEdges: Edge[] = definition.edges.map(wfEdge => ({
        id: wfEdge.id,
        source: wfEdge.source,
        target: wfEdge.target,
        sourceHandle: wfEdge.sourceHandle,
        targetHandle: wfEdge.targetHandle
      }));
      
      // Load data sources
      if (definition.dataSources) {
        setWorkflowDataSources(definition.dataSources);
      } else {
        setWorkflowDataSources([]);
      }
      
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setCurrentWorkflow(workflow);
      setSelectedNode(null);
      setHasUnsavedChanges(false);
      
      // Only show toasts if not in silent mode
      if (!silent) {
        // Show cycle detection warnings if cycles exist
        if (validationResult.hasCycles) {
          const cycleMessages = formatCycleErrors(validationResult.cycles);
          toast({
            title: "⚠️ 워크플로우 순환 감지",
            description: (
              <div className="space-y-1">
                <p>로드된 워크플로우에서 순환이 감지되었습니다:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {validationResult.cycles.cyclePaths.map((path, index) => (
                    <li key={index} className="text-xs font-mono">
                      {path.join(' → ')}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium text-amber-600">
                  이 워크플로우는 실행할 수 없습니다. 순환을 제거해주세요.
                </p>
              </div>
            ),
            variant: "destructive",
            duration: 10000, // Show for longer duration
          });
          
          console.warn('Workflow cycles detected:', validationResult.cycles);
        } 
        // Don't show isolated node warnings for new workflows
        else if (validationResult.warnings.length > 0 && !isNewWorkflow) {
          toast({
            title: "워크플로우 경고",
            description: validationResult.warnings.join(', '),
            variant: "destructive",
            duration: 5000,
          });
        } else if (showSuccessToast) {
          toast({
            title: "워크플로우 로드 완료",
            description: `"${workflow.name}" 워크플로우가 로드되었습니다.`,
          });
        }
      }
      
      // Log validation warnings (only for saved workflows, not new ones)
      if (validationResult.warnings.length > 0 && !isNewWorkflow) {
        console.warn('Workflow validation warnings:', validationResult.warnings);
      }
      
      // Log cycles even in silent mode for debugging
      if (silent && validationResult.hasCycles) {
        console.warn('Workflow cycles detected (silent mode):', validationResult.cycles);
      }
      
    } catch (error) {
      console.error('Failed to load workflow:', error);
      if (!options?.silent) {
        toast({
          title: "워크플로우 로드 실패",
          description: "워크플로우 정의를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  // Load workflow from URL parameter if provided (silent mode for initial load)
  useEffect(() => {
    if (workflowIdFromUrl && workflows && !hasLoadedFromUrl) {
      const workflow = workflows.find(w => w.id === workflowIdFromUrl);
      if (workflow) {
        loadWorkflow(workflow, { silent: true }); // Silent mode for initial URL load
        setHasLoadedFromUrl(true);
      }
    }
  }, [workflowIdFromUrl, workflows, hasLoadedFromUrl, loadWorkflow]);

  // Check if there are unsaved changes
  const checkForUnsavedChanges = useCallback(() => {
    // Always rely on hasUnsavedChanges flag for accurate tracking
    return !!hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Handle new workflow creation
  const handleNewWorkflow = useCallback(() => {
    // Check for unsaved changes
    if (checkForUnsavedChanges()) {
      setPendingWorkflowId('new');
      setShowSwitchConfirmDialog(true);
      return;
    }
    
    // Create start node for new workflow
    const startNode: Node = {
      id: 'start-0',
      type: 'workflowNode',
      position: { x: 100, y: 100 },
      data: {
        label: '시작',
        description: '워크플로우 시작 노드',
        config: { type: 'start' }
      }
    };
    
    // Reset to initial state with start node
    setNodes([startNode]);
    setEdges(initialEdges);
    setCurrentWorkflow(null);
    setSelectedNode(null);
    setHasUnsavedChanges(true); // Mark as changed to prompt save
    setHasLoadedFromUrl(false);
    
    toast({
      title: "새 워크플로우",
      description: "새로운 워크플로우를 생성했습니다. 시작 노드가 자동으로 추가되었습니다.",
    });
  }, [checkForUnsavedChanges, toast]);

  // Handle workflow selection
  const handleWorkflowSelect = useCallback((workflowId: string) => {
    if (workflowId === 'new') {
      // 새 워크플로우 생성
      if (checkForUnsavedChanges()) {
        setPendingWorkflowId('new');
        setShowSwitchConfirmDialog(true);
        return;
      }
      handleNewWorkflow();
      return;
    }
    
    if (workflowId === String(currentWorkflow?.id)) {
      return; // Already selected
    }
    
    // Check for unsaved changes
    if (checkForUnsavedChanges()) {
      setPendingWorkflowId(workflowId);
      setShowSwitchConfirmDialog(true);
      return;
    }
    
    // Find and validate the selected workflow
    const workflow = workflows?.find((w: Workflow) => String(w.id) === workflowId);
    if (!workflow) {
      toast({
        title: "워크플로우 없음",
        description: "선택한 워크플로우를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate workflow structure before loading
    const definition = workflow.definition as WorkflowDefinition;
    if (!definition || !definition.nodes) {
      toast({
        title: "잘못된 워크플로우",
        description: "워크플로우 정의가 올바르지 않습니다.",
        variant: "destructive",
      });
      return;
    }
    
    loadWorkflow(workflow, { showSuccessToast: true });
  }, [currentWorkflow, checkForUnsavedChanges, workflows, loadWorkflow, handleNewWorkflow, toast]);

  // Handle switch confirmation dialog actions
  const handleConfirmSwitch = useCallback(() => {
    setShowSwitchConfirmDialog(false);
    
    if (pendingWorkflowId === 'new') {
      // Create new workflow with start node
      const startNode: Node = {
        id: 'start-0',
        type: 'workflowNode',
        position: { x: 100, y: 100 },
        data: {
          label: '시작',
          description: '워크플로우 시작 노드',
          config: { type: 'start' }
        }
      };
      setNodes([startNode]);
      setEdges(initialEdges);
      setCurrentWorkflow(null);
      setSelectedNode(null);
      setHasUnsavedChanges(true);
      setHasLoadedFromUrl(false);
    } else if (pendingWorkflowId) {
      // Load selected workflow
      const workflow = workflows?.find((w: Workflow) => String(w.id) === pendingWorkflowId);
      if (workflow) {
        loadWorkflow(workflow, { showSuccessToast: true });
      }
    }
    
    setPendingWorkflowId(null);
  }, [pendingWorkflowId, workflows, loadWorkflow]);

  const handleCancelSwitch = useCallback(() => {
    setShowSwitchConfirmDialog(false);
    setPendingWorkflowId(null);
  }, []);

  // Handle edit workflow form submission
  const handleEditWorkflowSubmit = useCallback((data: EditWorkflowFormData) => {
    updateWorkflowMutation.mutate(data);
  }, [updateWorkflowMutation]);

  const topBarActions = (
    <>
      {/* Workflow Selection - Moved to header */}
        
        {/* Current Workflow Status */}
        {currentWorkflow && (
          <div className="flex items-center gap-1">
            <Badge 
              variant={hasUnsavedChanges ? "destructive" : "default"}
              className="text-xs px-2 py-0.5"
              data-testid="workflow-status-badge"
            >
              {hasUnsavedChanges ? "변경됨" : "저장됨"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditWorkflowDialog(true)}
              className="h-6 w-6 p-0"
              data-testid="button-edit-workflow"
            >
              <Edit className="w-3 h-3" />
            </Button>
          </div>
        )}
        
        {/* New Workflow Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNewWorkflow}
          className="h-8 px-2"
          data-testid="button-new-workflow"
        >
          <Plus className="w-4 h-4 mr-1" />
          새 워크플로우
        </Button>
        
        {/* Template Button */}
        <WorkflowTemplates 
          onSelectTemplate={handleSelectTemplate}
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
        />
      
      {/* Action Buttons */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleSave}
        disabled={saveWorkflowMutation.isPending}
        data-testid="button-save-workflow"
      >
        {saveWorkflowMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            저장 중...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            저장
          </>
        )}
      </Button>
      <Button 
        variant="outline"
        size="sm" 
        onClick={handleTestExecute}
        disabled={testExecuteWorkflowMutation.isPending || isTestExecuting || nodes.length === 0}
        data-testid="button-test-execute-workflow"
      >
        {testExecuteWorkflowMutation.isPending || isTestExecuting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            테스트 중...
          </>
        ) : (
          <>
            <FlaskConical className="w-4 h-4 mr-2" />
            테스트 실행
          </>
        )}
      </Button>
      <Button 
        size="sm" 
        onClick={handleExecute}
        disabled={executeWorkflowMutation.isPending || !currentWorkflow}
        data-testid="button-execute-workflow"
      >
        {executeWorkflowMutation.isPending ? (
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
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={handleDelete}
        disabled={deleteWorkflowMutation.isPending || !currentWorkflow}
        data-testid="button-delete-workflow"
      >
        {deleteWorkflowMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            삭제 중...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </>
        )}
      </Button>
    </>
  );

  // Build workflow tree structure
  const workflowTree = useMemo(() => {
    if (!workflows || !workflowFolders) return [];
    
    const buildTree = (parentId: string | null): Array<{ type: 'folder' | 'workflow', id: string, name: string, folder?: WorkflowFolder, workflow?: Workflow }> => {
      const items: Array<{ type: 'folder' | 'workflow', id: string, name: string, folder?: WorkflowFolder, workflow?: Workflow }> = [];
      
      // Add folders
      const folders = (workflowFolders as WorkflowFolder[]).filter((f: WorkflowFolder) => f.parentId === parentId);
      folders.forEach((folder: WorkflowFolder) => {
        items.push({ type: 'folder', id: folder.id, name: folder.name, folder });
        // Add workflows in this folder
        const folderWorkflows = (workflows as Workflow[]).filter((w: Workflow) => w.folderId === folder.id);
        folderWorkflows.forEach((workflow: Workflow) => {
          items.push({ type: 'workflow', id: workflow.id, name: workflow.name, workflow });
        });
        // Add child folders recursively
        items.push(...buildTree(folder.id));
      });
      
      // Add root workflows (no folder)
      if (parentId === null) {
        const rootWorkflows = (workflows as Workflow[]).filter((w: Workflow) => !w.folderId);
        rootWorkflows.forEach((workflow: Workflow) => {
          items.push({ type: 'workflow', id: workflow.id, name: workflow.name, workflow });
        });
      }
      
      return items;
    };
    
    return buildTree(null);
  }, [workflows, workflowFolders]);


  return (
    <div className="flex-1 overflow-hidden">
      <h1 className="text-3xl font-bold px-6 pt-6 pb-4">워크플로우 편집기</h1>
      
      {/* Workflow Management Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-xl px-6 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Workflow Selector */}
            <div className="flex items-center gap-2 min-w-[300px]">
              <Label htmlFor="workflow-select" className="text-sm font-medium whitespace-nowrap">
                워크플로우:
              </Label>
              <Select
                value={currentWorkflow ? String(currentWorkflow.id) : 'new'}
                onValueChange={handleWorkflowSelect}
                disabled={workflowsLoading}
              >
                <SelectTrigger id="workflow-select" className="flex-1 min-w-[250px]">
                  <SelectValue placeholder={workflowsLoading ? "로딩 중..." : "워크플로우 선택"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>새 워크플로우</span>
                    </div>
                  </SelectItem>
                  {workflowTree.length > 0 && (
                    <>
                      <Separator className="my-1" />
                      {workflowTree.map((item) => {
                        if (item.type === 'folder') {
                          return (
                            <SelectItem key={item.id} value={item.id} disabled>
                              <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4" />
                                <span>{item.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">폴더</Badge>
                              </div>
                            </SelectItem>
                          );
                        }
                        return (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                <span className="font-medium">{item.workflow?.name}</span>
                              </div>
                              {item.workflow?.description && (
                                <span className="text-xs text-muted-foreground truncate max-w-[200px] ml-6">
                                  {item.workflow.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {currentWorkflow && (
              <Badge 
                variant={hasUnsavedChanges ? "secondary" : "default"}
                className={hasUnsavedChanges ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" : ""}
              >
                {hasUnsavedChanges ? "변경됨" : "저장됨"}
              </Badge>
            )}
            
            {/* Folder Management */}
            {currentWorkflow && (
              <div className="flex items-center gap-2">
                <Select
                  value={currentWorkflow.folderId || 'none'}
                  onValueChange={async (folderId) => {
                    try {
                      const response = await apiRequest('PUT', `/api/workflows/${currentWorkflow.id}/folder`, {
                        folderId: folderId === 'none' ? null : folderId
                      });
                      if (response.ok) {
                        const updated = await response.json();
                        setCurrentWorkflow(updated);
                        queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
                        toast({
                          title: "폴더 이동 완료",
                          description: "워크플로우가 폴더로 이동되었습니다.",
                        });
                      }
                    } catch (error: any) {
                      toast({
                        title: "이동 실패",
                        description: error.message || "워크플로우 이동 중 오류가 발생했습니다.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="폴더 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">폴더 없음</SelectItem>
                    {workflowFolders?.map((folder: WorkflowFolder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4" />
                          {folder.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {topBarActions}
          </div>
        </div>
        
        {/* Data Sources Global Variables */}
        {workflowDataSources.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">데이터소스 전역변수:</span>
            {workflowDataSources.map((ds) => {
              const dataSource = allDataSources?.find(d => d.id === ds.id);
              return (
                <Badge key={ds.id} variant="outline" className="flex items-center gap-1">
                  <Server className="w-3 h-3" />
                  {dataSource?.displayName || dataSource?.name || ds.name}
                  <button
                    onClick={() => {
                      setWorkflowDataSources(prev => prev.filter(d => d.id !== ds.id));
                      setHasUnsavedChanges(true);
                    }}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="flex h-[calc(100vh-8rem)]">
        <NodePalette onNodeDoubleClick={handleNodeDoubleClick} />
        
        <WorkflowCanvas
          nodes={nodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              id: node.id, // nodeId를 data에 포함하여 WorkflowNode 컴포넌트에서 접근 가능하도록 함
              onDelete: () => handleNodeDeleteRequest(node),
              simulationMode,
              executionResult: nodeExecutionResults[node.id],
              onExecuteNode: simulationMode && simulationSessionId ? (nodeId: string) => {
                const workflowDefinition: WorkflowDefinition & { dataSources?: Array<{ id: string; name: string; type: string }> } = {
                  nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.data.config?.type || 'unknown',
                    position: n.position,
                    data: n.data
                  })),
                  edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle || undefined,
                    targetHandle: e.targetHandle || undefined
                  }))
                };
                executeSingleNodeMutation.mutate({ nodeId, workflowDefinition });
              } : undefined
            }
          }))}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeSelect={handleNodeSelect}
          selectedNodeId={selectedNode?.id || null}
          showToast={(toastData) => toast({ 
            title: toastData.title,
            description: toastData.description,
            variant: toastData.variant as any
          })}
          simulationMode={simulationMode}
          onCanvasRightClick={(position) => {
            setCreateNodePosition(position);
            setShowCreateNodeDialog(true);
          }}
        />
        
        {/* Properties Panel is now a modal dialog */}
        <Dialog 
          open={isPanelVisible} 
          onOpenChange={(open) => {
            // Dialog가 닫힐 때 selectedNode를 유지하고 패널만 닫기
            if (!open) {
              setIsPanelVisible(false);
              // selectedNode는 유지하여 워크플로우 캔버스가 사라지지 않도록 함
            } else {
              setIsPanelVisible(true);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <PropertiesPanel
              selectedNode={selectedNode ? {
                id: selectedNode.id,
                type: (selectedNode.data?.config?.type || 'unknown') as WorkflowNode['type'],
                position: selectedNode.position,
                data: selectedNode.data
              } : null}
              onNodeUpdate={handleNodeUpdate}
              onClose={handleClosePanel}
              isVisible={isPanelVisible}
              allNodes={nodes.map(node => ({ id: node.id, data: node.data }))}
              allEdges={edges.map(edge => ({ source: edge.source, target: edge.target }))}
              nodeExecutionResults={nodeExecutionResults}
              onExecuteNode={async (nodeId: string, workflowDefinition: any) => {
                if (simulationMode && simulationSessionId) {
                  await executeSingleNodeMutation.mutateAsync({ 
                    nodeId, 
                    workflowDefinition: {
                      nodes: nodes.map(n => ({
                        id: n.id,
                        type: n.data.config?.type || 'unknown',
                        position: n.position,
                        data: n.data
                      })),
                      edges: edges.map(e => ({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        sourceHandle: e.sourceHandle || undefined,
                        targetHandle: e.targetHandle || undefined
                      }))
                    }
                  });
                } else {
                  // 시뮬레이션 모드가 아니면 세션 생성 후 실행
                  if (!simulationSessionId) {
                    const sessionResponse = await apiRequest('POST', '/api/workflows/simulation/create-session', {
                      workflowDefinition: {
                        nodes: nodes.map(n => ({
                          id: n.id,
                          type: n.data.config?.type || 'unknown',
                          position: n.position,
                          data: n.data
                        })),
                        edges: edges.map(e => ({
                          id: e.id,
                          source: e.source,
                          target: e.target
                        }))
                      }
                    });
                    if (sessionResponse.ok) {
                      const sessionData = await sessionResponse.json();
                      setSimulationSessionId(sessionData.sessionId);
                      await executeSingleNodeMutation.mutateAsync({ 
                        nodeId, 
                        workflowDefinition: {
                          nodes: nodes.map(n => ({
                            id: n.id,
                            type: n.data.config?.type || 'unknown',
                            position: n.position,
                            data: n.data
                          })),
                          edges: edges.map(e => ({
                            id: e.id,
                            source: e.source,
                            target: e.target
                          }))
                        }
                      });
                    } else {
                      throw new Error('시뮬레이션 세션 생성에 실패했습니다.');
                    }
                  } else {
                    await executeSingleNodeMutation.mutateAsync({ 
                      nodeId, 
                      workflowDefinition: {
                        nodes: nodes.map(n => ({
                          id: n.id,
                          type: n.data.config?.type || 'unknown',
                          position: n.position,
                          data: n.data
                        })),
                        edges: edges.map(e => ({
                          id: e.id,
                          source: e.source,
                          target: e.target
                        }))
                      }
                    });
                  }
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Test Execution Results Modal */}
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="test-execution-results-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FlaskConical className="w-4 h-4 mr-2" />
              테스트 실행 결과
              {isTestExecuting && (
                <div className="ml-2 flex items-center">
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  <span className="text-sm text-muted-foreground">실행 중...</span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status Display */}
            <div className="bg-muted p-3 rounded-lg" data-testid="test-execution-status">
              <div className="text-sm font-medium">현재 상태:</div>
              <div className="text-sm text-muted-foreground mt-1">{testExecutionStatus}</div>
            </div>
            
            <Separator />
            
            {/* Results Display */}
            <div className="space-y-2">
              <div className="text-sm font-medium">실행 결과:</div>
              <ScrollArea className="h-96 w-full border rounded-lg p-4" data-testid="test-execution-results-list">
                {testExecutionResults.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {isTestExecuting ? '결과를 기다리고 있습니다...' : '실행 결과가 없습니다.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testExecutionResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-card" data-testid={`test-result-${index}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">{result.nodeId || `Step ${index + 1}`}</div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            result.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                            result.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                            {result.status || 'Running'}
                          </div>
                        </div>
                        {result.message && (
                          <div className="text-sm text-muted-foreground mb-2">{result.message}</div>
                        )}
                        {result.data && (
                          <div className="bg-muted p-2 rounded text-xs font-mono overflow-auto max-h-32">
                            <pre>{JSON.stringify(result.data, null, 2)}</pre>
                          </div>
                        )}
                        {result.timestamp && (
                          <div className="text-xs text-muted-foreground mt-2">
                            {new Date(result.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setTestExecutionResults([]);
                  setTestExecutionStatus('');
                }}
                disabled={isTestExecuting}
                data-testid="button-clear-results"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                결과 지우기
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowResultsModal(false)}
                data-testid="button-close-modal"
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workflow Switch Confirmation Dialog */}
      <AlertDialog open={showSwitchConfirmDialog} onOpenChange={setShowSwitchConfirmDialog}>
        <AlertDialogContent data-testid="workflow-switch-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              변경사항 저장 확인
            </AlertDialogTitle>
            <AlertDialogDescription>
              현재 워크플로우에 저장되지 않은 변경사항이 있습니다.
              {pendingWorkflowId === 'new' ? 
                ' 새 워크플로우를 생성하면 변경사항이 손실됩니다.' :
                ' 다른 워크플로우로 전환하면 변경사항이 손실됩니다.'
              }
              <br /><br />
              계속 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelSwitch}
              data-testid="button-cancel-switch"
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSwitch}
              data-testid="button-confirm-switch"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              변경사항 버리고 진행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Application Confirmation Dialog */}
      <AlertDialog open={showTemplateConfirmDialog} onOpenChange={setShowTemplateConfirmDialog}>
        <AlertDialogContent data-testid="template-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              템플릿 적용 확인
            </AlertDialogTitle>
            <AlertDialogDescription>
              현재 워크플로우에 저장되지 않은 변경사항이 있습니다.
              템플릿을 적용하면 현재 편집 중인 모든 노드와 연결이 템플릿으로 교체됩니다.
              <br /><br />
              계속 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelTemplateApply}
              data-testid="button-cancel-template"
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmTemplateApply}
              data-testid="button-confirm-template"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              변경사항 버리고 템플릿 적용
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Node Confirmation Dialog */}
      <AlertDialog open={showDeleteNodeDialog} onOpenChange={setShowDeleteNodeDialog}>
        <AlertDialogContent data-testid="delete-node-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>노드 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {nodeToDelete && nodeDeleteImpact && (
                <div className="space-y-2">
                  <p className="font-medium">
                    "{nodeToDelete.data.label}" 노드를 삭제하시겠습니까?
                  </p>
                  {nodeDeleteImpact.affectedNodes.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg space-y-1">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        ⚠️ 삭제 시 영향받는 항목:
                      </p>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                        <li>• 연결된 노드: {nodeDeleteImpact.affectedNodes.length}개</li>
                        <li>• 연결된 엣지: {nodeDeleteImpact.affectedEdges.length}개</li>
                      </ul>
                      {nodeDeleteImpact.affectedNodes.length > 0 && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                          이 노드가 삭제되면 연결된 노드들이 입력 데이터를 받을 수 없게 됩니다.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    그래도 삭제하시겠습니까?
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelNodeDelete}
              data-testid="button-cancel-node-delete"
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmNodeDelete}
              data-testid="button-confirm-node-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Node Dialog */}
      <Dialog open={showCreateNodeDialog} onOpenChange={setShowCreateNodeDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>노드 생성</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              생성할 노드 타입을 선택하세요. 선택한 위치에 노드가 추가됩니다.
            </p>
          </DialogHeader>
          <div className="mt-4 max-h-[70vh] overflow-hidden">
            <div className="h-full overflow-y-auto">
              <NodePalette 
                onNodeSelect={(nodeData) => {
                  handleCreateNode(nodeData, createNodePosition || undefined);
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Workflow Dialog */}
      <Dialog open={showEditWorkflowDialog} onOpenChange={setShowEditWorkflowDialog}>
        <DialogContent className="sm:max-w-md" data-testid="edit-workflow-dialog">
          <DialogHeader>
            <DialogTitle>워크플로우 편집</DialogTitle>
          </DialogHeader>
          <Form {...editWorkflowForm}>
            <form onSubmit={editWorkflowForm.handleSubmit(handleEditWorkflowSubmit)} className="space-y-4">
              <FormField
                control={editWorkflowForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="워크플로우 이름을 입력하세요"
                        data-testid="input-workflow-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editWorkflowForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명 (선택사항)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="워크플로우 설명을 입력하세요"
                        className="resize-none"
                        rows={3}
                        data-testid="textarea-workflow-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditWorkflowDialog(false)}
                  disabled={updateWorkflowMutation.isPending}
                  data-testid="button-cancel-edit"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={updateWorkflowMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateWorkflowMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
