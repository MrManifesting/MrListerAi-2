import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InventoryItem } from "@shared/schema";
import { Edit, Eye, MoreHorizontal, Download, Share2 } from "lucide-react";

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading: boolean;
}

export function InventoryTable({ items, isLoading }: InventoryTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportCSV = async (marketplaceName: string) => {
    try {
      setExportLoading(true);
      
      // Get the inventory IDs to export
      const inventoryIds = items.map(item => item.id);
      
      // Create a temporary link to download the CSV
      const response = await apiRequest("POST", "/api/inventory/export-csv", {
        marketplaceName,
        inventoryIds,
      });
      
      // Convert the response to a blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${marketplaceName.toLowerCase()}-listings.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "CSV exported successfully",
        description: `Your inventory has been exported for ${marketplaceName}.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was a problem exporting your inventory.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Define status badge styling based on status
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "listed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Listed</Badge>;
      case "draft":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Draft</Badge>;
      case "sold":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Sold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Table columns
  const columns = [
    {
      accessorKey: "thumbnailUrl",
      header: "Item",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden border border-gray-200">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="h-10 w-10 object-cover"
                />
              ) : (
                <div className="h-10 w-10 bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No image</span>
                </div>
              )}
            </div>
            <div className="ml-4">
              <div className="font-medium text-gray-900">{item.title}</div>
              <div className="text-gray-500 truncate max-w-xs">
                {item.description}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <div className="text-sm text-gray-500">{row.original.sku}</div>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <div className="text-sm text-gray-500">
          {row.original.category}
          {row.original.subcategory && <> &gt; {row.original.subcategory}</>}
        </div>
      ),
    },
    {
      accessorKey: "condition",
      header: "Condition",
      cell: ({ row }) => <div className="text-sm text-gray-500">{row.original.condition}</div>,
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <div className="text-sm font-medium text-gray-900">
          ${row.original.price.toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex justify-end space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="flex items-center"
                  onClick={() => {
                    toast({
                      title: "Feature coming soon",
                      description: "Edit functionality will be available soon.",
                    });
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Item
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center"
                  onClick={() => {
                    toast({
                      title: "Feature coming soon",
                      description: "View details functionality will be available soon.",
                    });
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center"
                  onClick={() => {
                    toast({
                      title: "Feature coming soon",
                      description: "Create listing functionality will be available soon.",
                    });
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Create Listing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Filter options
  const filterOptions = [
    {
      key: "category",
      options: [
        { label: "Electronics", value: "Electronics" },
        { label: "Clothing", value: "Clothing" },
        { label: "Collectibles", value: "Collectibles" },
        { label: "Music", value: "Music" },
        { label: "Jewelry", value: "Jewelry" },
        { label: "Home & Garden", value: "Home & Garden" },
      ],
      placeholder: "All Categories",
    },
    {
      key: "condition",
      options: [
        { label: "New", value: "New" },
        { label: "Like New", value: "Like New" },
        { label: "Very Good", value: "Very Good" },
        { label: "Good", value: "Good" },
        { label: "Acceptable", value: "Acceptable" },
      ],
      placeholder: "All Conditions",
    },
    {
      key: "status",
      options: [
        { label: "Listed", value: "listed" },
        { label: "Draft", value: "draft" },
        { label: "Sold", value: "sold" },
      ],
      placeholder: "All Statuses",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="sm:flex sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Inventory Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage your inventory across all connected marketplaces
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none flex space-x-3">
          <Button className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Import
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center" disabled={exportLoading}>
                <Download className="mr-2 h-4 w-4" />
                {exportLoading ? "Exporting..." : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExportCSV("eBay")}>
                Export for eBay
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCSV("Shopify")}>
                Export for Shopify
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportCSV("Generic")}>
                Generic CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        searchKey="title"
        filterOptions={filterOptions}
        searchPlaceholder="Search inventory"
      />
    </div>
  );
}
