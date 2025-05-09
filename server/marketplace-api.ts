import { storage } from './storage';
import { InsertMarketplace, Marketplace } from '@shared/schema';

// Mock for marketplace API integration
// In a real application, this would integrate with the actual marketplace APIs

type MarketplaceAuth = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

// Connect to a marketplace
export async function connectMarketplace(
  userId: number,
  marketplaceName: string,
  authCode: string
): Promise<Marketplace> {
  try {
    // Check if marketplace connection already exists
    const existingMarketplaces = await storage.getMarketplacesByUser(userId);
    const existingConnection = existingMarketplaces.find(m => m.name.toLowerCase() === marketplaceName.toLowerCase());
    
    if (existingConnection) {
      // Update existing connection
      const auth = await mockAuthenticateMarketplace(marketplaceName, authCode);
      
      const updatedMarketplace = await storage.updateMarketplace(existingConnection.id, {
        isConnected: true,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        tokenExpiry: new Date(Date.now() + auth.expiresIn * 1000),
        updatedAt: new Date()
      });
      
      return updatedMarketplace!;
    } else {
      // Create new connection
      const auth = await mockAuthenticateMarketplace(marketplaceName, authCode);
      
      const newMarketplace: InsertMarketplace = {
        userId,
        name: marketplaceName,
        isConnected: true,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        tokenExpiry: new Date(Date.now() + auth.expiresIn * 1000),
        settings: {},
        activeListings: 0
      };
      
      return await storage.createMarketplace(newMarketplace);
    }
  } catch (error) {
    console.error(`Error connecting to ${marketplaceName}:`, error);
    throw new Error(`Failed to connect to ${marketplaceName}`);
  }
}

// Mock authentication with marketplace
async function mockAuthenticateMarketplace(
  marketplaceName: string,
  authCode: string
): Promise<MarketplaceAuth> {
  // Simulate API auth flow
  return {
    accessToken: `mock-${marketplaceName.toLowerCase()}-access-token-${Date.now()}`,
    refreshToken: `mock-${marketplaceName.toLowerCase()}-refresh-token-${Date.now()}`,
    expiresIn: 3600 * 24 // 24 hours
  };
}

// Get listings from a marketplace
export async function getMarketplaceListings(marketplaceId: number): Promise<any[]> {
  try {
    const marketplace = await storage.getMarketplace(marketplaceId);
    if (!marketplace) {
      throw new Error('Marketplace not found');
    }
    
    return await mockGetListings(marketplace);
  } catch (error) {
    console.error('Error getting marketplace listings:', error);
    throw new Error('Failed to get marketplace listings');
  }
}

// Mock getting listings from marketplace
async function mockGetListings(marketplace: Marketplace): Promise<any[]> {
  // Return mock listings
  return Array.from({ length: marketplace.activeListings || 0 }, (_, i) => ({
    id: `${marketplace.name.toLowerCase()}-listing-${i + 1}`,
    title: `Mock ${marketplace.name} Listing ${i + 1}`,
    price: Math.round(Math.random() * 1000) / 10,
    status: Math.random() > 0.8 ? 'sold' : 'active',
    url: `https://${marketplace.name.toLowerCase()}.example.com/listing-${i + 1}`
  }));
}

// Create a listing on a marketplace
export async function createMarketplaceListing(
  marketplaceId: number,
  inventoryItemId: number
): Promise<any> {
  try {
    const marketplace = await storage.getMarketplace(marketplaceId);
    if (!marketplace) {
      throw new Error('Marketplace not found');
    }
    
    const item = await storage.getInventoryItem(inventoryItemId);
    if (!item) {
      throw new Error('Inventory item not found');
    }
    
    // Mock creating a listing
    const listingId = `${marketplace.name.toLowerCase()}-listing-${Date.now()}`;
    
    // Update active listings count
    await storage.updateMarketplace(marketplaceId, {
      activeListings: (marketplace.activeListings || 0) + 1,
      lastSyncedAt: new Date()
    });
    
    // Update inventory item with marketplace data
    const marketplaceData = {
      ...(item.marketplaceData || {}),
      [marketplace.name]: {
        listingId,
        url: `https://${marketplace.name.toLowerCase()}.example.com/${listingId}`,
        status: 'active',
        createdAt: new Date()
      }
    };
    
    await storage.updateInventoryItem(inventoryItemId, {
      marketplaceData,
      status: 'listed'
    });
    
    return {
      marketplace: marketplace.name,
      listingId,
      url: `https://${marketplace.name.toLowerCase()}.example.com/${listingId}`,
      status: 'active'
    };
  } catch (error) {
    console.error('Error creating marketplace listing:', error);
    throw new Error('Failed to create marketplace listing');
  }
}

