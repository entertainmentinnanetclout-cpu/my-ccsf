import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md bg-muted/60",
      "before:absolute before:inset-0 before:-translate-x-full",
      "before:animate-[shimmer_2s_infinite]",
      "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
      className
    )}
  />
);

export const CardSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 space-y-4"
  >
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-4/6" />
    </div>
  </motion.div>
);

export const CarouselSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-xl overflow-hidden border border-border/50 bg-card/80 backdrop-blur-sm"
  >
    <Skeleton className="h-48 sm:h-64 md:h-80 w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </motion.div>
);

export const NewsFeedSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-4"
  >
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
    {[1, 2, 3].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
      >
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </motion.div>
    ))}
  </motion.div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"
  >
    {/* Header */}
    <div className="p-4 border-b border-border/50 bg-muted/30">
      <div className="flex gap-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
        className="p-4 border-b border-border/30 last:border-0"
      >
        <div className="flex gap-4 items-center">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </motion.div>
    ))}
  </motion.div>
);

export const StatCardSkeleton = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
  >
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <Skeleton className="h-8 w-20 mb-2" />
    <Skeleton className="h-3 w-24" />
  </motion.div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Stats Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <StatCardSkeleton />
        </motion.div>
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <TableSkeleton rows={5} />
      </div>
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  </div>
);

export const ChatSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"
  >
    {/* Header */}
    <div className="p-4 border-b border-border/50 bg-muted/30">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
    
    {/* Messages */}
    <div className="p-4 space-y-4 min-h-[300px]">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: i % 2 === 0 ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[70%] ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
            <Skeleton 
              className={`h-12 ${i % 2 === 0 ? 'w-48' : 'w-40'} rounded-2xl`} 
            />
            <Skeleton className="h-2 w-16 mt-1 mx-2" />
          </div>
        </motion.div>
      ))}
    </div>
    
    {/* Input */}
    <div className="p-4 border-t border-border/50 bg-muted/20">
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  </motion.div>
);

export const MapSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"
  >
    <Skeleton className="h-[400px] w-full" />
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  </motion.div>
);
