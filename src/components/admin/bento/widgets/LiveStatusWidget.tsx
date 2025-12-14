import { useMasterSync } from '@/contexts/MasterSyncContext';
import { LiveIndicator } from '../../metrics';
import { Badge } from '@/components/ui/badge';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface LiveStatusWidgetProps {
  widgetId: string;
}

export const LiveStatusWidget = ({ widgetId }: LiveStatusWidgetProps) => {
  const { lastSyncTime, incidents } = useMasterSync();

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <LiveIndicator status="online" lastSync={lastSyncTime || undefined} />
      </motion.div>
      
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Real-time monitoring</p>
        <Badge variant="outline" className="text-xs">
          {incidents.length} total cases
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wifi className="h-3 w-3 text-success" />
        <span>Connected</span>
      </div>
    </div>
  );
};
