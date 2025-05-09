import { InventoryItem } from '@shared/schema';
import fs from 'fs/promises';
import path from 'path';

interface MarketplaceCSVConfig {
  headers: string[];
  mapInventoryToRow: (item: InventoryItem) => Record<string, string | number | null>;
  generateFilename: (marketplaceName: string) => string;
}

// Define CSV format configuration for each marketplace
const marketplaceCSVConfigs: Record<string, MarketplaceCSVConfig> = {
  shopify: {
    headers: [
      'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 
      'Tags', 'Published', 'Option1 Name', 'Option1 Value', 'Option2 Name', 
      'Option2 Value', 'Option3 Name', 'Option3 Value', 'Variant SKU', 
      'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
      'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price', 
      'Variant Compare At Price', 'Variant Requires Shipping', 'Variant Taxable',
      'Variant Barcode', 'Image Src', 'Image Position', 'Image Alt Text', 
      'Gift Card', 'SEO Title', 'SEO Description', 'Google Shopping / Google Product Category',
      'Google Shopping / Gender', 'Google Shopping / Age Group', 'Google Shopping / MPN',
      'Google Shopping / AdWords Grouping', 'Google Shopping / AdWords Labels',
      'Google Shopping / Condition', 'Google Shopping / Custom Product',
      'Google Shopping / Custom Label 0', 'Google Shopping / Custom Label 1',
      'Google Shopping / Custom Label 2', 'Google Shopping / Custom Label 3',
      'Google Shopping / Custom Label 4', 'Variant Image', 'Variant Weight Unit',
      'Variant Tax Code', 'Cost per item', 'Status'
    ],
    mapInventoryToRow: (item: InventoryItem) => ({
      'Handle': item.sku.toLowerCase(),
      'Title': item.title,
      'Body (HTML)': item.description,
      'Vendor': 'MrLister',
      'Product Category': item.category,
      'Type': item.subcategory || item.category,
      'Tags': `${item.category},${item.subcategory || ''},${item.condition}`,
      'Published': 'TRUE',
      'Option1 Name': 'Condition',
      'Option1 Value': item.condition,
      'Option2 Name': '',
      'Option2 Value': '',
      'Option3 Name': '',
      'Option3 Value': '',
      'Variant SKU': item.sku,
      'Variant Grams': '0',
      'Variant Inventory Tracker': 'shopify',
      'Variant Inventory Qty': item.quantity,
      'Variant Inventory Policy': 'deny',
      'Variant Fulfillment Service': 'manual',
      'Variant Price': item.price,
      'Variant Compare At Price': '',
      'Variant Requires Shipping': 'TRUE',
      'Variant Taxable': 'TRUE',
      'Variant Barcode': item.metadata?.barcode || '',
      'Image Src': item.imageUrls?.[0] || '',
      'Image Position': '1',
      'Image Alt Text': item.title,
      'Gift Card': 'FALSE',
      'SEO Title': item.title,
      'SEO Description': item.description?.substring(0, 160) || '',
      'Google Shopping / Google Product Category': mapCategoryToGoogleShopping(item.category),
      'Google Shopping / Gender': 'Unisex',
      'Google Shopping / Age Group': 'Adult',
      'Google Shopping / MPN': item.sku,
      'Google Shopping / AdWords Grouping': item.category,
      'Google Shopping / AdWords Labels': item.category,
      'Google Shopping / Condition': mapConditionToGoogleShopping(item.condition),
      'Google Shopping / Custom Product': 'FALSE',
      'Google Shopping / Custom Label 0': item.category,
      'Google Shopping / Custom Label 1': item.subcategory || '',
      'Google Shopping / Custom Label 2': item.condition,
      'Google Shopping / Custom Label 3': '',
      'Google Shopping / Custom Label 4': '',
      'Variant Image': '',
      'Variant Weight Unit': 'kg',
      'Variant Tax Code': '',
      'Cost per item': item.cost || '',
      'Status': 'active'
    }),
    generateFilename: (marketplaceName) => `${marketplaceName.toLowerCase()}_products_${formatDate()}.csv`
  },
  
  ebay: {
    headers: [
      'Action', 'CustomLabel', 'Category', 'ConditionID', 'Title', 
      'Description', 'Format', 'Duration', 'StartPrice', 'Quantity',
      'PicURL', 'ShippingService', 'ShippingServiceCost', 'Location'
    ],
    mapInventoryToRow: (item: InventoryItem) => ({
      'Action': 'Add',
      'CustomLabel': item.sku,
      'Category': getEbayCategoryID(item.category, item.subcategory),
      'ConditionID': getEbayConditionID(item.condition),
      'Title': item.title.substring(0, 80), // eBay has 80 char limit
      'Description': item.description,
      'Format': 'FixedPrice',
      'Duration': 'GTC', // Good 'Til Cancelled
      'StartPrice': item.price,
      'Quantity': item.quantity,
      'PicURL': item.imageUrls?.[0] || '',
      'ShippingService': 'ShippingMethodStandard',
      'ShippingServiceCost': '0',
      'Location': 'United States'
    }),
    generateFilename: (marketplaceName) => `${marketplaceName.toLowerCase()}_listings_${formatDate()}.csv`
  },
  
  etsy: {
    headers: [
      'title', 'description', 'price', 'quantity', 'sku', 'when_made',
      'who_made', 'item_weight', 'item_length', 'item_width', 'item_height',
      'item_weight_unit', 'item_dimensions_unit', 'is_supply', 'is_customizable',
      'is_digital', 'file_data', 'shipping_template_id', 'shop_section_id',
      'tags', 'materials', 'image_1', 'image_2', 'image_3', 'image_4', 'image_5',
      'state', 'is_taxable', 'processing_min', 'processing_max', 'taxonomy_id'
    ],
    mapInventoryToRow: (item: InventoryItem) => ({
      'title': item.title,
      'description': item.description,
      'price': item.price,
      'quantity': item.quantity,
      'sku': item.sku,
      'when_made': '2020_2023', // For vintage items would be different
      'who_made': 'i_did',
      'item_weight': '',
      'item_length': '',
      'item_width': '',
      'item_height': '',
      'item_weight_unit': 'g',
      'item_dimensions_unit': 'in',
      'is_supply': 'FALSE',
      'is_customizable': 'FALSE',
      'is_digital': 'FALSE',
      'file_data': '',
      'shipping_template_id': '',
      'shop_section_id': '',
      'tags': `${item.category},${item.subcategory || ''},${item.condition}`,
      'materials': '',
      'image_1': item.imageUrls?.[0] || '',
      'image_2': item.imageUrls?.[1] || '',
      'image_3': item.imageUrls?.[2] || '',
      'image_4': item.imageUrls?.[3] || '',
      'image_5': item.imageUrls?.[4] || '',
      'state': getEtsyItemState(item.condition),
      'is_taxable': 'TRUE',
      'processing_min': '1',
      'processing_max': '3',
      'taxonomy_id': ''
    }),
    generateFilename: (marketplaceName) => `${marketplaceName.toLowerCase()}_items_${formatDate()}.csv`
  },
  
  amazon: {
    headers: [
      'sku', 'product-id', 'product-id-type', 'price', 'minimum-seller-allowed-price',
      'maximum-seller-allowed-price', 'item-condition', 'quantity', 'add-delete',
      'will-ship-internationally', 'expedited-shipping', 'item-note', 'fulfillment-center-id',
      'product-tax-code', 'item-name', 'item-description', 'listing-price', 'shipping-price',
      'category', 'subcategory', 'main-image-url', 'swatch-image-url', 'merchant-shipping-group'
    ],
    mapInventoryToRow: (item: InventoryItem) => {
      const itemName = item.title.length > 255 ? item.title.substring(0, 255) : item.title;
      
      return {
        'sku': item.sku,
        'product-id': '', // Would be UPC, ISBN, etc. in real use
        'product-id-type': '1', // ASIN=1, UPC=2, EAN=3, ISBN=4
        'price': item.price,
        'minimum-seller-allowed-price': '',
        'maximum-seller-allowed-price': '',
        'item-condition': getAmazonConditionType(item.condition),
        'quantity': item.quantity,
        'add-delete': 'a', // a=add, d=delete
        'will-ship-internationally': 'n',
        'expedited-shipping': 'n',
        'item-note': '',
        'fulfillment-center-id': 'DEFAULT',
        'product-tax-code': 'A_GEN_NOTAX',
        'item-name': itemName,
        'item-description': item.description,
        'listing-price': item.price,
        'shipping-price': '0',
        'category': item.category,
        'subcategory': item.subcategory || '',
        'main-image-url': item.imageUrls?.[0] || '',
        'swatch-image-url': '',
        'merchant-shipping-group': 'Standard'
      };
    },
    generateFilename: (marketplaceName) => `${marketplaceName.toLowerCase()}_inventory_${formatDate()}.csv`
  }
};

