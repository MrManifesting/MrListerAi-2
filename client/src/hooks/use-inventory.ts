import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InventoryItem, InsertInventoryItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all inventory items for the current user
  const {
    data: inventoryItems,
    isLoading,
    isError,
    refetch,
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Get a specific inventory item
  const useInventoryItem = (id: number) => {
    return useQuery<InventoryItem>({
      queryKey: [`/api/inventory/${id}`],
      enabled: !!id,
    });
  };

  // Create a new inventory item
  const createInventoryItem = useMutation({
    mutationFn: async (item: Omit<InsertInventoryItem, "userId">) => {
      const response = await apiRequest("POST", "/api/inventory", item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item created",
        description: "The inventory item has been successfully created.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to create item",
        description: "There was an error creating the inventory item.",
        variant: "destructive",
      });
    },
  });

  // Update an inventory item
  const updateInventoryItem = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<InventoryItem>;
    }) => {
      const response = await apiRequest("PATCH", `/api/inventory/${id}`, data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: [`/api/inventory/${variables.id}`] });
      toast({
        title: "Item updated",
        description: "The inventory item has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update item",
        description: "There was an error updating the inventory item.",
        variant: "destructive",
      });
    },
  });

  // Delete an inventory item
  const deleteInventoryItem = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/inventory/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item deleted",
        description: "The inventory item has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete item",
        description: "There was an error deleting the inventory item.",
        variant: "destructive",
      });
    },
  });

  // Analyze market demand for an item
  const analyzeMarketDemand = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("GET", `/api/inventory/${id}/market-analysis`, undefined);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Market analysis complete",
        description: "The market analysis has been completed successfully.",
      });
      return data;
    },
    onError: () => {
      toast({
        title: "Market analysis failed",
        description: "There was an error analyzing the market demand.",
        variant: "destructive",
      });
    },
  });

  // Optimize SEO for an item
  const optimizeSEO = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/inventory/${id}/optimize-seo`, undefined);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "SEO optimization complete",
        description: "The listing SEO has been optimized successfully.",
      });
      return data;
    },
    onError: () => {
      toast({
        title: "SEO optimization failed",
        description: "There was an error optimizing the listing SEO.",
        variant: "destructive",
      });
    },
  });

  // Generate listings for marketplaces
  const generateListings = useMutation({
    mutationFn: async (inventoryItemId: number) => {
      const response = await apiRequest("POST", "/api/inventory/generate-listings", {
        inventoryItemId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Listings generated",
        description: "Marketplace listings have been generated successfully.",
      });
      return data;
    },
    onError: () => {
      toast({
        title: "Failed to generate listings",
        description: "There was an error generating marketplace listings.",
        variant: "destructive",
      });
    },
  });

  return {
    inventoryItems,
    isLoading,
    isError,
    refetch,
    useInventoryItem,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    analyzeMarketDemand,
    optimizeSEO,
    generateListings,
  };
}
