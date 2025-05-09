import { useState } from 'react';
import { useImageAnalysis } from '@/hooks/use-image-analysis';
import { ImageAnalysis } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Check, Clock, Plus, Eye, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AnalysisListProps {
  analyses: ImageAnalysis[];
  onItemAdded?: () => void;
}

export function AnalysisList({ analyses, onItemAdded }: AnalysisListProps) {
  const [selectedAnalysis, setSelectedAnalysis] = useState<ImageAnalysis | null>(null);
  const { addToInventory, isAddingToInventory, deleteAnalysis } = useImageAnalysis();

  const handleAddToInventory = (analysisId: number) => {
    // Call the mutation's mutate function with the parameters
    addToInventory.mutate({ 
      analysisId,
      customData: {}
    }, {
      onSuccess: () => {
        if (onItemAdded) onItemAdded();
      }
    });
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center">
            <Check className="h-3 w-3 mr-1" /> Complete
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center">
            <Clock className="h-3 w-3 mr-1" /> Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center">
            {status}
          </Badge>
        );
    }
  };

  const truncateText = (text: string, length: number) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (analyses.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No analyses available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Image Analyses</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {analyses.map((analysis) => (
          <Card key={analysis.id} className="overflow-hidden">
            <div className="aspect-video w-full relative overflow-hidden">
              <img
                src={analysis.originalImageUrl}
                alt={analysis.suggestedTitle || 'Product image'}
                className="h-full w-full object-cover transition-all hover:scale-105"
              />
              <div className="absolute top-2 right-2">
                {renderStatus(analysis.status)}
              </div>
            </div>
            <CardHeader className="p-4 pb-0">
              <h4 className="font-medium text-lg line-clamp-1">
                {analysis.suggestedTitle || 'Untitled Product'}
              </h4>
              <p className="text-muted-foreground font-mono text-sm">
                ID: {analysis.id}
              </p>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {truncateText(analysis.suggestedDescription || 'No description available.', 100)}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>{' '}
                  <span className="font-medium">
                    {analysis.suggestedCategory || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Condition:</span>{' '}
                  <span className="font-medium">
                    {analysis.suggestedCondition || 'Unknown'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Price:</span>{' '}
                  <span className="font-medium">
                    {analysis.suggestedPrice
                      ? formatCurrency(analysis.suggestedPrice)
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
            <Separator />
            <CardFooter className="p-4 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAnalysis(analysis)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Details
              </Button>
              {analysis.status === 'completed' && (
                <Button
                  onClick={() => handleAddToInventory(analysis.id)}
                  size="sm"
                  disabled={isAddingToInventory}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Inventory
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Analysis Details Dialog */}
      {selectedAnalysis && (
        <Dialog open={!!selectedAnalysis} onOpenChange={() => setSelectedAnalysis(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Analysis Details</DialogTitle>
              <DialogDescription>
                Detailed information about the image analysis.
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <img
                  src={selectedAnalysis.imageUrl}
                  alt={selectedAnalysis.suggestedTitle || 'Product'}
                  className="w-full h-auto rounded-md"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-lg">
                    {selectedAnalysis.suggestedTitle || 'Untitled Product'}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Analysis ID: {selectedAnalysis.id}
                  </p>
                  <div className="mt-2">
                    {renderStatus(selectedAnalysis.status)}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h5 className="font-medium">Product Details</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Category:</span>{' '}
                      <span className="font-medium">
                        {selectedAnalysis.suggestedCategory || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subcategory:</span>{' '}
                      <span className="font-medium">
                        {selectedAnalysis.suggestedSubcategory || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Condition:</span>{' '}
                      <span className="font-medium">
                        {selectedAnalysis.suggestedCondition || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>{' '}
                      <span className="font-medium">
                        {selectedAnalysis.suggestedPrice
                          ? formatCurrency(selectedAnalysis.suggestedPrice)
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h5 className="font-medium">Description</h5>
                  <p className="text-sm mt-1">
                    {selectedAnalysis.suggestedDescription || 'No description available.'}
                  </p>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      deleteAnalysis(selectedAnalysis.id);
                      setSelectedAnalysis(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Analysis
                  </Button>
                  {selectedAnalysis.status === 'completed' && (
                    <Button
                      onClick={() => {
                        handleAddToInventory(selectedAnalysis.id);
                        setSelectedAnalysis(null);
                      }}
                      size="sm"
                      disabled={isAddingToInventory}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Inventory
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}