/**
 * Generate CSV content for a specific marketplace
 */
export async function generateMarketplaceCSV(
  marketplaceType: string,
  items: InventoryItem[]
): Promise<string> {
  const type = marketplaceType.toLowerCase();
  
  if (!isMarketplaceSupported(type)) {
    throw new Error(`Marketplace type "${type}" is not supported for CSV export`);
  }
  
  const config = marketplaceCSVConfigs[type];
  
  // Create CSV header
  let csv = config.headers.join(',') + '\n';
  
  // Add each item row
  for (const item of items) {
    const row = config.mapInventoryToRow(item);
    
    // Construct the CSV row in the right order based on headers
    const rowValues = config.headers.map(header => {
      const value = row[header];
      return escapeCSV(value?.toString() || '');
    });
    
    csv += rowValues.join(',') + '\n';
  }
  
  return csv;
}

/**
 * Save CSV file to the server
 */
export async function saveCSVFile(
  marketplaceType: string,
  csvContent: string
): Promise<{ filePath: string; fileName: string }> {
  const type = marketplaceType.toLowerCase();
  
  if (!isMarketplaceSupported(type)) {
    throw new Error(`Marketplace type "${type}" is not supported for CSV export`);
  }
  
  const config = marketplaceCSVConfigs[type];
  const fileName = config.generateFilename(type);
  const tempDir = path.join(process.cwd(), 'temp');
  
  // Create the temp directory if it doesn't exist
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    console.error('Error creating temp directory:', error);
  }
  
  const filePath = path.join(tempDir, fileName);
  
  await fs.writeFile(filePath, csvContent, 'utf8');
  
  return {
    filePath,
    fileName
  };
}

