import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  NodeDragHandler,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { WorkflowNode } from './workflow-node';
import { DraggableNodeData, WorkflowNode as WorkflowNodeType } from '@/types/workflow';
import { useCallback, useRef, useState, useMemo } from 'react';
import { calculateExecutionOrder, ExecutionOrderResult, WorkflowError } from '@/utils/workflow-execution';
import { wouldCreateCycle, detectCycles, formatCycleErrors, validateNodeAddition, validateWorkflowStructure } from '@/utils/graph';
import * as React from 'react';
import { X } from 'lucide-react';

// Enhanced interface for dropped node data
interface EnhancedDraggableNodeData extends DraggableNodeData {
  id?: string;
  promptId?: string;
  apiCallId?: string;
  workflowId?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  url?: string;
  method?: string;
  definition?: any;
  pythonScriptId?: string;
  pythonScript?: string;
  pythonRequirements?: string;
  sqlQueryId?: string;
  dataSourceId?: string;
  parameters?: any;
}

// Node dimensions for overlap detection (matching workflow-node.tsx styling)
const NODE_WIDTH = 208; // w-52 = 208px
const NODE_HEIGHT = 140; // Approximate height based on content
const OVERLAP_THRESHOLD = 0.1; // 10% area overlap
const PROXIMITY_THRESHOLD = 24; // 24px proximity threshold

// Transient state for visual feedback
interface DragFeedbackState {
  hoverTargetId: string | null;
  overlapSide: 'left' | 'right' | 'top' | 'bottom' | null;
  previewEdge: Edge | null;
  isDragging: boolean;
  draggedNodeId: string | null; // Track the ID of the node being dragged
  isPaletteDrag: boolean; // Whether this is a palette drag or existing node drag
}

// Temporary node for palette drags
interface TempDragNode {
  id: string;
  position: { x: number; y: number };
  data: any;
}

// AABB collision detection utilities
interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getBoundingBox(node: Node): BoundingBox {
  return {
    x: node.position.x,
    y: node.position.y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT
  };
}

function calculateOverlap(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
  
  if (x1 < x2 && y1 < y2) {
    return (x2 - x1) * (y2 - y1);
  }
  return 0;
}

function calculateProximity(box1: BoundingBox, box2: BoundingBox): number {
  const cx1 = box1.x + box1.width / 2;
  const cy1 = box1.y + box1.height / 2;
  const cx2 = box2.x + box2.width / 2;
  const cy2 = box2.y + box2.height / 2;
  
  return Math.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2);
}

function getRelativePosition(draggedBox: BoundingBox, targetBox: BoundingBox): 'left' | 'right' | 'top' | 'bottom' {
  const draggedCenter = {
    x: draggedBox.x + draggedBox.width / 2,
    y: draggedBox.y + draggedBox.height / 2
  };
  const targetCenter = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2
  };
  
  const deltaX = draggedCenter.x - targetCenter.x;
  const deltaY = draggedCenter.y - targetCenter.y;
  
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? 'right' : 'left';
  } else {
    return deltaY > 0 ? 'bottom' : 'top';
  }
}

