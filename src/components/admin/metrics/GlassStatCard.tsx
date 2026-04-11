import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlassStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  isActive?: boolean;
  delay?: number;
  sparklineData?: number[];
  showLiveIndicator?: boolean;
  className?: string;
}

const colorVariants = {
  primary: {
    bg: 'from-primary/20 via-primary/10 to-primary/5',
    border: 'border-primary/30',
    icon: 'bg-primary text-primary-foreground',
    glow: 'shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]',
    text: 'text-primary',
  },
  success: {
    bg: 'from-success/20 via-success/10 to-success/5',
    border: 'border-success/30',
    icon: 'bg-success text-success-foreground',
    glow: 'shadow-[0_0_30px_-5px_hsl(var(--success)/0.4)]',
    text: 'text-success',
  },
  warning: {
    bg: 'from-warning/20 via-warning/10 to-warning/5',
    border: 'border-warning/30',
    icon: 'bg-warning text-warning-foreground',
    glow: 'shadow-[0_0_30px_-5px_hsl(var(--warning)/0.4)]',
    text: 'text-warning',
  },
  danger: {
    bg: 'from-danger/20 via-danger/10 to-danger/5',
    border: 'border-danger/30',
    icon: 'bg-danger text-danger-foreground',
    glow: 'shadow-[0_0_30px_-5px_hsl(var(--danger)/0.4)]',
    text: 'text-danger',
  },
  info: {
    bg: 'from-primary/20 via-primary/10 to-primary/5',
    border: 'border-primary/30',
    icon: 'bg-primary text-primary-foreground',
    glow: 'shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]',
    text: 'text-primary',
  },
};

const MiniSparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-8 mt-2" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="drop-shadow-sm"
      />
      <polygon
        fill="url(#sparklineGradient)"
        points={`0,100 ${points} 100,100`}
      />
    </svg>
  );
};

const LiveIndicator = () => (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
  </span>
);

export const GlassStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'primary',
  size = 'md',
  onClick,
  isActive,
  delay = 0,
  sparklineData,
  showLiveIndicator,
}: GlassStatCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const variants = colorVariants[color];
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ rotateX, rotateY, perspective: 1000 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border backdrop-blur-xl cursor-pointer transition-all duration-300',
        'bg-gradient-to-br',
        variants.bg,
        variants.border,
        sizeClasses[size],
        isActive && [variants.glow, 'ring-2 ring-offset-2 ring-offset-background', `ring-${color === 'primary' ? 'primary' : color}`],
        'hover:shadow-elevated group'
      )}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            {showLiveIndicator && <LiveIndicator />}
          </div>
          
          <motion.p
            className={cn('text-2xl font-bold', size === 'lg' && 'text-3xl')}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200 }}
          >
            {value}
          </motion.p>
          
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}

          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                'text-xs font-semibold',
                trend > 0 ? 'text-danger' : trend < 0 ? 'text-success' : 'text-muted-foreground'
              )}>
                {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
                {Math.abs(trend)}%
              </span>
              {trendLabel && (
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}

          {sparklineData && sparklineData.length > 1 && (
            <MiniSparkline data={sparklineData} />
          )}
        </div>

        <motion.div
          className={cn(
            'p-2.5 rounded-xl transition-all duration-300',
            variants.icon,
            'shadow-lg group-hover:scale-110 group-hover:rotate-3'
          )}
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: delay + 0.1, type: 'spring', stiffness: 200 }}
        >
          <Icon className={cn('h-5 w-5', size === 'lg' && 'h-6 w-6')} />
        </motion.div>
      </div>

      {/* Bottom accent line */}
      <div className={cn(
        'absolute bottom-0 left-0 h-1 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left',
        `bg-${color === 'primary' ? 'primary' : color}`
      )} style={{ background: `hsl(var(--${color}))` }} />
    </motion.div>
  );
};
