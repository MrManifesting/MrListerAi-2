import { useState, useEffect } from "react";
import { useMarketplaces } from "@/hooks/use-marketplaces";
import { useInventory } from "@/hooks/use-inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShoppingCart,
  ShoppingBag,
  Package,
  Clock,
  Plus,
  MoreHorizontal,
  RefreshCw,
  Link as LinkIcon,
  Settings,
  Unlink,
  BarChart3,
  FileDown,
  Download,
  Check,
  CircleAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { SiShopify, SiEbay, SiEtsy, SiAmazon } from "react-icons/si";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form schema for connecting marketplace
const shopifyFormSchema = z.object({
  marketplaceName: z.literal("Shopify"),
  shopUrl: z.string().min(1, "Shop URL is required")
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/, "Invalid Shopify shop name"),
  authCode: z.string().min(1, "Authorization code is required"),
});

const ebayFormSchema = z.object({
  marketplaceName: z.literal("eBay"),
  authCode: z.string().min(1, "Authorization code is required"),
});

const etsyFormSchema = z.object({
  marketplaceName: z.literal("Etsy"),
  authCode: z.string().min(1, "Authorization code is required"),
});

const amazonFormSchema = z.object({
  marketplaceName: z.literal("Amazon"),
  authCode: z.string().min(1, "Authorization code is required"),
});

// Combined schema with discriminated union
const marketplaceFormSchema = z.discriminatedUnion("marketplaceName", [
  shopifyFormSchema,
  ebayFormSchema,
  etsyFormSchema,
  amazonFormSchema,
]);

