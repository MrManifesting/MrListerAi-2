import {
  User,
  InsertUser,
  InventoryItem,
  InsertInventoryItem,
  Marketplace,
  InsertMarketplace,
  Store,
  InsertStore,
  Sale,
  InsertSale,
  Donation,
  InsertDonation,
  ImageAnalysis,
  InsertImageAnalysis,
  Subscription,
  InsertSubscription,
  Analytics,
  InsertAnalytics,
  // Import the table definitions as well
  users,
  inventoryItems,
  marketplaces,
  stores,
  sales,
  donations,
  imageAnalysis,
  subscriptions,
  analytics
} from "@shared/schema";

// Storage interface with all CRUD methods needed for the application
// Employee Checkin interface
export interface EmployeeCheckin {
  id: number;
  userId: number;
  locationId: string;
  timestamp: Date;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertEmployeeCheckin {
  userId: number;
  locationId: string;
  timestamp: Date;
  location: string;
}

export interface IStorage {
  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>; // Added for inventory reports
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Employee Management
  createEmployeeCheckin(checkin: InsertEmployeeCheckin): Promise<EmployeeCheckin>;
  getEmployeeCheckins(userId: number): Promise<EmployeeCheckin[]>;
  getEmployeeCheckinsByLocation(locationId: string): Promise<EmployeeCheckin[]>;

  // Inventory Management
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  getInventoryItemBySku(sku: string): Promise<InventoryItem | undefined>;
  getInventoryItemsByUser(userId: number): Promise<InventoryItem[]>;
  getInventoryItemsByStore(storeId: number): Promise<InventoryItem[]>;
  getInventoryItemByBarcode(userId: number, barcode: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, itemData: Partial<InventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  
  // Marketplace Management
  getMarketplace(id: number): Promise<Marketplace | undefined>;
  getMarketplacesByUser(userId: number): Promise<Marketplace[]>;
  createMarketplace(marketplace: InsertMarketplace): Promise<Marketplace>;
  updateMarketplace(id: number, marketplaceData: Partial<Marketplace>): Promise<Marketplace | undefined>;
  deleteMarketplace(id: number): Promise<boolean>;
  
  // Store Management
  getStore(id: number): Promise<Store | undefined>;
  getStoresByOwner(ownerId: number): Promise<Store[]>;
  getStoresByManager(managerId: number): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, storeData: Partial<Store>): Promise<Store | undefined>;
  deleteStore(id: number): Promise<boolean>;
  
  // Sales Management
  getSale(id: number): Promise<Sale | undefined>;
  getSalesByUser(userId: number): Promise<Sale[]>;
  getSalesByStore(storeId: number): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: number, saleData: Partial<Sale>): Promise<Sale | undefined>;
  deleteSale(id: number): Promise<boolean>;
  
  // Donation Management
  getDonation(id: number): Promise<Donation | undefined>;
  getDonationsByUser(userId: number): Promise<Donation[]>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  updateDonation(id: number, donationData: Partial<Donation>): Promise<Donation | undefined>;
  deleteDonation(id: number): Promise<boolean>;
  
  // Image Analysis Management
  getImageAnalysis(id: number): Promise<ImageAnalysis | undefined>;
  getImageAnalysesByUser(userId: number): Promise<ImageAnalysis[]>;
  createImageAnalysis(analysis: InsertImageAnalysis): Promise<ImageAnalysis>;
  updateImageAnalysis(id: number, analysisData: Partial<ImageAnalysis>): Promise<ImageAnalysis | undefined>;
  deleteImageAnalysis(id: number): Promise<boolean>;
  
  // Subscription Management
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByUser(userId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscriptionData: Partial<Subscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: number): Promise<boolean>;
  
  // Analytics Management
  getAnalyticsByUser(userId: number, startDate: Date, endDate: Date): Promise<Analytics[]>;
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  updateAnalytics(id: number, analyticsData: Partial<Analytics>): Promise<Analytics | undefined>;
}

