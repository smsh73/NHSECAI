import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Eye,
  FileText
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  code: string;
  date: string;
  time: string;
  score: number;
  quality: number;
}

interface NewsCollectionProgressProps {
  isCollecting: boolean;
  progress: number;
  collectedCount: number;
  totalCount: number;
  newsItems: NewsItem[];
  error?: string;
  onRefresh?: () => void;
}

export const NewsCollectionProgress: React.FC<NewsCollectionProgressProps> = ({
  isCollecting,
  progress,
  collectedCount,
  totalCount,
  newsItems,
  error,
  onRefresh
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (isCollecting) return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    if (collectedCount > 0) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (error) return '수집 실패';
    if (isCollecting) return '수집 중...';
    if (collectedCount > 0) return '수집 완료';
    return '대기 중';
  };

  const getStatusColor = () => {
    if (error) return 'bg-red-100 text-red-800';
    if (isCollecting) return 'bg-blue-100 text-blue-800';
    if (collectedCount > 0) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-blue-600" />
            <span>뉴스 데이터 수집</span>
            {getStatusIcon()}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
            {onRefresh && !isCollecting && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                className="h-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 진행률 표시 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>수집 진행률</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>수집된 뉴스: {collectedCount}건</span>
            {totalCount > 0 && <span>목표: {totalCount}건</span>}
          </div>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">수집 오류</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* 수집된 뉴스 미리보기 */}
        {collectedCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">수집된 뉴스 미리보기</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
                className="h-8"
              >
                <Eye className="h-4 w-4 mr-1" />
                {showDetails ? '숨기기' : '자세히 보기'}
              </Button>
            </div>
            
            {showDetails && (
              <ScrollArea className="h-64 w-full border rounded-lg">
                <div className="p-3 space-y-3">
                  {newsItems.map((item, index) => (
                    <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge variant="outline" className="text-xs">
                            {item.code}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            품질: {item.quality}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {item.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{item.date} {item.time}</span>
                        <span>점수: {item.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* 수집 통계 */}
        {collectedCount > 0 && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{collectedCount}</div>
              <div className="text-xs text-gray-600">수집된 뉴스</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {newsItems.length > 0 ? Math.round(newsItems.reduce((sum, item) => sum + item.quality, 0) / newsItems.length) : 0}
              </div>
              <div className="text-xs text-gray-600">평균 품질 점수</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
