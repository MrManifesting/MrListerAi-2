import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, Edit } from "lucide-react";
import { ImageAnalysis } from "@shared/schema";
import { useState } from "react";

interface AnalysisListProps {
  analyses: ImageAnalysis[];
  onItemAdded: () => void;
}

export function AnalysisList({ analyses, onItemAdded }: AnalysisListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  // Toggle item expansion
  const toggleItemExpansion = (id: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Add to inventory mutation
  const addToInventoryMutation = useMutation({
    mutationFn: async (analysisId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/analyses/${analysisId}/add-to-inventory`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Item added to inventory",
        description: "The item has been successfully added to your inventory.",
      });
      onItemAdded();
    },
    onError: () => {
      toast({
        title: "Failed to add item",
        description: "There was an error adding the item to your inventory.",
        variant: "destructive",
      });
    },
  });

  if (!analyses || analyses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No analyzed items found. Upload images to analyze products.
        </CardContent>
      </Card>
    );
  }

  // Sort analyses by creation date (newest first)
  const sortedAnalyses = [...analyses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Recent AI Analyzed Items</h2>
      <p className="mt-1 text-sm text-gray-500">
        Review and edit AI-generated information before adding to inventory
      </p>

      <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {sortedAnalyses.map((analysis) => (
            <li key={analysis.id}>
              <div className="block hover:bg-gray-50">
                <div className="flex items-center px-4 py-4 sm:px-6">
                  <div className="min-w-0 flex-1 flex items-center">
                    {/* Product Image */}
                    <div className="flex-shrink-0 h-16 w-16 rounded overflow-hidden border border-gray-200">
                      {analysis.processedImageUrl ? (
                        <img
                          src={analysis.processedImageUrl}
                          alt={analysis.detectedItem || "Analyzed item"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="min-w-0 flex-1 px-4">
                      <div>
                        <p className="text-sm font-medium text-primary-600 truncate">
                          {analysis.suggestedTitle || analysis.detectedItem || "Unknown Item"}
                        </p>
                        <p className="mt-1 flex items-center text-sm text-gray-500">
                          <span className="truncate">
                            Condition: {analysis.suggestedCondition || "Unknown"} | {analysis.suggestedCategory || "Uncategorized"}
                          </span>
                        </p>
                        <div className="mt-2 flex items-center text-sm">
                          <div className="flex items-center text-sm space-x-4">
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                              AI Suggestion: ${analysis.suggestedPrice ? analysis.suggestedPrice.toFixed(2) : "0.00"}
                            </Badge>
                            <span className="text-gray-500 flex items-center">
                              <Tag size={16} className="mr-1 text-gray-400" />
                              Market Range: ${analysis.marketPriceRange?.min?.toFixed(2) || "0"} - ${analysis.marketPriceRange?.max?.toFixed(2) || "0"}
                            </span>
                          </div>
                        </div>
                        
                        {expandedItems[analysis.id] && (
                          <div className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
                            <p className="mb-2"><strong>Description:</strong> {analysis.suggestedDescription}</p>
                            <p><strong>Analysis Status:</strong> {analysis.status}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleItemExpansion(analysis.id)}
                    >
                      {expandedItems[analysis.id] ? "Less Info" : "More Info"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => addToInventoryMutation.mutate(analysis.id)}
                      disabled={addToInventoryMutation.isPending}
                    >
                      Add to Inventory
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <Edit size={16} className="mr-1" />
                      Edit Details
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