// Custom deletable edge component with labels
function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent, edgeId: string) => {
    evt.stopPropagation();
    if (data?.onDelete) {
      data.onDelete(edgeId);
    }
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1 shadow-sm">
            {data?.label && (
              <span className={`text-xs font-medium ${
                data.label === 'True' ? 'text-green-600 dark:text-green-400' :
                data.label === 'False' ? 'text-red-600 dark:text-red-400' :
                'text-muted-foreground'
              }`}>
                {data.label}
              </span>
            )}
            {selected && (
              <button
                className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                onClick={(event) => onEdgeClick(event, id)}
                title="연결선 삭제"
                data-testid={`button-delete-edge-${id}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// Throttle utility for performance optimization
function useThrottle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const throttleRef = useRef<number | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    if (throttleRef.current) return;
    
    throttleRef.current = window.setTimeout(() => {
      throttleRef.current = null;
    }, delay);
    
    return callback(...args);
  }, [callback, delay]) as T;
}

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const edgeTypes = {
  custom: CustomEdge
};

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect: (node: Node | null) => void;
  selectedNodeId: string | null;
  showToast?: (toast: { title: string; description: string; variant?: string }) => void;
  simulationMode?: boolean;
  onCanvasRightClick?: (position: { x: number; y: number }) => void;
}

function WorkflowCanvasInner({
  nodes,
  edges, 
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  selectedNodeId,
  showToast,
  simulationMode = false,
  onCanvasRightClick
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [flowNodes, setFlowNodes, onNodesChangeFlow] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChangeFlow] = useEdgesState(edges);
  const reactFlowInstance = useReactFlow();
  
  // Transient state for visual feedback during drag operations
  const [dragFeedback, setDragFeedback] = useState<DragFeedbackState>({
    hoverTargetId: null,
    overlapSide: null,
    previewEdge: null,
    isDragging: false,
    draggedNodeId: null,
    isPaletteDrag: false
  });

  // Temporary node state for palette drags
  const [tempDragNode, setTempDragNode] = useState<TempDragNode | null>(null);

  // Error state management
  const [workflowErrors, setWorkflowErrors] = useState<WorkflowError[]>([]);
  const [problemNodeIds, setProblemNodeIds] = useState<Set<string>>(new Set());
  const [lastErrorCheck, setLastErrorCheck] = useState<number>(0);

  // Error detection and management
  const checkWorkflowErrors = useCallback(() => {
    if (!nodes || nodes.length === 0) {
      setWorkflowErrors([]);
      setProblemNodeIds(new Set());
      return;
    }
    
    try {
      // Convert ReactFlow nodes to WorkflowNodes for error checking
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
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined
      }));
      
      const result = calculateExecutionOrder(workflowNodes, workflowEdges);
      
      // Additional validation: check for nodes not reachable from start nodes
      const validationResult = validateWorkflowStructure(workflowNodes, workflowEdges, { skipForNewWorkflow: false });
      
      // Combine isolated nodes from both validations
      const allProblemNodeIds = new Set(result.problemNodeIds);
      validationResult.isolatedNodes.forEach(nodeId => {
        allProblemNodeIds.add(nodeId);
      });
      
      // Create error for nodes not reachable from start nodes
      const unreachableErrors: WorkflowError[] = [];
      if (validationResult.errors.length > 0) {
        validationResult.isolatedNodes.forEach(nodeId => {
          const node = workflowNodes.find(n => n.id === nodeId);
          if (node && node.data?.config?.type !== 'start' && node.type !== 'start') {
            unreachableErrors.push({
              type: 'isolated',
              nodeIds: [nodeId],
              message: `'시작' 노드에 연결되지 않은 노드가 있습니다: ${node.data?.label || nodeId}`,
              userMessage: `'시작' 노드에 연결되지 않은 노드가 있습니다: ${node.data?.label || nodeId}`,
              suggestions: [
                '시작 노드에서 이 노드로 연결선을 추가하세요',
                '이 노드를 삭제하거나 다른 노드와 연결하세요'
              ]
            });
          }
        });
      }
      
      // Combine all errors
      const allErrors = [...result.detailedErrors, ...unreachableErrors];
      
      // Only show toast if there are new errors (not on every re-check)
      const hasNewErrors = (result.hasErrors || validationResult.errors.length > 0) && (
        workflowErrors.length === 0 || 
        JSON.stringify(allErrors) !== JSON.stringify(workflowErrors)
      );
      
      // Update error state
      setWorkflowErrors(allErrors);
      setProblemNodeIds(allProblemNodeIds);
      
      // Show toast notifications for new errors only
      if (hasNewErrors && showToast && allErrors.length > 0) {
        const primaryError = allErrors[0];
        const errorMessage = primaryError.userMessage || '워크플로우에 문제가 있습니다.';
        const suggestions = primaryError.suggestions?.slice(0, 2).join(', ') || '';
        
        showToast({
          title: "워크플로우 오류 감지",
          description: `${errorMessage}${suggestions ? ` 해결방법: ${suggestions}` : ''}`,
          variant: "destructive",
        });
      }
      
      setLastErrorCheck(Date.now());
      
    } catch (error) {
      console.warn('Error during workflow validation:', error);
      // Don't clear errors on validation failure - keep previous state
    }
  }, [nodes, edges, showToast, workflowErrors]);

  // Sync external nodes/edges changes with internal flow state and add error information
  React.useEffect(() => {
    // Only update if nodes have actually changed (not just position updates)
    const nodesChanged = nodes.length !== flowNodes.length || 
      nodes.some((node, index) => {
        const flowNode = flowNodes.find(fn => fn.id === node.id);
        return !flowNode || node.id !== flowNode.id;
      });
    
    if (nodesChanged) {
      // Enhance nodes with error information
      const enhancedNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          hasError: problemNodeIds.has(node.id),
          errorInfo: workflowErrors.find(error => error.nodeIds.includes(node.id))
        }
      }));
      
      setFlowNodes(enhancedNodes);
    }
  }, [nodes, problemNodeIds, workflowErrors, setFlowNodes, flowNodes]);

  React.useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);
  
  // Check for errors when nodes or edges change
  React.useEffect(() => {
    // Debounce error checking to avoid excessive calculations
    const timeoutId = setTimeout(() => {
      checkWorkflowErrors();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [checkWorkflowErrors]);
  
  // Reset drag feedback when not dragging
  React.useEffect(() => {
    if (!dragFeedback.isDragging) {
      setDragFeedback({
        hoverTargetId: null,
        overlapSide: null,
        previewEdge: null,
        isDragging: false,
        draggedNodeId: null,
        isPaletteDrag: false
      });
      // Clean up temporary drag node
      setTempDragNode(null);
    }
  }, [dragFeedback.isDragging]);

  // Overlap detection during drag operations
  const detectOverlaps = useCallback(
    (draggedPosition: { x: number; y: number }, draggedNodeId?: string) => {
      const draggedBox: BoundingBox = {
        x: draggedPosition.x,
        y: draggedPosition.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT
      };
      
      // Get viewport bounds for performance optimization
      const viewport = reactFlowInstance.getViewport();
      const viewportBounds = {
        x: -viewport.x / viewport.zoom,
        y: -viewport.y / viewport.zoom,
        width: (reactFlowWrapper.current?.clientWidth || 0) / viewport.zoom,
        height: (reactFlowWrapper.current?.clientHeight || 0) / viewport.zoom
      };
      
      let bestTarget: { node: Node; side: 'left' | 'right' | 'top' | 'bottom'; score: number } | null = null;
      
      for (const node of flowNodes) {
        // Skip self if dragging existing node
        if (draggedNodeId && node.id === draggedNodeId) continue;
        
        const nodeBox = getBoundingBox(node);
        
        // Performance optimization: skip nodes outside viewport
        if (
          nodeBox.x + nodeBox.width < viewportBounds.x ||
          nodeBox.x > viewportBounds.x + viewportBounds.width ||
          nodeBox.y + nodeBox.height < viewportBounds.y ||
          nodeBox.y > viewportBounds.y + viewportBounds.height
        ) {
          continue;
        }
        
        const overlap = calculateOverlap(draggedBox, nodeBox);
        const proximity = calculateProximity(draggedBox, nodeBox);
        
        // Check if meets threshold criteria
        const areaRatio = overlap / (NODE_WIDTH * NODE_HEIGHT);
        const meetsThreshold = areaRatio > OVERLAP_THRESHOLD || proximity < PROXIMITY_THRESHOLD;
        
        if (meetsThreshold) {
          const side = getRelativePosition(draggedBox, nodeBox);
          const score = areaRatio + (1 / Math.max(proximity, 1)); // Higher score for more overlap and closer proximity
          
          if (!bestTarget || score > bestTarget.score) {
            bestTarget = { node, side, score };
          }
        }
      }
      
      return bestTarget;
    },
    [flowNodes, reactFlowInstance]
  );
  
  // Connection validation function
  const validateConnection = useCallback((
    connection: Connection,
    nodesArg: Node[] = flowNodes,
    edgesArg: Edge[] = flowEdges
  ): { isValid: boolean; message?: string } => {
    if (!connection.source || !connection.target) {
      return { isValid: false, message: "연결할 노드를 선택해주세요." };
    }

    // Get source and target nodes from provided nodes array
    const sourceNode = nodesArg.find(node => node.id === connection.source);
    const targetNode = nodesArg.find(node => node.id === connection.target);
    
    if (!sourceNode || !targetNode) {
      return { isValid: false, message: "연결할 노드를 찾을 수 없습니다." };
    }

    // Rule 1: Start nodes cannot have incoming connections
    // Only validate nodes that are explicitly marked as 'start', not defaulted ones
    if (targetNode.data.config?.type === 'start') {
      return { 
        isValid: false, 
        message: "시작 노드는 다른 노드로부터 입력을 받을 수 없습니다. 시작 노드는 워크플로우의 시작점이어야 합니다." 
      };
    }

    // Rule 1.1: Warn about nodes with unknown/undefined types
    if (!targetNode.data.config?.type || targetNode.data.config.type === 'unknown') {
      // Allow connection but show a warning
      console.warn('Connection target has unknown type:', targetNode.id, targetNode.data.label);
    }
    if (!sourceNode.data.config?.type || sourceNode.data.config.type === 'unknown') {
      console.warn('Connection source has unknown type:', sourceNode.id, sourceNode.data.label);
    }

    // Rule 2: End/Merge nodes cannot have outgoing connections to non-end nodes  
    if (sourceNode.data.config?.type === 'merge' && targetNode.data.config?.type !== 'merge') {
      return { 
        isValid: false, 
        message: "병합 노드는 다른 병합 노드로만 연결할 수 있습니다. 병합 노드는 워크플로우의 종료점 역할을 합니다." 
      };
    }

    // Rule 2.1: End nodes cannot have outgoing connections
    if (sourceNode.data.config?.type === 'end') {
      return { 
        isValid: false, 
        message: "종료 노드는 다른 노드로 연결할 수 없습니다. 종료 노드는 워크플로우의 최종 종료점입니다." 
      };
    }

    // Rule 6: Flow control node specific constraints
    if (sourceNode.data.config?.type === 'condition') {
      // Condition nodes should have at least True/False labels on edges
      // This is handled by edge labels in the UI
    }

    if (targetNode.data.config?.type === 'merge') {
      // Merge nodes should accept multiple inputs
      // Allow multiple incoming edges to merge nodes
    }

    if (targetNode.data.config?.type === 'loop') {
      // Loop nodes require array input
      // Validation happens during execution
    }

    // Rule 3: Prevent self-connections
    if (connection.source === connection.target) {
      return { 
        isValid: false, 
        message: "노드는 자기 자신과 연결할 수 없습니다." 
      };
    }

    // Rule 4: Prevent duplicate connections
    const existingConnection = edgesArg.find(edge => 
      edge.source === connection.source && edge.target === connection.target
    );
    if (existingConnection) {
      return { 
        isValid: false, 
        message: "이미 연결된 노드입니다. 중복 연결은 허용되지 않습니다." 
      };
    }

    // Rule 5: Check for cycles using centralized cycle detection
    const workflowNodes: WorkflowNodeType[] = nodesArg.map(node => ({
      id: node.id,
      type: node.data.config?.type || 'unknown',
      position: node.position,
      data: node.data
    }));
    
    const workflowEdges = edgesArg.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined
    }));

    if (wouldCreateCycle(workflowNodes, workflowEdges, { source: connection.source, target: connection.target })) {
      return { 
        isValid: false, 
        message: "이 연결은 순환 참조를 생성합니다. 워크플로우는 순환하지 않는 방향성 그래프여야 합니다." 
      };
    }

    return { isValid: true };
  }, [flowNodes, flowEdges]);

  // Auto-connection creation helper
  const createAutoConnection = useCallback(
    (
      draggedNodeId: string,
      targetNodeId: string,
      side: 'left' | 'right' | 'top' | 'bottom',
      nodesArg: Node[] = flowNodes,
      edgesArg: Edge[] = flowEdges
    ) => {
      // Map relative position to connection direction
      // Right/Bottom: existing → new, Left/Top: new → existing
      const connection: Connection = side === 'right' || side === 'bottom' 
        ? { source: targetNodeId, target: draggedNodeId, sourceHandle: null, targetHandle: null }
        : { source: draggedNodeId, target: targetNodeId, sourceHandle: null, targetHandle: null };
      
      const validation = validateConnection(connection, nodesArg, edgesArg);
      
      if (!validation.isValid) {
        if (showToast) {
          showToast({
            title: "자동 연결 실패",
            description: validation.message || "연결을 생성할 수 없습니다.",
            variant: "destructive"
          });
        }
        return false;
      }

      const newEdge = addEdge(connection, edgesArg);
      setFlowEdges(newEdge);
      onEdgesChange(newEdge);
      
      if (showToast) {
        showToast({
          title: "자동 연결 성공",
          description: "노드가 자동으로 연결되었습니다.",
        });
      }
      
      return true;
    },
    [flowNodes, flowEdges, setFlowEdges, onEdgesChange, validateConnection, showToast]
  );
  
  // Throttled overlap detection for performance with cycle preview validation
  const throttledOverlapDetection = useThrottle(
    (draggedPosition: { x: number; y: number }, draggedNodeId?: string, isPaletteDrag = false, dragData?: any) => {
      const overlap = detectOverlaps(draggedPosition, draggedNodeId);
      
      // Determine the actual dragged node ID
      const actualDraggedNodeId = draggedNodeId || 'temp-dragged';
      
      // For palette drags, create or update temporary node
      if (isPaletteDrag) {
        const tempNode: TempDragNode = {
          id: 'temp-dragged',
          position: draggedPosition,
          data: {
            label: dragData?.label || 'Dragging...',
            description: dragData?.description || '',
            config: { type: dragData?.type || 'unknown' },
            isTemporary: true
          }
        };
        setTempDragNode(tempNode);
      }
      
      if (overlap) {
        const previewSource = overlap.side === 'right' || overlap.side === 'bottom' ? overlap.node.id : actualDraggedNodeId;
        const previewTarget = overlap.side === 'right' || overlap.side === 'bottom' ? actualDraggedNodeId : overlap.node.id;
        
        // Check if this connection would create a cycle using centralized function
        let wouldCauseCycle = false;
        let cyclePreviewStyle = { strokeDasharray: '5,5', opacity: 0.6, stroke: '#10b981' }; // Default green
        
        try {
          const workflowNodes: WorkflowNodeType[] = flowNodes.map(node => ({
            id: node.id,
            type: node.data.config?.type || 'unknown',
            position: node.position,
            data: node.data
          }));
          
          // Add temporary node for palette drags
          if (isPaletteDrag && dragData) {
            workflowNodes.push({
              id: actualDraggedNodeId,
              type: dragData.type || 'unknown',
              position: draggedPosition,
              data: {
                label: dragData.label || 'Temp Node',
                description: dragData.description || '',
                config: { type: dragData.type || 'unknown' }
              }
            });
          }
          
          const workflowEdges = flowEdges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
          }));
          
          wouldCauseCycle = wouldCreateCycle(workflowNodes, workflowEdges, {
            source: previewSource,
            target: previewTarget
          });
          
          if (wouldCauseCycle) {
            cyclePreviewStyle = {
              strokeDasharray: '8,4',
              opacity: 0.8,
              stroke: '#ef4444' // Red for cycle warning
            };
          }
        } catch (error) {
          console.warn('Error during drag cycle detection:', error);
        }
        
        const previewEdge: Edge = {
          id: 'preview-edge',
          source: previewSource,
          target: previewTarget,
          animated: true,
          style: cyclePreviewStyle,
          data: {
            wouldCauseCycle,
            previewType: 'connection-preview'
          }
        };
        
        setDragFeedback({
          hoverTargetId: overlap.node.id,
          overlapSide: overlap.side,
          previewEdge,
          isDragging: true,
          draggedNodeId: actualDraggedNodeId,
          isPaletteDrag
        });
        
        // Show cycle warning tooltip/feedback if would cause cycle
        if (wouldCauseCycle && showToast) {
          // Throttle toast messages to avoid spam
          if (!dragFeedback.previewEdge?.data?.wouldCauseCycle) {
            console.warn('Connection would create cycle:', { source: previewSource, target: previewTarget });
          }
        }
        
      } else {
        setDragFeedback(prev => ({
          ...prev,
          hoverTargetId: null,
          overlapSide: null,
          previewEdge: null,
          isDragging: true,
          draggedNodeId: actualDraggedNodeId,
          isPaletteDrag
        }));
      }
    },
    16 // ~60fps
  );


  // Edge deletion handler
  const handleDeleteEdge = useCallback((edgeId: string) => {
    const newEdges = flowEdges.filter(edge => edge.id !== edgeId);
    setFlowEdges(newEdges);
    onEdgesChange(newEdges);
    
    if (showToast) {
      showToast({
        title: "연결선 삭제",
        description: "연결선이 삭제되었습니다.",
      });
    }
  }, [flowEdges, setFlowEdges, onEdgesChange, showToast]);

  const onConnect = useCallback(
    (params: Connection) => {
      const validation = validateConnection(params);
      
      if (!validation.isValid) {
        // Show error toast with validation message
        if (showToast) {
          showToast({
            title: "연결 불가",
            description: validation.message || "연결을 생성할 수 없습니다.",
            variant: "destructive"
          });
        }
        return;
      }

      const newEdge = addEdge(params, flowEdges);
      setFlowEdges(newEdge);
      onEdgesChange(newEdge);
      
      // Show success feedback
      if (showToast) {
        showToast({
          title: "노드 연결 성공",
          description: "노드가 성공적으로 연결되었습니다.",
        });
      }
    },
    [flowEdges, setFlowEdges, onEdgesChange, validateConnection]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    
    // Perform overlap detection during drag over for visual feedback
    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (reactFlowBounds) {
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      
      const position = {
        x: flowPosition.x - NODE_WIDTH / 2,
        y: flowPosition.y - NODE_HEIGHT / 2,
      };
      
      // Try to get drag data for better temporary node display
      let dragData;
      try {
        const dataText = event.dataTransfer.getData('application/json');
        if (dataText) {
          dragData = JSON.parse(dataText);
        }
      } catch (error) {
        // Ignore parsing errors during drag over
      }
      
      throttledOverlapDetection(position, undefined, true, dragData);
    }
  }, [reactFlowInstance, throttledOverlapDetection]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) {
        return;
      }

      try {
        const dataText = event.dataTransfer.getData('application/json');
        
        if (!dataText) {
          return;
        }
        
        const nodeData: EnhancedDraggableNodeData = JSON.parse(dataText);
        
        const flowPosition = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        });
        
        const position = {
          x: flowPosition.x - NODE_WIDTH / 2,
          y: flowPosition.y - NODE_HEIGHT / 2,
        };
        
        // Check for overlap before creating node
        const overlap = detectOverlaps(position);

        // Validate node addition rules
        const workflowNodes: WorkflowNodeType[] = flowNodes.map(node => ({
          id: node.id,
          type: node.data.config?.type || 'unknown',
          position: node.position,
          data: node.data
        }));
        
        const workflowEdges = flowEdges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle ?? undefined,
          targetHandle: edge.targetHandle ?? undefined
        }));

        const nodeValidation = validateNodeAddition(nodeData.type, workflowNodes, workflowEdges);
        if (!nodeValidation.isValid) {
          if (showToast) {
            showToast({
              title: "노드 추가 불가",
              description: nodeValidation.message || "노드를 추가할 수 없습니다.",
              variant: "destructive"
            });
          }
          return;
        }

        // Handle workflow node specially - load entire workflow definition
        if (nodeData.type === 'workflow' && nodeData.definition) {
          try {
            // Parse definition if it's a string
            const definition = typeof nodeData.definition === 'string' 
              ? JSON.parse(nodeData.definition) 
              : nodeData.definition;

            if (definition && definition.nodes && Array.isArray(definition.nodes)) {
              // Calculate offset to center the workflow around drop position
              // Find the bounding box of all nodes
              const nodePositions = definition.nodes.map((n: any) => n.position || { x: 0, y: 0 });
              const minX = Math.min(...nodePositions.map((p: any) => p.x));
              const minY = Math.min(...nodePositions.map((p: any) => p.y));
              const centerX = minX + (Math.max(...nodePositions.map((p: any) => p.x)) - minX) / 2;
              const centerY = minY + (Math.max(...nodePositions.map((p: any) => p.y)) - minY) / 2;

              // Calculate offset to move workflow center to drop position
              const offsetX = position.x - centerX;
              const offsetY = position.y - centerY;

              // Generate unique prefix for this workflow instance to avoid ID conflicts
              const idPrefix = `subworkflow-${Date.now()}-`;

              // Convert workflow definition nodes to ReactFlow Node[] format with offset
              const loadedNodes: Node[] = definition.nodes.map((wfNode: any) => {
                const originalId = wfNode.id;
                const newId = `${idPrefix}${originalId}`;
                
                return {
                  id: newId,
                  type: 'workflowNode',
                  position: {
                    x: (wfNode.position?.x || 0) + offsetX,
                    y: (wfNode.position?.y || 0) + offsetY,
                  },
                  data: {
                    description: wfNode.data?.description || '',
                    config: { 
                      type: wfNode.type, 
                      ...(wfNode.data?.config || {}),
                      // Preserve workflow reference
                      workflowId: nodeData.workflowId || nodeData.id,
                      originalWorkflowNodeId: originalId,
                    },
                    ...(wfNode.data || {}),
                    label: wfNode.data?.label || wfNode.type,
                    onConfig: () => {
                      const foundNode = loadedNodes.find(n => n.id === newId);
                      if (foundNode) onNodeSelect(foundNode);
                    },
                    onDelete: () => {
                      const updatedNodes = flowNodes.filter(n => n.id !== newId);
                      const updatedEdges = flowEdges.filter(e => 
                        e.source !== newId && e.target !== newId
                      );
                      setFlowNodes(updatedNodes);
                      setFlowEdges(updatedEdges);
                      onNodesChange(updatedNodes);
                      onEdgesChange(updatedEdges);
                    }
                  },
                };
              });
              
              // Convert workflow definition edges to ReactFlow Edge[] format with updated IDs
              const loadedEdges: Edge[] = (definition.edges || []).map((wfEdge: any) => {
                const newSourceId = `${idPrefix}${wfEdge.source}`;
                const newTargetId = `${idPrefix}${wfEdge.target}`;
                
                return {
                  id: `${idPrefix}${wfEdge.id || `${wfEdge.source}-${wfEdge.target}`}`,
                  source: newSourceId,
                  target: newTargetId,
                  sourceHandle: wfEdge.sourceHandle,
                  targetHandle: wfEdge.targetHandle
                };
              });

              // Add all nodes and edges to the canvas
              const newNodes = [...flowNodes, ...loadedNodes];
              const newEdges = [...flowEdges, ...loadedEdges];
              
              setFlowNodes(newNodes);
              setFlowEdges(newEdges);
              onNodesChange(newNodes);
              onEdgesChange(newEdges);

              if (showToast) {
                showToast({
                  title: "워크플로우 추가됨",
                  description: `'${nodeData.label}' 워크플로우의 ${loadedNodes.length}개 노드가 추가되었습니다.`,
                });
              }
              return;
            }
          } catch (error) {
            console.error('Failed to parse workflow definition:', error);
            if (showToast) {
              showToast({
                title: "워크플로우 로드 실패",
                description: "워크플로우 정의를 파싱하는 중 오류가 발생했습니다.",
                variant: "destructive"
              });
            }
            return;
          }
        }

        // Create enhanced node configuration based on type (for non-workflow nodes)
        const createNodeConfig = (data: EnhancedDraggableNodeData) => {
          const baseConfig = {
            type: data.type,
            timeout: 300,
            retryCount: 3,
            condition: 'previous_completed',
          };

          switch (data.type) {
            case 'prompt':
              return {
                ...baseConfig,
                promptId: data.promptId || data.id,
                // Store systemPrompt from registered prompt if available
                systemPrompt: data.systemPrompt || '',
                // Also store at top level for easy access
                userPromptTemplate: data.userPromptTemplate || '',
              };
            case 'api':
              return {
                ...baseConfig,
                apiCallId: data.apiCallId || data.id,
                url: data.url || '',
                method: data.method || 'POST',
              };
            case 'rag':
              return {
                ...baseConfig,
                searchType: 'hybrid',
                topK: 10,
                threshold: 0.7,
              };
            case 'python_script':
              return {
                ...baseConfig,
                pythonScriptId: data.pythonScriptId || data.id, // 등록된 Python 스크립트 ID 참조
                pythonScript: data.pythonScript || '',
                pythonRequirements: data.pythonRequirements || '',
                pythonTimeout: 30,
                pythonEnvironment: 'python3',
                pythonInputFormat: 'json',
                pythonOutputFormat: 'json',
                pythonWorkingDirectory: undefined,
                pythonMemoryLimit: 512,
                pythonCpuLimit: 50,
              };
            case 'sql_query':
              return {
                ...baseConfig,
                sqlQueryId: data.sqlQueryId || data.id, // 등록된 SQL 쿼리 ID 참조
                dataSourceId: data.dataSourceId || '',
                parameters: data.parameters || {},
              };
            default:
              return baseConfig;
          }
        };

        const nodeConfig = createNodeConfig(nodeData);
        const newNode: Node = {
          id: `${nodeData.type}-${Date.now()}`,
          type: 'workflowNode',
          position,
          data: {
            label: nodeData.label,
            description: nodeData.description,
            config: nodeConfig,
            // Include database identifiers for reference
            promptId: nodeData.promptId || nodeData.id,
            apiCallId: nodeData.apiCallId || nodeData.id,
            workflowId: nodeData.workflowId || nodeData.id,
            pythonScriptId: nodeData.pythonScriptId || nodeData.id,
            sqlQueryId: nodeData.sqlQueryId || nodeData.id,
            dataSourceId: nodeData.dataSourceId || nodeConfig.dataSourceId || '',
            // Store registered resource data at top level for easy access in properties panel
            systemPrompt: nodeData.systemPrompt || nodeConfig.systemPrompt || '',
            userPromptTemplate: nodeData.userPromptTemplate || nodeConfig.userPromptTemplate || '',
            url: nodeData.url || nodeConfig.url || '',
            method: nodeData.method || nodeConfig.method || 'POST',
            pythonScript: nodeData.pythonScript || nodeConfig.pythonScript || '',
            pythonRequirements: nodeData.pythonRequirements || nodeConfig.pythonRequirements || '',
            onConfig: () => {
              onNodeSelect(newNode);
            },
            onDelete: () => {
              const updatedNodes = flowNodes.filter(n => n.id !== newNode.id);
              const updatedEdges = flowEdges.filter(e => 
                e.source !== newNode.id && e.target !== newNode.id
              );
              setFlowNodes(updatedNodes);
              setFlowEdges(updatedEdges);
              onNodesChange(updatedNodes);
              onEdgesChange(updatedEdges);
            }
          },
        };

        const newNodes = [...flowNodes, newNode];
        setFlowNodes(newNodes);
        onNodesChange(newNodes);
        
        // Create auto-connection if there was an overlap and it wouldn't create a cycle
        if (overlap) {
          // Check if the connection would create a cycle before creating it
          const wouldCauseCycle = wouldCreateCycle(
            newNodes.map(n => ({
              id: n.id,
              type: n.data.config?.type || 'unknown',
              position: n.position,
              data: n.data
            })),
            flowEdges.map(e => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle
            })),
            {
              source: overlap.side === 'right' || overlap.side === 'bottom' ? overlap.node.id : newNode.id,
              target: overlap.side === 'right' || overlap.side === 'bottom' ? newNode.id : overlap.node.id
            }
          );
          
          if (!wouldCauseCycle) {
            // Call createAutoConnection synchronously with the new nodes
            createAutoConnection(newNode.id, overlap.node.id, overlap.side, newNodes, flowEdges);
          } else if (showToast) {
            showToast({
              title: "자동 연결 차단",
              description: "이 연결은 순환 참조를 생성하므로 자동으로 연결되지 않았습니다.",
              variant: "destructive"
            });
          }
        }
        
        // Reset drag feedback
        setDragFeedback({
          hoverTargetId: null,
          overlapSide: null,
          previewEdge: null,
          isDragging: false,
          draggedNodeId: null,
          isPaletteDrag: false
        });
        // Clean up temporary drag node
        setTempDragNode(null);
      } catch (error) {
        console.error('Failed to parse dropped node data:', error);
        setDragFeedback({
          hoverTargetId: null,
          overlapSide: null,
          previewEdge: null,
          isDragging: false,
          draggedNodeId: null,
          isPaletteDrag: false
        });
        // Clean up temporary drag node
        setTempDragNode(null);
      }
    },
    [flowNodes, flowEdges, onNodesChange, onEdgesChange, onNodeSelect, setFlowNodes, setFlowEdges, reactFlowInstance, detectOverlaps, createAutoConnection]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeSelect(node);
  }, [onNodeSelect]);

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (onCanvasRightClick && reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const viewport = reactFlowInstance.getViewport();
      const x = (event.clientX - rect.left) / viewport.zoom - viewport.x / viewport.zoom;
      const y = (event.clientY - rect.top) / viewport.zoom - viewport.y / viewport.zoom;
      onCanvasRightClick({ x, y });
    }
  }, [onCanvasRightClick, reactFlowInstance]);

  // Node drag handlers for existing nodes
  const onNodeDrag: NodeDragHandler = useCallback(
    (event, node, nodes) => {
      throttledOverlapDetection(node.position, node.id);
    },
    [throttledOverlapDetection]
  );
  
  const onNodeDragStop: NodeDragHandler = useCallback(
    (event, node, nodes) => {
      // Check for overlap when drag stops
      const overlap = detectOverlaps(node.position, node.id);
      
      if (overlap) {
        createAutoConnection(node.id, overlap.node.id, overlap.side);
      }
      
      // Reset drag feedback
      setDragFeedback({
        hoverTargetId: null,
        overlapSide: null,
        previewEdge: null,
        isDragging: false,
        draggedNodeId: null,
        isPaletteDrag: false
      });
      // Clean up temporary drag node
      setTempDragNode(null);
      
      // Important: Update flowNodes state with the new positions
      const updatedNodes = flowNodes.map(n => {
        const draggedNode = nodes.find(dragNode => dragNode.id === n.id);
        if (draggedNode) {
          return {
            ...n,
            position: draggedNode.position
          };
        }
        return n;
      });
      
      setFlowNodes(updatedNodes);
      onNodesChange(updatedNodes);
    },
    [detectOverlaps, createAutoConnection, onNodesChange, flowNodes, setFlowNodes]
  );
  
  const onNodeDragStart: NodeDragHandler = useCallback(
    (event, node, nodes) => {
      setDragFeedback(prev => ({
        ...prev,
        isDragging: true,
        draggedNodeId: node.id,
        isPaletteDrag: false
      }));
    },
    []
  );

  // Calculate execution order for all nodes
  const executionOrderResult = useMemo((): ExecutionOrderResult => {
    // Convert ReactFlow Node[] to WorkflowNode[] for calculation
    const workflowNodes: WorkflowNodeType[] = flowNodes.map(node => ({
      id: node.id,
      type: node.data.config?.type || 'unknown',
      position: node.position,
      data: node.data
    }));

    // Convert ReactFlow Edge[] to WorkflowEdge[] for calculation  
    const workflowEdges = flowEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle
    }));

    try {
      return calculateExecutionOrder(workflowNodes, workflowEdges);
    } catch (error) {
      console.warn('Failed to calculate execution order:', error);
      return {
        executionOrder: {},
        totalLevels: 0,
        hasErrors: true,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        detailedErrors: [],
        problemNodeIds: [],
        isolatedNodes: [],
        parallelGroups: []
      };
    }
  }, [flowNodes, flowEdges]);

  // Enhanced nodes with visual feedback
  const enhancedNodes = useMemo(() => {
    const nodes = flowNodes.map(node => {
      const isHoverTarget = node.id === dragFeedback.hoverTargetId;
      const executionInfo = executionOrderResult.executionOrder[node.id];
      
      return {
        ...node,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          isHoverTarget,
          overlapSide: isHoverTarget ? dragFeedback.overlapSide : null,
          executionIndex: executionInfo?.executionIndex || undefined
        }
      };
    });
    
    // Add temporary drag node if it exists
    if (tempDragNode && dragFeedback.isDragging && dragFeedback.isPaletteDrag) {
      const tempReactFlowNode = {
        id: tempDragNode.id,
        type: 'workflowNode',
        position: tempDragNode.position,
        data: {
          ...tempDragNode.data,
          isTemporary: true,
          isHoverTarget: false,
          overlapSide: null
        },
        selected: false
      };
      nodes.push(tempReactFlowNode);
    }
    
    return nodes;
  }, [flowNodes, selectedNodeId, dragFeedback.hoverTargetId, dragFeedback.overlapSide, tempDragNode, dragFeedback.isDragging, dragFeedback.isPaletteDrag, executionOrderResult]);
  
  // Enhanced edges with preview edge and labels for branch nodes
  const enhancedEdges = useMemo(() => {
    const edges = flowEdges.map(edge => {
      const sourceNode = flowNodes.find(n => n.id === edge.source);
      const sourceType = sourceNode?.data?.config?.type;
      
      // Add labels and delete handler for all edges
      const enhancedEdge: Edge = {
        ...edge,
        type: 'custom',
        data: {
          ...edge.data,
          onDelete: handleDeleteEdge,
        }
      };
      
      // For branch/condition nodes, auto-label edges as True/False
      if (sourceType === 'branch' || sourceType === 'condition') {
        const outgoingEdges = flowEdges.filter(e => e.source === edge.source);
        const edgeIndex = outgoingEdges.findIndex(e => e.id === edge.id);
        
        // First outgoing edge is True, second is False
        if (edgeIndex === 0) {
          enhancedEdge.data = { ...enhancedEdge.data, label: 'True' };
        } else if (edgeIndex === 1) {
          enhancedEdge.data = { ...enhancedEdge.data, label: 'False' };
        }
      }
      
      return enhancedEdge;
    });
    
    // Add preview edge if dragging with overlap
    if (dragFeedback.previewEdge && dragFeedback.isDragging) {
      edges.push(dragFeedback.previewEdge);
    }
    
    return edges;
  }, [flowEdges, flowNodes, dragFeedback.previewEdge, dragFeedback.isDragging, handleDeleteEdge]);

  return (
    <div 
      className="flex-1 bg-background" 
      ref={reactFlowWrapper} 
      data-testid="workflow-canvas"
    >
      <ReactFlow
        nodes={enhancedNodes}
        edges={enhancedEdges}
        onNodesChange={onNodesChangeFlow}
        onEdgesChange={onEdgesChangeFlow}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeDrag={onNodeDrag}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        panOnDrag={[1, 2]} // Allow panning with left and middle mouse buttons
        selectNodesOnDrag={false}
        preventScrolling={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background 
          gap={20} 
          size={1} 
          className="opacity-40"
          color="#64748b"
          variant="dots"
        />
        <Controls 
          className="bg-card border border-border"
          data-testid="workflow-controls"
        />
        <MiniMap
          className="bg-card border border-border"
          nodeColor="#374151"
          maskColor="rgb(30 41 59 / 0.8)"
          pannable={true}
          zoomable={true}
          data-testid="workflow-minimap"
        />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
