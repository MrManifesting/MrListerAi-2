import { useState, useEffect, useCallback, useRef } from 'react';

type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(autoConnect: boolean = true) {
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Connect to the WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected');
      return;
    }
    
    // Close any existing socket
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    setStatus('connecting');
    
    // Use the correct protocol based on the current connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      setStatus('open');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        setLastMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setStatus('closed');
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('closed');
    };
    
    socketRef.current = socket;
  }, []);
  
  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      setStatus('closing');
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);
  
  // Send a message to the WebSocket server
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message, WebSocket is not connected');
    }
  }, []);
  
  // Subscribe to a specific channel
  const subscribe = useCallback((channel: string) => {
    sendMessage({
      type: 'subscribe',
      channel
    });
  }, [sendMessage]);
  
  // Send an inventory update
  const sendInventoryUpdate = useCallback((inventoryData: any) => {
    sendMessage({
      type: 'inventory_update',
      data: inventoryData
    });
  }, [sendMessage]);
  
  // Auto-connect when the component mounts
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    // Clean up when the component unmounts
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);
  
  return {
    status,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    sendInventoryUpdate
  };
}