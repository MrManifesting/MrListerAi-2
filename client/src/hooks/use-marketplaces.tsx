import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface Marketplace {
  id: number;
  userId: number;
  name: string;
  type: string;
  accessToken: string;
  refreshToken: string;
  shopUrl?: string;
  isConnected: boolean;
  activeListings: number;
  lastSyncedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectMarketplaceRequest {
  marketplaceName: string;
  authCode: string;
  shopUrl?: string;
}

export interface ExportCSVRequest {
  marketplaceId: number;
  inventoryIds?: number[];
}

export function useMarketplaces() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all marketplaces
  const {
    data: marketplaces,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Marketplace[]>({
    queryKey: ['/api/marketplaces'],
    onError: (error: any) => {
      toast({
        title: 'Error fetching marketplaces',
        description: error.message || 'Could not load marketplace data',
        variant: 'destructive',
      });
    },
  });

  // Connect a marketplace
  const connectMarketplace = useMutation({
    mutationFn: async (data: ConnectMarketplaceRequest) => {
      const response = await apiRequest('POST', '/api/marketplaces/connect', data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      toast({
        title: 'Marketplace connected',
        description: `${data.name} has been successfully connected.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to connect marketplace',
        variant: 'destructive',
      });
    },
  });

  // Sync all marketplaces
  const syncAllMarketplaces = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/marketplaces/sync-all');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      toast({
        title: 'Sync initiated',
        description: 'All marketplaces are being synchronized',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync marketplaces',
        variant: 'destructive',
      });
    },
  });

  // Disconnect a marketplace
  const disconnectMarketplace = useMutation({
    mutationFn: async (marketplaceId: number) => {
      const response = await apiRequest('DELETE', `/api/marketplaces/${marketplaceId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplaces'] });
      toast({
        title: 'Marketplace disconnected',
        description: 'The marketplace has been disconnected',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Disconnect failed',
        description: error.message || 'Failed to disconnect marketplace',
        variant: 'destructive',
      });
    },
  });

  // Export listings to CSV
  const exportToCSV = useMutation({
    mutationFn: async (data: ExportCSVRequest) => {
      const response = await apiRequest('POST', `/api/marketplaces/${data.marketplaceId}/export-csv`, {
        inventoryIds: data.inventoryIds,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Create a link to download the CSV
      const link = document.createElement('a');
      link.href = data.fileUrl;
      link.setAttribute('download', data.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'CSV Export Complete',
        description: `Export file "${data.fileName}" is ready for download`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export listings to CSV',
        variant: 'destructive',
      });
    },
  });

  return {
    marketplaces,
    isLoading,
    isError,
    error,
    refetch,
    connectMarketplace,
    syncAllMarketplaces,
    disconnectMarketplace,
    exportToCSV,
  };
}