import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CircularGaugeProps {
  value: number;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'gradient';
  label?: string;
  subtitle?: string;
  showPercentage?: boolean;
  thickness?: number;
  className?: string;
  animated?: boolean;
}

const colorMap = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--danger))',
  gradient: 'url(#gaugeGradient)',
};

const sizeMap = {
  sm: { width: 80, strokeWidth: 6, fontSize: 'text-lg', subtitleSize: 'text-[10px]' },
  md: { width: 120, strokeWidth: 8, fontSize: 'text-2xl', subtitleSize: 'text-xs' },
  lg: { width: 160, strokeWidth: 10, fontSize: 'text-3xl', subtitleSize: 'text-sm' },
};

export const CircularGauge = ({
  value,
  maxValue = 100,
  size = 'md',
  color = 'primary',
  label,
  subtitle,
  showPercentage = true,
  thickness,
  className,
  animated = true,
}: CircularGaugeProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const sizeConfig = sizeMap[size];
  const strokeWidth = thickness || sizeConfig.strokeWidth;
  const radius = (sizeConfig.width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  
  const springValue = useSpring(0, { stiffness: 60, damping: 20 });
  const strokeDashoffset = useTransform(springValue, (v) => circumference - (v / 100) * circumference);

  useEffect(() => {
    setIsVisible(true);
    if (animated) {
      springValue.set(percentage);
    }
  }, [percentage, animated, springValue]);

  const displayValue = showPercentage ? `${Math.round(percentage)}%` : value.toString();

  const getGradientColor = () => {
    if (percentage >= 75) return 'hsl(var(--success))';
    if (percentage >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--danger))';
  };

  return (
    <motion.div
      className={cn('relative inline-flex flex-col items-center justify-center', className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <svg
        width={sizeConfig.width}
        height={sizeConfig.width}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--danger))" />
            <stop offset="50%" stopColor="hsl(var(--warning))" />
            <stop offset="100%" stopColor="hsl(var(--success))" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={sizeConfig.width / 2}
          cy={sizeConfig.width / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        
        {/* Animated progress circle */}
        <motion.circle
          cx={sizeConfig.width / 2}
          cy={sizeConfig.width / 2}
          r={radius}
          fill="none"
          stroke={color === 'gradient' ? getGradientColor() : colorMap[color]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: animated ? strokeDashoffset : circumference - (percentage / 100) * circumference }}
          filter="url(#glow)"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={cn('font-bold', sizeConfig.fontSize)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {displayValue}
        </motion.span>
        {label && (
          <motion.span
            className={cn('text-muted-foreground font-medium', sizeConfig.subtitleSize)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {label}
          </motion.span>
        )}
      </div>
      
      {subtitle && (
        <motion.p
          className="text-muted-foreground text-xs mt-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
};
