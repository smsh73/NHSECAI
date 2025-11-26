import { WorkflowNode, WorkflowEdge } from '@/types/workflow';

/**
 * Execution order information for a single node
 */
export interface NodeExecutionInfo {
  level: number; // Execution level/depth (0 = root level)
  order: number; // Order within the same level
  executionIndex: string; // Hierarchical execution index (e.g., "1", "1.1", "1.2.1")
  dependencies: string[]; // IDs of nodes this node depends on
  dependents: string[]; // IDs of nodes that depend on this node
  parentId: string | null; // Primary parent node ID for hierarchical indexing
}

/**
 * Detailed error information for user feedback
 */
export interface WorkflowError {
  type: 'cycle' | 'isolated' | 'missing_start' | 'invalid_connection' | 'unknown';
  message: string;
  userMessage: string; // User-friendly Korean message
  nodeIds: string[]; // Nodes involved in the error
  suggestions?: string[]; // Suggested fixes
}

/**
 * Result of execution order calculation
 */
export interface ExecutionOrderResult {
  executionOrder: Record<string, NodeExecutionInfo>;
  totalLevels: number;
  hasErrors: boolean;
  errors: string[];
  detailedErrors: WorkflowError[]; // Enhanced error information
  problemNodeIds: string[]; // All nodes that have problems
  isolatedNodes: string[]; // Nodes with no connections
  parallelGroups: string[][]; // Groups of nodes that can run in parallel
}

/**
 * Error types for workflow execution order calculation
 */
export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: 'CYCLE_DETECTED' | 'INVALID_NODE' | 'EMPTY_WORKFLOW' | 'MISSING_START_NODE',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'WorkflowExecutionError';
  }
}

/**
 * Build adjacency list and in-degree count from nodes and edges
 */
function buildGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const adjacencyList = new Map<string, Set<string>>();
  const reverseAdjacencyList = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  
  // Initialize all nodes
  nodes.forEach(node => {
    adjacencyList.set(node.id, new Set());
    reverseAdjacencyList.set(node.id, new Set());
    inDegree.set(node.id, 0);
  });
  
  // Build edges
  edges.forEach(edge => {
    const { source, target } = edge;
    
    // Validate edge nodes exist
    if (!adjacencyList.has(source) || !adjacencyList.has(target)) {
      throw new WorkflowExecutionError(
        `Edge references non-existent node: ${source} -> ${target}`,
        'INVALID_NODE',
        { edge }
      );
    }
    
    // Add edge to adjacency list
    adjacencyList.get(source)!.add(target);
    reverseAdjacencyList.get(target)!.add(source);
    
    // Increment in-degree for target node
    inDegree.set(target, inDegree.get(target)! + 1);
  });
  
  return { adjacencyList, reverseAdjacencyList, inDegree };
}

/**
 * Detect cycles in the workflow graph using DFS and return detailed cycle information
 */
