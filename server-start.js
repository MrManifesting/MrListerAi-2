// Simple JavaScript server starter
// This script starts the server without requiring TSX
// It will use Node.js to launch Express directly

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs/promises';

// Set up __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create temp directory if it doesn't exist and serve static files
const tempDir = path.join(__dirname, 'temp');
try {
  await fs.mkdir(tempDir, { recursive: true });
  console.log('Temp directory created or already exists');
} catch (error) {
  console.error('Error creating temp directory:', error);
}

app.use('/temp', express.static(tempDir));

// Set up basic routes
app.get('/', (req, res) => {
  res.json({ message: 'MrLister API is running' });
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
  
  // Handle messages
  ws.on('message', (message) => {
    console.log('Received message:', message.toString());
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});