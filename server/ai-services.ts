import { analyzeProductImage, generateProductDescription, analyzePricingStrategy } from './openai';
import { storage } from './storage';
import { InsertImageAnalysis, InsertInventoryItem } from '@shared/schema';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

// Helper to generate a SKU based on various product attributes
function generateSku(itemData: {
  category: string,
  brand?: string,
  condition?: string,
  detectedBarcode?: string | null
}): string {
  // If a barcode exists, use part of it in the SKU
  if (itemData.detectedBarcode) {
    const truncatedBarcode = itemData.detectedBarcode.slice(-5);
    const categoryPrefix = itemData.category.split('>')[0].trim().substring(0, 3).toUpperCase();
    return `${categoryPrefix}-${truncatedBarcode}`;
  }
  
  // Otherwise create a more descriptive SKU based on category, brand, and condition
  const categoryPrefix = itemData.category.split('>')[0].trim().substring(0, 3).toUpperCase();
  const brandCode = itemData.brand ? itemData.brand.substring(0, 2).toUpperCase() : 'XX';
  const conditionCode = itemData.condition ? itemData.condition.charAt(0).toUpperCase() : 'G';
  const timestamp = Date.now().toString().slice(-5);
  
  return `${categoryPrefix}-${brandCode}${conditionCode}-${timestamp}`;
}

// Generate a barcode if none is detected
async function generateBarcode(sku: string): Promise<string> {
  // Simple UPC/EAN compatible code generation based on SKU
  // In a real app, you'd want to use proper barcode allocation
  const skuDigits = sku.replace(/[^0-9]/g, '');
  const paddedDigits = skuDigits.padEnd(11, '0').substring(0, 11);
  
  // Calculate check digit (simple implementation)
  const digits = paddedDigits.split('').map(d => parseInt(d));
  const oddSum = digits.filter((_, i) => i % 2 === 0).reduce((sum, d) => sum + d, 0);
  const evenSum = digits.filter((_, i) => i % 2 === 1).reduce((sum, d) => sum + d * 3, 0);
  const totalSum = oddSum + evenSum;
  const checkDigit = (10 - (totalSum % 10)) % 10;
  
  return `${paddedDigits}${checkDigit}`;
}

