import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { CirclePlus, FileImage, ImageDown, ZapIcon, RefreshCw, CropIcon, Maximize, Minimize, ZoomIn, ZoomOut, Download, Copy, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ImageProcessorProps {
  onProcessedImage?: (imageData: ProcessedImageData) => void;
  showTools?: boolean;
  defaultTab?: string;
}

export interface ProcessedImageData {
  originalImage: string;
  processedImage: string;
  metadata?: any;
  colors?: string[];
}

const ImageProcessor: React.FC<ImageProcessorProps> = ({ 
  onProcessedImage, 
  showTools = true,
  defaultTab = 'upload'
}) => {
  const { toast } = useToast();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [quality, setQuality] = useState(80);
  const [imageMetadata, setImageMetadata] = useState<any>(null);
  const [dominantColors, setDominantColors] = useState<string[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [thumbnailSize, setThumbnailSize] = useState<{width: number, height: number}>({width: 200, height: 200});
  
  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setFilename(file.name);
    
    // Read the file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const imageData = event.target.result as string;
        setOriginalImage(imageData);
        setProcessedImage(null); // Reset processed image when new image is uploaded
        setImageMetadata(null);
        setDominantColors([]);
        setActiveTab('edit');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 5242880, // 5MB
  });

  // Remove background from image
  const removeBackground = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    try {
      const result = await apiRequest<{processedImage: string, path: string}>('/api/images/remove-background', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: originalImage,
          filename
        })
      });
      
      setProcessedImage(result.processedImage);
      
      // Notify parent component if callback provided
      if (onProcessedImage) {
        onProcessedImage({
          originalImage,
          processedImage: result.processedImage,
          metadata: imageMetadata,
          colors: dominantColors
        });
      }
      
      toast({
        title: 'Background removed',
        description: 'The image background has been successfully removed',
      });
    } catch (error) {
      console.error('Error removing background:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove background from image',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Optimize image
  const optimizeImage = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    try {
      const result = await apiRequest<{processedImage: string, reduction: string}>('/api/images/optimize', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: originalImage,
          filename,
          quality
        })
      });
      
      setProcessedImage(result.processedImage);
      
      // Notify parent component if callback provided
      if (onProcessedImage) {
        onProcessedImage({
          originalImage,
          processedImage: result.processedImage,
          metadata: imageMetadata,
          colors: dominantColors
        });
      }
      
      toast({
        title: 'Image optimized',
        description: `Size reduced by ${result.reduction}`,
      });
    } catch (error) {
      console.error('Error optimizing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to optimize image',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Get image metadata
  const getMetadata = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    try {
      const result = await apiRequest<{metadata: any}>('/api/images/metadata', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: originalImage
        })
      });
      
      setImageMetadata(result.metadata);
      
      toast({
        title: 'Metadata extracted',
        description: 'Image information retrieved successfully',
      });
    } catch (error) {
      console.error('Error getting metadata:', error);
      toast({
        title: 'Error',
        description: 'Failed to get image metadata',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Extract dominant colors
  const extractColors = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    try {
      const result = await apiRequest<{colors: string[]}>('/api/images/extract-colors', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: originalImage,
          count: 5
        })
      });
      
      setDominantColors(result.colors);
      
      toast({
        title: 'Colors extracted',
        description: 'Dominant colors extracted from image',
      });
    } catch (error) {
      console.error('Error extracting colors:', error);
      toast({
        title: 'Error',
        description: 'Failed to extract colors from image',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Generate thumbnail
  const generateThumbnail = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    try {
      const result = await apiRequest<{thumbnail: string, path: string}>('/api/images/generate-thumbnail', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: originalImage,
          filename
        })
      });
      
      setProcessedImage(result.thumbnail);
      
      // Notify parent component if callback provided
      if (onProcessedImage) {
        onProcessedImage({
          originalImage,
          processedImage: result.thumbnail,
          metadata: imageMetadata,
          colors: dominantColors
        });
      }
      
      toast({
        title: 'Thumbnail generated',
        description: 'Thumbnail created successfully',
      });
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate thumbnail',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Resize image
  const resizeImage = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    try {
      const result = await apiRequest<{processedImage: string, path: string}>('/api/images/resize', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: originalImage,
          width: thumbnailSize.width,
          height: thumbnailSize.height,
          filename
        })
      });
      
      setProcessedImage(result.processedImage);
      
      // Notify parent component if callback provided
      if (onProcessedImage) {
        onProcessedImage({
          originalImage,
          processedImage: result.processedImage,
          metadata: imageMetadata,
          colors: dominantColors
        });
      }
      
      toast({
        title: 'Image resized',
        description: `Resized to ${thumbnailSize.width}x${thumbnailSize.height}`,
      });
    } catch (error) {
      console.error('Error resizing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to resize image',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Download processed image
  const downloadProcessedImage = () => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `processed-${filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Copy image to clipboard
  const copyToClipboard = async () => {
    if (!processedImage) return;
    
    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      toast({
        title: 'Copied',
        description: 'Image copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy image to clipboard',
        variant: 'destructive'
      });
    }
  };
  
  // Reset image
  const resetImage = () => {
    setProcessedImage(null);
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            {showTools && <TabsTrigger value="edit" disabled={!originalImage}>Edit</TabsTrigger>}
            {showTools && <TabsTrigger value="info" disabled={!originalImage}>Image Info</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="upload">
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-md p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">
                {isDragActive ? 'Drop the image here...' : 'Drag & drop an image here, or click to select'}
              </p>
              <p className="text-xs text-muted-foreground/70">
                Supports JPEG, PNG and WebP (Max 5MB)
              </p>
            </div>
            
            {originalImage && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">Preview</h3>
                <div className="aspect-video relative bg-muted rounded-md overflow-hidden flex items-center justify-center">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="max-h-full max-w-full object-contain"
                  />
                  {processedImage && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('edit')}>
                        Edit Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          
          {showTools && (
            <TabsContent value="edit">
              {originalImage ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Original</h3>
                      <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                        <img
                          src={originalImage}
                          alt="Original"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Processed</h3>
                      <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center relative">
                        {processedImage ? (
                          <img
                            src={processedImage}
                            alt="Processed"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-muted-foreground text-center p-4">
                            Apply an effect to see the processed image
                          </div>
                        )}
                        
                        {processedImage && (
                          <div className="absolute top-2 right-2 flex gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={resetImage}>
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Reset</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={downloadProcessedImage}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Download</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={copyToClipboard}>
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy to clipboard</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="font-medium mb-4">Background Removal</h3>
                        <Button 
                          className="w-full" 
                          onClick={removeBackground}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processing...' : 'Remove Background'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Automatically removes the background from the image, ideal for product photos.
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="font-medium mb-4">Image Optimization</h3>
                        <div className="mb-4">
                          <div className="flex justify-between mb-2">
                            <Label htmlFor="quality">Quality: {quality}%</Label>
                          </div>
                          <Slider
                            id="quality"
                            min={1}
                            max={100}
                            step={1}
                            value={[quality]}
                            onValueChange={(value) => setQuality(value[0])}
                          />
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={optimizeImage}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processing...' : 'Optimize Image'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Reduces file size while maintaining visual quality.
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="font-medium mb-4">Resize Image</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor="width" className="mb-2 block">Width</Label>
                            <Input
                              id="width"
                              type="number"
                              min="10"
                              max="2000"
                              value={thumbnailSize.width}
                              onChange={(e) => setThumbnailSize({...thumbnailSize, width: parseInt(e.target.value) || 200})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="height" className="mb-2 block">Height</Label>
                            <Input
                              id="height"
                              type="number"
                              min="10"
                              max="2000"
                              value={thumbnailSize.height}
                              onChange={(e) => setThumbnailSize({...thumbnailSize, height: parseInt(e.target.value) || 200})}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setThumbnailSize({width: 800, height: 600})}
                          >
                            800×600
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setThumbnailSize({width: 1200, height: 628})}
                          >
                            1200×628
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setThumbnailSize({width: 400, height: 400})}
                          >
                            400×400
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setThumbnailSize({width: 1080, height: 1080})}
                          >
                            1080×1080
                          </Button>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={resizeImage}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processing...' : 'Resize Image'}
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="font-medium mb-4">Generate Thumbnail</h3>
                        <Button 
                          className="w-full" 
                          onClick={generateThumbnail}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processing...' : 'Create Thumbnail'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Creates a 200×200 thumbnail, perfect for listings.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <ImageDown className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Image Selected</h3>
                  <p className="text-muted-foreground mb-4">Upload an image to start editing</p>
                  <Button onClick={() => setActiveTab('upload')}>Upload Image</Button>
                </div>
              )}
            </TabsContent>
          )}
          
          {showTools && (
            <TabsContent value="info">
              {originalImage ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Image Preview</h3>
                      <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                        <img
                          src={originalImage}
                          alt="Original"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-4">Image Information</h3>
                      <div className="space-y-4">
                        <div>
                          <Button
                            onClick={getMetadata}
                            disabled={isProcessing}
                            className="mb-4"
                          >
                            {isProcessing ? 'Processing...' : 'Get Metadata'}
                          </Button>
                          
                          {imageMetadata && (
                            <div className="space-y-2 text-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Dimensions:</div>
                                <div>{imageMetadata.width} × {imageMetadata.height}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Format:</div>
                                <div>{imageMetadata.format || 'Unknown'}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Space:</div>
                                <div>{imageMetadata.space || 'Unknown'}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Channels:</div>
                                <div>{imageMetadata.channels}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Density:</div>
                                <div>{imageMetadata.density || 'Not specified'}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">Has Alpha:</div>
                                <div>{imageMetadata.hasAlpha ? 'Yes' : 'No'}</div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <Button
                            onClick={extractColors}
                            disabled={isProcessing}
                            className="mb-4"
                          >
                            {isProcessing ? 'Processing...' : 'Extract Colors'}
                          </Button>
                          
                          {dominantColors.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {dominantColors.map((color, index) => (
                                  <div key={index} className="flex flex-col items-center">
                                    <div
                                      className="w-10 h-10 rounded-md border"
                                      style={{ backgroundColor: color }}
                                    />
                                    <div className="text-xs mt-1">{color}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageDown className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Image Selected</h3>
                  <p className="text-muted-foreground mb-4">Upload an image to view information</p>
                  <Button onClick={() => setActiveTab('upload')}>Upload Image</Button>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ImageProcessor;