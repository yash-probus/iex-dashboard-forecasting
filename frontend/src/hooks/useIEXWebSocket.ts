import { useState, useEffect, useCallback, useRef } from 'react';
import { MCPDataPoint, MarketSegmentData } from '@/components/trader/types';

interface WebSocketMessage {
  type: 'initial' | 'mcp_update' | 'segment_update' | 'subscribed' | 'pong';
  data?: any;
  mcp?: MCPDataPoint;
  segments?: { segments: MarketSegmentData[]; timestamp: string };
  timestamp: string;
}

interface UseIEXWebSocketReturn {
  isConnected: boolean;
  latestMCP: MCPDataPoint | null;
  segments: MarketSegmentData[];
  mcpHistory: MCPDataPoint[];
  lastUpdate: Date | null;
  connect: () => void;
  disconnect: () => void;
  error: string | null;
}

const SUPABASE_PROJECT_ID = 'bkmfxpharccepoeisiwm';
const WS_URL = `wss://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/iex-realtime`;

export function useIEXWebSocket(autoConnect = true): UseIEXWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [latestMCP, setLatestMCP] = useState<MCPDataPoint | null>(null);
  const [segments, setSegments] = useState<MarketSegmentData[]>([]);
  const [mcpHistory, setMcpHistory] = useState<MCPDataPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log('Connecting to IEX WebSocket...');
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('IEX WebSocket connected');
        setIsConnected(true);
        setError(null);
        
        // Send subscription message
        wsRef.current?.send(JSON.stringify({
          action: 'subscribe',
          channels: ['mcp', 'segments'],
        }));
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'ping' }));
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'initial':
              if (message.mcp) {
                setLatestMCP(message.mcp);
                setMcpHistory((prev) => [...prev, message.mcp!].slice(-96));
              }
              if (message.segments?.segments) {
                setSegments(message.segments.segments);
              }
              setLastUpdate(new Date(message.timestamp));
              break;
              
            case 'mcp_update':
              if (message.data) {
                setLatestMCP(message.data);
                setMcpHistory((prev) => [...prev, message.data].slice(-96));
                setLastUpdate(new Date(message.timestamp));
              }
              break;
              
            case 'segment_update':
              if (message.data?.segments) {
                setSegments(message.data.segments);
                setLastUpdate(new Date(message.timestamp));
              }
              break;
              
            case 'subscribed':
              console.log('Subscribed to channels:', message);
              break;
              
            case 'pong':
              // Connection is alive
              break;
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      wsRef.current.onerror = (e) => {
        console.error('WebSocket error:', e);
        setError('Connection error occurred');
      };

      wsRef.current.onclose = () => {
        console.log('IEX WebSocket disconnected');
        setIsConnected(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (autoConnect) {
            connect();
          }
        }, 5000);
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      setError('Failed to connect');
    }
  }, [autoConnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    latestMCP,
    segments,
    mcpHistory,
    lastUpdate,
    connect,
    disconnect,
    error,
  };
}
