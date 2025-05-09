import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/dashboard/stats-card";
import { MarketplaceCard } from "@/components/dashboard/marketplace-card";
import { AnalysisList } from "@/components/inventory/analysis-list";
import { ImageUpload } from "@/components/inventory/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Archive,
  ShoppingBag,
  LineChart,
  Star,
  Plus,
  ArrowUpRight
} from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const { toast } = useToast();
  const [showAddMarketplace, setShowAddMarketplace] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  // Fetch recent analyses
  const { data: analyses } = useQuery({
    queryKey: ["/api/analyses"],
  });

  const handleAnalysisComplete = (analysisId: number, results: any) => {
    setAnalysisComplete(true);
    toast({
      title: "Analysis complete",
      description: "The product has been successfully analyzed.",
    });
  };

  const handleItemAdded = () => {
    // Refresh analyses after item is added to inventory
    setAnalysisComplete(false);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your inventory and marketplace performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={<Archive size={20} />}
          iconColor="text-primary-600"
          iconBgColor="bg-primary-100"
          title="Total Inventory"
          value={dashboardData?.totalInventory || 0}
          change={{ value: "12%", positive: true }}
        />
        <StatsCard
          icon={<ShoppingBag size={20} />}
          iconColor="text-secondary-600"
          iconBgColor="bg-secondary-100"
          title="Active Listings"
          value={dashboardData?.activeListings || 0}
          change={{ value: "8%", positive: true }}
        />
        <StatsCard
          icon={<LineChart size={20} />}
          iconColor="text-accent-600"
          iconBgColor="bg-accent-100"
          title="Monthly Sales"
          value={`$${dashboardData?.monthlySales?.toFixed(2) || "0.00"}`}
          change={{ value: "23%", positive: true }}
        />
        <StatsCard
          icon={<Star size={20} />}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
          title="Avg. Rating"
          value={dashboardData?.avgRating || "0.0/5"}
        />
      </div>

      {/* AI Inventory Upload Section */}
      <div className="mt-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-medium text-gray-900">Add New Inventory with AI</h2>
            <p className="mt-1 text-sm text-gray-500">Upload images and let our AI analyze and price your items automatically</p>
            
            <div className="mt-4">
              <ImageUpload onAnalysisComplete={handleAnalysisComplete} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Items Analysis */}
      {(analysisComplete || (analyses && analyses.length > 0)) && (
        <div className="mt-8">
          <AnalysisList 
            analyses={analyses || []} 
            onItemAdded={handleItemAdded} 
          />
        </div>
      )}

      {/* Connected Marketplaces */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Connected Marketplaces</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your marketplace integrations and sync settings
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardData?.connectedMarketplaces?.map((marketplace: any) => (
            <MarketplaceCard
              key={marketplace.id}
              marketplace={marketplace}
            />
          ))}

          {/* Add Marketplace Card */}
          <Card className="overflow-hidden border-2 border-dashed border-gray-300">
            <CardContent className="p-5 flex flex-col items-center justify-center h-full">
              <div className="rounded-full bg-gray-100 p-3">
                <Plus className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Connect Another Marketplace
              </h3>
              <p className="mt-1 text-xs text-gray-500 text-center">
                Add Etsy, Amazon, or other platforms
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setShowAddMarketplace(true);
                  toast({
                    title: "Feature coming soon",
                    description: "Marketplace connection will be available soon.",
                  });
                }}
              >
                Connect
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upgrade Banner */}
      <div className="mt-8 bg-gradient-to-r from-accent-600 to-accent-800 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8 md:px-8 md:py-10 flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-white tracking-tight">Become a Sales Manager</h3>
            <p className="mt-2 text-accent-100 max-w-2xl">
              Help others sell their collectibles and earn commission on each sale. Upgrade to our Manager tier to access advanced features and increase your revenue.
            </p>
          </div>
          <div className="mt-6 md:mt-0">
            <Button
              variant="secondary"
              className="inline-flex items-center px-6 py-3 text-accent-700 bg-white hover:bg-accent-50 transition-all duration-150"
              onClick={() => {
                toast({
                  title: "Upgrade initiated",
                  description: "You'll be redirected to the upgrade page shortly.",
                });
              }}
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
