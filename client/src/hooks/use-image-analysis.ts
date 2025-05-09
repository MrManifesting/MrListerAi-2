import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ImageAnalysis } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useImageAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all image analyses for the current user
  const {
    data: analyses,
    isLoading,
    isError,
    refetch,
  } = useQuery<ImageAnalysis[]>({
    queryKey: ["/api/analyses"],
  });

  // Analyze a product image
  const analyzeImage = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await apiRequest("POST", "/api/analyze/image", {
        imageBase64,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      toast({
        title: "Analysis complete",
        description: "The image has been successfully analyzed.",
      });
      return data;
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing the image.",
        variant: "destructive",
      });
    },
  });

  // Add an analyzed item to inventory
  const addToInventory = useMutation({
    mutationFn: async ({
      analysisId,
      customData = {},
    }: {
      analysisId: number;
      customData?: Record<string, any>;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/analyses/${analysisId}/add-to-inventory`,
        customData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item added to inventory",
        description: "The analyzed item has been added to your inventory.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add item",
        description: "There was an error adding the item to your inventory.",
        variant: "destructive",
      });
    },
  });

  return {
    analyses,
    isLoading,
    isError,
    refetch,
    analyzeImage,
    addToInventory,
  };
}
