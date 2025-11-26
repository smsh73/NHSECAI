import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Tag,
  Target,
  Smartphone,
  Mail,
  Globe,
  Save,
  Trash2,
  Plus,
  X
} from "lucide-react";
import { z } from "zod";

// 설정 스키마
const profileSettingsSchema = z.object({
  displayName: z.string().min(1, "표시 이름을 입력해주세요"),
  email: z.string().email("유효한 이메일을 입력해주세요"),
  investmentExperience: z.enum(['beginner', 'intermediate', 'expert']),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
  investmentGoal: z.string().optional(),
  preferredSectors: z.array(z.string()),
  tags: z.array(z.string())
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  priceAlerts: z.boolean(),
  newsAlerts: z.boolean(),
  analysisAlerts: z.boolean(),
  weeklyReport: z.boolean(),
  monthlyReport: z.boolean(),
  marketOpenAlert: z.boolean(),
  portfolioThreshold: z.number().min(0).max(100),
  quietHoursStart: z.string(),
  quietHoursEnd: z.string()
});

const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'private', 'friends']),
  showPortfolio: z.boolean(),
  showTradeHistory: z.boolean(),
  allowAnalytics: z.boolean(),
  shareDataForResearch: z.boolean(),
  anonymizeData: z.boolean(),
  dataRetentionPeriod: z.enum(['1year', '3years', '5years', 'forever'])
});

type ProfileSettings = z.infer<typeof profileSettingsSchema>;
type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
type PrivacySettings = z.infer<typeof privacySettingsSchema>;

