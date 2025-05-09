import { useState } from 'react';
import { useInventory, InventoryItem } from '@/hooks/use-inventory';
import { useWebSocketContext } from '@/components/providers/websocket-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Trash2, Eye, QrCode, BarCode, ListFilter, ArrowUpDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading: boolean;
}

export function InventoryTable({ items, isLoading }: InventoryTableProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const { deleteItem } = useInventory();
  const { sendInventoryUpdate } = useWebSocketContext();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteItem(id, {
        onSuccess: () => {
          // Notify other clients that the inventory has changed
          sendInventoryUpdate({ action: 'delete', itemId: id });
        },
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-[400px] w-full" />
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-lg font-medium mb-2">No Inventory Items</h3>
        <p className="text-muted-foreground mb-4">
          Start by uploading images to analyze and add items to your inventory.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  <Badge variant="outline">{item.condition}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSelectedItem(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        // Navigate to edit page or open edit modal
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Item
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        // Generate barcode function
                      }}>
                        <BarCode className="mr-2 h-4 w-4" />
                        Print Barcode
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        // Generate QR code function
                      }}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Print QR Code
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Item
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Item Details Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Item Details</DialogTitle>
              <DialogDescription>
                Detailed information about the inventory item.
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <img
                  src={selectedItem.imageUrl || '/placeholder-image.jpg'}
                  alt={selectedItem.title}
                  className="w-full h-auto rounded-md"
                />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="p-2 border rounded-md text-center">
                    <p className="text-xs text-muted-foreground mb-1">Barcode</p>
                    {selectedItem.barcode ? (
                      <img
                        src={selectedItem.barcode}
                        alt="Barcode"
                        className="h-16 w-full object-contain"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground">No barcode</p>
                    )}
                  </div>
                  <div className="p-2 border rounded-md text-center">
                    <p className="text-xs text-muted-foreground mb-1">QR Code</p>
                    {selectedItem.qrCode ? (
                      <img
                        src={selectedItem.qrCode}
                        alt="QR Code"
                        className="h-16 w-full object-contain"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground">No QR code</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium">{selectedItem.title}</h3>
                  <p className="text-muted-foreground font-mono text-xs">
                    SKU: {selectedItem.sku}
                  </p>
                  <div className="mt-2 flex items-center space-x-2">
                    <Badge>{selectedItem.condition}</Badge>
                    <Badge variant="outline">{selectedItem.category}</Badge>
                    {selectedItem.subcategory && (
                      <Badge variant="outline">{selectedItem.subcategory}</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-medium text-lg">{formatCurrency(selectedItem.price)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-medium text-lg">{selectedItem.quantity}</p>
                  </div>
                  {selectedItem.cost !== null && (
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium">{formatCurrency(selectedItem.cost)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                      <Badge variant={selectedItem.status === 'active' ? 'default' : 'secondary'}>
                        {selectedItem.status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(selectedItem.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p className="font-medium">{formatDate(selectedItem.updatedAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p className="text-sm mt-1">{selectedItem.description}</p>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDelete(selectedItem.id);
                      setSelectedItem(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Item
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      // Navigate to edit page or open edit modal
                      setSelectedItem(null);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Item
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}