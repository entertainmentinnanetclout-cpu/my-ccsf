import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PremiumTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    fill?: string;
  }>;
  label?: string;
  className?: string;
}

export const PremiumChartTooltip = ({
  active,
  payload,
  label,
  className,
}: PremiumTooltipProps) => {
  if (!active || !payload?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        'rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl p-3 shadow-elevated',
        className
      )}
    >
      {label && (
        <p className="text-xs font-semibold text-foreground mb-2 pb-2 border-b border-border/50">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-xs text-muted-foreground flex-1">{entry.name}</span>
            <span className="text-xs font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Status badge for charts
export const StatusBadge = ({
  status,
  count,
}: {
  status: 'pending' | 'assigned' | 'resolved' | 'rejected';
  count: number;
}) => {
  const colors = {
    pending: 'bg-warning/10 text-warning border-warning/30',
    assigned: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    resolved: 'bg-success/10 text-success border-success/30',
    rejected: 'bg-danger/10 text-danger border-danger/30',
  };

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border',
        colors[status]
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
      <span className="font-bold">{count}</span>
    </motion.span>
  );
};

// Mini stat for tooltips
export const MiniStat = ({
  label,
  value,
  trend,
}: {
  label: string;
  value: string | number;
  trend?: number;
}) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">{value}</span>
      {trend !== undefined && (
        <span
          className={cn(
            'text-[10px] font-medium',
            trend > 0 ? 'text-danger' : trend < 0 ? 'text-success' : 'text-muted-foreground'
          )}
        >
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);
