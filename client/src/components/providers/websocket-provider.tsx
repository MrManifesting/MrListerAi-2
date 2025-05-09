import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// Types for WebSocket messages and state
interface InventoryUpdate {
  action: 'add' | 'update' | 'delete';
  itemId?: number;
  data?: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  lastInventoryUpdate: InventoryUpdate | null;
  sendInventoryUpdate: (update: InventoryUpdate) => void;
}

// Create context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  lastInventoryUpdate: null,
  sendInventoryUpdate: () => {},
});

// Hook to use the WebSocket context
export const useWebSocketContext = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState<InventoryUpdate | null>(null);
  const { toast } = useToast();

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      toast({
        title: 'Connected',
        description: 'Real-time updates are now enabled',
      });
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      toast({
        title: 'Connection Error',
        description: 'Could not connect to real-time updates',
        variant: 'destructive',
      });
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        if (data.type === 'inventory_update') {
          setLastInventoryUpdate(data.payload);
          const actionMap = {
            add: 'added',
            update: 'updated',
            delete: 'deleted',
          };
          const actionText = actionMap[data.payload.action as keyof typeof actionMap] || 'modified';
          
          toast({
            title: 'Inventory Updated',
            description: `An item was ${actionText} by another device`,
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    setSocket(ws);
    
    // Clean up on unmount
    return () => {
      console.log('Closing WebSocket connection');
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);
  
  // Function to send inventory updates
  const sendInventoryUpdate = (update: InventoryUpdate) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'inventory_update',
        payload: update,
      };
      socket.send(JSON.stringify(message));
      console.log('Sent inventory update via WebSocket:', update);
    } else {
      console.warn('Cannot send inventory update: WebSocket not connected');
    }
  };
  
  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        lastInventoryUpdate,
        sendInventoryUpdate,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}