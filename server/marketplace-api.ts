import { Marketplace, InsertMarketplace, InventoryItem } from "@shared/schema";
import { storage } from "./storage";
import { generateMarketplaceCSV as generateCSV, saveCSVFile } from "./marketplace-csv";

type MarketplaceAuth = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

/**
 * Connect to a marketplace platform and store authentication info
 */
export async function connectMarketplace(
  userId: number,
  marketplaceType: string,
  credentials: {
    apiKey?: string;
    secret?: string;
    storeUrl?: string;
    username?: string;
    password?: string;
  }
): Promise<Marketplace> {
  // Check if this user already has this marketplace type connected
  const existingMarketplaces = await storage.getMarketplacesByUser(userId);
  const existingMarketplace = existingMarketplaces.find(
    (m) => m.name.toLowerCase() === marketplaceType.toLowerCase()
  );

  if (existingMarketplace) {
    // Update the existing marketplace
    const updatedMarketplace = await storage.updateMarketplace(
      existingMarketplace.id,
      {
        isConnected: true,
        accessToken: "mock_token", // In production, use real OAuth token
        refreshToken: "mock_refresh_token", // In production, use real OAuth refresh token
        lastSyncedAt: new Date(),
      }
    );

    if (!updatedMarketplace) {
      throw new Error(`Failed to update marketplace: ${marketplaceType}`);
    }

    return updatedMarketplace;
  }

  // Mock authenticate with the marketplace
  const authInfo = await mockAuthenticateMarketplace(marketplaceType, credentials);

  // Create a new marketplace in storage
  const newMarketplace: InsertMarketplace = {
    name: marketplaceType,
    userId,
    isConnected: true,
    accessToken: authInfo.accessToken,
    refreshToken: authInfo.refreshToken,
    tokenExpiry: new Date(Date.now() + authInfo.expiresIn * 1000),
    settings: {},
    lastSyncedAt: new Date(),
    activeListings: 0,
  };

  return await storage.createMarketplace(newMarketplace);
}

/**
 * Mock marketplace authentication
 * In a real-world scenario, this would make API calls to each marketplace's OAuth endpoints
 */
async function mockAuthenticateMarketplace(
  marketplaceType: string,
  credentials: any
): Promise<MarketplaceAuth> {
  // Mock OAuth flow - in a real implementation, this would call the marketplace's API
  return {
    accessToken: `mock_${marketplaceType}_token_${Date.now()}`,
    refreshToken: `mock_${marketplaceType}_refresh_${Date.now()}`,
    expiresIn: 3600, // 1 hour
  };
}

/**
 * Get all listings from a connected marketplace
 */
export async function getMarketplaceListings(marketplaceId: number): Promise<any[]> {
  const marketplace = await storage.getMarketplace(marketplaceId);
  if (!marketplace) {
    throw new Error(`Marketplace with ID ${marketplaceId} not found`);
  }

  if (!marketplace.isConnected) {
    throw new Error(`Marketplace ${marketplace.name} is not connected`);
  }

  // In a real implementation, this would call the marketplace API
  // For demo purposes, we'll return mock data
  return mockGetListings(marketplace);
}

/**
 * Mock getting listings from a marketplace
 */
async function mockGetListings(marketplace: Marketplace): Promise<any[]> {
  // Get user's inventory items
  const inventoryItems = await storage.getInventoryItemsByUser(marketplace.userId);
  
  // Convert inventory items to marketplace listings
  return inventoryItems.map(item => ({
    id: `${marketplace.name.toLowerCase()}_${item.id}`,
    title: item.title,
    description: item.description,
    price: item.price,
    url: `https://${marketplace.name.toLowerCase()}.com/listing/${item.id}`,
    status: 'active',
    lastUpdated: new Date().toISOString()
  }));
}

/**
 * Create a new listing on a marketplace
 */
export async function createMarketplaceListing(
  marketplaceId: number,
  inventoryItemId: number
): Promise<any> {
  const marketplace = await storage.getMarketplace(marketplaceId);
  if (!marketplace) {
    throw new Error(`Marketplace with ID ${marketplaceId} not found`);
  }

  if (!marketplace.isConnected) {
    throw new Error(`Marketplace ${marketplace.name} is not connected`);
  }

  const inventoryItem = await storage.getInventoryItem(inventoryItemId);
  if (!inventoryItem) {
    throw new Error(`Inventory item with ID ${inventoryItemId} not found`);
  }

  // In a real implementation, this would call the marketplace API to create the listing
  // For demo purposes, we'll just return a success message
  return {
    success: true,
    listingId: `${marketplace.name.toLowerCase()}_${inventoryItem.id}`,
    url: `https://${marketplace.name.toLowerCase()}.com/listing/${inventoryItem.id}`
  };
}

/**
 * Sync all marketplaces for a user
 */
export async function syncAllMarketplaces(userId: number): Promise<any> {
  const marketplaces = await storage.getMarketplacesByUser(userId);
  
  const results = await Promise.all(
    marketplaces.map(async (marketplace) => {
      try {
        // Mock marketplace sync logic
        // In a real implementation, this would call the marketplace API
        
        // Update the marketplace with lastSyncedAt
        const updatedMarketplace = await storage.updateMarketplace(
          marketplace.id,
          {
            lastSyncedAt: new Date()
          }
        );
        
        return {
          marketplace: updatedMarketplace,
          success: true,
          message: `Successfully synced ${marketplace.name}`
        };
      } catch (error) {
        return {
          marketplace,
          success: false,
          message: `Failed to sync ${marketplace.name}: ${error}`
        };
      }
    })
  );
  
  return results;
}

/**
 * Generate a CSV file for a specific marketplace
 */
export async function generateMarketplaceCSVFile(
  marketplaceId: number,
  inventoryItemIds?: number[]
): Promise<{ filePath: string; fileName: string }> {
  // Get marketplace
  const marketplace = await storage.getMarketplace(marketplaceId);
  if (!marketplace) {
    throw new Error(`Marketplace with ID ${marketplaceId} not found`);
  }
  
  // Generate CSV content from the marketplace-csv service
  const { fileName, csvContent } = await generateCSV(marketplaceId, inventoryItemIds);
  
  // Save the file
  const filePath = await saveCSVFile(fileName, csvContent);
  
  return { filePath, fileName };
}

/**
 * Escape text values for CSV export
 */
function escapeCSV(text: string): string {
  if (!text) return '';
  
  // If value contains comma, newline or double quote, wrap in quotes
  const needsQuotes = /[",\n\r]/.test(text);
  
  if (needsQuotes) {
    // Double up any quotes within the value
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return text;
}

/**
 * Get eBay condition ID
 */
function getEbayConditionId(condition: string): number {
  // eBay condition ID mapping
  const conditionMapping: Record<string, number> = {
    'new': 1000,
    'like_new': 1500,
    'excellent': 1750,
    'very_good': 2000,
    'good': 2500,
    'fair': 3000,
    'poor': 3500,
    'for_parts': 7000
  };
  
  return conditionMapping[condition.toLowerCase()] || 3000;
}

/**
 * Get eBay category from our internal category
 */
function getEbayCategory(category: string): number {
  // Sample category mapping - in a real implementation, this would be a comprehensive mapping
  const categoryMapping: Record<string, number> = {
    'electronics': 293,
    'clothing': 11450,
    'collectibles': 1,
    'jewelry': 281,
    'home': 11700,
    'toys': 220,
    'books': 267,
    'art': 550,
    'sports': 888,
    'business': 12576
  };
  
  return categoryMapping[category.toLowerCase()] || 1;
}