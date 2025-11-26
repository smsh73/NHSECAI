import { useState, useCallback, useRef, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Workflow, LayoutTemplate, InsertLayoutTemplate } from "@shared/schema";
import { 
  Save, 
  FolderOpen, 
  Eye, 
  TestTube2,
  Play,
  Trash2,
  GripVertical,
  Settings,
  FileText,
  BarChart3,
  Newspaper,
  TrendingUp,
  Workflow as WorkflowIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Edit2,
  Grid3X3,
  Copy,
  Move,
  X
} from "lucide-react";

// Data Part 타입 정의 - 개별 워크플로우 노드
export interface DataPart {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowDescription?: string;
  position: {
    row: number;
    column: number;
  };
  estimatedLength: number; // 예상 글자수
  actualLength?: number; // 실제 생성된 글자수
  testResult?: {
    content: string;
    executionTime: number;
    status: 'success' | 'error' | 'pending';
    error?: string;
  };
  isEnabled: boolean;
}

// 레이아웃 정의 - 동적 플레이스홀더 시스템
export interface AILayoutDefinition {
  id: string;
  name: string;
  dataParts: DataPart[]; // 직접 데이터 파트 관리
  maxCharacters: number; // 최대 글자수 제한
  totalEstimatedLength: number;
  totalActualLength: number;
  canvasSize: {
    width: number;
    height: number;
  };
  maxRows: number; // 최대 행 수
  maxColumns: number; // 행당 최대 열 수
  createdAt: Date;
  updatedAt: Date;
}

// 드래그 가능한 워크플로우 아이템
interface DraggableWorkflowProps {
  workflow: Workflow;
  isSelected: boolean;
  onSelectionChange: (workflowId: string, selected: boolean, isCtrlKey: boolean) => void;
}

