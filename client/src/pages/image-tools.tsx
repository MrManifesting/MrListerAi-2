import React from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import ImageProcessor, { ProcessedImageData } from "@/components/ImageProcessor";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  ImageDown, 
  ImagePlus, 
  PencilRuler, 
  ShoppingCart 
} from "lucide-react";

export default function ImageToolsPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [lastProcessed, setLastProcessed] = React.useState<ProcessedImageData | null>(null);
  
  const handleProcessedImage = (imageData: ProcessedImageData) => {
    setLastProcessed(imageData);
  };
  
  const handleAddToInventory = () => {
    if (!lastProcessed) return;
    
    // Add to session storage to pass to inventory page
    sessionStorage.setItem('processedImage', JSON.stringify(lastProcessed));
    
    // Navigate to add inventory page
    navigate('/inventory/add');
    
    toast({
      title: "Image ready",
      description: "Your processed image has been added to the inventory form",
    });
  };
  
  return (
    <>
      <Helmet>
        <title>Image Tools - MrLister</title>
        <meta name="description" content="MrLister image processing tools for product listings" />
      </Helmet>
      
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Image Tools</h1>
            <p className="text-muted-foreground mt-1">
              Process, optimize, and prepare images for product listings
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-lg border">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold mb-2">Instant Background Removal</h2>
              <p className="text-muted-foreground mb-4">
                Upload product images and instantly remove backgrounds, optimize for web, 
                extract color information, and prepare them for marketplace listings.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <ImageDown className="w-4 h-4 mr-1" />
                  <span>Background removal</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <PencilRuler className="w-4 h-4 mr-1" />
                  <span>Custom sizing</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <ImagePlus className="w-4 h-4 mr-1" />
                  <span>Optimize for web</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3">
              <ImageProcessor 
                onProcessedImage={handleProcessedImage}
                showTools={true}
              />
            </div>
            
            <div className="flex flex-col gap-4">
              {lastProcessed ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Processed Image</CardTitle>
                    <CardDescription>Use this image in your inventory</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-md overflow-hidden aspect-square flex items-center justify-center">
                      <img
                        src={lastProcessed.processedImage}
                        alt="Processed"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    
                    {lastProcessed.colors && lastProcessed.colors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Dominant Colors:</h4>
                        <div className="flex flex-wrap gap-2">
                          {lastProcessed.colors.map((color, index) => (
                            <div key={index} className="flex flex-col items-center">
                              <div
                                className="w-6 h-6 rounded-full border"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={handleAddToInventory}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Inventory
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Image Processed</CardTitle>
                    <CardDescription>Process an image to see options</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <ImageDown className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground">
                      Process an image using the tools to see it here
                    </p>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Tips for Better Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-medium">Use good lighting:</span> 
                      <span className="text-muted-foreground">Natural light works best for most products</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">Clean background:</span> 
                      <span className="text-muted-foreground">Use a plain background for easier removal</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">Multiple angles:</span> 
                      <span className="text-muted-foreground">Show products from different sides</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">Include scale reference:</span> 
                      <span className="text-muted-foreground">Add a familiar object to show size</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}