export default function PersonalizationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newTag, setNewTag] = useState('');
  const [newSector, setNewSector] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy'>('profile');
  
  // Get authenticated user ID from auth context
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id || null;
  
  // Show login message if user is not authenticated
  if (!isAuthenticated || !user || !userId) {
    return (
      <div className="w-full px-6 py-6" data-testid="login-required">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">로그인이 필요합니다</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              개인화 설정을 이용하시려면 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 프로필 설정 폼
  const profileForm = useForm<ProfileSettings>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      displayName: '',
      email: '',
      investmentExperience: 'intermediate',
      riskTolerance: 'moderate',
      investmentGoal: '',
      preferredSectors: [],
      tags: []
    }
  });

  // 알림 설정 폼
  const notificationForm = useForm<NotificationSettings>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      priceAlerts: true,
      newsAlerts: true,
      analysisAlerts: false,
      weeklyReport: true,
      monthlyReport: true,
      marketOpenAlert: false,
      portfolioThreshold: 5,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00'
    }
  });

  // 프라이버시 설정 폼
  const privacyForm = useForm<PrivacySettings>({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: {
      profileVisibility: 'private',
      showPortfolio: false,
      showTradeHistory: false,
      allowAnalytics: true,
      shareDataForResearch: false,
      anonymizeData: true,
      dataRetentionPeriod: '3years'
    }
  });

  // 현재 설정 조회 - 실제 API 호출
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['/api/personalization', userId, 'settings'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/personalization/${userId}/settings`);
        if (!response.ok) {
          // API가 없는 경우 기본값 사용
          const defaultSettings = {
            profile: {
              displayName: "",
              email: "",
              investmentExperience: 'intermediate' as const,
              riskTolerance: 'moderate' as const,
              investmentGoal: "",
              preferredSectors: [],
              tags: []
            },
            notifications: {
              emailNotifications: true,
              pushNotifications: true,
              smsNotifications: false,
              priceAlerts: true,
              newsAlerts: true,
              analysisAlerts: false,
              weeklyReport: true,
              monthlyReport: true,
              marketOpenAlert: false,
              portfolioThreshold: 5,
              quietHoursStart: "22:00",
              quietHoursEnd: "08:00"
            },
            privacy: {
              profileVisibility: 'private' as const,
              showPortfolio: false,
              showTradeHistory: false,
              allowAnalytics: true,
              shareDataForResearch: false,
              anonymizeData: true,
              dataRetentionPeriod: '3years' as const
            }
          };
          
          profileForm.reset(defaultSettings.profile);
          notificationForm.reset(defaultSettings.notifications);
          privacyForm.reset(defaultSettings.privacy);
          
          return defaultSettings;
        }
        
        const settings = await response.json();
        
        // 폼에 기본값 설정
        if (settings.profile) profileForm.reset(settings.profile);
        if (settings.notifications) notificationForm.reset(settings.notifications);
        if (settings.privacy) privacyForm.reset(settings.privacy);
        
        return settings;
      } catch (error) {
        // 에러 발생 시 기본값 사용
        const defaultSettings = {
          profile: {
            displayName: "",
            email: "",
            investmentExperience: 'intermediate' as const,
            riskTolerance: 'moderate' as const,
            investmentGoal: "",
            preferredSectors: [],
            tags: []
          },
          notifications: {
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            priceAlerts: true,
            newsAlerts: true,
            analysisAlerts: false,
            weeklyReport: true,
            monthlyReport: true,
            marketOpenAlert: false,
            portfolioThreshold: 5,
            quietHoursStart: "22:00",
            quietHoursEnd: "08:00"
          },
          privacy: {
            profileVisibility: 'private' as const,
            showPortfolio: false,
            showTradeHistory: false,
            allowAnalytics: true,
            shareDataForResearch: false,
            anonymizeData: true,
            dataRetentionPeriod: '3years' as const
          }
        };
        
        profileForm.reset(defaultSettings.profile);
        notificationForm.reset(defaultSettings.notifications);
        privacyForm.reset(defaultSettings.privacy);
        
        return defaultSettings;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // 프로필 설정 저장 - 실제 API 호출
  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileSettings) => {
      const response = await apiRequest('PUT', `/api/personalization/${userId}/settings/profile`, data);
      if (!response.ok) {
        throw new Error('Failed to save profile settings');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'profile'] });
      toast({
        title: "프로필이 업데이트되었습니다.",
        description: "개인화 설정이 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "프로필 저장 실패",
        description: error.message || "프로필 저장에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // 알림 설정 저장 - 실제 API 호출
  const saveNotificationMutation = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      const response = await apiRequest('PUT', `/api/personalization/${userId}/settings/notifications`, data);
      if (!response.ok) {
        throw new Error('Failed to save notification settings');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'settings'] });
      toast({
        title: "알림 설정이 업데이트되었습니다.",
        description: "알림 설정이 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "알림 설정 저장 실패",
        description: error.message || "알림 설정 저장에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // 프라이버시 설정 저장 - 실제 API 호출
  const savePrivacyMutation = useMutation({
    mutationFn: async (data: PrivacySettings) => {
      const response = await apiRequest('PUT', `/api/personalization/${userId}/settings/privacy`, data);
      if (!response.ok) {
        throw new Error('Failed to save privacy settings');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personalization', userId, 'settings'] });
      toast({
        title: "프라이버시 설정이 업데이트되었습니다.",
        description: "개인정보 설정이 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "프라이버시 설정 저장 실패",
        description: error.message || "프라이버시 설정 저장에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // 태그 추가
  const addTag = () => {
    if (!newTag.trim()) return;
    const currentTags = profileForm.getValues('tags');
    if (!currentTags.includes(newTag.trim())) {
      profileForm.setValue('tags', [...currentTags, newTag.trim()]);
      setNewTag('');
    }
  };

  // 태그 제거
  const removeTag = (tagToRemove: string) => {
    const currentTags = profileForm.getValues('tags');
    profileForm.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  // 선호 섹터 추가
  const addSector = () => {
    if (!newSector.trim()) return;
    const currentSectors = profileForm.getValues('preferredSectors');
    if (!currentSectors.includes(newSector.trim())) {
      profileForm.setValue('preferredSectors', [...currentSectors, newSector.trim()]);
      setNewSector('');
    }
  };

  // 선호 섹터 제거
  const removeSector = (sectorToRemove: string) => {
    const currentSectors = profileForm.getValues('preferredSectors');
    profileForm.setValue('preferredSectors', currentSectors.filter(sector => sector !== sectorToRemove));
  };

  if (isLoading) {
    return (
      <div className="w-full px-6 py-6">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-10 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6" data-testid="personalization-settings">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            개인화 설정
          </h1>
          <p className="text-muted-foreground mt-1">
            투자 성향과 알림 설정을 관리하여 맞춤형 서비스를 받아보세요
          </p>
        </div>
      </div>

      {/* 설정 탭 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'profile' | 'notifications' | 'privacy')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" data-testid="profile-tab">
            <User className="h-4 w-4 mr-2" />
            프로필 설정
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="notifications-tab">
            <Bell className="h-4 w-4 mr-2" />
            알림 설정
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="privacy-tab">
            <Shield className="h-4 w-4 mr-2" />
            프라이버시
          </TabsTrigger>
        </TabsList>

        {/* 프로필 설정 탭 */}
        <TabsContent value="profile" className="space-y-6" data-testid="profile-content">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => saveProfileMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>표시 이름</FormLabel>
                          <FormControl>
                            <Input placeholder="홍길동" {...field} data-testid="display-name-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이메일</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} data-testid="email-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="investmentExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>투자 경험</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="investment-experience-select">
                                <SelectValue placeholder="투자 경험을 선택하세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">초보자 (1년 미만)</SelectItem>
                              <SelectItem value="intermediate">중급자 (1-5년)</SelectItem>
                              <SelectItem value="expert">전문가 (5년 이상)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="riskTolerance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>위험 성향</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="risk-tolerance-select">
                                <SelectValue placeholder="위험 성향을 선택하세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="conservative">보수적 (안정성 중시)</SelectItem>
                              <SelectItem value="moderate">적극적 (균형 추구)</SelectItem>
                              <SelectItem value="aggressive">공격적 (고수익 추구)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="investmentGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>투자 목표</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="투자 목표와 계획을 간단히 설명해주세요..." 
                            className="resize-none" 
                            {...field} 
                            data-testid="investment-goal-textarea"
                          />
                        </FormControl>
                        <FormDescription>
                          투자 목표를 설정하면 더 정확한 맞춤 추천을 받을 수 있습니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={saveProfileMutation.isPending}
                    data-testid="save-profile-button"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveProfileMutation.isPending ? '저장 중...' : '프로필 저장'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* 선호 섹터 설정 */}
          <Card>
            <CardHeader>
              <CardTitle>선호 섹터</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {profileForm.watch('preferredSectors').map((sector) => (
                  <Badge key={sector} variant="secondary" className="text-sm">
                    {sector}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-auto p-0"
                      onClick={() => removeSector(sector)}
                      data-testid={`remove-sector-${sector.replace(' ', '-').toLowerCase()}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="새 섹터 추가..."
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSector()}
                  data-testid="new-sector-input"
                />
                <Button onClick={addSector} size="sm" data-testid="add-sector-button">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 투자 태그 설정 */}
          <Card>
            <CardHeader>
              <CardTitle>투자 태그</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {profileForm.watch('tags').map((tag) => (
                  <Badge key={tag} variant="outline" className="text-sm">
                    #{tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-auto p-0"
                      onClick={() => removeTag(tag)}
                      data-testid={`remove-tag-${tag.replace(' ', '-').toLowerCase()}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="새 태그 추가..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  data-testid="new-tag-input"
                />
                <Button onClick={addTag} size="sm" data-testid="add-tag-button">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 알림 설정 탭 */}
        <TabsContent value="notifications" className="space-y-6" data-testid="notifications-content">
          <Card>
            <CardHeader>
              <CardTitle>알림 수신 방법</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit((data) => saveNotificationMutation.mutate(data))} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>이메일 알림</FormLabel>
                            <FormDescription>중요한 정보를 이메일로 받아보세요</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="email-notifications-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="pushNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>푸시 알림</FormLabel>
                            <FormDescription>실시간 정보를 즉시 받아보세요</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="push-notifications-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="smsNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>SMS 알림</FormLabel>
                            <FormDescription>긴급한 정보를 문자로 받아보세요</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="sms-notifications-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">알림 유형</h4>
                    <FormField
                      control={notificationForm.control}
                      name="priceAlerts"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>가격 알림</FormLabel>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="price-alerts-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="newsAlerts"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>뉴스 알림</FormLabel>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="news-alerts-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="analysisAlerts"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>분석 리포트 알림</FormLabel>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="analysis-alerts-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">정기 리포트</h4>
                    <FormField
                      control={notificationForm.control}
                      name="weeklyReport"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>주간 리포트</FormLabel>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="weekly-report-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationForm.control}
                      name="monthlyReport"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>월간 리포트</FormLabel>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="monthly-report-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={saveNotificationMutation.isPending}
                    data-testid="save-notifications-button"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveNotificationMutation.isPending ? '저장 중...' : '알림 설정 저장'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 프라이버시 설정 탭 */}
        <TabsContent value="privacy" className="space-y-6" data-testid="privacy-content">
          <Card>
            <CardHeader>
              <CardTitle>개인정보 보호</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...privacyForm}>
                <form onSubmit={privacyForm.handleSubmit((data) => savePrivacyMutation.mutate(data))} className="space-y-6">
                  <FormField
                    control={privacyForm.control}
                    name="profileVisibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>프로필 공개 범위</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="profile-visibility-select">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">전체 공개</SelectItem>
                            <SelectItem value="friends">친구에게만 공개</SelectItem>
                            <SelectItem value="private">비공개</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          다른 사용자에게 표시될 정보의 범위를 설정합니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={privacyForm.control}
                      name="showPortfolio"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>포트폴리오 공개</FormLabel>
                            <FormDescription>보유종목과 수익률 정보를 공개합니다</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="show-portfolio-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={privacyForm.control}
                      name="showTradeHistory"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>매매이력 공개</FormLabel>
                            <FormDescription>거래 내역과 성과를 공개합니다</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="show-trade-history-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">데이터 사용</h4>
                    <FormField
                      control={privacyForm.control}
                      name="allowAnalytics"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>서비스 개선을 위한 데이터 분석 허용</FormLabel>
                            <FormDescription>익명화된 데이터로 서비스 품질 향상에 활용</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="allow-analytics-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={privacyForm.control}
                      name="shareDataForResearch"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>연구 목적 데이터 제공</FormLabel>
                            <FormDescription>학술 연구나 시장 분석에 활용</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="share-data-research-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={privacyForm.control}
                      name="anonymizeData"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>데이터 익명화</FormLabel>
                            <FormDescription>개인 식별 정보를 제거하여 데이터 보호</FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              data-testid="anonymize-data-switch"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={privacyForm.control}
                    name="dataRetentionPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>데이터 보관 기간</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="data-retention-select">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1year">1년</SelectItem>
                            <SelectItem value="3years">3년</SelectItem>
                            <SelectItem value="5years">5년</SelectItem>
                            <SelectItem value="forever">영구 보관</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          계정 삭제 후 데이터를 보관할 기간입니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={savePrivacyMutation.isPending}
                    data-testid="save-privacy-button"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savePrivacyMutation.isPending ? '저장 중...' : '프라이버시 설정 저장'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* 계정 관리 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">위험 구역</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-medium text-red-800">모든 개인화 데이터 초기화</h4>
                  <p className="text-sm text-red-600">설정, 관심종목, 태그 등 모든 개인화 정보가 삭제됩니다.</p>
                </div>
                <Button variant="destructive" size="sm" data-testid="reset-data-button">
                  <Trash2 className="h-4 w-4 mr-2" />
                  데이터 초기화
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}