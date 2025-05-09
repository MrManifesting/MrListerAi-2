import OpenAI from "openai";

// Check if OpenAI API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in environment variables");
  throw new Error("OpenAI API key is missing");
}

// Log that we're initializing OpenAI client
console.log("Initializing OpenAI client with API key");

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024
// Do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 second timeout for requests
  maxRetries: 3   // Retry up to 3 times on failure
});

// Test OpenAI connection by making a simple API call
(async () => {
  try {
    await openai.models.list();
    console.log("Successfully connected to OpenAI API");
  } catch (error) {
    console.error("Error connecting to OpenAI API:", error);
  }
})();

// Function to analyze product images and return information
export async function analyzeProductImage(base64Image: string): Promise<{
  title: string;
  description: string;
  category: string;
  condition: string;
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  brand: string;
  model: string;
  features: string[];
  keywords: string[];
  detectedBarcode: string | null;
  barcodeType: string | null;
  dimensions: { length: number; width: number; height: number; unit: string } | null;
  weight: { value: number; unit: string } | null;
  materials: string[];
}> {
  try {
    // Validate the base64 string before processing
    if (!base64Image || typeof base64Image !== 'string') {
      console.error('Invalid base64Image provided, not a string');
      throw new Error('Invalid image data format');
    }
    
    // Check if we have correct formatting
    const startsWithDataUrl = base64Image.startsWith('data:');
    const containsBase64Marker = base64Image.includes('base64,');
    
    console.log(`Analyzing product image with base64 data of length: ${base64Image.length}. Has data URL prefix: ${startsWithDataUrl}, contains base64 marker: ${containsBase64Marker}`);
    
    // Check if base64 data is valid
    if (!base64Image || base64Image.length < 100) {
      console.error("Invalid base64 image data received, length too short:", base64Image.length);
      throw new Error("Invalid image data received");
    }
    
    // If we have a data URL format, we need to strip it out for OpenAI
    let processedBase64 = base64Image;
    if (base64Image.includes('base64,')) {
      processedBase64 = base64Image.split('base64,')[1];
      console.log(`Extracted base64 data from URL format, new length: ${processedBase64.length}`);
    }

    // Call OpenAI vision model to analyze the image
    console.log("Calling OpenAI vision model...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        {
          role: "system",
          content: 
            "You are an expert e-commerce product analyst specializing in identifying, categorizing, and pricing items from images. You have extensive knowledge of product details, brands, models, and marketplace trends. You can also detect barcodes, QR codes, or product identifiers in images when visible. Your goal is to provide accurate, detailed information that can be used to create professional marketplace listings. For each request, return a JSON object with the requested fields. If you can't determine a specific value, use a reasonable default rather than leaving it empty."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image thoroughly and provide the following in JSON format: " +
                "1. title: Concise, SEO-friendly product title " +
                "2. description: Detailed product description (2-3 sentences) " +
                "3. category: Category hierarchy in format 'MainCategory > Subcategory > SubSubcategory' " +
                "4. condition: Assessment on scale: New, Like New, Very Good, Good, Acceptable " +
                "5. suggestedPrice: Suggested listing price (number only, USD) " +
                "6. priceRange: { min: lowestPrice, max: highestPrice } (numbers only, USD) " +
                "7. brand: Brand name (if visible or identifiable) " +
                "8. model: Model number or name (if visible or identifiable) " +
                "9. features: Array of 3-5 key product features " +
                "10. keywords: Array of 5-7 relevant search keywords for marketplaces " +
                "11. detectedBarcode: Any visible barcode or QR code number (null if none) " +
                "12. barcodeType: Type of detected barcode (UPC, EAN, QR, etc., or null if none) " +
                "13. dimensions: { length: number, width: number, height: number, unit: 'in' or 'cm' } (or null) " +
                "14. weight: { value: number, unit: 'lb' or 'kg' } (or null) " +
                "15. materials: Array of primary materials used in the product"
            },
            {
              type: "image_url",
              image_url: {
                url: processedBase64.startsWith('data:') ? processedBase64 : `data:image/jpeg;base64,${processedBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2 // Lower temperature for more consistent results
    });

    console.log("OpenAI response received");
    
    // Parse the response
    let result;
    try {
      const content = response.choices[0].message.content || "{}";
      // Add detailed logging
      console.log("Raw OpenAI response:", content.substring(0, 200) + "...");
      
      result = JSON.parse(content);
      console.log("Successfully parsed OpenAI response, fields:", Object.keys(result).join(", "));
      
      // Additional validation on parsed results
      if (!result.title || !result.category) {
        console.warn("OpenAI response missing critical fields:", 
          Object.keys(result).filter(k => !result[k]).join(", "));
      }
    } catch (parseError) {
      console.error("Error parsing OpenAI response as JSON:", parseError);
      console.log("Raw response content:", response.choices[0].message.content);
      result = {};
    }
    
    // Ensure consistent return structure with defaults
    const analysis = {
      title: result.title || "Unknown Item",
      description: result.description || "No description available",
      category: result.category || "Other",
      condition: result.condition || "Good",
      suggestedPrice: parseFloat(result.suggestedPrice) || 0,
      priceRange: {
        min: parseFloat(result.priceRange?.min) || 0,
        max: parseFloat(result.priceRange?.max) || 0
      },
      brand: result.brand || "Unknown",
      model: result.model || "",
      features: Array.isArray(result.features) ? result.features : [],
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
      detectedBarcode: result.detectedBarcode || null,
      barcodeType: result.barcodeType || null,
      dimensions: result.dimensions || null,
      weight: result.weight || null,
      materials: Array.isArray(result.materials) ? result.materials : []
    };
    
    console.log("Returning analysis results with title:", analysis.title);
    return analysis;
  } catch (error) {
    console.error("Error analyzing product image:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    
    // Return default values if analysis fails
    return {
      title: "Unknown Item",
      description: "Unable to analyze image",
      category: "Other",
      condition: "Good",
      suggestedPrice: 0,
      priceRange: { min: 0, max: 0 },
      brand: "Unknown",
      model: "",
      features: [],
      keywords: [],
      detectedBarcode: null,
      barcodeType: null,
      dimensions: null,
      weight: null,
      materials: []
    };
  }
}

// Generate optimized product descriptions
export async function generateProductDescription(itemDetails: {
  title: string;
  category: string;
  condition: string;
  features?: string[];
}): Promise<string> {
  try {
    const featuresText = itemDetails.features ? itemDetails.features.join(", ") : "";
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional e-commerce copywriter that creates compelling, detailed, and SEO-friendly product descriptions."
        },
        {
          role: "user",
          content: `Write a detailed, SEO-optimized product description (3-4 sentences) for the following item:
          
          Title: ${itemDetails.title}
          Category: ${itemDetails.category}
          Condition: ${itemDetails.condition}
          Features: ${featuresText}
          
          Focus on highlighting key features, condition details, and potential uses. Make it persuasive for marketplace listings.`
        }
      ],
      max_tokens: 250
    });

    const content = response.choices[0].message.content;
    return content ? content.trim() : "";
  } catch (error) {
    console.error("Error generating product description:", error);
    return `${itemDetails.title} in ${itemDetails.condition} condition. ${itemDetails.features ? itemDetails.features.join(". ") : ""}`;
  }
}

// Analyze market demand and suggest pricing
export async function analyzePricingStrategy(itemDetails: {
  title: string;
  category: string;
  condition: string;
  currentPriceRange: { min: number; max: number };
}): Promise<{
  suggestedPrice: number;
  pricingStrategy: string;
  demandLevel: string;
  seasonalityAdvice: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in e-commerce pricing and market analysis."
        },
        {
          role: "user",
          content: `Analyze the pricing strategy for this item and provide results in JSON format:
          
          Title: ${itemDetails.title}
          Category: ${itemDetails.category}
          Condition: ${itemDetails.condition}
          Current Market Price Range: $${itemDetails.currentPriceRange.min} - $${itemDetails.currentPriceRange.max}
          
          Provide the following in your analysis:
          1. A specific suggested price (in USD)
          2. A brief pricing strategy explanation
          3. Current demand level (High, Medium, Low)
          4. Seasonality advice`
        }
      ],
      response_format: { type: "json_object" }
    });

    let result;
    try {
      const content = response.choices[0].message.content || "{}";
      result = JSON.parse(content);
      console.log("Successfully parsed OpenAI pricing strategy response:", Object.keys(result));
    } catch (parseError) {
      console.error("Error parsing OpenAI pricing strategy response as JSON:", parseError);
      console.log("Raw response content:", response.choices[0].message.content);
      result = {};
    }
    
    return {
      suggestedPrice: parseFloat(result.suggestedPrice) || ((itemDetails.currentPriceRange.min + itemDetails.currentPriceRange.max) / 2),
      pricingStrategy: result.pricingStrategy || "Price competitively within market range",
      demandLevel: result.demandLevel || "Medium",
      seasonalityAdvice: result.seasonalityAdvice || "No specific seasonality considerations"
    };
  } catch (error) {
    console.error("Error analyzing pricing strategy:", error);
    return {
      suggestedPrice: (itemDetails.currentPriceRange.min + itemDetails.currentPriceRange.max) / 2,
      pricingStrategy: "Price competitively within market range",
      demandLevel: "Medium",
      seasonalityAdvice: "No specific seasonality considerations"
    };
  }
}