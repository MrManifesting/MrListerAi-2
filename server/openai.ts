import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-demo-key" });

// Function to analyze product images and return information
export async function analyzeProductImage(base64Image: string): Promise<{
  title: string;
  description: string;
  category: string;
  condition: string;
  suggestedPrice: number;
  priceRange: { min: number; max: number };
}> {
  try {
    // Call OpenAI vision model to analyze the image
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an expert e-commerce product analyst specializing in identifying, categorizing, and pricing items from images. Analyze the image and provide detailed information in JSON format."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image and provide the following in JSON format: " +
                "1. Concise, SEO-friendly product title " +
                "2. Detailed product description (2-3 sentences) " +
                "3. Category hierarchy in format 'MainCategory > Subcategory > SubSubcategory' " +
                "4. Condition assessment on scale: New, Like New, Very Good, Good, Acceptable " +
                "5. Suggested listing price (USD) " +
                "6. Market price range as min and max values (USD)"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      title: result.title || "Unknown Item",
      description: result.description || "No description available",
      category: result.category || "Other",
      condition: result.condition || "Good",
      suggestedPrice: parseFloat(result.suggestedPrice) || 0,
      priceRange: {
        min: parseFloat(result.priceRange?.min) || 0,
        max: parseFloat(result.priceRange?.max) || 0
      }
    };
  } catch (error) {
    console.error("Error analyzing product image:", error);
    // Return default values if analysis fails
    return {
      title: "Unknown Item",
      description: "Unable to analyze image",
      category: "Other",
      condition: "Good",
      suggestedPrice: 0,
      priceRange: { min: 0, max: 0 }
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

    return response.choices[0].message.content.trim();
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

    const result = JSON.parse(response.choices[0].message.content);
    
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
