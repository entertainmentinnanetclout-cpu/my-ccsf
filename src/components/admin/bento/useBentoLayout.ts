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
  const [isSyncing, setIsSyncing] = useState(false);

  // Generate unique ID for widgets
  const generateId = useCallback(() => {
    return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Load layout from Supabase first, fallback to localStorage
  const loadLayout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Try Supabase first if user is authenticated
      if (user?.id) {
        const { data: supabaseLayout, error } = await supabase
          .from('bento_layouts')
          .select('layout')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && supabaseLayout?.layout) {
          const layoutData = supabaseLayout.layout as unknown as LayoutData;
          if (layoutData.version === LAYOUT_VERSION && layoutData.widgets?.length > 0) {
            setWidgets(layoutData.widgets);
            setOriginalWidgets(layoutData.widgets);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fallback to localStorage
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

      // If no data found, use default layout
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
  }, [dashboardId, generateId, user?.id]);

  // Save layout to both Supabase and localStorage
  const saveLayout = useCallback(async () => {
    setIsSaving(true);
    
    try {
      const layoutData: LayoutData = {
        widgets,
        version: LAYOUT_VERSION,
      };

      // Save to localStorage first (instant)
      const localKey = `${STORAGE_KEY_PREFIX}${dashboardId}`;
      localStorage.setItem(localKey, JSON.stringify(layoutData));

      // Save to Supabase if authenticated
      if (user?.id) {
        setIsSyncing(true);
        
        // Check if record exists first
        const { data: existing } = await supabase
          .from('bento_layouts')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        let error;
        if (existing) {
          // Update existing record
          const result = await supabase
            .from('bento_layouts')
            .update({ layout: JSON.parse(JSON.stringify(layoutData)) })
            .eq('user_id', user.id);
          error = result.error;
        } else {
          // Insert new record
          const result = await supabase
            .from('bento_layouts')
            .insert([{ 
              user_id: user.id, 
              layout: JSON.parse(JSON.stringify(layoutData))
            }]);
          error = result.error;
        }

        if (error) {
          console.error('Error saving to Supabase:', error);
          toast.warning('Layout saved locally. Cloud sync failed.');
        } else {
          toast.success('Layout saved and synced to cloud');
        }
        setIsSyncing(false);
      } else {
        toast.success('Layout saved locally');
      }

      setOriginalWidgets(widgets);
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Failed to save layout');
    } finally {
      setIsSaving(false);
      setIsSyncing(false);
    }
  }, [dashboardId, widgets, user?.id]);

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

  // Load on mount and when user changes
  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  return {
    widgets,
    isLoading,
    isSaving,
    isSyncing,
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
