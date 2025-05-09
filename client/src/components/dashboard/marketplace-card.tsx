import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingCart, ShoppingBag, MoreVertical } from "lucide-react";
import { Marketplace } from "@shared/schema";
import { format } from "date-fns";

interface MarketplaceCardProps {
  marketplace: Marketplace;
}

export function MarketplaceCard({ marketplace }: MarketplaceCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get the appropriate icon for the marketplace
  const getMarketplaceIcon = () => {
    switch (marketplace.name.toLowerCase()) {
      case "ebay":
        return <ShoppingCart className="text-2xl text-blue-600" />;
      case "shopify":
        return <ShoppingBag className="text-2xl text-green-600" />;
      default:
        return <ShoppingCart className="text-2xl text-gray-600" />;
    }
  };

  // Update listings mutation
  const updateListingsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/marketplaces/sync", undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplaces"] });
      toast({
        title: "Listings updated",
        description: `Your ${marketplace.name} listings have been synced successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: `Failed to sync ${marketplace.name} listings.`,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">{getMarketplaceIcon()}</div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              {marketplace.name}
            </h3>
            <p className="text-sm text-green-600">
              {marketplace.isConnected ? "Connected" : "Not Connected"}
            </p>
          </div>
          <div className="ml-auto">
            <DropdownMenu
              open={dropdownOpen}
              onOpenChange={setDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-1 text-gray-400 hover:text-gray-500"
                >
                  <MoreVertical size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>Sync Settings</DropdownMenuItem>
                <DropdownMenuItem>View Analytics</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => {
                    toast({
                      title: "Marketplace disconnected",
                      description: `${marketplace.name} has been disconnected.`,
                    });
                  }}
                >
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Active Listings</span>
            <span className="font-medium text-gray-900">
              {marketplace.activeListings}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-500">Last Synced</span>
            <span className="font-medium text-gray-900">
              {marketplace.lastSyncedAt
                ? format(new Date(marketplace.lastSyncedAt), "MMM d, h:mm a")
                : "Never"}
            </span>
          </div>
        </div>
        <div className="mt-5">
          <Button
            className="w-full justify-center"
            onClick={() => updateListingsMutation.mutate()}
            disabled={updateListingsMutation.isPending}
          >
            {updateListingsMutation.isPending
              ? "Updating..."
              : "Update Listings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