// Sync inventory with all connected marketplaces
export async function syncAllMarketplaces(userId: number): Promise<any> {
  try {
    const marketplaces = await storage.getMarketplacesByUser(userId);
    const connectedMarketplaces = marketplaces.filter(m => m.isConnected);
    
    if (connectedMarketplaces.length === 0) {
      return { message: 'No connected marketplaces found' };
    }
    
    const results = await Promise.all(
      connectedMarketplaces.map(async (marketplace) => {
        try {
          // Update last synced timestamp
          await storage.updateMarketplace(marketplace.id, {
            lastSyncedAt: new Date()
          });
          
          return {
            marketplace: marketplace.name,
            status: 'success',
            activeListings: marketplace.activeListings
          };
        } catch (error) {
          console.error(`Error syncing ${marketplace.name}:`, error);
          return {
            marketplace: marketplace.name,
            status: 'error',
            message: `Failed to sync with ${marketplace.name}`
          };
        }
      })
    );
    
    return {
      syncedMarketplaces: results.length,
      results
    };
  } catch (error) {
    console.error('Error syncing marketplaces:', error);
    throw new Error('Failed to sync marketplaces');
  }
}

// Generate CSV export for a marketplace
export async function generateMarketplaceCSV(
  userId: number,
  marketplaceName: string,
  inventoryIds?: number[]
): Promise<string> {
  try {
    // Get inventory items
    let items = await storage.getInventoryItemsByUser(userId);
    
    // Filter by specific inventory IDs if provided
    if (inventoryIds && inventoryIds.length > 0) {
      items = items.filter(item => inventoryIds.includes(item.id));
    }
    
    // Generate CSV headers based on marketplace
    let csvHeaders = '';
    let csvRows: string[] = [];
    
    if (marketplaceName.toLowerCase() === 'ebay') {
      csvHeaders = 'Action,Title,Description,Format,Duration,StartPrice,Quantity,PicURL,Category,ConditionID,ConditionDescription,Location,ShippingService,ShippingCost,SKU';
      
      csvRows = items.map(item => {
        const conditionId = getEbayConditionId(item.condition);
        return `Add,${escapeCSV(item.title)},${escapeCSV(item.description)},FixedPrice,30,${item.price},${item.quantity},${item.imageUrls?.[0] || ''},${getEbayCategory(item.category)},${conditionId},${escapeCSV(item.condition)},"United States",USPSPriority,0.00,${item.sku}`;
      });
    } else if (marketplaceName.toLowerCase() === 'shopify') {
      csvHeaders = 'Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Grams,Variant Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Status';
      
      csvRows = items.map(item => {
        return `${item.sku},${escapeCSV(item.title)},${escapeCSV(item.description)},MrLister,${item.category},${item.subcategory || item.category},"${item.condition}, ${item.category}",TRUE,Condition,${item.condition},${item.sku},0,${item.price},TRUE,TRUE,,${item.imageUrls?.[0] || ''},active`;
      });
    } else {
      // Generic CSV format
      csvHeaders = 'SKU,Title,Description,Category,Subcategory,Condition,Price,Quantity,ImageURL';
      
      csvRows = items.map(item => {
        return `${item.sku},${escapeCSV(item.title)},${escapeCSV(item.description)},${item.category},${item.subcategory || ''},${item.condition},${item.price},${item.quantity},${item.imageUrls?.[0] || ''}`;
      });
    }
    
    return `${csvHeaders}\n${csvRows.join('\n')}`;
  } catch (error) {
    console.error('Error generating marketplace CSV:', error);
    throw new Error('Failed to generate marketplace CSV');
  }
}

// Helper functions for CSV generation
function escapeCSV(text: string): string {
  if (!text) return '';
  return `"${text.replace(/"/g, '""')}"`;
}

function getEbayConditionId(condition: string): number {
  switch (condition.toLowerCase()) {
    case 'new':
    case 'new with tags':
      return 1000;
    case 'new without tags':
      return 1500;
    case 'new with defects':
      return 1750;
    case 'like new':
      return 2000;
    case 'very good':
      return 3000;
    case 'good':
      return 4000;
    case 'acceptable':
      return 5000;
    case 'for parts or not working':
      return 7000;
    default:
      return 3000; // Default to Very Good
  }
}

function getEbayCategory(category: string): number {
  // Simplified mapping of categories to eBay category IDs
  // In a real application, this would be a more comprehensive mapping
  const categoryMap: Record<string, number> = {
    'Electronics': 293,
    'Clothing': 11450,
    'Collectibles': 1,
    'Music': 11233,
    'Jewelry': 281,
    'Home & Garden': 11700,
    'Toys & Hobbies': 220,
    'Books': 267,
    'Art': 550,
    'Business & Industrial': 12576
  };
  
  return categoryMap[category] || 1; // Default to Collectibles
}
