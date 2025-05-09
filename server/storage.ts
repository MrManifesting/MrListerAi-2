import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db, pool } from "./db";
import type { Request } from "express";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
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

export interface IStorage {
  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>; // Added for inventory reports
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  


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
      subscription: "premium"
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
          subscriptionValidUntil: subscriptionValidUntil
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
    try {
      const [marketplace] = await db
        .select()
        .from(marketplaces)
        .where(eq(marketplaces.id, id));
      return marketplace;
    } catch (error) {
      console.error("Error getting marketplace:", error);
      return undefined;
    }
  }

  async getMarketplacesByUser(userId: number): Promise<Marketplace[]> {
    try {
      return await db
        .select()
        .from(marketplaces)
        .where(eq(marketplaces.userId, userId));
    } catch (error) {
      console.error("Error getting marketplaces by user:", error);
      return [];
    }
  }

  async createMarketplace(marketplaceData: InsertMarketplace): Promise<Marketplace> {
    try {
      const [marketplace] = await db
        .insert(marketplaces)
        .values({
          ...marketplaceData,
          lastSyncedAt: new Date()
        })
        .returning();
      return marketplace;
    } catch (error) {
      console.error("Error creating marketplace:", error);
      throw new Error("Failed to create marketplace");
    }
  }

  async updateMarketplace(id: number, marketplaceData: Partial<Marketplace>): Promise<Marketplace | undefined> {
    try {
      const [updatedMarketplace] = await db
        .update(marketplaces)
        .set({
          ...marketplaceData,
          updatedAt: new Date()
        })
        .where(eq(marketplaces.id, id))
        .returning();
      return updatedMarketplace;
    } catch (error) {
      console.error("Error updating marketplace:", error);
      return undefined;
    }
  }

  async deleteMarketplace(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(marketplaces)
        .where(eq(marketplaces.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting marketplace:", error);
      return false;
    }
  }

  // Store Methods
  async getStore(id: number): Promise<Store | undefined> {
    try {
      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, id));
      return store;
    } catch (error) {
      console.error("Error getting store:", error);
      return undefined;
    }
  }

  async getStoresByOwner(ownerId: number): Promise<Store[]> {
    try {
      return await db
        .select()
        .from(stores)
        .where(eq(stores.ownerId, ownerId));
    } catch (error) {
      console.error("Error getting stores by owner:", error);
      return [];
    }
  }

  async getStoresByManager(managerId: number): Promise<Store[]> {
    try {
      return await db
        .select()
        .from(stores)
        .where(eq(stores.managerId, managerId));
    } catch (error) {
      console.error("Error getting stores by manager:", error);
      return [];
    }
  }

  async createStore(storeData: InsertStore): Promise<Store> {
    try {
      const [store] = await db
        .insert(stores)
        .values(storeData)
        .returning();
      return store;
    } catch (error) {
      console.error("Error creating store:", error);
      throw new Error("Failed to create store");
    }
  }

  async updateStore(id: number, storeData: Partial<Store>): Promise<Store | undefined> {
    try {
      const [updatedStore] = await db
        .update(stores)
        .set({
          ...storeData,
          updatedAt: new Date()
        })
        .where(eq(stores.id, id))
        .returning();
      return updatedStore;
    } catch (error) {
      console.error("Error updating store:", error);
      return undefined;
    }
  }

  async deleteStore(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(stores)
        .where(eq(stores.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting store:", error);
      return false;
    }
  }

  // Sale Methods
  async getSale(id: number): Promise<Sale | undefined> {
    try {
      const [sale] = await db
        .select()
        .from(sales)
        .where(eq(sales.id, id));
      return sale;
    } catch (error) {
      console.error("Error getting sale:", error);
      return undefined;
    }
  }

  async getSalesByUser(userId: number): Promise<Sale[]> {
    try {
      return await db
        .select()
        .from(sales)
        .where(eq(sales.userId, userId));
    } catch (error) {
      console.error("Error getting sales by user:", error);
      return [];
    }
  }

  async getSalesByStore(storeId: number): Promise<Sale[]> {
    try {
      return await db
        .select()
        .from(sales)
        .where(eq(sales.storeId, storeId));
    } catch (error) {
      console.error("Error getting sales by store:", error);
      return [];
    }
  }

  async createSale(saleData: InsertSale): Promise<Sale> {
    try {
      const [sale] = await db
        .insert(sales)
        .values({
          ...saleData,
          status: saleData.status || "completed"
        })
        .returning();
      return sale;
    } catch (error) {
      console.error("Error creating sale:", error);
      throw new Error("Failed to create sale");
    }
  }

  async updateSale(id: number, saleData: Partial<Sale>): Promise<Sale | undefined> {
    try {
      const [updatedSale] = await db
        .update(sales)
        .set({
          ...saleData,
          updatedAt: new Date()
        })
        .where(eq(sales.id, id))
        .returning();
      return updatedSale;
    } catch (error) {
      console.error("Error updating sale:", error);
      return undefined;
    }
  }

  async deleteSale(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(sales)
        .where(eq(sales.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting sale:", error);
      return false;
    }
  }

  // Donation Methods
  async getDonation(id: number): Promise<Donation | undefined> {
    try {
      const [donation] = await db
        .select()
        .from(donations)
        .where(eq(donations.id, id));
      return donation;
    } catch (error) {
      console.error("Error getting donation:", error);
      return undefined;
    }
  }

  async getDonationsByUser(userId: number): Promise<Donation[]> {
    try {
      return await db
        .select()
        .from(donations)
        .where(eq(donations.userId, userId));
    } catch (error) {
      console.error("Error getting donations by user:", error);
      return [];
    }
  }

  async createDonation(donationData: InsertDonation): Promise<Donation> {
    try {
      const [donation] = await db
        .insert(donations)
        .values({
          ...donationData,
          donationDate: donationData.donationDate || new Date()
        })
        .returning();
      return donation;
    } catch (error) {
      console.error("Error creating donation:", error);
      throw new Error("Failed to create donation");
    }
  }

  async updateDonation(id: number, donationData: Partial<Donation>): Promise<Donation | undefined> {
    try {
      const [updatedDonation] = await db
        .update(donations)
        .set({
          ...donationData,
          updatedAt: new Date()
        })
        .where(eq(donations.id, id))
        .returning();
      return updatedDonation;
    } catch (error) {
      console.error("Error updating donation:", error);
      return undefined;
    }
  }

  async deleteDonation(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(donations)
        .where(eq(donations.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting donation:", error);
      return false;
    }
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
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, id));
      return subscription;
    } catch (error) {
      console.error("Error getting subscription:", error);
      return undefined;
    }
  }

  async getSubscriptionByUser(userId: number): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      return subscription;
    } catch (error) {
      console.error("Error getting subscription by user:", error);
      return undefined;
    }
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    try {
      const [subscription] = await db
        .insert(subscriptions)
        .values({
          ...subscriptionData
        })
        .returning();
      return subscription;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw new Error("Failed to create subscription");
    }
  }

  async updateSubscription(id: number, subscriptionData: Partial<Subscription>): Promise<Subscription | undefined> {
    try {
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({
          ...subscriptionData,
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, id))
        .returning();
      return updatedSubscription;
    } catch (error) {
      console.error("Error updating subscription:", error);
      return undefined;
    }
  }

  async deleteSubscription(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(subscriptions)
        .where(eq(subscriptions.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting subscription:", error);
      return false;
    }
  }

  // Analytics Methods
  async getAnalyticsByUser(userId: number, startDate: Date, endDate: Date): Promise<Analytics[]> {
    try {
      return await db
        .select()
        .from(analytics)
        .where(
          and(
            eq(analytics.userId, userId),
            gte(analytics.date, startDate),
            lte(analytics.date, endDate)
          )
        )
        .orderBy(desc(analytics.date));
    } catch (error) {
      console.error("Error getting analytics by user:", error);
      return [];
    }
  }

  async createAnalytics(analyticsData: InsertAnalytics): Promise<Analytics> {
    try {
      const [analyticsRecord] = await db
        .insert(analytics)
        .values({
          ...analyticsData,
          marketplaceData: analyticsData.marketplaceData || {}
        })
        .returning();
      return analyticsRecord;
    } catch (error) {
      console.error("Error creating analytics:", error);
      throw new Error("Failed to create analytics");
    }
  }

  async updateAnalytics(id: number, analyticsData: Partial<Analytics>): Promise<Analytics | undefined> {
    try {
      const [updatedAnalytics] = await db
        .update(analytics)
        .set({
          ...analyticsData,
          updatedAt: new Date()
        })
        .where(eq(analytics.id, id))
        .returning();
      return updatedAnalytics;
    } catch (error) {
      console.error("Error updating analytics:", error);
      return undefined;
    }
  }


}

export const storage = new DatabaseStorage();
