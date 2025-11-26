import { WorkflowNode, WorkflowEdge } from '@/types/workflow';

/**
 * Cycle detection result containing detailed information about cycles
 */
export interface CycleDetectionResult {
  hasCycles: boolean;
  cycleNodes: string[];
  cyclePaths: string[][]; // All detected cycle paths
  cycleEdges: string[]; // Edge IDs that form cycles
  errors: string[]; // Human-readable error messages
}

/**
 * Advanced cycle detection options
 */
export interface CycleDetectionOptions {
  includeDetailedPaths: boolean; // Whether to trace complete cycle paths
  maxCyclesDetected: number; // Maximum number of cycles to detect (performance)
  ignoreSelfLoops: boolean; // Whether to ignore direct self-references
}

/**
 * Default options for cycle detection
 */
const DEFAULT_OPTIONS: CycleDetectionOptions = {
  includeDetailedPaths: true,
  maxCyclesDetected: 10,
  ignoreSelfLoops: false
};

/**
 * Centralized cycle detection function for workflow graphs
 * Uses advanced DFS-based algorithm to detect all cycles in a directed graph
 * 
 * @param nodes - Array of workflow nodes
 * @param edges - Array of workflow edges  
 * @param options - Detection options
 * @returns Detailed cycle detection result
 */
export function detectCycles(
  nodes: WorkflowNode[], 
  edges: WorkflowEdge[], 
  options: Partial<CycleDetectionOptions> = {}
): CycleDetectionResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Initialize result
  const result: CycleDetectionResult = {
    hasCycles: false,
    cycleNodes: [],
    cyclePaths: [],
    cycleEdges: [],
    errors: []
  };

  // Handle empty graph
  if (nodes.length === 0) {
    return result;
  }

  // Build adjacency list from edges
  const adjacencyList = new Map<string, Set<string>>();
  const edgeMap = new Map<string, WorkflowEdge>();
  
  // Initialize adjacency list for all nodes
  nodes.forEach(node => {
    adjacencyList.set(node.id, new Set());
  });
  
  // Process edges and build graph structure
  edges.forEach(edge => {
    const { source, target } = edge;
    
    // Validate edge nodes exist
    if (!adjacencyList.has(source) || !adjacencyList.has(target)) {
      result.errors.push(`Edge references non-existent node: ${source} -> ${target}`);
      return;
    }
    
    // Check for self-loops (direct cycles)
    if (source === target) {
      if (!opts.ignoreSelfLoops) {
        result.hasCycles = true;
        result.cycleNodes.push(source);
        result.cyclePaths.push([source, source]);
        result.cycleEdges.push(edge.id);
        result.errors.push(`Self-loop detected: ${source} -> ${source}`);
      }
      return;
    }
    
    // Add edge to adjacency list
    adjacencyList.get(source)!.add(target);
    edgeMap.set(`${source}->${target}`, edge);
  });

  // DFS-based cycle detection with path tracking
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const pathStack: string[] = [];
  const cyclesFound = new Set<string>(); // Track unique cycles
  
  /**
   * DFS traversal to detect cycles
   */
  function dfsDetectCycles(nodeId: string): void {
    // Stop if we've found enough cycles
    if (result.cyclePaths.length >= opts.maxCyclesDetected) {
      return;
    }
    
    // Mark current node as visited and add to recursion stack
    visited.add(nodeId);
    recursionStack.add(nodeId);
    pathStack.push(nodeId);
    
    const neighbors = adjacencyList.get(nodeId) || new Set();
    
    for (const neighbor of Array.from(neighbors)) {
      if (result.cyclePaths.length >= opts.maxCyclesDetected) {
        break;
      }
      
      if (recursionStack.has(neighbor)) {
        // Cycle found! Extract the cycle path
        const cycleStartIndex = pathStack.indexOf(neighbor);
        const cyclePath = [...pathStack.slice(cycleStartIndex), neighbor];
        const cycleKey = cyclePath.slice(0, -1).sort().join('->'); // Normalize cycle representation
        
        // Only add unique cycles
        if (!cyclesFound.has(cycleKey)) {
          cyclesFound.add(cycleKey);
          result.hasCycles = true;
          result.cyclePaths.push(cyclePath);
          
          // Add cycle nodes
          const cycleNodes = cyclePath.slice(0, -1); // Remove duplicate end node
          cycleNodes.forEach(node => {
            if (!result.cycleNodes.includes(node)) {
              result.cycleNodes.push(node);
            }
          });
          
          // Add cycle edges
          for (let i = 0; i < cyclePath.length - 1; i++) {
            const source = cyclePath[i];
            const target = cyclePath[i + 1];
            const edge = edgeMap.get(`${source}->${target}`);
            if (edge && !result.cycleEdges.includes(edge.id)) {
              result.cycleEdges.push(edge.id);
            }
          }
          
          // Add human-readable error
          result.errors.push(`Cycle detected: ${cyclePath.join(' → ')}`);
        }
        
      } else if (!visited.has(neighbor)) {
        // Continue DFS on unvisited neighbor
        dfsDetectCycles(neighbor);
      }
    }
    
    // Backtrack: remove from recursion stack and path
    recursionStack.delete(nodeId);
    pathStack.pop();
  }
  
  // Run DFS from all unvisited nodes to catch disconnected cycles
  for (const node of nodes) {
    if (!visited.has(node.id) && result.cyclePaths.length < opts.maxCyclesDetected) {
      dfsDetectCycles(node.id);
    }
  }
  
  return result;
}

