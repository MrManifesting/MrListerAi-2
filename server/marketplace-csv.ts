import { Marketplace, InventoryItem } from "@shared/schema";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { storage } from "./storage";

/**
 * Marketplace CSV formats for bulk listing generation
 */

// Interface for marketplace CSV configs
interface MarketplaceCSVConfig {
  headers: string[];
  mapInventoryToRow: (item: InventoryItem) => Record<string, string | number | null>;
  generateFilename: (marketplaceName: string) => string;
}

// Supported marketplaces
const SUPPORTED_MARKETPLACES = [
  'shopify',
  'ebay',
  'etsy',
  'amazon',
  'tiktok',
  'hipstamp'
];

// CSV configuration for each marketplace
const marketplaceCSVConfigs: Record<string, MarketplaceCSVConfig> = {
  shopify: {
    headers: [
      'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 
      'Type', 'Tags', 'Published', 'Option1 Name', 'Option1 Value', 
      'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
      'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 
      'Variant Inventory Qty', 'Variant Inventory Policy', 'Variant Fulfillment Service', 
      'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping', 
      'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position', 
      'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description',
      'Google Shopping / Google Product Category', 'Google Shopping / Gender', 
      'Google Shopping / Age Group', 'Google Shopping / MPN', 
      'Google Shopping / Condition', 'Google Shopping / Custom Product',
      'Google Shopping / Custom Label 0', 'Google Shopping / Custom Label 1', 
      'Google Shopping / Custom Label 2', 'Google Shopping / Custom Label 3', 
      'Google Shopping / Custom Label 4', 'Variant Image', 'Variant Weight Unit',
      'Variant Tax Code', 'Cost per item', 'Price / International', 
      'Compare At Price / International', 'Status'
    ],
    mapInventoryToRow: (item: InventoryItem) => ({
      'Handle': item.sku.toLowerCase(),
      'Title': item.title,
      'Body (HTML)': item.description,
      'Vendor': 'Own Inventory',
      'Product Category': item.category,
      'Type': item.subcategory || item.category,
      'Tags': item.tags?.join(', ') || '',
      'Published': 'TRUE',
      'Option1 Name': 'Condition',
      'Option1 Value': item.condition,
      'Option2 Name': '',
      'Option2 Value': '',
      'Option3 Name': '',
      'Option3 Value': '',
      'Variant SKU': item.sku,
      'Variant Grams': item.weight || 0,
      'Variant Inventory Tracker': 'shopify',
      'Variant Inventory Qty': item.quantity || 1,
      'Variant Inventory Policy': 'deny',
      'Variant Fulfillment Service': 'manual',
      'Variant Price': item.price,
      'Variant Compare At Price': item.originalPrice || '',
      'Variant Requires Shipping': 'TRUE',
      'Variant Taxable': 'TRUE',
      'Variant Barcode': item.barcode || '',
      'Image Src': item.primaryImageUrl || '',
      'Image Position': '1',
      'Image Alt Text': item.title,
      'Gift Card': 'FALSE',
      'SEO Title': item.seoTitle || item.title,
      'SEO Description': item.seoDescription || item.description?.substring(0, 160) || '',
      'Google Shopping / Google Product Category': item.category,
      'Google Shopping / Gender': 'Unisex',
      'Google Shopping / Age Group': 'Adult',
      'Google Shopping / MPN': item.sku,
      'Google Shopping / Condition': mapConditionToGoogleShopping(item.condition),
      'Status': 'active'
    }),
    generateFilename: (marketplaceName: string) => 
      `shopify_products_${marketplaceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${formatDate()}.csv`
  },
  
  ebay: {
    headers: [
      'Action', 'Item number', 'Title', 'Subtitle', 'Category ID', 'Secondary Category ID',
      'Store Category Name 1', 'Store Category Name 2', 'Description', 'Condition ID',
      'Condition Description', 'Brand', 'Price', 'Quantity', 'Format', 'Duration', 
      'Start Price', 'Buy It Now Price', 'Available To', 'Private Listing', 'Best Offer',
      'Domestic Service', 'Domestic Cost', 'International Service', 'International Cost',
      'Item Weight', 'Weight Major', 'Weight Minor', 'Package Size', 'Package Width', 
      'Package Length', 'Package Depth', 'Package Profile', 'Ship From Zip', 'Returns Accepted',
      'Returns Within', 'Shipping Cost Paid By', 'Refund Type', 'Picture URL', 'Payment Methods',
      'Shipping Terms', 'Item Location', 'Lot Size', 'Custom Label (SKU)'
    ],
    mapInventoryToRow: (item: InventoryItem) => ({
      'Action': 'Add',
      'Title': item.title,
      'Subtitle': item.subtitle || '',
      'Category ID': getEbayCategoryID(item.category, item.subcategory),
      'Secondary Category ID': '',
      'Store Category Name 1': item.category,
      'Store Category Name 2': item.subcategory || '',
      'Description': item.description,
      'Condition ID': getEbayConditionID(item.condition),
      'Condition Description': item.conditionDescription || '',
      'Brand': item.brand || '',
      'Price': item.price,
      'Quantity': item.quantity || 1,
      'Format': 'Fixed Price',
      'Duration': 'GTC',
      'Start Price': item.price,
      'Buy It Now Price': item.price,
      'Best Offer': 'false',
      'Domestic Service': 'USPSPriority',
      'Domestic Cost': item.domesticShippingCost || 'calculated',
      'Item Weight': item.weight || '',
      'Returns Accepted': 'ReturnsAccepted',
      'Returns Within': 'Days_30',
      'Shipping Cost Paid By': 'Buyer',
      'Refund Type': 'Money Back',
      'Picture URL': item.primaryImageUrl || '',
      'Payment Methods': 'PayPal',
      'Item Location': item.location || 'US',
      'Custom Label (SKU)': item.sku
    }),
    generateFilename: (marketplaceName: string) => 
      `ebay_listings_${marketplaceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${formatDate()}.csv`
  },
  
  etsy: {
    headers: [
      'TITLE', 'DESCRIPTION', 'PRICE', 'QUANTITY', 'CATEGORIES', 'TAGS', 'MATERIALS',
      'WHO_MADE', 'WHEN_MADE', 'STATE', 'SHIPPING_PROFILE_ID', 'RETURN_POLICY_ID',
      'PROCESSING_MIN', 'PROCESSING_MAX', 'SKU', 'IMAGE1', 'IMAGE2', 'IMAGE3', 'IMAGE4',
      'IMAGE5', 'IMAGE6', 'IMAGE7', 'IMAGE8', 'IMAGE9', 'IMAGE10', 'VARIATION1_NAME',
      'VARIATION1_VALUES', 'VARIATION2_NAME', 'VARIATION2_VALUES'
    ],
    mapInventoryToRow: (item: InventoryItem) => ({
      'TITLE': item.title,
      'DESCRIPTION': item.description,
      'PRICE': item.price,
      'QUANTITY': item.quantity || 1,
      'CATEGORIES': item.category,
      'TAGS': item.tags?.join(',') || '',
      'MATERIALS': item.materials?.join(',') || '',
      'WHO_MADE': 'i_did',
      'WHEN_MADE': '2020_2023',
      'STATE': getEtsyItemState(item.condition),
      'SHIPPING_PROFILE_ID': '123456', // This should be replaced with actual profile ID
      'RETURN_POLICY_ID': '123456', // This should be replaced with actual policy ID
      'PROCESSING_MIN': '1',
      'PROCESSING_MAX': '3',
      'SKU': item.sku,
      'IMAGE1': item.primaryImageUrl || '',
      'IMAGE2': item.additionalImageUrls?.[0] || '',
      'IMAGE3': item.additionalImageUrls?.[1] || '',
      'IMAGE4': item.additionalImageUrls?.[2] || '',
      'IMAGE5': item.additionalImageUrls?.[3] || '',
      'VARIATION1_NAME': '',
      'VARIATION1_VALUES': '',
      'VARIATION2_NAME': '',
      'VARIATION2_VALUES': ''
    }),
    generateFilename: (marketplaceName: string) => 
      `etsy_listings_${marketplaceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${formatDate()}.csv`
  },
  
  amazon: {
    headers: [
      'sku', 'product-id', 'product-id-type', 'product-name', 'brand-name', 'manufacturer',
      'description', 'bullet-point1', 'bullet-point2', 'bullet-point3', 'bullet-point4',
      'bullet-point5', 'part-number', 'model-number', 'size', 'color', 'material-type',
      'update-delete', 'standard-price', 'quantity', 'condition-type', 'condition-note',
      'main-image-url', 'swatch-image-url', 'other-image-url1', 'other-image-url2',
      'other-image-url3', 'other-image-url4', 'other-image-url5', 'other-image-url6',
      'other-image-url7', 'other-image-url8', 'fulfillment-center-id', 'package-length',
      'package-width', 'package-height', 'package-weight', 'currency', 'product-tax-code',
      'item-package-quantity', 'max-order-quantity', 'offering-can-be-gift-messaged',
      'offering-can-be-giftwrapped'
    ],
    mapInventoryToRow: (item: InventoryItem) => {
      // Extract bullet points from description if available
      const bulletPoints = extractBulletPoints(item.description);
      
      return {
        'sku': item.sku,
        'product-id': '',
        'product-id-type': 'ASIN',
        'product-name': item.title,
        'brand-name': item.brand || '',
        'manufacturer': item.brand || '',
        'description': item.description,
        'bullet-point1': bulletPoints[0] || '',
        'bullet-point2': bulletPoints[1] || '',
        'bullet-point3': bulletPoints[2] || '',
        'bullet-point4': bulletPoints[3] || '',
        'bullet-point5': bulletPoints[4] || '',
        'part-number': item.sku,
        'model-number': item.sku,
        'update-delete': 'Update',
        'standard-price': item.price,
        'quantity': item.quantity || 1,
        'condition-type': getAmazonConditionType(item.condition),
        'condition-note': item.conditionDescription || '',
        'main-image-url': item.primaryImageUrl || '',
        'other-image-url1': item.additionalImageUrls?.[0] || '',
        'other-image-url2': item.additionalImageUrls?.[1] || '',
        'other-image-url3': item.additionalImageUrls?.[2] || '',
        'other-image-url4': item.additionalImageUrls?.[3] || '',
        'package-length': item.dimensions?.length || '',
        'package-width': item.dimensions?.width || '',
        'package-height': item.dimensions?.height || '',
        'package-weight': item.weight || '',
        'currency': 'USD',
        'item-package-quantity': '1',
        'offering-can-be-gift-messaged': 'false',
        'offering-can-be-giftwrapped': 'false'
      };
    },
    generateFilename: (marketplaceName: string) => 
      `amazon_inventory_${marketplaceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${formatDate()}.csv`
  },
  
  tiktok: {
    headers: [
      'product_id', 'category_id', 'title', 'description', 'brand', 'price', 'comparison_price',
      'product_sku', 'sales_attributes', 'visible', 'stock', 'image_urls', 'video_urls', 
      'variant_specs', 'product_weight', 'package_weight', 'package_length', 'package_width',
      'package_height', 'shipping_provider', 'shipping_fee', 'tags', 'original_source'
    ],
    mapInventoryToRow: (item: InventoryItem) => ({
      'product_id': item.id || '',
      'category_id': '',
      'title': item.title,
      'description': item.description,
      'brand': item.brand || '',
      'price': item.price,
      'comparison_price': item.originalPrice || '',
      'product_sku': item.sku,
      'sales_attributes': `["${item.condition}"]`,
      'visible': 'TRUE',
      'stock': item.quantity || 1,
      'image_urls': item.primaryImageUrl ? `["${item.primaryImageUrl}"]` : '',
      'video_urls': '[]',
      'variant_specs': '{}',
      'product_weight': item.weight || '',
      'package_weight': item.weight || '',
      'package_length': item.dimensions?.length || '',
      'package_width': item.dimensions?.width || '',
      'package_height': item.dimensions?.height || '',
      'shipping_provider': '',
      'shipping_fee': '',
      'tags': item.tags ? `["${item.tags.join('","')}"]` : '[]',
      'original_source': 'MrLister'
    }),
    generateFilename: (marketplaceName: string) => 
      `tiktok_products_${marketplaceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${formatDate()}.csv`
  },
  
  hipstamp: {
    headers: [
      'Title', 'Description', 'Price', 'Quantity', 'Category', 'SubCategory', 'Condition',
      'SKU', 'Weight', 'Length', 'Width', 'Height', 'ShippingProfileID', 'FixedShippingCost',
      'AdditionalItemFixedShippingCost', 'Location', 'Image1', 'Image2', 'Image3', 'Image4',
      'Image5', 'Tags', 'Year', 'Catalog', 'Country', 'IsApproved'
    ],
    mapInventoryToRow: (item: InventoryItem) => ({
      'Title': item.title,
      'Description': item.description,
      'Price': item.price,
      'Quantity': item.quantity || 1,
      'Category': item.category,
      'SubCategory': item.subcategory || '',
      'Condition': item.condition,
      'SKU': item.sku,
      'Weight': item.weight || '',
      'Length': item.dimensions?.length || '',
      'Width': item.dimensions?.width || '',
      'Height': item.dimensions?.height || '',
      'ShippingProfileID': '',
      'FixedShippingCost': item.domesticShippingCost || '',
      'AdditionalItemFixedShippingCost': '',
      'Location': item.location || '',
      'Image1': item.primaryImageUrl || '',
      'Image2': item.additionalImageUrls?.[0] || '',
      'Image3': item.additionalImageUrls?.[1] || '',
      'Image4': item.additionalImageUrls?.[2] || '',
      'Image5': item.additionalImageUrls?.[3] || '',
      'Tags': item.tags?.join(',') || '',
      'Year': item.productionYear || '',
      'Catalog': '',
      'Country': item.country || 'US',
      'IsApproved': 'TRUE'
    }),
    generateFilename: (marketplaceName: string) => 
      `hipstamp_listings_${marketplaceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${formatDate()}.csv`
  }
};

