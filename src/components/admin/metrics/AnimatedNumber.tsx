import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
  flip?: boolean;
}

// Standard animated counter with spring physics
export const AnimatedNumber = ({
  value,
  duration = 1.5,
  format = (v) => Math.round(v).toString(),
  className,
  prefix = '',
  suffix = '',
  flip = false,
}: AnimatedNumberProps) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(displayValue, value, {
      duration,
      onUpdate(v) {
        setDisplayValue(v);
        if (!flip) {
          node.textContent = prefix + format(v) + suffix;
        }
      },
    });

    return () => controls.stop();
  }, [value, duration, format, prefix, suffix, flip, displayValue]);

  if (flip) {
    return (
      <span className={cn('inline-flex items-center', className)}>
        {prefix && <span>{prefix}</span>}
        <FlipNumber value={Math.round(displayValue)} />
        {suffix && <span>{suffix}</span>}
      </span>
    );
  }

  return <span ref={nodeRef} className={className}>{prefix}{format(0)}{suffix}</span>;
};

// Flip-style number animation (like airport departure boards)
const FlipNumber = ({ value }: { value: number }) => {
  const digits = value.toString().padStart(2, '0').split('');
  
  return (
    <span className="inline-flex">
      {digits.map((digit, i) => (
        <FlipDigit key={i} digit={digit} />
      ))}
    </span>
  );
};

const FlipDigit = ({ digit }: { digit: string }) => {
  const [currentDigit, setCurrentDigit] = useState(digit);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (digit !== currentDigit) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setCurrentDigit(digit);
        setIsFlipping(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [digit, currentDigit]);

  return (
    <span className="relative inline-block w-[0.65em] h-[1.2em] overflow-hidden">
      <motion.span
        className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-sm"
        animate={{ 
          rotateX: isFlipping ? [0, -90, 0] : 0,
          opacity: isFlipping ? [1, 0.5, 1] : 1
        }}
        transition={{ duration: 0.3 }}
      >
        {currentDigit}
      </motion.span>
    </span>
  );
};

// Large display counter for hero stats
export const HeroCounter = ({
  value,
  label,
  color = 'primary',
}: {
  value: number;
  label: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}) => {
  const springValue = useSpring(0, { stiffness: 50, damping: 20 });
  const display = useTransform(springValue, (v) => Math.round(v));
  const [displayNum, setDisplayNum] = useState(0);

  useEffect(() => {
    springValue.set(value);
    return springValue.on('change', (v) => setDisplayNum(Math.round(v)));
  }, [value, springValue]);

  const colorClass = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        className={cn('text-5xl font-black tracking-tight', colorClass[color])}
        style={{ 
          textShadow: `0 0 40px hsl(var(--${color}) / 0.3)` 
        }}
      >
        {displayNum}
      </motion.span>
      <p className="text-sm text-muted-foreground mt-1 uppercase tracking-widest font-medium">
        {label}
      </p>
    </motion.div>
  );
};
