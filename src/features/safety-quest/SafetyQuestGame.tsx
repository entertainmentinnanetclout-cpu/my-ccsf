import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  Cloud,
  CloudOff,
  Cpu,
  Flag,
  Footprints,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  type LucideProps,
} from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { Button } from '@/components/ui/button';
import cpsLogo from '@/assets/CPS Campus Protection Services logo(1).png';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  QUEST_TOPIC_LABELS,
  QUEST_TOPICS,
  QUEST_TOTAL,
  createQuestPlan,
  type QuestIconName,
} from './questCatalog';
import { SAFETY_QUEST_VERSION } from './questData';
import { useSafetyQuestProgress, type QuestSyncState } from './useSafetyQuestProgress';
import './safety-quest.css';

const ICONS: Record<QuestIconName, ComponentType<LucideProps>> = {
  student: GraduationCap,
  fraud: ShieldAlert,
  verify: KeyRound,
  prevention: ShieldCheck,
  investigation: Search,
  office: Building2,
  services: Cpu,
  control: Flag,
};

const SYNC_COPY: Record<QuestSyncState, string> = {
  loading: 'Loading progress',
  saving: 'Saving progress',
  saved: 'Saved to your account',
  device: 'Saved on this device',
};

type AnswerOutcome = 'correct' | 'wrong' | null;

