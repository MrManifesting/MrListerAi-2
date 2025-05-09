import { analyzeProductImage, generateProductDescription, analyzePricingStrategy } from './openai';
import { storage } from './storage';
import { InsertImageAnalysis, InsertInventoryItem } from '@shared/schema';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import sharp from 'sharp';

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
    console.log(`Starting image analysis for user ${userId} with image data length: ${imageBase64.length}`);
    
    // Call OpenAI to analyze the image
    console.log('Calling OpenAI for image analysis...');
    const analysisResults = await analyzeProductImage(imageBase64);
    console.log('OpenAI analysis complete with results:', Object.keys(analysisResults));
    
    // Store the image in the temp directory and use the URL path
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const hash = crypto.createHash('md5').update(imageBase64.substring(0, 100)).digest('hex');
    const filename = `image-${hash}.jpg`;
    
    // Use our image processor to create and store the image
    const tempDir = 'temp';
    
    // Ensure temp directory exists
    if (!fsSync.existsSync(tempDir)) {
      fsSync.mkdirSync(tempDir, { recursive: true });
    }
    
    const imagePath = path.join(tempDir, filename);
    const thumbnailPath = path.join(tempDir, `thumb-${filename}`);
    
    // Write the original image
    await fs.writeFile(imagePath, imageBuffer);
    
    // Create a thumbnail version
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(200, 200, { fit: 'inside' })
      .toBuffer();
    
    // Write the thumbnail
    await fs.writeFile(thumbnailPath, thumbnailBuffer);
    
    // Create URLs for the images
    const originalImageUrl = `/temp/${filename}`;
    const processedImageUrl = `/temp/thumb-${filename}`;
    
    // Store the enhanced analysis results with better data validation and type handling
    const analysisData: InsertImageAnalysis = {
      userId,
      originalImageUrl: originalImageUrl,
      processedImageUrl: processedImageUrl,
      detectedItem: analysisResults.title || "Unknown Item",
      suggestedTitle: analysisResults.title || "Unknown Item",
      suggestedDescription: analysisResults.description || "No description available",
      suggestedCategory: analysisResults.category || "Other",
      suggestedCondition: analysisResults.condition || "Good",
      suggestedPrice: analysisResults.suggestedPrice || 0,
      marketPriceRange: {
        min: typeof analysisResults.priceRange?.min === 'number' ? analysisResults.priceRange.min : 0,
        max: typeof analysisResults.priceRange?.max === 'number' ? analysisResults.priceRange.max : 0
      },
      // Include enhanced AI data for use in inventory item creation, with proper type handling
      aiData: {
        brand: analysisResults.brand || "Unknown",
        model: analysisResults.model || "",
        features: Array.isArray(analysisResults.features) ? analysisResults.features : [],
        keywords: Array.isArray(analysisResults.keywords) ? analysisResults.keywords : [],
        detectedBarcode: analysisResults.detectedBarcode || null,
        barcodeType: analysisResults.barcodeType || null,
        dimensions: analysisResults.dimensions || null,
        weight: analysisResults.weight || null,
        materials: Array.isArray(analysisResults.materials) ? analysisResults.materials : []
      },
      status: 'completed'
    };
    
    console.log('Storing analysis data in database...');
    const analysis = await storage.createImageAnalysis(analysisData);
    console.log(`Analysis stored with ID: ${analysis.id}`);
    
    return {
      analysisId: analysis.id,
      results: analysisResults
    };
  } catch (error) {
    console.error('Error processing product image:', error);
    // Add stack trace for better debugging
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error('Failed to process product image: ' + (error instanceof Error ? error.message : String(error)));
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
