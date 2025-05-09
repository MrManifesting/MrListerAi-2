import { pgTable, text, serial, timestamp, integer, boolean, jsonb, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// USERS & AUTH
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("seller"), // seller, manager, admin
  subscription: text("subscription").notNull().default("basic"), // basic, premium, manager
  subscriptionValidUntil: timestamp("subscription_valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// INVENTORY ITEMS
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  storeId: integer("store_id"),
  sku: text("sku").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  condition: text("condition").notNull(),
  price: real("price").notNull(),
  cost: real("cost"),
  quantity: integer("quantity").notNull().default(1),
  imageUrls: text("image_urls").array(),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("draft"), // draft, listed, sold
  aiGenerated: boolean("ai_generated").default(false),
  aiData: jsonb("ai_data"),
  marketplaceData: jsonb("marketplace_data"),
  metadata: jsonb("metadata"), // For barcodes, QR codes, and other item metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// MARKETPLACES
export const marketplaces = pgTable("marketplaces", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(), // ebay, shopify, etsy, etc.
  isConnected: boolean("is_connected").notNull().default(false),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  settings: jsonb("settings"),
  lastSyncedAt: timestamp("last_synced_at"),
  activeListings: integer("active_listings").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// STORES (for manager-user relationships)
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(), // user who owns the items
  managerId: integer("manager_id"), // sales manager user (if applicable)
  description: text("description"),
  commissionRate: real("commission_rate").default(0),
  platformFeeRate: real("platform_fee_rate").default(0.03), // 3% default
  paymentSettings: jsonb("payment_settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SALES
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  userId: integer("user_id").notNull(),
  storeId: integer("store_id"),
  marketplace: text("marketplace"),
  saleAmount: real("sale_amount").notNull(),
  commissionAmount: real("commission_amount"),
  platformFeeAmount: real("platform_fee_amount"),
  saleDate: timestamp("sale_date").defaultNow().notNull(),
  buyerInfo: jsonb("buyer_info"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// DONATIONS
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  donationValue: real("donation_value").notNull(),
  donationDate: timestamp("donation_date").defaultNow().notNull(),
  organization: text("organization"),
  taxDeductionRate: real("tax_deduction_rate"),
  receiptInfo: jsonb("receipt_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// IMAGE ANALYSIS
export const imageAnalysis = pgTable("image_analysis", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  originalImageUrl: text("original_image_url").notNull(),
  processedImageUrl: text("processed_image_url"),
  detectedItem: text("detected_item"),
  suggestedTitle: text("suggested_title"),
  suggestedDescription: text("suggested_description"),
  suggestedCategory: text("suggested_category"),
  suggestedCondition: text("suggested_condition"),
  suggestedPrice: real("suggested_price"),
  marketPriceRange: jsonb("market_price_range"),
  aiData: jsonb("ai_data"), // Store enhanced AI analysis data (brand, features, barcodes, etc.)
  status: text("status").notNull().default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SUBSCRIPTIONS
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  plan: text("plan").notNull(), // basic, premium, manager
  status: text("status").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ANALYTICS DATA
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  totalInventory: integer("total_inventory"),
  activeListings: integer("active_listings"),
  totalSales: real("total_sales"),
  totalCommissions: real("total_commissions"),
  platformFees: real("platform_fees"),
  marketplaceData: jsonb("marketplace_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// EMPLOYEE CHECK-INS
export const employeeCheckins = pgTable("employee_checkins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  locationId: varchar("location_id", { length: 255 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  location: text("location").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SCHEMA FOR INSERT OPERATIONS
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  subscriptionValidUntil: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMarketplaceSchema = createInsertSchema(marketplaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncedAt: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImageAnalysisSchema = createInsertSchema(imageAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeCheckinSchema = createInsertSchema(employeeCheckins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// TYPE EXPORTS
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type Marketplace = typeof marketplaces.$inferSelect;
export type InsertMarketplace = z.infer<typeof insertMarketplaceSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type Donation = typeof donations.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;

export type ImageAnalysis = typeof imageAnalysis.$inferSelect;
export type InsertImageAnalysis = z.infer<typeof insertImageAnalysisSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;

export type EmployeeCheckin = typeof employeeCheckins.$inferSelect;
export type InsertEmployeeCheckin = z.infer<typeof insertEmployeeCheckinSchema>;
