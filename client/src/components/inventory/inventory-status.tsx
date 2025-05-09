import { useState, useEffect } from 'react';
import { useWebSocketContext } from '@/components/providers/websocket-provider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function InventoryStatus() {
  const { isConnected, lastInventoryUpdate } = useWebSocketContext();
  const { toast } = useToast();
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  
  // Update the last update time when an inventory update is received
  useEffect(() => {
    if (lastInventoryUpdate) {
      const now = new Date();
      setLastUpdateTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      
      // Show a toast notification for the update
      toast({
        title: 'Inventory Updated',
        description: `Item: ${lastInventoryUpdate.sku || 'Unknown'} - ${lastInventoryUpdate.title || 'Unknown'}`,
        duration: 3000,
      });
    }
  }, [lastInventoryUpdate, toast]);
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500" />
        )}
        <span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {isConnected && (
        <Badge variant="outline" className="gap-1 ml-2">
          <span className={lastUpdateTime ? 'text-green-500' : 'text-muted-foreground'}>
            {lastUpdateTime 
              ? `Last update: ${lastUpdateTime}` 
              : 'No updates yet'}
          </span>
        </Badge>
      )}
    </div>
  );
}