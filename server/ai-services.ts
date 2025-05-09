import { analyzeProductImage, generateProductDescription, analyzePricingStrategy } from './openai';
import { storage } from './storage';
import { InsertImageAnalysis, InsertInventoryItem } from '@shared/schema';
import * as crypto from 'crypto';

// Helper to generate a SKU based on category and random string
function generateSku(category: string): string {
  const categoryPrefix = category.split('>')[0].trim().substring(0, 3).toUpperCase();
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  return `${categoryPrefix}-${randomDigits}`;
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
    
    // Generate enhanced description
    const enhancedDescription = await generateProductDescription({
      title: analysis.suggestedTitle,
      category: analysis.suggestedCategory,
      condition: analysis.suggestedCondition
    });
    
    // Generate SKU
    const sku = customData.sku || generateSku(analysis.suggestedCategory);
    
    // Create inventory item
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
        confidence: 0.85 // Mock confidence score
      },
      marketplaceData: customData.marketplaceData
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
