import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapCalendarProps {
  data: { date: string; count: number }[];
  weeks?: number;
  colorScheme?: 'default' | 'danger' | 'success';
  onCellClick?: (date: string, count: number) => void;
  className?: string;
}

const colorSchemes = {
  default: [
    'bg-muted/30',
    'bg-primary/20',
    'bg-primary/40',
    'bg-primary/60',
    'bg-primary/80',
    'bg-primary',
  ],
  danger: [
    'bg-muted/30',
    'bg-danger/20',
    'bg-danger/40',
    'bg-danger/60',
    'bg-danger/80',
    'bg-danger',
  ],
  success: [
    'bg-muted/30',
    'bg-success/20',
    'bg-success/40',
    'bg-success/60',
    'bg-success/80',
    'bg-success',
  ],
};

export const HeatmapCalendar = ({
  data,
  weeks = 12,
  colorScheme = 'default',
  onCellClick,
  className,
}: HeatmapCalendarProps) => {
  const colors = colorSchemes[colorScheme];

  const calendarData = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(subDays(today, weeks * 7 - 1));
    const dataMap = new Map(data.map(d => [d.date, d.count]));
    const maxCount = Math.max(...data.map(d => d.count), 1);

    const calendar: { date: Date; count: number; colorIndex: number }[][] = [];
    let currentWeek: { date: Date; count: number; colorIndex: number }[] = [];

    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(startDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = dataMap.get(dateStr) || 0;
      const colorIndex = count === 0 ? 0 : Math.min(Math.ceil((count / maxCount) * 5), 5);

      currentWeek.push({ date, count, colorIndex });

      if (currentWeek.length === 7) {
        calendar.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      calendar.push(currentWeek);
    }

    return calendar;
  }, [data, weeks]);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <TooltipProvider>
      <div className={cn('space-y-2', className)}>
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 text-[10px] text-muted-foreground pr-1">
            {dayLabels.map((day, i) => (
              <div key={i} className="h-3 flex items-center justify-end w-3">
                {i % 2 === 1 && day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {calendarData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <Tooltip key={dayIndex}>
                    <TooltipTrigger asChild>
                      <motion.button
                        className={cn(
                          'w-3 h-3 rounded-sm transition-all hover:ring-1 hover:ring-primary/50',
                          colors[day.colorIndex],
                          onCellClick && 'cursor-pointer hover:scale-125'
                        )}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: weekIndex * 0.02 + dayIndex * 0.01,
                          type: 'spring',
                          stiffness: 200,
                        }}
                        onClick={() => onCellClick?.(format(day.date, 'yyyy-MM-dd'), day.count)}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{format(day.date, 'MMM d, yyyy')}</p>
                      <p className="text-muted-foreground">
                        {day.count} incident{day.count !== 1 ? 's' : ''}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {colors.map((color, i) => (
            <div
              key={i}
              className={cn('w-3 h-3 rounded-sm', color)}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </TooltipProvider>
  );
};

// Hourly heatmap for 24-hour pattern
export const HourlyHeatmap = ({
  data,
  colorScheme = 'default',
}: {
  data: { hour: number; count: number }[];
  colorScheme?: 'default' | 'danger' | 'success';
}) => {
  const colors = colorSchemes[colorScheme];
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex gap-0.5">
          {data.map((item, i) => {
            const colorIndex = item.count === 0 ? 0 : Math.min(Math.ceil((item.count / maxCount) * 5), 5);
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <motion.div
                    className={cn(
                      'flex-1 h-8 rounded-sm',
                      colors[colorIndex]
                    )}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: i * 0.02 }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{item.hour}:00 - {item.hour + 1}:00</p>
                  <p className="text-muted-foreground">{item.count} incidents</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>
    </TooltipProvider>
  );
};
