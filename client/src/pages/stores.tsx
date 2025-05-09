import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Store, InsertStore } from "@shared/schema";
import { Store as StoreIcon, Plus, Users, ShoppingBag, DollarSign, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { format } from "date-fns";

// Form schema for creating a store
const storeFormSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  description: z.string().optional(),
  commissionRate: z.coerce.number().min(0, "Commission must be at least 0%").max(100, "Commission cannot exceed 100%"),
  paymentSettings: z.object({
    paypalEmail: z.string().email("Must be a valid email").optional().or(z.literal('')),
    bankAccount: z.string().optional(),
  }).optional(),
});

export default function Stores() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("owned");

  // Get stores data
  const { data: stores, isLoading } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Form for creating store
  const form = useForm<z.infer<typeof storeFormSchema>>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      commissionRate: 10,
      paymentSettings: {
        paypalEmail: "",
      },
    },
  });

  // Create store mutation
  const createStoreMutation = useMutation({
    mutationFn: async (data: Omit<InsertStore, "ownerId">) => {
      const response = await apiRequest("POST", "/api/stores", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setShowCreateModal(false);
      form.reset();
      toast({
        title: "Store created",
        description: "Your store has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to create store",
        description: "There was an error creating your store.",
        variant: "destructive",
      });
    },
  });

  // Handle create store form submission
  const onSubmit = (values: z.infer<typeof storeFormSchema>) => {
    createStoreMutation.mutate({
      name: values.name,
      description: values.description || "",
      commissionRate: values.commissionRate / 100, // Convert to decimal
      platformFeeRate: 0.03, // 3% fixed platform fee
      paymentSettings: values.paymentSettings || {},
    });
  };

  // Filter stores by role
  const ownedStores = stores?.filter((store) => store.ownerId === user?.id) || [];
  const managedStores = stores?.filter((store) => store.managerId === user?.id) || [];

  // Inventory table mock data
  const mockInventoryData = [
    {
      id: 1,
      title: "Vintage Record Player",
      price: 149.99,
      status: "listed",
      date: new Date(2023, 5, 15),
      marketplaces: ["eBay", "Shopify"],
    },
    {
      id: 2,
      title: "Comic Book Collection",
      price: 299.99,
      status: "draft",
      date: new Date(2023, 5, 20),
      marketplaces: [],
    },
    {
      id: 3,
      title: "Antique Watch",
      price: 459.99,
      status: "sold",
      date: new Date(2023, 4, 10),
      marketplaces: ["eBay"],
    },
  ];

  // Sales table mock data
  const mockSalesData = [
    {
      id: 1,
      item: "Vintage Camera",
      buyerName: "John Doe",
      amount: 219.99,
      date: new Date(2023, 5, 12),
      marketplace: "eBay",
    },
    {
      id: 2,
      item: "Collectible Action Figure",
      buyerName: "Jane Smith",
      amount: 89.99,
      date: new Date(2023, 5, 18),
      marketplace: "Shopify",
    },
    {
      id: 3,
      item: "Antique Pocket Watch",
      buyerName: "Robert Johnson",
      amount: 349.99,
      date: new Date(2023, 5, 22),
      marketplace: "eBay",
    },
  ];

  // Inventory columns
  const inventoryColumns = [
    {
      accessorKey: "title",
      header: "Item",
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => `$${row.getValue("price")}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant="outline"
            className={
              status === "listed"
                ? "bg-green-100 text-green-800 border-green-200"
                : status === "sold"
                ? "bg-red-100 text-red-800 border-red-200"
                : "bg-amber-100 text-amber-800 border-amber-200"
            }
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Added Date",
      cell: ({ row }) => format(row.getValue("date") as Date, "MMM d, yyyy"),
    },
    {
      accessorKey: "marketplaces",
      header: "Listed On",
      cell: ({ row }) => {
        const marketplaces = row.getValue("marketplaces") as string[];
        return marketplaces.length > 0 ? marketplaces.join(", ") : "Not Listed";
      },
    },
  ];

  // Sales columns
  const salesColumns = [
    {
      accessorKey: "item",
      header: "Item",
    },
    {
      accessorKey: "buyerName",
      header: "Buyer",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => `$${row.getValue("amount")}`,
    },
    {
      accessorKey: "date",
      header: "Sale Date",
      cell: ({ row }) => format(row.getValue("date") as Date, "MMM d, yyyy"),
    },
    {
      accessorKey: "marketplace",
      header: "Marketplace",
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stores</h1>
          <p className="mt-1 text-sm text-gray-600">
            {user?.role === "manager"
              ? "Manage stores and client inventory as a sales manager"
              : "Create stores and assign managers to sell your products"}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button className="flex items-center" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Store
          </Button>
        </div>
      </div>

      {/* Store Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="owned" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            My Stores
          </TabsTrigger>
          <TabsTrigger value="managed" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Managed Stores
          </TabsTrigger>
        </TabsList>

        {/* Owned Stores */}
        <TabsContent value="owned">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedStores.length > 0 ? (
              ownedStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  isOwner={true}
                  onViewDetails={() => {
                    // View store details
                  }}
                />
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="p-6 text-center">
                  <StoreIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Stores Found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Create a store to manage your inventory or assign a sales manager.
                  </p>
                  <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Store
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Create Store Card */}
            <Card
              className="overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary hover:bg-gray-50 transition-all duration-200 cursor-pointer"
              onClick={() => setShowCreateModal(true)}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[220px]">
                <div className="rounded-full bg-gray-100 p-3">
                  <Plus className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Create New Store</h3>
                <p className="mt-2 text-sm text-gray-500 text-center max-w-[220px]">
                  Set up a new store to manage your inventory or assign a sales manager
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Managed Stores */}
        <TabsContent value="managed">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managedStores.length > 0 ? (
              managedStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  isOwner={false}
                  onViewDetails={() => {
                    // View store details
                  }}
                />
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="p-6 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Managed Stores</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {user?.role === "manager"
                      ? "You haven't been assigned as a manager to any stores yet."
                      : "Upgrade to Manager plan to manage stores for other sellers."}
                  </p>
                  {user?.role !== "manager" && (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        toast({
                          title: "Upgrade required",
                          description: "You need to upgrade to Manager plan to access this feature.",
                        });
                      }}
                    >
                      Upgrade to Manager
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Store Details Example */}
      {activeTab === "owned" && ownedStores.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Store Activity: {ownedStores[0]?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="inventory">
                <TabsList>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  <TabsTrigger value="sales">Sales</TabsTrigger>
                </TabsList>
                <TabsContent value="inventory" className="mt-4">
                  <DataTable
                    columns={inventoryColumns}
                    data={mockInventoryData}
                  />
                </TabsContent>
                <TabsContent value="sales" className="mt-4">
                  <DataTable
                    columns={salesColumns}
                    data={mockSalesData}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Store Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Store</DialogTitle>
            <DialogDescription>
              Set up a new store to manage your inventory and assign a sales manager if needed.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter store name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter store description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager Commission Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter commission percentage"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Percentage of sales that will go to the store manager.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentSettings.paypalEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Email (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter PayPal email"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      PayPal email for receiving payments.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createStoreMutation.isPending}>
                  {createStoreMutation.isPending ? "Creating..." : "Create Store"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Store Card Component
interface StoreCardProps {
  store: Store;
  isOwner: boolean;
  onViewDetails: () => void;
}

function StoreCard({ store, isOwner, onViewDetails }: StoreCardProps) {
  const { toast } = useToast();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{store.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>View Details</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  toast({
                    title: "Settings opened",
                    description: "Store settings will be available soon.",
                  });
                }}
              >
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Items
            </div>
            <span className="font-medium">24</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <DollarSign className="mr-2 h-4 w-4" />
              {isOwner ? "Revenue" : "Commission"}
            </div>
            <span className="font-medium">$1,245.00</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              {isOwner ? (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Manager
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Owner
                </>
              )}
            </div>
            <span className="font-medium">
              {isOwner
                ? store.managerId
                  ? "Assigned"
                  : "Unassigned"
                : "Client"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onViewDetails}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