import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Initialize session store with PostgreSQL
    const PostgresStore = connectPgSimple(session);
    this.sessionStore = new PostgresStore({
      pool,
      tableName: 'session', // Optional. Default is "session"
      createTableIfMissing: true
    });
  }

  // Helper for demo initialization
  private initializeDemoData() {
    // Create a demo user
    const demoUser: InsertUser = {
      username: "demo",
      password: "password123", // In a real app, this would be hashed
      email: "demo@example.com",
      fullName: "John Smith",
      role: "seller",
      subscription: "premium",
      subscriptionValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };
    
    // First check if user exists
    this.getUserByUsername("demo").then(existingUser => {
      if (existingUser) {
        return existingUser;
      } else {
        return this.createUser(demoUser);
      }
    }).then(user => {
      // Add demo marketplaces
      this.createMarketplace({
        userId: user.id,
        name: "eBay",
        isConnected: true,
        settings: {},
        activeListings: 218
      });
      
      this.createMarketplace({
        userId: user.id,
        name: "Shopify",
        isConnected: true,
        settings: {},
        activeListings: 157
      });
      
      // Add demo inventory items
      const demoItems = [
        {
          userId: user.id,
          sku: "VIN-00214",
          title: "The Beatles - Abbey Road Original Vinyl",
          description: "1969 First Press UK Apple Records PCS 7088",
          category: "Music",
          subcategory: "Vinyl Records",
          condition: "Very Good",
          price: 249.99,
          quantity: 1,
          imageUrls: ["https://images.unsplash.com/photo-1539375665275-f9de415ef9ac"],
          thumbnailUrl: "https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80",
          status: "listed"
        },
        {
          userId: user.id,
          sku: "COM-00542",
          title: "Spider-Man #300 Comic Book",
          description: "First appearance of Venom, Marvel Comics, 1988",
          category: "Collectibles",
          subcategory: "Comics",
          condition: "Good",
          price: 699.99,
          quantity: 1,
          imageUrls: ["https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe"],
          thumbnailUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80",
          status: "draft"
        },
        {
          userId: user.id,
          sku: "WAT-00089",
          title: "Vintage Omega Seamaster Automatic Watch",
          description: "1960s Swiss Made, Gold-Filled Case, 34mm",
          category: "Jewelry",
          subcategory: "Watches",
          condition: "Good",
          price: 1245.00,
          quantity: 1,
          imageUrls: ["https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3"],
          thumbnailUrl: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80",
          status: "listed"
        },
        {
          userId: user.id,
          sku: "GAM-00123",
          title: "Nintendo NES Console Complete in Box",
          description: "1985 Original Release with Super Mario Bros",
          category: "Electronics",
          subcategory: "Video Games",
          condition: "Very Good",
          price: 349.99,
          quantity: 0,
          imageUrls: ["https://pixabay.com/get/g8f39efec862e1a4fbbcbc5f07efddeba69eb5e0b59f3c8ced525eb4381ad38e5876324000939e9f1d5608f08b983d5546de1d855494c015ba7c7c63acd6eabb6_1280.jpg"],
          thumbnailUrl: "https://pixabay.com/get/g8f39efec862e1a4fbbcbc5f07efddeba69eb5e0b59f3c8ced525eb4381ad38e5876324000939e9f1d5608f08b983d5546de1d855494c015ba7c7c63acd6eabb6_1280.jpg",
          status: "sold"
        }
      ];
      
      demoItems.forEach(item => this.createInventoryItem(item));
      
      // Create demo image analyses
      this.createImageAnalysis({
        userId: user.id,
        originalImageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
        processedImageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
        detectedItem: "Vintage Polaroid Camera",
        suggestedTitle: "Vintage Polaroid OneStep SX-70 Camera",
        suggestedDescription: "Classic instant camera from the 1970s in excellent working condition with leather case",
        suggestedCategory: "Electronics > Cameras > Instant Cameras",
        suggestedCondition: "Very Good",
        suggestedPrice: 85.99,
        marketPriceRange: { min: 65, max: 120 },
        status: "completed"
      });
      
      this.createImageAnalysis({
        userId: user.id,
        originalImageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
        processedImageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
        detectedItem: "Nike Sneakers",
        suggestedTitle: "Nike Air Max 270 React Blue/White Limited Edition",
        suggestedDescription: "Limited edition Nike Air Max 270 React in blue and white colorway, brand new in box",
        suggestedCategory: "Clothing > Footwear > Athletic Shoes",
        suggestedCondition: "New with Tags",
        suggestedPrice: 129.99,
        marketPriceRange: { min: 95, max: 189 },
        status: "completed"
      });
      
      // Create analytics data
      this.createAnalytics({
        userId: user.id,
        date: new Date(),
        totalInventory: 427,
        activeListings: 326,
        totalSales: 8492,
        totalCommissions: 0,
        platformFees: 254.76,
        marketplaceData: {
          ebay: {
            listings: 218,
            sales: 5230
          },
          shopify: {
            listings: 157,
            sales: 3262
          }
        }
      });
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      // Set default expiration date for subscription (30 days from now)
      const subscriptionValidUntil = new Date();
      subscriptionValidUntil.setDate(subscriptionValidUntil.getDate() + 30);
      
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          role: userData.role || "seller",
          subscription: userData.subscription || "basic",
          subscriptionValidUntil
        })
        .returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // Inventory Methods
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    try {
      const [item] = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, id));
      return item;
    } catch (error) {
      console.error("Error getting inventory item:", error);
      return undefined;
    }
  }

  async getInventoryItemBySku(sku: string): Promise<InventoryItem | undefined> {
    try {
      const [item] = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.sku, sku));
      return item;
    } catch (error) {
      console.error("Error getting inventory item by SKU:", error);
      return undefined;
    }
  }

  async getInventoryItemsByUser(userId: number): Promise<InventoryItem[]> {
    try {
      return await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.userId, userId));
    } catch (error) {
      console.error("Error getting inventory items by user:", error);
      return [];
    }
  }

  async getInventoryItemsByStore(storeId: number): Promise<InventoryItem[]> {
    try {
      return await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.storeId, storeId));
    } catch (error) {
      console.error("Error getting inventory items by store:", error);
      return [];
    }
  }
  
  async getInventoryItemByBarcode(userId: number, barcode: string): Promise<InventoryItem | undefined> {
    try {
      // First try to find an item with matching SKU
      const [itemBySku] = await db
        .select()
        .from(inventoryItems)
        .where(and(
          eq(inventoryItems.userId, userId),
          eq(inventoryItems.sku, barcode)
        ));
      
      if (itemBySku) return itemBySku;
      
      // Get all user items to search in metadata for barcode
      const userItems = await this.getInventoryItemsByUser(userId);
      
      // Look for items where the barcode matches in metadata
      return userItems.find(item => {
        if (item.metadata) {
          const metadata = item.metadata as any;
          return metadata.barcode === barcode || 
                 (Array.isArray(metadata.barcodes) && metadata.barcodes.includes(barcode));
        }
        return false;
      });
    } catch (error) {
      console.error("Error getting inventory item by barcode:", error);
      return undefined;
    }
  }

  async createInventoryItem(itemData: InsertInventoryItem): Promise<InventoryItem> {
    try {
      const [item] = await db
        .insert(inventoryItems)
        .values({
          ...itemData,
          status: itemData.status || "draft"
        })
        .returning();
      return item;
    } catch (error) {
      console.error("Error creating inventory item:", error);
      throw new Error("Failed to create inventory item");
    }
  }

  async updateInventoryItem(id: number, itemData: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    try {
      const [updatedItem] = await db
        .update(inventoryItems)
        .set({
          ...itemData,
          updatedAt: new Date()
        })
        .where(eq(inventoryItems.id, id))
        .returning();
      return updatedItem;
    } catch (error) {
      console.error("Error updating inventory item:", error);
      return undefined;
    }
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    try {
      await db
        .delete(inventoryItems)
        .where(eq(inventoryItems.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      return false;
    }
  }

  // Marketplace Methods
  async getMarketplace(id: number): Promise<Marketplace | undefined> {
    return this.marketplaces.get(id);
  }

  async getMarketplacesByUser(userId: number): Promise<Marketplace[]> {
    return Array.from(this.marketplaces.values()).filter(
      (marketplace) => marketplace.userId === userId
    );
  }

  async createMarketplace(marketplaceData: InsertMarketplace): Promise<Marketplace> {
    const id = this.marketplaceId++;
    const now = new Date();
    const marketplace: Marketplace = {
      ...marketplaceData,
      id,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: now,
    };
    this.marketplaces.set(id, marketplace);
    return marketplace;
  }

  async updateMarketplace(id: number, marketplaceData: Partial<Marketplace>): Promise<Marketplace | undefined> {
    const marketplace = this.marketplaces.get(id);
    if (!marketplace) return undefined;
    
    const updatedMarketplace = {
      ...marketplace,
      ...marketplaceData,
      updatedAt: new Date(),
    };
    this.marketplaces.set(id, updatedMarketplace);
    return updatedMarketplace;
  }

  async deleteMarketplace(id: number): Promise<boolean> {
    return this.marketplaces.delete(id);
  }

  // Store Methods
  async getStore(id: number): Promise<Store | undefined> {
    return this.stores.get(id);
  }

  async getStoresByOwner(ownerId: number): Promise<Store[]> {
    return Array.from(this.stores.values()).filter(
      (store) => store.ownerId === ownerId
    );
  }

  async getStoresByManager(managerId: number): Promise<Store[]> {
    return Array.from(this.stores.values()).filter(
      (store) => store.managerId === managerId
    );
  }

  async createStore(storeData: InsertStore): Promise<Store> {
    const id = this.storeId++;
    const now = new Date();
    const store: Store = {
      ...storeData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.stores.set(id, store);
    return store;
  }

  async updateStore(id: number, storeData: Partial<Store>): Promise<Store | undefined> {
    const store = this.stores.get(id);
    if (!store) return undefined;
    
    const updatedStore = {
      ...store,
      ...storeData,
      updatedAt: new Date(),
    };
    this.stores.set(id, updatedStore);
    return updatedStore;
  }

  async deleteStore(id: number): Promise<boolean> {
    return this.stores.delete(id);
  }

  // Sale Methods
  async getSale(id: number): Promise<Sale | undefined> {
    return this.sales.get(id);
  }

  async getSalesByUser(userId: number): Promise<Sale[]> {
    return Array.from(this.sales.values()).filter(
      (sale) => sale.userId === userId
    );
  }

  async getSalesByStore(storeId: number): Promise<Sale[]> {
    return Array.from(this.sales.values()).filter(
      (sale) => sale.storeId === storeId
    );
  }

  async createSale(saleData: InsertSale): Promise<Sale> {
    const id = this.saleId++;
    const now = new Date();
    const sale: Sale = {
      ...saleData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.sales.set(id, sale);
    return sale;
  }

  async updateSale(id: number, saleData: Partial<Sale>): Promise<Sale | undefined> {
    const sale = this.sales.get(id);
    if (!sale) return undefined;
    
    const updatedSale = {
      ...sale,
      ...saleData,
      updatedAt: new Date(),
    };
    this.sales.set(id, updatedSale);
    return updatedSale;
  }

  async deleteSale(id: number): Promise<boolean> {
    return this.sales.delete(id);
  }

  // Donation Methods
  async getDonation(id: number): Promise<Donation | undefined> {
    return this.donations.get(id);
  }

  async getDonationsByUser(userId: number): Promise<Donation[]> {
    return Array.from(this.donations.values()).filter(
      (donation) => donation.userId === userId
    );
  }

  async createDonation(donationData: InsertDonation): Promise<Donation> {
    const id = this.donationId++;
    const now = new Date();
    const donation: Donation = {
      ...donationData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.donations.set(id, donation);
    return donation;
  }

  async updateDonation(id: number, donationData: Partial<Donation>): Promise<Donation | undefined> {
    const donation = this.donations.get(id);
    if (!donation) return undefined;
    
    const updatedDonation = {
      ...donation,
      ...donationData,
      updatedAt: new Date(),
    };
    this.donations.set(id, updatedDonation);
    return updatedDonation;
  }

  async deleteDonation(id: number): Promise<boolean> {
    return this.donations.delete(id);
  }

  // Image Analysis Methods
  async getImageAnalysis(id: number): Promise<ImageAnalysis | undefined> {
    try {
      const [analysis] = await db
        .select()
        .from(imageAnalysis)
        .where(eq(imageAnalysis.id, id));
      return analysis;
    } catch (error) {
      console.error("Error getting image analysis:", error);
      return undefined;
    }
  }

  async getImageAnalysesByUser(userId: number): Promise<ImageAnalysis[]> {
    try {
      return await db
        .select()
        .from(imageAnalysis)
        .where(eq(imageAnalysis.userId, userId))
        .orderBy(desc(imageAnalysis.createdAt));
    } catch (error) {
      console.error("Error getting image analyses by user:", error);
      return [];
    }
  }

  async createImageAnalysis(analysisData: InsertImageAnalysis): Promise<ImageAnalysis> {
    try {
      const [analysis] = await db
        .insert(imageAnalysis)
        .values({
          ...analysisData,
          status: analysisData.status || "pending"
        })
        .returning();
      return analysis;
    } catch (error) {
      console.error("Error creating image analysis:", error);
      throw new Error("Failed to create image analysis");
    }
  }

  async updateImageAnalysis(id: number, analysisData: Partial<ImageAnalysis>): Promise<ImageAnalysis | undefined> {
    try {
      const [updatedAnalysis] = await db
        .update(imageAnalysis)
        .set({
          ...analysisData,
          updatedAt: new Date()
        })
        .where(eq(imageAnalysis.id, id))
        .returning();
      return updatedAnalysis;
    } catch (error) {
      console.error("Error updating image analysis:", error);
      return undefined;
    }
  }

  async deleteImageAnalysis(id: number): Promise<boolean> {
    try {
      await db
        .delete(imageAnalysis)
        .where(eq(imageAnalysis.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting image analysis:", error);
      return false;
    }
  }

  // Subscription Methods
  async getSubscription(id: number): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async getSubscriptionByUser(userId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.userId === userId
    );
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const id = this.subscriptionId++;
    const now = new Date();
    const subscription: Subscription = {
      ...subscriptionData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscription(id: number, subscriptionData: Partial<Subscription>): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;
    
    const updatedSubscription = {
      ...subscription,
      ...subscriptionData,
      updatedAt: new Date(),
    };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async deleteSubscription(id: number): Promise<boolean> {
    return this.subscriptions.delete(id);
  }

  // Analytics Methods
  async getAnalyticsByUser(userId: number, startDate: Date, endDate: Date): Promise<Analytics[]> {
    return Array.from(this.analyticsData.values()).filter(
      (analytics) => 
        analytics.userId === userId && 
        analytics.date >= startDate && 
        analytics.date <= endDate
    );
  }

  async createAnalytics(analyticsData: InsertAnalytics): Promise<Analytics> {
    const id = this.analyticsId++;
    const now = new Date();
    const analytics: Analytics = {
      ...analyticsData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.analyticsData.set(id, analytics);
    return analytics;
  }

  async updateAnalytics(id: number, analyticsData: Partial<Analytics>): Promise<Analytics | undefined> {
    const analytics = this.analyticsData.get(id);
    if (!analytics) return undefined;
    
    const updatedAnalytics = {
      ...analytics,
      ...analyticsData,
      updatedAt: new Date(),
    };
    this.analyticsData.set(id, updatedAnalytics);
    return updatedAnalytics;
  }
  
  // Employee Check-in Methods
  async createEmployeeCheckin(checkinData: InsertEmployeeCheckin): Promise<EmployeeCheckin> {
    const id = this.checkinId++;
    const now = new Date();
    const checkin: EmployeeCheckin = {
      ...checkinData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.employeeCheckins.set(id, checkin);
    return checkin;
  }
  
  async getEmployeeCheckins(userId: number): Promise<EmployeeCheckin[]> {
    return Array.from(this.employeeCheckins.values()).filter(
      (checkin) => checkin.userId === userId
    );
  }
  
  async getEmployeeCheckinsByLocation(locationId: string): Promise<EmployeeCheckin[]> {
    return Array.from(this.employeeCheckins.values()).filter(
      (checkin) => checkin.locationId === locationId
    );
  }
}

export const storage = new DatabaseStorage();
