import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LiveIndicatorProps {
  status?: 'online' | 'syncing' | 'offline' | 'warning';
  label?: string;
  lastSync?: Date;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  online: {
    color: 'bg-success',
    ringColor: 'ring-success/30',
    label: 'Live',
  },
  syncing: {
    color: 'bg-warning',
    ringColor: 'ring-warning/30',
    label: 'Syncing',
  },
  offline: {
    color: 'bg-muted-foreground',
    ringColor: 'ring-muted-foreground/30',
    label: 'Offline',
  },
  warning: {
    color: 'bg-warning',
    ringColor: 'ring-warning/30',
    label: 'Warning',
  },
};

const sizeConfig = {
  sm: { dot: 'h-1.5 w-1.5', ring: 'h-3 w-3', text: 'text-[10px]' },
  md: { dot: 'h-2 w-2', ring: 'h-4 w-4', text: 'text-xs' },
  lg: { dot: 'h-3 w-3', ring: 'h-5 w-5', text: 'text-sm' },
};

export const LiveIndicator = ({
  status = 'online',
  label,
  lastSync,
  className,
  size = 'md',
}: LiveIndicatorProps) => {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex items-center justify-center">
        {/* Pulsing ring */}
        {status === 'online' && (
          <motion.span
            className={cn(
              'absolute rounded-full opacity-75',
              config.color,
              sizes.ring
            )}
            animate={{ scale: [1, 1.8, 1.8], opacity: [0.7, 0, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        
        {/* Core dot */}
        <span
          className={cn(
            'relative rounded-full',
            config.color,
            sizes.dot,
            status === 'syncing' && 'animate-pulse'
          )}
        />
      </span>

      <div className="flex flex-col">
        <span className={cn('font-medium text-muted-foreground', sizes.text)}>
          {label || config.label}
        </span>
        {lastSync && (
          <span className="text-[10px] text-muted-foreground/70">
            {format(lastSync, 'HH:mm:ss')}
          </span>
        )}
      </div>
    </div>
  );
};

// Breathing animation for active elements
export const BreathingDot = ({ color = 'primary' }: { color?: string }) => (
  <motion.span
    className={cn('inline-block h-2 w-2 rounded-full', `bg-${color}`)}
    animate={{ 
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
    }}
    transition={{ 
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    style={{ backgroundColor: `hsl(var(--${color}))` }}
  />
);

// Ripple effect for notifications
export const RippleIndicator = ({ count, color = 'danger' }: { count: number; color?: string }) => {
  if (count === 0) return null;

  return (
    <span className="relative inline-flex">
      {/* Ripple animation */}
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: `hsl(var(--${color}))` }}
        animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      
      {/* Badge */}
      <span
        className={cn(
          'relative inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px] px-1',
          'text-white'
        )}
        style={{ backgroundColor: `hsl(var(--${color}))` }}
      >
        {count > 99 ? '99+' : count}
      </span>
    </span>
  );
};
