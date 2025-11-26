import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { 
  calculateExecutionOrder, 
  validateWorkflowStructure, 
  getExecutionStatistics,
  WorkflowExecutionError 
} from './workflow-execution';

/**
 * Test data factory for creating nodes and edges
 */
class WorkflowTestData {
  static createNode(id: string, type: WorkflowNode['type'] = 'prompt', position = { x: 0, y: 0 }): WorkflowNode {
    return {
      id,
      type,
      position,
      data: {
        label: `Node ${id}`,
        description: `Test node ${id}`,
        config: { type }
      }
    };
  }

  static createEdge(id: string, source: string, target: string): WorkflowEdge {
    return {
      id,
      source,
      target
    };
  }
}

/**
 * Test suite for workflow execution order calculation
 */
export function runWorkflowExecutionTests(): void {
  console.log('🧪 Running Workflow Execution Tests');
  
  // Test 1: Empty workflow
  console.log('\n1. Testing empty workflow...');
  const emptyResult = calculateExecutionOrder([], []);
  console.assert(emptyResult.totalLevels === 0, 'Empty workflow should have 0 levels');
  console.assert(Object.keys(emptyResult.executionOrder).length === 0, 'Empty workflow should have no execution order');
  console.assert(!emptyResult.hasErrors, 'Empty workflow should not have errors');
  console.log('✅ Empty workflow test passed');

  // Test 2: Single node workflow
  console.log('\n2. Testing single node workflow...');
  const singleNodes = [WorkflowTestData.createNode('node1', 'start')];
  const singleResult = calculateExecutionOrder(singleNodes, []);
  console.assert(singleResult.totalLevels === 1, 'Single node should create 1 level');
  console.assert(singleResult.executionOrder['node1'].level === 0, 'Single node should be at level 0');
  console.assert(singleResult.executionOrder['node1'].executionIndex === '1', 'Single node should have index "1"');
  console.assert(singleResult.executionOrder['node1'].parentId === null, 'Single node should have no parent');
  console.log('✅ Single node workflow test passed');

  // Test 3: Linear workflow (A -> B -> C)
  console.log('\n3. Testing linear workflow...');
  const linearNodes = [
    WorkflowTestData.createNode('A', 'start'),
    WorkflowTestData.createNode('B', 'prompt'),
    WorkflowTestData.createNode('C', 'merge')
  ];
  const linearEdges = [
    WorkflowTestData.createEdge('e1', 'A', 'B'),
    WorkflowTestData.createEdge('e2', 'B', 'C')
  ];
  const linearResult = calculateExecutionOrder(linearNodes, linearEdges);
  
  console.assert(linearResult.totalLevels === 3, 'Linear workflow should have 3 levels');
  console.assert(linearResult.executionOrder['A'].level === 0, 'A should be at level 0');
  console.assert(linearResult.executionOrder['B'].level === 1, 'B should be at level 1');
  console.assert(linearResult.executionOrder['C'].level === 2, 'C should be at level 2');
  console.assert(linearResult.executionOrder['A'].executionIndex === '1', 'A should have index "1"');
  console.assert(linearResult.executionOrder['B'].executionIndex === '1.1', 'B should have hierarchical index "1.1"');
  console.assert(linearResult.executionOrder['C'].executionIndex === '1.1.1', 'C should have hierarchical index "1.1.1"');
  console.assert(linearResult.executionOrder['A'].parentId === null, 'A should have no parent');
  console.assert(linearResult.executionOrder['B'].parentId === 'A', 'B should have A as parent');
  console.assert(linearResult.executionOrder['C'].parentId === 'B', 'C should have B as parent');
  console.log('✅ Linear workflow test passed');

  // Test 4: Parallel workflow (A -> B, A -> C, B -> D, C -> D)
  console.log('\n4. Testing parallel workflow...');
  const parallelNodes = [
    WorkflowTestData.createNode('A', 'start'),
    WorkflowTestData.createNode('B', 'prompt'),
    WorkflowTestData.createNode('C', 'api'),
    WorkflowTestData.createNode('D', 'merge')
  ];
  const parallelEdges = [
    WorkflowTestData.createEdge('e1', 'A', 'B'),
    WorkflowTestData.createEdge('e2', 'A', 'C'),
    WorkflowTestData.createEdge('e3', 'B', 'D'),
    WorkflowTestData.createEdge('e4', 'C', 'D')
  ];
  const parallelResult = calculateExecutionOrder(parallelNodes, parallelEdges);
  
  console.assert(parallelResult.totalLevels === 3, 'Parallel workflow should have 3 levels');
  console.assert(parallelResult.executionOrder['A'].level === 0, 'A should be at level 0');
  console.assert(parallelResult.executionOrder['B'].level === 1, 'B should be at level 1');
  console.assert(parallelResult.executionOrder['C'].level === 1, 'C should be at level 1');
  console.assert(parallelResult.executionOrder['D'].level === 2, 'D should be at level 2');
  
  // Check hierarchical indexing for parallel branches
  console.assert(parallelResult.executionOrder['A'].executionIndex === '1', 'A should have index "1"');
  console.assert(parallelResult.executionOrder['B'].executionIndex === '1.1', 'B should have index "1.1"');
  console.assert(parallelResult.executionOrder['C'].executionIndex === '1.2', 'C should have index "1.2"');
  // D should choose primary parent (B comes before C lexicographically)
  console.assert(parallelResult.executionOrder['D'].parentId === 'B', 'D should have B as primary parent');
  console.assert(parallelResult.executionOrder['D'].executionIndex === '1.1.1', 'D should have index "1.1.1"');
  
  // Check parallel groups
  console.assert(parallelResult.parallelGroups.length === 1, 'Should identify 1 parallel group');
  const parallelGroup = parallelResult.parallelGroups[0];
  console.assert(parallelGroup.includes('B') && parallelGroup.includes('C'), 'B and C should be in parallel group');
  console.log('✅ Parallel workflow test passed');

  // Test 5: Complex workflow with multiple parallel levels
  console.log('\n5. Testing complex workflow...');
  const complexNodes = [
    WorkflowTestData.createNode('Start', 'start'),
    WorkflowTestData.createNode('A1', 'prompt'),
    WorkflowTestData.createNode('A2', 'prompt'),
    WorkflowTestData.createNode('B1', 'api'),
    WorkflowTestData.createNode('B2', 'api'),
    WorkflowTestData.createNode('B3', 'rag'),
    WorkflowTestData.createNode('C1', 'condition'),
    WorkflowTestData.createNode('End', 'merge')
  ];
  const complexEdges = [
    WorkflowTestData.createEdge('e1', 'Start', 'A1'),
    WorkflowTestData.createEdge('e2', 'Start', 'A2'),
    WorkflowTestData.createEdge('e3', 'A1', 'B1'),
    WorkflowTestData.createEdge('e4', 'A1', 'B2'),
    WorkflowTestData.createEdge('e5', 'A2', 'B3'),
    WorkflowTestData.createEdge('e6', 'B1', 'C1'),
    WorkflowTestData.createEdge('e7', 'B2', 'C1'),
    WorkflowTestData.createEdge('e8', 'B3', 'End'),
    WorkflowTestData.createEdge('e9', 'C1', 'End')
  ];
  const complexResult = calculateExecutionOrder(complexNodes, complexEdges);
  
  console.assert(complexResult.totalLevels === 5, 'Complex workflow should have 5 levels');
  console.assert(complexResult.parallelGroups.length >= 2, 'Should identify multiple parallel groups');
  console.log('✅ Complex workflow test passed');

  // Test 6: Isolated nodes
  console.log('\n6. Testing isolated nodes...');
  const isolatedNodes = [
    WorkflowTestData.createNode('Connected1', 'start'),
    WorkflowTestData.createNode('Connected2', 'prompt'),
    WorkflowTestData.createNode('Isolated1', 'api'),
    WorkflowTestData.createNode('Isolated2', 'rag')
  ];
  const isolatedEdges = [
    WorkflowTestData.createEdge('e1', 'Connected1', 'Connected2')
  ];
  const isolatedResult = calculateExecutionOrder(isolatedNodes, isolatedEdges);
  
  console.assert(isolatedResult.isolatedNodes.length === 2, 'Should identify 2 isolated nodes');
  console.assert(isolatedResult.isolatedNodes.includes('Isolated1'), 'Should include Isolated1');
  console.assert(isolatedResult.isolatedNodes.includes('Isolated2'), 'Should include Isolated2');
  console.log('✅ Isolated nodes test passed');

  // Test 7: Cycle detection
  console.log('\n7. Testing cycle detection...');
  const cycleNodes = [
    WorkflowTestData.createNode('A', 'start'),
    WorkflowTestData.createNode('B', 'prompt'),
    WorkflowTestData.createNode('C', 'api')
  ];
  const cycleEdges = [
    WorkflowTestData.createEdge('e1', 'A', 'B'),
    WorkflowTestData.createEdge('e2', 'B', 'C'),
    WorkflowTestData.createEdge('e3', 'C', 'A') // Creates cycle
  ];
  const cycleResult = calculateExecutionOrder(cycleNodes, cycleEdges);
  
  console.assert(cycleResult.hasErrors, 'Should detect cycle and have errors');
  console.assert(cycleResult.errors.some(error => error.includes('cycle') || error.includes('Cycle')), 'Should report cycle error');
  console.log('✅ Cycle detection test passed');

  // Test 8: Validation function
  console.log('\n8. Testing validation function...');
  const validationResult = validateWorkflowStructure(linearNodes, linearEdges);
  console.assert(validationResult.isValid, 'Linear workflow should be valid');
  
  const invalidEdges = [WorkflowTestData.createEdge('invalid', 'nonexistent1', 'nonexistent2')];
  const invalidValidationResult = validateWorkflowStructure(linearNodes, invalidEdges);
  console.assert(!invalidValidationResult.isValid, 'Should detect invalid edge references');
  console.log('✅ Validation function test passed');

  // Test 9: Statistics function
  console.log('\n9. Testing statistics function...');
  const stats = getExecutionStatistics(parallelResult);
  console.assert(stats.totalNodes === 4, 'Should count 4 total nodes');
  console.assert(stats.levelsCount === 3, 'Should have 3 levels');
  console.assert(stats.maxParallelNodes === 2, 'Should have max 2 parallel nodes');
  console.log('✅ Statistics function test passed');

  // Test 10: True hierarchical execution indexes
  console.log('\n10. Testing true hierarchical execution indexes...');
  const hierarchicalNodes = [
    WorkflowTestData.createNode('Root', 'start'),
    WorkflowTestData.createNode('Child1', 'prompt'),
    WorkflowTestData.createNode('Child2', 'api'),
    WorkflowTestData.createNode('Grandchild1', 'rag'),
    WorkflowTestData.createNode('Grandchild2', 'condition')
  ];
  const hierarchicalEdges = [
    WorkflowTestData.createEdge('e1', 'Root', 'Child1'),
    WorkflowTestData.createEdge('e2', 'Root', 'Child2'),
    WorkflowTestData.createEdge('e3', 'Child1', 'Grandchild1'),
    WorkflowTestData.createEdge('e4', 'Child2', 'Grandchild2')
  ];
  const hierarchicalResult = calculateExecutionOrder(hierarchicalNodes, hierarchicalEdges);
  
  console.assert(hierarchicalResult.executionOrder['Root'].executionIndex === '1', 'Root should have index "1"');
  console.assert(hierarchicalResult.executionOrder['Child1'].executionIndex === '1.1', 'Child1 should have index "1.1"');
  console.assert(hierarchicalResult.executionOrder['Child2'].executionIndex === '1.2', 'Child2 should have index "1.2"');
  console.assert(hierarchicalResult.executionOrder['Grandchild1'].executionIndex === '1.1.1', 'Grandchild1 should have index "1.1.1"');
  console.assert(hierarchicalResult.executionOrder['Grandchild2'].executionIndex === '1.2.1', 'Grandchild2 should have index "1.2.1"');
  
  // Check parent relationships
  console.assert(hierarchicalResult.executionOrder['Root'].parentId === null, 'Root should have no parent');
  console.assert(hierarchicalResult.executionOrder['Child1'].parentId === 'Root', 'Child1 should have Root as parent');
  console.assert(hierarchicalResult.executionOrder['Child2'].parentId === 'Root', 'Child2 should have Root as parent');
  console.assert(hierarchicalResult.executionOrder['Grandchild1'].parentId === 'Child1', 'Grandchild1 should have Child1 as parent');
  console.assert(hierarchicalResult.executionOrder['Grandchild2'].parentId === 'Child2', 'Grandchild2 should have Child2 as parent');
  console.log('✅ True hierarchical execution indexes test passed');

  // Test 11: Diamond merge pattern (critical DAG scenario)
  console.log('\n11. Testing diamond merge pattern...');
  const diamondNodes = [
    WorkflowTestData.createNode('Start', 'start'),
    WorkflowTestData.createNode('Branch1', 'prompt'),
    WorkflowTestData.createNode('Branch2', 'api'),
    WorkflowTestData.createNode('Merge', 'merge')
  ];
  const diamondEdges = [
    WorkflowTestData.createEdge('e1', 'Start', 'Branch1'),
    WorkflowTestData.createEdge('e2', 'Start', 'Branch2'),
    WorkflowTestData.createEdge('e3', 'Branch1', 'Merge'),
    WorkflowTestData.createEdge('e4', 'Branch2', 'Merge')
  ];
  const diamondResult = calculateExecutionOrder(diamondNodes, diamondEdges);
  
  // Test correct level calculation for diamond merge
  console.assert(diamondResult.executionOrder['Start'].level === 0, 'Start should be at level 0');
  console.assert(diamondResult.executionOrder['Branch1'].level === 1, 'Branch1 should be at level 1');
  console.assert(diamondResult.executionOrder['Branch2'].level === 1, 'Branch2 should be at level 1');
  console.assert(diamondResult.executionOrder['Merge'].level === 2, 'Merge should be at level 2 (max of dependencies + 1)');
  
  // Test hierarchical indexing
  console.assert(diamondResult.executionOrder['Start'].executionIndex === '1', 'Start should have index "1"');
  console.assert(diamondResult.executionOrder['Branch1'].executionIndex === '1.1', 'Branch1 should have index "1.1"');
  console.assert(diamondResult.executionOrder['Branch2'].executionIndex === '1.2', 'Branch2 should have index "1.2"');
  // Merge should choose Branch1 as primary parent (lexicographically first)
  console.assert(diamondResult.executionOrder['Merge'].parentId === 'Branch1', 'Merge should have Branch1 as primary parent');
  console.assert(diamondResult.executionOrder['Merge'].executionIndex === '1.1.1', 'Merge should have index "1.1.1"');
  console.log('✅ Diamond merge pattern test passed');
  
  // Test 12: Uneven depth merge scenario
  console.log('\n12. Testing uneven depth merge scenario...');
  const unevenNodes = [
    WorkflowTestData.createNode('Root', 'start'),
    WorkflowTestData.createNode('Short', 'prompt'),
    WorkflowTestData.createNode('Deep1', 'api'),
    WorkflowTestData.createNode('Deep2', 'rag'),
    WorkflowTestData.createNode('Deep3', 'condition'),
    WorkflowTestData.createNode('FinalMerge', 'merge')
  ];
  const unevenEdges = [
    WorkflowTestData.createEdge('e1', 'Root', 'Short'),
    WorkflowTestData.createEdge('e2', 'Root', 'Deep1'),
    WorkflowTestData.createEdge('e3', 'Deep1', 'Deep2'),
    WorkflowTestData.createEdge('e4', 'Deep2', 'Deep3'),
    WorkflowTestData.createEdge('e5', 'Short', 'FinalMerge'),
    WorkflowTestData.createEdge('e6', 'Deep3', 'FinalMerge')
  ];
  const unevenResult = calculateExecutionOrder(unevenNodes, unevenEdges);
  
  // Test correct level calculation with uneven paths
  console.assert(unevenResult.executionOrder['Root'].level === 0, 'Root should be at level 0');
  console.assert(unevenResult.executionOrder['Short'].level === 1, 'Short should be at level 1');
  console.assert(unevenResult.executionOrder['Deep1'].level === 1, 'Deep1 should be at level 1');
  console.assert(unevenResult.executionOrder['Deep2'].level === 2, 'Deep2 should be at level 2');
  console.assert(unevenResult.executionOrder['Deep3'].level === 3, 'Deep3 should be at level 3');
  console.assert(unevenResult.executionOrder['FinalMerge'].level === 4, 'FinalMerge should be at level 4 (max depth + 1)');
  
  // Test hierarchical indexing with complex parent selection
  // FinalMerge should choose Deep3 as primary parent (higher level takes precedence)
  console.assert(unevenResult.executionOrder['FinalMerge'].parentId === 'Deep3', 'FinalMerge should have Deep3 as primary parent');
  console.assert(unevenResult.executionOrder['FinalMerge'].executionIndex === '1.2.1.1.1', 'FinalMerge should have deep hierarchical index');
  console.log('✅ Uneven depth merge scenario test passed');
  
  // Test 13: Multiple start nodes scenario
  console.log('\n13. Testing multiple start nodes scenario...');
  const multiStartNodes = [
    WorkflowTestData.createNode('Start1', 'start'),
    WorkflowTestData.createNode('Start2', 'start'),
    WorkflowTestData.createNode('Process1', 'prompt'),
    WorkflowTestData.createNode('Process2', 'api'),
    WorkflowTestData.createNode('FinalMerge', 'merge')
  ];
  const multiStartEdges = [
    WorkflowTestData.createEdge('e1', 'Start1', 'Process1'),
    WorkflowTestData.createEdge('e2', 'Start2', 'Process2'),
    WorkflowTestData.createEdge('e3', 'Process1', 'FinalMerge'),
    WorkflowTestData.createEdge('e4', 'Process2', 'FinalMerge')
  ];
  const multiStartResult = calculateExecutionOrder(multiStartNodes, multiStartEdges);
  
  // Test multiple start nodes at level 0
  console.assert(multiStartResult.executionOrder['Start1'].level === 0, 'Start1 should be at level 0');
  console.assert(multiStartResult.executionOrder['Start2'].level === 0, 'Start2 should be at level 0');
  console.assert(multiStartResult.executionOrder['Process1'].level === 1, 'Process1 should be at level 1');
  console.assert(multiStartResult.executionOrder['Process2'].level === 1, 'Process2 should be at level 1');
  console.assert(multiStartResult.executionOrder['FinalMerge'].level === 2, 'FinalMerge should be at level 2');
  
  // Test hierarchical indexing with multiple roots
  console.assert(multiStartResult.executionOrder['Start1'].executionIndex === '1', 'Start1 should have index "1"');
  console.assert(multiStartResult.executionOrder['Start2'].executionIndex === '2', 'Start2 should have index "2"');
  console.assert(multiStartResult.executionOrder['Process1'].executionIndex === '1.1', 'Process1 should have index "1.1"');
  console.assert(multiStartResult.executionOrder['Process2'].executionIndex === '2.1', 'Process2 should have index "2.1"');
  console.assert(multiStartResult.executionOrder['FinalMerge'].parentId === 'Process1', 'FinalMerge should choose Process1 as primary parent');
  console.assert(multiStartResult.executionOrder['FinalMerge'].executionIndex === '1.1.1', 'FinalMerge should have index "1.1.1"');
  console.log('✅ Multiple start nodes scenario test passed');
  
  // Test 13: Critical hierarchical indexing test - multiple parents with children at same level
  console.log('\n13. Testing critical hierarchical indexing fix - multiple parents with children...');
  const criticalNodes = [
    WorkflowTestData.createNode('Root', 'start'),
    WorkflowTestData.createNode('Parent1', 'prompt'), 
    WorkflowTestData.createNode('Parent2', 'api'),
    WorkflowTestData.createNode('Child1_1', 'rag'),     // Should be 1.1.1
    WorkflowTestData.createNode('Child1_2', 'condition'), // Should be 1.1.2
    WorkflowTestData.createNode('Child2_1', 'merge'),   // Should be 1.2.1 (NOT 1.2.4!)
    WorkflowTestData.createNode('Child2_2', 'prompt')   // Should be 1.2.2 (NOT 1.2.5!)
  ];
  const criticalEdges = [
    WorkflowTestData.createEdge('e1', 'Root', 'Parent1'),
    WorkflowTestData.createEdge('e2', 'Root', 'Parent2'),
    WorkflowTestData.createEdge('e3', 'Parent1', 'Child1_1'),
    WorkflowTestData.createEdge('e4', 'Parent1', 'Child1_2'),
    WorkflowTestData.createEdge('e5', 'Parent2', 'Child2_1'),
    WorkflowTestData.createEdge('e6', 'Parent2', 'Child2_2')
  ];
  const criticalResult = calculateExecutionOrder(criticalNodes, criticalEdges);
  
  // Test hierarchical indexes are correctly parent-specific
  console.assert(criticalResult.executionOrder['Root'].executionIndex === '1', 'Root should have index "1"');
  console.assert(criticalResult.executionOrder['Parent1'].executionIndex === '1.1', 'Parent1 should have index "1.1"');
  console.assert(criticalResult.executionOrder['Parent2'].executionIndex === '1.2', 'Parent2 should have index "1.2"');
  
  // CRITICAL TEST: Each parent's children should start from .1, not continue level-wide counting
  console.assert(criticalResult.executionOrder['Child1_1'].executionIndex === '1.1.1', 'Child1_1 should have index "1.1.1"');
  console.assert(criticalResult.executionOrder['Child1_2'].executionIndex === '1.1.2', 'Child1_2 should have index "1.1.2"');
  console.assert(criticalResult.executionOrder['Child2_1'].executionIndex === '1.2.1', 'Child2_1 should have index "1.2.1" (NOT 1.2.3 or 1.2.4!)');
  console.assert(criticalResult.executionOrder['Child2_2'].executionIndex === '1.2.2', 'Child2_2 should have index "1.2.2" (NOT 1.2.4 or 1.2.5!)');
  
  // Test parent relationships
  console.assert(criticalResult.executionOrder['Child1_1'].parentId === 'Parent1', 'Child1_1 should have Parent1 as parent');
  console.assert(criticalResult.executionOrder['Child1_2'].parentId === 'Parent1', 'Child1_2 should have Parent1 as parent');
  console.assert(criticalResult.executionOrder['Child2_1'].parentId === 'Parent2', 'Child2_1 should have Parent2 as parent');
  console.assert(criticalResult.executionOrder['Child2_2'].parentId === 'Parent2', 'Child2_2 should have Parent2 as parent');
  
  // Test sibling orders are parent-specific
  console.assert(criticalResult.executionOrder['Child1_1'].order === 0, 'Child1_1 should have sibling order 0');
  console.assert(criticalResult.executionOrder['Child1_2'].order === 1, 'Child1_2 should have sibling order 1');
  console.assert(criticalResult.executionOrder['Child2_1'].order === 0, 'Child2_1 should have sibling order 0 (NOT 2!)');
  console.assert(criticalResult.executionOrder['Child2_2'].order === 1, 'Child2_2 should have sibling order 1 (NOT 3!)');
  
  console.log('✅ Critical hierarchical indexing fix test passed - parent-specific child ordering works!');
  
  console.log('\n🎉 All workflow execution tests passed including critical hierarchical indexing fix!');
}

