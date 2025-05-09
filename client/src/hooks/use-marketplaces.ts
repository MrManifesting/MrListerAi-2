import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Marketplace } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMarketplaces() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all connected marketplaces
  const {
    data: marketplaces,
    isLoading,
    isError,
    refetch,
  } = useQuery<Marketplace[]>({
    queryKey: ["/api/marketplaces"],
  });

  // Connect to a marketplace
  const connectMarketplace = useMutation({
    mutationFn: async ({
      marketplaceName,
      authCode,
    }: {
      marketplaceName: string;
      authCode: string;
    }) => {
      const response = await apiRequest("POST", "/api/marketplaces/connect", {
        marketplaceName,
        authCode,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplaces"] });
      toast({
        title: "Marketplace connected",
        description: "The marketplace has been successfully connected.",
      });
    },
    onError: () => {
      toast({
        title: "Connection failed",
        description: "There was an error connecting to the marketplace.",
        variant: "destructive",
      });
    },
  });

  // Get listings from a marketplace
  const getMarketplaceListings = (marketplaceId: number) => {
    return useQuery({
      queryKey: [`/api/marketplaces/${marketplaceId}/listings`],
      enabled: !!marketplaceId,
    });
  };

  // Create a listing on a marketplace
  const createMarketplaceListing = useMutation({
    mutationFn: async ({
      marketplaceId,
      inventoryItemId,
    }: {
      marketplaceId: number;
      inventoryItemId: number;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/marketplaces/${marketplaceId}/create-listing`,
        { inventoryItemId }
      );
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplaces"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/marketplaces/${variables.marketplaceId}/listings`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Listing created",
        description: "The marketplace listing has been successfully created.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to create listing",
        description: "There was an error creating the marketplace listing.",
        variant: "destructive",
      });
    },
  });

  // Sync all marketplaces
  const syncAllMarketplaces = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/marketplaces/sync", undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplaces"] });
      toast({
        title: "Marketplaces synced",
        description: "All connected marketplaces have been synced successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Sync failed",
        description: "There was an error syncing marketplaces.",
        variant: "destructive",
      });
    },
  });

  // Generate CSV export for a marketplace
  const generateCSVExport = async (
    marketplaceName: string,
    inventoryIds?: number[]
  ) => {
    try {
      const response = await apiRequest("POST", "/api/inventory/export-csv", {
        marketplaceName,
        inventoryIds,
      });
      return response;
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error generating the CSV export.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    marketplaces,
    isLoading,
    isError,
    refetch,
    connectMarketplace,
    getMarketplaceListings,
    createMarketplaceListing,
    syncAllMarketplaces,
    generateCSVExport,
  };
}