/**
 * Generate CSV content for a specific marketplace
 */
export async function generateMarketplaceCSV(
  marketplaceId: number,
  inventoryItemIds?: number[]
): Promise<{ fileName: string; csvContent: string }> {
  // Get marketplace info
  const marketplace = await storage.getMarketplace(marketplaceId);
  if (!marketplace) {
    throw new Error(`Marketplace with ID ${marketplaceId} not found`);
  }
  
  // Determine which marketplace platform this is
  const platformType = marketplace.name.toLowerCase();
  const csvConfig = marketplaceCSVConfigs[platformType] || marketplaceCSVConfigs.ebay; // Default to eBay format
  
  // Get inventory items
  let inventoryItems: InventoryItem[];
  if (inventoryItemIds && inventoryItemIds.length > 0) {
    inventoryItems = await Promise.all(
      inventoryItemIds.map(id => storage.getInventoryItem(id))
    ).then(items => items.filter(Boolean) as InventoryItem[]);
  } else {
    // Get all inventory items for the user
    inventoryItems = await storage.getInventoryItemsByUser(marketplace.userId);
  }
  
  // Filter inventory items to only include those that are ready for listing
  inventoryItems = inventoryItems.filter(item => item.status === 'active' || item.status === 'ready_to_list');
  
  // Generate CSV content
  const headers = csvConfig.headers;
  const rows = inventoryItems.map(item => {
    const rowData = csvConfig.mapInventoryToRow(item);
    // Ensure all headers are covered (with empty values for missing fields)
    return headers.map(header => {
      const value = rowData[header] !== undefined ? rowData[header] : '';
      // Escape CSV values properly
      return escapeCSV(String(value));
    });
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // Generate filename
  const fileName = csvConfig.generateFilename(marketplace.name);
  
  return { fileName, csvContent };
}

/**
 * Save CSV file to the server
 */
export async function saveCSVFile(
  fileName: string,
  content: string
): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp');
  
  // Ensure temp directory exists
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
  
  const filePath = path.join(tempDir, fileName);
  
  // Write file
  await fs.writeFile(filePath, content, 'utf8');
  
  return filePath;
}

/**
 * Helper to convert general conditions to marketplace-specific formats
 */
function mapConditionToGoogleShopping(condition: string): string {
  const conditionMap: Record<string, string> = {
    'new': 'new',
    'like_new': 'new',
    'excellent': 'refurbished',
    'very_good': 'used',
    'good': 'used',
    'fair': 'used',
    'poor': 'used'
  };
  
  return conditionMap[condition.toLowerCase()] || 'used';
}

/**
 * Get eBay Condition ID
 */
function getEbayConditionID(condition: string): number {
  const conditionMap: Record<string, number> = {
    'new': 1000,
    'like_new': 1500,
    'excellent': 1750,
    'very_good': 2000,
    'good': 2500,
    'fair': 3000,
    'poor': 3500,
    'for_parts': 7000
  };
  
  return conditionMap[condition.toLowerCase()] || 3000;
}

/**
 * Get eBay Category ID
 */
function getEbayCategoryID(category: string, subcategory?: string | null): string {
  // In a real application, this would map to eBay's actual category IDs
  // This is a placeholder implementation
  return '1';
}

/**
 * Get Etsy Item State
 */
function getEtsyItemState(condition: string): string {
  const conditionMap: Record<string, string> = {
    'new': 'new',
    'like_new': 'new',
    'excellent': 'used',
    'very_good': 'used',
    'good': 'used',
    'fair': 'used',
    'poor': 'used',
    'for_parts': 'used'
  };
  
  return conditionMap[condition.toLowerCase()] || 'used';
}

/**
 * Get Amazon Condition Type
 */
function getAmazonConditionType(condition: string): string {
  const conditionMap: Record<string, string> = {
    'new': 'New',
    'like_new': 'NewItem',
    'excellent': 'LikeNew',
    'very_good': 'VeryGood',
    'good': 'Good',
    'fair': 'Acceptable',
    'poor': 'Acceptable',
    'for_parts': 'ForParts'
  };
  
  return conditionMap[condition.toLowerCase()] || 'Used';
}

/**
 * Extract bullet points from description
 */
function extractBulletPoints(description?: string): string[] {
  if (!description) return [];
  
  // Look for bullet points (lines starting with - or •)
  const bulletPointRegex = /^[-•](.+)$/gm;
  const bulletPoints: string[] = [];
  let match;
  
  while ((match = bulletPointRegex.exec(description)) !== null) {
    bulletPoints.push(match[1].trim());
  }
  
  return bulletPoints.slice(0, 5);
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
  
  // If value contains comma, newline or double quote, wrap in quotes
  const needsQuotes = /[",\n\r]/.test(value);
  
  if (needsQuotes) {
    // Double up any quotes within the value
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return value;
}

/**
 * Check if a marketplace type is supported
 */
export function isMarketplaceSupported(marketplaceType: string): boolean {
  return SUPPORTED_MARKETPLACES.includes(marketplaceType.toLowerCase());
}