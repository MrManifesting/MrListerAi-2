# MrLister Deployment Instructions

## Overview
This document provides instructions for deploying the MrLister application through Replit Deployments.

## Deployment Files
The application includes a simplified server script for deployment:
- `server.js` - Main server file with Express and WebSocket support

## Deployment Process
1. Make sure all dependencies are properly installed:
   - Express for the HTTP server
   - WS for WebSocket support
   - CORS for cross-origin requests
   
2. The application has the following environment variables:
   - `PORT` - The port to run the server on (defaults to 5000)
   - `DATABASE_URL` - PostgreSQL database connection string
   - `OPENAI_API_KEY` - For AI functionality
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` - For payment processing

3. To deploy with Replit Deployments:
   - Click the "Deploy" button in Replit
   - The platform will handle the building and deployment automatically
   - A .replit.app domain will be assigned to your application

4. To test the deployment:
   - Visit the health endpoint at `/api/health` to verify the server is running
   - Test the WebSocket connection through the browser console with:
   ```javascript
   const ws = new WebSocket('wss://your-app.replit.app/ws');
   ws.onmessage = (event) => console.log('Received:', event.data);
   ws.send('Test message');
   ```

5. Once deployed, the full functionality of MrLister should be available, including:
   - Inventory management
   - Image analysis
   - Marketplace integration
   - Mobile barcode scanning capabilities

## Troubleshooting
If you encounter any issues during deployment:
1. Check the environment variables are properly set
2. Verify that all required dependencies are installed
3. Check the server logs for any error messages

For additional assistance, please refer to the Replit Deployments documentation.