import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { type WidgetMeta } from './widgetRegistry';

interface WidgetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableWidgets: WidgetMeta[];
  onSelect: (widgetType: string) => void;
}

export const WidgetPicker = ({
  open,
  onOpenChange,
  availableWidgets,
  onSelect,
}: WidgetPickerProps) => {
  // Group widgets by category
  const groupedWidgets = availableWidgets.reduce((acc, widget) => {
    const category = widget.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(widget);
    return acc;
  }, {} as Record<string, WidgetMeta[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add Widget
          </DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedWidgets).map(([category, widgets]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  {category}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <AnimatePresence>
                    {widgets.map((widget, index) => (
                      <motion.button
                        key={widget.type}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(widget.type)}
                        className={cn(
                          'relative p-4 rounded-xl text-left transition-all',
                          'bg-gradient-to-br from-muted/50 to-muted/20',
                          'border border-border/50 hover:border-primary/50',
                          'hover:shadow-lg hover:bg-muted/40',
                          'focus:outline-none focus:ring-2 focus:ring-primary/50'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'p-2 rounded-lg',
                              'bg-gradient-to-br from-primary/20 to-primary/5'
                            )}
                          >
                            <widget.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {widget.name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {widget.description}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {widget.defaultSize}
                          </Badge>
                          {widget.allowMultiple && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              Multiple
                            </Badge>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            {availableWidgets.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>All available widgets have been added</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
