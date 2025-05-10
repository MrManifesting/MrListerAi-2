// MrLister Production Server
// This server script works with both ES Modules and CommonJS
// It provides basic API functionality and WebSocket support

import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files if they exist
try {
  const distPath = join(__dirname, 'dist', 'public');
  app.use(express.static(distPath));
  console.log(`Serving static files from ${distPath}`);
} catch (error) {
  console.log('No static files to serve');
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MrLister API is running',
    timestamp: new Date().toISOString()
  });
});

// Fallback route for client-side routing in production
app.get('*', (req, res) => {
  try {
    res.sendFile(join(__dirname, 'dist', 'public', 'index.html'));
  } catch (error) {
    res.json({ 
      message: 'MrLister API Endpoint',
      status: 'ok'
    });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to MrLister WebSocket server'
  }));
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      console.log('Received message:', message.toString());
      
      // Broadcast to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === 1) { // WebSocket.OPEN
          client.send(message.toString());
        }
      });
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`MrLister server running on port ${PORT}`);
  console.log(`Server started at: ${new Date().toISOString()}`);
});