function detectCycles(adjacencyList: Map<string, Set<string>>, nodes: WorkflowNode[]): {
  cycles: string[];
  cycleNodeIds: Set<string>;
} {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[] = [];
  const cycleNodeIds = new Set<string>();
  
  function dfs(nodeId: string, path: string[]): boolean {
    if (recursionStack.has(nodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(nodeId);
      const cycle = [...path.slice(cycleStart), nodeId];
      cycles.push(`Cycle detected: ${cycle.join(' -> ')}`);
      
      // Add all nodes in the cycle to cycleNodeIds
      cycle.forEach(id => cycleNodeIds.add(id));
      return true;
    }
    
    if (visited.has(nodeId)) {
      return false;
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = adjacencyList.get(nodeId) || new Set();
    const neighborsArray = Array.from(neighbors);
    for (const neighbor of neighborsArray) {
      if (dfs(neighbor, [...path])) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  // Check all nodes as potential cycle starting points
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  });
  
  return { cycles, cycleNodeIds };
}

/**
 * Find isolated nodes (nodes with no incoming or outgoing connections)
 */
function findIsolatedNodes(nodes: WorkflowNode[], adjacencyList: Map<string, Set<string>>, reverseAdjacencyList: Map<string, Set<string>>): string[] {
  return nodes
    .filter(node => {
      const hasOutgoing = (adjacencyList.get(node.id)?.size || 0) > 0;
      const hasIncoming = (reverseAdjacencyList.get(node.id)?.size || 0) > 0;
      return !hasOutgoing && !hasIncoming;
    })
    .map(node => node.id);
}

/**
 * Create detailed error information for user feedback
 */
function createWorkflowError(
  type: WorkflowError['type'], 
  nodeIds: string[], 
  nodes: WorkflowNode[],
  additionalInfo?: any
): WorkflowError {
  const getNodeLabel = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.data?.label || nodeId;
  };
  
  const getNodeLabels = (nodeIds: string[]) => nodeIds.map(getNodeLabel).join(', ');
  
  switch (type) {
    case 'cycle':
      return {
        type,
        message: `Circular dependency detected in nodes: ${nodeIds.join(' -> ')}`,
        userMessage: `순환 참조가 감지되었습니다. 노드들이 서로를 참조하여 무한 루프가 발생합니다: ${getNodeLabels(nodeIds)}`,
        nodeIds,
        suggestions: [
          '순환되는 연결 중 하나를 제거해주세요',
          '워크플로우가 시작점에서 끝점으로 흐르도록 재구성해주세요',
          '조건부 분기를 사용하여 순환을 방지해주세요'
        ]
      };
      
    case 'isolated':
      return {
        type,
        message: `Isolated nodes with no connections: ${nodeIds.join(', ')}`,
        userMessage: `연결되지 않은 노드가 있습니다: ${getNodeLabels(nodeIds)}`,
        nodeIds,
        suggestions: [
          '다른 노드들과 연결해주세요',
          '불필요한 노드라면 삭제해주세요',
          '시작 노드나 병합 노드로 변경을 고려해주세요'
        ]
      };
      
    case 'missing_start':
      return {
        type,
        message: 'No start node found in workflow',
        userMessage: '시작 노드가 없습니다. 워크플로우 실행을 위해 시작점을 지정해주세요.',
        nodeIds: [],
        suggestions: [
          '시작 노드를 추가해주세요',
          '기존 노드 중 하나를 시작 노드로 변경해주세요',
          '워크플로우의 진입점을 명확히 정의해주세요'
        ]
      };
      
    case 'invalid_connection':
      return {
        type,
        message: `Invalid connection involving nodes: ${nodeIds.join(', ')}`,
        userMessage: `잘못된 연결이 있습니다: ${getNodeLabels(nodeIds)}`,
        nodeIds,
        suggestions: [
          '연결 규칙을 확인해주세요',
          '호환되지 않는 노드 타입간의 연결을 제거해주세요',
          '연결 방향을 다시 확인해주세요'
        ]
      };
      
    default:
      return {
        type: 'unknown',
        message: `Unknown error involving nodes: ${nodeIds.join(', ')}`,
        userMessage: `알 수 없는 오류가 발생했습니다. 워크플로우 구조를 다시 확인해주세요.`,
        nodeIds,
        suggestions: [
          '워크플로우를 다시 작성해보세요',
          '문제가 지속되면 새로고침 후 다시 시도해주세요'
        ]
      };
  }
}

/**
 * Select primary parent from multiple dependencies
 * Uses level and lexicographical order for deterministic selection
 */
function selectPrimaryParent(
  dependencies: string[], 
  levelCandidate: Map<string, number>
): string | null {
  if (dependencies.length === 0) {
    return null;
  }
  
  if (dependencies.length === 1) {
    return dependencies[0];
  }
  
  // Sort by level (earlier levels first), then by lexicographical order for deterministic selection
  const sortedDeps = dependencies.sort((a, b) => {
    const aLevel = levelCandidate.get(a) || 0;
    const bLevel = levelCandidate.get(b) || 0;
    
    // First compare by level (earlier levels first)
    if (aLevel !== bLevel) {
      return aLevel - bLevel;
    }
    
    // Then by lexicographical order for deterministic selection
    return a.localeCompare(b);
  });
  
  return sortedDeps[0];
}

/**
 * Generate hierarchical execution index (e.g., "1", "1.1", "1.2.1")
 */
function generateExecutionIndex(
  order: number, 
  parentExecutionIndex: string | null
): string {
  if (parentExecutionIndex === null) {
    return (order + 1).toString();
  }
  
  return `${parentExecutionIndex}.${order + 1}`;
}

/**
 * Perform topological sort and calculate execution levels with correct hierarchical indexing
 */
function topologicalSort(
  nodes: WorkflowNode[], 
  adjacencyList: Map<string, Set<string>>, 
  reverseAdjacencyList: Map<string, Set<string>>,
  inDegree: Map<string, number>
): Record<string, NodeExecutionInfo> {
  const result: Record<string, NodeExecutionInfo> = {};
  const queue: string[] = [];
  const levelCandidate = new Map<string, number>();
  const processed = new Set<string>();
  
  // Initialize level candidates for all nodes
  nodes.forEach(node => {
    levelCandidate.set(node.id, 0);
  });
  
  // Find starting nodes (nodes with in-degree 0)
  const startingNodes: string[] = [];
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      startingNodes.push(node.id);
      queue.push(node.id);
    }
  });
  
  // Handle case where no starting nodes exist (isolated nodes or cycles)
  if (queue.length === 0) {
    const isolatedNodes = nodes.filter(node => 
      inDegree.get(node.id) === 0 && 
      (adjacencyList.get(node.id)?.size || 0) === 0
    );
    
    isolatedNodes.forEach(node => {
      startingNodes.push(node.id);
      queue.push(node.id);
    });
  }
  
  // Process nodes in topological order with correct level calculation
  while (queue.length > 0) {
    const currentNode = queue.shift()!;
    const currentLevel = levelCandidate.get(currentNode)!;
    processed.add(currentNode);
    
    // Process all dependent nodes
    const dependents = adjacencyList.get(currentNode) || new Set();
    dependents.forEach(dependent => {
      // Update level candidate for dependent node
      const candidateLevel = currentLevel + 1;
      const currentCandidate = levelCandidate.get(dependent) || 0;
      levelCandidate.set(dependent, Math.max(currentCandidate, candidateLevel));
      
      // Decrease in-degree
      const newInDegree = inDegree.get(dependent)! - 1;
      inDegree.set(dependent, newInDegree);
      
      // If all dependencies are satisfied, add to queue
      if (newInDegree === 0) {
        queue.push(dependent);
      }
    });
  }
  
  // Check if all nodes were processed (detect remaining cycles)
  const unprocessedNodes = nodes.filter(node => !processed.has(node.id));
  if (unprocessedNodes.length > 0) {
    throw new WorkflowExecutionError(
      `Unable to process all nodes. Potential cycles detected in nodes: ${unprocessedNodes.map(n => n.id).join(', ')}`,
      'CYCLE_DETECTED',
      { unprocessedNodes: unprocessedNodes.map(n => n.id) }
    );
  }
  
  // Group nodes by level
  const levelGroups = new Map<number, string[]>();
  nodes.forEach(node => {
    const level = levelCandidate.get(node.id)!;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(node.id);
  });
  
  // Sort nodes within each level deterministically (by ID)
  levelGroups.forEach(nodeIds => {
    nodeIds.sort((a, b) => a.localeCompare(b));
  });
  
  // Build result with correct hierarchical indexing
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  
  // Track child counters per parent for proper sibling ordering
  const parentChildCounters = new Map<string | null, number>();
  
  sortedLevels.forEach(level => {
    const nodeIds = levelGroups.get(level)!;
    
    nodeIds.forEach((nodeId, levelOrder) => {
      const dependencies = Array.from(reverseAdjacencyList.get(nodeId) || new Set()) as string[];
      const dependents = Array.from(adjacencyList.get(nodeId) || new Set()) as string[];
      
      // Select primary parent for hierarchical indexing
      const primaryParent = selectPrimaryParent(dependencies, levelCandidate);
      const parentExecutionIndex = primaryParent ? result[primaryParent]?.executionIndex || null : null;
      
      // Calculate parent-specific child order
      const currentCounter = parentChildCounters.get(parentExecutionIndex) || 0;
      const siblingOrder = currentCounter;
      parentChildCounters.set(parentExecutionIndex, currentCounter + 1);
      
      result[nodeId] = {
        level,
        order: siblingOrder, // This is now parent-specific order, not level-wide order
        executionIndex: generateExecutionIndex(siblingOrder, parentExecutionIndex),
        dependencies,
        dependents,
        parentId: primaryParent
      };
    });
  });
  
  return result;
}