export function SafetyQuestGame({ userId }: { userId: string | null | undefined }) {
  const location = useLocation();
  const returnPath = location.pathname.startsWith('/pilot') ? '/pilot?tab=safety' : '/dashboard?tab=safety';
  const { progress, syncState, recordAnswer, resetQuest } = useSafetyQuestProgress(userId);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [outcome, setOutcome] = useState<AnswerOutcome>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const quest = useMemo(
    () => createQuestPlan(`${SAFETY_QUEST_VERSION}:${userId ?? 'guest'}`),
    [userId],
  );
  const routePoints = useMemo(
    () => quest.map(({ runnerPosition: point }) => `${point.x},${point.y}`).join(' '),
    [quest],
  );

  const currentIndex = Math.min(progress.currentCheckpoint, QUEST_TOTAL - 1);
  const currentCheckpoint = quest[currentIndex];
  const runnerPosition = progress.currentCheckpoint >= QUEST_TOTAL
    ? quest[QUEST_TOTAL - 1].runnerPosition
    : currentCheckpoint.runnerPosition;
  const completionPercent = Math.round((progress.currentCheckpoint / QUEST_TOTAL) * 100);
  const isComplete = progress.currentCheckpoint >= QUEST_TOTAL;
  const accuracy = progress.attempts > 0 ? Math.round((progress.score / progress.attempts) * 100) : null;

  useEffect(() => {
    const scroller = stageRef.current;
    if (!scroller || isComplete) return;
    const node = scroller.querySelector<HTMLElement>(`[data-checkpoint-index="${currentIndex}"]`);
    if (!node) return;
    const targetLeft = Math.max(0, node.offsetLeft + node.offsetWidth / 2 - scroller.clientWidth / 2);
    scroller.scrollTo({ left: targetLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [currentIndex, isComplete, prefersReducedMotion]);

  const openCheckpoint = (index: number) => {
    if (index > progress.currentCheckpoint) return;
    setSelectedOption('');
    setOutcome(null);
    setSelectedCheckpoint(index);
  };

  const closeCheckpoint = () => {
    setSelectedCheckpoint(null);
    setSelectedOption('');
    setOutcome(null);
  };

  const submitAnswer = () => {
    if (selectedCheckpoint === null || !selectedOption) return;
    const checkpoint = quest[selectedCheckpoint];
    const optionExists = checkpoint.options.some((item) => item.id === selectedOption);
    if (!optionExists) return;

    const answerIsCorrect = selectedOption === checkpoint.correctOptionId;
    setOutcome(answerIsCorrect ? 'correct' : 'wrong');
    void recordAnswer(selectedCheckpoint, checkpoint.id, selectedOption, answerIsCorrect);
  };

  const selected = selectedCheckpoint === null ? null : quest[selectedCheckpoint];
  const selectedWasCompleted = selectedCheckpoint !== null && selectedCheckpoint < progress.currentCheckpoint;
  const showLesson = outcome === 'correct' || (selectedWasCompleted && outcome !== 'wrong');
  const SyncIcon = syncState === 'device' ? CloudOff : Cloud;

  return (
    <div className="safety-quest-shell" data-testid="safety-quest-page">
      <header className="safety-quest-topbar">
        <Button asChild variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
          <Link to={returnPath}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
        <div className="hidden items-center gap-2 sm:flex">
          <ShieldCheck className="h-5 w-5 text-[#F2A900]" aria-hidden="true" />
          <span className="font-extrabold tracking-tight text-white">CCSF Safety Quest</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-white/70" role="status" aria-live="polite">
          <SyncIcon className={cn('h-4 w-4', syncState === 'saving' && 'animate-pulse')} aria-hidden="true" />
          <span className="hidden sm:inline">{SYNC_COPY[syncState]}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] px-3 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="safety-quest-hero" aria-labelledby="quest-title">
          <div className="max-w-3xl">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#F2A900]/35 bg-[#F2A900]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#FFD36A]"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Randomized TUT safety challenge
            </motion.div>
            <h1 id="quest-title" className="text-balance text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Know the campus. <span className="text-[#F2A900]">Choose under pressure.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              Complete eight missions drawn from a larger TUT Pretoria West safety bank. Questions and answer positions vary by student, and some choices are intentionally close—read the scenario carefully before you commit.
            </p>
          </div>

          <div className="safety-quest-progress-card">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/60">Mission progress</p>
                <p className="mt-1 text-3xl font-black text-white">{progress.currentCheckpoint}<span className="text-base text-white/50"> / {QUEST_TOTAL}</span></p>
              </div>
              <motion.div
                animate={isComplete && !prefersReducedMotion ? { rotate: [0, -8, 8, 0], scale: [1, 1.14, 1] } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                <Trophy className={cn('h-8 w-8', isComplete ? 'text-[#F2A900]' : 'text-white/25')} aria-hidden="true" />
              </motion.div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#F2A900] to-[#FFE7A6]"
                initial={{ width: '0%' }}
                animate={{ width: `${completionPercent}%` }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2">
                <p className="font-bold text-white/45">Attempts</p>
                <p className="mt-0.5 text-base font-black text-white">{progress.attempts}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2">
                <p className="font-bold text-white/45">Accuracy</p>
                <p className="mt-0.5 text-base font-black text-white">{accuracy === null ? '—' : `${accuracy}%`}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7" aria-label="Interactive Safety Quest game board">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-sm font-bold text-white/75">
              <Footprints className="h-4 w-4 text-[#F2A900]" aria-hidden="true" />
              {isComplete ? 'Journey complete' : `Mission ${currentIndex + 1}: ${currentCheckpoint.title}`}
            </div>
            <p className="text-xs font-semibold text-white/50 md:hidden">Swipe the scene to explore →</p>
          </div>

          <div className="safety-quest-frame">
            <div className="safety-quest-scroll" ref={stageRef}>
              <div className="safety-quest-stage">
                <motion.img
                  src="/safety-quest-campus.jpg"
                  alt=""
                  className="safety-quest-campus-photo"
                  draggable={false}
                  initial={false}
                  animate={prefersReducedMotion
                    ? { scale: 1, x: '0%', y: '0%' }
                    : { scale: [1, 1.025, 1], x: ['0%', '-0.35%', '0%'], y: ['0%', '-0.2%', '0%'] }}
                  transition={{ duration: 24, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
                />
                <div className="safety-quest-sunwash" aria-hidden="true" />
                <div className="safety-quest-fountain-shimmer" aria-hidden="true" />
                <div className="safety-quest-vignette" aria-hidden="true" />

                <div className="safety-quest-brand-lockup" aria-label="TUT, CCSF and Campus Protection Services partnership">
                  <div className="safety-quest-brand-tut">
                    <InstitutionBrand
                      size="compact"
                      themeOverride="dark"
                      className="w-full justify-center"
                      ccsfClassName="!w-auto"
                      tutClassName="!w-auto"
                    />
                  </div>
                  <div className="safety-quest-brand-community">
                    <img src={cpsLogo} alt="Campus Protection Services" />
                  </div>
                </div>

                <div className="safety-quest-scene-caption">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  TUT Pretoria West · Interactive safety route
                </div>

                <svg className="safety-quest-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <polyline points={routePoints} pathLength="1" className="safety-quest-route-base" />
                  <motion.polyline
                    points={routePoints}
                    pathLength="1"
                    className="safety-quest-route-complete"
                    initial={false}
                    animate={{ strokeDashoffset: 1 - progress.currentCheckpoint / QUEST_TOTAL }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: 'easeInOut' }}
                  />
                </svg>

                <motion.div
                  className="safety-quest-runner"
                  initial={false}
                  animate={{
                    left: `${runnerPosition.x}%`,
                    top: `${runnerPosition.y}%`,
                    scale: outcome === 'correct' && !prefersReducedMotion ? [1, 1.16, 1] : 1,
                  }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.9, type: 'spring', stiffness: 90, damping: 17 }}
                  aria-label={`Your position: mission ${Math.min(progress.currentCheckpoint + 1, QUEST_TOTAL)}`}
                >
                  <CircleUserRound className="h-5 w-5" aria-hidden="true" />
                  <span>You</span>
                </motion.div>

                {quest.map((checkpoint, index) => {
                  const Icon = ICONS[checkpoint.icon];
                  const complete = index < progress.currentCheckpoint;
                  const active = index === progress.currentCheckpoint && !isComplete;
                  const locked = index > progress.currentCheckpoint || isComplete && !complete;
                  return (
                    <button
                      key={checkpoint.id}
                      type="button"
                      data-checkpoint-index={index}
                      data-testid={`quest-checkpoint-${index + 1}`}
                      className={cn(
                        'safety-quest-node',
                        complete && 'is-complete',
                        active && 'is-active',
                        locked && 'is-locked',
                      )}
                      style={{ left: `${checkpoint.position.x}%`, top: `${checkpoint.position.y}%` }}
                      onClick={() => openCheckpoint(index)}
                      disabled={locked}
                      aria-label={`${checkpoint.eyebrow}: ${checkpoint.title}. ${complete ? 'Completed; tap to review.' : active ? 'Active; tap to answer.' : 'Locked.'}`}
                    >
                      <span className="safety-quest-node-ring" aria-hidden="true" />
                      <span className="safety-quest-node-icon">
                        {complete ? <Check className="h-5 w-5" /> : locked ? <LockKeyhole className="h-4 w-4" /> : <Icon className="h-5 w-5" />}
                      </span>
                      <span className="safety-quest-node-copy">
                        <small>{complete ? 'Mastered' : active ? 'Tap to answer' : `Mission ${index + 1}`}</small>
                        <strong>{checkpoint.title}</strong>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.section
              key="complete"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 130, damping: 16 }}
              className="safety-quest-complete-card"
              aria-labelledby="mission-complete-title"
            >
              <motion.div
                className="safety-quest-complete-icon"
                animate={prefersReducedMotion ? undefined : { y: [0, -5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Trophy className="h-8 w-8" aria-hidden="true" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F2A900]">Safety Quest complete</p>
                <h2 id="mission-complete-title" className="mt-1 text-2xl font-black text-white">You completed a personalized TUT safety set.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                  Key routes to retain: student admin such as registration, proof of registration and academic records → Building 21; mental-health support → Student Counselling; CPS office → Building 4, G-51; Control/reporting → Building 4, G-63. CCSF focuses on prevention and safety awareness while CPS provides institutional protection functions.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-200">{progress.attempts} attempts</span>
                  <span className="rounded-full border border-[#F2A900]/25 bg-[#F2A900]/10 px-3 py-1.5 text-[#FFD36A]">{accuracy ?? 100}% accuracy</span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/70">8 safety domains</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                <Button asChild className="bg-[#F2A900] font-extrabold text-[#07152A] hover:bg-[#FFD36A]">
                  <Link to={returnPath}>Return to dashboard <ChevronRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => void resetQuest()}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Play again
                </Button>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="brief"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-7 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"
            >
              <div className="safety-quest-info-card">
                <BookOpenCheck className="h-6 w-6 text-[#F2A900]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">Eight knowledge domains</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {QUEST_TOPICS.map((topic) => (
                      <span key={topic} className="safety-quest-service-pill">{QUEST_TOPIC_LABELS[topic]}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="safety-quest-info-card">
                <Users className="h-6 w-6 text-[#F2A900]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">No answer spoilers</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Your eight questions are selected from a larger bank and answer positions are shuffled. Locations and routing answers are revealed only after you answer correctly.
                  </p>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <Dialog open={selectedCheckpoint !== null} onOpenChange={(open) => !open && closeCheckpoint()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#09172B] p-0 text-white shadow-2xl sm:max-w-xl">
          {selected && (
            <motion.div
              key={`${selected.id}-${showLesson ? 'lesson' : 'question'}`}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="border-b border-white/10 bg-gradient-to-br from-[#123A70] via-[#0C274E] to-[#151027] px-6 py-6">
                <DialogHeader className="text-left">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="rounded-2xl border border-[#F2A900]/35 bg-[#F2A900]/12 p-3 text-[#F2A900]"
                        animate={prefersReducedMotion ? undefined : { rotate: [0, -4, 4, 0] }}
                        transition={{ duration: 0.55 }}
                      >
                        {(() => { const Icon = ICONS[selected.icon]; return <Icon className="h-6 w-6" aria-hidden="true" />; })()}
                      </motion.div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#F2A900]">{selected.eyebrow}</p>
                        <p className="mt-1 text-xs font-semibold text-white/60">{selected.character}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                      Randomized
                    </span>
                  </div>
                  <DialogTitle className="text-2xl font-black text-white">{selected.title}</DialogTitle>
                  <DialogDescription className="mt-2 text-sm leading-6 text-white/70">
                    {showLesson ? 'Review the lesson you unlocked.' : selected.question}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-6 py-6">
                {showLesson ? (
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 15 }}
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                      {!prefersReducedMotion && outcome === 'correct' && (
                        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                          {[12, 31, 56, 78, 90].map((left, index) => (
                            <motion.span
                              key={left}
                              className="absolute h-1.5 w-1.5 rounded-full bg-[#F2A900]"
                              style={{ left: `${left}%`, top: '58%' }}
                              initial={{ opacity: 0, y: 10, scale: 0.4 }}
                              animate={{ opacity: [0, 1, 0], y: -42 - index * 5, scale: [0.4, 1.4, 0.7] }}
                              transition={{ duration: 1, delay: index * 0.07 }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="relative flex items-center gap-2 text-sm font-black text-emerald-300">
                        <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                        {outcome === 'correct' ? 'Correct — mission unlocked' : 'Mission mastered'}
                      </div>
                      <p className="relative mt-3 text-sm leading-6 text-white/80">{selected.lesson}</p>
                    </div>
                    <Button className="mt-5 w-full bg-[#F2A900] font-extrabold text-[#07152A] hover:bg-[#FFD36A]" onClick={closeCheckpoint}>
                      {isComplete ? 'View mission summary' : outcome === 'correct' ? 'Continue the journey' : 'Back to the scene'}
                      <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    animate={outcome === 'wrong' && !prefersReducedMotion ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                    transition={{ duration: 0.36 }}
                  >
                    <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="gap-3" aria-label="Answer choices">
                      {selected.options.map((option, optionIndex) => (
                        <motion.div
                          key={option.id}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: prefersReducedMotion ? 0 : optionIndex * 0.055 }}
                        >
                          <Label
                            htmlFor={`quest-option-${option.id}`}
                            className={cn(
                              'safety-quest-answer',
                              selectedOption === option.id && 'is-selected',
                            )}
                          >
                            <RadioGroupItem id={`quest-option-${option.id}`} value={option.id} className="border-white/35 text-[#F2A900]" />
                            <span className="safety-quest-answer-letter" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                            <span>{option.label}</span>
                          </Label>
                        </motion.div>
                      ))}
                    </RadioGroup>

                    <AnimatePresence>
                      {outcome === 'wrong' && (
                        <motion.div
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4"
                          role="alert"
                        >
                          <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
                            <div>
                              <p className="text-sm font-black text-rose-200">Not quite — reassess the route</p>
                              <p className="mt-1 text-xs leading-5 text-white/70">Re-read the scenario and choose the most accurate TUT, CCSF or CPS action. The correct option may appear in any position.</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-5 flex gap-3">
                      {outcome === 'wrong' ? (
                        <Button className="w-full bg-white font-extrabold text-[#07152A] hover:bg-white/90" onClick={() => { setOutcome(null); setSelectedOption(''); }}>
                          Try again
                        </Button>
                      ) : (
                        <Button className="w-full bg-[#F2A900] font-extrabold text-[#07152A] hover:bg-[#FFD36A]" disabled={!selectedOption} onClick={submitAnswer}>
                          Lock in answer <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
