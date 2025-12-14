import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings2, RotateCcw, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BentoWidget } from './BentoWidget';
import { WidgetPicker } from './WidgetPicker';
import { useBentoLayout, type WidgetConfig } from './useBentoLayout';
import { AVAILABLE_WIDGETS } from './widgetRegistry';

interface BentoGridProps {
  dashboardId?: string;
}

export const BentoGrid = ({ dashboardId = 'admin-overview' }: BentoGridProps) => {
  const {
    widgets,
    addWidget,
    removeWidget,
    reorderWidgets,
    resetLayout,
    saveLayout,
    isSaving,
    hasUnsavedChanges,
  } = useBentoLayout(dashboardId);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      reorderWidgets(oldIndex, newIndex);
    }
    
    setActiveId(null);
  }, [widgets, reorderWidgets]);

  const handleAddWidget = useCallback((widgetType: string) => {
    addWidget(widgetType);
    setIsPickerOpen(false);
  }, [addWidget]);

  const handleSave = useCallback(async () => {
    await saveLayout();
    setIsEditMode(false);
  }, [saveLayout]);

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;

  // Get available widgets that aren't already added (for unique widgets)
  const availableWidgets = AVAILABLE_WIDGETS.filter(
    (w) => w.allowMultiple || !widgets.some((added) => added.type === w.type)
  );

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-muted/50 to-muted/20 border border-border/50 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs px-3 py-1">
            {widgets.length} widgets
          </Badge>
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Unsaved changes
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPickerOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Widget
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetLayout}
                className="gap-2 text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Save className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Layout
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              Customize
            </Button>
          )}
        </div>
      </motion.div>

      {/* Bento Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[minmax(120px,auto)]">
            <AnimatePresence mode="popLayout">
              {widgets.map((widget, index) => (
                <BentoWidget
                  key={widget.id}
                  widget={widget}
                  index={index}
                  isEditMode={isEditMode}
                  onRemove={() => removeWidget(widget.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>

        <DragOverlay adjustScale>
          {activeWidget && (
            <div className="opacity-80 scale-105">
              <BentoWidget
                widget={activeWidget}
                index={0}
                isEditMode={true}
                isDragging
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Widget Picker Modal */}
      <WidgetPicker
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        availableWidgets={availableWidgets}
        onSelect={handleAddWidget}
      />
    </div>
  );
};
