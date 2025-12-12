import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { triggerHaptic } from '@/hooks/useHapticFeedback';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  disabled?: boolean;
}

const PullToRefresh = ({ 
  onRefresh, 
  children, 
  threshold = 80,
  disabled = false 
}: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const pullDistance = useMotionValue(0);
  const pullProgress = useTransform(pullDistance, [0, threshold], [0, 1]);
  const indicatorOpacity = useTransform(pullDistance, [0, threshold / 2], [0, 1]);
  const indicatorScale = useTransform(pullDistance, [0, threshold], [0.5, 1]);
  const rotation = useTransform(pullDistance, [0, threshold], [0, 180]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      pullDistance.set(0);
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const diff = Math.max(0, currentY.current - startY.current);
    
    // Apply resistance to the pull
    const resistance = 0.5;
    const resistedDiff = diff * resistance;
    
    pullDistance.set(Math.min(resistedDiff, threshold * 1.5));
    
    // Haptic feedback at threshold
    if (resistedDiff >= threshold && resistedDiff < threshold + 5) {
      triggerHaptic('medium');
    }
  }, [isPulling, disabled, isRefreshing, pullDistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    setIsPulling(false);
    
    const currentPull = pullDistance.get();
    
    if (currentPull >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('heavy');
      
      // Keep indicator visible during refresh
      animate(pullDistance, threshold, { duration: 0.2 });
      
      try {
        await onRefresh();
      } finally {
        // Animate out
        await animate(pullDistance, 0, { duration: 0.3 });
        setIsRefreshing(false);
      }
    } else {
      // Spring back
      animate(pullDistance, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  return (
    <div className="relative overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex justify-center items-center z-10 pointer-events-none"
        style={{
          top: -60,
          y: pullDistance,
          opacity: indicatorOpacity,
        }}
      >
        <motion.div
          className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20"
          style={{ scale: indicatorScale }}
        >
          <motion.div style={{ rotate: isRefreshing ? undefined : rotation }}>
            <RefreshCw 
              className={`h-5 w-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} 
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Pull text */}
      <motion.div
        className="absolute left-0 right-0 flex justify-center items-center z-10 pointer-events-none"
        style={{
          top: 0,
          y: pullDistance,
          opacity: indicatorOpacity,
        }}
      >
        <span className="text-xs text-primary font-medium mt-2">
          {isRefreshing 
            ? 'Refreshing...' 
            : pullDistance.get() >= threshold 
              ? 'Release to refresh' 
              : 'Pull to refresh'
          }
        </span>
      </motion.div>

      {/* Main content */}
      <motion.div
        ref={containerRef}
        className="overflow-y-auto"
        style={{ y: pullDistance }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
