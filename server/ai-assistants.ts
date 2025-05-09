import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { storage } from "./storage";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 3,
});

// Store assistant IDs for reuse
const ASSISTANTS = {
  INVENTORY_ASSISTANT: "inventory-expert",
  MARKETING_ASSISTANT: "marketing-expert",
  CUSTOMER_SERVICE_ASSISTANT: "customer-service-expert",
  PRICING_ASSISTANT: "pricing-expert",
};

/**
 * Create or retrieve an assistant
 */
async function getOrCreateAssistant(name: string, instructions: string, tools: any[] = []) {
  console.log(`Setting up ${name} assistant...`);
  
  try {
    // List all assistants and find if ours exists
    const assistants = await openai.beta.assistants.list({
      limit: 100,
    });
    
    const existingAssistant = assistants.data.find(
      (assistant) => assistant.name === name
    );
    
    if (existingAssistant) {
      console.log(`Found existing ${name} assistant: ${existingAssistant.id}`);
      return existingAssistant;
    }
    
    // Create a new assistant
    console.log(`Creating new ${name} assistant...`);
    const assistant = await openai.beta.assistants.create({
      name,
      instructions,
      model: "gpt-4o",
      tools,
    });
    
    console.log(`Created ${name} assistant: ${assistant.id}`);
    return assistant;
  } catch (error) {
    console.error(`Error setting up ${name} assistant:`, error);
    throw error;
  }
}

/**
 * Initialize all assistants used in the application
 */
export async function initializeAssistants() {
  try {
    // Inventory Expert Assistant
    await getOrCreateAssistant(
      ASSISTANTS.INVENTORY_ASSISTANT,
      "You are an inventory management expert for an e-commerce business. Help users identify items, categorize products, suggest storage solutions, and optimize inventory levels. Provide specific, actionable advice for efficient inventory management.",
      [
        {
          type: "function",
          function: {
            name: "generate_sku",
            description: "Generate a unique SKU for a product based on its details",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  description: "Product category (e.g. Electronics, Clothing, Books)",
                },
                brand: {
                  type: "string",
                  description: "Brand name",
                },
                itemName: {
                  type: "string",
                  description: "Short name of the item",
                },
              },
              required: ["category", "itemName"],
            },
          },
        },
      ]
    );

    // Marketing Expert Assistant
    await getOrCreateAssistant(
      ASSISTANTS.MARKETING_ASSISTANT,
      "You are a marketing and SEO expert for e-commerce. Help users craft compelling product descriptions, improve SEO for listings, identify target audiences, and develop marketing strategies for various marketplaces like eBay, Etsy, Amazon, and Shopify. Provide specific, actionable marketing advice.",
      [
        {
          type: "function",
          function: {
            name: "optimize_listing_seo",
            description: "Optimize a product listing for better search visibility",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Current product title",
                },
                description: {
                  type: "string",
                  description: "Current product description",
                },
                category: {
                  type: "string",
                  description: "Product category",
                },
                marketplace: {
                  type: "string",
                  description: "Target marketplace (eBay, Etsy, Amazon, etc.)",
                },
              },
              required: ["title", "description", "marketplace"],
            },
          },
        },
      ]
    );

    // Pricing Expert Assistant
    await getOrCreateAssistant(
      ASSISTANTS.PRICING_ASSISTANT,
      "You are a pricing strategy expert for e-commerce. Help users determine optimal pricing, analyze market trends, understand pricing psychology, and develop competitive pricing strategies for various product types. Consider factors like marketplace fees, shipping costs, and competitive landscape.",
      [
        {
          type: "function",
          function: {
            name: "analyze_pricing_strategy",
            description: "Analyze and suggest pricing strategy for a product",
            parameters: {
              type: "object",
              properties: {
                productTitle: {
                  type: "string",
                  description: "Product title",
                },
                category: {
                  type: "string",
                  description: "Product category",
                },
                condition: {
                  type: "string",
                  description: "Product condition (New, Used, etc.)",
                },
                costPrice: {
                  type: "number",
                  description: "Cost price of the product",
                },
                competitorPrices: {
                  type: "array",
                  items: {
                    type: "number",
                  },
                  description: "List of competitor prices",
                },
                marketplace: {
                  type: "string",
                  description: "Target marketplace",
                },
              },
              required: ["productTitle", "category", "condition"],
            },
          },
        },
      ]
    );

    // Customer Service Assistant
    await getOrCreateAssistant(
      ASSISTANTS.CUSTOMER_SERVICE_ASSISTANT,
      "You are a customer service expert for e-commerce. Help users respond to customer inquiries, handle returns and refunds, resolve disputes, and improve customer satisfaction. Provide specific, professional responses that maintain brand reputation.",
      []
    );

    console.log("All assistants initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing assistants:", error);
    return false;
  }
}

