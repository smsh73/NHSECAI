import { WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { calculateExecutionOrder } from './workflow-execution';

// Quick verification script for the hierarchical indexing fix
export function verifyHierarchicalIndexingFix(): boolean {
  console.log('🔍 Verifying hierarchical indexing fix...');
  
  // Create test data that demonstrates the critical issue
  const nodes: WorkflowNode[] = [
    {
      id: 'Root',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'Root', description: 'Root node', config: { type: 'start' } }
    },
    {
      id: 'Parent1',
      type: 'prompt',
      position: { x: 0, y: 100 },
      data: { label: 'Parent1', description: 'Parent 1', config: { type: 'prompt' } }
    },
    {
      id: 'Parent2',
      type: 'api',
      position: { x: 100, y: 100 },
      data: { label: 'Parent2', description: 'Parent 2', config: { type: 'api' } }
    },
    {
      id: 'Child1_1',
      type: 'rag',
      position: { x: 0, y: 200 },
      data: { label: 'Child1_1', description: 'Child 1 of Parent 1', config: { type: 'rag' } }
    },
    {
      id: 'Child1_2',
      type: 'condition',
      position: { x: 50, y: 200 },
      data: { label: 'Child1_2', description: 'Child 2 of Parent 1', config: { type: 'condition' } }
    },
    {
      id: 'Child2_1',
      type: 'merge',
      position: { x: 100, y: 200 },
      data: { label: 'Child2_1', description: 'Child 1 of Parent 2', config: { type: 'merge' } }
    },
    {
      id: 'Child2_2',
      type: 'prompt',
      position: { x: 150, y: 200 },
      data: { label: 'Child2_2', description: 'Child 2 of Parent 2', config: { type: 'prompt' } }
    }
  ];

  const edges: WorkflowEdge[] = [
    { id: 'e1', source: 'Root', target: 'Parent1' },
    { id: 'e2', source: 'Root', target: 'Parent2' },
    { id: 'e3', source: 'Parent1', target: 'Child1_1' },
    { id: 'e4', source: 'Parent1', target: 'Child1_2' },
    { id: 'e5', source: 'Parent2', target: 'Child2_1' },
    { id: 'e6', source: 'Parent2', target: 'Child2_2' }
  ];

  const result = calculateExecutionOrder(nodes, edges);
  
  console.log('📊 Execution Order Results:');
  Object.entries(result.executionOrder).forEach(([nodeId, info]) => {
    console.log(`  ${nodeId}: level=${info.level}, order=${info.order}, executionIndex="${info.executionIndex}", parentId=${info.parentId}`);
  });

  // Verify the fix
  const errors: string[] = [];
  
  // Test 1: Root should be "1"
  if (result.executionOrder['Root'].executionIndex !== '1') {
    errors.push(`Root should have index "1", got "${result.executionOrder['Root'].executionIndex}"`);
  }
  
  // Test 2: Parents should be "1.1" and "1.2"
  if (result.executionOrder['Parent1'].executionIndex !== '1.1') {
    errors.push(`Parent1 should have index "1.1", got "${result.executionOrder['Parent1'].executionIndex}"`);
  }
  if (result.executionOrder['Parent2'].executionIndex !== '1.2') {
    errors.push(`Parent2 should have index "1.2", got "${result.executionOrder['Parent2'].executionIndex}"`);
  }
  
  // Test 3: CRITICAL - Each parent's children should start from .1
  if (result.executionOrder['Child1_1'].executionIndex !== '1.1.1') {
    errors.push(`Child1_1 should have index "1.1.1", got "${result.executionOrder['Child1_1'].executionIndex}"`);
  }
  if (result.executionOrder['Child1_2'].executionIndex !== '1.1.2') {
    errors.push(`Child1_2 should have index "1.1.2", got "${result.executionOrder['Child1_2'].executionIndex}"`);
  }
  if (result.executionOrder['Child2_1'].executionIndex !== '1.2.1') {
    errors.push(`Child2_1 should have index "1.2.1", got "${result.executionOrder['Child2_1'].executionIndex}" (CRITICAL: This should NOT be 1.2.3 or 1.2.4!)`);
  }
  if (result.executionOrder['Child2_2'].executionIndex !== '1.2.2') {
    errors.push(`Child2_2 should have index "1.2.2", got "${result.executionOrder['Child2_2'].executionIndex}" (CRITICAL: This should NOT be 1.2.4 or 1.2.5!)`);
  }
  
  // Test 4: Sibling orders should be parent-specific
  if (result.executionOrder['Child1_1'].order !== 0) {
    errors.push(`Child1_1 should have sibling order 0, got ${result.executionOrder['Child1_1'].order}`);
  }
  if (result.executionOrder['Child1_2'].order !== 1) {
    errors.push(`Child1_2 should have sibling order 1, got ${result.executionOrder['Child1_2'].order}`);
  }
  if (result.executionOrder['Child2_1'].order !== 0) {
    errors.push(`Child2_1 should have sibling order 0 (NOT 2!), got ${result.executionOrder['Child2_1'].order}`);
  }
  if (result.executionOrder['Child2_2'].order !== 1) {
    errors.push(`Child2_2 should have sibling order 1 (NOT 3!), got ${result.executionOrder['Child2_2'].order}`);
  }

  if (errors.length > 0) {
    console.log('❌ Verification FAILED:');
    errors.forEach(error => console.log(`  - ${error}`));
    return false;
  } else {
    console.log('✅ Verification PASSED: Hierarchical indexing fix is working correctly!');
    console.log('🎉 Parent-specific child ordering is implemented correctly!');
    return true;
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  (window as any).verifyHierarchicalIndexingFix = verifyHierarchicalIndexingFix;
}