function DraggableWorkflow({ workflow, isSelected, onSelectionChange }: DraggableWorkflowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `workflow-${workflow.id}`,
    data: { type: 'workflow', workflow }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleClick = useCallback((e: React.MouseEvent) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    onSelectionChange(workflow.id, !isSelected, isCtrlOrCmd);
  }, [workflow.id, isSelected, onSelectionChange]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`group relative p-4 border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 bg-card select-none ${
        isDragging ? "opacity-50" : ""
      } ${
        isSelected ? "border-primary bg-primary/10 shadow-md scale-[0.98]" : "border-border"
      }`}
      data-testid={`draggable-workflow-${workflow.id}`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg transition-colors ${
          isSelected ? "bg-primary/20" : "bg-primary/10"
        }`}>
          <WorkflowIcon className={`w-5 h-5 ${
            isSelected ? "text-primary" : "text-primary"
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{workflow.name}</h4>
          {workflow.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {workflow.description}
            </p>
          )}
          <div className="flex items-center mt-2 space-x-2">
            <Badge variant={workflow.isActive ? "default" : "secondary"} className="text-xs">
              {workflow.isActive ? "활성" : "비활성"}
            </Badge>
            {isSelected && (
              <Badge variant="outline" className="text-xs border-primary text-primary">
                선택됨
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 동적 플레이스홀더 컴포넌트
interface DynamicPlaceholderProps {
  position: { row: number; column: number };
  onClick?: () => void;
}

function DynamicPlaceholder({ position, onClick }: DynamicPlaceholderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `placeholder-${position.row}-${position.column}`,
    data: { type: 'placeholder', position }
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`
        relative border-2 border-dashed rounded-lg p-6 min-h-[120px] 
        transition-all duration-200 cursor-pointer flex items-center justify-center
        ${isOver 
          ? 'border-primary bg-primary/10 scale-105 shadow-lg' 
          : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5'
        }
      `}
      data-testid={`placeholder-${position.row}-${position.column}`}
    >
      <div className="text-center">
        <div className={`
          w-8 h-8 mx-auto mb-2 rounded-full border-2 border-dashed flex items-center justify-center
          ${isOver 
            ? 'border-primary text-primary animate-spin' 
            : 'border-muted-foreground/50 text-muted-foreground'
          }
        `}>
          <Plus className="w-4 h-4" />
        </div>
        <span className="text-xs text-muted-foreground">
          {isOver ? '여기에 놓기' : `행 ${position.row + 1}, 열 ${position.column + 1}`}
        </span>
      </div>
      
      {isOver && (
        <div className="absolute inset-0 bg-primary/10 rounded-lg animate-pulse" />
      )}
    </div>
  );
}

// 배치된 워크플로우 컴포넌트
interface PlacedWorkflowProps {
  dataPart: DataPart;
  onRemove: () => void;
  onToggle: () => void;
  onTest: () => void;
  isLoading?: boolean;
}

function PlacedWorkflow({ dataPart, onRemove, onToggle, onTest, isLoading }: PlacedWorkflowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: dataPart.id,
    data: { type: 'dataPart', dataPart }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusIcon = () => {
    if (!dataPart.testResult) return <Clock className="w-4 h-4 text-muted-foreground" />;
    if (dataPart.testResult.status === 'pending') return <Clock className="w-4 h-4 text-blue-500" />;
    if (dataPart.testResult.status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getCharacterCountColor = () => {
    const length = dataPart.actualLength || dataPart.estimatedLength;
    if (length > 2000) return "text-red-500";
    if (length > 1500) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-card border border-border rounded-lg p-4 shadow-sm 
        hover:shadow-md transition-all duration-200 cursor-move hover:scale-[1.02]
        ${!dataPart.isEnabled ? "opacity-60" : ""}
      `}
      data-testid={`placed-workflow-${dataPart.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground mt-0.5"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <WorkflowIcon className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-medium truncate">{dataPart.workflowName}</h4>
            </div>
            
            {dataPart.workflowDescription && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {dataPart.workflowDescription}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-xs font-medium ${getCharacterCountColor()}`}>
                  {dataPart.actualLength || dataPart.estimatedLength}자
                </span>
                <Badge variant="outline" className="text-xs">
                  행 {dataPart.position.row + 1}, 열 {dataPart.position.column + 1}
                </Badge>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggle()}
                  className="h-6 w-6 p-0"
                  data-testid={`button-toggle-${dataPart.id}`}
                >
                  {dataPart.isEnabled ? <Eye className="w-3 h-3" /> : <Eye className="w-3 h-3 opacity-50" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTest()}
                  disabled={isLoading || !dataPart.isEnabled}
                  className="h-6 w-6 p-0"
                  data-testid={`button-test-${dataPart.id}`}
                >
                  <TestTube2 className="w-3 h-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove()}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  data-testid={`button-remove-${dataPart.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {dataPart.testResult?.content && (
        <div className="mt-3 p-2 bg-muted/30 rounded text-xs">
          <div className="line-clamp-3">
            {dataPart.testResult.content}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LayoutEditorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [currentLayout, setCurrentLayout] = useState<AILayoutDefinition>({
    id: "new-layout",
    name: "새로운 AI시황 레이아웃",
    dataParts: [], // 빈 캔버스로 시작
    maxCharacters: 10000, // 1만자 제한
    totalEstimatedLength: 0,
    totalActualLength: 0,
    canvasSize: { width: 1200, height: 800 },
    maxRows: 10, // 최대 10행
    maxColumns: 5, // 행당 최대 5열
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [testingPartId, setTestingPartId] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState(currentLayout.name);
  const [maxCharacters, setMaxCharacters] = useState(currentLayout.maxCharacters);
  const [isEditMode, setIsEditMode] = useState(false);
  const [gridColumns, setGridColumns] = useState(currentLayout.maxColumns);
  const [gridRows, setGridRows] = useState(currentLayout.maxRows);
  
  // Multi-selection state for workflows
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // 드래그 중에만 표시할 플레이스홀더들
  const [availablePlaceholders, setAvailablePlaceholders] = useState<{row: number; column: number}[]>([]);

  // Multi-selection handlers
  const handleWorkflowSelection = useCallback((workflowId: string, selected: boolean, isCtrlKey: boolean) => {
    if (!isCtrlKey) {
      // Single selection mode - clear all others and select this one
      setSelectedWorkflowIds(selected ? new Set([workflowId]) : new Set());
    } else {
      // Multi-selection mode - add/remove from current selection
      setSelectedWorkflowIds(prev => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(workflowId);
        } else {
          newSet.delete(workflowId);
        }
        return newSet;
      });
    }
    setIsMultiSelectMode(isCtrlKey || selectedWorkflowIds.size > 0);
  }, [selectedWorkflowIds.size]);

  // Clear selection when clicking outside
  const handleClearSelection = useCallback(() => {
    setSelectedWorkflowIds(new Set());
    setIsMultiSelectMode(false);
  }, []);

  // Keyboard event handling for multi-selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClearSelection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        // When Ctrl/Cmd is released, exit multi-select mode if no items are selected
        if (selectedWorkflowIds.size === 0) {
          setIsMultiSelectMode(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleClearSelection, selectedWorkflowIds.size]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 3,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  // 워크플로우 목록 조회
  const { data: workflows, isLoading: workflowsLoading } = useQuery<Workflow[]>({
    queryKey: ['/api/workflows'],
  });

  // 레이아웃 템플릿 목록 조회
  const { data: templates, isLoading: templatesLoading } = useQuery<LayoutTemplate[]>({
    queryKey: ['/api/layout-templates'],
  });

  // 워크플로우 실행 테스트 뮤테이션
  const testWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await apiRequest('POST', '/api/executions', {
        workflowId,
        input: {},
      });
      return response.json();
    },
    onSuccess: (result: any, workflowId) => {
      // 테스트 결과를 데이터 파트에 반영
      setCurrentLayout(prev => ({
        ...prev,
        dataParts: prev.dataParts.map(part => {
          if (part.workflowId === workflowId) {
            const content = result?.output?.content || result?.output || result?.data || "테스트 실행 완료";
            const actualLength = typeof content === 'string' ? content.length : JSON.stringify(content).length;
            
            return {
              ...part,
              actualLength,
              testResult: {
                content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
                executionTime: result?.executionTime || result?.duration || 0,
                status: 'success' as const,
              }
            };
          }
          return part;
        })
      }));
      
      setTestingPartId(null);
      toast({
        title: "테스트 완료",
        description: "워크플로우 실행이 완료되었습니다.",
      });
    },
    onError: (error: any, workflowId) => {
      // 에러 결과를 데이터 파트에 반영
      setCurrentLayout(prev => ({
        ...prev,
        dataParts: prev.dataParts.map(part => {
          if (part.workflowId === workflowId) {
            return {
              ...part,
              testResult: {
                content: "",
                executionTime: 0,
                status: 'error' as const,
                error: error?.message || "워크플로우 실행 중 오류가 발생했습니다."
              }
            };
          }
          return part;
        })
      }));
      
      setTestingPartId(null);
      toast({
        title: "테스트 실패",
        description: error?.message || "워크플로우 실행 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 레이아웃 저장 뮤테이션
  const saveLayoutMutation = useMutation({
    mutationFn: async (layoutData: AILayoutDefinition) => {
      // 워크플로우 매핑 타입 정의
      interface WorkflowMapping {
        workflowId: string;
        position: { row: number; column: number };
        enabled: boolean;
      }

      interface DataBindings {
        workflowMappings: Record<string, WorkflowMapping>;
        layoutSettings: {
          maxCharacters: number;
          gridDimensions: {
            rows: number;
            columns: number;
          };
        };
      }

      // 레이아웃 정의를 데이터베이스 스키마에 맞게 변환
      const layoutDefinition = {
        id: layoutData.id,
        name: layoutData.name,
        dataParts: layoutData.dataParts,
        maxCharacters: layoutData.maxCharacters,
        totalEstimatedLength: layoutData.totalEstimatedLength,
        totalActualLength: layoutData.totalActualLength,
        canvasSize: layoutData.canvasSize,
        maxRows: layoutData.maxRows,
        maxColumns: layoutData.maxColumns,
        createdAt: layoutData.createdAt,
        updatedAt: new Date(),
      };

      // 컴포넌트 정보를 별도로 구성
      const components = layoutData.dataParts.map(part => ({
        id: part.id,
        workflowId: part.workflowId,
        workflowName: part.workflowName,
        workflowDescription: part.workflowDescription,
        position: part.position,
        estimatedLength: part.estimatedLength,
        actualLength: part.actualLength,
        isEnabled: part.isEnabled,
        testResult: part.testResult,
      }));

      // 데이터 바인딩 정보 구성
      const dataBindings: DataBindings = {
        workflowMappings: layoutData.dataParts.reduce((acc, part) => {
          acc[part.id] = {
            workflowId: part.workflowId,
            position: part.position,
            enabled: part.isEnabled
          };
          return acc;
        }, {} as Record<string, WorkflowMapping>),
        layoutSettings: {
          maxCharacters: layoutData.maxCharacters,
          gridDimensions: {
            rows: layoutData.maxRows,
            columns: layoutData.maxColumns
          }
        }
      };

      const template: InsertLayoutTemplate = {
        name: layoutData.name,
        description: `AI시황 레이아웃 - ${layoutData.dataParts.length}개 데이터 파트 (${layoutData.maxRows}x${layoutData.maxColumns} 그리드)`,
        type: "ai_layout",
        layoutDefinition: layoutDefinition,
        components: components,
        dataBindings: dataBindings,
        isDefault: false,
        isPublic: false,
        paperSize: "A4",
        orientation: "portrait",
        theme: "default",
        colorScheme: { primary: "#000000", secondary: "#666666", accent: "#3b82f6" },
        fonts: { primary: "Inter", secondary: "Inter" },
        tags: ["AI시황", "레이아웃", `${layoutData.maxRows}x${layoutData.maxColumns}`],
        version: "1.0",
        createdBy: "system"
      };
      
      return await apiRequest('POST', '/api/layout-templates', template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layout-templates'] });
      toast({
        title: "레이아웃 저장됨",
        description: "AI시황 레이아웃이 성공적으로 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "레이아웃 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 총 글자수 계산
  const totalEstimatedLength = currentLayout.dataParts.reduce((sum, part) => 
    sum + (part.actualLength || part.estimatedLength), 0
  );
  
  const totalActualLength = currentLayout.dataParts.reduce((sum, part) => 
    sum + (part.actualLength || 0), 0
  );

  // 사용 가능한 플레이스홀더 위치 계산 (멀티 드래그 지원)
  const calculateAvailablePlaceholders = useCallback((selectedCount: number = 1) => {
    const placeholders: {row: number; column: number}[] = [];
    const occupiedPositions = new Set(
      currentLayout.dataParts.map(part => `${part.position.row}-${part.position.column}`)
    );

    // 빈 캔버스의 경우 연속된 위치들 제공
    if (currentLayout.dataParts.length === 0) {
      for (let i = 0; i < selectedCount && i < currentLayout.maxColumns; i++) {
        placeholders.push({ row: 0, column: i });
      }
      return placeholders;
    }

    // 기존 데이터가 있는 경우, 가능한 연속 위치들을 계산
    const maxRow = Math.max(...currentLayout.dataParts.map(p => p.position.row));

    // 각 행에서 연속 배치 가능한 위치들 찾기
    for (let row = 0; row <= Math.min(maxRow + 1, currentLayout.maxRows - 1); row++) {
      const rowParts = currentLayout.dataParts.filter(p => p.position.row === row);
      const occupiedColumns = rowParts.map(p => p.position.column);
      
      if (rowParts.length === 0 && row <= maxRow) {
        // 빈 행이 있으면 연속 배치 가능
        const availableSlots = Math.min(selectedCount, currentLayout.maxColumns);
        for (let col = 0; col < availableSlots; col++) {
          placeholders.push({ row, column: col });
        }
      } else if (rowParts.length > 0) {
        // 기존 행의 끝에 연속 배치 가능
        const nextColumn = Math.max(...occupiedColumns) + 1;
        const availableSlots = Math.min(selectedCount, currentLayout.maxColumns - nextColumn);
        
        for (let i = 0; i < availableSlots; i++) {
          if (nextColumn + i < currentLayout.maxColumns) {
            placeholders.push({ row, column: nextColumn + i });
          }
        }
      }
    }

    // 새로운 행에 연속 배치 가능
    const newRow = Math.min(maxRow + 1, currentLayout.maxRows - 1);
    if (newRow === maxRow + 1 && newRow < currentLayout.maxRows) {
      const availableSlots = Math.min(selectedCount, currentLayout.maxColumns);
      for (let col = 0; col < availableSlots; col++) {
        placeholders.push({ row: newRow, column: col });
      }
    }

    return placeholders;
  }, [currentLayout.dataParts, currentLayout.maxRows, currentLayout.maxColumns]);

  // 같은 행에 연속 배치할 수 있는 위치 계산
  const calculateConsecutivePositions = useCallback((startPosition: { row: number; column: number }, count: number): { row: number; column: number }[] => {
    const positions: { row: number; column: number }[] = [];
    const occupiedPositions = new Set(
      currentLayout.dataParts.map(part => `${part.position.row}-${part.position.column}`)
    );

    // 시작 위치부터 연속적으로 배치
    for (let i = 0; i < count; i++) {
      const newPosition = { row: startPosition.row, column: startPosition.column + i };
      
      // 최대 열 수를 초과하지 않고, 이미 점유되지 않은 위치인 경우에만 추가
      if (newPosition.column < currentLayout.maxColumns && 
          !occupiedPositions.has(`${newPosition.row}-${newPosition.column}`)) {
        positions.push(newPosition);
      } else if (newPosition.column >= currentLayout.maxColumns) {
        // 같은 행에 더 이상 배치할 수 없으면 다음 행으로 이동
        const nextRow = startPosition.row + 1;
        if (nextRow < currentLayout.maxRows) {
          const remainingCount = count - i;
          const nextRowPositions = calculateConsecutivePositions({ row: nextRow, column: 0 }, remainingCount);
          positions.push(...nextRowPositions);
        }
        break;
      }
    }

    return positions;
  }, [currentLayout.dataParts, currentLayout.maxRows, currentLayout.maxColumns]);

  // 드래그 이벤트 핸들러 (멀티 드래그 지원)
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = event.active.id as string;
    setActiveId(activeId);
    
    // 워크플로우 드래그 시 플레이스홀더 표시
    if (event.active.data.current?.type === 'workflow') {
      const draggedWorkflowId = activeId.replace('workflow-', '');
      
      // 드래그된 워크플로우가 선택되어 있지 않다면 자동으로 선택
      if (!selectedWorkflowIds.has(draggedWorkflowId)) {
        setSelectedWorkflowIds(new Set([draggedWorkflowId]));
      }
      
      // 선택된 워크플로우 개수에 따라 플레이스홀더 생성
      const selectedCount = selectedWorkflowIds.has(draggedWorkflowId) 
        ? selectedWorkflowIds.size 
        : 1;
      
      setAvailablePlaceholders(calculateAvailablePlaceholders(selectedCount));
    }

    console.log('Drag started:', activeId);
  }, [calculateAvailablePlaceholders, selectedWorkflowIds]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag ended:', { activeId: active.id, overId: over?.id });

    // 플레이스홀더 숨기기
    setAvailablePlaceholders([]);

    if (!over) {
      console.log('No drop target found');
      setActiveId(null);
      return;
    }

    // 워크플로우를 플레이스홀더에 드롭 (멀티 드래그 지원)
    if (active.data.current?.type === 'workflow' && over.data.current?.type === 'placeholder') {
      const draggedWorkflowId = (active.id as string).replace('workflow-', '');
      const dropPosition = over.data.current.position as { row: number; column: number };
      
      // 선택된 워크플로우들 가져오기
      const selectedWorkflows = workflows?.filter(w => 
        selectedWorkflowIds.has(w.id) || w.id === draggedWorkflowId
      ) || [];
      
      if (selectedWorkflows.length > 0) {
        // 연속 배치 위치 계산
        const positions = calculateConsecutivePositions(dropPosition, selectedWorkflows.length);
        
        // 새로운 데이터 파트들 생성
        const newDataParts: DataPart[] = selectedWorkflows.map((workflow, index) => ({
          id: `dp-${Date.now()}-${index}`,
          workflowId: workflow.id,
          workflowName: workflow.name,
          workflowDescription: workflow.description || undefined,
          position: positions[index] || dropPosition,
          estimatedLength: 500, // 기본 예상 글자수
          isEnabled: true,
        }));

        setCurrentLayout(prev => ({
          ...prev,
          dataParts: [...prev.dataParts, ...newDataParts],
          updatedAt: new Date(),
        }));

        // 선택 해제
        setSelectedWorkflowIds(new Set());
        setIsMultiSelectMode(false);

        toast({
          title: "워크플로우 추가됨",
          description: selectedWorkflows.length === 1 
            ? `${selectedWorkflows[0].name}이(가) 행 ${dropPosition.row + 1}, 열 ${dropPosition.column + 1}에 배치되었습니다.`
            : `${selectedWorkflows.length}개 워크플로우가 행 ${dropPosition.row + 1}부터 연속 배치되었습니다.`,
        });
      }
    }

    // 데이터 파트 재정렬 (같은 컨텍스트 내에서)
    if (active.data.current?.type === 'dataPart' && over.data.current?.type === 'dataPart') {
      const activeDataPart = active.data.current.dataPart as DataPart;
      const overDataPart = over.data.current.dataPart as DataPart;
      
      if (activeDataPart.id !== overDataPart.id) {
        setCurrentLayout(prev => {
          const oldIndex = prev.dataParts.findIndex(p => p.id === activeDataPart.id);
          const newIndex = prev.dataParts.findIndex(p => p.id === overDataPart.id);
          
          return {
            ...prev,
            dataParts: arrayMove(prev.dataParts, oldIndex, newIndex),
            updatedAt: new Date(),
          };
        });
      }
    }

    setActiveId(null);
  }, [toast, selectedWorkflowIds, workflows, calculateConsecutivePositions]);

  // 데이터 파트 관리 함수들
  const handleRemoveDataPart = useCallback((partId: string) => {
    setCurrentLayout(prev => ({
      ...prev,
      dataParts: prev.dataParts.filter(part => part.id !== partId),
      updatedAt: new Date(),
    }));
    
    toast({
      title: "워크플로우 제거됨",
      description: "레이아웃에서 워크플로우가 제거되었습니다.",
    });
  }, [toast]);

  const handleToggleDataPart = useCallback((partId: string) => {
    setCurrentLayout(prev => ({
      ...prev,
      dataParts: prev.dataParts.map(part =>
        part.id === partId ? { ...part, isEnabled: !part.isEnabled } : part
      ),
      updatedAt: new Date(),
    }));
  }, []);

  const handleTestDataPart = useCallback((partId: string) => {
    const dataPart = currentLayout.dataParts.find(part => part.id === partId);
    if (!dataPart) return;

    setTestingPartId(partId);
    testWorkflowMutation.mutate(dataPart.workflowId);
  }, [currentLayout.dataParts, testWorkflowMutation]);

  // 레이아웃 저장
  const handleSaveLayout = useCallback(() => {
    const layoutToSave = {
      ...currentLayout,
      name: layoutName,
      maxCharacters,
      totalEstimatedLength,
      totalActualLength,
      maxRows: gridRows,
      maxColumns: gridColumns,
    };

    saveLayoutMutation.mutate(layoutToSave);
  }, [currentLayout, layoutName, maxCharacters, totalEstimatedLength, totalActualLength, gridRows, gridColumns, saveLayoutMutation]);

  // 템플릿 로드
  const handleLoadTemplate = useCallback((template: LayoutTemplate) => {
    if (template.layoutDefinition) {
      try {
        // 타입 안전한 템플릿 로딩
        const layoutDef = template.layoutDefinition;
        
        // layoutDefinition이 AILayoutDefinition 구조와 호환되는지 확인
        if (typeof layoutDef === 'object' && layoutDef !== null && 
            'id' in layoutDef && 'name' in layoutDef && 'dataParts' in layoutDef) {
          
          const typedLayoutDef = layoutDef as unknown as AILayoutDefinition;
          
          setCurrentLayout({
            ...typedLayoutDef,
            updatedAt: new Date(), // 로드 시간으로 업데이트
          });
          
          setLayoutName(typedLayoutDef.name);
          setMaxCharacters(typedLayoutDef.maxCharacters || 10000);
          setGridRows(typedLayoutDef.maxRows || 10);
          setGridColumns(typedLayoutDef.maxColumns || 5);
          
          // 선택 상태 초기화
          setSelectedWorkflowIds(new Set());
          setIsMultiSelectMode(false);
          
          toast({
            title: "템플릿 로드됨",
            description: `${template.name} 템플릿이 로드되었습니다. (${typedLayoutDef.dataParts?.length || 0}개 워크플로우)`,
          });
        } else {
          throw new Error('Invalid layout definition structure');
        }
      } catch (error) {
        console.error('Error loading template:', error);
        toast({
          title: "템플릿 로드 실패",
          description: "템플릿 구조가 올바르지 않습니다.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  // 캔버스 렌더링 - 위치 기반 그리드
  const renderCanvas = () => {
    if (currentLayout.dataParts.length === 0 && availablePlaceholders.length === 0) {
      return (
        <div className="flex-1 relative">
          {/* 투명한 바탕화면 안내글 */}
          <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
            <div className="space-y-3 opacity-40">
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center">
                <Grid3X3 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-muted-foreground mb-1">
                  빈 캔버스
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  왼쪽에서 워크플로우를 드래그하여<br />AI시황 레이아웃을 만들어보세요
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 그리드 크기 계산
    const maxRow = currentLayout.dataParts.length > 0 
      ? Math.max(...currentLayout.dataParts.map(p => p.position.row), 0)
      : 0;
    const maxCol = currentLayout.dataParts.length > 0
      ? Math.max(...currentLayout.dataParts.map(p => p.position.column), 0)
      : 0;

    const gridTemplateRows = Math.max(maxRow + 1, availablePlaceholders.length > 0 ? Math.max(...availablePlaceholders.map(p => p.row)) + 1 : 1);
    const gridTemplateColumns = Math.max(maxCol + 1, availablePlaceholders.length > 0 ? Math.max(...availablePlaceholders.map(p => p.column)) + 1 : 1);

    return (
      <div className="flex-1 p-6">
        <div 
          className="grid gap-4 min-h-full"
          style={{
            gridTemplateRows: `repeat(${gridTemplateRows}, minmax(120px, auto))`,
            gridTemplateColumns: `repeat(${gridTemplateColumns}, 1fr)`,
          }}
        >
          {/* 배치된 데이터 파트들 */}
          <SortableContext
            items={currentLayout.dataParts.map(part => part.id)}
            strategy={verticalListSortingStrategy}
          >
            {currentLayout.dataParts.map((dataPart) => (
              <div
                key={dataPart.id}
                style={{
                  gridColumn: dataPart.position.column + 1,
                  gridRow: dataPart.position.row + 1,
                }}
              >
                <PlacedWorkflow
                  dataPart={dataPart}
                  onRemove={() => handleRemoveDataPart(dataPart.id)}
                  onToggle={() => handleToggleDataPart(dataPart.id)}
                  onTest={() => handleTestDataPart(dataPart.id)}
                  isLoading={testingPartId === dataPart.id}
                />
              </div>
            ))}
          </SortableContext>

          {/* 동적 플레이스홀더들 - 드래그 중에만 표시 */}
          {availablePlaceholders.map((placeholder, index) => (
            <div
              key={`placeholder-${placeholder.row}-${placeholder.column}`}
              style={{
                gridColumn: placeholder.column + 1,
                gridRow: placeholder.row + 1,
              }}
            >
              <DynamicPlaceholder
                position={placeholder}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* 왼쪽 사이드바 - 워크플로우 목록 */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* 헤더 */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-semibold">AI시황 레이아웃 편집기</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                data-testid="button-toggle-edit"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {isEditMode ? "완료" : "편집"}
              </Button>
            </div>

            {/* 레이아웃 설정 */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="layout-name" className="text-xs">레이아웃 이름</Label>
                <Input
                  id="layout-name"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  placeholder="레이아웃 이름을 입력하세요"
                  className="mt-1"
                  data-testid="input-layout-name"
                />
              </div>

              <div className="flex space-x-2">
                <div className="flex-1">
                  <Label htmlFor="max-chars" className="text-xs">최대 글자수</Label>
                  <Input
                    id="max-chars"
                    type="number"
                    value={maxCharacters}
                    onChange={(e) => setMaxCharacters(Number(e.target.value))}
                    className="mt-1"
                    data-testid="input-max-chars"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="grid-size" className="text-xs">그리드 크기</Label>
                  <div className="flex space-x-1 mt-1">
                    <Input
                      type="number"
                      value={gridRows}
                      onChange={(e) => setGridRows(Number(e.target.value))}
                      placeholder="행"
                      min="1"
                      max="20"
                      className="w-12"
                      data-testid="input-grid-rows"
                    />
                    <Input
                      type="number"
                      value={gridColumns}
                      onChange={(e) => setGridColumns(Number(e.target.value))}
                      placeholder="열"
                      min="1"
                      max="10"
                      className="w-12"
                      data-testid="input-grid-cols"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 통계 */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">레이아웃 통계</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs">배치된 워크플로우</span>
                  <span className="text-xs font-medium">{currentLayout.dataParts.length}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs">예상 총 글자수</span>
                  <span className={`text-xs font-medium ${
                    totalEstimatedLength > maxCharacters ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {totalEstimatedLength.toLocaleString()}자
                  </span>
                </div>
                {totalActualLength > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs">실제 총 글자수</span>
                    <span className={`text-xs font-medium ${
                      totalActualLength > maxCharacters ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {totalActualLength.toLocaleString()}자
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="p-4 border-b border-border">
            <div className="space-y-2">
              <Button
                onClick={handleSaveLayout}
                disabled={!layoutName.trim() || saveLayoutMutation.isPending}
                className="w-full"
                data-testid="button-save-layout"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveLayoutMutation.isPending ? "저장 중..." : "레이아웃 저장"}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentLayout(prev => ({
                    ...prev,
                    dataParts: []
                  }));
                }}
                disabled={currentLayout.dataParts.length === 0}
                className="w-full"
                data-testid="button-clear-layout"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                전체 지우기
              </Button>
            </div>
          </div>

          {/* 템플릿 목록 */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-border shrink-0">
              <h3 className="text-sm font-medium mb-3">저장된 템플릿</h3>
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {templatesLoading ? (
                    <div className="text-xs text-muted-foreground">템플릿 로드 중...</div>
                  ) : templates && templates.length > 0 ? (
                    templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-2 text-xs rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleLoadTemplate(template)}
                        data-testid={`template-${template.id}`}
                      >
                        <div className="flex-1">
                          <div className="font-medium truncate">{template.name}</div>
                          <div className="text-muted-foreground">{template.description}</div>
                        </div>
                        <FolderOpen className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">저장된 템플릿이 없습니다</div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* 워크플로우 목록 */}
            <div className="flex-1 flex flex-col p-4 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">워크플로우 목록</h3>
                {selectedWorkflowIds.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {selectedWorkflowIds.size}개 선택됨
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="h-6 w-6 p-0"
                      data-testid="button-clear-selection"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              {isMultiSelectMode && (
                <div className="mb-3 p-2 bg-primary/10 rounded text-xs text-primary border border-primary/20">
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>멀티 선택 모드</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Ctrl/Cmd 키를 눌러 여러 워크플로우를 선택하세요
                  </div>
                </div>
              )}
              
              <ScrollArea className="flex-1">
                <div className="space-y-2" onClick={handleClearSelection}>
                  {workflowsLoading ? (
                    <div className="text-xs text-muted-foreground">워크플로우 로드 중...</div>
                  ) : workflows && workflows.length > 0 ? (
                    workflows
                      .filter(workflow => workflow.isActive) // 활성 워크플로우만 표시
                      .map((workflow) => (
                        <DraggableWorkflow
                          key={workflow.id}
                          workflow={workflow}
                          isSelected={selectedWorkflowIds.has(workflow.id)}
                          onSelectionChange={handleWorkflowSelection}
                        />
                      ))
                  ) : (
                    <div className="text-xs text-muted-foreground">활성 워크플로우가 없습니다</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* 메인 캔버스 */}
        <div className="flex-1 flex flex-col">
          {/* 캔버스 헤더 */}
          <div className="p-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">
                  {layoutName || "새로운 레이아웃"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  워크플로우를 드래그하여 배치하세요 • {currentLayout.dataParts.length}개 배치됨
                </p>
              </div>
              
              {totalEstimatedLength > maxCharacters && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  글자수 초과
                </Badge>
              )}
            </div>
          </div>

          {/* 캔버스 */}
          {renderCanvas()}
        </div>

        {/* 드래그 오버레이 */}
        <DragOverlay>
          {activeId ? (
            <div className="opacity-75 transform rotate-3 scale-105">
              {workflows?.find(w => `workflow-${w.id}` === activeId) ? (
                <div className="space-y-2">
                  {selectedWorkflowIds.size > 1 ? (
                    <>
                      <DraggableWorkflow 
                        workflow={workflows.find(w => `workflow-${w.id}` === activeId)!}
                        isSelected={true}
                        onSelectionChange={() => {}}
                      />
                      <div className="bg-primary/20 rounded-lg p-2 text-xs text-center">
                        +{selectedWorkflowIds.size - 1}개 더
                      </div>
                    </>
                  ) : (
                    <DraggableWorkflow 
                      workflow={workflows.find(w => `workflow-${w.id}` === activeId)!}
                      isSelected={selectedWorkflowIds.has(workflows.find(w => `workflow-${w.id}` === activeId)!.id)}
                      onSelectionChange={() => {}}
                    />
                  )}
                </div>
              ) : currentLayout.dataParts.find(p => p.id === activeId) ? (
                <PlacedWorkflow
                  dataPart={currentLayout.dataParts.find(p => p.id === activeId)!}
                  onRemove={() => {}}
                  onToggle={() => {}}
                  onTest={() => {}}
                  isLoading={false}
                />
              ) : null}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}