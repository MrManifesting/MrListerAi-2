import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocketContext } from '@/components/providers/websocket-provider';

export interface InventoryItem {
  id: number;
  userId: number;
  storeId: number | null;
  sku: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  condition: string;
  price: number;
  cost: number | null;
  quantity: number;
  status: string;
  imageUrls: string[] | null;
  thumbnailUrl: string | null;
  aiGenerated: boolean;
  aiData: any;
  marketplaceData: any;
  metadata: any; // Contains barcode and QR code
  createdAt: Date;
  updatedAt: Date;
}

// Define a return type for the hook to help TypeScript
interface UseInventoryReturn {
  inventoryItems: InventoryItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  addItem: (newItem: Partial<InventoryItem>) => void;
  updateItem: (item: Partial<InventoryItem> & { id: number }) => void;
  deleteItem: (id: number) => void;
  isAddingItem: boolean;
  isUpdatingItem: boolean;
  isDeletingItem: boolean;
}

export function useInventory(): UseInventoryReturn {
  const { toast } = useToast();
  const { lastInventoryUpdate } = useWebSocketContext();
  
  // Fetch inventory items
  const { 
    data: inventoryItems, 
    error, 
    isLoading,
    refetch 
  } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory'],
  });
  
  // Update inventory when we receive a WebSocket update
  useEffect(() => {
    if (lastInventoryUpdate) {
      // Invalidate and refetch inventory data
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    }
  }, [lastInventoryUpdate]);
  
  // Add item to inventory
  const addItemMutation = useMutation({
    mutationFn: async (newItem: Partial<InventoryItem>) => {
      const res = await apiRequest('POST', '/api/inventory', newItem);
      return await res.json();
    },
    onSuccess: (data: InventoryItem) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: 'Item Added',
        description: `${data.title} has been added to your inventory.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Update inventory item
  const updateItemMutation = useMutation({
    mutationFn: async (item: Partial<InventoryItem> & { id: number }) => {
      const { id, ...updates } = item;
      const res = await apiRequest('PATCH', `/api/inventory/${id}`, updates);
      return await res.json();
    },
    onSuccess: (data: InventoryItem) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: 'Item Updated',
        description: `${data.title} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Delete inventory item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/inventory/${id}`);
      return { success: true }; // We don't need to parse JSON since delete returns 200 OK
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({
        title: 'Item Deleted',
        description: 'The item has been removed from your inventory.',
      });
    },
    onError: (error: Error) => {
      console.error("Delete error:", error);
      toast({
        title: 'Failed to delete item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  return {
    inventoryItems,
    isLoading,
    error,
    refetch,
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    isAddingItem: addItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isDeletingItem: deleteItemMutation.isPending,
  };
}