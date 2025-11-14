import React, { useState } from 'react';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const LiveStatusBadge: React.FC = () => {
  const { connectionStatus, lastSyncTime, retryConnection } = useRealtime();
  const [open, setOpen] = useState(false);

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'live':
        return {
          label: 'Live',
          bgColor: 'bg-green-100 dark:bg-green-950',
          textColor: 'text-green-700 dark:text-green-400',
          dotColor: 'bg-green-500',
          icon: Wifi,
          pulseAnimation: true,
        };
      case 'reconnecting':
        return {
          label: 'Reconnecting',
          bgColor: 'bg-yellow-100 dark:bg-yellow-950',
          textColor: 'text-yellow-700 dark:text-yellow-400',
          dotColor: 'bg-yellow-500',
          icon: RefreshCw,
          pulseAnimation: false,
        };
      case 'offline':
        return {
          label: 'Offline',
          bgColor: 'bg-red-100 dark:bg-red-950',
          textColor: 'text-red-700 dark:text-red-400',
          dotColor: 'bg-red-500',
          icon: WifiOff,
          pulseAnimation: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-transparent"
        >
          <div className="relative">
            <div className={`h-2.5 w-2.5 rounded-full ${config.dotColor}`} />
            {config.pulseAnimation && (
              <div className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${config.dotColor} animate-ping opacity-75`} />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.textColor}`} />
            <span className="font-medium">Connection Status</span>
          </div>
          
          {lastSyncTime && (
            <div className="text-xs text-muted-foreground">
              Last synced: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
            </div>
          )}

          {connectionStatus !== 'live' && (
            <>
              <p className="text-sm text-muted-foreground">
                {connectionStatus === 'offline' 
                  ? "You're offline. Changes will sync when reconnected."
                  : "Attempting to reconnect..."}
              </p>
              <Button
                onClick={retryConnection}
                size="sm"
                className="w-full"
                disabled={connectionStatus === 'reconnecting'}
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry Connection
              </Button>
            </>
          )}

          {connectionStatus === 'live' && (
            <p className="text-sm text-muted-foreground">
              Real-time updates are active
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
