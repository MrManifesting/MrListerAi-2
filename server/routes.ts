import type { Express } from "express";
import { createServer, type Server } from "http";
import * as path from "path";
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
  generateMarketplaceCSV
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
      saveUninitialized: false,
      store: new MemStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
  app.post("/api/auth/login", (req, res, next) => {
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

  app.post("/api/auth/register", async (req, res) => {
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

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
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

  app.post("/api/auth/logout", (req, res) => {
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
  app.post("/api/analyze/image", requireAuth, async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ message: "Image data is required" });
      }
      
      const user = req.user as any;
      const result = await processProductImage(imageBase64, user.id);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error analyzing image" });
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

  // MARKETPLACE ROUTES
  app.get("/api/marketplaces", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const marketplaces = await storage.getMarketplacesByUser(user.id);
      res.json(marketplaces);
    } catch (error) {
      res.status(500).json({ message: "Error fetching marketplaces" });
    }
  });

  app.post("/api/marketplaces/connect", requireAuth, async (req, res) => {
    try {
      const { marketplaceName, authCode } = req.body;
      
      if (!marketplaceName || !authCode) {
        return res.status(400).json({ message: "Marketplace name and auth code are required" });
      }
      
      const user = req.user as any;
      const result = await connectMarketplace(user.id, marketplaceName, authCode);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error connecting to marketplace" });
    }
  });

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
      const { marketplaceName, inventoryIds } = req.body;
      
      if (!marketplaceName) {
        return res.status(400).json({ message: "Marketplace name is required" });
      }
      
      const user = req.user as any;
      const csv = await generateMarketplaceCSV(user.id, marketplaceName, inventoryIds);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${marketplaceName.toLowerCase()}-listings.csv"`);
      res.send(csv);
    } catch (error) {
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

  const httpServer = createServer(app);

  return httpServer;
}
