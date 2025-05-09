import { useState } from "react";
import { useInventory } from "@/hooks/use-inventory";
import { useImageAnalysis } from "@/hooks/use-image-analysis";
import { ImageUpload } from "@/components/inventory/image-upload";
import { AnalysisList } from "@/components/inventory/analysis-list";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventoryStatus } from "@/components/inventory/inventory-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Database, BarChart3 } from "lucide-react";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [showUpload, setShowUpload] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [completedAnalyses, setCompletedAnalyses] = useState<number[]>([]);

  // Get inventory data
  const { inventoryItems, isLoading } = useInventory();
  
  // Get image analyses
  const { analyses, refetch: refetchAnalyses } = useImageAnalysis();

  const handleAnalysisComplete = (analysisId: number, results: any) => {
    // Add new analysis to completed analyses list
    setCompletedAnalyses(prev => [...prev, analysisId]);
    setAnalysisComplete(true);
    refetchAnalyses();
  };

  const handleItemAdded = () => {
    // Refresh analyses after item is added to inventory
    refetchAnalyses();
    setAnalysisComplete(false);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and track your product inventory across all marketplaces
          </p>
          <div className="mt-2">
            <InventoryStatus />
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            className="flex items-center"
            onClick={() => {
              setActiveTab("add");
              setShowUpload(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Items
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="inventory" className="flex items-center">
            <Database className="mr-2 h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            Add Items
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analyses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <InventoryTable
            items={inventoryItems || []}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium text-gray-900">
                Add New Inventory with AI
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload images and let our AI analyze and price your items automatically
              </p>

              <div className="mt-4">
                <ImageUpload onAnalysisComplete={handleAnalysisComplete} />
              </div>
            </CardContent>
          </Card>

          {analysisComplete && (
            <div className="mt-4">
              <AnalysisList
                analyses={analyses?.filter(a => a.status === "completed").slice(0, 5) || []}
                onItemAdded={handleItemAdded}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {analyses && analyses.length > 0 ? (
            <AnalysisList
              analyses={analyses}
              onItemAdded={handleItemAdded}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium text-gray-900">No Analyses Yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Upload product images to get AI-powered analysis and pricing suggestions.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setActiveTab("add");
                    setShowUpload(true);
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Images
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
