import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Marketplace } from '../../shared/schema';

export interface MarketplaceConnectionParams {
  marketplaceName: "Shopify" | "eBay" | "Etsy" | "Amazon";
  authCode: string;
  shopUrl?: string;
}

export function useMarketplaces() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<{
    fileUrl: string;
    fileName: string;
    marketplace: string;
    itemCount: number;
  } | null>(null);

  // Fetch all marketplaces
  const {
    data: marketplaces,
    isLoading,
    error,
    refetch
  } = useQuery<Marketplace[]>({
    queryKey: ['/api/marketplaces'],
    // Make sure TanStack Query is updated to v5 format
    meta: {
      errorMessage: 'Failed to load marketplaces'
    }
  });

  // Connect to a marketplace
  const connectMarketplaceMutation = useMutation({
    mutationFn: async (params: MarketplaceConnectionParams) => {
      const response = await apiRequest('POST', '/api/marketplaces/connect', params);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Marketplace connected successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to connect marketplace',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Disconnect (delete) a marketplace
  const disconnectMarketplaceMutation = useMutation({
    mutationFn: async (marketplaceId: number) => {
      const response = await apiRequest('DELETE', `/api/marketplaces/${marketplaceId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Marketplace disconnected successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to disconnect marketplace',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Sync all marketplaces
  const syncMarketplacesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/marketplaces/sync');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Sync completed',
        description: `Successfully synced ${data.synced} of ${data.total} marketplaces`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to sync marketplaces',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Generate CSV export for a marketplace
  const generateCSVExportMutation = useMutation({
    mutationFn: async ({ marketplaceId, inventoryIds }: { marketplaceId: number, inventoryIds?: number[] }) => {
      setIsExporting(true);
      const response = await apiRequest('POST', '/api/inventory/export-csv', {
        marketplaceId,
        inventoryIds
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setExportData(data);
      toast({
        title: 'CSV Export Generated',
        description: `${data.itemCount} items exported for ${data.marketplace}`,
      });
      setIsExporting(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate CSV export',
        description: error.message,
        variant: 'destructive',
      });
      setIsExporting(false);
    }
  });

  // Utility function to find marketplace by type
  const findMarketplaceByType = (type: string): Marketplace | undefined => {
    if (!marketplaces) return undefined;
    return marketplaces.find(m => m.type.toLowerCase() === type.toLowerCase());
  };

  // Check if a marketplace type is connected
  const isMarketplaceConnected = (type: string): boolean => {
    const marketplace = findMarketplaceByType(type);
    return marketplace ? marketplace.isConnected : false;
  };

  // Connect to a marketplace
  const connectMarketplace = (params: MarketplaceConnectionParams) => {
    connectMarketplaceMutation.mutate(params);
  };

  // Disconnect a marketplace
  const disconnectMarketplace = (marketplaceId: number) => {
    disconnectMarketplaceMutation.mutate(marketplaceId);
  };

  // Sync all marketplaces
  const syncMarketplaces = () => {
    syncMarketplacesMutation.mutate();
  };

  // Export items to CSV for a specific marketplace
  const generateCSVExport = (marketplaceName: string, inventoryIds?: number[]) => {
    const marketplace = findMarketplaceByType(marketplaceName);
    if (!marketplace) {
      toast({
        title: 'Marketplace not found',
        description: `${marketplaceName} is not connected`,
        variant: 'destructive',
      });
      return;
    }

    generateCSVExportMutation.mutate({
      marketplaceId: marketplace.id,
      inventoryIds
    });
  };

  // Download the exported CSV file
  const downloadCSVExport = () => {
    if (!exportData) return;
    
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = exportData.fileUrl;
    link.download = exportData.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    marketplaces,
    isLoading,
    error,
    refetch,
    connectMarketplace,
    disconnectMarketplace,
    syncMarketplaces,
    isMarketplaceConnected,
    findMarketplaceByType,
    generateCSVExport,
    isExporting,
    exportData,
    downloadCSVExport,
    connectMarketplaceMutation,
    disconnectMarketplaceMutation,
    syncMarketplacesMutation,
    generateCSVExportMutation
  };
}