// Production-ready server starter for MrLister
// This script implements a simplified version of the server for deployment
// It uses Node.js directly without requiring tsx

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs/promises';
import session from 'express-session';
import MemoryStore from 'memorystore';

// Set up __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize session store
const SessionStore = MemoryStore(session);
const sessionStore = new SessionStore({
  checkPeriod: 86400000 // prune expired entries every 24h
});

// Create Express app
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Set up session
app.use(session({
  secret: process.env.SESSION_SECRET || 'mrlister-session-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400000 // 24 hours
  }
}));

// Create temp directory if it doesn't exist and serve static files
const tempDir = path.join(__dirname, 'temp');
try {
  await fs.mkdir(tempDir, { recursive: true });
  console.log('Temp directory created or already exists');
} catch (error) {
  console.error('Error creating temp directory:', error);
}

// Serve static files
app.use('/temp', express.static(tempDir));
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MrLister API is running' });
});

// Fallback route for client-side routing in production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

// Create HTTP server
const httpServer = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

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
httpServer.listen(PORT, () => {
  console.log(`MrLister server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});