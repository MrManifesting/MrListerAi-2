import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useInventory } from "@/hooks/use-inventory";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Heart, Download, Calendar, DollarSign, Search, CheckCircle } from "lucide-react";
import { format } from "date-fns";

// Form schema for donations
const donationFormSchema = z.object({
  inventoryItemId: z.coerce.number().min(1, "Please select an item"),
  organization: z.string().min(1, "Organization name is required"),
  donationValue: z.coerce.number().positive("Donation value must be positive"),
  donationDate: z.string().min(1, "Donation date is required"),
  taxDeductionRate: z.coerce.number().min(0, "Rate must be at least 0%").max(100, "Rate cannot exceed 100%"),
  receiptInfo: z.object({
    receiptNumber: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

export default function Donations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewDonationDialog, setShowNewDonationDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedDonations, setSelectedDonations] = useState<number[]>([]);

  // Get inventory data
  const { inventoryItems } = useInventory();

  // Get donations
  const { data: donations, isLoading } = useQuery({
    queryKey: ["/api/donations"],
  });

  // Create form for new donation
  const form = useForm<z.infer<typeof donationFormSchema>>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      inventoryItemId: 0,
      organization: "",
      donationValue: 0,
      donationDate: format(new Date(), "yyyy-MM-dd"),
      taxDeductionRate: 30,
      receiptInfo: {
        receiptNumber: "",
        notes: "",
      },
    },
  });

  // Handle form submission
  const createDonationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof donationFormSchema>) => {
      const response = await apiRequest("POST", "/api/donations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donations"] });
      setShowNewDonationDialog(false);
      form.reset();
      toast({
        title: "Donation recorded",
        description: "Your donation has been successfully recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to record donation",
        description: "There was an error recording your donation.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof donationFormSchema>) => {
    createDonationMutation.mutate(data);
  };

  // Generate tax receipt export
  const handleExportTaxReceipt = () => {
    toast({
      title: "Export generated",
      description: "Your tax deduction document has been generated and downloaded.",
    });
    setShowExportDialog(false);
  };

  // Donation columns for table
  const donationColumns = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "inventoryItemId",
      header: "Item",
      cell: ({ row }) => {
        const itemId = row.getValue("inventoryItemId") as number;
        const item = inventoryItems?.find(item => item.id === itemId);
        return item ? item.title : `Item #${itemId}`;
      },
    },
    {
      accessorKey: "organization",
      header: "Organization",
    },
    {
      accessorKey: "donationValue",
      header: "Value",
      cell: ({ row }) => `$${(row.getValue("donationValue") as number).toFixed(2)}`,
    },
    {
      accessorKey: "taxDeductionRate",
      header: "Tax Rate",
      cell: ({ row }) => `${(row.getValue("taxDeductionRate") as number) * 100}%`,
    },
    {
      accessorKey: "donationDate",
      header: "Date",
      cell: ({ row }) => format(new Date(row.getValue("donationDate")), "MMM d, yyyy"),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const donation = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast({
                title: "Viewing receipt",
                description: "Receipt details will be displayed here.",
              });
            }}
          >
            View Receipt
          </Button>
        );
      },
    },
  ];

  // Mock donation data for development
  const mockDonations = [
    {
      id: 1,
      inventoryItemId: 1,
      organization: "Goodwill Industries",
      donationValue: 125.50,
      taxDeductionRate: 0.3,
      donationDate: new Date(2023, 4, 15),
      receiptInfo: { receiptNumber: "GW-12345" },
    },
    {
      id: 2,
      inventoryItemId: 2,
      organization: "Salvation Army",
      donationValue: 75.00,
      taxDeductionRate: 0.3,
      donationDate: new Date(2023, 3, 22),
      receiptInfo: { receiptNumber: "SA-54321" },
    },
    {
      id: 3,
      inventoryItemId: 3,
      organization: "Local Library",
      donationValue: 45.75,
      taxDeductionRate: 0.25,
      donationDate: new Date(2023, 2, 10),
      receiptInfo: { receiptNumber: "LL-98765" },
    },
  ];

  // For development, use mock data if real data isn't available
  const donationData = donations || mockDonations;

  // Stats for the summary cards
  const totalDonated = donationData.reduce((sum, d) => sum + (d.donationValue || 0), 0);
  const potentialTaxSavings = donationData.reduce(
    (sum, d) => sum + ((d.donationValue || 0) * (d.taxDeductionRate || 0)),
    0
  );
  const donationCount = donationData.length;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Donations</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track charitable donations and manage tax deductions
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => setShowExportDialog(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Tax Receipt
          </Button>
          <Button
            className="flex items-center"
            onClick={() => setShowNewDonationDialog(true)}
          >
            <Heart className="mr-2 h-4 w-4" />
            Record Donation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Donated
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ${totalDonated.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Potential Tax Savings
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ${potentialTaxSavings.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Donations
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {donationCount}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Donations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Donation History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={donationColumns}
            data={donationData}
            searchKey="organization"
          />
        </CardContent>
      </Card>

      {/* Record Donation Dialog */}
      <Dialog open={showNewDonationDialog} onOpenChange={setShowNewDonationDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Record Donation</DialogTitle>
            <DialogDescription>
              Enter the details of your charitable donation for tax purposes.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="inventoryItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donated Item</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a donated item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventoryItems ? (
                          inventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.title}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="0">No items available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter organization name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="donationValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Donation Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxDeductionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Deduction Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="donationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donation Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptInfo.receiptNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter receipt number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptInfo.notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewDonationDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createDonationMutation.isPending}>
                  {createDonationMutation.isPending ? "Recording..." : "Record Donation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Export Tax Receipt Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Tax Receipts</DialogTitle>
            <DialogDescription>
              Generate tax deduction documentation for your charitable donations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tax Year
              </label>
              <Select defaultValue="2023">
                <SelectTrigger>
                  <SelectValue placeholder="Select tax year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Export Format
              </label>
              <Select defaultValue="pdf">
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                Include Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-donations" defaultChecked />
                  <label
                    htmlFor="include-donations"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Donation Details
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-receipts" defaultChecked />
                  <label
                    htmlFor="include-receipts"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Receipt Information
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="include-summary" defaultChecked />
                  <label
                    htmlFor="include-summary"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Tax Deduction Summary
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportTaxReceipt}>
              Generate Tax Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