/**
 * Calculate execution order for workflow nodes using topological sort
 * 
 * @param nodes Array of workflow nodes
 * @param edges Array of workflow edges
 * @returns Execution order result with hierarchical information
 */
export function calculateExecutionOrder(
  nodes: WorkflowNode[], 
  edges: WorkflowEdge[]
): ExecutionOrderResult {
  // Input validation
  if (!nodes || nodes.length === 0) {
    return {
      executionOrder: {},
      totalLevels: 0,
      hasErrors: false,
      errors: [],
      detailedErrors: [],
      problemNodeIds: [],
      isolatedNodes: [],
      parallelGroups: []
    };
  }
  
  const errors: string[] = [];
  const detailedErrors: WorkflowError[] = [];
  const problemNodeIds = new Set<string>();
  let executionOrder: Record<string, NodeExecutionInfo> = {};
  
  try {
    // Build graph representation
    const { adjacencyList, reverseAdjacencyList, inDegree } = buildGraph(nodes, edges);
    
    // Detect cycles
    const { cycles, cycleNodeIds } = detectCycles(adjacencyList, nodes);
    if (cycles.length > 0) {
      errors.push(...cycles);
      
      // Add cycle nodes to problem nodes
      cycleNodeIds.forEach(nodeId => problemNodeIds.add(nodeId));
      
      // Create detailed error for cycles
      const cycleNodesArray = Array.from(cycleNodeIds);
      detailedErrors.push(createWorkflowError('cycle', cycleNodesArray, nodes));
      
      throw new WorkflowExecutionError(
        `Workflow contains cycles: ${cycles.join('; ')}`,
        'CYCLE_DETECTED',
        { cycles }
      );
    }
    
    // Find isolated nodes
    const isolatedNodes = findIsolatedNodes(nodes, adjacencyList, reverseAdjacencyList);
    
    // Add isolated nodes to detailed errors if any exist
    if (isolatedNodes.length > 0) {
      isolatedNodes.forEach(nodeId => problemNodeIds.add(nodeId));
      detailedErrors.push(createWorkflowError('isolated', isolatedNodes, nodes));
    }
    
    // Perform topological sort
    executionOrder = topologicalSort(nodes, adjacencyList, reverseAdjacencyList, inDegree);
    
    // Calculate parallel execution groups
    const levelGroups = new Map<number, string[]>();
    Object.entries(executionOrder).forEach(([nodeId, info]) => {
      if (!levelGroups.has(info.level)) {
        levelGroups.set(info.level, []);
      }
      levelGroups.get(info.level)!.push(nodeId);
    });
    
    const parallelGroups = Array.from(levelGroups.values()).filter(group => group.length > 1);
    const totalLevels = Math.max(...Object.values(executionOrder).map(info => info.level)) + 1;
    
    return {
      executionOrder,
      totalLevels: isFinite(totalLevels) ? totalLevels : 0,
      hasErrors: detailedErrors.length > 0,
      errors: detailedErrors.length > 0 ? detailedErrors.map(e => e.message) : [],
      detailedErrors,
      problemNodeIds: Array.from(problemNodeIds),
      isolatedNodes,
      parallelGroups
    };
    
  } catch (error) {
    if (error instanceof WorkflowExecutionError) {
      errors.push(error.message);
      
      // Add detailed error information based on error type
      if (error.code === 'CYCLE_DETECTED') {
        const cycleNodeIds = error.details?.unprocessedNodes || [];
        cycleNodeIds.forEach((nodeId: string) => problemNodeIds.add(nodeId));
        if (detailedErrors.length === 0) { // Only add if not already added
          detailedErrors.push(createWorkflowError('cycle', cycleNodeIds, nodes, error.details));
        }
      }
    } else {
      errors.push(`Unexpected error during execution order calculation: ${error}`);
      detailedErrors.push(createWorkflowError('unknown', [], nodes));
    }
    
    return {
      executionOrder: {},
      totalLevels: 0,
      hasErrors: true,
      errors,
      detailedErrors,
      problemNodeIds: Array.from(problemNodeIds),
      isolatedNodes: [],
      parallelGroups: []
    };
  }
}

