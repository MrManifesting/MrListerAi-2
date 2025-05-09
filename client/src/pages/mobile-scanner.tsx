import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import jsQR from "jsqr";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Scan, ArrowLeft, ZapOff, Camera, ShieldCheck, Briefcase, Package, UserCheck, MapPin } from "lucide-react";

interface ScannedItem {
  id: number;
  sku: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  status: string;
}

interface ScanResult {
  code: string;
  type: string;
  item?: ScannedItem;
  timestamp?: Date;
  employeeId?: string;
  actionType?: 'intake' | 'fulfillment';
}

const MobileScanner = () => {
  const { toast } = useToast();
  const webcamRef = useRef<Webcam | null>(null);
  const [isContinuousScan, setIsContinuousScan] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [scanMode, setScanMode] = useState<'inventory' | 'employee'>('inventory');
  const [currentLocation, setCurrentLocation] = useState<string>('');
  
  // Query to get item details by barcode
  // Employee ID tracking mutation
  const trackEmployeeActionMutation = useMutation({
    mutationFn: async (actionData: { 
      employeeId: string, 
      actionType: 'intake' | 'fulfillment',
      inventoryItemId?: number 
    }) => {
      const res = await apiRequest("POST", "/api/inventory/track-action", actionData);
      return await res.json();
    },
    onSuccess: (data) => {
      setScanHistory(prev => {
        // Filter out previous scans of the same code
        const filtered = prev.filter(item => item.code !== lastScannedCode);
        return [
          {
            code: lastScannedCode as string,
            type: 'QR Code',
            employeeId: data.employeeId,
            actionType: data.actionType,
            timestamp: new Date(data.timestamp)
          },
          ...filtered
        ].slice(0, 10); // Keep last 10 scans
      });
      
      toast({
        title: "Action Recorded",
        description: `Employee ${data.employeeId} - ${data.actionType}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Barcode lookup mutation
  const getItemByBarcodeMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const res = await apiRequest("GET", `/api/inventory/barcode/${barcode}`);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data) {
        setScanHistory(prev => {
          // Filter out previous scans of the same code
          const filtered = prev.filter(item => item.code !== lastScannedCode);
          return [
            {
              code: lastScannedCode as string,
              type: 'Barcode',
              item: data
            },
            ...filtered
          ].slice(0, 10); // Keep last 10 scans
        });
        
        toast({
          title: "Item Found!",
          description: `Found: ${data.title}`,
        });
      } else {
        setScanHistory(prev => {
          // Filter out previous scans of the same code
          const filtered = prev.filter(item => item.code !== lastScannedCode);
          return [
            {
              code: lastScannedCode as string,
              type: 'Barcode',
            },
            ...filtered
          ].slice(0, 10); // Keep last 10 scans
        });
        
        toast({
          title: "Unknown Barcode",
          description: `Code: ${lastScannedCode}`,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Process frames from webcam
  const processFrame = useCallback(() => {
    if (!isScanning || !webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    
    // Convert data URL to image for QR processing
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Process with jsQR
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code && code.data && code.data !== lastScannedCode) {
        setLastScannedCode(code.data);
        
        // Handle based on scan mode
        if (scanMode === 'inventory') {
          // Lookup the scanned barcode
          getItemByBarcodeMutation.mutate(code.data);
        } else if (scanMode === 'employee') {
          // Check if the QR code starts with the expected format
          if (code.data.startsWith('EMPLOYEE:')) {
            // Extract employee ID
            const employeeId = code.data.split(':')[1];
            
            // Track employee action
            trackEmployeeActionMutation.mutate({
              employeeId,
              actionType: 'intake', // Default to intake, could add a toggle in UI for fulfillment
              inventoryItemId: undefined // Could be set when scanning an inventory item first
            });
          } else {
            toast({
              title: "Invalid Employee QR Code",
              description: "This doesn't look like an employee ID QR code.",
              variant: "destructive"
            });
          }
        }
        
        // If not continuous scanning, stop after successful scan
        if (!isContinuousScan) {
          setIsScanning(false);
        }
      }
      
      // Continue scanning if in continuous mode
      if (isContinuousScan && isScanning) {
        requestAnimationFrame(processFrame);
      }
    };
  }, [
    isScanning, 
    lastScannedCode, 
    isContinuousScan, 
    getItemByBarcodeMutation, 
    trackEmployeeActionMutation,
    scanMode,
    currentLocation,
    toast
  ]);

  // Start scanning process
  const startScanning = useCallback(() => {
    setIsScanning(true);
    setLastScannedCode(null);
  }, []);

  // Stop scanning process
  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  // Switch camera
  const toggleCamera = useCallback(() => {
    setIsFrontCamera(prev => !prev);
  }, []);

  // Effect to process frames when scanning is active
  useEffect(() => {
    let frameId: number | null = null;
    
    if (isScanning) {
      frameId = requestAnimationFrame(processFrame);
    }
    
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isScanning, processFrame]);

  // Set initialization complete after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Mobile Barcode Scanner - MrLister</title>
        <meta name="description" content="Scan barcodes to quickly find inventory items and manage your inventory on the go." />
      </Helmet>
      
      <header className="py-4 px-4 flex items-center justify-between bg-background/50 backdrop-blur-sm border-b">
        <div className="flex items-center">
          <Link href="/" className="mr-2">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Mobile Scanner</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleCamera} 
            disabled={isInitializing}
          >
            <Camera className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <main className="flex-1 p-4 overflow-auto">
        <div className="max-w-md mx-auto space-y-4">
          {/* Scan Mode Tabs */}
          <Tabs 
            defaultValue="inventory" 
            onValueChange={(value) => setScanMode(value as 'inventory' | 'employee')}
            value={scanMode}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="inventory" className="flex items-center justify-center">
                <Package className="mr-2 h-4 w-4" /> Inventory
              </TabsTrigger>
              <TabsTrigger value="employee" className="flex items-center justify-center">
                <UserCheck className="mr-2 h-4 w-4" /> Employee
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="inventory">
              <Card className="overflow-hidden">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Barcode Scanner</CardTitle>
                  <CardDescription>
                    Point camera at a barcode to scan inventory items
                  </CardDescription>
                </CardHeader>
                
                <div className="relative bg-black aspect-square overflow-hidden">
                  {isInitializing ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-white animate-spin" />
                      <span className="text-white ml-2">Initializing camera...</span>
                    </div>
                  ) : (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: isFrontCamera ? "user" : "environment",
                      }}
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {isScanning && (
                    <div className="absolute inset-0 border-2 border-primary/70 pointer-events-none">
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/70 animate-pulse"></div>
                      <div className="absolute top-0 left-1/2 h-full w-0.5 bg-primary/70 animate-pulse"></div>
                    </div>
                  )}
                </div>
                
                <CardFooter className="flex justify-between p-4 bg-muted/10">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="continuous"
                      checked={isContinuousScan}
                      onCheckedChange={setIsContinuousScan}
                    />
                    <Label htmlFor="continuous">Continuous</Label>
                  </div>
                  
                  <Button
                    variant={isScanning ? "destructive" : "default"}
                    onClick={isScanning ? stopScanning : startScanning}
                    disabled={isInitializing}
                    className="min-w-[120px]"
                  >
                    {isScanning ? (
                      <>
                        <ZapOff className="mr-2 h-4 w-4" /> Stop
                      </>
                    ) : (
                      <>
                        <Scan className="mr-2 h-4 w-4" /> Start Scan
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="employee">
              <Card className="overflow-hidden">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Employee Check-in</CardTitle>
                  <CardDescription>
                    Scan QR codes for employee check-ins
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <div className="flex items-center mt-1">
                        <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                        <Input 
                          id="location"
                          placeholder="Enter location name"
                          value={currentLocation}
                          onChange={(e) => setCurrentLocation(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <div className="relative bg-black aspect-square overflow-hidden">
                  {isInitializing ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-white animate-spin" />
                      <span className="text-white ml-2">Initializing camera...</span>
                    </div>
                  ) : (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: isFrontCamera ? "user" : "environment",
                      }}
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {isScanning && (
                    <div className="absolute inset-0 border-2 border-primary/70 pointer-events-none">
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/70 animate-pulse"></div>
                      <div className="absolute top-0 left-1/2 h-full w-0.5 bg-primary/70 animate-pulse"></div>
                    </div>
                  )}
                </div>
                
                <CardFooter className="flex justify-between p-4 bg-muted/10">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="continuous-employee"
                      checked={isContinuousScan}
                      onCheckedChange={setIsContinuousScan}
                    />
                    <Label htmlFor="continuous-employee">Continuous</Label>
                  </div>
                  
                  <Button
                    variant={isScanning ? "destructive" : "default"}
                    onClick={isScanning ? stopScanning : startScanning}
                    disabled={isInitializing || !currentLocation}
                    className="min-w-[120px]"
                  >
                    {isScanning ? (
                      <>
                        <ZapOff className="mr-2 h-4 w-4" /> Stop
                      </>
                    ) : (
                      <>
                        <Scan className="mr-2 h-4 w-4" /> Start Scan
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Scan History */}
          {scanHistory.length > 0 && (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg">Recent Scans</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {scanHistory.map((scan, index) => (
                    <div key={index} className="p-4 flex items-center">
                      <div className="flex-1">
                        {scan.item ? (
                          // Inventory item scan
                          <>
                            <div className="font-medium">{scan.item.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {scan.code} ({scan.type})
                            </div>
                            <div className="mt-1 flex items-center">
                              <ShieldCheck className="h-3 w-3 text-green-500 mr-1" />
                              <span className="text-xs text-muted-foreground">{scan.item.sku} - ${scan.item.price}</span>
                            </div>
                          </>
                        ) : scan.checkinTime ? (
                          // Employee check-in
                          <>
                            <div className="font-medium">Employee Check-in</div>
                            <div className="text-sm text-muted-foreground">
                              {scan.code} ({scan.type})
                            </div>
                            <div className="mt-1 flex items-center">
                              <MapPin className="h-3 w-3 text-blue-500 mr-1" />
                              <span className="text-xs text-muted-foreground">
                                {scan.location} - {scan.checkinTime.toLocaleTimeString()}
                              </span>
                            </div>
                          </>
                        ) : (
                          // Unknown scan
                          <>
                            <div className="font-medium">Unknown Item</div>
                            <div className="text-sm text-muted-foreground">
                              {scan.code} ({scan.type})
                            </div>
                          </>
                        )}
                      </div>
                      
                      {scan.item && (
                        <Link href={`/inventory/${scan.item.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default MobileScanner;