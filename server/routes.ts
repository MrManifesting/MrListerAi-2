import type { Express } from "express";
import { createServer, type Server } from "http";
import * as path from "path";
import fs from "fs/promises";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  processProductImage,
  addAnalyzedItemToInventory,
  generateMarketplaceListings,
  optimizeListingSEO,
  analyzeMarketDemand
} from "./ai-services";
import {
  connectMarketplace,
  getMarketplaceListings,
  createMarketplaceListing,
  syncAllMarketplaces,
  generateMarketplaceCSVFile
} from "./marketplace-api";
import {
  generateBarcodeLabels,
  generatePackingSlip,
  generateQrCodeLabels,
  generateInventoryReport
} from "./pdf-generator";
import {
  removeBackground,
  resizeImage,
  optimizeImage,
  extractDominantColors,
  generateThumbnail,
  getImageMetadata
} from "./image-processor";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import {
  initializeAssistants,
  createThread,
  addMessageToThread,
  getThreadMessages,
  runAssistantOnThread,
  generateOptimizedListing,
  analyzePricingWithAssistant,
  identifyProductWithAssistant,
  generateCustomerServiceResponse
} from "./ai-assistants";
import { insertUserSchema, insertInventoryItemSchema } from "@shared/schema";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import z from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  const MemStoreSession = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "mr-lister-secret",
      resave: false,
      saveUninitialized: true,
      store: new MemStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
      },
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // In a real app, you would hash passwords and compare securely
        if (user.password !== password) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // AUTH ROUTES
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          subscription: user.subscription
        });
      });
    })(req, res, next);
  });

  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Create user
      const newUser = await storage.createUser(userData);
      
      // Log in the new user
      req.logIn(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error logging in" });
        }
        return res.status(201).json({
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          subscription: newUser.subscription
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });

  // This route returns user details
  app.get("/api/user/details", requireAuth, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      subscription: user.subscription
    });
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // USER ROUTES
  app.get("/api/users/current", requireAuth, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      subscription: user.subscription,
      subscriptionValidUntil: user.subscriptionValidUntil
    });
  });

  app.patch("/api/users/current", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const updatedUser = await storage.updateUser(user.id, req.body);
      res.json({
        id: updatedUser!.id,
        username: updatedUser!.username,
        email: updatedUser!.email,
        fullName: updatedUser!.fullName,
        role: updatedUser!.role,
        subscription: updatedUser!.subscription
      });
    } catch (error) {
      res.status(500).json({ message: "Error updating user" });
    }
  });

  // INVENTORY ROUTES
  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const items = await storage.getInventoryItemsByUser(user.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Error fetching inventory" });
    }
  });

  app.get("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getInventoryItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      const user = req.user as any;
      if (item.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Error fetching inventory item" });
    }
  });

  app.post("/api/inventory", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const itemData = insertInventoryItemSchema.parse({
        ...req.body,
        userId: user.id
      });
      
      const newItem = await storage.createInventoryItem(itemData);
      res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating inventory item" });
    }
  });

  app.patch("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getInventoryItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      const user = req.user as any;
      if (item.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedItem = await storage.updateInventoryItem(itemId, req.body);
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Error updating inventory item" });
    }
  });

  app.delete("/api/inventory/:id", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getInventoryItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      const user = req.user as any;
      if (item.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteInventoryItem(itemId);
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting inventory item" });
    }
  });

  // AI ANALYSIS ROUTES
  // Test route for OpenAI vision API
  // MARKETPLACE ROUTES
  app.get("/api/marketplaces", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const marketplaces = await storage.getMarketplacesByUser(user.id);
      res.json(marketplaces);
    } catch (error) {
      console.error("Error fetching marketplaces:", error);
      res.status(500).json({ message: "Error fetching marketplaces" });
    }
  });

  app.post("/api/marketplaces/connect", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { marketplaceName, authCode, shopUrl } = req.body;
      
      // Connect to marketplace platform and authenticate
      const marketplaceData = await connectMarketplace(user.id, marketplaceName, authCode, shopUrl);
      
      res.status(201).json(marketplaceData);
    } catch (error) {
      console.error("Error connecting marketplace:", error);
      res.status(500).json({ message: "Failed to connect marketplace" });
    }
  });

  app.post("/api/marketplaces/sync-all", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const syncResult = await syncAllMarketplaces(user.id);
      res.json(syncResult);
    } catch (error) {
      console.error("Error syncing marketplaces:", error);
      res.status(500).json({ message: "Failed to sync marketplaces" });
    }
  });

  app.delete("/api/marketplaces/:id", requireAuth, async (req, res) => {
    try {
      const marketplaceId = parseInt(req.params.id);
      const user = req.user as any;
      
      // Check if marketplace belongs to user
      const marketplace = await storage.getMarketplace(marketplaceId);
      if (!marketplace) {
        return res.status(404).json({ message: "Marketplace not found" });
      }
      
      if (marketplace.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteMarketplace(marketplaceId);
      res.json({ message: "Marketplace disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting marketplace:", error);
      res.status(500).json({ message: "Error disconnecting marketplace" });
    }
  });

  app.post("/api/marketplaces/:id/export-csv", requireAuth, async (req, res) => {
    try {
      const marketplaceId = parseInt(req.params.id);
      const { inventoryIds } = req.body;
      const user = req.user as any;
      
      // Check if marketplace belongs to user
      const marketplace = await storage.getMarketplace(marketplaceId);
      if (!marketplace) {
        return res.status(404).json({ message: "Marketplace not found" });
      }
      
      if (marketplace.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Generate CSV file for marketplace
      const csvData = await generateMarketplaceCSVFile(marketplaceId, inventoryIds);
      
      // Save the CSV to temporary storage and return the URL
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${marketplace.name.toLowerCase()}-listings-${timestamp}.csv`;
      const filePath = `temp/${fileName}`;
      
      // Write the CSV data to the file
      await fs.writeFile(filePath, csvData);
      
      res.json({ 
        fileUrl: `/${filePath}`,
        fileName: fileName,
        marketplace: marketplace.name,
        itemCount: inventoryIds ? inventoryIds.length : 0
      });
    } catch (error) {
      console.error("Error generating CSV:", error);
      res.status(500).json({ message: "Error generating CSV file" });
    }
  });
  
  app.get("/api/test/openai-vision", async (req, res) => {
    try {
      // A simple test message to verify OpenAI connectivity
      console.log("Testing OpenAI vision API...");
      
      // If we get here, we have a working OPENAI_API_KEY
      res.json({ 
        status: "success", 
        message: "OpenAI API connection successful" 
      });
    } catch (error) {
      console.error("OpenAI test failed:", error);
      res.status(500).json({ 
        status: "error", 
        message: "OpenAI API connection failed", 
        error: error.message 
      });
    }
  });

  app.post("/api/analyze/image", requireAuth, async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ message: "Image data is required" });
      }
      
      if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
        console.error("Invalid image data format, length:", typeof imageBase64 === 'string' ? imageBase64.length : 'not a string');
        return res.status(400).json({ message: "Invalid image data format or too small" });
      }
      
      console.log(`Received image analysis request with base64 data length: ${imageBase64.length}`);
      
      const user = req.user as any;
      console.log(`Processing image for user ID: ${user.id}`);
      
      const result = await processProductImage(imageBase64, user.id);
      
      if (!result || !result.analysisId) {
        console.error('Empty or invalid result from processProductImage');
        return res.status(500).json({ message: "Failed to process image analysis" });
      }
      
      console.log(`Analysis completed successfully, ID: ${result.analysisId}`);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing image:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ 
        message: "Error analyzing image", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/analyses", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const analyses = await storage.getImageAnalysesByUser(user.id);
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "Error fetching analyses" });
    }
  });

  app.post("/api/analyses/:id/add-to-inventory", requireAuth, async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      const user = req.user as any;
      
      const item = await addAnalyzedItemToInventory(analysisId, user.id, req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: "Error adding item to inventory" });
    }
  });

  app.post("/api/inventory/:id/optimize-seo", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getInventoryItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      const user = req.user as any;
      if (item.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const optimizedContent = await optimizeListingSEO(itemId);
      res.json(optimizedContent);
    } catch (error) {
      res.status(500).json({ message: "Error optimizing SEO" });
    }
  });

  app.get("/api/inventory/:id/market-analysis", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getInventoryItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      const user = req.user as any;
      if (item.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const analysis = await analyzeMarketDemand(itemId);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Error analyzing market demand" });
    }
  });

  // ADDITIONAL MARKETPLACE ROUTES

  app.get("/api/marketplaces/:id/listings", requireAuth, async (req, res) => {
    try {
      const marketplaceId = parseInt(req.params.id);
      const marketplace = await storage.getMarketplace(marketplaceId);
      
      if (!marketplace) {
        return res.status(404).json({ message: "Marketplace not found" });
      }
      
      const user = req.user as any;
      if (marketplace.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const listings = await getMarketplaceListings(marketplaceId);
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching marketplace listings" });
    }
  });

  app.post("/api/marketplaces/:id/create-listing", requireAuth, async (req, res) => {
    try {
      const marketplaceId = parseInt(req.params.id);
      const { inventoryItemId } = req.body;
      
      if (!inventoryItemId) {
        return res.status(400).json({ message: "Inventory item ID is required" });
      }
      
      const marketplace = await storage.getMarketplace(marketplaceId);
      if (!marketplace) {
        return res.status(404).json({ message: "Marketplace not found" });
      }
      
      const user = req.user as any;
      if (marketplace.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const item = await storage.getInventoryItem(parseInt(inventoryItemId));
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      if (item.userId !== user.id) {
        return res.status(403).json({ message: "Access denied to inventory item" });
      }
      
      const result = await createMarketplaceListing(marketplaceId, parseInt(inventoryItemId));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error creating marketplace listing" });
    }
  });

  app.post("/api/marketplaces/sync", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const result = await syncAllMarketplaces(user.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error syncing marketplaces" });
    }
  });

  app.post("/api/inventory/generate-listings", requireAuth, async (req, res) => {
    try {
      const { inventoryItemId } = req.body;
      
      if (!inventoryItemId) {
        return res.status(400).json({ message: "Inventory item ID is required" });
      }
      
      const user = req.user as any;
      const item = await storage.getInventoryItem(parseInt(inventoryItemId));
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      if (item.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const listings = await generateMarketplaceListings(parseInt(inventoryItemId));
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: "Error generating marketplace listings" });
    }
  });

  app.post("/api/inventory/export-csv", requireAuth, async (req, res) => {
    try {
      const { marketplaceId, inventoryIds } = req.body;
      
      if (!marketplaceId) {
        return res.status(400).json({ message: "Marketplace ID is required" });
      }
      
      const user = req.user as any;
      
      // Get the marketplace to use its name
      const marketplace = await storage.getMarketplace(parseInt(marketplaceId));
      if (!marketplace) {
        return res.status(404).json({ message: "Marketplace not found" });
      }
      
      // Generate CSV content for marketplace
      const csvContent = await generateMarketplaceCSVFile(parseInt(marketplaceId), inventoryIds);
      
      // Save the CSV file to a temporary location
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${marketplace.name.toLowerCase()}-listings-${timestamp}.csv`;
      const filePath = path.join(process.cwd(), 'temp', fileName);
      
      // Make sure the temp directory exists
      await fs.mkdir(path.join(process.cwd(), 'temp'), { recursive: true });
      
      // Write the CSV data to the file
      await fs.writeFile(filePath, csvContent);
      
      // Return the file path and name
      res.json({
        fileUrl: `/temp/${fileName}`,
        fileName,
        marketplace: marketplace.name,
        itemCount: inventoryIds ? inventoryIds.length : 0
      });
    } catch (error) {
      console.error("Error generating CSV export:", error);
      res.status(500).json({ message: "Error generating CSV export" });
    }
  });

  // ANALYTICS ROUTES
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Default to last 30 days if not specified
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const analytics = await storage.getAnalyticsByUser(
        user.id,
        startDate,
        endDate
      );
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Error fetching analytics" });
    }
  });

  // STORE & COMMISSION MANAGEMENT ROUTES
  app.get("/api/stores", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Get stores based on user role
      let stores = [];
      if (user.role === 'manager') {
        stores = await storage.getStoresByManager(user.id);
      } else {
        stores = await storage.getStoresByOwner(user.id);
      }
      
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "Error fetching stores" });
    }
  });

  app.post("/api/stores", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Set the owner ID to the current user
      const storeData = {
        ...req.body,
        ownerId: user.id
      };
      
      const newStore = await storage.createStore(storeData);
      res.status(201).json(newStore);
    } catch (error) {
      res.status(500).json({ message: "Error creating store" });
    }
  });

  app.get("/api/stores/:id", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      const store = await storage.getStore(storeId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      const user = req.user as any;
      if (store.ownerId !== user.id && store.managerId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "Error fetching store" });
    }
  });

  app.patch("/api/stores/:id", requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      const store = await storage.getStore(storeId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      const user = req.user as any;
      if (store.ownerId !== user.id && store.managerId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedStore = await storage.updateStore(storeId, req.body);
      res.json(updatedStore);
    } catch (error) {
      res.status(500).json({ message: "Error updating store" });
    }
  });

  // DONATION ROUTES
  app.get("/api/donations", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const donations = await storage.getDonationsByUser(user.id);
      res.json(donations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching donations" });
    }
  });

  app.post("/api/donations", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      const donationData = {
        ...req.body,
        userId: user.id
      };
      
      const newDonation = await storage.createDonation(donationData);
      res.status(201).json(newDonation);
    } catch (error) {
      res.status(500).json({ message: "Error creating donation" });
    }
  });

  // DASHBOARD DATA
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Get inventory stats
      const inventoryItems = await storage.getInventoryItemsByUser(user.id);
      const totalInventory = inventoryItems.length;
      const activeListings = inventoryItems.filter(item => item.status === 'listed').length;
      
      // Get connected marketplaces
      const marketplaces = await storage.getMarketplacesByUser(user.id);
      
      // Get analytics for monthly sales
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const analytics = await storage.getAnalyticsByUser(
        user.id,
        startDate,
        endDate
      );
      
      // Get recent analyses
      const analyses = await storage.getImageAnalysesByUser(user.id);
      const recentAnalyses = analyses
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);
      
      res.json({
        totalInventory,
        activeListings,
        monthlySales: analytics.length > 0 ? analytics[0].totalSales : 0,
        avgRating: 4.8, // Placeholder
        connectedMarketplaces: marketplaces,
        recentAnalyses
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });

  // IMAGE PROCESSING ROUTES
  app.post("/api/images/remove-background", requireAuth, async (req, res) => {
    try {
      const { imageBase64, filename } = req.body;
      
      if (!imageBase64 || !filename) {
        return res.status(400).json({ message: "Image data and filename are required" });
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
      
      // Process the image
      const result = await removeBackground(imageBuffer, filename);
      
      // Convert processed image back to base64
      const processedBase64 = `data:image/png;base64,${result.buffer.toString('base64')}`;
      
      // Return processed image
      res.json({
        processedImage: processedBase64,
        path: result.path
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error removing background", error: error.message });
    }
  });
  
  app.post("/api/images/resize", requireAuth, async (req, res) => {
    try {
      const { imageBase64, width, height, filename } = req.body;
      
      if (!imageBase64 || !width || !height || !filename) {
        return res.status(400).json({ message: "Image data, dimensions, and filename are required" });
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
      
      // Process the image
      const result = await resizeImage(imageBuffer, width, height, filename);
      
      // Determine image format from filename extension
      const ext = path.extname(filename).toLowerCase();
      const format = ext === '.png' ? 'png' : 'jpeg';
      
      // Convert processed image back to base64
      const processedBase64 = `data:image/${format};base64,${result.buffer.toString('base64')}`;
      
      // Return processed image
      res.json({
        processedImage: processedBase64,
        path: result.path
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error resizing image", error: error.message });
    }
  });
  
  app.post("/api/images/optimize", requireAuth, async (req, res) => {
    try {
      const { imageBase64, filename, quality } = req.body;
      
      if (!imageBase64 || !filename) {
        return res.status(400).json({ message: "Image data and filename are required" });
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
      
      // Process the image
      const result = await optimizeImage(imageBuffer, filename, quality || 80);
      
      // Determine image format from filename extension
      const ext = path.extname(filename).toLowerCase();
      const format = ext === '.png' ? 'png' : (ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : 'webp');
      
      // Convert processed image back to base64
      const processedBase64 = `data:image/${format};base64,${result.buffer.toString('base64')}`;
      
      // Return processed image
      res.json({
        processedImage: processedBase64,
        path: result.path,
        originalSize: imageBuffer.length,
        optimizedSize: result.buffer.length,
        reduction: ((imageBuffer.length - result.buffer.length) / imageBuffer.length * 100).toFixed(1) + '%'
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error optimizing image", error: error.message });
    }
  });
  
  app.post("/api/images/extract-colors", requireAuth, async (req, res) => {
    try {
      const { imageBase64, count } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ message: "Image data is required" });
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
      
      // Extract dominant colors
      const colors = await extractDominantColors(imageBuffer, count || 5);
      
      // Return color data
      res.json({ colors });
    } catch (error: any) {
      res.status(500).json({ message: "Error extracting colors", error: error.message });
    }
  });
  
  app.post("/api/images/metadata", requireAuth, async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ message: "Image data is required" });
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
      
      // Get image metadata
      const metadata = await getImageMetadata(imageBuffer);
      
      // Return metadata
      res.json({ metadata });
    } catch (error: any) {
      res.status(500).json({ message: "Error getting image metadata", error: error.message });
    }
  });
  
  app.post("/api/images/generate-thumbnail", requireAuth, async (req, res) => {
    try {
      const { imageBase64, filename } = req.body;
      
      if (!imageBase64 || !filename) {
        return res.status(400).json({ message: "Image data and filename are required" });
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
      
      // Generate thumbnail
      const result = await generateThumbnail(imageBuffer, filename);
      
      // Convert processed image back to base64
      const processedBase64 = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;
      
      // Return processed image
      res.json({
        thumbnail: processedBase64,
        path: result.path
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error generating thumbnail", error: error.message });
    }
  });

  // PDF GENERATION ROUTES
  app.post("/api/print/barcodes", requireAuth, async (req, res) => {
    try {
      const { itemIds } = req.body;
      
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ message: "Item IDs are required" });
      }
      
      // Generate PDF
      const pdfBuffer = await generateBarcodeLabels(itemIds);
      
      // Send PDF as response
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=barcodes.pdf");
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: "Error generating barcode labels", error: error.message });
    }
  });
  
  app.post("/api/print/qrcodes", requireAuth, async (req, res) => {
    try {
      const { itemIds } = req.body;
      
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ message: "Item IDs are required" });
      }
      
      // Generate PDF
      const pdfBuffer = await generateQrCodeLabels(itemIds);
      
      // Send PDF as response
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=qrcodes.pdf");
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: "Error generating QR code labels", error: error.message });
    }
  });
  
  app.post("/api/print/packing-slip/:itemId", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const orderInfo = req.body;
      
      if (!orderInfo) {
        return res.status(400).json({ message: "Order info is required" });
      }
      
      // Check if required fields are present
      const requiredFields = ["orderNumber", "orderDate", "customerName", "shippingAddress", "paymentMethod"];
      const missingFields = requiredFields.filter(field => !orderInfo[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: "Missing required fields", 
          missingFields 
        });
      }
      
      // Generate PDF
      const pdfBuffer = await generatePackingSlip(itemId, {
        ...orderInfo,
        orderDate: new Date(orderInfo.orderDate)
      });
      
      // Send PDF as response
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=packing-slip.pdf");
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: "Error generating packing slip", error: error.message });
    }
  });
  
  app.get("/api/print/inventory-report", requireAuth, async (req, res) => {
    try {
      const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
      
      // Generate PDF
      const pdfBuffer = await generateInventoryReport(storeId);
      
      // Send PDF as response
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=inventory-report.pdf");
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: "Error generating inventory report", error: error.message });
    }
  });

  // PAYPAL ROUTES
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });
  
  // OPENAI ASSISTANTS ROUTES
  app.post("/api/assistants/threads", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const thread = await createThread(user.id);
      res.json(thread);
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ 
        message: "Error creating assistant thread",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/assistants/threads/:threadId/messages", requireAuth, async (req, res) => {
    try {
      const { threadId } = req.params;
      const { content, fileIds } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      const message = await addMessageToThread(threadId, content, fileIds || []);
      res.json(message);
    } catch (error) {
      console.error("Error adding message to thread:", error);
      res.status(500).json({ 
        message: "Error adding message to assistant thread",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/assistants/threads/:threadId/messages", requireAuth, async (req, res) => {
    try {
      const { threadId } = req.params;
      const messages = await getThreadMessages(threadId);
      res.json(messages);
    } catch (error) {
      console.error("Error getting thread messages:", error);
      res.status(500).json({ 
        message: "Error retrieving assistant thread messages",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/assistants/threads/:threadId/run", requireAuth, async (req, res) => {
    try {
      const { threadId } = req.params;
      const { assistantName, additionalInstructions } = req.body;
      
      if (!assistantName) {
        return res.status(400).json({ message: "Assistant name is required" });
      }
      
      const response = await runAssistantOnThread(assistantName, threadId, additionalInstructions);
      res.json(response);
    } catch (error) {
      console.error("Error running assistant:", error);
      res.status(500).json({ 
        message: "Error running assistant on thread",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/assistants/optimize-listing", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { title, description, category, marketplace } = req.body;
      
      if (!title || !description || !marketplace) {
        return res.status(400).json({ message: "Title, description, and marketplace are required" });
      }
      
      const response = await generateOptimizedListing(
        user.id,
        title,
        description,
        category || "General", 
        marketplace
      );
      
      res.json(response);
    } catch (error) {
      console.error("Error generating optimized listing:", error);
      res.status(500).json({ 
        message: "Error generating optimized listing",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/assistants/analyze-pricing", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { 
        productTitle, 
        category, 
        condition, 
        costPrice, 
        competitorPrices, 
        marketplace 
      } = req.body;
      
      if (!productTitle || !category || !condition) {
        return res.status(400).json({ 
          message: "Product title, category, and condition are required" 
        });
      }
      
      const response = await analyzePricingWithAssistant(
        user.id,
        productTitle,
        category,
        condition,
        parseFloat(costPrice) || 0,
        Array.isArray(competitorPrices) ? competitorPrices.map(p => parseFloat(p) || 0) : [],
        marketplace || "General"
      );
      
      res.json(response);
    } catch (error) {
      console.error("Error analyzing pricing:", error);
      res.status(500).json({ 
        message: "Error analyzing pricing strategy",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/assistants/identify-product", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { productDescription, imageFileId } = req.body;
      
      if (!productDescription) {
        return res.status(400).json({ message: "Product description is required" });
      }
      
      const response = await identifyProductWithAssistant(
        user.id,
        productDescription,
        imageFileId
      );
      
      res.json(response);
    } catch (error) {
      console.error("Error identifying product:", error);
      res.status(500).json({ 
        message: "Error identifying product",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/assistants/customer-service", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { customerInquiry, productDetails, orderDetails } = req.body;
      
      if (!customerInquiry || !productDetails) {
        return res.status(400).json({ 
          message: "Customer inquiry and product details are required" 
        });
      }
      
      const response = await generateCustomerServiceResponse(
        user.id,
        customerInquiry,
        productDetails,
        orderDetails
      );
      
      res.json(response);
    } catch (error) {
      console.error("Error generating customer service response:", error);
      res.status(500).json({ 
        message: "Error generating customer service response",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // MOBILE BARCODE SCANNER ROUTES
  app.get("/api/inventory/barcode/:barcode", requireAuth, async (req, res) => {
    try {
      const { barcode } = req.params;
      const user = req.user as any;
      
      if (!barcode) {
        return res.status(400).json({ message: "Barcode is required" });
      }
      
      // Look up the inventory item by barcode
      const item = await storage.getInventoryItemByBarcode(user.id, barcode);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error looking up barcode:", error);
      res.status(500).json({ 
        message: "Error looking up barcode",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });



  // TEST ROUTES for Database Integration
  
  // Test image processing with database
  app.post("/api/test/image-processing", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Process the image using our AI service
      const result = await processProductImage(imageBase64, (req.user as any).id);
      
      // Return the analysis results
      res.json({
        success: true,
        analysisId: result.analysisId,
        results: result.results,
        message: "Image processed successfully and saved to database"
      });
    } catch (error) {
      console.error("Error in image processing test:", error);
      res.status(500).json({ 
        error: "Failed to process image",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Test retrieving image analyses from database
  app.get("/api/test/image-analyses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      // Get all analyses for the user from database
      const analyses = await storage.getImageAnalysesByUser((req.user as any).id);
      
      res.json({
        success: true,
        count: analyses.length,
        analyses
      });
    } catch (error) {
      console.error("Error retrieving image analyses:", error);
      res.status(500).json({ error: "Failed to retrieve image analyses" });
    }
  });
  
  // Test marketplace integration with database
  app.post("/api/test/marketplace-connect", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { marketplaceType, credentials } = req.body;
      if (!marketplaceType) {
        return res.status(400).json({ error: "Marketplace type is required" });
      }

      // Connect to marketplace and store in database
      const marketplace = await connectMarketplace(
        (req.user as any).id, 
        marketplaceType, 
        credentials || {}
      );
      
      res.json({
        success: true,
        marketplace,
        message: `Successfully connected to ${marketplace.name}`
      });
    } catch (error) {
      console.error("Error in marketplace connect test:", error);
      res.status(500).json({ error: "Failed to connect marketplace" });
    }
  });

  // Test getting marketplaces from database
  app.get("/api/test/marketplaces", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      // Get all marketplaces for the user from database
      const marketplaces = await storage.getMarketplacesByUser((req.user as any).id);
      
      res.json({
        success: true,
        count: marketplaces.length,
        marketplaces
      });
    } catch (error) {
      console.error("Error retrieving marketplaces:", error);
      res.status(500).json({ error: "Failed to retrieve marketplaces" });
    }
  });
  
  // Test CSV generation for a marketplace
  app.post("/api/test/generate-csv", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const { marketplaceId, marketplaceType } = req.body;
      if (!marketplaceType) {
        return res.status(400).json({ error: "Marketplace type is required" });
      }
      
      // Get the marketplace if ID provided
      let marketplace: any;
      if (marketplaceId) {
        marketplace = await storage.getMarketplace(marketplaceId);
        if (!marketplace || marketplace.userId !== (req.user as any).id) {
          return res.status(404).json({ error: "Marketplace not found" });
        }
      }
      
      // Generate CSV file
      const marketplaceIdToUse = marketplace?.id || (marketplaceId ? parseInt(marketplaceId, 10) : undefined);
      if (!marketplaceIdToUse) {
        return res.status(400).json({ error: "Valid marketplace ID is required" });
      }
      
      const csvResult = await generateMarketplaceCSVFile(marketplaceIdToUse);
      
      res.json({
        success: true,
        csvPath: csvResult.filePath,
        fileName: csvResult.fileName,
        message: `Successfully generated CSV file for ${marketplaceType}`
      });
    } catch (error) {
      console.error("Error in CSV generation test:", error);
      res.status(500).json({ 
        error: "Failed to generate CSV",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Test inventory item retrieval
  app.get("/api/test/inventory", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      // Get inventory items for the user
      const items = await storage.getInventoryItemsByUser((req.user as any).id);
      
      res.json({
        success: true,
        count: items.length,
        items
      });
    } catch (error) {
      console.error("Error retrieving inventory items:", error);
      res.status(500).json({ error: "Failed to retrieve inventory items" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time inventory updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to MrLister WebSocket server'
    }));
    
    // Handle messages from clients
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Process different message types
        switch (data.type) {
          case 'subscribe':
            handleSubscribe(ws, data);
            break;
          case 'inventory_update':
            broadcastInventoryUpdate(ws, data);
            break;
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // Handle client subscription to updates
  function handleSubscribe(ws: WebSocket, data: any) {
    const { channel } = data;
    // In a real implementation, add this connection to a channel map
    ws.send(JSON.stringify({
      type: 'subscription_confirmed',
      channel: channel
    }));
  }
  
  // Broadcast inventory updates to all connected clients
  function broadcastInventoryUpdate(sourceWs: WebSocket, data: any) {
    wss.clients.forEach((client) => {
      if (client !== sourceWs && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'inventory_update',
          data: data.data
        }));
      }
    });
  }

  return httpServer;
}