/**
 * Validate workflow structure and return validation results
 */
export function validateWorkflowStructure(
  nodes: WorkflowNode[], 
  edges: WorkflowEdge[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for empty workflow
  if (!nodes || nodes.length === 0) {
    warnings.push('Workflow contains no nodes');
    return { isValid: true, errors, warnings };
  }
  
  // Check for start nodes
  const startNodes = nodes.filter(node => node.type === 'start');
  if (startNodes.length === 0) {
    warnings.push('No start node found. Consider adding a start node for clarity.');
  } else if (startNodes.length > 1) {
    warnings.push(`Multiple start nodes found: ${startNodes.map(n => n.id).join(', ')}. Consider using only one start node.`);
  }
  
  // Check for merge/end nodes  
  const mergeNodes = nodes.filter(node => node.type === 'merge');
  const nodesWithoutOutgoing = nodes.filter(node => {
    return !edges.some(edge => edge.source === node.id);
  });
  
  if (mergeNodes.length === 0 && nodesWithoutOutgoing.length === 0) {
    warnings.push('No end nodes found. Consider adding merge nodes or ensuring some nodes have no outgoing connections.');
  }
  
  // Validate edge references
  edges.forEach(edge => {
    const sourceExists = nodes.some(node => node.id === edge.source);
    const targetExists = nodes.some(node => node.id === edge.target);
    
    if (!sourceExists) {
      errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
    }
    if (!targetExists) {
      errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
    }
  });
  
  // Check for self-loops
  const selfLoops = edges.filter(edge => edge.source === edge.target);
  if (selfLoops.length > 0) {
    errors.push(`Self-loop edges detected: ${selfLoops.map(e => e.id).join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get execution statistics for a workflow
 */
export function getExecutionStatistics(result: ExecutionOrderResult): {
  totalNodes: number;
  levelsCount: number;
  maxParallelNodes: number;
  isolatedNodesCount: number;
  averageNodesPerLevel: number;
} {
  const totalNodes = Object.keys(result.executionOrder).length;
  const levelsCount = result.totalLevels;
  const maxParallelNodes = Math.max(...result.parallelGroups.map(group => group.length), 0);
  const isolatedNodesCount = result.isolatedNodes.length;
  const averageNodesPerLevel = levelsCount > 0 ? totalNodes / levelsCount : 0;
  
  return {
    totalNodes,
    levelsCount,
    maxParallelNodes,
    isolatedNodesCount,
    averageNodesPerLevel: Math.round(averageNodesPerLevel * 100) / 100
  };
}