// Sample workflow data for development/demonstration
export const sampleWorkflows = {
  linear: {
    nodes: [
      WorkflowTestData.createNode('start1', 'start'),
      WorkflowTestData.createNode('prompt1', 'prompt'),
      WorkflowTestData.createNode('api1', 'api'),
      WorkflowTestData.createNode('merge1', 'merge')
    ],
    edges: [
      WorkflowTestData.createEdge('e1', 'start1', 'prompt1'),
      WorkflowTestData.createEdge('e2', 'prompt1', 'api1'),
      WorkflowTestData.createEdge('e3', 'api1', 'merge1')
    ]
  },
  
  parallel: {
    nodes: [
      WorkflowTestData.createNode('start1', 'start'),
      WorkflowTestData.createNode('prompt1', 'prompt'),
      WorkflowTestData.createNode('api1', 'api'),
      WorkflowTestData.createNode('rag1', 'rag'),
      WorkflowTestData.createNode('merge1', 'merge')
    ],
    edges: [
      WorkflowTestData.createEdge('e1', 'start1', 'prompt1'),
      WorkflowTestData.createEdge('e2', 'start1', 'api1'),
      WorkflowTestData.createEdge('e3', 'prompt1', 'rag1'),
      WorkflowTestData.createEdge('e4', 'api1', 'rag1'),
      WorkflowTestData.createEdge('e5', 'rag1', 'merge1')
    ]
  },

  complex: {
    nodes: [
      WorkflowTestData.createNode('start1', 'start'),
      WorkflowTestData.createNode('data_fetch', 'api'),
      WorkflowTestData.createNode('news_analysis', 'prompt'),
      WorkflowTestData.createNode('market_analysis', 'prompt'),
      WorkflowTestData.createNode('rag_search', 'rag'),
      WorkflowTestData.createNode('condition_check', 'condition'),
      WorkflowTestData.createNode('report_gen', 'api'),
      WorkflowTestData.createNode('final_merge', 'merge')
    ],
    edges: [
      WorkflowTestData.createEdge('e1', 'start1', 'data_fetch'),
      WorkflowTestData.createEdge('e2', 'data_fetch', 'news_analysis'),
      WorkflowTestData.createEdge('e3', 'data_fetch', 'market_analysis'),
      WorkflowTestData.createEdge('e4', 'news_analysis', 'rag_search'),
      WorkflowTestData.createEdge('e5', 'market_analysis', 'condition_check'),
      WorkflowTestData.createEdge('e6', 'rag_search', 'report_gen'),
      WorkflowTestData.createEdge('e7', 'condition_check', 'report_gen'),
      WorkflowTestData.createEdge('e8', 'report_gen', 'final_merge')
    ]
  }
};

// Run tests if this module is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - can be called manually
  (window as any).runWorkflowExecutionTests = runWorkflowExecutionTests;
  (window as any).sampleWorkflows = sampleWorkflows;
}