/**
 * Helper to convert general conditions to marketplace-specific formats
 */
function mapConditionToGoogleShopping(condition: string): string {
  switch (condition.toLowerCase()) {
    case 'new':
    case 'new with tags':
      return 'new';
    case 'new without tags':
      return 'new';
    case 'new with defects':
      return 'new';
    case 'like new':
    case 'excellent':
      return 'new';
    case 'very good':
      return 'used';
    case 'good':
      return 'used';
    case 'fair':
    case 'acceptable':
      return 'used';
    case 'for parts or not working':
      return 'used';
    default:
      return 'used';
  }
}

function mapCategoryToGoogleShopping(category: string): string {
  // Basic mapping - in real app this would be much more detailed
  switch (category.toLowerCase()) {
    case 'clothing':
      return 'Apparel & Accessories > Clothing';
    case 'electronics':
      return 'Electronics';
    case 'jewelry':
      return 'Apparel & Accessories > Jewelry';
    case 'art':
      return 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts';
    case 'books':
      return 'Media > Books';
    case 'music':
      return 'Media > Music & Sound Recordings';
    case 'toys':
      return 'Toys & Games';
    case 'home':
      return 'Home & Garden';
    default:
      return 'Collectibles & Memorabilia';
  }
}

/**
 * Get eBay Condition ID
 */
function getEbayConditionID(condition: string): number {
  switch (condition.toLowerCase()) {
    case 'new':
    case 'new with tags':
      return 1000;
    case 'new without tags':
      return 1500;
    case 'new with defects':
      return 1750;
    case 'like new':
    case 'excellent':
      return 2000;
    case 'very good':
      return 3000;
    case 'good':
      return 4000;
    case 'fair':
    case 'acceptable':
      return 5000;
    case 'for parts or not working':
      return 7000;
    default:
      return 3000; // Default to 'Very Good'
  }
}

/**
 * Get eBay Category ID
 */
function getEbayCategoryID(category: string, subcategory?: string | null): string {
  // Simplified version - in a real app, this would map to actual eBay category IDs
  // and would be much more comprehensive
  switch (category.toLowerCase()) {
    case 'clothing':
      return '11450';
    case 'electronics':
      return '293';
    case 'collectibles':
      return '1';
    case 'jewelry':
      return '281';
    case 'art':
      return '550';
    case 'books':
      return '267';
    case 'music':
      return '11233';
    case 'toys':
      return '220';
    case 'home':
      return '11700';
    default:
      return '1'; // Collectibles as default
  }
}

/**
 * Get Etsy Item State
 */
function getEtsyItemState(condition: string): string {
  switch (condition.toLowerCase()) {
    case 'new':
    case 'new with tags':
    case 'new without tags':
      return 'active';
    case 'new with defects':
    case 'like new':
    case 'excellent':
    case 'very good':
    case 'good':
    case 'fair':
    case 'acceptable':
      return 'active';
    case 'for parts or not working':
      return 'draft';
    default:
      return 'active';
  }
}

/**
 * Get Amazon Condition Type
 */
function getAmazonConditionType(condition: string): string {
  switch (condition.toLowerCase()) {
    case 'new':
    case 'new with tags':
    case 'new without tags':
      return 'New';
    case 'new with defects':
      return 'NewWithDefects';
    case 'like new':
    case 'excellent':
      return 'UsedLikeNew';
    case 'very good':
      return 'UsedVeryGood';
    case 'good':
      return 'UsedGood';
    case 'fair':
    case 'acceptable':
      return 'UsedAcceptable';
    case 'for parts or not working':
      return 'ForPartsOrNotWorking';
    default:
      return 'UsedGood';
  }
}

/**
 * Extract bullet points from description
 */
function extractBulletPoints(description?: string): string[] {
  if (!description) return [];
  
  const bulletPoints: string[] = [];
  const lines = description.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      const bullet = trimmed.substring(1).trim();
      if (bullet) {
        bulletPoints.push(bullet);
      }
    }
  }
  
  return bulletPoints.slice(0, 5); // Many marketplaces limit to 5 bullet points
}

/**
 * Format date for filename
 */
function formatDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Escape CSV values
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // If the value contains quotes, commas, or newlines, wrap it in quotes and escape any quotes
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

/**
 * Check if a marketplace type is supported
 */
export function isMarketplaceSupported(marketplaceType: string): boolean {
  return Object.keys(marketplaceCSVConfigs).includes(marketplaceType.toLowerCase());
}