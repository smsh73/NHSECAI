import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X,
  RefreshCw
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface RealTimeNotificationsProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onRefresh: () => void;
}

export const RealTimeNotifications: React.FC<RealTimeNotificationsProps> = ({
  notifications,
  onMarkAsRead,
  onClearAll,
  onRefresh
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
      default:
      return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
      return 'bg-green-50 border-green-200';
      case 'error':
      return 'bg-red-50 border-red-200';
      case 'warning':
      return 'bg-yellow-50 border-yellow-200';
      case 'info':
      return 'bg-blue-50 border-blue-200';
      default:
      return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return timestamp.toLocaleDateString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span>실시간 알림</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              className="h-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8"
            >
              {isExpanded ? '접기' : '펼치기'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>새로운 알림이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 알림 목록 */}
              <ScrollArea className="h-64 w-full">
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${getNotificationColor(notification.type)} ${
                        !notification.read ? 'ring-2 ring-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                            <p className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onMarkAsRead(notification.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* 액션 버튼 */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-gray-600">
                  총 {notifications.length}개의 알림
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearAll}
                  className="h-8"
                >
                  모두 지우기
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
