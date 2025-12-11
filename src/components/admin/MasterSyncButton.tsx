import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export const MasterSyncButton = () => {
  const { 
    refreshAll, 
    isSyncing, 
    lastSyncTime, 
    connectionStatus 
  } = useMasterSync();

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3 text-green-400" />;
      case 'connecting':
        return <Wifi className="h-3 w-3 text-yellow-400 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3 text-red-400" />;
    }
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'connecting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'disconnected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`${getConnectionColor()} gap-1 cursor-default`}>
              {getConnectionIcon()}
              <span className="text-xs capitalize hidden sm:inline">{connectionStatus}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Real-time connection: {connectionStatus}</p>
          </TooltipContent>
        </Tooltip>

        {/* Last Sync Time */}
        {lastSyncTime && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 cursor-default text-white/70 border-white/20 hidden md:flex">
                <Clock className="h-3 w-3" />
                <span className="text-xs">
                  {format(lastSyncTime, 'HH:mm:ss')}
                </span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Last synced: {format(lastSyncTime, 'PPpp')}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Sync Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAll}
                disabled={isSyncing}
                className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {isSyncing ? 'Syncing...' : 'Sync All'}
                </span>
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh all data from database</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
