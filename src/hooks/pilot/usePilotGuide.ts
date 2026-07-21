import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_PILOT_GUIDE_STEPS,
  loadPilotGuidePreferences,
  loadPilotGuideSteps,
  subscribeToPilotExperienceConfiguration,
  updatePilotGuidePreferences,
} from '@/services/pilot/pilotExperienceService';
import type { PilotGuidePreferences, PilotGuideStep } from '@/types/pilotExperience';

export function usePilotGuide({ autoOpen }: { autoOpen: boolean }) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<PilotGuidePreferences | null>(null);
  const [steps, setSteps] = useState<PilotGuideStep[]>(DEFAULT_PILOT_GUIDE_STEPS);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [next, nextSteps] = await Promise.all([
        loadPilotGuidePreferences(),
        loadPilotGuideSteps(),
      ]);
      setPreferences(next);
      setSteps(nextSteps);
      const finalIndex = Math.max(nextSteps.length - 1, 0);
      setStep(Math.min(Math.max(next.guide_last_step, 0), finalIndex));
      if (autoOpen && next.guide_auto_show && !next.guide_completed_at && !next.guide_dismissed_at) setOpen(true);
    } catch (error) {
      toast({
        title: 'Pilot guide unavailable',
        description: error instanceof Error ? error.message : 'The guide can still be opened from Safety Guide later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [autoOpen, toast]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => subscribeToPilotExperienceConfiguration(() => void refresh()), [refresh]);

  const save = useCallback(async (input: Parameters<typeof updatePilotGuidePreferences>[0]) => {
    setSaving(true);
    try {
      const next = await updatePilotGuidePreferences(input);
      setPreferences(next);
      setStep(Math.min(next.guide_last_step, Math.max(steps.length - 1, 0)));
      return next;
    } finally {
      setSaving(false);
    }
  }, [steps.length]);

  const openGuide = useCallback(() => {
    setStep(Math.min(preferences?.guide_last_step ?? 0, Math.max(steps.length - 1, 0)));
    setOpen(true);
  }, [preferences?.guide_last_step, steps.length]);

  const closeGuide = useCallback(async (doNotShowAgain: boolean) => {
    try {
      await save({ lastStep: step, autoShow: doNotShowAgain ? false : null, dismissed: doNotShowAgain });
      setOpen(false);
    } catch (error) {
      toast({ title: 'Guide preference not saved', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  }, [save, step, toast]);

  const skipGuide = useCallback(async () => {
    try {
      await save({ lastStep: step, autoShow: false, dismissed: true });
      setOpen(false);
      toast({ title: 'Guide dismissed', description: 'You can reopen it from Safety Guide at any time.' });
    } catch (error) {
      toast({ title: 'Guide preference not saved', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  }, [save, step, toast]);

  const completeGuide = useCallback(async () => {
    try {
      await save({ lastStep: Math.max(steps.length - 1, 0), autoShow: false, completed: true });
      setOpen(false);
      toast({ title: 'Pilot guide completed' });
    } catch (error) {
      toast({ title: 'Guide completion not saved', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  }, [save, steps.length, toast]);

  const resetGuide = useCallback(async () => {
    try {
      const next = await save({ reset: true });
      setStep(0);
      setOpen(true);
      toast({ title: 'Pilot guide reset', description: 'Automatic first-login guidance is enabled again across your devices.' });
      return next;
    } catch (error) {
      toast({ title: 'Guide reset failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
      return null;
    }
  }, [save, toast]);

  const nextStep = () => setStep((current) => Math.min(current + 1, Math.max(steps.length - 1, 0)));
  const previousStep = () => setStep((current) => Math.max(current - 1, 0));

  return {
    preferences,
    steps,
    open,
    setOpen,
    step,
    setStep,
    loading,
    saving,
    refresh,
    openGuide,
    closeGuide,
    skipGuide,
    completeGuide,
    resetGuide,
    nextStep,
    previousStep,
  };
}
