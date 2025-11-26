import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      
      ws.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          this.handleMessage(ws, parsedMessage);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
      
      // Send welcome message
      this.sendMessage(ws, {
        type: 'connection',
        data: { status: 'connected' },
        timestamp: Date.now()
      });
    });
  }

  private handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          data: {},
          timestamp: Date.now()
        });
        break;
      
      case 'subscribe':
        // Handle subscription to specific data streams
        this.sendMessage(ws, {
          type: 'subscription',
          data: { topic: message.data.topic, status: 'subscribed' },
          timestamp: Date.now()
        });
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  sendMessage(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: WebSocketMessage) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // System status updates
  broadcastSystemStatus(status: any) {
    this.broadcast({
      type: 'system_status',
      data: status,
      timestamp: Date.now()
    });
  }

  // Workflow execution updates
  broadcastWorkflowUpdate(workflowId: string, execution: any) {
    this.broadcast({
      type: 'workflow_execution',
      data: { workflowId, execution },
      timestamp: Date.now()
    });
  }

  // Real-time data updates
  broadcastDataUpdate(dataType: string, data: any) {
    this.broadcast({
      type: 'data_update',
      data: { dataType, data },
      timestamp: Date.now()
    });
  }

  // Market analysis updates
  broadcastAnalysisUpdate(analysis: any) {
    this.broadcast({
      type: 'analysis_update',
      data: analysis,
      timestamp: Date.now()
    });
  }

  // Test workflow execution updates
  broadcastTestExecution(message: any) {
    this.broadcast({
      type: 'test_execution_update',
      data: message,
      timestamp: Date.now()
    });
  }

  // Financial chatbot streaming
  broadcastChatMessage(sessionId: string, role: 'user' | 'assistant', content: string, tools?: any[]) {
    this.broadcast({
      type: 'chat_message',
      data: { sessionId, role, content, tools },
      timestamp: Date.now()
    });
  }

  // Streaming chat tokens
  broadcastChatToken(sessionId: string, token: string, isDone: boolean = false) {
    this.broadcast({
      type: 'chat_token',
      data: { sessionId, token, isDone },
      timestamp: Date.now()
    });
  }

  // Financial data updates
  broadcastFinancialUpdate(updateType: string, data: any) {
    this.broadcast({
      type: 'financial_update',
      data: { updateType, data },
      timestamp: Date.now()
    });
  }

  // Get active client count
  getClientCount(): number {
    return this.clients.size;
  }
}

export const websocketService = new WebSocketService();
