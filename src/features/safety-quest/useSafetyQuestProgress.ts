import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { SAFETY_QUEST_VERSION } from './questData';
import { QUEST_TOTAL } from './questCatalog';

export type QuestSyncState = 'loading' | 'saved' | 'saving' | 'device';

export interface QuestAnswerRecord {
  attempts: number;
  correct: boolean;
  selectedOption: string;
  answeredAt: string | null;
}

export interface SafetyQuestProgress {
  questVersion: string;
  currentCheckpoint: number;
  score: number;
  attempts: number;
  answers: Record<string, QuestAnswerRecord>;
  completedAt: string | null;
}

const emptyProgress = (): SafetyQuestProgress => ({
  questVersion: SAFETY_QUEST_VERSION,
  currentCheckpoint: 0,
  score: 0,
  attempts: 0,
  answers: {},
  completedAt: null,
});

const storageKey = (userId: string) => `ccsf-safety-quest:${SAFETY_QUEST_VERSION}:${userId}`;

function readDeviceProgress(userId: string): SafetyQuestProgress {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<SafetyQuestProgress>;
    if (parsed.questVersion !== SAFETY_QUEST_VERSION) return emptyProgress();
    return {
      ...emptyProgress(),
      ...parsed,
      answers: parsed.answers ?? {},
      currentCheckpoint: Math.min(Math.max(parsed.currentCheckpoint ?? 0, 0), QUEST_TOTAL),
      score: Math.min(Math.max(parsed.score ?? 0, 0), QUEST_TOTAL),
    };
  } catch {
    return emptyProgress();
  }
}

function writeDeviceProgress(userId: string, progress: SafetyQuestProgress) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(progress));
  } catch {
    // The in-memory game still works if browser storage is unavailable.
  }
}

function answersFromJson(value: Json): Record<string, QuestAnswerRecord> {
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};
  return value as unknown as Record<string, QuestAnswerRecord>;
}

export function useSafetyQuestProgress(userId: string | null | undefined) {
  const [progress, setProgress] = useState<SafetyQuestProgress>(emptyProgress);
  const [syncState, setSyncState] = useState<QuestSyncState>('loading');
  const progressRef = useRef(progress);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  const applyProgress = useCallback((next: SafetyQuestProgress) => {
    progressRef.current = next;
    setProgress(next);
  }, []);

  const persist = useCallback(
    async (next: SafetyQuestProgress) => {
      if (!userId) return;
      writeDeviceProgress(userId, next);
      if (!navigator.onLine) {
        setSyncState('device');
        return;
      }

      setSyncState('saving');
      const save = async () => {
        const { error } = await supabase.from('safety_quest_progress').upsert(
          {
            user_id: userId,
            quest_version: next.questVersion,
            current_checkpoint: next.currentCheckpoint,
            score: next.score,
            attempts: next.attempts,
            answers: next.answers as unknown as Json,
            completed_at: next.completedAt,
          },
          { onConflict: 'user_id' },
        );
        setSyncState(error ? 'device' : 'saved');
      };

      persistQueueRef.current = persistQueueRef.current.then(save, save);
      await persistQueueRef.current;
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      applyProgress(emptyProgress());
      setSyncState('loading');
      return;
    }

    let active = true;
    const deviceProgress = readDeviceProgress(userId);
    applyProgress(deviceProgress);

    void (async () => {
      const { data, error } = await supabase
        .from('safety_quest_progress')
        .select('quest_version,current_checkpoint,score,attempts,answers,completed_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setSyncState('device');
        return;
      }

      if (data && data.quest_version !== SAFETY_QUEST_VERSION) {
        const freshProgress = emptyProgress();
        applyProgress(freshProgress);
        writeDeviceProgress(userId, freshProgress);
        await persist(freshProgress);
        return;
      }

      if (data) {
        const remoteProgress: SafetyQuestProgress = {
          questVersion: data.quest_version,
          currentCheckpoint: Math.min(Math.max(data.current_checkpoint, 0), QUEST_TOTAL),
          score: Math.min(Math.max(data.score, 0), QUEST_TOTAL),
          attempts: data.attempts,
          answers: answersFromJson(data.answers),
          completedAt: data.completed_at,
        };
        applyProgress(remoteProgress);
        writeDeviceProgress(userId, remoteProgress);
        setSyncState('saved');
        return;
      }

      if (deviceProgress.currentCheckpoint > 0 || deviceProgress.attempts > 0) {
        await persist(deviceProgress);
      } else {
        setSyncState('saved');
      }
    })();

    return () => {
      active = false;
    };
  }, [applyProgress, persist, userId]);

  useEffect(() => {
    if (!userId) return;
    const syncWhenOnline = () => void persist(progressRef.current);
    window.addEventListener('online', syncWhenOnline);
    return () => window.removeEventListener('online', syncWhenOnline);
  }, [persist, userId]);

  const recordAnswer = useCallback(
    async (checkpointIndex: number, checkpointId: string, selectedOption: string, correct: boolean) => {
      const current = progressRef.current;
      if (checkpointIndex !== current.currentCheckpoint || current.completedAt) return false;

      const previous = current.answers[checkpointId];
      const answeredAt = correct ? new Date().toISOString() : null;
      const nextCheckpoint = correct
        ? Math.min(current.currentCheckpoint + 1, QUEST_TOTAL)
        : current.currentCheckpoint;
      const next: SafetyQuestProgress = {
        ...current,
        currentCheckpoint: nextCheckpoint,
        score: correct ? Math.min(current.score + 1, QUEST_TOTAL) : current.score,
        attempts: current.attempts + 1,
        completedAt: nextCheckpoint === QUEST_TOTAL ? answeredAt : null,
        answers: {
          ...current.answers,
          [checkpointId]: {
            attempts: (previous?.attempts ?? 0) + 1,
            correct,
            selectedOption,
            answeredAt,
          },
        },
      };

      applyProgress(next);
      await persist(next);
      return true;
    },
    [applyProgress, persist],
  );

  const resetQuest = useCallback(async () => {
    const next = emptyProgress();
    applyProgress(next);
    await persist(next);
  }, [applyProgress, persist]);

  return { progress, syncState, recordAnswer, resetQuest };
}
