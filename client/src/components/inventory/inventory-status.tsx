import React from 'react';
import { useWebSocketContext } from '@/components/providers/websocket-provider';
import { 
  CheckCircle2, 
  XCircle,
  RefreshCcw, 
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function InventoryStatus() {
  const { isConnected, lastInventoryUpdate } = useWebSocketContext();
  const { toast } = useToast();
  
  const getTimeSinceLastUpdate = () => {
    if (!lastInventoryUpdate) return 'No updates yet';
    
    // Use current timestamp if not provided in the update
    const timestamp = (lastInventoryUpdate as any).timestamp;
    const lastUpdateTime = timestamp ? new Date(timestamp) : new Date();
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastUpdateTime.getTime()) / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)} minutes ago`;
    } else {
      return `${Math.floor(diffSeconds / 3600)} hours ago`;
    }
  };
  
  return (
    <div className="flex items-center space-x-4 text-sm mb-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <Badge 
                variant={isConnected ? "default" : "destructive"}
                className="mr-2 cursor-help"
              >
                {isConnected ? (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isConnected 
                ? 'You are receiving real-time inventory updates' 
                : 'You will not receive real-time inventory updates'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {lastInventoryUpdate && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center text-muted-foreground cursor-help">
                <Clock className="h-3 w-3 mr-1" />
                <span>Last update: {getTimeSinceLastUpdate()}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                An inventory item was {lastInventoryUpdate.action}d
                {lastInventoryUpdate.itemId && ` (ID: ${lastInventoryUpdate.itemId})`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 px-2"
        onClick={() => {
          toast({
            title: 'Refreshing Inventory',
            description: 'Manually refreshing inventory data...',
          });
          // This will be handled by the parent component through props
          window.location.reload();
        }}
      >
        <RefreshCcw className="h-3 w-3 mr-1" />
        Refresh
      </Button>
    </div>
  );
}