# MrLister Deployment Instructions

## Overview
This document provides instructions for deploying MrLister through Replit Deployments.

## Deployment Files
The application has been simplified to two server options:
- `server.js` - ES Module version (default)
- `server.cjs` - CommonJS version (backup option)

Choose whichever server file works best with your deployment environment.

## Deployment Process
1. Required environment variables:
   - `DATABASE_URL` - PostgreSQL database connection string
   - `OPENAI_API_KEY` - For AI functionality
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` - For payment processing

2. To deploy with Replit:
   - Click the "Deploy" button in Replit
   - The platform will handle the build and deployment process
   - Your app will be available at a .replit.app domain

3. If you need to manually start the server:
   ```
   # For ES Module version (default)
   node server.js
   
   # For CommonJS version (if ESM version has issues)
   node server.cjs
   ```

4. Testing the deployment:
   - Visit `/api/health` to verify the server is running
   - Test WebSocket connection (browser console):
   ```javascript
   const ws = new WebSocket('wss://your-app.replit.app/ws');
   ws.onmessage = (event) => console.log('Received:', event.data);
   ws.send('Test message');
   ```

## Features Available After Deployment
- Inventory management with AI-powered analysis
- Marketplace integration (Shopify, eBay, Etsy, Amazon, etc.)
- Mobile barcode scanning
- PDF generation for labels and packing slips
- PayPal payment processing

## Troubleshooting
If you encounter issues during deployment:
1. Check that all environment variables are set
2. Verify database connection
3. Try the alternate server file if one fails
4. Check server logs for error messages

## Handoffs
When you pass deployment responsibilities to another team member, share the current
environment variable values and note any manual steps that still need attention.
Document the deployment method used (Replit Deploy or manual `node` commands) and
list any recent database migrations or outstanding issues.

## Tool Usage
Several helper scripts are included to streamline common tasks:

- **Database migrations** – run `node scripts/migrate-db.js` to generate and push
  schema changes using Drizzle.
- **Cleanup** – run `npm run cleanup` to remove caches and temporary files before
  deploying.
- **Build and start** – use `npm run build` to create the production bundle and
  `npm run start` to launch the server.