/**
 * Create a thread to interact with an assistant
 */
export async function createThread(userId: number) {
  try {
    const thread = await openai.beta.threads.create({
      metadata: {
        userId: userId.toString(),
      },
    });
    return thread;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
}

/**
 * Add a message to a thread
 */
export async function addMessageToThread(
  threadId: string,
  content: string,
  fileIds: string[] = []
) {
  try {
    // Create message params object
    const messageParams: any = {
      role: "user",
      content,
    };
    
    // Only add file_ids if present (to avoid TypeScript error)
    if (fileIds && fileIds.length > 0) {
      messageParams.file_ids = fileIds;
    }
    
    const message = await openai.beta.threads.messages.create(threadId, messageParams);
    return message;
  } catch (error) {
    console.error("Error adding message to thread:", error);
    throw error;
  }
}

/**
 * Upload a file to OpenAI for use with assistants
 */
export async function uploadFile(filePath: string) {
  try {
    // Create a proper file-like object with name and other required properties
    const fileContent = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    
    // Create a Blob from the buffer with appropriate mime type
    const mimeType = getMimeType(fileName);
    const blob = new Blob([fileContent], { type: mimeType });
    
    // Create a File object that satisfies the FileLike interface
    const file = new File([blob], fileName, { type: mimeType });
    
    // Upload the file
    const uploadedFile = await openai.files.create({
      file: file as any, // Type cast as any to bypass TypeScript check
      purpose: "assistants",
    });
    
    return uploadedFile;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

// Helper to determine MIME type from filename
function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Run an assistant on a thread and get the response
 */
export async function runAssistantOnThread(
  assistantName: string,
  threadId: string,
  additionalInstructions?: string
) {
  try {
    // List all assistants
    const assistants = await openai.beta.assistants.list({
      limit: 100,
    });
    
    // Find the requested assistant
    const assistant = assistants.data.find(
      (a) => a.name === assistantName
    );
    
    if (!assistant) {
      throw new Error(`Assistant ${assistantName} not found`);
    }
    
    // Create a run with the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistant.id,
      instructions: additionalInstructions,
    });
    
    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    
    // Wait for the run to complete (simple polling approach)
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      console.log(`Run status: ${runStatus.status}`);
      // Wait for 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }
    
    if (runStatus.status === "completed") {
      // Get messages after completion
      const messages = await openai.beta.threads.messages.list(threadId);
      
      // Return the most recent assistant message
      const assistantMessages = messages.data.filter(
        (msg) => msg.role === "assistant"
      );
      
      return assistantMessages[0]; // Most recent assistant message
    } else {
      throw new Error(`Run ended with status: ${runStatus.status}`);
    }
  } catch (error) {
    console.error("Error running assistant:", error);
    throw error;
  }
}

/**
 * Get all messages from a thread
 */
export async function getThreadMessages(threadId: string) {
  try {
    const messages = await openai.beta.threads.messages.list(threadId);
    return messages.data;
  } catch (error) {
    console.error("Error getting thread messages:", error);
    throw error;
  }
}

/**
 * Generate an optimized product listing with the Marketing Assistant
 */
export async function generateOptimizedListing(
  userId: number,
  title: string,
  description: string,
  category: string,
  marketplace: string
) {
  try {
    // Create a new thread
    const thread = await createThread(userId);
    
    // Add initial message
    await addMessageToThread(
      thread.id,
      `Please optimize this product listing for ${marketplace}:
      
      Title: ${title}
      Category: ${category}
      Description: ${description}
      
      Please provide an SEO-optimized title, description, and 5-7 relevant keywords.`
    );
    
    // Run the assistant
    const response = await runAssistantOnThread(
      ASSISTANTS.MARKETING_ASSISTANT,
      thread.id,
      `Focus on ${marketplace} specific optimizations. Make sure to highlight key selling points and use marketplace-specific keywords.`
    );
    
    return response;
  } catch (error) {
    console.error("Error generating optimized listing:", error);
    throw error;
  }
}

/**
 * Analyze pricing strategy with the Pricing Assistant
 */
export async function analyzePricingWithAssistant(
  userId: number,
  productTitle: string,
  category: string,
  condition: string,
  costPrice: number,
  competitorPrices: number[],
  marketplace: string
) {
  try {
    // Create a new thread
    const thread = await createThread(userId);
    
    // Add initial message
    await addMessageToThread(
      thread.id,
      `Please analyze the pricing strategy for this product:
      
      Product: ${productTitle}
      Category: ${category}
      Condition: ${condition}
      Cost Price: $${costPrice}
      Competitor Prices: ${competitorPrices.map(p => '$' + p).join(', ')}
      Marketplace: ${marketplace}
      
      Please provide a suggested retail price, pricing strategy, and explanation.`
    );
    
    // Run the assistant
    const response = await runAssistantOnThread(
      ASSISTANTS.PRICING_ASSISTANT,
      thread.id,
      `Consider ${marketplace} fees, shipping costs, and the specific product category when making recommendations.`
    );
    
    return response;
  } catch (error) {
    console.error("Error analyzing pricing strategy:", error);
    throw error;
  }
}

/**
 * Identify and categorize a product with the Inventory Assistant
 */
export async function identifyProductWithAssistant(
  userId: number,
  productDescription: string,
  imageFileId?: string
) {
  try {
    // Create a new thread
    const thread = await createThread(userId);
    
    // Add initial message with image if available
    const fileIds = imageFileId ? [imageFileId] : [];
    await addMessageToThread(
      thread.id,
      `Please identify and categorize this product: ${productDescription}`,
      fileIds
    );
    
    // Run the assistant
    const response = await runAssistantOnThread(
      ASSISTANTS.INVENTORY_ASSISTANT,
      thread.id,
      "Provide detailed categorization, suggested SKU, storage recommendations, and any specific handling requirements."
    );
    
    return response;
  } catch (error) {
    console.error("Error identifying product:", error);
    throw error;
  }
}

/**
 * Generate a customer service response with the Customer Service Assistant
 */
export async function generateCustomerServiceResponse(
  userId: number,
  customerInquiry: string,
  productDetails: string,
  orderDetails?: string
) {
  try {
    // Create a new thread
    const thread = await createThread(userId);
    
    // Add initial message
    await addMessageToThread(
      thread.id,
      `Please help me respond to this customer inquiry:
      
      Customer Message: ${customerInquiry}
      
      Product Details: ${productDetails}
      ${orderDetails ? `Order Details: ${orderDetails}` : ''}
      
      Please provide a professional, helpful response.`
    );
    
    // Run the assistant
    const response = await runAssistantOnThread(
      ASSISTANTS.CUSTOMER_SERVICE_ASSISTANT,
      thread.id,
      "Be empathetic, solution-oriented, and maintain a professional tone. Always prioritize customer satisfaction while following business policies."
    );
    
    return response;
  } catch (error) {
    console.error("Error generating customer service response:", error);
    throw error;
  }
}

// Initialize assistants when the server starts
(async () => {
  try {
    const initialized = await initializeAssistants();
    if (initialized) {
      console.log("✅ OpenAI Assistants initialized successfully");
    } else {
      console.error("❌ Failed to initialize OpenAI Assistants");
    }
  } catch (error) {
    console.error("Error during assistant initialization:", error);
  }
})();