import { useState, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DEFAULT_LAYOUTS } from './widgetRegistry';

export interface WidgetConfig {
  id: string;
  type: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  settings?: Record<string, unknown>;
}

interface LayoutData {
  widgets: WidgetConfig[];
  version: number;
}

const STORAGE_KEY_PREFIX = 'bento-layout-';
const LAYOUT_VERSION = 1;

export const useBentoLayout = (dashboardId: string) => {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [originalWidgets, setOriginalWidgets] = useState<WidgetConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Generate unique ID for widgets
  const generateId = useCallback(() => {
    return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Load layout from localStorage (primary) and optionally sync with server
  const loadLayout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // First try localStorage
      const localKey = `${STORAGE_KEY_PREFIX}${dashboardId}`;
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        const parsed: LayoutData = JSON.parse(localData);
        if (parsed.version === LAYOUT_VERSION && parsed.widgets.length > 0) {
          setWidgets(parsed.widgets);
          setOriginalWidgets(parsed.widgets);
          setIsLoading(false);
          return;
        }
      }

      // If no local data or outdated, use default layout
      const defaultLayout = DEFAULT_LAYOUTS[dashboardId] || DEFAULT_LAYOUTS['admin-overview'];
      const widgetsWithIds = defaultLayout.map((type) => ({
        id: generateId(),
        type,
      }));
      
      setWidgets(widgetsWithIds);
      setOriginalWidgets(widgetsWithIds);
      
    } catch (error) {
      console.error('Error loading layout:', error);
      // Fallback to default
      const defaultLayout = DEFAULT_LAYOUTS[dashboardId] || DEFAULT_LAYOUTS['admin-overview'];
      const widgetsWithIds = defaultLayout.map((type) => ({
        id: generateId(),
        type,
      }));
      setWidgets(widgetsWithIds);
      setOriginalWidgets(widgetsWithIds);
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId, generateId]);

  // Save layout to localStorage
  const saveLayout = useCallback(async () => {
    setIsSaving(true);
    
    try {
      const localKey = `${STORAGE_KEY_PREFIX}${dashboardId}`;
      const layoutData: LayoutData = {
        widgets,
        version: LAYOUT_VERSION,
      };
      
      localStorage.setItem(localKey, JSON.stringify(layoutData));
      setOriginalWidgets(widgets);
      
      toast.success('Layout saved successfully');
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Failed to save layout');
    } finally {
      setIsSaving(false);
    }
  }, [dashboardId, widgets]);

  // Add a new widget
  const addWidget = useCallback((widgetType: string, size?: WidgetConfig['size']) => {
    const newWidget: WidgetConfig = {
      id: generateId(),
      type: widgetType,
      size,
    };
    setWidgets((prev) => [...prev, newWidget]);
  }, [generateId]);

  // Remove a widget
  const removeWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
  }, []);

  // Reorder widgets
  const reorderWidgets = useCallback((oldIndex: number, newIndex: number) => {
    setWidgets((prev) => arrayMove(prev, oldIndex, newIndex));
  }, []);

  // Update widget settings
  const updateWidget = useCallback((widgetId: string, updates: Partial<WidgetConfig>) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, ...updates } : w))
    );
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    const defaultLayout = DEFAULT_LAYOUTS[dashboardId] || DEFAULT_LAYOUTS['admin-overview'];
    const widgetsWithIds = defaultLayout.map((type) => ({
      id: generateId(),
      type,
    }));
    setWidgets(widgetsWithIds);
  }, [dashboardId, generateId]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(widgets) !== JSON.stringify(originalWidgets);

  // Load on mount
  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  return {
    widgets,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    addWidget,
    removeWidget,
    reorderWidgets,
    updateWidget,
    resetLayout,
    saveLayout,
    loadLayout,
  };
};
