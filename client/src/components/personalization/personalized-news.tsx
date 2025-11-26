import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Clock, ExternalLink, Search, Filter, Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalizedNewsProps {
  news: Array<{
    id: string;
    title: string;
    summary: string;
    source: string;
    publishedAt: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    relevantSymbols: string[];
    marketScore: number;
    economicScore: number;
    themeClusterId?: string;
    themeName?: string;
    isBookmarked: boolean;
    url?: string;
  }>;
  onBookmarkToggle: (newsId: string, isBookmarked: boolean) => Promise<void>;
  onLoadMore: () => Promise<void>;
  userInterests: {
    symbols: string[];
    themes: string[];
    tags: string[];
  };
  isLoading?: boolean;
  hasMore?: boolean;
}

export function PersonalizedNews({
  news,
  onBookmarkToggle,
  onLoadMore,
  userInterests,
  isLoading = false,
  hasMore = true
}: PersonalizedNewsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'publishedAt' | 'marketScore' | 'economicScore'>('publishedAt');

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const published = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - published.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '긍정';
      case 'negative': return '부정';
      default: return '중립';
    }
  };

  // 필터링 및 정렬
  const filteredNews = news
    .filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSentiment = sentimentFilter === 'all' || item.sentiment === sentimentFilter;
      const matchesSource = sourceFilter === 'all' || item.source === sourceFilter;
      return matchesSearch && matchesSentiment && matchesSource;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'publishedAt':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'marketScore':
          return b.marketScore - a.marketScore;
        case 'economicScore':
          return b.economicScore - a.economicScore;
        default:
          return 0;
      }
    });

  const sources = ['all', ...Array.from(new Set(news.map(n => n.source)))];

  if (isLoading && news.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-40 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="personalized-news">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">맞춤 뉴스 피드</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-muted-foreground">
              {userInterests.symbols.length > 0 && (
                <span>관심종목 {userInterests.symbols.length}개</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 검색 및 필터 */}
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="뉴스 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="news-search-input"
            />
          </div>
          <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
            <SelectTrigger className="w-32" data-testid="sentiment-filter">
              <SelectValue placeholder="감정" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="positive">긍정</SelectItem>
              <SelectItem value="neutral">중립</SelectItem>
              <SelectItem value="negative">부정</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-32" data-testid="source-filter">
              <SelectValue placeholder="언론사" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {sources.slice(1).map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: 'publishedAt' | 'marketScore' | 'economicScore') => setSortBy(value)}>
            <SelectTrigger className="w-32" data-testid="sort-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publishedAt">최신순</SelectItem>
              <SelectItem value="marketScore">시장영향순</SelectItem>
              <SelectItem value="economicScore">경제점수순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 사용자 관심사 요약 */}
        {userInterests.symbols.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg" data-testid="user-interests-summary">
            <div className="text-sm text-muted-foreground mb-2">맞춤 설정 기반</div>
            <div className="flex flex-wrap gap-1">
              {userInterests.symbols.map(symbol => (
                <Badge key={symbol} variant="outline" className="text-xs">
                  {symbol}
                </Badge>
              ))}
              {userInterests.themes.map(theme => (
                <Badge key={theme} variant="secondary" className="text-xs">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 뉴스 목록 */}
        <div className="space-y-4">
          {filteredNews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-news">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>조건에 맞는 뉴스가 없습니다.</p>
              <p className="text-sm">필터를 조정해보세요.</p>
            </div>
          ) : (
            filteredNews.map((item) => (
              <div
                key={item.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                data-testid={`news-item-${item.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* 뉴스 헤더 */}
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getSentimentColor(item.sentiment))}
                      >
                        {getSentimentLabel(item.sentiment)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{item.source}</span>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeAgo(item.publishedAt)}
                      </div>
                    </div>

                    {/* 뉴스 제목 */}
                    <h3 className="font-medium text-lg mb-2 leading-tight">
                      {item.title}
                    </h3>

                    {/* 뉴스 요약 */}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.summary}
                    </p>

                    {/* 연관 정보 */}
                    <div className="flex items-center space-x-4 text-xs">
                      {item.relevantSymbols.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-muted-foreground">연관종목:</span>
                          {item.relevantSymbols.slice(0, 3).map(symbol => (
                            <Badge key={symbol} variant="outline" className="text-xs">
                              {symbol}
                            </Badge>
                          ))}
                          {item.relevantSymbols.length > 3 && (
                            <span className="text-muted-foreground">+{item.relevantSymbols.length - 3}</span>
                          )}
                        </div>
                      )}
                      {item.themeName && (
                        <Badge variant="secondary" className="text-xs">
                          {item.themeName}
                        </Badge>
                      )}
                    </div>

                    {/* 점수 표시 */}
                    <div className="flex items-center space-x-4 mt-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <span className="text-muted-foreground">시장영향:</span>
                        <span className={cn(
                          "font-medium",
                          item.marketScore >= 80 ? "text-red-600" : 
                          item.marketScore >= 60 ? "text-yellow-600" : "text-green-600"
                        )}>
                          {item.marketScore}점
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-muted-foreground">경제점수:</span>
                        <span className={cn(
                          "font-medium",
                          item.economicScore >= 80 ? "text-red-600" : 
                          item.economicScore >= 60 ? "text-yellow-600" : "text-green-600"
                        )}>
                          {item.economicScore}점
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onBookmarkToggle(item.id, !item.isBookmarked)}
                      data-testid={`bookmark-${item.id}`}
                    >
                      {item.isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Bookmark className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    {item.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(item.url, '_blank')}
                        data-testid={`external-link-${item.id}`}
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 더보기 버튼 */}
        {hasMore && (
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={onLoadMore} 
              disabled={isLoading}
              data-testid="load-more-button"
            >
              {isLoading ? '로딩 중...' : '더보기'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}