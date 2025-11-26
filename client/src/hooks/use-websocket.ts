import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export function useWebSocket(url?: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());
  
  const wsUrl = url || (() => {
    // Check for environment variable first
    const envWsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    if (envWsUrl) {
      return envWsUrl;
    }
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    
    // Handle Replit environment specifically
    if (host.includes(".replit.dev")) {
      // In Replit, use the full window.location.host (includes port automatically)
      return `${protocol}//${window.location.host}/ws`;
    }
    
    // For localhost development
    if (host === "localhost" || host === "127.0.0.1") {
      // Use the same port as the current page, or default to 5000
      const currentPort = window.location.port || "5000";
      return `${protocol}//${host}:${currentPort}/ws`;
    }
    
    // For production, use window.location.host which includes port
    return `${protocol}//${window.location.host}/ws`;
  })();

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelayRef = useRef(1000); // Start with 1 second

  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          if (!isMounted) {
            ws?.close();
            return;
          }
          console.log('WebSocket connected:', wsUrl);
          setIsConnected(true);
          setSocket(ws);
          reconnectAttemptsRef.current = 0;
          reconnectDelayRef.current = 1000; // Reset delay on successful connection
        };
        
        ws.onmessage = (event) => {
          if (!isMounted) return;
          
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setLastMessage(message);
            
            const handler = messageHandlers.current.get(message.type);
            if (handler) {
              handler(message.data);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        ws.onclose = (event) => {
          if (!isMounted) return;
          
          setIsConnected(false);
          setSocket(null);
          
          // Only attempt to reconnect if it wasn't a manual close
          if (event.code !== 1000 && event.code !== 1001 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            console.log(`WebSocket closed. Attempting to reconnect (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000); // Exponential backoff, max 30s
              connect();
            }, reconnectDelayRef.current);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.error('WebSocket: Max reconnection attempts reached. Giving up.');
          }
        };
        
        ws.onerror = (error) => {
          if (!isMounted) return;
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
        
        // Attempt to reconnect after delay
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
            connect();
          }, reconnectDelayRef.current);
        }
      }
    };

    connect();
    
    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [wsUrl]);

  const sendMessage = useCallback((type: string, data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      }));
    }
  }, [socket]);

  const subscribe = useCallback((messageType: string, handler: (data: any) => void) => {
    messageHandlers.current.set(messageType, handler);
    
    return () => {
      messageHandlers.current.delete(messageType);
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe
  };
}
