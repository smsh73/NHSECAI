import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Star, StarOff, Bell, BellOff, Plus, Trash2, Search, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const addWatchlistSchema = z.object({
  symbol: z.string().min(1, "종목코드를 입력해주세요"),
  priceAlert: z.boolean().optional(),
  priceThreshold: z.number().optional(),
  newsAlert: z.boolean().optional(),
});

type AddWatchlistFormData = z.infer<typeof addWatchlistSchema>;

interface WatchlistManagerProps {
  watchlist: Array<{
    id: string;
    symbol: string;
    symbolName: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    priceAlert: boolean;
    priceThreshold?: number;
    newsAlert: boolean;
    addedAt: string;
    theme?: string;
  }>;
  onAddToWatchlist: (data: AddWatchlistFormData) => Promise<void>;
  onRemoveFromWatchlist: (id: string) => Promise<void>;
  onUpdateAlert: (id: string, type: 'price' | 'news', enabled: boolean, threshold?: number) => Promise<void>;
  isLoading?: boolean;
}

export function WatchlistManager({
  watchlist,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onUpdateAlert,
  isLoading
}: WatchlistManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTheme, setFilterTheme] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'change' | 'addedAt'>('addedAt');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const form = useForm<AddWatchlistFormData>({
    resolver: zodResolver(addWatchlistSchema),
    defaultValues: {
      symbol: '',
      priceAlert: false,
      newsAlert: false,
    }
  });

  const handleAddWatchlist = async (data: AddWatchlistFormData) => {
    try {
      await onAddToWatchlist(data);
      form.reset();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('관심종목 추가 실패:', error);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '₩0';
    }
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // 필터링 및 정렬
  const filteredWatchlist = watchlist
    .filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.symbolName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTheme = filterTheme === 'all' || item.theme === filterTheme;
      return matchesSearch && matchesTheme;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.symbolName || '').localeCompare(b.symbolName || '');
        case 'change':
          const aChange = a.changePercent ?? 0;
          const bChange = b.changePercent ?? 0;
          return bChange - aChange;
        case 'addedAt':
          const aTime = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const bTime = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          return bTime - aTime;
        default:
          return 0;
      }
    });

  const themes = ['all', ...Array.from(new Set(watchlist.map(w => w.theme).filter(Boolean)))];

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="watchlist-manager">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">관심종목 관리</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="add-watchlist-button">
                <Plus className="h-4 w-4 mr-2" />
                종목 추가
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-watchlist-dialog">
              <DialogHeader>
                <DialogTitle>관심종목 추가</DialogTitle>
                <DialogDescription>
                  관심종목으로 추가할 종목과 알림 설정을 선택해주세요.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddWatchlist)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="symbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>종목코드</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 005930" {...field} data-testid="symbol-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priceAlert"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>가격 알림</FormLabel>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            data-testid="price-alert-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {form.watch('priceAlert') && (
                    <FormField
                      control={form.control}
                      name="priceThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>알림 가격</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="알림받을 가격을 입력하세요" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="price-threshold-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="newsAlert"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>뉴스 알림</FormLabel>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            data-testid="news-alert-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                      data-testid="cancel-button"
                    >
                      취소
                    </Button>
                    <Button type="submit" data-testid="submit-button">
                      추가
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 검색 및 필터 */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="종목명 또는 코드 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
          <Select value={filterTheme} onValueChange={setFilterTheme}>
            <SelectTrigger className="w-32" data-testid="theme-filter">
              <SelectValue placeholder="테마" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {themes.slice(1).map(theme => (
                <SelectItem key={theme} value={theme!}>{theme}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: 'name' | 'change' | 'addedAt') => setSortBy(value)}>
            <SelectTrigger className="w-32" data-testid="sort-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="addedAt">추가순</SelectItem>
              <SelectItem value="name">이름순</SelectItem>
              <SelectItem value="change">수익률순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 관심종목 목록 */}
        <div className="space-y-3">
          {filteredWatchlist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-watchlist">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>관심종목이 없습니다.</p>
              <p className="text-sm">종목을 추가해보세요.</p>
            </div>
          ) : (
            filteredWatchlist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                data-testid={`watchlist-item-${item.symbol}`}
              >
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{item.symbolName}</span>
                      <Badge variant="outline" className="text-xs">{item.symbol}</Badge>
                      {item.theme && (
                        <Badge variant="secondary" className="text-xs">{item.theme}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      추가일: {new Date(item.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {/* 현재가 및 변동률 */}
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(item.currentPrice)}</div>
                    <div className={cn(
                      "text-sm flex items-center",
                      (item.change || 0) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {(item.change || 0) >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {formatPercent(item.changePercent)}
                    </div>
                  </div>

                  {/* 알림 설정 */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateAlert(item.id, 'price', !item.priceAlert)}
                      data-testid={`price-alert-${item.symbol}`}
                    >
                      {item.priceAlert ? (
                        <Bell className="h-4 w-4 text-blue-600" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateAlert(item.id, 'news', !item.newsAlert)}
                      data-testid={`news-alert-${item.symbol}`}
                    >
                      {item.newsAlert ? (
                        <Star className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFromWatchlist(item.id)}
                      data-testid={`remove-${item.symbol}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}