import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Incident = Tables<'incidents'>;

interface VirtualIncidentListProps {
  incidents: Incident[];
  onIncidentClick?: (incident: Incident) => void;
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning',
  assigned: 'bg-primary',
  resolved: 'bg-success',
  rejected: 'bg-destructive'
};

export const VirtualIncidentList = ({ 
  incidents, 
  onIncidentClick, 
  height = 500 
}: VirtualIncidentListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: incidents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  if (incidents.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No incidents found
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const incident = incidents[virtualItem.index];
          return (
            <div
              key={incident.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="p-2"
              >
                <Card
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => onIncidentClick?.(incident)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{incident.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{incident.category}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {incident.campus ? incident.campus.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={`${STATUS_COLORS[incident.status]} text-white text-xs`}>
                          {incident.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(incident.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