// Generate QR code data URL from inventory details
async function generateQrCode(data: {
  sku: string,
  title: string,
  id?: number
}): Promise<string> {
  const qrData = JSON.stringify({
    sku: data.sku,
    title: data.title,
    id: data.id || 0
  });
  
  try {
    return await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

// Process and analyze an uploaded product image
export async function processProductImage(
  imageBase64: string,
  userId: number
): Promise<{
  analysisId: number;
  results: any;
}> {
  try {
    // Call OpenAI to analyze the image
    const analysisResults = await analyzeProductImage(imageBase64);
    
    // Create a mock image URL for demo purposes
    // In a real application, we would upload the image to a storage service
    const mockImageHash = crypto.createHash('md5').update(imageBase64.substring(0, 100)).digest('hex');
    const mockImageUrl = `https://storage.example.com/${mockImageHash}.jpg`;
    
    // Store the analysis results
    const analysisData: InsertImageAnalysis = {
      userId,
      originalImageUrl: mockImageUrl,
      processedImageUrl: mockImageUrl,
      detectedItem: analysisResults.title,
      suggestedTitle: analysisResults.title,
      suggestedDescription: analysisResults.description,
      suggestedCategory: analysisResults.category,
      suggestedCondition: analysisResults.condition,
      suggestedPrice: analysisResults.suggestedPrice,
      marketPriceRange: analysisResults.priceRange,
      status: 'completed'
    };
    
    const analysis = await storage.createImageAnalysis(analysisData);
    
    return {
      analysisId: analysis.id,
      results: analysisResults
    };
  } catch (error) {
    console.error('Error processing product image:', error);
    throw new Error('Failed to process product image');
  }
}

// Add an analyzed item to inventory
export async function addAnalyzedItemToInventory(
  analysisId: number,
  userId: number,
  customData: Partial<InsertInventoryItem> = {}
): Promise<any> {
  try {
    // Get the analysis data
    const analysis = await storage.getImageAnalysis(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }
    
    // Parse the AI data from the analysis
    const aiResultData = analysis.aiData || {};
    
    // Get enhanced data from AI analysis or use defaults
    const brand = aiResultData.brand || "Unknown";
    const detectedBarcode = aiResultData.detectedBarcode || null;
    const barcodeType = aiResultData.barcodeType || null;
    const features = aiResultData.features || [];
    const keywords = aiResultData.keywords || [];
    const materials = aiResultData.materials || [];
    const dimensions = aiResultData.dimensions || null;
    const weight = aiResultData.weight || null;
    
    // Generate enhanced description with features if available
    const enhancedDescription = await generateProductDescription({
      title: analysis.suggestedTitle,
      category: analysis.suggestedCategory,
      condition: analysis.suggestedCondition,
      features: features
    });
    
    // Generate SKU based on enhanced data
    const sku = customData.sku || generateSku({
      category: analysis.suggestedCategory,
      brand: brand,
      condition: analysis.suggestedCondition,
      detectedBarcode: detectedBarcode
    });
    
    // Generate or use detected barcode
    const barcode = detectedBarcode || await generateBarcode(sku);
    
    // Generate QR code
    const qrCodeData = await generateQrCode({
      sku: sku,
      title: customData.title || analysis.suggestedTitle
    });
    
    // Create inventory item with enhanced data
    const inventoryItem: InsertInventoryItem = {
      userId,
      storeId: customData.storeId,
      sku,
      title: customData.title || analysis.suggestedTitle,
      description: customData.description || enhancedDescription,
      category: customData.category || analysis.suggestedCategory.split('>')[0].trim(),
      subcategory: customData.subcategory || analysis.suggestedCategory.split('>').slice(1).join('>').trim(),
      condition: customData.condition || analysis.suggestedCondition,
      price: customData.price || analysis.suggestedPrice,
      cost: customData.cost,
      quantity: customData.quantity || 1,
      imageUrls: [analysis.originalImageUrl],
      thumbnailUrl: analysis.processedImageUrl,
      status: customData.status || 'draft',
      aiGenerated: true,
      aiData: {
        analysisId: analysis.id,
        marketPriceRange: analysis.marketPriceRange,
        brand,
        features,
        keywords,
        materials,
        dimensions,
        weight,
        confidence: 0.85
      },
      marketplaceData: customData.marketplaceData || {},
      // Add barcode and QR code to the item metadata
      metadata: {
        barcode,
        barcodeType: barcodeType || 'EAN-13',
        qrCode: qrCodeData
      }
    };
    
    // Add to inventory
    const item = await storage.createInventoryItem(inventoryItem);
    
    return item;
  } catch (error) {
    console.error('Error adding analyzed item to inventory:', error);
    throw new Error('Failed to add item to inventory');
  }
}

// Generate marketplace-ready listings for an inventory item
export async function generateMarketplaceListings(
  inventoryItemId: number
): Promise<any> {
  try {
    // Get the inventory item
    const item = await storage.getInventoryItem(inventoryItemId);
    if (!item) {
      throw new Error('Inventory item not found');
    }
    
    // Get marketplace templates for the user
    const userMarketplaces = await storage.getMarketplacesByUser(item.userId);
    
    // Generate platform-specific listings
    const listings = userMarketplaces.map(marketplace => {
      // Get platform-specific pricing recommendation
      const platformAdjustment = marketplace.name === 'eBay' ? 1.05 : (marketplace.name === 'Shopify' ? 1.1 : 1);
      const adjustedPrice = Math.round((item.price * platformAdjustment) * 100) / 100;
      
      return {
        platform: marketplace.name,
        title: item.title,
        description: item.description,
        price: adjustedPrice,
        images: item.imageUrls,
        sku: item.sku,
        inventoryItemId: item.id
      };
    });
    
    return listings;
  } catch (error) {
    console.error('Error generating marketplace listings:', error);
    throw new Error('Failed to generate marketplace listings');
  }
}

// Generate optimized title and description
export async function optimizeListingSEO(
  inventoryItemId: number
): Promise<{
  title: string;
  description: string;
}> {
  try {
    // Get the inventory item
    const item = await storage.getInventoryItem(inventoryItemId);
    if (!item) {
      throw new Error('Inventory item not found');
    }
    
    // Use OpenAI to generate optimized title and description
    const enhancedDescription = await generateProductDescription({
      title: item.title,
      category: `${item.category}${item.subcategory ? ' > ' + item.subcategory : ''}`,
      condition: item.condition,
      features: item.description.split('. ')
    });
    
    return {
      title: item.title, // We keep the title for now, but could enhance it as well
      description: enhancedDescription
    };
  } catch (error) {
    console.error('Error optimizing listing SEO:', error);
    throw new Error('Failed to optimize listing SEO');
  }
}

// Analyze market prices and demand
export async function analyzeMarketDemand(
  inventoryItemId: number
): Promise<any> {
  try {
    // Get the inventory item
    const item = await storage.getInventoryItem(inventoryItemId);
    if (!item) {
      throw new Error('Inventory item not found');
    }
    
    // Get price range from AI data if available, or estimate
    const priceRange = item.aiData?.marketPriceRange || { 
      min: item.price * 0.8, 
      max: item.price * 1.2 
    };
    
    // Use OpenAI to analyze pricing and demand
    const pricingAnalysis = await analyzePricingStrategy({
      title: item.title,
      category: `${item.category}${item.subcategory ? ' > ' + item.subcategory : ''}`,
      condition: item.condition,
      currentPriceRange: priceRange
    });
    
    return pricingAnalysis;
  } catch (error) {
    console.error('Error analyzing market demand:', error);
    throw new Error('Failed to analyze market demand');
  }
}
