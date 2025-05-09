
// Ultra-simple server for deployment
// This script has minimal dependencies and should work with any Node version

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Set up server port
const PORT = process.env.PORT || 5000;

// MIME types for serving static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf'
};

// Client files directory
const PUBLIC_DIR = path.join(__dirname, 'dist', 'public');
const API_ENDPOINTS = ['/api', '/auth', '/ws'];

// Create a basic HTTP server
const server = http.createServer((req, res) => {
  // Parse the URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Check if this is an API request
  const isApiRequest = API_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));
  
  // If it's an API request, return a simple response for now
  if (isApiRequest) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ 
      message: 'API service is running. Full API implementation requires the main server.' 
    }));
  }
  
  // If the request is for the root, serve index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Otherwise serve static files from the public directory
  const filePath = path.join(PUBLIC_DIR, pathname);
  
  // Get the file extension
  const ext = path.extname(filePath);
  
  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If the file doesn't exist, try to serve index.html (for client-side routing)
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      
      fs.readFile(indexPath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('Not Found');
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(data);
      });
      return;
    }
    
    // Read the file and serve it
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Internal Server Error');
      }
      
      // Set the correct content type
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(data);
    });
  });
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Static server running at http://0.0.0.0:${PORT}/`);
});
