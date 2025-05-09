import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Calendar, Tag, CreditCardIcon, Plus, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function Payments() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Get current user subscription
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Mock transaction data
  const transactions = [
    {
      id: "tx_1",
      type: "subscription",
      amount: 29.99,
      date: new Date(2023, 4, 15),
      description: "Premium Plan - Monthly",
      status: "completed",
    },
    {
      id: "tx_2",
      type: "fee",
      amount: 4.50,
      date: new Date(2023, 4, 12),
      description: "Platform Fee - eBay Listing",
      status: "completed",
    },
    {
      id: "tx_3",
      type: "commission",
      amount: 12.75,
      date: new Date(2023, 4, 10),
      description: "Sales Commission - Vintage Camera",
      status: "completed",
    },
    {
      id: "tx_4",
      type: "subscription",
      amount: 29.99,
      date: new Date(2023, 3, 15),
      description: "Premium Plan - Monthly",
      status: "completed",
    },
    {
      id: "tx_5",
      type: "fee",
      amount: 3.25,
      date: new Date(2023, 3, 8),
      description: "Platform Fee - Shopify Listing",
      status: "completed",
    },
  ];

  // Subscription plans
  const subscriptionPlans = [
    {
      id: "basic",
      name: "Basic",
      price: 9.99,
      period: "monthly",
      features: [
        "Up to 50 inventory items",
        "Basic AI image analysis",
        "Single marketplace connection",
        "Standard support",
      ],
      recommended: false,
    },
    {
      id: "premium",
      name: "Premium",
      price: 29.99,
      period: "monthly",
      features: [
        "Up to 500 inventory items",
        "Advanced AI image analysis",
        "Multiple marketplace connections",
        "Priority support",
        "Advanced analytics",
        "Bulk listings generation",
      ],
      recommended: true,
    },
    {
      id: "manager",
      name: "Manager",
      price: 49.99,
      period: "monthly",
      features: [
        "Unlimited inventory items",
        "Full AI capabilities",
        "All marketplace connections",
        "Premium support",
        "Commission management",
        "Client store management",
        "Custom branding options",
      ],
      recommended: false,
    },
  ];

  // Define transaction columns
  const transactionColumns = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => format(row.getValue("date"), "MMM d, yyyy"),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge
            variant="outline"
            className={
              type === "subscription"
                ? "bg-blue-100 text-blue-800 border-blue-200"
                : type === "fee"
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-green-100 text-green-800 border-green-200"
            }
          >
            {type === "subscription"
              ? "Subscription"
              : type === "fee"
              ? "Platform Fee"
              : "Commission"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => `$${row.getValue("amount").toFixed(2)}`,
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
              status === "completed"
                ? "bg-green-100 text-green-800 border-green-200"
                : status === "pending"
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-red-100 text-red-800 border-red-200"
            }
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
  ];

  // Handle subscription upgrade
  const handleUpgrade = () => {
    toast({
      title: "Subscription Updated",
      description: `You've successfully upgraded to the ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan.`,
    });
    setShowUpgradeDialog(false);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your subscription plan and view transaction history
        </p>
      </div>

      {/* Current Subscription */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">
                {user?.subscription === "premium"
                  ? "Premium Plan"
                  : user?.subscription === "manager"
                  ? "Manager Plan"
                  : "Basic Plan"}
              </h2>
              <p className="text-sm text-gray-500">
                Your subscription renews on{" "}
                {format(
                  new Date(user?.subscriptionValidUntil || new Date()),
                  "MMMM d, yyyy"
                )}
              </p>
              <div className="flex items-center">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Button onClick={() => setShowUpgradeDialog(true)}>
                Upgrade Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods & Transactions */}
      <Tabs defaultValue="transactions">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="subscription-plans" className="flex items-center">
            <Tag className="mr-2 h-4 w-4" />
            Subscription Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={transactionColumns}
                data={transactions}
                searchKey="description"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Saved Payment Methods</CardTitle>
                <Button size="sm" className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded-md mr-4">
                      <CreditCardIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">Visa ending in 4242</p>
                      <p className="text-sm text-gray-500">Expires 04/2025</p>
                    </div>
                  </div>
                  <Badge variant="outline">Default</Badge>
                </div>

                <div className="text-center p-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Feature coming soon",
                        description: "Payment method management will be available soon.",
                      });
                    }}
                  >
                    Manage Payment Methods
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription-plans">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`${
                  plan.recommended 
                    ? "border-primary shadow-md" 
                    : ""
                } relative overflow-hidden`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 text-xs font-medium">
                    Recommended
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name} Plan</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-gray-500">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={user?.subscription === plan.id ? "outline" : "default"}
                    onClick={() => {
                      if (user?.subscription === plan.id) {
                        toast({
                          title: "Current Plan",
                          description: `You are already on the ${plan.name} plan.`,
                        });
                      } else {
                        setSelectedPlan(plan.id);
                        setShowUpgradeDialog(true);
                      }
                    }}
                  >
                    {user?.subscription === plan.id
                      ? "Current Plan"
                      : "Select Plan"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Subscription</DialogTitle>
            <DialogDescription>
              Choose your desired plan and payment method to upgrade your subscription.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="plan-select">Select Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger id="plan-select">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic ($9.99/month)</SelectItem>
                  <SelectItem value="premium">Premium ($29.99/month)</SelectItem>
                  <SelectItem value="manager">Manager ($49.99/month)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select defaultValue="card">
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Visa ending in 4242</SelectItem>
                  <SelectItem value="new">Add new payment method</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Plan Cost</span>
                <span>
                  $
                  {selectedPlan === "basic"
                    ? "9.99"
                    : selectedPlan === "premium"
                    ? "29.99"
                    : "49.99"}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Tax</span>
                <span>$0.00</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between items-center font-medium">
                <span>Total</span>
                <span>
                  $
                  {selectedPlan === "basic"
                    ? "9.99"
                    : selectedPlan === "premium"
                    ? "29.99"
                    : "49.99"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade}>
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for labels
function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  );
}
