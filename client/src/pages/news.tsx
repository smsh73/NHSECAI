import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  ArrowLeft,
  Calendar,
  TrendingUp,
  Newspaper,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface NewsItem {
  id: string;
  nid?: string;
  title: string;
  content: string;
  summary?: string;
  source?: string;
  reporter?: string;
  category?: string;
  subcategory?: string;
  sentiment?: string;
  sentimentScore?: number;
  economicScore?: number;
  marketScore?: number;
  importanceScore?: number;
  relevantSymbols?: string[];
  relevantIndices?: string[];
  relevantThemes?: string[];
  keywords?: string[];
  entities?: string[];
  marketEvents?: string[];
  eventCategories?: string[];
  publishedAt: string | Date;
  crawledAt?: string | Date;
  processedAt?: string | Date;
  isProcessed?: boolean;
  isFiltered?: boolean;
  isHighQuality?: boolean;
}

interface NewsListResponse {
  success: boolean;
  data: NewsItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

function NewsSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-start space-x-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </Card>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const getCategoryInfo = () => {
    switch (item.category) {
      case 'market':
        return { label: '시장', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' };
      case 'economic':
        return { label: '경제', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' };
      case 'corporate':
        return { label: '기업', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' };
      case 'global':
        return { label: '해외', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' };
      default:
        return { label: item.category || '뉴스', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' };
    }
  };

  const getSentimentInfo = () => {
    switch (item.sentiment) {
      case 'positive':
        return { label: '긍정', color: 'text-green-600 dark:text-green-400' };
      case 'negative':
        return { label: '부정', color: 'text-red-600 dark:text-red-400' };
      case 'neutral':
        return { label: '중립', color: 'text-gray-600 dark:text-gray-400' };
      default:
        return { label: item.sentiment || '분석없음', color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const formatTime = () => {
    const publishedAt = item.publishedAt instanceof Date 
      ? item.publishedAt 
      : new Date(item.publishedAt);
    const now = new Date();
    const diff = now.getTime() - publishedAt.getTime();
    
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;
    return publishedAt.toLocaleDateString('ko-KR');
  };

  const categoryInfo = getCategoryInfo();
  const sentimentInfo = getSentimentInfo();
  const publishedAt = item.publishedAt instanceof Date 
    ? item.publishedAt 
    : new Date(item.publishedAt);

  return (
    <Card className={cn(
      "group relative overflow-hidden cursor-pointer transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-0.5",
      "bg-card border border-black/10 dark:border-white/10",
      "shadow-sm"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            {item.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                {item.summary}
              </p>
            )}
          </div>
          {item.isHighQuality && (
            <Badge className="ml-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
              고품질
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge className={cn("text-xs", categoryInfo.color)}>
            {categoryInfo.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {sentimentInfo.label}
          </Badge>
          {item.source && (
            <span className="text-xs text-muted-foreground">
              {item.source}
            </span>
          )}
          {item.reporter && (
            <span className="text-xs text-muted-foreground">
              {item.reporter}
            </span>
          )}
        </div>

        {item.keywords && item.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {item.keywords.slice(0, 5).map((keyword, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
            {item.keywords.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{item.keywords.length - 5}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{formatTime()}</span>
            {publishedAt && (
              <span className="ml-2">
                {publishedAt.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              자세히
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NewsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, error, refetch } = useQuery<NewsListResponse>({
    queryKey: ['/api/news', { 
      limit, 
      offset: page * limit, 
      search: searchQuery || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      sentiment: sentimentFilter !== 'all' ? sentimentFilter : undefined
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      if (sentimentFilter !== 'all') {
        params.append('sentiment', sentimentFilter);
      }

      const response = await apiRequest('GET', `/api/news?${params.toString()}`);
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleSearch = () => {
    setPage(0);
    refetch();
  };

  const handleFilterChange = () => {
    setPage(0);
    refetch();
  };

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                뒤로
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">전체 뉴스</h1>
          </div>
          <p className="text-muted-foreground">
            Databricks에서 수집된 최신 시장 뉴스를 확인하세요
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="뉴스 제목, 내용 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={(value) => {
              setCategoryFilter(value);
              handleFilterChange();
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="market">시장</SelectItem>
                <SelectItem value="economic">경제</SelectItem>
                <SelectItem value="corporate">기업</SelectItem>
                <SelectItem value="global">해외</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sentimentFilter} onValueChange={(value) => {
              setSentimentFilter(value);
              handleFilterChange();
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="감정" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="positive">긍정</SelectItem>
                <SelectItem value="negative">부정</SelectItem>
                <SelectItem value="neutral">중립</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="gap-2">
              <Search className="w-4 h-4" />
              검색
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {data && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span>총 {data.pagination.total.toLocaleString()}건</span>
          <span>현재 페이지: {page + 1} / {Math.ceil(data.pagination.total / limit)}</span>
        </div>
      )}

      {/* Content */}
      {error && (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>뉴스 데이터를 불러오는 중 오류가 발생했습니다.</p>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <NewsSkeleton key={index} />
          ))}
        </div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-6">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {Math.ceil(data.pagination.total / limit)}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={!data.pagination.hasMore}
            >
              다음
            </Button>
          </div>
        </>
      ) : (
        <Card className="p-12 text-center">
          <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">뉴스가 없습니다</h3>
          <p className="text-muted-foreground">
            {searchQuery || categoryFilter !== 'all' || sentimentFilter !== 'all'
              ? '검색 조건에 맞는 뉴스가 없습니다.'
              : '아직 수집된 뉴스가 없습니다.'}
          </p>
        </Card>
      )}
    </div>
  );
}

