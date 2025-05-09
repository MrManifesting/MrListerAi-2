import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocketContext } from '@/components/providers/websocket-provider';

export interface ImageAnalysis {
  id: number;
  userId: number;
  imageUrl: string;
  thumbnailUrl: string | null;
  status: string;
  analysisData: any;
  suggestedTitle: string | null;
  suggestedDescription: string | null;
  suggestedCategory: string | null;
  suggestedSubcategory: string | null;
  suggestedCondition: string | null;
  suggestedPrice: number | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export function useImageAnalysis() {
  const { toast } = useToast();
  const { sendInventoryUpdate } = useWebSocketContext();
  
  // Fetch all analyses
  const { 
    data: analyses, 
    error, 
    isLoading,
    refetch 
  } = useQuery<ImageAnalysis[]>({
    queryKey: ['/api/analyses'],
  });
  
  // Upload image for analysis
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/analyses/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to upload image');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
      toast({
        title: 'Analysis Started',
        description: 'Your image is being analyzed. This may take a moment.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Add item to inventory from analysis
  const addToInventoryMutation = useMutation({
    mutationFn: async (analysisId: number) => {
      const res = await apiRequest('POST', `/api/analyses/${analysisId}/add-to-inventory`);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      
      // Send WebSocket update to notify other clients
      sendInventoryUpdate(data);
      
      toast({
        title: 'Item Added',
        description: 'Analysis has been added to your inventory.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Add',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Delete analysis
  const deleteAnalysisMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/analyses/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
      toast({
        title: 'Analysis Deleted',
        description: 'The analysis has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Delete',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  return {
    analyses,
    isLoading,
    error,
    refetch,
    uploadImage: uploadMutation.mutate,
    addToInventory: addToInventoryMutation.mutate,
    deleteAnalysis: deleteAnalysisMutation.mutate,
    isUploading: uploadMutation.isPending,
    isAddingToInventory: addToInventoryMutation.isPending,
    isDeleting: deleteAnalysisMutation.isPending,
  };
}