import { useState } from "react";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Form schema for connecting marketplace
const marketplaceFormSchema = z.object({
  marketplaceName: z.string().min(1, "Marketplace name is required"),
  authCode: z.string().min(1, "Authorization code is required"),
});

export default function Marketplaces() {
  const { toast } = useToast();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("");
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Get marketplaces data
  const {
    marketplaces,
    isLoading,
    connectMarketplace,
    syncAllMarketplaces,
  } = useMarketplaces();

  // Get inventory items
  const { inventoryItems } = useInventory();

  // Form for connecting marketplace
  const form = useForm<z.infer<typeof marketplaceFormSchema>>({
    resolver: zodResolver(marketplaceFormSchema),
    defaultValues: {
      marketplaceName: "",
      authCode: "",
    },
  });

  // Handle connect marketplace form submission
  const onSubmit = (values: z.infer<typeof marketplaceFormSchema>) => {
    connectMarketplace.mutate(
      {
        marketplaceName: values.marketplaceName,
        authCode: values.authCode,
      },
      {
        onSuccess: () => {
          setShowConnectModal(false);
          form.reset();
        },
      }
    );
  };

  // Get marketplace icon
  const getMarketplaceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "ebay":
        return <ShoppingCart className="h-8 w-8 text-blue-600" />;
      case "shopify":
        return <ShoppingBag className="h-8 w-8 text-green-600" />;
      case "etsy":
        return <Package className="h-8 w-8 text-orange-600" />;
      case "amazon":
        return <ShoppingCart className="h-8 w-8 text-yellow-600" />;
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
                        setShowCreateListingModal(true);
                      }}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create Listings
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
                        toast({
                          title: "Marketplace disconnected",
                          description: `${marketplace.name} has been disconnected.`,
                        });
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
                <Button className="w-full" onClick={() => {
                  toast({
                    title: "Listings updated",
                    description: `Your ${marketplace.name} listings are being updated.`,
                  });
                }}>
                  Update Listings
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="marketplaceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketplace</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a marketplace" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="eBay">eBay</SelectItem>
                        <SelectItem value="Shopify">Shopify</SelectItem>
                        <SelectItem value="Etsy">Etsy</SelectItem>
                        <SelectItem value="Amazon">Amazon</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="authCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authorization Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter authorization code" {...field} />
                    </FormControl>
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
                toast({
                  title: "Bulk export created",
                  description: `A CSV file for ${selectedMarketplace} has been generated.`,
                });
                setShowCreateListingModal(false);
              }}
            >
              Export as CSV
            </Button>
            <Button onClick={() => setShowCreateListingModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
