import { useState } from "react";
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
import { PythonScript } from "@shared/schema";
import { Plus, Edit, Trash2, Code2, TestTube } from "lucide-react";

export default function PythonManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<PythonScript | null>(null);
  const [testInputData, setTestInputData] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    pythonScript: '',
    pythonRequirements: '',
    pythonTimeout: 30,
    pythonEnvironment: 'python3',
    pythonInputFormat: 'json',
    pythonOutputFormat: 'json',
    pythonWorkingDirectory: '',
    pythonMemoryLimit: 512,
    pythonCpuLimit: 50,
    tags: [] as string[],
    exampleInput: null,
    exampleOutput: null
  });

  // Fetch Python scripts
  const { data: pythonScripts, isLoading } = useQuery<PythonScript[]>({
    queryKey: ['/api/python-scripts'],
  });

  // Create/Update Python script mutation
  const saveScriptMutation = useMutation({
    mutationFn: async (scriptData: any) => {
      const method = editingScript ? 'PUT' : 'POST';
      const url = editingScript ? `/api/python-scripts/${editingScript.id}` : '/api/python-scripts';
      
      // Clean data: trim strings, remove undefined fields
      const cleanedData: any = {};
      Object.keys(scriptData).forEach(key => {
        const value = scriptData[key];
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string') {
            cleanedData[key] = value.trim();
          } else {
            cleanedData[key] = value;
          }
        }
      });
      
      const response = await apiRequest(method, url, cleanedData);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || `Python 스크립트 저장 실패: ${response.status}`);
      }
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/python-scripts'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Python 스크립트 저장 완료",
        description: "Python 스크립트가 성공적으로 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Python 스크립트 저장 중 오류가 발생했습니다.";
      toast({
        title: "저장 실패",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Delete Python script mutation
  const deleteScriptMutation = useMutation({
    mutationFn: async (scriptId: string) => {
      const response = await apiRequest('DELETE', `/api/python-scripts/${scriptId}`);
      // 204 No Content 응답은 본문이 없으므로 상태 코드만 확인
      if (response.status === 204 || response.ok) {
        return { success: true };
      }
      // 에러 응답인 경우에만 JSON 파싱 시도
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Python 스크립트 삭제 실패: ${response.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/python-scripts'] });
      toast({
        title: "Python 스크립트 삭제 완료",
        description: "Python 스크립트가 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error?.message || "Python 스크립트 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      pythonScript: '',
      pythonRequirements: '',
      pythonTimeout: 30,
      pythonEnvironment: 'python3',
      pythonInputFormat: 'json',
      pythonOutputFormat: 'json',
      pythonWorkingDirectory: '',
      pythonMemoryLimit: 512,
      pythonCpuLimit: 50,
      tags: [],
      exampleInput: null,
      exampleOutput: null
    });
    setEditingScript(null);
  };

  const handleEdit = (script: PythonScript) => {
    setEditingScript(script);
    setFormData({
      name: script.name,
      description: script.description || '',
      category: script.category || '',
      pythonScript: script.pythonScript,
      pythonRequirements: script.pythonRequirements || '',
      pythonTimeout: script.pythonTimeout || 30,
      pythonEnvironment: script.pythonEnvironment || 'python3',
      pythonInputFormat: script.pythonInputFormat || 'json',
      pythonOutputFormat: script.pythonOutputFormat || 'json',
      pythonWorkingDirectory: script.pythonWorkingDirectory || '',
      pythonMemoryLimit: script.pythonMemoryLimit || 512,
      pythonCpuLimit: script.pythonCpuLimit || 50,
      tags: script.tags || [],
      exampleInput: script.exampleInput || null,
      exampleOutput: script.exampleOutput || null
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    // 모든 탭의 필수 필드 검증
    
    // 기본 정보 탭 검증
    if (!formData.name.trim()) {
      toast({
        title: "필수 항목 누락",
        description: "기본 정보 탭: Python 스크립트 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Python 코드 탭 검증
    if (!formData.pythonScript.trim()) {
      toast({
        title: "필수 항목 누락",
        description: "Python 코드 탭: Python 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    saveScriptMutation.mutate(formData);
  };

  const handleDelete = (script: PythonScript) => {
    if (confirm(`정말로 "${script.name}" Python 스크립트를 삭제하시겠습니까?`)) {
      deleteScriptMutation.mutate(script.id);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Python 스크립트 관리</h1>
          <p className="text-muted-foreground mt-2">
            워크플로우에서 사용할 Python 스크립트를 등록하고 관리합니다.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Python 스크립트 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingScript ? 'Python 스크립트 수정' : 'Python 스크립트 추가'}
              </DialogTitle>
              <DialogDescription>
                워크플로우 에디터에서 사용할 Python 스크립트를 정의합니다. 등록된 스크립트는 워크플로우 노드로 드래그하여 추가할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList>
                <TabsTrigger value="basic">기본 정보</TabsTrigger>
                <TabsTrigger value="script">Python 코드</TabsTrigger>
                <TabsTrigger value="config">실행 설정</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Python 스크립트 이름 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="예: 데이터 변환 스크립트"
                  />
                  <p className="text-xs text-muted-foreground">
                    워크플로우 에디터에서 표시될 이름입니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="이 Python 스크립트의 용도를 설명해주세요."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    스크립트의 목적과 사용 방법을 간단히 설명해주세요.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">카테고리</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="데이터처리">데이터처리</SelectItem>
                      <SelectItem value="분석">분석</SelectItem>
                      <SelectItem value="변환">변환</SelectItem>
                      <SelectItem value="집계">집계</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    스크립트의 용도를 분류합니다.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="script" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="python-script">Python 코드 *</Label>
                  <Textarea
                    id="python-script"
                    value={formData.pythonScript}
                    onChange={(e) => handleInputChange('pythonScript', e.target.value)}
                    placeholder="# Python 코드를 입력하세요
# 입력 데이터는 input_data 변수로 접근 가능합니다
# 결과는 result, output, 또는 processed_data 변수에 저장하세요

import json

# 입력 데이터 처리
data = input_data if 'input_data' in globals() else {}

# 처리 로직
result = {
    'processed': True,
    'data': data
}

# 결과 반환
output = result"
                    rows={20}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    입력 데이터는 <code className="text-xs bg-muted px-1 py-0.5 rounded">input_data</code> 변수로 접근할 수 있습니다. 
                    결과는 <code className="text-xs bg-muted px-1 py-0.5 rounded">result</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">output</code>, 또는 <code className="text-xs bg-muted px-1 py-0.5 rounded">processed_data</code> 변수에 저장하세요.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="python-requirements">Python 패키지 요구사항 (선택사항)</Label>
                  <Textarea
                    id="python-requirements"
                    value={formData.pythonRequirements}
                    onChange={(e) => handleInputChange('pythonRequirements', e.target.value)}
                    placeholder="pandas==2.0.3
numpy==1.24.3
requests==2.31.0"
                    rows={8}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    필요한 Python 패키지를 requirements.txt 형식으로 입력하세요.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="config" className="space-y-4">
                {/* Execution Settings */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2 font-medium">실행 설정</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    스크립트 실행 시 리소스 제한을 설정합니다. 메모리 부족이나 무한 루프를 방지하기 위해 적절한 값을 설정하세요.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="python-timeout">실행 타임아웃 (초) *</Label>
                    <Input
                      id="python-timeout"
                      type="number"
                      min="1"
                      max="3600"
                      step="1"
                      value={formData.pythonTimeout}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 30;
                        if (value >= 1 && value <= 3600) {
                          handleInputChange('pythonTimeout', value);
                        }
                      }}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>스크립트 실행 최대 시간입니다.</span>
                      <span className={formData.pythonTimeout > 300 ? 'text-orange-600' : ''}>
                        {formData.pythonTimeout > 300 ? '⚠️ 긴 타임아웃' : '✓ 권장 범위'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="python-environment">Python 환경 *</Label>
                    <Select value={formData.pythonEnvironment} onValueChange={(value) => handleInputChange('pythonEnvironment', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python3">python3 (기본)</SelectItem>
                        <SelectItem value="python3.11">python3.11</SelectItem>
                        <SelectItem value="python3.12">python3.12</SelectItem>
                        <SelectItem value="python3.10">python3.10</SelectItem>
                        <SelectItem value="python3.9">python3.9</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      사용할 Python 인터프리터 버전입니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="python-input-format">입력 형식</Label>
                    <Select value={formData.pythonInputFormat} onValueChange={(value) => handleInputChange('pythonInputFormat', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      입력 데이터의 형식입니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="python-output-format">출력 형식</Label>
                    <Select value={formData.pythonOutputFormat} onValueChange={(value) => handleInputChange('pythonOutputFormat', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      출력 데이터의 형식입니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="python-memory-limit">메모리 제한 (MB)</Label>
                    <Input
                      id="python-memory-limit"
                      type="number"
                      min="64"
                      max="8192"
                      value={formData.pythonMemoryLimit}
                      onChange={(e) => handleInputChange('pythonMemoryLimit', parseInt(e.target.value) || 512)}
                    />
                    <p className="text-xs text-muted-foreground">
                      스크립트 실행 시 사용 가능한 최대 메모리입니다.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="python-cpu-limit">CPU 제한 (%)</Label>
                    <Input
                      id="python-cpu-limit"
                      type="number"
                      min="10"
                      max="100"
                      value={formData.pythonCpuLimit}
                      onChange={(e) => handleInputChange('pythonCpuLimit', parseInt(e.target.value) || 50)}
                    />
                    <p className="text-xs text-muted-foreground">
                      스크립트 실행 시 사용 가능한 최대 CPU 사용률입니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="python-working-directory">작업 디렉토리 (선택사항)</Label>
                  <Input
                    id="python-working-directory"
                    value={formData.pythonWorkingDirectory}
                    onChange={(e) => handleInputChange('pythonWorkingDirectory', e.target.value)}
                    placeholder="/tmp/python-scripts"
                  />
                  <p className="text-xs text-muted-foreground">
                    스크립트 실행 시 작업 디렉토리입니다. 비워두면 기본 디렉토리를 사용합니다.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saveScriptMutation.isPending}>
                {saveScriptMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Python 스크립트 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : !pythonScripts || pythonScripts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 Python 스크립트가 없습니다. 위의 "Python 스크립트 추가" 버튼을 클릭하여 새 스크립트를 추가하세요.
            </div>
          ) : (
            <div className="space-y-4">
              {pythonScripts.map((script) => (
                <Card key={script.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Code2 className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-lg">{script.name}</h3>
                          {!script.isActive && (
                            <Badge variant="secondary">비활성</Badge>
                          )}
                          {script.category && (
                            <Badge variant="outline">{script.category}</Badge>
                          )}
                        </div>
                        {script.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {script.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>환경: {script.pythonEnvironment}</span>
                          <span>•</span>
                          <span>타임아웃: {script.pythonTimeout}초</span>
                          <span>•</span>
                          <span>입력: {script.pythonInputFormat}</span>
                          <span>•</span>
                          <span>출력: {script.pythonOutputFormat}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(script)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(script)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

