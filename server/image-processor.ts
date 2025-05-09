import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

/**
 * Service to handle image processing tasks like background removal,
 * resizing, and optimization for product listings
 */

// Function to create a unique filename for processed images
function generateUniqueFilename(originalName: string, suffix: string): string {
  const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex').slice(0, 8);
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext);
  return `${basename}-${suffix}-${hash}${ext}`;
}

// Create temporary directory for image processing if it doesn't exist
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Remove background from image using Sharp's basic segmentation
 * This is a simplified version that works well for product images with 
 * relatively plain backgrounds
 */
export async function removeBackground(
  imageBuffer: Buffer,
  originalFilename: string
): Promise<{ buffer: Buffer; path: string }> {
  try {
    // Process the image: remove background by masking non-transparent colors
    // This is a simple approach that works best with contrasting backgrounds
    const processedImageBuffer = await sharp(imageBuffer)
      // Convert to png with transparency
      .toFormat('png')
      // Extract RGB channels and create alpha mask based on luminance
      .removeAlpha()
      .ensureAlpha(0.0)
      // Threshold image to create a mask where light areas become transparent
      .threshold(240)
      // Blur to smooth the edges
      .blur(0.3)
      .toBuffer();

    // Save processed image to temp directory
    const outputFilename = generateUniqueFilename(originalFilename, 'nobg');
    const outputPath = path.join(TEMP_DIR, outputFilename);
    await fs.promises.writeFile(outputPath, processedImageBuffer);

    return {
      buffer: processedImageBuffer,
      path: outputPath
    };
  } catch (error) {
    console.error('Error removing background:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Resize image for various purposes (thumbnail, display, etc.)
 */
export async function resizeImage(
  imageBuffer: Buffer,
  width: number,
  height: number,
  originalFilename: string
): Promise<{ buffer: Buffer; path: string }> {
  try {
    const processedImageBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();

    const outputFilename = generateUniqueFilename(
      originalFilename,
      `${width}x${height}`
    );
    const outputPath = path.join(TEMP_DIR, outputFilename);
    await fs.promises.writeFile(outputPath, processedImageBuffer);

    return {
      buffer: processedImageBuffer,
      path: outputPath
    };
  } catch (error) {
    console.error('Error resizing image:', error);
    throw new Error('Failed to resize image');
  }
}

/**
 * Optimize image for web display (reduce file size while maintaining quality)
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  originalFilename: string,
  quality: number = 80
): Promise<{ buffer: Buffer; path: string }> {
  try {
    const ext = path.extname(originalFilename).toLowerCase();
    let processedImageBuffer: Buffer;

    if (ext === '.png') {
      processedImageBuffer = await sharp(imageBuffer)
        .png({ quality, compressionLevel: 9 })
        .toBuffer();
    } else if (ext === '.jpg' || ext === '.jpeg') {
      processedImageBuffer = await sharp(imageBuffer)
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    } else {
      // For other formats, convert to WebP for better compression
      processedImageBuffer = await sharp(imageBuffer)
        .webp({ quality })
        .toBuffer();
    }

    const outputFilename = generateUniqueFilename(originalFilename, 'optimized');
    const outputPath = path.join(TEMP_DIR, outputFilename);
    await fs.promises.writeFile(outputPath, processedImageBuffer);

    return {
      buffer: processedImageBuffer,
      path: outputPath
    };
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw new Error('Failed to optimize image');
  }
}

/**
 * Extract dominant colors from an image for color matching
 */
export async function extractDominantColors(
  imageBuffer: Buffer,
  numColors: number = 5
): Promise<string[]> {
  try {
    // Resize image to smaller size for faster processing
    const resizedBuffer = await sharp(imageBuffer)
      .resize(100, 100, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = resizedBuffer;
    const { width, height, channels } = info;

    // Simple algorithm to extract dominant colors
    const colorMap = new Map<string, number>();
    
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Group similar colors by rounding to nearest 10
      const colorKey = `${Math.round(r/10)*10},${Math.round(g/10)*10},${Math.round(b/10)*10}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }
    
    // Sort colors by frequency
    const sortedColors = [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, numColors)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      });
    
    return sortedColors;
  } catch (error) {
    console.error('Error extracting dominant colors:', error);
    return [];
  }
}

/**
 * Get image dimensions and metadata
 */
export async function getImageMetadata(
  imageBuffer: Buffer
): Promise<sharp.Metadata> {
  try {
    return await sharp(imageBuffer).metadata();
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw new Error('Failed to get image metadata');
  }
}

/**
 * Generate a thumbnail version of the image
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  originalFilename: string
): Promise<{ buffer: Buffer; path: string }> {
  return resizeImage(imageBuffer, 200, 200, originalFilename);
}

/**
 * Cleanup temporary files older than specified time
 */
export function cleanupTempFiles(maxAgeHours: number = 24): void {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = fs.statSync(filePath);
      const fileAgeHours = (now - stats.mtimeMs) / (1000 * 60 * 60);
      
      if (fileAgeHours > maxAgeHours) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
}

// Schedule cleanup of temp files every 6 hours
setInterval(() => cleanupTempFiles(), 6 * 60 * 60 * 1000);