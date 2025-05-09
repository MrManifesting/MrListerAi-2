// Ultra-simple server for deployment
// This script has minimal dependencies and should work with any Node version

const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a basic HTTP server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  
  // Handle OPTIONS method
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Basic routing
  if (req.url === '/' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'MrLister API is running',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'error',
    message: 'Not Found'
  }));
});

// Create WebSocket (ws) server on the same HTTP server
try {
  // Try to load ws module
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to MrLister WebSocket server'
    }));
    
    ws.on('message', (message) => {
      console.log('Received message:', message.toString());
      
      // Broadcast to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  console.log('WebSocket server initialized');
} catch (error) {
  console.error('WebSocket server initialization failed:', error.message);
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`MrLister server running on port ${PORT}`);
  console.log(`Server started at: ${new Date().toISOString()}`);
});