export default function Marketplaces() {
  const { toast } = useToast();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("");
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState<number | null>(null);
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectAllItems, setSelectAllItems] = useState(false);

  // Get marketplaces data
  const {
    marketplaces,
    isLoading,
    connectMarketplace,
    syncAllMarketplaces,
    disconnectMarketplace,
    generateCSVExport,
    downloadCSVExport,
    generateCSVExportMutation,
  } = useMarketplaces();

  // Get inventory items
  const { inventoryItems, isLoading: isLoadingInventory } = useInventory();

  // Form for connecting marketplace
  const form = useForm<z.infer<typeof marketplaceFormSchema>>({
    resolver: zodResolver(marketplaceFormSchema),
    defaultValues: {
      marketplaceName: "Shopify",
      authCode: "",
    },
  });

  const marketplaceName = form.watch("marketplaceName");

  // When marketplace name changes, reset form
  useEffect(() => {
    if (marketplaceName === "Shopify") {
      form.setValue("shopUrl", "");
    }
  }, [marketplaceName, form]);

  // Toggle item selection
  const toggleItemSelection = (itemId: number) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  // Toggle select all items
  useEffect(() => {
    if (selectAllItems && inventoryItems) {
      const allIds = inventoryItems
        .filter(item => item.status !== "sold")
        .map(item => item.id);
      setSelectedItems(allIds);
    } else if (!selectAllItems) {
      setSelectedItems([]);
    }
  }, [selectAllItems, inventoryItems]);

  // Handle connect marketplace form submission
  const onSubmit = (values: z.infer<typeof marketplaceFormSchema>) => {
    // The form data is already correctly typed based on the marketplaceName
    // thanks to the discriminated union in the schema
    
    connectMarketplace.mutate(
      values, // Values already have the correct shape thanks to the discriminated union
      {
        onSuccess: () => {
          setShowConnectModal(false);
          form.reset({
            marketplaceName: "Shopify",
            authCode: "",
          });
        },
      }
    );
  };

  // Get marketplace icon
  const getMarketplaceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "ebay":
        return <SiEbay className="h-8 w-8 text-blue-600" />;
      case "shopify":
        return <SiShopify className="h-8 w-8 text-green-600" />;
      case "etsy":
        return <SiEtsy className="h-8 w-8 text-orange-600" />;
      case "amazon":
        return <SiAmazon className="h-8 w-8 text-yellow-600" />;
      default:
        return <ShoppingCart className="h-8 w-8 text-gray-600" />;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Marketplaces</h1>
          <p className="mt-1 text-sm text-gray-600">
            Connect and manage your e-commerce platform integrations
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => syncAllMarketplaces.mutate()}
            disabled={syncAllMarketplaces.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {syncAllMarketplaces.isPending ? "Syncing..." : "Sync All"}
          </Button>
          <Button
            className="flex items-center"
            onClick={() => setShowConnectModal(true)}
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            Connect Platform
          </Button>
        </div>
      </div>

      {/* Connected Marketplaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {marketplaces?.map((marketplace) => (
          <Card key={marketplace.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getMarketplaceIcon(marketplace.name)}
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {marketplace.name}
                      {marketplace.shopUrl && (
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          ({marketplace.shopUrl})
                        </span>
                      )}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        marketplace.isConnected
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-red-100 text-red-800 border-red-200"
                      }
                    >
                      {marketplace.isConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSelectedMarketplace(marketplace.name);
                        setSelectedMarketplaceId(marketplace.id);
                        setShowCreateListingModal(true);
                      }}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create Listings
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center cursor-pointer"
                      onClick={() => {
                        setSelectedMarketplace(marketplace.name);
                        setSelectedMarketplaceId(marketplace.id);
                        setShowExportModal(true);
                      }}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Sync Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center cursor-pointer">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="flex items-center text-red-600 cursor-pointer"
                      onClick={() => {
                        disconnectMarketplace.mutate(marketplace.id);
                      }}
                    >
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-500">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Active Listings
                  </div>
                  <span className="font-medium text-gray-900">
                    {marketplace.activeListings || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="mr-2 h-4 w-4" />
                    Last Synced
                  </div>
                  <span className="font-medium text-gray-900">
                    {marketplace.lastSyncedAt
                      ? format(new Date(marketplace.lastSyncedAt), "MMM d, h:mm a")
                      : "Never"}
                  </span>
                </div>
              </div>
              
              <div className="mt-6">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    // Find this marketplace in marketplaces array
                    setSelectedMarketplace(marketplace.name);
                    setSelectedMarketplaceId(marketplace.id);
                    setShowExportModal(true);
                  }}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Marketplace Card */}
        <Card 
          className="overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary hover:bg-gray-50 transition-all duration-200 cursor-pointer"
          onClick={() => setShowConnectModal(true)}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[220px]">
            <div className="rounded-full bg-gray-100 p-3">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Connect New Marketplace
            </h3>
            <p className="mt-2 text-sm text-gray-500 text-center max-w-[220px]">
              Add eBay, Shopify, Etsy, Amazon or other e-commerce platforms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connect Marketplace Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Marketplace</DialogTitle>
            <DialogDescription>
              Enter the required information to connect your marketplace account.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="Shopify" onValueChange={(value) => form.setValue("marketplaceName", value as any)}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="Shopify">Shopify</TabsTrigger>
              <TabsTrigger value="eBay">eBay</TabsTrigger>
              <TabsTrigger value="Etsy">Etsy</TabsTrigger>
              <TabsTrigger value="Amazon">Amazon</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {marketplaceName === "Shopify" && (
                  <FormField
                    control={form.control}
                    name="shopUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop Name</FormLabel>
                        <div className="flex">
                          <FormControl>
                            <Input 
                              placeholder="your-shop-name" 
                              {...field} 
                            />
                          </FormControl>
                          <div className="flex items-center ml-2 text-sm text-muted-foreground">.myshopify.com</div>
                        </div>
                        <FormDescription>
                          Enter your Shopify store name without ".myshopify.com"
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="authCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authorization Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter authorization code" {...field} />
                      </FormControl>
                      <FormDescription>
                        {marketplaceName === "Shopify" 
                          ? "Generate this code in your Shopify Admin > Apps > Develop apps > Create an app"
                          : `Enter the authorization code from your ${marketplaceName} developer account`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowConnectModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={connectMarketplace.isPending}>
                    {connectMarketplace.isPending ? "Connecting..." : "Connect"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create Listing Modal */}
      <Dialog open={showCreateListingModal} onOpenChange={setShowCreateListingModal}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create {selectedMarketplace} Listing</DialogTitle>
            <DialogDescription>
              Select items from your inventory to list on {selectedMarketplace}.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto pr-6 -mr-6">
            {inventoryItems && inventoryItems.length > 0 ? (
              <div className="space-y-2">
                {inventoryItems
                  .filter(item => item.status !== "sold")
                  .map(item => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 rounded border border-gray-200 hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 mr-3">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No image</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">{item.title}</h4>
                          <p className="text-xs text-gray-500">${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Listing created",
                            description: `${item.title} has been listed on ${selectedMarketplace}.`,
                          });
                        }}
                      >
                        List Item
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No available inventory items to list.
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                // Switch to CSV export modal
                setShowCreateListingModal(false);
                setShowExportModal(true);
              }}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export as CSV
            </Button>
            <Button onClick={() => setShowCreateListingModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export CSV Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Export {selectedMarketplace} CSV</DialogTitle>
            <DialogDescription>
              Generate a formatted CSV file for bulk upload to {selectedMarketplace}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="selectAll" 
                checked={selectAllItems}
                onCheckedChange={(checked) => {
                  setSelectAllItems(!!checked);
                }}
              />
              <label
                htmlFor="selectAll"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All Items
              </label>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingInventory ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Loading inventory...
                      </TableCell>
                    </TableRow>
                  ) : inventoryItems && inventoryItems.length > 0 ? (
                    inventoryItems
                      .filter(item => item.status !== "sold")
                      .map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => toggleItemSelection(item.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {item.thumbnailUrl ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  className="h-8 w-8 mr-2 rounded object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 mr-2 rounded bg-gray-100"></div>
                              )}
                              <span className="font-medium">{item.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                          <TableCell>{item.condition}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === "active" ? "default" : "secondary"}>
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No available inventory items to export.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CircleAlert className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">CSV Export Information</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      This export will generate a CSV file formatted specifically for {selectedMarketplace}.
                      The file will include all required fields in the correct format for direct import.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedMarketplaceId && selectedItems.length > 0) {
                  generateCSVExport(selectedMarketplace, selectedItems.length > 0 ? selectedItems : undefined);
                  setShowExportModal(false);
                } else {
                  toast({
                    title: "Selection required",
                    description: "Please select at least one item to export",
                    variant: "destructive",
                  });
                }
              }}
              disabled={generateCSVExportMutation.isPending || selectedItems.length === 0}
            >
              {generateCSVExportMutation.isPending ? (
                <>Generating CSV...</>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export {selectedItems.length} Items
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