/**
 * Quick cycle check - optimized for performance when only boolean result is needed
 * 
 * @param nodes - Array of workflow nodes
 * @param edges - Array of workflow edges
 * @returns true if any cycles exist, false otherwise
 */
export function hasCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const result = detectCycles(nodes, edges, { 
    includeDetailedPaths: false, 
    maxCyclesDetected: 1 
  });
  return result.hasCycles;
}

/**
 * Check if adding a specific edge would create a cycle
 * 
 * @param nodes - Array of workflow nodes
 * @param edges - Array of existing workflow edges
 * @param newEdge - New edge to test
 * @returns true if adding the edge would create a cycle
 */
export function wouldCreateCycle(
  nodes: WorkflowNode[], 
  edges: WorkflowEdge[], 
  newEdge: { source: string; target: string }
): boolean {
  // Create a temporary edge for testing
  const tempEdge: WorkflowEdge = {
    id: 'temp-test-edge',
    source: newEdge.source,
    target: newEdge.target
  };
  
  // Test with the new edge added
  const result = detectCycles(nodes, [...edges, tempEdge], { 
    includeDetailedPaths: false, 
    maxCyclesDetected: 1 
  });
  
  return result.hasCycles;
}

/**
 * Validate workflow structure for cycles and other issues
 * 
 * @param nodes - Array of workflow nodes
 * @param edges - Array of workflow edges
 * @returns Validation result with detailed information
 */
export interface WorkflowValidationResult {
  isValid: boolean;
  hasCycles: boolean;
  cycles: CycleDetectionResult;
  invalidEdges: string[]; // Edges referencing non-existent nodes
  isolatedNodes: string[]; // Nodes with no connections
  warnings: string[];
  errors: string[];
}

