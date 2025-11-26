import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Prompt } from "@shared/schema";
import { Plus, Edit, Trash2, MessageSquare, Code, TestTube, Search, X } from "lucide-react";

export default function PromptManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [testInputData, setTestInputData] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'category'>('created');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    systemPrompt: '',
    userPromptTemplate: '',
    parameters: {},
    executionType: 'text',
    inputSchema: null,
    outputSchema: null,
    azureOpenAIConfig: null
  });

  // Fetch prompts
  const { data: prompts, isLoading } = useQuery<Prompt[]>({
    queryKey: ['/api/prompts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/prompts');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      return await response.json();
    },
    retry: 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Filter and sort prompts
  const filteredAndSortedPrompts = React.useMemo(() => {
    if (!prompts) return [];
    
    let filtered = prompts;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prompt => 
        prompt.name.toLowerCase().includes(query) ||
        (prompt.description && prompt.description.toLowerCase().includes(query)) ||
        (prompt.systemPrompt && prompt.systemPrompt.toLowerCase().includes(query)) ||
        (prompt.userPromptTemplate && prompt.userPromptTemplate.toLowerCase().includes(query)) ||
        (prompt.category && prompt.category.toLowerCase().includes(query))
      );
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(prompt => prompt.category === selectedCategory);
    }
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'created':
        default:
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate; // Newest first
      }
    });
    
    return sorted;
  }, [prompts, searchQuery, selectedCategory, sortBy]);

  // Extract template variables from prompt template
  const extractTemplateVariables = React.useCallback((template: string): Array<{ name: string; type: string; required: boolean }> => {
    if (!template) return [];
    
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: Map<string, { name: string; type: string; required: boolean }> = new Map();
    let match;
    
    while ((match = variableRegex.exec(template)) !== null) {
      const varName = match[1].trim();
      // Skip conditional helpers like {{#if}}, {{#each}}, etc.
      if (varName.startsWith('#') || varName.startsWith('/')) continue;
      
      // Try to infer type from variable name
      let type = 'string';
      if (varName.includes('price') || varName.includes('amount') || varName.includes('quantity') || varName.includes('count')) {
        type = 'number';
      } else if (varName.includes('date') || varName.includes('time') || varName.includes('timestamp')) {
        type = 'date';
      } else if (varName.includes('is') || varName.includes('has') || varName.includes('enabled') || varName.includes('active')) {
        type = 'boolean';
      } else if (varName.includes('list') || varName.includes('array') || varName.includes('items')) {
        type = 'array';
      }
      
      variables.set(varName, {
        name: varName,
        type,
        required: !varName.includes('?') && !varName.includes('optional')
      });
    }
    
    return Array.from(variables.values());
  }, []);

  // Create/Update prompt mutation
  const savePromptMutation = useMutation({
    mutationFn: async (promptData: any) => {
      const method = editingPrompt ? 'PUT' : 'POST';
      const url = editingPrompt ? `/api/prompts/${editingPrompt.id}` : '/api/prompts';
      const response = await apiRequest(method, url, promptData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || `프롬프트 저장 실패: ${response.status}`);
      }
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "프롬프트 저장 완료",
        description: "프롬프트가 성공적으로 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "프롬프트 저장 중 오류가 발생했습니다.";
      toast({
        title: "저장 실패",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const response = await apiRequest('DELETE', `/api/prompts/${promptId}`);
      // 204 No Content 응답은 본문이 없으므로 상태 코드만 확인
      if (response.status === 204 || response.ok) {
        return { success: true };
      }
      // 에러 응답인 경우에만 JSON 파싱 시도
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `프롬프트 삭제 실패: ${response.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
      toast({
        title: "프롬프트 삭제 완료",
        description: "프롬프트가 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error?.message || "프롬프트 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // Test prompt mutation
  const testPromptMutation = useMutation({
    mutationFn: async ({ promptId, inputData }: { promptId: string; inputData: any }) => {
      const response = await apiRequest('POST', '/api/prompts/test', { promptId, inputData });
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast({
        title: "프롬프트 테스트 완료",
        description: data.success ? "테스트가 성공적으로 실행되었습니다." : "테스트 실행 중 오류가 발생했습니다.",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setTestResult({ success: false, error: error.message || 'Unknown error' });
      toast({
        title: "테스트 실패",
        description: "프롬프트 테스트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTestRunning(false);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      systemPrompt: '',
      userPromptTemplate: '',
      parameters: {},
      executionType: 'text',
      inputSchema: null,
      outputSchema: null,
      azureOpenAIConfig: null
    });
    setEditingPrompt(null);
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description || '',
      category: prompt.category || '',
      systemPrompt: prompt.systemPrompt,
      userPromptTemplate: prompt.userPromptTemplate || '',
      parameters: prompt.parameters || {},
      executionType: prompt.executionType || 'text',
      inputSchema: prompt.inputSchema || null,
      outputSchema: prompt.outputSchema || null,
      azureOpenAIConfig: prompt.azureOpenAIConfig || null
    });
    setIsDialogOpen(true);
  };

  const generateSampleData = (schema: any): any => {
    if (!schema || !schema.properties) {
      return {};
    }

    const sampleData: any = {};
    
    Object.keys(schema.properties).forEach(key => {
      const property = schema.properties[key];
      
      switch (property.type) {
        case 'string':
          if (property.description) {
            sampleData[key] = property.description;
          } else if (key.includes('news')) {
            sampleData[key] = "삼성전자 주가 상승";
          } else if (key.includes('market')) {
            sampleData[key] = "KOSPI";
          } else if (key.includes('name')) {
            sampleData[key] = "삼성전자";
          } else {
            sampleData[key] = `샘플 ${key}`;
          }
          break;
        case 'number':
          sampleData[key] = Math.floor(Math.random() * 100);
          break;
        case 'boolean':
          sampleData[key] = true;
          break;
        case 'array':
          sampleData[key] = ["항목1", "항목2"];
          break;
        case 'object':
          sampleData[key] = generateSampleData(property);
          break;
        default:
          sampleData[key] = null;
      }
    });
    
    return sampleData;
  };

  const handleTestPrompt = () => {
    if (!editingPrompt) {
      toast({
        title: "프롬프트 선택 필요",
        description: "테스트할 프롬프트를 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsTestRunning(true);
    setTestResult(null);

    let inputData;
    try {
      inputData = testInputData ? JSON.parse(testInputData) : null;
    } catch (error) {
      toast({
        title: "JSON 파싱 오류",
        description: "입력 데이터가 올바른 JSON 형식이 아닙니다.",
        variant: "destructive",
      });
      setIsTestRunning(false);
      return;
    }

    testPromptMutation.mutate({ 
      promptId: editingPrompt.id, 
      inputData 
    });
  };

  const handleDelete = (promptId: string) => {
    if (confirm('정말로 이 프롬프트를 삭제하시겠습니까?')) {
      deletePromptMutation.mutate(promptId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 모든 탭의 필수 필드 검증
    
    // 기본 정보 탭 검증
    if (!formData.name || !formData.name.trim()) {
      toast({
        title: "필수 항목 누락",
        description: "기본 정보 탭: 프롬프트 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // 프롬프트 탭 검증
    if (!formData.systemPrompt || !formData.systemPrompt.trim()) {
      toast({
        title: "필수 항목 누락",
        description: "프롬프트 탭: 시스템 프롬프트를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // JSON 스키마 탭 검증 (executionType이 'json'일 때)
    if (formData.executionType === 'json') {
      // JSON 실행 타입일 때 입력/출력 스키마는 선택적이지만, 있다면 유효해야 함
      if (formData.inputSchema) {
        try {
          JSON.parse(JSON.stringify(formData.inputSchema)); // 유효성 검사
        } catch (error) {
          toast({
            title: "JSON 스키마 오류",
            description: "JSON 스키마 탭: 입력 JSON 스키마가 올바르지 않습니다.",
            variant: "destructive",
          });
          return;
        }
      }
      
      if (formData.outputSchema) {
        try {
          JSON.parse(JSON.stringify(formData.outputSchema)); // 유효성 검사
        } catch (error) {
          toast({
            title: "JSON 스키마 오류",
            description: "JSON 스키마 탭: 출력 JSON 스키마가 올바르지 않습니다.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    // 프롬프트 데이터 정리
    const promptDataToSave = {
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      category: formData.category || null,
      systemPrompt: formData.systemPrompt.trim(),
      userPromptTemplate: formData.userPromptTemplate?.trim() || null,
      parameters: formData.parameters || null,
      executionType: formData.executionType || 'text',
      inputSchema: formData.inputSchema || null,
      outputSchema: formData.outputSchema || null,
      azureOpenAIConfig: formData.azureOpenAIConfig || null,
      isActive: true
    };
    
    savePromptMutation.mutate(promptDataToSave);
  };

  const categories = [
    { value: 'news_analysis', label: '뉴스 분석' },
    { value: 'theme_analysis', label: '테마 분석' },
    { value: 'quantitative_analysis', label: '정량 분석' },
    { value: 'market_summary', label: '시장 요약' },
    { value: 'custom', label: '사용자 정의' }
  ];

  return (
    <div className="flex-1 overflow-hidden">
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">등록된 프롬프트</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} data-testid="button-add-prompt">
                <Plus className="w-4 h-4 mr-2" />
                새 프롬프트
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPrompt ? '프롬프트 편집' : '새 프롬프트 생성'}
                </DialogTitle>
                <DialogDescription>
                  {editingPrompt 
                    ? '기존 프롬프트를 수정합니다. 변경된 프롬프트는 워크플로우에서 자동으로 반영됩니다.' 
                    : '워크플로우에서 사용할 AI 프롬프트를 생성합니다. 시스템 프롬프트와 사용자 프롬프트 템플릿을 입력하면, 워크플로우 에디터의 프롬프트 노드에서 이 프롬프트를 선택하여 사용할 수 있습니다.'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">기본 정보</TabsTrigger>
                    <TabsTrigger value="prompts">프롬프트</TabsTrigger>
                    <TabsTrigger value="json">JSON 스키마</TabsTrigger>
                    <TabsTrigger value="test">테스트</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>워크플로우 연동:</strong> 여기서 생성한 프롬프트는 워크플로우 에디터의 "프롬프트" 노드에서 선택하여 사용할 수 있습니다. 프롬프트 노드 설정에서 이 프롬프트 ID를 선택하면, 워크플로우 실행 시 이 프롬프트가 자동으로 호출됩니다.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="prompt-name">프롬프트 이름 *</Label>
                        <Input
                          id="prompt-name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="예: 뉴스 감성 분석"
                          required
                          data-testid="input-prompt-name"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          워크플로우 노드에서 표시될 프롬프트 이름입니다.
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="prompt-category">카테고리</Label>
                        <Select 
                          value={formData.category} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger data-testid="select-prompt-category">
                            <SelectValue placeholder="카테고리 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          프롬프트를 분류하여 관리합니다.
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="prompt-description">설명</Label>
                      <Textarea
                        id="prompt-description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="프롬프트의 용도와 목적을 설명해주세요. 예: 뉴스 기사의 감성을 분석하여 긍정/부정/중립으로 분류합니다."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        이 프롬프트가 어떤 목적으로 사용되는지 설명해주세요.
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="execution-type">실행 타입</Label>
                      <Select 
                        value={formData.executionType} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, executionType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="실행 타입 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">텍스트</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>텍스트:</strong> 일반 텍스트 응답을 받습니다. <strong>JSON:</strong> 구조화된 JSON 응답을 받습니다. JSON 타입 선택 시 입력/출력 스키마를 정의해야 합니다.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="prompts" className="space-y-4">
                    <div>
                      <Label htmlFor="system-prompt">시스템 프롬프트 *</Label>
                      <Textarea
                        id="system-prompt"
                        value={formData.systemPrompt}
                        onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                        placeholder="시스템 역할 및 지침을 입력하세요. 예: 당신은 금융 시장 분석 전문가입니다. 뉴스 기사를 분석하여 시장에 미치는 영향을 평가하세요."
                        rows={6}
                        required
                        data-testid="textarea-system-prompt"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        AI의 역할과 행동 지침을 정의합니다. 워크플로우 실행 시 이 프롬프트가 시스템 메시지로 전달됩니다.
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="user-prompt-template">사용자 프롬프트 템플릿</Label>
                      <Textarea
                        id="user-prompt-template"
                        value={formData.userPromptTemplate}
                        onChange={(e) => setFormData(prev => ({ ...prev, userPromptTemplate: e.target.value }))}
                        placeholder="사용자 입력 템플릿 (변수 사용 가능: {{variable}}). 예: 다음 뉴스를 분석해주세요: {{news.title}}"
                        rows={4}
                        data-testid="textarea-user-prompt-template"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        워크플로우에서 이 프롬프트를 호출할 때 실제 데이터가 들어갈 자리를 {`{{변수명}}`} 형태로 정의합니다. 워크플로우 노드에서 이전 노드의 출력 데이터가 자동으로 변수로 치환됩니다. 예: {`{{news.title}}`}, {`{{market.data}}`}, {`{{previousNode.output}}`}
                      </p>
                      
                      {/* Template Variables Preview */}
                      {formData.userPromptTemplate && (() => {
                        const vars = extractTemplateVariables(formData.userPromptTemplate);
                        return vars.length > 0 ? (
                          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                            <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">템플릿 변수 ({vars.length}개):</Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {vars.map((variable, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="secondary" 
                                  className="text-xs"
                                >
                                  {`{{${variable.name}}}`}
                                  <span className="ml-1 text-muted-foreground">({variable.type})</span>
                                  {!variable.required && (
                                    <span className="ml-1 text-muted-foreground">[선택]</span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                            {formData.userPromptTemplate && (() => {
                              // Generate sample preview
                              let preview = formData.userPromptTemplate;
                              vars.forEach(v => {
                                let sampleValue = '';
                                switch (v.type) {
                                  case 'number':
                                    sampleValue = '100';
                                    break;
                                  case 'date':
                                    sampleValue = '2024-01-01';
                                    break;
                                  case 'boolean':
                                    sampleValue = 'true';
                                    break;
                                  case 'array':
                                    sampleValue = '[항목1, 항목2]';
                                    break;
                                  default:
                                    sampleValue = `샘플_${v.name}`;
                                }
                                preview = preview.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), sampleValue);
                              });
                              
                              return preview !== formData.userPromptTemplate ? (
                                <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs font-mono">
                                  <Label className="text-xs text-muted-foreground">미리보기:</Label>
                                  <div className="mt-1 text-foreground">{preview}</div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="json" className="space-y-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>JSON 실행 타입:</strong> 실행 타입을 "JSON"으로 선택한 경우에만 입력/출력 스키마를 정의하세요. 워크플로우에서 이 프롬프트를 호출할 때 입력 데이터가 이 스키마에 맞는지 자동으로 검증됩니다.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="input-schema">입력 JSON 스키마</Label>
                        <Textarea
                          id="input-schema"
                          value={formData.inputSchema ? JSON.stringify(formData.inputSchema, null, 2) : ''}
                          onChange={(e) => {
                            try {
                              const schema = e.target.value ? JSON.parse(e.target.value) : null;
                              setFormData(prev => ({ ...prev, inputSchema: schema }));
                            } catch (error) {
                              // JSON 파싱 에러는 무시 (사용자가 입력 중일 수 있음)
                            }
                          }}
                          placeholder='{"type": "object", "properties": {"news": {"type": "string", "description": "뉴스 제목"}}}'
                          rows={8}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          워크플로우에서 이 프롬프트 노드로 전달될 입력 데이터의 구조를 정의합니다. JSON Schema 형식을 따릅니다.
                        </p>
                        
                        {formData.inputSchema && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-md">
                            <Label className="text-sm font-medium text-blue-800">스키마 미리보기:</Label>
                            <div className="mt-1 text-xs text-blue-700">
                              <div className="font-mono">
                                {Object.keys(formData.inputSchema.properties || {}).map(key => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="font-semibold">{key}:</span>
                                    <span>{formData.inputSchema.properties[key].type}</span>
                                    {formData.inputSchema.properties[key].description && (
                                      <span className="text-gray-600">({formData.inputSchema.properties[key].description})</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="output-schema">출력 JSON 스키마</Label>
                        <Textarea
                          id="output-schema"
                          value={formData.outputSchema ? JSON.stringify(formData.outputSchema, null, 2) : ''}
                          onChange={(e) => {
                            try {
                              const schema = e.target.value ? JSON.parse(e.target.value) : null;
                              setFormData(prev => ({ ...prev, outputSchema: schema }));
                            } catch (error) {
                              // JSON 파싱 에러는 무시 (사용자가 입력 중일 수 있음)
                            }
                          }}
                          placeholder='{"type": "object", "properties": {"sentiment": {"type": "string", "description": "감성 분석 결과"}, "score": {"type": "number", "description": "감성 점수"}}}'
                          rows={8}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          AI가 반환할 출력 데이터의 구조를 정의합니다. 워크플로우 실행 시 이 스키마에 맞는지 검증하며, 다음 노드에서 이 데이터를 참조할 수 있습니다.
                        </p>
                        
                        {formData.outputSchema && (
                          <div className="mt-2 p-3 bg-green-50 rounded-md">
                            <Label className="text-sm font-medium text-green-800">스키마 미리보기:</Label>
                            <div className="mt-1 text-xs text-green-700">
                              <div className="font-mono">
                                {Object.keys(formData.outputSchema.properties || {}).map(key => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="font-semibold">{key}:</span>
                                    <span>{formData.outputSchema.properties[key].type}</span>
                                    {formData.outputSchema.properties[key].description && (
                                      <span className="text-gray-600">({formData.outputSchema.properties[key].description})</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="test" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label htmlFor="test-input">테스트 입력 데이터</Label>
                          {formData.inputSchema && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const sampleData = generateSampleData(formData.inputSchema);
                                setTestInputData(JSON.stringify(sampleData, null, 2));
                              }}
                            >
                              샘플 데이터 생성
                            </Button>
                          )}
                        </div>
                        <Textarea
                          id="test-input"
                          value={testInputData}
                          onChange={(e) => setTestInputData(e.target.value)}
                          placeholder='{"news": "삼성전자 주가 상승", "market": "KOSPI"}'
                          rows={4}
                          className="font-mono text-sm"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          프롬프트 테스트를 위한 JSON 입력 데이터를 입력하세요.
                        </p>
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        onClick={handleTestPrompt}
                        disabled={isTestRunning || !editingPrompt}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        {isTestRunning ? "테스트 실행 중..." : "프롬프트 테스트 실행"}
                      </Button>
                      
                      <div>
                        <Label>테스트 결과</Label>
                        <div className="border rounded-md p-4 bg-gray-50 min-h-[100px]">
                          {testResult ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant={testResult.success ? "default" : "destructive"}>
                                  {testResult.success ? "성공" : "실패"}
                                </Badge>
                                {testResult.executionTime && (
                                  <span className="text-sm text-gray-500">
                                    실행 시간: {testResult.executionTime}ms
                                  </span>
                                )}
                              </div>
                              
                              {testResult.success ? (
                                <div className="space-y-2">
                                  <div>
                                    <Label className="text-sm font-medium">결과:</Label>
                                    <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                                      {typeof testResult.result === 'object' 
                                        ? JSON.stringify(testResult.result, null, 2)
                                        : testResult.result}
                                    </pre>
                                  </div>
                                  
                                  {testResult.usage && (
                                    <div>
                                      <Label className="text-sm font-medium">토큰 사용량:</Label>
                                      <div className="text-xs text-gray-600">
                                        입력: {testResult.usage.promptTokens}, 
                                        출력: {testResult.usage.completionTokens}, 
                                        총합: {testResult.usage.totalTokens}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <Label className="text-sm font-medium text-red-600">오류:</Label>
                                  <p className="text-sm text-red-600">{testResult.error}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">테스트를 실행하면 결과가 여기에 표시됩니다.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-prompt"
                  >
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={savePromptMutation.isPending}
                    data-testid="button-save-prompt"
                  >
                    {savePromptMutation.isPending ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="프롬프트 이름, 설명, 내용으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="카테고리 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: 'name' | 'created' | 'category') => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="정렬 기준" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">최신순</SelectItem>
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="category">카테고리순</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {filteredAndSortedPrompts.length !== prompts?.length && (
              <div className="mt-2 text-sm text-muted-foreground">
                검색 결과: {filteredAndSortedPrompts.length}개 / 전체 {prompts?.length || 0}개
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prompts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4"></div>
                    <div className="h-20 bg-muted rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedPrompts && filteredAndSortedPrompts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedPrompts.map((prompt: Prompt) => {
              // Extract template variables for display
              const templateVars = extractTemplateVariables(prompt.userPromptTemplate || '');
              
              return (
              <Card key={prompt.id} className="hover:border-primary transition-colors" data-testid={`prompt-card-${prompt.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{prompt.name}</CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {prompt.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                            {categories.find(c => c.value === prompt.category)?.label || prompt.category}
                          </span>
                        )}
                        {prompt.executionType === 'json' && (
                          <Badge variant="secondary" className="text-xs">
                            <Code className="w-3 h-3 mr-1" />
                            JSON
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(prompt)}
                        className="w-8 h-8 p-0"
                        data-testid={`button-edit-prompt-${prompt.id}`}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(prompt.id)}
                        className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                        data-testid={`button-delete-prompt-${prompt.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {prompt.description && (
                    <p className="text-sm text-muted-foreground mb-3">{prompt.description}</p>
                  )}
                  <div className="bg-muted rounded p-3">
                    <p className="text-xs text-muted-foreground mb-1">시스템 프롬프트:</p>
                    <p className="text-xs text-foreground line-clamp-3">
                      {prompt.systemPrompt.substring(0, 120)}
                      {prompt.systemPrompt.length > 120 && '...'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                    <span>생성일: {prompt.createdAt ? new Date(prompt.createdAt).toLocaleDateString() : '알 수 없음'}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full font-semibold ${
                      prompt.isActive 
                        ? 'bg-green-900/20 text-green-300' 
                        : 'bg-red-900/20 text-red-300'
                    }`}>
                      {prompt.isActive ? '활성' : '비활성'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery || selectedCategory !== 'all' 
                  ? '검색 결과가 없습니다' 
                  : '등록된 프롬프트가 없습니다'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== 'all'
                  ? '검색 조건을 변경해보세요.'
                  : '새 프롬프트를 생성하여 AI 시황 분석을 시작하세요.'}
              </p>
              {(searchQuery || selectedCategory !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  필터 초기화
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
