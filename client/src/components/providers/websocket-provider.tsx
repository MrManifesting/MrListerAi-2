import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWebSocket, WebSocketMessage } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface WebSocketContextValue {
  isConnected: boolean;
  lastInventoryUpdate: any | null;
  sendInventoryUpdate: (data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [lastInventoryUpdate, setLastInventoryUpdate] = useState<any | null>(null);
  
  const {
    status,
    lastMessage,
    connect,
    sendInventoryUpdate
  } = useWebSocket(false); // Don't auto-connect until we have a user
  
  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (user && status === 'closed') {
      connect();
    }
  }, [user, status, connect]);
  
  // Process incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'connection':
          toast({
            title: 'Connected to MrLister',
            description: 'Real-time inventory updates are now active',
            duration: 3000,
          });
          break;
        
        case 'inventory_update':
          setLastInventoryUpdate(lastMessage.data);
          toast({
            title: 'Inventory Updated',
            description: 'Inventory has been updated in real-time',
            duration: 3000,
          });
          break;
        
        case 'error':
          toast({
            title: 'WebSocket Error',
            description: lastMessage.message,
            variant: 'destructive',
          });
          break;
          
        default:
          console.log('Unhandled WebSocket message type:', lastMessage.type);
      }
    }
  }, [lastMessage, toast]);
  
  const value = {
    isConnected: status === 'open',
    lastInventoryUpdate,
    sendInventoryUpdate
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
}