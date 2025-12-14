import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type WidgetConfig } from './useBentoLayout';
import { WIDGET_COMPONENTS, AVAILABLE_WIDGETS } from './widgetRegistry';

interface BentoWidgetProps {
  widget: WidgetConfig;
  index: number;
  isEditMode: boolean;
  isDragging?: boolean;
  onRemove?: () => void;
}

export const BentoWidget = ({
  widget,
  index,
  isEditMode,
  isDragging = false,
  onRemove,
}: BentoWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const widgetMeta = useMemo(
    () => AVAILABLE_WIDGETS.find((w) => w.type === widget.type),
    [widget.type]
  );

  const WidgetComponent = WIDGET_COMPONENTS[widget.type];

  if (!WidgetComponent || !widgetMeta) {
    return null;
  }

  // Get grid span classes based on widget size
  const sizeClasses = {
    sm: 'col-span-1 row-span-1',
    md: 'col-span-2 row-span-1',
    lg: 'col-span-2 row-span-2',
    xl: 'col-span-3 row-span-2',
    full: 'col-span-full row-span-2',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: isSortableDragging ? 0.5 : 1, 
        scale: 1,
        zIndex: isSortableDragging ? 50 : 1,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ 
        duration: 0.2,
        delay: index * 0.02,
      }}
      className={cn(
        'relative group',
        sizeClasses[widget.size || widgetMeta.defaultSize || 'md'],
        isDragging && 'z-50'
      )}
    >
      <div
        className={cn(
          'h-full rounded-2xl overflow-hidden transition-all duration-300',
          'bg-gradient-to-br from-muted/40 via-muted/20 to-transparent',
          'border border-border/50 backdrop-blur-sm',
          'shadow-sm hover:shadow-lg',
          isEditMode && 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background',
          isDragging && 'shadow-2xl ring-2 ring-primary'
        )}
      >
        {/* Edit Mode Controls */}
        {isEditMode && !isDragging && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-background/80 backdrop-blur-sm"
              onClick={onRemove}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Drag Handle */}
        {isEditMode && (
          <div
            {...attributes}
            {...listeners}
            className={cn(
              'absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing',
              'p-1.5 rounded-lg bg-background/80 backdrop-blur-sm',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-primary/10'
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Widget Content */}
        <div className="h-full w-full p-4">
          <WidgetComponent widgetId={widget.id} />
        </div>

        {/* Widget Type Label (Edit Mode) */}
        {isEditMode && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs text-muted-foreground truncate">
              {widgetMeta.name}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