export function validateWorkflowStructure(
  nodes: WorkflowNode[], 
  edges: WorkflowEdge[],
  options?: { skipForNewWorkflow?: boolean }
): WorkflowValidationResult {
  const skipForNewWorkflow = options?.skipForNewWorkflow || false;
  
  const result: WorkflowValidationResult = {
    isValid: true,
    hasCycles: false,
    cycles: detectCycles(nodes, edges),
    invalidEdges: [],
    isolatedNodes: [],
    warnings: [],
    errors: []
  };
  
  // Check for cycles
  if (result.cycles.hasCycles) {
    result.hasCycles = true;
    result.isValid = false;
    result.errors.push(...result.cycles.errors);
  }
  
  // Check for invalid edges (references to non-existent nodes)
  const nodeIds = new Set(nodes.map(n => n.id));
  edges.forEach(edge => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      result.invalidEdges.push(edge.id);
      result.isValid = false;
      result.errors.push(`Invalid edge ${edge.id}: references non-existent node(s)`);
    }
  });
  
  // Find isolated nodes (nodes with no connections)
  // Skip isolated node warnings for new workflows (they are expected during initial setup)
  if (!skipForNewWorkflow) {
    const connectedNodes = new Set<string>();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    nodes.forEach(node => {
      if (!connectedNodes.has(node.id)) {
        result.isolatedNodes.push(node.id);
        result.warnings.push(`Isolated node detected: ${node.id} (${node.data.label})`);
      }
    });
  }

  // Check for nodes not reachable from start node
  if (!skipForNewWorkflow) {
    const startNodes = nodes.filter(node => 
      node.data?.config?.type === 'start' || node.type === 'start'
    );
    
    if (startNodes.length > 0) {
      // Build adjacency list for BFS
      const adjacencyList = new Map<string, string[]>();
      nodes.forEach(node => {
        adjacencyList.set(node.id, []);
      });
      edges.forEach(edge => {
        const targets = adjacencyList.get(edge.source) || [];
        targets.push(edge.target);
        adjacencyList.set(edge.source, targets);
      });

      // Find all nodes reachable from start nodes using BFS
      const reachableNodes = new Set<string>();
      const queue: string[] = [];
      
      startNodes.forEach(startNode => {
        queue.push(startNode.id);
        reachableNodes.add(startNode.id);
      });

      while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        const neighbors = adjacencyList.get(currentNodeId) || [];
        
        neighbors.forEach(neighborId => {
          if (!reachableNodes.has(neighborId)) {
            reachableNodes.add(neighborId);
            queue.push(neighborId);
          }
        });
      }

      // Find nodes not reachable from start nodes
      nodes.forEach(node => {
        if (node.data?.config?.type !== 'start' && node.type !== 'start') {
          if (!reachableNodes.has(node.id)) {
            result.isolatedNodes.push(node.id);
            result.errors.push(`'시작' 노드에 연결되지 않은 노드가 있습니다: ${node.data?.label || node.id}`);
          }
        }
      });
    }
  }
  
  return result;
}

/**
 * Validate node addition rules
 */
export interface NodeValidationResult {
  isValid: boolean;
  message?: string;
}

export function validateNodeAddition(
  nodeType: string,
  existingNodes: WorkflowNode[],
  existingEdges: WorkflowEdge[]
): NodeValidationResult {
  // Rule 1: First node must be a start node
  if (existingNodes.length === 0 && nodeType !== 'start') {
    return {
      isValid: false,
      message: "첫 번째 노드는 '시작' 노드여야 합니다. 워크플로우는 시작 노드로 시작해야 합니다."
    };
  }

  // Rule 2: Only one start node allowed
  if (nodeType === 'start') {
    const hasStartNode = existingNodes.some(node => node.data?.config?.type === 'start' || node.type === 'start');
    if (hasStartNode) {
      return {
        isValid: false,
        message: "이미 시작 노드가 존재합니다. 워크플로우는 하나의 시작 노드만 가질 수 있습니다."
      };
    }
  }

  // Rule 3: Flow control node specific rules
  if (nodeType === 'condition') {
    // Condition nodes should have at least one incoming edge when not first
    // This will be validated when connecting
  }

  if (nodeType === 'merge') {
    // Merge nodes should have multiple incoming edges
    // This will be validated when connecting
  }

  if (nodeType === 'loop') {
    // Loop nodes should have a condition and array input
    // This will be validated when configuring
  }

  return { isValid: true };
}

/**
 * Error class for cycle detection issues
 */
export class CycleDetectionError extends Error {
  constructor(
    message: string,
    public readonly cycleInfo: CycleDetectionResult,
    public readonly code: 'CYCLE_DETECTED' | 'INVALID_GRAPH' = 'CYCLE_DETECTED'
  ) {
    super(message);
    this.name = 'CycleDetectionError';
  }
}

/**
 * Helper function to create human-readable cycle error messages
 */
export function formatCycleErrors(cycleResult: CycleDetectionResult): string[] {
  const messages: string[] = [];
  
  if (cycleResult.hasCycles) {
    messages.push(`🔄 ${cycleResult.cyclePaths.length} cycle(s) detected in workflow`);
    
    cycleResult.cyclePaths.forEach((path, index) => {
      messages.push(`   Cycle ${index + 1}: ${path.join(' → ')}`);
    });
    
    if (cycleResult.cycleNodes.length > 0) {
      messages.push(`   Affected nodes: ${cycleResult.cycleNodes.join(', ')}`);
    }
    
    messages.push('   ⚠️  Workflows with cycles cannot be executed and may cause infinite loops.');
  }
  
  return messages;
}